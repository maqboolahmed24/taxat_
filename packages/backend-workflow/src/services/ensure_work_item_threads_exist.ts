import {
  buildCollaborationThread,
  requiredThreadVisibilitiesForWorkflowItem,
  type CollaborationThread,
  type CollaborationVisibilityClass,
} from "../models/collaboration_thread.ts";
import { normalizeWorkflowItem, type WorkflowItem, WorkflowModelError } from "../models/workflow_item.ts";
import type { CollaborationThreadRepository } from "../repositories/collaboration_thread_repository.ts";

function threadIdFromItem(item: WorkflowItem, visibilityClass: CollaborationVisibilityClass) {
  if (visibilityClass === "CUSTOMER_VISIBLE") {
    if (item.customer_thread_ref === null) {
      throw new WorkflowModelError(
        "WORKFLOW_CONTRACT_INVALID",
        "CUSTOMER_SHARED workflow items require customer_thread_ref before customer thread bootstrap",
      );
    }
    return item.customer_thread_ref;
  }
  return item.internal_thread_ref;
}

function defaultParticipants(input: {
  item: WorkflowItem;
  staff_participant_refs?: readonly string[] | undefined;
  customer_participant_refs?: readonly string[] | undefined;
  visibility_class: CollaborationVisibilityClass;
}) {
  if (input.visibility_class === "CUSTOMER_VISIBLE") {
    return [...(input.customer_participant_refs ?? [`client://${input.item.client_id}`])];
  }
  return [...(input.staff_participant_refs ?? [input.item.current_assignee_ref ?? "staff://unassigned-work-queue"])];
}

export async function ensureWorkItemThreadsExist(input: {
  customer_participant_refs?: readonly string[] | undefined;
  item: WorkflowItem;
  staff_participant_refs?: readonly string[] | undefined;
  thread_repository: CollaborationThreadRepository;
}) {
  const item = normalizeWorkflowItem(input.item);
  const ensured: CollaborationThread[] = [];

  for (const visibilityClass of requiredThreadVisibilitiesForWorkflowItem(item)) {
    const existing = await input.thread_repository.getCollaborationThreadForItem({
      item_id: item.item_id,
      visibility_class: visibilityClass,
    });
    if (existing !== null) {
      ensured.push(existing.record);
      continue;
    }
    const thread = buildCollaborationThread({
      item_id: item.item_id,
      participant_refs: defaultParticipants({
        customer_participant_refs: input.customer_participant_refs,
        item,
        staff_participant_refs: input.staff_participant_refs,
        visibility_class: visibilityClass,
      }),
      thread_id: threadIdFromItem(item, visibilityClass),
      visibility_class: visibilityClass,
    });
    const stored = await input.thread_repository.persistCollaborationThread({ thread });
    ensured.push(stored.record);
  }

  if (item.collaboration_visibility === "INTERNAL_ONLY") {
    const customerThread = await input.thread_repository.getCollaborationThreadForItem({
      item_id: item.item_id,
      visibility_class: "CUSTOMER_VISIBLE",
    });
    if (customerThread !== null) {
      throw new WorkflowModelError(
        "WORKFLOW_CONTRACT_INVALID",
        "INTERNAL_ONLY workflow items must not retain CUSTOMER_VISIBLE collaboration threads",
      );
    }
  }

  return ensured.sort((left, right) => left.visibility_class.localeCompare(right.visibility_class));
}
