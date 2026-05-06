import { stableJsonHash } from "../../../domain-kernel/src/primitives/hash.ts";
import { normalizeUtcInstantString } from "../../../domain-kernel/src/primitives/time.ts";
import { TrustSummarySchemaLineage } from "../../../generated-models/src/generated/typescript/decisioning-and-nightly.ts";
import type { SchemaBundleArtifactContract } from "../../../generated-models/src/generated/typescript/manifest-and-release.ts";
import type {
  ParityClassification,
  ParityComparisonRequirement,
} from "./parity_result.ts";
import { validatePersistedTrustSummaryExplainabilityAlignment } from "../services/validate_persisted_decision_explainability_alignment.ts";

export type TrustSummaryExecutionMode = "COMPLIANCE" | "ANALYSIS";
export type TrustLifecycleState = "SYNTHESIZED" | "SUPERSEDED";
export type TrustInputState =
  | "ADMISSIBLE_CURRENT"
  | "ADMISSIBLE_STALE"
  | "INCOMPLETE"
  | "CONTRADICTED";
export type TrustScoreBand = "RED" | "AMBER" | "GREEN";
export type TrustBand = "INSUFFICIENT_DATA" | "RED" | "AMBER" | "GREEN";
export type UpstreamGateCap = "AUTO_ELIGIBLE" | "NOTICE_ONLY" | "REVIEW_ONLY" | "BLOCKED";
export type TrustLevel = "READY" | "REVIEW_REQUIRED" | "BLOCKED";
export type TrustAutomationLevel = "ALLOWED" | "LIMITED" | "BLOCKED";
export type TrustFilingReadiness = "NOT_READY" | "READY_REVIEW" | "READY_TO_SUBMIT";
export type ThresholdStabilityState = "STABLE" | "EDGE_REVIEW";
export type TrustBaselineSubmissionState =
  | "KNOWN_MATCHED"
  | "KNOWN_FILED"
  | "UNKNOWN"
  | "OUT_OF_BAND_UNRECONCILED"
  | "NOT_APPLICABLE";
export type TrustScoreCapAlignmentState =
  | "ALIGNED"
  | "SCORE_STRICTER_THAN_CAP"
  | "CAP_STRICTER_THAN_SCORE";
export type TrustSensitivityCaseCode =
  | "TRUST_SCORE_MINUS_ONE"
  | "TRUST_SCORE_PLUS_ONE"
  | "RISK_SCORE_PLUS_ONE"
  | "AUTHORITY_UNCERTAINTY_PLUS_ONE"
  | "FRESHNESS_INVALIDATED"
  | "INVALID_OVERRIDE_RELIED_UPON";
export type TrustEdgeTriggerCode =
  | "TRUST_GREEN_GUARD_BAND"
  | "TRUST_AMBER_GUARD_BAND"
  | "RISK_AUTOMATION_GUARD_BAND"
  | "COMPLETENESS_GUARD_BAND"
  | "GRAPH_FILING_GUARD_BAND"
  | "AUTHORITY_REVIEW_GUARD_BAND"
  | "AUTHORITY_BLOCK_GUARD_BAND";
export type TrustCapDriverReasonCode =
  | "TRUST_INPUT_INCOMPLETE"
  | "TRUST_INPUT_CONTRADICTION"
  | "TRUST_INPUT_STALE"
  | "TRUST_OVERRIDE_INVALID"
  | "TRUST_THRESHOLD_EDGE_REVIEW"
  | "TRUST_UPSTREAM_GATE_BLOCK"
  | "TRUST_UPSTREAM_GATE_REVIEW_REQUIRED"
  | "TRUST_REQUIRED_HUMAN_STEPS"
  | "TRUST_OVERRIDE_PENALTY"
  | "TRUST_RETENTION_PENALTY"
  | "TRUST_AUTHORITY_STATE_UNRESOLVED"
  | "TRUST_AUTHORITY_PENALTY"
  | "TRUST_ANALYSIS_MODE_CAP"
  | "TRUST_NON_LIVE_EXECUTION_BOUNDARY_CAP"
  | "TRUST_RECALCULATION_REQUIRED";

