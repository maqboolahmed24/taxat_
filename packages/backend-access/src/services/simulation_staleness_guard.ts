import type { GovernanceAccessSimulationRecord } from "../models/governance_access_simulation.ts";
import type { StoredGovernanceAccessSimulationRecord } from "../repositories/governance_access_simulation_repository.ts";
import {
  normalizeStringSet,
  requireTrimmedString,
} from "./principal_context_normalizer.ts";

export type SimulationStalenessCode =
  | "AUTHORIZATION_DECISION_BINDING_STALE"
  | "AUTHORITY_BOUNDARY_CONFLICT"
  | "AUTHORITY_CHAIN_CONFLICT"
  | "DEPENDENCY_TOPOLOGY_HASH_STALE"
  | "INVENTORY_SLICE_STALE"
  | "MIXED_SIMULATION_BASIS"
  | "MUTATION_BASIS_CONTRACT_STALE"
  | "POLICY_SNAPSHOT_HASH_STALE"
  | "REQUIRED_APPROVAL_PATH_STALE"
  | "SIMULATION_BASIS_HASH_STALE";

type SimulationStalenessGuardErrorCode =
  | "SIMULATION_STALENESS_DETECTED"
  | "SIMULATION_STALENESS_MIXED_BASIS";

export class SimulationStalenessGuardError extends Error {
  readonly code: SimulationStalenessGuardErrorCode;
  readonly mismatch_codes: SimulationStalenessCode[];

  constructor(
    code: SimulationStalenessGuardErrorCode,
    detail: string,
    mismatch_codes: SimulationStalenessCode[],
  ) {
    super(`${code}: ${detail}`);
    this.name = "SimulationStalenessGuardError";
    this.code = code;
    this.mismatch_codes = mismatch_codes;
  }
}

export type SimulationStalenessEvaluation = {
  current_basis_contract_hash: string | null;
  current_dependency_topology_hash: string | null;
  current_inventory_slice_refs: string[];
  current_policy_snapshot_hash: string;
  current_required_approvals: string[];
  current_simulation_basis_hash: string | null;
  mismatch_codes: SimulationStalenessCode[];
  stale: boolean;
};

export type SimulationFreshnessInput = {
  current_authority_chain_layers?: GovernanceAccessSimulationRecord["authority_chain_layers"];
  current_authority_layer_boundary?: GovernanceAccessSimulationRecord["authority_layer_boundary"];
  current_authorization_decision_access_binding_hash?: string;
  current_basis_contract_hash: string | null;
  current_dependency_topology_hash: string | null;
  current_inventory_slice_refs?: string[];
  current_policy_snapshot_hash: string;
  current_required_approvals?: string[];
  current_simulation_basis_hash: string | null;
  stored_simulation: StoredGovernanceAccessSimulationRecord;
};

function arraysEqual(left: readonly string[], right: readonly string[]) {
  return (
    left.length === right.length &&
    left.every((value, index) => value === right[index])
  );
}

export class SimulationStalenessGuard {
  evaluate(input: SimulationFreshnessInput): SimulationStalenessEvaluation {
    const mismatch_codes: SimulationStalenessCode[] = [];
    const current_inventory_slice_refs = normalizeStringSet(
      "current_inventory_slice_refs",
      input.current_inventory_slice_refs ?? [],
    );
    const current_required_approvals = normalizeStringSet(
      "current_required_approvals",
      input.current_required_approvals ??
        input.stored_simulation.simulation.mutation_basis_contract?.required_approvals ??
        [],
    );

    if (
      requireTrimmedString(
        "current_policy_snapshot_hash",
        input.current_policy_snapshot_hash,
      ) !== input.stored_simulation.policy_snapshot_hash
    ) {
      mismatch_codes.push("POLICY_SNAPSHOT_HASH_STALE");
    }
    if (
      (input.current_dependency_topology_hash ?? null) !==
      input.stored_simulation.dependency_topology_hash
    ) {
      mismatch_codes.push("DEPENDENCY_TOPOLOGY_HASH_STALE");
    }
    if (
      (input.current_simulation_basis_hash ?? null) !==
      input.stored_simulation.simulation_basis_hash
    ) {
      mismatch_codes.push("SIMULATION_BASIS_HASH_STALE");
    }
    if (
      (input.current_basis_contract_hash ?? null) !==
      input.stored_simulation.basis_contract_hash
    ) {
      mismatch_codes.push("MUTATION_BASIS_CONTRACT_STALE");
    }
    if (
      input.current_authorization_decision_access_binding_hash !== undefined &&
      input.current_authorization_decision_access_binding_hash !==
        input.stored_simulation.authorization_decision_access_binding_hash
    ) {
      mismatch_codes.push("AUTHORIZATION_DECISION_BINDING_STALE");
    }
    if (
      !arraysEqual(
        current_required_approvals,
        input.stored_simulation.simulation.mutation_basis_contract?.required_approvals ?? [],
      )
    ) {
      mismatch_codes.push("REQUIRED_APPROVAL_PATH_STALE");
    }
    if (
      !arraysEqual(
        current_inventory_slice_refs,
        input.stored_simulation.inventory_slice_refs,
      )
    ) {
      mismatch_codes.push("INVENTORY_SLICE_STALE");
    }
    if (
      input.current_authority_layer_boundary !== undefined &&
      JSON.stringify(input.current_authority_layer_boundary) !==
        JSON.stringify(input.stored_simulation.simulation.authority_layer_boundary)
    ) {
      mismatch_codes.push("AUTHORITY_BOUNDARY_CONFLICT");
    }
    if (
      input.current_authority_chain_layers !== undefined &&
      JSON.stringify(input.current_authority_chain_layers) !==
        JSON.stringify(input.stored_simulation.simulation.authority_chain_layers)
    ) {
      mismatch_codes.push("AUTHORITY_CHAIN_CONFLICT");
    }

    return {
      stale: mismatch_codes.length > 0,
      mismatch_codes,
      current_policy_snapshot_hash: input.current_policy_snapshot_hash,
      current_dependency_topology_hash: input.current_dependency_topology_hash,
      current_simulation_basis_hash: input.current_simulation_basis_hash,
      current_basis_contract_hash: input.current_basis_contract_hash,
      current_required_approvals,
      current_inventory_slice_refs,
    };
  }

  assertFresh(input: SimulationFreshnessInput) {
    const evaluation = this.evaluate(input);
    if (evaluation.stale) {
      throw new SimulationStalenessGuardError(
        "SIMULATION_STALENESS_DETECTED",
        "governance simulation basis is stale against the current commit-time guard bundle",
        evaluation.mismatch_codes,
      );
    }
    return evaluation;
  }

  assertSingleBasisBatch(simulations: StoredGovernanceAccessSimulationRecord[]) {
    const distinctBasisHashes = normalizeStringSet(
      "basis_contract_hashes",
      simulations.map((simulation) => simulation.basis_contract_hash).filter(
        (value): value is string => value !== null,
      ),
    );
    if (distinctBasisHashes.length > 1) {
      throw new SimulationStalenessGuardError(
        "SIMULATION_STALENESS_MIXED_BASIS",
        "mixed staged governance mutations must not present more than one basis contract as one atomic write",
        ["MIXED_SIMULATION_BASIS"],
      );
    }
    return distinctBasisHashes[0] ?? null;
  }
}
