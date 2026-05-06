import {
  normalizeGovernanceMutationHazardContract,
  type CreateGovernanceMutationHazardContractInput,
  type GovernanceMutationHazardContractRecord,
} from "../../../backend-access/src/models/governance_mutation_hazard_contract.ts";
import {
  buildGovernanceMutationHazardContractHashVector,
  deriveGovernanceMutationHazardContractHash,
} from "../../../backend-access/src/hash/hazard_contract_hash.ts";
import type { GovernanceMutationHazardMetrics } from "../../../backend-access/src/services/mutation_hazard_scoring_service.ts";
import type {
  GovernanceMutationHazardContractApprovalTriggerCode,
  GovernanceMutationHazardContractBoundedSafetyBlockerCode,
  GovernanceMutationHazardContractConfidenceLimiterCode,
  GovernanceMutationHazardContractRiskDriverCode,
} from "../../../generated-models/src/generated/typescript/governance-and-policy.ts";
import { deriveApprovalNecessityScore } from "./derive_approval_necessity_score.ts";
import {
  deriveCommitAuthorityPosture,
  GOVERNANCE_MUTATION_APPROVAL_TRIGGER_CODES,
  GOVERNANCE_MUTATION_BOUNDED_SAFETY_BLOCKER_CODES,
  GOVERNANCE_MUTATION_CONFIDENCE_LIMITER_CODES,
  GOVERNANCE_MUTATION_RISK_DRIVER_CODES,
  type GovernanceMutationApprovalRequirement,
  type GovernanceMutationCommitAuthorityPosture,
} from "./derive_commit_authority_posture.ts";
import { deriveGovernanceCountClasses } from "./derive_governance_count_classes.ts";
import { derivePolicyRiskScore } from "./derive_policy_risk_score.ts";

export type BuildGovernanceMutationHazardContractInput =
  CreateGovernanceMutationHazardContractInput;
export type GovernanceMutationHazardContract =
  GovernanceMutationHazardContractRecord;

function sortLexicographic(values: readonly string[]) {
  return [...new Set(values.map((value) => value.normalize("NFC")))].sort(
    (left, right) => (left < right ? -1 : left > right ? 1 : 0),
  );
}

function orderCodes<T extends string>(
  values: readonly T[],
  order: readonly T[],
) {
  const orderMap = new Map(order.map((value, index) => [value, index] as const));
  return [...new Set(values)].sort(
    (left, right) => (orderMap.get(left) ?? 0) - (orderMap.get(right) ?? 0),
  );
}

function arraysEqual(left: readonly string[], right: readonly string[]) {
  return (
    left.length === right.length &&
    left.every((value, index) => value === right[index])
  );
}

function assertOptionalValueMatches<T>(
  label: string,
  actual: T | undefined,
  expected: T,
) {
  if (actual !== undefined && actual !== expected) {
    throw new Error(
      `GOVERNANCE_MUTATION_HAZARD_CONTRACT_INVALID: ${label} must equal the deterministic governance mutation hazard value`,
    );
  }
}

function assertOptionalStringSequenceMatches(
  label: string,
  actual: readonly string[] | undefined,
  expected: readonly string[],
  normalize: (values: readonly string[]) => readonly string[],
) {
  if (actual === undefined) {
    return;
  }
  const normalized = normalize(actual);
  if (!arraysEqual(normalized, expected)) {
    throw new Error(
      `GOVERNANCE_MUTATION_HAZARD_CONTRACT_INVALID: ${label} must equal the deterministic governance mutation hazard sequence`,
    );
  }
}

