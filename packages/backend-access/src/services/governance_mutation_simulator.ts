import { stableJsonHash } from "../../../domain-kernel/src/primitives/hash.ts";
import { normalizeUtcInstantString } from "../../../domain-kernel/src/primitives/time.ts";

import type { AuthorizationDecisionRecord } from "../models/authorization_decision.ts";
import { buildAuthorityLayerBoundaryContract } from "../models/authority_layer_boundary_contract.ts";
import {
  normalizeGovernanceAccessSimulationRecord,
  type GovernanceAccessSimulationRecord,
} from "../models/governance_access_simulation.ts";
import {
  normalizeGovernanceMutationBasisContract,
  type GovernanceMutationBasisContractRecord,
} from "../models/governance_mutation_basis_contract.ts";
import { buildSimulationBasisHash } from "../hash/simulation_basis_hash.ts";
import type { PrincipalContextRecord } from "../models/principal_context.ts";
import type {
  DependencyTopologyBuildInput,
  DependencyTopologyBuildResult,
} from "./dependency_topology_builder.ts";
import { DependencyTopologyBuilder } from "./dependency_topology_builder.ts";
import { buildAuthorityChainLayers } from "./authority_chain_layer_builder.ts";
import { AuthorizationDecisionFactory } from "./authorization_decision_factory.ts";
import { AuthorizeService } from "./authorize.ts";
import type { AuthorizationGovernanceBasisInput } from "./authorization_governance_basis.ts";
import {
  type GovernanceMutationActionCellDeltaInput,
  type GovernanceMutationHazardMetrics,
  type MutationHazardScoringInput,
  type GovernanceReadModelObservationInput,
  MutationHazardScoringService,
} from "./mutation_hazard_scoring_service.ts";
import type { GovernanceAccessSimulationRepository } from "../repositories/governance_access_simulation_repository.ts";
import {
  normalizeStringSet,
  requireTrimmedString,
} from "./principal_context_normalizer.ts";

type GovernanceMutationSimulatorErrorCode =
  | "GOVERNANCE_MUTATION_SIMULATOR_AUTHORIZATION_CONFLICT"
  | "GOVERNANCE_MUTATION_SIMULATOR_AUTHORIZATION_REQUIRED"
  | "GOVERNANCE_MUTATION_SIMULATOR_MUTATION_DIFF_REQUIRED"
  | "GOVERNANCE_MUTATION_SIMULATOR_PERSISTENCE_UNAVAILABLE";

export class GovernanceMutationSimulatorError extends Error {
  readonly code: GovernanceMutationSimulatorErrorCode;

  constructor(code: GovernanceMutationSimulatorErrorCode, detail: string) {
    super(`${code}: ${detail}`);
    this.name = "GovernanceMutationSimulatorError";
    this.code = code;
  }
}

export type GovernanceMutationSimulatorInput = {
  action_cell_deltas?: GovernanceMutationActionCellDeltaInput[];
  action_family: string;
  authorization_decision?: AuthorizationDecisionRecord;
  binding_consistent?: boolean;
  governance_target_ref: string | null;
  idempotent?: boolean;
  monotonic?: boolean;
  mutation_capable?: boolean;
  persist?: boolean;
  principal_context: PrincipalContextRecord;
  proposed_diff?: unknown;
  read_models?: GovernanceReadModelObservationInput[];
  requested_approver_scope?: string[];
  resource_class: string;
  settlement_p95_seconds?: number;
  simulated_at: string;
  simulation_profile_ref?: string;
  topology: Omit<DependencyTopologyBuildInput, "action_family" | "resource_class">;
};

export type GovernanceMutationSimulationResult = {
  dependency_topology: DependencyTopologyBuildResult | null;
  mutation_basis_contract: GovernanceMutationBasisContractRecord | null;
  simulation: GovernanceAccessSimulationRecord;
  simulation_basis_hash: string | null;
};

