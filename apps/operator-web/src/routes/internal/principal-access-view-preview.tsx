export const principalAccessViewPreviewRoute = {
  id: "principal-access-view-preview",
  title: "Principal Access View Preview",
  purpose:
    "Inspect one backend-projected principal access workspace, including mounted selection, authority-layer explanation, and simulator linkage, without recomputing access rules in the browser.",
  palette: {
    background: "#F4F4F1",
    surface: "#FFFFFF",
    secondary: "#ECEBE5",
    ink: "#10171D",
    muted: "#66707A",
    hairline: "rgba(16, 23, 29, 0.08)",
    accentSlate: "#4A6075",
    accentMoss: "#61715D",
    accentAmber: "#8B6934",
    success: "#156049",
    warning: "#875A1C",
    danger: "#A23934",
  },
  notes: [
    "The preview mounts one principal access view rather than a paginated directory API, so filters express route context and recovery posture instead of rebuilding authority truth.",
    "Selected action detail, authority-chain rails, and optional simulator linkage all come from one frozen payload and must stay aligned under keyboard travel and filter changes.",
    "Reduced-motion parity, full-statement cell labels, and typed recovery remain part of the evidence surface because this route is an inspection harness, not a decorative mockup.",
  ],
} as const;
