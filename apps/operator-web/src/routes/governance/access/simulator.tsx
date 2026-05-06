export const governanceAccessSimulatorRoute = {
  id: "governance-access-simulator",
  title: "Governance Access Simulator",
  purpose:
    "Preview how one access tuple resolves under live principal context, with the authorization decision and ordered authority-chain explanation kept explicit.",
  routePath: "/governance/access/simulator",
  simulatorPosture: "READ_ONLY_DECISION",
  sections: ["SCENARIO_RAIL", "DECISION_SUMMARY", "AUTHORITY_CHAIN", "BASIS_DETAIL"],
  palette: {
    background: "#F4F3EE",
    surface: "#FFFFFF",
    secondary: "#E8ECE6",
    ink: "#0F1418",
    muted: "#67717A",
    accentSage: "#4E6757",
    accentSteel: "#415F74",
    accentClay: "#8E643F",
    success: "#175F4A",
    warning: "#8D5D1D",
    danger: "#A43A31",
  },
  notes: [
    "The simulator is deliberately read only. It previews access and mutation hazard but never fabricates approval or authority-of-record outcomes.",
    "Each scenario reuses the compiled access matrix and principal context rather than inventing browser-only decision truth.",
    "Service-principal denial remains explicit when a tuple requires human action, even if the role seed otherwise looks permissive at a glance.",
  ],
} as const;
