import type { CollaborationEntry } from "../models/collaboration_entry.ts";
import type { CollaborationThread, CollaborationVisibilityClass } from "../models/collaboration_thread.ts";
import { WorkflowModelError } from "../models/workflow_item.ts";
import {
  buildCollaborationActivitySlice,
  type BuildCollaborationActivitySliceInput,
} from "../projectors/build_collaboration_activity_slice.ts";
import type { CollaborationActivitySliceRepository } from "../repositories/collaboration_activity_slice_repository.ts";
import type { CollaborationEntryRepository } from "../repositories/collaboration_entry_repository.ts";
import type { CollaborationThreadRepository } from "../repositories/collaboration_thread_repository.ts";
import type { WorkspaceSnapshotRepository } from "../repositories/workspace_snapshot_repository.ts";

export type ProjectCollaborationActivitySliceInput = Omit<
  BuildCollaborationActivitySliceInput,
  "entries" | "latest_workspace_snapshot_ref" | "thread"
> & {
  entry_repository?: CollaborationEntryRepository | undefined;
  entries?: readonly CollaborationEntry[] | undefined;
  latest_workspace_snapshot_ref?: string | undefined;
  repository: CollaborationActivitySliceRepository;
  thread?: CollaborationThread | undefined;
  thread_id?: string | undefined;
  thread_repository?: CollaborationThreadRepository | undefined;
  thread_visibility_class?: CollaborationVisibilityClass | undefined;
  workspace_snapshot_repository?: WorkspaceSnapshotRepository | undefined;
};

async function resolveThread(input: ProjectCollaborationActivitySliceInput) {
  if (input.thread !== undefined) {
    return input.thread;
  }
  if (input.thread_id !== undefined) {
    return (await input.thread_repository?.getCollaborationThreadById(input.thread_id))?.record ?? null;
  }
  if (input.thread_visibility_class !== undefined) {
    return (await input.thread_repository?.getCollaborationThreadForItem({
      item_id: input.item_id,
      visibility_class: input.thread_visibility_class,
    }))?.record ?? null;
  }
  return null;
}

export async function projectCollaborationActivitySlice(input: ProjectCollaborationActivitySliceInput) {
  const thread = await resolveThread(input);
  if (thread === null) {
    throw new WorkflowModelError("WORKFLOW_CONTRACT_INVALID", "activity slice projection requires a thread basis");
  }
  const entries =
    input.entries ??
    (await input.entry_repository?.listCollaborationEntriesByThread(thread.thread_id))?.map(
      (stored) => stored.record,
    ) ??
    [];
  const latestWorkspaceSnapshotRef =
    input.latest_workspace_snapshot_ref ??
    (await input.workspace_snapshot_repository?.getLatestWorkspaceSnapshotForItem({
      item_id: input.item_id,
      viewer_scope: input.viewer_scope,
    }))?.snapshot_ref;
  const slice = buildCollaborationActivitySlice({
    ...input,
    entries,
    latest_workspace_snapshot_ref: latestWorkspaceSnapshotRef,
    thread,
  });
  const stored = await input.repository.persistCollaborationActivitySlice({ slice });
  return {
    slice,
    stored,
  };
}
