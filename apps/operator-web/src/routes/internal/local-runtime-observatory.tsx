export const localRuntimeObservatoryRoute = {
  id: "local-runtime-observatory",
  title: "Local Runtime Observatory",
  purpose:
    "Inspect the governed local Taxat stack, including durable versus disposable boundaries, bootstrap order, seed profile posture, and safe rebuild instructions, without exposing secrets or mutable controls.",
  serviceFamilies: [
    "CONTROL_STORE",
    "AUDIT_STORE",
    "OBJECT_STORAGE",
    "QUEUE",
    "CACHE",
    "APP",
    "WORKERS",
  ],
  palette: {
    background: "#F5F4EF",
    surface: "#FFFFFF",
    secondary: "#ECEEE8",
    ink: "#11161A",
    muted: "#67717A",
    hairline: "rgba(17,22,26,0.08)",
    accentSlate: "#4D5C6A",
    accentMoss: "#5A6B59",
    accentBrass: "#8A6A44",
    success: "#17614B",
    warning: "#8C5B1B",
    danger: "#A63B31",
  },
  notes: [
    "Durable truth stays in control-store, audit-store, and object-storage surfaces even during local development.",
    "Queue and cache posture remain disposable and explicitly rebuildable from durable truth.",
    "The observatory is read-only and never displays raw secret values, signed URLs, or container-control affordances.",
  ],
} as const;
