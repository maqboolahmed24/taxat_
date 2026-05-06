import { expect, test } from "@playwright/test";

import {
  AuthorityLinkRepository,
  AuthorizationDecisionFactory,
  AuthorizeService,
  DelegationGrantRepository,
  ExceptionalAuthorityGrantRepository,
  GovernanceAccessSimulationRepository,
  GovernanceMutationSimulator,
  PrincipalContextRepository,
  TenantRepository,
  buildAuthorizationDecisionAccessBindingHash,
  buildAuthorityLayerBoundaryContract,
  buildDependencyTopologyHash,
  buildPrincipalContextAccessBindingHash,
  buildSimulationBasisHash,
  deriveGovernanceMutationBasisContractHash,
  deriveGovernanceMutationHazardContractHash,
  loadAuthorizationPolicyRuntime,
  normalizePrincipalContextRecord,
} from "../../../packages/backend-access/src/index.ts";

async function buildPrincipalContext() {
  const runtime = await loadAuthorizationPolicyRuntime({ reload: true });
  return normalizePrincipalContextRecord({
    principal_id: "user.operator.hash-replay.001",
    principal_type: "HUMAN",
    effective_role_set: ["TENANT_ADMIN"],
    tenant_id: "tenant.taxat",
    client_scope: ["client.taxpayer.hash-replay.001"],
    requested_scope: ["year_end", "amendment_intent"],
    partition_scope_refs: ["partition.uk.vat", "period.2026-Q1"],
    authn_level: "STEP_UP",
    subject_identity_assurance_level: "STEP_UP_VERIFIED",
    session_id: "session.browser.hash-replay.001",
    service_identity_ref: null,
    delegation_basis: "SELF_ACTING",
    authorization_evaluated_at: "2026-04-23T12:00:00Z",
    policy_snapshot_hash: runtime.policy_snapshot_hash,
    delegation_snapshot_refs: [],
    authority_link_refs: [],
    authority_link_snapshot_refs: [],
    masking_scope: "TENANT_ADMIN_UNMASKED",
    approval_capabilities: [
      "CHANGE_BOARD",
      "DUAL_APPROVER",
      "SECURITY_TEAM",
      "TENANT_ADMIN",
    ],
    client_portal_capabilities: [],
    run_kind_capabilities: ["GOVERNANCE_SIMULATION"],
  });
}

function buildAuthorizeService() {
  const tenantRepository = new TenantRepository();
  const delegationGrantRepository = new DelegationGrantRepository({
    tenantRepository,
  });
  const authorityLinkRepository = new AuthorityLinkRepository({
    tenantRepository,
    delegationGrantRepository,
  });
  const exceptionalAuthorityGrantRepository =
    new ExceptionalAuthorityGrantRepository({
      tenantRepository,
    });
  return new AuthorizeService({
    authorityLinkRepository,
    delegationGrantRepository,
    exceptionalAuthorityGrantRepository,
  });
}

