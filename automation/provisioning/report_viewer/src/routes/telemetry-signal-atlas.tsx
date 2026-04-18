export const telemetrySignalAtlasRoute = {
  id: "telemetry-signal-atlas",
  title: "Telemetry Signal Atlas",
  purpose:
    "Render a premium observability atlas for signal families, collector tiers, backend ownership, and telemetry-to-audit joins without collapsing into a metrics dashboard or vendor console clone.",
  focusOrder: [
    "telemetry-family-rail",
    "telemetry-atlas-canvas",
    "telemetry-atlas-inspector",
  ],
  sections: [
    "Emission",
    "Collector / Processors",
    "Backends / Sinks",
    "Correlation To Audit",
  ],
  palette: {
    background: "#F5F6F4",
    surface: "#FFFFFF",
    secondary: "#EEF1EC",
    ink: "#111418",
    muted: "#65707A",
    hairline: "rgba(17,20,24,0.08)",
    accentSlate: "#476275",
    accentOlive: "#5C7263",
    accentBronze: "#86663A",
    success: "#16624B",
    warning: "#8A5C18",
    danger: "#A63B32",
  },
  notes: [
    "The atlas emphasizes signal law, routing, and audit correlation instead of backend health counters.",
    "The inspector stays open to make the telemetry-versus-audit boundary keyboard-accessible at all times.",
    "Reduced motion uses focus and opacity only.",
  ],
} as const;