function arraysEqual(left: readonly string[], right: readonly string[]) {
  return (
    left.length === right.length &&
    left.every((value, index) => value === right[index])
  );
}

function governanceBasisFromMetrics(input: {
  dependency_topology_hash: string;
  metrics: GovernanceMutationHazardMetrics;
  simulation_basis_hash: string;
}): AuthorizationGovernanceBasisInput {
  return {
    dependency_topology_hash: input.dependency_topology_hash,
    simulation_basis_hash: input.simulation_basis_hash,
    approval_requirement: input.metrics.approval_requirement,
    bounded_safe_mutation: input.metrics.bounded_safe_mutation,
    commit_authority_posture: input.metrics.commit_authority_posture,
    required_approvals: [...input.metrics.required_approvals],
  };
}

export class GovernanceMutationSimulator {
  private readonly authorizationDecisionFactory: AuthorizationDecisionFactory;
  private readonly dependencyTopologyBuilder: DependencyTopologyBuilder;
  private readonly mutationHazardScoringService: MutationHazardScoringService;

  constructor(
    private readonly dependencies: {
      authorizationDecisionFactory?: AuthorizationDecisionFactory;
      authorizeService?: AuthorizeService;
      dependencyTopologyBuilder?: DependencyTopologyBuilder;
      governanceAccessSimulationRepository?: GovernanceAccessSimulationRepository;
      mutationHazardScoringService?: MutationHazardScoringService;
    } = {},
  ) {
    this.authorizationDecisionFactory =
      dependencies.authorizationDecisionFactory ?? new AuthorizationDecisionFactory();
    this.dependencyTopologyBuilder =
      dependencies.dependencyTopologyBuilder ?? new DependencyTopologyBuilder();
    this.mutationHazardScoringService =
      dependencies.mutationHazardScoringService ??
      new MutationHazardScoringService();
  }

  private async createReadOnlyAuthorizationDecision(
    principal_context: PrincipalContextRecord,
    authorization_decision: AuthorizationDecisionRecord,
  ) {
    return this.authorizationDecisionFactory.create({
      principal_context,
      resource_class: authorization_decision.resource_class,
      action_family: authorization_decision.action_family,
      decision: authorization_decision.decision,
      reason_codes: authorization_decision.reason_codes,
      effective_scope: authorization_decision.effective_scope,
      effective_partition_scope_refs:
        authorization_decision.effective_partition_scope_refs,
      masking_rules: authorization_decision.masking_rules,
      required_approvals:
        authorization_decision.decision === "REQUIRE_APPROVAL"
          ? authorization_decision.required_approvals
          : [],
      required_authn_level: authorization_decision.required_authn_level,
      authority_layer_boundary: authorization_decision.authority_layer_boundary,
      delegation_snapshot_refs: authorization_decision.delegation_snapshot_refs,
      authority_link_snapshot_refs:
        authorization_decision.authority_link_snapshot_refs,
      evaluated_at: authorization_decision.evaluated_at,
    });
  }

