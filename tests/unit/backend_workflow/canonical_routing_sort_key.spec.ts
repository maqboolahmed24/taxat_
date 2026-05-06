import { expect, test } from "@playwright/test";

import {
  compareCanonicalRoutingSortKeys,
  rankWorkQueueItems,
  serializeCanonicalRoutingSortKey,
  type WorkflowRoutingContract,
} from "../../../packages/backend-workflow/src/index.ts";

function sortKey(
  overrides: Partial<WorkflowRoutingContract["canonical_sort_key"]> = {},
): WorkflowRoutingContract["canonical_sort_key"] {
  return {
    collaboration_priority_score: 70,
    effective_due_at_or_null: "2026-04-30T09:00:00Z",
    escalation_rank: 20,
    item_id: "workflow-item-a",
    queue_entered_at: "2026-04-29T09:00:00Z",
    resolution_confidence_score: 60,
    ...overrides,
  };
}

function contract(
  overrides: Partial<WorkflowRoutingContract["canonical_sort_key"]> = {},
): WorkflowRoutingContract {
  const key = sortKey(overrides);
  return {
    assignment_efficiency_score: 80,
    assignment_recommendation_state: "KEEP_CURRENT_OWNER",
    basis_hash: "hash.test",
    canonical_sort_key: key,
    collaboration_priority_score: key.collaboration_priority_score,
    contract_version: "COLLABORATION_ROUTING_V1",
    draft_safety_state: "NO_DRAFT_LOCK",
    escalation_pressure_score: 10,
    escalation_pressure_threshold: 70,
    escalation_rank: key.escalation_rank,
    escalation_recommendation_state: "NO_ESCALATION",
    focused_row_reorder_state: "APPLY_IMMEDIATELY",
    ordering_reason_codes: ["CANONICAL_PRIORITY_TUPLE"],
    ownership_confidence_score: 80,
    queue_health_floor: 50,
    queue_health_score: 90,
    queue_health_state: "HEALTHY",
    queue_pressure_score: 10,
    reassignment_gain_threshold: 25,
    recommendation_reason_codes: [],
    recommended_action_code_or_null: null,
    recommended_assignee_ref_or_null: null,
    recommended_escalation_target_ref_or_null: null,
    resolution_confidence_floor: 50,
    resolution_confidence_score: key.resolution_confidence_score,
    routing_profile_code: "COLLABORATION_ROUTING_FORMULA_V1",
    routing_profile_hash: "hash.profile",
    routing_queue_ref: "queue://tax-ops/filings",
    routing_scope: "WORKFLOW_ITEM",
    sla_pressure_score: 10,
  };
}

test("orders by the frozen collaboration routing tuple", () => {
  const ranked = rankWorkQueueItems([
    contract({ item_id: "f", resolution_confidence_score: 61 }),
    contract({ effective_due_at_or_null: null, item_id: "e" }),
    contract({ effective_due_at_or_null: "2026-04-30T08:00:00Z", item_id: "b" }),
    contract({ escalation_rank: 21, item_id: "a" }),
    contract({ item_id: "d", queue_entered_at: "2026-04-29T08:00:00Z" }),
    contract({ item_id: "c", resolution_confidence_score: 59 }),
    contract({ collaboration_priority_score: 71, item_id: "top" }),
  ]);

  expect(ranked.map((entry) => entry.canonical_sort_key.item_id)).toEqual([
    "top",
    "a",
    "b",
    "c",
    "d",
    "f",
    "e",
  ]);
});

test("places null due dates last and falls through to item id when numerical scores match", () => {
  expect(
    compareCanonicalRoutingSortKeys(
      sortKey({ effective_due_at_or_null: "2026-04-30T08:00:00Z", item_id: "early" }),
      sortKey({ effective_due_at_or_null: null, item_id: "null-due" }),
    ),
  ).toBeLessThan(0);
  expect(
    compareCanonicalRoutingSortKeys(sortKey({ item_id: "a" }), sortKey({ item_id: "b" })),
  ).toBeLessThan(0);
});

test("serializes the canonical sort key byte-stably", () => {
  const key = sortKey({ item_id: "workflow-item-stable" });

  expect(serializeCanonicalRoutingSortKey(key)).toBe(serializeCanonicalRoutingSortKey({ ...key }));
  expect(serializeCanonicalRoutingSortKey(key)).toBe(
    '{"collaboration_priority_score":70,"escalation_rank":20,"effective_due_at_or_null":"2026-04-30T09:00:00Z","resolution_confidence_score":60,"queue_entered_at":"2026-04-29T09:00:00Z","item_id":"workflow-item-stable"}',
  );
});
