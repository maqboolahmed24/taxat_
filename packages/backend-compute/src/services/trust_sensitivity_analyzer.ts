import { stableJsonHash } from "../../../domain-kernel/src/primitives/hash.ts";
import type {
  ExecutionModeBoundaryContract,
  TrustAutomationLevel,
  TrustBaselineSubmissionState,
  TrustBand,
  TrustCapDriverReasonCode,
  TrustInputBasisContract,
  TrustInputState,
  TrustScoreBand,
  TrustSensitivityAnalysisContract,
  TrustSensitivityCaseCode,
  TrustSensitivityProjectedCase,
  UpstreamGateCap,
} from "../models/trust_summary.ts";
import {
  deriveTrustCapDriverReasonCodes,
  mostRestrictiveTrustBand,
  orderTrustReasonCodes,
  terminalTrustBandReason,
  trustBandSeverity,
} from "./build_trust_reason_codes.ts";
import { analyzeThresholdStability } from "./threshold_stability_analyzer.ts";

export type TrustPostureDerivationInput = {
  active_filing_critical_override_count: number;
  authority_penalty: number;
  authority_uncertainty_score: number;
  baseline_submission_state: TrustBaselineSubmissionState;
  completeness_score: number;
  execution_legal_effect_boundary: ExecutionModeBoundaryContract["legal_effect_boundary"];
  execution_mode: "COMPLIANCE" | "ANALYSIS";
  graph_quality_score: number;
  input_reason_codes: readonly string[];
  late_data_invalidation_state: TrustInputBasisContract["late_data_invalidation_state"];
  live_authority_progression_requested: boolean;
  override_dependency_state: TrustInputBasisContract["override_dependency_state"];
  required_human_step_count: number;
  risk_score: number;
  trust_input_state: TrustInputState;
  trust_score: number;
  unresolved_blocking_risk_flag: boolean;
  unresolved_material_blocking_risk_flag: boolean;
  upstream_gate_cap: UpstreamGateCap;
  basis_automation_ceiling: TrustAutomationLevel;
  critical_retention_limited_count: number;
};

export type TrustPostureDerivationResult = {
  automation_level: TrustAutomationLevel;
  cap_band: TrustBand;
  cap_driver_reason_codes: TrustCapDriverReasonCode[];
  filing_readiness: "READY_TO_SUBMIT" | "READY_REVIEW" | "NOT_READY";
  reason_codes: string[];
  score_band: TrustScoreBand;
  score_cap_alignment_state: "ALIGNED" | "SCORE_STRICTER_THAN_CAP" | "CAP_STRICTER_THAN_SCORE";
  threshold: ReturnType<typeof analyzeThresholdStability>;
  trust_band: TrustBand;
};

const SENSITIVITY_CASE_ORDER: TrustSensitivityCaseCode[] = [
  "TRUST_SCORE_MINUS_ONE",
  "TRUST_SCORE_PLUS_ONE",
  "RISK_SCORE_PLUS_ONE",
  "AUTHORITY_UNCERTAINTY_PLUS_ONE",
  "FRESHNESS_INVALIDATED",
  "INVALID_OVERRIDE_RELIED_UPON",
];

function scoreBand(trustScore: number): TrustScoreBand {
  if (trustScore >= 85) {
    return "GREEN";
  }
  if (trustScore >= 65) {
    return "AMBER";
  }
  return "RED";
}

function readinessForAutomation(value: TrustAutomationLevel) {
  return value === "ALLOWED" ? "READY_TO_SUBMIT" : value === "LIMITED" ? "READY_REVIEW" : "NOT_READY";
}

function alignment(score: TrustScoreBand, cap: TrustBand) {
  if (trustBandSeverity(score) === trustBandSeverity(cap)) {
    return "ALIGNED" as const;
  }
  return trustBandSeverity(cap) > trustBandSeverity(score)
    ? "CAP_STRICTER_THAN_SCORE"
    : "SCORE_STRICTER_THAN_CAP";
}

