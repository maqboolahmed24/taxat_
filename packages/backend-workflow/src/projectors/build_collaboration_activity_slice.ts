import {
  normalizeCollaborationEntry,
  type CollaborationEntry,
} from "../models/collaboration_entry.ts";
import {
  normalizeCollaborationThread,
  type CollaborationThread,
  type CollaborationVisibilityClass,
} from "../models/collaboration_thread.ts";
import { cloneWorkflowRecord, WorkflowModelError } from "../models/workflow_item.ts";
import { assertCustomerSafeProjectionAlignment } from "../services/assert_customer_safe_projection_alignment.ts";
import {
  assertNonNegativeInteger,
  buildCustomerSafeProjectionContract,
  buildVisibilityPartitionContract,
  latestWorkspaceSnapshotRef,
  normalizeProjectorTimestamp,
  projectionHash,
  requireProjectorString,
  type CustomerSafeProjectionContract,
  type VisibilityPartitionContract,
  type WorkspaceViewerScope,
} from "./projection_contract_helpers.ts";

export type CollaborationActivitySliceActiveFilters = {
  before_sequence_or_null: number | null;
  include_system_entries: boolean;
  request_info_ref_or_null: string | null;
  thread_visibility_class: CollaborationVisibilityClass;
};

export type CollaborationActivitySlice = {
  access_binding_hash: string;
  active_filters: CollaborationActivitySliceActiveFilters;
  artifact_type: "CollaborationActivitySlice";
  customer_safe_projection: CustomerSafeProjectionContract | null;
  entry_refs: string[];
  focus_anchor_ref_or_null: string | null;
  has_more_before: boolean;
  head_sequence: number;
  item_id: string;
  latest_workspace_snapshot_ref: string;
  masking_posture_fingerprint: string;
  newest_returned_sequence_or_null: number | null;
  next_before_sequence_or_null: number | null;
  oldest_returned_sequence_or_null: number | null;
  returned_at: string;
  shell_stability_token: string;
  thread_visibility_class: CollaborationVisibilityClass;
  viewer_scope: WorkspaceViewerScope;
  visibility_partition: VisibilityPartitionContract;
  workspace_route_key: string;
  workspace_version: number;
};

export type BuildCollaborationActivitySliceInput = {
  access_binding_hash: string;
  before_sequence_or_null?: number | null | undefined;
  cache_partition_key?: string | undefined;
  entries: readonly CollaborationEntry[];
  focus_anchor_ref_or_null?: string | null | undefined;
  include_system_entries?: boolean | undefined;
  item_id: string;
  latest_workspace_snapshot_ref?: string | undefined;
  limit?: number | undefined;
  masking_posture_fingerprint: string;
  request_info_ref_or_null?: string | null | undefined;
  returned_at?: string | undefined;
  shell_stability_token: string;
  thread: CollaborationThread;
  viewer_scope: WorkspaceViewerScope;
  workspace_route_key: string;
  workspace_version: number;
};

function assertPositiveInteger(label: string, value: unknown) {
  if (typeof value !== "number" || !Number.isInteger(value) || value < 1) {
    throw new WorkflowModelError("WORKFLOW_FIELD_INVALID", `${label} must be a positive integer`);
  }
  return value;
}

function normalizeBeforeSequence(value: number | null | undefined) {
  if (value === null || value === undefined) {
    return null;
  }
  return assertPositiveInteger("before_sequence_or_null", value);
}

function sortEntriesNewestFirst(left: CollaborationEntry, right: CollaborationEntry) {
  return right.thread_sequence - left.thread_sequence || right.entry_id.localeCompare(left.entry_id);
}

