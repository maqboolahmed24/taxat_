import { expect, test } from "@playwright/test";

import { validateContractSchema } from "../../../../tests/unit/backend_northbound/audit_and_enquiry_fixtures.ts";
import { buildRetentionGovernanceFrame } from "../index.ts";

const tenantId = "tenant.taxat";
const updatedAt = "2026-05-04T12:00:00.000Z";
const policySnapshotHash = "policy-snapshot.pc0193.retention";

function basePolicyRows() {
  return [
    {
      affectedArtifactCount: 42,
      artifactClass: "FILING_PROOF_BUNDLE",
      clientRefs: ["client.pc0193.alpha"],
      exportPosture: "LIMITED" as const,
      limitationBehavior: "SURVIVE_WITH_LIMITATION_NOTES",
      limitationRefs: ["retention-limitation.pc0193.proof"],
      pseudonymisationMode: "PSEUDONYMIZE_ALLOWED",
      retentionClass: "regulated_record",
      rowRef: "retention-row.pc0193.proof-bundle",
      stagedChangeRef: "retention-staged-change.pc0193.proof-bundle",
      statutoryMinimumDays: 2555,
      statutoryMinimumRef: "statutory-minimum.hmrc.vat.7y",
      tenantOverrideDays: 365,
      tenantOverrideRef: "tenant-override.pc0193.too-short",
    },
    {
      affectedArtifactCount: 12,
      artifactClass: "EXPORT_DERIVATIVE",
      clientRefs: ["client.pc0193.beta"],
      exportPosture: "MASKED" as const,
      limitationBehavior: "PSEUDONYMISED_SURVIVAL",
      limitationRefs: [],
      pseudonymisationMode: "PSEUDONYMIZE_ALLOWED",
      retentionClass: "derived_artifact",
      rowRef: "retention-row.pc0193.export-derivative",
      statutoryMinimumDays: 30,
      statutoryMinimumRef: "statutory-minimum.export.derivative.30d",
      tenantOverrideDays: 90,
      tenantOverrideRef: "tenant-override.pc0193.export-90d",
    },
  ];
}

test("projects retention policy matrix with statutory override blockers and stable interaction filters", async () => {
  const frame = await buildRetentionGovernanceFrame({
    policyRows: basePolicyRows(),
    policySnapshotHash,
    selectedPolicyRowRef: "retention-row.pc0193.proof-bundle",
    tenantId,
    updatedAt,
    workspaceMode: "POLICIES",
  });

  expect(frame.retention_workspace.surface_order).toEqual([
    "INVENTORY_RAIL",
    "WORKSPACE_CANVAS",
    "RETENTION_IMPACT_PREVIEW",
    "AUDIT_SIDECAR",
  ]);
  expect(frame.retention_policy_matrix.column_order).toEqual([
    "ARTIFACT_CLASS",
    "STATUTORY_BASELINE",
    "TENANT_OVERRIDE",
    "EFFECTIVE_MINIMUM",
    "LIMITATION_BEHAVIOR",
    "PSEUDONYMISATION_MODE",
    "EXPORT_POSTURE",
  ]);
  expect(frame.retention_policy_matrix).toMatchObject({
    editing_posture: "EXPLICIT_STAGE_ONLY",
    inline_blocker_visibility: "ALWAYS_VISIBLE",
    selected_row_ref: "retention-row.pc0193.proof-bundle",
    sticky_header_mode: "ROW_AND_COLUMN_HEADERS",
  });
  expect(frame.object_anchor_ref).toBe("retention-row.pc0193.proof-bundle");
  expect(frame.focus_anchor_ref).toBe("retention-row.pc0193.proof-bundle");
  expect(frame.artifact_rows[0]).toMatchObject({
    effective_minimum_ref: "statutory-minimum.hmrc.vat.7y",
    override_state: "BLOCKED_BY_STATUTORY_MINIMUM",
    warning_posture: "STATUTORY_BLOCK",
  });
  expect(frame.retention_workspace).toMatchObject({
    promoted_support_surface: "RETENTION_IMPACT_PREVIEW",
    warning_posture: "STATUTORY_BLOCK",
  });
  expect(frame.retention_impact_preview).toMatchObject({
    action_posture: "BLOCKED",
    affected_artifact_count: 42,
    affected_client_count: 1,
    preview_mode: "POLICY_CHANGE",
    preview_subject_ref_or_null: "retention-row.pc0193.proof-bundle",
  });
  expect(frame.legal_hold_register).toMatchObject({
    release_action_posture: "NONE_SELECTED",
    release_preview_ref_or_null: null,
    selected_hold_ref_or_null: null,
  });
  expect(frame.erasure_queue).toMatchObject({
    blocked_item_refs: [],
    eligible_item_refs: [],
    pending_review_item_refs: [],
    primary_blocker_ref_or_null: null,
  });
  expect(frame.interaction_layer.selected_filter_chip_refs).toEqual([
    "artifact_class:EXPORT_DERIVATIVE",
    "artifact_class:FILING_PROOF_BUNDLE",
    "retention_class:derived_artifact",
    "retention_class:regulated_record",
    "client:client.pc0193.alpha",
    "client:client.pc0193.beta",
    "erasure_readiness:",
  ].filter((chip) => !chip.endsWith(":")));

  await validateContractSchema("retention_governance_frame", frame);
});
