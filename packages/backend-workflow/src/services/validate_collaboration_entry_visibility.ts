import type { CollaborationEntry } from "../models/collaboration_entry.ts";
import { normalizeCollaborationEntry } from "../models/collaboration_entry.ts";
import type { CollaborationThread, CollaborationVisibilityClass } from "../models/collaboration_thread.ts";
import { normalizeCollaborationThread } from "../models/collaboration_thread.ts";
import { WorkflowModelError } from "../models/workflow_item.ts";

export type AttachmentVisibilityLookup =
  | ReadonlyMap<string, CollaborationVisibilityClass>
  | Record<string, CollaborationVisibilityClass>;

function attachmentVisibility(
  lookup: AttachmentVisibilityLookup | undefined,
  attachmentRef: string,
) {
  if (lookup === undefined) {
    return undefined;
  }
  const maybeMap = lookup as ReadonlyMap<string, CollaborationVisibilityClass>;
  if (typeof maybeMap.get === "function") {
    return maybeMap.get(attachmentRef);
  }
  return (lookup as Record<string, CollaborationVisibilityClass>)[attachmentRef];
}

export function validateCollaborationEntryVisibility(input: {
  attachment_visibility_by_ref?: AttachmentVisibilityLookup | undefined;
  entry: CollaborationEntry;
  parent_entry?: CollaborationEntry | null | undefined;
  request_prompt_entry_ref?: string | null | undefined;
  thread: CollaborationThread;
}) {
  const thread = normalizeCollaborationThread(input.thread);
  const entry = normalizeCollaborationEntry(input.entry);
  const parent = input.parent_entry == null ? null : normalizeCollaborationEntry(input.parent_entry);

  if (
    entry.thread_id !== thread.thread_id ||
    entry.item_id !== thread.item_id ||
    entry.visibility_class !== thread.visibility_class
  ) {
    throw new WorkflowModelError(
      "WORKFLOW_CONTRACT_INVALID",
      "collaboration entry must match its thread id, item id, and visibility class",
    );
  }
  if (entry.causal_parent_entry_ref !== null) {
    if (parent === null || parent.entry_id !== entry.causal_parent_entry_ref) {
      throw new WorkflowModelError(
        "WORKFLOW_CONTRACT_INVALID",
        "causal_parent_entry_ref must bind to the exact existing parent entry",
      );
    }
    if (parent.item_id !== entry.item_id) {
      throw new WorkflowModelError(
        "WORKFLOW_CONTRACT_INVALID",
        "causal parent entry must belong to the same work item",
      );
    }
    if (entry.visibility_class === "CUSTOMER_VISIBLE" && parent.visibility_class !== "CUSTOMER_VISIBLE") {
      throw new WorkflowModelError(
        "WORKFLOW_CONTRACT_INVALID",
        "customer-visible entries must not point to internal-only parent entries",
      );
    }
  } else if (parent !== null) {
    throw new WorkflowModelError(
      "WORKFLOW_CONTRACT_INVALID",
      "parent entries must not be supplied without causal_parent_entry_ref",
    );
  }

  if (entry.entry_type === "REQUEST_INFO_RESPONSE") {
    if (input.request_prompt_entry_ref === null || input.request_prompt_entry_ref === undefined) {
      throw new WorkflowModelError(
        "WORKFLOW_CONTRACT_INVALID",
        "REQUEST_INFO_RESPONSE requires the exact prompt entry ref for request binding",
      );
    }
    if (entry.causal_parent_entry_ref !== input.request_prompt_entry_ref) {
      throw new WorkflowModelError(
        "WORKFLOW_CONTRACT_INVALID",
        "REQUEST_INFO_RESPONSE causal_parent_entry_ref must equal RequestInfoRecord.prompt_entry_ref",
      );
    }
    if (parent?.request_info_ref !== entry.request_info_ref) {
      throw new WorkflowModelError(
        "WORKFLOW_CONTRACT_INVALID",
        "REQUEST_INFO_RESPONSE request_info_ref must match the prompt entry request_info_ref",
      );
    }
  }

  for (const attachmentRef of entry.attachment_refs) {
    const visibility = attachmentVisibility(input.attachment_visibility_by_ref, attachmentRef);
    if (visibility !== undefined && entry.visibility_class === "CUSTOMER_VISIBLE" && visibility !== "CUSTOMER_VISIBLE") {
      throw new WorkflowModelError(
        "WORKFLOW_CONTRACT_INVALID",
        "customer-visible entries must not point to internal-only attachments",
      );
    }
  }

  return { entry, parent, thread };
}
