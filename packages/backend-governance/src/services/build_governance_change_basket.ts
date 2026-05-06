import type {
  GovernanceMutationBasisContract,
  GovernanceMutationHazardContract,
  GovernancePolicySnapshotChangeBasket,
  GovernancePolicySnapshotStagedChangeGroup,
} from "../../../generated-models/src/generated/typescript/governance-and-policy.ts";
import { governanceStagedGroupsShareAtomicMutationBasis } from "./build_governance_mutation_basis_contract.ts";

export type BuildGovernanceChangeBasketInput = {
  currentPolicySnapshotHash?: string | undefined;
  directSubmissionRequested?: boolean | undefined;
  receiptPending?: boolean | undefined;
  readyToSubmit?: boolean | undefined;
  stagedChangeGroups?: readonly GovernancePolicySnapshotStagedChangeGroup[] | undefined;
  stale?: boolean | undefined;
  stepUpPending?: boolean | undefined;
};

export class GovernanceChangeBasketProjectionError extends Error {
  constructor(detail: string) {
    super(`GOVERNANCE_CHANGE_BASKET_INVALID: ${detail}`);
    this.name = "GovernanceChangeBasketProjectionError";
  }
}

function uniqueSorted(values: readonly string[]) {
  return [...new Set(values)].sort((left, right) => left.localeCompare(right));
}

function cloneGroups(
  groups: readonly GovernancePolicySnapshotStagedChangeGroup[],
) {
  return structuredClone(groups) as GovernancePolicySnapshotStagedChangeGroup[];
}

function assertGroupBasisMatchesHazard(
  group: GovernancePolicySnapshotStagedChangeGroup,
) {
  const hazard = group.mutation_hazard;
  const basis = group.mutation_basis_contract;
  const requiredApprovals = uniqueSorted(hazard.required_approvals);
  const basisRequiredApprovals = uniqueSorted(basis.required_approvals);
  const mismatches = [
    ["policy_snapshot_hash", basis.policy_snapshot_hash, hazard.policy_snapshot_hash],
    ["access_binding_hash", basis.access_binding_hash, hazard.access_binding_hash],
    [
      "dependency_topology_hash",
      basis.dependency_topology_hash,
      hazard.dependency_topology_hash,
    ],
    ["simulation_basis_hash", basis.simulation_basis_hash, hazard.simulation_basis_hash],
    ["hazard_contract_hash", basis.hazard_contract_hash, hazard.hazard_contract_hash],
    ["approval_requirement", basis.approval_requirement, hazard.approval_requirement],
    ["bounded_safe_mutation", basis.bounded_safe_mutation, hazard.bounded_safe_mutation],
    [
      "simulation_confidence_score",
      basis.simulation_confidence_score,
      hazard.simulation_confidence_score,
    ],
    ["predictability_score", basis.predictability_score, hazard.predictability_score],
    ["commit_authority_posture", basis.commit_authority_posture, hazard.commit_authority_posture],
    ["required_approvals", basisRequiredApprovals.join("|"), requiredApprovals.join("|")],
  ].filter(([, left, right]) => left !== right);

  if (mismatches.length > 0) {
    throw new GovernanceChangeBasketProjectionError(
      `staged group ${group.object_type} carries a mutation basis that drifts from its reviewed hazard: ${mismatches
        .map(([field]) => field)
        .join(", ")}`,
    );
  }
}

function assertUniqueChangeRefs(
  groups: readonly GovernancePolicySnapshotStagedChangeGroup[],
) {
  const seen = new Set<string>();
  const duplicates = new Set<string>();
  for (const group of groups) {
    for (const change of group.staged_changes) {
      if (seen.has(change.change_ref)) {
        duplicates.add(change.change_ref);
      }
      seen.add(change.change_ref);
      if (change.input_commit_mode !== "EXPLICIT_STAGE") {
        throw new GovernanceChangeBasketProjectionError(
          `staged change ${change.change_ref} must use EXPLICIT_STAGE commit mode`,
        );
      }
    }
  }
  if (duplicates.size > 0) {
    throw new GovernanceChangeBasketProjectionError(
      `duplicate staged change refs: ${[...duplicates].sort().join(", ")}`,
    );
  }
}

function sameSetSize<T>(values: readonly T[]) {
  return new Set(values).size;
}

function groupPairs(groups: readonly GovernancePolicySnapshotStagedChangeGroup[]) {
  return groups.map((group) => [
    group.mutation_hazard.simulation_basis_hash,
    group.mutation_hazard.dependency_topology_hash,
  ] as const);
}

function firstGroupValue<T>(
  groups: readonly GovernancePolicySnapshotStagedChangeGroup[],
  selector: (group: GovernancePolicySnapshotStagedChangeGroup) => T,
) {
  const value = groups[0] ? selector(groups[0]) : null;
  if (value === null) {
    throw new GovernanceChangeBasketProjectionError("staged change groups are empty");
  }
  return value;
}

