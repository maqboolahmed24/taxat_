export const canonicalPrimitivesAtlasRoute = {
  id: "canonical-primitives-atlas",
  title: "Canonical Primitives Atlas",
  purpose:
    "Document the shared identifier, hash, exact-decimal, and time rules that later services, generated bindings, and viewers must consume without re-deriving semantics.",
  primitiveFamilies: ["IDENTIFIERS", "HASHES", "DECIMALS", "TIME"],
  palette: {
    background: "#F6F6F3",
    surface: "#FFFFFF",
    secondary: "#EEF0EC",
    ink: "#0F1418",
    muted: "#67707A",
    hairline: "rgba(15,20,24,0.08)",
    accentCobalt: "#355E8B",
    accentOlive: "#5B6E50",
    accentCopper: "#8A643D",
    success: "#17614A",
    warning: "#8B5C1A",
    danger: "#A53A31",
  },
  notes: [
    "The atlas is read-only evidence of the primitive contracts and never recalculates semantics independently from the shared library.",
    "Cross-language parity remains visible so request hashes, decimal arithmetic, and timestamp normalization do not drift between TypeScript and Python.",
    "Literal strings remain copyable for debugging and review, but hidden convenience coercions stay forbidden.",
  ],
} as const;
