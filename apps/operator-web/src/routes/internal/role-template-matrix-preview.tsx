export const roleTemplateMatrixPreviewRoute = {
  id: "role-template-matrix-preview",
  title: "Role Template Matrix Preview",
  purpose:
    "Inspect the backend-projected governance role matrix, its policy snapshot hash, and its version hash without rebuilding access semantics in the browser.",
  palette: {
    background: "#F5F4F1",
    surface: "#FFFFFF",
    secondary: "#EEECE7",
    ink: "#11161B",
    muted: "#65707A",
    hairline: "rgba(17,22,27,0.08)",
    accentIndigo: "#4C5F7B",
    accentSage: "#66735C",
    accentBronze: "#8C6937",
    success: "#165F49",
    warning: "#875A1B",
    danger: "#A13A34",
  },
  notes: [
    "The preview reads one committed role matrix and policy hash pair instead of deriving grants from client-local UI state.",
    "Pending role-editor change refs, latest simulation refs, and stale-review posture remain visible as route state without mutating the committed policy snapshot hash.",
    "Keyboard traversal, selected-cell continuity, and reduced-motion parity stay part of the preview contract because the route is evidence, not decoration.",
  ],
} as const;
