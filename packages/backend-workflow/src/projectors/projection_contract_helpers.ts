import {
  requireTrimmedString,
} from "../../../backend-access/src/services/principal_context_normalizer.ts";
import { buildCacheIsolationContract as buildSharedCacheIsolationContract } from "../../../backend-recovery/src/services/build_cache_isolation_contract.ts";
import { stableJsonHash } from "../../../domain-kernel/src/primitives/hash.ts";
import { normalizeUtcInstantString } from "../../../domain-kernel/src/primitives/time.ts";
import type { CollaborationVisibilityClass } from "../models/collaboration_thread.ts";
import {
  cloneWorkflowRecord,
  type WorkflowItem,
  type WorkflowRoutingContract,
  WorkflowModelError,
} from "../models/workflow_item.ts";
import type { WorkItemParticipant } from "../models/work_item_participant.ts";
import {
  buildWorkspaceRouteContinuityContract,
  type CanonicalCrossDeviceContinuityContract,
} from "../contracts/build_cross_device_continuity_contract.ts";
import {
  buildExactFocusRestorationContract,
  type CanonicalFocusRestorationContract,
} from "../contracts/build_focus_restoration_contract.ts";

export type WorkspaceViewerScope = "STAFF_FULL" | "CUSTOMER_VISIBLE";
export type WorkspaceShellFamily = "CALM_SHELL" | "CLIENT_PORTAL_SHELL";
export type WorkspaceModuleCode =
  | "CUSTOMER_ACTIVITY"
  | "INTERNAL_ACTIVITY"
  | "FILES"
  | "LINKED_CONTEXT"
  | "AUDIT_TRAIL";
export type CustomerRequestStatusCode =
  | "ACTION_REQUIRED"
  | "IN_REVIEW"
  | "WAITING_ON_US"
  | "WAITING_ON_AUTHORITY"
  | "COMPLETED";
export type CustomerRequestDueState = "NONE" | "ON_TRACK" | "DUE_SOON" | "OVERDUE";
export type WorkspaceActionabilityState = "ACTION_AVAILABLE" | "NO_SAFE_ACTION";
export type WorkspaceSettlementState =
  | "STEADY"
  | "RECEIPT_PENDING"
  | "FRESHENING"
  | "STALE_REVIEW_REQUIRED"
  | "DEGRADED_READ_ONLY"
  | "RECOVERY_REQUIRED";
export type WorkspaceRecoveryPosture =
  | "NONE"
  | "INLINE_RECONNECT"
  | "INLINE_REBASE"
  | "READ_ONLY_LIMITED"
  | "OBJECT_SUPERSEDED"
  | "ACCESS_REBIND_REQUIRED";
export type ProjectionRoutingScope =
  | "WORKFLOW_ITEM"
  | "WORK_INBOX_ROW"
  | "WORKSPACE_QUEUE_PROJECTION"
  | "WORKSPACE_STREAM_EVENT"
  | "WORK_ITEM_NOTIFICATION";

export type VisibilityPartitionContract = {
  access_binding_hash: string;
  allowed_visibility_classes: CollaborationVisibilityClass[];
  audience_class: "STAFF" | "CUSTOMER_COLLABORATION" | "CLIENT_PORTAL";
  badge_counter_policy: "SPLIT_LANE_COUNTS" | "SURFACE_VISIBLE_ONLY" | "NO_BADGES";
  cache_partition_key: string;
  export_scope_policy: "MOUNTED_ROUTE_VISIBILITY_ONLY";
  fallback_discovery_policy: "NO_CROSS_PARTITION_DISCOVERY";
  limited_state_presentation: "EXPLICIT_LIMITATION_NOTICE";
  masking_posture_fingerprint: string;
  ordering_side_channel_policy:
    | "VISIBLE_EVENTS_ONLY"
    | "SEGMENTED_VISIBLE_EVENTS_ONLY"
    | "CANONICAL_LIST_ONLY";
  partition_scope:
    | "WORKSPACE_SNAPSHOT"
    | "CUSTOMER_REQUEST_LIST"
    | "COLLABORATION_ACTIVITY_SLICE"
    | "WORKSPACE_STREAM_EVENT"
    | "WORK_INBOX_SNAPSHOT"
    | "WORK_INBOX_DELTA"
    | "CLIENT_PORTAL_WORKSPACE"
    | "COLLABORATION_ATTACHMENT_SLICE"
    | "WORK_ITEM_NOTIFICATION";
};

export type CustomerSafeProjectionContract = {
  access_binding_hash: string;
  artifact_history_policy: "CURRENT_VERSUS_HISTORY_EXPLICIT";
  attachment_visibility_policy: "CUSTOMER_VISIBLE_ATTACHMENTS_ONLY";
  blocked_staff_signal_classes: string[];
  boundary_scope:
    | "WORKSPACE_CUSTOMER_REQUEST"
    | "CUSTOMER_REQUEST_LIST"
    | "COLLABORATION_ACTIVITY_SLICE"
    | "CLIENT_PORTAL_WORKSPACE"
    | "COLLABORATION_ATTACHMENT_SLICE"
    | "WORKSPACE_STREAM_EVENT"
    | "CLIENT_DOCUMENT_REQUEST"
    | "CLIENT_APPROVAL_PACK"
    | "CLIENT_ONBOARDING_JOURNEY"
    | "CLIENT_TIMELINE_EVENT"
    | "WORK_ITEM_NOTIFICATION";
  contract_version: "CUSTOMER_SAFE_PROJECTION_V1";
  draft_placeholder_policy: "CUSTOMER_SAFE_PROJECTIONS_EXCLUDE_INTERNAL_DRAFTS";
  export_visibility_policy: "CUSTOMER_VISIBLE_EXPORTS_ONLY";
  hidden_activity_policy: "NO_HIDDEN_ACTIVITY_DERIVATION";
  limitation_notice_policy: "EXPLICIT_CUSTOMER_SAFE_NOTICE_REQUIRED";
  live_update_visibility_policy: "INTERNAL_ONLY_DELTA_EXCLUSION_REQUIRED";
  masking_posture_fingerprint: string;
  module_projection_policy: "CUSTOMER_SAFE_MODULES_AND_METADATA_ONLY";
  notification_navigation_policy: "PORTAL_SAME_SHELL_AND_VISIBILITY_ONLY";
  plain_language_action_policy: "CUSTOMER_SAFE_ACTION_VOCABULARY_ONLY";
  plain_language_status_policy: "CUSTOMER_SAFE_STATUS_VOCABULARY_ONLY";
  projection_audience: "CLIENT_PORTAL" | "CUSTOMER_COLLABORATION";
  recovery_explanation_policy: "EXPLICIT_CUSTOMER_SAFE_RECOVERY_NOTICE_REQUIRED";
  shell_family: "CLIENT_PORTAL_SHELL";
  staff_field_dependency_policy: "EXCLUDE_STAFF_FIELDS_AT_PROJECTION_SOURCE";
  status_derivation_policy: "CUSTOMER_SAFE_BLOCKS_ONLY";
  visibility_cache_partition_key: string;
};

export type FocusRestorationContract = CanonicalFocusRestorationContract;
export type CrossDeviceContinuityContract = CanonicalCrossDeviceContinuityContract;

