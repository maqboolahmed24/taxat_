import type { WorkItemNotification } from "../models/work_item_notification.ts";
import {
  cloneWorkflowRecord,
  normalizeWorkflowItem,
  type WorkflowDueState,
  type WorkflowItem,
  type WorkflowItemLifecycleState,
  type WorkflowWaitingOnActor,
  WorkflowModelError,
} from "../models/workflow_item.ts";
import {
  assertNonNegativeInteger,
  buildActionAuthorityContract,
  buildCacheIsolationContract,
  buildCalmInteractionLayer,
  buildQueueProjectionContract,
  buildVisibilityPartitionContract,
  projectionHash,
  requireProjectorString,
  routingContractForProjection,
  workspaceDueStateForItem,
  type ActionAuthorityContract,
  type CacheIsolationContract,
  type CollaborationQueueProjectionContract,
  type VisibilityPartitionContract,
  type WorkspaceRecoveryPosture,
  type WorkspaceSettlementState,
} from "./projection_contract_helpers.ts";
import {
  buildWorkQueueHealthContract,
  validateWorkQueueHealthContract,
  type WorkQueueHealthContract,
} from "./build_work_queue_health_contract.ts";
import { deriveWorkInboxSelectionState } from "./derive_work_inbox_selection_state.ts";

export type WorkInboxAssigneeScope = "ALL" | "MINE" | "UNASSIGNED";
export type WorkInboxFilterChipCode =
  | "MINE"
  | "UNASSIGNED"
  | "ESCALATED"
  | "WAITING_ON_CUSTOMER"
  | "OVERDUE"
  | "BLOCKED"
  | "RESOLVED_RECENTLY";
export type WorkInboxCustomerStatusProjection =
  | "UNDER_REVIEW"
  | "ACTION_REQUIRED"
  | "WAITING_ON_CONFIRMATION"
  | "RESOLVED"
  | "CLOSED";
export type WorkInboxDueState = Exclude<WorkflowDueState, null>;

export type MutationPreconditionBinding = {
  invalidates_on_visibility_shift: boolean;
  profile_code:
    | "WORK_ITEM_STATE_MUTATION"
    | "WORK_ITEM_INTERNAL_APPEND"
    | "WORK_ITEM_CUSTOMER_APPEND"
    | "WORK_ITEM_REQUEST_RESPONSE";
  required_guard_fields: string[];
  requires_live_freshness: boolean;
  stale_guard_families: string[];
  target_scope_classes: ["WORK_ITEM"];
};

export type WorkInboxActiveFilters = {
  assignee_scope: WorkInboxAssigneeScope;
  customer_status_projections: WorkInboxCustomerStatusProjection[];
  due_states: WorkInboxDueState[];
  escalation_only: boolean;
  include_resolved_recently: boolean;
  lifecycle_states: WorkflowItemLifecycleState[];
  selected_filter_chips: WorkInboxFilterChipCode[];
  waiting_on_actors: WorkflowWaitingOnActor[];
};

export type WorkInboxRowSortKey = {
  collaboration_priority_score: number;
  effective_due_at: string | null;
  escalation_rank: number;
  item_id: string;
  queue_entered_at: string;
  resolution_confidence_score: number;
};

export type WorkInboxRowActions = {
  actionability_state: "ACTION_AVAILABLE" | "NO_SAFE_ACTION";
  authoritative_action: ActionAuthorityContract;
  available_action_bindings: {
    action_code: string;
    mutation_precondition_binding_or_null: MutationPreconditionBinding | null;
  }[];
  available_action_codes: string[];
  blocked_action_codes: string[];
  primary_action_code: string | null;
  secondary_action_codes: string[];
};

export type WorkInboxRow = {
  assignee_label: string | null;
  collaboration_priority_score: number;
  customer_status_projection: WorkInboxCustomerStatusProjection | null;
  customer_unread_count: number;
  due_state: WorkInboxDueState | null;
  effective_due_at: string | null;
  escalation_active: boolean;
  escalation_rank: number;
  focus_anchor_ref: string;
  internal_lifecycle_state: WorkflowItemLifecycleState;
  internal_unread_count: number;
  item_id: string;
  last_activity_at: string;
  period_label: string;
  queue_entered_at: string;
  queue_projection: CollaborationQueueProjectionContract;
  resolution_confidence_score: number;
  row_actions: WorkInboxRowActions;
  sla_pressure_score: number;
  sort_key: WorkInboxRowSortKey;
  title: string;
  waiting_on_actor: WorkflowWaitingOnActor;
  client_label: string;
};

export type WorkInboxSnapshot = {
  access_binding_hash: string;
  active_filters: WorkInboxActiveFilters;
  artifact_type: "WorkInboxSnapshot";
  cache_isolation_contract: CacheIsolationContract;
  dominant_question: string;
  inbox_route_key: string;
  inbox_version: number;
  interaction_layer: ReturnType<typeof buildCalmInteractionLayer>;
  last_published_sequence: number;
  masking_posture_fingerprint: string;
  queue_health_contract: WorkQueueHealthContract;
  queue_health_score: number;
  recovery_posture: WorkspaceRecoveryPosture;
  resume_token: string;
  rows: WorkInboxRow[];
  selected_focus_anchor_ref_or_null: string | null;
  selected_item_ref: string | null;
  settlement_state: WorkspaceSettlementState;
  shell_family: "CALM_SHELL";
  tenant_id: string;
  viewer_mode: "STAFF_MUTATING" | "STAFF_READ_ONLY";
  visibility_partition: VisibilityPartitionContract;
};

