import {
  isCustomerParticipantRole,
  normalizeWorkItemParticipant,
  type WorkItemParticipant,
} from "../models/work_item_participant.ts";
import type { WorkflowItemVisibility } from "../models/workflow_item.ts";
import { WorkflowModelError } from "../models/workflow_item.ts";

export type CustomerParticipantMappingScope = "COMMAND_SIDE" | "CUSTOMER_VISIBLE_PROJECTION";

export function validateCustomerParticipantMapping(input: {
  item_id: string;
  item_visibility: WorkflowItemVisibility;
  participants: readonly WorkItemParticipant[];
  scope?: CustomerParticipantMappingScope | undefined;
}) {
  const scope = input.scope ?? "COMMAND_SIDE";
  const participants = input.participants.map(normalizeWorkItemParticipant);
  for (const participant of participants) {
    if (participant.item_id !== input.item_id) {
      throw new WorkflowModelError(
        "WORKFLOW_CONTRACT_INVALID",
        "participant rows must belong to the same workflow item",
      );
    }
    const isCustomer = participant.watch_state === "CUSTOMER_PARTICIPANT";
    if (input.item_visibility === "INTERNAL_ONLY" && isCustomer) {
      throw new WorkflowModelError(
        "WORKFLOW_CONTRACT_INVALID",
        "internal-only workflow items must not retain customer participant rows",
      );
    }
    if (isCustomer && !isCustomerParticipantRole(participant.participant_role)) {
      throw new WorkflowModelError(
        "WORKFLOW_CONTRACT_INVALID",
        "customer participant rows must use lawful customer-facing roles",
      );
    }
    if (scope === "CUSTOMER_VISIBLE_PROJECTION" && !isCustomer) {
      throw new WorkflowModelError(
        "WORKFLOW_CONTRACT_INVALID",
        "customer-visible participant projections may expose only customer participants",
      );
    }
  }
  return participants;
}
