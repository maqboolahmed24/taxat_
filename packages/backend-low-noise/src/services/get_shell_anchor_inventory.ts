import type {
  SemanticAccessibilityContract,
  SemanticAccessibilityContractAnchorCode,
  SemanticAccessibilityContractFocusRegionCode,
} from "../../../generated-models/src/generated/typescript/surface-and-experience.ts";

export type SemanticAccessibilitySurfaceType =
  | "LowNoiseExperienceFrame"
  | "WorkspaceSnapshot"
  | "ClientPortalWorkspace"
  | "TenantGovernanceSnapshot"
  | "NativeOperatorWorkspaceScene"
  | "NativeOperatorSecondaryWindowScene";

export type SemanticAccessibilityRouteVariant =
  | "LOW_NOISE_FRAME"
  | "COLLABORATION_WORKSPACE"
  | "PORTAL_WORKSPACE"
  | "PORTAL_CONTEXTUAL_ROUTE"
  | "GOVERNANCE_OVERVIEW"
  | "NATIVE_OPERATOR_PRIMARY"
  | "NATIVE_OPERATOR_SECONDARY";

export type SemanticAccessibilityShellFamily = SemanticAccessibilityContract["shell_family"];
export type SemanticAccessibilitySelectorProfile = SemanticAccessibilityContract["selector_profile"];

export type ShellAnchorInventory = {
  artifact_handoff_current_history_policy: "CURRENT_AND_HISTORY_ANCHORS_SEPARATE";
  browser_identifier_by_anchor_code: Readonly<
    Partial<Record<SemanticAccessibilityContractAnchorCode, string>>
  >;
  limitation_notice_addressable: boolean;
  native_identifier_by_anchor_code: Readonly<
    Partial<Record<SemanticAccessibilityContractAnchorCode, string>>
  >;
  recovery_notice_addressable: boolean;
  required_anchor_codes: SemanticAccessibilityContractAnchorCode[];
  return_path_control_required: boolean;
  route_variant: SemanticAccessibilityRouteVariant;
  selector_profile: SemanticAccessibilitySelectorProfile;
  semantic_anchor_refs_by_code: Readonly<
    Partial<Record<SemanticAccessibilityContractAnchorCode, string>>
  >;
  semantic_focus_order: SemanticAccessibilityContractFocusRegionCode[];
  shell_family: SemanticAccessibilityShellFamily;
  surface_type: SemanticAccessibilitySurfaceType;
};

type SurfaceSpec = {
  defaultRouteVariant: SemanticAccessibilityRouteVariant;
  requiredAnchorCodes: readonly SemanticAccessibilityContractAnchorCode[];
  returnPathControlRequired: boolean;
  selectorProfile: SemanticAccessibilitySelectorProfile;
  semanticFocusOrder: readonly SemanticAccessibilityContractFocusRegionCode[];
  shellFamily: SemanticAccessibilityShellFamily;
};

export const semanticAccessibilityRouteVariantSurface = Object.freeze({
  COLLABORATION_WORKSPACE: "WorkspaceSnapshot",
  GOVERNANCE_OVERVIEW: "TenantGovernanceSnapshot",
  LOW_NOISE_FRAME: "LowNoiseExperienceFrame",
  NATIVE_OPERATOR_PRIMARY: "NativeOperatorWorkspaceScene",
  NATIVE_OPERATOR_SECONDARY: "NativeOperatorSecondaryWindowScene",
  PORTAL_CONTEXTUAL_ROUTE: "ClientPortalWorkspace",
  PORTAL_WORKSPACE: "ClientPortalWorkspace",
} as const satisfies Record<SemanticAccessibilityRouteVariant, SemanticAccessibilitySurfaceType>);

