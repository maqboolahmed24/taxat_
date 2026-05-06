import { expect, test } from "@playwright/test";

import {
  assertValidCollaborationRoutingContract,
  buildCollaborationRoutingContract,
  buildWorkflowItem,
  type CollaborationRoutingAssigneeSignal,
  type CollaborationRoutingQueueMetrics,
} from "../../../packages/backend-workflow/src/index.ts";

const EVALUATED_AT = "2026-04-29T12:00:00Z";

const healthyQueue: CollaborationRoutingQueueMetrics = {
  arrival_rate_per_hour: 2,
  backlog_age_p90_hours: 2,
  mutating_command_attempts: 100,
  queue_health_floor: 55,
  reassignments_30d: 2,
  rejected_stale_commands: 1,
  resolution_target_hours: 24,
  resolved_30d: 80,
  service_rate_per_staff_hour: 1,
  staffed_parallelism: 5,
};

const degradedQueue: CollaborationRoutingQueueMetrics = {
  arrival_rate_per_hour: 9,
  backlog_age_p90_hours: 96,
  mutating_command_attempts: 100,
  queue_health_floor: 70,
  reassignments_30d: 35,
  rejected_stale_commands: 15,
  resolution_target_hours: 24,
  resolved_30d: 40,
  service_rate_per_staff_hour: 1,
  staffed_parallelism: 3,
};

const strongCurrentOwner: CollaborationRoutingAssigneeSignal[] = [
  {
    assignee_ref: "user://owner-a",
    availability_fit: 0.95,
    context_reuse: 0.95,
    queue_affinity: 0.9,
    skill_fit: 0.95,
    staffed_capacity: 8,
    weighted_open_item_load: 2,
  },
  {
    assignee_ref: "user://owner-b",
    availability_fit: 0.5,
    context_reuse: 0.3,
    queue_affinity: 0.5,
    skill_fit: 0.45,
    staffed_capacity: 4,
    weighted_open_item_load: 7,
  },
];

const weakCurrentStrongChallenger: CollaborationRoutingAssigneeSignal[] = [
  {
    assignee_ref: "user://owner-a",
    availability_fit: 0.35,
    context_reuse: 0.35,
    queue_affinity: 0.4,
    skill_fit: 0.3,
    staffed_capacity: 2,
    weighted_open_item_load: 8,
  },
  {
    assignee_ref: "user://owner-b",
    availability_fit: 0.95,
    context_reuse: 0.8,
    queue_affinity: 0.95,
    skill_fit: 0.98,
    staffed_capacity: 8,
    weighted_open_item_load: 1,
  },
];

function workflowItem(overrides: Partial<Parameters<typeof buildWorkflowItem>[0]> = {}) {
  return buildWorkflowItem({
    authority_truth_state: "CONFIRMED",
    client_id: "client-0146",
    current_assignee_ref: "user://owner-a",
    dedupe_key: `client-0146:2026-q1:${overrides.item_id ?? "routing"}`,
    item_id: "workflow-item-0146",
    lifecycle_state: "IN_PROGRESS",
    opened_at: "2026-04-27T12:00:00Z",
    period: "2026-Q1",
    queue_entered_at: "2026-04-27T12:00:00Z",
    routing_queue_ref: "queue://tax-ops/filings",
    tenant_id: "tenant-0146",
    title: "Routing formula work item",
    type: "ROUTING_FORMULA_WORK_ITEM",
    waiting_since_at: "2026-04-28T12:00:00Z",
    ...overrides,
  });
}

test("emits unbound SLA and no eligible owner when no due date or owner candidates exist", () => {
  const item = workflowItem({
    current_assignee_ref: null,
    item_id: "workflow-item-0146-no-owner",
  });
  const result = buildCollaborationRoutingContract({
    assignee_signals: [],
    evaluated_at: EVALUATED_AT,
    item,
    queue_metrics: healthyQueue,
  });

  expect(result.contract.assignment_recommendation_state).toBe("NO_ELIGIBLE_OWNER");
  expect(result.contract.recommended_assignee_ref_or_null).toBeNull();
  expect(result.contract.recommendation_reason_codes).toContain("NO_ELIGIBLE_OWNER");
  expect(result.contract.ordering_reason_codes).toContain("WORK_SLA_UNBOUND");
  expect(result.contract.sla_pressure_score).toBeGreaterThan(0);
  expect(assertValidCollaborationRoutingContract(result.contract).basis_hash).toBe(result.contract.basis_hash);
});

