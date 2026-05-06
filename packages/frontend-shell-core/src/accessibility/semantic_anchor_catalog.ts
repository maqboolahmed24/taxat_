import type {
  SelectorProfile,
  SemanticAccessibilityContract,
  ShellFamilyCode,
} from "../route_contracts/semantic_accessibility";

export type SemanticAnchorCode =
  | "SHELL_ROOT"
  | "SHELL_FAMILY"
  | "OBJECT_ANCHOR"
  | "DOMINANT_QUESTION"
  | "DOMINANT_ACTION"
  | "SETTLEMENT_POSTURE"
  | "RECOVERY_POSTURE"
  | "WORKSPACE_POSTURE"
  | "CONTEXT_BAR"
  | "DECISION_SUMMARY"
  | "ACTION_STRIP"
  | "PRIMARY_ACTION"
  | "NO_SAFE_ACTION_REASON"
  | "DETAIL_DRAWER"
  | "PROMOTED_SUPPORT_REGION"
  | "LIMITATION_NOTICE"
  | "RECOVERY_NOTICE"
  | "ARTIFACT_HANDOFF"
  | "ARTIFACT_STATE_LABEL"
  | "RETURN_PATH_CONTROL"
  | "ROUTE_TABS"
  | "REQUEST_FOCUS"
  | "CURRENT_ARTIFACT"
  | "HISTORY_LIST"
  | "SECTION_NAV"
  | "PRIMARY_WORKLIST"
  | "WORKSPACE_HEADER"
  | "ATTENTION_SUMMARY"
  | "RISK_LEDGER"
  | "LEADING_SIDEBAR"
  | "PRIMARY_CANVAS"
  | "TRAILING_INSPECTOR"
  | "IDENTITY_HEADER"
  | "SUMMARY_CARD"
  | "DETAIL_BODY";

export type SemanticFocusRegionCode =
  | "CONTEXT_BAR"
  | "DECISION_SUMMARY"
  | "ACTION_STRIP"
  | "DETAIL_DRAWER"
  | "PORTAL_HEADER"
  | "STATUS_HERO"
  | "PRIMARY_ACTION"
  | "PROMOTED_SUPPORT_REGION"
  | "SUPPORTING_DETAIL"
  | "SECTION_NAV"
  | "PRIMARY_WORKLIST"
  | "WORKSPACE_HEADER"
  | "ATTENTION_SUMMARY"
  | "PROMOTED_AUXILIARY_SURFACE"
  | "LEADING_SIDEBAR"
  | "PRIMARY_CANVAS"
  | "TRAILING_INSPECTOR"
  | "IDENTITY_HEADER"
  | "SUMMARY_CARD"
  | "DETAIL_BODY";

export type AnnouncedChangeKind =
  | "ACTIVITY_DELTA"
  | "BADGE_DELTA"
  | "LIMITATION_NOTICE"
  | "RECOVERY_NOTICE"
  | "COMMAND_FAILURE"
  | "TERMINAL_SETTLEMENT";

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

export type SemanticAnchorCatalogErrorCode =
  | "SEMANTIC_ANCHOR_DUPLICATE_CODE"
  | "SEMANTIC_ANCHOR_DUPLICATE_REF"
  | "SEMANTIC_IDENTIFIER_DRIFT"
  | "SEMANTIC_LIMITATION_NOTICE_REQUIRED"
  | "SEMANTIC_ANCHOR_MISSING_REQUIRED"
  | "SEMANTIC_ANCHOR_UNKNOWN_CODE"
  | "SEMANTIC_ANCHOR_SURFACE_ROUTE_MISMATCH"
  | "SEMANTIC_LIVE_UPDATE_FOCUS_THEFT"
  | "SEMANTIC_VISUAL_SELECTOR_FORBIDDEN";

export class SemanticAnchorCatalogError extends Error {
  readonly code: SemanticAnchorCatalogErrorCode;
  readonly details: Readonly<Record<string, unknown>>;

