import { stableJsonHash } from "../../../domain-kernel/src/primitives/hash.ts";
import {
  clamp01,
  roundScore,
} from "../models/collaboration_routing_contract.ts";
import { WorkflowModelError } from "../models/workflow_item.ts";
import { computeQueuePressure } from "./compute_queue_pressure.ts";
import { deriveQueueInterventionRecommendation } from "./derive_queue_intervention_recommendation.ts";

export type QueueHealthState = "HEALTHY" | "DEGRADED" | "SATURATED";
export type QueueExpectedWaitHours = number | "POSITIVE_INFINITY";

export type WorkQueueHealthFormulaInput = {
  arrival_rate_q: number;
  backlog_age_p90_hours_q: number;
  queue_health_floor: number;
  reassignment_churn_q: number;
  resolution_target_hours_q: number;
  routing_queue_ref: string;
  service_rate_q: number;
  staffed_parallelism_q: number;
  stale_view_rejection_rate_q: number;
};

export type WorkQueueHealthComputation = {
  a_q: number;
  analytics_basis_hash: string;
  arrival_rate_q: number;
  backlog_age_p90_hours_q: number;
  expected_wait_hours_q: QueueExpectedWaitHours;
  p_wait_q: number;
  queue_health_floor: number;
  queue_health_score_q: number;
  queue_health_signal_q: number;
  queue_health_state: QueueHealthState;
  queue_pressure_score_q: number;
  reassignment_churn_q: number;
  reason_codes: string[];
  resolution_target_hours_q: number;
  rho_q: number;
  routing_queue_ref: string;
  service_rate_q: number;
  staffed_parallelism_q: number;
  stale_view_rejection_rate_q: number;
};

function assertFiniteNonNegative(label: string, value: number) {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
    throw new WorkflowModelError("WORKFLOW_FIELD_INVALID", `${label} must be a finite non-negative number`);
  }
  return value;
}

function assertPositive(label: string, value: number) {
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) {
    throw new WorkflowModelError("WORKFLOW_FIELD_INVALID", `${label} must be a finite positive number`);
  }
  return value;
}

function assertScore(label: string, value: number) {
  if (!Number.isInteger(value) || value < 0 || value > 100) {
    throw new WorkflowModelError("WORKFLOW_FIELD_INVALID", `${label} must be an integer in 0..100`);
  }
  return value;
}

function assertQueueRef(value: string) {
  const trimmed = value.trim();
  if (trimmed.length === 0) {
    throw new WorkflowModelError("WORKFLOW_FIELD_INVALID", "routing_queue_ref must be a non-empty string");
  }
  return trimmed;
}

function normalizeFormulaInput(input: WorkQueueHealthFormulaInput): WorkQueueHealthFormulaInput {
  const staffedParallelism = assertFiniteNonNegative(
    "staffed_parallelism_q",
    input.staffed_parallelism_q,
  );
  if (!Number.isInteger(staffedParallelism)) {
    throw new WorkflowModelError("WORKFLOW_FIELD_INVALID", "staffed_parallelism_q must be an integer staff count");
  }
  return {
    arrival_rate_q: assertFiniteNonNegative("arrival_rate_q", input.arrival_rate_q),
    backlog_age_p90_hours_q: assertFiniteNonNegative(
      "backlog_age_p90_hours_q",
      input.backlog_age_p90_hours_q,
    ),
    queue_health_floor: assertScore("queue_health_floor", input.queue_health_floor),
    reassignment_churn_q: assertFiniteNonNegative("reassignment_churn_q", input.reassignment_churn_q),
    resolution_target_hours_q: assertPositive("resolution_target_hours_q", input.resolution_target_hours_q),
    routing_queue_ref: assertQueueRef(input.routing_queue_ref),
    service_rate_q: assertFiniteNonNegative("service_rate_q", input.service_rate_q),
    staffed_parallelism_q: staffedParallelism,
    stale_view_rejection_rate_q: assertFiniteNonNegative(
      "stale_view_rejection_rate_q",
      input.stale_view_rejection_rate_q,
    ),
  };
}

