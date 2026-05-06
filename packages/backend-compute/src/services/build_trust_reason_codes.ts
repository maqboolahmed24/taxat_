import type {
  DecisionExplainabilityContract,
  ThresholdStabilityState,
  TrustAutomationLevel,
  TrustBand,
  TrustInputBasisContract,
  TrustCapDriverReasonCode,
} from "../models/trust_summary.ts";

export const TRUST_REASON_ORDER = [
  "TRUST_INSUFFICIENT_DATA",
  "TRUST_INPUT_CONTRADICTION",
  "TRUST_INPUT_INCOMPLETE",
  "TRUST_RECALCULATION_REQUIRED",
  "TRUST_OVERRIDE_INVALID",
  "TRUST_UPSTREAM_GATE_BLOCK",
  "TRUST_RED",
  "TRUST_INPUT_STALE",
  "TRUST_UPSTREAM_GATE_REVIEW_REQUIRED",
  "TRUST_THRESHOLD_EDGE_REVIEW",
  "TRUST_REQUIRED_HUMAN_STEPS",
  "TRUST_AUTHORITY_STATE_UNRESOLVED",
  "TRUST_AUTHORITY_PENALTY",
  "TRUST_OVERRIDE_PENALTY",
  "TRUST_RETENTION_PENALTY",
  "TRUST_ANALYSIS_MODE_CAP",
  "TRUST_AUTOMATION_LIMITED",
  "TRUST_UPSTREAM_GATE_NOTICE_ACTIVE",
  "PARITY_PARTIAL_COVERAGE",
  "PARITY_NOT_REQUIRED_NO_AUTHORITY_BASIS",
  "TRUST_AMBER",
  "TRUST_GREEN",
] as const;

const CAP_DRIVER_REASONS = new Set<string>([
  "TRUST_INPUT_INCOMPLETE",
  "TRUST_INPUT_CONTRADICTION",
  "TRUST_INPUT_STALE",
  "TRUST_OVERRIDE_INVALID",
  "TRUST_THRESHOLD_EDGE_REVIEW",
  "TRUST_UPSTREAM_GATE_BLOCK",
  "TRUST_UPSTREAM_GATE_REVIEW_REQUIRED",
  "TRUST_REQUIRED_HUMAN_STEPS",
  "TRUST_OVERRIDE_PENALTY",
  "TRUST_RETENTION_PENALTY",
  "TRUST_AUTHORITY_STATE_UNRESOLVED",
  "TRUST_AUTHORITY_PENALTY",
  "TRUST_ANALYSIS_MODE_CAP",
  "TRUST_NON_LIVE_EXECUTION_BOUNDARY_CAP",
  "TRUST_RECALCULATION_REQUIRED",
]);

const QUALIFIER_ORDER = [
  "AUTHORITY_STATE",
  "LIMITATION_STATE",
  "OVERRIDE_STATE",
  "ACTIONABILITY_STATE",
] as const satisfies readonly DecisionExplainabilityContract["semantic_qualifiers"][number][];

export function trustBandSeverity(value: TrustBand | "RED" | "AMBER" | "GREEN") {
  switch (value) {
    case "GREEN":
      return 0;
    case "AMBER":
      return 1;
    case "RED":
      return 2;
    case "INSUFFICIENT_DATA":
      return 3;
  }
}

export function mostRestrictiveTrustBand(left: TrustBand | "RED" | "AMBER" | "GREEN", right: TrustBand) {
  return trustBandSeverity(left) >= trustBandSeverity(right) ? (left as TrustBand) : right;
}

export function terminalTrustBandReason(trustBand: TrustBand) {
  switch (trustBand) {
    case "GREEN":
      return "TRUST_GREEN";
    case "AMBER":
      return "TRUST_AMBER";
    case "RED":
      return "TRUST_RED";
    case "INSUFFICIENT_DATA":
      return "TRUST_INSUFFICIENT_DATA";
  }
}

