import {
  assertPortalLanguageContract,
  buildPortalLanguageContract,
} from "../contracts/portal_language_contract.ts";
import { buildApprovalArtifactTargets } from "../services/build_approval_artifact_targets.ts";
import { deriveApprovalReadinessScore } from "../services/derive_approval_readiness_score.ts";
import { deriveApprovalRecoveryPosture } from "../services/derive_approval_recovery_posture.ts";
import { assertPortalCopy } from "../services/validate_portal_copy.ts";
import { validateApprovalPackChronology } from "../services/validate_approval_pack_chronology.ts";
import type {
  ClientApprovalCenterPackRecord,
  ClientApprovalPackLifecycleState,
  ClientApprovalPackRecord,
  ClientApprovalPackStaleProtectionState,
} from "../types.ts";
import { ClientApprovalPackProjectionError } from "../types.ts";

export type BuildClientApprovalPackInput = {
  accessBindingHash: string;
  acknowledgedAt?: string | null | undefined;
  approvalPackHash: string;
  approvalPackId: string;
  changeDigestAcknowledgedAt?: string | null | undefined;
  changeDigestSummary?: string | undefined;
  changeHighlightCount?: number | undefined;
  changeHighlightsRef: string;
  clientId: string;
  declarationAcknowledgedAt?: string | null | undefined;
  declarationDownloadRef?: string | null | undefined;
  declarationPrintRef?: string | null | undefined;
  declarationTextRef: string;
  dueAt?: string | null | undefined;
  expiresAt?: string | null | undefined;
  languageContract: Record<string, unknown>;
  latestApprovalPackHash?: string | null | undefined;
  latestViewGuardRef?: string | null | undefined;
  lifecycleState: ClientApprovalPackLifecycleState;
  manifestId?: string | null | undefined;
  maskingPostureFingerprint: string;
  now?: string | undefined;
  receiptDownloadRef?: string | null | undefined;
  receiptIssuedAt?: string | null | undefined;
  receiptNextStepLabel?: string | null | undefined;
  receiptPrintRef?: string | null | undefined;
  receiptRef?: string | null | undefined;
  requiresStepUp: boolean;
  signCommandReceiptRef?: string | null | undefined;
  signedAt?: string | null | undefined;
  stateChangedAt: string;
  stepUpExpiresAt?: string | null | undefined;
  stepUpVerifiedAt?: string | null | undefined;
  summary: string;
  summaryRef: string;
  supersededByPackRef?: string | null | undefined;
  supersedesPackRef?: string | null | undefined;
  tenantId: string;
  title: string;
  viewGuardRef: string;
  viewedAt?: string | null | undefined;
  visibilityCachePartitionKey: string;
};

export type BuildClientApprovalCenterInput = {
  accessBindingHash: string;
  clientId: string;
  languageContract: Record<string, unknown>;
  manifestId?: string | null | undefined;
  maskingPostureFingerprint: string;
  packs?: readonly BuildClientApprovalPackInput[] | undefined;
  tenantId: string;
  visibilityCachePartitionKey: string;
};

