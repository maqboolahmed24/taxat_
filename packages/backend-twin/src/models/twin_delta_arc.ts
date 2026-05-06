import {
  cloneRecord,
  deriveTwinComparisonKey,
  ensureSubset,
  normalizeComparisonKeyIngredients,
  normalizeNullableString,
  normalizeNullableTimestamp,
  normalizeSortedStringSet,
  normalizeTimestamp,
  requireString,
  stableEqual,
  TWIN_COMPARISON_KEY_PROFILE,
  type TwinBaselineState,
  type TwinComparisonKeyIngredients,
  type TwinConfidenceState,
  type TwinFreshnessState,
  type TwinMaterialityClass,
  TwinModelError,
  type TwinResolutionClass,
  type TwinSubjectClass,
} from "./twin_common.ts";

export type TwinDeltaClass =
  | "MATCH_EXACT"
  | "MATCH_EQUIVALENT"
  | "VALUE_MISMATCH"
  | "TOTAL_MISMATCH"
  | "STATUS_MISMATCH"
  | "BASIS_MISMATCH"
  | "TIMELINE_LAG"
  | "TIMELINE_GAP"
  | "INTERNAL_ONLY"
  | "AUTHORITY_ONLY"
  | "ACK_PENDING"
  | "ACK_PARTIAL"
  | "ACK_CONTRADICTORY"
  | "REJECTED_OR_REVERSED"
  | "OUT_OF_BAND"
  | "BASELINE_MISSING"
  | "STALE_COMPARISON"
  | "LIMITED_VISIBILITY"
  | "REPLAY_NON_AUTHORITATIVE";

export type TwinComparabilityState =
  | "COMPARABLE"
  | "WAITING_ON_AUTHORITY"
  | "PARTIALLY_COMPARABLE"
  | "NON_COMPARABLE"
  | "OUT_OF_BAND"
  | "CONTRADICTORY";
export type TwinComparabilityReasonCode =
  | "NONE"
  | "BASELINE_MISSING"
  | "STALE_COMPARISON"
  | "LIMITED_VISIBILITY"
  | "REPLAY_NON_AUTHORITATIVE"
  | "ACK_PENDING"
  | "ACK_PARTIAL"
  | "ACK_CONTRADICTORY"
  | "OUT_OF_BAND"
  | "CONTRADICTION_COMPONENTS";

export type TwinDeltaArcRecord = Required<TwinComparisonKeyIngredients> & {
  artifact_type: "TwinDeltaArc";
  baseline_state: TwinBaselineState;
  blocking_reason_codes: string[];
  comparability_reason_code: TwinComparabilityReasonCode;
  comparability_state: TwinComparabilityState;
  comparison_key: string;
  comparison_key_profile_code: typeof TWIN_COMPARISON_KEY_PROFILE;
  confidence_state: TwinConfidenceState;
  contradiction_component_refs: string[];
  delta_arc_id: string;
  delta_class: TwinDeltaClass;
  delta_precedence_rank: number;
  equivalence_reason_codes: string[];
  explanation_ref: string | null;
  freshness_state: TwinFreshnessState;
  last_compared_at: string;
  left_lane_code: "INTERNAL_COMPUTED";
  left_observed_at: string | null;
  left_subject_refs: string[];
  limitation_codes: string[];
  materiality_class: TwinMaterialityClass;
  parity_delta_ref: string | null;
  priority_rank: number;
  resolution_class: TwinResolutionClass;
  resolution_deadline_at: string | null;
  right_lane_code: "AUTHORITY";
  right_observed_at: string | null;
  right_subject_refs: string[];
  subject_ref: string;
  timeline_ref: string;
  twin_id: string;
};

export type TwinDeltaArcBuildInput = Partial<
  Omit<
    TwinDeltaArcRecord,
    | "artifact_type"
    | "comparison_key_profile_code"
    | "delta_precedence_rank"
    | "comparability_state"
    | "comparability_reason_code"
    | "left_lane_code"
    | "right_lane_code"
    | "priority_rank"
  >
