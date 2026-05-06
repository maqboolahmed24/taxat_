export const edgeBoundaryAtlasRoute = {
  id: "edge-boundary-atlas",
  title: "Edge Boundary Atlas",
  purpose:
    "Render a premium delivery atlas for host families, origin trust, certificate scope, WAF and rate-limit posture, cache law, preview isolation, and callback boundaries without turning into a provider console clone.",
  focusOrder: ["edge-family-rail", "edge-boundary-canvas", "edge-boundary-inspector"],
  sections: [
    "Hostnames / Origins",
    "TLS / Certificates",
    "WAF / Rate Limits",
    "Cache / Delivery Binding",
  ],
  palette: {
    background: "#F5F6F4",
    surface: "#FFFFFF",
    secondary: "#EEF1EC",
    ink: "#111418",
    muted: "#65707A",
    hairline: "rgba(17,20,24,0.08)",
    accentIndigoSlate: "#445E79",
    accentOlive: "#5D725F",
    accentBrass: "#8A6832",
    success: "#16624B",
    warning: "#8A5C18",
    danger: "#A63B32",
  },
  notes: [
    "The four-plane atlas is the diagram; it favors explicit delivery law over dashboard ornament.",
    "Host, TLS, WAF, and cache surfaces remain keyboard-addressable and independently inspectable.",
    "Reduced motion uses focus and opacity only.",
  ],
} as const;
