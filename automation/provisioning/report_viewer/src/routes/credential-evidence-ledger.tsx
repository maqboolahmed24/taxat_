export const credentialEvidenceLedgerRoute = {
  id: "credential-evidence-ledger",
  title: "Credential Evidence Ledger",
  purpose:
    "Render a premium smoke-evidence ledger for external credential families, expected principal and scope posture, masked evidence lineage, and typed outcomes without turning into a secret dashboard.",
  focusOrder: [
    "credential-family-rail",
    "credential-evidence-canvas",
    "credential-evidence-inspector",
  ],
  sections: [
    "Credential Family",
    "Expected Principal / Scope",
    "Masked Evidence",
    "Outcome / Next Action",
  ],
  palette: {
    background: "#F5F6F4",
    surface: "#FFFFFF",
    secondary: "#EEF1EC",
    ink: "#111418",
    muted: "#65707A",
    hairline: "rgba(17,20,24,0.08)",
    accentSlate: "#46617A",
    accentMoss: "#5D715F",
    accentBrass: "#8A6733",
    success: "#16624B",
    warning: "#8A5C18",
    danger: "#A63B32",
  },
  notes: [
    "The ledger is evidence-first and copy-safe by default.",
    "Aliases, endpoint IDs, evidence refs, and typed outcomes remain keyboard-addressable and stable under reduced motion.",
    "No raw token previews, secret counts, or vendor-console metrics belong on this route.",
  ],
} as const;
