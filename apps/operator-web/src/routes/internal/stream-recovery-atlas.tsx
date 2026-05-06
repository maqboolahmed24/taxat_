export const streamRecoveryAtlasRoute = {
  id: "stream-recovery-atlas",
  title: "Stream Recovery Atlas",
  purpose:
    "Document the shared SSE continuity substrate for snapshot, catch-up, live replay, rebase, and access-rebind posture so later endpoints reuse one lawful recovery model.",
  recoveryPhases: ["SNAPSHOT", "CATCH_UP", "LIVE", "HEARTBEAT", "REBASE", "REVOKE"],
  palette: {
    background: "#F4F5F2",
    surface: "#FFFFFF",
    secondary: "#EEF0EC",
    ink: "#101418",
    muted: "#68717A",
    hairline: "rgba(16,20,24,0.08)",
    accentBlue: "#44627A",
    accentPine: "#5C725E",
    accentPlum: "#65596F",
    success: "#17614B",
    warning: "#8C5D1B",
    danger: "#A53A31",
  },
  notes: [
    "The atlas is read-only and explains stream law rather than live socket state.",
    "Raw resume tokens never become the primary continuity object.",
    "No mixed-epoch ribbon may remain visible after a rebase selection.",
  ],
} as const;
