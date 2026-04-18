export const resumeIsolationAtlasRoute = {
  id: "resume-isolation-atlas",
  title: "Resume Isolation Atlas",
  purpose:
    "Render a premium continuity atlas for cache partition identity, route-bound resume envelopes, TTL or purge law, and local-versus-shared storage boundaries without drifting into a cache-performance dashboard.",
  focusOrder: [
    "resume-family-rail",
    "resume-isolation-canvas",
    "resume-isolation-inspector",
  ],
  sections: ["Partition Identity", "Resume Binding", "Invalidation / Rebase"],
  palette: {
    background: "#F5F6F4",
    surface: "#FFFFFF",
    secondary: "#EEF1EC",
    ink: "#111418",
    muted: "#65707A",
    hairline: "rgba(17,20,24,0.08)",
    accentSteelBlue: "#46657F",
    accentOlive: "#5A705F",
    accentBrass: "#8A6731",
    success: "#16624B",
    warning: "#8A5C18",
    danger: "#A63B32",
  },
  notes: [
    "The page emphasizes lawful reuse and invalidation over hit rates or memory charts.",
    "Raw resume tokens never appear in the atlas; only hashed envelope or invalidation posture is described.",
    "Reduced motion uses focus and opacity only.",
  ],
} as const;
