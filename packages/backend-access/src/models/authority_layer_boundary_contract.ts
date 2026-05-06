import type {
  AuthorityLayerBoundaryContract as GeneratedAuthorityLayerBoundaryContract,
  PrincipalAccessViewAuthorityChainLayerStack,
  PrincipalAccessViewChainLayerOutcome,
  PrincipalContext,
} from "../../../generated-models/src/generated/typescript/authority-and-access.ts";

export type GovernedAuthorityLayerBoundaryContract = GeneratedAuthorityLayerBoundaryContract;

export type AuthorityBoundaryBindingScopeClass =
  GovernedAuthorityLayerBoundaryContract["binding_scope_class"];
export type AuthorityBoundaryIntegrationCapability =
  GovernedAuthorityLayerBoundaryContract["integration_capability"];
export type AuthorityBoundaryPrincipalClass =
  GovernedAuthorityLayerBoundaryContract["active_principal_class"];
export type AuthorityBoundaryTenantPermissionState =
  GovernedAuthorityLayerBoundaryContract["tenant_permission_state"];
export type AuthorityBoundaryClientDelegationState =
  GovernedAuthorityLayerBoundaryContract["client_delegation_state"];
export type AuthorityBoundaryDelegationBasis =
  GovernedAuthorityLayerBoundaryContract["delegation_basis"];
export type AuthorityBoundaryDelegationFreshnessState =
  GovernedAuthorityLayerBoundaryContract["delegation_freshness_state"];
export type AuthorityBoundaryAuthorityLinkState =
  GovernedAuthorityLayerBoundaryContract["authority_link_state"];
export type AuthorityBoundaryExceptionalAuthorityState =
  GovernedAuthorityLayerBoundaryContract["exceptional_authority_state"];
export type AuthorityBoundaryHumanGateRequirement =
  GovernedAuthorityLayerBoundaryContract["human_gate_requirement"];
export type AuthorityBoundaryHumanGateResolutionState =
  GovernedAuthorityLayerBoundaryContract["human_gate_resolution_state"];
export type AuthorityBoundaryPrincipalContextInput = Pick<
  PrincipalContext,
  "principal_type" | "delegation_basis"
>;
export type AuthorityBoundaryChainLayers = PrincipalAccessViewAuthorityChainLayerStack;
export type AuthorityBoundaryChainOutcome = PrincipalAccessViewChainLayerOutcome;
export type GovernedAuthorityLayerBoundaryContractForScope<
  Scope extends AuthorityBoundaryBindingScopeClass,
> = GovernedAuthorityLayerBoundaryContract & {
  binding_scope_class: Scope;
};

export const AUTHORITY_LAYER_BOUNDARY_VERSION = "AUTHORITY_LAYER_BOUNDARY_V1" as const;

export const AUTHORITY_LAYER_BOUNDARY_SCOPE_CLASSES = [
  "AUTHORIZATION_DECISION",
  "GOVERNANCE_ACCESS_SIMULATION",
  "AUTHORITY_BINDING",
  "AUTHORITY_OPERATION",
  "AUTHORITY_REQUEST_ENVELOPE",
] as const satisfies AuthorityBoundaryBindingScopeClass[];

export const AUTHORITY_LAYER_BOUNDARY_INTEGRATION_CAPABILITIES = [
  "INTERNAL_ONLY",
  "AUTHORITY_INTEGRATED",
] as const satisfies AuthorityBoundaryIntegrationCapability[];

export const AUTHORITY_LAYER_BOUNDARY_PRINCIPAL_CLASSES = [
  "HUMAN",
  "SERVICE",
  "EXTERNAL",
] as const satisfies AuthorityBoundaryPrincipalClass[];

export const AUTHORITY_LAYER_BOUNDARY_TENANT_PERMISSION_STATES = [
  "SATISFIED",
  "MASKED",
  "DENIED",
] as const satisfies AuthorityBoundaryTenantPermissionState[];

