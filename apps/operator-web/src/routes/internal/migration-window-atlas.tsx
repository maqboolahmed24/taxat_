export const migrationWindowAtlasRoute = {
  id: "migration-window-atlas",
  title: "Migration Window Atlas",
  purpose:
    "Inspect immutable migration numbering, singleton PostgreSQL lock posture, reader-window compatibility, backfill evidence, and fail-forward boundaries without turning the viewer into a mutation console.",
  states: ["PLANNED", "APPLYING", "VERIFYING", "CONTRACTING", "HALTED", "FAILED"],
  phases: ["EXPAND", "BACKFILL", "VERIFY", "CONTRACT"],
  palette: {
    background: "#F5F5F3",
    surface: "#FFFFFF",
    secondary: "#EEF0ED",
    ink: "#101418",
    muted: "#68717A",
    hairline: "rgba(16,20,24,0.08)",
    accentIndigo: "#4B5E88",
    accentFern: "#587056",
    accentRust: "#8B633C",
    success: "#176149",
    warning: "#8C5D1C",
    danger: "#A53A31",
  },
  notes: [
    "The atlas is read-only and explains migration evidence instead of applying SQL or mutating a datastore directly.",
    "Backfill execution remains a separate resumable contract from structural DDL so partial progress is visible rather than hidden in bootstrap code.",
    "Rollback class and compatibility-window closure stay explicit so destructive cleanup cannot begin on operator assumption alone.",
  ],
} as const;
