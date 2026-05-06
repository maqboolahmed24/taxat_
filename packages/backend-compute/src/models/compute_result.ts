import { normalizeScopeSequence } from "../../../backend-access/src/services/principal_context_normalizer.ts";
import { stableJsonHash } from "../../../domain-kernel/src/primitives/hash.ts";
import { normalizeUtcInstantString } from "../../../domain-kernel/src/primitives/time.ts";
import { ComputeResultSchemaLineage } from "../../../generated-models/src/generated/typescript/decisioning-and-nightly.ts";
import type { SchemaBundleArtifactContract } from "../../../generated-models/src/generated/typescript/manifest-and-release.ts";
import {
  canonicalMoneyString,
  normalizeMoneyProfile,
  type ComputeMoneyProfile,
  type ComputeMoneyValue,
} from "../services/exact_decimal.ts";

export type ComputeResultLifecycleState =
  | "NOT_RUN"
  | "RUNNING"
  | "COMPUTED"
  | "BLOCKED"
  | "SUPERSEDED";

export type ComputeResultExecutionMode = "COMPLIANCE" | "ANALYSIS";
export type ComputeResultReportingScope = "year_end" | "quarterly_update" | "estimate_only";
export type ComputeResultQuarterlyBasis = "PERIODIC" | "CUMULATIVE";
export type ComputeResultAdjustmentInclusionPolicy =
  | "RECORD_ONLY"
  | "APPLY_SCOPE_FILTERED_ADJUSTMENTS";
export type ComputeResultAdjustmentScopeSource =
  | "EXECUTABLE_REPORTING_SCOPE"
  | "COUNTERFACTUAL_ANALYSIS_SCOPE";

export type ComputeResultTotals = Record<
  string,
  ComputeMoneyValue | Record<string, ComputeMoneyValue>
>;

export type ComputeResultAssumptions = Record<string, string | number | boolean | string[]>;

export type ComputeResultRecord = {
  adjustment_inclusion_policy: ComputeResultAdjustmentInclusionPolicy;
  adjustment_scope_source: ComputeResultAdjustmentScopeSource;
  analysis_only: boolean;
  artifact_type: "ComputeResult";
  assumptions: ComputeResultAssumptions;
  basis_profile_ref_or_null: string | null;
  compute_id: string;
  computed_at: string | null;
  contract: SchemaBundleArtifactContract;
  counterfactual_basis: string | null;
  diagnostic_artifact_refs: string[];
  diagnostic_reason_codes: string[];
  effective_partition_scope_refs: string[];
  execution_mode: ComputeResultExecutionMode;
  lifecycle_state: ComputeResultLifecycleState;
  manifest_id: string;
  money_profile: ComputeMoneyProfile;
  non_compliance_config_refs: string[];
  quarterly_basis_profile_or_null: ComputeResultQuarterlyBasis | null;
  reporting_scope: ComputeResultReportingScope;
  rule_version_ref: string;
  totals: ComputeResultTotals;
};

export type ComputeResultContractBuildInput = {
  compute_content_hash: string;
  compute_id: string;
  schema_bundle_hash?: string;
  writer_build_id?: string;
};

export type ComputeResultModelErrorCode =
  | "COMPUTE_RESULT_ANALYSIS_POSTURE_INVALID"
  | "COMPUTE_RESULT_ARTIFACT_TYPE_INVALID"
  | "COMPUTE_RESULT_CONTRACT_INVALID"
  | "COMPUTE_RESULT_FIELD_REQUIRED"
  | "COMPUTE_RESULT_LIFECYCLE_INVALID"
  | "COMPUTE_RESULT_MONEY_INVALID"
  | "COMPUTE_RESULT_REPORTING_SCOPE_INVALID";

export class ComputeResultModelError extends Error {
  readonly code: ComputeResultModelErrorCode;

  constructor(code: ComputeResultModelErrorCode, detail: string) {
    super(`${code}: ${detail}`);
    this.name = "ComputeResultModelError";
    this.code = code;
  }
}

function requireString(label: string, value: unknown) {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new ComputeResultModelError(
      "COMPUTE_RESULT_FIELD_REQUIRED",
      `${label} must be a non-empty string`,
    );
  }
  return value.trim().normalize("NFC");
}

function normalizeStringSet(label: string, values: readonly string[], options?: { minItems?: number }) {
  const normalized = [...new Set(values.map((value) => requireString(label, value)))].sort();
  if ((options?.minItems ?? 0) > normalized.length) {
    throw new ComputeResultModelError(
      "COMPUTE_RESULT_FIELD_REQUIRED",
      `${label} must contain at least ${options?.minItems} item(s)`,
    );
  }
  return normalized;
}

