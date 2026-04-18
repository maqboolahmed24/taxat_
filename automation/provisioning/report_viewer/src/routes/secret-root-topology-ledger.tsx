export const secretRootTopologyLedgerRoute = {
  id: "secret-root-topology-ledger",
  title: "Secret Root Topology Ledger",
  purpose:
    "Render a premium cryptographic ledger for alias families, key hierarchy, and least-privilege access grants without exposing secret values or imitating a cloud console.",
  focusOrder: [
    "secret-root-alias-rail",
    "secret-root-ledger-canvas",
    "secret-root-inspector",
  ],
  sections: [
    "Alias Catalog",
    "Key Hierarchy",
    "Access Matrix",
    "Lineage and grant inspector",
  ],
  palette: {
    background: "#F5F6F4",
    surface: "#FFFFFF",
    secondary: "#EEF1EC",
    ink: "#111418",
    muted: "#65707A",
    hairline: "rgba(17,20,24,0.08)",
    accentGraphiteBlue: "#415973",
    accentBrass: "#8B6732",
    accentPine: "#536B5E",
    success: "#16624B",
    warning: "#8A5C18",
    danger: "#A63B32",
  },
  notes: [
    "The page prioritizes typographic clarity and lineage over cloud-resource chrome.",
    "The hierarchy spine is restrained and explanatory, not a usage dashboard.",
    "Reduced motion uses opacity and focus changes only.",
  ],
} as const;