export type BuildWorkInboxSnapshotInput = {
  access_binding_hash: string;
  active_filters?: Partial<Omit<WorkInboxActiveFilters, "selected_filter_chips">> | undefined;
  cache_partition_key?: string | undefined;
  inbox_route_key?: string | undefined;
  inbox_version?: number | undefined;
  items: readonly WorkflowItem[];
  last_published_sequence?: number | undefined;
  masking_posture_fingerprint: string;
  notifications?: readonly WorkItemNotification[] | undefined;
  principal_class?: string | undefined;
  queue_health_contract?: WorkQueueHealthContract | undefined;
  recovery_posture?: WorkspaceRecoveryPosture | undefined;
  selected_item_ref?: string | null | undefined;
  session_binding_hash?: string | undefined;
  settlement_state?: WorkspaceSettlementState | undefined;
  tenant_id: string;
  viewer_mode?: "STAFF_MUTATING" | "STAFF_READ_ONLY" | undefined;
  viewer_principal_ref?: string | undefined;
};

const FILTER_CHIP_ORDER: WorkInboxFilterChipCode[] = [
  "MINE",
  "UNASSIGNED",
  "ESCALATED",
  "WAITING_ON_CUSTOMER",
  "OVERDUE",
  "BLOCKED",
  "RESOLVED_RECENTLY",
];

const WORK_ITEM_MUTATION_PROFILE_BY_ACTION: Record<string, MutationPreconditionBinding["profile_code"]> = {
  ASSIGN_TO_ME: "WORK_ITEM_STATE_MUTATION",
  ASSIGN_WORK_ITEM: "WORK_ITEM_STATE_MUTATION",
  CHANGE_WORK_ITEM_STATUS: "WORK_ITEM_STATE_MUTATION",
  CLEAR_ESCALATION: "WORK_ITEM_STATE_MUTATION",
  ESCALATE: "WORK_ITEM_STATE_MUTATION",
  ESCALATE_WORK_ITEM: "WORK_ITEM_STATE_MUTATION",
  MARK_IN_PROGRESS: "WORK_ITEM_STATE_MUTATION",
  REASSIGN: "WORK_ITEM_STATE_MUTATION",
  REASSIGN_WORK_ITEM: "WORK_ITEM_STATE_MUTATION",
  REPLY: "WORK_ITEM_CUSTOMER_APPEND",
  REPLY_TO_CUSTOMER: "WORK_ITEM_CUSTOMER_APPEND",
  REQUEST_CUSTOMER_INFO: "WORK_ITEM_CUSTOMER_APPEND",
  REQUEST_INFO: "WORK_ITEM_CUSTOMER_APPEND",
  RESOLVE: "WORK_ITEM_STATE_MUTATION",
  RESPOND_TO_REQUEST_INFO: "WORK_ITEM_REQUEST_RESPONSE",
  UPLOAD_FILE: "WORK_ITEM_CUSTOMER_APPEND",
};

const MUTATION_PRECONDITION_PROFILES: Record<
  MutationPreconditionBinding["profile_code"],
  Omit<MutationPreconditionBinding, "profile_code">
> = {
  WORK_ITEM_CUSTOMER_APPEND: {
    invalidates_on_visibility_shift: true,
    required_guard_fields: [
      "if_match_work_item_version",
      "if_match_customer_head_sequence",
      "if_match_shell_stability_token",
    ],
    requires_live_freshness: true,
    stale_guard_families: [
      "WORK_ITEM_VERSION",
      "CUSTOMER_THREAD_HEAD",
      "SHELL_STABILITY_TOKEN",
    ],
    target_scope_classes: ["WORK_ITEM"],
  },
  WORK_ITEM_INTERNAL_APPEND: {
    invalidates_on_visibility_shift: true,
    required_guard_fields: [
      "if_match_work_item_version",
      "if_match_internal_head_sequence",
      "if_match_shell_stability_token",
    ],
    requires_live_freshness: true,
    stale_guard_families: [
      "WORK_ITEM_VERSION",
      "INTERNAL_THREAD_HEAD",
      "SHELL_STABILITY_TOKEN",
    ],
    target_scope_classes: ["WORK_ITEM"],
  },
  WORK_ITEM_REQUEST_RESPONSE: {
    invalidates_on_visibility_shift: true,
    required_guard_fields: [
      "if_match_work_item_version",
      "if_match_customer_head_sequence",
      "if_match_request_state_version",
      "if_match_shell_stability_token",
    ],
    requires_live_freshness: true,
    stale_guard_families: [
      "WORK_ITEM_VERSION",
      "CUSTOMER_THREAD_HEAD",
      "REQUEST_STATE_VERSION",
      "SHELL_STABILITY_TOKEN",
    ],
    target_scope_classes: ["WORK_ITEM"],
  },
  WORK_ITEM_STATE_MUTATION: {
    invalidates_on_visibility_shift: true,
    required_guard_fields: [
      "if_match_work_item_version",
      "if_match_shell_stability_token",
    ],
    requires_live_freshness: true,
    stale_guard_families: ["WORK_ITEM_VERSION", "SHELL_STABILITY_TOKEN"],
    target_scope_classes: ["WORK_ITEM"],
  },
};

