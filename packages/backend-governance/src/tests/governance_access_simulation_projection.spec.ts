import { expect, test } from "@playwright/test";

import {
  AuthorityLinkRepository,
  AuthorizationDecisionFactory,
  AuthorizeService,
  DelegationGrantRepository,
  ExceptionalAuthorityGrantRepository,
  loadAuthorizationPolicyRuntime,
  normalizePrincipalContextRecord,
  resolveAuthorityLayerBoundaryContract,
  TenantRepository,
} from "../../../backend-access/src/index.ts";
import { validateContractSchema } from "../../../../tests/unit/backend_northbound/audit_and_enquiry_fixtures.ts";
import {
  buildGovernanceAccessSimulation,
  deriveGovernanceSimulatorPosture,
} from "../index.ts";

function buildAuthorizeService() {
  const tenantRepository = new TenantRepository();
  const delegationGrantRepository = new DelegationGrantRepository({
    tenantRepository,
  });
  const authorityLinkRepository = new AuthorityLinkRepository({
    delegationGrantRepository,
    tenantRepository,
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

async function principalContext() {
  const runtime = await loadAuthorizationPolicyRuntime({ reload: true });
  return normalizePrincipalContextRecord({
    approval_capabilities: [
      "CHANGE_BOARD",
      "DUAL_APPROVER",
      "SECURITY_TEAM",
      "TENANT_ADMIN",
    ],
    authn_level: "STEP_UP",
    authority_link_refs: [],
    authority_link_snapshot_refs: [],
    authorization_evaluated_at: "2026-05-04T10:00:00.000Z",
    client_portal_capabilities: [],
    client_scope: ["client.pc0191"],
    delegation_basis: "SELF_ACTING",
    delegation_snapshot_refs: [],
    effective_role_set: ["TENANT_ADMIN"],
    masking_scope: "TENANT_ADMIN_UNMASKED",
    partition_scope_refs: ["partition.uk.vat", "period.2026-Q1"],
    policy_snapshot_hash: runtime.policy_snapshot_hash,
    principal_id: "principal.pc0191.operator",
    principal_type: "HUMAN",
    requested_scope: ["year_end", "amendment_intent"],
    run_kind_capabilities: ["GOVERNANCE_SIMULATION"],
    service_identity_ref: null,
    session_id: "session.pc0191.operator",
    subject_identity_assurance_level: "STEP_UP_VERIFIED",
    tenant_id: "tenant.taxat",
  });
}

async function readOnlyAuthorizationDecision() {
  const context = await principalContext();
  const authority_layer_boundary = resolveAuthorityLayerBoundaryContract({
    binding_scope_class: "AUTHORIZATION_DECISION",
    delegation: {
      required: false,
    },
    human_gate: {
      requirement: "NOT_REQUIRED",
    },
    principal_context: context,
    tenant_permission_state: "SATISFIED",
  });
  const authorization_decision = await new AuthorizationDecisionFactory().create({
    action_family: "VIEW_CLIENT",
    authority_layer_boundary,
    authority_link_snapshot_refs: [],
    decision: "ALLOW",
    delegation_snapshot_refs: [],
    effective_partition_scope_refs: ["partition.uk.vat", "period.2026-Q1"],
    effective_scope: ["year_end"],
    evaluated_at: "2026-05-04T10:01:00.000Z",
    masking_rules: [],
    principal_context: context,
    reason_codes: ["ROLE_TENANT_ADMIN_CAN_OPERATE_CLIENT_WORK"],
    required_approvals: [],
    required_authn_level: null,
    resource_class: "CLIENT_WORKFLOW",
  });
  return { authorization_decision, context };
}

test("projects read-only access decisions without fabricating mutation hazard state", async () => {
  const { authorization_decision, context } = await readOnlyAuthorizationDecision();

  const simulation = await buildGovernanceAccessSimulation({
    action_family: authorization_decision.action_family,
    authorization_decision,
    governance_target_ref: "client.pc0191",
    mutation_capable: false,
    principal_context: context,
    resource_class: authorization_decision.resource_class,
    simulated_at: "2026-05-04T10:02:00.000Z",
    topology: {
      nodes: [],
    },
  });

  expect(simulation.simulator_posture).toBe("READ_ONLY_DECISION");
  expect(simulation.mutation_hazard).toBeNull();
  expect(simulation.mutation_basis_contract).toBeNull();
  expect(simulation.authorization_decision.dependency_topology_hash).toBeNull();
  expect(simulation.authorization_decision.simulation_basis_hash).toBeNull();
  expect(simulation.authorization_decision.bounded_safe_mutation).toBeNull();
  expect(simulation.authority_layer_boundary).toEqual({
    ...simulation.authorization_decision.authority_layer_boundary,
    binding_scope_class: "GOVERNANCE_ACCESS_SIMULATION",
  });
  expect(simulation.authority_chain_layers.map((layer) => layer.layer_code)).toEqual([
    "SESSION_AUTHN_POSTURE",
    "TENANT_OPERATIONAL_AUTHORITY",
    "CLIENT_DELEGATION_COVERAGE",
    "EXTERNAL_AUTHORITY_LINK_READINESS",
  ]);

  await validateContractSchema("governance_access_simulation", simulation);
});

test("projects mutation-capable simulations with aligned authorization, hazard, and basis hashes", async () => {
  const context = await principalContext();

  const simulation = await buildGovernanceAccessSimulation({
    action_cell_deltas: [
      {
        cell_ref: "cell.ConfigChangeRequest.APPROVE_CONFIG",
        cell_weight: 1.5,
        post_decision: "ALLOW",
        post_effective_scope: ["year_end", "amendment_intent"],
        pre_decision: "REQUIRE_APPROVAL",
        pre_effective_scope: ["year_end", "amendment_intent"],
      },
    ],
    action_family: "APPROVE_CONFIG",
    governance_target_ref: "config-change-request.pc0191",
    principal_context: context,
    proposed_diff: {
      diff_class: "ROLE_GRANT",
      staged_object_refs: ["policy.rule.pc0191", "workflow.guard.pc0191"],
    },
    resource_class: "ConfigChangeRequest",
    simulated_at: "2026-05-04T10:03:00.000Z",
    simulatorDependencies: {
      authorizeService: buildAuthorizeService(),
    },
    topology: {
      edges: [
        {
          edge_type: "WORKFLOW_GUARD",
          from_node_ref: "policy.rule.pc0191",
          to_node_ref: "workflow.guard.pc0191",
          version_ref: "edge.version.pc0191",
        },
      ],
      inventory_slice_refs: [
        "inventory.policy.rule.pc0191",
        "inventory.workflow.guard.pc0191",
      ],
      nodes: [
        {
          node_ref: "policy.rule.pc0191",
          node_type: "POLICY_RULE",
          seed: 1,
          version_ref: "policy.rule.version.pc0191",
        },
        {
          node_ref: "workflow.guard.pc0191",
          node_type: "WORKFLOW",
          seed: 0.7,
          version_ref: "workflow.guard.version.pc0191",
        },
      ],
    },
  });

  const hazard = simulation.mutation_hazard;
  const basis = simulation.mutation_basis_contract;
  expect(hazard).not.toBeNull();
  expect(basis).not.toBeNull();
  expect(simulation.simulator_posture).toBe(
    deriveGovernanceSimulatorPosture({ mutation_hazard: hazard }),
  );
  expect(simulation.authorization_decision.access_binding_hash).toBe(
    hazard?.access_binding_hash,
  );
  expect(simulation.authorization_decision.dependency_topology_hash).toBe(
    hazard?.dependency_topology_hash,
  );
  expect(simulation.authorization_decision.simulation_basis_hash).toBe(
    hazard?.simulation_basis_hash,
  );
  expect(basis?.access_binding_hash).toBe(
    simulation.authorization_decision.access_binding_hash,
  );
  expect(basis?.hazard_contract_hash).toBe(hazard?.hazard_contract_hash);
  expect(basis?.basis_contract_hash).toBeTruthy();
  expect(hazard?.impact_radius_lower_score).toBeLessThanOrEqual(
    hazard?.impact_radius_upper_score ?? -1,
  );
  expect(hazard?.approval_requirement).not.toBe("NOT_REQUIRED");
  expect(hazard?.bounded_safe_mutation).toBe(0);
  expect(
    hazard?.risk_driver_codes.every((code) =>
      [
        "PRIVILEGE_GAIN",
        "SCOPE_EXPANSION",
        "MASKING_RELAXATION",
        "BROAD_BLAST_RADIUS",
      ].includes(code),
    ),
  ).toBe(true);

  await validateContractSchema("governance_access_simulation", simulation);
  await validateContractSchema("governance_mutation_hazard_contract", hazard);
  await validateContractSchema("governance_mutation_basis_contract", basis);
});

test("keeps low-confidence mutation previews advisory-only while preserving the reviewed hazard packet", async () => {
  const context = await principalContext();

  const simulation = await buildGovernanceAccessSimulation({
    action_family: "APPROVE_CONFIG",
    binding_consistent: false,
    governance_target_ref: "config-change-request.pc0191.low-confidence",
    principal_context: context,
    proposed_diff: {
      diff_class: "LOW_CONFIDENCE_POLICY_STAGE",
      staged_object_refs: ["policy.rule.pc0191.low-confidence"],
    },
    resource_class: "ConfigChangeRequest",
    simulated_at: "2026-05-04T10:04:00.000Z",
    simulatorDependencies: {
      authorizeService: buildAuthorizeService(),
    },
    topology: {
      nodes: [
        {
          node_ref: "policy.rule.pc0191.low-confidence",
          node_type: "POLICY_RULE",
          seed: 0.6,
          version_ref: "policy.rule.version.pc0191.low-confidence",
        },
      ],
    },
  });

  expect(simulation.simulator_posture).toBe("ADVISORY_ONLY");
  expect(simulation.mutation_hazard?.commit_authority_posture).toBe(
    "PREVIEW_ONLY",
  );
  expect(simulation.mutation_hazard?.confidence_limiter_codes).toContain(
    "LOW_SIMULATION_CONFIDENCE",
  );
  expect(simulation.mutation_basis_contract).not.toBeNull();
  expect(simulation.mutation_basis_contract?.hazard_contract_hash).toBe(
    simulation.mutation_hazard?.hazard_contract_hash,
  );

  await validateContractSchema("governance_access_simulation", simulation);
});
