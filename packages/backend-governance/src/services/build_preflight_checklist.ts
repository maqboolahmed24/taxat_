import { normalizeUtcInstantString } from "../../../domain-kernel/src/primitives/time.ts";
import type { AuthorityLinkInventoryItem } from "../../../generated-models/src/generated/typescript/authority-and-access.ts";
import type { AuthorityLinkRecord } from "../../../backend-access/src/models/authority_link.ts";
import type { AuthorityLinkHealthRollup } from "./derive_authority_link_health_rollup.ts";

export const authorityLinkPreflightCheckOrder = [
  "AUTHORITY_SCOPE",
  "CLIENT_BINDING",
  "DELEGATION_COVERAGE",
  "PROVIDER_ENVIRONMENT",
  "TOKEN_FRESHNESS",
] as const satisfies readonly AuthorityLinkInventoryItem["preflight_checklist"]["check_order"][number][];

function checkRef(authorityLinkId: string, checkCode: string) {
  return `preflight-check.${authorityLinkId}.${checkCode.toLowerCase()}`;
}

function check(
  authorityLinkId: string,
  check_code: AuthorityLinkInventoryItem["preflight_checklist"]["checks"][number]["check_code"],
  check_state: AuthorityLinkInventoryItem["preflight_checklist"]["checks"][number]["check_state"],
  reason_refs: readonly string[] = [],
): AuthorityLinkInventoryItem["preflight_checklist"]["checks"][number] {
  return {
    check_code,
    check_ref: checkRef(authorityLinkId, check_code),
    check_state,
    reason_refs: [...reason_refs],
  };
}

export function buildPreflightChecklist(input: {
  authorityLink: AuthorityLinkRecord;
  evaluatedAt: string;
  healthRollup: AuthorityLinkHealthRollup;
}): AuthorityLinkInventoryItem["preflight_checklist"] {
  const authorityLinkId = input.authorityLink.authority_link_id;
  const checks: AuthorityLinkInventoryItem["preflight_checklist"]["checks"] = [
    check(authorityLinkId, "AUTHORITY_SCOPE", "PASS"),
    input.healthRollup.token_client_binding_state === "MISMATCH"
      ? check(authorityLinkId, "CLIENT_BINDING", "BLOCKED", [
          "AUTHORITY_LINK_CLIENT_BINDING_MISMATCH",
        ])
      : input.healthRollup.token_client_binding_state === "UNVERIFIED"
        ? check(authorityLinkId, "CLIENT_BINDING", "WARNING", [
            "AUTHORITY_LINK_CLIENT_BINDING_UNVERIFIED",
          ])
        : check(authorityLinkId, "CLIENT_BINDING", "PASS"),
    input.healthRollup.delegation_state === "MISSING" ||
    input.healthRollup.delegation_state === "EXPIRED"
      ? check(authorityLinkId, "DELEGATION_COVERAGE", "BLOCKED", [
          `AUTHORITY_LINK_DELEGATION_${input.healthRollup.delegation_state}`,
        ])
      : input.healthRollup.delegation_state === "LIMITED" ||
          input.healthRollup.delegation_state === "UNKNOWN"
        ? check(authorityLinkId, "DELEGATION_COVERAGE", "WARNING", [
            `AUTHORITY_LINK_DELEGATION_${input.healthRollup.delegation_state}`,
          ])
        : check(authorityLinkId, "DELEGATION_COVERAGE", "PASS"),
    input.healthRollup.binding_health === "ENVIRONMENT_DRIFT"
      ? check(authorityLinkId, "PROVIDER_ENVIRONMENT", "BLOCKED", [
          "AUTHORITY_LINK_PROVIDER_ENVIRONMENT_DRIFT",
        ])
      : check(authorityLinkId, "PROVIDER_ENVIRONMENT", "PASS"),
    input.healthRollup.binding_health === "TOKEN_INVALID" ||
    input.healthRollup.lifecycle_state === "TOKEN_INVALID" ||
    input.healthRollup.lifecycle_state === "EXPIRED"
      ? check(authorityLinkId, "TOKEN_FRESHNESS", "BLOCKED", [
          "AUTHORITY_LINK_TOKEN_FRESHNESS_BLOCKED",
        ])
      : input.healthRollup.binding_health === "EXPIRING_SOON"
        ? check(authorityLinkId, "TOKEN_FRESHNESS", "WARNING", [
            "AUTHORITY_LINK_TOKEN_EXPIRING_SOON",
          ])
        : check(authorityLinkId, "TOKEN_FRESHNESS", "PASS"),
  ];
  const blocking_check_refs = checks
    .filter((entry) => entry.check_state === "BLOCKED")
    .map((entry) => entry.check_ref);

  return {
    blocking_check_refs,
    check_order: [...authorityLinkPreflightCheckOrder],
    checks,
    last_run_at_or_null: normalizeUtcInstantString(input.evaluatedAt),
  };
}
