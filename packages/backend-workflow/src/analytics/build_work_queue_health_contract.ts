import { stableJsonHash } from "../../../domain-kernel/src/primitives/hash.ts";
import {
  deriveCollaborationRoutingProfileHash,
  DEFAULT_COLLABORATION_ROUTING_PROFILE,
  roundScore,
} from "../models/collaboration_routing_contract.ts";
import { WorkflowModelError } from "../models/workflow_item.ts";
import {
  computeWorkQueueHealth,
  type WorkQueueHealthComputation,
  type WorkQueueHealthFormulaInput,
} from "./compute_work_queue_health.ts";
import { deriveQueueInterventionRecommendation } from "./derive_queue_intervention_recommendation.ts";

export type WorkQueueHealthContract = {
  basis_hash: string;
  contract_version: "WORK_QUEUE_HEALTH_V1";
  focus_safe_live_update_policy: "DEFER_TO_ROUTING_CONTINUITY_STATE";
  intervention_recommendation_state: "NONE" | "REBALANCE" | "STAFFING_REVIEW" | "MANUAL_TRIAGE";
  ordering_policy: "CANONICAL_SORT_KEY_ONLY";
  queue_health_floor: number;
  queue_health_score: number;
  queue_health_state: "HEALTHY" | "DEGRADED" | "SATURATED";
  queue_pressure_score: number;
  queue_route_key: string;
  queue_scope: "WORK_INBOX_SNAPSHOT";
  reason_codes: string[];
  routing_profile_code: "COLLABORATION_ROUTING_FORMULA_V1";
  routing_profile_hash: string;
};

export type QueueHealthRoutingContractInput = {
  ordering_reason_codes?: readonly string[] | undefined;
  queue_health_floor: number;
  queue_health_score: number;
  routing_profile_hash: string;
};

export type BuildWorkQueueHealthContractInput = {
  health_computation?: WorkQueueHealthComputation | undefined;
  queue_health_floor?: number | undefined;
  queue_health_score?: number | undefined;
  queue_route_key: string;
  reason_codes?: readonly string[] | undefined;
  routing_contracts?: readonly QueueHealthRoutingContractInput[] | undefined;
  routing_profile_hash?: string | undefined;
  work_queue_health_inputs?: WorkQueueHealthFormulaInput | undefined;
};

function requireString(label: string, value: string) {
  const trimmed = value.trim();
  if (trimmed.length === 0) {
    throw new WorkflowModelError("WORKFLOW_FIELD_INVALID", `${label} must be a non-empty string`);
  }
  return trimmed;
}

function assertScore(label: string, value: number) {
  const score = roundScore(value);
  if (!Number.isInteger(score) || score < 0 || score > 100) {
    throw new WorkflowModelError("WORKFLOW_FIELD_INVALID", `${label} must be an integer in 0..100`);
  }
  return score;
}

function uniqueReasonCodes(codes: readonly string[], maxItems = 6) {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const code of codes) {
    const trimmed = code.trim();
    if (trimmed === "" || seen.has(trimmed)) {
      continue;
    }
    seen.add(trimmed);
    result.push(trimmed);
    if (result.length >= maxItems) {
      break;
    }
  }
  return result;
}

function deriveScore(input: BuildWorkQueueHealthContractInput, health: WorkQueueHealthComputation | null) {
  if (health !== null) {
    return health.queue_health_score_q;
  }
  if (input.queue_health_score !== undefined) {
    return assertScore("queue_health_score", input.queue_health_score);
  }
  const scores = (input.routing_contracts ?? []).map((contract) => contract.queue_health_score);
  return scores.length === 0 ? 100 : Math.min(...scores);
}

function deriveFloor(input: BuildWorkQueueHealthContractInput, health: WorkQueueHealthComputation | null) {
  if (health !== null) {
    return health.queue_health_floor;
  }
  if (input.queue_health_floor !== undefined) {
    return assertScore("queue_health_floor", input.queue_health_floor);
  }
  const floors = (input.routing_contracts ?? []).map((contract) => contract.queue_health_floor);
  return floors.length === 0 ? 60 : Math.max(...floors);
}

function deriveRoutingProfileHash(input: BuildWorkQueueHealthContractInput) {
  if (input.routing_profile_hash !== undefined) {
    return requireString("routing_profile_hash", input.routing_profile_hash);
  }
  const hashes = [...new Set((input.routing_contracts ?? []).map((contract) => contract.routing_profile_hash))];
  if (hashes.length === 1) {
    return hashes[0]!;
  }
  if (hashes.length > 1) {
    return stableJsonHash({ routing_profile_hashes: hashes.sort() });
  }
  return deriveCollaborationRoutingProfileHash(DEFAULT_COLLABORATION_ROUTING_PROFILE);
}

function deriveHealthComputation(input: BuildWorkQueueHealthContractInput) {
  if (input.health_computation !== undefined) {
    return input.health_computation;
  }
  if (input.work_queue_health_inputs !== undefined) {
    return computeWorkQueueHealth(input.work_queue_health_inputs);
  }
  return null;
}

export function workQueueHealthContractBasisHash(contract: Omit<WorkQueueHealthContract, "basis_hash">) {
  return stableJsonHash({
    contract_version: contract.contract_version,
    focus_safe_live_update_policy: contract.focus_safe_live_update_policy,
    intervention_recommendation_state: contract.intervention_recommendation_state,
    ordering_policy: contract.ordering_policy,
    queue_health_floor: contract.queue_health_floor,
    queue_health_score: contract.queue_health_score,
    queue_health_state: contract.queue_health_state,
    queue_pressure_score: contract.queue_pressure_score,
    queue_route_key: contract.queue_route_key,
    queue_scope: contract.queue_scope,
    reason_codes: contract.reason_codes,
    routing_profile_code: contract.routing_profile_code,
    routing_profile_hash: contract.routing_profile_hash,
  });
}