export function validateCollaborationActivitySlice(slice: CollaborationActivitySlice) {
  if (slice.visibility_partition.partition_scope !== "COLLABORATION_ACTIVITY_SLICE") {
    throw new WorkflowModelError("WORKFLOW_CONTRACT_INVALID", "activity slice visibility partition scope drifted");
  }
  if (slice.active_filters.thread_visibility_class !== slice.thread_visibility_class) {
    throw new WorkflowModelError("WORKFLOW_CONTRACT_INVALID", "activity filters must mirror thread visibility");
  }
  if (slice.viewer_scope === "CUSTOMER_VISIBLE") {
    if (slice.thread_visibility_class !== "CUSTOMER_VISIBLE" || slice.customer_safe_projection === null) {
      throw new WorkflowModelError("WORKFLOW_CONTRACT_INVALID", "customer activity slices must stay customer-visible");
    }
  } else if (slice.customer_safe_projection !== null) {
    throw new WorkflowModelError("WORKFLOW_CONTRACT_INVALID", "staff activity slices must clear customer-safe projection");
  }
  if (
    slice.newest_returned_sequence_or_null === null ||
    slice.oldest_returned_sequence_or_null === null
  ) {
    if (slice.entry_refs.length > 0) {
      throw new WorkflowModelError("WORKFLOW_CONTRACT_INVALID", "empty activity range drifted from entry refs");
    }
  } else {
    if (slice.entry_refs.length === 0) {
      throw new WorkflowModelError("WORKFLOW_CONTRACT_INVALID", "non-empty activity range needs entry refs");
    }
    if (slice.newest_returned_sequence_or_null > slice.head_sequence) {
      throw new WorkflowModelError("WORKFLOW_CONTRACT_INVALID", "activity slice newest sequence exceeds head");
    }
    if (slice.oldest_returned_sequence_or_null > slice.newest_returned_sequence_or_null) {
      throw new WorkflowModelError("WORKFLOW_CONTRACT_INVALID", "activity slice sequence range is inverted");
    }
  }
  if (
    slice.active_filters.before_sequence_or_null !== null &&
    slice.newest_returned_sequence_or_null !== null &&
    slice.newest_returned_sequence_or_null > slice.active_filters.before_sequence_or_null
  ) {
    throw new WorkflowModelError("WORKFLOW_CONTRACT_INVALID", "activity slice newest sequence drifted past before filter");
  }
  if (slice.has_more_before && slice.next_before_sequence_or_null === null) {
    throw new WorkflowModelError("WORKFLOW_CONTRACT_INVALID", "activity slice earlier page marker is missing");
  }
  if (!slice.has_more_before && slice.next_before_sequence_or_null !== null) {
    throw new WorkflowModelError("WORKFLOW_CONTRACT_INVALID", "activity slice earlier page marker must clear");
  }
}

export function collaborationActivitySliceRef(slice: CollaborationActivitySlice) {
  return `collaboration-activity-slice://${projectionHash({
    access_binding_hash: slice.access_binding_hash,
    before_sequence_or_null: slice.active_filters.before_sequence_or_null,
    head_sequence: slice.head_sequence,
    item_id: slice.item_id,
    request_info_ref_or_null: slice.active_filters.request_info_ref_or_null,
    thread_visibility_class: slice.thread_visibility_class,
    viewer_scope: slice.viewer_scope,
    workspace_route_key: slice.workspace_route_key,
    workspace_version: slice.workspace_version,
  })}`;
}

export function collaborationActivitySliceContentFingerprint(slice: CollaborationActivitySlice) {
  validateCollaborationActivitySlice(slice);
  return projectionHash(slice);
}

