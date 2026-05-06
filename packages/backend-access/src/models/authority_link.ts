import {
  asTaxatId,
  asTaxatRef,
  unwrapIdentifier,
} from "../../../domain-kernel/src/primitives/identifier.ts";
import {
  normalizeUtcInstantString,
  type ISO8601DateTimeString,
} from "../../../domain-kernel/src/primitives/time.ts";

import {
  normalizeStringSet,
  requireTrimmedString,
} from "../services/principal_context_normalizer.ts";

export type AuthorityLinkLifecycleState =
  | "UNLINKED"
  | "LINK_INITIATED"
  | "AUTHORISED_ACTIVE"
  | "AUTHORISED_LIMITED"
  | "TOKEN_INVALID"
  | "REVOKED"
  | "EXPIRED"
  | "SUPERSEDED";

export type AuthorityLinkBindingHealth =
  | "HEALTHY"
  | "LIMITED_SCOPE"
  | "EXPIRING_SOON"
  | "TOKEN_INVALID"
  | "CLIENT_BINDING_MISMATCH"
  | "DELEGATION_GAP"
  | "ENVIRONMENT_DRIFT"
  | "REVOKED"
  | "EXPIRED"
  | "UNLINKED"
  | "UNKNOWN";

export type AuthorityLinkDelegationState =
  | "NOT_REQUIRED"
  | "SATISFIED"
  | "LIMITED"
  | "MISSING"
  | "EXPIRED"
  | "UNKNOWN";

export type AuthorityLinkTokenClientBindingState =
  | "BOUND"
  | "MISMATCH"
  | "UNVERIFIED";

export type AuthorityLinkRecord = {
  artifact_type: "AuthorityLink";
  authority_link_id: string;
  tenant_id: string;
  client_id: string;
  reporting_subject_ref: string;
  authority_name: string;
  authority_scope: string;
  provider_environment: string;
  provider_api_version: string;
  authorised_party_ref: string;
  delegation_grant_ref: string | null;
  partition_scope_refs: string[];
  token_binding_profile_ref: string | null;
  validated_at: ISO8601DateTimeString | null;
  expires_at: ISO8601DateTimeString | null;
  revoked_at: ISO8601DateTimeString | null;
  superseded_by_link_id: string | null;
  lifecycle_state: AuthorityLinkLifecycleState;
  binding_health: AuthorityLinkBindingHealth;
  delegation_state: AuthorityLinkDelegationState;
  token_client_binding_state: AuthorityLinkTokenClientBindingState;
  source_evidence_refs: string[];
  blocked_reason_codes: string[];
  last_binding_check_at: ISO8601DateTimeString | null;
};

export type CreateAuthorityLinkInput = Omit<AuthorityLinkRecord, "artifact_type"> & {
  artifact_type?: "AuthorityLink";
};

type AuthorityLinkModelErrorCode =
  | "AUTHORITY_LINK_FIELD_REQUIRED"
  | "AUTHORITY_LINK_INVALID_CHRONOLOGY"
  | "AUTHORITY_LINK_INVALID_LIFECYCLE"
  | "AUTHORITY_LINK_INVALID_POSTURE"
  | "AUTHORITY_LINK_SILENT_REBIND";

export class AuthorityLinkModelError extends Error {
  readonly code: AuthorityLinkModelErrorCode;

  constructor(code: AuthorityLinkModelErrorCode, detail: string) {
    super(`${code}: ${detail}`);
    this.name = "AuthorityLinkModelError";
    this.code = code;
  }
}

function assertCondition(
  condition: unknown,
  code: AuthorityLinkModelErrorCode,
  detail: string,
): asserts condition {
  if (!condition) {
    throw new AuthorityLinkModelError(code, detail);
  }
}

function normalizeId(label: string, value: unknown, family: string) {
  return unwrapIdentifier(asTaxatId(requireTrimmedString(label, value), family));
}

function normalizeRef(label: string, value: unknown, family: string) {
  return unwrapIdentifier(asTaxatRef(requireTrimmedString(label, value), family));
}

