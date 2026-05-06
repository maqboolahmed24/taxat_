import {
  buildCollaborationEntry,
  type CollaborationEntry,
  type CollaborationEntryInput,
  type CollaborationEntryType,
} from "../models/collaboration_entry.ts";
import type { CollaborationVisibilityClass } from "../models/collaboration_thread.ts";
import { WorkflowModelError } from "../models/workflow_item.ts";
import type { CollaborationEntryRepository } from "../repositories/collaboration_entry_repository.ts";
import type { CollaborationThreadRepository } from "../repositories/collaboration_thread_repository.ts";
import { projectThreadHeadUpdate } from "./project_thread_head_update.ts";
import {
  validateCollaborationEntryVisibility,
  type AttachmentVisibilityLookup,
} from "./validate_collaboration_entry_visibility.ts";

export type AppendCollaborationEntryInput = {
  actor_ref: string;
  attachment_refs?: readonly string[] | undefined;
  attachment_visibility_by_ref?: AttachmentVisibilityLookup | undefined;
  audit_event_ref?: string | undefined;
  body_ref?: string | null | undefined;
  causal_parent_entry_ref?: string | null | undefined;
  command_id: string;
  command_receipt_ref?: string | undefined;
  created_at: string;
  entry_repository: CollaborationEntryRepository;
  entry_type: CollaborationEntryType;
  expected_thread_head_sequence: number;
  redaction_state?: "NONE" | "REDACTED" | undefined;
  request_info_ref?: string | null | undefined;
  request_prompt_entry_ref?: string | null | undefined;
  semantic_action_id?: string | undefined;
  thread_id: string;
  thread_repository: CollaborationThreadRepository;
  visibility_class?: CollaborationVisibilityClass | undefined;
};

export type AppendCollaborationEntryResult = {
  duplicate_replay: boolean;
  entry: CollaborationEntry;
  thread_head_sequence: number;
};

export async function appendCollaborationEntry(
  input: AppendCollaborationEntryInput,
): Promise<AppendCollaborationEntryResult> {
  const duplicate = await input.entry_repository.findCollaborationEntryByCommandId(input.command_id);
  if (duplicate !== null) {
    return {
      duplicate_replay: true,
      entry: duplicate.record,
      thread_head_sequence: duplicate.record.thread_sequence,
    };
  }

  const storedThread = await input.thread_repository.getCollaborationThreadById(input.thread_id);
  if (storedThread === null) {
    throw new WorkflowModelError("WORKFLOW_CONTRACT_INVALID", "collaboration thread must exist before append");
  }
  const thread = storedThread.record;
  if (thread.lifecycle_state !== "OPEN") {
    throw new WorkflowModelError("WORKFLOW_CONTRACT_INVALID", "only OPEN collaboration threads accept new entries");
  }
  if (thread.head_sequence !== input.expected_thread_head_sequence) {
    throw new WorkflowModelError("WORKFLOW_STALE_VERSION", "collaboration thread head sequence is stale");
  }

  const entryInput: CollaborationEntryInput = {
    actor_ref: input.actor_ref,
    attachment_refs: input.attachment_refs === undefined ? [] : [...input.attachment_refs],
    audit_event_ref: input.audit_event_ref,
    body_ref: input.body_ref,
    causal_parent_entry_ref: input.causal_parent_entry_ref,
    command_id: input.command_id,
    command_receipt_ref: input.command_receipt_ref,
    created_at: input.created_at,
    entry_type: input.entry_type,
    item_id: thread.item_id,
    redaction_state: input.redaction_state,
    request_info_ref: input.request_info_ref,
    semantic_action_id: input.semantic_action_id,
    thread_id: thread.thread_id,
    thread_sequence: thread.head_sequence + 1,
    visibility_class: input.visibility_class ?? thread.visibility_class,
  };
  const entry = buildCollaborationEntry(entryInput);
  const parent =
    entry.causal_parent_entry_ref === null
      ? null
      : await input.entry_repository.getCollaborationEntryById(entry.causal_parent_entry_ref);
  validateCollaborationEntryVisibility({
    attachment_visibility_by_ref: input.attachment_visibility_by_ref,
    entry,
    parent_entry: parent?.record ?? null,
    request_prompt_entry_ref: input.request_prompt_entry_ref,
    thread,
  });
  const updatedThread = projectThreadHeadUpdate({ entry, thread });
  await input.entry_repository.persistCollaborationEntry({ entry });
  await input.thread_repository.persistCollaborationThread({
    expected_head_sequence: thread.head_sequence,
    thread: updatedThread,
  });
  return {
    duplicate_replay: false,
    entry,
    thread_head_sequence: updatedThread.head_sequence,
  };
}