function normalizeLifecycleState(value: unknown): ComputeResultLifecycleState {
  const normalized = requireString("compute_result.lifecycle_state", value);
  if (
    normalized !== "NOT_RUN" &&
    normalized !== "RUNNING" &&
    normalized !== "COMPUTED" &&
    normalized !== "BLOCKED" &&
    normalized !== "SUPERSEDED"
  ) {
    throw new ComputeResultModelError(
      "COMPUTE_RESULT_LIFECYCLE_INVALID",
      "lifecycle_state is not allowed",
    );
  }
  return normalized;
}

function normalizeExecutionMode(value: unknown): ComputeResultExecutionMode {
  const normalized = requireString("compute_result.execution_mode", value);
  if (normalized !== "COMPLIANCE" && normalized !== "ANALYSIS") {
    throw new ComputeResultModelError(
      "COMPUTE_RESULT_ANALYSIS_POSTURE_INVALID",
      "execution_mode must be COMPLIANCE or ANALYSIS",
    );
  }
  return normalized;
}

function normalizeReportingScope(value: unknown): ComputeResultReportingScope {
  const normalized = requireString("compute_result.reporting_scope", value);
  if (
    normalized !== "year_end" &&
    normalized !== "quarterly_update" &&
    normalized !== "estimate_only"
  ) {
    throw new ComputeResultModelError(
      "COMPUTE_RESULT_REPORTING_SCOPE_INVALID",
      "reporting_scope must be a reporting token",
    );
  }
  return normalized;
}

function normalizeQuarterlyBasis(
  reportingScope: ComputeResultReportingScope,
  value: ComputeResultQuarterlyBasis | null,
) {
  if (reportingScope === "quarterly_update") {
    if (value !== "PERIODIC" && value !== "CUMULATIVE") {
      throw new ComputeResultModelError(
        "COMPUTE_RESULT_REPORTING_SCOPE_INVALID",
        "quarterly_update requires quarterly_basis_profile_or_null",
      );
    }
    return value;
  }
  if (value !== null) {
    throw new ComputeResultModelError(
      "COMPUTE_RESULT_REPORTING_SCOPE_INVALID",
      "quarterly_basis_profile_or_null must be null outside quarterly_update",
    );
  }
  return null;
}

function normalizeTotals(
  label: string,
  totals: ComputeResultTotals,
  moneyProfile: ComputeMoneyProfile,
) {
  const normalized: ComputeResultTotals = {};
  for (const key of Object.keys(totals).sort()) {
    const value = totals[key];
    const normalizedKey = requireString(`${label}.key`, key);
    if (typeof value === "string") {
      normalized[normalizedKey] = canonicalMoneyString({
        money_profile: moneyProfile,
        value,
      });
      continue;
    }
    if (value !== null && typeof value === "object" && !Array.isArray(value)) {
      const nested: Record<string, ComputeMoneyValue> = {};
      for (const nestedKey of Object.keys(value).sort()) {
        nested[requireString(`${label}.${normalizedKey}.key`, nestedKey)] = canonicalMoneyString({
          money_profile: moneyProfile,
          value: value[nestedKey]!,
        });
      }
      normalized[normalizedKey] = nested;
      continue;
    }
    throw new ComputeResultModelError(
      "COMPUTE_RESULT_MONEY_INVALID",
      "totals must contain money strings or one-level money maps",
    );
  }
  return normalized;
}

function normalizeAssumptions(assumptions: ComputeResultAssumptions) {
  const normalized: ComputeResultAssumptions = {};
  for (const key of Object.keys(assumptions).sort()) {
    const value = assumptions[key];
    const normalizedKey = requireString("compute_result.assumptions.key", key);
    if (Array.isArray(value)) {
      normalized[normalizedKey] = normalizeStringSet(
        `compute_result.assumptions.${normalizedKey}`,
        value,
      );
      continue;
    }
    if (
      typeof value === "string" ||
      typeof value === "number" ||
      typeof value === "boolean"
    ) {
      normalized[normalizedKey] = value;
      continue;
    }
    throw new ComputeResultModelError(
      "COMPUTE_RESULT_FIELD_REQUIRED",
      "assumptions values must be strings, numbers, booleans, or string arrays",
    );
  }
  return normalized;
}

export function computeResultRef(record: Pick<ComputeResultRecord, "compute_id">) {
  return `compute-result://${record.compute_id}`;
}