function customerSafeProjection(input: {
  accessBindingHash: string;
  maskingPostureFingerprint: string;
  visibilityCachePartitionKey: string;
}) {
  return {
    access_binding_hash: input.accessBindingHash,
    artifact_history_policy: "CURRENT_VERSUS_HISTORY_EXPLICIT",
    attachment_visibility_policy: "CUSTOMER_VISIBLE_ATTACHMENTS_ONLY",
    blocked_staff_signal_classes: [
      "ASSIGNMENT_STATE",
      "ESCALATION_LOGIC",
      "RAW_GATE_STATE",
      "STAFF_REASON_CODES",
      "AUDIT_LINEAGE",
      "INTERNAL_ACTIVITY",
      "INTERNAL_ATTACHMENTS",
      "INTERNAL_PARTICIPANTS",
      "INTERNAL_COUNTS",
      "STAFF_ROUTE_CONTEXT",
    ],
    boundary_scope: "CLIENT_APPROVAL_PACK",
    contract_version: "CUSTOMER_SAFE_PROJECTION_V1",
    draft_placeholder_policy: "CUSTOMER_SAFE_PROJECTIONS_EXCLUDE_INTERNAL_DRAFTS",
    export_visibility_policy: "CUSTOMER_VISIBLE_EXPORTS_ONLY",
    hidden_activity_policy: "NO_HIDDEN_ACTIVITY_DERIVATION",
    limitation_notice_policy: "EXPLICIT_CUSTOMER_SAFE_NOTICE_REQUIRED",
    live_update_visibility_policy: "INTERNAL_ONLY_DELTA_EXCLUSION_REQUIRED",
    masking_posture_fingerprint: input.maskingPostureFingerprint,
    module_projection_policy: "CUSTOMER_SAFE_MODULES_AND_METADATA_ONLY",
    notification_navigation_policy: "PORTAL_SAME_SHELL_AND_VISIBILITY_ONLY",
    plain_language_action_policy: "CUSTOMER_SAFE_ACTION_VOCABULARY_ONLY",
    plain_language_status_policy: "CUSTOMER_SAFE_STATUS_VOCABULARY_ONLY",
    projection_audience: "CLIENT_PORTAL",
    recovery_explanation_policy: "EXPLICIT_CUSTOMER_SAFE_RECOVERY_NOTICE_REQUIRED",
    shell_family: "CLIENT_PORTAL_SHELL",
    staff_field_dependency_policy: "EXCLUDE_STAFF_FIELDS_AT_PROJECTION_SOURCE",
    status_derivation_policy: "CUSTOMER_SAFE_BLOCKS_ONLY",
    visibility_cache_partition_key: input.visibilityCachePartitionKey,
  };
}

function terminalTimestampNormalize(input: BuildClientApprovalPackInput) {
  const draftLike = input.lifecycleState === "DRAFT" || input.lifecycleState === "READY_FOR_CLIENT";
  const cancelled = input.lifecycleState === "CANCELLED";
  if (!draftLike && !cancelled) {
    return {
      acknowledgedAt: input.acknowledgedAt ?? null,
      changeDigestAcknowledgedAt: input.changeDigestAcknowledgedAt ?? null,
      declarationAcknowledgedAt: input.declarationAcknowledgedAt ?? null,
      signedAt:
        input.lifecycleState === "SUPERSEDED" || input.lifecycleState === "EXPIRED"
          ? null
          : (input.signedAt ?? null),
      stepUpExpiresAt: input.requiresStepUp ? (input.stepUpExpiresAt ?? null) : null,
      stepUpVerifiedAt: input.requiresStepUp ? (input.stepUpVerifiedAt ?? null) : null,
      viewedAt: input.viewedAt ?? null,
    };
  }
  return {
    acknowledgedAt: null,
    changeDigestAcknowledgedAt: null,
    declarationAcknowledgedAt: null,
    signedAt: null,
    stepUpExpiresAt: null,
    stepUpVerifiedAt: null,
    viewedAt: null,
  };
}

export function deriveApprovalStaleProtectionState(input: {
  approvalPackHash: string;
  expiresAt?: string | null | undefined;
  latestApprovalPackHash?: string | null | undefined;
  latestViewGuardRef?: string | null | undefined;
  lifecycleState: ClientApprovalPackLifecycleState;
  now: string;
  supersededByPackRef?: string | null | undefined;
  viewGuardRef: string;
}): ClientApprovalPackStaleProtectionState {
  if (input.lifecycleState === "SUPERSEDED" || input.supersededByPackRef) {
    return "SUPERSEDED";
  }
  if (input.lifecycleState === "EXPIRED") {
    return "EXPIRED";
  }
  if (input.expiresAt !== null && input.expiresAt !== undefined) {
    const expiresEpoch = Date.parse(input.expiresAt);
    const nowEpoch = Date.parse(input.now);
    if (!Number.isNaN(expiresEpoch) && !Number.isNaN(nowEpoch) && expiresEpoch <= nowEpoch) {
      return "EXPIRED";
    }
  }
  if (input.lifecycleState === "CANCELLED") {
    return "REBASE_REQUIRED";
  }
  if (
    input.latestApprovalPackHash !== null &&
    input.latestApprovalPackHash !== undefined &&
    input.latestApprovalPackHash !== input.approvalPackHash
  ) {
    return "SUPERSEDED";
  }
  if (
    input.latestViewGuardRef !== null &&
    input.latestViewGuardRef !== undefined &&
    input.latestViewGuardRef !== input.viewGuardRef
  ) {
    return "REBASE_REQUIRED";
  }
  return "CURRENT";
}

