import { buildClientDocumentRequest } from "./build_client_document_request.ts";
import { buildDocumentRequestCard } from "./build_document_request_card.ts";
import { assertPortalLanguageContract } from "../contracts/portal_language_contract.ts";
import { deriveClearDueLabel } from "../services/derive_clear_due_label.ts";
import { projectRequestUploadRows, type RequestUploadRowInput } from "../services/project_request_upload_rows.ts";
import { assertPortalCopy } from "../services/validate_portal_copy.ts";
import type {
  ClientDocumentHistoryDisclosureState,
  ClientDocumentRequestCardRecord,
  ClientDocumentRequestCategory,
  ClientDocumentRequestLifecycleState,
} from "../types.ts";

export type ClientDocumentRequestProjectionInput = {
  acceptedFileTypes: readonly string[];
  assistanceMode?: string | null | undefined;
  category: ClientDocumentRequestCategory;
  currentArtifactUploadRefOrNull?: string | null | undefined;
  currentRequestUploadRefOrNull?: string | null | undefined;
  descriptionRef: string;
  dueAt: string | null;
  dueLabel: string;
  helpText?: string | null | undefined;
  historyDisclosureState?: ClientDocumentHistoryDisclosureState | undefined;
  lifecycleState: ClientDocumentRequestLifecycleState;
  limitedHistoryCountOrNull?: number | null | undefined;
  maxFileSizeMb: number;
  requestId: string;
  requestVersionRef: string;
  requestedFileTypes: readonly string[];
  requiredCount?: number | undefined;
  reviewOutcome?: string | null | undefined;
  title: string;
  uploads?: readonly RequestUploadRowInput[] | undefined;
  whyRequestedLabel: string;
};

export type BuildDocumentCenterInput = {
  accessBindingHash: string;
  clientId: string;
  languageContract: Record<string, unknown>;
  manifestId?: string | null | undefined;
  maskingPostureFingerprint: string;
  requests?: readonly ClientDocumentRequestProjectionInput[] | undefined;
  tenantId: string;
  visibilityCachePartitionKey: string;
};

const openDocumentStatuses = new Set(["OPEN", "REJECTED", "UNDER_REVIEW", "UPLOADING"]);

function defaultDocumentRequests(): ClientDocumentRequestProjectionInput[] {
  return [
    {
      acceptedFileTypes: ["application/pdf", "image/jpeg"],
      category: "IDENTITY",
      currentArtifactUploadRefOrNull: "upload.identity.current",
      currentRequestUploadRefOrNull: "upload.identity.current",
      descriptionRef: "copy.request.identity.description",
      dueAt: "2026-05-10T12:00:00.000Z",
      dueLabel: deriveClearDueLabel({
        dueAt: "2026-05-10T12:00:00.000Z",
        now: "2026-05-03T10:00:00.000Z",
      }),
      helpText: "Please use a clear scan or photo.",
      lifecycleState: "UNDER_REVIEW",
      maxFileSizeMb: 25,
      requestId: "request.identity",
      requestVersionRef: "request.identity.v2",
      requestedFileTypes: ["application/pdf", "image/jpeg"],
      title: "Photo ID",
      uploads: [
        {
          attachment_state: "CONFIRMATION_REQUIRED",
          filename: "passport.pdf",
          media_type: "application/pdf",
          next_action_code: "CONFIRM_ATTACHMENT",
          recovery_posture: "NONE",
          request_binding_state: "ORIGINAL_CURRENT",
          request_id: "request.identity",
          request_version_ref: "request.identity.v2",
          resumability_state: "CLOSED",
          transfer_state: "ACCEPTED",
          upload_confidence_score: 94,
          upload_session_id: "upload.identity.current",
          uploaded_at: "2026-05-03T09:40:00.000Z",
        },
        {
          attachment_state: "STAGED",
          dominant_hazard_code: "REPLACEMENT_REQUIRED",
          filename: "old-passport.jpg",
          media_type: "image/jpeg",
          next_action_code: "UPLOAD_REPLACEMENT",
          recovery_posture: "HARD_RESET_REQUIRED",
          request_binding_state: "SUPERSEDED",
          request_id: "request.identity",
          request_version_ref: "request.identity.v1",
          resumability_state: "CLOSED",
          transfer_state: "REJECTED",
          upload_confidence_score: 0,
          upload_session_id: "upload.identity.rejected",
          uploaded_at: "2026-05-02T15:10:00.000Z",
        },
      ],
      whyRequestedLabel: "We need to confirm your identity.",
    },
    {
      acceptedFileTypes: ["application/pdf"],
      category: "BANK_STATEMENT",
      currentArtifactUploadRefOrNull: null,
      currentRequestUploadRefOrNull: null,
      descriptionRef: "copy.request.bank-statement.description",
      dueAt: "2026-05-12T12:00:00.000Z",
      dueLabel: deriveClearDueLabel({
        dueAt: "2026-05-12T12:00:00.000Z",
        now: "2026-05-03T10:00:00.000Z",
      }),
      helpText: "A recent statement is enough.",
      lifecycleState: "OPEN",
      maxFileSizeMb: 25,
      requestId: "request.bank-statement",
      requestVersionRef: "request.bank-statement.v1",
      requestedFileTypes: ["application/pdf"],
      title: "Bank statement",
      uploads: [],
      whyRequestedLabel: "We need proof of the account.",
    },
  ];
}

