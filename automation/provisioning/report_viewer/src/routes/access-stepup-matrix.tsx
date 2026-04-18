export const accessStepupMatrixRoute = {
  id: "access-stepup-matrix",
  title: "Access and Step-up Matrix",
  purpose:
    "Render a governance-density policy atlas for coarse IdP roles, requestable scopes, step-up triggers, approval gates, and session posture without implying that the provider decides final Taxat legality.",
  focusOrder: [
    "policy-rail",
    "policy-matrix",
    "policy-inspector",
  ],
  sections: [
    "Roles and scopes",
    "Action-family matrix",
    "Session profiles",
    "Inspector",
  ],
  palette: {
    background: "#F5F6F4",
    surface: "#FFFFFF",
    secondary: "#EEF1EC",
    ink: "#111418",
    muted: "#65707A",
    hairline: "rgba(17,20,24,0.08)",
    accentGraphiteBlue: "#425B73",
    accentIrisGrey: "#6E7485",
    success: "#16624B",
    warning: "#8A5C18",
    danger: "#A63B32",
  },
  notes: [
    "Roles and scopes are coarse entry posture only; they never encode client delegation or authority-of-record truth.",
    "Matrix rows privilege source-backed policy statements over decorative chrome.",
    "Reduced motion keeps the same hierarchy and swaps inspector movement for opacity-only emphasis.",
  ],
} as const;
