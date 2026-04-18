export const signalGovernanceBoardRoute = {
  id: "signal-governance-board",
  title: "Signal Governance Board",
  purpose:
    "Render a governance-first monitoring control sheet showing project topology, scrub posture, inbound filters, and alert or release mapping without exposing raw DSNs, auth tokens, or vendor-side payload content.",
  focusOrder: [
    "signal-governance-project-rail",
    "signal-governance-canvas",
    "signal-governance-inspector",
  ],
  sections: [
    "Projects",
    "Scrubbing",
    "Inbound Filters",
    "Alerts & Release Mapping",
  ],
  palette: {
    background: "#F5F6F4",
    surface: "#FFFFFF",
    secondary: "#EEF1EC",
    ink: "#111418",
    muted: "#65707A",
    hairline: "rgba(17,20,24,0.08)",
    accentCharcoalBlue: "#465F74",
    accentAmber: "#8A651B",
    success: "#16624B",
    warning: "#8A5C18",
    danger: "#A63B32",
  },
  notes: [
    "The board is governance-first and intentionally avoids cloning the vendor dashboard.",
    "Monitoring stays secondary to first-party audit, privacy, and release evidence.",
    "Reduced motion keeps the same hierarchy with opacity-only emphasis and no spatial dependence.",
  ],
} as const;
