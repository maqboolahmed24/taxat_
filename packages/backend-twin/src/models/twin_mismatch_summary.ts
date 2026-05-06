import {
  cloneRecord,
  normalizeOrderedStringSet,
  normalizeSortedStringSet,
  normalizeTimestamp,
  requireString,
  TWIN_MISMATCH_SORT_PROFILE,
  TwinModelError,
  type TwinMaterialityClass,
} from "./twin_common.ts";
import {
  sortTwinDeltaArcsByRank,
  twinDeltaArcRef,
  type TwinComparabilityReasonCode,
  type TwinComparabilityState,
  type TwinDeltaArcRecord,
} from "./twin_delta_arc.ts";

export type TwinRankedMismatch = {
  comparison_key: string;
  comparability_reason_code: TwinComparabilityReasonCode;
  comparability_state: TwinComparabilityState;
  delta_arc_ref: string;
  last_compared_at: string;
  materiality_class: Exclude<TwinMaterialityClass, "NONE">;
  priority_rank: number;
};

export type TwinMismatchSummaryRecord = {
  artifact_type: "TwinMismatchSummary";
  blocking_count: number;
  comparable_mismatch_count: number;
  contradictory_count: number;
  generated_at: string;
  highest_materiality_class: TwinMaterialityClass;
  highest_priority_rank: number;
  informational_count: number;
  limited_count: number;
  matched_count: number;
  material_count: number;
  mismatch_count: number;
  mismatch_summary_id: string;
  non_comparable_count: number;
  out_of_band_count: number;
  partial_ack_count: number;
  ranking_profile_code: typeof TWIN_MISMATCH_SORT_PROFILE;
  review_count: number;
  stale_count: number;
  suppressed_match_count: number;
  top_mismatch_refs: string[];
  top_ranked_mismatches: TwinRankedMismatch[];
  total_subject_count: number;
  twin_id: string;
  waiting_count: number;
};

export type TwinMismatchSummaryBuildInput = Partial<
  Omit<
    TwinMismatchSummaryRecord,
    | "artifact_type"
    | "ranking_profile_code"
    | "total_subject_count"
    | "matched_count"
    | "mismatch_count"
    | "comparable_mismatch_count"
    | "waiting_count"
    | "partial_ack_count"
    | "non_comparable_count"
    | "contradictory_count"
    | "blocking_count"
    | "material_count"
    | "review_count"
    | "informational_count"
    | "limited_count"
    | "stale_count"
    | "out_of_band_count"
    | "highest_priority_rank"
    | "highest_materiality_class"
    | "top_mismatch_refs"
    | "top_ranked_mismatches"
    | "suppressed_match_count"
  >
> & {
  deltas: readonly TwinDeltaArcRecord[];
  generated_at: string;
  top_limit?: number;
  twin_id: string;
};

export function twinMismatchSummaryRef(summary: Pick<TwinMismatchSummaryRecord, "mismatch_summary_id"> | string) {
  return `twin-mismatch-summary://${typeof summary === "string" ? requireString("mismatch_summary_id", summary) : summary.mismatch_summary_id}`;
}

function isMatch(delta: TwinDeltaArcRecord) {
  return delta.delta_class === "MATCH_EXACT" || delta.delta_class === "MATCH_EQUIVALENT";
}

function highestMaterialityClass(input: {
  blocking_count: number;
  informational_count: number;
  material_count: number;
  review_count: number;
}): TwinMaterialityClass {
  if (input.blocking_count > 0) {
    return "BLOCKING";
  }
  if (input.material_count > 0) {
    return "MATERIAL";
  }
  if (input.review_count > 0) {
    return "REVIEW";
  }
  if (input.informational_count > 0) {
    return "INFORMATIONAL";
  }
  return "NONE";
}

function partitionCount(deltas: readonly TwinDeltaArcRecord[], state: TwinComparabilityState) {
  return deltas.filter((delta) => delta.comparability_state === state).length;
}

