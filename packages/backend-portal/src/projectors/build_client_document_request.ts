import {
  assertPortalLanguageContract,
  buildPortalLanguageContract,
} from "../contracts/portal_language_contract.ts";
import { deriveMinimalRequestArtifactAffordanceAdapter } from "../services/derive_minimal_request_artifact_affordance_adapter.ts";
import { derivePortalExternalizationGovernanceContract } from "../services/derive_portal_externalization_governance_contract.ts";
import { deriveRequestArtifactSelectionContract } from "../services/derive_request_artifact_selection_contract.ts";
import { deriveLatestUploadRef } from "../services/derive_request_history_and_preview_posture.ts";
import { validateArtifactTargetAlignment } from "../services/validate_artifact_target_alignment.ts";
import { assertPortalCopy } from "../services/validate_portal_copy.ts";
import {
  validateClientDocumentRequestLineage,
} from "../services/validate_request_local_upload_lineage.ts";
import type {
  ClientDocumentProjectedUploadRow,
  ClientDocumentRequestCategory,
  ClientDocumentRequestLifecycleState,
  ClientDocumentRequestRecord,
} from "../types.ts";
import { ClientDocumentRequestProjectionError } from "../types.ts";

export type BuildClientDocumentRequestInput = {
  accessBindingHash: string;
  assistanceMode?: string | null | undefined;
  category: ClientDocumentRequestCategory;
  clientId: string;
  currentRequestUploadRefOrNull?: string | null | undefined;
  descriptionRef: string;
  dueAt: string | null;
  languageContract: Record<string, unknown>;
  lifecycleState: ClientDocumentRequestLifecycleState;
  manifestId?: string | null | undefined;
  maskingPostureFingerprint: string;
  requestId: string;
  requestVersionRef: string;
  requestedFileTypes: readonly string[];
  requiredCount?: number | undefined;
  reviewOutcome?: string | null | undefined;
  tenantId: string;
  title: string;
  uploads?: readonly Pick<ClientDocumentProjectedUploadRow, "upload_session_id" | "uploaded_at">[] | undefined;
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
    boundary_scope: "CLIENT_DOCUMENT_REQUEST",
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

function externalizationGovernanceContract(input: {
  accessBindingHash: string;
  currentRequestUploadRefOrNull: string | null;
  hasHistory: boolean;
  lifecycleState: ClientDocumentRequestLifecycleState;
  maskingPostureFingerprint: string;
  requestId: string;
  requestVersionRef: string;
  tenantId: string;
  visibilityCachePartitionKey: string;
}) {
  const hasAuthoritativeCurrent =
    input.currentRequestUploadRefOrNull !== null &&
    ["SUBMITTED", "UNDER_REVIEW", "ACCEPTED"].includes(input.lifecycleState);
  return derivePortalExternalizationGovernanceContract({
    accessBindingHash: input.accessBindingHash,
    blockingContextTokens: hasAuthoritativeCurrent ? [] : [input.lifecycleState],
    boundaryScope: "CLIENT_DOCUMENT_REQUEST",
    contextAnchorRef: input.requestId,
    downloadTargetRefOrNull: null,
    eligibilityState: hasAuthoritativeCurrent ? "READY" : "BLOCKED",
    historyMeaningState: input.hasHistory
      ? "CURRENT_WITH_HISTORY_EXPLICIT"
      : "CURRENT_ONLY",
    limitationState: input.hasHistory ? "HISTORY_LIMITED" : "FULL",
    maskingPostureFingerprint: input.maskingPostureFingerprint,
    previewTargetRefOrNull: hasAuthoritativeCurrent
      ? input.currentRequestUploadRefOrNull
      : null,
    printTargetRefOrNull: null,
    sliceBindingRef: input.requestVersionRef,
    tenantId: input.tenantId,
    visibilityCachePartitionKey: input.visibilityCachePartitionKey,
  });
}

function assertExpiredDueDate(input: BuildClientDocumentRequestInput) {
  if (input.lifecycleState === "EXPIRED" && input.dueAt === null) {
    throw new ClientDocumentRequestProjectionError(
      "expired document requests must retain due_at",
      ["CLIENT_DOCUMENT_REQUEST_EXPIRED_DUE_AT_MISSING"],
    );
  }
}

export function buildClientDocumentRequest(
  input: BuildClientDocumentRequestInput,
): ClientDocumentRequestRecord {
  assertPortalLanguageContract(input.languageContract, "`languageContract`");
  assertPortalCopy({
    budgetKey: "request_title_max_chars",
    fieldName: "`title`",
    value: input.title,
  });
  assertExpiredDueDate(input);
  const uploads = input.lifecycleState === "WITHDRAWN" ? [] : [...(input.uploads ?? [])];
  const uploadRefs = uploads.map((upload) => upload.upload_session_id);
  const latestUploadRef =
    input.lifecycleState === "WITHDRAWN" ? null : deriveLatestUploadRef(uploads);
  const currentRequestUploadRefOrNull =
    input.lifecycleState === "WITHDRAWN" ? null : (input.currentRequestUploadRefOrNull ?? null);
  const historicalSubjectRefs = uploadRefs.filter(
    (uploadRef) => uploadRef !== currentRequestUploadRefOrNull,
  );
  const hasAuthoritativeCurrent =
    currentRequestUploadRefOrNull !== null &&
    ["SUBMITTED", "UNDER_REVIEW", "ACCEPTED"].includes(input.lifecycleState);
  const artifactSelection = deriveRequestArtifactSelectionContract({
    authoritativeSubjectRefOrNull: hasAuthoritativeCurrent
      ? currentRequestUploadRefOrNull
      : null,
    historicalSubjectRefs,
    historyDisclosureState: "FULL",
    primarySubjectRefOrNull: currentRequestUploadRefOrNull,
  });
  const artifactAffordance = deriveMinimalRequestArtifactAffordanceAdapter({
    defaultPreviewTargetRefOrNull: artifactSelection.default_preview_target_ref_or_null,
    headerPosture:
      input.lifecycleState === "EXPIRED"
        ? "EXPIRED"
        : input.lifecycleState === "REJECTED"
          ? "REJECTED"
          : currentRequestUploadRefOrNull === null
            ? "AWAITING_CURRENT_REPLACEMENT"
            : historicalSubjectRefs.length > 0
              ? "CURRENT_WITH_HISTORY"
              : "CURRENT",
    historicalSubjectRefs,
    historyDisclosureState: "FULL",
    primarySubjectRefOrNull: currentRequestUploadRefOrNull,
    primarySubjectRole: hasAuthoritativeCurrent
      ? "CURRENT_ARTIFACT"
      : currentRequestUploadRefOrNull === null
        ? "NO_CURRENT_ARTIFACT"
        : "CURRENT_REQUEST_UPLOAD",
  });
  const customerSafe = customerSafeProjection({
    accessBindingHash: input.accessBindingHash,
    maskingPostureFingerprint: input.maskingPostureFingerprint,
    visibilityCachePartitionKey: input.visibilityCachePartitionKey,
  });
  const externalization = externalizationGovernanceContract({
    accessBindingHash: input.accessBindingHash,
    currentRequestUploadRefOrNull,
    hasHistory: historicalSubjectRefs.length > 0,
    lifecycleState: input.lifecycleState,
    maskingPostureFingerprint: input.maskingPostureFingerprint,
    requestId: input.requestId,
    requestVersionRef: input.requestVersionRef,
    tenantId: input.tenantId,
    visibilityCachePartitionKey: input.visibilityCachePartitionKey,
  });
  validateArtifactTargetAlignment({
    artifactAffordance,
    artifactSelection,
    externalizationGovernanceContract: externalization,
  });
  const request = {
    artifact_affordance: artifactAffordance,
    artifact_selection: artifactSelection,
    artifact_type: "ClientDocumentRequest",
    assistance_mode: input.assistanceMode ?? null,
    category: input.category,
    client_id: input.clientId,
    current_request_upload_ref_or_null: currentRequestUploadRefOrNull,
    customer_safe_projection: customerSafe,
    description_ref: input.descriptionRef,
    due_at: input.dueAt,
    externalization_governance_contract: externalization,
    language_contract: buildPortalLanguageContract(),
    latest_upload_ref: latestUploadRef,
    lifecycle_state: input.lifecycleState,
    manifest_id: input.manifestId ?? null,
    request_id: input.requestId,
    request_version_ref: input.requestVersionRef,
    requested_file_types: [...input.requestedFileTypes],
    required_count: input.requiredCount ?? 1,
    review_outcome:
      input.lifecycleState === "ACCEPTED" || input.lifecycleState === "REJECTED"
        ? (input.reviewOutcome ?? "Customer-safe review outcome recorded.")
        : null,
    tenant_id: input.tenantId,
    title: input.title,
    upload_refs: uploadRefs,
  } satisfies ClientDocumentRequestRecord;
  validateClientDocumentRequestLineage({ request });
  return request;
}
