export const calculationIdentityStrip = {
  test_id: "calculation-identity-strip",
  fields: [
    "tax_year",
    "period",
    "calculation_freshness",
    "live_or_modeled",
    "confirmation_status",
    "stale_protection_state",
  ],
  posture: "compact-lineage-cue",
} as const;