function deriveCapBand(input: TrustPostureDerivationInput, threshold: ReturnType<typeof analyzeThresholdStability>) {
  const reasons: string[] = [];
  if (
    input.trust_input_state === "INCOMPLETE" ||
    input.trust_input_state === "CONTRADICTED" ||
    input.completeness_score < 60 ||
    (input.live_authority_progression_requested && input.graph_quality_score < 50)
  ) {
    reasons.push(...input.input_reason_codes);
    if (threshold.threshold_stability_state === "EDGE_REVIEW") {
      reasons.push("TRUST_THRESHOLD_EDGE_REVIEW");
    }
    return { cap_band: "INSUFFICIENT_DATA" as const, reasons };
  }
  if (
    input.unresolved_blocking_risk_flag ||
    input.upstream_gate_cap === "BLOCKED" ||
    (input.live_authority_progression_requested && input.authority_uncertainty_score >= 70) ||
    input.basis_automation_ceiling === "BLOCKED"
  ) {
    if (input.upstream_gate_cap === "BLOCKED") {
      reasons.push("TRUST_UPSTREAM_GATE_BLOCK");
    }
    if (input.live_authority_progression_requested && input.authority_uncertainty_score >= 70) {
      reasons.push("TRUST_AUTHORITY_STATE_UNRESOLVED");
    }
    if (threshold.threshold_stability_state === "EDGE_REVIEW") {
      reasons.push("TRUST_THRESHOLD_EDGE_REVIEW");
    }
    reasons.push(...input.input_reason_codes);
    return { cap_band: "RED" as const, reasons };
  }
  if (
    input.execution_mode === "ANALYSIS" ||
    input.execution_legal_effect_boundary !== "COMPLIANCE_CAPABLE" ||
    input.trust_input_state === "ADMISSIBLE_STALE" ||
    threshold.threshold_stability_state === "EDGE_REVIEW" ||
    threshold.risk_automation_margin < 2 ||
    input.upstream_gate_cap === "REVIEW_ONLY" ||
    input.required_human_step_count > 0 ||
    input.active_filing_critical_override_count > 0 ||
    input.critical_retention_limited_count > 0 ||
    input.unresolved_material_blocking_risk_flag ||
    input.basis_automation_ceiling === "LIMITED" ||
    (input.live_authority_progression_requested && input.authority_uncertainty_score >= 35) ||
    (input.live_authority_progression_requested &&
      (input.baseline_submission_state === "UNKNOWN" ||
        input.baseline_submission_state === "OUT_OF_BAND_UNRECONCILED"))
  ) {
    if (input.execution_mode === "ANALYSIS") {
      reasons.push("TRUST_ANALYSIS_MODE_CAP");
    }
    if (input.execution_legal_effect_boundary !== "COMPLIANCE_CAPABLE") {
      reasons.push("TRUST_NON_LIVE_EXECUTION_BOUNDARY_CAP");
    }
    if (input.trust_input_state === "ADMISSIBLE_STALE") {
      reasons.push("TRUST_INPUT_STALE");
    }
    if (threshold.threshold_stability_state === "EDGE_REVIEW") {
      reasons.push("TRUST_THRESHOLD_EDGE_REVIEW");
    }
    if (input.upstream_gate_cap === "REVIEW_ONLY") {
      reasons.push("TRUST_UPSTREAM_GATE_REVIEW_REQUIRED");
    }
    if (input.required_human_step_count > 0) {
      reasons.push("TRUST_REQUIRED_HUMAN_STEPS");
    }
    if (input.active_filing_critical_override_count > 0) {
      reasons.push("TRUST_OVERRIDE_PENALTY");
    }
    if (input.critical_retention_limited_count > 0) {
      reasons.push("TRUST_RETENTION_PENALTY");
    }
    if (input.live_authority_progression_requested && input.authority_uncertainty_score >= 35) {
      reasons.push("TRUST_AUTHORITY_STATE_UNRESOLVED");
    }
    reasons.push(...input.input_reason_codes);
    return { cap_band: "AMBER" as const, reasons };
  }
  if (input.upstream_gate_cap === "NOTICE_ONLY") {
    reasons.push("TRUST_UPSTREAM_GATE_NOTICE_ACTIVE");
  }
  return { cap_band: "GREEN" as const, reasons };
}