function mutationPreconditionBinding(actionCode: string): MutationPreconditionBinding | null {
  const profileCode = WORK_ITEM_MUTATION_PROFILE_BY_ACTION[actionCode];
  if (profileCode === undefined) {
    return null;
  }
  return {
    profile_code: profileCode,
    ...cloneWorkflowRecord(MUTATION_PRECONDITION_PROFILES[profileCode]),
  };
}

function normalizeActiveFilters(
  filters: BuildWorkInboxSnapshotInput["active_filters"],
): WorkInboxActiveFilters {
  const normalized: Omit<WorkInboxActiveFilters, "selected_filter_chips"> = {
    assignee_scope: filters?.assignee_scope ?? "ALL",
    customer_status_projections: [...(filters?.customer_status_projections ?? [])],
    due_states: [...(filters?.due_states ?? [])],
    escalation_only: filters?.escalation_only ?? false,
    include_resolved_recently: filters?.include_resolved_recently ?? false,
    lifecycle_states: [...(filters?.lifecycle_states ?? [])],
    waiting_on_actors: [...(filters?.waiting_on_actors ?? [])],
  };
  const chips = new Set<WorkInboxFilterChipCode>();
  if (normalized.assignee_scope === "MINE") {
    chips.add("MINE");
  } else if (normalized.assignee_scope === "UNASSIGNED") {
    chips.add("UNASSIGNED");
  }
  if (normalized.escalation_only) {
    chips.add("ESCALATED");
  }
  if (normalized.waiting_on_actors.includes("CUSTOMER")) {
    chips.add("WAITING_ON_CUSTOMER");
  }
  if (normalized.due_states.includes("OVERDUE") || normalized.due_states.includes("BREACHED")) {
    chips.add("OVERDUE");
  }
  if (normalized.lifecycle_states.includes("BLOCKED")) {
    chips.add("BLOCKED");
  }
  if (normalized.include_resolved_recently) {
    chips.add("RESOLVED_RECENTLY");
  }
  return {
    ...normalized,
    selected_filter_chips: FILTER_CHIP_ORDER.filter((chip) => chips.has(chip)),
  };
}

function effectiveLastActivityAt(item: WorkflowItem) {
  return (
    [item.last_customer_activity_at, item.last_internal_activity_at, item.waiting_since_at, item.queue_entered_at]
      .filter((value): value is string => value !== null)
      .sort()
      .at(-1) ?? item.queue_entered_at
  );
}

function unreadCounts(input: {
  item_id: string;
  notifications: readonly WorkItemNotification[];
}) {
  let customer = 0;
  let internal = 0;
  let latestCustomer: string | null = null;
  let latestInternal: string | null = null;
  for (const notification of input.notifications) {
    if (
      notification.item_id !== input.item_id ||
      notification.delivered_at === null ||
      notification.read_at !== null ||
      notification.suppressed_reason_codes.length > 0
    ) {
      continue;
    }
    if (notification.visibility_class === "CUSTOMER_VISIBLE") {
      customer += 1;
      latestCustomer = maxNullableInstant(latestCustomer, notification.queued_at);
    } else {
      internal += 1;
      latestInternal = maxNullableInstant(latestInternal, notification.queued_at);
    }
  }
  const latest_change_lane_or_null =
    latestCustomer !== null && latestInternal !== null
      ? "MIXED_VISIBLE"
      : latestCustomer !== null
        ? "CUSTOMER_VISIBLE"
        : latestInternal !== null
          ? "INTERNAL_ONLY"
          : null;
  return {
    customer_unread_count: customer,
    internal_unread_count: internal,
    latest_change_lane_or_null,
  } as const;
}

function maxNullableInstant(left: string | null, right: string) {
  return left === null || right > left ? right : left;
}

function customerStatus(item: WorkflowItem): WorkInboxCustomerStatusProjection | null {
  return item.customer_status_projection;
}

function rowFocusAnchor(itemId: string) {
  return `work-inbox-row://${itemId}`;
}

type RowActionPosture = {
  actionability_state: "ACTION_AVAILABLE" | "NO_SAFE_ACTION";
  available_action_codes: string[];
  blocked_action_codes: string[];
  blocking_reason_code_or_null: string | null;
  machine_reason_codes: string[];
  primary_action_code: string | null;
  secondary_action_codes: string[];
};

