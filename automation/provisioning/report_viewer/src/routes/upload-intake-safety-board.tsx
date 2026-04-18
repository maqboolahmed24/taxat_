export const uploadIntakeSafetyBoardRoute = {
  id: "upload-intake-safety-board",
  title: "Upload Intake Safety Board",
  purpose:
    "Render a calm intake-safety conveyor for scan coverage, quarantine posture, and release evidence without collapsing transfer, scan, validation, and attachment confirmation into one status.",
  focusOrder: [
    "upload-intake-scenario-rail",
    "upload-intake-conveyor",
    "upload-intake-inspector",
  ],
  sections: [
    "Received",
    "Transferred",
    "Scan Pending",
    "Clean",
    "Rejected",
    "Quarantined",
    "Mapping, lifecycle, and release inspector",
  ],
  palette: {
    background: "#F5F6F4",
    surface: "#FFFFFF",
    secondary: "#EEF1EC",
    ink: "#111418",
    muted: "#65707A",
    hairline: "rgba(17,20,24,0.08)",
    accentIndigo: "#465C77",
    accentAmber: "#8A5C18",
    accentGarnet: "#8C4340",
    success: "#16624B",
    danger: "#A63B32",
  },
  notes: [
    "The main diagram is the state conveyor itself, not a KPI surface.",
    "Customer-safe copy and internal hazard language remain distinct on purpose.",
    "Reduced motion swaps translation for opacity and outline emphasis without changing the information order.",
  ],
} as const;
