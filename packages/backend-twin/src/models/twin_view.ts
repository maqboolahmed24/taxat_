import {
  type ExecutionModeBoundaryContract,
  cloneRecord,
  normalizeExecutionModeBoundaryContract,
  normalizeNullableString,
  normalizeNullableTimestamp,
  normalizeSortedStringSet,
  requireString,
  TWIN_COMPARISON_KEY_PROFILE,
  TWIN_DELTA_PRECEDENCE_PROFILE,
  TWIN_MISMATCH_SORT_PROFILE,
  TwinModelError,
} from "./twin_common.ts";

export type TwinViewLifecycleState = "NOT_BUILT" | "BUILT" | "STALE" | "SUPERSEDED";

export type TwinViewRecord = {
  artifact_type: "TwinView";
  authority_state_ref: string | null;
  built_at: string | null;
  comparison_basis_ref: string | null;
  comparison_key_profile_code: typeof TWIN_COMPARISON_KEY_PROFILE;
  cross_source_delta_refs: string[];
  delta_precedence_profile_code: typeof TWIN_DELTA_PRECEDENCE_PROFILE;
  execution_mode_boundary_contract: ExecutionModeBoundaryContract;
  internal_state_ref: string | null;
  interpretation_state_ref: string | null;
  lifecycle_state: TwinViewLifecycleState;
  manifest_id: string;
  mismatch_ranking_profile_code: typeof TWIN_MISMATCH_SORT_PROFILE;
  mismatch_summary_ref: string | null;
  parity_result_ref: string | null;
  readiness_ref: string | null;
  reconciliation_state_ref: string | null;
  stale_at: string | null;
  superseded_at: string | null;
  timeline_ref: string | null;
  twin_id: string;
};

export type TwinViewBuildInput = Partial<
  Omit<
    TwinViewRecord,
    | "artifact_type"
    | "comparison_key_profile_code"
    | "delta_precedence_profile_code"
    | "mismatch_ranking_profile_code"
    | "execution_mode_boundary_contract"
    | "cross_source_delta_refs"
  >
> & {
  cross_source_delta_refs?: readonly string[];
  execution_mode_boundary_contract: ExecutionModeBoundaryContract;
  manifest_id: string;
  twin_id: string;
};

export function twinViewRef(view: Pick<TwinViewRecord, "twin_id"> | string) {
  return `twin-view://${typeof view === "string" ? requireString("twin_id", view) : view.twin_id}`;
}

export function buildTwinViewRecord(input: TwinViewBuildInput): TwinViewRecord {
  const record: TwinViewRecord = {
    artifact_type: "TwinView",
    authority_state_ref: normalizeNullableString("authority_state_ref", input.authority_state_ref),
    built_at: normalizeNullableTimestamp("built_at", input.built_at),
    comparison_basis_ref: normalizeNullableString("comparison_basis_ref", input.comparison_basis_ref),
    comparison_key_profile_code: TWIN_COMPARISON_KEY_PROFILE,
    cross_source_delta_refs: normalizeSortedStringSet("cross_source_delta_refs", input.cross_source_delta_refs ?? []),
    delta_precedence_profile_code: TWIN_DELTA_PRECEDENCE_PROFILE,
    execution_mode_boundary_contract: normalizeExecutionModeBoundaryContract(input.execution_mode_boundary_contract),
    internal_state_ref: normalizeNullableString("internal_state_ref", input.internal_state_ref),
    interpretation_state_ref: normalizeNullableString("interpretation_state_ref", input.interpretation_state_ref),
    lifecycle_state: input.lifecycle_state ?? "BUILT",
    manifest_id: requireString("manifest_id", input.manifest_id),
    mismatch_ranking_profile_code: TWIN_MISMATCH_SORT_PROFILE,
    mismatch_summary_ref: normalizeNullableString("mismatch_summary_ref", input.mismatch_summary_ref),
    parity_result_ref: normalizeNullableString("parity_result_ref", input.parity_result_ref),
    readiness_ref: normalizeNullableString("readiness_ref", input.readiness_ref),
    reconciliation_state_ref: normalizeNullableString("reconciliation_state_ref", input.reconciliation_state_ref),
    stale_at: normalizeNullableTimestamp("stale_at", input.stale_at),
    superseded_at: normalizeNullableTimestamp("superseded_at", input.superseded_at),
    timeline_ref: normalizeNullableString("timeline_ref", input.timeline_ref),
    twin_id: requireString("twin_id", input.twin_id),
  };
  return normalizeTwinViewRecord(record);
}

