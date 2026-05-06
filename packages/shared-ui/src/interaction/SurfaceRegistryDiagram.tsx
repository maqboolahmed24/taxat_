import {
  createSurfaceRegistrySnapshot,
  orderedInteractionLayerShellFamilies,
  resolveSurfaceMountPlan,
  type ShellFamilyCode,
  type SurfaceMountPlan,
} from "@taxat/frontend-shell-core";

export const surfaceRegistryDiagramContract = {
  component_id: "surface-registry-diagram",
  data_policy: "SERIALIZED_SURFACE_CODES_ONLY_NO_ROUTE_OBJECT_DATA",
  required_selectors: [
    "surface-registry-diagram",
    "surface-registry-row",
    "promoted-support-region",
    "support-budget-chip",
  ],
  motion_policy: "PROMOTION_DEMOTION_OPACITY_HEIGHT_ONLY_REDUCED_MOTION_PARITY",
} as const;

export type SurfaceRegistryDiagramRow = {
  shell_family: ShellFamilyCode;
  allowed_primary_surface_codes: readonly string[];
  promoted_support_surface_code: string;
  default_reading_order: readonly string[];
  support_budget_label: string;
  focus_return_label: string;
  live_region_label: string;
};

function rowForPlan(plan: SurfaceMountPlan): SurfaceRegistryDiagramRow {
  const promotedSupport = plan.promoted_support_regions[0];
  return {
    allowed_primary_surface_codes: plan.mounted_surfaces
      .filter((surface) => surface.role !== "PROMOTED_SUPPORT" && surface.role !== "NOTICE")
      .map((surface) => surface.surface_code),
    default_reading_order: plan.default_reading_order,
    focus_return_label: promotedSupport?.return_focus_behavior ?? "NONE",
    live_region_label:
      promotedSupport?.live_region_role === "none"
        ? plan.notification_surface_policy
        : (promotedSupport?.live_region_role ?? "none"),
    promoted_support_surface_code: promotedSupport?.surface_code ?? "NONE",
    shell_family: plan.shell_family,
    support_budget_label: `${plan.support_budget.policy}:${plan.support_budget.default_limit}`,
  };
}

export function createSurfaceRegistryDiagramSnapshot() {
  return {
    ...surfaceRegistryDiagramContract,
    registry: createSurfaceRegistrySnapshot(),
    rows: orderedInteractionLayerShellFamilies.map((shellFamily) =>
      rowForPlan(resolveSurfaceMountPlan({ shellFamily })),
    ),
  } as const;
}

export function renderSurfaceRegistryDiagramText(row: SurfaceRegistryDiagramRow) {
  return [
    row.shell_family,
    row.allowed_primary_surface_codes.join(" -> "),
    row.promoted_support_surface_code,
    row.support_budget_label,
    row.focus_return_label,
  ].join(" | ");
}
