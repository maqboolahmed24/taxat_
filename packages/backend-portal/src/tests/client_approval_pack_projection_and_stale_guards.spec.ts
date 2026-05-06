import { expect, test } from "@playwright/test";

import { validateContractSchema } from "../../../../tests/unit/backend_northbound/audit_and_enquiry_fixtures.ts";
import {
  buildApprovalArtifactTargets,
  buildClientApprovalCenterPack,
  buildClientApprovalPack,
  deriveApprovalReadinessScore,
  deriveApprovalRecoveryPosture,
  type BuildClientApprovalPackInput,
} from "../index.ts";
import { ClientApprovalPackProjectionError } from "../types.ts";

const languageContract = {
  contract_code: "PORTAL_LANGUAGE_CONTRACT_V1",
  copy_budget: {
    action_label_max_chars: 36,
    approval_change_digest_max_chars: 180,
    approval_receipt_next_step_max_chars: 96,
    approval_summary_max_chars: 180,
    approval_title_max_chars: 72,
    dominant_question_max_chars: 120,
    help_first_view_char_budget: 420,
    help_headline_max_chars: 96,
    help_option_label_max_chars: 40,
    home_first_view_char_budget: 520,
    documents_first_view_char_budget: 560,
    approvals_first_view_char_budget: 560,
    limitation_detail_max_chars: 180,
    limitation_headline_max_chars: 120,
    onboarding_first_view_char_budget: 480,
    onboarding_step_label_max_chars: 64,
    reassurance_line_max_chars: 120,
    request_detail_first_view_char_budget: 460,
    request_detail_status_max_chars: 120,
    request_due_label_max_chars: 64,
    request_help_text_max_chars: 180,
    request_row_action_label_max_chars: 36,
    request_row_due_label_max_chars: 64,
    request_row_no_safe_action_max_chars: 120,
    request_row_status_label_max_chars: 48,
    request_row_title_max_chars: 72,
    request_title_max_chars: 72,
    request_why_label_max_chars: 120,
    status_due_label_max_chars: 48,
    status_headline_max_chars: 96,
    status_supporting_text_max_chars: 180,
    task_description_max_chars: 180,
    task_label_max_chars: 72,
    timeline_detail_max_chars: 180,
    timeline_headline_max_chars: 120,
  },
  copy_serialization_policy: "DIRECT_TEXT_OR_GOVERNED_TEXT_REF_ONLY",
  dominance_policy: "ONE_DOMINANT_QUESTION_AND_ONE_PRIMARY_ACTION",
  due_label_policy: "EXPLICIT_DUE_DATE_OR_NO_DEADLINE",
  forbidden_term_families: [
    "GATE_LANGUAGE",
    "MANIFEST_LANGUAGE",
    "STALE_OR_REBASE_JARGON",
    "OVERRIDE_LANGUAGE",
    "AUDIT_LANGUAGE",
    "ESCALATION_LANGUAGE",
    "ASSIGNMENT_LANGUAGE",
    "STAFF_ROLE_LANGUAGE",
    "WORKFLOW_LANGUAGE",
    "INTERNAL_ONLY_LANGUAGE",
  ],
  history_language_policy: "CURRENT_PRIMARY_HISTORY_EXPLICIT",
  plain_language_policy: "CLIENT_SAFE_LITERAL_TASK_LANGUAGE",
  role_filter_policy: "ROLE_FILTER_BEFORE_COPY_PUBLICATION",
  settlement_language_policy: "PENDING_AND_SETTLED_EXPLICIT",
  support_subordination_policy: "ONE_PROMOTED_SUPPORT_REGION_SUBORDINATE_TO_TASK",
};

const baseApprovalPackInput = {
  accessBindingHash: "access.approval.client-1",
  acknowledgedAt: "2026-05-04T09:07:00.000Z",
  approvalPackHash: "approval.hash.v1",
  approvalPackId: "approval.pack.v1",
  changeDigestAcknowledgedAt: "2026-05-04T09:05:00.000Z",
  changeDigestSummary: "One declaration is ready for your review.",
  changeHighlightCount: 1,
  changeHighlightsRef: "copy.approval.change-highlights.v1",
  clientId: "client.approval-1",
  declarationAcknowledgedAt: "2026-05-04T09:06:00.000Z",
  declarationDownloadRef: "artifact.declaration.v1.download",
  declarationPrintRef: "artifact.declaration.v1.print",
  declarationTextRef: "copy.declaration.v1",
  dueAt: "2026-05-10T12:00:00.000Z",
  languageContract,
  latestApprovalPackHash: "approval.hash.v1",
  latestViewGuardRef: "view.guard.approval.v1",
  lifecycleState: "ACKNOWLEDGED",
  manifestId: "manifest.approval-1",
  maskingPostureFingerprint: "mask.approval.client-1",
  now: "2026-05-04T09:08:00.000Z",
  requiresStepUp: true,
  stateChangedAt: "2026-05-04T09:08:00.000Z",
  stepUpExpiresAt: "2026-05-04T09:18:00.000Z",
  stepUpVerifiedAt: "2026-05-04T09:08:00.000Z",
  summary: "Please review and sign the declaration.",
  summaryRef: "copy.approval.summary.v1",
  tenantId: "tenant.approval-1",
  title: "Tax declaration approval",
  viewGuardRef: "view.guard.approval.v1",
  viewedAt: "2026-05-04T09:00:00.000Z",
  visibilityCachePartitionKey: "visibility.approval.client-1",
} satisfies BuildClientApprovalPackInput;

