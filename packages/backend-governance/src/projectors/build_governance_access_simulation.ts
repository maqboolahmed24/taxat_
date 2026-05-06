import type {
  GovernanceMutationSimulator,
  GovernanceMutationSimulatorInput,
} from "../../../backend-access/src/services/governance_mutation_simulator.ts";
import {
  normalizeGovernanceAccessSimulationRecord,
  type GovernanceAccessSimulationRecord,
} from "../../../backend-access/src/models/governance_access_simulation.ts";
import {
  buildGovernanceAuthorityChainLayers,
  type BuildGovernanceAuthorityChainLayersInput,
} from "../services/build_authority_chain_layers.ts";
import { deriveGovernanceSimulatorPosture } from "../services/derive_governance_simulator_posture.ts";

export type BuildGovernanceAccessSimulationInput = Omit<
  GovernanceMutationSimulatorInput,
  "persist"
> & {
  authorityChainOptions?: Omit<
    BuildGovernanceAuthorityChainLayersInput,
    "authority_layer_boundary"
  >;
  simulator?: GovernanceMutationSimulator;
  simulatorDependencies?: ConstructorParameters<typeof GovernanceMutationSimulator>[0];
};

async function buildReadOnlyGovernanceAccessSimulation(
  input: BuildGovernanceAccessSimulationInput & {
    authorization_decision: NonNullable<
      BuildGovernanceAccessSimulationInput["authorization_decision"]
    >;
    mutation_capable: false;
  },
): Promise<GovernanceAccessSimulationRecord> {
  const authority_chain_layers = await buildGovernanceAuthorityChainLayers({
    ...(input.authorityChainOptions ?? {}),
    authority_layer_boundary: input.authorization_decision.authority_layer_boundary,
  });

  return normalizeGovernanceAccessSimulationRecord({
    tenant_id: input.principal_context.tenant_id,
    policy_snapshot_hash: input.principal_context.policy_snapshot_hash,
    principal_context_ref: input.principal_context.principal_id,
    governance_target_ref: input.governance_target_ref,
    resource_class: input.resource_class,
    action_family: input.action_family,
    requested_scope:
      input.principal_context
        .requested_scope as GovernanceAccessSimulationRecord["requested_scope"],
    requested_partition_scope_refs: input.principal_context.partition_scope_refs,
    authorization_decision: input.authorization_decision,
    authority_chain_layers,
    mutation_hazard: null,
    mutation_basis_contract: null,
    simulated_at: input.simulated_at,
    simulator_posture: "READ_ONLY_DECISION",
  });
}

export async function buildGovernanceAccessSimulation(
  input: BuildGovernanceAccessSimulationInput,
): Promise<GovernanceAccessSimulationRecord> {
  if (input.mutation_capable === false && input.authorization_decision) {
    return buildReadOnlyGovernanceAccessSimulation({
      ...input,
      authorization_decision: input.authorization_decision,
      mutation_capable: false,
    });
  }

  const {
    authorityChainOptions,
    simulator,
    simulatorDependencies,
    ...simulatorInput
  } = input;
  const simulationEngine =
    simulator ??
    new (await import(
      "../../../backend-access/src/services/governance_mutation_simulator.ts"
    )).GovernanceMutationSimulator(simulatorDependencies);
  const result = await simulationEngine.simulate({
    ...simulatorInput,
    persist: false,
  });
  const authority_chain_layers = await buildGovernanceAuthorityChainLayers({
    ...(authorityChainOptions ?? {}),
    authority_layer_boundary:
      result.simulation.authorization_decision.authority_layer_boundary,
  });

  return normalizeGovernanceAccessSimulationRecord({
    ...result.simulation,
    authority_chain_layers,
    simulator_posture: deriveGovernanceSimulatorPosture({
      mutation_hazard: result.simulation.mutation_hazard,
    }),
  });
}
