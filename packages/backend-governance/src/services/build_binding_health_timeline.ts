import { normalizeUtcInstantString } from "../../../domain-kernel/src/primitives/time.ts";
import type { AuthorityLinkInventoryItem } from "../../../generated-models/src/generated/typescript/authority-and-access.ts";
import type { AuthorityLinkRecord } from "../../../backend-access/src/models/authority_link.ts";
import type { AuthorityLinkHealthRollup } from "./derive_authority_link_health_rollup.ts";

function addHours(instant: string, hours: number) {
  return new Date(Date.parse(instant) + hours * 60 * 60 * 1000).toISOString();
}

function minInstant(left: string, right: string) {
  return Date.parse(left) <= Date.parse(right) ? left : right;
}

function defaultNextValidationDueAt(input: {
  authorityLink: AuthorityLinkRecord;
  evaluatedAt: string;
  healthRollup: AuthorityLinkHealthRollup;
}) {
  if (
    ["REVOKED", "EXPIRED", "UNLINKED", "TOKEN_INVALID"].includes(
      input.healthRollup.lifecycle_state,
    )
  ) {
    return null;
  }
  const basis =
    input.authorityLink.last_binding_check_at ??
    input.authorityLink.validated_at ??
    input.evaluatedAt;
  let next = addHours(normalizeUtcInstantString(basis), 72);
  if (input.authorityLink.expires_at !== null) {
    const expiresAt = normalizeUtcInstantString(input.authorityLink.expires_at);
    if (Date.parse(expiresAt) <= Date.parse(normalizeUtcInstantString(input.evaluatedAt))) {
      return null;
    }
    next = minInstant(next, expiresAt);
  }
  return next;
}

export function buildBindingHealthTimeline(input: {
  authorityLink: AuthorityLinkRecord;
  evaluatedAt: string;
  eventRefs?: readonly string[] | undefined;
  healthRollup: AuthorityLinkHealthRollup;
  nextValidationDueAt?: string | null | undefined;
}): AuthorityLinkInventoryItem["binding_health_timeline"] {
  const event_refs =
    input.eventRefs && input.eventRefs.length > 0
      ? [...new Set(input.eventRefs)]
      : [
          `authority-link-event.${input.authorityLink.authority_link_id}.${input.healthRollup.binding_health.toLowerCase()}`,
        ];
  const nextValidationDueAt =
    input.nextValidationDueAt === undefined
      ? defaultNextValidationDueAt(input)
      : input.nextValidationDueAt;

  return {
    current_binding_health: input.healthRollup.binding_health,
    current_delegation_state: input.healthRollup.delegation_state,
    current_token_client_binding_state: input.healthRollup.token_client_binding_state,
    event_refs,
    next_validation_due_at_or_null:
      nextValidationDueAt === null ? null : normalizeUtcInstantString(nextValidationDueAt),
    promoted_issue_ref_or_null: input.healthRollup.prominent_issue_ref_or_null,
  };
}
