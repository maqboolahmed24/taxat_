import {
  normalizeGovernanceMutationBasisContract,
  type CreateGovernanceMutationBasisContractInput,
  type GovernanceMutationBasisContractRecord,
} from "../../../backend-access/src/models/governance_mutation_basis_contract.ts";
import {
  buildGovernanceMutationBasisContractHashVector,
  deriveGovernanceMutationBasisContractHash,
} from "../../../backend-access/src/hash/basis_contract_hash.ts";
import type { GovernanceMutationHazardContractRecord } from "../../../backend-access/src/models/governance_mutation_hazard_contract.ts";
import type { GovernancePolicySnapshotStagedChangeGroup } from "../../../generated-models/src/generated/typescript/governance-and-policy.ts";

export type BuildGovernanceMutationBasisContractInput =
  CreateGovernanceMutationBasisContractInput;
export type GovernanceMutationBasisContract =
  GovernanceMutationBasisContractRecord;

export function buildGovernanceMutationBasisContract(
  input: BuildGovernanceMutationBasisContractInput,
): GovernanceMutationBasisContractRecord {
  return normalizeGovernanceMutationBasisContract(input);
}

export function buildGovernanceMutationBasisContractForHazard(input: {
  mutation_hazard: GovernanceMutationHazardContractRecord;
}): GovernanceMutationBasisContractRecord {
  const { mutation_hazard } = input;
  return normalizeGovernanceMutationBasisContract({
    access_binding_hash: mutation_hazard.access_binding_hash,
    approval_requirement: mutation_hazard.approval_requirement,
    bounded_safe_mutation: mutation_hazard.bounded_safe_mutation,
    commit_authority_posture: mutation_hazard.commit_authority_posture,
    dependency_topology_hash: mutation_hazard.dependency_topology_hash,
    hazard_contract_hash: mutation_hazard.hazard_contract_hash,
    policy_snapshot_hash: mutation_hazard.policy_snapshot_hash,
    predictability_score: mutation_hazard.predictability_score,
    required_approvals: mutation_hazard.required_approvals,
    simulation_basis_hash: mutation_hazard.simulation_basis_hash,
    simulation_confidence_score: mutation_hazard.simulation_confidence_score,
  });
}

function uniqueSorted(values: readonly string[]) {
  return [...new Set(values)].sort((left, right) =>
    left < right ? -1 : left > right ? 1 : 0,
  );
}

function sameSetSize<T>(values: readonly T[]) {
  return new Set(values).size;
}

export function governanceStagedGroupMutationBasisKey(
  group: GovernancePolicySnapshotStagedChangeGroup,
) {
  return {
    approval_requirement: group.mutation_hazard.approval_requirement,
    basis_contract_hash: group.mutation_basis_contract.basis_contract_hash,
    hazard_contract_hash: group.mutation_hazard.hazard_contract_hash,
    required_approvals_key: uniqueSorted(
      group.mutation_hazard.required_approvals,
    ).join("::"),
  };
}

export function governanceStagedGroupsShareAtomicMutationBasis(
  groups: readonly GovernancePolicySnapshotStagedChangeGroup[],
) {
  if (groups.length === 0) {
    return false;
  }
  const keys = groups.map(governanceStagedGroupMutationBasisKey);
  return (
    sameSetSize(keys.map((key) => key.hazard_contract_hash)) === 1 &&
    sameSetSize(keys.map((key) => key.basis_contract_hash)) === 1 &&
    sameSetSize(keys.map((key) => key.approval_requirement)) === 1 &&
    sameSetSize(keys.map((key) => key.required_approvals_key)) === 1
  );
}

export {
  buildGovernanceMutationBasisContractHashVector,
  deriveGovernanceMutationBasisContractHash,
};
