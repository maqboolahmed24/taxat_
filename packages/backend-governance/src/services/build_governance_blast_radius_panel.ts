import type {
  GovernanceMutationBasisContract,
  GovernanceMutationHazardContract,
  GovernancePolicySnapshotBlastRadiusPanel,
  GovernancePolicySnapshotChangeBasket,
  GovernancePolicySnapshotStagedChangeGroup,
} from "../../../generated-models/src/generated/typescript/governance-and-policy.ts";

export type BuildGovernanceBlastRadiusPanelInput = {
  changeBasket: GovernancePolicySnapshotChangeBasket;
  visibleGroupRef?: string | null | undefined;
};

export class GovernanceBlastRadiusPanelProjectionError extends Error {
  constructor(detail: string) {
    super(`GOVERNANCE_BLAST_RADIUS_PANEL_INVALID: ${detail}`);
    this.name = "GovernanceBlastRadiusPanelProjectionError";
  }
}

function emptyPanel(): GovernancePolicySnapshotBlastRadiusPanel {
  return {
    mutation_basis_contract_or_null: null,
    mutation_hazard_or_null: null,
    panel_state: "EMPTY",
  };
}

function groupRef(group: GovernancePolicySnapshotStagedChangeGroup) {
  return `${group.object_type}:${group.mutation_basis_contract.basis_contract_hash}`;
}

function selectVisibleGroup(input: BuildGovernanceBlastRadiusPanelInput) {
  const groups = input.changeBasket.staged_change_groups;
  if (groups.length === 0) {
    return null;
  }
  if (!input.visibleGroupRef) {
    return groups[0]!;
  }
  const selected = groups.find((group) => groupRef(group) === input.visibleGroupRef);
  if (!selected) {
    throw new GovernanceBlastRadiusPanelProjectionError(
      `visibleGroupRef ${input.visibleGroupRef} is not present in the staged basket`,
    );
  }
  return selected;
}

export function buildGovernanceBlastRadiusPanel(
  input: BuildGovernanceBlastRadiusPanelInput,
): GovernancePolicySnapshotBlastRadiusPanel {
  const basket = input.changeBasket;
  if (basket.staged_change_groups.length === 0) {
    return emptyPanel();
  }

  if (
    basket.simulation_atomicity === "ATOMIC" &&
    basket.active_mutation_hazard_or_null !== null &&
    basket.active_mutation_basis_contract_or_null !== null
  ) {
    return {
      mutation_basis_contract_or_null: structuredClone(
        basket.active_mutation_basis_contract_or_null,
      ) as GovernanceMutationBasisContract,
      mutation_hazard_or_null: structuredClone(
        basket.active_mutation_hazard_or_null,
      ) as GovernanceMutationHazardContract,
      panel_state:
        basket.basket_state === "STALE_REBASE_REQUIRED" ? "STALE" : "ACTIVE",
    };
  }

  const visibleGroup = selectVisibleGroup(input);
  if (!visibleGroup) {
    return emptyPanel();
  }

  return {
    mutation_basis_contract_or_null: structuredClone(
      visibleGroup.mutation_basis_contract,
    ) as GovernanceMutationBasisContract,
    mutation_hazard_or_null: structuredClone(
      visibleGroup.mutation_hazard,
    ) as GovernanceMutationHazardContract,
    panel_state:
      basket.basket_state === "STALE_REBASE_REQUIRED" ? "STALE" : "ACTIVE",
  };
}
