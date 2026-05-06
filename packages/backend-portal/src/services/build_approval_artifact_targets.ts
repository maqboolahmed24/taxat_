import type {
  ArtifactAffordanceContractRecord,
  ArtifactSelectionContractRecord,
  ClientApprovalPackLifecycleState,
  ClientApprovalPackStaleProtectionState,
  ExternalizationGovernanceContractRecord,
} from "../types.ts";
import { deriveArtifactAffordanceContract } from "./derive_artifact_affordance_contract.ts";
import { derivePortalExternalizationGovernanceContract } from "./derive_portal_externalization_governance_contract.ts";
import { validateArtifactTargetAlignment } from "./validate_artifact_target_alignment.ts";

export type ApprovalArtifactTargetSurface = "STANDALONE_PACK" | "WORKSPACE_APPROVAL_CENTER";

export type ApprovalReceiptState = "ISSUED" | "NOT_ISSUED" | "PENDING_SETTLEMENT";

export type ApprovalArtifactTargets = {
  artifactAffordance: ArtifactAffordanceContractRecord;
  artifactSelection: ArtifactSelectionContractRecord;
  externalizationGovernanceContract: ExternalizationGovernanceContractRecord;
};

export type BuildApprovalArtifactTargetsInput = {
  accessBindingHash: string;
  approvalPackId: string;
  declarationDownloadRef: string | null;
  declarationPrintRef: string | null;
  declarationTextRef: string;
  dominantHazardCode: string | null;
  lifecycleState: ClientApprovalPackLifecycleState;
  maskingPostureFingerprint: string;
  receiptDownloadRef: string | null;
  receiptPrintRef: string | null;
  receiptState: ApprovalReceiptState;
  requiresStepUp: boolean;
  staleProtectionState: ClientApprovalPackStaleProtectionState;
  stepUpVerifiedAt: string | null;
  surface: ApprovalArtifactTargetSurface;
  tenantId: string;
  visibilityCachePartitionKey: string;
};

function approvalPackHeaderPosture(input: {
  lifecycleState: ClientApprovalPackLifecycleState;
  staleProtectionState: ClientApprovalPackStaleProtectionState;
}) {
  if (input.staleProtectionState === "SUPERSEDED" || input.lifecycleState === "SUPERSEDED") {
    return "SUPERSEDED";
  }
  if (input.staleProtectionState === "EXPIRED" || input.lifecycleState === "EXPIRED") {
    return "EXPIRED";
  }
  if (input.staleProtectionState === "REBASE_REQUIRED" || input.lifecycleState === "CANCELLED") {
    return "HISTORICAL";
  }
  return "CURRENT";
}

function hasAuthoritativePack(input: {
  lifecycleState: ClientApprovalPackLifecycleState;
  staleProtectionState: ClientApprovalPackStaleProtectionState;
}) {
  return (
    input.staleProtectionState === "CURRENT" &&
    !["CANCELLED", "EXPIRED", "SUPERSEDED"].includes(input.lifecycleState)
  );
}

function deriveWorkspaceApprovalRequirement(input: BuildApprovalArtifactTargetsInput) {
  if (
    input.lifecycleState === "SUPERSEDED" ||
    input.lifecycleState === "EXPIRED" ||
    input.staleProtectionState !== "CURRENT"
  ) {
    return {
      approvalRequirementTokenOrNull: null,
      approvalState: "DENIED" as const,
    };
  }
  if (input.requiresStepUp) {
    const satisfied =
      input.receiptState === "PENDING_SETTLEMENT" ||
      input.receiptState === "ISSUED" ||
      input.lifecycleState === "SIGNED" ||
      input.lifecycleState === "COUNTERSIGNED";
    return {
      approvalRequirementTokenOrNull: satisfied ? null : "INLINE_CHECKPOINT",
      approvalState: satisfied ? ("SATISFIED" as const) : ("REQUIRED_PENDING" as const),
    };
  }
  return {
    approvalRequirementTokenOrNull: null,
    approvalState: "NOT_REQUIRED" as const,
  };
}