  private async alignPreviewOnlyAuthorizationDecision(input: {
    authorization_decision: AuthorizationDecisionRecord;
    principal_context: PrincipalContextRecord;
    required_approvals: string[];
  }) {
    if (
      input.authorization_decision.decision !== "DENY" ||
      arraysEqual(
        input.authorization_decision.required_approvals,
        input.required_approvals,
      )
    ) {
      return input.authorization_decision;
    }
    if (
      !(
        input.authorization_decision.reason_codes.length === 1 &&
        input.authorization_decision.reason_codes[0] ===
          "GOVERNANCE_MUTATION_ADVISORY_ONLY"
      )
    ) {
      return input.authorization_decision;
    }
    const authority_layer_boundary = buildAuthorityLayerBoundaryContract({
      ...input.authorization_decision.authority_layer_boundary,
      tenant_permission_state: "SATISFIED",
      human_gate_requirement: "REQUIRE_APPROVAL",
      human_gate_resolution_state: "PENDING_EVIDENCE",
    });
    return this.authorizationDecisionFactory.create({
      principal_context: input.principal_context,
      resource_class: input.authorization_decision.resource_class,
      action_family: input.authorization_decision.action_family,
      decision: "REQUIRE_APPROVAL",
      reason_codes: ["GOVERNANCE_MUTATION_APPROVAL_REQUIRED"],
      effective_scope: input.principal_context.requested_scope,
      effective_partition_scope_refs:
        input.principal_context.partition_scope_refs,
      masking_rules: [],
      required_approvals: input.required_approvals,
      required_authn_level: null,
      authority_layer_boundary,
      delegation_snapshot_refs: input.authorization_decision.delegation_snapshot_refs,
      authority_link_snapshot_refs:
        input.authorization_decision.authority_link_snapshot_refs,
      evaluated_at: input.authorization_decision.evaluated_at,
      bounded_safe_mutation: input.authorization_decision.bounded_safe_mutation,
      approval_requirement: input.authorization_decision.approval_requirement,
      dependency_topology_hash:
        input.authorization_decision.dependency_topology_hash,
      simulation_basis_hash: input.authorization_decision.simulation_basis_hash,
    });
  }

  private async resolveFinalAuthorizationDecision(input: {
    authorization_decision?: AuthorizationDecisionRecord;
    governance_basis: {
      approval_requirement: Exclude<
        AuthorizationDecisionRecord["approval_requirement"],
        null
      >;
      bounded_safe_mutation: Exclude<
        AuthorizationDecisionRecord["bounded_safe_mutation"],
        null
      >;
      commit_authority_posture: GovernanceMutationHazardMetrics["commit_authority_posture"];
      dependency_topology_hash: string;
      required_approvals: string[];
      simulation_basis_hash: string;
    };
    principal_context: PrincipalContextRecord;
    resource_class: string;
    action_family: string;
    evaluated_at: string;
  }) {
    if (input.authorization_decision) {
      return input.authorization_decision;
    }
    if (!this.dependencies.authorizeService) {
      throw new GovernanceMutationSimulatorError(
        "GOVERNANCE_MUTATION_SIMULATOR_AUTHORIZATION_REQUIRED",
        "mutation-capable governance simulation requires a frozen authorization decision or an authorize service capable of materializing one",
      );
    }
    const result = await this.dependencies.authorizeService.authorize({
      principal_context: input.principal_context,
      resource_class: input.resource_class,
      action_family: input.action_family,
      evaluated_at: input.evaluated_at,
      governance_basis: input.governance_basis,
      persist: false,
    });
    return result.authorization_decision;
  }

  private assertGovernanceDecisionMatches(
    authorization_decision: AuthorizationDecisionRecord,
    mutation_basis_contract: GovernanceMutationBasisContractRecord,
  ) {
    const requiredApprovalsMatch =
      authorization_decision.decision === "DENY" &&
      mutation_basis_contract.commit_authority_posture === "PREVIEW_ONLY"
        ? authorization_decision.required_approvals.length === 0 ||
          arraysEqual(
            authorization_decision.required_approvals,
            mutation_basis_contract.required_approvals,
          )
        : arraysEqual(
            authorization_decision.required_approvals,
            mutation_basis_contract.required_approvals,
          );
    if (
      authorization_decision.dependency_topology_hash !==
        mutation_basis_contract.dependency_topology_hash ||
      authorization_decision.simulation_basis_hash !==
        mutation_basis_contract.simulation_basis_hash ||
      authorization_decision.bounded_safe_mutation !==
        mutation_basis_contract.bounded_safe_mutation ||
      authorization_decision.approval_requirement !==
        mutation_basis_contract.approval_requirement ||
      !requiredApprovalsMatch
    ) {
      throw new GovernanceMutationSimulatorError(
        "GOVERNANCE_MUTATION_SIMULATOR_AUTHORIZATION_CONFLICT",
        "the provided authorization_decision does not match the frozen governance mutation basis",
      );
    }
  }

