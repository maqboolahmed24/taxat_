export const cacheIsolationAtlasRoute = {
  id: "cache-isolation-atlas",
  title: "Cache Isolation Atlas",
  purpose:
    "Document the shared cache identity envelope, route-and-selection-bound preview reuse, and immediate purge triggers so browser and native restore obey one cache law.",
  cacheStages: ["IDENTITY", "RESTORE", "PREVIEW", "PURGE"],
  palette: {
    background: "#F4F3EE",
    surface: "#FFFFFF",
    secondary: "#ECEFE8",
    ink: "#111418",
    muted: "#64707A",
    hairline: "rgba(17,20,24,0.08)",
    accentForest: "#47685A",
    accentSlate: "#446377",
    accentClay: "#916343",
    success: "#175F4A",
    warning: "#915D19",
    danger: "#A53A31",
  },
  notes: [
    "The atlas stays read-only and explains cache law rather than acting like a live cache console.",
    "Restore, preview/export reuse, and purge all read from the same cache policy bundle so browser and native behavior cannot drift apart.",
    "Access narrowing, masking tightening, route drift, and preview selection drift purge broader variants immediately instead of waiting for eventual TTL expiry.",
  ],
} as const;
