export const controlAndAuditStoreLedgerRoute = {
  id: "control-and-audit-store-ledger",
  title: "Control and Audit Store Ledger",
  purpose:
    "Render a premium twin-ledger governance map for the transactional control store, append-only audit store, and restore-readiness strip without imitating a DBA metrics console.",
  focusOrder: [
    "postgres-store-rail",
    "postgres-ledger-canvas",
    "postgres-ledger-inspector",
  ],
  sections: [
    "Transactional Control Truth",
    "Append-Only Audit Evidence",
    "Role Model",
    "PITR / Restore / Migration Window",
  ],
  palette: {
    background: "#F5F6F4",
    surface: "#FFFFFF",
    secondary: "#EEF1EC",
    ink: "#111418",
    muted: "#65707A",
    hairline: "rgba(17,20,24,0.08)",
    accentNavy: "#425B74",
    accentCopper: "#8A6431",
    accentMoss: "#5A6F61",
    success: "#16624B",
    warning: "#8A5C18",
    danger: "#A63B32",
  },
  notes: [
    "The page emphasizes topology, trust boundaries, and restore law over infrastructure telemetry.",
    "Reduced motion uses focus and opacity only.",
    "Replica or restore profiles are explicitly non-authoritative for commit truth.",
  ],
} as const;