export function deriveTrustPosture(input: TrustPostureDerivationInput): TrustPostureDerivationResult {
  const threshold = analyzeThresholdStability({
    authority_uncertainty_score: input.authority_uncertainty_score,
    completeness_score: input.completeness_score,
    filing_capable: input.live_authority_progression_requested,
    graph_quality_score: input.graph_quality_score,
    live_authority_progression_requested: input.live_authority_progression_requested,
    risk_score: input.risk_score,
    trust_score: input.trust_score,
  });
  const score = scoreBand(input.trust_score);
  const cap = deriveCapBand(input, threshold);
  const trustBand = mostRestrictiveTrustBand(score, cap.cap_band);
  let automationLevel: TrustAutomationLevel =
    trustBand === "GREEN" &&
    input.trust_input_state === "ADMISSIBLE_CURRENT" &&
    threshold.threshold_stability_state === "STABLE" &&
    threshold.risk_automation_margin >= 2 &&
    (input.upstream_gate_cap === "AUTO_ELIGIBLE" || input.upstream_gate_cap === "NOTICE_ONLY") &&
    input.active_filing_critical_override_count === 0 &&
    input.critical_retention_limited_count === 0 &&
    input.required_human_step_count === 0 &&
    input.execution_mode === "COMPLIANCE" &&
    input.basis_automation_ceiling === "ALLOWED" &&
    !(input.live_authority_progression_requested && input.authority_uncertainty_score >= 20) &&
    !(
      input.live_authority_progression_requested &&
      (input.baseline_submission_state === "UNKNOWN" ||
        input.baseline_submission_state === "OUT_OF_BAND_UNRECONCILED")
    )
      ? "ALLOWED"
      : trustBand === "AMBER"
        ? "LIMITED"
        : "BLOCKED";
  if (input.basis_automation_ceiling === "BLOCKED") {
    automationLevel = "BLOCKED";
  } else if (input.basis_automation_ceiling === "LIMITED" && automationLevel === "ALLOWED") {
    automationLevel = "LIMITED";
  }
  const filingReadiness = readinessForAutomation(automationLevel);
  const terminalReason = terminalTrustBandReason(trustBand);
  const reasonCodes = orderTrustReasonCodes([
    terminalReason,
    ...cap.reasons,
    ...(input.authority_penalty > 0 ? ["TRUST_AUTHORITY_PENALTY"] : []),
    ...(automationLevel === "LIMITED" ? ["TRUST_AUTOMATION_LIMITED"] : []),
    ...(input.override_dependency_state === "INVALID_OVERRIDE_RELIED_UPON"
      ? ["TRUST_OVERRIDE_INVALID"]
      : []),
  ]);
  const align = alignment(score, cap.cap_band);
  return {
    automation_level: automationLevel,
    cap_band: cap.cap_band,
    cap_driver_reason_codes: deriveTrustCapDriverReasonCodes({
      cap_band: cap.cap_band,
      reason_codes: reasonCodes,
      score_band: score,
    }),
    filing_readiness: filingReadiness,
    reason_codes: reasonCodes,
    score_band: score,
    score_cap_alignment_state: align,
    threshold,
    trust_band: trustBand,
  };
}

function project(input: TrustPostureDerivationInput, caseCode: TrustSensitivityCaseCode) {
  const projected: TrustPostureDerivationInput = structuredClone(input);
  switch (caseCode) {
    case "TRUST_SCORE_MINUS_ONE":
      projected.trust_score = Math.max(0, input.trust_score - 1);
      break;
    case "TRUST_SCORE_PLUS_ONE":
      projected.trust_score = Math.min(100, input.trust_score + 1);
      break;
    case "RISK_SCORE_PLUS_ONE":
      projected.risk_score = Math.min(100, input.risk_score + 1);
      projected.trust_score = Math.max(0, input.trust_score - 4);
      break;
    case "AUTHORITY_UNCERTAINTY_PLUS_ONE":
      projected.authority_uncertainty_score = Math.min(100, input.authority_uncertainty_score + 1);
      projected.authority_penalty =
        projected.baseline_submission_state === "NOT_APPLICABLE"
          ? 0
          : Math.min(30, Math.round(0.3 * projected.authority_uncertainty_score));
      projected.trust_score = Math.max(0, input.trust_score - Math.max(1, projected.authority_penalty - input.authority_penalty));
      break;
    case "FRESHNESS_INVALIDATED":
      projected.trust_input_state = "ADMISSIBLE_STALE";
      projected.late_data_invalidation_state = "INVALIDATING_FINDING_PRESENT";
      projected.basis_automation_ceiling = "LIMITED";
      projected.input_reason_codes = orderTrustReasonCodes([
        ...input.input_reason_codes,
        "TRUST_INPUT_STALE",
        "TRUST_RECALCULATION_REQUIRED",
      ]);
      projected.trust_score = Math.max(0, input.trust_score - 4);
      break;
    case "INVALID_OVERRIDE_RELIED_UPON":
      projected.trust_input_state = "CONTRADICTED";
      projected.override_dependency_state = "INVALID_OVERRIDE_RELIED_UPON";
      projected.basis_automation_ceiling = "BLOCKED";
      projected.input_reason_codes = orderTrustReasonCodes([
        ...input.input_reason_codes,
        "TRUST_INPUT_CONTRADICTION",
        "TRUST_OVERRIDE_INVALID",
      ]);
      projected.trust_score = Math.max(0, input.trust_score - 4);
      break;
  }
  return projected;
}

