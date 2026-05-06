import { WorkflowModelError } from "../models/workflow_item.ts";
import {
  validateWorkInboxDelta,
  type WorkInboxDelta,
  type WorkInboxDeltaBadgeUpdate,
  type WorkInboxDeltaRowRemoval,
  type WorkInboxDeltaRowUpsert,
} from "./build_work_inbox_delta.ts";

export function coalesceWorkInboxDeltas(deltas: readonly WorkInboxDelta[]): WorkInboxDelta | null {
  if (deltas.length === 0) {
    return null;
  }
  const sorted = [...deltas].sort(
    (left, right) =>
      left.inbox_sequence - right.inbox_sequence ||
      left.occurred_at.localeCompare(right.occurred_at) ||
      String(left.causal_semantic_action_id).localeCompare(String(right.causal_semantic_action_id)),
  );
  const base = sorted.at(-1)!;
  const seenCausalActions = new Set<string>();
  const upserts = new Map<string, WorkInboxDeltaRowUpsert>();
  const removals = new Map<string, WorkInboxDeltaRowRemoval>();
  const badges = new Map<string, WorkInboxDeltaBadgeUpdate>();

  for (const delta of sorted) {
    validateWorkInboxDelta(delta);
    if (delta.tenant_id !== base.tenant_id || delta.inbox_route_key !== base.inbox_route_key) {
      throw new WorkflowModelError("WORKFLOW_CONTRACT_INVALID", "cannot coalesce deltas across inbox scopes");
    }
    if (delta.causal_semantic_action_id !== null) {
      if (seenCausalActions.has(delta.causal_semantic_action_id)) {
        continue;
      }
      seenCausalActions.add(delta.causal_semantic_action_id);
    }
    for (const removal of delta.row_removals) {
      removals.set(removal.item_id, removal);
      if (
        removal.removal_cause !== "FILTER_EXIT" ||
        removal.preserve_until_focus_exit !== true
      ) {
        upserts.delete(removal.item_id);
      }
    }
    for (const upsert of delta.row_upserts) {
      upserts.set(upsert.item_id, upsert);
      const removal = removals.get(upsert.item_id);
      if (
        removal !== undefined &&
        (removal.removal_cause !== "FILTER_EXIT" ||
          !removal.preserve_until_focus_exit ||
          removal.queue_projection_basis_hash !== upsert.queue_projection_basis_hash ||
          upsert.row.queue_projection.focus_continuity_state !== "PENDING_REMOVAL_UNTIL_FOCUS_EXIT")
      ) {
        removals.delete(upsert.item_id);
      }
    }
    for (const badge of delta.badge_updates) {
      badges.set(badge.item_id, badge);
    }
  }

  const coalesced: WorkInboxDelta = {
    ...base,
    badge_updates: [...badges.values()].sort((left, right) => left.item_id.localeCompare(right.item_id)),
    delivery_class: base.delivery_class === "SNAPSHOT" ? "SNAPSHOT" : "CATCH_UP",
    row_removals: [...removals.values()].sort((left, right) => left.item_id.localeCompare(right.item_id)),
    row_upserts: [...upserts.values()].sort((left, right) => left.item_id.localeCompare(right.item_id)),
  };
  validateWorkInboxDelta(coalesced);
  return coalesced;
}
