import { expect, test } from "@playwright/test";

import type {
  AuthorizationDecision,
  PrincipalContext,
} from "../../../packages/generated-models/src/generated/typescript/authority-and-access.ts";
import type { GovernanceAccessSimulation } from "../../../packages/generated-models/src/generated/typescript/governance-and-policy.ts";

import {
  buildAuthorityChainLayers,
  explainAuthorityLayerBoundary,
  loadAuthorityLayerInterpretationRules,
  rebindAuthorityLayerBoundaryScope,
  resolveAuthorityLayerBoundaryContract,
} from "../../../packages/backend-access/src/index.ts";

const basePrincipalContext = {
  artifact_type: "PrincipalContext",
  principal_id: "principal.operator.001",
  principal_type: "HUMAN",
  effective_role_set: ["TENANT_ADMIN"],
  tenant_id: "tenant.taxat",
  client_scope: ["client.taxpayer.001"],
  requested_scope: ["prepare_submission", "submit"],
  partition_scope_refs: ["partition.uk.vat", "period.2026-Q1"],
  authn_level: "MFA",
  subject_identity_assurance_level: "VERIFIED",
  session_id: "session.browser.001",
  service_identity_ref: null,
  delegation_basis: "CLIENT_GRANTED",
  authorization_evaluated_at: "2026-04-23T10:00:00Z",
  policy_snapshot_hash: "hash.policy.001",
  access_binding_hash: "hash.binding.001",
  delegation_snapshot_refs: ["delegation.snapshot.001"],
  authority_link_refs: ["authority.link.001"],
  authority_link_snapshot_refs: ["authority.link.snapshot.001"],
  masking_scope: "NONE",
  approval_capabilities: ["APPROVE_LOW_RISK_GOVERNANCE_MUTATION"],
  client_portal_capabilities: [],
  run_kind_capabilities: ["INTERACTIVE"],
} satisfies PrincipalContext;

test("resolver emits deterministic packets that can be embedded in authorization and simulation artifacts", async () => {
  const rules = await loadAuthorityLayerInterpretationRules({ reload: true });
  expect(rules.contract_version).toBe("AUTHORITY_LAYER_INTERPRETATION_RULES_V1");

  const authorizationBoundary = resolveAuthorityLayerBoundaryContract({
    binding_scope_class: "AUTHORIZATION_DECISION",
    principal_context: basePrincipalContext,
    tenant_permission_state: "SATISFIED",
    delegation: {
      required: true,
      state: "SATISFIED",
    },
    authority_link: {
      required: true,
      lifecycle_state: "AUTHORISED_ACTIVE",
      token_client_binding_state: "BOUND",
    },
    human_gate: {
      requirement: "REQUIRE_STEP_UP",
      resolution_state: "PENDING_EVIDENCE",
    },
  });

  const simulationBoundary = rebindAuthorityLayerBoundaryScope(
    authorizationBoundary,
    "GOVERNANCE_ACCESS_SIMULATION",
  );

  const chainLayers = await buildAuthorityChainLayers(authorizationBoundary, {
    tenantOperationalReasonCodes: [
      "ROLE_TENANT_ADMIN_CAN_OPERATE_CLIENT_WORK",
      "STEP_UP_REQUIRED_FOR_AUTHORITY_SUBMISSION",
    ],
  });

  expect(chainLayers.map((layer) => layer.layer_code)).toEqual([
    "SESSION_AUTHN_POSTURE",
    "TENANT_OPERATIONAL_AUTHORITY",
    "CLIENT_DELEGATION_COVERAGE",
    "EXTERNAL_AUTHORITY_LINK_READINESS",
    "AUTHORITY_OF_RECORD_OUTCOME",
  ]);
  expect(chainLayers[0]).toEqual(
    expect.objectContaining({
      layer_outcome: "REQUIRE_STEP_UP",
      reason_codes: ["STEP_UP_EVIDENCE_MISSING"],
    }),
  );
  expect(chainLayers[2]).toEqual(
    expect.objectContaining({
      layer_outcome: "ALLOW",
      reason_codes: ["CLIENT_DELEGATION_BOUND"],
    }),
  );

  const authorizationDecision = {
    artifact_type: "AuthorizationDecision",
    decision_id: "decision.001",
    principal_context_ref: basePrincipalContext.principal_id,
    resource_class: "CLIENT_WORKFLOW",
    action_family: "SUBMIT_TO_AUTHORITY",
    decision: "REQUIRE_STEP_UP",
    reason_codes: ["STEP_UP_REQUIRED_FOR_AUTHORITY_SUBMISSION"],
    effective_scope: ["prepare_submission", "submit"],
    effective_partition_scope_refs: ["partition.uk.vat", "period.2026-Q1"],
    masking_rules: [],
    required_approvals: [],
    required_authn_level: "STEP_UP",
    policy_snapshot_hash: "hash.policy.001",
    access_binding_hash: "hash.binding.001",
    dependency_topology_hash: null,
    simulation_basis_hash: null,
    delegation_snapshot_refs: ["delegation.snapshot.001"],
    authority_link_snapshot_refs: ["authority.link.snapshot.001"],
    authority_layer_boundary:
      authorizationBoundary as AuthorizationDecision["authority_layer_boundary"],
    bounded_safe_mutation: null,
    approval_requirement: null,
    evaluated_at: "2026-04-23T10:00:00Z",
  } satisfies AuthorizationDecision;

  const governanceSimulation = {
    artifact_type: "GovernanceAccessSimulation",
    simulation_id: "simulation.001",
    tenant_id: basePrincipalContext.tenant_id,
    policy_snapshot_hash: "hash.policy.001",
    principal_context_ref: basePrincipalContext.principal_id,
    governance_target_ref: "tenant.taxat",
    resource_class: "CLIENT_WORKFLOW",
    action_family: "SUBMIT_TO_AUTHORITY",
    requested_scope: ["prepare_submission", "submit"],
    requested_partition_scope_refs: ["partition.uk.vat", "period.2026-Q1"],
    authorization_decision: authorizationDecision,
    authority_layer_boundary:
      simulationBoundary as GovernanceAccessSimulation["authority_layer_boundary"],
    authority_chain_layers: chainLayers as GovernanceAccessSimulation["authority_chain_layers"],
    simulator_posture: "READ_ONLY_DECISION",
    mutation_hazard: null,
    mutation_basis_contract: null,
    simulated_at: "2026-04-23T10:00:00Z",
  } satisfies GovernanceAccessSimulation;

  expect(governanceSimulation.authorization_decision.authority_layer_boundary).toEqual(
    authorizationBoundary,
  );
  expect(governanceSimulation.authority_layer_boundary).toEqual(simulationBoundary);
  expect(simulationBoundary).toEqual({
    ...authorizationBoundary,
    binding_scope_class: "GOVERNANCE_ACCESS_SIMULATION",
  });
});