  constructor(
    code: SemanticAnchorCatalogErrorCode,
    message: string,
    details: Readonly<Record<string, unknown>> = {},
  ) {
    super(message);
    this.name = "SemanticAnchorCatalogError";
    this.code = code;
    this.details = details;
  }
}

export type SemanticAnchorCatalogEntry = {
  anchor_code: SemanticAnchorCode;
  semantic_anchor_ref: string;
  browser_identifier: string;
  native_identifier: string;
  label: string;
  aria_label: string;
  landmark_role_or_null: string | null;
  role: string;
  heading_level_or_null: 1 | 2 | 3 | 4 | 5 | 6 | null;
  focus_region_code_or_null: SemanticFocusRegionCode | null;
  live_region_mode_or_null: "polite" | "assertive" | null;
  required: boolean;
  shell_family: ShellFamilyCode;
  selector_profile: SelectorProfile;
  surface_type: SemanticAccessibilitySurfaceType;
};

export type SemanticAnchorAttributes = {
  "aria-label"?: string;
  "aria-labelledby"?: string;
  "aria-live"?: "polite" | "assertive";
  "data-native-identifier": string;
  "data-semantic-anchor-code": SemanticAnchorCode;
  "data-testid": string;
  role?: string;
  tabIndex?: number;
};

type SurfaceSpec = {
  defaultRouteVariant: SemanticAccessibilityRouteVariant;
  requiredAnchorCodes: readonly SemanticAnchorCode[];
  returnPathControlRequired: boolean;
  selectorProfile: SelectorProfile;
  semanticFocusOrder: readonly SemanticFocusRegionCode[];
  shellFamily: ShellFamilyCode;
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
} as const satisfies Record<SemanticAccessibilitySurfaceType, SurfaceSpec>);

