export const notificationCopyAtlasRoute = {
  id: "notification-copy-atlas",
  title: "Notification Copy Atlas",
  purpose:
    "Render a low-noise, editorial systems view of product-owned email templates, continuity anchors, delivery-event callbacks, and privacy-minimizing telemetry posture.",
  focusOrder: [
    "notification-template-rail",
    "notification-copy-canvas",
    "notification-copy-inspector",
  ],
  sections: [
    "Email preview",
    "Continuity and merge provenance",
    "Lifecycle rail",
    "Webhook and privacy posture",
  ],
  palette: {
    background: "#F5F6F4",
    surface: "#FFFFFF",
    secondary: "#EEF1EC",
    ink: "#111418",
    muted: "#65707A",
    hairline: "rgba(17,20,24,0.08)",
    accentDenim: "#46637F",
    accentPlumGrey: "#746B7F",
    success: "#16624B",
    warning: "#8A5C18",
    danger: "#A63B32",
  },
  notes: [
    "Literal customer copy leads; provider chrome stays quiet.",
    "The lifecycle rail is explanatory rather than analytical, and it never implies a marketing funnel.",
    "Reduced motion keeps the same route, inspector, and provenance hierarchy with opacity-only emphasis.",
  ],
} as const;
