import type { PrincipalAccessView } from "../../../../packages/generated-models/src/generated/typescript/authority-and-access.ts";
import type {
  RoleTemplateMatrix,
  TenantGovernanceSnapshot,
} from "../../../../packages/generated-models/src/generated/typescript/governance-and-policy.ts";

export type GovernanceReadQueryInput = Record<
  string,
  string | readonly string[] | null | undefined
>;

type GovernanceQueryValue = string | readonly string[] | null | undefined;

const overviewPrincipalClassOrder = ["HUMAN", "SERVICE", "EXTERNAL"] as const;
const overviewRiskFamilyOrder = [
  "PENDING_APPROVALS",
  "CONFIGURATION_DRIFT",
  "AUTHORITY_LINK_RISKS",
  "RETENTION_EXCEPTIONS",
  "AUDIT_HOTSPOTS",
] as const;
const principalTypeOrder = ["HUMAN", "SERVICE", "EXTERNAL"] as const;
const roleDecisionOrder = [
  "ALLOW",
  "ALLOW_MASKED",
  "REQUIRE_STEP_UP",
  "REQUIRE_APPROVAL",
  "DENY",
] as const;

function queryValue(input: GovernanceReadQueryInput | undefined, names: readonly string[]) {
  for (const name of names) {
    const value = input?.[name];
    if (value !== undefined) {
      return value;
    }
  }
  return undefined;
}

function queryString(input: GovernanceReadQueryInput | undefined, names: readonly string[]) {
  const value = queryValue(input, names);
  if (Array.isArray(value)) {
    return value.find((item) => item.trim().length > 0)?.trim();
  }
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : undefined;
  }
  return undefined;
}

function splitQueryValue(value: GovernanceQueryValue) {
  if (value === null || value === undefined) {
    return [];
  }
  const values = Array.isArray(value) ? value : [value];
  return values
    .flatMap((item) => item.split(","))
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
}

function uniqueSortedStrings(values: readonly string[]) {
  return [...new Set(values)].sort((left, right) => left.localeCompare(right));
}

function enumSet<const T extends string>(
  values: readonly string[],
  order: readonly T[],
  label: string,
) {
  const allowed = new Set<string>(order);
  const normalized = new Set<T>();
  for (const value of values) {
    if (!allowed.has(value)) {
      throw new Error(`${label} includes unsupported value ${value}`);
    }
    normalized.add(value as T);
  }
  return order.filter((value) => normalized.has(value));
}

export function governanceQueryFromPath(path: string | undefined) {
  if (path === undefined) {
    return {} satisfies GovernanceReadQueryInput;
  }
  const queryStart = path.indexOf("?");
  if (queryStart < 0) {
    return {} satisfies GovernanceReadQueryInput;
  }
  const params = new URLSearchParams(path.slice(queryStart + 1));
  const query: Record<string, string[]> = {};
  for (const [key, value] of params.entries()) {
    query[key] = [...(query[key] ?? []), value];
  }
  return query satisfies GovernanceReadQueryInput;
}

export function mergeGovernanceQueryInputs(
  ...inputs: readonly (GovernanceReadQueryInput | undefined)[]
) {
  const merged: Record<string, string | readonly string[] | null | undefined> = {};
  for (const input of inputs) {
    if (!input) {
      continue;
    }
    for (const [key, value] of Object.entries(input)) {
      if (value !== undefined) {
        merged[key] = value;
      }
    }
  }
  return merged satisfies GovernanceReadQueryInput;
}

export function normalizeGovernanceOverviewFilters(
  input: GovernanceReadQueryInput | undefined,
  defaults: TenantGovernanceSnapshot["active_filters"],
) {
  const environment_ref =
    queryString(input, ["environment_ref", "environmentRef"]) ?? defaults.environment_ref;
  if (environment_ref.length === 0) {
    throw new Error("environment_ref must remain non-empty");
  }
  return {
    environment_ref,
    client_refs:
      queryValue(input, ["client_refs", "clientRefs", "client_ref", "clientRef"]) === undefined
        ? [...defaults.client_refs]
        : uniqueSortedStrings(
            splitQueryValue(
              queryValue(input, ["client_refs", "clientRefs", "client_ref", "clientRef"]),
            ),
          ),
    principal_classes:
      queryValue(input, ["principal_classes", "principalClasses", "principal_class"]) === undefined
        ? [...defaults.principal_classes]
        : enumSet(
            splitQueryValue(
              queryValue(input, ["principal_classes", "principalClasses", "principal_class"]),
            ),
            overviewPrincipalClassOrder,
            "principal_classes",
          ),
    risk_families:
      queryValue(input, ["risk_families", "riskFamilies", "risk_family"]) === undefined
        ? [...defaults.risk_families]
        : enumSet(
            splitQueryValue(queryValue(input, ["risk_families", "riskFamilies", "risk_family"])),
            overviewRiskFamilyOrder,
            "risk_families",
          ),
    change_states:
      queryValue(input, ["change_states", "changeStates", "change_state"]) === undefined
        ? [...defaults.change_states]
        : uniqueSortedStrings(
            splitQueryValue(queryValue(input, ["change_states", "changeStates", "change_state"])),
          ),
  } satisfies TenantGovernanceSnapshot["active_filters"];
}