function deriveStandaloneApprovalRequirement(input: BuildApprovalArtifactTargetsInput) {
  if (["CANCELLED", "EXPIRED", "SUPERSEDED"].includes(input.lifecycleState)) {
    return {
      approvalRequirementTokenOrNull: null,
      approvalState: "DENIED" as const,
    };
  }
  if (input.requiresStepUp) {
    return {
      approvalRequirementTokenOrNull: "INLINE_CHECKPOINT",
      approvalState:
        input.stepUpVerifiedAt !== null ||
        input.lifecycleState === "SIGNED" ||
        input.lifecycleState === "COUNTERSIGNED"
          ? ("SATISFIED" as const)
          : ("REQUIRED_PENDING" as const),
    };
  }
  return {
    approvalRequirementTokenOrNull: null,
    approvalState: "NOT_REQUIRED" as const,
  };
}

export function buildApprovalArtifactTargets(
  input: BuildApprovalArtifactTargetsInput,
): ApprovalArtifactTargets {
  const authoritative = hasAuthoritativePack(input);
  const previewTarget = authoritative ? input.declarationTextRef : null;
  const workspaceReceiptIssued = input.surface === "WORKSPACE_APPROVAL_CENTER" && input.receiptState === "ISSUED";
  const downloadTarget =
    input.surface === "WORKSPACE_APPROVAL_CENTER" && authoritative
      ? workspaceReceiptIssued
        ? input.receiptDownloadRef
        : input.declarationDownloadRef
      : null;
  const printTarget =
    input.surface === "WORKSPACE_APPROVAL_CENTER" && authoritative
      ? workspaceReceiptIssued
        ? input.receiptPrintRef
        : input.declarationPrintRef
      : null;
  const approvalRequirement =
    input.surface === "WORKSPACE_APPROVAL_CENTER"
      ? deriveWorkspaceApprovalRequirement(input)
      : deriveStandaloneApprovalRequirement(input);
  const blockingContextTokens = authoritative
    ? []
    : [input.staleProtectionState || input.lifecycleState].filter(
        (value): value is string => typeof value === "string" && value.length > 0,
      );

  const artifactSelection: ArtifactSelectionContractRecord = {
    authoritative_subject_refs: authoritative ? [input.approvalPackId] : [],
    default_download_target_ref_or_null: downloadTarget,
    default_preview_target_ref_or_null: previewTarget,
    default_print_target_ref_or_null: printTarget,
    historical_subject_refs: [],
    limited_history_count_or_null: null,
    limited_history_state: "NONE",
    presentation_mode: "CURRENT_PRIMARY_HISTORY_SECONDARY",
    primary_subject_refs: [input.approvalPackId],
    selection_scope: "CLIENT_APPROVAL_PACK",
  };
  const artifactAffordance: ArtifactAffordanceContractRecord = deriveArtifactAffordanceContract({
    affordanceScope: "CLIENT_APPROVAL_PACK",
    defaultDownloadTargetRefOrNull: downloadTarget,
    defaultPreviewTargetRefOrNull: previewTarget,
    defaultPrintTargetRefOrNull: printTarget,
    headerPosture: approvalPackHeaderPosture(input),
    historyAffordanceState: "NONE",
    primarySubjectRefOrNull: input.approvalPackId,
    primarySubjectRole: "APPROVAL_PACK",
  });
  const externalizationGovernanceContract: ExternalizationGovernanceContractRecord =
    derivePortalExternalizationGovernanceContract({
      accessBindingHash: input.accessBindingHash,
      approvalRequirementTokenOrNull:
        approvalRequirement.approvalRequirementTokenOrNull,
      approvalState: approvalRequirement.approvalState,
      blockingContextTokens,
      boundaryScope: "CLIENT_APPROVAL_PACK",
      contextAnchorRef: input.approvalPackId,
      downloadTargetRefOrNull: downloadTarget,
      eligibilityState: authoritative ? "READY" : "BLOCKED",
      historyMeaningState: "CURRENT_DECLARATION_OR_ISSUED_RECEIPT",
      limitationState: "FULL",
      maskingPostureFingerprint: input.maskingPostureFingerprint,
      previewTargetRefOrNull: previewTarget,
      printTargetRefOrNull: printTarget,
      sliceBindingRef: input.approvalPackId,
      tenantId: input.tenantId,
      visibilityCachePartitionKey: input.visibilityCachePartitionKey,
    });
  validateArtifactTargetAlignment({
    artifactAffordance,
    artifactSelection,
    externalizationGovernanceContract,
  });

  return {
    artifactAffordance,
    artifactSelection,
    externalizationGovernanceContract,
  };
}