export function orderTrustReasonCodes(reasonCodes: readonly string[], options?: { maxItems?: number }) {
  const normalized = [...new Set(reasonCodes.filter((reason) => reason.trim().length > 0))];
  const present = new Set(normalized);
  const ordered = [
    ...TRUST_REASON_ORDER.filter((reason) => present.has(reason)),
    ...normalized.filter((reason) => !TRUST_REASON_ORDER.includes(reason as never)).sort(),
  ];
  return ordered.slice(0, options?.maxItems ?? 8);
}

export function deriveTrustCapDriverReasonCodes(input: {
  cap_band: TrustBand;
  reason_codes: readonly string[];
  score_band: "RED" | "AMBER" | "GREEN";
}) {
  if (trustBandSeverity(input.cap_band) <= trustBandSeverity(input.score_band)) {
    return [];
  }
  return orderTrustReasonCodes(
    input.reason_codes.filter((reason) => CAP_DRIVER_REASONS.has(reason)),
    { maxItems: 8 },
  ) as TrustCapDriverReasonCode[];
}

export function buildTrustDecisionExplainability(input: {
  active_filing_critical_override_count?: number;
  authority_uncertainty_score?: number;
  automation_level?: TrustAutomationLevel;
  decision_constraint_codes?: readonly string[];
  plain_summary: string;
  reason_codes: readonly string[];
  threshold_stability_state?: ThresholdStabilityState;
  trust_input_basis_authority_progression_state?: TrustInputBasisContract["authority_progression_state"];
}): DecisionExplainabilityContract {
  const ordered = orderTrustReasonCodes(input.reason_codes);
  const compressed = ordered.slice(0, 3);
  const semanticQualifiers = new Set<DecisionExplainabilityContract["semantic_qualifiers"][number]>();
  if (
    (input.authority_uncertainty_score ?? 0) > 0 ||
    ["REVIEW_LIMITED", "BLOCKED"].includes(
      input.trust_input_basis_authority_progression_state ?? "NOT_REQUESTED_OR_NOT_APPLICABLE",
    ) ||
    ordered.some((reason) => reason.includes("AUTHORITY"))
  ) {
    semanticQualifiers.add("AUTHORITY_STATE");
  }
  if (
    ["LIMITED", "BLOCKED"].includes(input.automation_level ?? "ALLOWED") ||
    (input.decision_constraint_codes ?? []).length > 0 ||
    input.threshold_stability_state === "EDGE_REVIEW"
  ) {
    semanticQualifiers.add("LIMITATION_STATE");
  }
  if (
    (input.active_filing_critical_override_count ?? 0) > 0 ||
    ordered.some((reason) => reason.includes("OVERRIDE"))
  ) {
    semanticQualifiers.add("OVERRIDE_STATE");
  }
  return {
    action_projection_state: "NONE",
    artifact_family: "TRUST_SUMMARY",
    compressed_reason_codes: compressed,
    compression_policy: "PREFIX_COMPRESS_ORDERED_REASON_CODES_WITH_SUPPRESSED_COUNT",
    compression_reason_cap: 3,
    contract_version: "DECISION_EXPLAINABILITY_V1",
    dominant_reason_code: ordered[0],
    dominant_reason_selection_policy: "FIRST_ORDERED_REASON_IS_DOMINANT",
    grammar_profile_code: "LOW_NOISE_DECISION_GRAMMAR_V1",
    ordered_reason_codes: ordered,
    plain_text_character_limit: 200,
    plain_text_field_name: "plain_summary",
    reason_order_policy: "DOMINANT_REASON_FIRST_CANONICAL_PRIORITY",
    semantic_qualifiers: QUALIFIER_ORDER.filter((qualifier) => semanticQualifiers.has(qualifier)),
    summary_source_policy: "READ_SURFACES_MUST_USE_PERSISTED_FIELDS",
    suppressed_reason_count: Math.max(0, ordered.length - compressed.length),
  };
}

export function plainTrustSummary(input: {
  automation_level: string;
  dominant_reason_code: string;
  filing_readiness: string;
  trust_band: TrustBand;
}) {
  return `Trust is ${input.trust_band}; automation is ${input.automation_level} and filing readiness is ${input.filing_readiness} because ${input.dominant_reason_code}.`;
}
