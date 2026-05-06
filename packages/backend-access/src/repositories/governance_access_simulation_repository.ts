import type { GovernanceAccessSimulationRecord } from "../models/governance_access_simulation.ts";
import type { GovernanceMutationBasisContractRecord } from "../models/governance_mutation_basis_contract.ts";
import type { GovernanceMutationHazardContractRecord } from "../models/governance_mutation_hazard_contract.ts";
import type { PrincipalContextRecord } from "../models/principal_context.ts";

export type StoredGovernanceAccessSimulationRecord = {
  action_family: string;
  authorization_decision_access_binding_hash: string;
  basis_contract_hash: string | null;
  dependency_topology_hash: string | null;
  governance_target_ref: string | null;
  hazard_contract_hash: string | null;
  inventory_slice_refs: string[];
  persisted_at: string;
  policy_snapshot_hash: string;
  principal_context_access_binding_hash: string;
  principal_id: string;
  proposed_diff_hash: string | null;
  requested_approver_scope: string[];
  resource_class: string;
  session_id: string;
  simulation: GovernanceAccessSimulationRecord;
  simulation_basis_hash: string | null;
  simulation_profile_ref: string | null;
  tenant_id: string;
};

type GovernanceAccessSimulationRepositoryErrorCode =
  | "GOVERNANCE_ACCESS_SIMULATION_BASIS_NOT_FOUND"
  | "GOVERNANCE_ACCESS_SIMULATION_DUPLICATE"
  | "GOVERNANCE_ACCESS_SIMULATION_HAZARD_NOT_FOUND"
  | "GOVERNANCE_ACCESS_SIMULATION_NOT_FOUND";

export class GovernanceAccessSimulationRepositoryError extends Error {
  readonly code: GovernanceAccessSimulationRepositoryErrorCode;

  constructor(
    code: GovernanceAccessSimulationRepositoryErrorCode,
    detail: string,
  ) {
    super(`${code}: ${detail}`);
    this.name = "GovernanceAccessSimulationRepositoryError";
    this.code = code;
  }
}

function cloneSimulation(record: StoredGovernanceAccessSimulationRecord) {
  return structuredClone(record);
}

function cloneHazard(record: GovernanceMutationHazardContractRecord) {
  return structuredClone(record);
}

function cloneBasis(record: GovernanceMutationBasisContractRecord) {
  return structuredClone(record);
}

function compositeKey(...parts: string[]) {
  return parts.join("::");
}

export class GovernanceAccessSimulationRepository {
  private readonly simulations = new Map<string, StoredGovernanceAccessSimulationRecord>();
  private readonly hazards = new Map<string, GovernanceMutationHazardContractRecord>();
  private readonly bases = new Map<string, GovernanceMutationBasisContractRecord>();
  private readonly simulationsByPolicySnapshot = new Map<string, string[]>();
  private readonly simulationsByDecisionAccessBindingHash = new Map<string, string[]>();
  private readonly simulationsBySession = new Map<string, string[]>();
  private readonly simulationsBySimulationBasisHash = new Map<string, string[]>();
  private readonly simulationsByDependencyTopologyHash = new Map<string, string[]>();

  private pushIndex(index: Map<string, string[]>, key: string, value: string) {
    const current = index.get(key) ?? [];
    if (!current.includes(value)) {
      current.push(value);
      index.set(key, current);
    }
  }

  async storeSimulation(input: {
    inventory_slice_refs?: string[];
    persisted_at: string;
    principal_context: PrincipalContextRecord;
    proposed_diff_hash?: string | null;
    requested_approver_scope?: string[];
    simulation: GovernanceAccessSimulationRecord;
    simulation_profile_ref?: string | null;
  }) {
    if (input.simulation.mutation_hazard !== null) {
      this.hazards.set(
        input.simulation.mutation_hazard.hazard_contract_hash,
        cloneHazard(input.simulation.mutation_hazard),
      );
    }
    if (input.simulation.mutation_basis_contract !== null) {
      this.bases.set(
        input.simulation.mutation_basis_contract.basis_contract_hash,
        cloneBasis(input.simulation.mutation_basis_contract),
      );
    }

    const record: StoredGovernanceAccessSimulationRecord = {
      tenant_id: input.principal_context.tenant_id,
      principal_id: input.principal_context.principal_id,
      session_id: input.principal_context.session_id,
      principal_context_access_binding_hash: input.principal_context.access_binding_hash,
      authorization_decision_access_binding_hash:
        input.simulation.authorization_decision.access_binding_hash,
      policy_snapshot_hash: input.simulation.policy_snapshot_hash,
      governance_target_ref: input.simulation.governance_target_ref,
      resource_class: input.simulation.resource_class,
      action_family: input.simulation.action_family,
      simulation_basis_hash:
        input.simulation.mutation_hazard?.simulation_basis_hash ?? null,
      dependency_topology_hash:
        input.simulation.mutation_hazard?.dependency_topology_hash ?? null,
      hazard_contract_hash:
        input.simulation.mutation_hazard?.hazard_contract_hash ?? null,
      basis_contract_hash:
        input.simulation.mutation_basis_contract?.basis_contract_hash ?? null,
      inventory_slice_refs: structuredClone(input.inventory_slice_refs ?? []),
      requested_approver_scope: structuredClone(input.requested_approver_scope ?? []),
      proposed_diff_hash: input.proposed_diff_hash ?? null,
      simulation_profile_ref: input.simulation_profile_ref ?? null,
      persisted_at: input.persisted_at,
      simulation: structuredClone(input.simulation),
    };

    const existing = this.simulations.get(record.simulation.simulation_id);
    if (existing) {
      if (JSON.stringify(existing) !== JSON.stringify(record)) {
        throw new GovernanceAccessSimulationRepositoryError(
          "GOVERNANCE_ACCESS_SIMULATION_DUPLICATE",
          `simulation ${record.simulation.simulation_id} already exists with a different frozen payload`,
        );
      }
      return cloneSimulation(existing);
    }

    this.simulations.set(record.simulation.simulation_id, cloneSimulation(record));
    this.pushIndex(
      this.simulationsByPolicySnapshot,
      compositeKey(record.tenant_id, record.policy_snapshot_hash),
      record.simulation.simulation_id,
    );
    this.pushIndex(
      this.simulationsByDecisionAccessBindingHash,
      compositeKey(record.tenant_id, record.authorization_decision_access_binding_hash),
      record.simulation.simulation_id,
    );
    this.pushIndex(
      this.simulationsBySession,
      compositeKey(record.tenant_id, record.session_id),
      record.simulation.simulation_id,
    );
    if (record.simulation_basis_hash !== null) {
      this.pushIndex(
        this.simulationsBySimulationBasisHash,
        compositeKey(record.tenant_id, record.simulation_basis_hash),
        record.simulation.simulation_id,
      );
    }
    if (record.dependency_topology_hash !== null) {
      this.pushIndex(
        this.simulationsByDependencyTopologyHash,
        compositeKey(record.tenant_id, record.dependency_topology_hash),
        record.simulation.simulation_id,
      );
    }
    return cloneSimulation(record);
  }

