import { expect, test } from "@playwright/test";

import {
  buildWorkflowItem,
  buildWorkInboxSnapshot,
  buildWorkQueueHealthContract,
  computeWorkQueueHealth,
  validateWorkQueueHealthContract,
  WorkflowModelError,
  workQueueHealthContractBasisHash,
} from "../../../packages/backend-workflow/src/index.ts";

test("builds a schema-shaped queue health contract with canonical basis hash", () => {
  const health = computeWorkQueueHealth({
    arrival_rate_q: 1,
    backlog_age_p90_hours_q: 6,
    queue_health_floor: 55,
    reassignment_churn_q: 0.01,
    resolution_target_hours_q: 24,
    routing_queue_ref: "queue://tax-ops/filings",
    service_rate_q: 1,
    staffed_parallelism_q: 5,
    stale_view_rejection_rate_q: 0,
  });
  const contract = buildWorkQueueHealthContract({
    health_computation: health,
    queue_route_key: "/work/inbox",
    routing_profile_hash: "routing-profile-hash-0156",
  });

  expect(contract.contract_version).toBe("WORK_QUEUE_HEALTH_V1");
  expect(contract.queue_scope).toBe("WORK_INBOX_SNAPSHOT");
  expect(contract.routing_profile_code).toBe("COLLABORATION_ROUTING_FORMULA_V1");
  expect(contract.basis_hash).toBe(workQueueHealthContractBasisHash(contract));
  expect(validateWorkQueueHealthContract(contract)).toEqual(contract);
});

test("fails closed on hash drift and below-floor intervention drift", () => {
  const contract = buildWorkQueueHealthContract({
    queue_health_floor: 80,
    queue_health_score: 40,
    queue_route_key: "/work/inbox",
    reason_codes: ["WORK_QUEUE_HEALTH_DEGRADED"],
    routing_profile_hash: "routing-profile-hash-0156",
  });

  expect(contract.intervention_recommendation_state).not.toBe("NONE");
  expect(() =>
    validateWorkQueueHealthContract({
      ...contract,
      basis_hash: "sha256:drift",
    }),
  ).toThrow(WorkflowModelError);
  expect(() =>
    validateWorkQueueHealthContract({
      ...contract,
      basis_hash: workQueueHealthContractBasisHash({
        ...contract,
        intervention_recommendation_state: "NONE",
      }),
      intervention_recommendation_state: "NONE",
    }),
  ).toThrow(WorkflowModelError);
});

test("work inbox snapshot mirrors published queue health into row routing contracts", () => {
  const contract = buildWorkQueueHealthContract({
    queue_health_floor: 70,
    queue_health_score: 42,
    queue_route_key: "/work/inbox",
    reason_codes: ["WORK_QUEUE_HEALTH_DEGRADED", "QUEUE_REBALANCE_RECOMMENDED"],
    routing_profile_hash: "routing-profile-hash-0156",
  });
  const item = {
    authority_truth_state: "CONFIRMED",
    client_id: "client-0156",
    current_assignee_ref: "user://staff-owner",
    dedupe_key: "client-0156:queue-health",
    item_id: "workflow-item-0156",
    lifecycle_state: "IN_PROGRESS",
    opened_at: "2026-05-01T08:00:00Z",
    period: "2026-Q1",
    queue_entered_at: "2026-05-01T08:00:00Z",
    routing_queue_ref: "queue://tax-ops/filings",
    tenant_id: "tenant-0156",
    title: "Queue health mirror item",
    type: "QUEUE_HEALTH_TEST",
    waiting_on_actor: "STAFF",
    waiting_since_at: "2026-05-01T08:00:00Z",
  } as const;

  const snapshot = buildWorkInboxSnapshot({
    access_binding_hash: "access-0156",
    items: [buildWorkflowItem(item)],
    masking_posture_fingerprint: "mask-0156",
    queue_health_contract: contract,
    tenant_id: "tenant-0156",
  });

  expect(snapshot.queue_health_contract).toEqual(contract);
  expect(snapshot.rows[0]!.queue_projection.routing_contract.queue_health_score).toBe(
    contract.queue_health_score,
  );
  expect(snapshot.rows[0]!.queue_projection.routing_contract.queue_pressure_score).toBe(
    contract.queue_pressure_score,
  );
});
