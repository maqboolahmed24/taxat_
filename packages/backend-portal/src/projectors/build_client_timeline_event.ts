import { stableJsonHash } from "../../../domain-kernel/src/primitives/hash.ts";
import { normalizeUtcInstantString } from "../../../domain-kernel/src/primitives/time.ts";
import {
  assertPortalLanguageContract,
  buildPortalLanguageContract,
} from "../contracts/portal_language_contract.ts";
import {
  deriveClientTimelineAuthorityTruthPosture,
  isClientTimelineAuthorityTruthState,
} from "../services/derive_client_timeline_authority_truth_posture.ts";
import {
  assertClientTimelineHeadlineAuthorityCopy,
  deriveClientTimelineHeadline,
} from "../services/derive_client_timeline_headline.ts";
import { assertPortalCopy } from "../services/validate_portal_copy.ts";
import {
  type ClientTimelineAuthorityTruthState,
  type ClientTimelineEventKind,
  ClientTimelineEventProjectionError,
  type ClientTimelineEventRecord,
} from "../types.ts";

export type ClientTimelineInternalEventFamily =
  | "APPROVAL_PACK_READY"
  | "APPROVAL_READY"
  | "APPROVAL_SIGNED"
  | "AUTHORITY_ACK_CONFIRMED"
  | "AUTHORITY_ACK_PENDING"
  | "AUTHORITY_ACK_REJECTED"
  | "AUTHORITY_ACK_UNKNOWN"
  | "AUTHORITY_CONFIRMED"
  | "AUTHORITY_OUTCOME_CONFIRMED"
  | "AUTHORITY_OUTCOME_REJECTED"
  | "AUTHORITY_OUTCOME_UNKNOWN"
  | "AUTHORITY_PARTIAL_ACK"
  | "AUTHORITY_PENDING_ACK"
  | "AUTHORITY_REJECTED"
  | "AUTHORITY_STATUS_CONFIRMED"
  | "AUTHORITY_STATUS_OUT_OF_BAND"
  | "AUTHORITY_STATUS_PARTIAL_ACK"
  | "AUTHORITY_STATUS_PENDING"
  | "AUTHORITY_STATUS_REJECTED"
  | "AUTHORITY_STATUS_UNKNOWN"
  | "DOCUMENT_UPLOAD_ACCEPTED"
  | "DOCUMENT_UPLOAD_RECEIVED"
  | "DOCUMENT_UPLOAD_REJECTED"
  | "ONBOARDING_STEP_COMPLETED"
  | "OUT_OF_BAND_AUTHORITY_UPDATE"
  | "OUT_OF_BAND_DISCOVERY"
  | "SUBMISSION_CONFIRMED"
  | "SUBMISSION_REJECTED"
  | "SUBMISSION_SENT"
  | "SUBMISSION_STATUS_OUT_OF_BAND"
  | "SUBMISSION_STATUS_UNKNOWN"
  | "UPLOAD_RECEIVED"
  | "UPLOAD_REJECTED";

export type BuildClientTimelineEventInput = {
  accessBindingHash: string;
  authorityTruthState?: ClientTimelineAuthorityTruthState | string | null | undefined;
  clientId: string;
  detailRef?: string | null | undefined;
  eventId?: string | null | undefined;
  eventKind?: ClientTimelineEventKind | string | null | undefined;
  headline?: string | null | undefined;
  internalEventFamily?: ClientTimelineInternalEventFamily | string | null | undefined;
  languageContract: Record<string, unknown>;
  manifestId?: string | null | undefined;
  maskingPostureFingerprint: string;
  occurredAt: string;
  relatedObjectRef?: string | null | undefined;
  sourceEventId?: string | null | undefined;
  submissionLifecycleState?: string | null | undefined;
  tenantId: string;
  visibilityCachePartitionKey: string;
  visibleToClient?: boolean | undefined;
};

