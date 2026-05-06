import type {
  CanonicalJsonValue,
  HashDigest,
} from "../../../domain-kernel/src/primitives/hash.ts";

import {
  buildAuthorizationDecisionAccessBindingVector,
  buildPrincipalContextAccessBindingVector,
  buildScopeExecutionBindingAccessBindingVector,
  type AuthorizationDecisionAccessBindingHashInput,
  type PrincipalContextAccessBindingHashInput,
  type ScopeExecutionBindingAccessBindingHashInput,
} from "./access_binding_hash.ts";
import {
  buildGovernanceMutationBasisContractHashVector,
  type GovernanceMutationBasisContractHashInput,
} from "./basis_contract_hash.ts";
import {
  buildCanonicalHashVector,
} from "./canonical_hash_serializer.ts";
import {
  buildDependencyTopologyHashVector,
  type DependencyTopologyHashEdgeInput,
  type DependencyTopologyHashNodeInput,
} from "./dependency_topology_hash.ts";
import {
  buildGovernanceMutationHazardContractHashVector,
  type GovernanceMutationHazardContractHashInput,
} from "./hazard_contract_hash.ts";
import {
  buildSimulationBasisHashVector,
  type SimulationBasisHashInput,
} from "./simulation_basis_hash.ts";

export const HASH_VECTOR_FIXTURE_CATALOG_VERSION =
  "BACKEND_ACCESS_HASH_VECTOR_FIXTURES_V1" as const;

export type HashVectorFixture<
  Input,
  Vector extends CanonicalJsonValue = CanonicalJsonValue,
> = {
  description: string;
  expected_digest: HashDigest;
  input: Input;
  serialized_vector: string;
  vector: Vector;
};

function createHashVectorFixture<Input, Vector extends CanonicalJsonValue>(options: {
  buildVector: (input: Input) => Vector;
  description: string;
  expected_digest: HashDigest;
  input: Input;
}): HashVectorFixture<Input, Vector> {
  const canonicalVector = buildCanonicalHashVector<Vector>(
    options.buildVector(options.input),
  );

  return {
    description: options.description,
    expected_digest: options.expected_digest,
    input: structuredClone(options.input),
    vector: canonicalVector.payload,
    serialized_vector: canonicalVector.serialized,
  };
}

export const authorizationDecisionBoundaryFixture = {
  contract_version: "AUTHORITY_LAYER_BOUNDARY_V1",
  binding_scope_class: "AUTHORIZATION_DECISION",
  integration_capability: "AUTHORITY_INTEGRATED",
  active_principal_class: "HUMAN",
  tenant_permission_state: "SATISFIED",
  client_delegation_state: "SATISFIED",
  delegation_basis: "CLIENT_GRANTED",
  delegation_freshness_state: "CURRENT",
  authority_link_state: "AUTHORISED_ACTIVE",
  exceptional_authority_state: "NOT_APPLICABLE",
  human_gate_requirement: "REQUIRE_APPROVAL",
  human_gate_resolution_state: "PENDING_EVIDENCE",
  authority_truth_precedence_policy:
    "EXTERNAL_TRUTH_SUPERSEDES_INTERNAL_EXCEPTION",
  tenant_permission_substitution_policy:
    "INTERNAL_PERMISSION_NEVER_SUFFICIENT_FOR_AUTHORITY_MUTATION",
  link_delegation_independence_policy:
    "AUTHORITY_LINK_NEVER_PROVES_CLIENT_DELEGATION",
  exceptional_scope_policy:
    "EXCEPTION_BOUND_TO_APPROVED_ACTION_CLIENT_AND_PARTITIONS",
  service_human_gate_satisfaction_permitted: false,
  exceptional_authority_may_substitute_for_delegation: false,
  exceptional_authority_may_override_authority_truth: false,
  exceptional_authority_may_widen_client_scope: false,
  exceptional_authority_may_widen_partition_scope: false,
} as const;