function assertSignability(input: {
  acknowledgedAt: string | null;
  approvalReadinessScore: number;
  changeDigestAcknowledgedAt: string | null;
  declarationAcknowledgedAt: string | null;
  lifecycleState: ClientApprovalPackLifecycleState;
  recoveryPosture: string;
  requiresStepUp: boolean;
  signedAt: string | null;
  staleProtectionState: ClientApprovalPackStaleProtectionState;
  stateChangedAt: string;
  stepUpExpiresAt: string | null;
  stepUpVerifiedAt: string | null;
}) {
  if (input.lifecycleState !== "SIGNED" && input.lifecycleState !== "COUNTERSIGNED") {
    return;
  }
  if (
    input.staleProtectionState !== "CURRENT" ||
    input.approvalReadinessScore < 85 ||
    input.recoveryPosture !== "NONE" ||
    input.changeDigestAcknowledgedAt === null ||
    input.declarationAcknowledgedAt === null ||
    input.acknowledgedAt === null
  ) {
    throw new ClientApprovalPackProjectionError(
      "signed approval packs require current stale posture, acknowledgement lineage, and readiness >= 85",
      ["CLIENT_APPROVAL_PACK_SIGNED_NOT_SIGNABLE"],
    );
  }
  if (input.requiresStepUp) {
    const expiresEpoch = input.stepUpExpiresAt === null ? NaN : Date.parse(input.stepUpExpiresAt);
    const stateEpoch = Date.parse(input.stateChangedAt);
    if (
      input.stepUpVerifiedAt === null ||
      Number.isNaN(expiresEpoch) ||
      Number.isNaN(stateEpoch) ||
      expiresEpoch <= stateEpoch
    ) {
      throw new ClientApprovalPackProjectionError(
        "signed approval packs require fresh step-up proof",
        ["CLIENT_APPROVAL_PACK_SIGNED_STEP_UP_NOT_FRESH"],
      );
    }
  }
}

