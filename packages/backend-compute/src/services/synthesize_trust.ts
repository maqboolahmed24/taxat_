import { stableJsonHash } from "../../../domain-kernel/src/primitives/hash.ts";
import { normalizeUtcInstantString } from "../../../domain-kernel/src/primitives/time.ts";
import { computeResultRef, type ComputeResultRecord } from "../models/compute_result.ts";
import {
  parityResultRef,
  type ParityClassification,
  type ParityResultRecord,
} from "../models/parity_result.ts";
import { riskReportRef, type RiskReportRecord } from "../models/risk_report.ts";
import {
  withRefreshedTrustSummaryContract,
  type TrustAutomationLevel,
  type TrustBaselineSubmissionState,
  type TrustFilingReadiness,
  type TrustLevel,
  type TrustSummaryExecutionMode,
  type TrustSummaryRecord,
} from "../models/trust_summary.ts";
import type {
  StoredTrustSummaryRecord,
  TrustSummaryRepository,
} from "../repositories/trust_summary_repository.ts";
import {
  assessTrustInputState,
  type EvidenceGraphQualityBasis,
  type TrustUpstreamGateRecord,
} from "./assess_trust_input_state.ts";
import {
  buildTrustDecisionExplainability,
  orderTrustReasonCodes,
  plainTrustSummary,
} from "./build_trust_reason_codes.ts";
import type { TrustFreshnessDeadline } from "./build_trust_input_basis_contract.ts";
import {
  buildTrustSensitivityAnalysisContract,
  deriveTrustPosture,
  type TrustPostureDerivationInput,
} from "./trust_sensitivity_analyzer.ts";

export type SynthesizeTrustInput = {
  active_filing_critical_override_count?: number;
  authority_uncertainty_score: number;
  baseline_limitation_reason_codes?: readonly string[];
  baseline_selection_contract_hash_or_null?: string | null;
  baseline_submission_state: TrustBaselineSubmissionState;
  compute_result?: ComputeResultRecord | null;
  counterfactual_basis?: string | null;
  critical_retention_limited_count?: number;
  execution_mode: TrustSummaryExecutionMode;
  freshness_deadlines?: readonly TrustFreshnessDeadline[];
  graph_quality_basis?: EvidenceGraphQualityBasis | null;
  late_data_invalidation_state?: "NONE" | "INVALIDATING_FINDING_PRESENT";
  live_authority_progression_requested: boolean;
  manifest_id?: string;
  non_compliance_config_refs?: readonly string[];
  override_dependency_state?: "NO_ACTIVE_OR_VALID_OVERRIDES" | "INVALID_OVERRIDE_RELIED_UPON";
  parity_result?: ParityResultRecord | null;
  persisted_at?: string;
  repository?: TrustSummaryRepository;
  required_human_steps?: readonly string[];
  risk_report?: RiskReportRecord | null;
  run_kind?: Parameters<typeof assessTrustInputState>[0]["run_kind"];
  schema_bundle_hash?: string;
  support_refs?: readonly string[];
  synthesized_at: string;
  temporal_propagation_event_refs?: readonly string[];
  trust_id?: string;
  upstream_gate_records?: readonly TrustUpstreamGateRecord[];
  writer_build_id?: string;
};

export type SynthesizeTrustResult = {
  stored_trust_summary: StoredTrustSummaryRecord | null;
  trust_summary: TrustSummaryRecord;
};

export class SynthesizeTrustError extends Error {
  readonly code:
    | "TRUST_AUTHORITY_SCORE_INVALID"
    | "TRUST_COMPLIANCE_COUNTERFACTUAL_REJECTED"
    | "TRUST_INPUT_MANIFEST_REQUIRED"
    | "TRUST_UPSTREAM_BOUNDARY_INVALID";

  constructor(code: SynthesizeTrustError["code"], detail: string) {
    super(`${code}: ${detail}`);
    this.name = "SynthesizeTrustError";
    this.code = code;
  }
}

function normalizeString(label: string, value: unknown) {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new SynthesizeTrustError("TRUST_INPUT_MANIFEST_REQUIRED", `${label} must be a non-empty string`);
  }
  return value.trim().normalize("NFC");
}

function normalizeStringSet(values: readonly string[]) {
  return [...new Set(values.map((value) => normalizeString("trust.ref", value)))].sort();
}

function normalizeCount(value: number | undefined) {
  if (value === undefined) {
    return 0;
  }
  if (!Number.isInteger(value) || value < 0) {
    throw new SynthesizeTrustError(
      "TRUST_AUTHORITY_SCORE_INVALID",
      "count fields must be non-negative integers",
    );
  }
  return value;
}

