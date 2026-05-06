import type { GovernanceInteractionLayer } from "../../../generated-models/src/generated/typescript/governance-and-policy.ts";

export type GovernanceInteractionRouteFamily =
  | "audit_investigation"
  | "authority_link_inventory"
  | "governance_policy_snapshot"
  | "principal_access_view"
  | "retention_governance"
  | "role_template_matrix"
  | "tenant_governance_snapshot";

export type GovernanceFilterRecord = Record<
  string,
  readonly string[] | string | null | undefined
>;

type FilterDimension = {
  field: string;
  prefix: string;
};

const filterDimensionsByRoute = {
  audit_investigation: [
    { field: "actor_refs", prefix: "actor" },
    { field: "event_families", prefix: "event_family" },
    { field: "client_refs", prefix: "client" },
    { field: "manifest_refs", prefix: "manifest" },
    { field: "authority_operation_refs", prefix: "authority_operation" },
    { field: "object_refs", prefix: "object" },
    { field: "window_from", prefix: "window_from" },
    { field: "window_to", prefix: "window_to" },
  ],
  authority_link_inventory: [
    { field: "authority_scopes", prefix: "authority_scope" },
    { field: "client_refs", prefix: "client" },
    { field: "provider_environments", prefix: "provider_environment" },
    { field: "lifecycle_states", prefix: "lifecycle_state" },
    { field: "binding_health_states", prefix: "binding_health" },
    { field: "expiry_risk_bands", prefix: "expiry_risk" },
  ],
  governance_policy_snapshot: [],
  principal_access_view: [
    { field: "principal_types", prefix: "principal_type" },
    { field: "principal_states", prefix: "principal_state" },
    { field: "role_refs", prefix: "role" },
    { field: "delegated_client_refs", prefix: "delegated_client" },
    { field: "recent_change_owner_refs", prefix: "changed_by" },
  ],
  retention_governance: [
    { field: "artifact_classes", prefix: "artifact_class" },
    { field: "retention_classes", prefix: "retention_class" },
    { field: "client_refs", prefix: "client" },
    { field: "legal_hold_states", prefix: "legal_hold_state" },
    { field: "release_eligibility_states", prefix: "release_eligibility" },
    { field: "erasure_readiness_states", prefix: "erasure_readiness" },
  ],
  role_template_matrix: [
    { field: "resource_classes", prefix: "resource_class" },
    { field: "action_families", prefix: "action_family" },
    { field: "decision_outcomes", prefix: "decision" },
  ],
  tenant_governance_snapshot: [
    { field: "environment_ref", prefix: "environment" },
    { field: "client_refs", prefix: "client" },
    { field: "principal_classes", prefix: "principal_class" },
    { field: "risk_families", prefix: "risk_family" },
    { field: "change_states", prefix: "change_state" },
  ],
} as const satisfies Record<GovernanceInteractionRouteFamily, readonly FilterDimension[]>;

export class GovernanceFilterChipEchoError extends Error {
  readonly code:
    | "GOVERNANCE_FILTER_CHIP_DUPLICATE"
    | "GOVERNANCE_FILTER_CHIP_EMPTY"
    | "GOVERNANCE_FILTER_ROUTE_UNSUPPORTED";

  constructor(code: GovernanceFilterChipEchoError["code"], detail: string) {
    super(`${code}: ${detail}`);
    this.name = "GovernanceFilterChipEchoError";
    this.code = code;
  }
}

function valuesFor(input: readonly string[] | string | null | undefined) {
  if (input === null || input === undefined) {
    return [];
  }
  return typeof input === "string" ? [input] : [...input];
}

function chipRefsForDimension(input: {
  activeFilters: GovernanceFilterRecord;
  dimension: FilterDimension;
}) {
  return valuesFor(input.activeFilters[input.dimension.field]).map((value) => {
    const normalized = value.trim();
    if (normalized.length === 0) {
      throw new GovernanceFilterChipEchoError(
        "GOVERNANCE_FILTER_CHIP_EMPTY",
        `${input.dimension.field} cannot contain an empty filter token`,
      );
    }
    return `${input.dimension.prefix}:${normalized}`;
  });
}

export function deriveGovernanceFilterChipEcho(input: {
  activeFilters?: GovernanceFilterRecord | null | undefined;
  routeFamily: GovernanceInteractionRouteFamily;
}): GovernanceInteractionLayer["selected_filter_chip_refs"] {
  const dimensions = filterDimensionsByRoute[input.routeFamily];
  if (dimensions === undefined) {
    throw new GovernanceFilterChipEchoError(
      "GOVERNANCE_FILTER_ROUTE_UNSUPPORTED",
      `unsupported governance route family ${input.routeFamily}`,
    );
  }
  const chips = dimensions.flatMap((dimension) =>
    chipRefsForDimension({
      activeFilters: input.activeFilters ?? {},
      dimension,
    }),
  );
  const seen = new Set<string>();
  for (const chip of chips) {
    if (seen.has(chip)) {
      throw new GovernanceFilterChipEchoError(
        "GOVERNANCE_FILTER_CHIP_DUPLICATE",
        `selected_filter_chip_refs cannot repeat ${chip}`,
      );
    }
    seen.add(chip);
  }
  return chips;
}