export type SemanticAccessibilityContract = {
  announced_change_kinds: string[];
  artifact_handoff_policy: "CURRENT_AND_HISTORY_ANCHORS_SEPARATE";
  browser_identifier_policy: "DATA_TESTID_MIRRORS_SEMANTIC_ANCHOR";
  conditional_notice_anchor_policy: "LIMITATION_AND_RECOVERY_NOTICES_REQUIRE_ADDRESSABLE_ANCHORS";
  contract_version: "SEMANTIC_ACCESSIBILITY_V1";
  detail_module_access_policy: "SUPPORT_MODULES_KEYBOARD_AND_ASSISTIVE_TECH_REACHABLE";
  focus_entry_policy: "REQUESTED_ANCHOR_OR_PRIMARY_HEADING_OR_EXPLICIT_NOTICE";
  focus_order_policy: "VISIBLE_SEMANTIC_ORDER_ONLY";
  focus_restore_policy: "RETURN_TO_INVOKER_OR_LAWFUL_ANCESTOR";
  heading_navigation_policy: "PRIMARY_HEADING_AND_PROMOTED_REGION_HEADINGS";
  identifier_semantics_policy: "DOMAIN_MEANING_OVER_VISUAL_STYLING";
  keyboard_completion_policy: "ALL_GOVERNED_ACTIONS_KEYBOARD_OPERABLE";
  landmark_structure_policy: "STABLE_SHELL_SUMMARY_ACTION_SUPPORT_AND_NOTICE_LANDMARKS";
  live_region_policy: "POLITE_ACTIVITY_ASSERTIVE_FAILURE_ONLY";
  live_update_focus_policy: "NEVER_STEAL_ACTIVE_INPUT_OR_PICKER_FOCUS";
  native_identifier_policy: "ACCESSIBILITY_IDENTIFIER_MIRRORS_SEMANTIC_ANCHOR";
  reduced_motion_policy: "MEANING_PRESERVED_WITH_MINIMAL_OR_NO_MOTION";
  required_anchor_codes: string[];
  selector_profile: "OPERATOR_SEMANTIC_SELECTORS_V1" | "PORTAL_SEMANTIC_SELECTORS_V1";
  semantic_focus_order: string[];
  shell_family: WorkspaceShellFamily;
  support_region_access_policy: "PROMOTED_SUPPORT_REGION_KEYBOARD_REACHABLE_AND_ESCAPABLE";
};

export type ProjectionRoutingContract = Omit<
  WorkflowRoutingContract,
  "basis_hash" | "routing_scope"
> & {
  basis_hash: string;
  routing_scope: ProjectionRoutingScope;
};

export type CollaborationQueueProjectionContract = {
  basis_hash: string;
  canonical_sort_key: ProjectionRoutingContract["canonical_sort_key"];
  customer_activity_module_badge_count: number;
  customer_unread_count: number;
  filter_membership_state:
    | "IN_ACTIVE_FILTER_SET"
    | "FILTER_EXIT_PENDING_FOCUS_RELEASE"
    | "OUT_OF_FILTER_SET";
  focus_continuity_state:
    | "STABLE"
    | "PENDING_REORDER_UNTIL_FOCUS_EXIT"
    | "PENDING_REMOVAL_UNTIL_FOCUS_EXIT";
  internal_activity_module_badge_count_or_null: number | null;
  internal_unread_count_or_null: number | null;
  latest_change_lane_or_null: "CUSTOMER_VISIBLE" | "INTERNAL_ONLY" | "MIXED_VISIBLE" | null;
  notification_target_module_code_or_null: "CUSTOMER_ACTIVITY" | "INTERNAL_ACTIVITY" | null;
  projection_scope: "WORKSPACE_QUEUE_PROJECTION" | "WORK_INBOX_ROW" | "WORKSPACE_STREAM_EVENT" | "WORK_ITEM_NOTIFICATION";
  routing_contract: ProjectionRoutingContract;
};

export type ActionAuthorityContract = {
  access_binding_hash: string;
  actionability_state: WorkspaceActionabilityState;
  available_action_codes: string[];
  basis_hash: string;
  blocked_action_codes: string[];
  blocking_reason_code_or_null: string | null;
  customer_safe_projection: boolean;
  machine_reason_codes: string[];
  primary_action_code_or_null: string | null;
  projection_route_key: string;
  projection_scope:
    | "WORKSPACE_ACTION_STRIP"
    | "CUSTOMER_REQUEST_DETAIL"
    | "CUSTOMER_REQUEST_ROW"
    | "WORK_INBOX_ROW_ACTIONS";
  projection_version: number;
  recovery_focus_anchor_ref_or_null: string | null;
  recovery_route_ref_or_null: string | null;
  secondary_action_codes: string[];
  source_module_code: "WORKFLOW_CHOREOGRAPHER";
  suggested_module_code_or_null: WorkspaceModuleCode | null;
  visibility_cache_partition_key: string;
};

export type CacheIsolationContract = {
  access_binding_hash_or_null: string | null;
  cache_partition_ref: string;
  cache_scope_class:
    | "WORKSPACE_SNAPSHOT"
    | "WORK_INBOX_SNAPSHOT"
    | "CUSTOMER_REQUEST_LIST";
  canonical_object_ref: string;
  client_id_or_null: string | null;
  contract_version: "CACHE_ISOLATION_V1";
  customer_safe_projection: boolean;
  delivery_binding_hash: string;
  delivery_revalidation_policy: "PREVIEW_EXPORT_AND_DOWNLOAD_REQUIRE_EXACT_BINDING";
  hydration_guard_policy: "REJECT_ON_CONTEXT_ROUTE_VERSION_OR_PREVIEW_MISMATCH";
  local_storage_reuse_policy: "PURGE_ON_TENANT_PRINCIPAL_SESSION_ACCESS_MASKING_OR_ROUTE_DRIFT";
  masking_posture_fingerprint_or_null: string | null;
  preview_export_reuse_policy: "ROUTE_AND_SELECTION_BOUND_CURRENT_ONLY";
  preview_subject_ref_or_null: string | null;
  principal_class: string;
  projection_version_ref: string;
  route_identity_ref: string;
  scope_narrowing_invalidation_policy: "PURGE_BROADER_VARIANTS_ON_ACCESS_OR_MASKING_NARROWING";
  session_binding_hash: string;
  shared_cache_reuse_policy: "EXACT_SECURITY_CONTEXT_ONLY";
  shared_layer_cache_policy: "NO_CDN_OR_PROXY_REUSE_WITHOUT_IDENTICAL_CONTEXT";
  shell_family: WorkspaceShellFamily;
  shell_stability_ref_or_null: string | null;
  temporary_artifact_policy: "TEMP_FILES_AND_NATIVE_PREVIEW_PURGED_ON_BINDING_DRIFT";
  tenant_id: string;
  visibility_cache_partition_key_or_null: string | null;
};