> &
  TwinComparisonKeyIngredients & {
    delta_class: TwinDeltaClass;
    last_compared_at: string;
    timeline_ref: string;
    twin_id: string;
  };

export const TWIN_MATCH_DELTA_CLASSES = new Set<TwinDeltaClass>(["MATCH_EXACT", "MATCH_EQUIVALENT"]);

export const TWIN_DELTA_PRECEDENCE_BY_CLASS: Record<TwinDeltaClass, number> = {
  ACK_CONTRADICTORY: 6,
  ACK_PARTIAL: 6,
  ACK_PENDING: 6,
  AUTHORITY_ONLY: 5,
  BASELINE_MISSING: 1,
  BASIS_MISMATCH: 9,
  INTERNAL_ONLY: 5,
  LIMITED_VISIBILITY: 3,
  MATCH_EQUIVALENT: 10,
  MATCH_EXACT: 11,
  OUT_OF_BAND: 7,
  REJECTED_OR_REVERSED: 6,
  REPLAY_NON_AUTHORITATIVE: 4,
  STALE_COMPARISON: 2,
  STATUS_MISMATCH: 9,
  TIMELINE_GAP: 8,
  TIMELINE_LAG: 8,
  TOTAL_MISMATCH: 9,
  VALUE_MISMATCH: 9,
};

const CONTRADICTION_CAPABLE_CLASSES = new Set<TwinDeltaClass>([
  "ACK_CONTRADICTORY",
  "STATUS_MISMATCH",
  "BASIS_MISMATCH",
  "TOTAL_MISMATCH",
  "VALUE_MISMATCH",
  "REJECTED_OR_REVERSED",
  "OUT_OF_BAND",
]);

export function twinDeltaArcRef(delta: Pick<TwinDeltaArcRecord, "delta_arc_id"> | string) {
  return `twin-delta-arc://${typeof delta === "string" ? requireString("delta_arc_id", delta) : delta.delta_arc_id}`;
}

export function deriveTwinDeltaComparability(input: {
  contradiction_component_refs?: readonly string[];
  delta_class: TwinDeltaClass;
}): {
  comparability_reason_code: TwinComparabilityReasonCode;
  comparability_state: TwinComparabilityState;
} {
  if (input.delta_class === "ACK_PENDING") {
    return { comparability_reason_code: "ACK_PENDING", comparability_state: "WAITING_ON_AUTHORITY" };
  }
  if (input.delta_class === "ACK_PARTIAL") {
    return { comparability_reason_code: "ACK_PARTIAL", comparability_state: "PARTIALLY_COMPARABLE" };
  }
  if (
    input.delta_class === "BASELINE_MISSING" ||
    input.delta_class === "STALE_COMPARISON" ||
    input.delta_class === "LIMITED_VISIBILITY" ||
    input.delta_class === "REPLAY_NON_AUTHORITATIVE"
  ) {
    return { comparability_reason_code: input.delta_class, comparability_state: "NON_COMPARABLE" };
  }
  if (input.delta_class === "OUT_OF_BAND") {
    return { comparability_reason_code: "OUT_OF_BAND", comparability_state: "OUT_OF_BAND" };
  }
  if (input.delta_class === "ACK_CONTRADICTORY") {
    return { comparability_reason_code: "ACK_CONTRADICTORY", comparability_state: "CONTRADICTORY" };
  }
  if ((input.contradiction_component_refs ?? []).length > 0) {
    return {
      comparability_reason_code: "CONTRADICTION_COMPONENTS",
      comparability_state: "CONTRADICTORY",
    };
  }
  return { comparability_reason_code: "NONE", comparability_state: "COMPARABLE" };
}