export function buildTwinMismatchSummaryRecord(input: TwinMismatchSummaryBuildInput): TwinMismatchSummaryRecord {
  const topLimit = input.top_limit ?? 10;
  const deltas = sortTwinDeltaArcsByRank(input.deltas);
  const matches = deltas.filter(isMatch);
  const mismatches = deltas.filter((delta) => !isMatch(delta));
  const rankedMismatches = mismatches.slice(0, topLimit).map((delta) => ({
    comparison_key: delta.comparison_key,
    comparability_reason_code: delta.comparability_reason_code,
    comparability_state: delta.comparability_state,
    delta_arc_ref: twinDeltaArcRef(delta),
    last_compared_at: delta.last_compared_at,
    materiality_class: delta.materiality_class as Exclude<TwinMaterialityClass, "NONE">,
    priority_rank: delta.priority_rank,
  }));
  const blockingCount = mismatches.filter((delta) => delta.materiality_class === "BLOCKING").length;
  const materialCount = mismatches.filter((delta) => delta.materiality_class === "MATERIAL").length;
  const reviewCount = mismatches.filter((delta) => delta.materiality_class === "REVIEW").length;
  const informationalCount = mismatches.filter((delta) => delta.materiality_class === "INFORMATIONAL").length;
  const record: TwinMismatchSummaryRecord = {
    artifact_type: "TwinMismatchSummary",
    blocking_count: blockingCount,
    comparable_mismatch_count: partitionCount(mismatches, "COMPARABLE"),
    contradictory_count: partitionCount(mismatches, "CONTRADICTORY"),
    generated_at: normalizeTimestamp("generated_at", input.generated_at),
    highest_materiality_class: highestMaterialityClass({
      blocking_count: blockingCount,
      informational_count: informationalCount,
      material_count: materialCount,
      review_count: reviewCount,
    }),
    highest_priority_rank: rankedMismatches[0]?.priority_rank ?? 0,
    informational_count: informationalCount,
    limited_count: mismatches.filter(
      (delta) =>
        delta.delta_class === "LIMITED_VISIBILITY" ||
        delta.freshness_state === "LIMITED" ||
        delta.confidence_state === "LIMITED" ||
        delta.limitation_codes.length > 0,
    ).length,
    matched_count: matches.length,
    material_count: materialCount,
    mismatch_count: mismatches.length,
    mismatch_summary_id:
      input.mismatch_summary_id ??
      `twin-mismatch-summary.${input.twin_id}.${normalizeTimestamp("generated_at", input.generated_at)}`,
    non_comparable_count: partitionCount(mismatches, "NON_COMPARABLE"),
    out_of_band_count: partitionCount(mismatches, "OUT_OF_BAND"),
    partial_ack_count: partitionCount(mismatches, "PARTIALLY_COMPARABLE"),
    ranking_profile_code: TWIN_MISMATCH_SORT_PROFILE,
    review_count: reviewCount,
    stale_count: mismatches.filter(
      (delta) => delta.delta_class === "STALE_COMPARISON" || delta.freshness_state === "STALE",
    ).length,
    suppressed_match_count: matches.length,
    top_mismatch_refs: rankedMismatches.map((entry) => entry.delta_arc_ref),
    top_ranked_mismatches: rankedMismatches,
    total_subject_count: deltas.length,
    twin_id: requireString("twin_id", input.twin_id),
    waiting_count: partitionCount(mismatches, "WAITING_ON_AUTHORITY"),
  };
  return normalizeTwinMismatchSummaryRecord(record);
}

