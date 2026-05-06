export const referenceGrammarAtlasRoute = {
  id: "reference-grammar-atlas",
  title: "Reference Grammar Atlas",
  purpose:
    "Document the one naming grammar for IDs, durable refs, hashes, route tokens, target refs, storage refs, and delivery bindings so later packages stop inventing incompatible locator vocabularies.",
  referenceFamilies: ["ID", "REF", "HASH", "TARGET", "STORAGE", "DELIVERY", "ROUTE"],
  palette: {
    background: "#F5F5F2",
    surface: "#FFFFFF",
    secondary: "#EEEFEA",
    ink: "#101418",
    muted: "#69727A",
    hairline: "rgba(16,20,24,0.08)",
    accentPlum: "#5E567E",
    accentTeal: "#3E6A72",
    accentBronze: "#89643A",
    success: "#17614B",
    warning: "#8B5D1A",
    danger: "#A43B32",
  },
  notes: [
    "The atlas stays read-only and explains the machine-readable grammar instead of minting production locators in the browser.",
    "Current-vs-history target selection remains explicit so historical artifact meaning cannot silently replace current defaults.",
    "Delivery binding and route continuity stay visible as separate families so cache keys, route tokens, and download handles are not treated as durable artifact truth.",
  ],
} as const;
