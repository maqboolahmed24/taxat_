import { stableJsonHash } from "../../../domain-kernel/src/primitives/hash.ts";
import { normalizeUtcInstantString } from "../../../domain-kernel/src/primitives/time.ts";
import { ParityResultSchemaLineage } from "../../../generated-models/src/generated/typescript/decisioning-and-nightly.ts";
import type { SchemaBundleArtifactContract } from "../../../generated-models/src/generated/typescript/manifest-and-release.ts";
import {
  canonicalMoneyString,
  normalizeMoneyProfile,
  type ComputeMoneyProfile,
  type ComputeMoneyValue,
} from "../services/exact_decimal.ts";

export type ParityResultExecutionMode = "COMPLIANCE" | "ANALYSIS";
export type ParityLifecycleState = "NOT_EVALUATED" | "EVALUATED" | "SUPERSEDED";
export type ParityComparisonRequirement = "MANDATORY" | "DESIRABLE" | "NOT_REQUIRED";
export type ParityComparisonSetState = "VALID" | "INVALID";
export type ParityCriticalityClass = "CRITICAL" | "HIGH" | "NORMAL";
export type ParityComparisonInputState = "COMPARABLE" | "AUTHORITY_MISSING" | "INVALID_INPUT";
export type ParityFieldClass =
  | "MATCH"
  | "MINOR_DIFFERENCE"
  | "MATERIAL_DIFFERENCE"
  | "BLOCKING_DIFFERENCE"
  | "NOT_COMPARABLE";
export type ParityClassification = ParityFieldClass;

export type ParityFieldDeltaRecord = {
  abs_floor: ComputeMoneyValue;
  abs_threshold: ComputeMoneyValue;
  authority_value: ComputeMoneyValue | null;
  breach_ratio: number | null;
  comparison_input_state: ParityComparisonInputState;
  criticality_class: ParityCriticalityClass;
  criticality_weight: number;
  delta_abs: ComputeMoneyValue | null;
  delta_rel: number | null;
  delta_signed: ComputeMoneyValue | null;
  effective_abs_floor: ComputeMoneyValue;
  field_class: ParityFieldClass;
  field_code: string;
  internal_value: ComputeMoneyValue | null;
  reason_codes: string[];
  rel_threshold: number;
};

export type ParityResultRecord = {
  analysis_only: boolean;
  artifact_type: "ParityResult";
  comparison_basis_ref: string | null;
  comparison_coverage: number | null;
  comparison_requirement: ParityComparisonRequirement;
  comparison_set_state: ParityComparisonSetState | null;
  contract: SchemaBundleArtifactContract;
  counterfactual_basis: string | null;
  critical_blocking_field_count: number;
  critical_material_field_count: number;
  deltas: Record<string, ParityFieldDeltaRecord>;
  dominant_reason_code: string | null;
  evaluated_at: string | null;
  execution_mode: ParityResultExecutionMode;
  lifecycle_state: ParityLifecycleState;
  manifest_id: string;
  money_profile: ComputeMoneyProfile;
  non_compliance_config_refs: string[];
  ordered_field_codes: string[];
  parity_classification: ParityClassification | null;
  parity_id: string;
  parity_score: number | null;
  parity_threshold_profile_ref: string | null;
  reason_codes: string[];
  temporal_propagation_event_refs: string[];
  weighted_parity_pressure: number | null;
  cause_hypotheses: string[];
};

export type ParityResultContractBuildInput = {
  parity_content_hash: string;
  parity_id: string;
  schema_bundle_hash?: string;
  writer_build_id?: string;
};

export class ParityResultModelError extends Error {
  readonly code:
    | "PARITY_RESULT_ARTIFACT_TYPE_INVALID"
    | "PARITY_RESULT_BOUNDARY_INVALID"
    | "PARITY_RESULT_CONTRACT_INVALID"
    | "PARITY_RESULT_DELTA_DUPLICATE"
    | "PARITY_RESULT_DELTA_INVALID"
    | "PARITY_RESULT_FIELD_REQUIRED"
    | "PARITY_RESULT_LIFECYCLE_POSTURE_INVALID"
    | "PARITY_RESULT_SCORE_INVALID";

  constructor(code: ParityResultModelError["code"], detail: string) {
    super(`${code}: ${detail}`);
    this.name = "ParityResultModelError";
    this.code = code;
  }
}

