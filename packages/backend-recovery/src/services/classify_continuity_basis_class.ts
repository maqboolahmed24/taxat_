import type { CrossDeviceContinuityContract } from "../../../generated-models/src/generated/typescript/surface-and-experience.ts";

export type ContinuityScope = CrossDeviceContinuityContract["continuity_scope"];
export type ContinuityShellFamily = CrossDeviceContinuityContract["shell_family"];
export type ContinuityCompatibilityBasisClass =
  CrossDeviceContinuityContract["compatibility_basis_class"];

export type ContinuitySurfaceType =
  | "LowNoiseExperienceFrame"
  | "WorkspaceSnapshot"
  | "ClientPortalWorkspace"
  | "WorkItemNotification"
  | "TenantGovernanceSnapshot"
  | "NativeOperatorWorkspaceScene"
  | "NativeOperatorSecondaryWindowScene";

export type ContinuitySurfaceMapping = {
  allowed_shell_families: readonly ContinuityShellFamily[];
  compatibility_basis_class: ContinuityCompatibilityBasisClass;
  continuity_scope: ContinuityScope;
};

export const continuitySurfaceMappings = {
  LowNoiseExperienceFrame: {
    allowed_shell_families: ["CALM_SHELL"],
    compatibility_basis_class: "ROUTE_GUARD_ONLY",
    continuity_scope: "MANIFEST_ROUTE",
  },
  WorkspaceSnapshot: {
    allowed_shell_families: ["CALM_SHELL", "CLIENT_PORTAL_SHELL"],
    compatibility_basis_class: "ROUTE_GUARD_AND_VISIBILITY",
    continuity_scope: "WORKSPACE_ROUTE",
  },
  ClientPortalWorkspace: {
    allowed_shell_families: ["CLIENT_PORTAL_SHELL"],
    compatibility_basis_class: "ROUTE_GUARD_AND_VISIBILITY",
    continuity_scope: "CLIENT_PORTAL_ROUTE",
  },
  WorkItemNotification: {
    allowed_shell_families: ["CALM_SHELL", "CLIENT_PORTAL_SHELL"],
    compatibility_basis_class: "VISIBILITY_ONLY",
    continuity_scope: "WORK_ITEM_NOTIFICATION",
  },
  TenantGovernanceSnapshot: {
    allowed_shell_families: ["GOVERNANCE_DENSITY_SHELL"],
    compatibility_basis_class: "ROUTE_GUARD_ONLY",
    continuity_scope: "GOVERNANCE_ROUTE",
  },
  NativeOperatorWorkspaceScene: {
    allowed_shell_families: ["CALM_SHELL"],
    compatibility_basis_class: "SESSION_MASKING_AND_ROUTE_GUARD",
    continuity_scope: "NATIVE_PRIMARY_SCENE",
  },
  NativeOperatorSecondaryWindowScene: {
    allowed_shell_families: ["CALM_SHELL"],
    compatibility_basis_class: "SESSION_MASKING_AND_PARENT_SCENE",
    continuity_scope: "NATIVE_SECONDARY_WINDOW",
  },
} as const satisfies Record<ContinuitySurfaceType, ContinuitySurfaceMapping>;

export class ContinuityBasisClassificationError extends Error {
  constructor(detail: string) {
    super(`CONTINUITY_BASIS_CLASSIFICATION_INVALID: ${detail}`);
    this.name = "ContinuityBasisClassificationError";
  }
}

export function continuityScopeForSurfaceType(surfaceType: ContinuitySurfaceType): ContinuityScope {
  return continuitySurfaceMappings[surfaceType].continuity_scope;
}

export function shellFamiliesForContinuitySurface(
  surfaceType: ContinuitySurfaceType,
): readonly ContinuityShellFamily[] {
  return continuitySurfaceMappings[surfaceType].allowed_shell_families;
}

export function classifyContinuityBasisClass(input: {
  continuity_scope?: ContinuityScope | undefined;
  surface_type?: ContinuitySurfaceType | undefined;
}): ContinuityCompatibilityBasisClass {
  if (input.surface_type !== undefined) {
    return continuitySurfaceMappings[input.surface_type].compatibility_basis_class;
  }

  switch (input.continuity_scope) {
    case "MANIFEST_ROUTE":
    case "GOVERNANCE_ROUTE":
      return "ROUTE_GUARD_ONLY";
    case "WORKSPACE_ROUTE":
    case "CLIENT_PORTAL_ROUTE":
      return "ROUTE_GUARD_AND_VISIBILITY";
    case "WORK_ITEM_NOTIFICATION":
      return "VISIBILITY_ONLY";
    case "NATIVE_PRIMARY_SCENE":
      return "SESSION_MASKING_AND_ROUTE_GUARD";
    case "NATIVE_SECONDARY_WINDOW":
      return "SESSION_MASKING_AND_PARENT_SCENE";
    default:
      throw new ContinuityBasisClassificationError(
        "continuity_scope or surface_type must identify one governed continuity surface",
      );
  }
}
