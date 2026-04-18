export const emailDomainReadinessBoardRoute = {
  id: "email-domain-readiness-board",
  title: "Email Domain Readiness Board",
  purpose:
    "Render a calm operational board for transactional email workspace posture, sender-domain readiness, DNS verification, and message-stream partitioning without exposing raw provider tokens or implying that email delivery is workflow truth.",
  focusOrder: [
    "domain-rail",
    "readiness-canvas",
    "readiness-inspector",
  ],
  sections: [
    "Workspace",
    "Domain Identity",
    "DNS Records",
    "Message Streams",
  ],
  palette: {
    background: "#F5F6F4",
    surface: "#FFFFFF",
    secondary: "#EEF1EC",
    ink: "#111418",
    muted: "#65707A",
    hairline: "rgba(17,20,24,0.08)",
    accentMoss: "#586F58",
    accentEmber: "#8A5C18",
    success: "#16624B",
    warning: "#8A5C18",
    danger: "#A63B32",
  },
  notes: [
    "The board is an operational checklist, not a provider settings mirror.",
    "Delivery events, bounce posture, and suppressions remain transport observations only and never become workflow truth.",
    "Reduced motion keeps the same information hierarchy and swaps inspector movement for opacity-only changes.",
  ],
} as const;
