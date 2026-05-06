export const deliveryPipelineAtlasRoute = {
  id: "delivery-pipeline-atlas",
  title: "Delivery Pipeline Atlas",
  purpose:
    "Render a premium delivery choreography sheet for runner pools, identity posture, gate law, and preview teardown without collapsing into a CI vendor dashboard clone.",
  focusOrder: ["delivery-lane-rail", "delivery-pipeline-canvas", "delivery-pipeline-inspector"],
  sections: ["Runner Pools", "Identity / Secret Resolution", "Gates", "Preview Lifecycle"],
  palette: {
    background: "#F5F6F4",
    surface: "#FFFFFF",
    secondary: "#EEF1EC",
    ink: "#111418",
    muted: "#65707A",
    hairline: "rgba(17,20,24,0.08)",
    accentBlueSlate: "#46627A",
    accentOlive: "#5A705F",
    accentOchre: "#8A6630",
    success: "#16624B",
    warning: "#8A5C18",
    danger: "#A63B32",
  },
  notes: [
    "The atlas is read-only and favors delivery law over build vanity metrics.",
    "Runner, identity, gate, and preview surfaces remain keyboard-addressable and independently inspectable.",
    "Reduced motion uses focus and opacity only.",
  ],
} as const;