test("rehydrated principal contexts and authorization decisions reproduce stored access bindings", async () => {
  const principal_context = await buildPrincipalContext();
  const authorizationDecisionFactory = new AuthorizationDecisionFactory();
  const repository = new PrincipalContextRepository();

  const authorization_decision = await authorizationDecisionFactory.create({
    principal_context,
    resource_class: "ConfigChangeRequest",
    action_family: "APPROVE_CONFIG",
    decision: "REQUIRE_APPROVAL",
    reason_codes: ["APPROVAL_REQUIRED_FOR_OVERRIDE_CREATION"],
    effective_scope: ["year_end", "amendment_intent"],
    effective_partition_scope_refs: ["partition.uk.vat", "period.2026-Q1"],
    required_approvals: ["approval.override.single-approver"],
    required_authn_level: null,
    authority_layer_boundary: buildAuthorityLayerBoundaryContract({
      binding_scope_class: "AUTHORIZATION_DECISION",
      integration_capability: "INTERNAL_ONLY",
      active_principal_class: "HUMAN",
      tenant_permission_state: "SATISFIED",
      client_delegation_state: "NOT_REQUIRED",
      delegation_basis: "SELF_ACTING",
      delegation_freshness_state: "NOT_APPLICABLE",
      authority_link_state: "NOT_REQUIRED",
      exceptional_authority_state: "NOT_APPLICABLE",
      human_gate_requirement: "REQUIRE_APPROVAL",
      human_gate_resolution_state: "PENDING_EVIDENCE",
    }),
    bounded_safe_mutation: 0,
    approval_requirement: "SINGLE_APPROVER",
    dependency_topology_hash: "dependency.topology.hash.replay.001",
    simulation_basis_hash: "simulation.basis.hash.replay.001",
    evaluated_at: "2026-04-23T12:01:00Z",
  });

  await repository.storeAuthorizationDecision({
    principal_context,
    authorization_decision,
  });

  const reconstructed = await repository.reconstructFrozenAuthorizationContext(
    principal_context.tenant_id,
    principal_context.access_binding_hash,
  );
  const replayedDecision = reconstructed.authorization_decisions[0];

  expect(replayedDecision).toBeDefined();
  expect(
    buildPrincipalContextAccessBindingHash(reconstructed.principal_context),
  ).toBe(reconstructed.principal_context.access_binding_hash);
  expect(
    buildAuthorizationDecisionAccessBindingHash({
      principal_context_access_binding_hash:
        reconstructed.principal_context.access_binding_hash,
      resource_class: replayedDecision!.resource_class,
      action_family: replayedDecision!.action_family,
      decision: replayedDecision!.decision,
      reason_codes: replayedDecision!.reason_codes,
      effective_scope: replayedDecision!.effective_scope,
      effective_partition_scope_refs:
        replayedDecision!.effective_partition_scope_refs,
      masking_rules: replayedDecision!.masking_rules,
      required_approvals: replayedDecision!.required_approvals,
      required_authn_level: replayedDecision!.required_authn_level,
      policy_snapshot_hash: replayedDecision!.policy_snapshot_hash,
      delegation_snapshot_refs: replayedDecision!.delegation_snapshot_refs,
      authority_link_snapshot_refs:
        replayedDecision!.authority_link_snapshot_refs,
      authority_layer_boundary: replayedDecision!.authority_layer_boundary,
      bounded_safe_mutation: replayedDecision!.bounded_safe_mutation,
      approval_requirement: replayedDecision!.approval_requirement,
      dependency_topology_hash: replayedDecision!.dependency_topology_hash,
      simulation_basis_hash: replayedDecision!.simulation_basis_hash,
    }),
  ).toBe(replayedDecision!.access_binding_hash);
});

