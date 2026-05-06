import type { CollaborationAttachment } from "../models/collaboration_attachment.ts";
import type { CollaborationThread } from "../models/collaboration_thread.ts";
import type { RequestInfoRecord } from "../models/request_info_record.ts";
import type { WorkItemParticipant } from "../models/work_item_participant.ts";
import type { WorkItemNotification } from "../models/work_item_notification.ts";
import {
  cloneWorkflowRecord,
  normalizeWorkflowItem,
  type WorkflowItem,
  WorkflowModelError,
} from "../models/workflow_item.ts";
import {
  defaultWorkspaceFocusAnchor,
  deriveWorkspaceRouteContext,
  type WorkspaceEntrySurface,
  type WorkspaceRouteContext,
} from "./derive_workspace_route_context.ts";
import { buildWorkspaceCrossDeviceContinuity } from "./build_workspace_cross_device_continuity.ts";
import { buildWorkspaceSemanticAccessibilityContract } from "./build_workspace_semantic_accessibility_contract.ts";
import { assertCustomerSafeProjectionAlignment } from "../services/assert_customer_safe_projection_alignment.ts";
import { stampWorkspaceContinuityMetadata } from "../services/stamp_workspace_continuity_metadata.ts";
import {
  assertCustomerSafeCopy,
  buildActionAuthorityContract,
  buildArtifactAffordanceContract,
  buildArtifactSelectionContract,
  buildCacheIsolationContract,
  buildCalmInteractionLayer,
  buildCustomerSafeProjectionContract,
  buildPortalLanguageContract,
  buildQueueProjectionContract,
  buildRouteStabilityContract,
  buildShellDominanceContract,
  buildShellStateTaxonomyContract,
  buildStreamRecoveryContract,
  buildVisibilityPartitionContract,
  customerDueStateForItem,
  customerStatusLabel,
  customerStatusProjectionText,
  customerVisibleParticipants,
  dueLabelForItem,
  latestWorkspaceSnapshotRef,
  normalizeProjectorTimestamp,
  participantUnread,
  projectionHash,
  requireProjectorString,
  statusCodeForItem,
  truncateCustomerCopy,
  workspaceDueStateForItem,
  WORKSPACE_CUSTOMER_MODULE_ORDER,
  WORKSPACE_STAFF_MODULE_ORDER,
  WORKSPACE_SURFACE_ORDER,
  type ActionAuthorityContract,
  type CacheIsolationContract,
  type CollaborationQueueProjectionContract,
  type CrossDeviceContinuityContract,
  type CustomerSafeProjectionContract,
  type SemanticAccessibilityContract,
  type VisibilityPartitionContract,
  type WorkspaceActionabilityState,
  type WorkspaceModuleCode,
  type WorkspaceRecoveryPosture,
  type WorkspaceSettlementState,
  type WorkspaceShellFamily,
  type WorkspaceViewerScope,
} from "./projection_contract_helpers.ts";

export type WorkspaceSnapshotModuleState = {
  content_state: "POPULATED" | "NOT_REQUESTED" | "NOT_YET_MATERIALIZED" | "LIMITED" | "NOT_APPLICABLE";
  current_shared_file_refs: string[];
  file_segments: ("SHARED_WITH_CUSTOMER" | "INTERNAL_ONLY")[];
  historical_shared_file_refs: string[];
  internal_only_file_refs: string[];
  limitation_reason_codes: string[];
  module_badge_count: number;
  module_code: WorkspaceModuleCode;
  new_activity_marker_ref_or_null: string | null;
  placeholder_refs: string[];
  state_reason_code_or_null: "REQUEST_NOT_TRIGGERED" | "MATERIALIZATION_PENDING" | "NOT_APPLICABLE_TO_CONTEXT" | null;
  visibility_partition: "CUSTOMER_VISIBLE_ONLY" | "INTERNAL_ONLY_ONLY" | "SEGMENTED_BY_VISIBILITY";
};

export type WorkspaceSnapshotPermissions = {
  can_add_internal_note: boolean;
  can_assign: boolean;
  can_change_status: boolean;
  can_escalate: boolean;
  can_publish_request_info: boolean;
  can_reply_customer_visible: boolean;
  can_view_audit_trail: boolean;
};