function erlangC(input: {
  arrival_rate_q: number;
  service_rate_q: number;
  staffed_parallelism_q: number;
}) {
  const offeredLoad = input.arrival_rate_q / Math.max(1e-6, input.service_rate_q);
  const utilization =
    input.arrival_rate_q / Math.max(1e-6, input.staffed_parallelism_q * input.service_rate_q);

  if (
    input.staffed_parallelism_q === 0 ||
    input.service_rate_q === 0 ||
    utilization >= 1
  ) {
    return {
      a_q: offeredLoad,
      expected_wait_hours_q: "POSITIVE_INFINITY" as const,
      p_wait_q: 1,
      rho_q: utilization,
    };
  }

  let sum = 1;
  let term = 1;
  for (let n = 1; n < input.staffed_parallelism_q; n += 1) {
    term *= offeredLoad / n;
    sum += term;
  }
  const staffedTerm = term * (offeredLoad / input.staffed_parallelism_q);
  const waitTerm = staffedTerm / (1 - utilization);
  const p0 = 1 / (sum + waitTerm);
  const pWait = clamp01(waitTerm * p0);
  const expectedWaitHours =
    pWait / Math.max(1e-6, input.staffed_parallelism_q * input.service_rate_q - input.arrival_rate_q);

  return {
    a_q: offeredLoad,
    expected_wait_hours_q: expectedWaitHours,
    p_wait_q: pWait,
    rho_q: utilization,
  };
}

function queueHealthState(input: {
  queue_health_floor: number;
  queue_health_score_q: number;
  saturated: boolean;
}) {
  if (input.queue_health_score_q >= input.queue_health_floor && !input.saturated) {
    return "HEALTHY" as const;
  }
  if (input.saturated || input.queue_health_score_q < 35) {
    return "SATURATED" as const;
  }
  return "DEGRADED" as const;
}

function queueReasonCodes(input: {
  backlog_age_p90_hours_q: number;
  p_wait_q: number;
  queue_health_floor: number;
  queue_health_score_q: number;
  reassignment_churn_q: number;
  resolution_target_hours_q: number;
  rho_q: number;
  service_rate_q: number;
  staffed_parallelism_q: number;
  stale_view_rejection_rate_q: number;
}) {
  const reasonCodes: string[] = [];
  if (input.queue_health_score_q >= input.queue_health_floor) {
    reasonCodes.push("QUEUE_HEALTH_WITHIN_TARGET");
  } else {
    reasonCodes.push("WORK_QUEUE_HEALTH_DEGRADED");
  }
  if (
    input.staffed_parallelism_q === 0 ||
    input.service_rate_q === 0 ||
    input.rho_q >= 1 ||
    input.queue_health_score_q < 35
  ) {
    reasonCodes.push("WORK_QUEUE_SATURATED");
  }
  if (input.staffed_parallelism_q === 0) {
    reasonCodes.push("WORK_QUEUE_STAFFING_ZERO");
  }
  if (input.service_rate_q === 0) {
    reasonCodes.push("WORK_QUEUE_SERVICE_RATE_ZERO");
  }
  if (input.rho_q >= 1) {
    reasonCodes.push("WORK_QUEUE_UTILIZATION_SATURATED");
  }
  if (input.p_wait_q >= 0.5) {
    reasonCodes.push("WORK_QUEUE_WAIT_PROBABILITY_HIGH");
  }
  if (input.backlog_age_p90_hours_q >= input.resolution_target_hours_q) {
    reasonCodes.push("WORK_QUEUE_BACKLOG_AGE_HIGH");
  }
  if (input.reassignment_churn_q >= 0.25) {
    reasonCodes.push("WORK_QUEUE_REASSIGNMENT_CHURN_HIGH");
  }
  if (input.stale_view_rejection_rate_q >= 0.1) {
    reasonCodes.push("WORK_QUEUE_STALE_VIEW_REJECTIONS_HIGH");
  }
  return [...new Set(reasonCodes)];
}

