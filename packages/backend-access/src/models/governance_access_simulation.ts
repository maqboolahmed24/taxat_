import type {
  GovernanceAccessSimulation as SchemaGovernanceAccessSimulation,
  GovernanceAccessSimulationAuthorityChainLayerStack,
  GovernanceAccessSimulationSimulatorPosture,
} from "../../../generated-models/src/generated/typescript/governance-and-policy.ts";
import { stableJsonHash } from "../../../domain-kernel/src/primitives/hash.ts";
import { normalizeUtcInstantString } from "../../../domain-kernel/src/primitives/time.ts";

import type { AuthorizationDecisionRecord } from "./authorization_decision.ts";
import type { GovernedAuthorityLayerBoundaryContractForScope } from "./authority_layer_boundary_contract.ts";
import {
  normalizeGovernanceMutationBasisContract,
  type CreateGovernanceMutationBasisContractInput,
  type GovernanceMutationBasisContractRecord,
} from "./governance_mutation_basis_contract.ts";
import {
  expectedGovernanceCommitAuthorityPosture,
  normalizeGovernanceMutationHazardContract,
  type CreateGovernanceMutationHazardContractInput,
  type GovernanceMutationHazardContractRecord,
} from "./governance_mutation_hazard_contract.ts";
import {
  AUTHORITY_CHAIN_LAYER_CODES,
  rebindAuthorityLayerBoundaryScope,
} from "./authority_layer_boundary_contract.ts";
import {
  normalizeScopeSequence,
  normalizeStringSet,
  requireTrimmedString,
} from "../services/principal_context_normalizer.ts";

export type GovernanceAccessSimulationRecord = SchemaGovernanceAccessSimulation;

export type CreateGovernanceAccessSimulationInput = Omit<
  GovernanceAccessSimulationRecord,
  | "artifact_type"
  | "simulation_id"
  | "authority_layer_boundary"
  | "mutation_basis_contract"
  | "mutation_hazard"
> & {
  artifact_type?: "GovernanceAccessSimulation";
  authority_layer_boundary?: GovernanceAccessSimulationRecord["authority_layer_boundary"];
  mutation_basis_contract?:
    | CreateGovernanceMutationBasisContractInput
    | GovernanceMutationBasisContractRecord
    | null;
  mutation_hazard?:
    | CreateGovernanceMutationHazardContractInput
    | GovernanceMutationHazardContractRecord
    | null;
  simulation_id?: string;
};

type GovernanceAccessSimulationModelErrorCode =
  | "GOVERNANCE_ACCESS_SIMULATION_FIELD_REQUIRED"
  | "GOVERNANCE_ACCESS_SIMULATION_INVALID";

export class GovernanceAccessSimulationModelError extends Error {
  readonly code: GovernanceAccessSimulationModelErrorCode;

  constructor(code: GovernanceAccessSimulationModelErrorCode, detail: string) {
    super(`${code}: ${detail}`);
    this.name = "GovernanceAccessSimulationModelError";
    this.code = code;
  }
}

function assertCondition(
  condition: unknown,
  code: GovernanceAccessSimulationModelErrorCode,
  detail: string,
): asserts condition {
  if (!condition) {
    throw new GovernanceAccessSimulationModelError(code, detail);
  }
}

function arraysEqual(left: readonly string[], right: readonly string[]) {
  return (
    left.length === right.length &&
    left.every((value, index) => value === right[index])
  );
}

