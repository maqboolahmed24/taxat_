import { expect, test } from "@playwright/test";

import {
  AuthorityLinkRepository,
  AuthorizeService,
  DelegationGrantRepository,
  DependencyTopologyBuilder,
  ExceptionalAuthorityGrantRepository,
  GovernanceMutationSimulator,
  GovernanceMutationSimulatorError,
  loadAuthorizationPolicyRuntime,
  normalizePrincipalContextRecord,
  TenantRepository,
} from "../../../packages/backend-access/src/index.ts";

async function buildPrincipalContext() {
  const runtime = await loadAuthorizationPolicyRuntime({ reload: true });
  return normalizePrincipalContextRecord({
    principal_id: "user.operator.0091",
    principal_type: "HUMAN",
    effective_role_set: ["TENANT_ADMIN"],
    tenant_id: "tenant.taxat",
    client_scope: ["client.taxpayer.0091"],
    requested_scope: ["year_end", "amendment_intent"],
    partition_scope_refs: ["partition.uk.vat", "period.2026-Q1"],
    authn_level: "STEP_UP",
    subject_identity_assurance_level: "STEP_UP_VERIFIED",
    session_id: "session.browser.0091",
    service_identity_ref: null,
    delegation_basis: "SELF_ACTING",
    authorization_evaluated_at: "2026-04-23T09:00:00Z",
    policy_snapshot_hash: runtime.policy_snapshot_hash,
    delegation_snapshot_refs: [],
    authority_link_refs: [],
    authority_link_snapshot_refs: [],
    masking_scope: "TENANT_ADMIN_UNMASKED",
    approval_capabilities: ["CHANGE_BOARD", "DUAL_APPROVER", "SECURITY_TEAM", "TENANT_ADMIN"],
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

test("zero-impact governance mutations stay byte-stable and bounded-safe", async () => {
  const principal_context = await buildPrincipalContext();
  const simulator = new GovernanceMutationSimulator({
    authorizeService: buildAuthorizeService(),
  });

  const first = await simulator.simulate({
    principal_context,
    resource_class: "ConfigChangeRequest",
    action_family: "APPROVE_CONFIG",
    governance_target_ref: "config-change-request.0091",
    proposed_diff: {
      diff_class: "NO_OP",
      staged_object_refs: [],
    },
    topology: {
      nodes: [],
      edges: [],
      inventory_slice_refs: ["inventory.config_change_request.0091"],
    },
    simulated_at: "2026-04-23T09:05:00Z",
  });
  const second = await simulator.simulate({
    principal_context,
    resource_class: "ConfigChangeRequest",
    action_family: "APPROVE_CONFIG",
    governance_target_ref: "config-change-request.0091",
    proposed_diff: {
      diff_class: "NO_OP",
      staged_object_refs: [],
    },
    topology: {
      nodes: [],
      edges: [],
      inventory_slice_refs: ["inventory.config_change_request.0091"],
    },
    simulated_at: "2026-04-23T09:05:00Z",
  });

  expect(first.simulation.simulator_posture).toBe("BOUNDED_SAFE");
  expect(first.simulation.mutation_hazard?.bounded_safe_mutation).toBe(1);
  expect(first.simulation.mutation_hazard?.approval_requirement).toBe("NOT_REQUIRED");
  expect(first.simulation.mutation_hazard?.impact_radius_upper_score).toBe(0);
  expect(first.simulation.mutation_basis_contract?.required_approvals).toEqual([]);
  expect(first.simulation.authorization_decision.decision).toBe("ALLOW");
  expect(first.simulation.mutation_hazard?.hazard_contract_hash).toBe(
    second.simulation.mutation_hazard?.hazard_contract_hash,
  );
  expect(first.simulation.mutation_basis_contract?.basis_contract_hash).toBe(
    second.simulation.mutation_basis_contract?.basis_contract_hash,
  );
  expect(first.simulation.simulation_id).toBe(second.simulation.simulation_id);
});

test("low simulation confidence downgrades governance mutations to advisory posture", async () => {
  const principal_context = await buildPrincipalContext();
  const simulator = new GovernanceMutationSimulator({
    authorizeService: buildAuthorizeService(),
  });

  const result = await simulator.simulate({
    principal_context,
    resource_class: "ConfigChangeRequest",
    action_family: "APPROVE_CONFIG",
    governance_target_ref: "config-change-request.0092",
    proposed_diff: {
      diff_class: "POLICY_STAGE",
      staged_object_refs: ["policy.rule.0092"],
    },
    topology: {
      nodes: [
        {
          node_ref: "policy.rule.0092",
          node_type: "POLICY_RULE",
          seed: 1,
          version_ref: "policy.rule.version.1",
        },
      ],
      edges: [],
      inventory_slice_refs: ["inventory.policy.rule.0092"],
    },
    read_models: [
      {
        read_model_ref: "policy_snapshot",
        age_seconds: 7200,
        freshness_budget_seconds: 3600,
      },
    ],
    simulated_at: "2026-04-23T09:10:00Z",
  });

  expect(result.simulation.simulator_posture).toBe("ADVISORY_ONLY");
  expect(result.simulation.mutation_hazard?.commit_authority_posture).toBe(
    "PREVIEW_ONLY",
  );
  expect(result.simulation.mutation_hazard?.simulation_confidence_score).toBeLessThan(80);
  expect(result.simulation.mutation_basis_contract?.commit_authority_posture).toBe(
    "PREVIEW_ONLY",
  );
  expect(result.simulation.authorization_decision.approval_requirement).not.toBeNull();
});

test("dependency topology hash changes when only referenced version refs drift", async () => {
  const builder = new DependencyTopologyBuilder();

  const first = await builder.build({
    resource_class: "ConfigChangeRequest",
    action_family: "APPROVE_CONFIG",
    nodes: [
      {
        node_ref: "policy.rule.shared",
        node_type: "POLICY_RULE",
        version_ref: "policy.rule.version.1",
      },
    ],
    edges: [],
  });
  const second = await builder.build({
    resource_class: "ConfigChangeRequest",
    action_family: "APPROVE_CONFIG",
    nodes: [
      {
        node_ref: "policy.rule.shared",
        node_type: "POLICY_RULE",
        version_ref: "policy.rule.version.2",
      },
    ],
    edges: [],
  });

  expect(first.dependency_topology_hash).not.toBe(second.dependency_topology_hash);
  expect(first.nodes[0]?.node_ref).toBe(second.nodes[0]?.node_ref);
});

test("mutation-capable simulation fails closed without a frozen authorization decision source", async () => {
  const principal_context = await buildPrincipalContext();
  const simulator = new GovernanceMutationSimulator();

  await expect(
    simulator.simulate({
      principal_context,
      resource_class: "ConfigChangeRequest",
      action_family: "APPROVE_CONFIG",
      governance_target_ref: "config-change-request.0093",
      proposed_diff: {
        diff_class: "POLICY_STAGE",
      },
      topology: {
        nodes: [],
        edges: [],
      },
      simulated_at: "2026-04-23T09:15:00Z",
    }),
  ).rejects.toThrow(/GOVERNANCE_MUTATION_SIMULATOR_AUTHORIZATION_REQUIRED/);
});