export const semanticAccessibilitySurfaceSpecs = Object.freeze({
  LowNoiseExperienceFrame: {
    defaultRouteVariant: "LOW_NOISE_FRAME",
    requiredAnchorCodes: [
      "SHELL_ROOT",
      "SHELL_FAMILY",
      "OBJECT_ANCHOR",
      "DOMINANT_QUESTION",
      "DOMINANT_ACTION",
      "SETTLEMENT_POSTURE",
      "RECOVERY_POSTURE",
      "CONTEXT_BAR",
      "DECISION_SUMMARY",
      "ACTION_STRIP",
      "PRIMARY_ACTION",
      "NO_SAFE_ACTION_REASON",
      "DETAIL_DRAWER",
      "PROMOTED_SUPPORT_REGION",
      "LIMITATION_NOTICE",
      "RECOVERY_NOTICE",
      "ARTIFACT_HANDOFF",
      "ARTIFACT_STATE_LABEL",
    ],
    returnPathControlRequired: false,
    selectorProfile: "OPERATOR_SEMANTIC_SELECTORS_V1",
    semanticFocusOrder: ["CONTEXT_BAR", "DECISION_SUMMARY", "ACTION_STRIP", "DETAIL_DRAWER"],
    shellFamily: "CALM_SHELL",
  },
  WorkspaceSnapshot: {
    defaultRouteVariant: "COLLABORATION_WORKSPACE",
    requiredAnchorCodes: [
      "SHELL_ROOT",
      "SHELL_FAMILY",
      "OBJECT_ANCHOR",
      "DOMINANT_QUESTION",
      "DOMINANT_ACTION",
      "SETTLEMENT_POSTURE",
      "RECOVERY_POSTURE",
      "CONTEXT_BAR",
      "DECISION_SUMMARY",
      "ACTION_STRIP",
      "PRIMARY_ACTION",
      "NO_SAFE_ACTION_REASON",
      "DETAIL_DRAWER",
      "PROMOTED_SUPPORT_REGION",
      "LIMITATION_NOTICE",
      "RECOVERY_NOTICE",
      "ARTIFACT_HANDOFF",
      "ARTIFACT_STATE_LABEL",
      "RETURN_PATH_CONTROL",
    ],
    returnPathControlRequired: true,
    selectorProfile: "OPERATOR_SEMANTIC_SELECTORS_V1",
    semanticFocusOrder: ["CONTEXT_BAR", "DECISION_SUMMARY", "ACTION_STRIP", "DETAIL_DRAWER"],
    shellFamily: "CALM_SHELL",
  },
  ClientPortalWorkspace: {
    defaultRouteVariant: "PORTAL_WORKSPACE",
    requiredAnchorCodes: [
      "SHELL_ROOT",
      "SHELL_FAMILY",
      "OBJECT_ANCHOR",
      "DOMINANT_QUESTION",
      "DOMINANT_ACTION",
      "SETTLEMENT_POSTURE",
      "RECOVERY_POSTURE",
      "WORKSPACE_POSTURE",
      "PRIMARY_ACTION",
      "PROMOTED_SUPPORT_REGION",
      "ROUTE_TABS",
      "LIMITATION_NOTICE",
      "RECOVERY_NOTICE",
      "RETURN_PATH_CONTROL",
      "REQUEST_FOCUS",
      "ARTIFACT_HANDOFF",
      "CURRENT_ARTIFACT",
      "HISTORY_LIST",
    ],
    returnPathControlRequired: true,
    selectorProfile: "PORTAL_SEMANTIC_SELECTORS_V1",
    semanticFocusOrder: [
      "PORTAL_HEADER",
      "STATUS_HERO",
      "PRIMARY_ACTION",
      "PROMOTED_SUPPORT_REGION",
      "SUPPORTING_DETAIL",
    ],
    shellFamily: "CLIENT_PORTAL_SHELL",
  },
  TenantGovernanceSnapshot: {
    defaultRouteVariant: "GOVERNANCE_OVERVIEW",
    requiredAnchorCodes: [
      "SHELL_ROOT",
      "SHELL_FAMILY",
      "OBJECT_ANCHOR",
      "DOMINANT_QUESTION",
      "DOMINANT_ACTION",
      "SETTLEMENT_POSTURE",
      "RECOVERY_POSTURE",
      "SECTION_NAV",
      "PRIMARY_WORKLIST",
      "WORKSPACE_HEADER",
      "ATTENTION_SUMMARY",
      "PROMOTED_SUPPORT_REGION",
      "LIMITATION_NOTICE",
      "RECOVERY_NOTICE",
      "RISK_LEDGER",
    ],
    returnPathControlRequired: false,
    selectorProfile: "GOVERNANCE_SEMANTIC_SELECTORS_V1",
    semanticFocusOrder: [
      "SECTION_NAV",
      "PRIMARY_WORKLIST",
      "WORKSPACE_HEADER",
      "ATTENTION_SUMMARY",
      "PROMOTED_AUXILIARY_SURFACE",
    ],
    shellFamily: "GOVERNANCE_DENSITY_SHELL",
  },
  NativeOperatorWorkspaceScene: {
    defaultRouteVariant: "NATIVE_OPERATOR_PRIMARY",
    requiredAnchorCodes: [
      "SHELL_ROOT",
      "SHELL_FAMILY",
      "OBJECT_ANCHOR",
      "DOMINANT_QUESTION",
      "DOMINANT_ACTION",
      "SETTLEMENT_POSTURE",
      "RECOVERY_POSTURE",
      "LEADING_SIDEBAR",
      "PRIMARY_CANVAS",
      "TRAILING_INSPECTOR",
      "DECISION_SUMMARY",
      "ACTION_STRIP",
      "PRIMARY_ACTION",
      "DETAIL_DRAWER",
      "PROMOTED_SUPPORT_REGION",
      "RECOVERY_NOTICE",
    ],
    returnPathControlRequired: false,
    selectorProfile: "OPERATOR_SEMANTIC_SELECTORS_V1",
    semanticFocusOrder: ["LEADING_SIDEBAR", "PRIMARY_CANVAS", "TRAILING_INSPECTOR"],
    shellFamily: "CALM_SHELL",
  },
  NativeOperatorSecondaryWindowScene: {
    defaultRouteVariant: "NATIVE_OPERATOR_SECONDARY",
    requiredAnchorCodes: [
      "SHELL_ROOT",
      "SHELL_FAMILY",
      "OBJECT_ANCHOR",
      "DOMINANT_QUESTION",
      "SETTLEMENT_POSTURE",
      "RECOVERY_POSTURE",
      "IDENTITY_HEADER",
      "SUMMARY_CARD",
      "DETAIL_BODY",
      "ARTIFACT_HANDOFF",
      "ARTIFACT_STATE_LABEL",
      "RETURN_PATH_CONTROL",
      "RECOVERY_NOTICE",
    ],
    returnPathControlRequired: true,
    selectorProfile: "OPERATOR_SEMANTIC_SELECTORS_V1",
    semanticFocusOrder: ["IDENTITY_HEADER", "SUMMARY_CARD", "DETAIL_BODY"],
    shellFamily: "CALM_SHELL",
  },
} as const satisfies Record<SemanticAccessibilitySurfaceType, SurfaceSpec>);