export type WorkspaceSnapshot = {
  access_binding_hash: string;
  action_strip: {
    actionability_state: WorkspaceActionabilityState;
    authoritative_action: ActionAuthorityContract;
    available_action_codes: string[];
    blocked_action_codes: string[];
    blocking_reason: string | null;
    machine_reason_codes: string[];
    ownership_label: string | null;
    ownership_posture: "SELF" | "CUSTOMER_WAIT" | "STAFF_WAIT" | "AUTHORITY_WAIT" | "SYSTEM_WAIT" | "NONE";
    primary_action_code: string | null;
    secondary_action_codes: string[];
    suggested_module_code: WorkspaceModuleCode | null;
    waiting_on_label: string | null;
  };
  active_request_info_ref_or_null: string | null;
  artifact_type: "WorkspaceSnapshot";
  cache_isolation_contract: CacheIsolationContract;
  context_bar: {
    assignee_label: string | null;
    client_label: string;
    customer_status_projection: string;
    due_state: "ON_TRACK" | "DUE_SOON" | "OVERDUE" | "BREACHED";
    escalation_active: boolean | null;
    freshness_notice_ref_or_null: string | null;
    freshness_state: "FRESH" | "RECONNECTING" | "CATCHING_UP" | "STALE" | "DEGRADED";
    internal_lifecycle_state: WorkflowItem["lifecycle_state"] | null;
    item_id: string;
    period_label: string;
    recovery_notice_ref_or_null: string | null;
    title: string;
    waiting_on_actor: WorkflowItem["waiting_on_actor"];
  };
  cross_device_continuity_contract: CrossDeviceContinuityContract;
  customer_head_sequence: number;
  customer_request_workspace: {
    action_order: ["REPLY", "UPLOAD_FILE", "RESPOND_TO_REQUEST_INFO"];
    artifact_affordance: ReturnType<typeof buildArtifactAffordanceContract>;
    artifact_history_state: "NO_SHARED_FILES" | "CURRENT_ONLY" | "CURRENT_PLUS_HISTORY" | "HISTORY_ONLY" | "LIMITED";
    artifact_selection: ReturnType<typeof buildArtifactSelectionContract>;
    authoritative_action: ActionAuthorityContract;
    current_artifact_ref_or_null: string | null;
    due_label_ref_or_null: string | null;
    historical_artifact_refs: string[];
    language_contract: ReturnType<typeof buildPortalLanguageContract>;
    no_safe_action_reason_ref_or_null: string | null;
    primary_action_label_ref_or_null: string | null;
    status_code: "ACTION_REQUIRED" | "IN_REVIEW" | "WAITING_ON_US" | "WAITING_ON_AUTHORITY" | "COMPLETED";
    status_label_ref: string;
    surface_order: ["CONTEXT_BAR", "DECISION_SUMMARY", "ACTION_STRIP", "DETAIL_DRAWER"];
    visible_action_codes: ("REPLY" | "UPLOAD_FILE" | "RESPOND_TO_REQUEST_INFO")[];
  } | null;
  customer_safe_projection: CustomerSafeProjectionContract | null;
  decision_summary: {
    customer_state_differs: boolean | null;
    customer_state_summary_ref: string | null;
    due_summary_ref: string;
    next_actor: WorkflowItem["waiting_on_actor"];
    next_actor_summary_ref: string;
    reason_codes: string[];
    summary_ref: string;
  };
  detail_drawer: {
    composer_layer: {
      attachment_picker: {
        inherited_visibility_class_or_null: "INTERNAL_ONLY" | "CUSTOMER_VISIBLE" | null;
        picker_state: "EMPTY" | "STAGED" | "READY" | "LIMITED";
        staged_upload_refs: string[];
        visibility_confirmation_required: boolean;
        visibility_confirmed: boolean;
      };
      available_append_command_codes: ("ADD_INTERNAL_NOTE" | "ADD_CUSTOMER_COMMENT" | "REQUEST_CUSTOMER_INFO" | "RESPOND_TO_REQUEST_INFO")[];
      composer_visibility_class_or_null: "INTERNAL_ONLY" | "CUSTOMER_VISIBLE" | null;
      default_append_command_code_or_null: "ADD_INTERNAL_NOTE" | "ADD_CUSTOMER_COMMENT" | "REQUEST_CUSTOMER_INFO" | "RESPOND_TO_REQUEST_INFO" | null;
      draft_last_saved_at_or_null: string | null;
      draft_ref_or_null: string | null;
      draft_state: "NONE" | "ACTIVE" | "REBASED" | "STALE_REVIEW_REQUIRED";
      publish_block_reason_codes: string[];
      publish_confirmation: {
        confirmation_message_ref_or_null: string | null;
        confirmation_state: "NOT_REQUIRED" | "REQUIRED" | "CONFIRMED" | "RECEIPT_PENDING" | "BLOCKED_BY_REBASE";
        publish_action_code_or_null: "ADD_INTERNAL_NOTE" | "ADD_CUSTOMER_COMMENT" | "REQUEST_CUSTOMER_INFO" | "RESPOND_TO_REQUEST_INFO" | null;
      };
      rebase_target_snapshot_ref_or_null: string | null;
      selected_append_command_code_or_null: "ADD_INTERNAL_NOTE" | "ADD_CUSTOMER_COMMENT" | "REQUEST_CUSTOMER_INFO" | "RESPOND_TO_REQUEST_INFO" | null;
      surface_order: ["COMPOSER_SWITCHER", "DRAFT_EDITOR", "ATTACHMENT_PICKER", "PUBLISH_CONFIRMATION"];
      target_request_info_ref_or_null: string | null;
      visibility_label_ref_or_null: string | null;
    };
    expanded_module_code: WorkspaceModuleCode | null;
    fallback_reason_code: string | null;
    focus_anchor_ref: string | null;
    modules: WorkspaceSnapshotModuleState[];
    promoted_module_code: WorkspaceModuleCode | null;
  };
  dominance_contract: ReturnType<typeof buildShellDominanceContract>;
  dominant_question: string;
  experience_profile: "LOW_NOISE";
  frame_epoch: number;
  interaction_layer: ReturnType<typeof buildCalmInteractionLayer>;
  internal_head_sequence_or_null: number | null;
  item_id: string;
  last_published_sequence: number;
  masking_posture_fingerprint: string;
  object_anchor_ref: string;
  participants: WorkItemParticipant[];
  permissions: WorkspaceSnapshotPermissions;
  queue_projection: CollaborationQueueProjectionContract;
  recovery_posture: WorkspaceRecoveryPosture;
  request_state_version_or_null: number | null;
  resume_token: string;
  route_context: WorkspaceRouteContext;
  semantic_accessibility_contract: SemanticAccessibilityContract;
  settlement_state: WorkspaceSettlementState;
  shell_family: WorkspaceShellFamily;
  shell_stability_token: string;
  stability_contract: ReturnType<typeof buildRouteStabilityContract>;
  state_taxonomy_contract: ReturnType<typeof buildShellStateTaxonomyContract>;
  stream_recovery_contract: ReturnType<typeof buildStreamRecoveryContract>;
  surface_order: ["CONTEXT_BAR", "DECISION_SUMMARY", "ACTION_STRIP", "DETAIL_DRAWER"];
  tenant_id: string;
  viewer_scope: WorkspaceViewerScope;
  visibility_partition: VisibilityPartitionContract;
  workspace_route_key: string;
  workspace_version: number;
};

export type BuildWorkspaceSnapshotInput = {
  access_binding_hash: string;
  active_module_code?: WorkspaceModuleCode | undefined;
  attachments?: readonly CollaborationAttachment[] | undefined;
  cache_partition_key?: string | undefined;
  customer_thread?: CollaborationThread | null | undefined;
  customer_unread_count?: number | undefined;
  entry_surface?: WorkspaceEntrySurface | undefined;
  frame_epoch?: number | undefined;
  internal_thread?: CollaborationThread | null | undefined;
  internal_unread_count?: number | undefined;
  item: WorkflowItem;
  masking_posture_fingerprint: string;
  notifications?: readonly WorkItemNotification[] | undefined;
  participants?: readonly WorkItemParticipant[] | undefined;
  principal_class?: string | undefined;
  request_info_record?: RequestInfoRecord | null | undefined;
  return_focus_anchor_ref?: string | undefined;
  return_route_ref?: string | undefined;
  session_binding_hash?: string | undefined;
  session_ref?: string | undefined;
  viewer_scope: WorkspaceViewerScope;
};

type ActionPosture = {
  actionability_state: WorkspaceActionabilityState;
  available_action_codes: string[];
  blocked_action_codes: string[];
  blocking_reason_code_or_null: string | null;
  blocking_reason_text: string | null;
  machine_reason_codes: string[];
  ownership_label: string | null;
  ownership_posture: WorkspaceSnapshot["action_strip"]["ownership_posture"];
  primary_action_code_or_null: string | null;
  primary_action_label_ref_or_null: string | null;
  secondary_action_codes: string[];
  suggested_module_code_or_null: WorkspaceModuleCode | null;
  visible_customer_action_codes: ("REPLY" | "UPLOAD_FILE" | "RESPOND_TO_REQUEST_INFO")[];
  waiting_on_label: string | null;
};