function normalizeScore(label: string, value: number) {
  if (!Number.isInteger(value) || value < 0 || value > 100) {
    throw new SynthesizeTrustError(
      "TRUST_AUTHORITY_SCORE_INVALID",
      `${label} must be an integer in [0,100]`,
    );
  }
  return value;
}

function enforceTrustExecutionBoundary(input: SynthesizeTrustInput) {
  const manifestId =
    input.manifest_id ??
    input.compute_result?.manifest_id ??
    input.parity_result?.manifest_id ??
    input.risk_report?.manifest_id;
  if (manifestId === undefined) {
    throw new SynthesizeTrustError(
      "TRUST_INPUT_MANIFEST_REQUIRED",
      "trust synthesis requires manifest_id or at least one upstream artifact with manifest_id",
    );
  }
  if (input.execution_mode === "COMPLIANCE") {
    if (input.counterfactual_basis !== undefined && input.counterfactual_basis !== null) {
      throw new SynthesizeTrustError(
        "TRUST_COMPLIANCE_COUNTERFACTUAL_REJECTED",
        "COMPLIANCE trust synthesis cannot carry a counterfactual basis",
      );
    }
    if ((input.non_compliance_config_refs ?? []).length > 0) {
      throw new SynthesizeTrustError(
        "TRUST_COMPLIANCE_COUNTERFACTUAL_REJECTED",
        "COMPLIANCE trust synthesis cannot carry non-compliance config refs",
      );
    }
    for (const artifact of [input.compute_result, input.parity_result, input.risk_report]) {
      if (
        artifact &&
        (artifact.execution_mode !== "COMPLIANCE" || artifact.analysis_only !== false)
      ) {
        throw new SynthesizeTrustError(
          "TRUST_UPSTREAM_BOUNDARY_INVALID",
          "COMPLIANCE trust synthesis requires compliance upstream artifacts",
        );
      }
    }
    return {
      analysis_only: false,
      counterfactual_basis: null,
      manifest_id: normalizeString("trust.manifest_id", manifestId),
      non_compliance_config_refs: [],
    };
  }
  const counterfactualBasis =
    input.counterfactual_basis ??
    input.compute_result?.counterfactual_basis ??
    input.parity_result?.counterfactual_basis ??
    input.risk_report?.counterfactual_basis ??
    null;
  if (typeof counterfactualBasis !== "string" || counterfactualBasis.trim().length === 0) {
    throw new SynthesizeTrustError(
      "TRUST_COMPLIANCE_COUNTERFACTUAL_REJECTED",
      "ANALYSIS trust synthesis requires a declared counterfactual basis",
    );
  }
  return {
    analysis_only: true,
    counterfactual_basis: counterfactualBasis.trim().normalize("NFC"),
    manifest_id: normalizeString("trust.manifest_id", manifestId),
    non_compliance_config_refs: normalizeStringSet([
      ...(input.compute_result?.non_compliance_config_refs ?? []),
      ...(input.parity_result?.non_compliance_config_refs ?? []),
      ...(input.risk_report?.non_compliance_config_refs ?? []),
      ...(input.non_compliance_config_refs ?? []),
    ]),
  };
}

