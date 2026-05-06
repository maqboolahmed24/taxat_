export const canonicalDomainExampleAtlasRoute = {
  id: "canonical-domain-example-atlas",
  title: "Canonical Domain Example Atlas",
  purpose:
    "Show the governed synthetic-fixture cabinet that binds embodiments, schema-valid sample payloads, deterministic seeds, expected timelines, and deterministic-golden-pack participation without exposing live customer data.",
  replayClasses: [
    "LIVE_COMPLIANCE",
    "STANDARD_REPLAY",
    "AUDIT_REPLAY",
    "COUNTERFACTUAL_ANALYSIS",
    "LIMITED_HISTORICAL_COMPARISON",
    "LIVE_REQUEST_REBASE",
    "STREAM_REBASE",
  ],
  palette: {
    background: "#F6F5F2",
    surface: "#FFFFFF",
    secondary: "#F0EEE9",
    ink: "#101418",
    muted: "#6A727A",
    hairline: "rgba(16,20,24,0.08)",
    accentSteelBlue: "#4A6178",
    accentSage: "#61715E",
    accentClay: "#8A6544",
    success: "#17614B",
    warning: "#8B5D1B",
    danger: "#A53A31",
  },
  notes: [
    "All examples are synthetic and deterministic; the atlas must never render live or customer data.",
    "The page is read-only and explains narrative, sample-artifact, timeline, and traceability posture without becoming a test runner.",
    "Golden-pack coverage is an overlay on the selected embodiment instead of a separate dashboard lane.",
  ],
} as const;