function buildRequestCard(input: {
  centerInput: BuildDocumentCenterInput;
  request: ClientDocumentRequestProjectionInput;
}): ClientDocumentRequestCardRecord | null {
  if (input.request.lifecycleState === "WITHDRAWN") {
    return null;
  }
  const uploads = projectRequestUploadRows({
    clientId: input.centerInput.clientId,
    currentArtifactUploadRefOrNull: input.request.currentArtifactUploadRefOrNull ?? null,
    currentRequestUploadRefOrNull: input.request.currentRequestUploadRefOrNull ?? null,
    requestId: input.request.requestId,
    requestLifecycleState: input.request.lifecycleState,
    requestVersionRef: input.request.requestVersionRef,
    tenantId: input.centerInput.tenantId,
    uploads: input.request.uploads,
  });
  const baseRequest = buildClientDocumentRequest({
    accessBindingHash: input.centerInput.accessBindingHash,
    assistanceMode: input.request.assistanceMode,
    category: input.request.category,
    clientId: input.centerInput.clientId,
    currentRequestUploadRefOrNull: input.request.currentRequestUploadRefOrNull ?? null,
    descriptionRef: input.request.descriptionRef,
    dueAt: input.request.dueAt,
    languageContract: input.centerInput.languageContract,
    lifecycleState: input.request.lifecycleState,
    manifestId: input.centerInput.manifestId ?? null,
    maskingPostureFingerprint: input.centerInput.maskingPostureFingerprint,
    requestId: input.request.requestId,
    requestVersionRef: input.request.requestVersionRef,
    requestedFileTypes: input.request.requestedFileTypes,
    requiredCount: input.request.requiredCount,
    reviewOutcome: input.request.reviewOutcome,
    tenantId: input.centerInput.tenantId,
    title: input.request.title,
    uploads,
    visibilityCachePartitionKey: input.centerInput.visibilityCachePartitionKey,
  });
  return buildDocumentRequestCard({
    acceptedFileTypes: input.request.acceptedFileTypes,
    accessBindingHash: input.centerInput.accessBindingHash,
    clientRequest: baseRequest,
    currentArtifactUploadRefOrNull: input.request.currentArtifactUploadRefOrNull ?? null,
    dueLabel: input.request.dueLabel,
    helpText: input.request.helpText ?? null,
    historyDisclosureState: input.request.historyDisclosureState ?? "FULL",
    limitedHistoryCountOrNull: input.request.limitedHistoryCountOrNull ?? null,
    maskingPostureFingerprint: input.centerInput.maskingPostureFingerprint,
    maxFileSizeMb: input.request.maxFileSizeMb,
    uploads,
    visibilityCachePartitionKey: input.centerInput.visibilityCachePartitionKey,
    whyRequestedLabel: input.request.whyRequestedLabel,
  });
}

export function buildDocumentCenter(input: BuildDocumentCenterInput) {
  assertPortalLanguageContract(input.languageContract, "`languageContract`");
  const requestCards = (input.requests ?? defaultDocumentRequests())
    .map((request) => buildRequestCard({ centerInput: input, request }))
    .filter((request): request is ClientDocumentRequestCardRecord => request !== null);
  requestCards.forEach((request, index) => {
    assertPortalCopy({
      budgetKey: "request_title_max_chars",
      fieldName: `document_center.requests[${index}].title`,
      value: request.title,
    });
    assertPortalCopy({
      budgetKey: "request_why_label_max_chars",
      fieldName: `document_center.requests[${index}].why_requested_label`,
      value: request.why_requested_label,
    });
    assertPortalCopy({
      budgetKey: "request_due_label_max_chars",
      dueLabel: true,
      fieldName: `document_center.requests[${index}].due_label`,
      value: request.due_label,
    });
    assertPortalCopy({
      budgetKey: "request_help_text_max_chars",
      fieldName: `document_center.requests[${index}].help_text`,
      value: request.help_text,
    });
  });
  const lastUploadedAt =
    requestCards
      .flatMap((request) => request.uploads)
      .map((upload) => upload.uploaded_at)
      .filter((uploadedAt): uploadedAt is string => typeof uploadedAt === "string")
      .sort((left, right) => Date.parse(right) - Date.parse(left))[0] ?? null;
  const openRequestCount = requestCards.filter((request) =>
    openDocumentStatuses.has(request.status),
  ).length;

  return {
    last_uploaded_at: lastUploadedAt,
    open_request_count: openRequestCount,
    requests: requestCards,
    status_phase_order: ["TRANSFER", "SCAN", "VALIDATION", "ACCEPTANCE", "REJECTION", "RETRY"],
    summary_label:
      openRequestCount === 1
        ? "One document needs attention"
        : `${openRequestCount} documents need attention`,
    surface_order: ["DOCUMENT_INBOX", "UPLOAD_PANEL", "UPLOAD_STATUS_LIST", "DOCUMENT_HISTORY"],
    upload_affordances: ["BROWSE", "DRAG_DROP", "CAMERA_CAPTURE"],
  };
}