export function normalizeTwinViewRecord(input: TwinViewRecord): TwinViewRecord {
  const record: TwinViewRecord = {
    ...input,
    artifact_type: "TwinView",
    authority_state_ref: normalizeNullableString("authority_state_ref", input.authority_state_ref),
    built_at: normalizeNullableTimestamp("built_at", input.built_at),
    comparison_basis_ref: normalizeNullableString("comparison_basis_ref", input.comparison_basis_ref),
    comparison_key_profile_code: TWIN_COMPARISON_KEY_PROFILE,
    cross_source_delta_refs: normalizeSortedStringSet("cross_source_delta_refs", input.cross_source_delta_refs),
    delta_precedence_profile_code: TWIN_DELTA_PRECEDENCE_PROFILE,
    execution_mode_boundary_contract: normalizeExecutionModeBoundaryContract(input.execution_mode_boundary_contract),
    internal_state_ref: normalizeNullableString("internal_state_ref", input.internal_state_ref),
    interpretation_state_ref: normalizeNullableString("interpretation_state_ref", input.interpretation_state_ref),
    manifest_id: requireString("manifest_id", input.manifest_id),
    mismatch_ranking_profile_code: TWIN_MISMATCH_SORT_PROFILE,
    mismatch_summary_ref: normalizeNullableString("mismatch_summary_ref", input.mismatch_summary_ref),
    parity_result_ref: normalizeNullableString("parity_result_ref", input.parity_result_ref),
    readiness_ref: normalizeNullableString("readiness_ref", input.readiness_ref),
    reconciliation_state_ref: normalizeNullableString("reconciliation_state_ref", input.reconciliation_state_ref),
    stale_at: normalizeNullableTimestamp("stale_at", input.stale_at),
    superseded_at: normalizeNullableTimestamp("superseded_at", input.superseded_at),
    timeline_ref: normalizeNullableString("timeline_ref", input.timeline_ref),
    twin_id: requireString("twin_id", input.twin_id),
  };
  if (record.lifecycle_state === "NOT_BUILT") {
    if (
      record.comparison_basis_ref !== null ||
      record.internal_state_ref !== null ||
      record.authority_state_ref !== null ||
      record.timeline_ref !== null ||
      record.mismatch_summary_ref !== null ||
      record.readiness_ref !== null ||
      record.reconciliation_state_ref !== null ||
      record.interpretation_state_ref !== null ||
      record.parity_result_ref !== null ||
      record.built_at !== null ||
      record.stale_at !== null ||
      record.superseded_at !== null ||
      record.cross_source_delta_refs.length > 0
    ) {
      throw new TwinModelError("TWIN_CONTRACT_INVALID", "NOT_BUILT twins must clear subordinate refs");
    }
    return record;
  }
  const requiredRefs = [
    record.comparison_basis_ref,
    record.internal_state_ref,
    record.authority_state_ref,
    record.timeline_ref,
    record.mismatch_summary_ref,
    record.readiness_ref,
    record.reconciliation_state_ref,
    record.interpretation_state_ref,
    record.parity_result_ref,
  ];
  if (requiredRefs.some((ref) => ref === null) || record.cross_source_delta_refs.length === 0 || record.built_at === null) {
    throw new TwinModelError(
      "TWIN_CONTRACT_INVALID",
      "built, stale, and superseded twins must retain subordinate refs, deltas, and built_at",
    );
  }
  const subordinateRefs = requiredRefs.filter((ref): ref is string => ref !== null && ref !== record.comparison_basis_ref && ref !== record.parity_result_ref);
  if (new Set(subordinateRefs).size !== subordinateRefs.length) {
    throw new TwinModelError("TWIN_CONTRACT_INVALID", "Twin root subordinate refs must stay distinct");
  }
  if (record.internal_state_ref === record.authority_state_ref) {
    throw new TwinModelError("TWIN_CONTRACT_INVALID", "internal_state_ref and authority_state_ref must be distinct");
  }
  if (record.lifecycle_state === "BUILT") {
    if (record.stale_at !== null || record.superseded_at !== null) {
      throw new TwinModelError("TWIN_CONTRACT_INVALID", "BUILT twins must clear stale_at and superseded_at");
    }
  }
  if (record.lifecycle_state === "STALE") {
    if (record.stale_at === null || record.superseded_at !== null) {
      throw new TwinModelError("TWIN_CONTRACT_INVALID", "STALE twins require stale_at and clear superseded_at");
    }
  }
  if (record.lifecycle_state === "SUPERSEDED" && record.superseded_at === null) {
    throw new TwinModelError("TWIN_CONTRACT_INVALID", "SUPERSEDED twins require superseded_at");
  }
  if (record.stale_at !== null && record.built_at !== null && record.stale_at < record.built_at) {
    throw new TwinModelError("TWIN_CONTRACT_INVALID", "stale_at must not predate built_at");
  }
  if (record.superseded_at !== null && record.built_at !== null && record.superseded_at < record.built_at) {
    throw new TwinModelError("TWIN_CONTRACT_INVALID", "superseded_at must not predate built_at");
  }
  return record;
}

export function cloneTwinViewRecord(record: TwinViewRecord) {
  return cloneRecord(record);
}
