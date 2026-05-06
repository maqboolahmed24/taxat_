import type { CanonicalJsonValue } from "../../../domain-kernel/src/primitives/hash.ts";

import {
  canonicalHashDigest,
  requireCanonicalString,
} from "./canonical_hash_serializer.ts";

export type GovernanceMutationBasisContractHashInput = {
  access_binding_hash: string;
  approval_requirement: string;
  basis_contract_hash?: string;
  bounded_safe_mutation: 0 | 1;
  commit_authority_posture: string;
  contract_version: string;
  dependency_topology_hash: string;
  hazard_contract_hash: string;
  policy_snapshot_hash: string;
  predictability_score: number;
  required_approvals: readonly string[];
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

export function buildGovernanceMutationBasisContractHashVector(
  contract: GovernanceMutationBasisContractHashInput,
) {
  return {
    contract_version: contract.contract_version,
    policy_snapshot_hash: contract.policy_snapshot_hash,
    access_binding_hash: contract.access_binding_hash,
    dependency_topology_hash: contract.dependency_topology_hash,
    simulation_basis_hash: contract.simulation_basis_hash,
    hazard_contract_hash: contract.hazard_contract_hash,
    commit_authority_posture: contract.commit_authority_posture,
    approval_requirement: contract.approval_requirement,
    bounded_safe_mutation: contract.bounded_safe_mutation,
    required_approvals: normalizeOrderedStringSequence(
      "required_approvals",
      contract.required_approvals,
    ),
    simulation_confidence_score: contract.simulation_confidence_score,
    predictability_score: contract.predictability_score,
  } satisfies CanonicalJsonValue;
}

export function deriveGovernanceMutationBasisContractHash(
  contract: GovernanceMutationBasisContractHashInput,
) {
  return canonicalHashDigest(
    buildGovernanceMutationBasisContractHashVector(contract),
  );
}
