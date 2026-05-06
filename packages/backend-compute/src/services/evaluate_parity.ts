import { stableJsonHash } from "../../../domain-kernel/src/primitives/hash.ts";
import { normalizeUtcInstantString } from "../../../domain-kernel/src/primitives/time.ts";
import type { ComputeResultRecord } from "../models/compute_result.ts";
import {
  withRefreshedParityResultContract,
  type ParityResultExecutionMode,
  type ParityResultRecord,
} from "../models/parity_result.ts";
import type {
  ParityResultRepository,
  StoredParityResultRecord,
} from "../repositories/parity_result_repository.ts";
import { buildComparisonSet, type ParityThresholdProfile } from "./build_comparison_set.ts";
import { buildFieldDelta } from "./build_field_delta.ts";
import { classifyParityResult } from "./classify_parity_result.ts";
import {
  resolveComparisonBasis,
  type CalculationBasisRecord,
  type ComparisonBasisProviderProfile,
} from "./resolve_comparison_basis.ts";
import { normalizeMoneyProfile, type ComputeMoneyProfile } from "./exact_decimal.ts";

export type EvaluateParityInput = {
  calculation_basis?: CalculationBasisRecord | null;
  compute_result?: ComputeResultRecord;
  counterfactual_basis?: string | null;
  created_at: string;
  evaluated_at?: string;
  execution_mode: ParityResultExecutionMode;
  manifest_id?: string;
  money_profile?: ComputeMoneyProfile;
  non_compliance_config_refs?: readonly string[];
  parity_id?: string;
  persisted_at?: string;
  provider_profile?: ComparisonBasisProviderProfile;
  repository?: ParityResultRepository;
  schema_bundle_hash?: string;
  temporal_propagation_event_refs?: readonly string[];
  threshold_profile: ParityThresholdProfile;
  writer_build_id?: string;
};

export type EvaluateParityResult = {
  parity_result: ParityResultRecord;
  stored_parity_result: StoredParityResultRecord | null;
};

export class EvaluateParityError extends Error {
  readonly code:
    | "PARITY_ANALYSIS_BASIS_REQUIRED"
    | "PARITY_COMPLIANCE_COUNTERFACTUAL_REJECTED"
    | "PARITY_COMPUTE_BASIS_INVALID"
    | "PARITY_MANIFEST_REQUIRED";

  constructor(code: EvaluateParityError["code"], detail: string) {
    super(`${code}: ${detail}`);
    this.name = "EvaluateParityError";
    this.code = code;
  }
}

type ParityExecutionBoundary = {
  analysis_only: boolean;
  counterfactual_basis: string | null;
  manifest_id: string;
  money_profile: ComputeMoneyProfile;
  non_compliance_config_refs: string[];
  reporting_scope: string[];
};

function requireBoundaryString(label: string, value: unknown) {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new EvaluateParityError("PARITY_MANIFEST_REQUIRED", `${label} must be a non-empty string`);
  }
  return value.trim().normalize("NFC");
}

function normalizeStringSet(values: readonly string[]) {
  return [...new Set(values.map((value) => requireBoundaryString("parity.boundary.ref", value)))].sort();
}

