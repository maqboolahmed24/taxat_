import { expect, test } from "@playwright/test";

import {
  AuthorizationDecisionFactory,
  buildAuthorityLayerBoundaryContract,
  normalizePrincipalContextRecord,
} from "../../../packages/backend-access/src/index.ts";

function buildPrincipalContext(
  overrides: Partial<Parameters<typeof normalizePrincipalContextRecord>[0]> = {},
) {
  return normalizePrincipalContextRecord({
    principal_id: "user.operator.001",
    principal_type: "HUMAN",
    effective_role_set: ["TENANT_ADMIN"],
    tenant_id: "tenant.taxat",
    client_scope: ["client.taxpayer.001"],
    requested_scope: ["submit", "year_end", "amendment_intent"],
    partition_scope_refs: ["partition.uk.vat", "period.2026-Q1"],
    authn_level: "MFA",
    subject_identity_assurance_level: "VERIFIED",
    session_id: "session.browser.301",
    service_identity_ref: null,
    delegation_basis: "SELF_ACTING",
    authorization_evaluated_at: "2026-04-23T09:00:00Z",
    policy_snapshot_hash: "policy.snapshot.001",
    delegation_snapshot_refs: [],
    authority_link_refs: [],
    authority_link_snapshot_refs: [],
    masking_scope: "TENANT_ADMIN_UNMASKED",
    approval_capabilities: ["SINGLE_APPROVER"],
    client_portal_capabilities: [],
    run_kind_capabilities: ["GOVERNANCE_SIMULATION"],
    ...overrides,
  });
}

test("ALLOW_MASKED decisions fail closed without masking rules", async () => {
  const context = buildPrincipalContext();
  const factory = new AuthorizationDecisionFactory();

  await expect(
    factory.create({
      principal_context: context,
      resource_class: "Client",
      action_family: "VIEW_MASKED",
      decision: "ALLOW_MASKED",
      reason_codes: ["ROLE_TENANT_ADMIN_BASELINE_ALLOW_MASKED"],
      effective_scope: ["year_end"],
      effective_partition_scope_refs: ["period.2026-Q1"],
      authority_layer_boundary: buildAuthorityLayerBoundaryContract({
        binding_scope_class: "AUTHORIZATION_DECISION",
        integration_capability: "INTERNAL_ONLY",
        active_principal_class: "HUMAN",
        tenant_permission_state: "MASKED",
        client_delegation_state: "NOT_REQUIRED",
        delegation_basis: "SELF_ACTING",
        delegation_freshness_state: "NOT_APPLICABLE",
        authority_link_state: "NOT_REQUIRED",
        exceptional_authority_state: "NOT_APPLICABLE",
        human_gate_requirement: "NOT_REQUIRED",
        human_gate_resolution_state: "NOT_REQUIRED",
      }),
      masking_rules: [],
      evaluated_at: "2026-04-23T09:01:00Z",
    }),
  ).rejects.toThrow(/ALLOW_MASKED decisions must retain at least one masking rule/);
});

test("ALLOW decisions fail closed when masking rules are present", async () => {
  const context = buildPrincipalContext();
  const factory = new AuthorizationDecisionFactory();

  await expect(
    factory.create({
      principal_context: context,
      resource_class: "Client",
      action_family: "VIEW_FULL",
      decision: "ALLOW",
      reason_codes: ["ROLE_TENANT_ADMIN_BASELINE_ALLOW"],
      effective_scope: ["year_end"],
      effective_partition_scope_refs: ["period.2026-Q1"],
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
        human_gate_requirement: "NOT_REQUIRED",
        human_gate_resolution_state: "NOT_REQUIRED",
      }),
      masking_rules: ["mask.client_personal_fields"],
      evaluated_at: "2026-04-23T09:01:00Z",
    }),
  ).rejects.toThrow(/ALLOW decisions must not persist masking_rules/);
});

