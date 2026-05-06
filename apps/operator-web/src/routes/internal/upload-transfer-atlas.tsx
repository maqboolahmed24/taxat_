export const uploadTransferAtlasRoute = {
  id: "upload-transfer-atlas",
  title: "Upload Transfer Atlas",
  purpose:
    "Document the governed upload session scaffold for allocation, resumable transfer, checksum, rebase, validation, and attachment without conflating byte movement with request satisfaction.",
  transferStages: ["ALLOCATED", "UPLOADING", "CHECKSUM", "SCANNING", "VALIDATION", "ATTACHMENT"],
  palette: {
    background: "#F5F5F2",
    surface: "#FFFFFF",
    secondary: "#EEF0EC",
    ink: "#101418",
    muted: "#68717A",
    hairline: "rgba(16,20,24,0.08)",
    accentTeal: "#3F6672",
    accentOlive: "#64715C",
    accentRust: "#8A5F42",
    success: "#17624B",
    warning: "#8C5D1B",
    danger: "#A53A31",
  },
  notes: [
    "Transfer completion is intentionally distinct from attachment confirmation and current-request satisfaction.",
    "Reconnect, reload, duplicate retry, and cross-device continuation all reuse one governed upload session and one storage lineage.",
    "The atlas stays read-only and never exposes uploaded payload bytes or provider-native object URLs.",
  ],
} as const;
