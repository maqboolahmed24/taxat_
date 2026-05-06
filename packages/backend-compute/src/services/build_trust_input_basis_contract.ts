import { stableJsonHash } from "../../../domain-kernel/src/primitives/hash.ts";
import { normalizeUtcInstantString } from "../../../domain-kernel/src/primitives/time.ts";
import type {
  ExecutionModeBoundaryContract,
  TrustAutomationLevel,
  TrustBaselineSubmissionState,
  TrustFilingReadiness,
  TrustInputBasisContract,
  TrustInputState,
  TrustSummaryExecutionMode,
} from "../models/trust_summary.ts";
import { orderTrustReasonCodes } from "./build_trust_reason_codes.ts";

export type TrustFreshnessDeadline = {
  dependency_class: "AUTHORITY_STATE" | "LATE_DATA_MONITOR" | "OVERRIDE_LIFECYCLE" | "EXTERNAL_BASELINE";
  dependency_ref: string;
  fresh_until: string;
};

export type BuildExecutionModeBoundaryContractInput = {
  analysis_only: boolean;
  counterfactual_basis: string | null;
  execution_mode: TrustSummaryExecutionMode;
  non_compliance_config_refs: readonly string[];
  replay_class_or_null?: "STANDARD_REPLAY" | "AUDIT_REPLAY" | "COUNTERFACTUAL_ANALYSIS" | null;
  run_kind?: ExecutionModeBoundaryContract["run_kind"];
};

export type BuildTrustInputBasisContractInput = {
  baseline_limitation_reason_codes?: readonly string[];
  baseline_selection_contract_hash_or_null?: string | null;
  baseline_submission_state: TrustBaselineSubmissionState;
  blocking_dependency_refs?: readonly string[];
  consistency_ok: boolean;
  execution_mode_boundary_contract: ExecutionModeBoundaryContract;
  freshness_deadlines?: readonly TrustFreshnessDeadline[];
  input_presence_ok: boolean;
  late_data_invalidation_state?: TrustInputBasisContract["late_data_invalidation_state"];
  lifecycle_binding_ok: boolean;
  limitation_semantics_ok: boolean;
  live_authority_progression_requested: boolean;
  manifest_binding_ok: boolean;
  manifest_id: string;
  override_dependency_state?: TrustInputBasisContract["override_dependency_state"];
  required_human_steps?: readonly string[];
  synthesized_at: string;
  authority_uncertainty_score: number;
};

function normalizeStringSet(values: readonly string[]) {
  return [...new Set(values.map((value) => value.trim().normalize("NFC")).filter(Boolean))].sort();
}

function automationRank(value: TrustAutomationLevel) {
  return value === "ALLOWED" ? 2 : value === "LIMITED" ? 1 : 0;
}

function minAutomationLevel(values: readonly TrustAutomationLevel[]) {
  return values.reduce<TrustAutomationLevel>((current, value) =>
    automationRank(value) < automationRank(current) ? value : current,
  "ALLOWED");
}

function readinessForAutomation(value: TrustAutomationLevel): TrustFilingReadiness {
  return value === "ALLOWED" ? "READY_TO_SUBMIT" : value === "LIMITED" ? "READY_REVIEW" : "NOT_READY";
}

