import type { CollaborationEntry } from "../models/collaboration_entry.ts";
import { normalizeCollaborationEntry } from "../models/collaboration_entry.ts";
import type { CollaborationThread } from "../models/collaboration_thread.ts";
import { normalizeCollaborationThread } from "../models/collaboration_thread.ts";
import { WorkflowModelError } from "../models/workflow_item.ts";

export function projectThreadHeadUpdate(input: {
  entry: CollaborationEntry;
  thread: CollaborationThread;
}) {
  const thread = normalizeCollaborationThread(input.thread);
  const entry = normalizeCollaborationEntry(input.entry);
  if (
    entry.thread_id !== thread.thread_id ||
    entry.item_id !== thread.item_id ||
    entry.visibility_class !== thread.visibility_class
  ) {
    throw new WorkflowModelError(
      "WORKFLOW_CONTRACT_INVALID",
      "collaboration entry must match thread id, item id, and visibility before head projection",
    );
  }
  if (entry.thread_sequence !== thread.head_sequence + 1) {
    throw new WorkflowModelError(
      "WORKFLOW_STALE_VERSION",
      "collaboration entry sequence must advance exactly one position past the thread head",
    );
  }
  return normalizeCollaborationThread({
    ...thread,
    head_sequence: entry.thread_sequence,
    last_entry_ref: entry.entry_id,
  });
}