function normalizeOptionalRef(label: string, value: string | null, family: string) {
  return value === null ? null : normalizeRef(label, value, family);
}

function normalizeOptionalInstant(value: string | null) {
  return value === null ? null : normalizeUtcInstantString(value);
}

export function normalizeAuthorityLinkRecord(
  input: CreateAuthorityLinkInput,
): AuthorityLinkRecord {
  try {
    const authority_link_id = normalizeId(
      "authority_link_id",
      input.authority_link_id,
      "authority_link",
    );
    const tenant_id = normalizeId("tenant_id", input.tenant_id, "tenant");
    const client_id = normalizeId("client_id", input.client_id, "client");
    const reporting_subject_ref = normalizeRef(
      "reporting_subject_ref",
      input.reporting_subject_ref,
      "reporting_subject",
    );
    const authority_name = requireTrimmedString("authority_name", input.authority_name);
    const authority_scope = requireTrimmedString("authority_scope", input.authority_scope);
    const provider_environment = requireTrimmedString(
      "provider_environment",
      input.provider_environment,
    );
    const provider_api_version = requireTrimmedString(
      "provider_api_version",
      input.provider_api_version,
    );
    const authorised_party_ref = normalizeRef(
      "authorised_party_ref",
      input.authorised_party_ref,
      "authorised_party",
    );
    const delegation_grant_ref = normalizeOptionalRef(
      "delegation_grant_ref",
      input.delegation_grant_ref,
      "delegation_grant",
    );
    const partition_scope_refs = normalizeStringSet(
      "partition_scope_refs",
      input.partition_scope_refs ?? [],
    );
    const token_binding_profile_ref = normalizeOptionalRef(
      "token_binding_profile_ref",
      input.token_binding_profile_ref,
      "token_binding_profile",
    );
    const validated_at = normalizeOptionalInstant(input.validated_at);
    const expires_at = normalizeOptionalInstant(input.expires_at);
    const revoked_at = normalizeOptionalInstant(input.revoked_at);
    const superseded_by_link_id =
      input.superseded_by_link_id === null
        ? null
        : normalizeId("superseded_by_link_id", input.superseded_by_link_id, "authority_link");
    const lifecycle_state = requireTrimmedString(
      "lifecycle_state",
      input.lifecycle_state,
    ) as AuthorityLinkLifecycleState;
    const binding_health = requireTrimmedString(
      "binding_health",
      input.binding_health,
    ) as AuthorityLinkBindingHealth;
    const delegation_state = requireTrimmedString(
      "delegation_state",
      input.delegation_state,
    ) as AuthorityLinkDelegationState;
    const token_client_binding_state = requireTrimmedString(
      "token_client_binding_state",
      input.token_client_binding_state,
    ) as AuthorityLinkTokenClientBindingState;
    const source_evidence_refs = normalizeStringSet(
      "source_evidence_refs",
      input.source_evidence_refs,
      {
        minItems: 1,
      },
    );
    const blocked_reason_codes = normalizeStringSet(
      "blocked_reason_codes",
      input.blocked_reason_codes ?? [],
    );
    const last_binding_check_at = normalizeOptionalInstant(input.last_binding_check_at);

    assertCondition(
      [
        "UNLINKED",
        "LINK_INITIATED",
        "AUTHORISED_ACTIVE",
        "AUTHORISED_LIMITED",
        "TOKEN_INVALID",
        "REVOKED",
        "EXPIRED",
        "SUPERSEDED",
      ].includes(lifecycle_state),
      "AUTHORITY_LINK_FIELD_REQUIRED",
      "lifecycle_state must remain a supported authority-link lifecycle",
    );
    assertCondition(
      [
        "HEALTHY",
        "LIMITED_SCOPE",
        "EXPIRING_SOON",
        "TOKEN_INVALID",
        "CLIENT_BINDING_MISMATCH",
        "DELEGATION_GAP",
        "ENVIRONMENT_DRIFT",
        "REVOKED",
        "EXPIRED",
        "UNLINKED",
        "UNKNOWN",
      ].includes(binding_health),
      "AUTHORITY_LINK_FIELD_REQUIRED",
      "binding_health must remain a supported authority-link health state",
    );
    assertCondition(
      ["NOT_REQUIRED", "SATISFIED", "LIMITED", "MISSING", "EXPIRED", "UNKNOWN"].includes(
        delegation_state,
      ),
      "AUTHORITY_LINK_FIELD_REQUIRED",
      "delegation_state must remain a supported authority-link delegation state",
    );
    assertCondition(
      ["BOUND", "MISMATCH", "UNVERIFIED"].includes(token_client_binding_state),
      "AUTHORITY_LINK_FIELD_REQUIRED",
      "token_client_binding_state must remain supported",
    );
    assertCondition(
      superseded_by_link_id === null || superseded_by_link_id !== authority_link_id,
      "AUTHORITY_LINK_INVALID_POSTURE",
      "superseded_by_link_id must not point back to authority_link_id",
    );
    if (validated_at !== null && last_binding_check_at !== null) {
      assertCondition(
        last_binding_check_at >= validated_at,
        "AUTHORITY_LINK_INVALID_CHRONOLOGY",
        "last_binding_check_at must not predate validated_at",
      );
    }
    if (expires_at !== null && last_binding_check_at !== null && binding_health === "EXPIRING_SOON") {
      assertCondition(
        expires_at > last_binding_check_at,
        "AUTHORITY_LINK_INVALID_CHRONOLOGY",
        "expires_at must remain later than last_binding_check_at while expiring soon",
      );
    }
    if (expires_at !== null && last_binding_check_at !== null && binding_health === "EXPIRED") {
      assertCondition(
        expires_at <= last_binding_check_at,
        "AUTHORITY_LINK_INVALID_CHRONOLOGY",
        "expires_at must not be later than last_binding_check_at when binding_health = EXPIRED",
      );
    }

    if (binding_health === "CLIENT_BINDING_MISMATCH") {
      assertCondition(
        token_client_binding_state === "MISMATCH",
        "AUTHORITY_LINK_INVALID_POSTURE",
        "CLIENT_BINDING_MISMATCH health must retain token_client_binding_state = MISMATCH",
      );
    }
    if (token_client_binding_state === "MISMATCH") {
      assertCondition(
        binding_health === "CLIENT_BINDING_MISMATCH",
        "AUTHORITY_LINK_INVALID_POSTURE",
        "token_client_binding_state = MISMATCH must retain CLIENT_BINDING_MISMATCH health",
      );
    }
    if (binding_health === "DELEGATION_GAP") {
      assertCondition(
        delegation_state === "MISSING" || delegation_state === "EXPIRED",
        "AUTHORITY_LINK_INVALID_POSTURE",
        "DELEGATION_GAP health must retain MISSING or EXPIRED delegation state",
      );
    }
    if (delegation_state === "LIMITED") {
      assertCondition(
        binding_health === "LIMITED_SCOPE",
        "AUTHORITY_LINK_INVALID_POSTURE",
        "LIMITED delegation state must retain LIMITED_SCOPE binding health",
      );
      assertCondition(
        lifecycle_state === "AUTHORISED_LIMITED",
        "AUTHORITY_LINK_INVALID_LIFECYCLE",
        "LIMITED delegation state must retain AUTHORISED_LIMITED lifecycle",
      );
    }
    if (delegation_state === "NOT_REQUIRED") {
      assertCondition(
        delegation_grant_ref === null,
        "AUTHORITY_LINK_INVALID_POSTURE",
        "NOT_REQUIRED delegation state must clear delegation_grant_ref",
      );
    } else {
      assertCondition(
        delegation_grant_ref !== null,
        "AUTHORITY_LINK_INVALID_POSTURE",
        "delegated authority-link posture must retain delegation_grant_ref",
      );
    }

    if (authorised_party_ref !== reporting_subject_ref) {
      assertCondition(
        delegation_grant_ref !== null,
        "AUTHORITY_LINK_INVALID_POSTURE",
        "delegated authorised-party authority links must retain delegation_grant_ref",
      );
      assertCondition(
        delegation_state !== "NOT_REQUIRED",
        "AUTHORITY_LINK_INVALID_POSTURE",
        "non-delegated authority links must keep authorised_party_ref equal to reporting_subject_ref",
      );
    } else if (delegation_state !== "NOT_REQUIRED") {
      assertCondition(
        false,
        "AUTHORITY_LINK_INVALID_POSTURE",
        "delegated authority links must not silently collapse authorised_party_ref back to reporting_subject_ref",
      );
    }

    if (binding_health === "HEALTHY" || binding_health === "EXPIRING_SOON") {
      assertCondition(
        lifecycle_state === "AUTHORISED_ACTIVE",
        "AUTHORITY_LINK_INVALID_LIFECYCLE",
        "healthy or expiring authority links must stay AUTHORISED_ACTIVE",
      );
      assertCondition(
        token_client_binding_state === "BOUND",
        "AUTHORITY_LINK_INVALID_POSTURE",
        "healthy or expiring authority links must retain token_client_binding_state = BOUND",
      );
      assertCondition(
        delegation_state === "NOT_REQUIRED" || delegation_state === "SATISFIED",
        "AUTHORITY_LINK_INVALID_POSTURE",
        "healthy or expiring authority links must retain NOT_REQUIRED or SATISFIED delegation state",
      );
      assertCondition(
        token_binding_profile_ref !== null &&
          validated_at !== null &&
          last_binding_check_at !== null,
        "AUTHORITY_LINK_INVALID_LIFECYCLE",
        "healthy or expiring authority links must retain token binding and validation timestamps",
      );
      assertCondition(
        blocked_reason_codes.length === 0,
        "AUTHORITY_LINK_INVALID_LIFECYCLE",
        "healthy or expiring authority links must clear blocked_reason_codes",
      );
    }

    if (lifecycle_state === "UNLINKED") {
      assertCondition(
        binding_health === "UNLINKED",
        "AUTHORITY_LINK_INVALID_LIFECYCLE",
        "UNLINKED authority links must retain UNLINKED binding_health",
      );
      assertCondition(
        token_binding_profile_ref === null &&
          validated_at === null &&
          last_binding_check_at === null,
        "AUTHORITY_LINK_INVALID_LIFECYCLE",
        "UNLINKED authority links must clear binding and validation references",
      );
    }
    if (lifecycle_state === "LINK_INITIATED") {
      assertCondition(
        validated_at === null && last_binding_check_at === null,
        "AUTHORITY_LINK_INVALID_LIFECYCLE",
        "LINK_INITIATED authority links must clear validated_at and last_binding_check_at",
      );
    }
    if (lifecycle_state === "AUTHORISED_LIMITED") {
      assertCondition(
        token_binding_profile_ref !== null &&
          validated_at !== null &&
          last_binding_check_at !== null,
        "AUTHORITY_LINK_INVALID_LIFECYCLE",
        "AUTHORISED_LIMITED authority links must retain token binding and validation timestamps",
      );
      assertCondition(
        blocked_reason_codes.length > 0,
        "AUTHORITY_LINK_INVALID_LIFECYCLE",
        "AUTHORISED_LIMITED authority links must retain blocked_reason_codes",
      );
    }
    if (lifecycle_state === "TOKEN_INVALID") {
      assertCondition(
        binding_health === "TOKEN_INVALID",
        "AUTHORITY_LINK_INVALID_LIFECYCLE",
        "TOKEN_INVALID authority links must retain TOKEN_INVALID binding_health",
      );
      assertCondition(
        token_binding_profile_ref !== null,
        "AUTHORITY_LINK_INVALID_LIFECYCLE",
        "TOKEN_INVALID authority links must retain token_binding_profile_ref",
      );
    }
    if (lifecycle_state === "REVOKED") {
      assertCondition(
        binding_health === "REVOKED" && revoked_at !== null,
        "AUTHORITY_LINK_INVALID_LIFECYCLE",
        "REVOKED authority links must retain REVOKED binding_health and revoked_at",
      );
    }
    if (lifecycle_state === "EXPIRED") {
      assertCondition(
        binding_health === "EXPIRED" && expires_at !== null,
        "AUTHORITY_LINK_INVALID_LIFECYCLE",
        "EXPIRED authority links must retain EXPIRED binding_health and expires_at",
      );
    }
    if (lifecycle_state === "SUPERSEDED") {
      assertCondition(
        superseded_by_link_id !== null,
        "AUTHORITY_LINK_INVALID_LIFECYCLE",
        "SUPERSEDED authority links must retain superseded_by_link_id",
      );
    }
    if (binding_health !== "HEALTHY" && binding_health !== "EXPIRING_SOON") {
      assertCondition(
        blocked_reason_codes.length > 0,
        "AUTHORITY_LINK_INVALID_LIFECYCLE",
        "non-healthy authority links must retain blocked_reason_codes",
      );
    }

    return {
      artifact_type: input.artifact_type ?? "AuthorityLink",
      authority_link_id,
      tenant_id,
      client_id,
      reporting_subject_ref,
      authority_name,
      authority_scope,
      provider_environment,
      provider_api_version,
      authorised_party_ref,
      delegation_grant_ref,
      partition_scope_refs,
      token_binding_profile_ref,
      validated_at,
      expires_at,
      revoked_at,
      superseded_by_link_id,
      lifecycle_state,
      binding_health,
      delegation_state,
      token_client_binding_state,
      source_evidence_refs,
      blocked_reason_codes,
      last_binding_check_at,
    };
  } catch (error) {
    if (error instanceof AuthorityLinkModelError) {
      throw error;
    }
    throw new AuthorityLinkModelError(
      "AUTHORITY_LINK_FIELD_REQUIRED",
      error instanceof Error ? error.message : "authority link normalization failed",
    );
  }
}

