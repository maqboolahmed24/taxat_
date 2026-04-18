export const supportContextMappingBoardRoute = {
  id: "support-context-mapping-board",
  title: "Support Context Mapping Board",
  purpose:
    "Render a restrained context-handoff map for portal-help scenarios, external field mapping, and mirror bounds without implying that the external helpdesk is workflow truth.",
  focusOrder: [
    "support-mapping-scenario-rail",
    "support-mapping-canvas",
    "support-mapping-inspector",
  ],
  sections: [
    "Portal Context",
    "External Ticket Fields",
    "Return/Mirror Rules",
    "Privacy and webhook posture",
  ],
  palette: {
    background: "#F5F6F4",
    surface: "#FFFFFF",
    secondary: "#EEF1EC",
    ink: "#111418",
    muted: "#65707A",
    hairline: "rgba(17,20,24,0.08)",
    accentSlate: "#4B6379",
    accentWineGrey: "#7A6168",
    success: "#16624B",
    warning: "#8A5C18",
    danger: "#A63B32",
  },
  notes: [
    "The board reads as a route-to-ticket mapping sheet rather than a support dashboard.",
    "Portal context leads; external fields and mirror rules stay subordinate to first-party truth.",
    "Reduced motion preserves the same rail, lattice, and inspector hierarchy with opacity-only emphasis.",
  ],
} as const;
