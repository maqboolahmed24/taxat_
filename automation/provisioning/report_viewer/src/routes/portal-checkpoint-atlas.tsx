export const portalCheckpointAtlasRoute = {
  id: "portal-checkpoint-atlas",
  title: "Portal Checkpoint Atlas",
  purpose:
    "Render a low-noise checkpoint and resume ledger for blocked portal flows without turning provider-owned security gates into automation shortcuts.",
  focusOrder: [
    "portal-checkpoint-scenario-rail",
    "portal-checkpoint-timeline",
    "portal-checkpoint-inspector",
  ],
  sections: [
    "Automation Path",
    "Checkpoint Encountered",
    "Human Step",
    "Resume Verification",
    "Outcome",
    "Evidence and resume inspector",
  ],
  palette: {
    background: "#F5F6F4",
    surface: "#FFFFFF",
    secondary: "#EEF1EC",
    ink: "#111418",
    muted: "#65707A",
    hairline: "rgba(17,20,24,0.08)",
    accentIndigo: "#435D7A",
    accentSand: "#8A6A3A",
    accentPlum: "#6B5877",
    success: "#16624B",
    warning: "#8A5C18",
    danger: "#A63B32"
  },
  notes: [
    "The main diagram is the stacked pause-and-resume timeline itself.",
    "Evidence refs, redaction posture, and resume preconditions stay visible together so later adapters do not guess checkpoint law from memory.",
    "Reduced motion swaps translation for opacity and outline emphasis without changing information order."
  ]
} as const;
