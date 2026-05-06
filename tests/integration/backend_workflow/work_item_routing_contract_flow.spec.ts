import { expect, test } from "@playwright/test";

import {
  assertValidCollaborationRoutingContract,
  buildCollaborationRoutingContract,
  buildWorkflowItem,
  normalizeWorkflowItem,
  rankWorkQueueItems,
  WorkflowItemRepository,
  type CollaborationRoutingAssigneeSignal,
  type CollaborationRoutingContract,
  type CollaborationRoutingQueueMetrics,
  type WorkflowItem,
} from "../../../packages/backend-workflow/src/index.ts";

const EVALUATED_AT = "2026-04-29T12:00:00Z";

const queueMetrics: CollaborationRoutingQueueMetrics = {
  arrival_rate_per_hour: 2,
  backlog_age_p90_hours: 3,
  mutating_command_attempts: 100,
  queue_health_floor: 55,
  reassignments_30d: 1,
  rejected_stale_commands: 1,
  resolution_target_hours: 24,
  resolved_30d: 90,
  service_rate_per_staff_hour: 1,
  staffed_parallelism: 6,
};

const degradedQueueMetrics: CollaborationRoutingQueueMetrics = {
  arrival_rate_per_hour: 10,
  backlog_age_p90_hours: 120,
  mutating_command_attempts: 100,
  queue_health_floor: 70,
  reassignments_30d: 40,
  rejected_stale_commands: 20,
  resolution_target_hours: 24,
  resolved_30d: 35,
  service_rate_per_staff_hour: 1,
  staffed_parallelism: 3,
};

const eligibleOwners: CollaborationRoutingAssigneeSignal[] = [
  {
    assignee_ref: "user://current-owner",
    availability_fit: 0.35,
    context_reuse: 0.4,
    queue_affinity: 0.45,
    skill_fit: 0.35,
    staffed_capacity: 2,
    weighted_open_item_load: 7,
  },
  {
    assignee_ref: "user://recommended-owner",
    availability_fit: 0.95,
    context_reuse: 0.85,
    queue_affinity: 0.95,
    skill_fit: 0.97,
    staffed_capacity: 8,
    weighted_open_item_load: 2,
  },
];

function itemInput(itemId: string, dueAt: string | null = null) {
  return {
    authority_truth_state: "CONFIRMED" as const,
    client_id: "client-0146-flow",
    current_assignee_ref: "user://current-owner",
    dedupe_key: `client-0146-flow:2026-q1:${itemId}`,
    due_at: dueAt,
    item_id: itemId,
    lifecycle_state: "IN_PROGRESS" as const,
    opened_at: "2026-04-28T09:00:00Z",
    period: "2026-Q1",
    queue_entered_at: "2026-04-28T09:00:00Z",
    routing_queue_ref: "queue://tax-ops/filings",
    tenant_id: "tenant-0146-flow",
    title: `Routing flow ${itemId}`,
    type: "ROUTING_FLOW_WORK_ITEM",
    waiting_since_at: "2026-04-28T10:00:00Z",
  };
}

function stampRouting(item: WorkflowItem, contract: CollaborationRoutingContract) {
  return normalizeWorkflowItem({
    ...item,
    assignment_efficiency_score: contract.assignment_efficiency_score,
    collaboration_priority_score: contract.collaboration_priority_score,
    escalation_pressure_score: contract.escalation_pressure_score,
    ownership_confidence_score: contract.ownership_confidence_score,
    resolution_confidence_score: contract.resolution_confidence_score,
    routing_contract: contract,
    sla_pressure_score: contract.sla_pressure_score,
  });
}

test("persists routing contracts, ranks by the canonical tuple, and keeps reassignment as a recommendation", async () => {
  const repository = new WorkflowItemRepository();
  const first = buildWorkflowItem({
    ...itemInput("workflow-item-routing-flow-a", "2026-04-30T09:00:00Z"),
    sla_due_at: "2026-04-29T16:00:00Z",
  });
  const second = buildWorkflowItem(itemInput("workflow-item-routing-flow-b", "2026-04-30T09:00:00Z"));

  const firstRouting = buildCollaborationRoutingContract({
    assignee_signals: eligibleOwners,
    evaluated_at: EVALUATED_AT,
    item: first,
    profile: { reassignment_gain_threshold: 20 },
    queue_metrics: queueMetrics,
  });
  const secondRouting = buildCollaborationRoutingContract({
    assignee_signals: eligibleOwners,
    evaluated_at: EVALUATED_AT,
    item: second,
    profile: { reassignment_gain_threshold: 20 },
    queue_metrics: queueMetrics,
  });

  const firstRouted = stampRouting(first, firstRouting.contract);
  const secondRouted = stampRouting(second, secondRouting.contract);
  await repository.persistWorkflowItem({ item: firstRouted });
  await repository.persistWorkflowItem({ item: secondRouted });

  const stored = await repository.listWorkflowItemsByQueue("queue://tax-ops/filings");
  const ranked = rankWorkQueueItems(stored.map((entry) => entry.record));

  expect(firstRouted.routing_contract.canonical_sort_key.effective_due_at_or_null).toBe(
    "2026-04-29T16:00:00Z",
  );
  expect(ranked[0]?.item_id).toBe("workflow-item-routing-flow-a");
  expect(firstRouted.current_assignee_ref).toBe("user://current-owner");
  expect(firstRouted.routing_contract.assignment_recommendation_state).toBe("REASSIGN_RECOMMENDED");
  expect(firstRouted.routing_contract.recommended_assignee_ref_or_null).toBe("user://recommended-owner");
  expect(assertValidCollaborationRoutingContract(firstRouted.routing_contract).basis_hash).toBe(
    firstRouted.routing_contract.basis_hash,
  );
});

test("profile and basis changes update routing hashes without changing the workflow item identity", () => {
  const item = buildWorkflowItem(itemInput("workflow-item-routing-flow-hash", "2026-04-30T09:00:00Z"));
  const current = buildCollaborationRoutingContract({
    assignee_signals: eligibleOwners,
    evaluated_at: EVALUATED_AT,
    item,
    queue_metrics: queueMetrics,
  });
  const replay = buildCollaborationRoutingContract({
    assignee_signals: eligibleOwners,
    evaluated_at: EVALUATED_AT,
    item,
    profile: {
      profile_version: "COLLABORATION_ROUTING_FORMULA_V1_REPLAY_2026_02_01",
      reassignment_gain_threshold: 35,
    },
    queue_metrics: queueMetrics,
  });
  const degraded = buildCollaborationRoutingContract({
    assignee_signals: eligibleOwners,
    evaluated_at: EVALUATED_AT,
    item,
    queue_metrics: degradedQueueMetrics,
  });

  expect(replay.contract.routing_profile_hash).not.toBe(current.contract.routing_profile_hash);
  expect(replay.contract.basis_hash).not.toBe(current.contract.basis_hash);
  expect(degraded.contract.basis_hash).not.toBe(current.contract.basis_hash);
  expect(stampRouting(item, degraded.contract).item_id).toBe(item.item_id);
  expect(degraded.contract.queue_health_state).not.toBe("HEALTHY");
});
