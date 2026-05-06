import { deriveMinimalRequestArtifactAffordanceAdapter } from "../services/derive_minimal_request_artifact_affordance_adapter.ts";
import { derivePortalExternalizationGovernanceContract } from "../services/derive_portal_externalization_governance_contract.ts";
import { deriveRequestArtifactSelectionContract } from "../services/derive_request_artifact_selection_contract.ts";
import { validateArtifactTargetAlignment } from "../services/validate_artifact_target_alignment.ts";
import { assertPortalCopy } from "../services/validate_portal_copy.ts";
import { validateDocumentRequestCardLineage } from "../services/validate_request_local_upload_lineage.ts";
import type {
  ClientDocumentHistoryDisclosureState,
  ClientDocumentProjectedUploadRow,
  ClientDocumentRequestCardRecord,
  ClientDocumentRequestCardStatus,
  ClientDocumentRequestRecord,
} from "../types.ts";

export type BuildDocumentRequestCardInput = {
  acceptedFileTypes: readonly string[];
  accessBindingHash: string;
  clientRequest: ClientDocumentRequestRecord;
  currentArtifactUploadRefOrNull?: string | null | undefined;
  dueLabel: string;
  helpText?: string | null | undefined;
  historyDisclosureState?: ClientDocumentHistoryDisclosureState | undefined;
  limitedHistoryCountOrNull?: number | null | undefined;
  maskingPostureFingerprint: string;
  maxFileSizeMb: number;
  uploads: readonly ClientDocumentProjectedUploadRow[];
  visibilityCachePartitionKey: string;
  whyRequestedLabel: string;
};

function deriveRequestCardStatus(input: {
  currentUpload: ClientDocumentProjectedUploadRow | null;
  request: ClientDocumentRequestRecord;
}): ClientDocumentRequestCardStatus {
  if (input.request.lifecycle_state === "EXPIRED") {
    return "EXPIRED";
  }
  if (input.request.lifecycle_state === "REJECTED") {
    return "REJECTED";
  }
  if (input.request.lifecycle_state === "ACCEPTED") {
    return "ACCEPTED";
  }
  if (
    input.currentUpload?.transfer_state === "QUEUED" ||
    input.currentUpload?.transfer_state === "UPLOADING" ||
    input.currentUpload?.transfer_state === "SCANNING"
  ) {
    return "UPLOADING";
  }
  if (
    input.request.lifecycle_state === "SUBMITTED" ||
    input.request.lifecycle_state === "UNDER_REVIEW"
  ) {
    return "UNDER_REVIEW";
  }
  return "OPEN";
}

function latestRejectedOrFailedUpload(uploads: readonly ClientDocumentProjectedUploadRow[]) {
  return (
    uploads.find(
      (upload) => upload.transfer_state === "REJECTED" || upload.transfer_state === "FAILED",
    ) ?? null
  );
}

function externalizationGovernanceContract(input: {
  accessBindingHash: string;
  downloadTargetRefOrNull: string | null;
  hasHistory: boolean;
  maskingPostureFingerprint: string;
  previewTargetRefOrNull: string | null;
  blockingContextTokens: readonly string[];
  limitationState: "FULL" | "HISTORY_LIMITED" | "POLICY_LIMITED";
  request: ClientDocumentRequestRecord;
  visibilityCachePartitionKey: string;
}) {
  const ready = input.downloadTargetRefOrNull !== null;
  return derivePortalExternalizationGovernanceContract({
    accessBindingHash: input.accessBindingHash,
    blockingContextTokens: ready ? [] : input.blockingContextTokens,
    boundaryScope: "CLIENT_DOCUMENT_REQUEST",
    contextAnchorRef: input.request.request_id,
    downloadTargetRefOrNull: input.downloadTargetRefOrNull,
    eligibilityState: ready ? "READY" : "BLOCKED",
    historyMeaningState: input.hasHistory
      ? "CURRENT_WITH_HISTORY_EXPLICIT"
      : "CURRENT_ONLY",
    limitationState: input.limitationState,
    maskingPostureFingerprint: input.maskingPostureFingerprint,
    previewTargetRefOrNull: input.previewTargetRefOrNull,
    printTargetRefOrNull: null,
    sliceBindingRef: input.request.request_version_ref,
    tenantId: input.request.tenant_id,
    visibilityCachePartitionKey: input.visibilityCachePartitionKey,
  });
}

