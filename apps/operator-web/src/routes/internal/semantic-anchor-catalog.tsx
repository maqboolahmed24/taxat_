import {
  buildCalmDetailEntryAnchor,
  buildSemanticAccessibilityContract,
  buildSemanticAccessibilityRegressionPack,
  getSemanticAnchorCatalog,
  type SemanticAccessibilitySurfaceType,
} from "@taxat/frontend-shell-core";
import { createLandmarkFrameSnapshot, createSemanticAnchorSnapshot } from "@taxat/shared-ui";

const semanticAccessibilitySurfaceTypes = [
  "LowNoiseExperienceFrame",
  "WorkspaceSnapshot",
  "ClientPortalWorkspace",
  "TenantGovernanceSnapshot",
  "NativeOperatorWorkspaceScene",
  "NativeOperatorSecondaryWindowScene",
] as const satisfies readonly SemanticAccessibilitySurfaceType[];

export const semanticAnchorCatalogRoute = {
  id: "semantic-anchor-catalog",
  title: "Semantic Anchor Catalog",
  routePath: "/internal/semantic-anchor-catalog",
  publicPath: "/apps/operator-web/public/internal/semantic-anchor-catalog/index.html",
  catalogBySurface: Object.fromEntries(
    semanticAccessibilitySurfaceTypes.map((surfaceType) => [
      surfaceType,
      getSemanticAnchorCatalog({ surfaceType }),
    ]),
  ),
  contractsBySurface: Object.fromEntries(
    semanticAccessibilitySurfaceTypes.map((surfaceType) => [
      surfaceType,
      buildSemanticAccessibilityContract({ surfaceType }),
    ]),
  ),
  dynamicDetailEntryExample: buildCalmDetailEntryAnchor("evidence-prism"),
  semanticAnchorComponentExample: createSemanticAnchorSnapshot({
    anchorCode: "DOMINANT_QUESTION",
    focusable: true,
    surfaceType: "LowNoiseExperienceFrame",
  }),
  landmarkFrameExample: createLandmarkFrameSnapshot({
    anchorCode: "PROMOTED_SUPPORT_REGION",
    focusable: true,
    surfaceType: "LowNoiseExperienceFrame",
  }),
  regressionPack: buildSemanticAccessibilityRegressionPack(),
} as const;