const anchorRefOverrides: Readonly<
  Partial<
    Record<
      SemanticAccessibilitySurfaceType,
      Partial<Record<SemanticAnchorCode, string>>
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
  NativeOperatorSecondaryWindowScene: {
    SHELL_ROOT: "native-secondary-window",
  },
  NativeOperatorWorkspaceScene: {
    SHELL_ROOT: "native-operator-workspace",
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

const anchorLabels = Object.freeze({
  ACTION_STRIP: "Action strip",
  ARTIFACT_HANDOFF: "Artifact handoff",
  ARTIFACT_STATE_LABEL: "Artifact state",
  ATTENTION_SUMMARY: "Attention summary",
  CONTEXT_BAR: "Context bar",
  CURRENT_ARTIFACT: "Current artifact",
  DECISION_SUMMARY: "Decision summary",
  DETAIL_BODY: "Detail body",
  DETAIL_DRAWER: "Detail drawer",
  DOMINANT_ACTION: "Dominant action",
  DOMINANT_QUESTION: "Dominant question",
  HISTORY_LIST: "History list",
  IDENTITY_HEADER: "Identity header",
  LEADING_SIDEBAR: "Leading sidebar",
  LIMITATION_NOTICE: "Limitation notice",
  NO_SAFE_ACTION_REASON: "No safe action reason",
  OBJECT_ANCHOR: "Object anchor",
  PRIMARY_ACTION: "Primary action",
  PRIMARY_CANVAS: "Primary canvas",
  PRIMARY_WORKLIST: "Primary worklist",
  PROMOTED_SUPPORT_REGION: "Promoted support region",
  RECOVERY_NOTICE: "Recovery notice",
  RECOVERY_POSTURE: "Recovery posture",
  REQUEST_FOCUS: "Request focus",
  RETURN_PATH_CONTROL: "Return path control",
  RISK_LEDGER: "Risk ledger",
  ROUTE_TABS: "Route tabs",
  SECTION_NAV: "Section navigation",
  SETTLEMENT_POSTURE: "Settlement posture",
  SHELL_FAMILY: "Shell family",
  SHELL_ROOT: "Shell root",
  SUMMARY_CARD: "Summary card",
  TRAILING_INSPECTOR: "Trailing inspector",
  WORKSPACE_HEADER: "Workspace header",
  WORKSPACE_POSTURE: "Workspace posture",
} as const satisfies Record<SemanticAnchorCode, string>);

const roleByAnchorCode: Readonly<Partial<Record<SemanticAnchorCode, string>>> = Object.freeze({
  ACTION_STRIP: "toolbar",
  CONTEXT_BAR: "navigation",
  CURRENT_ARTIFACT: "region",
  DECISION_SUMMARY: "region",
  DETAIL_BODY: "region",
  DETAIL_DRAWER: "complementary",
  HISTORY_LIST: "list",
  IDENTITY_HEADER: "banner",
  LEADING_SIDEBAR: "navigation",
  LIMITATION_NOTICE: "status",
  PRIMARY_ACTION: "button",
  PRIMARY_CANVAS: "region",
  PRIMARY_WORKLIST: "navigation",
  PROMOTED_SUPPORT_REGION: "complementary",
  RECOVERY_NOTICE: "status",
  RETURN_PATH_CONTROL: "button",
  ROUTE_TABS: "tablist",
  SECTION_NAV: "navigation",
  SHELL_ROOT: "main",
  SUMMARY_CARD: "region",
  TRAILING_INSPECTOR: "complementary",
  WORKSPACE_HEADER: "banner",
});

const headingLevelByAnchorCode: Readonly<Partial<Record<SemanticAnchorCode, 1 | 2 | 3>>> =
  Object.freeze({
    ATTENTION_SUMMARY: 2,
    DECISION_SUMMARY: 2,
    DETAIL_BODY: 2,
    DETAIL_DRAWER: 2,
    DOMINANT_QUESTION: 1,
    IDENTITY_HEADER: 1,
    PRIMARY_CANVAS: 2,
    PROMOTED_SUPPORT_REGION: 2,
    SHELL_ROOT: 1,
    SUMMARY_CARD: 2,
    WORKSPACE_HEADER: 2,
  });

const focusRegionByAnchorCode: Readonly<Partial<Record<SemanticAnchorCode, SemanticFocusRegionCode>>> =
  Object.freeze({
    ACTION_STRIP: "ACTION_STRIP",
    ATTENTION_SUMMARY: "ATTENTION_SUMMARY",
    CONTEXT_BAR: "CONTEXT_BAR",
    DECISION_SUMMARY: "DECISION_SUMMARY",
    DETAIL_BODY: "DETAIL_BODY",
    DETAIL_DRAWER: "DETAIL_DRAWER",
    IDENTITY_HEADER: "IDENTITY_HEADER",
    LEADING_SIDEBAR: "LEADING_SIDEBAR",
    PRIMARY_ACTION: "PRIMARY_ACTION",
    PRIMARY_CANVAS: "PRIMARY_CANVAS",
    PRIMARY_WORKLIST: "PRIMARY_WORKLIST",
    PROMOTED_SUPPORT_REGION: "PROMOTED_SUPPORT_REGION",
    SECTION_NAV: "SECTION_NAV",
    SUMMARY_CARD: "SUMMARY_CARD",
    TRAILING_INSPECTOR: "TRAILING_INSPECTOR",
    WORKSPACE_HEADER: "WORKSPACE_HEADER",
  });

const focusRegionOverrides: Readonly<
  Partial<
    Record<
      SemanticAccessibilitySurfaceType,
      Partial<Record<SemanticAnchorCode, SemanticFocusRegionCode>>
    >
  >
> = Object.freeze({
  ClientPortalWorkspace: {
    DOMINANT_QUESTION: "STATUS_HERO",
    HISTORY_LIST: "SUPPORTING_DETAIL",
    SHELL_ROOT: "PORTAL_HEADER",
  },
  TenantGovernanceSnapshot: {
    PROMOTED_SUPPORT_REGION: "PROMOTED_AUXILIARY_SURFACE",
  },
});

const liveRegionByAnchorCode: Readonly<Partial<Record<SemanticAnchorCode, "polite" | "assertive">>> =
  Object.freeze({
    LIMITATION_NOTICE: "polite",
    RECOVERY_NOTICE: "assertive",
  });

function toKebabAnchor(anchorCode: SemanticAnchorCode) {
  return anchorCode.toLowerCase().replaceAll("_", "-");
}

function resolveSurfaceType(input: {
  routeVariant?: SemanticAccessibilityRouteVariant | undefined;
  surfaceType?: SemanticAccessibilitySurfaceType | undefined;
}) {
  if (input.surfaceType !== undefined && input.routeVariant !== undefined) {
    const routeSurfaceType = semanticAccessibilityRouteVariantSurface[input.routeVariant];
    if (routeSurfaceType !== input.surfaceType) {
      throw new SemanticAnchorCatalogError(
        "SEMANTIC_ANCHOR_SURFACE_ROUTE_MISMATCH",
        `${input.routeVariant} is owned by ${routeSurfaceType}, not ${input.surfaceType}.`,
        input,
      );
    }
  }
  if (input.surfaceType !== undefined) {
    return input.surfaceType;
  }
  if (input.routeVariant !== undefined) {
    return semanticAccessibilityRouteVariantSurface[input.routeVariant];
  }
  return "LowNoiseExperienceFrame";
}

export function getSemanticAccessibilitySurfaceSpec(surfaceType: SemanticAccessibilitySurfaceType) {
  return semanticAccessibilitySurfaceSpecs[surfaceType];
}

export function semanticAnchorRefForCode(
  surfaceType: SemanticAccessibilitySurfaceType,
  anchorCode: SemanticAnchorCode,
) {
  return anchorRefOverrides[surfaceType]?.[anchorCode] ?? toKebabAnchor(anchorCode);
}

export function getSemanticAnchorCatalog(input: {
  routeVariant?: SemanticAccessibilityRouteVariant | undefined;
  surfaceType?: SemanticAccessibilitySurfaceType | undefined;
} = {}) {
  const surfaceType = resolveSurfaceType(input);
  const spec = semanticAccessibilitySurfaceSpecs[surfaceType];
  return spec.requiredAnchorCodes.map((anchorCode) => {
    const semanticAnchorRef = semanticAnchorRefForCode(surfaceType, anchorCode);
    return {
      anchor_code: anchorCode,
      aria_label: anchorLabels[anchorCode],
      browser_identifier: semanticAnchorRef,
      focus_region_code_or_null:
        focusRegionOverrides[surfaceType]?.[anchorCode] ?? focusRegionByAnchorCode[anchorCode] ?? null,
      heading_level_or_null: headingLevelByAnchorCode[anchorCode] ?? null,
      label: anchorLabels[anchorCode],
      landmark_role_or_null: roleByAnchorCode[anchorCode] ?? null,
      live_region_mode_or_null: liveRegionByAnchorCode[anchorCode] ?? null,
      native_identifier: semanticAnchorRef,
      required: true,
      role: roleByAnchorCode[anchorCode] ?? "region",
      selector_profile: spec.selectorProfile,
      semantic_anchor_ref: semanticAnchorRef,
      shell_family: spec.shellFamily,
      surface_type: surfaceType,
    } satisfies SemanticAnchorCatalogEntry;
  });
}

export function buildCalmDetailEntryAnchor(moduleCode: string) {
  const safeModuleCode = moduleCode.trim().toLowerCase().replace(/[^a-z0-9-]+/gu, "-");
  if (safeModuleCode.length === 0) {
    throw new SemanticAnchorCatalogError(
      "SEMANTIC_ANCHOR_MISSING_REQUIRED",
      "Detail entry module code must produce a stable semantic anchor.",
    );
  }
  const semanticAnchorRef = `detail-entry-${safeModuleCode}`;
  return {
    anchor_code: "DETAIL_DRAWER",
    aria_label: `Detail entry ${safeModuleCode}`,
    browser_identifier: semanticAnchorRef,
    focus_region_code_or_null: "DETAIL_DRAWER",
    heading_level_or_null: 3,
    label: `Detail entry ${safeModuleCode}`,
    landmark_role_or_null: "region",
    live_region_mode_or_null: null,
    native_identifier: semanticAnchorRef,
    required: false,
    role: "region",
    selector_profile: "OPERATOR_SEMANTIC_SELECTORS_V1",
    semantic_anchor_ref: semanticAnchorRef,
    shell_family: "CALM_SHELL",
    surface_type: "LowNoiseExperienceFrame",
  } satisfies SemanticAnchorCatalogEntry;
}

export function assertUniqueSemanticAnchors(entries: readonly SemanticAnchorCatalogEntry[]) {
  const seenCodes = new Set<string>();
  const seenRefs = new Set<string>();
  for (const entry of entries) {
    if (seenCodes.has(entry.anchor_code)) {
      throw new SemanticAnchorCatalogError(
        "SEMANTIC_ANCHOR_DUPLICATE_CODE",
        `${entry.anchor_code} appears twice in the same semantic scope.`,
        { anchor_code: entry.anchor_code },
      );
    }
    if (seenRefs.has(entry.semantic_anchor_ref)) {
      throw new SemanticAnchorCatalogError(
        "SEMANTIC_ANCHOR_DUPLICATE_REF",
        `${entry.semantic_anchor_ref} appears twice in the same semantic scope.`,
        { semantic_anchor_ref: entry.semantic_anchor_ref },
      );
    }
    seenCodes.add(entry.anchor_code);
    seenRefs.add(entry.semantic_anchor_ref);
  }
  return entries;
}

export function assertSemanticIdentifierParity(entries: readonly SemanticAnchorCatalogEntry[]) {
  for (const entry of entries) {
    if (
      entry.semantic_anchor_ref !== entry.browser_identifier ||
      entry.semantic_anchor_ref !== entry.native_identifier
    ) {
      throw new SemanticAnchorCatalogError(
        "SEMANTIC_IDENTIFIER_DRIFT",
        `${entry.anchor_code} identifiers must mirror ${entry.semantic_anchor_ref}.`,
        {
          anchor_code: entry.anchor_code,
          browser_identifier: entry.browser_identifier,
          native_identifier: entry.native_identifier,
          semantic_anchor_ref: entry.semantic_anchor_ref,
        },
      );
    }
  }
  return entries;
}

export function assertRequiredSemanticAnchors(input: {
  entries: readonly SemanticAnchorCatalogEntry[];
  surfaceType: SemanticAccessibilitySurfaceType;
}) {
  const spec = semanticAccessibilitySurfaceSpecs[input.surfaceType];
  const presentCodes = new Set(input.entries.map((entry) => entry.anchor_code));
  const missingCodes = spec.requiredAnchorCodes.filter((anchorCode) => !presentCodes.has(anchorCode));
  if (missingCodes.length > 0) {
    throw new SemanticAnchorCatalogError(
      "SEMANTIC_ANCHOR_MISSING_REQUIRED",
      `${input.surfaceType} is missing required semantic anchors: ${missingCodes.join(", ")}.`,
      { missing_anchor_codes: missingCodes, surface_type: input.surfaceType },
    );
  }
  return input.entries;
}

export function assertLimitationNoticeAnchorPresent(input: {
  entries: readonly SemanticAnchorCatalogEntry[];
  hiddenOrLimitedContentRequiresNotice: boolean;
}) {
  if (
    input.hiddenOrLimitedContentRequiresNotice &&
    !input.entries.some((entry) => entry.anchor_code === "LIMITATION_NOTICE")
  ) {
    throw new SemanticAnchorCatalogError(
      "SEMANTIC_LIMITATION_NOTICE_REQUIRED",
      "Hidden or limited content must publish an addressable limitation notice anchor.",
    );
  }
  return input.entries;
}

export function assertLiveUpdatePreservesActiveFocus(input: {
  activeFocusKind: "COMPOSER" | "EDITOR" | "FILE_PICKER" | "COMPARE_CONTROL" | null;
  focusMoved: boolean;
}) {
  if (input.activeFocusKind !== null && input.focusMoved) {
    throw new SemanticAnchorCatalogError(
      "SEMANTIC_LIVE_UPDATE_FOCUS_THEFT",
      `Live update moved focus from active ${input.activeFocusKind}.`,
      input,
    );
  }
  return true;
}

const forbiddenVisualSelectorFragments = [
  "left-column",
  "right-column",
  "middle-column",
  "hero-card",
  "metric-wall",
  "purple-orb",
  "visual-grid",
] as const;

export function assertNoVisualSelectorIdentifiers(entries: readonly SemanticAnchorCatalogEntry[]) {
  for (const entry of entries) {
    const identifierText = [
      entry.semantic_anchor_ref,
      entry.browser_identifier,
      entry.native_identifier,
    ].join(" ");
    const forbiddenFragment = forbiddenVisualSelectorFragments.find((fragment) =>
      identifierText.includes(fragment),
    );
    if (forbiddenFragment !== undefined) {
      throw new SemanticAnchorCatalogError(
        "SEMANTIC_VISUAL_SELECTOR_FORBIDDEN",
        `${entry.anchor_code} uses visual selector fragment ${forbiddenFragment}.`,
        { anchor_code: entry.anchor_code, forbidden_fragment: forbiddenFragment },
      );
    }
  }
  return entries;
}

export function assertSemanticAnchorCatalog(
  entries: readonly SemanticAnchorCatalogEntry[],
  surfaceType: SemanticAccessibilitySurfaceType,
) {
  assertUniqueSemanticAnchors(entries);
  assertSemanticIdentifierParity(entries);
  assertRequiredSemanticAnchors({ entries, surfaceType });
  assertLimitationNoticeAnchorPresent({
    entries,
    hiddenOrLimitedContentRequiresNotice:
      semanticAccessibilitySurfaceSpecs[surfaceType].requiredAnchorCodes.some(
        (anchorCode) => anchorCode === "LIMITATION_NOTICE",
      ),
  });
  assertNoVisualSelectorIdentifiers(entries);
  return entries;
}

export function getSemanticAnchorEntry(input: {
  anchorCode: SemanticAnchorCode;
  routeVariant?: SemanticAccessibilityRouteVariant | undefined;
  surfaceType?: SemanticAccessibilitySurfaceType | undefined;
}) {
  const entry = getSemanticAnchorCatalog(input).find(
    (candidate) => candidate.anchor_code === input.anchorCode,
  );
  if (!entry) {
    throw new SemanticAnchorCatalogError(
      "SEMANTIC_ANCHOR_UNKNOWN_CODE",
      `${input.anchorCode} is not registered for the requested semantic surface.`,
      input,
    );
  }
  return entry;
}

export function buildSemanticAnchorAttributes(
  entry: SemanticAnchorCatalogEntry,
  options: { labelledBy?: string | undefined; tabIndex?: number | undefined } = {},
) {
  const attributes: SemanticAnchorAttributes = {
    "data-native-identifier": entry.native_identifier,
    "data-semantic-anchor-code": entry.anchor_code,
    "data-testid": entry.browser_identifier,
  };
  if (entry.role) {
    attributes.role = entry.role;
  }
  if (options.labelledBy !== undefined) {
    attributes["aria-labelledby"] = options.labelledBy;
  } else {
    attributes["aria-label"] = entry.aria_label;
  }
  if (entry.live_region_mode_or_null !== null) {
    attributes["aria-live"] = entry.live_region_mode_or_null;
  }
  if (options.tabIndex !== undefined) {
    attributes.tabIndex = options.tabIndex;
  }
  return attributes;
}

export function buildRequiredAnchorContractFragment(input: {
  routeVariant?: SemanticAccessibilityRouteVariant | undefined;
  surfaceType?: SemanticAccessibilitySurfaceType | undefined;
}) {
  const surfaceType = resolveSurfaceType(input);
  const spec = semanticAccessibilitySurfaceSpecs[surfaceType];
  return {
    required_anchor_codes: [...spec.requiredAnchorCodes],
    selector_profile: spec.selectorProfile,
    semantic_focus_order: [...spec.semanticFocusOrder],
    shell_family: spec.shellFamily,
  } satisfies Pick<
    SemanticAccessibilityContract,
    "required_anchor_codes" | "selector_profile" | "semantic_focus_order" | "shell_family"
  >;
}
