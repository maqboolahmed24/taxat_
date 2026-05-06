import {
  type AuthorityLayerBoundaryContract,
  AuthorityModelError,
  assertEnum,
  buildAuthorityLayerBoundaryContract,
  cloneRecord,
  hashObject,
  normalizeAuthorityLayerBoundaryContract,
  normalizeNullableString,
  normalizeNullableTimestamp,
  normalizeSortedStringSet,
  normalizeTimestamp,
  refFromId,
  requireString,
} from "./authority_common.ts";

export const AUTHORITY_BINDING_HEALTH_STATES = [
  "HEALTHY",
  "LIMITED_SCOPE",
  "EXPIRING_SOON",
  "TOKEN_INVALID",
  "CLIENT_BINDING_MISMATCH",
  "DELEGATION_GAP",
  "ENVIRONMENT_DRIFT",
  "REVOKED",
  "EXPIRED",
  "UNKNOWN",
] as const;

export type AuthorityDelegationState = "NOT_REQUIRED" | "SATISFIED" | "LIMITED" | "MISSING" | "EXPIRED" | "UNKNOWN";
export type AuthorityLinkState =
  | "UNLINKED"
  | "LINK_INITIATED"
  | "AUTHORISED_ACTIVE"
  | "AUTHORISED_LIMITED"
  | "TOKEN_INVALID"
  | "REVOKED"
  | "EXPIRED"
  | "SUPERSEDED";
export type AuthorityBindingHealth = (typeof AUTHORITY_BINDING_HEALTH_STATES)[number];

export type AuthorityBinding = {
  access_binding_hash: string;
  acting_party_ref: string;
  approval_ref: string | null;
  approval_state: "NOT_REQUIRED" | "SATISFIED";
  artifact_type: "AuthorityBinding";
  authority_binding_id: string;
  authority_layer_boundary: AuthorityLayerBoundaryContract;
  authority_link_ref: string;
  authority_link_state: AuthorityLinkState;
  authority_scope: string;
  binding_health: AuthorityBindingHealth;
  binding_lineage_ref: string;
  binding_resolved_at: string;
  blocked_reason_codes: string[];
  client_id: string;
  delegation_grant_ref: string | null;
  delegation_state: AuthorityDelegationState;
  expires_at: string | null;
  last_validated_at: string;
  manifest_id: string;
  partition_scope_refs: string[];
  policy_snapshot_hash: string;
  principal_context_ref: string;
  authorization_decision_ref: string;
  provider_api_version: string;
  provider_environment: string;
  step_up_evidence_ref: string | null;
  step_up_state: "NOT_REQUIRED" | "SATISFIED";
  subject_ref: string;
  tenant_id: string;
  token_binding_ref: string;
  token_client_binding_state: "BOUND" | "MISMATCH" | "UNVERIFIED";
  token_version_ref: string;
};

export type AuthorityBindingBuildInput = Partial<
  Omit<
    AuthorityBinding,
    | "artifact_type"
    | "authority_layer_boundary"
    | "blocked_reason_codes"
    | "partition_scope_refs"
  >
> & {
  authority_binding_id: string;
  authority_layer_boundary?: AuthorityLayerBoundaryContract;
  client_id: string;
  partition_scope_refs?: readonly string[];
  tenant_id: string;
  blocked_reason_codes?: readonly string[];
};

function expectedHumanGate(input: Pick<AuthorityBinding, "approval_state" | "step_up_state">) {
  if (input.step_up_state === "SATISFIED" && input.approval_state === "SATISFIED") {
    return {
      human_gate_requirement: "REQUIRE_STEP_UP_AND_APPROVAL",
      human_gate_resolution_state: "EVIDENCE_FROZEN",
    } as const;
  }
  if (input.approval_state === "SATISFIED") {
    return {
      human_gate_requirement: "REQUIRE_APPROVAL",
      human_gate_resolution_state: "EVIDENCE_FROZEN",
    } as const;
  }
  if (input.step_up_state === "SATISFIED") {
    return {
      human_gate_requirement: "REQUIRE_STEP_UP",
      human_gate_resolution_state: "EVIDENCE_FROZEN",
    } as const;
  }
  return {
    human_gate_requirement: "NOT_REQUIRED",
    human_gate_resolution_state: "NOT_REQUIRED",
  } as const;
}

function parseMillis(value: string | null) {
  return value === null ? null : Date.parse(value);
}

