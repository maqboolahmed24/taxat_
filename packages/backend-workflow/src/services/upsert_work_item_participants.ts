import {
  buildWorkItemParticipant,
  isCustomerParticipantRole,
  type WorkItemParticipant,
  type WorkItemParticipantInput,
} from "../models/work_item_participant.ts";
import { normalizeWorkflowItem, type WorkflowItem, WorkflowModelError } from "../models/workflow_item.ts";
import type { WorkItemParticipantRepository } from "../repositories/work_item_participant_repository.ts";
import { validateCustomerParticipantMapping } from "./validate_customer_participant_mapping.ts";

export type UpsertWorkItemParticipantsInput = {
  item: WorkflowItem;
  participants: readonly WorkItemParticipantInput[];
  repository: WorkItemParticipantRepository;
};

export type UpsertWorkItemParticipantsResult = {
  changed_participant_refs: string[];
  participants: WorkItemParticipant[];
  removed_customer_participant_refs: string[];
};

export async function upsertWorkItemParticipants(
  input: UpsertWorkItemParticipantsInput,
): Promise<UpsertWorkItemParticipantsResult> {
  const item = normalizeWorkflowItem(input.item);
  const existing = await input.repository.listWorkItemParticipantsByItem(item.item_id);
  const removedCustomerParticipantRefs: string[] = [];

  for (const stored of existing) {
    if (stored.record.watch_state === "CUSTOMER_PARTICIPANT" && item.collaboration_visibility === "INTERNAL_ONLY") {
      await input.repository.deleteWorkItemParticipant({
        item_id: item.item_id,
        participant_ref: stored.participant_ref,
      });
      removedCustomerParticipantRefs.push(stored.participant_ref);
    }
  }

  const built = input.participants.map((participant) =>
    buildWorkItemParticipant({
      ...participant,
      item_id: item.item_id,
      last_read_internal_sequence: isCustomerParticipantRole(participant.participant_role)
        ? null
        : participant.last_read_internal_sequence,
    }),
  );
  if (
    item.collaboration_visibility === "INTERNAL_ONLY" &&
    built.some((participant) => participant.watch_state === "CUSTOMER_PARTICIPANT")
  ) {
    throw new WorkflowModelError(
      "WORKFLOW_CONTRACT_INVALID",
      "internal-only workflow items cannot upsert customer participant rows",
    );
  }
  validateCustomerParticipantMapping({
    item_id: item.item_id,
    item_visibility: item.collaboration_visibility,
    participants: built,
  });

  const changedParticipantRefs: string[] = [];
  for (const participant of built) {
    const result = await input.repository.upsertWorkItemParticipant({ participant });
    if (result.changed) {
      changedParticipantRefs.push(participant.participant_ref);
    }
  }
  const finalRows = (await input.repository.listWorkItemParticipantsByItem(item.item_id)).map(
    (stored) => stored.record,
  );
  return {
    changed_participant_refs: changedParticipantRefs.sort(),
    participants: finalRows,
    removed_customer_participant_refs: removedCustomerParticipantRefs.sort(),
  };
}
