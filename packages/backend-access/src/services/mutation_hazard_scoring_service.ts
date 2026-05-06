import type { AuthorizationDecisionRecord } from "../models/authorization_decision.ts";
import {
  normalizeGovernanceMutationHazardContract,
  type GovernanceMutationHazardContractRecord,
} from "../models/governance_mutation_hazard_contract.ts";
import {
  normalizeScopeSequence,
  requireTrimmedString,
} from "./principal_context_normalizer.ts";
import type {
  DependencyTopologyBuildResult,
  GovernanceSimulationProfile,
} from "./dependency_topology_builder.ts";

const epsilon = 1e-6;

export type GovernanceMutationActionCellDeltaInput = {
  cell_ref: string;
  cell_weight?: number;
  post_decision: AuthorizationDecisionRecord["decision"];
  post_effective_scope: string[];
  pre_decision: AuthorizationDecisionRecord["decision"];
  pre_effective_scope: string[];
};

export type GovernanceReadModelObservationInput = {
  admissible?: boolean;
  age_seconds: number;
  freshness_budget_seconds: number;
  read_model_ref: string;
};

export type GovernanceMutationHazardMetrics = {
  approval_necessity_score: number;
  approval_requirement: GovernanceMutationHazardContractRecord["approval_requirement"];
  approval_trigger_codes: GovernanceMutationHazardContractRecord["approval_trigger_codes"];
  bounded_safe_mutation: GovernanceMutationHazardContractRecord["bounded_safe_mutation"];
  bounded_safety_blocker_codes: GovernanceMutationHazardContractRecord["bounded_safety_blocker_codes"];
  commit_authority_posture: GovernanceMutationHazardContractRecord["commit_authority_posture"];
  confidence_limiter_codes: GovernanceMutationHazardContractRecord["confidence_limiter_codes"];
  impact_radius_lower_score: number;
  impact_radius_upper_score: number;
  impacted_authority_operation_count: number;
  impacted_client_count: number;
  impacted_limitation_count: number;
  impacted_principal_count: number;
  impacted_workflow_count: number;
  masking_relaxation_score: number;
  policy_risk_score: number;
  predictability_score: number;
  privilege_gain_score: number;
  reason_codes: string[];
  required_approvals: string[];
  risk_driver_codes: GovernanceMutationHazardContractRecord["risk_driver_codes"];
  scope_expansion_score: number;
  simulation_confidence_score: number;
};

export type MutationHazardScoringInput = {
  action_cell_deltas?: GovernanceMutationActionCellDeltaInput[];
  binding_consistent?: boolean;
  dependency_topology: DependencyTopologyBuildResult;
  idempotent?: boolean;
  monotonic?: boolean;
  read_models?: GovernanceReadModelObservationInput[];
  settlement_p95_seconds?: number;
};

function clamp01(value: number) {
  return Math.max(0, Math.min(1, value));
}

function roundScore(value: number) {
  return Math.max(0, Math.min(100, Math.floor(value + 0.5)));
}

function safeUnit(value: number) {
  return Math.max(epsilon, clamp01(value));
}

function uniqueSorted(values: readonly string[]) {
  return [...new Set(values)].sort((left, right) => left.localeCompare(right));
}

function allowedDecision(
  decision: AuthorizationDecisionRecord["decision"],
) {
  return decision === "ALLOW" || decision === "ALLOW_MASKED";
}

function computeScopeExpansion(
  pre_effective_scope: string[],
  post_effective_scope: string[],
) {
  const pre = new Set(pre_effective_scope);
  const post = new Set(post_effective_scope);
  const postOnly = [...post].filter((token) => !pre.has(token)).length;
  const unionSize = new Set([...pre, ...post]).size;
  return postOnly / Math.max(1, unionSize);
}