function ensureThread(input: {
  item: WorkflowItem;
  thread: CollaborationThread | null | undefined;
  visibility_class: "CUSTOMER_VISIBLE" | "INTERNAL_ONLY";
}) {
  if (input.thread === null || input.thread === undefined) {
    if (input.visibility_class === "CUSTOMER_VISIBLE") {
      return null;
    }
    throw new WorkflowModelError("WORKFLOW_CONTRACT_INVALID", "internal collaboration thread is required");
  }
  if (input.thread.item_id !== input.item.item_id || input.thread.visibility_class !== input.visibility_class) {
    throw new WorkflowModelError(
      "WORKFLOW_CONTRACT_INVALID",
      `${input.visibility_class} thread must belong to the projected item`,
    );
  }
  return input.thread;
}

function customerSafeTitle(item: WorkflowItem) {
  const title = truncateCustomerCopy(item.title, 72);
  try {
    assertCustomerSafeCopy("request title", title);
    return title;
  } catch (_error) {
    return `Request for ${item.period}`;
  }
}

function artifactState(input: {
  current_artifact_ref_or_null: string | null;
  historical_artifact_refs: readonly string[];
}) {
  if (input.current_artifact_ref_or_null === null && input.historical_artifact_refs.length === 0) {
    return "NO_SHARED_FILES" as const;
  }
  if (input.current_artifact_ref_or_null !== null && input.historical_artifact_refs.length === 0) {
    return "CURRENT_ONLY" as const;
  }
  if (input.current_artifact_ref_or_null !== null && input.historical_artifact_refs.length > 0) {
    return "CURRENT_PLUS_HISTORY" as const;
  }
  return "HISTORY_ONLY" as const;
}

function attachmentRefs(input: {
  attachments: readonly CollaborationAttachment[];
  viewer_scope: WorkspaceViewerScope;
}) {
  const available = input.attachments
    .filter((attachment) => attachment.publication_state === "AVAILABLE")
    .sort((left, right) => right.published_at.localeCompare(left.published_at));
  const shared = available.filter((attachment) => attachment.visibility_class === "CUSTOMER_VISIBLE");
  const internal = input.viewer_scope === "STAFF_FULL"
    ? available.filter((attachment) => attachment.visibility_class === "INTERNAL_ONLY")
    : [];
  const currentShared = shared[0]?.attachment_id ?? null;
  const historicalShared = shared.slice(currentShared === null ? 0 : 1).map((attachment) => attachment.attachment_id);
  return {
    current_shared_file_refs: currentShared === null ? [] : [currentShared],
    historical_shared_file_refs: historicalShared,
    internal_only_file_refs: internal.map((attachment) => attachment.attachment_id),
  };
}

function deriveActionPosture(input: {
  item: WorkflowItem;
  request_info_record: RequestInfoRecord | null;
  route_context: WorkspaceRouteContext;
  viewer_scope: WorkspaceViewerScope;
}): ActionPosture {
  const hasOpenRequest = input.request_info_record?.lifecycle_state === "OPEN";
  if (input.viewer_scope === "CUSTOMER_VISIBLE") {
    if (input.item.lifecycle_state === "DONE" || input.item.lifecycle_state === "CANCELLED") {
      return {
        actionability_state: "NO_SAFE_ACTION",
        available_action_codes: [],
        blocked_action_codes: ["REPLY", "UPLOAD_FILE", "RESPOND_TO_REQUEST_INFO"],
        blocking_reason_code_or_null: "COMPLETED",
        blocking_reason_text: "This request is complete.",
        machine_reason_codes: ["COMPLETED"],
        ownership_label: "Complete",
        ownership_posture: "NONE",
        primary_action_code_or_null: null,
        primary_action_label_ref_or_null: null,
        secondary_action_codes: [],
        suggested_module_code_or_null: "CUSTOMER_ACTIVITY",
        visible_customer_action_codes: [],
        waiting_on_label: null,
      };
    }
    if (input.item.waiting_on_actor === "CUSTOMER" || hasOpenRequest) {
      return {
        actionability_state: "ACTION_AVAILABLE",
        available_action_codes: ["RESPOND_TO_REQUEST_INFO"],
        blocked_action_codes: [],
        blocking_reason_code_or_null: null,
        blocking_reason_text: null,
        machine_reason_codes: ["CUSTOMER_ACTION_READY"],
        ownership_label: "You",
        ownership_posture: "SELF",
        primary_action_code_or_null: "RESPOND_TO_REQUEST_INFO",
        primary_action_label_ref_or_null: "Reply",
        secondary_action_codes: [],
        suggested_module_code_or_null: null,
        visible_customer_action_codes: ["RESPOND_TO_REQUEST_INFO"],
        waiting_on_label: null,
      };
    }
    const authorityWait = input.item.waiting_on_actor === "AUTHORITY";
    return {
      actionability_state: "NO_SAFE_ACTION",
      available_action_codes: [],
      blocked_action_codes: ["REPLY", "UPLOAD_FILE", "RESPOND_TO_REQUEST_INFO"],
      blocking_reason_code_or_null: authorityWait ? "WAITING_ON_AUTHORITY" : "WAITING_ON_US",
      blocking_reason_text: authorityWait
        ? "We are waiting for confirmation."
        : "We are reviewing this request.",
      machine_reason_codes: [authorityWait ? "WAITING_ON_AUTHORITY" : "WAITING_ON_US"],
      ownership_label: authorityWait ? "Confirmation pending" : "With us",
      ownership_posture: authorityWait ? "AUTHORITY_WAIT" : "STAFF_WAIT",
      primary_action_code_or_null: null,
      primary_action_label_ref_or_null: null,
      secondary_action_codes: [],
      suggested_module_code_or_null: "CUSTOMER_ACTIVITY",
      visible_customer_action_codes: [],
      waiting_on_label: authorityWait ? "Waiting for confirmation" : "We are reviewing",
    };
  }

  if (input.item.waiting_on_actor === "CUSTOMER" || input.item.waiting_on_actor === "AUTHORITY") {
    const isAuthority = input.item.waiting_on_actor === "AUTHORITY";
    return {
      actionability_state: "NO_SAFE_ACTION",
      available_action_codes: [],
      blocked_action_codes: ["ADD_INTERNAL_NOTE", "REQUEST_CUSTOMER_INFO"],
      blocking_reason_code_or_null: isAuthority ? "WAITING_ON_AUTHORITY" : "WAITING_ON_CUSTOMER",
      blocking_reason_text: isAuthority
        ? "Waiting for authority response before staff action."
        : "Waiting for customer response.",
      machine_reason_codes: [isAuthority ? "WAITING_ON_AUTHORITY" : "WAITING_ON_CUSTOMER"],
      ownership_label: isAuthority ? "Authority" : "Customer",
      ownership_posture: isAuthority ? "AUTHORITY_WAIT" : "CUSTOMER_WAIT",
      primary_action_code_or_null: null,
      primary_action_label_ref_or_null: null,
      secondary_action_codes: [],
      suggested_module_code_or_null: "CUSTOMER_ACTIVITY",
      visible_customer_action_codes: [],
      waiting_on_label: isAuthority ? "Waiting on authority" : "Waiting on customer",
    };
  }

  return {
    actionability_state: "ACTION_AVAILABLE",
    available_action_codes: ["ADD_INTERNAL_NOTE", "ADD_CUSTOMER_COMMENT", "REQUEST_CUSTOMER_INFO"],
    blocked_action_codes: [],
    blocking_reason_code_or_null: null,
    blocking_reason_text: null,
    machine_reason_codes: ["STAFF_ACTION_READY"],
    ownership_label: input.item.current_assignee_ref === null ? null : "Assigned",
    ownership_posture: input.item.current_assignee_ref === null ? "NONE" : "SELF",
    primary_action_code_or_null: "ADD_INTERNAL_NOTE",
    primary_action_label_ref_or_null: null,
    secondary_action_codes: ["ADD_CUSTOMER_COMMENT", "REQUEST_CUSTOMER_INFO"],
    suggested_module_code_or_null: null,
    visible_customer_action_codes: [],
    waiting_on_label: null,
  };
}