export type ExecutionModeBoundaryContract = {
  analysis_only: boolean;
  boundary_hash: string;
  contract_version: "EXECUTION_MODE_BOUNDARY_V1";
  counterfactual_basis: string | null;
  disclosure_reason_codes: string[];
  execution_mode: TrustSummaryExecutionMode;
  execution_posture:
    | "LIVE_COMPLIANCE"
    | "LIVE_ANALYSIS"
    | "REPLAY_COMPLIANCE"
    | "REPLAY_COUNTERFACTUAL";
  legal_effect_boundary:
    | "COMPLIANCE_CAPABLE"
    | "MODELED_READ_ONLY"
    | "HISTORICAL_REPLAY_READ_ONLY"
    | "COUNTERFACTUAL_REPLAY_READ_ONLY";
  non_compliance_config_refs: string[];
  replay_class_or_null: "STANDARD_REPLAY" | "AUDIT_REPLAY" | "COUNTERFACTUAL_ANALYSIS" | null;
  run_kind: "INTERACTIVE" | "NIGHTLY" | "BACKFILL" | "REPLAY" | "REMEDIATION" | "AMENDMENT" | "MIGRATION";
};

export type TrustInputBasisContract = {
  authority_progression_state:
    | "NOT_REQUESTED_OR_NOT_APPLICABLE"
    | "CLEAR"
    | "REVIEW_LIMITED"
    | "BLOCKED";
  automation_ceiling: TrustAutomationLevel;
  baseline_automation_ceiling: TrustAutomationLevel;
  baseline_limitation_reason_codes: string[];
  baseline_progression_state:
    | "MATCHED_OR_FILED"
    | "UNKNOWN_OR_OUT_OF_BAND"
    | "NOT_APPLICABLE";
  baseline_selection_contract_hash_or_null: string | null;
  basis_contract_hash: string;
  blocking_dependency_refs: string[];
  consistency_state: "CONSISTENT" | "CONTRADICTED";
  contract_version: "TRUST_INPUT_BASIS_V1";
  execution_mode_boundary_contract: ExecutionModeBoundaryContract;
  filing_readiness_ceiling: TrustFilingReadiness;
  freshness_dependency_classes: (
    | "AUTHORITY_STATE"
    | "LATE_DATA_MONITOR"
    | "OVERRIDE_LIFECYCLE"
    | "EXTERNAL_BASELINE"
  )[];
  freshness_state: "CURRENT" | "STALE_OR_INVALIDATED" | "NO_EXPIRING_DEPENDENCIES";
  human_step_state: "CLEARED" | "UNRESOLVED_PRETRUST_STEPS";
  input_presence_state: "COMPLETE" | "INCOMPLETE";
  input_reason_codes: string[];
  late_data_invalidation_state: "NONE" | "INVALIDATING_FINDING_PRESENT";
  lifecycle_binding_state: "CURRENT_UNSUPERSEDED" | "SUPERSEDED_OR_REPLACED";
  limitation_semantics_state:
    | "EXPLICIT_LIMITATIONS_ONLY"
    | "SILENT_LIMITATION_AMBIGUITY";
  manifest_binding_state: "ACTIVE_MANIFEST_OR_ADMITTED_LINEAGE" | "MANIFEST_MISMATCH";
  override_dependency_state: "NO_ACTIVE_OR_VALID_OVERRIDES" | "INVALID_OVERRIDE_RELIED_UPON";
  trust_fresh_until: string | null;
  trust_input_state: TrustInputState;
};

export type TrustSensitivityProjectedCase = {
  case_code: TrustSensitivityCaseCode;
  monotonicity_expectation: "NON_IMPROVING" | "NON_DEGRADING";
  projected_authority_block_margin_or_null: number | null;
  projected_authority_review_margin_or_null: number | null;
  projected_automation_level: TrustAutomationLevel;
  projected_cap_band: TrustBand;
  projected_completeness_margin: number;
  projected_edge_trigger_codes: TrustEdgeTriggerCode[];
  projected_filing_readiness: TrustFilingReadiness;
  projected_graph_filing_margin_or_null: number | null;
  projected_reason_code_additions: string[];
  projected_reason_code_removals: string[];
  projected_risk_automation_margin: number;
  projected_score_band: TrustScoreBand;
  projected_threshold_stability_state: ThresholdStabilityState;
  projected_trust_amber_margin: number;
  projected_trust_band: TrustBand;
  projected_trust_green_margin: number;
  projected_trust_input_state: TrustInputState;
  projected_trust_score: number;
};