export function normalizePrincipalAccessFilters(
  input: GovernanceReadQueryInput | undefined,
  defaults: PrincipalAccessView["access_workspace"]["active_filters"],
) {
  return {
    principal_types:
      queryValue(input, ["principal_types", "principalTypes", "principal_type"]) === undefined
        ? [...defaults.principal_types]
        : enumSet(
            splitQueryValue(
              queryValue(input, ["principal_types", "principalTypes", "principal_type"]),
            ),
            principalTypeOrder,
            "principal_types",
          ),
    principal_states:
      queryValue(input, ["principal_states", "principalStates", "principal_state"]) === undefined
        ? [...defaults.principal_states]
        : uniqueSortedStrings(
            splitQueryValue(
              queryValue(input, ["principal_states", "principalStates", "principal_state"]),
            ),
          ),
    role_refs:
      queryValue(input, ["role_refs", "roleRefs", "role_ref"]) === undefined
        ? [...defaults.role_refs]
        : uniqueSortedStrings(splitQueryValue(queryValue(input, ["role_refs", "roleRefs", "role_ref"]))),
    delegated_client_refs:
      queryValue(input, ["delegated_client_refs", "delegatedClientRefs"]) === undefined
        ? [...defaults.delegated_client_refs]
        : uniqueSortedStrings(
            splitQueryValue(queryValue(input, ["delegated_client_refs", "delegatedClientRefs"])),
          ),
    recent_change_owner_refs:
      queryValue(input, ["recent_change_owner_refs", "recentChangeOwnerRefs"]) === undefined
        ? [...defaults.recent_change_owner_refs]
        : uniqueSortedStrings(
            splitQueryValue(queryValue(input, ["recent_change_owner_refs", "recentChangeOwnerRefs"])),
          ),
  } satisfies PrincipalAccessView["access_workspace"]["active_filters"];
}

export function normalizeRoleTemplateMatrixFilters(
  input: GovernanceReadQueryInput | undefined,
  defaults: RoleTemplateMatrix["role_matrix_workspace"]["active_filters"],
) {
  return {
    resource_classes:
      queryValue(input, ["resource_classes", "resourceClasses", "resource_class"]) === undefined
        ? [...defaults.resource_classes]
        : uniqueSortedStrings(
            splitQueryValue(
              queryValue(input, ["resource_classes", "resourceClasses", "resource_class"]),
            ),
          ),
    action_families:
      queryValue(input, ["action_families", "actionFamilies", "action_family"]) === undefined
        ? [...defaults.action_families]
        : uniqueSortedStrings(
            splitQueryValue(queryValue(input, ["action_families", "actionFamilies", "action_family"])),
          ),
    decision_outcomes:
      queryValue(input, ["decision_outcomes", "decisionOutcomes", "decision"]) === undefined
        ? [...defaults.decision_outcomes]
        : enumSet(
            splitQueryValue(queryValue(input, ["decision_outcomes", "decisionOutcomes", "decision"])),
            roleDecisionOrder,
            "decision_outcomes",
          ),
  } satisfies RoleTemplateMatrix["role_matrix_workspace"]["active_filters"];
}

export function governanceRefOrUndefined(
  input: GovernanceReadQueryInput | undefined,
  names: readonly string[],
) {
  const value = queryValue(input, names);
  if (value === undefined) {
    return undefined;
  }
  if (value === null) {
    return null;
  }
  const raw = Array.isArray(value) ? value.at(-1) : value;
  if (raw === undefined) {
    return undefined;
  }
  const trimmed = raw.trim();
  if (trimmed.length === 0 || trimmed === "null") {
    return null;
  }
  return trimmed;
}