const surfaceAnchorRefOverrides: Readonly<
  Partial<
    Record<
      SemanticAccessibilitySurfaceType,
      Partial<Record<SemanticAccessibilityContractAnchorCode, string>>
    >
  >
> = Object.freeze({
  ClientPortalWorkspace: {
    ARTIFACT_HANDOFF: "portal-artifact-handoff",
    CURRENT_ARTIFACT: "portal-current-artifact",
    HISTORY_LIST: "portal-history-list",
    PRIMARY_ACTION: "portal-primary-action",
    PROMOTED_SUPPORT_REGION: "portal-support-panel",
    RECOVERY_NOTICE: "portal-inline-recovery",
    REQUEST_FOCUS: "portal-request-focus",
    ROUTE_TABS: "portal-route-tabs",
    SHELL_ROOT: "portal-shell",
    WORKSPACE_POSTURE: "portal-workspace-posture",
  },
  LowNoiseExperienceFrame: {
    NO_SAFE_ACTION_REASON: "no-safe-action",
    SHELL_ROOT: "low-noise-shell",
  },
  TenantGovernanceSnapshot: {
    ATTENTION_SUMMARY: "overview-attention-summary",
    OBJECT_ANCHOR: "governance-object-anchor",
    PRIMARY_WORKLIST: "governance-primary-worklist",
    PROMOTED_SUPPORT_REGION: "governance-support-sidecar",
    RECOVERY_POSTURE: "governance-recovery-posture",
    RISK_LEDGER: "governance-risk-ledger",
    SECTION_NAV: "governance-section-nav",
    SETTLEMENT_POSTURE: "governance-settlement-posture",
    SHELL_FAMILY: "governance-shell-family",
    SHELL_ROOT: "governance-context-bar",
  },
});