test("builds a schema-valid current approval pack with frozen signability inputs", async () => {
  const pack = buildClientApprovalPack(baseApprovalPackInput);

  expect(pack.stale_protection_state).toBe("CURRENT");
  expect(pack.approval_readiness_score).toBe(100);
  expect(pack.recovery_posture).toBe("NONE");
  expect(pack.dominant_hazard_code).toBeNull();
  expect(pack.artifact_selection.default_preview_target_ref_or_null).toBe("copy.declaration.v1");
  expect(pack.artifact_selection.default_download_target_ref_or_null).toBeNull();
  expect(pack.externalization_governance_contract).toMatchObject({
    approval_requirement_token_or_null: "INLINE_CHECKPOINT",
    approval_state: "SATISFIED",
    preview_target_ref_or_null: "copy.declaration.v1",
  });

  await validateContractSchema("client_approval_pack", pack);
  await validateContractSchema("artifact_selection_contract", pack.artifact_selection);
  await validateContractSchema("artifact_affordance_contract", pack.artifact_affordance);
  await validateContractSchema(
    "externalization_governance_contract",
    pack.externalization_governance_contract,
  );
});

test("uses the validator-matched approval readiness formula and stale overrides", () => {
  expect(
    deriveApprovalReadinessScore({
      acknowledgedAt: null,
      changeDigestAcknowledgedAt: null,
      declarationAcknowledgedAt: null,
      requiresStepUp: false,
      staleProtectionState: "CURRENT",
      stateChangedAt: "2026-05-04T09:00:00.000Z",
      stepUpExpiresAt: null,
      stepUpVerifiedAt: null,
      viewedAt: "2026-05-04T09:00:00.000Z",
    }),
  ).toBe(45);
  expect(
    deriveApprovalReadinessScore({
      acknowledgedAt: "2026-05-04T09:07:00.000Z",
      changeDigestAcknowledgedAt: "2026-05-04T09:05:00.000Z",
      declarationAcknowledgedAt: "2026-05-04T09:06:00.000Z",
      requiresStepUp: false,
      staleProtectionState: "REBASE_REQUIRED",
      stateChangedAt: "2026-05-04T09:08:00.000Z",
      stepUpExpiresAt: null,
      stepUpVerifiedAt: null,
      viewedAt: "2026-05-04T09:00:00.000Z",
    }),
  ).toBe(79);
  expect(
    deriveApprovalReadinessScore({
      acknowledgedAt: "2026-05-04T09:07:00.000Z",
      changeDigestAcknowledgedAt: "2026-05-04T09:05:00.000Z",
      declarationAcknowledgedAt: "2026-05-04T09:06:00.000Z",
      requiresStepUp: false,
      staleProtectionState: "SUPERSEDED",
      stateChangedAt: "2026-05-04T09:08:00.000Z",
      stepUpExpiresAt: null,
      stepUpVerifiedAt: null,
      viewedAt: "2026-05-04T09:00:00.000Z",
    }),
  ).toBe(0);
  expect(
    deriveApprovalReadinessScore({
      acknowledgedAt: "2026-05-04T09:07:00.000Z",
      changeDigestAcknowledgedAt: "2026-05-04T09:05:00.000Z",
      declarationAcknowledgedAt: "2026-05-04T09:06:00.000Z",
      requiresStepUp: true,
      staleProtectionState: "CURRENT",
      stateChangedAt: "2026-05-04T09:20:00.000Z",
      stepUpExpiresAt: "2026-05-04T09:18:00.000Z",
      stepUpVerifiedAt: "2026-05-04T09:08:00.000Z",
      viewedAt: "2026-05-04T09:00:00.000Z",
    }),
  ).toBe(40);
});