export type RouteStabilityContract = {
  guard_vector_components: {
    client_portal_workspace_version_or_null: number | null;
    decision_bundle_hash_or_null: string | null;
    dependency_topology_hash_or_null: string | null;
    frame_epoch_or_null: number | null;
    internal_thread_head_or_null: number | null;
    mutation_basis_contract_hash_or_null: string | null;
    policy_snapshot_hash_or_null: string | null;
    request_state_version_or_null: number | null;
    shell_stability_token_or_null: string | null;
    simulation_basis_hash_or_null: string | null;
    view_guard_ref_or_null: string | null;
    work_item_version_or_null: number | null;
    customer_thread_head_or_null: number | null;
  };
  guard_vector_hash: string;
  last_published_sequence_or_null: number;
  publication_generation: number;
  resume_capability: "STREAM_RESUMABLE";
  resume_token_or_null: string;
  route_scope_class: "WORKSPACE";
};

export type StreamRecoveryContract = {
  access_binding_hash: string;
  catch_up_policy: "CATCH_UP_BEFORE_LIVE";
  compaction_floor_sequence_or_null: number | null;
  contract_version: "STREAM_RECOVERY_V1";
  delivery_window_state: "LIVE_RESUMABLE";
  duplicate_delivery_policy: "IDEMPOTENT_BY_SCOPE_EPOCH_SEQUENCE";
  frame_epoch: number;
  last_published_sequence: number;
  masking_context_hash: string;
  publication_generation: number;
  rebase_reason_code_or_null: null;
  rebase_trigger_policy: "REBASE_ON_EPOCH_ADVANCE_OR_COMPACTION_OR_CONTEXT_DRIFT";
  resume_binding_ref_or_null: string;
  resume_binding_representation: "RAW_TOKEN";
  resume_token_binding_mode: "EXACT_ROUTE_SESSION_SCOPE_MASKING";
  route_key: string;
  sequence_application_policy: "STRICTLY_MONOTONIC_GAP_FREE_WITHIN_EPOCH";
  session_binding_hash: string;
  session_ref: string;
  shell_stability_token: string;
  stream_scope_class: "WORKSPACE";
  subject_ref: string;
};

export const CUSTOMER_SAFE_ACTION_ORDER = [
  "REPLY",
  "UPLOAD_FILE",
  "RESPOND_TO_REQUEST_INFO",
] as const;
export const WORKSPACE_STAFF_MODULE_ORDER = [
  "CUSTOMER_ACTIVITY",
  "INTERNAL_ACTIVITY",
  "FILES",
  "LINKED_CONTEXT",
  "AUDIT_TRAIL",
] as const;
export const WORKSPACE_CUSTOMER_MODULE_ORDER = ["CUSTOMER_ACTIVITY", "FILES"] as const;
export const WORKSPACE_SURFACE_ORDER = [
  "CONTEXT_BAR",
  "DECISION_SUMMARY",
  "ACTION_STRIP",
  "DETAIL_DRAWER",
] as const;
export const CUSTOMER_REQUEST_ROW_BAND_ORDER = [
  "REQUEST_IDENTITY",
  "STATUS_AND_DUE",
  "REQUEST_ACTION",
] as const;
export const CUSTOMER_REQUEST_QUEUE_GROUP_ORDER = [
  "ACTION_REQUIRED",
  "IN_REVIEW",
  "WAITING_ON_US",
  "WAITING_ON_AUTHORITY",
  "COMPLETED",
] as const;
export const CUSTOMER_REQUEST_DUE_PRIORITY: Record<CustomerRequestDueState, number> = {
  OVERDUE: 0,
  DUE_SOON: 1,
  ON_TRACK: 2,
  NONE: 3,
};

const CUSTOMER_SAFE_PROJECTION_BLOCKED_SIGNAL_CLASSES = [
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
] as const;
function projectorError(message: string): never {
  throw new WorkflowModelError("WORKFLOW_CONTRACT_INVALID", message);
}

export function requireProjectorString(label: string, value: unknown) {
  try {
    return requireTrimmedString(label, value);
  } catch (error) {
    throw new WorkflowModelError(
      "WORKFLOW_FIELD_INVALID",
      error instanceof Error ? error.message : `${label} must be a non-empty string`,
    );
  }
}

export function normalizeProjectorTimestamp(label: string, value: unknown) {
  try {
    return normalizeUtcInstantString(value);
  } catch (error) {
    throw new WorkflowModelError(
      "WORKFLOW_FIELD_INVALID",
      error instanceof Error ? error.message : `${label} must be an ISO-8601 UTC instant`,
    );
  }
}

export function assertNonNegativeInteger(label: string, value: unknown) {
  if (typeof value !== "number" || !Number.isInteger(value) || value < 0) {
    throw new WorkflowModelError("WORKFLOW_FIELD_INVALID", `${label} must be a non-negative integer`);
  }
  return value;
}

export function projectionHash(value: unknown) {
  return stableJsonHash(value);
}

export function projectionCachePartitionKey(input: {
  access_binding_hash: string;
  masking_posture_fingerprint: string;
  partition_scope: VisibilityPartitionContract["partition_scope"];
  subject_ref: string;
}) {
  return `projection-cache://${input.partition_scope}/${stableJsonHash({
    access_binding_hash: input.access_binding_hash,
    masking_posture_fingerprint: input.masking_posture_fingerprint,
    subject_ref: input.subject_ref,
  })}`;
}

export function buildVisibilityPartitionContract(input: {
  access_binding_hash: string;
  allowed_visibility_classes: CollaborationVisibilityClass[];
  audience_class: VisibilityPartitionContract["audience_class"];
  badge_counter_policy: VisibilityPartitionContract["badge_counter_policy"];
  cache_partition_key?: string | undefined;
  masking_posture_fingerprint: string;
  ordering_side_channel_policy: VisibilityPartitionContract["ordering_side_channel_policy"];
  partition_scope: VisibilityPartitionContract["partition_scope"];
  subject_ref: string;
}): VisibilityPartitionContract {
  const allowed = [...input.allowed_visibility_classes];
  if (allowed.length === 0 || new Set(allowed).size !== allowed.length) {
    projectorError("visibility partitions require a non-empty unique visibility class set");
  }
  return {
    access_binding_hash: requireProjectorString("access_binding_hash", input.access_binding_hash),
    allowed_visibility_classes: allowed,
    audience_class: input.audience_class,
    badge_counter_policy: input.badge_counter_policy,
    cache_partition_key:
      input.cache_partition_key ??
      projectionCachePartitionKey({
        access_binding_hash: input.access_binding_hash,
        masking_posture_fingerprint: input.masking_posture_fingerprint,
        partition_scope: input.partition_scope,
        subject_ref: input.subject_ref,
      }),
    export_scope_policy: "MOUNTED_ROUTE_VISIBILITY_ONLY",
    fallback_discovery_policy: "NO_CROSS_PARTITION_DISCOVERY",
    limited_state_presentation: "EXPLICIT_LIMITATION_NOTICE",
    masking_posture_fingerprint: requireProjectorString(
      "masking_posture_fingerprint",
      input.masking_posture_fingerprint,
    ),
    ordering_side_channel_policy: input.ordering_side_channel_policy,
    partition_scope: input.partition_scope,
  };
}