  async getSimulationById(simulationId: string) {
    const record = this.simulations.get(simulationId);
    return record ? cloneSimulation(record) : null;
  }

  async requireSimulationById(simulationId: string) {
    const record = await this.getSimulationById(simulationId);
    if (!record) {
      throw new GovernanceAccessSimulationRepositoryError(
        "GOVERNANCE_ACCESS_SIMULATION_NOT_FOUND",
        `simulation ${simulationId} does not exist`,
      );
    }
    return record;
  }

  private listSimulations(ids: string[]) {
    return ids
      .map((id) => this.simulations.get(id))
      .filter(
        (record): record is StoredGovernanceAccessSimulationRecord =>
          record !== undefined,
      )
      .sort((left, right) =>
        left.persisted_at.localeCompare(right.persisted_at),
      )
      .map((record) => cloneSimulation(record));
  }

  async listSimulationsByPolicySnapshotHash(
    tenantId: string,
    policySnapshotHash: string,
  ) {
    return this.listSimulations(
      this.simulationsByPolicySnapshot.get(
        compositeKey(tenantId, policySnapshotHash),
      ) ?? [],
    );
  }

  async listSimulationsByAuthorizationDecisionAccessBindingHash(
    tenantId: string,
    accessBindingHash: string,
  ) {
    return this.listSimulations(
      this.simulationsByDecisionAccessBindingHash.get(
        compositeKey(tenantId, accessBindingHash),
      ) ?? [],
    );
  }

  async listSimulationsBySessionId(tenantId: string, sessionId: string) {
    return this.listSimulations(
      this.simulationsBySession.get(compositeKey(tenantId, sessionId)) ?? [],
    );
  }

  async listSimulationsBySimulationBasisHash(
    tenantId: string,
    simulationBasisHash: string,
  ) {
    return this.listSimulations(
      this.simulationsBySimulationBasisHash.get(
        compositeKey(tenantId, simulationBasisHash),
      ) ?? [],
    );
  }

  async listSimulationsByDependencyTopologyHash(
    tenantId: string,
    dependencyTopologyHash: string,
  ) {
    return this.listSimulations(
      this.simulationsByDependencyTopologyHash.get(
        compositeKey(tenantId, dependencyTopologyHash),
      ) ?? [],
    );
  }

  async getHazardContractByHash(hazardContractHash: string) {
    const record = this.hazards.get(hazardContractHash);
    return record ? cloneHazard(record) : null;
  }

  async requireHazardContractByHash(hazardContractHash: string) {
    const record = await this.getHazardContractByHash(hazardContractHash);
    if (!record) {
      throw new GovernanceAccessSimulationRepositoryError(
        "GOVERNANCE_ACCESS_SIMULATION_HAZARD_NOT_FOUND",
        `hazard contract ${hazardContractHash} does not exist`,
      );
    }
    return record;
  }

  async getBasisContractByHash(basisContractHash: string) {
    const record = this.bases.get(basisContractHash);
    return record ? cloneBasis(record) : null;
  }

  async requireBasisContractByHash(basisContractHash: string) {
    const record = await this.getBasisContractByHash(basisContractHash);
    if (!record) {
      throw new GovernanceAccessSimulationRepositoryError(
        "GOVERNANCE_ACCESS_SIMULATION_BASIS_NOT_FOUND",
        `basis contract ${basisContractHash} does not exist`,
      );
    }
    return record;
  }
}
