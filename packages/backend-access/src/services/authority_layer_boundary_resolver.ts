import type { AuthorityLink, PrincipalContext } from "../../../generated-models/src/generated/typescript/authority-and-access.ts";

import {
  AUTHORITY_LAYER_BOUNDARY_SENDABLE_SCOPE_CLASSES,
  buildAuthorityLayerBoundaryContract,
  type AuthorityBoundaryAuthorityLinkState,
  type AuthorityBoundaryBindingScopeClass,
  type AuthorityBoundaryClientDelegationState,
  type AuthorityBoundaryDelegationBasis,
  type AuthorityBoundaryDelegationFreshnessState,
  type AuthorityBoundaryExceptionalAuthorityState,
  type AuthorityBoundaryHumanGateRequirement,
  type AuthorityBoundaryHumanGateResolutionState,
  type AuthorityBoundaryIntegrationCapability,
  type AuthorityBoundaryPrincipalContextInput,
  type AuthorityBoundaryTenantPermissionState,
  type GovernedAuthorityLayerBoundaryContract,
} from "../models/authority_layer_boundary_contract.ts";
import { assertValidAuthorityLayerBoundaryContract } from "./authority_boundary_validator.ts";

export type AuthorityBoundaryDelegationInput = {
  required?: boolean;
  state?: AuthorityBoundaryClientDelegationState;
  freshness_state?: AuthorityBoundaryDelegationFreshnessState;
};

export type AuthorityBoundaryAuthorityLinkInput = {
  required?: boolean;
  lifecycle_state?: AuthorityLink["lifecycle_state"] | null;
  token_client_binding_state?: AuthorityLink["token_client_binding_state"] | null;
};

export type AuthorityBoundaryExceptionalAuthorityInput = {
  active?: boolean;
  state?: AuthorityBoundaryExceptionalAuthorityState;
  evidence_frozen?: boolean;
};

export type AuthorityBoundaryHumanGateInput = {
  requirement: AuthorityBoundaryHumanGateRequirement;
  resolution_state?: AuthorityBoundaryHumanGateResolutionState;
};

export type AuthorityLayerBoundaryResolutionInput = {
  binding_scope_class: AuthorityBoundaryBindingScopeClass;
  integration_capability?: AuthorityBoundaryIntegrationCapability;
  principal_context: AuthorityBoundaryPrincipalContextInput | Pick<PrincipalContext, "principal_type" | "delegation_basis">;
  tenant_permission_state: AuthorityBoundaryTenantPermissionState;
  delegation?: AuthorityBoundaryDelegationInput;
  authority_link?: AuthorityBoundaryAuthorityLinkInput;
  exceptional_authority?: AuthorityBoundaryExceptionalAuthorityInput;
  human_gate: AuthorityBoundaryHumanGateInput;
};

function isSendableBoundaryScope(bindingScopeClass: AuthorityBoundaryBindingScopeClass) {
  return new Set<string>(AUTHORITY_LAYER_BOUNDARY_SENDABLE_SCOPE_CLASSES).has(
    bindingScopeClass,
  );
}

function resolveIntegrationCapability(
  input: AuthorityLayerBoundaryResolutionInput,
): AuthorityBoundaryIntegrationCapability {
  if (input.integration_capability) {
    return input.integration_capability;
  }
  if (isSendableBoundaryScope(input.binding_scope_class)) {
    return "AUTHORITY_INTEGRATED";
  }
  return input.authority_link?.required ? "AUTHORITY_INTEGRATED" : "INTERNAL_ONLY";
}

function resolveClientDelegationState(
  integrationCapability: AuthorityBoundaryIntegrationCapability,
  delegation: AuthorityBoundaryDelegationInput | undefined,
) {
  if (integrationCapability === "INTERNAL_ONLY" || delegation?.required === false) {
    return "NOT_REQUIRED" as const;
  }
  if (delegation?.state) {
    return delegation.state;
  }
  return "MISSING" as const;
}

function resolveDelegationFreshnessState(
  delegationBasis: AuthorityBoundaryDelegationBasis,
  delegation: AuthorityBoundaryDelegationInput | undefined,
) {
  if (
    delegationBasis === "SELF_ASSESSMENT_IMPORTED" ||
    delegationBasis === "DIGITAL_HANDSHAKE"
  ) {
    return delegation?.freshness_state ?? "REVALIDATION_REQUIRED";
  }
  return "NOT_APPLICABLE" as const;
}

function resolveAuthorityLinkState(
  integrationCapability: AuthorityBoundaryIntegrationCapability,
  authorityLink: AuthorityBoundaryAuthorityLinkInput | undefined,
): AuthorityBoundaryAuthorityLinkState {
  if (integrationCapability === "INTERNAL_ONLY") {
    return "NOT_REQUIRED";
  }
  if (authorityLink?.token_client_binding_state === "MISMATCH") {
    return "TOKEN_INVALID";
  }
  return authorityLink?.lifecycle_state ?? "UNLINKED";
}

function resolveExceptionalAuthorityState(
  input: AuthorityBoundaryExceptionalAuthorityInput | undefined,
) {
  if (input?.state) {
    return input.state;
  }
  return input?.active ? "BOUNDED_INTERNAL_EXCEPTION" : "NOT_APPLICABLE";
}

function resolveHumanGateResolutionState(
  exceptionalAuthorityState: AuthorityBoundaryExceptionalAuthorityState,
  exceptionalAuthority: AuthorityBoundaryExceptionalAuthorityInput | undefined,
  humanGate: AuthorityBoundaryHumanGateInput,
) {
  if (humanGate.requirement === "NOT_REQUIRED") {
    return "NOT_REQUIRED";
  }
  if (humanGate.resolution_state) {
    return humanGate.resolution_state;
  }
  if (
    exceptionalAuthorityState === "BOUNDED_INTERNAL_EXCEPTION" &&
    exceptionalAuthority?.evidence_frozen
  ) {
    return "EVIDENCE_FROZEN";
  }
  return "PENDING_EVIDENCE";
}

export function resolveAuthorityLayerBoundaryContract(
  input: AuthorityLayerBoundaryResolutionInput,
) {
  const integrationCapability = resolveIntegrationCapability(input);
  const delegationBasis = input.principal_context.delegation_basis;
  const exceptionalAuthorityState = resolveExceptionalAuthorityState(
    input.exceptional_authority,
  );

  const contract = buildAuthorityLayerBoundaryContract({
    binding_scope_class: input.binding_scope_class,
    integration_capability: integrationCapability,
    active_principal_class: input.principal_context.principal_type,
    tenant_permission_state: input.tenant_permission_state,
    client_delegation_state: resolveClientDelegationState(
      integrationCapability,
      input.delegation,
    ),
    delegation_basis: delegationBasis,
    delegation_freshness_state: resolveDelegationFreshnessState(
      delegationBasis,
      input.delegation,
    ),
    authority_link_state: resolveAuthorityLinkState(
      integrationCapability,
      input.authority_link,
    ),
    exceptional_authority_state: exceptionalAuthorityState,
    human_gate_requirement: input.human_gate.requirement,
    human_gate_resolution_state: resolveHumanGateResolutionState(
      exceptionalAuthorityState,
      input.exceptional_authority,
      input.human_gate,
    ),
  });

  assertValidAuthorityLayerBoundaryContract(contract, {
    expectedBindingScopeClass: input.binding_scope_class,
    expectedIntegrationCapability: integrationCapability,
  });
  return contract satisfies GovernedAuthorityLayerBoundaryContract;
}
