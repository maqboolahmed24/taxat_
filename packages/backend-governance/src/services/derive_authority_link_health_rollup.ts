import { sortSetLikeStrings } from "../../../domain-kernel/src/primitives/hash.ts";
import { normalizeUtcInstantString } from "../../../domain-kernel/src/primitives/time.ts";
import type { AuthorityLinkInventoryItem } from "../../../generated-models/src/generated/typescript/authority-and-access.ts";
import type {
  AuthorityLinkBindingHealth,
  AuthorityLinkLifecycleState,
  AuthorityLinkRecord,
} from "../../../backend-access/src/models/authority_link.ts";
import { AuthorityLinkBindingHealthService } from "../../../backend-access/src/services/authority_link_binding_health_service.ts";

export type AuthorityLinkInventoryLifecycleState =
  AuthorityLinkInventoryItem["lifecycle_state"];
export type AuthorityLinkInventoryBindingHealth =
  AuthorityLinkInventoryItem["binding_health"];
export type AuthorityLinkInventoryDelegationState =
  AuthorityLinkInventoryItem["delegation_state"];
export type AuthorityLinkInventoryExpiryRiskBand =
  AuthorityLinkInventoryItem["authority_link_workspace"]["active_filters"]["expiry_risk_bands"][number];

export type AuthorityLinkHealthRollup = {
  binding_health: AuthorityLinkInventoryBindingHealth;
  blocked_reason_codes: string[];
  delegation_state: AuthorityLinkInventoryDelegationState;
  expiry_risk_band: AuthorityLinkInventoryExpiryRiskBand;
  lifecycle_state: AuthorityLinkInventoryLifecycleState;
  prominent_issue_ref_or_null: string | null;
  token_client_binding_state: AuthorityLinkInventoryItem["token_client_binding_state"];
};

const prominentHealthStates = new Set<AuthorityLinkInventoryBindingHealth>([
  "CLIENT_BINDING_MISMATCH",
  "DELEGATION_GAP",
  "ENVIRONMENT_DRIFT",
  "TOKEN_INVALID",
  "REVOKED",
  "EXPIRED",
]);

function inventoryLifecycleState(
  state: AuthorityLinkLifecycleState,
): AuthorityLinkInventoryLifecycleState {
  if (state === "SUPERSEDED") {
    return "REVOKED";
  }
  return state;
}

function inventoryDelegationState(
  state: AuthorityLinkRecord["delegation_state"],
): AuthorityLinkInventoryDelegationState {
  return state === "NOT_REQUIRED" ? "SATISFIED" : state;
}

function issueRef(authorityLinkId: string, health: AuthorityLinkInventoryBindingHealth) {
  return `authority-link-issue.${authorityLinkId}.${health.toLowerCase()}`;
}

function reasonForHealth(health: AuthorityLinkInventoryBindingHealth) {
  return `AUTHORITY_LINK_${health}`;
}

function uniqueReasonCodes(values: readonly string[]) {
  return sortSetLikeStrings(
    [...new Set(values.map((value) => value.trim()).filter(Boolean))],
  );
}

export function deriveAuthorityLinkExpiryRiskBand(input: {
  evaluatedAt: string;
  expiresAt: string | null;
}): AuthorityLinkInventoryExpiryRiskBand {
  if (input.expiresAt === null) {
    return "NONE";
  }
  const evaluatedAtMs = Date.parse(normalizeUtcInstantString(input.evaluatedAt));
  const expiresAtMs = Date.parse(normalizeUtcInstantString(input.expiresAt));
  if (expiresAtMs <= evaluatedAtMs) {
    return "EXPIRED";
  }
  const daysUntilExpiry = Math.ceil((expiresAtMs - evaluatedAtMs) / 86_400_000);
  if (daysUntilExpiry <= 7) {
    return "EXPIRING_7_DAYS";
  }
  if (daysUntilExpiry <= 14) {
    return "EXPIRING_14_DAYS";
  }
  if (daysUntilExpiry <= 30) {
    return "EXPIRING_30_DAYS";
  }
  return "NONE";
}

export function deriveAuthorityLinkHealthRollup(input: {
  authorityLink: AuthorityLinkRecord;
  evaluatedAt: string;
  expectedProviderEnvironment?: string | null | undefined;
  expiringSoonWindowHours?: number | undefined;
}): AuthorityLinkHealthRollup {
  const resolved = new AuthorityLinkBindingHealthService(
    input.expiringSoonWindowHours === undefined
      ? undefined
      : { expiringSoonWindowHours: input.expiringSoonWindowHours },
  ).resolve(input.authorityLink, input.evaluatedAt);

  let lifecycle_state = inventoryLifecycleState(resolved.lifecycle_state);
  let binding_health = resolved.binding_health as AuthorityLinkInventoryBindingHealth;
  let blocked_reason_codes = uniqueReasonCodes(resolved.blocked_reason_codes);

  if (input.authorityLink.lifecycle_state === "SUPERSEDED") {
    lifecycle_state = "REVOKED";
    binding_health = "REVOKED";
    blocked_reason_codes = uniqueReasonCodes([
      ...blocked_reason_codes,
      "AUTHORITY_LINK_SUPERSEDED",
    ]);
  }

  if (input.authorityLink.token_client_binding_state === "MISMATCH") {
    binding_health = "CLIENT_BINDING_MISMATCH";
    lifecycle_state =
      input.authorityLink.lifecycle_state === "TOKEN_INVALID"
        ? "AUTHORISED_LIMITED"
        : inventoryLifecycleState(input.authorityLink.lifecycle_state);
    blocked_reason_codes = uniqueReasonCodes([
      ...blocked_reason_codes,
      "AUTHORITY_LINK_CLIENT_BINDING_MISMATCH",
    ]);
  }

  const expectedProviderEnvironment = input.expectedProviderEnvironment?.trim();
  if (
    expectedProviderEnvironment &&
    input.authorityLink.provider_environment !== expectedProviderEnvironment &&
    !["REVOKED", "EXPIRED", "UNLINKED", "TOKEN_INVALID"].includes(lifecycle_state)
  ) {
    binding_health = "ENVIRONMENT_DRIFT";
    blocked_reason_codes = uniqueReasonCodes([
      ...blocked_reason_codes,
      "AUTHORITY_LINK_PROVIDER_ENVIRONMENT_DRIFT",
    ]);
  }

  if (binding_health !== "HEALTHY" && binding_health !== "EXPIRING_SOON") {
    blocked_reason_codes = uniqueReasonCodes([
      ...blocked_reason_codes,
      reasonForHealth(binding_health),
    ]);
  }

  return {
    binding_health,
    blocked_reason_codes,
    delegation_state: inventoryDelegationState(input.authorityLink.delegation_state),
    expiry_risk_band: deriveAuthorityLinkExpiryRiskBand({
      evaluatedAt: input.evaluatedAt,
      expiresAt: input.authorityLink.expires_at,
    }),
    lifecycle_state,
    prominent_issue_ref_or_null: prominentHealthStates.has(binding_health)
      ? issueRef(input.authorityLink.authority_link_id, binding_health)
      : null,
    token_client_binding_state: input.authorityLink.token_client_binding_state,
  };
}
