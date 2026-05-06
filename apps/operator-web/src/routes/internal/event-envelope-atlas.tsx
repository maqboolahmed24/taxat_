export const eventEnvelopeAtlasRoute = {
  id: "event-envelope-atlas",
  title: "Event Envelope Atlas",
  purpose:
    "Show the one durable packet lane for command, worker, artifact, and authority traffic so duplicate meaning, inbox truth, and dead-letter posture stay visible instead of hiding inside broker retries.",
  packetFamilies: ["COMMAND", "STAGE", "ARTIFACT", "AUTHORITY", "INGRESS"],
  palette: {
    background: "#f6f3ee",
    surface: "#fffdf8",
    secondary: "#ece7df",
    ink: "#11151a",
    muted: "#69747d",
    hairline: "rgba(17,21,26,0.09)",
    accentPlum: "#5d4d7d",
    accentTeal: "#275d66",
    accentBronze: "#8a6033",
    accentOlive: "#586f39",
    accentScarlet: "#8c4035",
  },
  notes: [
    "Packet ids are transport evidence only; legal meaning lives on durable source, outbox, inbox, and ledger records.",
    "Inbox continuity checks may quarantine missing or stale source-record refs before any side effect can run.",
    "Authority request identity keeps duplicate meaning and exact-send request hash separate so lawful token rotation does not silently mint a new legal attempt.",
  ],
} as const;