function actionPosture(item: WorkflowItem): RowActionPosture {
  if (item.lifecycle_state === "DONE" || item.lifecycle_state === "CANCELLED" || item.lifecycle_state === "STALE") {
    return {
      actionability_state: "NO_SAFE_ACTION",
      available_action_codes: [],
      blocked_action_codes: ["ASSIGN_TO_ME", "REPLY", "REQUEST_CUSTOMER_INFO", "RESOLVE"],
      blocking_reason_code_or_null: item.lifecycle_state,
      machine_reason_codes: [`ITEM_${item.lifecycle_state}`],
      primary_action_code: null,
      secondary_action_codes: [],
    };
  }
  if (item.current_assignee_ref === null) {
    return {
      actionability_state: "ACTION_AVAILABLE",
      available_action_codes: ["ASSIGN_TO_ME"],
      blocked_action_codes: [],
      blocking_reason_code_or_null: null,
      machine_reason_codes: ["UNASSIGNED_ROW_ASSIGNABLE"],
      primary_action_code: "ASSIGN_TO_ME",
      secondary_action_codes: [],
    };
  }
  if (item.waiting_on_actor === "CUSTOMER") {
    return {
      actionability_state: "ACTION_AVAILABLE",
      available_action_codes: ["REQUEST_CUSTOMER_INFO"],
      blocked_action_codes: [],
      blocking_reason_code_or_null: null,
      machine_reason_codes: ["CUSTOMER_WAIT_TRIAGE_ACTION"],
      primary_action_code: "REQUEST_CUSTOMER_INFO",
      secondary_action_codes: [],
    };
  }
  if (item.waiting_on_actor === "AUTHORITY") {
    return {
      actionability_state: "NO_SAFE_ACTION",
      available_action_codes: [],
      blocked_action_codes: ["REPLY", "REQUEST_CUSTOMER_INFO", "RESOLVE"],
      blocking_reason_code_or_null: "WAITING_ON_AUTHORITY",
      machine_reason_codes: ["AUTHORITY_RESPONSE_PENDING"],
      primary_action_code: null,
      secondary_action_codes: [],
    };
  }
  return {
    actionability_state: "ACTION_AVAILABLE",
    available_action_codes: ["REPLY"],
    blocked_action_codes: [],
    blocking_reason_code_or_null: null,
    machine_reason_codes: ["STAFF_RESPONSE_READY"],
    primary_action_code: "REPLY",
    secondary_action_codes: [],
  } as const;
}

function buildRowActions(input: {
  access_binding_hash: string;
  focus_anchor_ref: string;
  inbox_route_key: string;
  inbox_version: number;
  item: WorkflowItem;
  visibility_cache_partition_key: string;
}): WorkInboxRowActions {
  const posture = actionPosture(input.item);
  const blockedActionCodes = [...posture.blocked_action_codes];
  const recommendedActionCode = input.item.routing_contract.recommended_action_code_or_null;
  if (
    recommendedActionCode !== null &&
    !posture.available_action_codes.includes(recommendedActionCode) &&
    !blockedActionCodes.includes(recommendedActionCode)
  ) {
    blockedActionCodes.push(recommendedActionCode);
  }
  const authoritativeAction = buildActionAuthorityContract({
    access_binding_hash: input.access_binding_hash,
    actionability_state: posture.actionability_state,
    available_action_codes: posture.available_action_codes,
    blocked_action_codes: blockedActionCodes,
    blocking_reason_code_or_null: posture.blocking_reason_code_or_null,
    customer_safe_projection: false,
    machine_reason_codes: posture.machine_reason_codes,
    primary_action_code_or_null: posture.primary_action_code,
    projection_route_key: input.inbox_route_key,
    projection_scope: "WORK_INBOX_ROW_ACTIONS",
    projection_version: input.inbox_version,
    recovery_focus_anchor_ref_or_null:
      posture.actionability_state === "NO_SAFE_ACTION" ? input.focus_anchor_ref : null,
    recovery_route_ref_or_null:
      posture.actionability_state === "NO_SAFE_ACTION" ? `/work/items/${input.item.item_id}` : null,
    secondary_action_codes: posture.secondary_action_codes,
    suggested_module_code_or_null:
      posture.actionability_state === "NO_SAFE_ACTION" ? "CUSTOMER_ACTIVITY" : null,
    visibility_cache_partition_key: input.visibility_cache_partition_key,
  });
  return {
    actionability_state: posture.actionability_state,
    authoritative_action: authoritativeAction,
    available_action_bindings: posture.available_action_codes.map((actionCode) => ({
      action_code: actionCode,
      mutation_precondition_binding_or_null: mutationPreconditionBinding(actionCode),
    })),
    available_action_codes: [...posture.available_action_codes],
    blocked_action_codes: blockedActionCodes,
    primary_action_code: posture.primary_action_code,
    secondary_action_codes: [...posture.secondary_action_codes],
  };
}

function canonicalSortTuple(row: WorkInboxRow): [number, number, number, number, number, string] {
  const due = row.effective_due_at === null ? Number.POSITIVE_INFINITY : Date.parse(row.effective_due_at);
  return [
    -row.collaboration_priority_score,
    -row.escalation_rank,
    Number.isFinite(due) ? due : Number.POSITIVE_INFINITY,
    row.resolution_confidence_score,
    Date.parse(row.queue_entered_at),
    row.item_id,
  ];
}

function sortRows(left: WorkInboxRow, right: WorkInboxRow) {
  const leftTuple = canonicalSortTuple(left);
  const rightTuple = canonicalSortTuple(right);
  for (let index = 0; index < leftTuple.length - 1; index += 1) {
    const leftValue = leftTuple[index] as number;
    const rightValue = rightTuple[index] as number;
    if (leftValue === rightValue) {
      continue;
    }
    return leftValue < rightValue ? -1 : 1;
  }
  return leftTuple[5].localeCompare(rightTuple[5]);
}

