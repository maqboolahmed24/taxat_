export const queueFabricAtlasRoute = {
  id: "queue-fabric-atlas",
  title: "Queue Fabric Atlas",
  purpose:
    "Document the reusable queue fabric for worker dispatch, retries, stale reclaim, and dead-letter posture so later services reuse one lawful transport boundary instead of ad hoc broker calls.",
  dispatchStages: ["OUTBOX", "QUEUE", "CLAIM", "WORKER", "INBOX", "AUDIT"],
  palette: {
    background: "#F4F4F1",
    surface: "#FFFFFF",
    secondary: "#EEF0EB",
    ink: "#0F1418",
    muted: "#69727B",
    hairline: "rgba(15,20,24,0.08)",
    accentIndigo: "#495B7A",
    accentEvergreen: "#5B7059",
    accentBronze: "#8A6540",
    success: "#17614B",
    warning: "#8B5D1B",
    danger: "#A63B31",
  },
  notes: [
    "The atlas remains read-only and visualizes lawful topology, retry posture, and rebuild rules rather than live broker administration.",
    "One queue family is never allowed to become a catch-all fabric for unrelated work.",
    "Authority transport stays visibly subordinate to persisted resend legality and send-time revalidation truth.",
  ],
} as const;
