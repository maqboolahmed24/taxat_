import type { ObservatoryViewContract } from "./types";

export const evidenceRailView = {
  componentId: "EvidenceRail",
  region: "EVIDENCE_RAIL",
  purpose:
    "Keep the source-truth stack, lineage, linked schemas, linked samples, validators, bindings, readiness posture, and task references visible without interrupting the reading flow.",
  accessibleContract: [
    "Evidence cards expose relationship labels that describe why an adjacent artifact is linked.",
    "The selected schema field updates the rail with linked prose and sample fragments using standard button focus order.",
  ],
  dataDependencies: [
    "current artifact payload",
    "schema-crosslink-graph.json",
  ],
} satisfies ObservatoryViewContract;
