export const storageBucketTopologyBoardRoute = {
  id: "storage-bucket-topology-board",
  title: "Storage Bucket Topology Board",
  purpose:
    "Render a premium object-storage atlas for bucket purpose zones, lifecycle law, event-route posture, and quarantine isolation without collapsing into a cloud-operations console.",
  focusOrder: [
    "storage-bucket-rail",
    "storage-topology-canvas",
    "storage-topology-inspector",
  ],
  sections: [
    "Upload Intake",
    "Retained Evidence",
    "Derived / Export Artifacts",
    "Quarantine",
    "Lifecycle / Retention / Event Routes",
  ],
  palette: {
    background: "#F5F6F4",
    surface: "#FFFFFF",
    secondary: "#EEF1EC",
    ink: "#111418",
    muted: "#65707A",
    hairline: "rgba(17,20,24,0.08)",
    accentOcean: "#44637C",
    accentUmber: "#8B6732",
    accentMoss: "#597063",
    success: "#16624B",
    warning: "#8A5C18",
    danger: "#A63B32",
  },
  notes: [
    "The page emphasizes immutable refs, lawful visibility, and lifecycle boundaries over storage metrics.",
    "Masked and restricted exports remain visually and semantically distinct.",
    "Reduced motion uses focus and opacity only.",
  ],
} as const;
