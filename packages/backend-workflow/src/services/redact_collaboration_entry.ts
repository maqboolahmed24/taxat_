import { WorkflowModelError } from "../models/workflow_item.ts";
import type { CollaborationEntryRepository } from "../repositories/collaboration_entry_repository.ts";
import type { CollaborationThreadRepository } from "../repositories/collaboration_thread_repository.ts";
import { appendCollaborationEntry } from "./append_collaboration_entry.ts";

export async function redactCollaborationEntry(input: {
  actor_ref: string;
  audit_event_ref?: string | undefined;
  command_id: string;
  command_receipt_ref?: string | undefined;
  created_at: string;
  entry_repository: CollaborationEntryRepository;
  expected_thread_head_sequence: number;
  original_entry_id: string;
  redaction_body_ref: string;
  semantic_action_id?: string | undefined;
  thread_repository: CollaborationThreadRepository;
}) {
  const original = await input.entry_repository.getCollaborationEntryById(input.original_entry_id);
  if (original === null) {
    throw new WorkflowModelError("WORKFLOW_CONTRACT_INVALID", "redaction target entry must exist");
  }

  return appendCollaborationEntry({
    actor_ref: input.actor_ref,
    audit_event_ref: input.audit_event_ref,
    body_ref: input.redaction_body_ref,
    causal_parent_entry_ref: original.record.entry_id,
    command_id: input.command_id,
    command_receipt_ref: input.command_receipt_ref,
    created_at: input.created_at,
    entry_repository: input.entry_repository,
    entry_type: "SYSTEM",
    expected_thread_head_sequence: input.expected_thread_head_sequence,
    redaction_state: "REDACTED",
    semantic_action_id: input.semantic_action_id,
    thread_id: original.record.thread_id,
    thread_repository: input.thread_repository,
    visibility_class: original.record.visibility_class,
  });
}