function normalizeAuthorityChainLayers(
  input: GovernanceAccessSimulationAuthorityChainLayerStack,
) {
  assertCondition(
    Array.isArray(input) &&
      input.length >= 4 &&
      input.length <= 5,
    "GOVERNANCE_ACCESS_SIMULATION_FIELD_REQUIRED",
    "authority_chain_layers must retain the fixed governance authority-chain frame",
  );

  return input.map((layer, index) => {
    const expectedLayerCode = AUTHORITY_CHAIN_LAYER_CODES[index];
    const layer_code = requireTrimmedString(
      `authority_chain_layers[${index}].layer_code`,
      layer.layer_code,
    );
    const layer_outcome = requireTrimmedString(
      `authority_chain_layers[${index}].layer_outcome`,
      layer.layer_outcome,
    ) as GovernanceAccessSimulationAuthorityChainLayerStack[number]["layer_outcome"];
    const reason_codes = normalizeStringSet(
      `authority_chain_layers[${index}].reason_codes`,
      layer.reason_codes,
      { minItems: 1 },
    );

    assertCondition(
      layer_code === expectedLayerCode,
      "GOVERNANCE_ACCESS_SIMULATION_INVALID",
      `authority_chain_layers[${index}].layer_code must equal ${expectedLayerCode}`,
    );
    assertCondition(
      [
        "ALLOW",
        "ALLOW_MASKED",
        "REQUIRE_STEP_UP",
        "REQUIRE_APPROVAL",
        "DENY",
        "NOT_APPLICABLE",
      ].includes(layer_outcome),
      "GOVERNANCE_ACCESS_SIMULATION_INVALID",
      `authority_chain_layers[${index}].layer_outcome must remain supported`,
    );

    return {
      layer_code,
      layer_outcome,
      reason_codes,
    };
  }) as GovernanceAccessSimulationAuthorityChainLayerStack;
}

function deriveSimulatorPostureFromHazard(
  mutation_hazard: GovernanceMutationHazardContractRecord | null,
): GovernanceAccessSimulationSimulatorPosture {
  if (mutation_hazard === null) {
    return "READ_ONLY_DECISION";
  }
  switch (
    expectedGovernanceCommitAuthorityPosture({
      simulation_confidence_score: mutation_hazard.simulation_confidence_score,
      predictability_score: mutation_hazard.predictability_score,
      bounded_safe_mutation: mutation_hazard.bounded_safe_mutation,
    })
  ) {
    case "PREVIEW_ONLY":
      return "ADVISORY_ONLY";
    case "APPROVAL_GATED":
      return "APPROVAL_GATED";
    case "BOUNDED_SAFE":
      return "BOUNDED_SAFE";
  }
}

export function buildGovernanceAccessSimulationId(input: {
  action_family: string;
  governance_target_ref: string | null;
  policy_snapshot_hash: string;
  principal_context_ref: string;
  resource_class: string;
  simulated_at: string;
  simulation_basis_hash: string | null;
}) {
  return `governance-access-simulation.${stableJsonHash({
    principal_context_ref: input.principal_context_ref,
    resource_class: input.resource_class,
    action_family: input.action_family,
    policy_snapshot_hash: input.policy_snapshot_hash,
    governance_target_ref: input.governance_target_ref,
    simulation_basis_hash: input.simulation_basis_hash,
    simulated_at: input.simulated_at,
  })}`;
}

