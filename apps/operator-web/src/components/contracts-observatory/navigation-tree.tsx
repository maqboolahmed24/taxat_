import type { ObservatoryViewContract } from "./types";

export const navigationTreeView = {
  componentId: "NavigationTree",
  region: "NAVIGATION",
  purpose:
    "Render the canonical taxonomy, artifact list, heading rail, and recent-history shelf with deterministic section ordering and collapsible groups.",
  accessibleContract: [
    "Sections are toggle buttons with explicit expanded state.",
    "Artifact links are keyboard reachable and expose section and authority context in their labels.",
  ],
  dataDependencies: [
    "navigation-index.json",
    "current artifact payload",
    "local recent-artifact history",
  ],
} satisfies ObservatoryViewContract;
