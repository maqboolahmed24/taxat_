import {
  normalizeStringSet,
  requireTrimmedString,
} from "../../../backend-access/src/services/principal_context_normalizer.ts";
import { stableJsonHash } from "../../../domain-kernel/src/primitives/hash.ts";
import { normalizeUtcInstantString } from "../../../domain-kernel/src/primitives/time.ts";
import type { CollaborationVisibilityClass } from "./collaboration_thread.ts";
import {
  cloneWorkflowRecord,
  WorkflowModelError,
  type WorkflowRoutingContract,
} from "./workflow_item.ts";
import {
  buildNotificationOpenContinuityContract,
  CANONICAL_BROWSER_AND_NATIVE_EMBODIMENTS,
  CANONICAL_BROWSER_ONLY_EMBODIMENTS,
  PORTAL_CONTINUITY_INVALIDATION_REASONS,
  WORKFLOW_CONTINUITY_INVALIDATION_REASONS,
} from "../contracts/build_cross_device_continuity_contract.ts";
import { buildExactFocusRestorationContract } from "../contracts/build_focus_restoration_contract.ts";

export type WorkItemNotificationType =
  | "NEW_ASSIGNMENT"
  | "REASSIGNMENT"
  | "ESCALATION"
  | "CUSTOMER_REPLY"
  | "CUSTOMER_DUE_DATE_CHANGED"
  | "SLA_DUE_SOON"
  | "SLA_OVERDUE"
  | "SLA_BREACHED"
  | "ITEM_RESOLVED"
  | "ITEM_CANCELLED"
  | "REQUEST_INFO_OPENED"
  | "CUSTOMER_VISIBLE_COMMENT";
export type WorkItemNotificationDeliveryChannel = "IN_APP" | "EMAIL" | "PUSH";
export type WorkItemNotificationShellFamily = "CALM_SHELL" | "CLIENT_PORTAL_SHELL";
export type WorkItemNotificationTargetModuleCode =
  | "CUSTOMER_ACTIVITY"
  | "INTERNAL_ACTIVITY"
  | "FILES"
  | "LINKED_CONTEXT"
  | "AUDIT_TRAIL";
export type WorkItemNotificationRoutingScope =
  | "WORKFLOW_ITEM"
  | "WORK_INBOX_ROW"
  | "WORKSPACE_QUEUE_PROJECTION"
  | "WORKSPACE_STREAM_EVENT"
  | "WORK_ITEM_NOTIFICATION";
export type WorkItemNotificationLatestChangeLane =
  | "CUSTOMER_VISIBLE"
  | "INTERNAL_ONLY"
  | "MIXED_VISIBLE";
export type WorkItemNotificationFocusContinuityState =
  | "STABLE"
  | "PENDING_REORDER_UNTIL_FOCUS_EXIT"
  | "PENDING_REMOVAL_UNTIL_FOCUS_EXIT";
export type WorkItemNotificationFilterMembershipState =
  | "IN_ACTIVE_FILTER_SET"
  | "FILTER_EXIT_PENDING_FOCUS_RELEASE"
  | "OUT_OF_FILTER_SET";
export type WorkItemNotificationOpenInvalidationReason =
  | "TENANT_SWITCH"
  | "PRIVILEGE_DOWNGRADE"
  | "ACCESS_BINDING_CHANGE"
  | "MASKING_CHANGE"
  | "VIEW_GUARD_CHANGE"
  | "SESSION_REVOKED"
  | "SCHEMA_INCOMPATIBLE"
  | "OBJECT_GONE"
  | "PARENT_WINDOW_CLOSED"
  | "POLICY_SNAPSHOT_CHANGE";

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
    | "WORKSPACE_STREAM_EVENT"
    | "WORK_INBOX_SNAPSHOT"
    | "WORK_INBOX_DELTA"
    | "CLIENT_PORTAL_WORKSPACE"
    | "CUSTOMER_REQUEST_LIST"
    | "COLLABORATION_ACTIVITY_SLICE"
    | "COLLABORATION_ATTACHMENT_SLICE"
    | "WORK_ITEM_NOTIFICATION";
};

export type CustomerSafeProjectionContract = {
  access_binding_hash: string;
  artifact_history_policy: "CURRENT_VERSUS_HISTORY_EXPLICIT";
  attachment_visibility_policy: "CUSTOMER_VISIBLE_ATTACHMENTS_ONLY";
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
  ];
  boundary_scope:
    | "CLIENT_PORTAL_WORKSPACE"
    | "CUSTOMER_REQUEST_LIST"
    | "COLLABORATION_ACTIVITY_SLICE"
    | "COLLABORATION_ATTACHMENT_SLICE"
    | "WORKSPACE_STREAM_EVENT"
    | "CLIENT_DOCUMENT_REQUEST"
    | "CLIENT_APPROVAL_PACK"
    | "CLIENT_ONBOARDING_JOURNEY"
    | "CLIENT_TIMELINE_EVENT"
    | "WORKSPACE_CUSTOMER_REQUEST"
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

export type WorkItemNotificationRoutingContract = Omit<
  WorkflowRoutingContract,
  "basis_hash" | "routing_scope"
> & {
  basis_hash: string;
  routing_scope: WorkItemNotificationRoutingScope;
};

export type CollaborationQueueProjectionContract = {
  basis_hash: string;
  canonical_sort_key: WorkItemNotificationRoutingContract["canonical_sort_key"];
  customer_activity_module_badge_count: number;
  customer_unread_count: number;
  filter_membership_state: WorkItemNotificationFilterMembershipState;
  focus_continuity_state: WorkItemNotificationFocusContinuityState;
  internal_activity_module_badge_count_or_null: number | null;
  internal_unread_count_or_null: number | null;
  latest_change_lane_or_null: WorkItemNotificationLatestChangeLane | null;
  notification_target_module_code_or_null: "CUSTOMER_ACTIVITY" | "INTERNAL_ACTIVITY" | null;
  projection_scope:
    | "WORK_INBOX_ROW"
    | "WORKSPACE_QUEUE_PROJECTION"
    | "WORKSPACE_STREAM_EVENT"
    | "WORK_ITEM_NOTIFICATION";
  routing_contract: WorkItemNotificationRoutingContract;
};

export type FocusRestorationContract = {
  requested_focus_anchor_ref_or_null: string | null;
  resolved_focus_anchor_ref_or_null: string | null;
  restoration_disposition:
    | "EXACT_FOCUS"
    | "REMAPPED_FOCUS"
    | "OBJECT_SUMMARY"
    | "PARENT_RETURN"
    | "INVALIDATED";
  restoration_reason_code_or_null: string | null;
};

export type CrossDeviceContinuityContract = {
  access_scope_hash_or_null: string | null;
  action_posture_policy: "DOMINANCE_AND_SETTLEMENT_SERVER_AUTHORED_ONLY";
  allowed_embodiments: (
    | "BROWSER_WIDE"
    | "BROWSER_NARROW_STACKED"
    | "NATIVE_PRIMARY_SCENE"
    | "NATIVE_SUPPORT_WINDOW"
  )[];
  canonical_object_ref: string;
  compatibility_basis_class:
    | "ROUTE_GUARD_ONLY"
    | "ROUTE_GUARD_AND_VISIBILITY"
    | "VISIBILITY_ONLY"
    | "SESSION_MASKING_AND_ROUTE_GUARD"
    | "SESSION_MASKING_AND_PARENT_SCENE";
  continuity_scope:
    | "MANIFEST_ROUTE"
    | "WORKSPACE_ROUTE"
    | "CLIENT_PORTAL_ROUTE"
    | "WORK_ITEM_NOTIFICATION"
    | "NATIVE_PRIMARY_SCENE"
    | "NATIVE_SECONDARY_WINDOW"
    | "GOVERNANCE_ROUTE";
  contract_version: "CROSS_DEVICE_CONTINUITY_V1";
  deep_link_return_policy: "EXPLICIT_PARENT_CONTEXT_AND_FOCUS";
  dominant_action_state_or_null: "ACTION_AVAILABLE" | "NO_SAFE_ACTION" | null;
  focus_anchor_ref_or_null: string | null;
  hydration_compatibility_policy: "TENANT_ACCESS_MASKING_AND_SESSION_BOUND";
  masking_scope_fingerprint_or_null: string | null;
  narrow_layout_policy: "STACK_WITHIN_SAME_SHELL" | "NOT_APPLICABLE";
  parent_context_ref_or_null: string | null;
  restoration_mode_policy: "EXPLICIT_CARRY_FORWARD_OR_REBASE_ONLY";
  return_focus_anchor_ref_or_null: string | null;
  route_identity_ref: string;
  same_object_policy: "PRESERVE_EXACT_OBJECT_OR_EXPLICIT_LAWFUL_FALLBACK";
  same_shell_policy: "PRESERVE_SAME_SHELL_FAMILY";
  secondary_window_policy: "NOT_APPLICABLE" | "SUPPORT_ONLY_PARENT_BOUND";
  session_scope_ref_or_null: string | null;
  shell_family: "CALM_SHELL" | "CLIENT_PORTAL_SHELL" | "GOVERNANCE_DENSITY_SHELL";
  stability_guard_hash_or_null: string | null;
  supported_invalidation_reason_codes: WorkItemNotificationOpenInvalidationReason[];
  visibility_cache_partition_key_or_null: string | null;
};