export const principalContextAccessBindingFixtureInput = {
  principal_id: "user.operator.hash.001",
  principal_type: "HUMAN",
  effective_role_set: ["TENANT_ADMIN", "REVIEWER", "TENANT_ADMIN"],
  tenant_id: "tenant.hash",
  client_scope: ["client.taxpayer.001", "client.taxpayer.001"],
  requested_scope: ["submit", "year_end", "prepare_submission"],
  partition_scope_refs: ["period.2026-Q1", "partition.uk.vat", "period.2026-Q1"],
  authn_level: "STEP_UP",
  subject_identity_assurance_level: "STEP_UP_VERIFIED",
  session_id: "session.browser.hash.001",
  service_identity_ref: null,
  delegation_basis: "CLIENT_GRANTED",
  authorization_evaluated_at: "2026-04-23T11:00:00+01:00",
  policy_snapshot_hash: "policy.snapshot.hash.0093",
  delegation_snapshot_refs: ["delegation.snapshot.002", "delegation.snapshot.001"],
  authority_link_refs: ["authority.link.002", "authority.link.001"],
  authority_link_snapshot_refs: ["authority.snapshot.002", "authority.snapshot.001"],
  masking_scope: "TENANT_ADMIN_UNMASKED",
  approval_capabilities: ["TENANT_ADMIN", "SECURITY_TEAM", "TENANT_ADMIN"],
  client_portal_capabilities: [
    "REQUEST_ASSISTANCE_ON_BEHALF",
    "REQUEST_ASSISTANCE_ON_BEHALF",
  ],
  run_kind_capabilities: ["TENANT_MUTATION_PREVIEW", "GOVERNANCE_SIMULATION"],
} satisfies PrincipalContextAccessBindingHashInput;

export const principalContextAccessBindingFixture = createHashVectorFixture({
  description:
    "PrincipalContext access binding fixture with duplicate and out-of-order set-like inputs",
  input: principalContextAccessBindingFixtureInput,
  buildVector: buildPrincipalContextAccessBindingVector,
  expected_digest:
    "c63ee34bb459aff65f1e3e571a1b88cfeac761eafae1faa417bdbca7f75a3428" as HashDigest,
});

export const dependencyTopologyFixtureInput = {
  node_weight_profile_ref: "node.weight.profile.config_change.v1",
  edge_weight_profile_ref: "edge.weight.profile.config_change.v1",
  nodes: [
    {
      node_ref: "workflow.guard.200",
      version_ref: "workflow.guard.version.200",
    },
    {
      node_ref: "policy.rule.200",
      version_ref: "policy.rule.version.200",
    },
    {
      node_ref: "authority.link.200",
      version_ref: "authority.link.version.200",
    },
  ] satisfies DependencyTopologyHashNodeInput[],
  edges: [
    {
      from_node_ref: "workflow.guard.200",
      to_node_ref: "authority.link.200",
      edge_type: "AUTHORITY_LINK",
      edge_ref: "edge.workflow.authority",
      version_ref: "edge.version.002",
    },
    {
      from_node_ref: "policy.rule.200",
      to_node_ref: "workflow.guard.200",
      edge_type: "WORKFLOW_GUARD",
      edge_ref: "edge.policy.workflow",
      version_ref: "edge.version.001",
    },
  ] satisfies DependencyTopologyHashEdgeInput[],
};

export const dependencyTopologyFixture = createHashVectorFixture({
  description:
    "Dependency topology hash fixture that binds ordered nodes, ordered edges, profile refs, and version lineage",
  input: dependencyTopologyFixtureInput,
  buildVector: buildDependencyTopologyHashVector,
  expected_digest:
    "ece6f1697e7232bf6e37e7ec4ae171aba471c536fd7cb27f2fd58a1e1b5f8bb9" as HashDigest,
});

export const simulationBasisFixtureInput = {
  policy_snapshot_hash: principalContextAccessBindingFixtureInput.policy_snapshot_hash,
  dependency_topology_hash: dependencyTopologyFixture.expected_digest,
  proposed_diff: {
    effective_at: new Date("2026-04-23T11:05:00Z"),
    nested: {
      after: {
        approvals: ["SECURITY_TEAM", "CHANGE_BOARD"],
      },
      before: null,
    },
    diff_class: "ROLE_GRANT",
    staged_object_refs: ["workflow.guard.200", "policy.rule.200"],
  },
  acting_principal_ref: principalContextAccessBindingFixtureInput.principal_id,
  requested_approver_scope: ["TENANT_ADMIN", "SECURITY_TEAM", "TENANT_ADMIN"],
  simulation_profile_ref: "governance.profile.config_change.v1",
} satisfies SimulationBasisHashInput;

export const simulationBasisFixture = createHashVectorFixture({
  description:
    "Simulation basis hash fixture with nested diff payload and requested approver scope normalization",
  input: simulationBasisFixtureInput,
  buildVector: buildSimulationBasisHashVector,
  expected_digest:
    "856bef4fd97756207e500437205cc5c31ebb81b5b7500338dac4b2d5904b8db1" as HashDigest,
});