function enforceParityExecutionBoundary(input: {
  compute_result?: ComputeResultRecord;
  counterfactual_basis?: string | null;
  execution_mode: ParityResultExecutionMode;
  manifest_id?: string;
  money_profile?: ComputeMoneyProfile;
  non_compliance_config_refs?: readonly string[];
}): ParityExecutionBoundary {
  if (
    input.compute_result &&
    input.compute_result.lifecycle_state !== "COMPUTED" &&
    input.compute_result.lifecycle_state !== "SUPERSEDED"
  ) {
    throw new EvaluateParityError(
      "PARITY_COMPUTE_BASIS_INVALID",
      "parity evaluation requires a computed or historically superseded compute basis",
    );
  }
  const manifestId = input.manifest_id ?? input.compute_result?.manifest_id;
  if (manifestId === undefined) {
    throw new EvaluateParityError(
      "PARITY_MANIFEST_REQUIRED",
      "parity evaluation requires manifest_id or compute_result.manifest_id",
    );
  }
  const rawMoneyProfile = input.money_profile ?? input.compute_result?.money_profile;
  if (rawMoneyProfile === undefined) {
    throw new EvaluateParityError(
      "PARITY_COMPUTE_BASIS_INVALID",
      "parity evaluation requires money_profile or compute_result.money_profile",
    );
  }
  const moneyProfile = normalizeMoneyProfile(rawMoneyProfile);
  if (input.execution_mode === "COMPLIANCE") {
    if (input.counterfactual_basis !== undefined && input.counterfactual_basis !== null) {
      throw new EvaluateParityError(
        "PARITY_COMPLIANCE_COUNTERFACTUAL_REJECTED",
        "COMPLIANCE parity evaluation cannot carry a counterfactual basis",
      );
    }
    if (
      input.compute_result &&
      (input.compute_result.execution_mode !== "COMPLIANCE" ||
        input.compute_result.analysis_only !== false)
    ) {
      throw new EvaluateParityError(
        "PARITY_COMPUTE_BASIS_INVALID",
        "COMPLIANCE parity evaluation requires a compliance compute basis",
      );
    }
    if ((input.non_compliance_config_refs ?? []).length > 0) {
      throw new EvaluateParityError(
        "PARITY_COMPLIANCE_COUNTERFACTUAL_REJECTED",
        "COMPLIANCE parity evaluation cannot carry non-compliance config refs",
      );
    }
    return {
      analysis_only: false,
      counterfactual_basis: null,
      manifest_id: requireBoundaryString("parity.manifest_id", manifestId),
      money_profile: moneyProfile,
      non_compliance_config_refs: [],
      reporting_scope: [input.compute_result?.reporting_scope ?? "year_end"],
    };
  }
  const counterfactualBasis =
    input.counterfactual_basis ?? input.compute_result?.counterfactual_basis ?? null;
  if (typeof counterfactualBasis !== "string" || counterfactualBasis.trim().length === 0) {
    throw new EvaluateParityError(
      "PARITY_ANALYSIS_BASIS_REQUIRED",
      "ANALYSIS parity evaluation requires a declared counterfactual basis",
    );
  }
  return {
    analysis_only: true,
    counterfactual_basis: counterfactualBasis.trim().normalize("NFC"),
    manifest_id: requireBoundaryString("parity.manifest_id", manifestId),
    money_profile: moneyProfile,
    non_compliance_config_refs: normalizeStringSet([
      ...(input.compute_result?.non_compliance_config_refs ?? []),
      ...(input.non_compliance_config_refs ?? []),
    ]),
    reporting_scope: [input.compute_result?.reporting_scope ?? "year_end"],
  };
}

function deterministicParityId(input: {
  comparison_basis_ref: string | null;
  comparison_requirement: string;
  execution_mode: ParityResultExecutionMode;
  manifest_id: string;
  parity_threshold_profile_ref: string;
  threshold_profile: ParityThresholdProfile;
}) {
  return `parity.${stableJsonHash({
    comparison_basis_ref: input.comparison_basis_ref,
    comparison_requirement: input.comparison_requirement,
    execution_mode: input.execution_mode,
    manifest_id: input.manifest_id,
    parity_threshold_profile_ref: input.parity_threshold_profile_ref,
    threshold_profile: input.threshold_profile,
  })}`;
}