export function buildCustomerSafeProjectionContract(input: {
  access_binding_hash: string;
  boundary_scope: CustomerSafeProjectionContract["boundary_scope"];
  masking_posture_fingerprint: string;
  projection_audience: CustomerSafeProjectionContract["projection_audience"];
  visibility_cache_partition_key: string;
}): CustomerSafeProjectionContract {
  return {
    access_binding_hash: requireProjectorString("access_binding_hash", input.access_binding_hash),
    artifact_history_policy: "CURRENT_VERSUS_HISTORY_EXPLICIT",
    attachment_visibility_policy: "CUSTOMER_VISIBLE_ATTACHMENTS_ONLY",
    blocked_staff_signal_classes: [...CUSTOMER_SAFE_PROJECTION_BLOCKED_SIGNAL_CLASSES],
    boundary_scope: input.boundary_scope,
    contract_version: "CUSTOMER_SAFE_PROJECTION_V1",
    draft_placeholder_policy: "CUSTOMER_SAFE_PROJECTIONS_EXCLUDE_INTERNAL_DRAFTS",
    export_visibility_policy: "CUSTOMER_VISIBLE_EXPORTS_ONLY",
    hidden_activity_policy: "NO_HIDDEN_ACTIVITY_DERIVATION",
    limitation_notice_policy: "EXPLICIT_CUSTOMER_SAFE_NOTICE_REQUIRED",
    live_update_visibility_policy: "INTERNAL_ONLY_DELTA_EXCLUSION_REQUIRED",
    masking_posture_fingerprint: requireProjectorString(
      "masking_posture_fingerprint",
      input.masking_posture_fingerprint,
    ),
    module_projection_policy: "CUSTOMER_SAFE_MODULES_AND_METADATA_ONLY",
    notification_navigation_policy: "PORTAL_SAME_SHELL_AND_VISIBILITY_ONLY",
    plain_language_action_policy: "CUSTOMER_SAFE_ACTION_VOCABULARY_ONLY",
    plain_language_status_policy: "CUSTOMER_SAFE_STATUS_VOCABULARY_ONLY",
    projection_audience: input.projection_audience,
    recovery_explanation_policy: "EXPLICIT_CUSTOMER_SAFE_RECOVERY_NOTICE_REQUIRED",
    shell_family: "CLIENT_PORTAL_SHELL",
    staff_field_dependency_policy: "EXCLUDE_STAFF_FIELDS_AT_PROJECTION_SOURCE",
    status_derivation_policy: "CUSTOMER_SAFE_BLOCKS_ONLY",
    visibility_cache_partition_key: requireProjectorString(
      "visibility_cache_partition_key",
      input.visibility_cache_partition_key,
    ),
  };
}

export function buildFocusRestorationContract(focusAnchorRef: string | null): FocusRestorationContract {
  return buildExactFocusRestorationContract(focusAnchorRef);
}

export function buildActionAuthorityContract(input: {
  access_binding_hash: string;
  actionability_state: WorkspaceActionabilityState;
  available_action_codes: readonly string[];
  basis_hash?: string | undefined;
  blocked_action_codes: readonly string[];
  blocking_reason_code_or_null: string | null;
  customer_safe_projection: boolean;
  machine_reason_codes: readonly string[];
  primary_action_code_or_null: string | null;
  projection_route_key: string;
  projection_scope: ActionAuthorityContract["projection_scope"];
  projection_version: number;
  recovery_focus_anchor_ref_or_null: string | null;
  recovery_route_ref_or_null: string | null;
  secondary_action_codes?: readonly string[] | undefined;
  suggested_module_code_or_null: WorkspaceModuleCode | null;
  visibility_cache_partition_key: string;
}): ActionAuthorityContract {
  const machineReasonCodes = [...input.machine_reason_codes];
  if (machineReasonCodes.length === 0) {
    projectorError("action authority requires at least one machine reason code");
  }
  const base = {
    actionability_state: input.actionability_state,
    available_action_codes: [...input.available_action_codes],
    blocked_action_codes: [...input.blocked_action_codes],
    blocking_reason_code_or_null: input.blocking_reason_code_or_null,
    customer_safe_projection: input.customer_safe_projection,
    machine_reason_codes: machineReasonCodes,
    primary_action_code_or_null: input.primary_action_code_or_null,
    projection_route_key: input.projection_route_key,
    projection_scope: input.projection_scope,
    projection_version: input.projection_version,
    recovery_focus_anchor_ref_or_null: input.recovery_focus_anchor_ref_or_null,
    recovery_route_ref_or_null: input.recovery_route_ref_or_null,
    secondary_action_codes: [...(input.secondary_action_codes ?? [])],
    suggested_module_code_or_null: input.suggested_module_code_or_null,
    visibility_cache_partition_key: input.visibility_cache_partition_key,
  };
  return {
    access_binding_hash: input.access_binding_hash,
    basis_hash: input.basis_hash ?? stableJsonHash(base),
    source_module_code: "WORKFLOW_CHOREOGRAPHER",
    ...base,
  };
}

function routingContractHash(input: Omit<ProjectionRoutingContract, "basis_hash">) {
  return stableJsonHash({
    assignment_efficiency_score: input.assignment_efficiency_score,
    assignment_recommendation_state: input.assignment_recommendation_state,
    canonical_sort_key: input.canonical_sort_key,
    collaboration_priority_score: input.collaboration_priority_score,
    contract_version: input.contract_version,
    draft_safety_state: input.draft_safety_state,
    escalation_pressure_score: input.escalation_pressure_score,
    escalation_pressure_threshold: input.escalation_pressure_threshold,
    escalation_rank: input.escalation_rank,
    escalation_recommendation_state: input.escalation_recommendation_state,
    focused_row_reorder_state: input.focused_row_reorder_state,
    ordering_reason_codes: input.ordering_reason_codes,
    ownership_confidence_score: input.ownership_confidence_score,
    queue_health_floor: input.queue_health_floor,
    queue_health_score: input.queue_health_score,
    queue_health_state: input.queue_health_state,
    queue_pressure_score: input.queue_pressure_score,
    reassignment_gain_threshold: input.reassignment_gain_threshold,
    recommendation_reason_codes: input.recommendation_reason_codes,
    recommended_action_code_or_null: input.recommended_action_code_or_null,
    recommended_assignee_ref_or_null: input.recommended_assignee_ref_or_null,
    recommended_escalation_target_ref_or_null: input.recommended_escalation_target_ref_or_null,
    resolution_confidence_floor: input.resolution_confidence_floor,
    resolution_confidence_score: input.resolution_confidence_score,
    routing_profile_code: input.routing_profile_code,
    routing_profile_hash: input.routing_profile_hash,
    routing_queue_ref: input.routing_queue_ref,
    routing_scope: input.routing_scope,
    sla_pressure_score: input.sla_pressure_score,
  });
}

export function routingContractForProjection(input: {
  routing_contract: WorkflowRoutingContract | ProjectionRoutingContract;
  routing_scope: ProjectionRoutingScope;
}): ProjectionRoutingContract {
  const withoutBasis = {
    ...cloneWorkflowRecord(input.routing_contract),
    routing_scope: input.routing_scope,
  } satisfies Omit<ProjectionRoutingContract, "basis_hash">;
  return {
    ...withoutBasis,
    basis_hash: routingContractHash(withoutBasis),
  };
}