export function defaultDeltaMateriality(deltaClass: TwinDeltaClass): TwinMaterialityClass {
  switch (deltaClass) {
    case "MATCH_EXACT":
    case "MATCH_EQUIVALENT":
      return "NONE";
    case "ACK_PENDING":
    case "REPLAY_NON_AUTHORITATIVE":
    case "TIMELINE_LAG":
      return "INFORMATIONAL";
    case "BASIS_MISMATCH":
    case "INTERNAL_ONLY":
    case "LIMITED_VISIBILITY":
    case "STALE_COMPARISON":
    case "TIMELINE_GAP":
    case "VALUE_MISMATCH":
      return "REVIEW";
    case "ACK_PARTIAL":
    case "AUTHORITY_ONLY":
    case "STATUS_MISMATCH":
    case "TOTAL_MISMATCH":
      return "MATERIAL";
    case "ACK_CONTRADICTORY":
    case "BASELINE_MISSING":
    case "OUT_OF_BAND":
    case "REJECTED_OR_REVERSED":
      return "BLOCKING";
  }
}

export function defaultDeltaResolution(deltaClass: TwinDeltaClass): TwinResolutionClass {
  switch (deltaClass) {
    case "MATCH_EXACT":
    case "MATCH_EQUIVALENT":
      return "NONE";
    case "ACK_PENDING":
    case "TIMELINE_LAG":
      return "WAIT_FOR_AUTHORITY";
    case "BASELINE_MISSING":
    case "LIMITED_VISIBILITY":
    case "TIMELINE_GAP":
    case "VALUE_MISMATCH":
      return "OPEN_REVIEW";
    case "REPLAY_NON_AUTHORITATIVE":
    case "STALE_COMPARISON":
      return "REFRESH_TWIN";
    case "ACK_PARTIAL":
    case "ACK_CONTRADICTORY":
    case "AUTHORITY_ONLY":
    case "BASIS_MISMATCH":
    case "OUT_OF_BAND":
    case "STATUS_MISMATCH":
      return "RUN_RECONCILIATION";
    case "INTERNAL_ONLY":
    case "REJECTED_OR_REVERSED":
    case "TOTAL_MISMATCH":
      return "PREPARE_AMENDMENT";
  }
}

export function deriveTwinDeltaPriorityRank(input: {
  delta_class: TwinDeltaClass;
  freshness_state: TwinFreshnessState;
  confidence_state: TwinConfidenceState;
  materiality_class: TwinMaterialityClass;
  resolution_class: TwinResolutionClass;
  subject_class: TwinSubjectClass;
}) {
  if (TWIN_MATCH_DELTA_CLASSES.has(input.delta_class)) {
    return 0;
  }
  const materialityWeight: Record<TwinMaterialityClass, number> = {
    BLOCKING: 4,
    INFORMATIONAL: 1,
    MATERIAL: 3,
    NONE: 0,
    REVIEW: 2,
  };
  const resolutionWeight: Record<TwinResolutionClass, number> = {
    NONE: 0,
    OPEN_REVIEW: 2,
    PREPARE_AMENDMENT: 4,
    REFRESH_TWIN: 1,
    RUN_RECONCILIATION: 3,
    WAIT_FOR_AUTHORITY: 1,
  };
  const subjectWeight: Record<TwinSubjectClass, number> = {
    ACKNOWLEDGEMENT: 3,
    DECLARED_BASIS: 3,
    FACT: 1,
    FILING: 3,
    OBLIGATION: 2,
    STATUS: 2,
    TOTAL: 2,
  };
  const authorityEscalation = new Set<TwinDeltaClass>([
    "STATUS_MISMATCH",
    "ACK_PARTIAL",
    "ACK_CONTRADICTORY",
    "REJECTED_OR_REVERSED",
    "OUT_OF_BAND",
    "AUTHORITY_ONLY",
  ]).has(input.delta_class)
    ? 1
    : 0;
  const freshnessEscalation = input.freshness_state === "STALE" || input.freshness_state === "LIMITED" ? 1 : 0;
  const confidenceEscalation = input.confidence_state === "LOW" || input.confidence_state === "LIMITED" ? 1 : 0;
  return (
    100 * materialityWeight[input.materiality_class] +
    15 * resolutionWeight[input.resolution_class] +
    10 * subjectWeight[input.subject_class] +
    5 * authorityEscalation +
    2 * freshnessEscalation +
    confidenceEscalation
  );
}

