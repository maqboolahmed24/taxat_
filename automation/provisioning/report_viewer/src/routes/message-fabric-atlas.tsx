export const messageFabricAtlasRoute = {
  id: "message-fabric-atlas",
  title: "Message Fabric Atlas",
  purpose:
    "Render a premium coordination atlas for durable outboxes, broker lanes, authenticated inboxes, and retry or dedupe law without collapsing into a cloud-operations console.",
  focusOrder: [
    "message-family-rail",
    "message-fabric-canvas",
    "message-fabric-inspector",
  ],
  sections: [
    "Durable Outboxes",
    "Broker Channels",
    "Inbox / Consumers",
    "Ordering / Partition / Retry",
  ],
  palette: {
    background: "#F5F6F4",
    surface: "#FFFFFF",
    secondary: "#EEF1EC",
    ink: "#111418",
    muted: "#65707A",
    hairline: "rgba(17,20,24,0.08)",
    accentNavy: "#425B74",
    accentCopper: "#8A6431",
    accentMoss: "#5A6F61",
    success: "#16624B",
    warning: "#8A5C18",
    danger: "#A63B32",
  },
  notes: [
    "The page emphasizes transport-only posture and broker-loss recoverability over provider metrics.",
    "Authority callback ingress stays visually distinct because it enters through the dedupe inbox without a transactional outbox.",
    "Reduced motion uses focus and opacity only.",
  ],
} as const;