function validateBindingHealth(binding: AuthorityBinding) {
  if (binding.authority_layer_boundary.client_delegation_state !== binding.delegation_state) {
    throw new AuthorityModelError(
      "AUTHORITY_CONTRACT_INVALID",
      "authority_layer_boundary.client_delegation_state must mirror delegation_state",
    );
  }
  if (binding.authority_layer_boundary.authority_link_state !== binding.authority_link_state) {
    throw new AuthorityModelError(
      "AUTHORITY_CONTRACT_INVALID",
      "authority_layer_boundary.authority_link_state must mirror authority_link_state",
    );
  }
  if (["HEALTHY", "EXPIRING_SOON"].includes(binding.binding_health)) {
    if (binding.token_client_binding_state !== "BOUND") {
      throw new AuthorityModelError(
        "AUTHORITY_CONTRACT_INVALID",
        "token_client_binding_state must be BOUND for healthy or expiring authority bindings",
      );
    }
    if (!["NOT_REQUIRED", "SATISFIED"].includes(binding.delegation_state)) {
      throw new AuthorityModelError(
        "AUTHORITY_CONTRACT_INVALID",
        "healthy or expiring authority bindings require live delegation posture",
      );
    }
    if (binding.authority_link_state !== "AUTHORISED_ACTIVE") {
      throw new AuthorityModelError(
        "AUTHORITY_CONTRACT_INVALID",
        "healthy or expiring authority bindings require AUTHORISED_ACTIVE authority link",
      );
    }
    if (binding.blocked_reason_codes.length > 0) {
      throw new AuthorityModelError(
        "AUTHORITY_CONTRACT_INVALID",
        "healthy or expiring authority bindings must not retain blocked_reason_codes",
      );
    }
  } else if (binding.blocked_reason_codes.length === 0) {
    throw new AuthorityModelError(
      "AUTHORITY_CONTRACT_INVALID",
      "non-healthy authority bindings must retain typed blocked_reason_codes",
    );
  }
  if (binding.token_client_binding_state === "MISMATCH" && binding.binding_health !== "CLIENT_BINDING_MISMATCH") {
    throw new AuthorityModelError(
      "AUTHORITY_CONTRACT_INVALID",
      "token_client_binding_state MISMATCH must serialize as CLIENT_BINDING_MISMATCH",
    );
  }
  if (binding.binding_health === "CLIENT_BINDING_MISMATCH" && binding.token_client_binding_state !== "MISMATCH") {
    throw new AuthorityModelError(
      "AUTHORITY_CONTRACT_INVALID",
      "CLIENT_BINDING_MISMATCH requires token_client_binding_state MISMATCH",
    );
  }
  if (["EXPIRING_SOON", "EXPIRED"].includes(binding.binding_health) && binding.expires_at === null) {
    throw new AuthorityModelError(
      "AUTHORITY_CONTRACT_INVALID",
      "expiring or expired authority bindings require expires_at",
    );
  }
  if (
    binding.binding_health === "LIMITED_SCOPE" &&
    binding.delegation_state !== "LIMITED" &&
    binding.authority_link_state !== "AUTHORISED_LIMITED"
  ) {
    throw new AuthorityModelError(
      "AUTHORITY_CONTRACT_INVALID",
      "LIMITED_SCOPE must be explained by limited delegation or an authorised-limited link",
    );
  }
  if (binding.delegation_state === "LIMITED" && binding.binding_health !== "LIMITED_SCOPE") {
    throw new AuthorityModelError(
      "AUTHORITY_CONTRACT_INVALID",
      "delegation_state LIMITED requires binding_health LIMITED_SCOPE",
    );
  }
  if (binding.authority_link_state === "AUTHORISED_LIMITED" && binding.binding_health !== "LIMITED_SCOPE") {
    throw new AuthorityModelError(
      "AUTHORITY_CONTRACT_INVALID",
      "authority_link_state AUTHORISED_LIMITED requires binding_health LIMITED_SCOPE",
    );
  }
  const linkHealth: Partial<Record<AuthorityLinkState, AuthorityBindingHealth>> = {
    EXPIRED: "EXPIRED",
    REVOKED: "REVOKED",
    TOKEN_INVALID: "TOKEN_INVALID",
  };
  const expectedHealth = linkHealth[binding.authority_link_state];
  if (expectedHealth !== undefined && binding.binding_health !== expectedHealth) {
    throw new AuthorityModelError(
      "AUTHORITY_CONTRACT_INVALID",
      `authority_link_state ${binding.authority_link_state} requires binding_health ${expectedHealth}`,
    );
  }
  if (
    ["UNLINKED", "LINK_INITIATED", "SUPERSEDED"].includes(binding.authority_link_state) &&
    ["HEALTHY", "EXPIRING_SOON"].includes(binding.binding_health)
  ) {
    throw new AuthorityModelError(
      "AUTHORITY_CONTRACT_INVALID",
      "unlinked or superseded authority links must not serialize as executable healthy bindings",
    );
  }
}