export type TrustSensitivityAnalysisContract = {
  active_filing_critical_override_count: number;
  authority_block_margin_or_null: number | null;
  authority_penalty: number;
  authority_review_margin_or_null: number | null;
  authority_uncertainty_score: number;
  automation_level: TrustAutomationLevel;
  baseline_submission_state: TrustBaselineSubmissionState;
  cap_band: TrustBand;
  cap_driver_reason_codes: TrustCapDriverReasonCode[];
  completeness_margin: number;
  completeness_score: number;
  contract_version: "TRUST_SENSITIVITY_V1";
  critical_retention_limited_count: number;
  edge_trigger_codes: TrustEdgeTriggerCode[];
  execution_legal_effect_boundary: ExecutionModeBoundaryContract["legal_effect_boundary"];
  execution_mode: TrustSummaryExecutionMode;
  execution_mode_boundary_hash: string;
  filing_readiness: TrustFilingReadiness;
  graph_filing_margin_or_null: number | null;
  graph_quality_score: number;
  late_data_invalidation_state: TrustInputBasisContract["late_data_invalidation_state"];
  live_authority_progression_requested: boolean;
  override_dependency_state: TrustInputBasisContract["override_dependency_state"];
  projected_case_results: TrustSensitivityProjectedCase[];
  required_human_step_count: number;
  risk_automation_margin: number;
  risk_score: number;
  score_band: TrustScoreBand;
  score_cap_alignment_state: TrustScoreCapAlignmentState;
  sensitivity_contract_hash: string;
  threshold_stability_state: ThresholdStabilityState;
  trust_amber_margin: number;
  trust_band: TrustBand;
  trust_green_margin: number;
  trust_input_basis_contract_hash: string;
  trust_input_state: TrustInputState;
  trust_score: number;
  upstream_gate_cap: UpstreamGateCap;
};

export type DecisionExplainabilityContract = {
  action_projection_state: "NONE" | "NEXT_ACTIONS_INCLUDED" | "PRIMARY_ACTION_INCLUDED" | "NO_SAFE_ACTION_DISCLOSED";
  artifact_family: "GATE_DECISION_RECORD" | "TRUST_SUMMARY" | "DECISION_BUNDLE";
  compressed_reason_codes: string[];
  compression_policy: "PREFIX_COMPRESS_ORDERED_REASON_CODES_WITH_SUPPRESSED_COUNT";
  compression_reason_cap: 3;
  contract_version: "DECISION_EXPLAINABILITY_V1";
  dominant_reason_code: string;
  dominant_reason_selection_policy: "FIRST_ORDERED_REASON_IS_DOMINANT";
  grammar_profile_code: "LOW_NOISE_DECISION_GRAMMAR_V1";
  ordered_reason_codes: string[];
  plain_text_character_limit: 200;
  plain_text_field_name: "plain_explanation" | "plain_summary" | "plain_reason";
  reason_order_policy: "DOMINANT_REASON_FIRST_CANONICAL_PRIORITY";
  semantic_qualifiers: (
    | "AUTHORITY_STATE"
    | "LIMITATION_STATE"
    | "OVERRIDE_STATE"
    | "ACTIONABILITY_STATE"
  )[];
  summary_source_policy: "READ_SURFACES_MUST_USE_PERSISTED_FIELDS";
  suppressed_reason_count: number;
};

