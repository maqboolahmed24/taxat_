export const environmentBasisAtlasRoute = {
  id: "environment-basis-atlas",
  title: "Environment Basis Atlas",
  purpose:
    "Explain how bootstrap inputs, opaque secret handles, frozen config, and runtime consumers stay separated without collapsing runtime policy into a settings form.",
  consumers: ["API", "WORKER", "CLI", "PYTHON", "BROWSER_BUILD", "PLAYWRIGHT", "NATIVE"],
  strata: ["BOOTSTRAP INPUTS", "SECRET HANDLES", "FROZEN CONFIG", "RUNTIME CONSUMERS"],
  palette: {
    background: "#F4F5F2",
    surface: "#FFFFFF",
    secondary: "#EEF1EE",
    ink: "#0F1317",
    muted: "#68717A",
    hairline: "rgba(15,19,23,0.08)",
    accentTeal: "#2E6171",
    accentPine: "#4E6B58",
    accentUmber: "#8C6940",
    success: "#17624C",
    warning: "#8D5E1E",
    danger: "#A63B32",
  },
  notes: [
    "Bootstrap inputs, secret handles, and frozen config are distinct runtime strata rather than one mutable env bag.",
    "Browser-safe values stay explicitly allowlisted; secret-handle metadata can be inspected without exposing raw values.",
    "ConfigFreeze remains the post-seal execution basis for server and native-adjacent consumers.",
  ],
} as const;
