export const auditStreamAtlasRoute = {
  id: "audit-stream-atlas",
  title: "Audit Stream Atlas",
  purpose:
    "Explain append-only audit sequencing, stream partitioning, hash-chain continuity, retained reconstruction context, and signature follow-up posture without turning internal review into a mutable ledger console.",
  auditStages: ["PARTITION", "SEQUENCE", "CHAIN", "RETENTION", "SIGNATURE"],
  palette: {
    background: "#F4F1EB",
    surface: "#FFFFFF",
    secondary: "#ECE7DE",
    ink: "#111418",
    muted: "#66707A",
    hairline: "rgba(17,20,24,0.08)",
    accentCobalt: "#45657A",
    accentForest: "#4D6C5C",
    accentEmber: "#9A5E30",
    success: "#165F49",
    warning: "#8B5F20",
    danger: "#A53A31",
  },
  notes: [
    "Strict stream order is primary; merged explanation never rewrites or replaces the underlying sequence.",
    "Signature batch reservation belongs to the immutable row, but batch success or failure is follow-up metadata rather than a row rewrite.",
    "Retention-limited audit truth must remain present and typed even after the original payload expires.",
  ],
} as const;
