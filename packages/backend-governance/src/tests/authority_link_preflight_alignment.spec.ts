import { expect, test } from "@playwright/test";

import { normalizeAuthorityLinkRecord } from "../../../backend-access/src/models/authority_link.ts";
import { validateContractSchema } from "../../../../tests/unit/backend_northbound/audit_and_enquiry_fixtures.ts";
import { buildAuthorityLinkInventoryItem } from "../index.ts";

const evaluatedAt = "2026-05-04T12:00:00.000Z";

function authorityLink(overrides: Parameters<typeof normalizeAuthorityLinkRecord>[0] = {}) {
  return normalizeAuthorityLinkRecord({
    authority_link_id: "authority-link.pc0192.preflight",
    authority_name: "HMRC",
    authority_scope: "VAT",
    authorised_party_ref: "authorised-party.pc0192.agent",
    binding_health: "DELEGATION_GAP",
    blocked_reason_codes: ["AUTHORITY_LINK_DELEGATION_GAP"],
    client_id: "client.pc0192.preflight",
    delegation_grant_ref: "delegation-grant.pc0192.preflight",
    delegation_state: "MISSING",
    expires_at: "2026-06-01T00:00:00.000Z",
    last_binding_check_at: "2026-05-04T10:00:00.000Z",
    lifecycle_state: "AUTHORISED_LIMITED",
    partition_scope_refs: ["partition.uk.vat"],
    provider_api_version: "MTD-VAT-V1",
    provider_environment: "PRODUCTION",
    reporting_subject_ref: "reporting-subject.pc0192.preflight",
    revoked_at: null,
    source_evidence_refs: ["evidence.pc0192.preflight"],
    superseded_by_link_id: null,
    tenant_id: "tenant.taxat",
    token_binding_profile_ref: "token-binding-profile.pc0192.preflight",
    token_client_binding_state: "BOUND",
    validated_at: "2026-05-04T09:00:00.000Z",
    ...overrides,
  });
}

test("maps blocked preflight checks directly to affected operations and failure history", async () => {
  const delegationCheckRef =
    "preflight-check.authority-link.pc0192.preflight.delegation_coverage";
  const item = await buildAuthorityLinkInventoryItem({
    affectedOperations: [
      {
        blockingCheckRefs: [delegationCheckRef],
        operationRef: "operation.pc0192.preflight.submit-vat",
        section: "SUBMISSION",
      },
    ],
    authorityLink: authorityLink(),
    evaluatedAt,
    latestAttemptState: "FAILED",
    latestFailureRef: "handshake-failure.pc0192.delegation-gap",
  });

  expect(item.guided_handshake_stepper.flow_state).toBe("BLOCKED");
  expect(item.guided_handshake_stepper.current_step_code).toBe(
    "RUN_PREFLIGHT_CHECKS",
  );
  expect(item.preflight_checklist.blocking_check_refs).toEqual([
    delegationCheckRef,
  ]);
  expect(item.guided_handshake_stepper.preflight_blocking_check_refs).toEqual(
    item.preflight_checklist.blocking_check_refs,
  );
  expect(item.affected_operation_list.primary_blocked_operation_ref_or_null).toBe(
    "operation.pc0192.preflight.submit-vat",
  );
  expect(item.handshake_history).toMatchObject({
    latest_attempt_state: "FAILED",
    latest_failure_ref_or_null: "handshake-failure.pc0192.delegation-gap",
  });
  expect(item.focus_anchor_ref).toBe(item.authority_link_workspace.prominent_issue_ref_or_null);

  await validateContractSchema("authority_link_inventory_item", item);
});

test("publishes pending handoff posture without inventing preflight blockers", async () => {
  const item = await buildAuthorityLinkInventoryItem({
    authorityLink: authorityLink({
      authority_link_id: "authority-link.pc0192.pending",
      binding_health: "UNKNOWN",
      blocked_reason_codes: ["AUTHORITY_LINK_PENDING"],
      delegation_state: "SATISFIED",
      last_binding_check_at: null,
      lifecycle_state: "LINK_INITIATED",
      token_binding_profile_ref: null,
      token_client_binding_state: "UNVERIFIED",
      validated_at: null,
    }),
    evaluatedAt,
    externalHandoffRef: "external-handoff.pc0192.pending",
    handshakeFlowState: "HANDOFF_PENDING",
  });

  expect(item.guided_handshake_stepper).toMatchObject({
    current_step_code: "AUTHORISE_EXTERNAL_HANDOFF",
    external_handoff_ref_or_null: "external-handoff.pc0192.pending",
    flow_state: "HANDOFF_PENDING",
    preflight_blocking_check_refs: [],
  });
  expect(item.handshake_history.latest_attempt_state).toBe("PENDING_RETURN");
  expect(item.handshake_history.latest_failure_ref_or_null).toBeNull();
  expect(item.affected_operation_list.primary_blocked_operation_ref_or_null).toBeNull();
  expect(item.externalization_governance_contract).toMatchObject({
    blocking_context_tokens: [],
    eligibility_state: "PENDING_RETURN",
    external_handoff_target_ref_or_null: "external-handoff.pc0192.pending",
    limitation_state: "FULL",
  });

  await validateContractSchema("authority_link_inventory_item", item);
  await validateContractSchema(
    "externalization_governance_contract",
    item.externalization_governance_contract,
  );
});

test("fails closed when caller flow state conflicts with preflight blockers", async () => {
  const item = await buildAuthorityLinkInventoryItem({
    affectedOperations: [
      { operationRef: "operation.pc0192.unmapped-review", section: "SUBMISSION" },
    ],
    authorityLink: authorityLink({
      authority_link_id: "authority-link.pc0192.closed",
    }),
    evaluatedAt,
    handshakeFlowState: "LINKED",
  });

  expect(item.guided_handshake_stepper).toMatchObject({
    current_step_code: "RUN_PREFLIGHT_CHECKS",
    flow_state: "BLOCKED",
    preflight_blocking_check_refs: [
      "preflight-check.authority-link.pc0192.closed.delegation_coverage",
    ],
  });
  expect(item.affected_operation_list.preflight_refs).toEqual([
    "affected-operation.authority-link.pc0192.closed.preflight-blocked",
  ]);
  expect(item.affected_operation_list.primary_blocked_operation_ref_or_null).toBe(
    "affected-operation.authority-link.pc0192.closed.preflight-blocked",
  );
  expect(item.externalization_governance_contract).toMatchObject({
    eligibility_state: "BLOCKED",
    limitation_state: "PREFLIGHT_BLOCKED",
  });

  await validateContractSchema("authority_link_inventory_item", item);
  await validateContractSchema(
    "externalization_governance_contract",
    item.externalization_governance_contract,
  );
});