function computeActionCellScores(
  deltas: GovernanceMutationActionCellDeltaInput[],
) {
  if (deltas.length === 0) {
    return {
      privilege_gain_score: 0,
      scope_expansion_score: 0,
      masking_relaxation_score: 0,
    };
  }

  let cellWeightTotal = 0;
  let privilegeWeighted = 0;
  let scopeExpansionWeighted = 0;
  let maskingRelaxationWeighted = 0;

  for (const delta of deltas) {
    requireTrimmedString("action_cell_delta.cell_ref", delta.cell_ref);
    const pre_effective_scope = normalizeScopeSequence(
      `action_cell_delta.${delta.cell_ref}.pre_effective_scope`,
      delta.pre_effective_scope,
      { allowEmpty: true },
    );
    const post_effective_scope = normalizeScopeSequence(
      `action_cell_delta.${delta.cell_ref}.post_effective_scope`,
      delta.post_effective_scope,
      { allowEmpty: true },
    );
    const cellWeight = Math.max(epsilon, delta.cell_weight ?? 1);
    const exec_gain =
      allowedDecision(delta.post_decision) && !allowedDecision(delta.pre_decision)
        ? 1
        : 0;
    const mask_relax =
      delta.pre_decision === "ALLOW_MASKED" && delta.post_decision === "ALLOW"
        ? 1
        : 0;
    const approval_guard_removed =
      delta.pre_decision === "REQUIRE_APPROVAL" &&
      (delta.post_decision === "ALLOW" ||
        delta.post_decision === "ALLOW_MASKED" ||
        delta.post_decision === "REQUIRE_STEP_UP")
        ? 1
        : 0;
    const step_up_guard_removed =
      delta.pre_decision === "REQUIRE_STEP_UP" &&
      (delta.post_decision === "ALLOW" || delta.post_decision === "ALLOW_MASKED")
        ? 1
        : 0;
    const privilege_delta = clamp01(
      exec_gain +
        0.5 * mask_relax +
        0.35 * approval_guard_removed +
        0.15 * step_up_guard_removed,
    );
    const scope_expansion = computeScopeExpansion(
      pre_effective_scope,
      post_effective_scope,
    );

    cellWeightTotal += cellWeight;
    privilegeWeighted += cellWeight * privilege_delta;
    scopeExpansionWeighted += cellWeight * scope_expansion;
    maskingRelaxationWeighted += cellWeight * mask_relax;
  }

  return {
    privilege_gain_score:
      cellWeightTotal === 0
        ? 0
        : roundScore((100 * privilegeWeighted) / cellWeightTotal),
    scope_expansion_score:
      cellWeightTotal === 0
        ? 0
        : roundScore((100 * scopeExpansionWeighted) / cellWeightTotal),
    masking_relaxation_score:
      cellWeightTotal === 0
        ? 0
        : roundScore((100 * maskingRelaxationWeighted) / cellWeightTotal),
  };
}

