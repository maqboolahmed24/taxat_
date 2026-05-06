export const reconciliationBudgetBand = {
  chart_policy: "HORIZONTAL_SEGMENTED_BAND_ONLY",
  test_id: "reconciliation-budget-band",
  tones: {
    active: "#1D4ED8",
    closed: "#0F766E",
    escalated: "#C2410C",
    exhausted: "#B7791F",
    not_opened: "#667085",
  },
} as const;