export function buildQueueProjectionContract(input: {
  customer_unread_count: number;
  internal_unread_count_or_null: number | null;
  latest_change_lane_or_null?: CollaborationQueueProjectionContract["latest_change_lane_or_null"] | undefined;
  projection_scope: CollaborationQueueProjectionContract["projection_scope"];
  routing_contract: WorkflowRoutingContract | ProjectionRoutingContract;
  viewer_scope: WorkspaceViewerScope;
}): CollaborationQueueProjectionContract {
  const routingContract = routingContractForProjection({
    routing_contract: input.routing_contract,
    routing_scope: input.projection_scope,
  });
  const customerUnreadCount = assertNonNegativeInteger("customer_unread_count", input.customer_unread_count);
  const internalUnreadCount =
    input.viewer_scope === "CUSTOMER_VISIBLE"
      ? null
      : input.internal_unread_count_or_null === null
        ? 0
        : assertNonNegativeInteger("internal_unread_count_or_null", input.internal_unread_count_or_null);
  const latestChangeLane =
    input.latest_change_lane_or_null ??
    (customerUnreadCount > 0 && (internalUnreadCount ?? 0) > 0
      ? "MIXED_VISIBLE"
      : customerUnreadCount > 0
        ? "CUSTOMER_VISIBLE"
        : (internalUnreadCount ?? 0) > 0
          ? "INTERNAL_ONLY"
          : null);

  return {
    basis_hash: routingContract.basis_hash,
    canonical_sort_key: routingContract.canonical_sort_key,
    customer_activity_module_badge_count: customerUnreadCount,
    customer_unread_count: customerUnreadCount,
    filter_membership_state: "IN_ACTIVE_FILTER_SET",
    focus_continuity_state:
      routingContract.focused_row_reorder_state === "DEFER_REORDER_UNTIL_FOCUS_EXIT"
        ? "PENDING_REORDER_UNTIL_FOCUS_EXIT"
        : "STABLE",
    internal_activity_module_badge_count_or_null:
      input.viewer_scope === "CUSTOMER_VISIBLE" ? null : internalUnreadCount,
    internal_unread_count_or_null: input.viewer_scope === "CUSTOMER_VISIBLE" ? null : internalUnreadCount,
    latest_change_lane_or_null: latestChangeLane,
    notification_target_module_code_or_null:
      latestChangeLane === "CUSTOMER_VISIBLE"
        ? "CUSTOMER_ACTIVITY"
        : latestChangeLane === "INTERNAL_ONLY"
          ? "INTERNAL_ACTIVITY"
          : null,
    projection_scope: input.projection_scope,
    routing_contract: routingContract,
  };
}

export function buildCacheIsolationContract(input: {
  access_binding_hash: string;
  cache_partition_ref: string;
  cache_scope_class: CacheIsolationContract["cache_scope_class"];
  canonical_object_ref: string;
  client_id_or_null: string | null;
  customer_safe_projection: boolean;
  masking_posture_fingerprint: string;
  principal_class: string;
  projection_version_ref: string;
  route_identity_ref: string;
  session_binding_hash: string;
  shell_family: WorkspaceShellFamily;
  shell_stability_ref_or_null: string | null;
  tenant_id: string;
  visibility_cache_partition_key_or_null: string | null;
}): CacheIsolationContract {
  return buildSharedCacheIsolationContract({
    access_binding_hash_or_null: input.access_binding_hash,
    cache_partition_ref: input.cache_partition_ref,
    cache_scope_class: input.cache_scope_class,
    canonical_object_ref: input.canonical_object_ref,
    client_id_or_null: input.client_id_or_null,
    customer_safe_projection: input.customer_safe_projection,
    masking_posture_fingerprint_or_null: input.masking_posture_fingerprint,
    principal_class: input.principal_class,
    projection_version_ref: input.projection_version_ref,
    route_identity_ref: input.route_identity_ref,
    session_binding_hash: input.session_binding_hash,
    shell_family: input.shell_family,
    shell_stability_ref_or_null: input.shell_stability_ref_or_null,
    tenant_id: input.tenant_id,
    visibility_cache_partition_key_or_null: input.visibility_cache_partition_key_or_null,
  });
}

export function buildRouteStabilityContract(input: {
  customer_head_sequence: number;
  frame_epoch: number;
  internal_head_sequence_or_null: number | null;
  last_published_sequence: number;
  request_state_version_or_null: number | null;
  resume_token: string;
  shell_stability_token: string;
  workspace_version: number;
}): RouteStabilityContract {
  const guardVectorComponents = {
    client_portal_workspace_version_or_null: null,
    customer_thread_head_or_null: input.customer_head_sequence,
    decision_bundle_hash_or_null: null,
    dependency_topology_hash_or_null: null,
    frame_epoch_or_null: input.frame_epoch,
    internal_thread_head_or_null: input.internal_head_sequence_or_null,
    mutation_basis_contract_hash_or_null: null,
    policy_snapshot_hash_or_null: null,
    request_state_version_or_null: input.request_state_version_or_null,
    shell_stability_token_or_null: input.shell_stability_token,
    simulation_basis_hash_or_null: null,
    view_guard_ref_or_null: null,
    work_item_version_or_null: input.workspace_version,
  };
  return {
    guard_vector_components: guardVectorComponents,
    guard_vector_hash: stableJsonHash(guardVectorComponents),
    last_published_sequence_or_null: input.last_published_sequence,
    publication_generation: input.workspace_version,
    resume_capability: "STREAM_RESUMABLE",
    resume_token_or_null: input.resume_token,
    route_scope_class: "WORKSPACE",
  };
}

export function buildStreamRecoveryContract(input: {
  access_binding_hash: string;
  frame_epoch: number;
  last_published_sequence: number;
  masking_posture_fingerprint: string;
  publication_generation: number;
  resume_token: string;
  route_key: string;
  session_binding_hash: string;
  session_ref: string;
  shell_stability_token: string;
  subject_ref: string;
}): StreamRecoveryContract {
  return {
    access_binding_hash: input.access_binding_hash,
    catch_up_policy: "CATCH_UP_BEFORE_LIVE",
    compaction_floor_sequence_or_null: null,
    contract_version: "STREAM_RECOVERY_V1",
    delivery_window_state: "LIVE_RESUMABLE",
    duplicate_delivery_policy: "IDEMPOTENT_BY_SCOPE_EPOCH_SEQUENCE",
    frame_epoch: input.frame_epoch,
    last_published_sequence: input.last_published_sequence,
    masking_context_hash: input.masking_posture_fingerprint,
    publication_generation: input.publication_generation,
    rebase_reason_code_or_null: null,
    rebase_trigger_policy: "REBASE_ON_EPOCH_ADVANCE_OR_COMPACTION_OR_CONTEXT_DRIFT",
    resume_binding_ref_or_null: input.resume_token,
    resume_binding_representation: "RAW_TOKEN",
    resume_token_binding_mode: "EXACT_ROUTE_SESSION_SCOPE_MASKING",
    route_key: input.route_key,
    sequence_application_policy: "STRICTLY_MONOTONIC_GAP_FREE_WITHIN_EPOCH",
    session_binding_hash: input.session_binding_hash,
    session_ref: input.session_ref,
    shell_stability_token: input.shell_stability_token,
    stream_scope_class: "WORKSPACE",
    subject_ref: input.subject_ref,
  };
}