function computePropagation(
  topology: DependencyTopologyBuildResult,
) {
  const nodeIndex = new Map(
    topology.nodes.map((node, index) => [node.node_ref, index] as const),
  );
  const nodeCount = topology.nodes.length;
  const matrix = Array.from({ length: nodeCount }, () =>
    Array.from({ length: nodeCount }, () => 0),
  );
  const outWeightByNode = new Map<string, number>();

  for (const edge of topology.edges) {
    outWeightByNode.set(
      edge.from_node_ref,
      (outWeightByNode.get(edge.from_node_ref) ?? 0) + edge.weight,
    );
  }

  for (const edge of topology.edges) {
    const fromIndex = nodeIndex.get(edge.from_node_ref);
    const toIndex = nodeIndex.get(edge.to_node_ref);
    if (fromIndex === undefined || toIndex === undefined) {
      continue;
    }
    const outWeight = Math.max(1, outWeightByNode.get(edge.from_node_ref) ?? 0);
    const row = matrix[fromIndex];
    if (!row) {
      continue;
    }
    row[toIndex] = (topology.gamma * edge.weight) / outWeight;
  }

  const states: number[][] = [];
  let current = topology.nodes.map((node) => node.seed);
  states.push([...current]);

  for (let depth = 0; depth < topology.maximum_propagation_depth; depth += 1) {
    const next = Array.from({ length: nodeCount }, () => 0);
    for (let fromIndex = 0; fromIndex < nodeCount; fromIndex += 1) {
      const row = matrix[fromIndex];
      if (!row) {
        continue;
      }
      const currentValue = current[fromIndex] ?? 0;
      for (let toIndex = 0; toIndex < nodeCount; toIndex += 1) {
        next[toIndex] = (next[toIndex] ?? 0) + currentValue * (row[toIndex] ?? 0);
      }
    }
    current = next.map((value) => clamp01(value));
    states.push([...current]);
  }

  const reach_lb = Array.from({ length: nodeCount }, (_, index) =>
    Math.max(...states.map((state) => state[index] ?? 0)),
  );
  const reach_ub = Array.from({ length: nodeCount }, (_, index) =>
    clamp01(states.reduce((sum, state) => sum + (state[index] ?? 0), 0)),
  );

  return {
    nodeIndex,
    reach_lb,
    reach_ub,
  };
}

function weightedReachScore(input: {
  nodes: DependencyTopologyBuildResult["nodes"];
  reach: number[];
}) {
  const weightSum = input.nodes.reduce((sum, node) => sum + node.node_weight, 0);
  if (weightSum === 0) {
    return 0;
  }
  return roundScore(
    100 *
      input.nodes.reduce(
        (sum, node, index) => sum + node.node_weight * (input.reach[index] ?? 0),
        0,
      ) /
      weightSum,
  );
}

function computeImpactedCounts(input: {
  nodes: DependencyTopologyBuildResult["nodes"];
  profile: GovernanceSimulationProfile;
  reach_ub: number[];
}) {
  const threshold = input.profile.impact_presence_threshold;
  const counts = {
    impacted_principal_count: 0,
    impacted_client_count: 0,
    impacted_authority_operation_count: 0,
    impacted_workflow_count: 0,
    impacted_limitation_count: 0,
  };

  input.nodes.forEach((node, index) => {
    if ((input.reach_ub[index] ?? 0) < threshold) {
      return;
    }
    switch (node.node_type) {
      case "PRINCIPAL":
        counts.impacted_principal_count += 1;
        break;
      case "CLIENT":
        counts.impacted_client_count += 1;
        break;
      case "AUTHORITY_OPERATION":
        counts.impacted_authority_operation_count += 1;
        break;
      case "WORKFLOW":
        counts.impacted_workflow_count += 1;
        break;
      case "LIMITATION":
        counts.impacted_limitation_count += 1;
        break;
      default:
        break;
    }
  });

  return counts;
}

function freshnessFactor(read_models: GovernanceReadModelObservationInput[]) {
  if (read_models.length === 0) {
    return 1;
  }
  return read_models.reduce((current, observation) => {
    const factor = Math.exp(
      (-Math.log(2) * observation.age_seconds) /
        Math.max(observation.freshness_budget_seconds, epsilon),
    );
    return Math.min(current, factor);
  }, 1);
}