function mirrorQueueHealthIntoRow(input: {
  contract: WorkQueueHealthContract;
  row: WorkInboxRow;
}): WorkInboxRow {
  const routingContract = routingContractForProjection({
    routing_contract: {
      ...input.row.queue_projection.routing_contract,
      ordering_reason_codes: [
        ...new Set([
          ...input.row.queue_projection.routing_contract.ordering_reason_codes,
          ...input.contract.reason_codes,
        ]),
      ].slice(0, 6),
      queue_health_floor: input.contract.queue_health_floor,
      queue_health_score: input.contract.queue_health_score,
      queue_health_state: input.contract.queue_health_state,
      queue_pressure_score: input.contract.queue_pressure_score,
      routing_profile_hash: input.contract.routing_profile_hash,
    },
    routing_scope: "WORK_INBOX_ROW",
  });
  return {
    ...input.row,
    queue_projection: {
      ...input.row.queue_projection,
      basis_hash: routingContract.basis_hash,
      canonical_sort_key: routingContract.canonical_sort_key,
      routing_contract: routingContract,
    },
  };
}

function rowMatchesFilters(input: {
  filters: WorkInboxActiveFilters;
  item: WorkflowItem;
  row: WorkInboxRow;
  viewer_principal_ref: string | null;
}) {
  const { filters, item, row, viewer_principal_ref } = input;
  if (
    !filters.include_resolved_recently &&
    (item.lifecycle_state === "DONE" || item.lifecycle_state === "CANCELLED")
  ) {
    return false;
  }
  if (filters.assignee_scope === "MINE" && item.current_assignee_ref !== viewer_principal_ref) {
    return false;
  }
  if (filters.assignee_scope === "UNASSIGNED" && item.current_assignee_ref !== null) {
    return false;
  }
  if (filters.lifecycle_states.length > 0 && !filters.lifecycle_states.includes(item.lifecycle_state)) {
    return false;
  }
  if (filters.waiting_on_actors.length > 0 && !filters.waiting_on_actors.includes(item.waiting_on_actor)) {
    return false;
  }
  if (filters.due_states.length > 0 && (row.due_state === null || !filters.due_states.includes(row.due_state))) {
    return false;
  }
  if (
    filters.customer_status_projections.length > 0 &&
    (row.customer_status_projection === null ||
      !filters.customer_status_projections.includes(row.customer_status_projection))
  ) {
    return false;
  }
  if (filters.escalation_only && !row.escalation_active) {
    return false;
  }
  return true;
}

function buildRow(input: {
  access_binding_hash: string;
  inbox_route_key: string;
  inbox_version: number;
  item: WorkflowItem;
  notifications: readonly WorkItemNotification[];
  visibility_cache_partition_key: string;
}): WorkInboxRow {
  const item = normalizeWorkflowItem(input.item);
  const focusAnchor = rowFocusAnchor(item.item_id);
  const counts = unreadCounts({
    item_id: item.item_id,
    notifications: input.notifications,
  });
  const queueProjection = buildQueueProjectionContract({
    customer_unread_count: counts.customer_unread_count,
    internal_unread_count_or_null: counts.internal_unread_count,
    latest_change_lane_or_null: counts.latest_change_lane_or_null,
    projection_scope: "WORK_INBOX_ROW",
    routing_contract: item.routing_contract,
    viewer_scope: "STAFF_FULL",
  });
  const sortKey = {
    collaboration_priority_score: queueProjection.routing_contract.collaboration_priority_score,
    effective_due_at: queueProjection.routing_contract.canonical_sort_key.effective_due_at_or_null,
    escalation_rank: queueProjection.routing_contract.escalation_rank,
    item_id: item.item_id,
    queue_entered_at: queueProjection.routing_contract.canonical_sort_key.queue_entered_at,
    resolution_confidence_score: queueProjection.routing_contract.resolution_confidence_score,
  };
  return {
    assignee_label: item.current_assignee_ref,
    client_label: item.client_id,
    collaboration_priority_score: queueProjection.routing_contract.collaboration_priority_score,
    customer_status_projection: customerStatus(item),
    customer_unread_count: queueProjection.customer_unread_count,
    due_state: item.due_state === null ? null : workspaceDueStateForItem(item),
    effective_due_at: sortKey.effective_due_at,
    escalation_active: queueProjection.routing_contract.escalation_recommendation_state === "ESCALATED_ACTIVE",
    escalation_rank: queueProjection.routing_contract.escalation_rank,
    focus_anchor_ref: focusAnchor,
    internal_lifecycle_state: item.lifecycle_state,
    internal_unread_count: queueProjection.internal_unread_count_or_null ?? 0,
    item_id: item.item_id,
    last_activity_at: effectiveLastActivityAt(item),
    period_label: item.period,
    queue_entered_at: sortKey.queue_entered_at,
    queue_projection: queueProjection,
    resolution_confidence_score: queueProjection.routing_contract.resolution_confidence_score,
    row_actions: buildRowActions({
      access_binding_hash: input.access_binding_hash,
      focus_anchor_ref: focusAnchor,
      inbox_route_key: input.inbox_route_key,
      inbox_version: input.inbox_version,
      item,
      visibility_cache_partition_key: input.visibility_cache_partition_key,
    }),
    sla_pressure_score: queueProjection.routing_contract.sla_pressure_score,
    sort_key: sortKey,
    title: item.title,
    waiting_on_actor: item.waiting_on_actor,
  };
}