export function normalizeGovernanceAccessSimulationRecord(
  input: CreateGovernanceAccessSimulationInput,
): GovernanceAccessSimulationRecord {
  try {
    const tenant_id = requireTrimmedString("tenant_id", input.tenant_id);
    const policy_snapshot_hash = requireTrimmedString(
      "policy_snapshot_hash",
      input.policy_snapshot_hash,
    );
    const principal_context_ref = requireTrimmedString(
      "principal_context_ref",
      input.principal_context_ref,
    );
    const governance_target_ref =
      input.governance_target_ref === null
        ? null
        : requireTrimmedString("governance_target_ref", input.governance_target_ref);
    const resource_class = requireTrimmedString(
      "resource_class",
      input.resource_class,
    );
    const action_family = requireTrimmedString("action_family", input.action_family);
    const requested_scope = normalizeScopeSequence(
      "requested_scope",
      input.requested_scope,
    );
    const requested_partition_scope_refs = normalizeStringSet(
      "requested_partition_scope_refs",
      input.requested_partition_scope_refs ?? [],
    );
    const authorization_decision =
      input.authorization_decision as AuthorizationDecisionRecord;
    const mutation_hazard =
      input.mutation_hazard === null || input.mutation_hazard === undefined
        ? null
        : normalizeGovernanceMutationHazardContract(input.mutation_hazard);
    const mutation_basis_contract =
      input.mutation_basis_contract === null ||
      input.mutation_basis_contract === undefined
        ? null
        : normalizeGovernanceMutationBasisContract(input.mutation_basis_contract);
    const authority_layer_boundary =
      input.authority_layer_boundary ??
      (rebindAuthorityLayerBoundaryScope(
        authorization_decision.authority_layer_boundary,
        "GOVERNANCE_ACCESS_SIMULATION",
      ) as GovernedAuthorityLayerBoundaryContractForScope<"GOVERNANCE_ACCESS_SIMULATION">);
    const authority_chain_layers = normalizeAuthorityChainLayers(
      input.authority_chain_layers,
    );
    const simulated_at = normalizeUtcInstantString(input.simulated_at);
    const simulator_posture = (
      input.simulator_posture ??
      deriveSimulatorPostureFromHazard(mutation_hazard)
    ) as GovernanceAccessSimulationSimulatorPosture;

    assertCondition(
      authorization_decision.principal_context_ref === principal_context_ref,
      "GOVERNANCE_ACCESS_SIMULATION_INVALID",
      "authorization_decision.principal_context_ref must match the top-level principal_context_ref",
    );
    assertCondition(
      authorization_decision.resource_class === resource_class,
      "GOVERNANCE_ACCESS_SIMULATION_INVALID",
      "authorization_decision.resource_class must match the top-level resource_class",
    );
    assertCondition(
      authorization_decision.action_family === action_family,
      "GOVERNANCE_ACCESS_SIMULATION_INVALID",
      "authorization_decision.action_family must match the top-level action_family",
    );
    assertCondition(
      authorization_decision.policy_snapshot_hash === policy_snapshot_hash,
      "GOVERNANCE_ACCESS_SIMULATION_INVALID",
      "authorization_decision.policy_snapshot_hash must match the top-level policy_snapshot_hash",
    );

    const expectedBoundary = rebindAuthorityLayerBoundaryScope(
      authorization_decision.authority_layer_boundary,
      "GOVERNANCE_ACCESS_SIMULATION",
    );
    assertCondition(
      JSON.stringify(expectedBoundary) === JSON.stringify(authority_layer_boundary),
      "GOVERNANCE_ACCESS_SIMULATION_INVALID",
      "authority_layer_boundary must mirror authorization_decision.authority_layer_boundary",
    );

    if (mutation_hazard === null) {
      assertCondition(
        simulator_posture === "READ_ONLY_DECISION",
        "GOVERNANCE_ACCESS_SIMULATION_INVALID",
        "read-only simulations must keep simulator_posture = READ_ONLY_DECISION",
      );
      assertCondition(
        mutation_basis_contract === null,
        "GOVERNANCE_ACCESS_SIMULATION_INVALID",
        "read-only simulations must keep mutation_basis_contract = null",
      );
      assertCondition(
        authorization_decision.dependency_topology_hash === null &&
          authorization_decision.simulation_basis_hash === null &&
          authorization_decision.bounded_safe_mutation === null &&
          authorization_decision.approval_requirement === null,
        "GOVERNANCE_ACCESS_SIMULATION_INVALID",
        "read-only simulations must keep governance mutation fields null on authorization_decision",
      );
    } else {
      assertCondition(
        mutation_basis_contract !== null,
        "GOVERNANCE_ACCESS_SIMULATION_INVALID",
        "mutation-capable simulations must retain mutation_basis_contract",
      );
      assertCondition(
        authorization_decision.dependency_topology_hash ===
          mutation_hazard.dependency_topology_hash,
        "GOVERNANCE_ACCESS_SIMULATION_INVALID",
        "authorization_decision.dependency_topology_hash must match mutation_hazard",
      );
      assertCondition(
        authorization_decision.simulation_basis_hash ===
          mutation_hazard.simulation_basis_hash,
        "GOVERNANCE_ACCESS_SIMULATION_INVALID",
        "authorization_decision.simulation_basis_hash must match mutation_hazard",
      );
      assertCondition(
        authorization_decision.bounded_safe_mutation ===
          mutation_hazard.bounded_safe_mutation,
        "GOVERNANCE_ACCESS_SIMULATION_INVALID",
        "authorization_decision.bounded_safe_mutation must match mutation_hazard",
      );
      assertCondition(
        authorization_decision.approval_requirement ===
          mutation_hazard.approval_requirement,
        "GOVERNANCE_ACCESS_SIMULATION_INVALID",
        "authorization_decision.approval_requirement must match mutation_hazard",
      );
      assertCondition(
        arraysEqual(
          authorization_decision.required_approvals,
          mutation_hazard.required_approvals,
        ),
        "GOVERNANCE_ACCESS_SIMULATION_INVALID",
        "authorization_decision.required_approvals must match mutation_hazard.required_approvals",
      );
      assertCondition(
        mutation_basis_contract.policy_snapshot_hash === policy_snapshot_hash &&
          mutation_basis_contract.access_binding_hash ===
            authorization_decision.access_binding_hash &&
          mutation_basis_contract.dependency_topology_hash ===
            mutation_hazard.dependency_topology_hash &&
          mutation_basis_contract.simulation_basis_hash ===
            mutation_hazard.simulation_basis_hash &&
          mutation_basis_contract.hazard_contract_hash ===
            mutation_hazard.hazard_contract_hash &&
          mutation_basis_contract.approval_requirement ===
            mutation_hazard.approval_requirement &&
          mutation_basis_contract.bounded_safe_mutation ===
            mutation_hazard.bounded_safe_mutation &&
          arraysEqual(
            mutation_basis_contract.required_approvals,
            mutation_hazard.required_approvals,
          ) &&
          mutation_basis_contract.simulation_confidence_score ===
            mutation_hazard.simulation_confidence_score &&
          mutation_basis_contract.predictability_score ===
            mutation_hazard.predictability_score,
        "GOVERNANCE_ACCESS_SIMULATION_INVALID",
        "mutation_basis_contract must stay hash- and posture-aligned with mutation_hazard",
      );
      assertCondition(
        simulator_posture === deriveSimulatorPostureFromHazard(mutation_hazard),
        "GOVERNANCE_ACCESS_SIMULATION_INVALID",
        "simulator_posture must mirror the current governance mutation confidence and boundedness posture",
      );
    }

    const simulation_id =
      input.simulation_id ??
      buildGovernanceAccessSimulationId({
        principal_context_ref,
        resource_class,
        action_family,
        policy_snapshot_hash,
        governance_target_ref,
        simulation_basis_hash:
          mutation_hazard?.simulation_basis_hash ?? null,
        simulated_at,
      });

    return {
      artifact_type: input.artifact_type ?? "GovernanceAccessSimulation",
      simulation_id,
      tenant_id,
      policy_snapshot_hash,
      principal_context_ref,
      governance_target_ref,
      resource_class,
      action_family,
      requested_scope,
      requested_partition_scope_refs,
      authorization_decision,
      authority_layer_boundary,
      authority_chain_layers,
      simulator_posture,
      mutation_hazard,
      mutation_basis_contract,
      simulated_at,
    };
  } catch (error) {
    if (error instanceof GovernanceAccessSimulationModelError) {
      throw error;
    }
    throw new GovernanceAccessSimulationModelError(
      "GOVERNANCE_ACCESS_SIMULATION_FIELD_REQUIRED",
      error instanceof Error
        ? error.message
        : "governance access simulation normalization failed",
    );
  }
}