export function buildExecutionModeBoundaryContract(
  input: BuildExecutionModeBoundaryContractInput,
): ExecutionModeBoundaryContract {
  const runKind = input.run_kind ?? "INTERACTIVE";
  const replayClass = runKind === "REPLAY" ? input.replay_class_or_null ?? "STANDARD_REPLAY" : null;
  const executionPosture =
    runKind === "REPLAY"
      ? replayClass === "COUNTERFACTUAL_ANALYSIS"
        ? "REPLAY_COUNTERFACTUAL"
        : "REPLAY_COMPLIANCE"
      : input.execution_mode === "COMPLIANCE"
        ? "LIVE_COMPLIANCE"
        : "LIVE_ANALYSIS";
  const legalEffectBoundary =
    executionPosture === "LIVE_COMPLIANCE"
      ? "COMPLIANCE_CAPABLE"
      : executionPosture === "LIVE_ANALYSIS"
        ? "MODELED_READ_ONLY"
        : executionPosture === "REPLAY_COUNTERFACTUAL"
          ? "COUNTERFACTUAL_REPLAY_READ_ONLY"
          : "HISTORICAL_REPLAY_READ_ONLY";
  const disclosureReasonCodes =
    legalEffectBoundary === "COMPLIANCE_CAPABLE"
      ? []
      : legalEffectBoundary === "MODELED_READ_ONLY"
        ? ["ANALYSIS_ONLY_POSTURE"]
        : legalEffectBoundary === "COUNTERFACTUAL_REPLAY_READ_ONLY"
          ? ["COUNTERFACTUAL_REPLAY_POSTURE"]
          : ["REPLAY_NON_LIVE_POSTURE"];
  const payload = {
    analysis_only: input.analysis_only,
    contract_version: "EXECUTION_MODE_BOUNDARY_V1" as const,
    counterfactual_basis: input.counterfactual_basis,
    disclosure_reason_codes: disclosureReasonCodes,
    execution_mode: input.execution_mode,
    execution_posture: executionPosture,
    legal_effect_boundary: legalEffectBoundary,
    non_compliance_config_refs: normalizeStringSet(input.non_compliance_config_refs),
    replay_class_or_null: replayClass,
    run_kind: runKind,
  };
  return {
    ...payload,
    boundary_hash: `execution-mode-boundary-hash://${stableJsonHash(payload)}`,
  };
}

function baselineProgressionState(value: TrustBaselineSubmissionState) {
  if (value === "KNOWN_MATCHED" || value === "KNOWN_FILED") {
    return "MATCHED_OR_FILED" as const;
  }
  if (value === "NOT_APPLICABLE") {
    return "NOT_APPLICABLE" as const;
  }
  return "UNKNOWN_OR_OUT_OF_BAND" as const;
}

function buildBaselineHash(input: BuildTrustInputBasisContractInput) {
  if (input.baseline_submission_state === "NOT_APPLICABLE") {
    return null;
  }
  return input.baseline_selection_contract_hash_or_null ??
    `baseline-selection-contract-hash://${stableJsonHash({
      baseline_submission_state: input.baseline_submission_state,
      manifest_id: input.manifest_id,
    })}`;
}

function deriveFreshness(input: BuildTrustInputBasisContractInput) {
  const deadlines = input.freshness_deadlines ?? [];
  const classes = normalizeStringSet(deadlines.map((deadline) => deadline.dependency_class));
  const synthesizedAt = Date.parse(normalizeUtcInstantString(input.synthesized_at));
  const parsed = deadlines.map((deadline) => ({
    ...deadline,
    fresh_until: normalizeUtcInstantString(deadline.fresh_until),
  }));
  const trustFreshUntil =
    parsed.length === 0
      ? null
      : parsed.map((deadline) => deadline.fresh_until).sort((left, right) => left.localeCompare(right))[0];
  const anyStale =
    (input.late_data_invalidation_state ?? "NONE") === "INVALIDATING_FINDING_PRESENT" ||
    parsed.some((deadline) => Date.parse(deadline.fresh_until) <= synthesizedAt);
  return {
    freshness_dependency_classes: classes as TrustInputBasisContract["freshness_dependency_classes"],
    freshness_state:
      classes.length === 0
        ? "NO_EXPIRING_DEPENDENCIES"
        : anyStale
          ? "STALE_OR_INVALIDATED"
          : "CURRENT",
    trust_fresh_until: classes.length === 0 ? null : trustFreshUntil ?? normalizeUtcInstantString(input.synthesized_at),
  } as const;
}