export class MutationHazardScoringService {
  scoreMetrics(input: MutationHazardScoringInput): GovernanceMutationHazardMetrics {
    const action_cell_deltas = input.action_cell_deltas ?? [];
    const propagation = computePropagation(input.dependency_topology);
    const impact_radius_lower_score = weightedReachScore({
      nodes: input.dependency_topology.nodes,
      reach: propagation.reach_lb,
    });
    const impact_radius_upper_score = weightedReachScore({
      nodes: input.dependency_topology.nodes,
      reach: propagation.reach_ub,
    });
    const impactedCounts = computeImpactedCounts({
      nodes: input.dependency_topology.nodes,
      reach_ub: propagation.reach_ub,
      profile: input.dependency_topology.profile,
    });
    const actionCellScores = computeActionCellScores(action_cell_deltas);
    const required_edge_mass = input.dependency_topology.edges
      .filter((edge) => edge.semantically_relevant)
      .reduce((sum, edge) => sum + edge.weight, 0);
    const observed_edge_mass = input.dependency_topology.edges
      .filter((edge) => edge.semantically_relevant && edge.observed)
      .reduce((sum, edge) => sum + edge.weight, 0);
    const freshness_factor = freshnessFactor(input.read_models ?? []);
    const coverage_factor =
      required_edge_mass === 0
        ? 1
        : clamp01(observed_edge_mass / required_edge_mass);
    const binding_factor = input.binding_consistent === false ? 0 : 1;
    const interval_factor = 1 - clamp01((impact_radius_upper_score - impact_radius_lower_score) / 100);
    const impacted_nodes = input.dependency_topology.nodes.filter(
      (_, index) =>
        (propagation.reach_ub[index] ?? 0) >=
        input.dependency_topology.profile.impact_presence_threshold,
    );
    const impacted_node_weight = impacted_nodes.reduce(
      (sum, node) => sum + node.node_weight,
      0,
    );
    const validated_impacted_node_weight = impacted_nodes
      .filter((node) => node.validated)
      .reduce((sum, node) => sum + node.node_weight, 0);
    const validation_factor =
      impacted_node_weight === 0
        ? 1
        : clamp01(validated_impacted_node_weight / impacted_node_weight);

    const simulation_confidence_score =
      Math.min(
        freshness_factor,
        coverage_factor,
        binding_factor,
        interval_factor,
        validation_factor,
      ) === 0
        ? 0
        : roundScore(
            100 *
              Math.exp(
                0.3 * Math.log(safeUnit(freshness_factor)) +
                  0.25 * Math.log(safeUnit(coverage_factor)) +
                  0.2 * Math.log(safeUnit(binding_factor)) +
                  0.15 * Math.log(safeUnit(interval_factor)) +
                  0.1 * Math.log(safeUnit(validation_factor)),
              ),
          );

    const settlement_factor = Math.exp(
      (-Math.log(2) * (input.settlement_p95_seconds ?? 0)) /
        Math.max(input.dependency_topology.profile.settlement_sla_seconds, epsilon),
    );
    const idempotency_factor = input.idempotent === false ? 0 : 1;
    const monotonicity_factor = input.monotonic === false ? 0 : 1;
    const predictability_score =
      Math.min(
        simulation_confidence_score / 100,
        idempotency_factor,
        monotonicity_factor,
        settlement_factor,
      ) === 0
        ? 0
        : roundScore(
            100 *
              Math.exp(
                0.45 * Math.log(safeUnit(simulation_confidence_score / 100)) +
                  0.25 * Math.log(safeUnit(idempotency_factor)) +
                  0.15 * Math.log(safeUnit(monotonicity_factor)) +
                  0.15 * Math.log(safeUnit(settlement_factor)),
              ),
          );

    const resolvedHazard = normalizeGovernanceMutationHazardContract({
      policy_snapshot_hash: "pending.policy.snapshot",
      access_binding_hash: "pending.access.binding",
      dependency_topology_hash: input.dependency_topology.dependency_topology_hash,
      simulation_basis_hash: "pending.simulation.basis",
      impact_radius_lower_score,
      impact_radius_upper_score,
      impacted_principal_count: impactedCounts.impacted_principal_count,
      impacted_client_count: impactedCounts.impacted_client_count,
      impacted_authority_operation_count:
        impactedCounts.impacted_authority_operation_count,
      impacted_workflow_count: impactedCounts.impacted_workflow_count,
      impacted_limitation_count: impactedCounts.impacted_limitation_count,
      privilege_gain_score: actionCellScores.privilege_gain_score,
      scope_expansion_score: actionCellScores.scope_expansion_score,
      masking_relaxation_score: actionCellScores.masking_relaxation_score,
      simulation_confidence_score,
      predictability_score,
    });

    return {
      impact_radius_lower_score,
      impact_radius_upper_score,
      impacted_principal_count: impactedCounts.impacted_principal_count,
      impacted_client_count: impactedCounts.impacted_client_count,
      impacted_authority_operation_count:
        impactedCounts.impacted_authority_operation_count,
      impacted_workflow_count: impactedCounts.impacted_workflow_count,
      impacted_limitation_count: impactedCounts.impacted_limitation_count,
      privilege_gain_score: actionCellScores.privilege_gain_score,
      scope_expansion_score: actionCellScores.scope_expansion_score,
      masking_relaxation_score: actionCellScores.masking_relaxation_score,
      policy_risk_score: resolvedHazard.policy_risk_score,
      approval_necessity_score: resolvedHazard.approval_necessity_score,
      approval_requirement: resolvedHazard.approval_requirement,
      bounded_safe_mutation: resolvedHazard.bounded_safe_mutation,
      required_approvals: [...resolvedHazard.required_approvals],
      simulation_confidence_score,
      predictability_score,
      risk_driver_codes: [...resolvedHazard.risk_driver_codes],
      approval_trigger_codes: [...resolvedHazard.approval_trigger_codes],
      confidence_limiter_codes: [...resolvedHazard.confidence_limiter_codes],
      bounded_safety_blocker_codes: [...resolvedHazard.bounded_safety_blocker_codes],
      reason_codes: [...resolvedHazard.reason_codes],
      commit_authority_posture: resolvedHazard.commit_authority_posture,
    };
  }