export function buildCollaborationActivitySlice(
  input: BuildCollaborationActivitySliceInput,
): CollaborationActivitySlice {
  const itemId = requireProjectorString("item_id", input.item_id);
  const workspaceRouteKey = requireProjectorString("workspace_route_key", input.workspace_route_key);
  const shellStabilityToken = requireProjectorString("shell_stability_token", input.shell_stability_token);
  const accessBindingHash = requireProjectorString("access_binding_hash", input.access_binding_hash);
  const maskingPostureFingerprint = requireProjectorString(
    "masking_posture_fingerprint",
    input.masking_posture_fingerprint,
  );
  const workspaceVersion = assertNonNegativeInteger("workspace_version", input.workspace_version);
  const thread = normalizeCollaborationThread(input.thread);
  if (thread.item_id !== itemId) {
    throw new WorkflowModelError("WORKFLOW_CONTRACT_INVALID", "activity slice thread must belong to item");
  }
  if (input.viewer_scope === "CUSTOMER_VISIBLE" && thread.visibility_class !== "CUSTOMER_VISIBLE") {
    throw new WorkflowModelError("WORKFLOW_CONTRACT_INVALID", "customer activity slice cannot mount internal thread");
  }
  const beforeSequence = normalizeBeforeSequence(input.before_sequence_or_null);
  const limit = assertPositiveInteger("limit", input.limit ?? 25);
  const includeSystemEntries = input.include_system_entries ?? false;
  const requestInfoRef = input.request_info_ref_or_null ?? null;
  const normalizedEntries = input.entries.map((entry) => normalizeCollaborationEntry(entry));
  for (const entry of normalizedEntries) {
    if (
      entry.item_id !== itemId ||
      entry.thread_id !== thread.thread_id ||
      entry.visibility_class !== thread.visibility_class ||
      entry.thread_sequence > thread.head_sequence
    ) {
      throw new WorkflowModelError("WORKFLOW_CONTRACT_INVALID", "activity slice entry basis does not match thread");
    }
  }
  const sequenceCeiling = beforeSequence ?? thread.head_sequence;
  const matchingEntries = normalizedEntries
    .filter((entry) => entry.thread_sequence <= sequenceCeiling)
    .filter((entry) => includeSystemEntries || entry.entry_type !== "SYSTEM")
    .filter((entry) => requestInfoRef === null || entry.request_info_ref === requestInfoRef)
    .sort(sortEntriesNewestFirst);
  const returnedEntries = matchingEntries.slice(0, limit);
  const newestReturned = returnedEntries[0]?.thread_sequence ?? null;
  const oldestReturned = returnedEntries.at(-1)?.thread_sequence ?? null;
  const hasMoreBefore = returnedEntries.length > 0 && matchingEntries.length > returnedEntries.length;
  const nextBefore = hasMoreBefore && oldestReturned !== null ? Math.max(1, oldestReturned - 1) : null;
  const returnedAt = normalizeProjectorTimestamp(
    "returned_at",
    input.returned_at ?? returnedEntries[0]?.created_at ?? "1970-01-01T00:00:00Z",
  );
  const visibilityPartition = buildVisibilityPartitionContract({
    access_binding_hash: accessBindingHash,
    allowed_visibility_classes: [thread.visibility_class],
    audience_class: input.viewer_scope === "CUSTOMER_VISIBLE" ? "CUSTOMER_COLLABORATION" : "STAFF",
    badge_counter_policy: "SURFACE_VISIBLE_ONLY",
    cache_partition_key: input.cache_partition_key,
    masking_posture_fingerprint: maskingPostureFingerprint,
    ordering_side_channel_policy: "VISIBLE_EVENTS_ONLY",
    partition_scope: "COLLABORATION_ACTIVITY_SLICE",
    subject_ref: `${workspaceRouteKey}:${thread.thread_id}:${sequenceCeiling}`,
  });
  const slice: CollaborationActivitySlice = {
    access_binding_hash: accessBindingHash,
    active_filters: {
      before_sequence_or_null: beforeSequence,
      include_system_entries: includeSystemEntries,
      request_info_ref_or_null: requestInfoRef,
      thread_visibility_class: thread.visibility_class,
    },
    artifact_type: "CollaborationActivitySlice",
    customer_safe_projection:
      input.viewer_scope === "CUSTOMER_VISIBLE"
        ? buildCustomerSafeProjectionContract({
            access_binding_hash: accessBindingHash,
            boundary_scope: "COLLABORATION_ACTIVITY_SLICE",
            masking_posture_fingerprint: maskingPostureFingerprint,
            projection_audience: "CUSTOMER_COLLABORATION",
            visibility_cache_partition_key: visibilityPartition.cache_partition_key,
          })
        : null,
    entry_refs: returnedEntries.map((entry) => entry.entry_id),
    focus_anchor_ref_or_null: input.focus_anchor_ref_or_null ?? null,
    has_more_before: hasMoreBefore,
    head_sequence: thread.head_sequence,
    item_id: itemId,
    latest_workspace_snapshot_ref:
      input.latest_workspace_snapshot_ref ??
      latestWorkspaceSnapshotRef({
        item_id: itemId,
        shell_stability_token: shellStabilityToken,
        viewer_scope: input.viewer_scope,
        workspace_route_key: workspaceRouteKey,
        workspace_version: workspaceVersion,
      }),
    masking_posture_fingerprint: maskingPostureFingerprint,
    newest_returned_sequence_or_null: newestReturned,
    next_before_sequence_or_null: nextBefore,
    oldest_returned_sequence_or_null: oldestReturned,
    returned_at: returnedAt,
    shell_stability_token: shellStabilityToken,
    thread_visibility_class: thread.visibility_class,
    viewer_scope: input.viewer_scope,
    visibility_partition: visibilityPartition,
    workspace_route_key: workspaceRouteKey,
    workspace_version: workspaceVersion,
  };
  validateCollaborationActivitySlice(slice);
  assertCustomerSafeProjectionAlignment({
    artifact: slice as unknown as Record<string, unknown>,
    expected_allowed_visibility_classes: [thread.visibility_class],
    expected_boundary_scope:
      input.viewer_scope === "CUSTOMER_VISIBLE" ? "COLLABORATION_ACTIVITY_SLICE" : undefined,
    expected_partition_scope: "COLLABORATION_ACTIVITY_SLICE",
    expected_projection_audience:
      input.viewer_scope === "CUSTOMER_VISIBLE" ? "CUSTOMER_COLLABORATION" : undefined,
    expected_visibility_audience_class:
      input.viewer_scope === "CUSTOMER_VISIBLE" ? "CUSTOMER_COLLABORATION" : "STAFF",
    requirement: input.viewer_scope === "CUSTOMER_VISIBLE" ? "REQUIRED" : "FORBIDDEN",
  });
  return cloneWorkflowRecord(slice);
}