test("resolver fails closed for service human-gate satisfaction, token mismatch, reserved-action denial, and authority-of-record conflict", async () => {
  expect(() =>
    resolveAuthorityLayerBoundaryContract({
      binding_scope_class: "AUTHORIZATION_DECISION",
      principal_context: {
        principal_type: "SERVICE",
        delegation_basis: "TENANT_INTERNAL",
      },
      tenant_permission_state: "SATISFIED",
      human_gate: {
        requirement: "REQUIRE_STEP_UP",
        resolution_state: "EVIDENCE_FROZEN",
      },
    }),
  ).toThrow();

  const tokenMismatchBoundary = resolveAuthorityLayerBoundaryContract({
    binding_scope_class: "AUTHORIZATION_DECISION",
    principal_context: {
      principal_type: "HUMAN",
      delegation_basis: "DIGITAL_HANDSHAKE",
    },
    tenant_permission_state: "SATISFIED",
    delegation: {
      required: true,
      state: "SATISFIED",
      freshness_state: "CURRENT",
    },
    authority_link: {
      required: true,
      lifecycle_state: "AUTHORISED_ACTIVE",
      token_client_binding_state: "MISMATCH",
    },
    human_gate: {
      requirement: "NOT_REQUIRED",
    },
  });

  expect(tokenMismatchBoundary.authority_link_state).toBe("TOKEN_INVALID");

  const reservedActionBoundary = resolveAuthorityLayerBoundaryContract({
    binding_scope_class: "AUTHORIZATION_DECISION",
    principal_context: {
      ...basePrincipalContext,
      delegation_basis: "SELF_ACTING",
    },
    tenant_permission_state: "DENIED",
    delegation: {
      required: false,
    },
    human_gate: {
      requirement: "NOT_REQUIRED",
    },
  });

  const explanation = await explainAuthorityLayerBoundary(reservedActionBoundary, {
    tenantOperationalReasonCodes: ["ACTION_FAMILY_RESERVED_TO_MAIN_AGENT"],
    authorityOfRecordState: "CONFLICT_UNCERTAIN",
  });

  expect(explanation.layers.tenant_operational_authority.outcome).toBe("DENY");
  expect(explanation.layers.tenant_operational_authority.reason_codes).toEqual([
    "ACTION_FAMILY_RESERVED_TO_MAIN_AGENT",
  ]);
  expect(explanation.layers.authority_of_record_outcome.outcome).toBe("DENY");
  expect(explanation.layers.authority_of_record_outcome.reason_codes).toEqual([
    "AUTHORITY_OF_RECORD_CONFLICT_UNCERTAIN",
  ]);
});
