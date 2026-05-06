export const telemetryCorrelationAtlasRoute = {
  id: "telemetry-correlation-atlas",
  title: "Telemetry Correlation Atlas",
  purpose:
    "Explain the shared telemetry resource, correlation-context contract, propagation boundaries, and redaction posture without turning internal review into a vendor APM dashboard or a live telemetry control plane.",
  signalStages: ["TRACE", "METRIC", "LOG", "HTTP", "QUEUE", "STREAM", "CLIENT"],
  palette: {
    background: "#F4F5F2",
    surface: "#FFFFFF",
    secondary: "#EEF0EC",
    ink: "#101418",
    muted: "#69717A",
    hairline: "rgba(16,20,24,0.08)",
    accentCobalt: "#47627C",
    accentEvergreen: "#5C725E",
    accentSmokePlum: "#655B70",
    success: "#17614B",
    warning: "#8C5D1B",
    danger: "#A53A31",
  },
  notes: [
    "Transport trace continuity and authoritative business lineage are deliberately separate.",
    "Sampling and log retention may change operational visibility, but they never weaken append-only audit evidence.",
    "Client surfaces emit route/module/posture/timing codes and opaque refs only; copied UI text or payload fragments remain forbidden.",
  ],
} as const;
