import {
  artifactCanvasView,
  evidenceRailView,
  navigationTreeView,
  observatoryTopBarView,
} from "../../../components/contracts-observatory";

export const contractsObservatoryArtifactRoute = {
  id: "contracts-observatory-artifact",
  title: "Contracts Observatory Artifact",
  path: "/internal/contracts-observatory/:artifact",
  purpose:
    "Deep-link a single contract artifact while preserving the same shell, evidence rail, and command-search context as the observatory index route.",
  paramContract: {
    artifact: "Stable generated artifact slug resolved from apps/operator-web/public/internal/contracts-observatory/data/artifacts/*.json",
  },
  shellComposition: [
    observatoryTopBarView,
    navigationTreeView,
    artifactCanvasView,
    evidenceRailView,
  ],
  notes: [
    "Artifact links may also carry heading and field deep-link state through query parameters inside the static shell.",
    "Large schema pages keep field inventory collapsible and route-safe even when a deep link targets one nested field.",
  ],
} as const;