export function workQueueHealthInputBasisHash(input: WorkQueueHealthFormulaInput) {
  const normalized = normalizeFormulaInput(input);
  return stableJsonHash({
    arrival_rate_q: normalized.arrival_rate_q,
    backlog_age_p90_hours_q: normalized.backlog_age_p90_hours_q,
    queue_health_floor: normalized.queue_health_floor,
    reassignment_churn_q: normalized.reassignment_churn_q,
    resolution_target_hours_q: normalized.resolution_target_hours_q,
    routing_queue_ref: normalized.routing_queue_ref,
    service_rate_q: normalized.service_rate_q,
    staffed_parallelism_q: normalized.staffed_parallelism_q,
    stale_view_rejection_rate_q: normalized.stale_view_rejection_rate_q,
  });
}

export function computeWorkQueueHealth(input: WorkQueueHealthFormulaInput): WorkQueueHealthComputation {
  const normalized = normalizeFormulaInput(input);
  const erlang = erlangC(normalized);
  const saturated =
    normalized.staffed_parallelism_q === 0 ||
    normalized.service_rate_q === 0 ||
    erlang.rho_q >= 1;
  const waitFactor = erlang.expected_wait_hours_q === "POSITIVE_INFINITY"
    ? 0
    : Math.exp(-erlang.expected_wait_hours_q / Math.max(1, normalized.resolution_target_hours_q)) ** 0.25;
  const queueHealthSignal =
    normalized.staffed_parallelism_q === 0 || normalized.service_rate_q === 0
      ? 0
      : clamp01(
          (1 - erlang.p_wait_q) ** 0.4 *
            waitFactor *
            Math.exp(-normalized.backlog_age_p90_hours_q / Math.max(1, normalized.resolution_target_hours_q)) ** 0.2 *
            (1 - clamp01(normalized.reassignment_churn_q)) ** 0.1 *
            (1 - clamp01(normalized.stale_view_rejection_rate_q)) ** 0.05,
        );
  const queueHealthScore = roundScore(100 * queueHealthSignal);
  const pressure = computeQueuePressure({ queue_health_score_q: queueHealthScore });
  const state = queueHealthState({
    queue_health_floor: normalized.queue_health_floor,
    queue_health_score_q: queueHealthScore,
    saturated,
  });
  const reasonCodes = queueReasonCodes({
    ...normalized,
    p_wait_q: erlang.p_wait_q,
    queue_health_score_q: queueHealthScore,
    rho_q: erlang.rho_q,
  });
  const recommendation = deriveQueueInterventionRecommendation({
    queue_health_floor: normalized.queue_health_floor,
    queue_health_score: queueHealthScore,
    queue_health_state: state,
    reassignment_churn_q: normalized.reassignment_churn_q,
    saturated_reason_codes: reasonCodes,
    stale_view_rejection_rate_q: normalized.stale_view_rejection_rate_q,
  });

  return {
    a_q: erlang.a_q,
    analytics_basis_hash: workQueueHealthInputBasisHash(normalized),
    arrival_rate_q: normalized.arrival_rate_q,
    backlog_age_p90_hours_q: normalized.backlog_age_p90_hours_q,
    expected_wait_hours_q: erlang.expected_wait_hours_q,
    p_wait_q: erlang.p_wait_q,
    queue_health_floor: normalized.queue_health_floor,
    queue_health_score_q: queueHealthScore,
    queue_health_signal_q: queueHealthSignal,
    queue_health_state: state,
    queue_pressure_score_q: pressure.queue_pressure_score_q,
    reassignment_churn_q: normalized.reassignment_churn_q,
    reason_codes: [...new Set([...reasonCodes, ...recommendation.reason_codes])].slice(0, 6),
    resolution_target_hours_q: normalized.resolution_target_hours_q,
    rho_q: erlang.rho_q,
    routing_queue_ref: normalized.routing_queue_ref,
    service_rate_q: normalized.service_rate_q,
    staffed_parallelism_q: normalized.staffed_parallelism_q,
    stale_view_rejection_rate_q: normalized.stale_view_rejection_rate_q,
  };
}