export const governanceAuthorizationDecisionFixtureInput = {
  principal_context_access_binding_hash:
    principalContextAccessBindingFixture.expected_digest,
  resource_class: "ConfigChangeRequest",
  action_family: "APPROVE_CONFIG",
  decision: "REQUIRE_APPROVAL",
  reason_codes: [
    "APPROVAL_REQUIRED_FOR_OVERRIDE_CREATION",
    "AUTHORITY_LINK_ACTIVE_REQUIRED",
  ],
  effective_scope: ["amendment_intent", "year_end"],
  effective_partition_scope_refs: [
    "period.2026-Q1",
    "partition.uk.vat",
    "period.2026-Q1",
  ],
  masking_rules: [],
  required_approvals: ["TENANT_ADMIN", "SECURITY_TEAM"],
  required_authn_level: "STEP_UP",
  policy_snapshot_hash: principalContextAccessBindingFixtureInput.policy_snapshot_hash,
  delegation_snapshot_refs: ["delegation.snapshot.002", "delegation.snapshot.001"],
  authority_link_snapshot_refs: ["authority.snapshot.002", "authority.snapshot.001"],
  authority_layer_boundary: authorizationDecisionBoundaryFixture,
  bounded_safe_mutation: 0,
  approval_requirement: "SECURITY_REVIEW",
  dependency_topology_hash: dependencyTopologyFixture.expected_digest,
  simulation_basis_hash: simulationBasisFixture.expected_digest,
} satisfies AuthorizationDecisionAccessBindingHashInput;

export const governanceAuthorizationDecisionFixture = createHashVectorFixture({
  description:
    "Governance authorization-decision access binding fixture that binds topology and simulation basis lineage",
  input: governanceAuthorizationDecisionFixtureInput,
  buildVector: buildAuthorizationDecisionAccessBindingVector,
  expected_digest:
    "a4d3839fd157877fcc6614caa2c20bc3b2efd5d8d70aefe8bedf64d4fe68dc6f" as HashDigest,
});

export const allowAuthorizationDecisionFixtureInput = {
  principal_context_access_binding_hash:
    principalContextAccessBindingFixture.expected_digest,
  resource_class: "ClientRecord",
  action_family: "VIEW_FULL",
  decision: "ALLOW",
  reason_codes: ["ROLE_TENANT_ADMIN_BASELINE_ALLOW"],
  effective_scope: ["year_end"],
  effective_partition_scope_refs: ["partition.uk.vat"],
  masking_rules: [],
  required_approvals: [],
  required_authn_level: null,
  policy_snapshot_hash: principalContextAccessBindingFixtureInput.policy_snapshot_hash,
  delegation_snapshot_refs: ["delegation.snapshot.001"],
  authority_link_snapshot_refs: ["authority.snapshot.001"],
  authority_layer_boundary: {
    ...authorizationDecisionBoundaryFixture,
    human_gate_requirement: "NOT_REQUIRED",
    human_gate_resolution_state: "NOT_REQUIRED",
  },
  bounded_safe_mutation: null,
  approval_requirement: null,
  dependency_topology_hash: null,
  simulation_basis_hash: null,
} satisfies AuthorizationDecisionAccessBindingHashInput;

export const allowAuthorizationDecisionFixture = createHashVectorFixture({
  description:
    "Non-governance authorization-decision access binding fixture with explicit null topology and simulation basis",
  input: allowAuthorizationDecisionFixtureInput,
  buildVector: buildAuthorizationDecisionAccessBindingVector,
  expected_digest:
    "53f3b544272a286e59aa1572d6834633f746a69bd667aa669431ee45d9716d37" as HashDigest,
});

export const scopeExecutionBindingFixtureInput = {
  authorization_decision_access_binding_hash:
    governanceAuthorizationDecisionFixture.expected_digest,
  execution_mode_or_null: "COMPLIANCE",
  requested_scope_family: "PREPARE_AND_SUBMIT",
  executable_scope_family: "PREPARE_ONLY",
  requested_scope: ["submit", "year_end", "prepare_submission"],
  executable_scope: ["year_end", "prepare_submission"],
  executable_partition_scope_refs: ["period.2026-Q1", "partition.uk.vat"],
  access_decision: "ALLOW_MASKED",
  reduction_posture: "REDUCED_BY_AUTHORIZATION",
  mutation_atomicity: "ATOMIC_REQUIRED",
  masking_rules: ["mask.client.personal_fields"],
  required_approvals: [],
  required_authn_level: null,
  reason_codes: ["MASKING_REQUIRED_FOR_CLIENT_EXPORT"],
} satisfies ScopeExecutionBindingAccessBindingHashInput;

export const scopeExecutionBindingFixture = createHashVectorFixture({
  description:
    "Scope-execution binding fixture that reduces requested scope and keeps masking explicit",
  input: scopeExecutionBindingFixtureInput,
  buildVector: buildScopeExecutionBindingAccessBindingVector,
  expected_digest:
    "3fc20f948b83d1f1211257cb4e7e6c8d6dcfe770de0741264fabc572aefe8630" as HashDigest,
});

