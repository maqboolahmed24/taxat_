export const objectLifecycleAtlasRoute = {
  id: "object-lifecycle-atlas",
  title: "Object Lifecycle Atlas",
  purpose:
    "Document the governed river from upload source through quarantine, publication, delivery, and retention so later storage features reuse one lawful lifecycle instead of ad hoc bucket semantics.",
  lifecycleStages: ["STAGE", "SCAN", "QUARANTINE", "PUBLISH", "DELIVER", "RETAIN / ERASE"],
  palette: {
    background: "#F5F5F2",
    surface: "#FFFFFF",
    secondary: "#EEEFEA",
    ink: "#101418",
    muted: "#68717A",
    hairline: "rgba(16,20,24,0.08)",
    accentForest: "#476A58",
    accentSteelBlue: "#446276",
    accentUmber: "#8A653E",
    success: "#17614B",
    warning: "#8B5D1C",
    danger: "#A53A31",
  },
  notes: [
    "The atlas stays read-only and visualizes sanitized lifecycle law rather than live provider URLs or bucket controls.",
    "Quarantine, publication, delivery, and retention remain separate stages so raw storage cannot masquerade as customer truth.",
    "Current-versus-history and derivative-versus-source posture stay visible on the river because those distinctions drive lawful delivery and erasure behavior later.",
  ],
} as const;
