import {
  buildCalmDetailEntryAnchor,
  buildSemanticAccessibilityContract,
  buildSemanticAccessibilityRegressionPack,
  getSemanticAnchorCatalog,
  type SemanticAccessibilitySurfaceType,
} from "../../../frontend-shell-core/src/index";

export const semanticAccessibilitySurfaceTypes = [
  "LowNoiseExperienceFrame",
  "WorkspaceSnapshot",
  "ClientPortalWorkspace",
  "TenantGovernanceSnapshot",
  "NativeOperatorWorkspaceScene",
  "NativeOperatorSecondaryWindowScene",
] as const satisfies readonly SemanticAccessibilitySurfaceType[];

export const semanticAccessibilityFixture = {
  atlasPath: "/apps/operator-web/public/internal/semantic-anchor-catalog/index.html",
  calmRequiredAnchorRefs: [
    "low-noise-shell",
    "shell-family",
    "object-anchor",
    "dominant-question",
    "settlement-posture",
    "recovery-posture",
    "context-bar",
    "decision-summary",
    "action-strip",
    "primary-action",
    "no-safe-action",
    "detail-drawer",
    "detail-entry-evidence-prism",
  ],
  catalogBySurface: Object.fromEntries(
    semanticAccessibilitySurfaceTypes.map((surfaceType) => [
      surfaceType,
      getSemanticAnchorCatalog({ surfaceType }),
    ]),
  ) as Record<SemanticAccessibilitySurfaceType, ReturnType<typeof getSemanticAnchorCatalog>>,
  contractsBySurface: Object.fromEntries(
    semanticAccessibilitySurfaceTypes.map((surfaceType) => [
      surfaceType,
      buildSemanticAccessibilityContract({ surfaceType }),
    ]),
  ) as Record<SemanticAccessibilitySurfaceType, ReturnType<typeof buildSemanticAccessibilityContract>>,
  detailEntryAnchor: buildCalmDetailEntryAnchor("evidence-prism"),
  illegalVisualSelectorFragments: [
    "left-column",
    "middle-column",
    "right-column",
    "hero-card",
    "metric-wall",
    "purple-orb",
    "visual-grid",
  ],
  keyboardTraversalRefs: [
    "shell-family",
    "object-anchor",
    "dominant-question",
    "action-strip",
    "promoted-support-region",
    "return-path-control",
  ],
  regressionPack: buildSemanticAccessibilityRegressionPack(),
  shellFamilies: ["CALM_SHELL", "CLIENT_PORTAL_SHELL", "GOVERNANCE_DENSITY_SHELL"],
  surfaceTypes: semanticAccessibilitySurfaceTypes,
} as const;