export function buildDocumentRequestCard(
  input: BuildDocumentRequestCardInput,
): ClientDocumentRequestCardRecord {
  assertPortalCopy({
    budgetKey: "request_due_label_max_chars",
    dueLabel: true,
    fieldName: "`dueLabel`",
    value: input.dueLabel,
  });
  assertPortalCopy({
    budgetKey: "request_why_label_max_chars",
    fieldName: "`whyRequestedLabel`",
    value: input.whyRequestedLabel,
  });
  assertPortalCopy({
    budgetKey: "request_help_text_max_chars",
    fieldName: "`helpText`",
    value: input.helpText,
  });
  const uploads = [...input.uploads].sort((left, right) => {
    const rightEpoch = right.uploaded_at === null ? -1 : Date.parse(right.uploaded_at);
    const leftEpoch = left.uploaded_at === null ? -1 : Date.parse(left.uploaded_at);
    if (rightEpoch !== leftEpoch) {
      return rightEpoch - leftEpoch;
    }
    return right.upload_session_id.localeCompare(left.upload_session_id);
  });
  const currentRequestUpload =
    uploads.find(
      (upload) =>
        upload.upload_session_id === input.clientRequest.current_request_upload_ref_or_null,
    ) ?? null;
  const initialStatus = deriveRequestCardStatus({
    currentUpload: currentRequestUpload,
    request: input.clientRequest,
  });
  const currentUploadRef =
    initialStatus === "OPEN" || initialStatus === "EXPIRED"
      ? null
      : initialStatus === "REJECTED"
        ? latestRejectedOrFailedUpload(uploads)?.upload_session_id ?? null
        : input.clientRequest.current_request_upload_ref_or_null;
  const currentArtifactUploadRef =
    initialStatus === "OPEN" || initialStatus === "EXPIRED" || initialStatus === "REJECTED"
      ? null
      : (input.currentArtifactUploadRefOrNull ??
        (currentRequestUpload?.transfer_state === "ACCEPTED"
          ? currentRequestUpload.upload_session_id
          : null));
  const currentArtifactUpload =
    currentArtifactUploadRef === null
      ? null
      : uploads.find((upload) => upload.upload_session_id === currentArtifactUploadRef) ?? null;
  const primarySubjectRef = currentArtifactUploadRef ?? currentUploadRef;
  const historicalSubjectRefs = uploads
    .map((upload) => upload.upload_session_id)
    .filter((uploadRef) => uploadRef !== primarySubjectRef);
  const defaultPreviewTarget =
    currentArtifactUpload?.preview_posture === "SAME_SHELL_PREVIEW"
      ? currentArtifactUploadRef
      : null;
  const defaultDownloadTarget = currentArtifactUpload?.download_ref ?? null;
  const selection = deriveRequestArtifactSelectionContract({
    authoritativeSubjectRefOrNull: currentArtifactUploadRef,
    defaultDownloadTargetRefOrNull: defaultDownloadTarget,
    defaultPreviewTargetRefOrNull: defaultPreviewTarget,
    historicalSubjectRefs,
    historyDisclosureState: input.historyDisclosureState ?? "FULL",
    limitedHistoryCountOrNull: input.limitedHistoryCountOrNull ?? null,
    primarySubjectRefOrNull: primarySubjectRef,
  });
  const affordance = deriveMinimalRequestArtifactAffordanceAdapter({
    defaultDownloadTargetRefOrNull: selection.default_download_target_ref_or_null,
    defaultPreviewTargetRefOrNull: selection.default_preview_target_ref_or_null,
    headerPosture:
      initialStatus === "EXPIRED"
        ? "EXPIRED"
        : initialStatus === "REJECTED"
          ? "REJECTED"
          : currentArtifactUploadRef === null
            ? "AWAITING_CURRENT_REPLACEMENT"
            : historicalSubjectRefs.length > 0
              ? "CURRENT_WITH_HISTORY"
              : "CURRENT",
    historicalSubjectRefs,
    historyDisclosureState: input.historyDisclosureState ?? "FULL",
    primarySubjectRefOrNull: primarySubjectRef,
    primarySubjectRole:
      currentArtifactUploadRef !== null
        ? "CURRENT_ARTIFACT"
        : primarySubjectRef === null
          ? "NO_CURRENT_ARTIFACT"
          : "CURRENT_REQUEST_UPLOAD",
  });
  const blockingContextTokens =
    currentArtifactUpload === null
      ? [initialStatus]
      : currentArtifactUpload.preview_reason_code !== null
        ? [currentArtifactUpload.preview_reason_code]
        : currentArtifactUpload.dominant_hazard_code !== null
          ? [currentArtifactUpload.dominant_hazard_code]
          : [];
  const externalization = externalizationGovernanceContract({
    accessBindingHash: input.accessBindingHash,
    blockingContextTokens,
    downloadTargetRefOrNull: selection.default_download_target_ref_or_null,
    hasHistory: historicalSubjectRefs.length > 0,
    limitationState:
      currentArtifactUpload?.preview_reason_code === "POLICY_LIMITED"
        ? "POLICY_LIMITED"
        : historicalSubjectRefs.length > 0
          ? "HISTORY_LIMITED"
          : "FULL",
    maskingPostureFingerprint: input.maskingPostureFingerprint,
    previewTargetRefOrNull: selection.default_preview_target_ref_or_null,
    request: input.clientRequest,
    visibilityCachePartitionKey: input.visibilityCachePartitionKey,
  });
  validateArtifactTargetAlignment({
    artifactAffordance: affordance,
    artifactSelection: selection,
    externalizationGovernanceContract: externalization,
  });
  const card = {
    accepted_file_types: [...input.acceptedFileTypes],
    artifact_affordance: affordance,
    artifact_selection: selection,
    category: input.clientRequest.category,
    current_artifact_upload_ref: currentArtifactUploadRef,
    current_upload_ref: currentUploadRef,
    due_at: input.clientRequest.due_at,
    due_label: input.dueLabel,
    externalization_governance_contract: externalization,
    help_text: input.helpText ?? null,
    max_file_size_mb: input.maxFileSizeMb,
    request_id: input.clientRequest.request_id,
    request_version_ref: input.clientRequest.request_version_ref,
    status: initialStatus,
    title: input.clientRequest.title,
    uploads,
    why_requested_label: input.whyRequestedLabel,
  } satisfies ClientDocumentRequestCardRecord;
  validateDocumentRequestCardLineage({ card });
  return card;
}