test("governance mutation decisions require dependency_topology_hash and simulation_basis_hash together", async () => {
  const context = buildPrincipalContext();
  const factory = new AuthorizationDecisionFactory();

  await expect(
    factory.create({
      principal_context: context,
      resource_class: "Override",
      action_family: "CREATE_OVERRIDE",
      decision: "REQUIRE_APPROVAL",
      reason_codes: ["APPROVAL_REQUIRED_FOR_OVERRIDE_CREATION"],
      effective_scope: ["year_end", "amendment_intent"],
      effective_partition_scope_refs: ["partition.uk.vat", "period.2026-Q1"],
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
      required_approvals: ["approval.override.single-approver"],
      bounded_safe_mutation: 0,
      approval_requirement: "SINGLE_APPROVER",
      dependency_topology_hash: "dependency.topology.001",
      simulation_basis_hash: null,
      evaluated_at: "2026-04-23T09:02:00Z",
    }),
  ).rejects.toThrow(/dependency_topology_hash and simulation_basis_hash must either both be null or both be populated/);
});

test("factory canonicalizes scope order and enforces chronology monotonicity", async () => {
  const context = buildPrincipalContext({
    delegation_basis: "CLIENT_GRANTED",
    delegation_snapshot_refs: ["delegation.snapshot.001"],
  });
  const factory = new AuthorizationDecisionFactory();

  const decision = await factory.create({
    principal_context: context,
    resource_class: "SubmissionRecord",
    action_family: "SUBMIT_TO_AUTHORITY",
    decision: "REQUIRE_STEP_UP",
    reason_codes: ["STEP_UP_REQUIRED_FOR_AUTHORITY_SUBMISSION"],
    effective_scope: ["submit", "year_end"],
    effective_partition_scope_refs: ["period.2026-Q1", "partition.uk.vat"],
    authority_layer_boundary: buildAuthorityLayerBoundaryContract({
      binding_scope_class: "AUTHORIZATION_DECISION",
      integration_capability: "AUTHORITY_INTEGRATED",
      active_principal_class: "HUMAN",
      tenant_permission_state: "SATISFIED",
      client_delegation_state: "SATISFIED",
      delegation_basis: "CLIENT_GRANTED",
      delegation_freshness_state: "NOT_APPLICABLE",
      authority_link_state: "AUTHORISED_ACTIVE",
      exceptional_authority_state: "NOT_APPLICABLE",
      human_gate_requirement: "REQUIRE_STEP_UP",
      human_gate_resolution_state: "PENDING_EVIDENCE",
    }),
    delegation_snapshot_refs: ["delegation.snapshot.001"],
    authority_link_snapshot_refs: ["authority.snapshot.001"],
    required_authn_level: "STEP_UP",
    evaluated_at: "2026-04-23T09:02:00Z",
  });
  const reorderedDecision = await factory.create({
    principal_context: context,
    resource_class: "SubmissionRecord",
    action_family: "SUBMIT_TO_AUTHORITY",
    decision: "REQUIRE_STEP_UP",
    reason_codes: ["STEP_UP_REQUIRED_FOR_AUTHORITY_SUBMISSION"],
    effective_scope: ["year_end", "submit"],
    effective_partition_scope_refs: ["partition.uk.vat", "period.2026-Q1"],
    authority_layer_boundary: buildAuthorityLayerBoundaryContract({
      binding_scope_class: "AUTHORIZATION_DECISION",
      integration_capability: "AUTHORITY_INTEGRATED",
      active_principal_class: "HUMAN",
      tenant_permission_state: "SATISFIED",
      client_delegation_state: "SATISFIED",
      delegation_basis: "CLIENT_GRANTED",
      delegation_freshness_state: "NOT_APPLICABLE",
      authority_link_state: "AUTHORISED_ACTIVE",
      exceptional_authority_state: "NOT_APPLICABLE",
      human_gate_requirement: "REQUIRE_STEP_UP",
      human_gate_resolution_state: "PENDING_EVIDENCE",
    }),
    delegation_snapshot_refs: ["delegation.snapshot.001"],
    authority_link_snapshot_refs: ["authority.snapshot.001"],
    required_authn_level: "STEP_UP",
    evaluated_at: "2026-04-23T09:02:00Z",
  });

  expect(decision.effective_scope).toEqual(["year_end", "submit"]);
  expect(decision.effective_partition_scope_refs).toEqual([
    "partition.uk.vat",
    "period.2026-Q1",
  ]);
  expect(decision.access_binding_hash).toBe(reorderedDecision.access_binding_hash);

  await expect(
    factory.create({
      principal_context: context,
      resource_class: "SubmissionRecord",
      action_family: "SUBMIT_TO_AUTHORITY",
      decision: "REQUIRE_STEP_UP",
      reason_codes: ["STEP_UP_REQUIRED_FOR_AUTHORITY_SUBMISSION"],
      effective_scope: ["year_end", "submit"],
      effective_partition_scope_refs: ["partition.uk.vat"],
      authority_layer_boundary: buildAuthorityLayerBoundaryContract({
        binding_scope_class: "AUTHORIZATION_DECISION",
        integration_capability: "AUTHORITY_INTEGRATED",
        active_principal_class: "HUMAN",
        tenant_permission_state: "SATISFIED",
        client_delegation_state: "SATISFIED",
        delegation_basis: "CLIENT_GRANTED",
        delegation_freshness_state: "NOT_APPLICABLE",
        authority_link_state: "AUTHORISED_ACTIVE",
        exceptional_authority_state: "NOT_APPLICABLE",
        human_gate_requirement: "REQUIRE_STEP_UP",
        human_gate_resolution_state: "PENDING_EVIDENCE",
      }),
      delegation_snapshot_refs: ["delegation.snapshot.001"],
      authority_link_snapshot_refs: ["authority.snapshot.001"],
      required_authn_level: "STEP_UP",
      evaluated_at: "2026-04-23T08:59:59Z",
    }),
  ).rejects.toThrow(/CONFLICT_CHRONOLOGY_NON_MONOTONIC/);
});

