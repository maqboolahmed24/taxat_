import { normalizeNullableRoutingTimestamp, normalizeRoutingTimestamp } from "../models/collaboration_routing_contract.ts";
import type { WorkflowRoutingContract } from "../models/workflow_item.ts";

export type CanonicalRoutingSortKey = WorkflowRoutingContract["canonical_sort_key"];

function compareNullableInstantAsc(left: string | null, right: string | null) {
  if (left === null && right === null) {
    return 0;
  }
  if (left === null) {
    return 1;
  }
  if (right === null) {
    return -1;
  }
  return left.localeCompare(right);
}

export function normalizeCanonicalRoutingSortKey(
  key: CanonicalRoutingSortKey,
): CanonicalRoutingSortKey {
  return {
    collaboration_priority_score: key.collaboration_priority_score,
    effective_due_at_or_null: normalizeNullableRoutingTimestamp(
      "canonical_sort_key.effective_due_at_or_null",
      key.effective_due_at_or_null,
    ),
    escalation_rank: key.escalation_rank,
    item_id: key.item_id,
    queue_entered_at: normalizeRoutingTimestamp("canonical_sort_key.queue_entered_at", key.queue_entered_at),
    resolution_confidence_score: key.resolution_confidence_score,
  };
}

export function compareCanonicalRoutingSortKeys(
  left: CanonicalRoutingSortKey,
  right: CanonicalRoutingSortKey,
) {
  const normalizedLeft = normalizeCanonicalRoutingSortKey(left);
  const normalizedRight = normalizeCanonicalRoutingSortKey(right);
  return (
    normalizedRight.collaboration_priority_score - normalizedLeft.collaboration_priority_score ||
    normalizedRight.escalation_rank - normalizedLeft.escalation_rank ||
    compareNullableInstantAsc(
      normalizedLeft.effective_due_at_or_null,
      normalizedRight.effective_due_at_or_null,
    ) ||
    normalizedLeft.resolution_confidence_score - normalizedRight.resolution_confidence_score ||
    normalizedLeft.queue_entered_at.localeCompare(normalizedRight.queue_entered_at) ||
    normalizedLeft.item_id.localeCompare(normalizedRight.item_id)
  );
}

export function serializeCanonicalRoutingSortKey(key: CanonicalRoutingSortKey) {
  const normalized = normalizeCanonicalRoutingSortKey(key);
  return JSON.stringify({
    collaboration_priority_score: normalized.collaboration_priority_score,
    escalation_rank: normalized.escalation_rank,
    effective_due_at_or_null: normalized.effective_due_at_or_null,
    resolution_confidence_score: normalized.resolution_confidence_score,
    queue_entered_at: normalized.queue_entered_at,
    item_id: normalized.item_id,
  });
}