function isPolicyStale(input: {
  currentPolicySnapshotHash?: string | undefined;
  groups: readonly GovernancePolicySnapshotStagedChangeGroup[];
  stale?: boolean | undefined;
}) {
  if (input.stale) {
    return true;
  }
  if (!input.currentPolicySnapshotHash) {
    return false;
  }
  return input.groups.some(
    (group) =>
      group.mutation_hazard.policy_snapshot_hash !== input.currentPolicySnapshotHash ||
      group.mutation_basis_contract.policy_snapshot_hash !== input.currentPolicySnapshotHash,
  );
}

function canDirectSubmit(input: {
  activeBasis: GovernanceMutationBasisContract;
  activeHazard: GovernanceMutationHazardContract;
  directSubmissionRequested?: boolean | undefined;
  receiptPending: boolean;
  stepUpPending: boolean;
}) {
  return Boolean(
    input.directSubmissionRequested &&
      !input.stepUpPending &&
      !input.receiptPending &&
      input.activeHazard.commit_authority_posture === "BOUNDED_SAFE" &&
      input.activeBasis.commit_authority_posture === "BOUNDED_SAFE" &&
      input.activeHazard.approval_requirement === "NOT_REQUIRED" &&
      input.activeBasis.approval_requirement === "NOT_REQUIRED" &&
      input.activeHazard.bounded_safe_mutation === 1 &&
      input.activeBasis.bounded_safe_mutation === 1,
  );
}

export function buildGovernanceChangeBasket(
  input: BuildGovernanceChangeBasketInput = {},
): GovernancePolicySnapshotChangeBasket {
  const staged_change_groups = cloneGroups(input.stagedChangeGroups ?? []);
  const stepUpPending = input.stepUpPending === true;
  const receiptPending = input.receiptPending === true;

  if (staged_change_groups.length === 0) {
    return {
      active_dependency_topology_hash: null,
      active_mutation_basis_contract_or_null: null,
      active_mutation_hazard_or_null: null,
      active_simulation_basis_hash: null,
      approval_requirement: null,
      basket_state: "EMPTY",
      bounded_safe_mutation: null,
      required_approvals: [],
      simulation_atomicity: "EMPTY",
      staged_change_groups: [],
      step_up_pending: false,
      submission_enabled: false,
    };
  }

  for (const group of staged_change_groups) {
    assertGroupBasisMatchesHazard(group);
  }
  assertUniqueChangeRefs(staged_change_groups);

  const stale = isPolicyStale({
    currentPolicySnapshotHash: input.currentPolicySnapshotHash,
    groups: staged_change_groups,
    stale: input.stale,
  });
  if (stale) {
    return {
      active_dependency_topology_hash: null,
      active_mutation_basis_contract_or_null: null,
      active_mutation_hazard_or_null: null,
      active_simulation_basis_hash: null,
      approval_requirement: null,
      basket_state: "STALE_REBASE_REQUIRED",
      bounded_safe_mutation: null,
      required_approvals: [],
      simulation_atomicity: "STALE_BASIS_BLOCKED",
      staged_change_groups,
      step_up_pending: false,
      submission_enabled: false,
    };
  }

  const pairs = groupPairs(staged_change_groups);
  const atomic =
    sameSetSize(pairs.map(([simulation, topology]) => `${simulation}::${topology}`)) === 1 &&
    governanceStagedGroupsShareAtomicMutationBasis(staged_change_groups) &&
    sameSetSize(
      staged_change_groups.map((group) => group.mutation_hazard.bounded_safe_mutation),
    ) === 1;

  if (!atomic) {
    return {
      active_dependency_topology_hash: null,
      active_mutation_basis_contract_or_null: null,
      active_mutation_hazard_or_null: null,
      active_simulation_basis_hash: null,
      approval_requirement: null,
      basket_state: "DRAFTING",
      bounded_safe_mutation: null,
      required_approvals: [],
      simulation_atomicity: "MIXED_BASIS_BLOCKED",
      staged_change_groups,
      step_up_pending: false,
      submission_enabled: false,
    };
  }

  const activeHazard = structuredClone(
    firstGroupValue(staged_change_groups, (group) => group.mutation_hazard),
  ) as GovernanceMutationHazardContract;
  const activeBasis = structuredClone(
    firstGroupValue(staged_change_groups, (group) => group.mutation_basis_contract),
  ) as GovernanceMutationBasisContract;
  const submission_enabled = canDirectSubmit({
    activeBasis,
    activeHazard,
    directSubmissionRequested: input.directSubmissionRequested,
    receiptPending,
    stepUpPending,
  });

  return {
    active_dependency_topology_hash: activeHazard.dependency_topology_hash,
    active_mutation_basis_contract_or_null: activeBasis,
    active_mutation_hazard_or_null: activeHazard,
    active_simulation_basis_hash: activeHazard.simulation_basis_hash,
    approval_requirement: activeHazard.approval_requirement,
    basket_state: stepUpPending
      ? "STEP_UP_REQUIRED"
      : receiptPending
        ? "RECEIPT_PENDING"
        : submission_enabled || input.readyToSubmit
          ? "READY_TO_SUBMIT"
          : "DRAFTING",
    bounded_safe_mutation: activeHazard.bounded_safe_mutation,
    required_approvals: uniqueSorted(activeHazard.required_approvals),
    simulation_atomicity: "ATOMIC",
    staged_change_groups,
    step_up_pending: stepUpPending,
    submission_enabled,
  };
}