function validateBindingChronology(binding: AuthorityBinding) {
  const lastValidatedAt = Date.parse(binding.last_validated_at);
  const bindingResolvedAt = Date.parse(binding.binding_resolved_at);
  if (bindingResolvedAt < lastValidatedAt) {
    throw new AuthorityModelError(
      "AUTHORITY_CONTRACT_INVALID",
      "binding_resolved_at must not be earlier than last_validated_at",
    );
  }
  const expiresAt = parseMillis(binding.expires_at);
  if (binding.binding_health === "EXPIRED" && expiresAt !== null && expiresAt > bindingResolvedAt) {
    throw new AuthorityModelError(
      "AUTHORITY_CONTRACT_INVALID",
      "expires_at must not be later than binding_resolved_at for expired authority bindings",
    );
  }
}

function validateBindingDelegation(binding: AuthorityBinding) {
  if (binding.subject_ref !== binding.acting_party_ref && binding.delegation_grant_ref === null) {
    throw new AuthorityModelError(
      "AUTHORITY_CONTRACT_INVALID",
      "delegation_grant_ref must be populated when acting_party_ref differs from subject_ref",
    );
  }
  if (binding.subject_ref === binding.acting_party_ref) {
    if (binding.delegation_grant_ref !== null) {
      throw new AuthorityModelError(
        "AUTHORITY_CONTRACT_INVALID",
        "self-acting authority bindings must not retain delegation_grant_ref",
      );
    }
    if (binding.delegation_state !== "NOT_REQUIRED") {
      throw new AuthorityModelError(
        "AUTHORITY_CONTRACT_INVALID",
        "self-acting authority bindings require delegation_state NOT_REQUIRED",
      );
    }
  }
  if (binding.delegation_state === "NOT_REQUIRED" && binding.delegation_grant_ref !== null) {
    throw new AuthorityModelError(
      "AUTHORITY_CONTRACT_INVALID",
      "delegation_state NOT_REQUIRED must clear delegation_grant_ref",
    );
  }
  if (
    ["SATISFIED", "LIMITED", "EXPIRED"].includes(binding.delegation_state) &&
    binding.delegation_grant_ref === null
  ) {
    throw new AuthorityModelError(
      "AUTHORITY_CONTRACT_INVALID",
      `delegation_state ${binding.delegation_state} requires delegation_grant_ref`,
    );
  }
}

function validateHumanGate(binding: AuthorityBinding) {
  const expected = expectedHumanGate(binding);
  if (binding.authority_layer_boundary.human_gate_requirement !== expected.human_gate_requirement) {
    throw new AuthorityModelError(
      "AUTHORITY_CONTRACT_INVALID",
      "authority_layer_boundary.human_gate_requirement must mirror binding step-up and approval posture",
    );
  }
  if (binding.authority_layer_boundary.human_gate_resolution_state !== expected.human_gate_resolution_state) {
    throw new AuthorityModelError(
      "AUTHORITY_CONTRACT_INVALID",
      "authority_layer_boundary.human_gate_resolution_state must mirror frozen human-gate evidence",
    );
  }
  if (binding.step_up_state === "SATISFIED" && binding.step_up_evidence_ref === null) {
    throw new AuthorityModelError(
      "AUTHORITY_CONTRACT_INVALID",
      "step_up_state SATISFIED requires step_up_evidence_ref",
    );
  }
  if (binding.step_up_state === "NOT_REQUIRED" && binding.step_up_evidence_ref !== null) {
    throw new AuthorityModelError(
      "AUTHORITY_CONTRACT_INVALID",
      "step_up_state NOT_REQUIRED must clear step_up_evidence_ref",
    );
  }
  if (binding.approval_state === "SATISFIED" && binding.approval_ref === null) {
    throw new AuthorityModelError("AUTHORITY_CONTRACT_INVALID", "approval_state SATISFIED requires approval_ref");
  }
  if (binding.approval_state === "NOT_REQUIRED" && binding.approval_ref !== null) {
    throw new AuthorityModelError("AUTHORITY_CONTRACT_INVALID", "approval_state NOT_REQUIRED must clear approval_ref");
  }
  if (
    binding.authority_layer_boundary.active_principal_class === "SERVICE" &&
    (binding.step_up_state === "SATISFIED" || binding.approval_state === "SATISFIED")
  ) {
    throw new AuthorityModelError(
      "AUTHORITY_CONTRACT_INVALID",
      "service principals must not satisfy step-up or approval on authority bindings",
    );
  }
}