export type TrustSummaryRecord = {
  active_filing_critical_override_count: number;
  analysis_only: boolean;
  artifact_type: "TrustSummary";
  authority_penalty: number;
  authority_uncertainty_score: number;
  automation_level: TrustAutomationLevel;
  baseline_submission_state: TrustBaselineSubmissionState;
  blocking_dependency_refs: string[];
  cap_band: TrustBand;
  comparison_requirement: ParityComparisonRequirement;
  completeness_score: number;
  contract: SchemaBundleArtifactContract;
  counterfactual_basis: string | null;
  critical_retention_limited_count: number;
  data_quality_score: number;
  decision_constraint_codes: string[];
  decision_explainability_contract: DecisionExplainabilityContract;
  dominant_reason_code: string;
  evidence_graph_ref: string;
  execution_mode: TrustSummaryExecutionMode;
  execution_mode_boundary_contract: ExecutionModeBoundaryContract;
  filing_readiness: TrustFilingReadiness;
  gate_decision_refs: string[];
  graph_quality_score: number;
  lifecycle_state: TrustLifecycleState;
  live_authority_progression_requested: boolean;
  manifest_id: string;
  non_compliance_config_refs: string[];
  override_penalty: 0 | 5 | 10 | 15 | 20;
  parity_classification: ParityClassification;
  parity_result_ref: string;
  parity_score: number;
  plain_summary: string;
  reason_codes: string[];
  retention_penalty: 0 | 20;
  risk_report_ref: string;
  risk_automation_margin: number;
  risk_score: number;
  score_band: TrustScoreBand;
  support_refs: string[];
  superseded_at: string | null;
  superseded_by_trust_id: string | null;
  synthesized_at: string;
  temporal_propagation_event_refs: string[];
  threshold_stability_state: ThresholdStabilityState;
  trust_amber_margin: number;
  trust_band: TrustBand;
  trust_core_score: number;
  trust_fresh_until: string | null;
  trust_green_margin: number;
  trust_id: string;
  trust_input_basis_contract: TrustInputBasisContract;
  trust_input_state: TrustInputState;
  trust_level: TrustLevel;
  trust_score: number;
  trust_sensitivity_analysis_contract: TrustSensitivityAnalysisContract;
  unresolved_blocking_risk_flag: boolean;
  unresolved_material_blocking_risk_flag: boolean;
  upstream_gate_cap: UpstreamGateCap;
  required_human_steps: string[];
  compute_result_ref: string;
};

export type TrustSummaryContractBuildInput = {
  schema_bundle_hash?: string;
  trust_content_hash: string;
  trust_id: string;
  writer_build_id?: string;
};

export class TrustSummaryModelError extends Error {
  readonly code:
    | "TRUST_SUMMARY_ARTIFACT_TYPE_INVALID"
    | "TRUST_SUMMARY_BOUNDARY_INVALID"
    | "TRUST_SUMMARY_CONTRACT_INVALID"
    | "TRUST_SUMMARY_FIELD_REQUIRED"
    | "TRUST_SUMMARY_NUMERIC_INVALID"
    | "TRUST_SUMMARY_POSTURE_INVALID";

  constructor(code: TrustSummaryModelError["code"], detail: string) {
    super(`${code}: ${detail}`);
    this.name = "TrustSummaryModelError";
    this.code = code;
  }
}

function requireString(label: string, value: unknown) {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new TrustSummaryModelError(
      "TRUST_SUMMARY_FIELD_REQUIRED",
      `${label} must be a non-empty string`,
    );
  }
  return value.trim().normalize("NFC");
}

function normalizeNullableString(label: string, value: string | null) {
  return value === null ? null : requireString(label, value);
}

function normalizeStringSet(label: string, values: readonly string[]) {
  return [...new Set(values.map((value) => requireString(label, value)))].sort();
}

function normalizeOrderedStringSet(label: string, values: readonly string[], options?: { minItems?: number }) {
  const seen = new Set<string>();
  const normalized = values.map((value) => requireString(label, value)).filter((value) => {
    if (seen.has(value)) {
      throw new TrustSummaryModelError(
        "TRUST_SUMMARY_FIELD_REQUIRED",
        `${label} must not contain duplicates`,
      );
    }
    seen.add(value);
    return true;
  });
  if ((options?.minItems ?? 0) > normalized.length) {
    throw new TrustSummaryModelError(
      "TRUST_SUMMARY_FIELD_REQUIRED",
      `${label} must contain at least ${options?.minItems} item(s)`,
    );
  }
  return normalized;
}

function normalizeDateTimeOrNull(value: string | null) {
  return value === null ? null : normalizeUtcInstantString(value);
}

function normalizeScore(label: string, value: number) {
  if (!Number.isInteger(value) || value < 0 || value > 100) {
    throw new TrustSummaryModelError(
      "TRUST_SUMMARY_NUMERIC_INVALID",
      `${label} must be an integer in [0,100]`,
    );
  }
  return value;
}