function permissionsForViewer(viewerScope: WorkspaceViewerScope): WorkspaceSnapshotPermissions {
  if (viewerScope === "CUSTOMER_VISIBLE") {
    return {
      can_add_internal_note: false,
      can_assign: false,
      can_change_status: false,
      can_escalate: false,
      can_publish_request_info: false,
      can_reply_customer_visible: true,
      can_view_audit_trail: false,
    };
  }
  return {
    can_add_internal_note: true,
    can_assign: true,
    can_change_status: true,
    can_escalate: true,
    can_publish_request_info: true,
    can_reply_customer_visible: true,
    can_view_audit_trail: true,
  };
}

function buildComposerLayer(input: {
  active_request_info_ref_or_null: string | null;
  action_posture: ActionPosture;
  viewer_scope: WorkspaceViewerScope;
}): WorkspaceSnapshot["detail_drawer"]["composer_layer"] {
  if (input.viewer_scope === "CUSTOMER_VISIBLE") {
    return {
      attachment_picker: {
        inherited_visibility_class_or_null: null,
        picker_state: "EMPTY",
        staged_upload_refs: [],
        visibility_confirmation_required: false,
        visibility_confirmed: false,
      },
      available_append_command_codes: [],
      composer_visibility_class_or_null: null,
      default_append_command_code_or_null: null,
      draft_last_saved_at_or_null: null,
      draft_ref_or_null: null,
      draft_state: "NONE",
      publish_block_reason_codes: [],
      publish_confirmation: {
        confirmation_message_ref_or_null: null,
        confirmation_state: "NOT_REQUIRED",
        publish_action_code_or_null: null,
      },
      rebase_target_snapshot_ref_or_null: null,
      selected_append_command_code_or_null: null,
      surface_order: ["COMPOSER_SWITCHER", "DRAFT_EDITOR", "ATTACHMENT_PICKER", "PUBLISH_CONFIRMATION"],
      target_request_info_ref_or_null: null,
      visibility_label_ref_or_null: null,
    };
  }

  return {
    attachment_picker: {
      inherited_visibility_class_or_null: null,
      picker_state: "EMPTY",
      staged_upload_refs: [],
      visibility_confirmation_required: false,
      visibility_confirmed: false,
    },
    available_append_command_codes:
      input.action_posture.actionability_state === "ACTION_AVAILABLE"
        ? ["ADD_INTERNAL_NOTE", "ADD_CUSTOMER_COMMENT", "REQUEST_CUSTOMER_INFO"]
        : [],
    composer_visibility_class_or_null:
      input.action_posture.actionability_state === "ACTION_AVAILABLE" ? "INTERNAL_ONLY" : null,
    default_append_command_code_or_null:
      input.action_posture.actionability_state === "ACTION_AVAILABLE" ? "ADD_INTERNAL_NOTE" : null,
    draft_last_saved_at_or_null: null,
    draft_ref_or_null: null,
    draft_state: "NONE",
    publish_block_reason_codes: [],
    publish_confirmation: {
      confirmation_message_ref_or_null: null,
      confirmation_state: "NOT_REQUIRED",
      publish_action_code_or_null:
        input.action_posture.actionability_state === "ACTION_AVAILABLE" ? "ADD_INTERNAL_NOTE" : null,
    },
    rebase_target_snapshot_ref_or_null: null,
    selected_append_command_code_or_null:
      input.action_posture.actionability_state === "ACTION_AVAILABLE" ? "ADD_INTERNAL_NOTE" : null,
    surface_order: ["COMPOSER_SWITCHER", "DRAFT_EDITOR", "ATTACHMENT_PICKER", "PUBLISH_CONFIRMATION"],
    target_request_info_ref_or_null: null,
    visibility_label_ref_or_null:
      input.action_posture.actionability_state === "ACTION_AVAILABLE" ? "Internal note" : null,
  };
}

function moduleState(input: {
  badge_count: number;
  current_shared_file_refs?: readonly string[] | undefined;
  historical_shared_file_refs?: readonly string[] | undefined;
  internal_only_file_refs?: readonly string[] | undefined;
  module_code: WorkspaceModuleCode;
  viewer_scope: WorkspaceViewerScope;
}): WorkspaceSnapshotModuleState {
  const isFiles = input.module_code === "FILES";
  const visibilityPartition =
    input.module_code === "FILES"
      ? input.viewer_scope === "CUSTOMER_VISIBLE"
        ? "CUSTOMER_VISIBLE_ONLY"
        : "SEGMENTED_BY_VISIBILITY"
      : input.module_code === "CUSTOMER_ACTIVITY"
        ? "CUSTOMER_VISIBLE_ONLY"
        : "INTERNAL_ONLY_ONLY";
  const fileSegments =
    input.module_code === "FILES"
      ? input.viewer_scope === "CUSTOMER_VISIBLE"
        ? ["SHARED_WITH_CUSTOMER"] as const
        : ["SHARED_WITH_CUSTOMER", "INTERNAL_ONLY"] as const
      : [];
  return {
    content_state: "POPULATED",
    current_shared_file_refs: isFiles ? [...(input.current_shared_file_refs ?? [])] : [],
    file_segments: [...fileSegments],
    historical_shared_file_refs: isFiles ? [...(input.historical_shared_file_refs ?? [])] : [],
    internal_only_file_refs: isFiles && input.viewer_scope === "STAFF_FULL" ? [...(input.internal_only_file_refs ?? [])] : [],
    limitation_reason_codes: [],
    module_badge_count: input.badge_count,
    module_code: input.module_code,
    new_activity_marker_ref_or_null: null,
    placeholder_refs: [],
    state_reason_code_or_null: null,
    visibility_partition: visibilityPartition,
  };
}

