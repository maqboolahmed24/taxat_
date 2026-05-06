import type { CollaborationEntry } from "../models/collaboration_entry.ts";
import type { CollaborationThread } from "../models/collaboration_thread.ts";
import { normalizeCollaborationThread } from "../models/collaboration_thread.ts";
import { normalizeCollaborationEntry } from "../models/collaboration_entry.ts";
import { WorkflowModelError } from "../models/workflow_item.ts";

export function validateCollaborationThreadSequence(input: {
  entries: readonly CollaborationEntry[];
  thread: CollaborationThread;
}) {
  const thread = normalizeCollaborationThread(input.thread);
  const entries = input.entries.map(normalizeCollaborationEntry).sort((left, right) => {
    return left.thread_sequence - right.thread_sequence || left.entry_id.localeCompare(right.entry_id);
  });

  if (entries.length !== thread.head_sequence) {
    throw new WorkflowModelError(
      "WORKFLOW_CONTRACT_INVALID",
      "collaboration thread head_sequence must equal the number of persisted entries",
    );
  }
  if (entries.length === 0 && thread.last_entry_ref !== null) {
    throw new WorkflowModelError(
      "WORKFLOW_CONTRACT_INVALID",
      "empty collaboration thread must clear last_entry_ref",
    );
  }

  for (const [index, entry] of entries.entries()) {
    const expectedSequence = index + 1;
    if (entry.thread_id !== thread.thread_id || entry.item_id !== thread.item_id) {
      throw new WorkflowModelError(
        "WORKFLOW_CONTRACT_INVALID",
        "collaboration entry must stay bound to the validated thread and item",
      );
    }
    if (entry.visibility_class !== thread.visibility_class) {
      throw new WorkflowModelError(
        "WORKFLOW_CONTRACT_INVALID",
        "collaboration entry visibility_class must mirror its thread",
      );
    }
    if (entry.thread_sequence !== expectedSequence) {
      throw new WorkflowModelError(
        "WORKFLOW_CONTRACT_INVALID",
        "collaboration thread sequences must be monotonic and gap-free",
      );
    }
  }

  const lastEntry = entries.at(-1);
  if ((lastEntry?.entry_id ?? null) !== thread.last_entry_ref) {
    throw new WorkflowModelError(
      "WORKFLOW_CONTRACT_INVALID",
      "collaboration thread last_entry_ref must mirror the highest sequence entry",
    );
  }
  return { entries, thread };
}
