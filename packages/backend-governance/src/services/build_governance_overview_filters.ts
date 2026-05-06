import type {
  TenantGovernanceSnapshot,
} from "../../../generated-models/src/generated/typescript/governance-and-policy.ts";
import { sortSetLikeStrings } from "../../../domain-kernel/src/primitives/hash.ts";

export type GovernanceOverviewFilters = TenantGovernanceSnapshot["active_filters"];
export type GovernanceOverviewRiskFamily = GovernanceOverviewFilters["risk_families"][number];
export type GovernanceOverviewPrincipalClass = GovernanceOverviewFilters["principal_classes"][number];

export type BuildGovernanceOverviewFiltersInput = {
  environmentRef: string;
  filters?: Partial<GovernanceOverviewFilters> | undefined;
  primaryQueueCode: GovernanceOverviewRiskFamily;
};

const principalClassSet = new Set<GovernanceOverviewPrincipalClass>([
  "EXTERNAL",
  "HUMAN",
  "SERVICE",
]);

const riskFamilySet = new Set<GovernanceOverviewRiskFamily>([
  "AUDIT_HOTSPOTS",
  "AUTHORITY_LINK_RISKS",
  "CONFIGURATION_DRIFT",
  "PENDING_APPROVALS",
  "RETENTION_EXCEPTIONS",
]);

export class GovernanceOverviewFilterError extends Error {
  constructor(detail: string) {
    super(`GOVERNANCE_OVERVIEW_FILTER_INVALID: ${detail}`);
    this.name = "GovernanceOverviewFilterError";
  }
}

function requireNonEmptyString(label: string, value: string) {
  const normalized = value.trim();
  if (normalized.length === 0) {
    throw new GovernanceOverviewFilterError(`${label} must be a non-empty string`);
  }
  return normalized;
}

function sortedUniqueStrings(label: string, values: readonly string[] | undefined) {
  const normalized = (values ?? []).map((value) => requireNonEmptyString(label, value));
  return sortSetLikeStrings([...new Set(normalized)]);
}

function sortedPrincipalClasses(
  values: readonly GovernanceOverviewPrincipalClass[] | undefined,
) {
  const normalized = sortedUniqueStrings("principal_classes[]", values);
  for (const value of normalized) {
    if (!principalClassSet.has(value as GovernanceOverviewPrincipalClass)) {
      throw new GovernanceOverviewFilterError(`unknown principal class ${value}`);
    }
  }
  return normalized as GovernanceOverviewPrincipalClass[];
}

function sortedRiskFamilies(
  values: readonly GovernanceOverviewRiskFamily[] | undefined,
  primaryQueueCode: GovernanceOverviewRiskFamily,
) {
  const normalized = sortedUniqueStrings("risk_families[]", values);
  for (const value of normalized) {
    if (!riskFamilySet.has(value as GovernanceOverviewRiskFamily)) {
      throw new GovernanceOverviewFilterError(`unknown risk family ${value}`);
    }
  }
  if (normalized.length > 0 && !normalized.includes(primaryQueueCode)) {
    normalized.push(primaryQueueCode);
  }
  return sortSetLikeStrings([...new Set(normalized)]) as GovernanceOverviewRiskFamily[];
}

export function buildGovernanceOverviewFilters(
  input: BuildGovernanceOverviewFiltersInput,
): GovernanceOverviewFilters {
  const environmentRef = requireNonEmptyString(
    "environment_ref",
    input.filters?.environment_ref ?? input.environmentRef,
  );
  if (environmentRef !== input.environmentRef) {
    throw new GovernanceOverviewFilterError(
      "active_filters.environment_ref must match environmentRef",
    );
  }
  return {
    change_states: sortedUniqueStrings("change_states[]", input.filters?.change_states),
    client_refs: sortedUniqueStrings("client_refs[]", input.filters?.client_refs),
    environment_ref: environmentRef,
    principal_classes: sortedPrincipalClasses(input.filters?.principal_classes),
    risk_families: sortedRiskFamilies(input.filters?.risk_families, input.primaryQueueCode),
  };
}

export function governanceOverviewFilterChipRefs(filters: GovernanceOverviewFilters) {
  return [
    `environment:${filters.environment_ref}`,
    ...filters.client_refs.map((value) => `client:${value}`),
    ...filters.principal_classes.map((value) => `principal_class:${value}`),
    ...filters.risk_families.map((value) => `risk_family:${value}`),
    ...filters.change_states.map((value) => `change_state:${value}`),
  ];
}