test("REQUIRE_STEP_UP decisions may not ask for BASIC authn", async () => {
  const context = buildPrincipalContext({
    delegation_basis: "CLIENT_GRANTED",
    delegation_snapshot_refs: ["delegation.snapshot.001"],
  });
  const factory = new AuthorizationDecisionFactory();

  await expect(
    factory.create({
      principal_context: context,
      resource_class: "SubmissionRecord",
      action_family: "SUBMIT_TO_AUTHORITY",
      decision: "REQUIRE_STEP_UP",
      reason_codes: ["STEP_UP_REQUIRED_FOR_AUTHORITY_SUBMISSION"],
      effective_scope: ["year_end", "submit"],
      effective_partition_scope_refs: ["partition.uk.vat", "period.2026-Q1"],
      authority_layer_boundary: buildAuthorityLayerBoundaryContract({
        binding_scope_class: "AUTHORIZATION_DECISION",
        integration_capability: "AUTHORITY_INTEGRATED",
        active_principal_class: "HUMAN",
        tenant_permission_state: "SATISFIED",
        client_delegation_state: "SATISFIED",
        delegation_basis: "CLIENT_GRANTED",
        delegation_freshness_state: "NOT_APPLICABLE",
        authority_link_state: "AUTHORISED_ACTIVE",
        exceptional_authority_state: "NOT_APPLICABLE",
        human_gate_requirement: "REQUIRE_STEP_UP",
        human_gate_resolution_state: "PENDING_EVIDENCE",
      }),
      delegation_snapshot_refs: ["delegation.snapshot.001"],
      authority_link_snapshot_refs: ["authority.snapshot.001"],
      required_authn_level: "BASIC",
      evaluated_at: "2026-04-23T09:02:00Z",
    }),
  ).rejects.toThrow(/REQUIRE_STEP_UP decisions may require MFA or STEP_UP, never BASIC/);
});

test("unknown reason codes are rejected by the registry before persistence", async () => {
  const context = buildPrincipalContext();
  const factory = new AuthorizationDecisionFactory();

  await expect(
    factory.create({
      principal_context: context,
      resource_class: "Client",
      action_family: "VIEW_FULL",
      decision: "ALLOW",
      reason_codes: ["THIS_REASON_CODE_DOES_NOT_EXIST"],
      effective_scope: ["year_end"],
      effective_partition_scope_refs: ["period.2026-Q1"],
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
        human_gate_requirement: "NOT_REQUIRED",
        human_gate_resolution_state: "NOT_REQUIRED",
      }),
      evaluated_at: "2026-04-23T09:01:00Z",
    }),
  ).rejects.toThrow(/REASON_CODE_UNSUPPORTED/);
});