function defaultBlockingReasons(deltaClass: TwinDeltaClass, explicit: readonly string[]) {
  const reasons = new Set(explicit);
  if (deltaClass === "BASELINE_MISSING") {
    reasons.add("BASELINE_MISSING");
  }
  if (deltaClass === "ACK_CONTRADICTORY") {
    reasons.add("AUTHORITY_ACK_CONTRADICTORY");
  }
  if (deltaClass === "REJECTED_OR_REVERSED") {
    reasons.add("AUTHORITY_REJECTED_OR_REVERSED");
  }
  if (deltaClass === "OUT_OF_BAND") {
    reasons.add("AUTHORITY_OUT_OF_BAND");
  }
  return [...reasons].sort();
}

function defaultExplanationRef(input: Pick<TwinDeltaArcBuildInput, "delta_class" | "comparison_key" | "twin_id">) {
  if (TWIN_MATCH_DELTA_CLASSES.has(input.delta_class)) {
    return null;
  }
  return `explanation://twin/${input.twin_id}/${encodeURIComponent(input.comparison_key ?? "unkeyed")}`;
}

export function buildTwinDeltaArcRecord(input: TwinDeltaArcBuildInput): TwinDeltaArcRecord {
  const ingredients = normalizeComparisonKeyIngredients(input);
  const comparisonKey = deriveTwinComparisonKey(ingredients);
  if (input.comparison_key !== undefined && input.comparison_key !== comparisonKey) {
    throw new TwinModelError(
      "TWIN_IDENTITY_INVALID",
      "comparison_key must equal the canonical twin comparison-key hash",
    );
  }
  const contradictionComponentRefs = normalizeSortedStringSet(
    "contradiction_component_refs",
    input.contradiction_component_refs ?? [],
  );
  const comparability = deriveTwinDeltaComparability({
    contradiction_component_refs: contradictionComponentRefs,
    delta_class: input.delta_class,
  });
  const materialityClass = input.materiality_class ?? defaultDeltaMateriality(input.delta_class);
  const resolutionClass = input.resolution_class ?? defaultDeltaResolution(input.delta_class);
  const freshnessState = input.freshness_state ?? "LIVE";
  const confidenceState = input.confidence_state ?? "HIGH";
  const leftSubjectRefs = normalizeSortedStringSet("left_subject_refs", input.left_subject_refs ?? []);
  const rightSubjectRefs = normalizeSortedStringSet("right_subject_refs", input.right_subject_refs ?? []);
  const blockingReasonCodes = defaultBlockingReasons(
    input.delta_class,
    normalizeSortedStringSet("blocking_reason_codes", input.blocking_reason_codes ?? []),
  );
  const equivalenceReasonCodes = normalizeSortedStringSet(
    "equivalence_reason_codes",
    input.equivalence_reason_codes ?? [],
  );
  const record: TwinDeltaArcRecord = {
    ...ingredients,
    artifact_type: "TwinDeltaArc",
    baseline_state: input.baseline_state ?? "NOT_APPLICABLE",
    blocking_reason_codes: blockingReasonCodes,
    comparability_reason_code: comparability.comparability_reason_code,
    comparability_state: comparability.comparability_state,
    comparison_key: comparisonKey,
    comparison_key_profile_code: TWIN_COMPARISON_KEY_PROFILE,
    confidence_state: confidenceState,
    contradiction_component_refs: contradictionComponentRefs,
    delta_arc_id:
      input.delta_arc_id ??
      `twin-delta-arc.${deriveTwinComparisonKey({
        ...ingredients,
        subject_identity_code: `${input.twin_id}:${comparisonKey}:${input.delta_class}`,
      })}`,
    delta_class: input.delta_class,
    delta_precedence_rank: TWIN_DELTA_PRECEDENCE_BY_CLASS[input.delta_class],
    equivalence_reason_codes: equivalenceReasonCodes,
    explanation_ref: normalizeNullableString(
      "explanation_ref",
      input.explanation_ref ?? defaultExplanationRef({ ...input, comparison_key: comparisonKey }),
    ),
    freshness_state: freshnessState,
    last_compared_at: normalizeTimestamp("last_compared_at", input.last_compared_at),
    left_lane_code: "INTERNAL_COMPUTED",
    left_observed_at: normalizeNullableTimestamp("left_observed_at", input.left_observed_at),
    left_subject_refs: leftSubjectRefs,
    limitation_codes: normalizeSortedStringSet("limitation_codes", input.limitation_codes ?? []),
    materiality_class: materialityClass,
    parity_delta_ref: normalizeNullableString("parity_delta_ref", input.parity_delta_ref),
    priority_rank: deriveTwinDeltaPriorityRank({
      confidence_state: confidenceState,
      delta_class: input.delta_class,
      freshness_state: freshnessState,
      materiality_class: materialityClass,
      resolution_class: resolutionClass,
      subject_class: ingredients.subject_class,
    }),
    resolution_class: resolutionClass,
    resolution_deadline_at: normalizeNullableTimestamp(
      "resolution_deadline_at",
      input.resolution_deadline_at,
    ),
    right_lane_code: "AUTHORITY",
    right_observed_at: normalizeNullableTimestamp("right_observed_at", input.right_observed_at),
    right_subject_refs: rightSubjectRefs,
    subject_ref: requireString(
      "subject_ref",
      input.subject_ref ?? leftSubjectRefs[0] ?? rightSubjectRefs[0] ?? comparisonKey,
    ),
    timeline_ref: requireString("timeline_ref", input.timeline_ref),
    twin_id: requireString("twin_id", input.twin_id),
  };
  return normalizeTwinDeltaArcRecord(record);
}