  async simulate(
    input: GovernanceMutationSimulatorInput,
  ): Promise<GovernanceMutationSimulationResult> {
    const simulated_at = normalizeUtcInstantString(input.simulated_at);
    const requested_approver_scope = normalizeStringSet(
      "requested_approver_scope",
      input.requested_approver_scope ?? [],
    );
    const proposed_diff_hash =
      input.proposed_diff === undefined ? null : stableJsonHash(input.proposed_diff);
    const mutation_capable = input.mutation_capable ?? true;

    if (mutation_capable && input.proposed_diff === undefined) {
      throw new GovernanceMutationSimulatorError(
        "GOVERNANCE_MUTATION_SIMULATOR_MUTATION_DIFF_REQUIRED",
        "mutation-capable governance simulation requires a canonical proposed_diff payload",
      );
    }

    const dependency_topology = mutation_capable
      ? await this.dependencyTopologyBuilder.build({
          ...input.topology,
          action_family: input.action_family,
          resource_class: input.resource_class,
          ...(input.simulation_profile_ref === undefined
            ? {}
            : { profile_ref: input.simulation_profile_ref }),
        })
      : null;
    const simulation_basis_hash =
      mutation_capable && dependency_topology
        ? buildSimulationBasisHash({
            policy_snapshot_hash: input.principal_context.policy_snapshot_hash,
            dependency_topology_hash: dependency_topology.dependency_topology_hash,
            proposed_diff: input.proposed_diff ?? null,
            acting_principal_ref: input.principal_context.principal_id,
            requested_approver_scope,
            simulation_profile_ref: dependency_topology.profile.profile_ref,
          })
        : null;

    let metrics: GovernanceMutationHazardMetrics | null = null;
    if (mutation_capable && dependency_topology && simulation_basis_hash) {
      const scoringInput = {
        dependency_topology,
        ...(input.action_cell_deltas === undefined
          ? {}
          : { action_cell_deltas: input.action_cell_deltas }),
        ...(input.read_models === undefined
          ? {}
          : { read_models: input.read_models }),
        ...(input.binding_consistent === undefined
          ? {}
          : { binding_consistent: input.binding_consistent }),
        ...(input.idempotent === undefined
          ? {}
          : { idempotent: input.idempotent }),
        ...(input.monotonic === undefined
          ? {}
          : { monotonic: input.monotonic }),
        ...(input.settlement_p95_seconds === undefined
          ? {}
          : { settlement_p95_seconds: input.settlement_p95_seconds }),
      } satisfies MutationHazardScoringInput;
      metrics = this.mutationHazardScoringService.scoreMetrics(scoringInput);
    }

    let authorization_decision =
      mutation_capable && dependency_topology && simulation_basis_hash && metrics
        ? await this.resolveFinalAuthorizationDecision({
            ...(input.authorization_decision === undefined
              ? {}
              : { authorization_decision: input.authorization_decision }),
            governance_basis: governanceBasisFromMetrics({
              dependency_topology_hash: dependency_topology.dependency_topology_hash,
              simulation_basis_hash,
              metrics,
            }),
            principal_context: input.principal_context,
            resource_class: input.resource_class,
            action_family: input.action_family,
            evaluated_at: simulated_at,
          })
        : input.authorization_decision;

    if (
      mutation_capable &&
      dependency_topology &&
      simulation_basis_hash &&
      metrics &&
      authorization_decision &&
      metrics.commit_authority_posture === "PREVIEW_ONLY"
    ) {
      authorization_decision = await this.alignPreviewOnlyAuthorizationDecision({
        authorization_decision,
        principal_context: input.principal_context,
        required_approvals: metrics.required_approvals,
      });
    }

    if (!authorization_decision) {
      if (!this.dependencies.authorizeService) {
        throw new GovernanceMutationSimulatorError(
          "GOVERNANCE_MUTATION_SIMULATOR_AUTHORIZATION_REQUIRED",
          "governance simulation requires a frozen authorization decision or an authorize service",
        );
      }
      const result = await this.dependencies.authorizeService.authorize({
        principal_context: input.principal_context,
        resource_class: input.resource_class,
        action_family: input.action_family,
        evaluated_at: simulated_at,
        persist: false,
      });
      authorization_decision = result.authorization_decision;
    }

    let mutation_hazard = null;
    let mutation_basis_contract = null;
    let simulation_authorization_decision = authorization_decision;

    if (
      mutation_capable &&
      dependency_topology &&
      simulation_basis_hash &&
      metrics
    ) {
      mutation_hazard = this.mutationHazardScoringService.materializeHazardContract({
        policy_snapshot_hash: input.principal_context.policy_snapshot_hash,
        access_binding_hash: authorization_decision.access_binding_hash,
        dependency_topology_hash: dependency_topology.dependency_topology_hash,
        simulation_basis_hash,
        metrics,
      });
      mutation_basis_contract = normalizeGovernanceMutationBasisContract({
        policy_snapshot_hash: input.principal_context.policy_snapshot_hash,
        access_binding_hash: authorization_decision.access_binding_hash,
        dependency_topology_hash: dependency_topology.dependency_topology_hash,
        simulation_basis_hash,
        hazard_contract_hash: mutation_hazard.hazard_contract_hash,
        approval_requirement: mutation_hazard.approval_requirement,
        bounded_safe_mutation: mutation_hazard.bounded_safe_mutation,
        required_approvals: mutation_hazard.required_approvals,
        simulation_confidence_score: mutation_hazard.simulation_confidence_score,
        predictability_score: mutation_hazard.predictability_score,
        commit_authority_posture: mutation_hazard.commit_authority_posture,
      });
      this.assertGovernanceDecisionMatches(
        authorization_decision,
        mutation_basis_contract,
      );
    } else {
      simulation_authorization_decision =
        await this.createReadOnlyAuthorizationDecision(
          input.principal_context,
          authorization_decision,
        );
    }

    const authority_chain_layers = await buildAuthorityChainLayers(
      simulation_authorization_decision.authority_layer_boundary,
    );
    const simulation = normalizeGovernanceAccessSimulationRecord({
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
      authorization_decision: simulation_authorization_decision,
      authority_chain_layers,
      mutation_hazard,
      mutation_basis_contract,
      simulated_at,
      simulator_posture:
        mutation_hazard === null
          ? "READ_ONLY_DECISION"
          : mutation_hazard.commit_authority_posture === "PREVIEW_ONLY"
            ? "ADVISORY_ONLY"
            : mutation_hazard.commit_authority_posture === "BOUNDED_SAFE"
              ? "BOUNDED_SAFE"
              : "APPROVAL_GATED",
    });

    if (input.persist) {
      if (!this.dependencies.governanceAccessSimulationRepository) {
        throw new GovernanceMutationSimulatorError(
          "GOVERNANCE_MUTATION_SIMULATOR_PERSISTENCE_UNAVAILABLE",
          "persist=true requires a governance access simulation repository",
        );
      }
      await this.dependencies.governanceAccessSimulationRepository.storeSimulation({
        simulation,
        principal_context: input.principal_context,
        persisted_at: simulated_at,
        simulation_profile_ref:
          dependency_topology?.profile.profile_ref ??
          input.simulation_profile_ref ??
          null,
        requested_approver_scope,
        proposed_diff_hash,
        ...(dependency_topology?.inventory_slice_refs === undefined
          ? {}
          : { inventory_slice_refs: dependency_topology.inventory_slice_refs }),
      });
    }

    return {
      simulation,
      dependency_topology,
      simulation_basis_hash:
        simulation.mutation_basis_contract?.simulation_basis_hash ?? null,
      mutation_basis_contract:
        simulation.mutation_basis_contract ??
        null,
    };
  }
}
