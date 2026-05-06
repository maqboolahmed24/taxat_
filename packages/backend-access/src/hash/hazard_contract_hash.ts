import type { CanonicalJsonValue } from "../../../domain-kernel/src/primitives/hash.ts";

import {
  canonicalHashDigest,
  requireCanonicalString,
} from "./canonical_hash_serializer.ts";

export type GovernanceMutationHazardContractHashInput = {
  access_binding_hash: string;
  approval_necessity_score: number;
  approval_requirement: string;
  approval_trigger_codes: readonly string[];
  bounded_safe_mutation: 0 | 1;
  bounded_safety_blocker_codes: readonly string[];
  commit_authority_posture: string;
  confidence_limiter_codes: readonly string[];
  contract_version: string;
  count_class_profile_code: string;
  dependency_topology_hash: string;
  impact_radius_lower_score: number;
  impact_radius_upper_score: number;
  impacted_authority_operation_count: number;
  impacted_authority_operation_count_class: string;
  impacted_client_count: number;
  impacted_client_count_class: string;
  impacted_limitation_count: number;
  impacted_limitation_count_class: string;
  impacted_principal_count: number;
  impacted_principal_count_class: string;
  impacted_workflow_count: number;
  impacted_workflow_count_class: string;
  masking_relaxation_score: number;
  policy_risk_score: number;
  policy_snapshot_hash: string;
  predictability_score: number;
  privilege_gain_score: number;
  reason_codes: readonly string[];
  required_approvals: readonly string[];
  risk_driver_codes: readonly string[];
  scope_expansion_score: number;
  simulation_basis_hash: string;
  simulation_confidence_score: number;
};

function normalizeOrderedStringSequence(
  label: string,
  values: readonly string[],
) {
  return values.map((value, index) =>
    requireCanonicalString(`${label}[${index}]`, value),
  );
}

export function buildGovernanceMutationHazardContractHashVector(
  contract: GovernanceMutationHazardContractHashInput,
) {
  return {
    contract_version: contract.contract_version,
    policy_snapshot_hash: contract.policy_snapshot_hash,
    access_binding_hash: contract.access_binding_hash,
    dependency_topology_hash: contract.dependency_topology_hash,
    simulation_basis_hash: contract.simulation_basis_hash,
    count_class_profile_code: contract.count_class_profile_code,
    commit_authority_posture: contract.commit_authority_posture,
    impact_radius_lower_score: contract.impact_radius_lower_score,
    impact_radius_upper_score: contract.impact_radius_upper_score,
    impacted_principal_count: contract.impacted_principal_count,
    impacted_principal_count_class: contract.impacted_principal_count_class,
    impacted_client_count: contract.impacted_client_count,
    impacted_client_count_class: contract.impacted_client_count_class,
    impacted_authority_operation_count: contract.impacted_authority_operation_count,
    impacted_authority_operation_count_class:
      contract.impacted_authority_operation_count_class,
    impacted_workflow_count: contract.impacted_workflow_count,
    impacted_workflow_count_class: contract.impacted_workflow_count_class,
    impacted_limitation_count: contract.impacted_limitation_count,
    impacted_limitation_count_class: contract.impacted_limitation_count_class,
    privilege_gain_score: contract.privilege_gain_score,
    scope_expansion_score: contract.scope_expansion_score,
    masking_relaxation_score: contract.masking_relaxation_score,
    policy_risk_score: contract.policy_risk_score,
    approval_necessity_score: contract.approval_necessity_score,
    approval_requirement: contract.approval_requirement,
    bounded_safe_mutation: contract.bounded_safe_mutation,
    required_approvals: normalizeOrderedStringSequence(
      "required_approvals",
      contract.required_approvals,
    ),
    simulation_confidence_score: contract.simulation_confidence_score,
    predictability_score: contract.predictability_score,
    risk_driver_codes: normalizeOrderedStringSequence(
      "risk_driver_codes",
      contract.risk_driver_codes,
    ),
    approval_trigger_codes: normalizeOrderedStringSequence(
      "approval_trigger_codes",
      contract.approval_trigger_codes,
    ),
    confidence_limiter_codes: normalizeOrderedStringSequence(
      "confidence_limiter_codes",
      contract.confidence_limiter_codes,
    ),
    bounded_safety_blocker_codes: normalizeOrderedStringSequence(
      "bounded_safety_blocker_codes",
      contract.bounded_safety_blocker_codes,
    ),
    reason_codes: normalizeOrderedStringSequence(
      "reason_codes",
      contract.reason_codes,
    ),
  } satisfies CanonicalJsonValue;
}

export function deriveGovernanceMutationHazardContractHash(
  contract: GovernanceMutationHazardContractHashInput,
) {
  return canonicalHashDigest(
    buildGovernanceMutationHazardContractHashVector(contract),
  );
}