  materializeHazardContract(input: {
    access_binding_hash: string;
    metrics: GovernanceMutationHazardMetrics;
    policy_snapshot_hash: string;
    simulation_basis_hash: string;
    dependency_topology_hash: string;
  }) {
    return normalizeGovernanceMutationHazardContract({
      policy_snapshot_hash: input.policy_snapshot_hash,
      access_binding_hash: input.access_binding_hash,
      dependency_topology_hash: input.dependency_topology_hash,
      simulation_basis_hash: input.simulation_basis_hash,
      impact_radius_lower_score: input.metrics.impact_radius_lower_score,
      impact_radius_upper_score: input.metrics.impact_radius_upper_score,
      impacted_principal_count: input.metrics.impacted_principal_count,
      impacted_client_count: input.metrics.impacted_client_count,
      impacted_authority_operation_count:
        input.metrics.impacted_authority_operation_count,
      impacted_workflow_count: input.metrics.impacted_workflow_count,
      impacted_limitation_count: input.metrics.impacted_limitation_count,
      privilege_gain_score: input.metrics.privilege_gain_score,
      scope_expansion_score: input.metrics.scope_expansion_score,
      masking_relaxation_score: input.metrics.masking_relaxation_score,
      policy_risk_score: input.metrics.policy_risk_score,
      approval_necessity_score: input.metrics.approval_necessity_score,
      approval_requirement: input.metrics.approval_requirement,
      bounded_safe_mutation: input.metrics.bounded_safe_mutation,
      required_approvals: input.metrics.required_approvals,
      simulation_confidence_score: input.metrics.simulation_confidence_score,
      predictability_score: input.metrics.predictability_score,
      risk_driver_codes: input.metrics.risk_driver_codes,
      approval_trigger_codes: input.metrics.approval_trigger_codes,
      confidence_limiter_codes: input.metrics.confidence_limiter_codes,
      bounded_safety_blocker_codes:
        input.metrics.bounded_safety_blocker_codes,
      reason_codes: input.metrics.reason_codes,
      commit_authority_posture: input.metrics.commit_authority_posture,
    });
  }
}
