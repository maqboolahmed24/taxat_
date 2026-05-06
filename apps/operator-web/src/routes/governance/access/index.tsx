export const governanceAccessWorkspaceRoute = {
  id: "governance-access-workspace",
  title: "Governance Access Workspace",
  purpose:
    "Inspect baseline principal and role access posture without collapsing role grants, step-up, approval, delegation, and authority-link truth into one generic matrix.",
  routePath: "/governance/access/principals",
  sections: ["PRINCIPALS", "ROLES", "INSPECTOR", "AUTHORITY_CHAIN"],
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
    "Role templates remain sparse and fail closed. A missing tuple stays deny rather than inheriting ambient operator trust.",
    "The principal view is context-aware: step-up, delegation, and authority-link posture can narrow or deny tuples that the role template alone would allow.",
    "The workspace keeps the authority chain visible so governance reviews can distinguish tenant permission from delegation and external link readiness.",
  ],
} as const;
