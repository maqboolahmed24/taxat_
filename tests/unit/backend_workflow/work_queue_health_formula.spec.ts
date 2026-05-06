import { expect, test } from "@playwright/test";

import {
  computeWorkQueueHealth,
  deriveQueueInterventionRecommendation,
} from "../../../packages/backend-workflow/src/index.ts";

const healthyInput = {
  arrival_rate_q: 1.2,
  backlog_age_p90_hours_q: 5,
  queue_health_floor: 60,
  reassignment_churn_q: 0.02,
  resolution_target_hours_q: 24,
  routing_queue_ref: "queue://tax-ops/filings",
  service_rate_q: 0.8,
  staffed_parallelism_q: 4,
  stale_view_rejection_rate_q: 0.01,
};

test("computes Erlang C queue health with deterministic score and pressure", () => {
  const health = computeWorkQueueHealth(healthyInput);

  expect(health.p_wait_q).toBeGreaterThanOrEqual(0);
  expect(health.p_wait_q).toBeLessThan(1);
  expect(health.expected_wait_hours_q).not.toBe("POSITIVE_INFINITY");
  expect(health.queue_health_score_q).toBeGreaterThanOrEqual(health.queue_health_floor);
  expect(health.queue_pressure_score_q).toBe(100 - health.queue_health_score_q);
  expect(health.queue_health_state).toBe("HEALTHY");
  expect(health.reason_codes).toContain("QUEUE_HEALTH_WITHIN_TARGET");
});

test("zero staffing and zero service force positive-infinity wait semantics without instability", () => {
  const health = computeWorkQueueHealth({
    ...healthyInput,
    service_rate_q: 0,
    staffed_parallelism_q: 0,
  });

  expect(health.p_wait_q).toBe(1);
  expect(health.expected_wait_hours_q).toBe("POSITIVE_INFINITY");
  expect(health.queue_health_score_q).toBe(0);
  expect(health.queue_health_state).toBe("SATURATED");
  expect(health.reason_codes).toEqual(
    expect.arrayContaining([
      "WORK_QUEUE_HEALTH_DEGRADED",
      "WORK_QUEUE_STAFFING_ZERO",
      "WORK_QUEUE_SERVICE_RATE_ZERO",
    ]),
  );
});

test("utilization at or above one saturates wait probability", () => {
  const health = computeWorkQueueHealth({
    ...healthyInput,
    arrival_rate_q: 8,
    service_rate_q: 1,
    staffed_parallelism_q: 3,
  });

  expect(health.rho_q).toBeGreaterThanOrEqual(1);
  expect(health.p_wait_q).toBe(1);
  expect(health.expected_wait_hours_q).toBe("POSITIVE_INFINITY");
  expect(health.queue_health_state).toBe("SATURATED");
  expect(health.reason_codes).toContain("WORK_QUEUE_UTILIZATION_SATURATED");
});

test("stale-view rejections and reassignment churn depress health and drive recommendations", () => {
  const clean = computeWorkQueueHealth(healthyInput);
  const stale = computeWorkQueueHealth({
    ...healthyInput,
    backlog_age_p90_hours_q: 72,
    queue_health_floor: 85,
    reassignment_churn_q: 0.4,
    stale_view_rejection_rate_q: 0.55,
  });

  expect(stale.queue_health_score_q).toBeLessThan(clean.queue_health_score_q);
  expect(stale.reason_codes).toEqual(
    expect.arrayContaining([
      "WORK_QUEUE_REASSIGNMENT_CHURN_HIGH",
      "WORK_QUEUE_STALE_VIEW_REJECTIONS_HIGH",
    ]),
  );
  expect(
    deriveQueueInterventionRecommendation({
      queue_health_floor: stale.queue_health_floor,
      queue_health_score: stale.queue_health_score_q,
      queue_health_state: stale.queue_health_state,
      reassignment_churn_q: stale.reassignment_churn_q,
      saturated_reason_codes: stale.reason_codes,
      stale_view_rejection_rate_q: stale.stale_view_rejection_rate_q,
    }).intervention_recommendation_state,
  ).toBe("REBALANCE");
});
