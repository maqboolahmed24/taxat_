import { WorkflowModelError } from "../models/workflow_item.ts";

export type WorkInboxSelectableRow = {
  focus_anchor_ref: string;
  item_id: string;
};

export type WorkInboxSelectionState = {
  selected_focus_anchor_ref_or_null: string | null;
  selected_item_ref: string | null;
};

export function deriveWorkInboxSelectionState(input: {
  requested_selected_item_ref?: string | null | undefined;
  rows: readonly WorkInboxSelectableRow[];
}): WorkInboxSelectionState {
  const selectedItemRef = input.requested_selected_item_ref ?? null;
  if (selectedItemRef === null) {
    return {
      selected_focus_anchor_ref_or_null: null,
      selected_item_ref: null,
    };
  }
  const selectedRow = input.rows.find((row) => row.item_id === selectedItemRef);
  if (selectedRow === undefined) {
    throw new WorkflowModelError(
      "WORKFLOW_CONTRACT_INVALID",
      "selected inbox row must be present in the returned snapshot rows",
    );
  }
  return {
    selected_focus_anchor_ref_or_null: selectedRow.focus_anchor_ref,
    selected_item_ref: selectedRow.item_id,
  };
}