function roundScore(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function computeTrustCoreScore(input: {
  data_quality_score: number;
  graph_quality_score: number;
  parity_score: number;
  risk_score: number;
}) {
  const riskConfidence = 100 - input.risk_score;
  const axes = [
    input.data_quality_score,
    input.parity_score,
    input.graph_quality_score,
    riskConfidence,
  ];
  if (axes.some((axis) => axis <= 0)) {
    return 0;
  }
  return Math.max(
    0,
    Math.min(
      100,
      100 *
        Math.exp(
          0.3 * Math.log(input.data_quality_score / 100) +
            0.25 * Math.log(input.parity_score / 100) +
            0.25 * Math.log(input.graph_quality_score / 100) +
            0.2 * Math.log(riskConfidence / 100),
        ),
    ),
  );
}

function authorityPenalty(input: {
  authority_uncertainty_score: number;
  baseline_submission_state: TrustBaselineSubmissionState;
}) {
  if (input.baseline_submission_state === "NOT_APPLICABLE") {
    return 0;
  }
  return Math.min(30, Math.round(0.3 * input.authority_uncertainty_score));
}

function trustLevelForAutomation(value: TrustAutomationLevel): TrustLevel {
  return value === "ALLOWED" ? "READY" : value === "LIMITED" ? "REVIEW_REQUIRED" : "BLOCKED";
}

function filingForAutomation(value: TrustAutomationLevel): TrustFilingReadiness {
  return value === "ALLOWED" ? "READY_TO_SUBMIT" : value === "LIMITED" ? "READY_REVIEW" : "NOT_READY";
}

function parityScoreAndReasons(parityResult: ParityResultRecord | null | undefined) {
  const comparisonRequirement = parityResult?.comparison_requirement ?? "MANDATORY";
  const parityClassification = parityResult?.parity_classification ?? "NOT_COMPARABLE";
  if (comparisonRequirement === "NOT_REQUIRED" && parityClassification === "NOT_COMPARABLE") {
    return {
      parity_classification: parityClassification,
      parity_score: 70,
      reason_codes: ["PARITY_NOT_REQUIRED_NO_AUTHORITY_BASIS"],
    };
  }
  if (comparisonRequirement === "DESIRABLE" && parityClassification === "NOT_COMPARABLE") {
    return {
      parity_classification: parityClassification,
      parity_score: parityResult?.parity_score ?? 0,
      reason_codes: ["PARITY_PARTIAL_COVERAGE"],
    };
  }
  return {
    parity_classification: parityClassification,
    parity_score: parityResult?.parity_score ?? 0,
    reason_codes: [],
  };
}

function deterministicTrustId(input: {
  basis_contract_hash: string;
  compute_result_ref: string;
  execution_mode: TrustSummaryExecutionMode;
  manifest_id: string;
  parity_result_ref: string;
  risk_report_ref: string;
  trust_score: number;
}) {
  return `trust.${stableJsonHash(input)}`;
}

export async function synthesizeTrust(input: SynthesizeTrustInput): Promise<SynthesizeTrustResult> {
  const boundary = enforceTrustExecutionBoundary(input);
  const synthesizedAt = normalizeUtcInstantString(input.synthesized_at);
  const effectiveAuthorityUncertaintyScore =
    input.baseline_submission_state === "NOT_APPLICABLE"
      ? 0
      : normalizeScore("trust.authority_uncertainty_score", input.authority_uncertainty_score);
  const assessment = assessTrustInputState({
    active_filing_critical_override_count: input.active_filing_critical_override_count,
    authority_uncertainty_score: effectiveAuthorityUncertaintyScore,
    baseline_limitation_reason_codes: input.baseline_limitation_reason_codes,
    baseline_selection_contract_hash_or_null: input.baseline_selection_contract_hash_or_null,
    baseline_submission_state: input.baseline_submission_state,
    compute_result: input.compute_result,
    counterfactual_basis: boundary.counterfactual_basis,
    execution_mode: input.execution_mode,
    freshness_deadlines: input.freshness_deadlines,
    graph_quality_basis: input.graph_quality_basis,
    late_data_invalidation_state: input.late_data_invalidation_state,
    live_authority_progression_requested: input.live_authority_progression_requested,
    manifest_id: boundary.manifest_id,
    non_compliance_config_refs: boundary.non_compliance_config_refs,
    override_dependency_state: input.override_dependency_state,
    parity_result: input.parity_result,
    required_human_steps: input.required_human_steps,
    risk_report: input.risk_report,
    run_kind: input.run_kind,
    synthesized_at: synthesizedAt,
    upstream_gate_records: input.upstream_gate_records,
  });
  const graph = assessment.graph_quality_basis;
  const dataQualityScore = normalizeScore("trust.data_quality_score", graph.data_quality_score);
  const completenessScore = normalizeScore("trust.completeness_score", graph.completeness_score);
  const graphQualityScore = normalizeScore("trust.graph_quality_score", graph.graph_quality_score);
  const riskScore = normalizeScore("trust.risk_score", input.risk_report?.risk_score ?? 100);
  const parity = parityScoreAndReasons(input.parity_result);
  const parityScore = normalizeScore("trust.parity_score", parity.parity_score);
  const activeOverrideCount = normalizeCount(input.active_filing_critical_override_count);
  const criticalRetentionCount = normalizeCount(input.critical_retention_limited_count);
  const overridePenalty = Math.min(20, activeOverrideCount * 5) as 0 | 5 | 10 | 15 | 20;
  const retentionPenalty = (criticalRetentionCount > 0 ? 20 : 0) as 0 | 20;
  const authPenalty = authorityPenalty({
    authority_uncertainty_score: effectiveAuthorityUncertaintyScore,
    baseline_submission_state: input.baseline_submission_state,
  });
  const trustCoreScore = computeTrustCoreScore({
    data_quality_score: dataQualityScore,
    graph_quality_score: graphQualityScore,
    parity_score: parityScore,
    risk_score: riskScore,
  });
  const trustScore = roundScore(trustCoreScore - overridePenalty - retentionPenalty - authPenalty);
  const postureInput: TrustPostureDerivationInput = {
    active_filing_critical_override_count: activeOverrideCount,
    authority_penalty: authPenalty,
    authority_uncertainty_score: effectiveAuthorityUncertaintyScore,
    baseline_submission_state: input.baseline_submission_state,
    basis_automation_ceiling: assessment.trust_input_basis_contract.automation_ceiling,
    completeness_score: completenessScore,
    critical_retention_limited_count: criticalRetentionCount,
    execution_legal_effect_boundary:
      assessment.trust_input_basis_contract.execution_mode_boundary_contract.legal_effect_boundary,
    execution_mode: input.execution_mode,
    graph_quality_score: graphQualityScore,
    input_reason_codes: assessment.trust_input_basis_contract.input_reason_codes,
    late_data_invalidation_state: assessment.trust_input_basis_contract.late_data_invalidation_state,
    live_authority_progression_requested: input.live_authority_progression_requested,
    override_dependency_state: assessment.trust_input_basis_contract.override_dependency_state,
    required_human_step_count: input.required_human_steps?.length ?? 0,
    risk_score: riskScore,
    trust_input_state: assessment.trust_input_basis_contract.trust_input_state,
    trust_score: trustScore,
    unresolved_blocking_risk_flag: input.risk_report?.unresolved_blocking_risk_flag ?? true,
    unresolved_material_blocking_risk_flag:
      input.risk_report?.unresolved_material_blocking_risk_flag ?? true,
    upstream_gate_cap: assessment.upstream_gate_cap,
  };
  let posture = deriveTrustPosture(postureInput);
  let reasonCodes = [...posture.reason_codes, ...parity.reason_codes];
  if (
    parity.parity_classification !== "MATCH" &&
    parity.parity_classification !== "MINOR_DIFFERENCE" &&
    posture.trust_band === "GREEN"
  ) {
    const forcedReasonCodes = orderTrustReasonCodes([
      "TRUST_AUTHORITY_STATE_UNRESOLVED",
      "TRUST_AUTOMATION_LIMITED",
      "TRUST_AMBER",
      ...parity.reason_codes,
    ]);
    posture = {
      ...posture,
      automation_level: "LIMITED",
      cap_band: "AMBER",
      cap_driver_reason_codes: ["TRUST_AUTHORITY_STATE_UNRESOLVED"],
      filing_readiness: filingForAutomation("LIMITED"),
      reason_codes: forcedReasonCodes,
      score_cap_alignment_state: "CAP_STRICTER_THAN_SCORE",
      trust_band: "AMBER",
    };
    reasonCodes = [...posture.reason_codes, ...parity.reason_codes];
  }
  const orderedReasonCodes = [...new Set(reasonCodes)];
  const dominantReasonCode = posture.reason_codes[0] ?? orderedReasonCodes[0] ?? "TRUST_INSUFFICIENT_DATA";
  const plainSummary = plainTrustSummary({
    automation_level: posture.automation_level,
    dominant_reason_code: dominantReasonCode,
    filing_readiness: posture.filing_readiness,
    trust_band: posture.trust_band,
  });
  const explainability = buildTrustDecisionExplainability({
    active_filing_critical_override_count: activeOverrideCount,
    authority_uncertainty_score: effectiveAuthorityUncertaintyScore,
    automation_level: posture.automation_level,
    plain_summary: plainSummary,
    reason_codes: orderedReasonCodes,
    threshold_stability_state: posture.threshold.threshold_stability_state,
    trust_input_basis_authority_progression_state:
      assessment.trust_input_basis_contract.authority_progression_state,
  });
  const sensitivity = buildTrustSensitivityAnalysisContract({
    current_input: postureInput,
    execution_mode_boundary_contract:
      assessment.trust_input_basis_contract.execution_mode_boundary_contract,
    posture,
    trust_input_basis_contract: assessment.trust_input_basis_contract,
  });
  const computeRef = input.compute_result
    ? computeResultRef(input.compute_result)
    : `compute-result://missing/${boundary.manifest_id}`;
  const parityRef = input.parity_result
    ? parityResultRef(input.parity_result)
    : `parity-result://missing/${boundary.manifest_id}`;
  const riskRef = input.risk_report
    ? riskReportRef(input.risk_report)
    : `risk-report://missing/${boundary.manifest_id}`;
  const trustId =
    input.trust_id ??
    deterministicTrustId({
      basis_contract_hash: assessment.trust_input_basis_contract.basis_contract_hash,
      compute_result_ref: computeRef,
      execution_mode: input.execution_mode,
      manifest_id: boundary.manifest_id,
      parity_result_ref: parityRef,
      risk_report_ref: riskRef,
      trust_score: trustScore,
    });
  const normalizedReasons = explainability.ordered_reason_codes;
  const trustSummary = withRefreshedTrustSummaryContract({
    schema_bundle_hash: input.schema_bundle_hash,
    trust_summary: {
      active_filing_critical_override_count: activeOverrideCount,
      analysis_only: boundary.analysis_only,
      artifact_type: "TrustSummary",
      authority_penalty: authPenalty,
      authority_uncertainty_score: effectiveAuthorityUncertaintyScore,
      automation_level: posture.automation_level,
      baseline_submission_state: input.baseline_submission_state,
      blocking_dependency_refs: assessment.blocking_dependency_refs,
      cap_band: posture.cap_band,
      comparison_requirement: input.parity_result?.comparison_requirement ?? "MANDATORY",
      completeness_score: completenessScore,
      compute_result_ref: computeRef,
      counterfactual_basis: boundary.counterfactual_basis,
      critical_retention_limited_count: criticalRetentionCount,
      data_quality_score: dataQualityScore,
      decision_constraint_codes: posture.automation_level === "ALLOWED" ? [] : normalizedReasons.slice(0, 8),
      decision_explainability_contract: explainability,
      dominant_reason_code: normalizedReasons[0] ?? dominantReasonCode,
      evidence_graph_ref: graph.evidence_graph_ref,
      execution_mode: input.execution_mode,
      execution_mode_boundary_contract:
        assessment.trust_input_basis_contract.execution_mode_boundary_contract,
      filing_readiness: posture.filing_readiness,
      gate_decision_refs: assessment.gate_decision_refs,
      graph_quality_score: graphQualityScore,
      lifecycle_state: "SYNTHESIZED",
      live_authority_progression_requested: input.live_authority_progression_requested,
      manifest_id: boundary.manifest_id,
      non_compliance_config_refs: boundary.non_compliance_config_refs,
      override_penalty: overridePenalty,
      parity_classification: parity.parity_classification as ParityClassification,
      parity_result_ref: parityRef,
      parity_score: parityScore,
      plain_summary: plainSummary,
      reason_codes: normalizedReasons,
      required_human_steps: normalizeStringSet(input.required_human_steps ?? []),
      retention_penalty: retentionPenalty,
      risk_report_ref: riskRef,
      risk_automation_margin: posture.threshold.risk_automation_margin,
      risk_score: riskScore,
      score_band: posture.score_band,
      support_refs: normalizeStringSet(input.support_refs ?? []),
      superseded_at: null,
      superseded_by_trust_id: null,
      synthesized_at: synthesizedAt,
      temporal_propagation_event_refs: normalizeStringSet(input.temporal_propagation_event_refs ?? []),
      threshold_stability_state: posture.threshold.threshold_stability_state,
      trust_amber_margin: posture.threshold.trust_amber_margin,
      trust_band: posture.trust_band,
      trust_core_score: trustCoreScore,
      trust_fresh_until: assessment.trust_input_basis_contract.trust_fresh_until,
      trust_green_margin: posture.threshold.trust_green_margin,
      trust_id: trustId,
      trust_input_basis_contract: assessment.trust_input_basis_contract,
      trust_input_state: assessment.trust_input_basis_contract.trust_input_state,
      trust_level: trustLevelForAutomation(posture.automation_level),
      trust_score: trustScore,
      trust_sensitivity_analysis_contract: sensitivity,
      unresolved_blocking_risk_flag: input.risk_report?.unresolved_blocking_risk_flag ?? true,
      unresolved_material_blocking_risk_flag:
        input.risk_report?.unresolved_material_blocking_risk_flag ?? true,
      upstream_gate_cap: assessment.upstream_gate_cap,
    },
    writer_build_id: input.writer_build_id,
  });
  const stored = input.repository
    ? await input.repository.persistTrustSummary({
        persisted_at: input.persisted_at ?? synthesizedAt,
        trust_summary: trustSummary,
      })
    : null;
  return { stored_trust_summary: stored, trust_summary: trustSummary };
}