const clientTimelineEventKinds = new Set<ClientTimelineEventKind>([
  "APPROVAL_READY",
  "APPROVAL_SIGNED",
  "ONBOARDING_STEP_COMPLETED",
  "STATUS_UPDATED",
  "SUBMISSION_SENT",
  "UPLOAD_RECEIVED",
  "UPLOAD_REJECTED",
]);

const filteredInternalEventFamilies = new Set<string>([
  "ASSIGNMENT_CHANGED",
  "AUDIT_EVENT_APPENDED",
  "ESCALATION_ADDED",
  "GATE_REEVALUATED",
  "INTERNAL_STATUS_CHURN",
  "QUEUE_REORDERED",
  "STAFF_NOTE_ADDED",
  "WORKFLOW_STATE_CHANGED",
]);

const eventKindByInternalFamily = new Map<string, ClientTimelineEventKind>([
  ["APPROVAL_PACK_READY", "APPROVAL_READY"],
  ["APPROVAL_READY", "APPROVAL_READY"],
  ["APPROVAL_SIGNED", "APPROVAL_SIGNED"],
  ["AUTHORITY_ACK_CONFIRMED", "STATUS_UPDATED"],
  ["AUTHORITY_ACK_PENDING", "STATUS_UPDATED"],
  ["AUTHORITY_ACK_REJECTED", "STATUS_UPDATED"],
  ["AUTHORITY_ACK_UNKNOWN", "STATUS_UPDATED"],
  ["AUTHORITY_CONFIRMED", "STATUS_UPDATED"],
  ["AUTHORITY_OUTCOME_CONFIRMED", "STATUS_UPDATED"],
  ["AUTHORITY_OUTCOME_REJECTED", "STATUS_UPDATED"],
  ["AUTHORITY_OUTCOME_UNKNOWN", "STATUS_UPDATED"],
  ["AUTHORITY_PARTIAL_ACK", "STATUS_UPDATED"],
  ["AUTHORITY_PENDING_ACK", "STATUS_UPDATED"],
  ["AUTHORITY_REJECTED", "STATUS_UPDATED"],
  ["AUTHORITY_STATUS_CONFIRMED", "STATUS_UPDATED"],
  ["AUTHORITY_STATUS_OUT_OF_BAND", "STATUS_UPDATED"],
  ["AUTHORITY_STATUS_PARTIAL_ACK", "STATUS_UPDATED"],
  ["AUTHORITY_STATUS_PENDING", "STATUS_UPDATED"],
  ["AUTHORITY_STATUS_REJECTED", "STATUS_UPDATED"],
  ["AUTHORITY_STATUS_UNKNOWN", "STATUS_UPDATED"],
  ["DOCUMENT_UPLOAD_ACCEPTED", "UPLOAD_RECEIVED"],
  ["DOCUMENT_UPLOAD_RECEIVED", "UPLOAD_RECEIVED"],
  ["DOCUMENT_UPLOAD_REJECTED", "UPLOAD_REJECTED"],
  ["ONBOARDING_STEP_COMPLETED", "ONBOARDING_STEP_COMPLETED"],
  ["OUT_OF_BAND_AUTHORITY_UPDATE", "STATUS_UPDATED"],
  ["OUT_OF_BAND_DISCOVERY", "STATUS_UPDATED"],
  ["SUBMISSION_CONFIRMED", "STATUS_UPDATED"],
  ["SUBMISSION_REJECTED", "STATUS_UPDATED"],
  ["SUBMISSION_SENT", "SUBMISSION_SENT"],
  ["SUBMISSION_STATUS_OUT_OF_BAND", "STATUS_UPDATED"],
  ["SUBMISSION_STATUS_UNKNOWN", "STATUS_UPDATED"],
  ["UPLOAD_RECEIVED", "UPLOAD_RECEIVED"],
  ["UPLOAD_REJECTED", "UPLOAD_REJECTED"],
]);

function normalizeCode(value: string) {
  return value.trim().toUpperCase();
}