test("persisted governance simulations replay topology, basis, and contract hashes exactly", async () => {
  const principal_context = await buildPrincipalContext();
  const governanceAccessSimulationRepository =
    new GovernanceAccessSimulationRepository();
  const simulator = new GovernanceMutationSimulator({
    authorizeService: buildAuthorizeService(),
    governanceAccessSimulationRepository,
  });
  const proposed_diff = {
    diff_class: "ROLE_GRANT",
    staged_object_refs: ["policy.rule.hash.001", "workflow.guard.hash.001"],
    nested: {
      approved_by: ["SECURITY_TEAM"],
      replacement_mode: "MERGE",
    },
  };
  const requested_approver_scope = ["SECURITY_TEAM", "TENANT_ADMIN"];

  const result = await simulator.simulate({
    principal_context,
    resource_class: "ConfigChangeRequest",
    action_family: "APPROVE_CONFIG",
    governance_target_ref: "config-change-request.hash-replay.001",
    proposed_diff,
    requested_approver_scope,
    topology: {
      nodes: [
        {
          node_ref: "policy.rule.hash.001",
          node_type: "POLICY_RULE",
          seed: 1,
          version_ref: "policy.rule.version.hash.001",
        },
        {
          node_ref: "workflow.guard.hash.001",
          node_type: "WORKFLOW",
          seed: 0.7,
          version_ref: "workflow.guard.version.hash.001",
        },
      ],
      edges: [
        {
          from_node_ref: "policy.rule.hash.001",
          to_node_ref: "workflow.guard.hash.001",
          edge_type: "WORKFLOW_GUARD",
          version_ref: "edge.version.hash.001",
        },
      ],
      inventory_slice_refs: [
        "inventory.policy.rule.hash.001",
        "inventory.workflow.guard.hash.001",
      ],
    },
    action_cell_deltas: [
      {
        cell_ref: "cell.ConfigChangeRequest.APPROVE_CONFIG",
        pre_decision: "REQUIRE_APPROVAL",
        post_decision: "ALLOW",
        pre_effective_scope: ["year_end", "amendment_intent"],
        post_effective_scope: ["year_end", "amendment_intent"],
        cell_weight: 1.5,
      },
    ],
    simulated_at: "2026-04-23T12:05:00Z",
    persist: true,
  });

  const stored = await governanceAccessSimulationRepository.requireSimulationById(
    result.simulation.simulation_id,
  );
  const replayedTopologyHash = buildDependencyTopologyHash({
    nodes: result.dependency_topology!.nodes.map((node) => ({
      node_ref: node.node_ref,
      version_ref: node.version_ref,
    })),
    edges: result.dependency_topology!.edges.map((edge) => ({
      from_node_ref: edge.from_node_ref,
      to_node_ref: edge.to_node_ref,
      edge_type: edge.edge_type,
      edge_ref: edge.edge_ref,
      version_ref: edge.version_ref,
    })),
    node_weight_profile_ref: result.dependency_topology!.node_weight_profile_ref,
    edge_weight_profile_ref: result.dependency_topology!.edge_weight_profile_ref,
  });
  const replayedSimulationBasisHash = buildSimulationBasisHash({
    policy_snapshot_hash: principal_context.policy_snapshot_hash,
    dependency_topology_hash: replayedTopologyHash,
    proposed_diff,
    acting_principal_ref: principal_context.principal_id,
    requested_approver_scope,
    simulation_profile_ref: result.dependency_topology!.profile.profile_ref,
  });
  const replayedAuthorizationDecisionHash =
    buildAuthorizationDecisionAccessBindingHash({
      principal_context_access_binding_hash: principal_context.access_binding_hash,
      resource_class: result.simulation.authorization_decision.resource_class,
      action_family: result.simulation.authorization_decision.action_family,
      decision: result.simulation.authorization_decision.decision,
      reason_codes: result.simulation.authorization_decision.reason_codes,
      effective_scope: result.simulation.authorization_decision.effective_scope,
      effective_partition_scope_refs:
        result.simulation.authorization_decision.effective_partition_scope_refs,
      masking_rules: result.simulation.authorization_decision.masking_rules,
      required_approvals:
        result.simulation.authorization_decision.required_approvals,
      required_authn_level:
        result.simulation.authorization_decision.required_authn_level,
      policy_snapshot_hash:
        result.simulation.authorization_decision.policy_snapshot_hash,
      delegation_snapshot_refs:
        result.simulation.authorization_decision.delegation_snapshot_refs,
      authority_link_snapshot_refs:
        result.simulation.authorization_decision.authority_link_snapshot_refs,
      authority_layer_boundary:
        result.simulation.authorization_decision.authority_layer_boundary,
      bounded_safe_mutation:
        result.simulation.authorization_decision.bounded_safe_mutation,
      approval_requirement:
        result.simulation.authorization_decision.approval_requirement,
      dependency_topology_hash:
        result.simulation.authorization_decision.dependency_topology_hash,
      simulation_basis_hash:
        result.simulation.authorization_decision.simulation_basis_hash,
    });
  const replayedHazardHash = deriveGovernanceMutationHazardContractHash({
    ...result.simulation.mutation_hazard!,
  });
  const replayedBasisHash = deriveGovernanceMutationBasisContractHash({
    ...result.simulation.mutation_basis_contract!,
  });

  expect(replayedTopologyHash).toBe(stored.dependency_topology_hash);
  expect(replayedSimulationBasisHash).toBe(stored.simulation_basis_hash);
  expect(replayedAuthorizationDecisionHash).toBe(
    stored.authorization_decision_access_binding_hash,
  );
  expect(replayedHazardHash).toBe(stored.hazard_contract_hash);
  expect(replayedBasisHash).toBe(stored.basis_contract_hash);
});
