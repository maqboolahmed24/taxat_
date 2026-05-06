export const workspaceTopologyAtlasRoute = {
  id: "workspace-topology-atlas",
  title: "Workspace Topology Atlas",
  purpose:
    "Visualize the monorepo bootstrap across apps, shared packages, generated outputs, Python tooling, and the signed macOS boundary without reducing the repo to a dependency dashboard.",
  families: ["APPS", "SHARED_PACKAGES", "GENERATED", "PYTHON_TOOLING", "NATIVE_MACOS"],
  planes: ["Ownership", "Dependency / Task Graph", "Runtime Surface"],
  palette: {
    background: "#F5F6F4",
    surface: "#FFFFFF",
    secondary: "#EEF1EC",
    ink: "#111418",
    muted: "#65707A",
    hairline: "rgba(17,20,24,0.08)",
    accentSlate: "#476175",
    accentMoss: "#5D715F",
    accentBronze: "#8A6731",
    success: "#16624B",
    warning: "#8A5C18",
    danger: "#A63B32",
  },
  notes: [
    "The atlas keeps source, generated, Python, and native boundaries explicit.",
    "Generic bootstrap package labels are overridden where phase-00 ADR outputs already froze stronger package IDs and paths.",
    "The route is read-only and exists to explain ownership, dependency direction, and runtime posture.",
  ],
} as const;