export function buildCrossDeviceContinuityContract(input: {
  access_binding_hash: string;
  actionability_state: WorkspaceActionabilityState;
  canonical_object_ref: string;
  focus_anchor_ref_or_null: string | null;
  masking_posture_fingerprint: string;
  parent_context_ref_or_null: string;
  return_focus_anchor_ref_or_null: string;
  route_identity_ref: string;
  shell_family: WorkspaceShellFamily;
  stability_guard_hash_or_null: string;
  visibility_cache_partition_key_or_null: string;
}): CrossDeviceContinuityContract {
  return buildWorkspaceRouteContinuityContract({
    access_scope_hash_or_null: input.access_binding_hash,
    canonical_object_ref: input.canonical_object_ref,
    dominant_action_state_or_null: input.actionability_state,
    focus_anchor_ref_or_null: input.focus_anchor_ref_or_null,
    masking_scope_fingerprint_or_null: input.masking_posture_fingerprint,
    parent_context_ref_or_null: input.parent_context_ref_or_null,
    return_focus_anchor_ref_or_null: input.return_focus_anchor_ref_or_null,
    route_identity_ref: input.route_identity_ref,
    shell_family: input.shell_family,
    stability_guard_hash_or_null: input.stability_guard_hash_or_null,
    visibility_cache_partition_key_or_null: input.visibility_cache_partition_key_or_null,
  });
}

export function buildSemanticAccessibilityContract(shellFamily: WorkspaceShellFamily): SemanticAccessibilityContract {
  return {
    announced_change_kinds: [
      "ACTIVITY_DELTA",
      "BADGE_DELTA",
      "RECOVERY_NOTICE",
      "COMMAND_FAILURE",
      "TERMINAL_SETTLEMENT",
    ],
    artifact_handoff_policy: "CURRENT_AND_HISTORY_ANCHORS_SEPARATE",
    browser_identifier_policy: "DATA_TESTID_MIRRORS_SEMANTIC_ANCHOR",
    conditional_notice_anchor_policy: "LIMITATION_AND_RECOVERY_NOTICES_REQUIRE_ADDRESSABLE_ANCHORS",
    contract_version: "SEMANTIC_ACCESSIBILITY_V1",
    detail_module_access_policy: "SUPPORT_MODULES_KEYBOARD_AND_ASSISTIVE_TECH_REACHABLE",
    focus_entry_policy: "REQUESTED_ANCHOR_OR_PRIMARY_HEADING_OR_EXPLICIT_NOTICE",
    focus_order_policy: "VISIBLE_SEMANTIC_ORDER_ONLY",
    focus_restore_policy: "RETURN_TO_INVOKER_OR_LAWFUL_ANCESTOR",
    heading_navigation_policy: "PRIMARY_HEADING_AND_PROMOTED_REGION_HEADINGS",
    identifier_semantics_policy: "DOMAIN_MEANING_OVER_VISUAL_STYLING",
    keyboard_completion_policy: "ALL_GOVERNED_ACTIONS_KEYBOARD_OPERABLE",
    landmark_structure_policy: "STABLE_SHELL_SUMMARY_ACTION_SUPPORT_AND_NOTICE_LANDMARKS",
    live_region_policy: "POLITE_ACTIVITY_ASSERTIVE_FAILURE_ONLY",
    live_update_focus_policy: "NEVER_STEAL_ACTIVE_INPUT_OR_PICKER_FOCUS",
    native_identifier_policy: "ACCESSIBILITY_IDENTIFIER_MIRRORS_SEMANTIC_ANCHOR",
    reduced_motion_policy: "MEANING_PRESERVED_WITH_MINIMAL_OR_NO_MOTION",
    required_anchor_codes: [
      "SHELL_ROOT",
      "SHELL_FAMILY",
      "OBJECT_ANCHOR",
      "DOMINANT_QUESTION",
      "DOMINANT_ACTION",
      "SETTLEMENT_POSTURE",
      "RECOVERY_POSTURE",
      "CONTEXT_BAR",
      "DECISION_SUMMARY",
      "ACTION_STRIP",
      "PRIMARY_ACTION",
      "NO_SAFE_ACTION_REASON",
      "DETAIL_DRAWER",
      "PROMOTED_SUPPORT_REGION",
      "LIMITATION_NOTICE",
      "RECOVERY_NOTICE",
      "ARTIFACT_HANDOFF",
      "ARTIFACT_STATE_LABEL",
      "RETURN_PATH_CONTROL",
    ],
    selector_profile:
      shellFamily === "CALM_SHELL"
        ? "OPERATOR_SEMANTIC_SELECTORS_V1"
        : "PORTAL_SEMANTIC_SELECTORS_V1",
    semantic_focus_order: [...WORKSPACE_SURFACE_ORDER],
    shell_family: shellFamily,
    support_region_access_policy: "PROMOTED_SUPPORT_REGION_KEYBOARD_REACHABLE_AND_ESCAPABLE",
  };
}

export function buildShellDominanceContract(input: {
  actionability_state: WorkspaceActionabilityState;
  primary_action_code_or_null: string | null;
  promoted_support_surface_code_or_null: "DETAIL_DRAWER" | null;
}) {
  return {
    contract_version: "SHELL_DOMINANCE_V1",
    detached_support_policy: "SUPPORT_ONLY_NEVER_PRIMARY",
    dominant_action_ref_or_null: input.primary_action_code_or_null,
    dominant_action_surface_code: "ACTION_STRIP",
    dominant_question_surface_code: "DECISION_SUMMARY",
    explicit_multifocus_mode: "DEFAULT",
    parallel_primary_posture: "DISALLOWED",
    promoted_support_surface_code_or_null: input.promoted_support_surface_code_or_null,
    renderer_salience_policy: "SERVER_AUTHORED_ONLY",
    responsive_collapse_policy: "PRESERVE_DOMINANT_SUMMARY_AND_ACTION",
    safe_action_state: input.actionability_state,
    summary_action_alignment_policy: "SAME_DOMINANT_QUESTION",
    supplemental_queue_policy: "NOT_APPLICABLE",
    support_surface_role:
      input.promoted_support_surface_code_or_null === null
        ? "NONE"
        : input.actionability_state === "NO_SAFE_ACTION"
          ? "RECOVERY"
          : "SUBORDINATE",
  } as const;
}

export function buildShellStateTaxonomyContract(input: {
  recovery_posture: WorkspaceRecoveryPosture;
  settlement_state: WorkspaceSettlementState;
}) {
  return {
    contract_version: "SHELL_STATE_TAXONOMY_V1",
    current_empty_state_or_null: null,
    current_empty_surface_code_or_null: null,
    current_recovery_posture: input.recovery_posture,
    current_settlement_state: input.settlement_state,
    generic_placeholder_policy: "FORBID_GENERIC_EMPTY_SPINNER_WARNING",
    limitation_reason_codes: [],
    limitation_reason_policy: "LIMITED_REQUIRES_EXPLICIT_REASON_CODES",
    loading_strategy: "INLINE_PRESERVE_PRIOR_CONTENT",
    mounted_context_state: "PRESERVED",
    profile_copy_policy: "PROFILE_COPY_MUST_MAP_TO_SHARED_TAXONOMY",
    recovery_navigation_policy: "PRESERVE_CURRENT_OBJECT_UNLESS_SUPERSEDED",
    stale_action_policy: "STALE_DEGRADED_AND_RECOVERY_REQUIRE_NO_SAFE_ACTION",
  } as const;
}

