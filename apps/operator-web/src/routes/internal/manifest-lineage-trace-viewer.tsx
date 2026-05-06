export const manifestLineageTraceViewerRoute = {
  id: "manifest-lineage-trace-viewer",
  title: "Manifest Lineage Trace Viewer",
  purpose:
    "Inspect one persisted request-time ManifestLineageTrace without reconstructing branch meaning from adjacent manifests, logs, or scheduler memory.",
  palette: {
    background: "#F6F4F0",
    surface: "#FFFFFF",
    secondary: "#EEEAE3",
    ink: "#11171C",
    muted: "#66707A",
    hairline: "rgba(17,23,28,0.08)",
    accentBlueSlate: "#4A6278",
    accentOlive: "#68725A",
    accentBrass: "#8E6C37",
    success: "#165F49",
    warning: "#885B1C",
    danger: "#A23A34",
  },
  notes: [
    "The selected branch action is request-time truth and may differ from the selected manifest continuation basis.",
    "Candidate order, mirror sources, nightly context, and append-only trace refs are persisted evidence, not browser-derived inference.",
    "The route stays read-only and keyboard navigable so it can serve as a branch explorer and Playwright evidence surface.",
  ],
} as const;