export function buildClientApprovalPack(
  input: BuildClientApprovalPackInput,
): ClientApprovalPackRecord {
  assertPortalLanguageContract(input.languageContract, "`languageContract`");
  assertPortalCopy({
    budgetKey: "approval_title_max_chars",
    fieldName: "`title`",
    value: input.title,
  });
  const timestamps = terminalTimestampNormalize(input);
  const staleProtectionState = deriveApprovalStaleProtectionState({
    approvalPackHash: input.approvalPackHash,
    expiresAt: input.expiresAt,
    latestApprovalPackHash: input.latestApprovalPackHash,
    latestViewGuardRef: input.latestViewGuardRef,
    lifecycleState: input.lifecycleState,
    now: input.now ?? input.stateChangedAt,
    supersededByPackRef: input.supersededByPackRef,
    viewGuardRef: input.viewGuardRef,
  });

  validateApprovalPackChronology({
    acknowledgedAt: timestamps.acknowledgedAt,
    changeDigestAcknowledgedAt: timestamps.changeDigestAcknowledgedAt,
    declarationAcknowledgedAt: timestamps.declarationAcknowledgedAt,
    lifecycleState: input.lifecycleState,
    requiresStepUp: input.requiresStepUp,
    signedAt: timestamps.signedAt,
    stateChangedAt: input.stateChangedAt,
    stepUpExpiresAt: timestamps.stepUpExpiresAt,
    stepUpVerifiedAt: timestamps.stepUpVerifiedAt,
    viewedAt: timestamps.viewedAt,
  });

  const approvalReadinessScore = deriveApprovalReadinessScore({
    acknowledgedAt: timestamps.acknowledgedAt,
    changeDigestAcknowledgedAt: timestamps.changeDigestAcknowledgedAt,
    declarationAcknowledgedAt: timestamps.declarationAcknowledgedAt,
    requiresStepUp: input.requiresStepUp,
    staleProtectionState,
    stateChangedAt: input.stateChangedAt,
    stepUpExpiresAt: timestamps.stepUpExpiresAt,
    stepUpVerifiedAt: timestamps.stepUpVerifiedAt,
    viewedAt: timestamps.viewedAt,
  });
  const recovery = deriveApprovalRecoveryPosture({
    lifecycleState: input.lifecycleState,
    requiresStepUp: input.requiresStepUp,
    staleProtectionState,
    stateChangedAt: input.stateChangedAt,
    stepUpExpiresAt: timestamps.stepUpExpiresAt,
    stepUpVerifiedAt: timestamps.stepUpVerifiedAt,
  });
  assertSignability({
    acknowledgedAt: timestamps.acknowledgedAt,
    approvalReadinessScore,
    changeDigestAcknowledgedAt: timestamps.changeDigestAcknowledgedAt,
    declarationAcknowledgedAt: timestamps.declarationAcknowledgedAt,
    lifecycleState: input.lifecycleState,
    recoveryPosture: recovery.recoveryPosture,
    requiresStepUp: input.requiresStepUp,
    signedAt: timestamps.signedAt,
    staleProtectionState,
    stateChangedAt: input.stateChangedAt,
    stepUpExpiresAt: timestamps.stepUpExpiresAt,
    stepUpVerifiedAt: timestamps.stepUpVerifiedAt,
  });

  const targets = buildApprovalArtifactTargets({
    accessBindingHash: input.accessBindingHash,
    approvalPackId: input.approvalPackId,
    declarationDownloadRef: input.declarationDownloadRef ?? null,
    declarationPrintRef: input.declarationPrintRef ?? null,
    declarationTextRef: input.declarationTextRef,
    dominantHazardCode: recovery.dominantHazardCode,
    lifecycleState: input.lifecycleState,
    maskingPostureFingerprint: input.maskingPostureFingerprint,
    receiptDownloadRef: input.receiptDownloadRef ?? null,
    receiptPrintRef: input.receiptPrintRef ?? null,
    receiptState:
      input.lifecycleState === "SIGNED" || input.lifecycleState === "COUNTERSIGNED"
        ? "ISSUED"
        : "NOT_ISSUED",
    requiresStepUp: input.requiresStepUp,
    staleProtectionState,
    stepUpVerifiedAt: timestamps.stepUpVerifiedAt,
    surface: "STANDALONE_PACK",
    tenantId: input.tenantId,
    visibilityCachePartitionKey: input.visibilityCachePartitionKey,
  });

  return {
    acknowledged_at: timestamps.acknowledgedAt,
    approval_pack_hash: input.approvalPackHash,
    approval_pack_id: input.approvalPackId,
    approval_readiness_score: approvalReadinessScore,
    artifact_affordance: targets.artifactAffordance,
    artifact_selection: targets.artifactSelection,
    artifact_type: "ClientApprovalPack",
    change_digest_acknowledged_at: timestamps.changeDigestAcknowledgedAt,
    change_highlights_ref: input.changeHighlightsRef,
    client_id: input.clientId,
    customer_safe_projection: customerSafeProjection({
      accessBindingHash: input.accessBindingHash,
      maskingPostureFingerprint: input.maskingPostureFingerprint,
      visibilityCachePartitionKey: input.visibilityCachePartitionKey,
    }),
    declaration_acknowledged_at: timestamps.declarationAcknowledgedAt,
    declaration_text_ref: input.declarationTextRef,
    dominant_hazard_code: recovery.dominantHazardCode,
    externalization_governance_contract: targets.externalizationGovernanceContract,
    language_contract: buildPortalLanguageContract(),
    lifecycle_state: input.lifecycleState,
    manifest_id: input.manifestId ?? null,
    recovery_posture: recovery.recoveryPosture,
    requires_step_up: input.requiresStepUp,
    signed_at: timestamps.signedAt,
    state_changed_at: input.stateChangedAt,
    stale_protection_state: staleProtectionState,
    step_up_expires_at: timestamps.stepUpExpiresAt,
    step_up_verified_at: timestamps.stepUpVerifiedAt,
    summary_ref: input.summaryRef,
    supersedes_pack_ref: input.supersedesPackRef ?? null,
    tenant_id: input.tenantId,
    title: input.title,
    view_guard_ref: input.viewGuardRef,
    viewed_at: timestamps.viewedAt,
  } satisfies ClientApprovalPackRecord;
}