test("maps rebase, supersession, expiry, cancellation, and step-up blockers to recovery posture", async () => {
  const stale = buildClientApprovalPack({
    ...baseApprovalPackInput,
    latestViewGuardRef: "view.guard.approval.v2",
  });
  expect(stale.stale_protection_state).toBe("REBASE_REQUIRED");
  expect(stale.approval_readiness_score).toBe(79);
  expect(stale.recovery_posture).toBe("RECONFIRM_INLINE");
  expect(stale.dominant_hazard_code).toBe("APPROVAL_PACK_REBASE_REQUIRED");

  const superseded = buildClientApprovalPack({
    ...baseApprovalPackInput,
    lifecycleState: "SUPERSEDED",
    latestApprovalPackHash: "approval.hash.v2",
    signedAt: null,
    supersededByPackRef: "approval.pack.v2",
  });
  expect(superseded.stale_protection_state).toBe("SUPERSEDED");
  expect(superseded.approval_readiness_score).toBe(0);
  expect(superseded.recovery_posture).toBe("STALE_REVIEW_REQUIRED");

  const cancelled = buildClientApprovalPack({
    ...baseApprovalPackInput,
    lifecycleState: "CANCELLED",
    requiresStepUp: false,
  });
  expect(cancelled.viewed_at).toBeNull();
  expect(cancelled.acknowledged_at).toBeNull();
  expect(cancelled.recovery_posture).toBe("HARD_RESET_REQUIRED");
  await validateContractSchema("client_approval_pack", cancelled);

  expect(
    deriveApprovalRecoveryPosture({
      lifecycleState: "ACKNOWLEDGED",
      requiresStepUp: true,
      staleProtectionState: "CURRENT",
      stateChangedAt: "2026-05-04T09:20:00.000Z",
      stepUpExpiresAt: "2026-05-04T09:18:00.000Z",
      stepUpVerifiedAt: "2026-05-04T09:08:00.000Z",
    }),
  ).toEqual({
    dominantHazardCode: "APPROVAL_STEP_UP_EXPIRED",
    recoveryPosture: "STEP_UP_RETRY",
  });
});

test("rejects acknowledgement and signed-state chronology drift", () => {
  expect(() =>
    buildClientApprovalPack({
      ...baseApprovalPackInput,
      acknowledgedAt: "2026-05-04T09:04:00.000Z",
    }),
  ).toThrow(ClientApprovalPackProjectionError);
  expect(() =>
    buildClientApprovalPack({
      ...baseApprovalPackInput,
      lifecycleState: "SIGNED",
      signedAt: "2026-05-04T09:30:00.000Z",
      stateChangedAt: "2026-05-04T09:30:00.000Z",
      stepUpExpiresAt: "2026-05-04T09:18:00.000Z",
    }),
  ).toThrow(ClientApprovalPackProjectionError);
});

test("keeps workspace declaration exports distinct from issued receipt targets", async () => {
  const card = buildClientApprovalCenterPack({
    ...baseApprovalPackInput,
    lifecycleState: "SIGNED",
    receiptDownloadRef: "artifact.receipt.v1.download",
    receiptIssuedAt: "2026-05-04T09:10:00.000Z",
    receiptNextStepLabel: "Signed receipt is ready for your records.",
    receiptPrintRef: "artifact.receipt.v1.print",
    receiptRef: "approval.receipt.v1",
    signedAt: "2026-05-04T09:10:00.000Z",
    stateChangedAt: "2026-05-04T09:10:00.000Z",
  });

  expect(card.receipt_state).toBe("ISSUED");
  expect(card.sign_off_state).toBe("SIGNED_RECEIPT");
  expect(card.artifact_selection.default_download_target_ref_or_null).toBe(
    "artifact.receipt.v1.download",
  );
  expect(card.artifact_selection.default_print_target_ref_or_null).toBe(
    "artifact.receipt.v1.print",
  );
  expect(card.declaration_download_ref).not.toBe(card.receipt_download_ref);
  expect(card.externalization_governance_contract.download_target_ref_or_null).toBe(
    "artifact.receipt.v1.download",
  );

  await validateContractSchema("artifact_selection_contract", card.artifact_selection);
  await validateContractSchema("artifact_affordance_contract", card.artifact_affordance);
  await validateContractSchema(
    "externalization_governance_contract",
    card.externalization_governance_contract,
  );

  const staleTargets = buildApprovalArtifactTargets({
    accessBindingHash: baseApprovalPackInput.accessBindingHash,
    approvalPackId: baseApprovalPackInput.approvalPackId,
    declarationDownloadRef: baseApprovalPackInput.declarationDownloadRef,
    declarationPrintRef: baseApprovalPackInput.declarationPrintRef,
    declarationTextRef: baseApprovalPackInput.declarationTextRef,
    dominantHazardCode: "APPROVAL_PACK_REBASE_REQUIRED",
    lifecycleState: "ACKNOWLEDGED",
    maskingPostureFingerprint: baseApprovalPackInput.maskingPostureFingerprint,
    receiptDownloadRef: null,
    receiptPrintRef: null,
    receiptState: "NOT_ISSUED",
    requiresStepUp: false,
    staleProtectionState: "REBASE_REQUIRED",
    stepUpVerifiedAt: null,
    surface: "WORKSPACE_APPROVAL_CENTER",
    tenantId: baseApprovalPackInput.tenantId,
    visibilityCachePartitionKey: baseApprovalPackInput.visibilityCachePartitionKey,
  });
  expect(staleTargets.artifactSelection.authoritative_subject_refs).toEqual([]);
  expect(staleTargets.artifactSelection.default_preview_target_ref_or_null).toBeNull();
  expect(staleTargets.externalizationGovernanceContract.eligibility_state).toBe("BLOCKED");
});

