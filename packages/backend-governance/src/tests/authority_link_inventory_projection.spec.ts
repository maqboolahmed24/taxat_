import { expect, test } from "@playwright/test";

import { normalizeAuthorityLinkRecord } from "../../../backend-access/src/models/authority_link.ts";
import { validateContractSchema } from "../../../../tests/unit/backend_northbound/audit_and_enquiry_fixtures.ts";
import { buildAuthorityLinkInventoryItem } from "../index.ts";

const evaluatedAt = "2026-05-04T12:00:00.000Z";
const authorityLinkId = "authority-link.pc0192.hmrc-vat";

function authorityLink(overrides: Parameters<typeof normalizeAuthorityLinkRecord>[0] = {}) {
  return normalizeAuthorityLinkRecord({
    authority_link_id: authorityLinkId,
    authority_name: "HMRC",
    authority_scope: "VAT",
    authorised_party_ref: "authorised-party.pc0192.agent",
    binding_health: "HEALTHY",
    blocked_reason_codes: [],
    client_id: "client.pc0192.taxpayer",
    delegation_grant_ref: "delegation-grant.pc0192.vat",
    delegation_state: "SATISFIED",
    expires_at: "2026-06-01T00:00:00.000Z",
    last_binding_check_at: "2026-05-04T10:00:00.000Z",
    lifecycle_state: "AUTHORISED_ACTIVE",
    partition_scope_refs: ["partition.uk.vat"],
    provider_api_version: "MTD-VAT-V1",
    provider_environment: "PRODUCTION",
    reporting_subject_ref: "reporting-subject.pc0192.taxpayer",
    revoked_at: null,
    source_evidence_refs: ["evidence.pc0192.hmrc-handshake"],
    superseded_by_link_id: null,
    tenant_id: "tenant.taxat",
    token_binding_profile_ref: "token-binding-profile.pc0192.hmrc-vat",
    token_client_binding_state: "BOUND",
    validated_at: "2026-05-04T09:00:00.000Z",
    ...overrides,
  });
}

test("projects a linked authority inventory item with fixed workspace, handshake, and externalization bindings", async () => {
  const item = await buildAuthorityLinkInventoryItem({
    affectedOperations: [
      { operationRef: "operation.pc0192.preflight", section: "PREFLIGHT" },
      { operationRef: "operation.pc0192.submit-vat", section: "SUBMISSION" },
      { operationRef: "operation.pc0192.reconcile-vat", section: "RECONCILIATION" },
      { operationRef: "operation.pc0192.amend-vat", section: "AMENDMENT" },
    ],
    authorityLink: authorityLink(),
    evaluatedAt,
  });

  expect(item.authority_link_workspace.surface_order).toEqual([
    "INVENTORY_RAIL",
    "WORKSPACE_CANVAS",
    "AUDIT_SIDECAR",
  ]);
  expect(item.authority_link_workspace.detail_module_order).toEqual([
    "AuthorityLinkIdentityCard",
    "BindingHealthTimeline",
    "HandshakeHistory",
    "AffectedOperationList",
    "PreflightChecklist",
  ]);
  expect(item.guided_handshake_stepper).toMatchObject({
    flow_state: "LINKED",
    current_step_code: "VALIDATE_BINDING",
    credential_capture_mode: "GUIDED_HANDSHAKE_ONLY",
    preflight_blocking_check_refs: [],
  });
  expect(item.guided_handshake_stepper.completed_step_codes).toEqual(
    item.guided_handshake_stepper.step_order,
  );
  expect(item.affected_operation_counts).toEqual({
    amendment_count: 1,
    preflight_count: 1,
    reconciliation_count: 1,
    submission_count: 1,
  });
  expect(item.affected_operation_list.primary_blocked_operation_ref_or_null).toBeNull();
  expect(item.interaction_layer.selected_filter_chip_refs).toEqual([
    "authority_scope:VAT",
    "client:client.pc0192.taxpayer",
    "provider_environment:PRODUCTION",
    "lifecycle_state:AUTHORISED_ACTIVE",
    "binding_health:HEALTHY",
    "expiry_risk:EXPIRING_30_DAYS",
  ]);
  expect(item.externalization_governance_contract).toMatchObject({
    boundary_scope: "AUTHORITY_LINK_HANDOFF",
    context_anchor_ref: authorityLinkId,
    delivery_surface_kind: "AUTHORITY_LINK_EXTERNAL_HANDOFF",
    eligibility_state: "READY",
    limitation_state: "FULL",
    slice_binding_ref: authorityLinkId,
  });

  await validateContractSchema("authority_link_inventory_item", item);
  await validateContractSchema(
    "externalization_governance_contract",
    item.externalization_governance_contract,
  );
});

test("keeps lifecycle, delegation, and token-client mismatch as distinct promoted states", async () => {
  const clientBindingCheckRef = `preflight-check.${authorityLinkId}.client_binding`;
  const item = await buildAuthorityLinkInventoryItem({
    affectedOperations: [
      {
        blockingCheckRefs: [clientBindingCheckRef],
        operationRef: "operation.pc0192.submit-vat",
        section: "SUBMISSION",
      },
    ],
    authorityLink: authorityLink({
      binding_health: "CLIENT_BINDING_MISMATCH",
      blocked_reason_codes: ["AUTHORITY_LINK_CLIENT_BINDING_MISMATCH"],
      token_client_binding_state: "MISMATCH",
    }),
    evaluatedAt,
  });

  expect(item.lifecycle_state).toBe("AUTHORISED_ACTIVE");
  expect(item.delegation_state).toBe("SATISFIED");
  expect(item.token_client_binding_state).toBe("MISMATCH");
  expect(item.binding_health).toBe("CLIENT_BINDING_MISMATCH");
  expect(item.authority_link_workspace.prominent_issue_ref_or_null).toBe(
    item.binding_health_timeline.promoted_issue_ref_or_null,
  );
  expect(item.preflight_checklist.blocking_check_refs).toEqual([
    clientBindingCheckRef,
  ]);
  expect(item.affected_operation_list.primary_blocked_operation_ref_or_null).toBe(
    "operation.pc0192.submit-vat",
  );
  expect(item.externalization_governance_contract).toMatchObject({
    blocking_context_tokens: [clientBindingCheckRef],
    eligibility_state: "BLOCKED",
    limitation_state: "PREFLIGHT_BLOCKED",
  });

  await validateContractSchema("authority_link_inventory_item", item);
  await validateContractSchema(
    "externalization_governance_contract",
    item.externalization_governance_contract,
  );
});