function receiptStateForPack(input: BuildClientApprovalPackInput) {
  if (input.lifecycleState === "SIGNED" || input.lifecycleState === "COUNTERSIGNED") {
    return "ISSUED" as const;
  }
  if (input.signCommandReceiptRef !== null && input.signCommandReceiptRef !== undefined) {
    return "PENDING_SETTLEMENT" as const;
  }
  return "NOT_ISSUED" as const;
}

function cardStatus(lifecycleState: ClientApprovalPackLifecycleState) {
  if (lifecycleState === "COUNTERSIGNED") {
    return "SIGNED";
  }
  if (lifecycleState === "DRAFT" || lifecycleState === "CANCELLED") {
    return "READY_FOR_CLIENT";
  }
  return lifecycleState;
}

function signOffState(input: {
  receiptState: "ISSUED" | "NOT_ISSUED" | "PENDING_SETTLEMENT";
  staleProtectionState: ClientApprovalPackStaleProtectionState;
  status: ReturnType<typeof cardStatus>;
}) {
  if (input.receiptState === "ISSUED" || input.status === "SIGNED") {
    return "SIGNED_RECEIPT" as const;
  }
  if (
    ["REBASE_REQUIRED", "SUPERSEDED", "EXPIRED"].includes(input.staleProtectionState) ||
    input.status === "SUPERSEDED" ||
    input.status === "EXPIRED"
  ) {
    return "STALE_REVIEW_REQUIRED" as const;
  }
  if (input.receiptState === "PENDING_SETTLEMENT") {
    return "SIGNATURE_PENDING_SETTLEMENT" as const;
  }
  if (input.status === "STEP_UP_REQUIRED") {
    return "STEP_UP_CHECKPOINT" as const;
  }
  if (input.status === "ACKNOWLEDGED") {
    return "READY_TO_SIGN" as const;
  }
  return "REVIEW_REQUIRED" as const;
}

function primaryAction(input: {
  approvalPackId: string;
  readinessScore: number;
  requiresStepUp: boolean;
  signOffState: ReturnType<typeof signOffState>;
  staleProtectionState: ClientApprovalPackStaleProtectionState;
}) {
  if (input.signOffState === "READY_TO_SIGN" && input.readinessScore >= 85) {
    return {
      action_code: "SIGN",
      context_object_ref: input.approvalPackId,
      focus_anchor_ref: `${input.approvalPackId}.sign`,
      label: "Sign now",
      requires_step_up: input.requiresStepUp,
      route: "APPROVALS",
    };
  }
  if (input.signOffState === "STEP_UP_CHECKPOINT") {
    return {
      action_code: "COMPLETE_STEP_UP",
      context_object_ref: input.approvalPackId,
      focus_anchor_ref: `${input.approvalPackId}.step-up`,
      label: "Confirm identity",
      requires_step_up: input.requiresStepUp,
      route: "APPROVALS",
    };
  }
  if (input.signOffState === "SIGNED_RECEIPT") {
    return {
      action_code: "VIEW_RECEIPT",
      context_object_ref: input.approvalPackId,
      focus_anchor_ref: `${input.approvalPackId}.receipt`,
      label: "View receipt",
      requires_step_up: false,
      route: "APPROVALS",
    };
  }
  if (input.signOffState === "SIGNATURE_PENDING_SETTLEMENT") {
    return {
      action_code: "VIEW_SIGNING_STATUS",
      context_object_ref: input.approvalPackId,
      focus_anchor_ref: `${input.approvalPackId}.status`,
      label: "View status",
      requires_step_up: false,
      route: "APPROVALS",
    };
  }
  return {
    action_code:
      input.staleProtectionState === "CURRENT" ? "REVIEW_APPROVAL" : "REVIEW_LATEST_APPROVAL",
    context_object_ref: input.approvalPackId,
    focus_anchor_ref: input.approvalPackId,
    label: input.staleProtectionState === "CURRENT" ? "Review" : "Review latest",
    requires_step_up: input.requiresStepUp,
    route: "APPROVALS",
  };
}