function normalizeFiniteNumber(label: string, value: number, options?: { max?: number; min?: number }) {
  const min = options?.min ?? Number.NEGATIVE_INFINITY;
  const max = options?.max ?? Number.POSITIVE_INFINITY;
  if (!Number.isFinite(value) || value < min || value > max) {
    throw new TrustSummaryModelError(
      "TRUST_SUMMARY_NUMERIC_INVALID",
      `${label} must be finite and inside the schema interval`,
    );
  }
  return value;
}

function normalizeNonNegativeInteger(label: string, value: number) {
  if (!Number.isInteger(value) || value < 0) {
    throw new TrustSummaryModelError(
      "TRUST_SUMMARY_NUMERIC_INVALID",
      `${label} must be a non-negative integer`,
    );
  }
  return value;
}

function enforceExecutionBoundary(record: TrustSummaryRecord) {
  if (record.execution_mode === "COMPLIANCE") {
    if (
      record.analysis_only !== false ||
      record.counterfactual_basis !== null ||
      record.non_compliance_config_refs.length !== 0
    ) {
      throw new TrustSummaryModelError(
        "TRUST_SUMMARY_BOUNDARY_INVALID",
        "COMPLIANCE trust summaries must not carry analysis-only posture",
      );
    }
  } else if (record.analysis_only !== true || record.counterfactual_basis === null) {
    throw new TrustSummaryModelError(
      "TRUST_SUMMARY_BOUNDARY_INVALID",
      "ANALYSIS trust summaries require analysis_only=true and a counterfactual basis",
    );
  }
  const boundary = record.execution_mode_boundary_contract;
  if (
    boundary.execution_mode !== record.execution_mode ||
    boundary.analysis_only !== record.analysis_only ||
    boundary.counterfactual_basis !== record.counterfactual_basis ||
    JSON.stringify(boundary.non_compliance_config_refs) !==
      JSON.stringify(record.non_compliance_config_refs)
  ) {
    throw new TrustSummaryModelError(
      "TRUST_SUMMARY_BOUNDARY_INVALID",
      "execution_mode_boundary_contract must mirror trust execution fields",
    );
  }
}

function automationRank(value: TrustAutomationLevel) {
  return value === "ALLOWED" ? 2 : value === "LIMITED" ? 1 : 0;
}

function readinessRank(value: TrustFilingReadiness) {
  return value === "READY_TO_SUBMIT" ? 2 : value === "READY_REVIEW" ? 1 : 0;
}

function enforcePosture(record: TrustSummaryRecord) {
  if (readinessRank(record.filing_readiness) !== automationRank(record.automation_level)) {
    throw new TrustSummaryModelError(
      "TRUST_SUMMARY_POSTURE_INVALID",
      "automation_level and filing_readiness must obey the ordinal bridge",
    );
  }
  if (automationRank(record.automation_level) > automationRank(record.trust_input_basis_contract.automation_ceiling)) {
    throw new TrustSummaryModelError(
      "TRUST_SUMMARY_POSTURE_INVALID",
      "automation_level exceeds the trust input basis ceiling",
    );
  }
  if (readinessRank(record.filing_readiness) > readinessRank(record.trust_input_basis_contract.filing_readiness_ceiling)) {
    throw new TrustSummaryModelError(
      "TRUST_SUMMARY_POSTURE_INVALID",
      "filing_readiness exceeds the trust input basis ceiling",
    );
  }
  if (!record.reason_codes.includes(record.dominant_reason_code)) {
    throw new TrustSummaryModelError(
      "TRUST_SUMMARY_POSTURE_INVALID",
      "dominant_reason_code must be included in reason_codes",
    );
  }
  if (
    record.decision_explainability_contract.dominant_reason_code !== record.dominant_reason_code ||
    JSON.stringify(record.decision_explainability_contract.ordered_reason_codes) !==
      JSON.stringify(record.reason_codes)
  ) {
    throw new TrustSummaryModelError(
      "TRUST_SUMMARY_POSTURE_INVALID",
      "decision_explainability_contract must mirror ordered reasons and dominant reason",
    );
  }
  try {
    validatePersistedTrustSummaryExplainabilityAlignment(record);
  } catch (error) {
    throw new TrustSummaryModelError(
      "TRUST_SUMMARY_POSTURE_INVALID",
      error instanceof Error
        ? error.message
        : "decision_explainability_contract failed persisted alignment validation",
    );
  }
  if (record.lifecycle_state === "SYNTHESIZED") {
    if (record.superseded_at !== null || record.superseded_by_trust_id !== null) {
      throw new TrustSummaryModelError(
        "TRUST_SUMMARY_POSTURE_INVALID",
        "SYNTHESIZED trust summaries must not carry supersession fields",
      );
    }
  } else if (record.superseded_at === null || record.superseded_by_trust_id === null) {
    throw new TrustSummaryModelError(
      "TRUST_SUMMARY_POSTURE_INVALID",
      "SUPERSEDED trust summaries require superseded_at and superseded_by_trust_id",
    );
  }
}

