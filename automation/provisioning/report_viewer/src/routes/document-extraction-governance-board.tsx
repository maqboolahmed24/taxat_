export const documentExtractionGovernanceBoardRoute = {
  id: "document-extraction-governance-board",
  title: "Document Extraction Governance Board",
  purpose:
    "Render a quiet evidence atelier for document profiles, review thresholds, and the source-to-candidate-fact boundary without implying that OCR output is canonical truth.",
  focusOrder: [
    "document-extraction-profile-rail",
    "document-extraction-governance-canvas",
    "document-extraction-inspector",
  ],
  sections: [
    "Source Artifact",
    "Normalized Extraction",
    "Candidate-Fact Boundary",
    "Threshold policy and lineage inspector",
  ],
  palette: {
    background: "#F5F6F4",
    surface: "#FFFFFF",
    secondary: "#EEF1EC",
    ink: "#111418",
    muted: "#65707A",
    hairline: "rgba(17,20,24,0.08)",
    accentBronze: "#7A5E3C",
    accentEucalyptus: "#5E7267",
    accentSlate: "#415B73",
    success: "#16624B",
    warning: "#8A5C18",
    danger: "#A63B32",
  },
  notes: [
    "The rail behaves like an archival classification index, not a dashboard.",
    "The canvas explains the three evidence planes in one view: source artifact, normalized extraction, and candidate-fact boundary.",
    "Reduced motion swaps translation for opacity and focus-state emphasis without changing information order.",
  ],
} as const;