export function validateWorkQueueHealthContract(contract: WorkQueueHealthContract) {
  if (contract.contract_version !== "WORK_QUEUE_HEALTH_V1") {
    throw new WorkflowModelError("WORKFLOW_CONTRACT_INVALID", "queue health contract version drifted");
  }
  if (contract.queue_scope !== "WORK_INBOX_SNAPSHOT") {
    throw new WorkflowModelError("WORKFLOW_CONTRACT_INVALID", "queue health scope drifted");
  }
  if (contract.routing_profile_code !== "COLLABORATION_ROUTING_FORMULA_V1") {
    throw new WorkflowModelError("WORKFLOW_CONTRACT_INVALID", "queue health routing profile code drifted");
  }
  requireString("queue_route_key", contract.queue_route_key);
  requireString("routing_profile_hash", contract.routing_profile_hash);
  assertScore("queue_health_score", contract.queue_health_score);
  assertScore("queue_pressure_score", contract.queue_pressure_score);
  assertScore("queue_health_floor", contract.queue_health_floor);
  if (contract.queue_pressure_score !== Math.max(0, 100 - contract.queue_health_score)) {
    throw new WorkflowModelError("WORKFLOW_CONTRACT_INVALID", "queue pressure must equal 100 - queue health");
  }
  if (contract.queue_health_score >= contract.queue_health_floor) {
    if (contract.queue_health_state !== "HEALTHY" || contract.intervention_recommendation_state !== "NONE") {
      throw new WorkflowModelError("WORKFLOW_CONTRACT_INVALID", "healthy queue posture must clear intervention");
    }
  } else if (contract.intervention_recommendation_state === "NONE" || contract.queue_health_state === "HEALTHY") {
    throw new WorkflowModelError("WORKFLOW_CONTRACT_INVALID", "degraded queue posture requires intervention");
  }
  if (contract.ordering_policy !== "CANONICAL_SORT_KEY_ONLY") {
    throw new WorkflowModelError("WORKFLOW_CONTRACT_INVALID", "queue ordering policy drifted");
  }
  if (contract.focus_safe_live_update_policy !== "DEFER_TO_ROUTING_CONTINUITY_STATE") {
    throw new WorkflowModelError("WORKFLOW_CONTRACT_INVALID", "queue focus-safe live update policy drifted");
  }
  if (
    contract.reason_codes.length === 0 ||
    contract.reason_codes.length > 6 ||
    new Set(contract.reason_codes).size !== contract.reason_codes.length
  ) {
    throw new WorkflowModelError("WORKFLOW_CONTRACT_INVALID", "queue reason codes must be unique with 1..6 entries");
  }
  const expectedHash = workQueueHealthContractBasisHash(contract);
  if (contract.basis_hash !== expectedHash) {
    throw new WorkflowModelError("WORKFLOW_CONTRACT_INVALID", "queue health basis hash drifted");
  }
  return contract;
}

export function buildWorkQueueHealthContract(input: BuildWorkQueueHealthContractInput): WorkQueueHealthContract {
  const queueRouteKey = requireString("queue_route_key", input.queue_route_key);
  const health = deriveHealthComputation(input);
  const queueHealthScore = deriveScore(input, health);
  const queueHealthFloor = deriveFloor(input, health);
  const queuePressureScore = Math.max(0, 100 - queueHealthScore);
  const queueHealthState =
    queueHealthScore >= queueHealthFloor
      ? "HEALTHY"
      : queueHealthScore < 35
        ? "SATURATED"
        : "DEGRADED";
  const intervention = deriveQueueInterventionRecommendation({
    queue_health_floor: queueHealthFloor,
    queue_health_score: queueHealthScore,
    queue_health_state: health?.queue_health_state ?? queueHealthState,
    reassignment_churn_q: health?.reassignment_churn_q ?? 0,
    saturated_reason_codes: health?.reason_codes,
    stale_view_rejection_rate_q: health?.stale_view_rejection_rate_q ?? 0,
  });
  const reasonCodes = uniqueReasonCodes(
    input.reason_codes ??
      [
        ...(health?.reason_codes ?? []),
        ...intervention.reason_codes,
        queueHealthScore >= queueHealthFloor
          ? "QUEUE_HEALTH_WITHIN_TARGET"
          : "WORK_QUEUE_HEALTH_DEGRADED",
      ],
  );
  const withoutHash: Omit<WorkQueueHealthContract, "basis_hash"> = {
    contract_version: "WORK_QUEUE_HEALTH_V1",
    focus_safe_live_update_policy: "DEFER_TO_ROUTING_CONTINUITY_STATE",
    intervention_recommendation_state: intervention.intervention_recommendation_state,
    ordering_policy: "CANONICAL_SORT_KEY_ONLY",
    queue_health_floor: queueHealthFloor,
    queue_health_score: queueHealthScore,
    queue_health_state: health?.queue_health_state ?? queueHealthState,
    queue_pressure_score: queuePressureScore,
    queue_route_key: queueRouteKey,
    queue_scope: "WORK_INBOX_SNAPSHOT",
    reason_codes: reasonCodes.length === 0 ? ["QUEUE_HEALTH_BASIS_PRESENT"] : reasonCodes,
    routing_profile_code: "COLLABORATION_ROUTING_FORMULA_V1",
    routing_profile_hash: deriveRoutingProfileHash(input),
  };
  return validateWorkQueueHealthContract({
    ...withoutHash,
    basis_hash: workQueueHealthContractBasisHash(withoutHash),
  });
}