test("keeps a strong current owner when a challenger is below the reassignment threshold", () => {
  const item = workflowItem({ item_id: "workflow-item-0146-keep-owner" });
  const result = buildCollaborationRoutingContract({
    assignee_signals: strongCurrentOwner,
    evaluated_at: EVALUATED_AT,
    item,
    queue_metrics: healthyQueue,
  });

  expect(result.contract.assignment_recommendation_state).toBe("KEEP_CURRENT_OWNER");
  expect(result.contract.recommended_assignee_ref_or_null).toBeNull();
  expect(result.contract.assignment_efficiency_score).toBeGreaterThan(80);
});

test("recommends reassignment when challenger gain crosses the frozen threshold and preserves draft safety", () => {
  const item = workflowItem({ item_id: "workflow-item-0146-reassign" });
  const result = buildCollaborationRoutingContract({
    active_draft_lock: true,
    assignee_signals: weakCurrentStrongChallenger,
    evaluated_at: EVALUATED_AT,
    item,
    profile: { reassignment_gain_threshold: 20 },
    queue_metrics: healthyQueue,
  });

  expect(result.contract.assignment_recommendation_state).toBe("REASSIGN_RECOMMENDED");
  expect(result.contract.recommended_assignee_ref_or_null).toBe("user://owner-b");
  expect(result.contract.recommended_action_code_or_null).toBe("REASSIGN_OWNER");
  expect(result.contract.draft_safety_state).toBe("DRAFT_LOCK_PREVENTS_TRANSFER");
  expect(result.contract.recommendation_reason_codes).toContain("DRAFT_LOCK_PREVENTS_TRANSFER");
});

test("recommends escalation when pressure breaches the frozen threshold", () => {
  const item = workflowItem({
    authority_truth_state: "PENDING_ACK",
    collaboration_visibility: "CUSTOMER_SHARED",
    due_at: "2026-04-29T06:00:00Z",
    item_id: "workflow-item-0146-escalate",
    lifecycle_state: "WAITING_ON_AUTHORITY",
    waiting_since_at: "2026-04-27T12:00:00Z",
  });
  const result = buildCollaborationRoutingContract({
    assignee_signals: weakCurrentStrongChallenger,
    default_escalation_target_ref: "escalation-target://tax-ops-duty-manager",
    evaluated_at: EVALUATED_AT,
    item,
    profile: { escalation_pressure_threshold: 30, reassignment_gain_threshold: 20 },
    queue_metrics: degradedQueue,
  });

  expect(result.contract.escalation_recommendation_state).toBe("ESCALATE_RECOMMENDED");
  expect(result.contract.recommended_escalation_target_ref_or_null).toBe(
    "escalation-target://tax-ops-duty-manager",
  );
  expect(result.contract.recommendation_reason_codes).toContain("WORK_ESCALATION_PRESSURE_HIGH");
});

test("degraded queue health raises priority even when the item itself is otherwise moderate", () => {
  const item = workflowItem({ item_id: "workflow-item-0146-queue-health" });
  const healthy = buildCollaborationRoutingContract({
    assignee_signals: strongCurrentOwner,
    evaluated_at: EVALUATED_AT,
    item,
    queue_metrics: healthyQueue,
  });
  const degraded = buildCollaborationRoutingContract({
    assignee_signals: strongCurrentOwner,
    evaluated_at: EVALUATED_AT,
    item,
    queue_metrics: degradedQueue,
  });

  expect(degraded.contract.queue_health_state).not.toBe("HEALTHY");
  expect(degraded.contract.collaboration_priority_score).toBeGreaterThan(
    healthy.contract.collaboration_priority_score,
  );
  expect(degraded.contract.basis_hash).not.toBe(healthy.contract.basis_hash);
});

test("routing profile changes and historical profile replay produce distinct hashes", () => {
  const item = workflowItem({ item_id: "workflow-item-0146-profile-hash" });
  const current = buildCollaborationRoutingContract({
    assignee_signals: strongCurrentOwner,
    evaluated_at: EVALUATED_AT,
    item,
    queue_metrics: healthyQueue,
  });
  const replay = buildCollaborationRoutingContract({
    assignee_signals: strongCurrentOwner,
    evaluated_at: EVALUATED_AT,
    item,
    profile: {
      profile_version: "COLLABORATION_ROUTING_FORMULA_V1_REPLAY_2026_01_01",
      reassignment_gain_threshold: 30,
    },
    queue_metrics: healthyQueue,
  });

  expect(replay.routing_profile_hash).not.toBe(current.routing_profile_hash);
  expect(replay.contract.basis_hash).not.toBe(current.contract.basis_hash);
  expect(assertValidCollaborationRoutingContract(replay.contract).routing_profile_code).toBe(
    "COLLABORATION_ROUTING_FORMULA_V1",
  );
});