export function validateWorkspaceSnapshot(snapshot: WorkspaceSnapshot) {
  if (snapshot.context_bar.item_id !== snapshot.item_id) {
    throw new WorkflowModelError("WORKFLOW_CONTRACT_INVALID", "context_bar.item_id must mirror item_id");
  }
  for (const participant of snapshot.participants) {
    if (participant.item_id !== snapshot.item_id) {
      throw new WorkflowModelError("WORKFLOW_CONTRACT_INVALID", "participants must mirror snapshot item_id");
    }
  }
  if (snapshot.route_context.active_module_code !== snapshot.detail_drawer.expanded_module_code) {
    throw new WorkflowModelError("WORKFLOW_CONTRACT_INVALID", "route_context active module must mirror detail drawer");
  }
  if (snapshot.route_context.focus_anchor_ref_or_null !== snapshot.detail_drawer.focus_anchor_ref) {
    throw new WorkflowModelError("WORKFLOW_CONTRACT_INVALID", "route_context focus must mirror detail drawer");
  }
  const mountedModules = new Set(snapshot.detail_drawer.modules.map((module) => module.module_code));
  if (snapshot.action_strip.suggested_module_code !== null && !mountedModules.has(snapshot.action_strip.suggested_module_code)) {
    throw new WorkflowModelError("WORKFLOW_CONTRACT_INVALID", "suggested module must be mounted");
  }
  if (snapshot.action_strip.authoritative_action.primary_action_code_or_null !== snapshot.action_strip.primary_action_code) {
    throw new WorkflowModelError("WORKFLOW_CONTRACT_INVALID", "action authority must mirror primary action");
  }
  if (snapshot.viewer_scope === "CUSTOMER_VISIBLE") {
    if (snapshot.shell_family !== "CLIENT_PORTAL_SHELL") {
      throw new WorkflowModelError("WORKFLOW_CONTRACT_INVALID", "customer workspace must use portal shell");
    }
    if (snapshot.internal_head_sequence_or_null !== null) {
      throw new WorkflowModelError("WORKFLOW_CONTRACT_INVALID", "customer workspace must clear internal head");
    }
    const moduleCodes = snapshot.detail_drawer.modules.map((module) => module.module_code);
    if (projectionHash(moduleCodes) !== projectionHash([...WORKSPACE_CUSTOMER_MODULE_ORDER])) {
      throw new WorkflowModelError("WORKFLOW_CONTRACT_INVALID", "customer workspace mounted modules drifted");
    }
    for (const module of snapshot.detail_drawer.modules) {
      if (module.internal_only_file_refs.length > 0) {
        throw new WorkflowModelError("WORKFLOW_CONTRACT_INVALID", "customer workspace leaked internal file refs");
      }
    }
    if (snapshot.customer_safe_projection === null || snapshot.customer_request_workspace === null) {
      throw new WorkflowModelError("WORKFLOW_CONTRACT_INVALID", "customer workspace requires safe projection and request block");
    }
    if (snapshot.queue_projection.internal_unread_count_or_null !== null) {
      throw new WorkflowModelError("WORKFLOW_CONTRACT_INVALID", "customer workspace leaked internal unread count");
    }
    const visibleSafeActions = snapshot.action_strip.available_action_codes.filter((action) =>
      ["REPLY", "UPLOAD_FILE", "RESPOND_TO_REQUEST_INFO"].includes(action),
    );
    if (projectionHash(snapshot.customer_request_workspace.visible_action_codes) !== projectionHash(visibleSafeActions)) {
      throw new WorkflowModelError("WORKFLOW_CONTRACT_INVALID", "customer request visible actions drifted from action strip");
    }
    if (
      snapshot.customer_request_workspace.authoritative_action.basis_hash !==
      snapshot.action_strip.authoritative_action.basis_hash
    ) {
      throw new WorkflowModelError("WORKFLOW_CONTRACT_INVALID", "customer request action basis must mirror action strip");
    }
    assertCustomerSafeCopy("customer status", snapshot.context_bar.customer_status_projection);
  } else {
    if (snapshot.shell_family !== "CALM_SHELL") {
      throw new WorkflowModelError("WORKFLOW_CONTRACT_INVALID", "staff workspace must use calm shell");
    }
    if (snapshot.customer_safe_projection !== null || snapshot.customer_request_workspace !== null) {
      throw new WorkflowModelError("WORKFLOW_CONTRACT_INVALID", "staff workspace must clear customer safe blocks");
    }
  }
}

export function workspaceSnapshotRef(snapshot: WorkspaceSnapshot) {
  return latestWorkspaceSnapshotRef({
    item_id: snapshot.item_id,
    shell_stability_token: snapshot.shell_stability_token,
    viewer_scope: snapshot.viewer_scope,
    workspace_route_key: snapshot.workspace_route_key,
    workspace_version: snapshot.workspace_version,
  });
}

export function workspaceSnapshotContentFingerprint(snapshot: WorkspaceSnapshot) {
  validateWorkspaceSnapshot(snapshot);
  return projectionHash(snapshot);
}