export const governanceMutationHazardContractFixtureInput = {
  contract_version: "GOVERNANCE_MUTATION_HAZARD_CONTRACT_V1",
  policy_snapshot_hash: principalContextAccessBindingFixtureInput.policy_snapshot_hash,
  access_binding_hash: governanceAuthorizationDecisionFixture.expected_digest,
  dependency_topology_hash: dependencyTopologyFixture.expected_digest,
  simulation_basis_hash: simulationBasisFixture.expected_digest,
  count_class_profile_code: "GOVERNANCE_IMPACT_COUNT_CLASS_V1",
  commit_authority_posture: "APPROVAL_GATED",
  impact_radius_lower_score: 18,
  impact_radius_upper_score: 42,
  impacted_principal_count: 3,
  impacted_principal_count_class: "SMALL_BATCH",
  impacted_client_count: 1,
  impacted_client_count_class: "ONE",
  impacted_authority_operation_count: 2,
  impacted_authority_operation_count_class: "SMALL_BATCH",
  impacted_workflow_count: 1,
  impacted_workflow_count_class: "ONE",
  impacted_limitation_count: 0,
  impacted_limitation_count_class: "ZERO",
  privilege_gain_score: 25,
  scope_expansion_score: 15,
  masking_relaxation_score: 0,
  policy_risk_score: 37,
  approval_necessity_score: 58,
  approval_requirement: "SECURITY_REVIEW",
  bounded_safe_mutation: 0,
  required_approvals: ["SECURITY_TEAM"],
  simulation_confidence_score: 92,
  predictability_score: 87,
  risk_driver_codes: [
    "PRIVILEGE_GAIN",
    "SCOPE_EXPANSION",
    "BROAD_BLAST_RADIUS",
  ],
  approval_trigger_codes: ["SECURITY_REVIEW_REQUIRED"],
  confidence_limiter_codes: [],
  bounded_safety_blocker_codes: [
    "PRIVILEGE_GAIN_PRESENT",
    "SCOPE_EXPANSION_PRESENT",
    "IMPACT_RADIUS_TOO_LARGE",
    "POLICY_RISK_TOO_HIGH",
  ],
  reason_codes: [
    "APPROVAL_REQUIRED_FOR_OVERRIDE_CREATION",
    "GOVERNANCE_SIMULATION_REQUIRED_FOR_OVERRIDE_CREATION",
  ],
} satisfies GovernanceMutationHazardContractHashInput;

export const governanceMutationHazardContractFixture = createHashVectorFixture({
  description:
    "Governance mutation hazard-contract fixture bound to the canonical access, topology, and simulation basis lineage",
  input: governanceMutationHazardContractFixtureInput,
  buildVector: buildGovernanceMutationHazardContractHashVector,
  expected_digest:
    "b97ac7943a82d31d0993c899f04a5f989557f363e2b7921800bb77b43fbd8cba" as HashDigest,
});

export const governanceMutationBasisContractFixtureInput = {
  contract_version: "GOVERNANCE_MUTATION_BASIS_CONTRACT_V1",
  policy_snapshot_hash: principalContextAccessBindingFixtureInput.policy_snapshot_hash,
  access_binding_hash: governanceAuthorizationDecisionFixture.expected_digest,
  dependency_topology_hash: dependencyTopologyFixture.expected_digest,
  simulation_basis_hash: simulationBasisFixture.expected_digest,
  hazard_contract_hash: governanceMutationHazardContractFixture.expected_digest,
  commit_authority_posture: "APPROVAL_GATED",
  approval_requirement: "SECURITY_REVIEW",
  bounded_safe_mutation: 0,
  required_approvals: ["SECURITY_TEAM"],
  simulation_confidence_score: 92,
  predictability_score: 87,
} satisfies GovernanceMutationBasisContractHashInput;

export const governanceMutationBasisContractFixture = createHashVectorFixture({
  description:
    "Governance mutation basis-contract fixture coupled to the hazard contract and simulation lineage",
  input: governanceMutationBasisContractFixtureInput,
  buildVector: buildGovernanceMutationBasisContractHashVector,
  expected_digest:
    "6d9f48337b10cffa2f8bf687181779e0378eac3b07b5672ad04922983a17decb" as HashDigest,
});

export const backendAccessHashVectorFixtures = {
  principal_context_access_binding: principalContextAccessBindingFixture,
  dependency_topology_hash: dependencyTopologyFixture,
  simulation_basis_hash: simulationBasisFixture,
  governance_authorization_decision_access_binding:
    governanceAuthorizationDecisionFixture,
  allow_authorization_decision_access_binding:
    allowAuthorizationDecisionFixture,
  scope_execution_binding_access_binding: scopeExecutionBindingFixture,
  governance_mutation_hazard_contract_hash:
    governanceMutationHazardContractFixture,
  governance_mutation_basis_contract_hash:
    governanceMutationBasisContractFixture,
} as const;