export function trustSummaryRef(record: Pick<TrustSummaryRecord, "trust_id">) {
  return `trust-summary://${record.trust_id}`;
}

export function deriveTrustSummaryContentHash(record: Omit<TrustSummaryRecord, "contract">) {
  return `trust-summary-content-hash://${stableJsonHash({
    artifact_family: "TRUST_SUMMARY_CONTENT",
    payload: record,
  })}`;
}

export function buildTrustSummaryContract(
  input: TrustSummaryContractBuildInput,
): SchemaBundleArtifactContract {
  return {
    allowed_upgrade_kinds: ["PATCH_BACKWARD", "MINOR_BACKWARD"],
    artifact_content_hash: requireString(
      "trust_summary.contract.artifact_content_hash",
      input.trust_content_hash,
    ),
    artifact_id: trustSummaryRef({ trust_id: input.trust_id }),
    artifact_type: "TrustSummary",
    compatibility_class: "BACKWARD_COMPATIBLE",
    content_hash: TrustSummarySchemaLineage.sourceHash,
    dialect_ref: "json-schema-draft-2020-12",
    schema_bundle_hash: requireString(
      "trust_summary.contract.schema_bundle_hash",
      input.schema_bundle_hash ?? "schema.bundle.hash.compute.default",
    ),
    schema_id: TrustSummarySchemaLineage.schemaId,
    semantic_version: "1.0.0",
    supersedes_schema_id: null,
    writer_build_id: requireString(
      "trust_summary.contract.writer_build_id",
      input.writer_build_id ?? "build.taxat.compute.0125",
    ),
    writer_min_reader_version: "1.0.0",
  };
}