export const AUTHORITY_LAYER_BOUNDARY_CLIENT_DELEGATION_STATES = [
  "NOT_REQUIRED",
  "SATISFIED",
  "LIMITED",
  "MISSING",
  "EXPIRED",
] as const satisfies AuthorityBoundaryClientDelegationState[];

export const AUTHORITY_LAYER_BOUNDARY_DELEGATION_BASES = [
  "SELF_ACTING",
  "CLIENT_GRANTED",
  "SELF_ASSESSMENT_IMPORTED",
  "DIGITAL_HANDSHAKE",
  "TENANT_INTERNAL",
  "SYSTEM_ASSIGNED",
] as const satisfies AuthorityBoundaryDelegationBasis[];

export const AUTHORITY_LAYER_BOUNDARY_DELEGATION_FRESHNESS_STATES = [
  "NOT_APPLICABLE",
  "CURRENT",
  "REVALIDATION_REQUIRED",
] as const satisfies AuthorityBoundaryDelegationFreshnessState[];

export const AUTHORITY_LAYER_BOUNDARY_AUTHORITY_LINK_STATES = [
  "NOT_REQUIRED",
  "UNLINKED",
  "LINK_INITIATED",
  "AUTHORISED_ACTIVE",
  "AUTHORISED_LIMITED",
  "TOKEN_INVALID",
  "REVOKED",
  "EXPIRED",
  "SUPERSEDED",
] as const satisfies AuthorityBoundaryAuthorityLinkState[];

export const AUTHORITY_LAYER_BOUNDARY_EXCEPTIONAL_AUTHORITY_STATES = [
  "NOT_APPLICABLE",
  "BOUNDED_INTERNAL_EXCEPTION",
] as const satisfies AuthorityBoundaryExceptionalAuthorityState[];

export const AUTHORITY_LAYER_BOUNDARY_HUMAN_GATE_REQUIREMENTS = [
  "NOT_REQUIRED",
  "REQUIRE_STEP_UP",
  "REQUIRE_APPROVAL",
  "REQUIRE_STEP_UP_AND_APPROVAL",
] as const satisfies AuthorityBoundaryHumanGateRequirement[];

export const AUTHORITY_LAYER_BOUNDARY_HUMAN_GATE_RESOLUTION_STATES = [
  "NOT_REQUIRED",
  "PENDING_EVIDENCE",
  "EVIDENCE_FROZEN",
] as const satisfies AuthorityBoundaryHumanGateResolutionState[];

export const AUTHORITY_LAYER_BOUNDARY_POLICY_FIELDS = {
  authority_truth_precedence_policy: "EXTERNAL_TRUTH_SUPERSEDES_INTERNAL_EXCEPTION",
  tenant_permission_substitution_policy: "INTERNAL_PERMISSION_NEVER_SUFFICIENT_FOR_AUTHORITY_MUTATION",
  link_delegation_independence_policy: "AUTHORITY_LINK_NEVER_PROVES_CLIENT_DELEGATION",
  exceptional_scope_policy: "EXCEPTION_BOUND_TO_APPROVED_ACTION_CLIENT_AND_PARTITIONS",
} as const;

export const AUTHORITY_LAYER_BOUNDARY_PROHIBITED_ESCALATIONS = {
  service_human_gate_satisfaction_permitted: false,
  exceptional_authority_may_substitute_for_delegation: false,
  exceptional_authority_may_override_authority_truth: false,
  exceptional_authority_may_widen_client_scope: false,
  exceptional_authority_may_widen_partition_scope: false,
} as const;

export const AUTHORITY_LAYER_BOUNDARY_SENDABLE_SCOPE_CLASSES = [
  "AUTHORITY_BINDING",
  "AUTHORITY_OPERATION",
  "AUTHORITY_REQUEST_ENVELOPE",
] as const satisfies AuthorityBoundaryBindingScopeClass[];

export const AUTHORITY_LAYER_BOUNDARY_LIVE_DELEGATION_STATES = [
  "NOT_REQUIRED",
  "SATISFIED",
  "LIMITED",
] as const satisfies AuthorityBoundaryClientDelegationState[];

