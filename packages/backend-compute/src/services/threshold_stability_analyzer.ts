import type { ThresholdStabilityState, TrustEdgeTriggerCode } from "../models/trust_summary.ts";

export type ThresholdStabilityInput = {
  authority_uncertainty_score: number;
  completeness_score: number;
  filing_capable: boolean;
  graph_quality_score: number;
  live_authority_progression_requested: boolean;
  risk_score: number;
  trust_score: number;
};

export type ThresholdStabilityResult = {
  authority_block_margin_or_null: number | null;
  authority_review_margin_or_null: number | null;
  completeness_margin: number;
  edge_trigger_codes: TrustEdgeTriggerCode[];
  graph_filing_margin_or_null: number | null;
  risk_automation_margin: number;
  threshold_stability_state: ThresholdStabilityState;
  trust_amber_margin: number;
  trust_green_margin: number;
};

const EDGE_TRIGGER_ORDER: TrustEdgeTriggerCode[] = [
  "TRUST_GREEN_GUARD_BAND",
  "TRUST_AMBER_GUARD_BAND",
  "RISK_AUTOMATION_GUARD_BAND",
  "COMPLETENESS_GUARD_BAND",
  "GRAPH_FILING_GUARD_BAND",
  "AUTHORITY_REVIEW_GUARD_BAND",
  "AUTHORITY_BLOCK_GUARD_BAND",
];

function isInsidePositiveGuardBand(margin: number, guardBand: number) {
  return margin >= 0 && margin < guardBand;
}

export function analyzeThresholdStability(input: ThresholdStabilityInput): ThresholdStabilityResult {
  const trustGreenMargin = input.trust_score - 85;
  const trustAmberMargin = input.trust_score - 65;
  const riskAutomationMargin = 40 - input.risk_score;
  const completenessMargin = input.completeness_score - 60;
  const graphFilingMargin = input.filing_capable ? input.graph_quality_score - 50 : null;
  const authorityReviewMargin = input.live_authority_progression_requested
    ? 35 - input.authority_uncertainty_score
    : null;
  const authorityBlockMargin = input.live_authority_progression_requested
    ? 70 - input.authority_uncertainty_score
    : null;
  const triggers = new Set<TrustEdgeTriggerCode>();
  if (Math.abs(trustGreenMargin) < 2) {
    triggers.add("TRUST_GREEN_GUARD_BAND");
  }
  if (Math.abs(trustAmberMargin) < 2) {
    triggers.add("TRUST_AMBER_GUARD_BAND");
  }
  if (isInsidePositiveGuardBand(riskAutomationMargin, 2)) {
    triggers.add("RISK_AUTOMATION_GUARD_BAND");
  }
  if (isInsidePositiveGuardBand(completenessMargin, 3)) {
    triggers.add("COMPLETENESS_GUARD_BAND");
  }
  if (graphFilingMargin !== null && isInsidePositiveGuardBand(graphFilingMargin, 3)) {
    triggers.add("GRAPH_FILING_GUARD_BAND");
  }
  if (authorityReviewMargin !== null && isInsidePositiveGuardBand(authorityReviewMargin, 2)) {
    triggers.add("AUTHORITY_REVIEW_GUARD_BAND");
  }
  if (authorityBlockMargin !== null && isInsidePositiveGuardBand(authorityBlockMargin, 2)) {
    triggers.add("AUTHORITY_BLOCK_GUARD_BAND");
  }
  const edgeTriggerCodes = EDGE_TRIGGER_ORDER.filter((trigger) => triggers.has(trigger));
  return {
    authority_block_margin_or_null: authorityBlockMargin,
    authority_review_margin_or_null: authorityReviewMargin,
    completeness_margin: completenessMargin,
    edge_trigger_codes: edgeTriggerCodes,
    graph_filing_margin_or_null: graphFilingMargin,
    risk_automation_margin: riskAutomationMargin,
    threshold_stability_state: edgeTriggerCodes.length > 0 ? "EDGE_REVIEW" : "STABLE",
    trust_amber_margin: trustAmberMargin,
    trust_green_margin: trustGreenMargin,
  };
}
