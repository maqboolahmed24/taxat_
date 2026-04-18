export const idpTopologyAtlasRoute = {
  id: "idp-topology-atlas",
  title: "IdP Topology Atlas",
  purpose:
    "Render an architectural atlas of the external OIDC control plane, including provider tenants, interactive clients, machine clients, callback bindings, and vault-safe secret posture without exposing live secrets.",
  focusOrder: [
    "environment-rail",
    "topology-canvas",
    "topology-inspector",
  ],
  sections: [
    "Provider tenant",
    "Interactive clients",
    "Callback and origin bindings",
    "Machine clients",
  ],
  palette: {
    background: "#F5F6F4",
    surface: "#FFFFFF",
    secondary: "#EEF1EC",
    ink: "#111418",
    muted: "#65707A",
    hairline: "rgba(17,20,24,0.08)",
    accentIndigo: "#415E78",
    accentEvergreen: "#54705D",
    success: "#16624B",
    warning: "#8A5C18",
    danger: "#A63B32",
  },
  notes: [
    "Business-tenant truth stays inside Taxat's own domain model; the provider topology shows coarse authentication bootstrap only.",
    "Copy affordances are limited to safe refs, aliases, fingerprints, and vault metadata locations.",
    "Reduced motion preserves full atlas readability and swaps node transitions for opacity and outline-only changes.",
  ],
} as const;