export function assertAuthorityLinkIdentityStable(
  previous: AuthorityLinkRecord,
  next: AuthorityLinkRecord,
) {
  const previousIdentity = JSON.stringify({
    authority_link_id: previous.authority_link_id,
    tenant_id: previous.tenant_id,
    client_id: previous.client_id,
    reporting_subject_ref: previous.reporting_subject_ref,
    authority_name: previous.authority_name,
    authority_scope: previous.authority_scope,
    provider_environment: previous.provider_environment,
    provider_api_version: previous.provider_api_version,
    authorised_party_ref: previous.authorised_party_ref,
    delegation_grant_ref: previous.delegation_grant_ref,
    partition_scope_refs: previous.partition_scope_refs,
  });
  const nextIdentity = JSON.stringify({
    authority_link_id: next.authority_link_id,
    tenant_id: next.tenant_id,
    client_id: next.client_id,
    reporting_subject_ref: next.reporting_subject_ref,
    authority_name: next.authority_name,
    authority_scope: next.authority_scope,
    provider_environment: next.provider_environment,
    provider_api_version: next.provider_api_version,
    authorised_party_ref: next.authorised_party_ref,
    delegation_grant_ref: next.delegation_grant_ref,
    partition_scope_refs: next.partition_scope_refs,
  });

  assertCondition(
    previousIdentity === nextIdentity,
    "AUTHORITY_LINK_SILENT_REBIND",
    "authority link identity and delegation lineage must not mutate in place",
  );
}

export function deriveAuthorityLinkLifecycleState(
  record: AuthorityLinkRecord,
  evaluatedAt: ISO8601DateTimeString,
): AuthorityLinkLifecycleState {
  if (record.superseded_by_link_id !== null) {
    return "SUPERSEDED";
  }
  if (record.revoked_at !== null && record.revoked_at <= evaluatedAt) {
    return "REVOKED";
  }
  if (record.expires_at !== null && record.expires_at <= evaluatedAt) {
    return "EXPIRED";
  }
  return record.lifecycle_state;
}