export function buildGovernanceMutationHazardContract(
  input: BuildGovernanceMutationHazardContractInput,
): GovernanceMutationHazardContractRecord {
  deriveGovernanceCountClasses({
    impacted_authority_operation_count:
      input.impacted_authority_operation_count,
    impacted_client_count: input.impacted_client_count,
    impacted_limitation_count: input.impacted_limitation_count,
    impacted_principal_count: input.impacted_principal_count,
    impacted_workflow_count: input.impacted_workflow_count,
  });

  const policy_risk_score = derivePolicyRiskScore({
    impact_radius_upper_score: input.impact_radius_upper_score,
    masking_relaxation_score: input.masking_relaxation_score,
    privilege_gain_score: input.privilege_gain_score,
    scope_expansion_score: input.scope_expansion_score,
  });
  const approval_necessity_score = deriveApprovalNecessityScore({
    impact_radius_upper_score: input.impact_radius_upper_score,
    policy_risk_score,
  });
  const posture = deriveCommitAuthorityPosture({
    approval_necessity_score,
    impact_radius_lower_score: input.impact_radius_lower_score,
    impact_radius_upper_score: input.impact_radius_upper_score,
    masking_relaxation_score: input.masking_relaxation_score,
    policy_risk_score,
    predictability_score: input.predictability_score,
    privilege_gain_score: input.privilege_gain_score,
    scope_expansion_score: input.scope_expansion_score,
    simulation_confidence_score: input.simulation_confidence_score,
  });

  assertOptionalValueMatches(
    "policy_risk_score",
    input.policy_risk_score,
    policy_risk_score,
  );
  assertOptionalValueMatches(
    "approval_necessity_score",
    input.approval_necessity_score,
    approval_necessity_score,
  );
  assertOptionalValueMatches(
    "bounded_safe_mutation",
    input.bounded_safe_mutation,
    posture.bounded_safe_mutation,
  );
  assertOptionalValueMatches(
    "approval_requirement",
    input.approval_requirement,
    posture.approval_requirement as GovernanceMutationApprovalRequirement,
  );
  assertOptionalValueMatches(
    "commit_authority_posture",
    input.commit_authority_posture,
    posture.commit_authority_posture as GovernanceMutationCommitAuthorityPosture,
  );
  assertOptionalStringSequenceMatches(
    "required_approvals",
    input.required_approvals,
    posture.required_approvals,
    sortLexicographic,
  );
  assertOptionalStringSequenceMatches(
    "risk_driver_codes",
    input.risk_driver_codes,
    posture.risk_driver_codes,
    (values) =>
      orderCodes(
        values as GovernanceMutationHazardContractRiskDriverCode[],
        GOVERNANCE_MUTATION_RISK_DRIVER_CODES,
      ),
  );
  assertOptionalStringSequenceMatches(
    "approval_trigger_codes",
    input.approval_trigger_codes,
    posture.approval_trigger_codes,
    (values) =>
      orderCodes(
        values as GovernanceMutationHazardContractApprovalTriggerCode[],
        GOVERNANCE_MUTATION_APPROVAL_TRIGGER_CODES,
      ),
  );
  assertOptionalStringSequenceMatches(
    "confidence_limiter_codes",
    input.confidence_limiter_codes,
    posture.confidence_limiter_codes,
    (values) =>
      orderCodes(
        values as GovernanceMutationHazardContractConfidenceLimiterCode[],
        GOVERNANCE_MUTATION_CONFIDENCE_LIMITER_CODES,
      ),
  );
  assertOptionalStringSequenceMatches(
    "bounded_safety_blocker_codes",
    input.bounded_safety_blocker_codes,
    posture.bounded_safety_blocker_codes,
    (values) =>
      orderCodes(
        values as GovernanceMutationHazardContractBoundedSafetyBlockerCode[],
        GOVERNANCE_MUTATION_BOUNDED_SAFETY_BLOCKER_CODES,
      ),
  );

  return normalizeGovernanceMutationHazardContract({
    ...input,
    approval_necessity_score,
    approval_requirement: posture.approval_requirement,
    approval_trigger_codes: posture.approval_trigger_codes,
    bounded_safe_mutation: posture.bounded_safe_mutation,
    bounded_safety_blocker_codes: posture.bounded_safety_blocker_codes,
    commit_authority_posture: posture.commit_authority_posture,
    confidence_limiter_codes: posture.confidence_limiter_codes,
    policy_risk_score,
    reason_codes: input.reason_codes ?? posture.reason_codes,
    required_approvals: posture.required_approvals,
    risk_driver_codes: posture.risk_driver_codes,
  });
}

export function buildGovernanceMutationHazardContractFromMetrics(input: {
  access_binding_hash: string;
  dependency_topology_hash: string;
  metrics: GovernanceMutationHazardMetrics;
  policy_snapshot_hash: string;
  simulation_basis_hash: string;
}): GovernanceMutationHazardContractRecord {
  return buildGovernanceMutationHazardContract({
    access_binding_hash: input.access_binding_hash,
    approval_necessity_score: input.metrics.approval_necessity_score,
    approval_requirement: input.metrics.approval_requirement,
    approval_trigger_codes: input.metrics.approval_trigger_codes,
    bounded_safe_mutation: input.metrics.bounded_safe_mutation,
    bounded_safety_blocker_codes: input.metrics.bounded_safety_blocker_codes,
    commit_authority_posture: input.metrics.commit_authority_posture,
    confidence_limiter_codes: input.metrics.confidence_limiter_codes,
    dependency_topology_hash: input.dependency_topology_hash,
    impact_radius_lower_score: input.metrics.impact_radius_lower_score,
    impact_radius_upper_score: input.metrics.impact_radius_upper_score,
    impacted_authority_operation_count:
      input.metrics.impacted_authority_operation_count,
    impacted_client_count: input.metrics.impacted_client_count,
    impacted_limitation_count: input.metrics.impacted_limitation_count,
    impacted_principal_count: input.metrics.impacted_principal_count,
    impacted_workflow_count: input.metrics.impacted_workflow_count,
    masking_relaxation_score: input.metrics.masking_relaxation_score,
    policy_risk_score: input.metrics.policy_risk_score,
    policy_snapshot_hash: input.policy_snapshot_hash,
    predictability_score: input.metrics.predictability_score,
    privilege_gain_score: input.metrics.privilege_gain_score,
    reason_codes: input.metrics.reason_codes,
    required_approvals: input.metrics.required_approvals,
    risk_driver_codes: input.metrics.risk_driver_codes,
    scope_expansion_score: input.metrics.scope_expansion_score,
    simulation_basis_hash: input.simulation_basis_hash,
    simulation_confidence_score: input.metrics.simulation_confidence_score,
  });
}

export {
  buildGovernanceMutationHazardContractHashVector,
  deriveGovernanceMutationHazardContractHash,
};
