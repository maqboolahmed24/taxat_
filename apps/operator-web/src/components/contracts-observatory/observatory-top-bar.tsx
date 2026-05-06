import type { ObservatoryViewContract } from "./types";

export const observatoryTopBarView = {
  componentId: "ObservatoryTopBar",
  region: "TOP_BAR",
  purpose:
    "Expose the contract seal, command search trigger, current artifact kind, source-truth badge, and live readiness chips without turning the shell into a dashboard.",
  accessibleContract: [
    "The top bar exposes a keyboard-focusable command search trigger.",
    "Current artifact type and source-truth posture are readable without relying on color alone.",
  ],
  dataDependencies: [
    "site-manifest.json",
    "current artifact payload",
  ],
} satisfies ObservatoryViewContract;