export function normalizeAuthorityBinding(input: AuthorityBinding): AuthorityBinding {
  const binding: AuthorityBinding = {
    access_binding_hash: requireString("access_binding_hash", input.access_binding_hash),
    acting_party_ref: requireString("acting_party_ref", input.acting_party_ref),
    approval_ref: normalizeNullableString("approval_ref", input.approval_ref),
    approval_state: assertEnum("approval_state", input.approval_state, ["NOT_REQUIRED", "SATISFIED"] as const),
    artifact_type: "AuthorityBinding",
    authority_binding_id: requireString("authority_binding_id", input.authority_binding_id),
    authority_layer_boundary: normalizeAuthorityLayerBoundaryContract(input.authority_layer_boundary, {
      expected_binding_scope_class: "AUTHORITY_BINDING",
      expected_integration_capability: "AUTHORITY_INTEGRATED",
    }),
    authority_link_ref: requireString("authority_link_ref", input.authority_link_ref),
    authority_link_state: assertEnum("authority_link_state", input.authority_link_state, [
      "UNLINKED",
      "LINK_INITIATED",
      "AUTHORISED_ACTIVE",
      "AUTHORISED_LIMITED",
      "TOKEN_INVALID",
      "REVOKED",
      "EXPIRED",
      "SUPERSEDED",
    ] as const),
    authority_scope: requireString("authority_scope", input.authority_scope),
    binding_health: assertEnum("binding_health", input.binding_health, AUTHORITY_BINDING_HEALTH_STATES),
    binding_lineage_ref: requireString("binding_lineage_ref", input.binding_lineage_ref),
    binding_resolved_at: normalizeTimestamp("binding_resolved_at", input.binding_resolved_at),
    blocked_reason_codes: normalizeSortedStringSet("blocked_reason_codes", input.blocked_reason_codes),
    client_id: requireString("client_id", input.client_id),
    delegation_grant_ref: normalizeNullableString("delegation_grant_ref", input.delegation_grant_ref),
    delegation_state: assertEnum("delegation_state", input.delegation_state, [
      "NOT_REQUIRED",
      "SATISFIED",
      "LIMITED",
      "MISSING",
      "EXPIRED",
      "UNKNOWN",
    ] as const),
    expires_at: normalizeNullableTimestamp("expires_at", input.expires_at),
    last_validated_at: normalizeTimestamp("last_validated_at", input.last_validated_at),
    manifest_id: requireString("manifest_id", input.manifest_id),
    partition_scope_refs: normalizeSortedStringSet("partition_scope_refs", input.partition_scope_refs),
    policy_snapshot_hash: requireString("policy_snapshot_hash", input.policy_snapshot_hash),
    principal_context_ref: requireString("principal_context_ref", input.principal_context_ref),
    authorization_decision_ref: requireString("authorization_decision_ref", input.authorization_decision_ref),
    provider_api_version: requireString("provider_api_version", input.provider_api_version),
    provider_environment: requireString("provider_environment", input.provider_environment),
    step_up_evidence_ref: normalizeNullableString("step_up_evidence_ref", input.step_up_evidence_ref),
    step_up_state: assertEnum("step_up_state", input.step_up_state, ["NOT_REQUIRED", "SATISFIED"] as const),
    subject_ref: requireString("subject_ref", input.subject_ref),
    tenant_id: requireString("tenant_id", input.tenant_id),
    token_binding_ref: requireString("token_binding_ref", input.token_binding_ref),
    token_client_binding_state: assertEnum(
      "token_client_binding_state",
      input.token_client_binding_state,
      ["BOUND", "MISMATCH", "UNVERIFIED"] as const,
    ),
    token_version_ref: requireString("token_version_ref", input.token_version_ref),
  };
  validateBindingHealth(binding);
  validateBindingChronology(binding);
  validateBindingDelegation(binding);
  validateHumanGate(binding);
  return binding;
}

