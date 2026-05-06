export const codeQualityAtlasRoute = {
  id: "code-quality-atlas",
  title: "Code Quality Atlas",
  purpose:
    "Explain how authored, generated, imported, and browser-facing repo surfaces move through formatting, linting, type checks, hooks, and semantic browser guardrails.",
  families: ["FORMAT", "LINT", "TYPECHECK", "HOOKS", "PLAYWRIGHT"],
  stages: ["SAVE", "STAGED", "COMMIT", "CI"],
  palette: {
    background: "#F5F6F3",
    surface: "#FFFFFF",
    secondary: "#EDF0EA",
    ink: "#101317",
    muted: "#69727A",
    hairline: "rgba(16,19,23,0.08)",
    accentSlate: "#3F5E73",
    accentMoss: "#5B725E",
    accentAmber: "#8B6735",
    success: "#16624B",
    warning: "#8A5A18",
    danger: "#A63B32",
  },
  notes: [
    "Biome owns authored JS, TS, JSON, CSS, and HTML formatting and linting instead of splitting those concerns across multiple tools.",
    "Ruff plus Pyright govern authored Python while generated bindings and imported schema mirrors stay explicitly generator- or sync-owned.",
    "Commit-time hooks stay fast by running staged-safe checks only; browser suites and wider replay checks remain CI responsibilities.",
  ],
} as const;