export function buildTrustInputBasisContract(
  input: BuildTrustInputBasisContractInput,
): TrustInputBasisContract {
  const lateDataState = input.late_data_invalidation_state ?? "NONE";
  const overrideDependencyState =
    input.override_dependency_state ?? "NO_ACTIVE_OR_VALID_OVERRIDES";
  const baselineState = baselineProgressionState(input.baseline_submission_state);
  const freshness = deriveFreshness(input);
  const inputReasonCodes: string[] = [];
  const blockingRefs = new Set(normalizeStringSet(input.blocking_dependency_refs ?? []));
  const baselineLimitationReasons =
    baselineState === "UNKNOWN_OR_OUT_OF_BAND"
      ? normalizeStringSet([
          "TRUST_BASELINE_UNRESOLVED",
          ...(input.baseline_limitation_reason_codes ?? []),
        ])
      : baselineState === "NOT_APPLICABLE"
        ? []
        : normalizeStringSet(input.baseline_limitation_reason_codes ?? []);
  const baselineAutomationCeiling =
    baselineState === "UNKNOWN_OR_OUT_OF_BAND"
      ? "BLOCKED"
      : baselineLimitationReasons.length > 0
        ? "LIMITED"
        : "ALLOWED";
  const authorityProgressionState =
    input.live_authority_progression_requested && input.authority_uncertainty_score >= 70
      ? "BLOCKED"
      : input.live_authority_progression_requested &&
          (input.authority_uncertainty_score >= 35 || baselineState === "UNKNOWN_OR_OUT_OF_BAND")
        ? "REVIEW_LIMITED"
        : baselineState === "NOT_APPLICABLE"
          ? "NOT_REQUESTED_OR_NOT_APPLICABLE"
          : "CLEAR";
  if (!input.input_presence_ok) {
    inputReasonCodes.push("TRUST_INPUT_INCOMPLETE");
    blockingRefs.add(`trust-dependency://missing/${input.manifest_id}`);
  }
  if (
    input.manifest_binding_ok === false ||
    input.lifecycle_binding_ok === false ||
    input.consistency_ok === false ||
    input.limitation_semantics_ok === false ||
    overrideDependencyState === "INVALID_OVERRIDE_RELIED_UPON"
  ) {
    inputReasonCodes.push("TRUST_INPUT_CONTRADICTION");
    blockingRefs.add(`trust-dependency://contradicted/${input.manifest_id}`);
  }
  if (overrideDependencyState === "INVALID_OVERRIDE_RELIED_UPON") {
    inputReasonCodes.push("TRUST_OVERRIDE_INVALID");
  }
  if (freshness.freshness_state === "STALE_OR_INVALIDATED") {
    inputReasonCodes.push("TRUST_INPUT_STALE");
    inputReasonCodes.push("TRUST_RECALCULATION_REQUIRED");
    blockingRefs.add(`trust-dependency://stale/${input.manifest_id}`);
  }
  if (authorityProgressionState === "REVIEW_LIMITED" || authorityProgressionState === "BLOCKED") {
    inputReasonCodes.push("TRUST_AUTHORITY_STATE_UNRESOLVED");
    blockingRefs.add(`trust-dependency://authority/${input.manifest_id}`);
  }
  if (baselineState === "UNKNOWN_OR_OUT_OF_BAND") {
    inputReasonCodes.push("TRUST_AUTHORITY_STATE_UNRESOLVED");
    blockingRefs.add(`trust-dependency://baseline/${input.manifest_id}`);
  }
  if ((input.required_human_steps ?? []).length > 0) {
    inputReasonCodes.push("TRUST_REQUIRED_HUMAN_STEPS");
    blockingRefs.add(`trust-dependency://human-step/${input.manifest_id}`);
  }

  const limitedButAdmissible =
    freshness.freshness_state === "STALE_OR_INVALIDATED" ||
    authorityProgressionState === "REVIEW_LIMITED" ||
    authorityProgressionState === "BLOCKED" ||
    baselineState === "UNKNOWN_OR_OUT_OF_BAND" ||
    baselineLimitationReasons.length > 0 ||
    (input.required_human_steps ?? []).length > 0;
  if (limitedButAdmissible && !inputReasonCodes.includes("TRUST_INPUT_STALE")) {
    inputReasonCodes.push("TRUST_INPUT_STALE");
    blockingRefs.add(`trust-dependency://stale/${input.manifest_id}`);
  }

  const trustInputState: TrustInputState = !input.input_presence_ok
    ? "INCOMPLETE"
    : !input.manifest_binding_ok ||
        !input.lifecycle_binding_ok ||
        !input.consistency_ok ||
        !input.limitation_semantics_ok ||
        overrideDependencyState === "INVALID_OVERRIDE_RELIED_UPON"
      ? "CONTRADICTED"
      : limitedButAdmissible
        ? "ADMISSIBLE_STALE"
        : "ADMISSIBLE_CURRENT";
  const automationCeilings: TrustAutomationLevel[] = [baselineAutomationCeiling];
  if (trustInputState === "INCOMPLETE" || trustInputState === "CONTRADICTED") {
    automationCeilings.push("BLOCKED");
  } else if (trustInputState === "ADMISSIBLE_STALE") {
    automationCeilings.push("LIMITED");
  }
  if (authorityProgressionState === "BLOCKED") {
    automationCeilings.push("BLOCKED");
  } else if (authorityProgressionState === "REVIEW_LIMITED") {
    automationCeilings.push("LIMITED");
  }
  if ((input.required_human_steps ?? []).length > 0) {
    automationCeilings.push("LIMITED");
  }
  const automationCeiling = minAutomationLevel(automationCeilings);
  const payload = {
    authority_progression_state: authorityProgressionState,
    automation_ceiling: automationCeiling,
    baseline_automation_ceiling: baselineAutomationCeiling,
    baseline_limitation_reason_codes: baselineLimitationReasons,
    baseline_progression_state: baselineState,
    baseline_selection_contract_hash_or_null: buildBaselineHash(input),
    blocking_dependency_refs: [...blockingRefs].sort(),
    consistency_state: input.consistency_ok ? "CONSISTENT" : "CONTRADICTED",
    contract_version: "TRUST_INPUT_BASIS_V1" as const,
    execution_mode_boundary_contract: input.execution_mode_boundary_contract,
    filing_readiness_ceiling: readinessForAutomation(automationCeiling),
    freshness_dependency_classes: freshness.freshness_dependency_classes,
    freshness_state: freshness.freshness_state,
    human_step_state:
      (input.required_human_steps ?? []).length > 0 ? "UNRESOLVED_PRETRUST_STEPS" : "CLEARED",
    input_presence_state: input.input_presence_ok ? "COMPLETE" : "INCOMPLETE",
    input_reason_codes: orderTrustReasonCodes(inputReasonCodes),
    late_data_invalidation_state: lateDataState,
    lifecycle_binding_state: input.lifecycle_binding_ok ? "CURRENT_UNSUPERSEDED" : "SUPERSEDED_OR_REPLACED",
    limitation_semantics_state: input.limitation_semantics_ok
      ? "EXPLICIT_LIMITATIONS_ONLY"
      : "SILENT_LIMITATION_AMBIGUITY",
    manifest_binding_state: input.manifest_binding_ok
      ? "ACTIVE_MANIFEST_OR_ADMITTED_LINEAGE"
      : "MANIFEST_MISMATCH",
    override_dependency_state: overrideDependencyState,
    trust_fresh_until: freshness.trust_fresh_until,
    trust_input_state: trustInputState,
  };
  return {
    ...payload,
    basis_contract_hash: `trust-input-basis-contract-hash://${stableJsonHash(payload)}`,
  };
}
