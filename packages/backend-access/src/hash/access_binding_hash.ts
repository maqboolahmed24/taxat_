import type { CanonicalJsonValue } from "../../../domain-kernel/src/primitives/hash.ts";

import {
  normalizeScopeSequence,
  normalizeStringSet,
  requireTrimmedString,
  type ScopeExecutionBindingScopeFamily,
  type ScopeMutationAtomicity,
} from "../services/principal_context_normalizer.ts";
import {
  canonicalHashDigest,
  normalizeCanonicalInstant,
  normalizeCanonicalHashValue,
  normalizeCanonicalNullableString,
} from "./canonical_hash_serializer.ts";

export type PrincipalContextAccessBindingHashInput = {
  approval_capabilities: readonly string[];
  authority_link_refs: readonly string[];
  authority_link_snapshot_refs: readonly string[];
  authn_level: string;
  authorization_evaluated_at: string;
  client_portal_capabilities: readonly string[];
  client_scope: readonly string[];
  delegation_basis: string;
  delegation_snapshot_refs: readonly string[];
  effective_role_set: readonly string[];
  masking_scope: string;
  partition_scope_refs: readonly string[];
  policy_snapshot_hash: string;
  principal_id: string;
  principal_type: string;
  requested_scope: readonly string[];
  run_kind_capabilities: readonly string[];
  service_identity_ref: string | null;
  session_id: string;
  subject_identity_assurance_level: string;
  tenant_id: string;
};

export type AuthorizationDecisionAccessBindingHashInput = {
  action_family: string;
  approval_requirement: string | null | undefined;
  authority_layer_boundary: Record<string, unknown>;
  authority_link_snapshot_refs: readonly string[];
  bounded_safe_mutation: 0 | 1 | null | undefined;
  decision: string;
  delegation_snapshot_refs: readonly string[];
  dependency_topology_hash: string | null | undefined;
  effective_partition_scope_refs: readonly string[];
  effective_scope: readonly string[];
  masking_rules: readonly string[];
  policy_snapshot_hash: string;
  principal_context_access_binding_hash: string;
  reason_codes: readonly string[];
  required_approvals: readonly string[];
  required_authn_level: string | null | undefined;
  resource_class: string;
  simulation_basis_hash: string | null | undefined;
};

export type ScopeExecutionBindingAccessBindingHashInput = {
  access_decision: "ALLOW" | "ALLOW_MASKED";
  authorization_decision_access_binding_hash: string;
  executable_partition_scope_refs: readonly string[];
  executable_scope: readonly string[];
  executable_scope_family: ScopeExecutionBindingScopeFamily;
  execution_mode_or_null: "ANALYSIS" | "COMPLIANCE" | null;
  masking_rules: readonly string[];
  mutation_atomicity: ScopeMutationAtomicity;
  reason_codes: readonly string[];
  reduction_posture: "REDUCED_BY_AUTHORIZATION" | "UNCHANGED";
  requested_scope: readonly string[];
  requested_scope_family: ScopeExecutionBindingScopeFamily;
  required_approvals: readonly string[];
  required_authn_level: "BASIC" | "MFA" | "STEP_UP" | null | undefined;
};

export function buildPrincipalContextAccessBindingVector(
  input: PrincipalContextAccessBindingHashInput,
) {
  return {
    artifact_type: "PrincipalContext",
    principal_id: requireTrimmedString("principal_id", input.principal_id),
    principal_type: requireTrimmedString("principal_type", input.principal_type),
    effective_role_set: normalizeStringSet(
      "effective_role_set",
      input.effective_role_set,
      { minItems: 1 },
    ),
    tenant_id: requireTrimmedString("tenant_id", input.tenant_id),
    client_scope: normalizeStringSet("client_scope", input.client_scope),
    requested_scope: normalizeScopeSequence(
      "requested_scope",
      input.requested_scope,
    ),
    partition_scope_refs: normalizeStringSet(
      "partition_scope_refs",
      input.partition_scope_refs,
    ),
    authn_level: requireTrimmedString("authn_level", input.authn_level),
    subject_identity_assurance_level: requireTrimmedString(
      "subject_identity_assurance_level",
      input.subject_identity_assurance_level,
    ),
    session_id: requireTrimmedString("session_id", input.session_id),
    service_identity_ref: normalizeCanonicalNullableString(
      "service_identity_ref",
      input.service_identity_ref,
    ),
    delegation_basis: requireTrimmedString(
      "delegation_basis",
      input.delegation_basis,
    ),
    authorization_evaluated_at: normalizeCanonicalInstant(
      "authorization_evaluated_at",
      input.authorization_evaluated_at,
    ),
    policy_snapshot_hash: requireTrimmedString(
      "policy_snapshot_hash",
      input.policy_snapshot_hash,
    ),
    delegation_snapshot_refs: normalizeStringSet(
      "delegation_snapshot_refs",
      input.delegation_snapshot_refs,
    ),
    authority_link_refs: normalizeStringSet(
      "authority_link_refs",
      input.authority_link_refs,
    ),
    authority_link_snapshot_refs: normalizeStringSet(
      "authority_link_snapshot_refs",
      input.authority_link_snapshot_refs,
    ),
    masking_scope: requireTrimmedString("masking_scope", input.masking_scope),
    approval_capabilities: normalizeStringSet(
      "approval_capabilities",
      input.approval_capabilities,
    ),
    client_portal_capabilities: normalizeStringSet(
      "client_portal_capabilities",
      input.client_portal_capabilities,
    ),
    run_kind_capabilities: normalizeStringSet(
      "run_kind_capabilities",
      input.run_kind_capabilities,
    ),
  } satisfies CanonicalJsonValue;
}

