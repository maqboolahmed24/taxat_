import type { NorthboundActorContext } from "../../../../apps/control-plane-api/src/northbound/policy.ts";
import { projectCollaborationActivitySlice } from "../../../backend-workflow/src/services/project_collaboration_activity_slice.ts";
import {
  validateCollaborationActivitySlice,
  type CollaborationActivitySlice,
} from "../../../backend-workflow/src/projectors/build_collaboration_activity_slice.ts";
import type {
  CollaborationVisibilityClass,
} from "../../../backend-workflow/src/models/collaboration_thread.ts";
import type { WorkspaceViewerScope } from "../../../backend-workflow/src/projectors/projection_contract_helpers.ts";
import {
  CollaborationActivitySliceRepository,
} from "../../../backend-workflow/src/repositories/collaboration_activity_slice_repository.ts";
import type { CollaborationEntryRepository } from "../../../backend-workflow/src/repositories/collaboration_entry_repository.ts";
import type { CollaborationThreadRepository } from "../../../backend-workflow/src/repositories/collaboration_thread_repository.ts";
import {
  getWorkspaceSnapshot,
  type WorkspaceSnapshotRepositoryLike,
} from "./get_workspace_snapshot.ts";

export type GetCollaborationActivitySliceInput = {
  actorContext: NorthboundActorContext;
  beforeSequenceOrNull?: number | null;
  entryRepository: CollaborationEntryRepository;
  focusAnchorRefOrNull?: string | null;
  includeSystemEntries?: boolean;
  itemId: string;
  limit?: number;
  requestInfoRefOrNull?: string | null;
  sliceRepository?: CollaborationActivitySliceRepository;
  threadRepository: CollaborationThreadRepository;
  threadVisibilityClass: CollaborationVisibilityClass;
  viewerScope: WorkspaceViewerScope;
  workspaceSnapshotRepository: WorkspaceSnapshotRepositoryLike;
};

function assertSliceGuardSpine(input: {
  slice: CollaborationActivitySlice;
  snapshotRef: string;
  snapshot: Awaited<ReturnType<typeof getWorkspaceSnapshot>>;
}) {
  const snapshot = input.snapshot.record;
  if (
    input.slice.item_id !== snapshot.item_id ||
    input.slice.workspace_route_key !== snapshot.workspace_route_key ||
    input.slice.workspace_version !== snapshot.workspace_version ||
    input.slice.shell_stability_token !== snapshot.shell_stability_token ||
    input.slice.access_binding_hash !== snapshot.access_binding_hash ||
    input.slice.masking_posture_fingerprint !== snapshot.masking_posture_fingerprint ||
    input.slice.latest_workspace_snapshot_ref !== input.snapshotRef
  ) {
    throw new Error("activity slice guard spine drifted from latest workspace snapshot");
  }
  if (
    input.slice.visibility_partition.allowed_visibility_classes.length !== 1 ||
    input.slice.visibility_partition.allowed_visibility_classes[0] !==
      input.slice.thread_visibility_class
  ) {
    throw new Error("activity slice visibility partition drifted from thread filter");
  }
}

export async function getCollaborationActivitySlice(
  input: GetCollaborationActivitySliceInput,
) {
  if (
    input.viewerScope === "CUSTOMER_VISIBLE" &&
    input.threadVisibilityClass !== "CUSTOMER_VISIBLE"
  ) {
    throw new Error("customer actors cannot read internal collaboration activity");
  }
  const snapshot = await getWorkspaceSnapshot({
    actorContext: input.actorContext,
    itemId: input.itemId,
    repository: input.workspaceSnapshotRepository,
    viewerScope: input.viewerScope,
  });
  const repository = input.sliceRepository ?? new CollaborationActivitySliceRepository();
  const projected = await projectCollaborationActivitySlice({
    access_binding_hash: snapshot.record.access_binding_hash,
    before_sequence_or_null: input.beforeSequenceOrNull ?? null,
    entry_repository: input.entryRepository,
    focus_anchor_ref_or_null:
      input.focusAnchorRefOrNull ?? snapshot.record.route_context.focus_anchor_ref_or_null,
    include_system_entries: input.includeSystemEntries ?? false,
    item_id: snapshot.record.item_id,
    latest_workspace_snapshot_ref: snapshot.snapshot_ref,
    limit: input.limit,
    masking_posture_fingerprint: snapshot.record.masking_posture_fingerprint,
    repository,
    request_info_ref_or_null: input.requestInfoRefOrNull ?? null,
    returned_at: new Date(0).toISOString(),
    shell_stability_token: snapshot.record.shell_stability_token,
    thread_repository: input.threadRepository,
    thread_visibility_class: input.threadVisibilityClass,
    viewer_scope: input.viewerScope,
    workspace_route_key: snapshot.record.workspace_route_key,
    workspace_snapshot_repository: input.workspaceSnapshotRepository as never,
    workspace_version: snapshot.record.workspace_version,
  });
  validateCollaborationActivitySlice(projected.slice);
  assertSliceGuardSpine({
    slice: projected.slice,
    snapshot,
    snapshotRef: snapshot.snapshot_ref,
  });
  return {
    slice: projected.slice,
    sliceRef: projected.stored.slice_ref,
    snapshot,
  };
}
