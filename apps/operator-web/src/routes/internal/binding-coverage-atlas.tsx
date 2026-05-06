export const bindingCoverageAtlasRoute = {
  id: "binding-coverage-atlas",
  title: "Binding Coverage Atlas",
  purpose:
    "Expose the downstream TypeScript, Python, and selected Swift binding posture with source-hash lineage, tool choice, and typed generator gaps.",
  languages: ["TYPESCRIPT", "PYTHON", "SWIFT", "GAP_REGISTRY"],
  planes: ["Schema Family", "Generated Output / Tool", "Coverage / Gap Posture"],
  palette: {
    background: "#F5F6F4",
    surface: "#FFFFFF",
    secondary: "#EEF1EC",
    ink: "#111418",
    muted: "#65707A",
    hairline: "rgba(17,20,24,0.08)",
    accentSlate: "#466178",
    accentMoss: "#5D715F",
    accentBronze: "#8A6733",
    success: "#16624B",
    warning: "#8A5C18",
    danger: "#A63B32",
  },
  notes: [
    "TypeScript and Python bind the full schema corpus while runtime validation remains canonical in contracts-core.",
    "Swift binds only the native-relevant subset and records every fallback or non-targeted family in the typed gap register.",
    "Generated outputs stay downstream-only: source hashes, tool IDs, and policy refs remain visible so consumers do not hand-edit these bindings in place.",
  ],
} as const;