export function deriveComputeResultContentHash(record: Omit<ComputeResultRecord, "contract">) {
  return `compute-result-content-hash://${stableJsonHash({
    artifact_family: "COMPUTE_RESULT_CONTENT",
    payload: record,
  })}`;
}

export function buildComputeResultContract(
  input: ComputeResultContractBuildInput,
): SchemaBundleArtifactContract {
  return {
    allowed_upgrade_kinds: ["PATCH_BACKWARD", "MINOR_BACKWARD"],
    artifact_content_hash: requireString(
      "compute_result.contract.artifact_content_hash",
      input.compute_content_hash,
    ),
    artifact_id: computeResultRef({ compute_id: input.compute_id }),
    artifact_type: "ComputeResult",
    compatibility_class: "BACKWARD_COMPATIBLE",
    content_hash: ComputeResultSchemaLineage.sourceHash,
    dialect_ref: "json-schema-draft-2020-12",
    schema_bundle_hash: requireString(
      "compute_result.contract.schema_bundle_hash",
      input.schema_bundle_hash ?? "schema.bundle.hash.compute.default",
    ),
    schema_id: ComputeResultSchemaLineage.schemaId,
    semantic_version: "1.0.0",
    supersedes_schema_id: null,
    writer_build_id: requireString(
      "compute_result.contract.writer_build_id",
      input.writer_build_id ?? "build.taxat.compute.0121",
    ),
    writer_min_reader_version: "1.0.0",
  };
}

function validateContract(record: ComputeResultRecord) {
  if (record.contract.artifact_id !== computeResultRef(record)) {
    throw new ComputeResultModelError(
      "COMPUTE_RESULT_CONTRACT_INVALID",
      "contract.artifact_id must match compute result ref",
    );
  }
  if (
    record.contract.schema_id !== ComputeResultSchemaLineage.schemaId ||
    record.contract.artifact_type !== "ComputeResult"
  ) {
    throw new ComputeResultModelError(
      "COMPUTE_RESULT_CONTRACT_INVALID",
      "contract schema binding must target ComputeResult",
    );
  }
}