export const AUTHORITY_CHAIN_LAYER_CODES = [
  "SESSION_AUTHN_POSTURE",
  "TENANT_OPERATIONAL_AUTHORITY",
  "CLIENT_DELEGATION_COVERAGE",
  "EXTERNAL_AUTHORITY_LINK_READINESS",
  "AUTHORITY_OF_RECORD_OUTCOME",
] as const;

export type AuthorityChainLayerCode = (typeof AUTHORITY_CHAIN_LAYER_CODES)[number];

export type AuthorityLayerBoundaryContractInput<
  Scope extends AuthorityBoundaryBindingScopeClass = AuthorityBoundaryBindingScopeClass,
> = Omit<
  GovernedAuthorityLayerBoundaryContract,
  | "contract_version"
  | keyof typeof AUTHORITY_LAYER_BOUNDARY_POLICY_FIELDS
  | keyof typeof AUTHORITY_LAYER_BOUNDARY_PROHIBITED_ESCALATIONS
> & {
  binding_scope_class: Scope;
};

export function buildAuthorityLayerBoundaryContract<
  Scope extends AuthorityBoundaryBindingScopeClass,
>(
  input: AuthorityLayerBoundaryContractInput<Scope>,
): GovernedAuthorityLayerBoundaryContractForScope<Scope> {
  return {
    contract_version: AUTHORITY_LAYER_BOUNDARY_VERSION,
    binding_scope_class: input.binding_scope_class,
    integration_capability: input.integration_capability,
    active_principal_class: input.active_principal_class,
    tenant_permission_state: input.tenant_permission_state,
    client_delegation_state: input.client_delegation_state,
    delegation_basis: input.delegation_basis,
    delegation_freshness_state: input.delegation_freshness_state,
    authority_link_state: input.authority_link_state,
    exceptional_authority_state: input.exceptional_authority_state,
    human_gate_requirement: input.human_gate_requirement,
    human_gate_resolution_state: input.human_gate_resolution_state,
    authority_truth_precedence_policy:
      AUTHORITY_LAYER_BOUNDARY_POLICY_FIELDS.authority_truth_precedence_policy,
    tenant_permission_substitution_policy:
      AUTHORITY_LAYER_BOUNDARY_POLICY_FIELDS.tenant_permission_substitution_policy,
    link_delegation_independence_policy:
      AUTHORITY_LAYER_BOUNDARY_POLICY_FIELDS.link_delegation_independence_policy,
    exceptional_scope_policy: AUTHORITY_LAYER_BOUNDARY_POLICY_FIELDS.exceptional_scope_policy,
    service_human_gate_satisfaction_permitted:
      AUTHORITY_LAYER_BOUNDARY_PROHIBITED_ESCALATIONS.service_human_gate_satisfaction_permitted,
    exceptional_authority_may_substitute_for_delegation:
      AUTHORITY_LAYER_BOUNDARY_PROHIBITED_ESCALATIONS.exceptional_authority_may_substitute_for_delegation,
    exceptional_authority_may_override_authority_truth:
      AUTHORITY_LAYER_BOUNDARY_PROHIBITED_ESCALATIONS.exceptional_authority_may_override_authority_truth,
    exceptional_authority_may_widen_client_scope:
      AUTHORITY_LAYER_BOUNDARY_PROHIBITED_ESCALATIONS.exceptional_authority_may_widen_client_scope,
    exceptional_authority_may_widen_partition_scope:
      AUTHORITY_LAYER_BOUNDARY_PROHIBITED_ESCALATIONS.exceptional_authority_may_widen_partition_scope,
  } as GovernedAuthorityLayerBoundaryContractForScope<Scope>;
}

export function rebindAuthorityLayerBoundaryScope(
  contract: GovernedAuthorityLayerBoundaryContract,
  binding_scope_class: AuthorityBoundaryBindingScopeClass,
): GovernedAuthorityLayerBoundaryContractForScope<AuthorityBoundaryBindingScopeClass> {
  return buildAuthorityLayerBoundaryContract({
    ...contract,
    binding_scope_class,
  });
}