export function buildWorkspaceSnapshot(input: BuildWorkspaceSnapshotInput): WorkspaceSnapshot {
  const item = normalizeWorkflowItem(input.item);
  if (input.viewer_scope === "CUSTOMER_VISIBLE" && item.collaboration_visibility !== "CUSTOMER_SHARED") {
    throw new WorkflowModelError(
      "WORKFLOW_CONTRACT_INVALID",
      "customer-visible workspaces require a customer-shared workflow item",
    );
  }
  const internalThread = ensureThread({
    item,
    thread: input.internal_thread,
    visibility_class: "INTERNAL_ONLY",
  });
  if (internalThread === null) {
    throw new WorkflowModelError("WORKFLOW_CONTRACT_INVALID", "internal collaboration thread is required");
  }
  const customerThread = ensureThread({
    item,
    thread: input.customer_thread,
    visibility_class: "CUSTOMER_VISIBLE",
  });
  if (input.viewer_scope === "CUSTOMER_VISIBLE" && customerThread === null) {
    throw new WorkflowModelError(
      "WORKFLOW_CONTRACT_INVALID",
      "customer-visible workspaces require a customer-visible collaboration thread",
    );
  }
  const participants = [...(input.participants ?? [])];
  const visibleParticipants =
    input.viewer_scope === "CUSTOMER_VISIBLE" ? customerVisibleParticipants(participants) : participants;
  const customerHeadSequence = customerThread?.head_sequence ?? 0;
  const internalHeadSequence = input.viewer_scope === "STAFF_FULL" ? internalThread.head_sequence : null;
  const customerUnreadCount =
    input.customer_unread_count ??
    participantUnread({
      fallback_head_sequence: customerHeadSequence,
      lane: "CUSTOMER_VISIBLE",
      participants: visibleParticipants,
    });
  const internalUnreadCount =
    input.viewer_scope === "CUSTOMER_VISIBLE"
      ? undefined
      : input.internal_unread_count ??
        participantUnread({
          fallback_head_sequence: internalThread.head_sequence,
          lane: "INTERNAL_ONLY",
          participants,
        });
  const activeRequest =
    input.request_info_record?.lifecycle_state === "OPEN" ? input.request_info_record : null;
  const activeModuleCode = input.active_module_code ?? "CUSTOMER_ACTIVITY";
  const routeContext = deriveWorkspaceRouteContext({
    active_module_code: activeModuleCode,
    entry_surface: input.entry_surface,
    focus_anchor_ref_or_null: defaultWorkspaceFocusAnchor({
      active_module_code: activeModuleCode,
      item_id: item.item_id,
    }),
    item,
    return_focus_anchor_ref: input.return_focus_anchor_ref,
    return_route_ref: input.return_route_ref,
    viewer_scope: input.viewer_scope,
  });
  const actionPosture = deriveActionPosture({
    item,
    request_info_record: activeRequest,
    route_context: routeContext,
    viewer_scope: input.viewer_scope,
  });
  const shellFamily: WorkspaceShellFamily =
    input.viewer_scope === "STAFF_FULL" ? "CALM_SHELL" : "CLIENT_PORTAL_SHELL";
  const workspaceVersion =
    input.viewer_scope === "STAFF_FULL" ? item.staff_workspace_version : item.customer_workspace_version;
  const workspaceRouteKey = routeContext.active_route_ref;
  const visibilityPartition = buildVisibilityPartitionContract({
    access_binding_hash: input.access_binding_hash,
    allowed_visibility_classes:
      input.viewer_scope === "STAFF_FULL" ? ["CUSTOMER_VISIBLE", "INTERNAL_ONLY"] : ["CUSTOMER_VISIBLE"],
    audience_class: input.viewer_scope === "STAFF_FULL" ? "STAFF" : "CUSTOMER_COLLABORATION",
    badge_counter_policy: input.viewer_scope === "STAFF_FULL" ? "SPLIT_LANE_COUNTS" : "SURFACE_VISIBLE_ONLY",
    cache_partition_key: input.cache_partition_key,
    masking_posture_fingerprint: input.masking_posture_fingerprint,
    ordering_side_channel_policy:
      input.viewer_scope === "STAFF_FULL" ? "SEGMENTED_VISIBLE_EVENTS_ONLY" : "VISIBLE_EVENTS_ONLY",
    partition_scope: "WORKSPACE_SNAPSHOT",
    subject_ref: `${workspaceRouteKey}:${input.viewer_scope}`,
  });
  const customerSafeProjection =
    input.viewer_scope === "CUSTOMER_VISIBLE"
      ? buildCustomerSafeProjectionContract({
          access_binding_hash: input.access_binding_hash,
          boundary_scope: "WORKSPACE_CUSTOMER_REQUEST",
          masking_posture_fingerprint: input.masking_posture_fingerprint,
          projection_audience: "CUSTOMER_COLLABORATION",
          visibility_cache_partition_key: visibilityPartition.cache_partition_key,
        })
      : null;
  const queueProjection = buildQueueProjectionContract({
    customer_unread_count: customerUnreadCount,
    internal_unread_count_or_null: input.viewer_scope === "CUSTOMER_VISIBLE" ? null : internalUnreadCount ?? 0,
    projection_scope: "WORKSPACE_QUEUE_PROJECTION",
    routing_contract: item.routing_contract,
    viewer_scope: input.viewer_scope,
  });
  const files = attachmentRefs({
    attachments: input.attachments ?? [],
    viewer_scope: input.viewer_scope,
  });
  const modules =
    input.viewer_scope === "STAFF_FULL"
      ? WORKSPACE_STAFF_MODULE_ORDER.map((moduleCode) =>
          moduleState({
            badge_count:
              moduleCode === "CUSTOMER_ACTIVITY"
                ? queueProjection.customer_activity_module_badge_count
                : moduleCode === "INTERNAL_ACTIVITY"
                  ? queueProjection.internal_activity_module_badge_count_or_null ?? 0
                  : 0,
            current_shared_file_refs: files.current_shared_file_refs,
            historical_shared_file_refs: files.historical_shared_file_refs,
            internal_only_file_refs: files.internal_only_file_refs,
            module_code: moduleCode,
            viewer_scope: input.viewer_scope,
          }),
        )
      : WORKSPACE_CUSTOMER_MODULE_ORDER.map((moduleCode) =>
          moduleState({
            badge_count: moduleCode === "CUSTOMER_ACTIVITY" ? queueProjection.customer_activity_module_badge_count : 0,
            current_shared_file_refs: files.current_shared_file_refs,
            historical_shared_file_refs: files.historical_shared_file_refs,
            internal_only_file_refs: [],
            module_code: moduleCode,
            viewer_scope: input.viewer_scope,
          }),
        );
  const requestStatusCode = statusCodeForItem(item);
  const requestDueState = customerDueStateForItem(item);
  const customerDueLabel = dueLabelForItem({
    due_at_or_null: item.customer_due_at ?? item.due_at,
    due_state: requestDueState,
  });
  const actionBasisHash = projectionHash({
    active_request_info_ref: activeRequest?.request_info_id ?? null,
    item_id: item.item_id,
    primary_action_code: actionPosture.primary_action_code_or_null,
    request_status_code: requestStatusCode,
    viewer_scope: input.viewer_scope,
    workspace_version: workspaceVersion,
  });
  const actionAuthority = buildActionAuthorityContract({
    access_binding_hash: input.access_binding_hash,
    actionability_state: actionPosture.actionability_state,
    available_action_codes: actionPosture.available_action_codes,
    basis_hash: actionBasisHash,
    blocked_action_codes: actionPosture.blocked_action_codes,
    blocking_reason_code_or_null: actionPosture.blocking_reason_code_or_null,
    customer_safe_projection: input.viewer_scope === "CUSTOMER_VISIBLE",
    machine_reason_codes: actionPosture.machine_reason_codes,
    primary_action_code_or_null: actionPosture.primary_action_code_or_null,
    projection_route_key: workspaceRouteKey,
    projection_scope: "WORKSPACE_ACTION_STRIP",
    projection_version: workspaceVersion,
    recovery_focus_anchor_ref_or_null:
      actionPosture.actionability_state === "NO_SAFE_ACTION" ? routeContext.focus_anchor_ref_or_null : null,
    recovery_route_ref_or_null:
      actionPosture.actionability_state === "NO_SAFE_ACTION" ? routeContext.active_route_ref : null,
    secondary_action_codes: actionPosture.secondary_action_codes,
    suggested_module_code_or_null: actionPosture.suggested_module_code_or_null,
    visibility_cache_partition_key: visibilityPartition.cache_partition_key,
  });
  const promotedModule = actionPosture.suggested_module_code_or_null ?? activeModuleCode;
  const frameEpoch = input.frame_epoch ?? workspaceVersion;
  const lastPublishedSequence =
    input.viewer_scope === "CUSTOMER_VISIBLE"
      ? customerHeadSequence
      : Math.max(customerHeadSequence, internalThread.head_sequence);
  const shellStabilityToken = `workspace-shell://${projectionHash({
    item_id: item.item_id,
    route: workspaceRouteKey,
    viewer_scope: input.viewer_scope,
  })}`;
  const resumeToken = `workspace-resume://${projectionHash({
    access_binding_hash: input.access_binding_hash,
    last_published_sequence: lastPublishedSequence,
    masking_posture_fingerprint: input.masking_posture_fingerprint,
    route: workspaceRouteKey,
    shell_stability_token: shellStabilityToken,
  })}`;
  const stabilityContract = buildRouteStabilityContract({
    customer_head_sequence: customerHeadSequence,
    frame_epoch: frameEpoch,
    internal_head_sequence_or_null: internalHeadSequence,
    last_published_sequence: lastPublishedSequence,
    request_state_version_or_null: activeRequest?.request_state_version ?? null,
    resume_token: resumeToken,
    shell_stability_token: shellStabilityToken,
    workspace_version: workspaceVersion,
  });
  const currentArtifactRef = files.current_shared_file_refs[0] ?? null;
  const historicalArtifactRefs = [...files.historical_shared_file_refs];
  const customerRequestWorkspace: WorkspaceSnapshot["customer_request_workspace"] =
    input.viewer_scope === "CUSTOMER_VISIBLE"
      ? {
          action_order: ["REPLY", "UPLOAD_FILE", "RESPOND_TO_REQUEST_INFO"],
          artifact_affordance: buildArtifactAffordanceContract({
            current_artifact_ref_or_null: currentArtifactRef,
            historical_artifact_refs: historicalArtifactRefs,
          }),
          artifact_history_state: artifactState({
            current_artifact_ref_or_null: currentArtifactRef,
            historical_artifact_refs: historicalArtifactRefs,
          }),
          artifact_selection: buildArtifactSelectionContract({
            current_artifact_ref_or_null: currentArtifactRef,
            historical_artifact_refs: historicalArtifactRefs,
          }),
          authoritative_action: buildActionAuthorityContract({
            access_binding_hash: input.access_binding_hash,
            actionability_state: actionPosture.actionability_state,
            available_action_codes: actionPosture.visible_customer_action_codes,
            basis_hash: actionBasisHash,
            blocked_action_codes: actionPosture.blocked_action_codes,
            blocking_reason_code_or_null: actionPosture.blocking_reason_code_or_null,
            customer_safe_projection: true,
            machine_reason_codes: actionPosture.machine_reason_codes,
            primary_action_code_or_null: actionPosture.primary_action_code_or_null,
            projection_route_key: workspaceRouteKey,
            projection_scope: "CUSTOMER_REQUEST_DETAIL",
            projection_version: workspaceVersion,
            recovery_focus_anchor_ref_or_null:
              actionPosture.actionability_state === "NO_SAFE_ACTION" ? routeContext.focus_anchor_ref_or_null : null,
            recovery_route_ref_or_null:
              actionPosture.actionability_state === "NO_SAFE_ACTION" ? routeContext.active_route_ref : null,
            secondary_action_codes: [],
            suggested_module_code_or_null: actionPosture.suggested_module_code_or_null,
            visibility_cache_partition_key: visibilityPartition.cache_partition_key,
          }),
          current_artifact_ref_or_null: currentArtifactRef,
          due_label_ref_or_null: customerDueLabel,
          historical_artifact_refs: historicalArtifactRefs,
          language_contract: buildPortalLanguageContract(),
          no_safe_action_reason_ref_or_null:
            actionPosture.actionability_state === "NO_SAFE_ACTION"
              ? actionPosture.blocking_reason_text
              : null,
          primary_action_label_ref_or_null: actionPosture.primary_action_label_ref_or_null,
          status_code: requestStatusCode,
          status_label_ref: customerStatusLabel(requestStatusCode),
          surface_order: ["CONTEXT_BAR", "DECISION_SUMMARY", "ACTION_STRIP", "DETAIL_DRAWER"],
          visible_action_codes: actionPosture.visible_customer_action_codes,
        }
      : null;
  const snapshot: WorkspaceSnapshot = stampWorkspaceContinuityMetadata({
    snapshot: {
    access_binding_hash: requireProjectorString("access_binding_hash", input.access_binding_hash),
    action_strip: {
      actionability_state: actionPosture.actionability_state,
      authoritative_action: actionAuthority,
      available_action_codes: actionPosture.available_action_codes,
      blocked_action_codes: actionPosture.blocked_action_codes,
      blocking_reason: actionPosture.blocking_reason_text,
      machine_reason_codes: actionPosture.machine_reason_codes,
      ownership_label: actionPosture.ownership_label,
      ownership_posture: actionPosture.ownership_posture,
      primary_action_code: actionPosture.primary_action_code_or_null,
      secondary_action_codes: actionPosture.secondary_action_codes,
      suggested_module_code: actionPosture.suggested_module_code_or_null,
      waiting_on_label: actionPosture.waiting_on_label,
    },
    active_request_info_ref_or_null: activeRequest?.request_info_id ?? null,
    artifact_type: "WorkspaceSnapshot",
    cache_isolation_contract: buildCacheIsolationContract({
      access_binding_hash: input.access_binding_hash,
      cache_partition_ref: visibilityPartition.cache_partition_key,
      cache_scope_class: "WORKSPACE_SNAPSHOT",
      canonical_object_ref: item.item_id,
      client_id_or_null: input.viewer_scope === "CUSTOMER_VISIBLE" ? item.client_id : null,
      customer_safe_projection: input.viewer_scope === "CUSTOMER_VISIBLE",
      masking_posture_fingerprint: input.masking_posture_fingerprint,
      principal_class: input.principal_class ?? (input.viewer_scope === "STAFF_FULL" ? "STAFF" : "CLIENT"),
      projection_version_ref: String(workspaceVersion),
      route_identity_ref: workspaceRouteKey,
      session_binding_hash: input.session_binding_hash ?? `session-binding://${input.viewer_scope}`,
      shell_family: shellFamily,
      shell_stability_ref_or_null: shellStabilityToken,
      tenant_id: item.tenant_id,
      visibility_cache_partition_key_or_null: visibilityPartition.cache_partition_key,
    }),
    context_bar: {
      assignee_label: input.viewer_scope === "STAFF_FULL" ? item.current_assignee_ref : null,
      client_label: item.client_id,
      customer_status_projection: customerStatusProjectionText(requestStatusCode),
      due_state: workspaceDueStateForItem(item),
      escalation_active:
        input.viewer_scope === "STAFF_FULL"
          ? item.routing_contract.escalation_recommendation_state === "ESCALATED_ACTIVE"
          : null,
      freshness_notice_ref_or_null: null,
      freshness_state: "FRESH",
      internal_lifecycle_state: input.viewer_scope === "STAFF_FULL" ? item.lifecycle_state : null,
      item_id: item.item_id,
      period_label: item.period,
      recovery_notice_ref_or_null: null,
      title: input.viewer_scope === "CUSTOMER_VISIBLE" ? customerSafeTitle(item) : item.title,
      waiting_on_actor: item.waiting_on_actor,
    },
    cross_device_continuity_contract: buildWorkspaceCrossDeviceContinuity({
      access_binding_hash: input.access_binding_hash,
      actionability_state: actionPosture.actionability_state,
      canonical_object_ref: item.item_id,
      focus_anchor_ref_or_null: routeContext.focus_anchor_ref_or_null,
      masking_posture_fingerprint: input.masking_posture_fingerprint,
      parent_context_ref_or_null: routeContext.return_route_ref,
      return_focus_anchor_ref_or_null: routeContext.return_focus_anchor_ref,
      route_identity_ref: workspaceRouteKey,
      shell_family: shellFamily,
      stability_guard_hash_or_null: stabilityContract.guard_vector_hash,
      visibility_cache_partition_key_or_null: visibilityPartition.cache_partition_key,
    }),
    customer_head_sequence: customerHeadSequence,
    customer_request_workspace: customerRequestWorkspace,
    customer_safe_projection: customerSafeProjection,
    decision_summary: {
      customer_state_differs: input.viewer_scope === "STAFF_FULL" ? false : null,
      customer_state_summary_ref: null,
      due_summary_ref: customerDueLabel ?? "No deadline yet",
      next_actor: item.waiting_on_actor,
      next_actor_summary_ref: customerStatusProjectionText(requestStatusCode),
      reason_codes: actionPosture.machine_reason_codes.slice(0, 3),
      summary_ref:
        input.viewer_scope === "CUSTOMER_VISIBLE"
          ? "Request status and next step"
          : `Workspace summary for ${item.item_id}`,
    },
    detail_drawer: {
      composer_layer: buildComposerLayer({
        active_request_info_ref_or_null: activeRequest?.request_info_id ?? null,
        action_posture: actionPosture,
        viewer_scope: input.viewer_scope,
      }),
      expanded_module_code: promotedModule,
      fallback_reason_code: null,
      focus_anchor_ref: routeContext.focus_anchor_ref_or_null,
      modules,
      promoted_module_code: promotedModule,
    },
    dominance_contract: buildShellDominanceContract({
      actionability_state: actionPosture.actionability_state,
      primary_action_code_or_null: actionPosture.primary_action_code_or_null,
      promoted_support_surface_code_or_null: "DETAIL_DRAWER",
    }),
    dominant_question:
      input.viewer_scope === "CUSTOMER_VISIBLE"
        ? "What do you need to do next?"
        : "What needs attention on this work item?",
    experience_profile: "LOW_NOISE",
    frame_epoch: frameEpoch,
    interaction_layer: buildCalmInteractionLayer(),
    internal_head_sequence_or_null: internalHeadSequence,
    item_id: item.item_id,
    last_published_sequence: lastPublishedSequence,
    masking_posture_fingerprint: requireProjectorString(
      "masking_posture_fingerprint",
      input.masking_posture_fingerprint,
    ),
    object_anchor_ref: item.item_id,
    participants: cloneWorkflowRecord(visibleParticipants),
    permissions: permissionsForViewer(input.viewer_scope),
    queue_projection: queueProjection,
    recovery_posture: "NONE",
    request_state_version_or_null: activeRequest?.request_state_version ?? null,
    resume_token: resumeToken,
    route_context: routeContext,
    semantic_accessibility_contract: buildWorkspaceSemanticAccessibilityContract({
      shell_family: shellFamily,
    }),
    settlement_state: "STEADY",
    shell_family: shellFamily,
    shell_stability_token: shellStabilityToken,
    stability_contract: stabilityContract,
    state_taxonomy_contract: buildShellStateTaxonomyContract({
      recovery_posture: "NONE",
      settlement_state: "STEADY",
    }),
    stream_recovery_contract: buildStreamRecoveryContract({
      access_binding_hash: input.access_binding_hash,
      frame_epoch: frameEpoch,
      last_published_sequence: lastPublishedSequence,
      masking_posture_fingerprint: input.masking_posture_fingerprint,
      publication_generation: workspaceVersion,
      resume_token: resumeToken,
      route_key: workspaceRouteKey,
      session_binding_hash: input.session_binding_hash ?? `session-binding://${input.viewer_scope}`,
      session_ref: input.session_ref ?? `session://${input.viewer_scope}/${item.item_id}`,
      shell_stability_token: shellStabilityToken,
      subject_ref: item.item_id,
    }),
    surface_order: [...WORKSPACE_SURFACE_ORDER],
    tenant_id: item.tenant_id,
    viewer_scope: input.viewer_scope,
    visibility_partition: visibilityPartition,
    workspace_route_key: workspaceRouteKey,
      workspace_version: workspaceVersion,
    },
  });
  validateWorkspaceSnapshot(snapshot);
  assertCustomerSafeProjectionAlignment({
    artifact: snapshot as unknown as Record<string, unknown>,
    expected_allowed_visibility_classes:
      input.viewer_scope === "STAFF_FULL" ? ["CUSTOMER_VISIBLE", "INTERNAL_ONLY"] : ["CUSTOMER_VISIBLE"],
    expected_boundary_scope:
      input.viewer_scope === "CUSTOMER_VISIBLE" ? "WORKSPACE_CUSTOMER_REQUEST" : undefined,
    expected_partition_scope: "WORKSPACE_SNAPSHOT",
    expected_projection_audience:
      input.viewer_scope === "CUSTOMER_VISIBLE" ? "CUSTOMER_COLLABORATION" : undefined,
    expected_visibility_audience_class:
      input.viewer_scope === "STAFF_FULL" ? "STAFF" : "CUSTOMER_COLLABORATION",
    requirement: input.viewer_scope === "CUSTOMER_VISIBLE" ? "REQUIRED" : "FORBIDDEN",
  });
  normalizeProjectorTimestamp("workspace synthetic validation timestamp", "2026-04-30T00:00:00Z");
  return snapshot;
}
