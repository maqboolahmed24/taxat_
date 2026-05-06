import {
  normalizeStringSet,
  requireTrimmedString,
} from "../../../backend-access/src/services/principal_context_normalizer.ts";
import { NONE_SENTINEL, stableJsonHash, sortSetLikeStrings } from "../../../domain-kernel/src/primitives/hash.ts";
import { normalizeUtcInstantString } from "../../../domain-kernel/src/primitives/time.ts";

export const TWIN_COMPARISON_KEY_PROFILE = "TWIN_KEY_V1_SHA256" as const;
export const TWIN_DELTA_PRECEDENCE_PROFILE = "TWIN_DELTA_PRECEDENCE_V1" as const;
export const TWIN_MISMATCH_SORT_PROFILE = "TWIN_MISMATCH_SORT_V1" as const;
export const TWIN_COMPARISON_KEY_PREFIX = "twin:" as const;

export type TwinLaneCode = "INTERNAL_COMPUTED" | "AUTHORITY";
export type TwinFreshnessState = "LIVE" | "RECENT" | "STALE" | "LIMITED";
export type TwinConfidenceState = "HIGH" | "MEDIUM" | "LOW" | "LIMITED";
export type TwinBaselineState = "NOT_APPLICABLE" | "PROVED" | "PARTIAL" | "MISSING" | "STALE";
export type TwinSnapshotBaselineState = TwinBaselineState | "SUPERSEDED";
export type TwinAuthorityTruthState =
  | "NOT_APPLICABLE"
  | "NOT_REQUESTED"
  | "UNKNOWN"
  | "PENDING_ACK"
  | "PARTIAL_ACK"
  | "CONFIRMED"
  | "REJECTED"
  | "OUT_OF_BAND";
export type TwinSubjectClass =
  | "FACT"
  | "TOTAL"
  | "FILING"
  | "ACKNOWLEDGEMENT"
  | "STATUS"
  | "OBLIGATION"
  | "DECLARED_BASIS";
export type TwinMaterialityClass = "NONE" | "INFORMATIONAL" | "REVIEW" | "MATERIAL" | "BLOCKING";
export type TwinResolutionClass =
  | "NONE"
  | "REFRESH_TWIN"
  | "WAIT_FOR_AUTHORITY"
  | "RUN_RECONCILIATION"
  | "OPEN_REVIEW"
  | "PREPARE_AMENDMENT";