export function buildClientApprovalCenterPack(
  input: BuildClientApprovalPackInput,
): ClientApprovalCenterPackRecord {
  assertPortalLanguageContract(input.languageContract, "`languageContract`");
  assertPortalCopy({
    budgetKey: "approval_summary_max_chars",
    fieldName: "`summary`",
    value: input.summary,
  });
  assertPortalCopy({
    budgetKey: "approval_change_digest_max_chars",
    fieldName: "`changeDigestSummary`",
    value: input.changeDigestSummary ?? "One declaration is ready for your review.",
  });
  const pack = buildClientApprovalPack(input);
  const receiptState = receiptStateForPack(input);
  const status = cardStatus(input.lifecycleState);
  const signState = signOffState({
    receiptState,
    staleProtectionState: pack.stale_protection_state,
    status,
  });
  const targets = buildApprovalArtifactTargets({
    accessBindingHash: input.accessBindingHash,
    approvalPackId: input.approvalPackId,
    declarationDownloadRef: input.declarationDownloadRef ?? null,
    declarationPrintRef: input.declarationPrintRef ?? null,
    declarationTextRef: input.declarationTextRef,
    dominantHazardCode: pack.dominant_hazard_code,
    lifecycleState: input.lifecycleState,
    maskingPostureFingerprint: input.maskingPostureFingerprint,
    receiptDownloadRef: receiptState === "ISSUED" ? (input.receiptDownloadRef ?? null) : null,
    receiptPrintRef: receiptState === "ISSUED" ? (input.receiptPrintRef ?? null) : null,
    receiptState,
    requiresStepUp: input.requiresStepUp,
    staleProtectionState: pack.stale_protection_state,
    stepUpVerifiedAt: pack.step_up_verified_at,
    surface: "WORKSPACE_APPROVAL_CENTER",
    tenantId: input.tenantId,
    visibilityCachePartitionKey: input.visibilityCachePartitionKey,
  });
  return {
    approval_acknowledged: pack.acknowledged_at !== null,
    approval_pack_id: input.approvalPackId,
    approval_readiness_score: pack.approval_readiness_score,
    artifact_affordance: targets.artifactAffordance,
    artifact_selection: targets.artifactSelection,
    change_digest_acknowledged: pack.change_digest_acknowledged_at !== null,
    change_digest_summary: input.changeDigestSummary ?? "One declaration is ready for your review.",
    change_highlight_count: input.changeHighlightCount ?? 1,
    change_highlights_ref: input.changeHighlightsRef,
    declaration_acknowledged: pack.declaration_acknowledged_at !== null,
    declaration_download_ref: input.declarationDownloadRef ?? `${input.approvalPackId}.declaration.download`,
    declaration_print_ref: input.declarationPrintRef ?? `${input.approvalPackId}.declaration.print`,
    declaration_text_ref: input.declarationTextRef,
    dominant_hazard_code: pack.dominant_hazard_code,
    due_at: input.dueAt ?? null,
    externalization_governance_contract: targets.externalizationGovernanceContract,
    primary_action: primaryAction({
      approvalPackId: input.approvalPackId,
      readinessScore: pack.approval_readiness_score,
      requiresStepUp: input.requiresStepUp,
      signOffState: signState,
      staleProtectionState: pack.stale_protection_state,
    }),
    receipt_download_ref: receiptState === "ISSUED" ? (input.receiptDownloadRef ?? null) : null,
    receipt_issued_at: receiptState === "ISSUED" ? (input.receiptIssuedAt ?? input.signedAt ?? null) : null,
    receipt_next_step_label:
      receiptState === "ISSUED"
        ? (input.receiptNextStepLabel ?? "Signed receipt is ready for your records.")
        : null,
    receipt_print_ref: receiptState === "ISSUED" ? (input.receiptPrintRef ?? null) : null,
    receipt_ref: receiptState === "ISSUED" ? (input.receiptRef ?? `${input.approvalPackId}.receipt`) : null,
    receipt_state: receiptState,
    recovery_posture: pack.recovery_posture,
    requires_step_up: input.requiresStepUp,
    settlement_pending_label:
      receiptState === "PENDING_SETTLEMENT" ? "Signature is pending settlement." : null,
    sign_command_receipt_ref:
      receiptState === "PENDING_SETTLEMENT" ? (input.signCommandReceiptRef ?? null) : null,
    sign_off_state: signState,
    stale_protection_state: pack.stale_protection_state,
    status,
    step_up_checkpoint_state:
      input.requiresStepUp === false
        ? "NOT_REQUIRED"
        : receiptState === "PENDING_SETTLEMENT" || receiptState === "ISSUED"
          ? "SATISFIED"
          : "REQUIRED",
    step_up_surface: input.requiresStepUp ? "INLINE_CHECKPOINT" : "NOT_REQUIRED",
    summary: input.summary,
    superseded_by_pack_ref: status === "SUPERSEDED" ? (input.supersededByPackRef ?? null) : null,
    title: input.title,
  } satisfies ClientApprovalCenterPackRecord;
}

