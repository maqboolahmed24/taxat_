export const schemaCompatibilityAtlasRoute = {
  id: "schema-compatibility-atlas",
  title: "Schema Compatibility Atlas",
  purpose:
    "Inspect schema drift, migration chronology, reader-window protection, generated binding parity, and candidate admissibility without turning release evidence into tribal knowledge.",
  groups: [
    "ADDITIVE",
    "NARROWING",
    "DESTRUCTIVE",
    "DOC_DRIFT",
    "BINDING_DRIFT",
    "MIGRATION_GAP",
  ],
  phases: ["EXPAND", "BACKFILL", "VERIFY", "CONTRACT"],
  palette: {
    background: "#F6F4F0",
    surface: "#FFFFFF",
    secondary: "#EEECE7",
    ink: "#10161B",
    muted: "#66707A",
    hairline: "rgba(16,22,27,0.08)",
    accentIndigo: "#4B5D7A",
    accentOlive: "#667052",
    accentOchre: "#8E6A35",
    success: "#175F4A",
    warning: "#87591C",
    danger: "#A13833",
  },
  notes: [
    "The atlas is generated from deterministic report artifacts and does not re-run source analysis in the browser.",
    "Reader-window posture, historical-manifest protection, and supported-client compatibility are first-class release inputs rather than afterthought notes.",
    "Documentation and generated binding drift can block release evidence even when the raw schema graph appears clean.",
  ],
} as const;
