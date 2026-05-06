import { normalizeUtcInstantString } from "../../../domain-kernel/src/primitives/time.ts";

import type {
  AuthorityLinkBindingHealth,
  AuthorityLinkLifecycleState,
  AuthorityLinkRecord,
} from "../models/authority_link.ts";

export type AuthorityLinkBindingHealthResolution = {
  binding_health: AuthorityLinkBindingHealth;
  blocked_reason_codes: string[];
  lifecycle_state: AuthorityLinkLifecycleState;
};

function uniqueReasonCodes(...groups: string[][]) {
  return [...new Set(groups.flat())].sort((left, right) => left.localeCompare(right));
}

export class AuthorityLinkBindingHealthService {
  constructor(private readonly options?: { expiringSoonWindowHours?: number }) {}

  resolve(record: AuthorityLinkRecord, evaluatedAt: string): AuthorityLinkBindingHealthResolution {
    const normalizedEvaluatedAt = normalizeUtcInstantString(evaluatedAt);
    const expiringSoonWindowHours = this.options?.expiringSoonWindowHours ?? 72;
    const expiresSoonThreshold = record.expires_at
      ? new Date(
          new Date(record.expires_at).valueOf() - expiringSoonWindowHours * 60 * 60 * 1000,
        ).toISOString()
      : null;

    if (record.superseded_by_link_id !== null) {
      return {
        lifecycle_state: "SUPERSEDED",
        binding_health: "UNKNOWN",
        blocked_reason_codes: uniqueReasonCodes(
          record.blocked_reason_codes,
          ["AUTHORITY_LINK_SUPERSEDED"],
        ),
      };
    }

    if (record.revoked_at !== null && record.revoked_at <= normalizedEvaluatedAt) {
      return {
        lifecycle_state: "REVOKED",
        binding_health: "REVOKED",
        blocked_reason_codes: uniqueReasonCodes(
          record.blocked_reason_codes,
          ["AUTHORITY_LINK_REVOKED"],
        ),
      };
    }

    if (record.expires_at !== null && record.expires_at <= normalizedEvaluatedAt) {
      return {
        lifecycle_state: "EXPIRED",
        binding_health: "EXPIRED",
        blocked_reason_codes: uniqueReasonCodes(
          record.blocked_reason_codes,
          ["AUTHORITY_LINK_EXPIRED"],
        ),
      };
    }

    if (
      record.token_client_binding_state === "MISMATCH" ||
      record.lifecycle_state === "TOKEN_INVALID"
    ) {
      return {
        lifecycle_state: "TOKEN_INVALID",
        binding_health: "TOKEN_INVALID",
        blocked_reason_codes: uniqueReasonCodes(
          record.blocked_reason_codes,
          ["AUTHORITY_LINK_CLIENT_BINDING_MISMATCH"],
        ),
      };
    }

    if (record.delegation_state === "MISSING" || record.delegation_state === "EXPIRED") {
      return {
        lifecycle_state: "AUTHORISED_LIMITED",
        binding_health: "DELEGATION_GAP",
        blocked_reason_codes: uniqueReasonCodes(
          record.blocked_reason_codes,
          ["AUTHORITY_LINK_DELEGATION_GAP"],
        ),
      };
    }

    if (record.delegation_state === "LIMITED") {
      return {
        lifecycle_state: "AUTHORISED_LIMITED",
        binding_health: "LIMITED_SCOPE",
        blocked_reason_codes: uniqueReasonCodes(
          record.blocked_reason_codes,
          ["AUTHORITY_LINK_LIMITED_SCOPE"],
        ),
      };
    }

    if (record.lifecycle_state === "UNLINKED") {
      return {
        lifecycle_state: "UNLINKED",
        binding_health: "UNLINKED",
        blocked_reason_codes: uniqueReasonCodes(
          record.blocked_reason_codes,
          ["AUTHORITY_LINK_UNLINKED"],
        ),
      };
    }

    if (record.lifecycle_state === "LINK_INITIATED") {
      return {
        lifecycle_state: "LINK_INITIATED",
        binding_health: "UNKNOWN",
        blocked_reason_codes: uniqueReasonCodes(
          record.blocked_reason_codes,
          ["AUTHORITY_LINK_PENDING"],
        ),
      };
    }

    if (
      expiresSoonThreshold !== null &&
      normalizedEvaluatedAt >= expiresSoonThreshold &&
      record.expires_at !== null
    ) {
      return {
        lifecycle_state: "AUTHORISED_ACTIVE",
        binding_health: "EXPIRING_SOON",
        blocked_reason_codes: [],
      };
    }

    return {
      lifecycle_state: "AUTHORISED_ACTIVE",
      binding_health: "HEALTHY",
      blocked_reason_codes: [],
    };
  }
}