function normalizeOptionalString(value: string | null | undefined) {
  if (typeof value !== "string") {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function shortHash(value: unknown) {
  return String(stableJsonHash(value)).slice(0, 16);
}

function safeEventIdStem(eventKind: ClientTimelineEventKind) {
  return eventKind.toLowerCase().replaceAll("_", "-");
}

function deriveEventId(input: {
  authorityTruthState: ClientTimelineAuthorityTruthState;
  detailRef: string;
  eventKind: ClientTimelineEventKind;
  explicitEventId: string | null;
  manifestId: string | null;
  occurredAt: string;
  relatedObjectRef: string;
  sourceEventId: string | null;
}) {
  if (input.explicitEventId !== null) {
    return input.explicitEventId;
  }
  if (input.sourceEventId !== null && input.sourceEventId.startsWith("activity.")) {
    return input.sourceEventId;
  }
  return `activity.${safeEventIdStem(input.eventKind)}.${shortHash({
    authority_truth_state: input.authorityTruthState,
    detail_ref: input.detailRef,
    event_kind: input.eventKind,
    manifest_id: input.manifestId,
    occurred_at: input.occurredAt,
    related_object_ref: input.relatedObjectRef,
    source_event_id: input.sourceEventId,
  })}`;
}

export function buildClientTimelineAuthorityTruthContract() {
  return {
    authority_confirmation_policy: "ONLY_AUTHORITY_EVIDENCE_MAY_CONFIRM",
    boundary_scope: "CLIENT_TIMELINE_EVENT",
    contract_version: "AUTHORITY_TRUTH_V1",
    correction_propagation_policy: "AUTHORITY_CORRECTIONS_REOPEN_DOWNSTREAM_STATE",
    mirror_projection_policy: "INTERNAL_MIRRORS_AND_PROJECTIONS_SUBORDINATE_TO_AUTHORITY",
    non_confirming_state_policy: "PENDING_UNKNOWN_OUT_OF_BAND_TYPED_AND_NON_CONFIRMING",
    normalization_gate_policy: "CHECKPOINT_AND_CORRELATE_BEFORE_MUTATION",
    override_confirmation_policy: "OVERRIDE_AND_ACCEPTED_RISK_NEVER_CONFIRM",
    surface_specific_binding_policy:
      "TIMELINE_IS_CUSTOMER_SAFE_AND_EXPLICIT_ABOUT_AUTHORITY_STATE",
    truth_surface_role: "CUSTOMER_SAFE_STATUS_PROJECTION",
    unresolved_projection_policy: "UNRESOLVED_AUTHORITY_MUST_NOT_RENDER_AS_CONFIRMED",
  } as const;
}

export function buildClientTimelineCustomerSafeProjection(input: {
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
    boundary_scope: "CLIENT_TIMELINE_EVENT",
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
  } as const;
}

export function mapInternalEventFamilyToClientTimelineEventKind(
  value: string | null | undefined,
) {
  if (typeof value !== "string") {
    return null;
  }
  return eventKindByInternalFamily.get(normalizeCode(value)) ?? null;
}

function resolveEventKind(input: BuildClientTimelineEventInput) {
  if (
    typeof input.internalEventFamily === "string" &&
    filteredInternalEventFamilies.has(normalizeCode(input.internalEventFamily))
  ) {
    return null;
  }

  if (typeof input.eventKind === "string") {
    const eventKind = normalizeCode(input.eventKind) as ClientTimelineEventKind;
    if (clientTimelineEventKinds.has(eventKind)) {
      return eventKind;
    }
  }

  const mapped = mapInternalEventFamilyToClientTimelineEventKind(input.internalEventFamily);
  if (mapped !== null) {
    return mapped;
  }

  throw new ClientTimelineEventProjectionError(
    "internal event family does not map to client timeline vocabulary",
    ["CLIENT_TIMELINE_EVENT_KIND_UNSUPPORTED"],
  );
}

export function projectClientTimelineEvent(
  input: BuildClientTimelineEventInput,
): ClientTimelineEventRecord | null {
  if (input.visibleToClient === false) {
    return null;
  }

  const eventKind = resolveEventKind(input);
  if (eventKind === null) {
    return null;
  }

  return buildClientTimelineEvent({
    ...input,
    eventKind,
  });
}

export function buildClientTimelineEvent(
  input: BuildClientTimelineEventInput,
): ClientTimelineEventRecord {
  assertPortalLanguageContract(input.languageContract, "`languageContract`");
  if (input.visibleToClient === false) {
    throw new ClientTimelineEventProjectionError(
      "client timeline projector only emits visible client events",
      ["CLIENT_TIMELINE_EVENT_NOT_VISIBLE"],
    );
  }

  const resolvedEventKind = resolveEventKind(input);
  if (resolvedEventKind === null) {
    throw new ClientTimelineEventProjectionError(
      "filtered internal event family cannot be emitted as a client timeline event",
      ["CLIENT_TIMELINE_EVENT_KIND_FILTERED"],
    );
  }

  const occurredAt = normalizeUtcInstantString(input.occurredAt);
  const relatedObjectRef = normalizeOptionalString(input.relatedObjectRef);
  if (relatedObjectRef === null) {
    throw new ClientTimelineEventProjectionError(
      "client timeline events must keep a related object anchor",
      ["CLIENT_TIMELINE_RELATED_OBJECT_REQUIRED"],
    );
  }

  const requestedAuthorityTruthState = isClientTimelineAuthorityTruthState(input.authorityTruthState)
    ? input.authorityTruthState
    : undefined;
  const authorityTruthState = deriveClientTimelineAuthorityTruthPosture({
    authorityTruthState: requestedAuthorityTruthState,
    eventKind: resolvedEventKind,
    internalEventFamily: input.internalEventFamily,
    submissionLifecycleState: input.submissionLifecycleState,
  });
  const detailBasis = {
    event_kind: resolvedEventKind,
    occurred_at: occurredAt,
    related_object_ref: relatedObjectRef,
    source_event_id: normalizeOptionalString(input.sourceEventId),
  };
  const detailRef =
    normalizeOptionalString(input.detailRef) ?? `copy.timeline.${shortHash(detailBasis)}`;
  assertPortalCopy({
    budgetKey: "timeline_detail_max_chars",
    fieldName: "`detail_ref`",
    value: detailRef,
  });
  const eventId = deriveEventId({
    authorityTruthState,
    detailRef,
    eventKind: resolvedEventKind,
    explicitEventId: normalizeOptionalString(input.eventId),
    manifestId: normalizeOptionalString(input.manifestId),
    occurredAt,
    relatedObjectRef,
    sourceEventId: normalizeOptionalString(input.sourceEventId),
  });
  const headline = deriveClientTimelineHeadline({
    authorityTruthState,
    eventKind: resolvedEventKind,
    headlineOverride: input.headline,
  });
  assertClientTimelineHeadlineAuthorityCopy({
    authorityTruthState,
    eventKind: resolvedEventKind,
    headline,
  });

  return {
    artifact_type: "ClientTimelineEvent",
    authority_truth_contract: buildClientTimelineAuthorityTruthContract(),
    authority_truth_state: authorityTruthState,
    client_id: input.clientId,
    customer_safe_projection: buildClientTimelineCustomerSafeProjection({
      accessBindingHash: input.accessBindingHash,
      maskingPostureFingerprint: input.maskingPostureFingerprint,
      visibilityCachePartitionKey: input.visibilityCachePartitionKey,
    }),
    detail_ref: detailRef,
    event_id: eventId,
    event_kind: resolvedEventKind,
    headline,
    language_contract: buildPortalLanguageContract() as ClientTimelineEventRecord["language_contract"],
    manifest_id: normalizeOptionalString(input.manifestId),
    occurred_at: occurredAt,
    related_object_ref: relatedObjectRef,
    tenant_id: input.tenantId,
    visible_to_client: true,
  };
}
