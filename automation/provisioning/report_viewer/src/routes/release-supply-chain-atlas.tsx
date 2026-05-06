export const releaseSupplyChainAtlasRoute = {
  id: "release-supply-chain-atlas",
  title: "Release Supply Chain Atlas",
  purpose:
    "Render a calm release atelier for registry topology, trust roots, digest custody, SBOM/provenance evidence, and promotion inputs without collapsing into a pipeline console.",
  focusOrder: [
    "supplychain-family-rail",
    "release-supply-chain-canvas",
    "release-supply-chain-inspector",
  ],
  sections: [
    "Source / Build",
    "Registry",
    "Sign / Notarize",
    "Attest / SBOM",
    "Promotion Inputs",
    "Digest / Candidate Binding",
  ],
  palette: {
    background: "#F5F6F4",
    surface: "#FFFFFF",
    secondary: "#EEF1EC",
    ink: "#111418",
    muted: "#65707A",
    hairline: "rgba(17,20,24,0.08)",
    accentGraphiteBlue: "#445D73",
    accentCopper: "#8A6437",
    accentMoss: "#586C5F",
    success: "#16624B",
    warning: "#8A5C18",
    danger: "#A63B32",
  },
  notes: [
    "The atlas is read-only and keeps the operator focused on chain of custody, not dashboard vanity metrics.",
    "Digest, signature, provenance, SBOM, and candidate admission remain independently inspectable surfaces.",
    "Reduced motion uses focus and opacity only.",
  ],
} as const;
