export const northboundBoundaryAtlasRoute = {
  id: "northbound-boundary-atlas",
  title: "Northbound Boundary Atlas",
  purpose:
    "Inspect one shared command-admission boundary for parse, stale, duplicate, receipt, and problem posture without turning the viewer into a mutable API console.",
  stages: ["PARSE", "VALIDATE", "STALE", "DUPLICATE", "RECEIPT", "PROBLEM"],
  palette: {
    background: "#F5F6F3",
    surface: "#FFFFFF",
    secondary: "#EEF0EC",
    ink: "#101418",
    muted: "#68707A",
    hairline: "rgba(16,20,24,0.08)",
    accentCyan: "#3D6377",
    accentSage: "#5A6F59",
    accentAmber: "#8A653B",
    success: "#17614B",
    warning: "#8B5D1B",
    danger: "#A53A31",
  },
  notes: [
    "The atlas is read-only and derives its flow from the northbound policy bundle rather than from a mock server.",
    "Exact request replays return the same durable receipt; idempotency collisions stop with typed problem truth instead of speculative retries.",
    "Governance families reuse the same scaffold but may surface stale or basis failures as ProblemEnvelope-only paths when no live projection stream exists.",
  ],
} as const;