export type WorkItemNotification = {
  access_binding_hash: string;
  cross_device_continuity_contract: CrossDeviceContinuityContract;
  customer_safe_projection: CustomerSafeProjectionContract | null;
  dedupe_key: string;
  delivered_at: string | null;
  delivery_channel: WorkItemNotificationDeliveryChannel;
  fallback_focus_anchor_ref: string;
  fallback_reason_code_or_null: string | null;
  fallback_route_ref: string;
  focus_anchor_ref: string | null;
  focus_restoration: FocusRestorationContract;
  item_id: string;
  notification_id: string;
  notification_type: WorkItemNotificationType;
  object_anchor_ref: string;
  queue_projection: CollaborationQueueProjectionContract;
  queued_at: string;
  read_at: string | null;
  recipient_ref: string;
  request_info_ref: string | null;
  return_focus_anchor_ref: string;
  return_route_ref: string;
  semantic_action_id: string;
  shell_family: WorkItemNotificationShellFamily;
  suppressed_reason_codes: string[];
  target_module_code: WorkItemNotificationTargetModuleCode | null;
  target_route_ref: string;
  visibility_class: CollaborationVisibilityClass;
  visibility_partition: VisibilityPartitionContract;
  workspace_version_at_queue: number;
};

export const CUSTOMER_SAFE_PROJECTION_BLOCKED_SIGNAL_CLASSES = [
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

export const CROSS_DEVICE_BROWSER_ONLY_EMBODIMENTS = CANONICAL_BROWSER_ONLY_EMBODIMENTS;
export const CROSS_DEVICE_BROWSER_AND_NATIVE_EMBODIMENTS =
  CANONICAL_BROWSER_AND_NATIVE_EMBODIMENTS;
export const CROSS_DEVICE_WORKSPACE_INVALIDATION_REASONS =
  WORKFLOW_CONTINUITY_INVALIDATION_REASONS;
export const CROSS_DEVICE_PORTAL_INVALIDATION_REASONS =
  PORTAL_CONTINUITY_INVALIDATION_REASONS;

const VISIBILITY_CLASSES = ["CUSTOMER_VISIBLE", "INTERNAL_ONLY"] as const;
const NOTIFICATION_TYPES = [
  "NEW_ASSIGNMENT",
  "REASSIGNMENT",
  "ESCALATION",
  "CUSTOMER_REPLY",
  "CUSTOMER_DUE_DATE_CHANGED",
  "SLA_DUE_SOON",
  "SLA_OVERDUE",
  "SLA_BREACHED",
  "ITEM_RESOLVED",
  "ITEM_CANCELLED",
  "REQUEST_INFO_OPENED",
  "CUSTOMER_VISIBLE_COMMENT",
] as const;
const CUSTOMER_VISIBLE_NOTIFICATION_TYPES = [
  "REQUEST_INFO_OPENED",
  "CUSTOMER_VISIBLE_COMMENT",
  "CUSTOMER_DUE_DATE_CHANGED",
  "ITEM_RESOLVED",
  "ITEM_CANCELLED",
] as const;
const INTERNAL_NOTIFICATION_TYPES = [
  "NEW_ASSIGNMENT",
  "REASSIGNMENT",
  "ESCALATION",
  "CUSTOMER_REPLY",
  "SLA_DUE_SOON",
  "SLA_OVERDUE",
  "SLA_BREACHED",
  "ITEM_RESOLVED",
  "ITEM_CANCELLED",
] as const;
const DELIVERY_CHANNELS = ["IN_APP", "EMAIL", "PUSH"] as const;
const SHELL_FAMILIES = ["CALM_SHELL", "CLIENT_PORTAL_SHELL"] as const;
const TARGET_MODULE_CODES = [
  "CUSTOMER_ACTIVITY",
  "INTERNAL_ACTIVITY",
  "FILES",
  "LINKED_CONTEXT",
  "AUDIT_TRAIL",
] as const;
const CUSTOMER_TARGET_MODULE_CODES = ["CUSTOMER_ACTIVITY", "FILES"] as const;
const ROUTING_SCOPES = [
  "WORKFLOW_ITEM",
  "WORK_INBOX_ROW",
  "WORKSPACE_QUEUE_PROJECTION",
  "WORKSPACE_STREAM_EVENT",
  "WORK_ITEM_NOTIFICATION",
] as const;
const ROUTING_ASSIGNMENT_RECOMMENDATIONS = [
  "KEEP_CURRENT_OWNER",
  "ASSIGN_RECOMMENDED",
  "REASSIGN_RECOMMENDED",
  "NO_ELIGIBLE_OWNER",
] as const;
const ROUTING_ESCALATION_RECOMMENDATIONS = [
  "NO_ESCALATION",
  "ESCALATE_RECOMMENDED",
  "ESCALATED_ACTIVE",
  "MANUAL_REVIEW_REQUIRED",
] as const;
const ROUTING_QUEUE_HEALTH_STATES = ["HEALTHY", "DEGRADED", "SATURATED"] as const;
const ROUTING_FOCUS_STATES = ["APPLY_IMMEDIATELY", "DEFER_REORDER_UNTIL_FOCUS_EXIT"] as const;
const ROUTING_DRAFT_SAFETY_STATES = [
  "NO_DRAFT_LOCK",
  "DRAFT_LOCK_PREVENTS_TRANSFER",
  "COMMAND_PENDING_PREVENTS_TRANSFER",
] as const;
const LATEST_CHANGE_LANES = ["CUSTOMER_VISIBLE", "INTERNAL_ONLY", "MIXED_VISIBLE"] as const;
const FOCUS_CONTINUITY_STATES = [
  "STABLE",
  "PENDING_REORDER_UNTIL_FOCUS_EXIT",
  "PENDING_REMOVAL_UNTIL_FOCUS_EXIT",
] as const;
const FILTER_MEMBERSHIP_STATES = [
  "IN_ACTIVE_FILTER_SET",
  "FILTER_EXIT_PENDING_FOCUS_RELEASE",
  "OUT_OF_FILTER_SET",
] as const;
const FOCUS_RESTORATION_DISPOSITIONS = [
  "EXACT_FOCUS",
  "REMAPPED_FOCUS",
  "OBJECT_SUMMARY",
  "PARENT_RETURN",
  "INVALIDATED",
] as const;
const OPEN_INVALIDATION_REASONS = [
  "TENANT_SWITCH",
  "PRIVILEGE_DOWNGRADE",
  "ACCESS_BINDING_CHANGE",
  "MASKING_CHANGE",
  "VIEW_GUARD_CHANGE",
  "SESSION_REVOKED",
  "SCHEMA_INCOMPATIBLE",
  "OBJECT_GONE",
  "PARENT_WINDOW_CLOSED",
  "POLICY_SNAPSHOT_CHANGE",
] as const;
const CUSTOMER_DETAIL_ROUTE_RE = /^\/portal\/requests\/(?<item_id>\S+)$/;
const CUSTOMER_RETURN_ROUTE_RE = /^(\/portal|\/portal\/requests|\/portal\/approvals|\/portal\/help)$/;
const STAFF_DETAIL_ROUTE_RE = /^\/work\/items\/(?<item_id>\S+)$/;
const STAFF_RETURN_ROUTE_RE = /^(\/work|\/manifests\/\S+\?focus=workflow:\S+)$/;

function notificationError(message: string): never {
  throw new WorkflowModelError("WORKFLOW_CONTRACT_INVALID", message);
}

function requireString(label: string, value: unknown) {
  try {
    return requireTrimmedString(label, value);
  } catch (error) {
    throw new WorkflowModelError(
      "WORKFLOW_FIELD_INVALID",
      error instanceof Error ? error.message : `${label} must be a non-empty string`,
    );
  }
}

function normalizeNullableString(label: string, value: unknown) {
  return value == null ? null : requireString(label, value);
}

function normalizeTimestamp(label: string, value: unknown) {
  try {
    return normalizeUtcInstantString(value);
  } catch (error) {
    throw new WorkflowModelError(
      "WORKFLOW_FIELD_INVALID",
      error instanceof Error ? error.message : `${label} must be an ISO-8601 UTC instant`,
    );
  }
}

function normalizeNullableTimestamp(label: string, value: unknown) {
  return value == null ? null : normalizeTimestamp(label, value);
}

function assertEnum<T extends string>(label: string, value: unknown, allowed: readonly T[]) {
  if (typeof value !== "string" || !allowed.includes(value as T)) {
    throw new WorkflowModelError("WORKFLOW_FIELD_INVALID", `${label} must be one of ${allowed.join(", ")}`);
  }
  return value as T;
}

function assertNullableEnum<T extends string>(label: string, value: unknown, allowed: readonly T[]) {
  return value == null ? null : assertEnum(label, value, allowed);
}

function assertIntegerInRange(label: string, value: unknown, min: number, max: number) {
  if (
    typeof value !== "number" ||
    !Number.isInteger(value) ||
    Number.isNaN(value) ||
    value < min ||
    value > max
  ) {
    throw new WorkflowModelError("WORKFLOW_FIELD_INVALID", `${label} must be an integer in [${min},${max}]`);
  }
  return value;
}

function assertNonNegativeInteger(label: string, value: unknown) {
  return assertIntegerInRange(label, value, 0, Number.MAX_SAFE_INTEGER);
}

function requireExact<T>(label: string, value: unknown, expected: T): T {
  if (value !== expected) {
    notificationError(`${label} must stay ${String(expected)}`);
  }
  return expected;
}

function requireArrayExact<T extends readonly string[]>(label: string, value: unknown, expected: T): T {
  if (!Array.isArray(value) || value.length !== expected.length) {
    notificationError(`${label} must match the frozen contract array`);
  }
  for (const [index, expectedValue] of expected.entries()) {
    if (value[index] !== expectedValue) {
      notificationError(`${label} must match the frozen contract array`);
    }
  }
  return expected;
}

function normalizeStringRefs(label: string, values: readonly string[], minItems = 0) {
  try {
    return normalizeStringSet(label, values, { minItems });
  } catch (error) {
    throw new WorkflowModelError(
      "WORKFLOW_FIELD_INVALID",
      error instanceof Error ? error.message : `${label} must be a valid string set`,
    );
  }
}

function normalizeBlockedSignalClasses(
  label: string,
  values: unknown,
): CustomerSafeProjectionContract["blocked_staff_signal_classes"] {
  requireArrayExact(label, values, CUSTOMER_SAFE_PROJECTION_BLOCKED_SIGNAL_CLASSES);
  return [...CUSTOMER_SAFE_PROJECTION_BLOCKED_SIGNAL_CLASSES];
}

function assertTimestampOrder(label: string, earlier: string | null, later: string | null) {
  if (earlier !== null && later !== null && later < earlier) {
    notificationError(`${label} chronology must be monotonic`);
  }
}

function routeItemId(label: string, route: string, pattern: RegExp) {
  const match = pattern.exec(route);
  if (match?.groups?.item_id === undefined) {
    notificationError(`${label} must be a canonical notification detail route`);
  }
  return match.groups.item_id;
}

export function notificationRoutingContractHash(input: Omit<WorkItemNotificationRoutingContract, "basis_hash">) {
  return stableJsonHash({
    assignment_efficiency_score: input.assignment_efficiency_score,
    assignment_recommendation_state: input.assignment_recommendation_state,
    canonical_sort_key: {
      collaboration_priority_score: input.canonical_sort_key.collaboration_priority_score,
      effective_due_at_or_null: input.canonical_sort_key.effective_due_at_or_null,
      escalation_rank: input.canonical_sort_key.escalation_rank,
      item_id: input.canonical_sort_key.item_id,
      queue_entered_at: input.canonical_sort_key.queue_entered_at,
      resolution_confidence_score: input.canonical_sort_key.resolution_confidence_score,
    },
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

export function notificationRoutingContractFromWorkflow(
  input: WorkflowRoutingContract,
): WorkItemNotificationRoutingContract {
  const withoutBasis = {
    ...cloneWorkflowRecord(input),
    routing_scope: "WORK_ITEM_NOTIFICATION",
  } satisfies Omit<WorkItemNotificationRoutingContract, "basis_hash">;
  return normalizeWorkItemNotificationRoutingContract({
    ...withoutBasis,
    basis_hash: notificationRoutingContractHash(withoutBasis),
  });
}

export function normalizeWorkItemNotificationRoutingContract(
  input: WorkItemNotificationRoutingContract,
): WorkItemNotificationRoutingContract {
  const canonicalSortKey = {
    collaboration_priority_score: assertIntegerInRange(
      "routing_contract.canonical_sort_key.collaboration_priority_score",
      input.canonical_sort_key?.collaboration_priority_score,
      0,
      100,
    ),
    effective_due_at_or_null: normalizeNullableTimestamp(
      "routing_contract.canonical_sort_key.effective_due_at_or_null",
      input.canonical_sort_key?.effective_due_at_or_null,
    ),
    escalation_rank: assertIntegerInRange(
      "routing_contract.canonical_sort_key.escalation_rank",
      input.canonical_sort_key?.escalation_rank,
      0,
      100,
    ),
    item_id: requireString("routing_contract.canonical_sort_key.item_id", input.canonical_sort_key?.item_id),
    queue_entered_at: normalizeTimestamp(
      "routing_contract.canonical_sort_key.queue_entered_at",
      input.canonical_sort_key?.queue_entered_at,
    ),
    resolution_confidence_score: assertIntegerInRange(
      "routing_contract.canonical_sort_key.resolution_confidence_score",
      input.canonical_sort_key?.resolution_confidence_score,
      0,
      100,
    ),
  };
  const contractWithoutBasis: Omit<WorkItemNotificationRoutingContract, "basis_hash"> = {
    assignment_efficiency_score: assertIntegerInRange(
      "routing_contract.assignment_efficiency_score",
      input.assignment_efficiency_score,
      0,
      100,
    ),
    assignment_recommendation_state: assertEnum(
      "routing_contract.assignment_recommendation_state",
      input.assignment_recommendation_state,
      ROUTING_ASSIGNMENT_RECOMMENDATIONS,
    ),
    canonical_sort_key: canonicalSortKey,
    collaboration_priority_score: assertIntegerInRange(
      "routing_contract.collaboration_priority_score",
      input.collaboration_priority_score,
      0,
      100,
    ),
    contract_version: requireExact(
      "routing_contract.contract_version",
      input.contract_version,
      "COLLABORATION_ROUTING_V1",
    ),
    draft_safety_state: assertEnum(
      "routing_contract.draft_safety_state",
      input.draft_safety_state,
      ROUTING_DRAFT_SAFETY_STATES,
    ),
    escalation_pressure_score: assertIntegerInRange(
      "routing_contract.escalation_pressure_score",
      input.escalation_pressure_score,
      0,
      100,
    ),
    escalation_pressure_threshold: assertIntegerInRange(
      "routing_contract.escalation_pressure_threshold",
      input.escalation_pressure_threshold,
      0,
      100,
    ),
    escalation_rank: assertIntegerInRange("routing_contract.escalation_rank", input.escalation_rank, 0, 100),
    escalation_recommendation_state: assertEnum(
      "routing_contract.escalation_recommendation_state",
      input.escalation_recommendation_state,
      ROUTING_ESCALATION_RECOMMENDATIONS,
    ),
    focused_row_reorder_state: assertEnum(
      "routing_contract.focused_row_reorder_state",
      input.focused_row_reorder_state,
      ROUTING_FOCUS_STATES,
    ),
    ordering_reason_codes: normalizeStringRefs(
      "routing_contract.ordering_reason_codes",
      input.ordering_reason_codes,
      1,
    ),
    ownership_confidence_score: assertIntegerInRange(
      "routing_contract.ownership_confidence_score",
      input.ownership_confidence_score,
      0,
      100,
    ),
    queue_health_floor: assertIntegerInRange("routing_contract.queue_health_floor", input.queue_health_floor, 0, 100),
    queue_health_score: assertIntegerInRange("routing_contract.queue_health_score", input.queue_health_score, 0, 100),
    queue_health_state: assertEnum(
      "routing_contract.queue_health_state",
      input.queue_health_state,
      ROUTING_QUEUE_HEALTH_STATES,
    ),
    queue_pressure_score: assertIntegerInRange(
      "routing_contract.queue_pressure_score",
      input.queue_pressure_score,
      0,
      100,
    ),
    reassignment_gain_threshold: assertIntegerInRange(
      "routing_contract.reassignment_gain_threshold",
      input.reassignment_gain_threshold,
      0,
      100,
    ),
    recommendation_reason_codes: normalizeStringRefs(
      "routing_contract.recommendation_reason_codes",
      input.recommendation_reason_codes,
    ),
    recommended_action_code_or_null: normalizeNullableString(
      "routing_contract.recommended_action_code_or_null",
      input.recommended_action_code_or_null,
    ),
    recommended_assignee_ref_or_null: normalizeNullableString(
      "routing_contract.recommended_assignee_ref_or_null",
      input.recommended_assignee_ref_or_null,
    ),
    recommended_escalation_target_ref_or_null: normalizeNullableString(
      "routing_contract.recommended_escalation_target_ref_or_null",
      input.recommended_escalation_target_ref_or_null,
    ),
    resolution_confidence_floor: assertIntegerInRange(
      "routing_contract.resolution_confidence_floor",
      input.resolution_confidence_floor,
      0,
      100,
    ),
    resolution_confidence_score: assertIntegerInRange(
      "routing_contract.resolution_confidence_score",
      input.resolution_confidence_score,
      0,
      100,
    ),
    routing_profile_code: requireExact(
      "routing_contract.routing_profile_code",
      input.routing_profile_code,
      "COLLABORATION_ROUTING_FORMULA_V1",
    ),
    routing_profile_hash: requireString("routing_contract.routing_profile_hash", input.routing_profile_hash),
    routing_queue_ref: requireString("routing_contract.routing_queue_ref", input.routing_queue_ref),
    routing_scope: assertEnum("routing_contract.routing_scope", input.routing_scope, ROUTING_SCOPES),
    sla_pressure_score: assertIntegerInRange("routing_contract.sla_pressure_score", input.sla_pressure_score, 0, 100),
  };
  const contract = {
    ...contractWithoutBasis,
    basis_hash: requireString("routing_contract.basis_hash", input.basis_hash),
  };

  if (contract.routing_scope !== "WORK_ITEM_NOTIFICATION") {
    notificationError("notification queue routing_contract.routing_scope must stay WORK_ITEM_NOTIFICATION");
  }
  if (contract.canonical_sort_key.collaboration_priority_score !== contract.collaboration_priority_score) {
    notificationError("routing_contract canonical collaboration score must mirror top-level score");
  }
  if (contract.canonical_sort_key.escalation_rank !== contract.escalation_rank) {
    notificationError("routing_contract canonical escalation rank must mirror top-level rank");
  }
  if (contract.canonical_sort_key.resolution_confidence_score !== contract.resolution_confidence_score) {
    notificationError("routing_contract canonical resolution confidence must mirror top-level score");
  }
  if (contract.queue_pressure_score !== Math.max(0, 100 - contract.queue_health_score)) {
    notificationError("routing_contract.queue_pressure_score must equal 100 - queue_health_score");
  }
  if (contract.queue_health_score >= contract.queue_health_floor && contract.queue_health_state !== "HEALTHY") {
    notificationError("routing_contract.queue_health_state must be HEALTHY above the floor");
  }
  if (contract.queue_health_score < contract.queue_health_floor && contract.queue_health_state === "HEALTHY") {
    notificationError("routing_contract.queue_health_state must leave HEALTHY below the floor");
  }
  if (
    contract.assignment_recommendation_state === "KEEP_CURRENT_OWNER" &&
    contract.recommended_assignee_ref_or_null !== null
  ) {
    notificationError("routing_contract recommended assignee must clear when keeping owner");
  }
  if (
    ["ASSIGN_RECOMMENDED", "REASSIGN_RECOMMENDED"].includes(contract.assignment_recommendation_state) &&
    contract.recommended_assignee_ref_or_null === null
  ) {
    notificationError("routing_contract recommended assignee is required for owner-changing recommendations");
  }
  if (
    contract.escalation_recommendation_state === "NO_ESCALATION" &&
    contract.recommended_escalation_target_ref_or_null !== null
  ) {
    notificationError("routing_contract escalation target must clear when no escalation is recommended");
  }
  if (
    ["ESCALATE_RECOMMENDED", "ESCALATED_ACTIVE"].includes(contract.escalation_recommendation_state) &&
    contract.recommended_escalation_target_ref_or_null === null
  ) {
    notificationError("routing_contract escalation target is required for escalation posture");
  }
  if (
    contract.recommended_action_code_or_null !== null &&
    !/^[A-Z][A-Z0-9_]*$/.test(contract.recommended_action_code_or_null)
  ) {
    notificationError("routing_contract recommended action must be an uppercase action token");
  }
  if (contract.basis_hash !== notificationRoutingContractHash(contractWithoutBasis)) {
    notificationError("routing_contract.basis_hash must equal the canonical notification routing hash");
  }
  return contract;
}

export function buildVisibilityPartitionContract(input: {
  access_binding_hash: string;
  cache_partition_key: string;
  masking_posture_fingerprint: string;
  visibility_class: CollaborationVisibilityClass;
}): VisibilityPartitionContract {
  const visibilityClass = assertEnum("visibility_class", input.visibility_class, VISIBILITY_CLASSES);
  return normalizeVisibilityPartitionContract({
    access_binding_hash: input.access_binding_hash,
    allowed_visibility_classes: [visibilityClass],
    audience_class: visibilityClass === "CUSTOMER_VISIBLE" ? "CLIENT_PORTAL" : "STAFF",
    badge_counter_policy: "NO_BADGES",
    cache_partition_key: input.cache_partition_key,
    export_scope_policy: "MOUNTED_ROUTE_VISIBILITY_ONLY",
    fallback_discovery_policy: "NO_CROSS_PARTITION_DISCOVERY",
    limited_state_presentation: "EXPLICIT_LIMITATION_NOTICE",
    masking_posture_fingerprint: input.masking_posture_fingerprint,
    ordering_side_channel_policy: "VISIBLE_EVENTS_ONLY",
    partition_scope: "WORK_ITEM_NOTIFICATION",
  });
}

export function normalizeVisibilityPartitionContract(input: VisibilityPartitionContract): VisibilityPartitionContract {
  return {
    access_binding_hash: requireString("visibility_partition.access_binding_hash", input.access_binding_hash),
    allowed_visibility_classes: input.allowed_visibility_classes.map((visibility) =>
      assertEnum("visibility_partition.allowed_visibility_classes[]", visibility, VISIBILITY_CLASSES),
    ),
    audience_class: assertEnum("visibility_partition.audience_class", input.audience_class, [
      "STAFF",
      "CUSTOMER_COLLABORATION",
      "CLIENT_PORTAL",
    ] as const),
    badge_counter_policy: assertEnum("visibility_partition.badge_counter_policy", input.badge_counter_policy, [
      "SPLIT_LANE_COUNTS",
      "SURFACE_VISIBLE_ONLY",
      "NO_BADGES",
    ] as const),
    cache_partition_key: requireString("visibility_partition.cache_partition_key", input.cache_partition_key),
    export_scope_policy: requireExact(
      "visibility_partition.export_scope_policy",
      input.export_scope_policy,
      "MOUNTED_ROUTE_VISIBILITY_ONLY",
    ),
    fallback_discovery_policy: requireExact(
      "visibility_partition.fallback_discovery_policy",
      input.fallback_discovery_policy,
      "NO_CROSS_PARTITION_DISCOVERY",
    ),
    limited_state_presentation: requireExact(
      "visibility_partition.limited_state_presentation",
      input.limited_state_presentation,
      "EXPLICIT_LIMITATION_NOTICE",
    ),
    masking_posture_fingerprint: requireString(
      "visibility_partition.masking_posture_fingerprint",
      input.masking_posture_fingerprint,
    ),
    ordering_side_channel_policy: assertEnum(
      "visibility_partition.ordering_side_channel_policy",
      input.ordering_side_channel_policy,
      ["VISIBLE_EVENTS_ONLY", "SEGMENTED_VISIBLE_EVENTS_ONLY", "CANONICAL_LIST_ONLY"] as const,
    ),
    partition_scope: requireExact(
      "visibility_partition.partition_scope",
      input.partition_scope,
      "WORK_ITEM_NOTIFICATION",
    ),
  };
}

export function buildCustomerSafeProjectionContract(input: {
  access_binding_hash: string;
  masking_posture_fingerprint: string;
  visibility_cache_partition_key: string;
}): CustomerSafeProjectionContract {
  return normalizeCustomerSafeProjectionContract({
    access_binding_hash: input.access_binding_hash,
    artifact_history_policy: "CURRENT_VERSUS_HISTORY_EXPLICIT",
    attachment_visibility_policy: "CUSTOMER_VISIBLE_ATTACHMENTS_ONLY",
    blocked_staff_signal_classes: [...CUSTOMER_SAFE_PROJECTION_BLOCKED_SIGNAL_CLASSES],
    boundary_scope: "WORK_ITEM_NOTIFICATION",
    contract_version: "CUSTOMER_SAFE_PROJECTION_V1",
    draft_placeholder_policy: "CUSTOMER_SAFE_PROJECTIONS_EXCLUDE_INTERNAL_DRAFTS",
    export_visibility_policy: "CUSTOMER_VISIBLE_EXPORTS_ONLY",
    hidden_activity_policy: "NO_HIDDEN_ACTIVITY_DERIVATION",
    limitation_notice_policy: "EXPLICIT_CUSTOMER_SAFE_NOTICE_REQUIRED",
    live_update_visibility_policy: "INTERNAL_ONLY_DELTA_EXCLUSION_REQUIRED",
    masking_posture_fingerprint: input.masking_posture_fingerprint,
    module_projection_policy: "CUSTOMER_SAFE_MODULES_AND_METADATA_ONLY",
    notification_navigation_policy: "PORTAL_SAME_SHELL_AND_VISIBILITY_ONLY",
    plain_language_action_policy: "CUSTOMER_SAFE_ACTION_VOCABULARY_ONLY",
    plain_language_status_policy: "CUSTOMER_SAFE_STATUS_VOCABULARY_ONLY",
    projection_audience: "CLIENT_PORTAL",
    recovery_explanation_policy: "EXPLICIT_CUSTOMER_SAFE_RECOVERY_NOTICE_REQUIRED",
    shell_family: "CLIENT_PORTAL_SHELL",
    staff_field_dependency_policy: "EXCLUDE_STAFF_FIELDS_AT_PROJECTION_SOURCE",
    status_derivation_policy: "CUSTOMER_SAFE_BLOCKS_ONLY",
    visibility_cache_partition_key: input.visibility_cache_partition_key,
  });
}

export function normalizeCustomerSafeProjectionContract(
  input: CustomerSafeProjectionContract,
): CustomerSafeProjectionContract {
  return {
    access_binding_hash: requireString("customer_safe_projection.access_binding_hash", input.access_binding_hash),
    artifact_history_policy: requireExact(
      "customer_safe_projection.artifact_history_policy",
      input.artifact_history_policy,
      "CURRENT_VERSUS_HISTORY_EXPLICIT",
    ),
    attachment_visibility_policy: requireExact(
      "customer_safe_projection.attachment_visibility_policy",
      input.attachment_visibility_policy,
      "CUSTOMER_VISIBLE_ATTACHMENTS_ONLY",
    ),
    blocked_staff_signal_classes: normalizeBlockedSignalClasses(
      "customer_safe_projection.blocked_staff_signal_classes",
      input.blocked_staff_signal_classes,
    ),
    boundary_scope: requireExact(
      "customer_safe_projection.boundary_scope",
      input.boundary_scope,
      "WORK_ITEM_NOTIFICATION",
    ),
    contract_version: requireExact(
      "customer_safe_projection.contract_version",
      input.contract_version,
      "CUSTOMER_SAFE_PROJECTION_V1",
    ),
    draft_placeholder_policy: requireExact(
      "customer_safe_projection.draft_placeholder_policy",
      input.draft_placeholder_policy,
      "CUSTOMER_SAFE_PROJECTIONS_EXCLUDE_INTERNAL_DRAFTS",
    ),
    export_visibility_policy: requireExact(
      "customer_safe_projection.export_visibility_policy",
      input.export_visibility_policy,
      "CUSTOMER_VISIBLE_EXPORTS_ONLY",
    ),
    hidden_activity_policy: requireExact(
      "customer_safe_projection.hidden_activity_policy",
      input.hidden_activity_policy,
      "NO_HIDDEN_ACTIVITY_DERIVATION",
    ),
    limitation_notice_policy: requireExact(
      "customer_safe_projection.limitation_notice_policy",
      input.limitation_notice_policy,
      "EXPLICIT_CUSTOMER_SAFE_NOTICE_REQUIRED",
    ),
    live_update_visibility_policy: requireExact(
      "customer_safe_projection.live_update_visibility_policy",
      input.live_update_visibility_policy,
      "INTERNAL_ONLY_DELTA_EXCLUSION_REQUIRED",
    ),
    masking_posture_fingerprint: requireString(
      "customer_safe_projection.masking_posture_fingerprint",
      input.masking_posture_fingerprint,
    ),
    module_projection_policy: requireExact(
      "customer_safe_projection.module_projection_policy",
      input.module_projection_policy,
      "CUSTOMER_SAFE_MODULES_AND_METADATA_ONLY",
    ),
    notification_navigation_policy: requireExact(
      "customer_safe_projection.notification_navigation_policy",
      input.notification_navigation_policy,
      "PORTAL_SAME_SHELL_AND_VISIBILITY_ONLY",
    ),
    plain_language_action_policy: requireExact(
      "customer_safe_projection.plain_language_action_policy",
      input.plain_language_action_policy,
      "CUSTOMER_SAFE_ACTION_VOCABULARY_ONLY",
    ),
    plain_language_status_policy: requireExact(
      "customer_safe_projection.plain_language_status_policy",
      input.plain_language_status_policy,
      "CUSTOMER_SAFE_STATUS_VOCABULARY_ONLY",
    ),
    projection_audience: requireExact(
      "customer_safe_projection.projection_audience",
      input.projection_audience,
      "CLIENT_PORTAL",
    ),
    recovery_explanation_policy: requireExact(
      "customer_safe_projection.recovery_explanation_policy",
      input.recovery_explanation_policy,
      "EXPLICIT_CUSTOMER_SAFE_RECOVERY_NOTICE_REQUIRED",
    ),
    shell_family: requireExact(
      "customer_safe_projection.shell_family",
      input.shell_family,
      "CLIENT_PORTAL_SHELL",
    ),
    staff_field_dependency_policy: requireExact(
      "customer_safe_projection.staff_field_dependency_policy",
      input.staff_field_dependency_policy,
      "EXCLUDE_STAFF_FIELDS_AT_PROJECTION_SOURCE",
    ),
    status_derivation_policy: requireExact(
      "customer_safe_projection.status_derivation_policy",
      input.status_derivation_policy,
      "CUSTOMER_SAFE_BLOCKS_ONLY",
    ),
    visibility_cache_partition_key: requireString(
      "customer_safe_projection.visibility_cache_partition_key",
      input.visibility_cache_partition_key,
    ),
  };
}

export function buildFocusRestorationContract(focusAnchorRef: string | null): FocusRestorationContract {
  return normalizeFocusRestorationContract(
    buildExactFocusRestorationContract(focusAnchorRef) as FocusRestorationContract,
  );
}

export function normalizeFocusRestorationContract(input: FocusRestorationContract): FocusRestorationContract {
  const contract: FocusRestorationContract = {
    requested_focus_anchor_ref_or_null: normalizeNullableString(
      "focus_restoration.requested_focus_anchor_ref_or_null",
      input.requested_focus_anchor_ref_or_null,
    ),
    resolved_focus_anchor_ref_or_null: normalizeNullableString(
      "focus_restoration.resolved_focus_anchor_ref_or_null",
      input.resolved_focus_anchor_ref_or_null,
    ),
    restoration_disposition: assertEnum(
      "focus_restoration.restoration_disposition",
      input.restoration_disposition,
      FOCUS_RESTORATION_DISPOSITIONS,
    ),
    restoration_reason_code_or_null: normalizeNullableString(
      "focus_restoration.restoration_reason_code_or_null",
      input.restoration_reason_code_or_null,
    ),
  };
  if (contract.restoration_disposition !== "EXACT_FOCUS") {
    notificationError("work item notification focus restoration must use EXACT_FOCUS");
  }
  if (contract.restoration_reason_code_or_null !== null) {
    notificationError("EXACT_FOCUS notification restoration must clear the reason code");
  }
  if (contract.requested_focus_anchor_ref_or_null !== contract.resolved_focus_anchor_ref_or_null) {
    notificationError("notification focus restoration must resolve the requested anchor exactly");
  }
  return contract;
}

export function buildCrossDeviceContinuityContract(input: {
  access_binding_hash: string;
  canonical_object_ref: string;
  focus_anchor_ref: string | null;
  masking_posture_fingerprint: string;
  parent_context_ref: string;
  return_focus_anchor_ref: string;
  route_identity_ref: string;
  shell_family: WorkItemNotificationShellFamily;
  visibility_cache_partition_key: string;
  visibility_class: CollaborationVisibilityClass;
}): CrossDeviceContinuityContract {
  return normalizeCrossDeviceContinuityContract(
    buildNotificationOpenContinuityContract({
      access_scope_hash_or_null: input.access_binding_hash,
      canonical_object_ref: input.canonical_object_ref,
      focus_anchor_ref_or_null: input.focus_anchor_ref,
      masking_scope_fingerprint_or_null: input.masking_posture_fingerprint,
      parent_context_ref_or_null: input.parent_context_ref,
      return_focus_anchor_ref_or_null: input.return_focus_anchor_ref,
      route_identity_ref: input.route_identity_ref,
      shell_family: input.shell_family,
      visibility_cache_partition_key_or_null: input.visibility_cache_partition_key,
      visibility_class: input.visibility_class,
    }) as CrossDeviceContinuityContract,
  );
}

export function normalizeCrossDeviceContinuityContract(
  input: CrossDeviceContinuityContract,
): CrossDeviceContinuityContract {
  return {
    access_scope_hash_or_null: normalizeNullableString(
      "cross_device_continuity_contract.access_scope_hash_or_null",
      input.access_scope_hash_or_null,
    ),
    action_posture_policy: requireExact(
      "cross_device_continuity_contract.action_posture_policy",
      input.action_posture_policy,
      "DOMINANCE_AND_SETTLEMENT_SERVER_AUTHORED_ONLY",
    ),
    allowed_embodiments: input.allowed_embodiments.map((embodiment) =>
      assertEnum("cross_device_continuity_contract.allowed_embodiments[]", embodiment, [
        "BROWSER_WIDE",
        "BROWSER_NARROW_STACKED",
        "NATIVE_PRIMARY_SCENE",
        "NATIVE_SUPPORT_WINDOW",
      ] as const),
    ),
    canonical_object_ref: requireString(
      "cross_device_continuity_contract.canonical_object_ref",
      input.canonical_object_ref,
    ),
    compatibility_basis_class: assertEnum(
      "cross_device_continuity_contract.compatibility_basis_class",
      input.compatibility_basis_class,
      [
        "ROUTE_GUARD_ONLY",
        "ROUTE_GUARD_AND_VISIBILITY",
        "VISIBILITY_ONLY",
        "SESSION_MASKING_AND_ROUTE_GUARD",
        "SESSION_MASKING_AND_PARENT_SCENE",
      ] as const,
    ),
    continuity_scope: requireExact(
      "cross_device_continuity_contract.continuity_scope",
      input.continuity_scope,
      "WORK_ITEM_NOTIFICATION",
    ),
    contract_version: requireExact(
      "cross_device_continuity_contract.contract_version",
      input.contract_version,
      "CROSS_DEVICE_CONTINUITY_V1",
    ),
    deep_link_return_policy: requireExact(
      "cross_device_continuity_contract.deep_link_return_policy",
      input.deep_link_return_policy,
      "EXPLICIT_PARENT_CONTEXT_AND_FOCUS",
    ),
    dominant_action_state_or_null: requireExact(
      "cross_device_continuity_contract.dominant_action_state_or_null",
      input.dominant_action_state_or_null,
      null,
    ),
    focus_anchor_ref_or_null: normalizeNullableString(
      "cross_device_continuity_contract.focus_anchor_ref_or_null",
      input.focus_anchor_ref_or_null,
    ),
    hydration_compatibility_policy: requireExact(
      "cross_device_continuity_contract.hydration_compatibility_policy",
      input.hydration_compatibility_policy,
      "TENANT_ACCESS_MASKING_AND_SESSION_BOUND",
    ),
    masking_scope_fingerprint_or_null: normalizeNullableString(
      "cross_device_continuity_contract.masking_scope_fingerprint_or_null",
      input.masking_scope_fingerprint_or_null,
    ),
    narrow_layout_policy: requireExact(
      "cross_device_continuity_contract.narrow_layout_policy",
      input.narrow_layout_policy,
      "NOT_APPLICABLE",
    ),
    parent_context_ref_or_null: normalizeNullableString(
      "cross_device_continuity_contract.parent_context_ref_or_null",
      input.parent_context_ref_or_null,
    ),
    restoration_mode_policy: requireExact(
      "cross_device_continuity_contract.restoration_mode_policy",
      input.restoration_mode_policy,
      "EXPLICIT_CARRY_FORWARD_OR_REBASE_ONLY",
    ),
    return_focus_anchor_ref_or_null: normalizeNullableString(
      "cross_device_continuity_contract.return_focus_anchor_ref_or_null",
      input.return_focus_anchor_ref_or_null,
    ),
    route_identity_ref: requireString(
      "cross_device_continuity_contract.route_identity_ref",
      input.route_identity_ref,
    ),
    same_object_policy: requireExact(
      "cross_device_continuity_contract.same_object_policy",
      input.same_object_policy,
      "PRESERVE_EXACT_OBJECT_OR_EXPLICIT_LAWFUL_FALLBACK",
    ),
    same_shell_policy: requireExact(
      "cross_device_continuity_contract.same_shell_policy",
      input.same_shell_policy,
      "PRESERVE_SAME_SHELL_FAMILY",
    ),
    secondary_window_policy: assertEnum(
      "cross_device_continuity_contract.secondary_window_policy",
      input.secondary_window_policy,
      ["NOT_APPLICABLE", "SUPPORT_ONLY_PARENT_BOUND"] as const,
    ),
    session_scope_ref_or_null: normalizeNullableString(
      "cross_device_continuity_contract.session_scope_ref_or_null",
      input.session_scope_ref_or_null,
    ),
    shell_family: assertEnum("cross_device_continuity_contract.shell_family", input.shell_family, [
      "CALM_SHELL",
      "CLIENT_PORTAL_SHELL",
      "GOVERNANCE_DENSITY_SHELL",
    ] as const),
    stability_guard_hash_or_null: requireExact(
      "cross_device_continuity_contract.stability_guard_hash_or_null",
      input.stability_guard_hash_or_null,
      null,
    ),
    supported_invalidation_reason_codes: input.supported_invalidation_reason_codes.map((reason) =>
      assertEnum("cross_device_continuity_contract.supported_invalidation_reason_codes[]", reason, OPEN_INVALIDATION_REASONS),
    ),
    visibility_cache_partition_key_or_null: normalizeNullableString(
      "cross_device_continuity_contract.visibility_cache_partition_key_or_null",
      input.visibility_cache_partition_key_or_null,
    ),
  };
}

export function normalizeCollaborationQueueProjectionContract(
  input: CollaborationQueueProjectionContract,
): CollaborationQueueProjectionContract {
  const routingContract = normalizeWorkItemNotificationRoutingContract(input.routing_contract);
  const projection: CollaborationQueueProjectionContract = {
    basis_hash: requireString("queue_projection.basis_hash", input.basis_hash),
    canonical_sort_key: {
      collaboration_priority_score: assertIntegerInRange(
        "queue_projection.canonical_sort_key.collaboration_priority_score",
        input.canonical_sort_key?.collaboration_priority_score,
        0,
        100,
      ),
      effective_due_at_or_null: normalizeNullableTimestamp(
        "queue_projection.canonical_sort_key.effective_due_at_or_null",
        input.canonical_sort_key?.effective_due_at_or_null,
      ),
      escalation_rank: assertIntegerInRange(
        "queue_projection.canonical_sort_key.escalation_rank",
        input.canonical_sort_key?.escalation_rank,
        0,
        100,
      ),
      item_id: requireString("queue_projection.canonical_sort_key.item_id", input.canonical_sort_key?.item_id),
      queue_entered_at: normalizeTimestamp(
        "queue_projection.canonical_sort_key.queue_entered_at",
        input.canonical_sort_key?.queue_entered_at,
      ),
      resolution_confidence_score: assertIntegerInRange(
        "queue_projection.canonical_sort_key.resolution_confidence_score",
        input.canonical_sort_key?.resolution_confidence_score,
        0,
        100,
      ),
    },
    customer_activity_module_badge_count: assertNonNegativeInteger(
      "queue_projection.customer_activity_module_badge_count",
      input.customer_activity_module_badge_count,
    ),
    customer_unread_count: assertNonNegativeInteger(
      "queue_projection.customer_unread_count",
      input.customer_unread_count,
    ),
    filter_membership_state: assertEnum(
      "queue_projection.filter_membership_state",
      input.filter_membership_state,
      FILTER_MEMBERSHIP_STATES,
    ),
    focus_continuity_state: assertEnum(
      "queue_projection.focus_continuity_state",
      input.focus_continuity_state,
      FOCUS_CONTINUITY_STATES,
    ),
    internal_activity_module_badge_count_or_null:
      input.internal_activity_module_badge_count_or_null == null
        ? null
        : assertNonNegativeInteger(
            "queue_projection.internal_activity_module_badge_count_or_null",
            input.internal_activity_module_badge_count_or_null,
          ),
    internal_unread_count_or_null:
      input.internal_unread_count_or_null == null
        ? null
        : assertNonNegativeInteger(
            "queue_projection.internal_unread_count_or_null",
            input.internal_unread_count_or_null,
          ),
    latest_change_lane_or_null: assertNullableEnum(
      "queue_projection.latest_change_lane_or_null",
      input.latest_change_lane_or_null,
      LATEST_CHANGE_LANES,
    ),
    notification_target_module_code_or_null: assertNullableEnum(
      "queue_projection.notification_target_module_code_or_null",
      input.notification_target_module_code_or_null,
      ["CUSTOMER_ACTIVITY", "INTERNAL_ACTIVITY"] as const,
    ),
    projection_scope: requireExact("queue_projection.projection_scope", input.projection_scope, "WORK_ITEM_NOTIFICATION"),
    routing_contract: routingContract,
  };

  if (projection.basis_hash !== routingContract.basis_hash) {
    notificationError("queue_projection.basis_hash must mirror routing_contract.basis_hash");
  }
  if (stableJsonHash(projection.canonical_sort_key) !== stableJsonHash(routingContract.canonical_sort_key)) {
    notificationError("queue_projection.canonical_sort_key must mirror routing_contract.canonical_sort_key");
  }
  if (projection.customer_activity_module_badge_count !== projection.customer_unread_count) {
    notificationError("queue_projection customer activity badge must mirror customer unread count");
  }
  if (
    projection.internal_unread_count_or_null === null &&
    projection.internal_activity_module_badge_count_or_null !== null
  ) {
    notificationError("queue_projection internal badge must clear when internal unread count is null");
  }
  if (
    projection.internal_activity_module_badge_count_or_null === null &&
    projection.internal_unread_count_or_null !== null
  ) {
    notificationError("queue_projection internal unread count must clear when internal badge is null");
  }
  if (
    projection.internal_unread_count_or_null !== null &&
    projection.internal_activity_module_badge_count_or_null !== null &&
    projection.internal_unread_count_or_null !== projection.internal_activity_module_badge_count_or_null
  ) {
    notificationError("queue_projection internal activity badge must mirror internal unread count");
  }
  if (
    projection.latest_change_lane_or_null === "CUSTOMER_VISIBLE" &&
    projection.notification_target_module_code_or_null !== "CUSTOMER_ACTIVITY"
  ) {
    notificationError("queue_projection customer-visible latest change must target CUSTOMER_ACTIVITY");
  }
  if (
    projection.latest_change_lane_or_null === "INTERNAL_ONLY" &&
    projection.notification_target_module_code_or_null !== "INTERNAL_ACTIVITY"
  ) {
    notificationError("queue_projection internal latest change must target INTERNAL_ACTIVITY");
  }
  if (
    (projection.latest_change_lane_or_null === "MIXED_VISIBLE" || projection.latest_change_lane_or_null === null) &&
    projection.notification_target_module_code_or_null !== null
  ) {
    notificationError("queue_projection notification target module must clear without a single activity lane");
  }
  if (
    projection.latest_change_lane_or_null === "CUSTOMER_VISIBLE" &&
    projection.customer_unread_count === 0 &&
    projection.customer_activity_module_badge_count === 0
  ) {
    notificationError("queue_projection cannot claim customer activity without an unread signal");
  }
  if (
    projection.latest_change_lane_or_null === "INTERNAL_ONLY" &&
    projection.internal_unread_count_or_null === 0 &&
    projection.internal_activity_module_badge_count_or_null === 0
  ) {
    notificationError("queue_projection cannot claim internal activity without an unread signal");
  }
  if (
    projection.focus_continuity_state === "PENDING_REORDER_UNTIL_FOCUS_EXIT" &&
    projection.filter_membership_state !== "IN_ACTIVE_FILTER_SET"
  ) {
    notificationError("queue_projection deferred reorder must remain in the active filter set");
  }
  if (
    projection.focus_continuity_state === "PENDING_REMOVAL_UNTIL_FOCUS_EXIT" &&
    projection.filter_membership_state !== "FILTER_EXIT_PENDING_FOCUS_RELEASE"
  ) {
    notificationError("queue_projection deferred removal must keep filter-exit pending posture");
  }
  if (
    projection.filter_membership_state === "OUT_OF_FILTER_SET" &&
    projection.focus_continuity_state !== "STABLE"
  ) {
    notificationError("queue_projection out-of-filter rows must be stable");
  }
  return projection;
}

export function workItemNotificationId(input: { dedupe_key: string }) {
  return `work-item-notification://${stableJsonHash({
    dedupe_key: requireString("dedupe_key", input.dedupe_key),
  })}`;
}

export function workItemNotificationContentFingerprint(notification: WorkItemNotification) {
  return stableJsonHash(normalizeWorkItemNotification(notification));
}

export function isWorkItemNotificationSuppressed(notification: Pick<WorkItemNotification, "suppressed_reason_codes">) {
  return notification.suppressed_reason_codes.length > 0;
}

export function normalizeWorkItemNotification(input: WorkItemNotification): WorkItemNotification {
  const notification: WorkItemNotification = {
    access_binding_hash: requireString("access_binding_hash", input.access_binding_hash),
    cross_device_continuity_contract: normalizeCrossDeviceContinuityContract(
      input.cross_device_continuity_contract,
    ),
    customer_safe_projection:
      input.customer_safe_projection === null ? null : normalizeCustomerSafeProjectionContract(input.customer_safe_projection),
    dedupe_key: requireString("dedupe_key", input.dedupe_key),
    delivered_at: normalizeNullableTimestamp("delivered_at", input.delivered_at),
    delivery_channel: assertEnum("delivery_channel", input.delivery_channel, DELIVERY_CHANNELS),
    fallback_focus_anchor_ref: requireString("fallback_focus_anchor_ref", input.fallback_focus_anchor_ref),
    fallback_reason_code_or_null: normalizeNullableString(
      "fallback_reason_code_or_null",
      input.fallback_reason_code_or_null,
    ),
    fallback_route_ref: requireString("fallback_route_ref", input.fallback_route_ref),
    focus_anchor_ref: normalizeNullableString("focus_anchor_ref", input.focus_anchor_ref),
    focus_restoration: normalizeFocusRestorationContract(input.focus_restoration),
    item_id: requireString("item_id", input.item_id),
    notification_id: requireString("notification_id", input.notification_id),
    notification_type: assertEnum("notification_type", input.notification_type, NOTIFICATION_TYPES),
    object_anchor_ref: requireString("object_anchor_ref", input.object_anchor_ref),
    queue_projection: normalizeCollaborationQueueProjectionContract(input.queue_projection),
    queued_at: normalizeTimestamp("queued_at", input.queued_at),
    read_at: normalizeNullableTimestamp("read_at", input.read_at),
    recipient_ref: requireString("recipient_ref", input.recipient_ref),
    request_info_ref: normalizeNullableString("request_info_ref", input.request_info_ref),
    return_focus_anchor_ref: requireString("return_focus_anchor_ref", input.return_focus_anchor_ref),
    return_route_ref: requireString("return_route_ref", input.return_route_ref),
    semantic_action_id: requireString("semantic_action_id", input.semantic_action_id),
    shell_family: assertEnum("shell_family", input.shell_family, SHELL_FAMILIES),
    suppressed_reason_codes: normalizeStringRefs("suppressed_reason_codes", input.suppressed_reason_codes),
    target_module_code: assertNullableEnum("target_module_code", input.target_module_code, TARGET_MODULE_CODES),
    target_route_ref: requireString("target_route_ref", input.target_route_ref),
    visibility_class: assertEnum("visibility_class", input.visibility_class, VISIBILITY_CLASSES),
    visibility_partition: normalizeVisibilityPartitionContract(input.visibility_partition),
    workspace_version_at_queue: assertNonNegativeInteger(
      "workspace_version_at_queue",
      input.workspace_version_at_queue,
    ),
  };

  validateWorkItemNotificationContract(notification);
  return notification;
}

function validateWorkItemNotificationContract(notification: WorkItemNotification) {
  if (notification.notification_id !== workItemNotificationId({ dedupe_key: notification.dedupe_key })) {
    notificationError("notification_id must be derived from the persisted dedupe_key");
  }
  if (notification.visibility_partition.access_binding_hash !== notification.access_binding_hash) {
    notificationError("visibility_partition.access_binding_hash must mirror access_binding_hash");
  }
  if (notification.visibility_partition.masking_posture_fingerprint !== notification.cross_device_continuity_contract.masking_scope_fingerprint_or_null) {
    notificationError("cross-device masking fingerprint must mirror the visibility partition");
  }
  if (notification.visibility_partition.cache_partition_key !== notification.cross_device_continuity_contract.visibility_cache_partition_key_or_null) {
    notificationError("cross-device cache partition key must mirror the visibility partition");
  }
  if (notification.queue_projection.canonical_sort_key.item_id !== notification.item_id) {
    notificationError("queue_projection.canonical_sort_key.item_id must stay aligned with item_id");
  }
  if (notification.object_anchor_ref !== notification.item_id) {
    notificationError("object_anchor_ref must stay aligned with item_id");
  }
  if (notification.target_route_ref === notification.return_route_ref) {
    notificationError("return_route_ref must be a governed parent target, not the detail route");
  }
  if (notification.target_route_ref === notification.fallback_route_ref) {
    notificationError("fallback_route_ref must be a governed parent target, not the detail route");
  }
  if (notification.fallback_route_ref !== notification.return_route_ref) {
    notificationError("fallback_route_ref must align with return_route_ref");
  }
  if (notification.fallback_focus_anchor_ref !== notification.return_focus_anchor_ref) {
    notificationError("fallback_focus_anchor_ref must align with return_focus_anchor_ref");
  }
  if (notification.fallback_reason_code_or_null === null) {
    notificationError("fallback_reason_code_or_null must retain a governed recovery code");
  }
  if (notification.focus_restoration.resolved_focus_anchor_ref_or_null !== notification.focus_anchor_ref) {
    notificationError("focus_restoration must resolve to focus_anchor_ref");
  }
  if (notification.target_module_code === null && notification.focus_anchor_ref !== null) {
    notificationError("focus_anchor_ref must clear when target_module_code is null");
  }
  if (notification.target_module_code !== null && notification.focus_anchor_ref === null) {
    notificationError("target_module_code requires a non-null focus_anchor_ref");
  }
  if (
    (notification.target_module_code === "CUSTOMER_ACTIVITY" ||
      notification.target_module_code === "INTERNAL_ACTIVITY") &&
    notification.queue_projection.notification_target_module_code_or_null !== notification.target_module_code
  ) {
    notificationError("queue_projection target module must mirror activity target_module_code");
  }
  if (
    notification.target_module_code !== "CUSTOMER_ACTIVITY" &&
    notification.target_module_code !== "INTERNAL_ACTIVITY" &&
    notification.queue_projection.notification_target_module_code_or_null !== null
  ) {
    notificationError("queue_projection target module must clear outside activity lanes");
  }
  if (notification.read_at !== null && notification.delivered_at === null) {
    notificationError("read_at cannot exist before delivered_at");
  }
  if (notification.suppressed_reason_codes.length > 0) {
    if (notification.delivered_at !== null || notification.read_at !== null) {
      notificationError("suppressed notifications cannot retain delivered or read timestamps");
    }
  }
  if (notification.notification_type === "REQUEST_INFO_OPENED") {
    if (
      notification.visibility_class !== "CUSTOMER_VISIBLE" ||
      notification.request_info_ref === null ||
      notification.focus_anchor_ref === null
    ) {
      notificationError("REQUEST_INFO_OPENED notifications require customer visibility, request_info_ref, and focus");
    }
  } else if (notification.request_info_ref !== null) {
    notificationError("request_info_ref must clear unless notification_type is REQUEST_INFO_OPENED");
  }
  if (
    notification.notification_type === "CUSTOMER_VISIBLE_COMMENT" &&
    notification.visibility_class !== "CUSTOMER_VISIBLE"
  ) {
    notificationError("CUSTOMER_VISIBLE_COMMENT notifications must remain CUSTOMER_VISIBLE");
  }

  assertTimestampOrder("notification delivery", notification.queued_at, notification.delivered_at);
  assertTimestampOrder("notification read", notification.delivered_at, notification.read_at);
  validateVisibilitySpecificContract(notification);
  validateCrossDeviceMirrorContract(notification);
}

function validateVisibilitySpecificContract(notification: WorkItemNotification) {
  if (notification.visibility_class === "CUSTOMER_VISIBLE") {
    if (!CUSTOMER_VISIBLE_NOTIFICATION_TYPES.includes(notification.notification_type as never)) {
      notificationError("customer-visible notifications must use the portal-safe notification type set");
    }
    if (notification.customer_safe_projection === null) {
      notificationError("customer-visible notifications require customer_safe_projection");
    }
    if (notification.shell_family !== "CLIENT_PORTAL_SHELL") {
      notificationError("customer-visible notifications must stay in CLIENT_PORTAL_SHELL");
    }
    if (
      notification.visibility_partition.audience_class !== "CLIENT_PORTAL" ||
      stableJsonHash(notification.visibility_partition.allowed_visibility_classes) !==
        stableJsonHash(["CUSTOMER_VISIBLE"])
    ) {
      notificationError("customer-visible visibility partition must be client portal only");
    }
    if (
      notification.target_module_code !== null &&
      !CUSTOMER_TARGET_MODULE_CODES.includes(notification.target_module_code as never)
    ) {
      notificationError("customer-visible notifications may only target customer activity, files, or null");
    }
    if (routeItemId("target_route_ref", notification.target_route_ref, CUSTOMER_DETAIL_ROUTE_RE) !== notification.item_id) {
      notificationError("customer-visible target route must resolve to item_id");
    }
    if (!CUSTOMER_RETURN_ROUTE_RE.test(notification.return_route_ref)) {
      notificationError("customer-visible return route must stay within the lawful portal parent set");
    }
    if (!CUSTOMER_RETURN_ROUTE_RE.test(notification.fallback_route_ref)) {
      notificationError("customer-visible fallback route must stay within the lawful portal parent set");
    }
    if (
      notification.queue_projection.internal_unread_count_or_null !== null ||
      notification.queue_projection.internal_activity_module_badge_count_or_null !== null
    ) {
      notificationError("customer-visible notifications must clear internal queue counts");
    }
    if (
      notification.queue_projection.latest_change_lane_or_null === "INTERNAL_ONLY" ||
      notification.queue_projection.latest_change_lane_or_null === "MIXED_VISIBLE"
    ) {
      notificationError("customer-visible notifications must not promote internal or mixed queue lanes");
    }
    if (
      notification.customer_safe_projection.access_binding_hash !== notification.access_binding_hash ||
      notification.customer_safe_projection.masking_posture_fingerprint !==
        notification.visibility_partition.masking_posture_fingerprint ||
      notification.customer_safe_projection.visibility_cache_partition_key !==
        notification.visibility_partition.cache_partition_key
    ) {
      notificationError("customer_safe_projection must mirror access, masking, and cache partition");
    }
  } else {
    if (!INTERNAL_NOTIFICATION_TYPES.includes(notification.notification_type as never)) {
      notificationError("internal notifications must use staff-safe notification types");
    }
    if (notification.customer_safe_projection !== null) {
      notificationError("internal notifications must not serialize customer_safe_projection");
    }
    if (notification.shell_family !== "CALM_SHELL") {
      notificationError("internal notifications must stay in CALM_SHELL");
    }
    if (
      notification.visibility_partition.audience_class !== "STAFF" ||
      stableJsonHash(notification.visibility_partition.allowed_visibility_classes) !== stableJsonHash(["INTERNAL_ONLY"])
    ) {
      notificationError("internal notifications must keep a staff-only visibility partition");
    }
    if (routeItemId("target_route_ref", notification.target_route_ref, STAFF_DETAIL_ROUTE_RE) !== notification.item_id) {
      notificationError("internal target route must resolve to item_id");
    }
    if (!STAFF_RETURN_ROUTE_RE.test(notification.return_route_ref)) {
      notificationError("internal return route must stay within the lawful staff parent set");
    }
    if (!STAFF_RETURN_ROUTE_RE.test(notification.fallback_route_ref)) {
      notificationError("internal fallback route must stay within the lawful staff parent set");
    }
    if (
      notification.queue_projection.internal_unread_count_or_null === null ||
      notification.queue_projection.internal_activity_module_badge_count_or_null === null
    ) {
      notificationError("internal notifications must retain internal queue counts");
    }
  }
}

function validateCrossDeviceMirrorContract(notification: WorkItemNotification) {
  const continuity = notification.cross_device_continuity_contract;
  if (
    continuity.shell_family !== notification.shell_family ||
    continuity.canonical_object_ref !== notification.object_anchor_ref ||
    continuity.route_identity_ref !== notification.target_route_ref ||
    continuity.parent_context_ref_or_null !== notification.return_route_ref ||
    continuity.focus_anchor_ref_or_null !== notification.focus_anchor_ref ||
    continuity.return_focus_anchor_ref_or_null !== notification.return_focus_anchor_ref ||
    continuity.access_scope_hash_or_null !== notification.access_binding_hash
  ) {
    notificationError("cross_device_continuity_contract must mirror the persisted notification route envelope");
  }
  if (continuity.compatibility_basis_class !== "VISIBILITY_ONLY") {
    notificationError("notification continuity must use VISIBILITY_ONLY compatibility");
  }
  if (continuity.session_scope_ref_or_null !== null || continuity.stability_guard_hash_or_null !== null) {
    notificationError("notification continuity must not bind session or stability guard hashes");
  }
  if (notification.visibility_class === "INTERNAL_ONLY") {
    requireArrayExact(
      "cross_device_continuity_contract.allowed_embodiments",
      continuity.allowed_embodiments,
      CROSS_DEVICE_BROWSER_AND_NATIVE_EMBODIMENTS,
    );
    requireArrayExact(
      "cross_device_continuity_contract.supported_invalidation_reason_codes",
      continuity.supported_invalidation_reason_codes,
      CROSS_DEVICE_WORKSPACE_INVALIDATION_REASONS,
    );
    if (continuity.secondary_window_policy !== "SUPPORT_ONLY_PARENT_BOUND") {
      notificationError("internal notifications must advertise parent-bound native support reopening");
    }
  } else {
    requireArrayExact(
      "cross_device_continuity_contract.allowed_embodiments",
      continuity.allowed_embodiments,
      CROSS_DEVICE_BROWSER_ONLY_EMBODIMENTS,
    );
    requireArrayExact(
      "cross_device_continuity_contract.supported_invalidation_reason_codes",
      continuity.supported_invalidation_reason_codes,
      CROSS_DEVICE_PORTAL_INVALIDATION_REASONS,
    );
    if (continuity.secondary_window_policy !== "NOT_APPLICABLE") {
      notificationError("customer-visible notifications must remain browser-only");
    }
  }
}