export function normalizeComputeResultRecord(input: ComputeResultRecord): ComputeResultRecord {
  if (input.artifact_type !== "ComputeResult") {
    throw new ComputeResultModelError(
      "COMPUTE_RESULT_ARTIFACT_TYPE_INVALID",
      "artifact_type must be ComputeResult",
    );
  }

  const executionMode = normalizeExecutionMode(input.execution_mode);
  const reportingScope = normalizeReportingScope(input.reporting_scope);
  const lifecycleState = normalizeLifecycleState(input.lifecycle_state);
  const moneyProfile = normalizeMoneyProfile(input.money_profile);
  const nonComplianceConfigRefs = normalizeStringSet(
    "compute_result.non_compliance_config_refs",
    input.non_compliance_config_refs,
  );

  if (
    executionMode === "COMPLIANCE" &&
    (input.analysis_only ||
      input.counterfactual_basis !== null ||
      nonComplianceConfigRefs.length > 0 ||
      input.adjustment_scope_source !== "EXECUTABLE_REPORTING_SCOPE")
  ) {
    throw new ComputeResultModelError(
      "COMPUTE_RESULT_ANALYSIS_POSTURE_INVALID",
      "COMPLIANCE compute results cannot carry analysis-only posture",
    );
  }
  if (executionMode === "ANALYSIS" && (!input.analysis_only || input.counterfactual_basis === null)) {
    throw new ComputeResultModelError(
      "COMPUTE_RESULT_ANALYSIS_POSTURE_INVALID",
      "ANALYSIS compute results require analysis_only and counterfactual_basis",
    );
  }
  if (
    reportingScope === "quarterly_update" &&
    input.adjustment_inclusion_policy !== "RECORD_ONLY"
  ) {
    throw new ComputeResultModelError(
      "COMPUTE_RESULT_REPORTING_SCOPE_INVALID",
      "quarterly compute must remain record-layer only",
    );
  }
  if (
    input.adjustment_inclusion_policy === "APPLY_SCOPE_FILTERED_ADJUSTMENTS" &&
    reportingScope === "quarterly_update"
  ) {
    throw new ComputeResultModelError(
      "COMPUTE_RESULT_REPORTING_SCOPE_INVALID",
      "scope-filtered adjustments cannot be applied to quarterly compute",
    );
  }

  const totals = normalizeTotals("compute_result.totals", input.totals, moneyProfile);
  const diagnosticReasonCodes = normalizeStringSet(
    "compute_result.diagnostic_reason_codes",
    input.diagnostic_reason_codes,
  );
  const diagnosticArtifactRefs = normalizeStringSet(
    "compute_result.diagnostic_artifact_refs",
    input.diagnostic_artifact_refs,
  );
  const computedAt =
    input.computed_at === null ? null : normalizeUtcInstantString(input.computed_at);

  if (lifecycleState === "NOT_RUN" || lifecycleState === "RUNNING") {
    if (
      Object.keys(totals).length > 0 ||
      diagnosticReasonCodes.length > 0 ||
      diagnosticArtifactRefs.length > 0 ||
      computedAt !== null
    ) {
      throw new ComputeResultModelError(
        "COMPUTE_RESULT_LIFECYCLE_INVALID",
        "NOT_RUN and RUNNING compute results cannot carry totals, diagnostics, or computed_at",
      );
    }
  }
  if (lifecycleState === "BLOCKED") {
    if (
      Object.keys(totals).length > 0 ||
      diagnosticReasonCodes.length === 0 ||
      diagnosticArtifactRefs.length === 0 ||
      computedAt !== null
    ) {
      throw new ComputeResultModelError(
        "COMPUTE_RESULT_LIFECYCLE_INVALID",
        "BLOCKED compute results require diagnostics, no totals, and null computed_at",
      );
    }
  }
  if (lifecycleState === "COMPUTED" || lifecycleState === "SUPERSEDED") {
    if (Object.keys(totals).length === 0 || computedAt === null) {
      throw new ComputeResultModelError(
        "COMPUTE_RESULT_LIFECYCLE_INVALID",
        "COMPUTED and SUPERSEDED compute results require totals and computed_at",
      );
    }
  }

  const normalized: ComputeResultRecord = {
    adjustment_inclusion_policy: input.adjustment_inclusion_policy,
    adjustment_scope_source: input.adjustment_scope_source,
    analysis_only: input.analysis_only,
    artifact_type: "ComputeResult",
    assumptions: normalizeAssumptions(input.assumptions),
    basis_profile_ref_or_null:
      input.basis_profile_ref_or_null === null
        ? null
        : requireString("compute_result.basis_profile_ref_or_null", input.basis_profile_ref_or_null),
    compute_id: requireString("compute_result.compute_id", input.compute_id),
    computed_at: computedAt,
    contract: structuredClone(input.contract),
    counterfactual_basis:
      input.counterfactual_basis === null
        ? null
        : requireString("compute_result.counterfactual_basis", input.counterfactual_basis),
    diagnostic_artifact_refs: diagnosticArtifactRefs,
    diagnostic_reason_codes: diagnosticReasonCodes,
    effective_partition_scope_refs: normalizeStringSet(
      "compute_result.effective_partition_scope_refs",
      input.effective_partition_scope_refs,
      { minItems: 1 },
    ),
    execution_mode: executionMode,
    lifecycle_state: lifecycleState,
    manifest_id: requireString("compute_result.manifest_id", input.manifest_id),
    money_profile: moneyProfile,
    non_compliance_config_refs: nonComplianceConfigRefs,
    quarterly_basis_profile_or_null: normalizeQuarterlyBasis(
      reportingScope,
      input.quarterly_basis_profile_or_null,
    ),
    reporting_scope: reportingScope,
    rule_version_ref: requireString("compute_result.rule_version_ref", input.rule_version_ref),
    totals,
  };

  normalizeScopeSequence("compute_result.reporting_scope_guard", [
    normalized.reporting_scope,
  ]);
  validateContract(normalized);
  return normalized;
}

export function withRefreshedComputeResultContract(input: {
  compute_result: Omit<ComputeResultRecord, "contract">;
  schema_bundle_hash?: string;
  writer_build_id?: string;
}): ComputeResultRecord {
  const contentHash = deriveComputeResultContentHash(input.compute_result);
  return normalizeComputeResultRecord({
    ...input.compute_result,
    contract: buildComputeResultContract({
      compute_content_hash: contentHash,
      compute_id: input.compute_result.compute_id,
      ...(input.schema_bundle_hash === undefined
        ? {}
        : { schema_bundle_hash: input.schema_bundle_hash }),
      ...(input.writer_build_id === undefined ? {} : { writer_build_id: input.writer_build_id }),
    }),
  });
}

export function cloneComputeResultRecord(record: ComputeResultRecord) {
  return structuredClone(record);
}