export function validateWorkInboxSnapshot(snapshot: WorkInboxSnapshot) {
  if (snapshot.artifact_type !== "WorkInboxSnapshot" || snapshot.shell_family !== "CALM_SHELL") {
    throw new WorkflowModelError("WORKFLOW_CONTRACT_INVALID", "work inbox snapshot shell drifted");
  }
  if (snapshot.visibility_partition.partition_scope !== "WORK_INBOX_SNAPSHOT") {
    throw new WorkflowModelError("WORKFLOW_CONTRACT_INVALID", "work inbox visibility scope drifted");
  }
  if (
    snapshot.visibility_partition.access_binding_hash !== snapshot.access_binding_hash ||
    snapshot.visibility_partition.masking_posture_fingerprint !== snapshot.masking_posture_fingerprint
  ) {
    throw new WorkflowModelError("WORKFLOW_CONTRACT_INVALID", "work inbox visibility partition drifted");
  }
  if (snapshot.cache_isolation_contract.cache_scope_class !== "WORK_INBOX_SNAPSHOT") {
    throw new WorkflowModelError("WORKFLOW_CONTRACT_INVALID", "work inbox cache scope drifted");
  }
  if (snapshot.queue_health_contract.queue_route_key !== snapshot.inbox_route_key) {
    throw new WorkflowModelError("WORKFLOW_CONTRACT_INVALID", "work inbox queue route drifted");
  }
  if (snapshot.queue_health_contract.queue_health_score !== snapshot.queue_health_score) {
    throw new WorkflowModelError("WORKFLOW_CONTRACT_INVALID", "work inbox queue health score drifted");
  }
  validateWorkQueueHealthContract(snapshot.queue_health_contract);
  if (snapshot.interaction_layer.recovery_notice_surface !== "CONTEXT_BAR") {
    throw new WorkflowModelError("WORKFLOW_CONTRACT_INVALID", "work inbox recovery notice surface drifted");
  }
  if (snapshot.interaction_layer.notification_surface !== "CONTEXT_BAR") {
    throw new WorkflowModelError("WORKFLOW_CONTRACT_INVALID", "work inbox notification surface drifted");
  }
  if (snapshot.interaction_layer.artifact_preview_surface !== "DETAIL_DRAWER") {
    throw new WorkflowModelError("WORKFLOW_CONTRACT_INVALID", "work inbox artifact preview surface drifted");
  }
  const expectedChips = normalizeActiveFilters(snapshot.active_filters).selected_filter_chips;
  if (projectionHash(expectedChips) !== projectionHash(snapshot.active_filters.selected_filter_chips)) {
    throw new WorkflowModelError("WORKFLOW_CONTRACT_INVALID", "work inbox filter chips drifted");
  }
  const seen = new Set<string>();
  const rowsById = new Map<string, WorkInboxRow>();
  let previousTuple: [number, number, number, number, number, string] | null = null;
  for (const row of snapshot.rows) {
    if (seen.has(row.item_id)) {
      throw new WorkflowModelError("WORKFLOW_CONTRACT_INVALID", "work inbox row ids must be unique");
    }
    seen.add(row.item_id);
    rowsById.set(row.item_id, row);
    const tuple = canonicalSortTuple(row);
    if (previousTuple !== null) {
      const comparison =
        (tuple[0] === previousTuple[0] ? 0 : tuple[0] < previousTuple[0] ? -1 : 1) ||
        (tuple[1] === previousTuple[1] ? 0 : tuple[1] < previousTuple[1] ? -1 : 1) ||
        (tuple[2] === previousTuple[2] ? 0 : tuple[2] < previousTuple[2] ? -1 : 1) ||
        (tuple[3] === previousTuple[3] ? 0 : tuple[3] < previousTuple[3] ? -1 : 1) ||
        (tuple[4] === previousTuple[4] ? 0 : tuple[4] < previousTuple[4] ? -1 : 1) ||
        tuple[5].localeCompare(previousTuple[5]);
      if (comparison < 0) {
        throw new WorkflowModelError("WORKFLOW_CONTRACT_INVALID", "work inbox rows are not canonical sorted");
      }
    }
    previousTuple = tuple;
    if (row.queue_projection.projection_scope !== "WORK_INBOX_ROW") {
      throw new WorkflowModelError("WORKFLOW_CONTRACT_INVALID", "work inbox row queue scope drifted");
    }
    if (row.queue_projection.routing_contract.routing_scope !== "WORK_INBOX_ROW") {
      throw new WorkflowModelError("WORKFLOW_CONTRACT_INVALID", "work inbox row routing scope drifted");
    }
    if (
      row.queue_projection.routing_contract.queue_health_score !== snapshot.queue_health_contract.queue_health_score ||
      row.queue_projection.routing_contract.queue_pressure_score !== snapshot.queue_health_contract.queue_pressure_score ||
      row.queue_projection.routing_contract.queue_health_floor !== snapshot.queue_health_contract.queue_health_floor ||
      row.queue_projection.routing_contract.queue_health_state !== snapshot.queue_health_contract.queue_health_state
    ) {
      throw new WorkflowModelError("WORKFLOW_CONTRACT_INVALID", "work inbox row queue health mirror drifted");
    }
    if (row.queue_projection.customer_unread_count !== row.customer_unread_count) {
      throw new WorkflowModelError("WORKFLOW_CONTRACT_INVALID", "work inbox customer unread drifted");
    }
    if (row.queue_projection.internal_unread_count_or_null !== row.internal_unread_count) {
      throw new WorkflowModelError("WORKFLOW_CONTRACT_INVALID", "work inbox internal unread drifted");
    }
    if (row.queue_projection.filter_membership_state === "OUT_OF_FILTER_SET") {
      throw new WorkflowModelError("WORKFLOW_CONTRACT_INVALID", "work inbox snapshot mounted an out-of-filter row");
    }
    if (row.sort_key.collaboration_priority_score !== row.collaboration_priority_score) {
      throw new WorkflowModelError("WORKFLOW_CONTRACT_INVALID", "work inbox row priority sort drifted");
    }
    if (row.sort_key.escalation_rank !== row.escalation_rank) {
      throw new WorkflowModelError("WORKFLOW_CONTRACT_INVALID", "work inbox row escalation sort drifted");
    }
    if (row.sort_key.effective_due_at !== row.effective_due_at) {
      throw new WorkflowModelError("WORKFLOW_CONTRACT_INVALID", "work inbox row due sort drifted");
    }
    if (row.sort_key.resolution_confidence_score !== row.resolution_confidence_score) {
      throw new WorkflowModelError("WORKFLOW_CONTRACT_INVALID", "work inbox row confidence sort drifted");
    }
    if (row.sort_key.queue_entered_at !== row.queue_entered_at || row.sort_key.item_id !== row.item_id) {
      throw new WorkflowModelError("WORKFLOW_CONTRACT_INVALID", "work inbox row queue-entry sort drifted");
    }
    if (row.row_actions.authoritative_action.primary_action_code_or_null !== row.row_actions.primary_action_code) {
      throw new WorkflowModelError("WORKFLOW_CONTRACT_INVALID", "work inbox row action authority drifted");
    }
    const available = new Set(row.row_actions.available_action_codes);
    const blocked = new Set(row.row_actions.blocked_action_codes);
    if (row.row_actions.primary_action_code !== null && !available.has(row.row_actions.primary_action_code)) {
      throw new WorkflowModelError("WORKFLOW_CONTRACT_INVALID", "work inbox primary action must be available");
    }
    if (row.row_actions.primary_action_code !== null && blocked.has(row.row_actions.primary_action_code)) {
      throw new WorkflowModelError("WORKFLOW_CONTRACT_INVALID", "work inbox primary action must not be blocked");
    }
    const bindingCodes = new Set(row.row_actions.available_action_bindings.map((binding) => binding.action_code));
    for (const actionCode of row.row_actions.available_action_codes) {
      if (mutationPreconditionBinding(actionCode) !== null && !bindingCodes.has(actionCode)) {
        throw new WorkflowModelError("WORKFLOW_CONTRACT_INVALID", "work inbox mutation action lacks precondition binding");
      }
    }
  }
  if (snapshot.selected_item_ref === null) {
    if (snapshot.selected_focus_anchor_ref_or_null !== null) {
      throw new WorkflowModelError("WORKFLOW_CONTRACT_INVALID", "work inbox selected focus must clear");
    }
  } else {
    const selectedRow = rowsById.get(snapshot.selected_item_ref);
    if (selectedRow === undefined || selectedRow.focus_anchor_ref !== snapshot.selected_focus_anchor_ref_or_null) {
      throw new WorkflowModelError("WORKFLOW_CONTRACT_INVALID", "work inbox selected row focus drifted");
    }
  }
}