export function buildCalmInteractionLayer() {
  return {
    activity_partition_policy: "VISIBILITY_SCOPED_LANES_WITH_CURRENT_FIRST_ARTIFACTS",
    artifact_preview_surface: "DETAIL_DRAWER",
    delta_promotion_mode: "COALESCE_BEFORE_PROMOTION",
    feedback_truth_policy: "DURABLE_RECEIPT_AND_TYPED_FAILURE_DRIVEN",
    foundation_contract: {
      continuity_policy: "SAME_OBJECT_SAME_SHELL_INLINE_RECOVERY",
      contract_version: "CROSS_SHELL_INTERACTION_FOUNDATION_V1",
      design_token_binding_policy: "EXPLICIT_SEMANTIC_BINDINGS_ONLY",
      feedback_truth_policy: "DURABLE_RECEIPT_AND_TYPED_FAILURE_DRIVEN",
      history_presentation_policy: "CURRENT_PRIMARY_HISTORY_SECONDARY",
      layout_density_token: "CALM_FOUR_SURFACE_DENSITY_V1",
      motion_profile: "SUBTLE_CAUSAL_ONLY",
      motion_token: "SUBTLE_CAUSAL_MOTION_V1",
      notification_surface_policy: "CONTEXT_BOUND_INLINE_FEEDBACK_OR_PARENT_MIRROR",
      platform_parity_policy: "SAME_FAMILY_REUSES_SAME_INTERACTION_GRAMMAR",
      preview_surface_policy: "DETAIL_DRAWER_OR_PARENT_BOUND_SECONDARY_WINDOW",
      recovery_surface_policy: "INLINE_EXPLICIT_REBASE",
      responsive_compaction_token: "CALM_SUPPORT_REDOCK_V1",
      secondary_window_policy: "SUPPORT_ONLY_PARENT_BOUND_CLOSE_RETURNS_FOCUS",
      selector_profile: "OPERATOR_SEMANTIC_SELECTORS_V1",
      shell_family: "CALM_SHELL",
      support_surface_policy: "ONE_PROMOTED_SUPPORT_SURFACE_MAX",
      support_surface_spacing_token: "CALM_DETAIL_DRAWER_SUPPORT_SPACING_V1",
      surface_spacing_token: "CALM_FOUR_SURFACE_SPACING_V1",
    },
    history_presentation: "CURRENT_PRIMARY_HISTORY_SECONDARY",
    investigation_presentation_policy: "SUMMARY_FIRST_PLAIN_LANGUAGE_MODULES",
    motion_profile: "SUBTLE_CAUSAL_ONLY",
    mounted_content_policy: "KEEP_MOUNTED_CONTENT",
    notification_surface: "CONTEXT_BAR",
    recovery_notice_surface: "CONTEXT_BAR",
    recovery_presentation: "INLINE_EXPLICIT_REBASE",
    refresh_presentation: "INLINE_STATUS_ONLY",
    secondary_window_policy: "SUPPORT_ONLY_PARENT_BOUND_CLOSE_RETURNS_FOCUS",
    selector_profile: "OPERATOR_SEMANTIC_SELECTORS_V1",
    shell_continuity_policy: "SAME_OBJECT_SAME_SHELL_INLINE_RECOVERY",
    unsafe_action_policy: "FAIL_CLOSED_DURING_DEGRADED_OR_RECOVERY",
  } as const;
}

export function buildPortalInteractionLayer() {
  return {
    artifact_hierarchy_policy: "CURRENT_PRIMARY_HISTORY_SECONDARY",
    feedback_truth_policy: "DURABLE_RECEIPT_AND_TYPED_FAILURE_DRIVEN",
    focus_restoration_policy: "RETURN_FOCUS_ANCHOR_THEN_LATEST_VISIBLE",
    foundation_contract: {
      continuity_policy: "SAME_SHELL_CONTEXTUAL_RETURN",
      contract_version: "CROSS_SHELL_INTERACTION_FOUNDATION_V1",
      design_token_binding_policy: "EXPLICIT_SEMANTIC_BINDINGS_ONLY",
      feedback_truth_policy: "DURABLE_RECEIPT_AND_TYPED_FAILURE_DRIVEN",
      history_presentation_policy: "CURRENT_PRIMARY_HISTORY_SECONDARY",
      layout_density_token: "PORTAL_COMFORTABLE_TASK_DENSITY_V1",
      motion_profile: "SUBTLE_CAUSAL_ONLY",
      motion_token: "SUBTLE_CAUSAL_MOTION_V1",
      notification_surface_policy: "CONTEXT_BOUND_INLINE_FEEDBACK",
      platform_parity_policy: "SAME_FAMILY_REUSES_SAME_INTERACTION_GRAMMAR",
      preview_surface_policy: "PRIMARY_CONTEXT_WITH_STACKED_SUPPORT",
      recovery_surface_policy: "INLINE_REVIEW_OR_RECOVERY_NOTICE",
      responsive_compaction_token: "PORTAL_STACK_BELOW_PRIMARY_V1",
      secondary_window_policy: "NOT_APPLICABLE",
      selector_profile: "PORTAL_SEMANTIC_SELECTORS_V1",
      shell_family: "CLIENT_PORTAL_SHELL",
      support_surface_policy: "ONE_PROMOTED_SUPPORT_SURFACE_MAX",
      support_surface_spacing_token: "PORTAL_INLINE_SUPPORT_SPACING_V1",
      surface_spacing_token: "PORTAL_PRIMARY_STACK_SPACING_V1",
    },
    motion_profile: "SUBTLE_CAUSAL_ONLY",
    navigation_model: "TOP_LEVEL_TABS_CONTEXTUAL_DETAIL",
    responsive_detail_policy: "STACK_SUPPORT_BELOW_PRIMARY",
    route_continuity_policy: "SAME_SHELL_CONTEXTUAL_RETURN",
    selector_profile: "PORTAL_SEMANTIC_SELECTORS_V1",
    spacing_profile: "COMFORTABLE_TASK_FIRST",
    status_language_profile: "PLAIN_LITERAL_CLIENT_SAFE",
    support_region_policy: "ONE_PROMOTED_REGION_MAX",
  } as const;
}

