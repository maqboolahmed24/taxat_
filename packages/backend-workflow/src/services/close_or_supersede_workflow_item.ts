import {
  normalizeWorkflowItem,
  type WorkflowItem,
  type WorkflowItemInput,
  WorkflowModelError,
} from "../models/workflow_item.ts";
import { WorkflowItemRepository } from "../repositories/workflow_item_repository.ts";
import { advanceWorkflowItem } from "./advance_workflow_item.ts";
import { openOrReuseWorkflowItem } from "./open_or_reuse_workflow_item.ts";

export type CloseOrSupersedeWorkflowItemResult = {
  closed_item: WorkflowItem;
  closed_row_version: number;
  successor_item: WorkflowItem | null;
  successor_reused: boolean;
};

export async function closeOrSupersedeWorkflowItem(input: {
  item_id: string;
  repository: WorkflowItemRepository;
  successor?: WorkflowItemInput | undefined;
  transition_applied_at: string;
  transition_audit_ref: string;
  terminal_state: "DONE" | "CANCELLED" | "STALE";
}) {
  const stored = await input.repository.getWorkflowItemById(input.item_id);
  if (stored === null) {
    throw new WorkflowModelError("WORKFLOW_CONTRACT_INVALID", `workflow item ${input.item_id} was not found`);
  }
  const transition_event_code =
    input.terminal_state === "DONE"
      ? "resolved"
      : input.terminal_state === "CANCELLED"
        ? "no_longer_relevant"
        : "superseded_by_new_context";
  const closed = advanceWorkflowItem({
    item: stored.record,
    to_state: input.terminal_state,
    transition_applied_at: input.transition_applied_at,
    transition_audit_ref: input.transition_audit_ref,
    transition_event_code,
  });
  const closedStored = await input.repository.persistWorkflowItem({
    expected_staff_workspace_version: stored.record.staff_workspace_version,
    item: closed,
  });
  if (input.successor === undefined) {
    return {
      closed_item: normalizeWorkflowItem(closedStored.record),
      closed_row_version: closedStored.row_version,
      successor_item: null,
      successor_reused: false,
    } satisfies CloseOrSupersedeWorkflowItemResult;
  }
  if (input.terminal_state !== "STALE") {
    throw new WorkflowModelError(
      "WORKFLOW_CONTRACT_INVALID",
      "successor workflow items are only accepted when the previous item is marked STALE",
    );
  }
  const successor = await openOrReuseWorkflowItem({
    ...input.successor,
    repository: input.repository,
  });
  return {
    closed_item: normalizeWorkflowItem(closedStored.record),
    closed_row_version: closedStored.row_version,
    successor_item: successor.item,
    successor_reused: successor.reused,
  } satisfies CloseOrSupersedeWorkflowItemResult;
}