export async function evaluateParity(input: EvaluateParityInput): Promise<EvaluateParityResult> {
  const boundary = enforceParityExecutionBoundary({
    execution_mode: input.execution_mode,
    ...(input.compute_result === undefined ? {} : { compute_result: input.compute_result }),
    ...(input.counterfactual_basis === undefined
      ? {}
      : { counterfactual_basis: input.counterfactual_basis }),
    ...(input.manifest_id === undefined ? {} : { manifest_id: input.manifest_id }),
    ...(input.money_profile === undefined ? {} : { money_profile: input.money_profile }),
    ...(input.non_compliance_config_refs === undefined
      ? {}
      : { non_compliance_config_refs: input.non_compliance_config_refs }),
  });
  const basis = resolveComparisonBasis({
    ...(input.calculation_basis === undefined ? {} : { calculation_basis: input.calculation_basis }),
    manifest_id: boundary.manifest_id,
    ...(input.provider_profile === undefined ? {} : { provider_profile: input.provider_profile }),
    reporting_scope: boundary.reporting_scope,
  });
  const comparisonSet = buildComparisonSet({
    money_profile: boundary.money_profile,
    threshold_profile: input.threshold_profile,
  });
  const basisBlocksComparison =
    basis.comparison_requirement !== "NOT_REQUIRED" && basis.comparison_basis_state !== "RESOLVED";
  const evaluatedAt = normalizeUtcInstantString(input.evaluated_at ?? input.created_at);
  const comparisonSetState =
    comparisonSet.comparison_set_state === "INVALID" || basisBlocksComparison ? "INVALID" : "VALID";
  const deltas =
    comparisonSetState === "VALID"
      ? Object.fromEntries(
          comparisonSet.fields.map((field) => {
            const delta = buildFieldDelta({
              blocking_ratio_cap: comparisonSet.blocking_ratio_cap,
              comparison_requirement: basis.comparison_requirement,
              field,
              minimum_rel_floor: comparisonSet.minimum_rel_floor,
              money_profile: boundary.money_profile,
            });
            return [delta.field_code, delta] as const;
          }),
        )
      : {};
  const orderedFieldCodes =
    comparisonSetState === "VALID" ? comparisonSet.fields.map((field) => field.field_code) : [];
  const aggregate = classifyParityResult({
    blocking_ratio_cap: comparisonSet.blocking_ratio_cap,
    comparison_requirement: basis.comparison_requirement,
    comparison_set_state: comparisonSetState,
    deltas,
    ordered_field_codes: orderedFieldCodes,
  });
  const reasonCodes = [
    ...aggregate.reason_codes,
    ...basis.reason_codes,
    ...comparisonSet.reason_codes,
  ];
  const causeHypotheses =
    aggregate.parity_classification === "NOT_COMPARABLE"
      ? [
          ...aggregate.cause_hypotheses,
          ...basis.reason_codes,
          ...comparisonSet.reason_codes.filter((reason) => reason !== "PARITY_COMPARISON_SET_INVALID"),
        ]
      : aggregate.cause_hypotheses;
  const parityThresholdProfileRef = comparisonSet.parity_threshold_profile_ref;
  const parityId =
    input.parity_id ??
    deterministicParityId({
      comparison_basis_ref: basis.comparison_basis_ref,
      comparison_requirement: basis.comparison_requirement,
      execution_mode: input.execution_mode,
      manifest_id: boundary.manifest_id,
      parity_threshold_profile_ref: parityThresholdProfileRef,
      threshold_profile: input.threshold_profile,
    });
  const parityResult = withRefreshedParityResultContract({
    parity_result: {
      analysis_only: boundary.analysis_only,
      artifact_type: "ParityResult",
      comparison_basis_ref: basis.comparison_basis_ref,
      comparison_coverage: aggregate.comparison_coverage,
      comparison_requirement: basis.comparison_requirement,
      comparison_set_state: comparisonSetState,
      counterfactual_basis: boundary.counterfactual_basis,
      critical_blocking_field_count: aggregate.critical_blocking_field_count,
      critical_material_field_count: aggregate.critical_material_field_count,
      deltas,
      dominant_reason_code: aggregate.dominant_reason_code,
      evaluated_at: evaluatedAt,
      execution_mode: input.execution_mode,
      lifecycle_state: "EVALUATED",
      manifest_id: boundary.manifest_id,
      money_profile: boundary.money_profile,
      non_compliance_config_refs: boundary.non_compliance_config_refs,
      ordered_field_codes: orderedFieldCodes,
      parity_classification: aggregate.parity_classification,
      parity_id: parityId,
      parity_score: aggregate.parity_score,
      parity_threshold_profile_ref: parityThresholdProfileRef,
      reason_codes: reasonCodes,
      temporal_propagation_event_refs: normalizeStringSet(input.temporal_propagation_event_refs ?? []),
      weighted_parity_pressure: aggregate.weighted_parity_pressure,
      cause_hypotheses: [...new Set(causeHypotheses)].sort(),
    },
    ...(input.schema_bundle_hash === undefined ? {} : { schema_bundle_hash: input.schema_bundle_hash }),
    ...(input.writer_build_id === undefined ? {} : { writer_build_id: input.writer_build_id }),
  });
  const stored = input.repository
    ? await input.repository.persistParityResult({
        parity_result: parityResult,
        persisted_at: input.persisted_at ?? normalizeUtcInstantString(input.created_at),
      })
    : null;
  return { parity_result: parityResult, stored_parity_result: stored };
}