export function normalizeTrustSummaryRecord(input: TrustSummaryRecord): TrustSummaryRecord {
  if (input.artifact_type !== "TrustSummary") {
    throw new TrustSummaryModelError(
      "TRUST_SUMMARY_ARTIFACT_TYPE_INVALID",
      "artifact_type must be TrustSummary",
    );
  }
  const normalized: TrustSummaryRecord = {
    ...structuredClone(input),
    active_filing_critical_override_count: normalizeNonNegativeInteger(
      "trust_summary.active_filing_critical_override_count",
      input.active_filing_critical_override_count,
    ),
    authority_penalty: normalizeFiniteNumber("trust_summary.authority_penalty", input.authority_penalty, {
      max: 30,
      min: 0,
    }),
    authority_uncertainty_score: normalizeScore(
      "trust_summary.authority_uncertainty_score",
      input.authority_uncertainty_score,
    ),
    blocking_dependency_refs: normalizeStringSet(
      "trust_summary.blocking_dependency_refs",
      input.blocking_dependency_refs,
    ),
    completeness_score: normalizeScore("trust_summary.completeness_score", input.completeness_score),
    compute_result_ref: requireString("trust_summary.compute_result_ref", input.compute_result_ref),
    contract: structuredClone(input.contract),
    counterfactual_basis: normalizeNullableString(
      "trust_summary.counterfactual_basis",
      input.counterfactual_basis,
    ),
    critical_retention_limited_count: normalizeNonNegativeInteger(
      "trust_summary.critical_retention_limited_count",
      input.critical_retention_limited_count,
    ),
    data_quality_score: normalizeScore("trust_summary.data_quality_score", input.data_quality_score),
    decision_constraint_codes: normalizeStringSet(
      "trust_summary.decision_constraint_codes",
      input.decision_constraint_codes,
    ),
    dominant_reason_code: requireString(
      "trust_summary.dominant_reason_code",
      input.dominant_reason_code,
    ),
    evidence_graph_ref: requireString("trust_summary.evidence_graph_ref", input.evidence_graph_ref),
    gate_decision_refs: normalizeOrderedStringSet(
      "trust_summary.gate_decision_refs",
      input.gate_decision_refs,
      { minItems: 1 },
    ),
    graph_quality_score: normalizeScore("trust_summary.graph_quality_score", input.graph_quality_score),
    manifest_id: requireString("trust_summary.manifest_id", input.manifest_id),
    non_compliance_config_refs: normalizeStringSet(
      "trust_summary.non_compliance_config_refs",
      input.non_compliance_config_refs,
    ),
    parity_result_ref: requireString("trust_summary.parity_result_ref", input.parity_result_ref),
    parity_score: normalizeScore("trust_summary.parity_score", input.parity_score),
    plain_summary: requireString("trust_summary.plain_summary", input.plain_summary).slice(0, 200),
    reason_codes: normalizeOrderedStringSet("trust_summary.reason_codes", input.reason_codes, {
      minItems: 1,
    }),
    risk_report_ref: requireString("trust_summary.risk_report_ref", input.risk_report_ref),
    risk_automation_margin: normalizeFiniteNumber(
      "trust_summary.risk_automation_margin",
      input.risk_automation_margin,
    ),
    risk_score: normalizeScore("trust_summary.risk_score", input.risk_score),
    support_refs: normalizeStringSet("trust_summary.support_refs", input.support_refs),
    superseded_at: normalizeDateTimeOrNull(input.superseded_at),
    superseded_by_trust_id: normalizeNullableString(
      "trust_summary.superseded_by_trust_id",
      input.superseded_by_trust_id,
    ),
    synthesized_at: normalizeUtcInstantString(input.synthesized_at),
    temporal_propagation_event_refs: normalizeStringSet(
      "trust_summary.temporal_propagation_event_refs",
      input.temporal_propagation_event_refs,
    ),
    trust_amber_margin: normalizeFiniteNumber(
      "trust_summary.trust_amber_margin",
      input.trust_amber_margin,
    ),
    trust_core_score: normalizeFiniteNumber("trust_summary.trust_core_score", input.trust_core_score, {
      max: 100,
      min: 0,
    }),
    trust_fresh_until: normalizeDateTimeOrNull(input.trust_fresh_until),
    trust_green_margin: normalizeFiniteNumber(
      "trust_summary.trust_green_margin",
      input.trust_green_margin,
    ),
    trust_id: requireString("trust_summary.trust_id", input.trust_id),
    trust_score: normalizeScore("trust_summary.trust_score", input.trust_score),
    required_human_steps: normalizeStringSet(
      "trust_summary.required_human_steps",
      input.required_human_steps,
    ),
  };
  enforceExecutionBoundary(normalized);
  enforcePosture(normalized);
  if (
    normalized.contract.artifact_id !== trustSummaryRef(normalized) ||
    normalized.contract.artifact_type !== "TrustSummary" ||
    normalized.contract.schema_id !== TrustSummarySchemaLineage.schemaId
  ) {
    throw new TrustSummaryModelError(
      "TRUST_SUMMARY_CONTRACT_INVALID",
      "contract must bind the TrustSummary artifact",
    );
  }
  return normalized;
}

export function withRefreshedTrustSummaryContract(input: {
  schema_bundle_hash?: string;
  trust_summary: Omit<TrustSummaryRecord, "contract">;
  writer_build_id?: string;
}) {
  const contentHash = deriveTrustSummaryContentHash(input.trust_summary);
  return normalizeTrustSummaryRecord({
    ...input.trust_summary,
    contract: buildTrustSummaryContract({
      trust_content_hash: contentHash,
      trust_id: input.trust_summary.trust_id,
      ...(input.schema_bundle_hash === undefined
        ? {}
        : { schema_bundle_hash: input.schema_bundle_hash }),
      ...(input.writer_build_id === undefined ? {} : { writer_build_id: input.writer_build_id }),
    }),
  });
}

export function cloneTrustSummaryRecord(record: TrustSummaryRecord) {
  return structuredClone(record);
}
