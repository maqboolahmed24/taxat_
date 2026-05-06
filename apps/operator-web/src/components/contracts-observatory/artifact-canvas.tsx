import type { ObservatoryViewContract } from "./types";

export const artifactCanvasView = {
  componentId: "ArtifactCanvas",
  region: "CANVAS",
  purpose:
    "Present prose, schema summaries, field inventories, samples, bindings, validator commands, and drift posture in one editorial reading surface with stable deep links.",
  accessibleContract: [
    "Every heading and field exposes a copy-safe deep-link action.",
    "Reduced-motion mode removes animated section transitions and search-result movement.",
  ],
  dataDependencies: [
    "current artifact payload",
  ],
} satisfies ObservatoryViewContract;