function toKebabAnchor(anchorCode: SemanticAccessibilityContractAnchorCode): string {
  return anchorCode.toLowerCase().replaceAll("_", "-");
}

function cloneArray<T>(values: readonly T[]): T[] {
  return [...values];
}

function resolveSurfaceType(input: {
  routeVariant?: SemanticAccessibilityRouteVariant | undefined;
  surfaceType?: SemanticAccessibilitySurfaceType | undefined;
}): SemanticAccessibilitySurfaceType {
  if (input.surfaceType !== undefined && input.routeVariant !== undefined) {
    const routeSurfaceType = semanticAccessibilityRouteVariantSurface[input.routeVariant];
    if (routeSurfaceType !== input.surfaceType) {
      throw new Error(
        `routeVariant ${input.routeVariant} is owned by ${routeSurfaceType}, not ${input.surfaceType}`,
      );
    }
  }
  if (input.surfaceType !== undefined) {
    return input.surfaceType;
  }
  if (input.routeVariant !== undefined) {
    return semanticAccessibilityRouteVariantSurface[input.routeVariant];
  }
  throw new Error("surfaceType or routeVariant is required");
}

function buildSemanticAnchorRefs(input: {
  requiredAnchorCodes: readonly SemanticAccessibilityContractAnchorCode[];
  surfaceType: SemanticAccessibilitySurfaceType;
}): Readonly<Partial<Record<SemanticAccessibilityContractAnchorCode, string>>> {
  const overrides = surfaceAnchorRefOverrides[input.surfaceType] ?? {};
  const refs: Partial<Record<SemanticAccessibilityContractAnchorCode, string>> = {};
  for (const anchorCode of input.requiredAnchorCodes) {
    refs[anchorCode] = overrides[anchorCode] ?? toKebabAnchor(anchorCode);
  }
  return Object.freeze(refs);
}

export function semanticAccessibilitySurfaceTypeForRouteVariant(
  routeVariant: SemanticAccessibilityRouteVariant,
): SemanticAccessibilitySurfaceType {
  return semanticAccessibilityRouteVariantSurface[routeVariant];
}

export function getShellAnchorInventory(input: {
  routeVariant?: SemanticAccessibilityRouteVariant | undefined;
  surfaceType?: SemanticAccessibilitySurfaceType | undefined;
}): ShellAnchorInventory {
  const surfaceType = resolveSurfaceType(input);
  const spec = semanticAccessibilitySurfaceSpecs[surfaceType];
  const requiredAnchorCodes: readonly SemanticAccessibilityContractAnchorCode[] =
    spec.requiredAnchorCodes;
  const semanticFocusOrder: readonly SemanticAccessibilityContractFocusRegionCode[] =
    spec.semanticFocusOrder;
  const routeVariant = input.routeVariant ?? spec.defaultRouteVariant;
  const semanticAnchorRefsByCode = buildSemanticAnchorRefs({
    requiredAnchorCodes,
    surfaceType,
  });

  return {
    artifact_handoff_current_history_policy: "CURRENT_AND_HISTORY_ANCHORS_SEPARATE",
    browser_identifier_by_anchor_code: semanticAnchorRefsByCode,
    limitation_notice_addressable: requiredAnchorCodes.includes("LIMITATION_NOTICE"),
    native_identifier_by_anchor_code: semanticAnchorRefsByCode,
    recovery_notice_addressable: requiredAnchorCodes.includes("RECOVERY_NOTICE"),
    required_anchor_codes: cloneArray(requiredAnchorCodes),
    return_path_control_required: spec.returnPathControlRequired,
    route_variant: routeVariant,
    selector_profile: spec.selectorProfile,
    semantic_anchor_refs_by_code: semanticAnchorRefsByCode,
    semantic_focus_order: cloneArray(semanticFocusOrder),
    shell_family: spec.shellFamily,
    surface_type: surfaceType,
  };
}