const REASON_ORDER = [
  "PARITY_COMPARISON_SET_INVALID",
  "PARITY_NOT_COMPARABLE",
  "PARITY_PARTIAL_COVERAGE",
  "PARITY_BLOCKING_DIFFERENCE",
  "PARITY_MATERIAL_DIFFERENCE",
  "PARITY_MINOR_DIFFERENCE",
  "PARITY_MATCH",
];

function requireString(label: string, value: unknown) {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new ParityResultModelError(
      "PARITY_RESULT_FIELD_REQUIRED",
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

function normalizeOrderedStringSet(label: string, values: readonly string[]) {
  const seen = new Set<string>();
  return values.map((value) => requireString(label, value)).filter((value) => {
    if (seen.has(value)) {
      throw new ParityResultModelError(
        "PARITY_RESULT_FIELD_REQUIRED",
        `${label} must not contain duplicates`,
      );
    }
    seen.add(value);
    return true;
  });
}

function orderReasonCodes(values: readonly string[]) {
  const normalized = normalizeStringSet("parity_result.reason_codes", values);
  const present = new Set(normalized);
  return [
    ...REASON_ORDER.filter((reason) => present.has(reason)),
    ...normalized.filter((reason) => !REASON_ORDER.includes(reason)).sort(),
  ];
}

function normalizeExecutionMode(value: unknown): ParityResultExecutionMode {
  const normalized = requireString("parity_result.execution_mode", value);
  if (normalized !== "COMPLIANCE" && normalized !== "ANALYSIS") {
    throw new ParityResultModelError(
      "PARITY_RESULT_BOUNDARY_INVALID",
      "execution_mode must be COMPLIANCE or ANALYSIS",
    );
  }
  return normalized;
}

function normalizeLifecycle(value: unknown): ParityLifecycleState {
  const normalized = requireString("parity_result.lifecycle_state", value);
  if (
    normalized !== "NOT_EVALUATED" &&
    normalized !== "EVALUATED" &&
    normalized !== "SUPERSEDED"
  ) {
    throw new ParityResultModelError(
      "PARITY_RESULT_LIFECYCLE_POSTURE_INVALID",
      "lifecycle_state is not allowed",
    );
  }
  return normalized;
}

function normalizeRequirement(value: unknown): ParityComparisonRequirement {
  const normalized = requireString("parity_result.comparison_requirement", value);
  if (normalized !== "MANDATORY" && normalized !== "DESIRABLE" && normalized !== "NOT_REQUIRED") {
    throw new ParityResultModelError(
      "PARITY_RESULT_LIFECYCLE_POSTURE_INVALID",
      "comparison_requirement is not allowed",
    );
  }
  return normalized;
}

function normalizeComparisonSetState(value: ParityComparisonSetState | null) {
  if (value === null || value === "VALID" || value === "INVALID") {
    return value;
  }
  throw new ParityResultModelError(
    "PARITY_RESULT_LIFECYCLE_POSTURE_INVALID",
    "comparison_set_state is not allowed",
  );
}

function normalizeClassification(value: ParityClassification | null) {
  if (
    value === null ||
    value === "MATCH" ||
    value === "MINOR_DIFFERENCE" ||
    value === "MATERIAL_DIFFERENCE" ||
    value === "BLOCKING_DIFFERENCE" ||
    value === "NOT_COMPARABLE"
  ) {
    return value;
  }
  throw new ParityResultModelError(
    "PARITY_RESULT_LIFECYCLE_POSTURE_INVALID",
    "parity_classification is not allowed",
  );
}

function normalizeFiniteNumber(label: string, value: number, options?: { max?: number; min?: number }) {
  const min = options?.min ?? 0;
  const max = options?.max ?? Number.POSITIVE_INFINITY;
  if (!Number.isFinite(value) || value < min || value > max) {
    throw new ParityResultModelError(
      "PARITY_RESULT_SCORE_INVALID",
      `${label} must be finite and inside the schema interval`,
    );
  }
  return value;
}

function normalizeNullableFiniteNumber(
  label: string,
  value: number | null,
  options?: { max?: number; min?: number },
) {
  return value === null ? null : normalizeFiniteNumber(label, value, options);
}

function normalizeNonNegativeInteger(label: string, value: number) {
  if (!Number.isInteger(value) || value < 0) {
    throw new ParityResultModelError(
      "PARITY_RESULT_SCORE_INVALID",
      `${label} must be a non-negative integer`,
    );
  }
  return value;
}

function normalizeCriticality(value: unknown): ParityCriticalityClass {
  const normalized = requireString("parity_result.delta.criticality_class", value);
  if (normalized !== "CRITICAL" && normalized !== "HIGH" && normalized !== "NORMAL") {
    throw new ParityResultModelError(
      "PARITY_RESULT_DELTA_INVALID",
      "criticality_class is not allowed",
    );
  }
  return normalized;
}

function normalizeInputState(value: unknown): ParityComparisonInputState {
  const normalized = requireString("parity_result.delta.comparison_input_state", value);
  if (
    normalized !== "COMPARABLE" &&
    normalized !== "AUTHORITY_MISSING" &&
    normalized !== "INVALID_INPUT"
  ) {
    throw new ParityResultModelError(
      "PARITY_RESULT_DELTA_INVALID",
      "comparison_input_state is not allowed",
    );
  }
  return normalized;
}

function normalizeFieldClass(value: unknown): ParityFieldClass {
  const normalized = requireString("parity_result.delta.field_class", value);
  if (
    normalized !== "MATCH" &&
    normalized !== "MINOR_DIFFERENCE" &&
    normalized !== "MATERIAL_DIFFERENCE" &&
    normalized !== "BLOCKING_DIFFERENCE" &&
    normalized !== "NOT_COMPARABLE"
  ) {
    throw new ParityResultModelError(
      "PARITY_RESULT_DELTA_INVALID",
      "field_class is not allowed",
    );
  }
  return normalized;
}

function normalizeMoney(
  label: string,
  moneyProfile: ComputeMoneyProfile,
  value: ComputeMoneyValue,
) {
  try {
    return canonicalMoneyString({ money_profile: moneyProfile, value });
  } catch (error) {
    throw new ParityResultModelError(
      "PARITY_RESULT_DELTA_INVALID",
      `${label} is not a valid money value: ${error instanceof Error ? error.message : "unknown"}`,
    );
  }
}

function normalizeNullableMoney(
  label: string,
  moneyProfile: ComputeMoneyProfile,
  value: ComputeMoneyValue | null,
) {
  return value === null ? null : normalizeMoney(label, moneyProfile, value);
}

function normalizeFieldDelta(
  input: ParityFieldDeltaRecord,
  moneyProfile: ComputeMoneyProfile,
): ParityFieldDeltaRecord {
  const fieldCode = requireString("parity_result.delta.field_code", input.field_code);
  const comparisonInputState = normalizeInputState(input.comparison_input_state);
  const fieldClass = normalizeFieldClass(input.field_class);
  const normalized: ParityFieldDeltaRecord = {
    abs_floor: normalizeMoney("parity_result.delta.abs_floor", moneyProfile, input.abs_floor),
    abs_threshold: normalizeMoney(
      "parity_result.delta.abs_threshold",
      moneyProfile,
      input.abs_threshold,
    ),
    authority_value: normalizeNullableMoney(
      "parity_result.delta.authority_value",
      moneyProfile,
      input.authority_value,
    ),
    breach_ratio: normalizeNullableFiniteNumber(
      "parity_result.delta.breach_ratio",
      input.breach_ratio,
    ),
    comparison_input_state: comparisonInputState,
    criticality_class: normalizeCriticality(input.criticality_class),
    criticality_weight: normalizeFiniteNumber(
      "parity_result.delta.criticality_weight",
      input.criticality_weight,
      { min: Number.MIN_VALUE },
    ),
    delta_abs: normalizeNullableMoney(
      "parity_result.delta.delta_abs",
      moneyProfile,
      input.delta_abs,
    ),
    delta_rel: normalizeNullableFiniteNumber("parity_result.delta.delta_rel", input.delta_rel),
    delta_signed: normalizeNullableMoney(
      "parity_result.delta.delta_signed",
      moneyProfile,
      input.delta_signed,
    ),
    effective_abs_floor: normalizeMoney(
      "parity_result.delta.effective_abs_floor",
      moneyProfile,
      input.effective_abs_floor,
    ),
    field_class: fieldClass,
    field_code: fieldCode,
    internal_value: normalizeNullableMoney(
      "parity_result.delta.internal_value",
      moneyProfile,
      input.internal_value,
    ),
    reason_codes: orderReasonCodes(input.reason_codes),
    rel_threshold: normalizeFiniteNumber("parity_result.delta.rel_threshold", input.rel_threshold),
  };
  if (comparisonInputState === "COMPARABLE") {
    if (
      fieldClass === "NOT_COMPARABLE" ||
      normalized.internal_value === null ||
      normalized.authority_value === null ||
      normalized.delta_signed === null ||
      normalized.delta_abs === null ||
      normalized.delta_rel === null ||
      normalized.breach_ratio === null
    ) {
      throw new ParityResultModelError(
        "PARITY_RESULT_DELTA_INVALID",
        "COMPARABLE deltas must carry numeric values and a comparable field_class",
      );
    }
    return normalized;
  }
  if (
    fieldClass !== "NOT_COMPARABLE" ||
    normalized.delta_signed !== null ||
    normalized.delta_abs !== null ||
    normalized.delta_rel !== null ||
    normalized.breach_ratio !== null ||
    normalized.reason_codes.length === 0
  ) {
    throw new ParityResultModelError(
      "PARITY_RESULT_DELTA_INVALID",
      "non-comparable deltas must use NOT_COMPARABLE with null deltas and a reason",
    );
  }
  return normalized;
}

function normalizeDeltas(input: Record<string, ParityFieldDeltaRecord>, moneyProfile: ComputeMoneyProfile) {
  const entries = Object.entries(input).map(([key, delta]) => {
    const normalized = normalizeFieldDelta(delta, moneyProfile);
    if (key !== normalized.field_code) {
      throw new ParityResultModelError(
        "PARITY_RESULT_DELTA_INVALID",
        "delta map keys must equal field_code",
      );
    }
    return [normalized.field_code, normalized] as const;
  });
  const seen = new Set<string>();
  for (const [fieldCode] of entries) {
    if (seen.has(fieldCode)) {
      throw new ParityResultModelError(
        "PARITY_RESULT_DELTA_DUPLICATE",
        `duplicate delta field_code ${fieldCode}`,
      );
    }
    seen.add(fieldCode);
  }
  return Object.fromEntries(entries.sort(([left], [right]) => left.localeCompare(right)));
}

export function parityResultRef(record: Pick<ParityResultRecord, "parity_id">) {
  return `parity-result://${record.parity_id}`;
}

export function deriveParityResultContentHash(record: Omit<ParityResultRecord, "contract">) {
  return `parity-result-content-hash://${stableJsonHash({
    artifact_family: "PARITY_RESULT_CONTENT",
    payload: record,
  })}`;
}

export function buildParityResultContract(
  input: ParityResultContractBuildInput,
): SchemaBundleArtifactContract {
  return {
    allowed_upgrade_kinds: ["PATCH_BACKWARD", "MINOR_BACKWARD"],
    artifact_content_hash: requireString(
      "parity_result.contract.artifact_content_hash",
      input.parity_content_hash,
    ),
    artifact_id: parityResultRef({ parity_id: input.parity_id }),
    artifact_type: "ParityResult",
    compatibility_class: "BACKWARD_COMPATIBLE",
    content_hash: ParityResultSchemaLineage.sourceHash,
    dialect_ref: "json-schema-draft-2020-12",
    schema_bundle_hash: requireString(
      "parity_result.contract.schema_bundle_hash",
      input.schema_bundle_hash ?? "schema.bundle.hash.compute.default",
    ),
    schema_id: ParityResultSchemaLineage.schemaId,
    semantic_version: "1.0.0",
    supersedes_schema_id: null,
    writer_build_id: requireString(
      "parity_result.contract.writer_build_id",
      input.writer_build_id ?? "build.taxat.compute.0124",
    ),
    writer_min_reader_version: "1.0.0",
  };
}

function enforceExecutionBoundary(record: ParityResultRecord) {
  if (record.execution_mode === "COMPLIANCE") {
    if (
      record.analysis_only !== false ||
      record.counterfactual_basis !== null ||
      record.non_compliance_config_refs.length !== 0
    ) {
      throw new ParityResultModelError(
        "PARITY_RESULT_BOUNDARY_INVALID",
        "COMPLIANCE parity results must not carry analysis-only posture",
      );
    }
    return;
  }
  if (record.analysis_only !== true || record.counterfactual_basis === null) {
    throw new ParityResultModelError(
      "PARITY_RESULT_BOUNDARY_INVALID",
      "ANALYSIS parity results require analysis_only=true and a counterfactual basis",
    );
  }
}

function enforceLifecyclePosture(record: ParityResultRecord) {
  if (record.comparison_requirement !== "NOT_REQUIRED" && record.comparison_basis_ref === null) {
    throw new ParityResultModelError(
      "PARITY_RESULT_LIFECYCLE_POSTURE_INVALID",
      "MANDATORY and DESIRABLE parity results require comparison_basis_ref",
    );
  }
  if (record.lifecycle_state === "NOT_EVALUATED") {
    if (
      record.parity_classification !== null ||
      record.parity_threshold_profile_ref !== null ||
      record.comparison_set_state !== null ||
      record.ordered_field_codes.length !== 0 ||
      record.parity_score !== null ||
      record.comparison_coverage !== null ||
      record.weighted_parity_pressure !== null ||
      record.critical_blocking_field_count !== 0 ||
      record.critical_material_field_count !== 0 ||
      record.dominant_reason_code !== null ||
      record.reason_codes.length !== 0 ||
      Object.keys(record.deltas).length !== 0 ||
      record.cause_hypotheses.length !== 0 ||
      record.evaluated_at !== null
    ) {
      throw new ParityResultModelError(
        "PARITY_RESULT_LIFECYCLE_POSTURE_INVALID",
        "NOT_EVALUATED parity results must use the schema null/empty posture",
      );
    }
    return;
  }
  if (
    record.parity_threshold_profile_ref === null ||
    record.comparison_set_state === null ||
    record.parity_classification === null ||
    record.parity_score === null ||
    record.comparison_coverage === null ||
    record.weighted_parity_pressure === null ||
    record.dominant_reason_code === null ||
    record.reason_codes.length === 0 ||
    record.evaluated_at === null
  ) {
    throw new ParityResultModelError(
      "PARITY_RESULT_LIFECYCLE_POSTURE_INVALID",
      "evaluated parity results require the schema-defined evaluated posture",
    );
  }
  if (record.comparison_set_state === "INVALID") {
    if (
      record.parity_classification !== "NOT_COMPARABLE" ||
      record.parity_score !== 0 ||
      record.comparison_coverage !== 0 ||
      record.weighted_parity_pressure !== 0 ||
      record.critical_blocking_field_count !== 0 ||
      record.critical_material_field_count !== 0 ||
      record.ordered_field_codes.length !== 0
    ) {
      throw new ParityResultModelError(
        "PARITY_RESULT_LIFECYCLE_POSTURE_INVALID",
        "invalid comparison sets must fail closed as NOT_COMPARABLE",
      );
    }
  } else if (record.ordered_field_codes.length === 0 || Object.keys(record.deltas).length === 0) {
    throw new ParityResultModelError(
      "PARITY_RESULT_LIFECYCLE_POSTURE_INVALID",
      "valid comparison sets require ordered fields and deltas",
    );
  }
  if (record.parity_classification === "NOT_COMPARABLE" && record.cause_hypotheses.length === 0) {
    throw new ParityResultModelError(
      "PARITY_RESULT_LIFECYCLE_POSTURE_INVALID",
      "NOT_COMPARABLE parity results require cause hypotheses",
    );
  }
  if (
    record.parity_classification === "BLOCKING_DIFFERENCE" &&
    record.critical_blocking_field_count < 1
  ) {
    throw new ParityResultModelError(
      "PARITY_RESULT_LIFECYCLE_POSTURE_INVALID",
      "blocking parity requires at least one critical blocking field",
    );
  }
  if (
    record.parity_classification === "MATCH" &&
    (record.critical_blocking_field_count !== 0 ||
      record.critical_material_field_count !== 0 ||
      record.cause_hypotheses.length !== 0 ||
      (record.weighted_parity_pressure ?? 1) >= 0.25)
  ) {
    throw new ParityResultModelError(
      "PARITY_RESULT_LIFECYCLE_POSTURE_INVALID",
      "MATCH parity results must use clear critical counts, no causes, and pressure below 0.25",
    );
  }
}

export function normalizeParityResultRecord(input: ParityResultRecord): ParityResultRecord {
  if (input.artifact_type !== "ParityResult") {
    throw new ParityResultModelError(
      "PARITY_RESULT_ARTIFACT_TYPE_INVALID",
      "artifact_type must be ParityResult",
    );
  }
  const moneyProfile = normalizeMoneyProfile(input.money_profile);
  const executionMode = normalizeExecutionMode(input.execution_mode);
  const lifecycleState = normalizeLifecycle(input.lifecycle_state);
  const comparisonRequirement = normalizeRequirement(input.comparison_requirement);
  const normalized: ParityResultRecord = {
    analysis_only: input.analysis_only,
    artifact_type: "ParityResult",
    comparison_basis_ref: normalizeNullableString(
      "parity_result.comparison_basis_ref",
      input.comparison_basis_ref,
    ),
    comparison_coverage: normalizeNullableFiniteNumber(
      "parity_result.comparison_coverage",
      input.comparison_coverage,
      { max: 1 },
    ),
    comparison_requirement: comparisonRequirement,
    comparison_set_state: normalizeComparisonSetState(input.comparison_set_state),
    contract: structuredClone(input.contract),
    counterfactual_basis: normalizeNullableString(
      "parity_result.counterfactual_basis",
      input.counterfactual_basis,
    ),
    critical_blocking_field_count: normalizeNonNegativeInteger(
      "parity_result.critical_blocking_field_count",
      input.critical_blocking_field_count,
    ),
    critical_material_field_count: normalizeNonNegativeInteger(
      "parity_result.critical_material_field_count",
      input.critical_material_field_count,
    ),
    deltas: normalizeDeltas(input.deltas, moneyProfile),
    dominant_reason_code: normalizeNullableString(
      "parity_result.dominant_reason_code",
      input.dominant_reason_code,
    ),
    evaluated_at:
      input.evaluated_at === null ? null : normalizeUtcInstantString(input.evaluated_at),
    execution_mode: executionMode,
    lifecycle_state: lifecycleState,
    manifest_id: requireString("parity_result.manifest_id", input.manifest_id),
    money_profile: moneyProfile,
    non_compliance_config_refs: normalizeStringSet(
      "parity_result.non_compliance_config_refs",
      input.non_compliance_config_refs,
    ),
    ordered_field_codes: normalizeOrderedStringSet(
      "parity_result.ordered_field_codes",
      input.ordered_field_codes,
    ),
    parity_classification: normalizeClassification(input.parity_classification),
    parity_id: requireString("parity_result.parity_id", input.parity_id),
    parity_score: normalizeNullableFiniteNumber("parity_result.parity_score", input.parity_score, {
      max: 100,
    }),
    parity_threshold_profile_ref: normalizeNullableString(
      "parity_result.parity_threshold_profile_ref",
      input.parity_threshold_profile_ref,
    ),
    reason_codes: orderReasonCodes(input.reason_codes),
    temporal_propagation_event_refs: normalizeStringSet(
      "parity_result.temporal_propagation_event_refs",
      input.temporal_propagation_event_refs,
    ),
    weighted_parity_pressure: normalizeNullableFiniteNumber(
      "parity_result.weighted_parity_pressure",
      input.weighted_parity_pressure,
    ),
    cause_hypotheses: normalizeStringSet(
      "parity_result.cause_hypotheses",
      input.cause_hypotheses,
    ),
  };
  enforceExecutionBoundary(normalized);
  enforceLifecyclePosture(normalized);
  if (
    normalized.contract.artifact_id !== parityResultRef(normalized) ||
    normalized.contract.artifact_type !== "ParityResult" ||
    normalized.contract.schema_id !== ParityResultSchemaLineage.schemaId
  ) {
    throw new ParityResultModelError(
      "PARITY_RESULT_CONTRACT_INVALID",
      "contract must bind the ParityResult artifact",
    );
  }
  return normalized;
}

export function withRefreshedParityResultContract(input: {
  parity_result: Omit<ParityResultRecord, "contract">;
  schema_bundle_hash?: string;
  writer_build_id?: string;
}) {
  const contentHash = deriveParityResultContentHash(input.parity_result);
  return normalizeParityResultRecord({
    ...input.parity_result,
    contract: buildParityResultContract({
      parity_content_hash: contentHash,
      parity_id: input.parity_result.parity_id,
      ...(input.schema_bundle_hash === undefined
        ? {}
        : { schema_bundle_hash: input.schema_bundle_hash }),
      ...(input.writer_build_id === undefined ? {} : { writer_build_id: input.writer_build_id }),
    }),
  });
}

export function cloneParityResultRecord(record: ParityResultRecord) {
  return structuredClone(record);
}