export function buildPrincipalContextAccessBindingHash(
  input: PrincipalContextAccessBindingHashInput,
) {
  return canonicalHashDigest(buildPrincipalContextAccessBindingVector(input));
}

export function buildAuthorizationDecisionAccessBindingVector(
  input: AuthorizationDecisionAccessBindingHashInput,
) {
  return {
    artifact_type: "AuthorizationDecision",
    principal_context_access_binding_hash: requireTrimmedString(
      "principal_context_access_binding_hash",
      input.principal_context_access_binding_hash,
    ),
    resource_class: requireTrimmedString("resource_class", input.resource_class),
    action_family: requireTrimmedString("action_family", input.action_family),
    decision: requireTrimmedString("decision", input.decision),
    reason_codes: normalizeStringSet("reason_codes", input.reason_codes, {
      minItems: 1,
    }),
    effective_scope: normalizeScopeSequence(
      "effective_scope",
      input.effective_scope,
      { allowEmpty: input.decision === "DENY" },
    ),
    effective_partition_scope_refs: normalizeStringSet(
      "effective_partition_scope_refs",
      input.effective_partition_scope_refs,
    ),
    masking_rules: normalizeStringSet("masking_rules", input.masking_rules),
    required_approvals: normalizeStringSet(
      "required_approvals",
      input.required_approvals,
    ),
    required_authn_level: normalizeCanonicalNullableString(
      "required_authn_level",
      input.required_authn_level,
    ),
    policy_snapshot_hash: requireTrimmedString(
      "policy_snapshot_hash",
      input.policy_snapshot_hash,
    ),
    delegation_snapshot_refs: normalizeStringSet(
      "delegation_snapshot_refs",
      input.delegation_snapshot_refs,
    ),
    authority_link_snapshot_refs: normalizeStringSet(
      "authority_link_snapshot_refs",
      input.authority_link_snapshot_refs,
    ),
    authority_layer_boundary: normalizeCanonicalHashValue(
      input.authority_layer_boundary,
    ),
    bounded_safe_mutation: input.bounded_safe_mutation ?? null,
    approval_requirement: normalizeCanonicalNullableString(
      "approval_requirement",
      input.approval_requirement,
    ),
    dependency_topology_hash: normalizeCanonicalNullableString(
      "dependency_topology_hash",
      input.dependency_topology_hash,
    ),
    simulation_basis_hash: normalizeCanonicalNullableString(
      "simulation_basis_hash",
      input.simulation_basis_hash,
    ),
  } satisfies CanonicalJsonValue;
}

export function buildAuthorizationDecisionAccessBindingHash(
  input: AuthorizationDecisionAccessBindingHashInput,
) {
  return canonicalHashDigest(buildAuthorizationDecisionAccessBindingVector(input));
}

export function buildScopeExecutionBindingAccessBindingVector(
  input: ScopeExecutionBindingAccessBindingHashInput,
) {
  return {
    artifact_type: "ScopeExecutionBinding",
    authorization_decision_access_binding_hash: requireTrimmedString(
      "authorization_decision_access_binding_hash",
      input.authorization_decision_access_binding_hash,
    ),
    execution_mode_or_null: input.execution_mode_or_null ?? null,
    requested_scope_family: requireTrimmedString(
      "requested_scope_family",
      input.requested_scope_family,
    ),
    executable_scope_family: requireTrimmedString(
      "executable_scope_family",
      input.executable_scope_family,
    ),
    requested_scope: normalizeScopeSequence(
      "requested_scope",
      input.requested_scope,
    ),
    executable_scope: normalizeScopeSequence(
      "executable_scope",
      input.executable_scope,
    ),
    executable_partition_scope_refs: normalizeStringSet(
      "executable_partition_scope_refs",
      input.executable_partition_scope_refs,
    ),
    access_decision: requireTrimmedString("access_decision", input.access_decision),
    reduction_posture: requireTrimmedString(
      "reduction_posture",
      input.reduction_posture,
    ),
    mutation_atomicity: requireTrimmedString(
      "mutation_atomicity",
      input.mutation_atomicity,
    ),
    masking_rules: normalizeStringSet("masking_rules", input.masking_rules),
    required_approvals: normalizeStringSet(
      "required_approvals",
      input.required_approvals,
    ),
    required_authn_level: normalizeCanonicalNullableString(
      "required_authn_level",
      input.required_authn_level,
    ),
    reason_codes: normalizeStringSet("reason_codes", input.reason_codes, {
      minItems: 1,
    }),
  } satisfies CanonicalJsonValue;
}

export function buildScopeExecutionBindingAccessBindingHash(
  input: ScopeExecutionBindingAccessBindingHashInput,
) {
  return canonicalHashDigest(buildScopeExecutionBindingAccessBindingVector(input));
}