function defaultApprovalPackInputs(input: BuildClientApprovalCenterInput): BuildClientApprovalPackInput[] {
  return [
    {
      accessBindingHash: input.accessBindingHash,
      acknowledgedAt: "2026-05-03T09:07:00.000Z",
      approvalPackHash: "approval.pack.hash.2026.v1",
      approvalPackId: "approval.pack.2026",
      changeDigestAcknowledgedAt: "2026-05-03T09:05:00.000Z",
      changeDigestSummary: "One declaration is ready for your review.",
      changeHighlightCount: 1,
      changeHighlightsRef: "copy.approval.change-highlights",
      clientId: input.clientId,
      declarationAcknowledgedAt: "2026-05-03T09:06:00.000Z",
      declarationDownloadRef: "artifact.approval.declaration.download",
      declarationPrintRef: "artifact.approval.declaration.print",
      declarationTextRef: "copy.approval.declaration",
      dueAt: "2026-05-10T12:00:00.000Z",
      languageContract: input.languageContract,
      latestApprovalPackHash: "approval.pack.hash.2026.v1",
      latestViewGuardRef: "view-guard.approval.2026.v1",
      lifecycleState: "ACKNOWLEDGED",
      manifestId: input.manifestId ?? "manifest.portal.2026",
      maskingPostureFingerprint: input.maskingPostureFingerprint,
      now: "2026-05-03T09:08:00.000Z",
      requiresStepUp: true,
      stateChangedAt: "2026-05-03T09:08:00.000Z",
      stepUpExpiresAt: "2026-05-03T09:18:00.000Z",
      stepUpVerifiedAt: "2026-05-03T09:08:00.000Z",
      summary: "Please review and sign the declaration.",
      summaryRef: "copy.approval.summary",
      tenantId: input.tenantId,
      title: "Tax declaration approval",
      viewGuardRef: "view-guard.approval.2026.v1",
      viewedAt: "2026-05-03T09:00:00.000Z",
      visibilityCachePartitionKey: input.visibilityCachePartitionKey,
    },
  ];
}

function approvalPackRequiresAction(pack: ClientApprovalCenterPackRecord) {
  return (
    ["READY_FOR_CLIENT", "VIEWED", "ACKNOWLEDGED", "STEP_UP_REQUIRED"].includes(pack.status) &&
    pack.receipt_state === "NOT_ISSUED" &&
    pack.stale_protection_state !== "SUPERSEDED" &&
    pack.stale_protection_state !== "EXPIRED"
  );
}

export function buildClientApprovalCenter(input: BuildClientApprovalCenterInput) {
  const packs = (input.packs ?? defaultApprovalPackInputs(input)).map((pack) =>
    buildClientApprovalCenterPack(pack),
  );
  return {
    latest_pack_ref: packs[0]?.approval_pack_id ?? null,
    outstanding_count: packs.filter(approvalPackRequiresAction).length,
    packs,
    surface_order: ["APPROVAL_SUMMARY", "CHANGE_DIGEST", "DECLARATION_PANEL", "SIGN_OFF_PANEL"],
  };
}