export function normalizeTwinMismatchSummaryRecord(input: TwinMismatchSummaryRecord): TwinMismatchSummaryRecord {
  const topRankedMismatches = [...input.top_ranked_mismatches].map((entry) => ({
    comparison_key: requireString("top_ranked_mismatches.comparison_key", entry.comparison_key),
    comparability_reason_code: entry.comparability_reason_code,
    comparability_state: entry.comparability_state,
    delta_arc_ref: requireString("top_ranked_mismatches.delta_arc_ref", entry.delta_arc_ref),
    last_compared_at: normalizeTimestamp("top_ranked_mismatches.last_compared_at", entry.last_compared_at),
    materiality_class: entry.materiality_class,
    priority_rank: Number(entry.priority_rank),
  }));
  const record: TwinMismatchSummaryRecord = {
    ...input,
    artifact_type: "TwinMismatchSummary",
    generated_at: normalizeTimestamp("generated_at", input.generated_at),
    mismatch_summary_id: requireString("mismatch_summary_id", input.mismatch_summary_id),
    ranking_profile_code: TWIN_MISMATCH_SORT_PROFILE,
    top_mismatch_refs: normalizeOrderedStringSet("top_mismatch_refs", input.top_mismatch_refs),
    top_ranked_mismatches: topRankedMismatches,
    twin_id: requireString("twin_id", input.twin_id),
  };
  if (record.matched_count + record.mismatch_count !== record.total_subject_count) {
    throw new TwinModelError("TWIN_CONTRACT_INVALID", "total_subject_count must equal matched_count + mismatch_count");
  }
  const partitionSum =
    record.comparable_mismatch_count +
    record.waiting_count +
    record.partial_ack_count +
    record.non_comparable_count +
    record.contradictory_count +
    record.out_of_band_count;
  if (partitionSum !== record.mismatch_count) {
    throw new TwinModelError("TWIN_CONTRACT_INVALID", "mismatch partition counts must equal mismatch_count");
  }
  const classSum = record.blocking_count + record.material_count + record.review_count + record.informational_count;
  if (classSum !== record.mismatch_count) {
    throw new TwinModelError("TWIN_CONTRACT_INVALID", "materiality bucket counts must equal mismatch_count");
  }
  if (record.suppressed_match_count > record.matched_count) {
    throw new TwinModelError("TWIN_CONTRACT_INVALID", "suppressed_match_count must not exceed matched_count");
  }
  const expectedTopRefs = record.top_ranked_mismatches.map((entry) => entry.delta_arc_ref);
  if (record.top_mismatch_refs.join("\n") !== expectedTopRefs.join("\n")) {
    throw new TwinModelError(
      "TWIN_CONTRACT_INVALID",
      "top_mismatch_refs must mirror top_ranked_mismatches delta refs",
    );
  }
  const expectedOrder = [...record.top_ranked_mismatches].sort(
    (left, right) =>
      right.priority_rank - left.priority_rank ||
      right.last_compared_at.localeCompare(left.last_compared_at) ||
      left.comparison_key.localeCompare(right.comparison_key),
  );
  if (JSON.stringify(record.top_ranked_mismatches) !== JSON.stringify(expectedOrder)) {
    throw new TwinModelError(
      "TWIN_CONTRACT_INVALID",
      "top_ranked_mismatches must be ordered by priority_rank desc, last_compared_at desc, comparison_key asc",
    );
  }
  if (record.mismatch_count === 0) {
    if (
      record.highest_priority_rank !== 0 ||
      record.highest_materiality_class !== "NONE" ||
      record.top_mismatch_refs.length > 0 ||
      record.top_ranked_mismatches.length > 0
    ) {
      throw new TwinModelError("TWIN_CONTRACT_INVALID", "zero-mismatch summaries must clear top mismatch posture");
    }
  } else {
    if (record.top_ranked_mismatches.length === 0 || record.highest_priority_rank < 1) {
      throw new TwinModelError("TWIN_CONTRACT_INVALID", "non-zero mismatch summaries require ranked top mismatches");
    }
    const first = record.top_ranked_mismatches[0];
    if (
      record.highest_priority_rank !== first.priority_rank ||
      record.highest_materiality_class !== first.materiality_class
    ) {
      throw new TwinModelError(
        "TWIN_CONTRACT_INVALID",
        "highest priority/materiality must mirror first ranked mismatch",
      );
    }
  }
  return record;
}

export function cloneTwinMismatchSummaryRecord(record: TwinMismatchSummaryRecord) {
  return cloneRecord(record);
}