export type ExecutionModeBoundaryContract = {
  analysis_only: boolean;
  boundary_hash: string;
  contract_version: "EXECUTION_MODE_BOUNDARY_V1";
  counterfactual_basis: string | null;
  disclosure_reason_codes: string[];
  execution_mode: "COMPLIANCE" | "ANALYSIS";
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

export type TwinComparisonKeyIngredients = {
  authority_scope_ref_or_null?: string | null;
  basis_type_or_null?: string | null;
  business_partition_ref_or_null?: string | null;
  lineage_anchor_ref_or_null?: string | null;
  period_ref_or_null?: string | null;
  reporting_scope_ref_or_null?: string | null;
  subject_class: TwinSubjectClass;
  subject_identity_code: string;
};

export class TwinModelError extends Error {
  readonly code:
    | "TWIN_CONTRACT_INVALID"
    | "TWIN_FIELD_INVALID"
    | "TWIN_FIELD_REQUIRED"
    | "TWIN_IDENTITY_INVALID"
    | "TWIN_REPOSITORY_INVALID";

  constructor(code: TwinModelError["code"], detail: string) {
    super(`${code}: ${detail}`);
    this.name = "TwinModelError";
    this.code = code;
  }
}

export function requireString(label: string, value: unknown) {
  try {
    return requireTrimmedString(label, value);
  } catch (error) {
    throw new TwinModelError(
      "TWIN_FIELD_REQUIRED",
      error instanceof Error ? error.message : `${label} must be a non-empty string`,
    );
  }
}

export function normalizeNullableString(label: string, value: unknown): string | null {
  if (value == null) {
    return null;
  }
  return requireString(label, value);
}

export function normalizeTimestamp(label: string, value: unknown) {
  try {
    return normalizeUtcInstantString(value);
  } catch (error) {
    throw new TwinModelError(
      "TWIN_FIELD_INVALID",
      `${label} must be an ISO-8601 instant with timezone: ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
  }
}

export function normalizeNullableTimestamp(label: string, value: unknown) {
  if (value == null) {
    return null;
  }
  return normalizeTimestamp(label, value);
}

export function normalizeSortedStringSet(
  label: string,
  values: readonly string[] | null | undefined,
  options: { minItems?: number; maxItems?: number } = {},
) {
  let normalized: string[];
  try {
    normalized = normalizeStringSet(
      label,
      values ?? [],
      options.minItems === undefined ? undefined : { minItems: options.minItems },
    );
  } catch (error) {
    throw new TwinModelError(
      "TWIN_FIELD_INVALID",
      error instanceof Error ? error.message : `${label} must be a sorted string set`,
    );
  }
  if (options.maxItems !== undefined && normalized.length > options.maxItems) {
    throw new TwinModelError(
      "TWIN_FIELD_INVALID",
      `${label} must contain at most ${options.maxItems} item(s)`,
    );
  }
  return normalized;
}

export function normalizeOrderedStringSet(
  label: string,
  values: readonly string[] | null | undefined,
  options: { minItems?: number; maxItems?: number } = {},
) {
  const seen = new Set<string>();
  const normalized = (values ?? []).map((value) => requireString(label, value)).filter((value) => {
    if (seen.has(value)) {
      throw new TwinModelError("TWIN_FIELD_INVALID", `${label} must not contain duplicates`);
    }
    seen.add(value);
    return true;
  });
  if (normalized.length < (options.minItems ?? 0)) {
    throw new TwinModelError(
      "TWIN_FIELD_INVALID",
      `${label} must contain at least ${options.minItems} item(s)`,
    );
  }
  if (options.maxItems !== undefined && normalized.length > options.maxItems) {
    throw new TwinModelError(
      "TWIN_FIELD_INVALID",
      `${label} must contain at most ${options.maxItems} item(s)`,
    );
  }
  return normalized;
}

export function assertNonNegativeInteger(label: string, value: unknown) {
  if (!Number.isInteger(value) || Number(value) < 0) {
    throw new TwinModelError("TWIN_FIELD_INVALID", `${label} must be a non-negative integer`);
  }
  return Number(value);
}

export function assertNumberFromZeroToOne(label: string, value: unknown) {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0 || value > 1) {
    throw new TwinModelError("TWIN_FIELD_INVALID", `${label} must be a number from 0 to 1`);
  }
  return value;
}

export function assertEnum<T extends string>(label: string, value: unknown, allowed: readonly T[]) {
  if (typeof value !== "string" || !allowed.includes(value as T)) {
    throw new TwinModelError(
      "TWIN_FIELD_INVALID",
      `${label} must be one of ${allowed.join(", ")}`,
    );
  }
  return value as T;
}

export function normalizeOptionalIdentityValue(value: unknown) {
  return typeof value === "string" && value.length > 0 ? value : NONE_SENTINEL;
}

export function normalizeComparisonKeyIngredients(
  input: TwinComparisonKeyIngredients,
): Required<TwinComparisonKeyIngredients> {
  return {
    authority_scope_ref_or_null: normalizeNullableString(
      "authority_scope_ref_or_null",
      input.authority_scope_ref_or_null,
    ),
    basis_type_or_null: normalizeNullableString("basis_type_or_null", input.basis_type_or_null),
    business_partition_ref_or_null: normalizeNullableString(
      "business_partition_ref_or_null",
      input.business_partition_ref_or_null,
    ),
    lineage_anchor_ref_or_null: normalizeNullableString(
      "lineage_anchor_ref_or_null",
      input.lineage_anchor_ref_or_null,
    ),
    period_ref_or_null: normalizeNullableString("period_ref_or_null", input.period_ref_or_null),
    reporting_scope_ref_or_null: normalizeNullableString(
      "reporting_scope_ref_or_null",
      input.reporting_scope_ref_or_null,
    ),
    subject_class: assertEnum("subject_class", input.subject_class, [
      "FACT",
      "TOTAL",
      "FILING",
      "ACKNOWLEDGEMENT",
      "STATUS",
      "OBLIGATION",
      "DECLARED_BASIS",
    ] as const),
    subject_identity_code: requireString("subject_identity_code", input.subject_identity_code),
  };
}

export function deriveTwinComparisonKey(input: TwinComparisonKeyIngredients) {
  const normalized = normalizeComparisonKeyIngredients(input);
  return `${TWIN_COMPARISON_KEY_PREFIX}${stableJsonHash([
    TWIN_COMPARISON_KEY_PROFILE,
    normalized.subject_class,
    normalizeOptionalIdentityValue(normalized.reporting_scope_ref_or_null),
    normalizeOptionalIdentityValue(normalized.authority_scope_ref_or_null),
    normalizeOptionalIdentityValue(normalized.business_partition_ref_or_null),
    normalizeOptionalIdentityValue(normalized.period_ref_or_null),
    normalizeOptionalIdentityValue(normalized.basis_type_or_null),
    normalized.subject_identity_code,
    normalizeOptionalIdentityValue(normalized.lineage_anchor_ref_or_null),
  ])}`;
}

export function ensureSubset(label: string, values: readonly string[], allowed: readonly string[]) {
  const allowedSet = new Set(allowed);
  const missing = values.filter((value) => !allowedSet.has(value));
  if (missing.length > 0) {
    throw new TwinModelError(
      "TWIN_CONTRACT_INVALID",
      `${label} must stay within the persisted ref set; missing ${missing.join(", ")}`,
    );
  }
}

export function normalizeExecutionModeBoundaryContract(
  input: ExecutionModeBoundaryContract,
): ExecutionModeBoundaryContract {
  const contract: ExecutionModeBoundaryContract = {
    analysis_only: Boolean(input.analysis_only),
    boundary_hash: requireString("execution_mode_boundary_contract.boundary_hash", input.boundary_hash),
    contract_version: "EXECUTION_MODE_BOUNDARY_V1",
    counterfactual_basis: normalizeNullableString(
      "execution_mode_boundary_contract.counterfactual_basis",
      input.counterfactual_basis,
    ),
    disclosure_reason_codes: normalizeSortedStringSet(
      "execution_mode_boundary_contract.disclosure_reason_codes",
      input.disclosure_reason_codes,
    ),
    execution_mode: assertEnum("execution_mode_boundary_contract.execution_mode", input.execution_mode, [
      "COMPLIANCE",
      "ANALYSIS",
    ] as const),
    execution_posture: assertEnum(
      "execution_mode_boundary_contract.execution_posture",
      input.execution_posture,
      ["LIVE_COMPLIANCE", "LIVE_ANALYSIS", "REPLAY_COMPLIANCE", "REPLAY_COUNTERFACTUAL"] as const,
    ),
    legal_effect_boundary: assertEnum(
      "execution_mode_boundary_contract.legal_effect_boundary",
      input.legal_effect_boundary,
      [
        "COMPLIANCE_CAPABLE",
        "MODELED_READ_ONLY",
        "HISTORICAL_REPLAY_READ_ONLY",
        "COUNTERFACTUAL_REPLAY_READ_ONLY",
      ] as const,
    ),
    non_compliance_config_refs: normalizeSortedStringSet(
      "execution_mode_boundary_contract.non_compliance_config_refs",
      input.non_compliance_config_refs,
    ),
    replay_class_or_null: input.replay_class_or_null == null
      ? null
      : assertEnum("execution_mode_boundary_contract.replay_class_or_null", input.replay_class_or_null, [
          "STANDARD_REPLAY",
          "AUDIT_REPLAY",
          "COUNTERFACTUAL_ANALYSIS",
        ] as const),
    run_kind: assertEnum("execution_mode_boundary_contract.run_kind", input.run_kind, [
      "INTERACTIVE",
      "NIGHTLY",
      "BACKFILL",
      "REPLAY",
      "REMEDIATION",
      "AMENDMENT",
      "MIGRATION",
    ] as const),
  };

  if (contract.execution_mode === "COMPLIANCE") {
    if (contract.analysis_only || contract.counterfactual_basis !== null || contract.non_compliance_config_refs.length > 0) {
      throw new TwinModelError(
        "TWIN_CONTRACT_INVALID",
        "COMPLIANCE execution boundary must clear analysis-only, counterfactual basis, and non-compliance refs",
      );
    }
  }
  if (contract.execution_mode === "ANALYSIS" && (!contract.analysis_only || contract.counterfactual_basis === null)) {
    throw new TwinModelError(
      "TWIN_CONTRACT_INVALID",
      "ANALYSIS execution boundary must carry analysis_only=true and counterfactual_basis",
    );
  }
  if (contract.legal_effect_boundary === "COMPLIANCE_CAPABLE") {
    if (contract.execution_posture !== "LIVE_COMPLIANCE" || contract.disclosure_reason_codes.length > 0) {
      throw new TwinModelError(
        "TWIN_CONTRACT_INVALID",
        "COMPLIANCE_CAPABLE boundary must be LIVE_COMPLIANCE and clear disclosure reason codes",
      );
    }
  }
  return contract;
}

export function compareInstantsNullable(left: string | null, right: string | null) {
  if (left === right) {
    return 0;
  }
  if (left === null) {
    return -1;
  }
  if (right === null) {
    return 1;
  }
  return left.localeCompare(right);
}

export function cloneRecord<T>(record: T): T {
  return structuredClone(record);
}

export function stableEqual(left: unknown, right: unknown) {
  return stableJsonHash(left) === stableJsonHash(right);
}

export function refFromId(prefix: string, id: string) {
  return `${prefix}://${requireString(`${prefix}_id`, id)}`;
}

export function sortedStableRefs(values: readonly string[]) {
  return sortSetLikeStrings([...new Set(values)]);
}
