export const deviceMessagingTopologyBoardRoute = {
  id: "device-messaging-topology-board",
  title: "Device Messaging Topology Board",
  purpose:
    "Render a sparse transport-topology sheet for active device-messaging channels, key lineage, and notification-open continuity without implying that push delivery is workflow truth.",
  focusOrder: [
    "device-messaging-channel-rail",
    "device-messaging-topology-canvas",
    "device-messaging-inspector",
  ],
  sections: [
    "Product notification families",
    "Provider channels",
    "Shell/route continuity targets",
    "Key lineage and binding inspector",
  ],
  palette: {
    background: "#F5F6F4",
    surface: "#FFFFFF",
    secondary: "#EEF1EC",
    ink: "#111418",
    muted: "#65707A",
    hairline: "rgba(17,20,24,0.08)",
    accentCobalt: "#456A88",
    accentPine: "#4E6C5E",
    success: "#16624B",
    warning: "#8A5C18",
    danger: "#A63B32",
  },
  notes: [
    "The topology board is transport-first and avoids campaign or engagement dashboard language.",
    "Continuity chips stay sparse and exact: same object, same shell, explicit parent return.",
    "Reduced motion preserves the same lane and inspector hierarchy with opacity-only emphasis.",
  ],
} as const;
