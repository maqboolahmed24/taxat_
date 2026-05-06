import { expect, test } from "@playwright/test";

import { validateContractSchema } from "../../../../tests/unit/backend_northbound/audit_and_enquiry_fixtures.ts";
import { buildRetentionGovernanceFrame } from "../index.ts";

const tenantId = "tenant.taxat";
const updatedAt = "2026-05-04T12:00:00.000Z";
const policySnapshotHash = "policy-snapshot.pc0193.retention";

function policyRows() {
  return [
    {
      affectedArtifactCount: 18,
      artifactClass: "CLIENT_SOURCE_RECORD",
      clientRefs: ["client.pc0193.alpha"],
      erasureEligibleItemRefs: ["erasure-item.pc0193.client-source.eligible"],
      exportPosture: "LIMITED" as const,
      legalHoldRefs: ["legal-hold.pc0193.alpha-vat"],
      limitationBehavior: "SURVIVE_WITH_LIMITATION_NOTES",
      limitationRefs: ["retention-limitation.pc0193.client-source"],
      pseudonymisationMode: "PSEUDONYMIZE_ALLOWED",
      retentionClass: "regulated_record",
      rowRef: "retention-row.pc0193.client-source",
      statutoryMinimumDays: 2555,
      statutoryMinimumRef: "statutory-minimum.hmrc.vat.7y",
    },
  ];
}

function legalHolds() {
  return [
    {
      affectedArtifactCount: 3,
      blockedErasureItemRefs: ["erasure-item.pc0193.client-source.blocked"],
      clientRef: "client.pc0193.alpha",
      holdReasonRef: "hold-reason.hmrc-enquiry-open",
      holdRef: "legal-hold.pc0193.alpha-vat",
      holdState: "RELEASE_ELIGIBLE" as const,
      lastChangedAt: "2026-05-01T10:00:00.000Z",
      objectRef: "client.pc0193.alpha",
      projectedProvenanceLimitationRefs: [
        "retention-limitation.pc0193.hold-release.provenance",
      ],
      projectedPseudonymisationCount: 2,
      releaseEligibilityState: "RELEASE_ELIGIBLE" as const,
      releasePreviewRef: "legal-hold-release-preview.pc0193.alpha-vat",
    },
  ];
}

function erasureItems() {
  return [
    {
      affectedArtifactCount: 1,
      artifactClass: "CLIENT_SOURCE_RECORD",
      artifactRef: "source-record.pc0193.eligible",
      clientRef: "client.pc0193.alpha",
      itemRef: "erasure-item.pc0193.client-source.eligible",
      projectedProvenanceLimitationRefs: [
        "retention-limitation.pc0193.erasure.eligible",
      ],
      projectedPseudonymisationCount: 1,
      readinessState: "ELIGIBLE" as const,
    },
    {
      affectedArtifactCount: 1,
      artifactClass: "CLIENT_SOURCE_RECORD",
      artifactRef: "source-record.pc0193.blocked",
      blockerRefs: ["legal-hold.pc0193.alpha-vat"],
      clientRef: "client.pc0193.alpha",
      itemRef: "erasure-item.pc0193.client-source.blocked",
      projectedProvenanceLimitationRefs: [
        "retention-limitation.pc0193.erasure.blocked",
      ],
      readinessState: "BLOCKED" as const,
    },
    {
      affectedArtifactCount: 1,
      artifactClass: "CLIENT_SOURCE_RECORD",
      artifactRef: "source-record.pc0193.pending",
      clientRef: "client.pc0193.alpha",
      itemRef: "erasure-item.pc0193.client-source.pending",
      projectedProvenanceLimitationRefs: [
        "retention-limitation.pc0193.erasure.pending",
      ],
      readinessState: "PENDING_REVIEW" as const,
    },
  ];
}

test("couples legal-hold selection to release preview and projected erasure impact", async () => {
  const frame = await buildRetentionGovernanceFrame({
    erasureItems: erasureItems(),
    legalHolds: legalHolds(),
    policyRows: policyRows(),
    policySnapshotHash,
    selectedLegalHoldRef: "legal-hold.pc0193.alpha-vat",
    tenantId,
    updatedAt,
    workspaceMode: "LEGAL_HOLDS",
  });

  expect(frame.object_anchor_ref).toBe("legal-hold.pc0193.alpha-vat");
  expect(frame.focus_anchor_ref).toBe("legal-hold.pc0193.alpha-vat");
  expect(frame.retention_workspace).toMatchObject({
    promoted_support_surface: "RETENTION_IMPACT_PREVIEW",
    selected_legal_hold_ref: "legal-hold.pc0193.alpha-vat",
    warning_posture: "DESTRUCTIVE_REVIEW",
    workspace_mode: "LEGAL_HOLDS",
  });
  expect(frame.legal_hold_register).toMatchObject({
    release_action_posture: "CHANGE_BASKET_REQUIRED",
    release_candidate_hold_refs: ["legal-hold.pc0193.alpha-vat"],
    release_preview_ref_or_null: "legal-hold-release-preview.pc0193.alpha-vat",
    selected_hold_ref_or_null: "legal-hold.pc0193.alpha-vat",
  });
  expect(frame.retention_impact_preview).toMatchObject({
    action_posture: "CHANGE_BASKET_REQUIRED",
    affected_artifact_count: 3,
    affected_client_count: 1,
    preview_mode: "HOLD_RELEASE",
    preview_subject_ref_or_null: "legal-hold-release-preview.pc0193.alpha-vat",
    projected_pseudonymisation_count: 2,
    warning_posture: "DESTRUCTIVE_REVIEW",
  });

  await validateContractSchema("retention_governance_frame", frame);
});

test("partitions erasure readiness and blocks destructive action for held candidates", async () => {
  const frame = await buildRetentionGovernanceFrame({
    erasureItems: erasureItems(),
    legalHolds: legalHolds(),
    policyRows: policyRows(),
    policySnapshotHash,
    selectedErasureItemRef: "erasure-item.pc0193.client-source.blocked",
    tenantId,
    updatedAt,
    workspaceMode: "ERASURE",
  });

  expect(frame.retention_workspace).toMatchObject({
    promoted_support_surface: "RETENTION_IMPACT_PREVIEW",
    selected_erasure_item_ref: "erasure-item.pc0193.client-source.blocked",
    warning_posture: "LEGAL_HOLD_BLOCK",
    workspace_mode: "ERASURE",
  });
  expect(frame.erasure_queue).toMatchObject({
    destructive_flow_mode: "CHANGE_BASKET_ONLY",
    eligible_item_refs: ["erasure-item.pc0193.client-source.eligible"],
    blocked_item_refs: ["erasure-item.pc0193.client-source.blocked"],
    pending_review_item_refs: ["erasure-item.pc0193.client-source.pending"],
    primary_blocker_ref_or_null: "erasure-item.pc0193.client-source.blocked",
    selected_item_ref_or_null: "erasure-item.pc0193.client-source.blocked",
  });
  expect(frame.retention_impact_preview).toMatchObject({
    action_posture: "BLOCKED",
    blocked_reason_refs: ["legal-hold.pc0193.alpha-vat"],
    preview_mode: "ERASURE_ACTION",
    preview_subject_ref_or_null: "erasure-item.pc0193.client-source.blocked",
    warning_posture: "LEGAL_HOLD_BLOCK",
  });
  expect(frame.erasure_queue_count).toBe(3);

  await validateContractSchema("retention_governance_frame", frame);
});
