import type { ComputeResultRecord } from "../models/compute_result.ts";
import type { ParityResultRecord } from "../models/parity_result.ts";
import type { RiskReportRecord } from "../models/risk_report.ts";
import type {
  TrustBaselineSubmissionState,
  TrustInputBasisContract,
  TrustSummaryExecutionMode,
  UpstreamGateCap,
} from "../models/trust_summary.ts";
import {
  buildExecutionModeBoundaryContract,
  buildTrustInputBasisContract,
  type TrustFreshnessDeadline,
} from "./build_trust_input_basis_contract.ts";

export type EvidenceGraphQualityBasis = {
  completeness_score: number;
  data_quality_score: number;
  evidence_graph_ref: string;
  graph_quality_score: number;
  lifecycle_state: "BUILT" | "LIMITED" | "SUPERSEDED" | "NOT_BUILT";
  limitation_reason_codes?: readonly string[];
  manifest_id: string;
};

export type TrustUpstreamGateRecord = {
  blocking_dependency_refs?: readonly string[];
  decision: "PASS" | "PASS_WITH_NOTICE" | "MANUAL_REVIEW" | "OVERRIDABLE_BLOCK" | "HARD_BLOCK";
  gate_decision_ref: string;
  manifest_id: string;
  reason_codes?: readonly string[];
};

export type TrustInputAssessment = {
  blocking_dependency_refs: string[];
  gate_decision_refs: string[];
  graph_quality_basis: EvidenceGraphQualityBasis;
  trust_input_basis_contract: TrustInputBasisContract;
  upstream_gate_cap: UpstreamGateCap;
};

export type AssessTrustInputStateInput = {
  active_filing_critical_override_count?: number;
  authority_uncertainty_score: number;
  baseline_limitation_reason_codes?: readonly string[];
  baseline_selection_contract_hash_or_null?: string | null;
  baseline_submission_state: TrustBaselineSubmissionState;
  compute_result?: ComputeResultRecord | null;
  counterfactual_basis?: string | null;
  execution_mode: TrustSummaryExecutionMode;
  freshness_deadlines?: readonly TrustFreshnessDeadline[];
  graph_quality_basis?: EvidenceGraphQualityBasis | null;
  late_data_invalidation_state?: TrustInputBasisContract["late_data_invalidation_state"];
  live_authority_progression_requested: boolean;
  manifest_id: string;
  non_compliance_config_refs?: readonly string[];
  override_dependency_state?: TrustInputBasisContract["override_dependency_state"];
  parity_result?: ParityResultRecord | null;
  required_human_steps?: readonly string[];
  risk_report?: RiskReportRecord | null;
  run_kind?: Parameters<typeof buildExecutionModeBoundaryContract>[0]["run_kind"];
  synthesized_at: string;
  upstream_gate_records?: readonly TrustUpstreamGateRecord[];
};

function placeholderGraph(manifestId: string): EvidenceGraphQualityBasis {
  return {
    completeness_score: 0,
    data_quality_score: 0,
    evidence_graph_ref: `evidence-graph://missing/${manifestId}`,
    graph_quality_score: 0,
    lifecycle_state: "NOT_BUILT",
    limitation_reason_codes: ["GRAPH_QUALITY_DEPENDENCY_GAP_MISSING"],
    manifest_id: manifestId,
  };
}

function normalizeRefs(values: readonly string[]) {
  return [...new Set(values.filter((value) => value.trim().length > 0))].sort();
}

function deriveUpstreamGateCap(records: readonly TrustUpstreamGateRecord[]): UpstreamGateCap {
  if (records.some((record) => record.decision === "HARD_BLOCK" || record.decision === "OVERRIDABLE_BLOCK")) {
    return "BLOCKED";
  }
  if (records.some((record) => record.decision === "MANUAL_REVIEW")) {
    return "REVIEW_ONLY";
  }
  if (records.some((record) => record.decision === "PASS_WITH_NOTICE")) {
    return "NOTICE_ONLY";
  }
  return "AUTO_ELIGIBLE";
}