export function buildPortalLanguageContract() {
  return {
    contract_code: "PORTAL_LANGUAGE_CONTRACT_V1",
    copy_budget: {
      action_label_max_chars: 36,
      approval_change_digest_max_chars: 180,
      approval_receipt_next_step_max_chars: 96,
      approval_summary_max_chars: 180,
      approval_title_max_chars: 72,
      approvals_first_view_char_budget: 560,
      documents_first_view_char_budget: 560,
      dominant_question_max_chars: 120,
      help_first_view_char_budget: 420,
      help_headline_max_chars: 96,
      help_option_label_max_chars: 40,
      home_first_view_char_budget: 520,
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
  } as const;
}

export function buildArtifactSelectionContract(input: {
  current_artifact_ref_or_null: string | null;
  historical_artifact_refs: readonly string[];
}) {
  const currentRefs = input.current_artifact_ref_or_null === null ? [] : [input.current_artifact_ref_or_null];
  return {
    authoritative_subject_refs: [...currentRefs],
    default_download_target_ref_or_null: input.current_artifact_ref_or_null,
    default_preview_target_ref_or_null: input.current_artifact_ref_or_null,
    default_print_target_ref_or_null: null,
    historical_subject_refs: [...input.historical_artifact_refs],
    limited_history_count_or_null: null,
    limited_history_state: "NONE",
    presentation_mode: "CURRENT_PRIMARY_HISTORY_SECONDARY",
    primary_subject_refs: [...currentRefs],
    selection_scope: "COLLABORATION_CUSTOMER_REQUEST",
  } as const;
}

export function buildArtifactAffordanceContract(input: {
  current_artifact_ref_or_null: string | null;
  historical_artifact_refs: readonly string[];
}) {
  const hasCurrent = input.current_artifact_ref_or_null !== null;
  const hasHistory = input.historical_artifact_refs.length > 0;
  return {
    affordance_scope: "COLLABORATION_CUSTOMER_REQUEST",
    contract_version: "ARTIFACT_AFFORDANCE_V1",
    default_download_target_ref_or_null: input.current_artifact_ref_or_null,
    default_preview_target_ref_or_null: input.current_artifact_ref_or_null,
    default_print_target_ref_or_null: null,
    header_posture: hasCurrent && hasHistory ? "CURRENT_WITH_HISTORY" : hasCurrent ? "CURRENT" : "HISTORICAL",
    history_affordance_state: hasHistory ? "EXPLICIT_SECONDARY" : "NONE",
    invocation_validation_policy: "VISIBLE_PRIMARY_AND_DEFAULT_TARGETS_MUST_MATCH_GOVERNED_POSTURE",
    label_visibility_policy: "EXPLICIT_POSTURE_LABELS_REQUIRED",
    preview_open_policy: hasHistory
      ? "CURRENT_SUMMARY_FIRST_THEN_HISTORY_ON_DEMAND"
      : "CURRENT_SUMMARY_FIRST_ONLY",
    primary_slot_policy: "CURRENT_PRIMARY_HISTORY_EXPLICIT",
    primary_subject_role: hasCurrent ? "CURRENT_ARTIFACT" : "NO_CURRENT_ARTIFACT",
    visible_primary_subject_ref_or_null: input.current_artifact_ref_or_null,
  } as const;
}

export function statusCodeForItem(item: Pick<WorkflowItem, "customer_status_projection" | "lifecycle_state" | "waiting_on_actor">): CustomerRequestStatusCode {
  if (item.lifecycle_state === "DONE" || item.lifecycle_state === "CANCELLED") {
    return "COMPLETED";
  }
  if (item.waiting_on_actor === "CUSTOMER" || item.customer_status_projection === "ACTION_REQUIRED") {
    return "ACTION_REQUIRED";
  }
  if (item.waiting_on_actor === "AUTHORITY") {
    return "WAITING_ON_AUTHORITY";
  }
  if (item.waiting_on_actor === "STAFF" || item.customer_status_projection === "WAITING_ON_CONFIRMATION") {
    return "WAITING_ON_US";
  }
  if (item.customer_status_projection === "RESOLVED" || item.customer_status_projection === "CLOSED") {
    return "COMPLETED";
  }
  return "IN_REVIEW";
}

export function customerDueStateForItem(item: Pick<WorkflowItem, "due_state">): CustomerRequestDueState {
  if (item.due_state === "OVERDUE" || item.due_state === "BREACHED") {
    return "OVERDUE";
  }
  if (item.due_state === "DUE_SOON") {
    return "DUE_SOON";
  }
  if (item.due_state === "ON_TRACK") {
    return "ON_TRACK";
  }
  return "NONE";
}

export function workspaceDueStateForItem(item: Pick<WorkflowItem, "due_state">) {
  return item.due_state ?? "ON_TRACK";
}

export function customerStatusLabel(statusCode: CustomerRequestStatusCode) {
  switch (statusCode) {
    case "ACTION_REQUIRED":
      return "A reply is needed";
    case "WAITING_ON_AUTHORITY":
      return "Waiting for confirmation";
    case "WAITING_ON_US":
      return "We are reviewing this";
    case "COMPLETED":
      return "Completed";
    case "IN_REVIEW":
    default:
      return "In review";
  }
}

export function customerStatusProjectionText(statusCode: CustomerRequestStatusCode) {
  return customerStatusLabel(statusCode);
}

export function dueLabelForItem(input: {
  due_at_or_null: string | null;
  due_state: CustomerRequestDueState;
}) {
  if (input.due_state === "NONE" || input.due_at_or_null === null) {
    return null;
  }
  const dateText = input.due_at_or_null.slice(0, 10);
  return input.due_state === "OVERDUE" ? `Overdue since ${dateText}` : `Due ${dateText}`;
}

export function truncateCustomerCopy(value: string, maxLength: number) {
  const trimmed = requireProjectorString("customer copy", value).replace(/\s+/g, " ");
  if (trimmed.length <= maxLength) {
    return trimmed;
  }
  return trimmed.slice(0, Math.max(1, maxLength - 1)).trimEnd();
}

export function assertCustomerSafeCopy(label: string, value: string) {
  const lower = value.toLowerCase();
  const forbidden = ["manifest", "gate", "staff", "escalat", "audit", "workflow", "override", "assignee"];
  const match = forbidden.find((token) => lower.includes(token));
  if (match !== undefined) {
    projectorError(`${label} contains customer-unsafe language token ${match}`);
  }
}

export function participantUnread(input: {
  fallback_head_sequence: number;
  lane: CollaborationVisibilityClass;
  participants: readonly WorkItemParticipant[];
}) {
  const readableParticipants = input.participants.filter((participant) =>
    input.lane === "CUSTOMER_VISIBLE"
      ? participant.last_read_customer_sequence !== null
      : participant.last_read_internal_sequence !== null,
  );
  if (readableParticipants.length === 0) {
    return input.fallback_head_sequence;
  }
  const latestRead = Math.max(
    ...readableParticipants.map((participant) =>
      input.lane === "CUSTOMER_VISIBLE"
        ? participant.last_read_customer_sequence ?? 0
        : participant.last_read_internal_sequence ?? 0,
    ),
  );
  return Math.max(0, input.fallback_head_sequence - latestRead);
}

export function customerVisibleParticipants(participants: readonly WorkItemParticipant[]) {
  return participants.filter((participant) => participant.watch_state === "CUSTOMER_PARTICIPANT");
}

export function latestWorkspaceSnapshotRef(input: {
  item_id: string;
  shell_stability_token: string;
  viewer_scope: WorkspaceViewerScope;
  workspace_route_key: string;
  workspace_version: number;
}) {
  return `workspace-snapshot://${stableJsonHash(input)}`;
}