export function normalizeTwinDeltaArcRecord(input: TwinDeltaArcRecord): TwinDeltaArcRecord {
  const ingredients = normalizeComparisonKeyIngredients(input);
  const comparisonKey = deriveTwinComparisonKey(ingredients);
  if (input.comparison_key !== comparisonKey) {
    throw new TwinModelError("TWIN_IDENTITY_INVALID", "comparison_key must be canonical");
  }
  const contradictionComponentRefs = normalizeSortedStringSet(
    "contradiction_component_refs",
    input.contradiction_component_refs,
  );
  const comparability = deriveTwinDeltaComparability({
    contradiction_component_refs: contradictionComponentRefs,
    delta_class: input.delta_class,
  });
  const leftSubjectRefs = normalizeSortedStringSet("left_subject_refs", input.left_subject_refs);
  const rightSubjectRefs = normalizeSortedStringSet("right_subject_refs", input.right_subject_refs);
  const materialityClass = input.materiality_class;
  const resolutionClass = input.resolution_class;
  const record: TwinDeltaArcRecord = {
    ...input,
    ...ingredients,
    artifact_type: "TwinDeltaArc",
    blocking_reason_codes: normalizeSortedStringSet("blocking_reason_codes", input.blocking_reason_codes),
    comparability_reason_code: comparability.comparability_reason_code,
    comparability_state: comparability.comparability_state,
    comparison_key: comparisonKey,
    comparison_key_profile_code: TWIN_COMPARISON_KEY_PROFILE,
    contradiction_component_refs: contradictionComponentRefs,
    delta_precedence_rank: TWIN_DELTA_PRECEDENCE_BY_CLASS[input.delta_class],
    equivalence_reason_codes: normalizeSortedStringSet("equivalence_reason_codes", input.equivalence_reason_codes),
    explanation_ref: normalizeNullableString("explanation_ref", input.explanation_ref),
    last_compared_at: normalizeTimestamp("last_compared_at", input.last_compared_at),
    left_lane_code: "INTERNAL_COMPUTED",
    left_observed_at: normalizeNullableTimestamp("left_observed_at", input.left_observed_at),
    left_subject_refs: leftSubjectRefs,
    limitation_codes: normalizeSortedStringSet("limitation_codes", input.limitation_codes),
    parity_delta_ref: normalizeNullableString("parity_delta_ref", input.parity_delta_ref),
    priority_rank: deriveTwinDeltaPriorityRank({
      confidence_state: input.confidence_state,
      delta_class: input.delta_class,
      freshness_state: input.freshness_state,
      materiality_class: materialityClass,
      resolution_class: resolutionClass,
      subject_class: input.subject_class,
    }),
    resolution_deadline_at: normalizeNullableTimestamp(
      "resolution_deadline_at",
      input.resolution_deadline_at,
    ),
    right_lane_code: "AUTHORITY",
    right_observed_at: normalizeNullableTimestamp("right_observed_at", input.right_observed_at),
    right_subject_refs: rightSubjectRefs,
  };

  if (TWIN_MATCH_DELTA_CLASSES.has(record.delta_class)) {
    if (record.materiality_class !== "NONE" || record.resolution_class !== "NONE" || record.priority_rank !== 0) {
      throw new TwinModelError("TWIN_CONTRACT_INVALID", "match deltas must clear actionability posture");
    }
    if (record.explanation_ref !== null || record.blocking_reason_codes.length > 0 || record.limitation_codes.length > 0) {
      throw new TwinModelError("TWIN_CONTRACT_INVALID", "match deltas must clear explanation, blocking, and limitation refs");
    }
  } else {
    if (record.priority_rank < 1 || record.explanation_ref === null || record.resolution_class === "NONE") {
      throw new TwinModelError(
        "TWIN_CONTRACT_INVALID",
        "non-match deltas must carry priority_rank, explanation_ref, and actionable resolution",
      );
    }
  }
  if (record.delta_class === "INTERNAL_ONLY") {
    if (record.left_subject_refs.length === 0 || record.right_subject_refs.length > 0) {
      throw new TwinModelError("TWIN_CONTRACT_INVALID", "INTERNAL_ONLY must retain only left_subject_refs");
    }
  } else if (record.delta_class === "AUTHORITY_ONLY") {
    if (record.left_subject_refs.length > 0 || record.right_subject_refs.length === 0) {
      throw new TwinModelError("TWIN_CONTRACT_INVALID", "AUTHORITY_ONLY must retain only right_subject_refs");
    }
  } else if (record.left_subject_refs.length === 0 || record.right_subject_refs.length === 0) {
    throw new TwinModelError("TWIN_CONTRACT_INVALID", "non-one-sided delta arcs must retain both lane subject refs");
  }
  if (record.delta_class === "MATCH_EXACT" && record.equivalence_reason_codes.length > 0) {
    throw new TwinModelError("TWIN_CONTRACT_INVALID", "MATCH_EXACT must clear equivalence_reason_codes");
  }
  if (record.delta_class === "MATCH_EQUIVALENT" && record.equivalence_reason_codes.length === 0) {
    throw new TwinModelError("TWIN_CONTRACT_INVALID", "MATCH_EQUIVALENT must retain equivalence_reason_codes");
  }
  ensureSubset(
    "contradiction_component_refs",
    record.contradiction_component_refs,
    [...record.left_subject_refs, ...record.right_subject_refs],
  );
  if (
    record.contradiction_component_refs.length > 0 &&
    !CONTRADICTION_CAPABLE_CLASSES.has(record.delta_class)
  ) {
    throw new TwinModelError(
      "TWIN_CONTRACT_INVALID",
      "only contradiction-capable delta classes may retain contradiction_component_refs",
    );
  }
  if (record.materiality_class === "BLOCKING" && record.blocking_reason_codes.length === 0) {
    throw new TwinModelError("TWIN_CONTRACT_INVALID", "blocking delta arcs must carry blocking_reason_codes");
  }
  if (!stableEqual(record.priority_rank, input.priority_rank)) {
    throw new TwinModelError("TWIN_CONTRACT_INVALID", "priority_rank must equal the frozen twin ranking formula");
  }
  return record;
}

export function sortTwinDeltaArcsByRank(deltas: readonly TwinDeltaArcRecord[]) {
  return [...deltas].sort(
    (left, right) =>
      right.priority_rank - left.priority_rank ||
      right.last_compared_at.localeCompare(left.last_compared_at) ||
      left.comparison_key.localeCompare(right.comparison_key),
  );
}

export function cloneTwinDeltaArcRecord(record: TwinDeltaArcRecord) {
  return cloneRecord(record);
}
