export const credentialLineageLedgerRoute = {
  id: "credential-lineage-ledger",
  title: "Credential Lineage Ledger",
  purpose:
    "Render a calm, security-oriented view of HMRC client identifiers, bound callback and fraud-profile refs, secret-version succession, and sanitized attestation evidence.",
  focusOrder: [
    "application-rail",
    "credential-ledger",
    "evidence-drawer",
  ],
  sections: [
    "Identifiers",
    "Bindings",
    "Secret Lineage",
    "Attestation",
  ],
  palette: {
    background: "#F5F6F4",
    surface: "#FFFFFF",
    secondary: "#EEF1EC",
    ink: "#111418",
    muted: "#65707A",
    hairline: "rgba(17,20,24,0.08)",
    accentMidnight: "#3E5873",
    accentBrass: "#8B6732",
    success: "#16624B",
    warning: "#8A5C18",
    danger: "#A63B32",
  },
  notes: [
    "Copy affordances are limited to safe aliases, fingerprints, and vault refs.",
    "No KPI cards or aggregate counters belong on this route.",
    "Reduced motion swaps drawer and lineage movement for opacity-only transitions.",
  ],
} as const;