export function assessTrustInputState(input: AssessTrustInputStateInput): TrustInputAssessment {
  const graphBasis = input.graph_quality_basis ?? placeholderGraph(input.manifest_id);
  const gateRecords = input.upstream_gate_records ?? [];
  const gateDecisionRefs =
    gateRecords.length > 0
      ? gateRecords.map((record) => record.gate_decision_ref)
      : [`gate-decision://missing-upstream/${input.manifest_id}`];
  const inputPresenceOk =
    input.compute_result !== undefined &&
    input.compute_result !== null &&
    input.parity_result !== undefined &&
    input.parity_result !== null &&
    input.risk_report !== undefined &&
    input.risk_report !== null &&
    graphBasis.lifecycle_state !== "NOT_BUILT" &&
    gateRecords.length > 0;
  const manifestBindingOk = [
    input.compute_result?.manifest_id,
    input.parity_result?.manifest_id,
    input.risk_report?.manifest_id,
    graphBasis.manifest_id,
    ...gateRecords.map((record) => record.manifest_id),
  ]
    .filter((value): value is string => value !== undefined)
    .every((manifestId) => manifestId === input.manifest_id);
  const lifecycleBindingOk =
    (input.compute_result === undefined ||
      input.compute_result === null ||
      input.compute_result.lifecycle_state === "COMPUTED") &&
    (input.parity_result === undefined ||
      input.parity_result === null ||
      input.parity_result.lifecycle_state === "EVALUATED") &&
    graphBasis.lifecycle_state !== "SUPERSEDED";
  const consistencyOk =
    input.parity_result === undefined ||
    input.parity_result === null ||
    input.risk_report === undefined ||
    input.risk_report === null ||
    (input.parity_result.comparison_requirement !== undefined &&
      input.risk_report.unresolved_blocking_risk_flag !== undefined);
  const limitationSemanticsOk =
    graphBasis.lifecycle_state !== "LIMITED" || (graphBasis.limitation_reason_codes ?? []).length > 0;
  const upstreamBlockingRefs = gateRecords.flatMap((record) => record.blocking_dependency_refs ?? []);
  const graphBlockingRefs =
    graphBasis.lifecycle_state === "BUILT"
      ? []
      : [graphBasis.evidence_graph_ref, ...(graphBasis.limitation_reason_codes ?? [])];
  const executionModeBoundaryContract = buildExecutionModeBoundaryContract({
    analysis_only: input.execution_mode === "ANALYSIS",
    counterfactual_basis:
      input.execution_mode === "ANALYSIS" ? input.counterfactual_basis ?? "counterfactual://trust/required" : null,
    execution_mode: input.execution_mode,
    non_compliance_config_refs:
      input.execution_mode === "ANALYSIS" ? input.non_compliance_config_refs ?? [] : [],
    ...(input.run_kind === undefined ? {} : { run_kind: input.run_kind }),
  });
  const basisContract = buildTrustInputBasisContract({
    authority_uncertainty_score: input.authority_uncertainty_score,
    baseline_limitation_reason_codes: input.baseline_limitation_reason_codes,
    baseline_selection_contract_hash_or_null: input.baseline_selection_contract_hash_or_null,
    baseline_submission_state: input.baseline_submission_state,
    blocking_dependency_refs: normalizeRefs([...upstreamBlockingRefs, ...graphBlockingRefs]),
    consistency_ok: consistencyOk,
    execution_mode_boundary_contract: executionModeBoundaryContract,
    freshness_deadlines: input.freshness_deadlines,
    input_presence_ok: inputPresenceOk,
    late_data_invalidation_state: input.late_data_invalidation_state,
    lifecycle_binding_ok: lifecycleBindingOk,
    limitation_semantics_ok: limitationSemanticsOk,
    live_authority_progression_requested: input.live_authority_progression_requested,
    manifest_binding_ok: manifestBindingOk,
    manifest_id: input.manifest_id,
    override_dependency_state: input.override_dependency_state,
    required_human_steps: input.required_human_steps,
    synthesized_at: input.synthesized_at,
  });
  return {
    blocking_dependency_refs: basisContract.blocking_dependency_refs,
    gate_decision_refs: gateDecisionRefs,
    graph_quality_basis: graphBasis,
    trust_input_basis_contract: basisContract,
    upstream_gate_cap: deriveUpstreamGateCap(gateRecords),
  };
}