function projectedCase(input: {
  base_reason_codes: readonly string[];
  case_code: TrustSensitivityCaseCode;
  projected_input: TrustPostureDerivationInput;
}): TrustSensitivityProjectedCase {
  const posture = deriveTrustPosture(input.projected_input);
  const projectedReasons = new Set(posture.reason_codes);
  const baseReasons = new Set(input.base_reason_codes);
  return {
    case_code: input.case_code,
    monotonicity_expectation: input.case_code === "TRUST_SCORE_PLUS_ONE" ? "NON_DEGRADING" : "NON_IMPROVING",
    projected_authority_block_margin_or_null: posture.threshold.authority_block_margin_or_null,
    projected_authority_review_margin_or_null: posture.threshold.authority_review_margin_or_null,
    projected_automation_level: posture.automation_level,
    projected_cap_band: posture.cap_band,
    projected_completeness_margin: posture.threshold.completeness_margin,
    projected_edge_trigger_codes: posture.threshold.edge_trigger_codes,
    projected_filing_readiness: posture.filing_readiness,
    projected_graph_filing_margin_or_null: posture.threshold.graph_filing_margin_or_null,
    projected_reason_code_additions: [...projectedReasons].filter((reason) => !baseReasons.has(reason)).sort(),
    projected_reason_code_removals: [...baseReasons].filter((reason) => !projectedReasons.has(reason)).sort(),
    projected_risk_automation_margin: posture.threshold.risk_automation_margin,
    projected_score_band: posture.score_band,
    projected_threshold_stability_state: posture.threshold.threshold_stability_state,
    projected_trust_amber_margin: posture.threshold.trust_amber_margin,
    projected_trust_band: posture.trust_band,
    projected_trust_green_margin: posture.threshold.trust_green_margin,
    projected_trust_input_state: input.projected_input.trust_input_state,
    projected_trust_score: input.projected_input.trust_score,
  };
}

export function buildTrustSensitivityAnalysisContract(input: {
  current_input: TrustPostureDerivationInput;
  execution_mode_boundary_contract: ExecutionModeBoundaryContract;
  posture: TrustPostureDerivationResult;
  trust_input_basis_contract: TrustInputBasisContract;
}): TrustSensitivityAnalysisContract {
  const projectedCaseResults = SENSITIVITY_CASE_ORDER.map((caseCode) =>
    projectedCase({
      base_reason_codes: input.posture.reason_codes,
      case_code: caseCode,
      projected_input: project(input.current_input, caseCode),
    }),
  );
  const payload = {
    active_filing_critical_override_count: input.current_input.active_filing_critical_override_count,
    authority_block_margin_or_null: input.posture.threshold.authority_block_margin_or_null,
    authority_penalty: input.current_input.authority_penalty,
    authority_review_margin_or_null: input.posture.threshold.authority_review_margin_or_null,
    authority_uncertainty_score: input.current_input.authority_uncertainty_score,
    automation_level: input.posture.automation_level,
    baseline_submission_state: input.current_input.baseline_submission_state,
    cap_band: input.posture.cap_band,
    cap_driver_reason_codes: input.posture.cap_driver_reason_codes,
    completeness_margin: input.posture.threshold.completeness_margin,
    completeness_score: input.current_input.completeness_score,
    contract_version: "TRUST_SENSITIVITY_V1" as const,
    critical_retention_limited_count: input.current_input.critical_retention_limited_count,
    edge_trigger_codes: input.posture.threshold.edge_trigger_codes,
    execution_legal_effect_boundary: input.execution_mode_boundary_contract.legal_effect_boundary,
    execution_mode: input.current_input.execution_mode,
    execution_mode_boundary_hash: input.execution_mode_boundary_contract.boundary_hash,
    filing_readiness: input.posture.filing_readiness,
    graph_filing_margin_or_null: input.posture.threshold.graph_filing_margin_or_null,
    graph_quality_score: input.current_input.graph_quality_score,
    late_data_invalidation_state: input.current_input.late_data_invalidation_state,
    live_authority_progression_requested: input.current_input.live_authority_progression_requested,
    override_dependency_state: input.current_input.override_dependency_state,
    projected_case_results: projectedCaseResults,
    required_human_step_count: input.current_input.required_human_step_count,
    risk_automation_margin: input.posture.threshold.risk_automation_margin,
    risk_score: input.current_input.risk_score,
    score_band: input.posture.score_band,
    score_cap_alignment_state: input.posture.score_cap_alignment_state,
    threshold_stability_state: input.posture.threshold.threshold_stability_state,
    trust_amber_margin: input.posture.threshold.trust_amber_margin,
    trust_band: input.posture.trust_band,
    trust_green_margin: input.posture.threshold.trust_green_margin,
    trust_input_basis_contract_hash: input.trust_input_basis_contract.basis_contract_hash,
    trust_input_state: input.current_input.trust_input_state,
    trust_score: input.current_input.trust_score,
    upstream_gate_cap: input.current_input.upstream_gate_cap,
  };
  return {
    ...payload,
    sensitivity_contract_hash: `trust-sensitivity-contract-hash://${stableJsonHash(payload)}`,
  };
}