export function buildAuthorityBinding(input: AuthorityBindingBuildInput): AuthorityBinding {
  const resolvedAt = normalizeTimestamp("binding_resolved_at", input.binding_resolved_at ?? new Date(0).toISOString());
  const subjectRef = input.subject_ref ?? `client://${input.client_id}`;
  const actingPartyRef = input.acting_party_ref ?? subjectRef;
  const delegated = actingPartyRef !== subjectRef;
  const delegationState = input.delegation_state ?? (delegated ? "SATISFIED" : "NOT_REQUIRED");
  const stepUpState = input.step_up_state ?? "NOT_REQUIRED";
  const approvalState = input.approval_state ?? "NOT_REQUIRED";
  const authorityLinkState = input.authority_link_state ?? "AUTHORISED_ACTIVE";
  const tokenClientBindingState = input.token_client_binding_state ?? "BOUND";
  const bindingHealth =
    input.binding_health ??
    (tokenClientBindingState === "MISMATCH"
      ? "CLIENT_BINDING_MISMATCH"
      : authorityLinkState === "TOKEN_INVALID"
        ? "TOKEN_INVALID"
        : authorityLinkState === "REVOKED"
          ? "REVOKED"
          : authorityLinkState === "EXPIRED"
            ? "EXPIRED"
            : authorityLinkState === "AUTHORISED_LIMITED" || delegationState === "LIMITED"
              ? "LIMITED_SCOPE"
              : ["MISSING", "EXPIRED"].includes(delegationState)
                ? "DELEGATION_GAP"
                : "HEALTHY");
  const blockedReasonCodes =
    input.blocked_reason_codes ??
    (["HEALTHY", "EXPIRING_SOON"].includes(bindingHealth) ? [] : [`AUTHORITY_BINDING_${bindingHealth}`]);
  const expiresAt =
    input.expires_at ??
    (bindingHealth === "EXPIRED"
      ? resolvedAt
      : bindingHealth === "EXPIRING_SOON"
        ? new Date(Date.parse(resolvedAt) + 24 * 60 * 60 * 1000).toISOString()
        : null);
  const humanGate = expectedHumanGate({ approval_state: approvalState, step_up_state: stepUpState });
  return normalizeAuthorityBinding({
    access_binding_hash: input.access_binding_hash ?? "hash.access-binding.authority-binding",
    acting_party_ref: actingPartyRef,
    approval_ref: input.approval_ref ?? null,
    approval_state: approvalState,
    artifact_type: "AuthorityBinding",
    authority_binding_id: input.authority_binding_id,
    authority_layer_boundary:
      input.authority_layer_boundary ??
      buildAuthorityLayerBoundaryContract({
        authority_link_state: authorityLinkState,
        binding_scope_class: "AUTHORITY_BINDING",
        client_delegation_state: delegationState === "UNKNOWN" ? "MISSING" : delegationState,
        ...humanGate,
      }),
    authority_link_ref: input.authority_link_ref ?? `authority-link://${input.client_id}`,
    authority_link_state: authorityLinkState,
    authority_scope: input.authority_scope ?? "HMRC_ITSA",
    authorization_decision_ref: input.authorization_decision_ref ?? `authorization-decision://${input.authority_binding_id}`,
    binding_health: bindingHealth,
    binding_lineage_ref: input.binding_lineage_ref ?? `authority-binding-lineage://${input.client_id}`,
    binding_resolved_at: resolvedAt,
    blocked_reason_codes: [...blockedReasonCodes],
    client_id: input.client_id,
    delegation_grant_ref: input.delegation_grant_ref ?? (delegated ? `delegation-grant://${input.authority_binding_id}` : null),
    delegation_state: delegationState,
    expires_at: expiresAt,
    last_validated_at: input.last_validated_at ?? resolvedAt,
    manifest_id: input.manifest_id ?? "manifest://authority-binding",
    partition_scope_refs: [...(input.partition_scope_refs ?? [])],
    policy_snapshot_hash: input.policy_snapshot_hash ?? "hash.policy-snapshot.authority-binding",
    principal_context_ref: input.principal_context_ref ?? `principal-context://${input.tenant_id}/${input.client_id}`,
    provider_api_version: input.provider_api_version ?? "v1",
    provider_environment: input.provider_environment ?? "SANDBOX",
    step_up_evidence_ref: input.step_up_evidence_ref ?? null,
    step_up_state: stepUpState,
    subject_ref: subjectRef,
    tenant_id: input.tenant_id,
    token_binding_ref: input.token_binding_ref ?? `authority-token-binding://${input.client_id}`,
    token_client_binding_state: tokenClientBindingState,
    token_version_ref: input.token_version_ref ?? `authority-token-version://${input.authority_binding_id}`,
  });
}

export function authorityBindingRef(binding: Pick<AuthorityBinding, "authority_binding_id"> | string) {
  return refFromId(
    "authority-binding",
    typeof binding === "string" ? binding : binding.authority_binding_id,
  );
}

export function cloneAuthorityBinding(binding: AuthorityBinding) {
  return cloneRecord(binding);
}

export function authorityBindingContentFingerprint(binding: AuthorityBinding) {
  return hashObject("AUTHORITY_BINDING_MODEL_V1", normalizeAuthorityBinding(binding));
}