export function workInboxSnapshotRef(snapshot: WorkInboxSnapshot) {
  return `work-inbox-snapshot://${projectionHash({
    access_binding_hash: snapshot.access_binding_hash,
    inbox_route_key: snapshot.inbox_route_key,
    inbox_version: snapshot.inbox_version,
    masking_posture_fingerprint: snapshot.masking_posture_fingerprint,
    tenant_id: snapshot.tenant_id,
  })}`;
}

export function workInboxSnapshotContentFingerprint(snapshot: WorkInboxSnapshot) {
  validateWorkInboxSnapshot(snapshot);
  return projectionHash(snapshot);
}

export function buildWorkInboxSnapshot(input: BuildWorkInboxSnapshotInput): WorkInboxSnapshot {
  const tenantId = requireProjectorString("tenant_id", input.tenant_id);
  const inboxRouteKey = requireProjectorString("inbox_route_key", input.inbox_route_key ?? "/work/inbox");
  const accessBindingHash = requireProjectorString("access_binding_hash", input.access_binding_hash);
  const maskingPostureFingerprint = requireProjectorString(
    "masking_posture_fingerprint",
    input.masking_posture_fingerprint,
  );
  const inboxVersion = assertNonNegativeInteger(
    "inbox_version",
    input.inbox_version ?? Math.max(0, ...input.items.map((item) => item.staff_workspace_version)),
  );
  const lastPublishedSequence = assertNonNegativeInteger(
    "last_published_sequence",
    input.last_published_sequence ?? inboxVersion,
  );
  const activeFilters = normalizeActiveFilters(input.active_filters);
  const visibilityPartition = buildVisibilityPartitionContract({
    access_binding_hash: accessBindingHash,
    allowed_visibility_classes: ["CUSTOMER_VISIBLE", "INTERNAL_ONLY"],
    audience_class: "STAFF",
    badge_counter_policy: "SPLIT_LANE_COUNTS",
    cache_partition_key: input.cache_partition_key,
    masking_posture_fingerprint: maskingPostureFingerprint,
    ordering_side_channel_policy: "CANONICAL_LIST_ONLY",
    partition_scope: "WORK_INBOX_SNAPSHOT",
    subject_ref: inboxRouteKey,
  });
  const viewerPrincipalRef = input.viewer_principal_ref ?? null;
  const rawCandidateRows = input.items
    .map((item) => normalizeWorkflowItem(item))
    .filter((item) => item.tenant_id === tenantId)
    .map((item) =>
      buildRow({
        access_binding_hash: accessBindingHash,
        inbox_route_key: inboxRouteKey,
        inbox_version: inboxVersion,
        item,
        notifications: input.notifications ?? [],
        visibility_cache_partition_key: visibilityPartition.cache_partition_key,
      }),
    )
    .filter((row) => {
      const item = input.items.find((candidate) => candidate.item_id === row.item_id);
      if (item === undefined) {
        return false;
      }
      return rowMatchesFilters({
        filters: activeFilters,
        item: normalizeWorkflowItem(item),
        row,
        viewer_principal_ref: viewerPrincipalRef,
      });
    })
    .sort(sortRows);
  const queueHealthContract =
    input.queue_health_contract === undefined
      ? buildWorkQueueHealthContract({
          queue_route_key: inboxRouteKey,
          reason_codes: [
            ...new Set(
              rawCandidateRows.flatMap((row) => row.queue_projection.routing_contract.ordering_reason_codes),
            ),
          ],
          routing_contracts: rawCandidateRows.map((row) => row.queue_projection.routing_contract),
        })
      : validateWorkQueueHealthContract(input.queue_health_contract);
  if (queueHealthContract.queue_route_key !== inboxRouteKey) {
    throw new WorkflowModelError("WORKFLOW_CONTRACT_INVALID", "work inbox queue health route drifted");
  }
  const candidateRows = rawCandidateRows
    .map((row) =>
      mirrorQueueHealthIntoRow({
        contract: queueHealthContract,
        row,
      }),
    )
    .sort(sortRows);
  const selection = deriveWorkInboxSelectionState({
    requested_selected_item_ref: input.selected_item_ref,
    rows: candidateRows,
  });
  const resumeToken = `work-inbox-resume://${projectionHash({
    access_binding_hash: accessBindingHash,
    active_filters: activeFilters,
    inbox_route_key: inboxRouteKey,
    inbox_version: inboxVersion,
    masking_posture_fingerprint: maskingPostureFingerprint,
    row_basis_hashes: candidateRows.map((row) => row.queue_projection.basis_hash),
    tenant_id: tenantId,
  })}`;
  const snapshot: WorkInboxSnapshot = {
    access_binding_hash: accessBindingHash,
    active_filters: activeFilters,
    artifact_type: "WorkInboxSnapshot",
    cache_isolation_contract: buildCacheIsolationContract({
      access_binding_hash: accessBindingHash,
      cache_partition_ref: visibilityPartition.cache_partition_key,
      cache_scope_class: "WORK_INBOX_SNAPSHOT",
      canonical_object_ref: inboxRouteKey,
      client_id_or_null: null,
      customer_safe_projection: false,
      masking_posture_fingerprint: maskingPostureFingerprint,
      principal_class: input.principal_class ?? "STAFF_OPERATOR",
      projection_version_ref: String(inboxVersion),
      route_identity_ref: inboxRouteKey,
      session_binding_hash: input.session_binding_hash ?? "session-binding://staff/inbox",
      shell_family: "CALM_SHELL",
      shell_stability_ref_or_null: null,
      tenant_id: tenantId,
      visibility_cache_partition_key_or_null: visibilityPartition.cache_partition_key,
    }),
    dominant_question:
      candidateRows.length === 0
        ? "What work needs attention?"
        : `What needs attention across ${candidateRows.length} work item${candidateRows.length === 1 ? "" : "s"}?`,
    inbox_route_key: inboxRouteKey,
    inbox_version: inboxVersion,
    interaction_layer: buildCalmInteractionLayer(),
    last_published_sequence: lastPublishedSequence,
    masking_posture_fingerprint: maskingPostureFingerprint,
    queue_health_contract: queueHealthContract,
    queue_health_score: queueHealthContract.queue_health_score,
    recovery_posture: input.recovery_posture ?? "NONE",
    resume_token: resumeToken,
    rows: cloneWorkflowRecord(candidateRows),
    selected_focus_anchor_ref_or_null: selection.selected_focus_anchor_ref_or_null,
    selected_item_ref: selection.selected_item_ref,
    settlement_state: input.settlement_state ?? "STEADY",
    shell_family: "CALM_SHELL",
    tenant_id: tenantId,
    viewer_mode: input.viewer_mode ?? "STAFF_MUTATING",
    visibility_partition: visibilityPartition,
  };
  validateWorkInboxSnapshot(snapshot);
  return snapshot;
}
