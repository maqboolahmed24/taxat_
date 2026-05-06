import {
  cloneRecord,
  deriveTwinComparisonKey,
  ensureSubset,
  normalizeComparisonKeyIngredients,
  normalizeNullableString,
  normalizeNullableTimestamp,
  normalizeOrderedStringSet,
  normalizeSortedStringSet,
  normalizeTimestamp,
  requireString,
  stableEqual,
  TWIN_COMPARISON_KEY_PROFILE,
  TwinModelError,
  type TwinAuthorityTruthState,
  type TwinBaselineState,
  type TwinComparisonKeyIngredients,
  type TwinConfidenceState,
  type TwinFreshnessState,
  type TwinLaneCode,
  type TwinMaterialityClass,
  type TwinResolutionClass,
  type TwinSnapshotBaselineState,
  type TwinSubjectClass,
} from "./twin_common.ts";

export type TwinSnapshotAssemblyState =
  | "ASSEMBLED"
  | "PARTIAL"
  | "LIMITED"
  | "STALE"
  | "CONTRADICTORY"
  | "UNAVAILABLE"
  | "SUPERSEDED";
export type TwinSnapshotRole = "WORKING_STATE" | "AUTHORITY_OBSERVED";
export type TwinAmendmentPosition =
  | "NOT_APPLICABLE"
  | "PRE_BASELINE"
  | "FILED_BASELINE"
  | "AMENDED_BASELINE"
  | "AUTHORITY_CORRECTED_BASELINE";
export type TwinReplayAuthoritativeness = "LIVE" | "REPLAY" | "ANALYSIS_ONLY";
export type TwinAuthorityAdmission = "AUTHORITY_ORIGINATED" | "RECONCILIATION_PROVEN" | "INTERNAL_INFERENCE";

export type TwinStateSnapshotRecord = {
  amendment_position: TwinAmendmentPosition;
  artifact_type: "TwinStateSnapshot";
  as_of: string;
  assembly_state: TwinSnapshotAssemblyState;
  authority_truth_state: TwinAuthorityTruthState;
  baseline_ref: string | null;
  baseline_state: TwinSnapshotBaselineState;
  comparable_subject_count: number;
  comparison_basis_ref: string | null;
  comparison_key_profile_code: typeof TWIN_COMPARISON_KEY_PROFILE;
  component_refs: string[];
  confidence_state: TwinConfidenceState;
  contradictory_component_refs: string[];
  freshness_state: TwinFreshnessState;
  generated_at: string;
  lane_code: TwinLaneCode;
  limitation_codes: string[];
  non_comparable_subject_count: number;
  replay_authoritativeness: TwinReplayAuthoritativeness;
  snapshot_role: TwinSnapshotRole;
  stale_after: string | null;
  subject_count: number;
  subject_key_collision_refs: string[];
  twin_id: string;
  twin_state_snapshot_id: string;
};

export type TwinSnapshotSubject = TwinComparisonKeyIngredients & {
  authority_admission?: TwinAuthorityAdmission;
  authority_truth_state?: TwinAuthorityTruthState;
  baseline_state?: TwinBaselineState;
  component_ref?: string;
  comparison_key?: string;
  confidence_state?: TwinConfidenceState;
  contradiction_component_refs?: readonly string[];
  equivalence_reason_codes?: readonly string[];
  explanation_ref?: string | null;
  freshness_state?: TwinFreshnessState;
  limitation_codes?: readonly string[];
  materiality_class?: TwinMaterialityClass;
  mutable_value_hash?: string | null;
  observed_at?: string | null;
  parity_delta_ref?: string | null;
  resolution_class?: TwinResolutionClass;
  resolution_deadline_at?: string | null;
  semantic_equivalence_reason_codes?: readonly string[];
  status_normal_form?: string | null;
  subject_ref: string;
  timeline_posture?: "NONE" | "LAG" | "GAP";
  value_normal_form?: unknown;
};

export type NormalizedTwinSnapshotSubject = Required<TwinComparisonKeyIngredients> & {
  authority_admission: TwinAuthorityAdmission | null;
  authority_truth_state: TwinAuthorityTruthState | null;
  baseline_state: TwinBaselineState | null;
  component_ref: string;
  comparison_key: string;
  confidence_state: TwinConfidenceState;
  contradiction_component_refs: string[];
  equivalence_reason_codes: string[];
  explanation_ref: string | null;
  freshness_state: TwinFreshnessState;
  limitation_codes: string[];
  materiality_class: TwinMaterialityClass | null;
  mutable_value_hash: string | null;
  observed_at: string | null;
  parity_delta_ref: string | null;
  resolution_class: TwinResolutionClass | null;
  resolution_deadline_at: string | null;
  semantic_equivalence_reason_codes: string[];
  status_normal_form: string | null;
  subject_ref: string;
  timeline_posture: "NONE" | "LAG" | "GAP";
  value_normal_form: unknown;
};

export type TwinStateSnapshotBuildInput = Partial<
  Omit<
    TwinStateSnapshotRecord,
    | "artifact_type"
    | "comparison_key_profile_code"
    | "component_refs"
    | "comparable_subject_count"
    | "contradictory_component_refs"
    | "subject_count"
    | "subject_key_collision_refs"
    | "non_comparable_subject_count"
    | "snapshot_role"
  >
> & {
  lane_code: TwinLaneCode;
  subjects?: readonly TwinSnapshotSubject[];
  component_refs?: readonly string[];
  contradictory_component_refs?: readonly string[];
  subject_key_collision_refs?: readonly string[];
  twin_id: string;
};

export type AssembledTwinStateSnapshot = {
  snapshot: TwinStateSnapshotRecord;
  subjects: NormalizedTwinSnapshotSubject[];
};

export function twinStateSnapshotRef(snapshot: Pick<TwinStateSnapshotRecord, "twin_state_snapshot_id"> | string) {
  return `twin-state-snapshot://${typeof snapshot === "string" ? requireString("twin_state_snapshot_id", snapshot) : snapshot.twin_state_snapshot_id}`;
}

function expectedSnapshotRole(laneCode: TwinLaneCode): TwinSnapshotRole {
  return laneCode === "AUTHORITY" ? "AUTHORITY_OBSERVED" : "WORKING_STATE";
}

function normalizeTwinSnapshotSubject(subject: TwinSnapshotSubject): NormalizedTwinSnapshotSubject {
  const ingredients = normalizeComparisonKeyIngredients(subject);
  const comparisonKey = deriveTwinComparisonKey(ingredients);
  if (subject.comparison_key !== undefined && subject.comparison_key !== comparisonKey) {
    throw new TwinModelError(
      "TWIN_IDENTITY_INVALID",
      "comparison_key must equal the canonical hash derived from subject identity and scope",
    );
  }
  return {
    ...ingredients,
    authority_admission: subject.authority_admission ?? null,
    authority_truth_state: subject.authority_truth_state ?? null,
    baseline_state: subject.baseline_state ?? null,
    component_ref: requireString("subject.component_ref", subject.component_ref ?? subject.subject_ref),
    comparison_key: comparisonKey,
    confidence_state: subject.confidence_state ?? "HIGH",
    contradiction_component_refs: normalizeSortedStringSet(
      "subject.contradiction_component_refs",
      subject.contradiction_component_refs ?? [],
    ),
    equivalence_reason_codes: normalizeSortedStringSet(
      "subject.equivalence_reason_codes",
      subject.equivalence_reason_codes ?? [],
    ),
    explanation_ref: normalizeNullableString("subject.explanation_ref", subject.explanation_ref),
    freshness_state: subject.freshness_state ?? "LIVE",
    limitation_codes: normalizeSortedStringSet("subject.limitation_codes", subject.limitation_codes ?? []),
    materiality_class: subject.materiality_class ?? null,
    mutable_value_hash: normalizeNullableString("subject.mutable_value_hash", subject.mutable_value_hash),
    observed_at: normalizeNullableTimestamp("subject.observed_at", subject.observed_at),
    parity_delta_ref: normalizeNullableString("subject.parity_delta_ref", subject.parity_delta_ref),
    resolution_class: subject.resolution_class ?? null,
    resolution_deadline_at: normalizeNullableTimestamp(
      "subject.resolution_deadline_at",
      subject.resolution_deadline_at,
    ),
    semantic_equivalence_reason_codes: normalizeSortedStringSet(
      "subject.semantic_equivalence_reason_codes",
      subject.semantic_equivalence_reason_codes ?? [],
    ),
    status_normal_form: normalizeNullableString("subject.status_normal_form", subject.status_normal_form),
    subject_ref: requireString("subject.subject_ref", subject.subject_ref),
    timeline_posture: subject.timeline_posture ?? "NONE",
    value_normal_form: subject.value_normal_form ?? null,
  };
}

function semanticCollisionRefs(subjects: readonly NormalizedTwinSnapshotSubject[]) {
  const collisions = new Set<string>();
  const groups = new Map<string, NormalizedTwinSnapshotSubject[]>();
  for (const subject of subjects) {
    groups.set(subject.comparison_key, [...(groups.get(subject.comparison_key) ?? []), subject]);
  }
  for (const group of groups.values()) {
    if (group.length < 2) {
      continue;
    }
    const [first, ...rest] = group;
    const incompatible = rest.some(
      (subject) =>
        !stableEqual(
          {
            status_normal_form: first.status_normal_form,
            value_normal_form: first.value_normal_form,
          },
          {
            status_normal_form: subject.status_normal_form,
            value_normal_form: subject.value_normal_form,
          },
        ),
    );
    if (incompatible) {
      for (const subject of group) {
        collisions.add(subject.component_ref);
      }
    }
  }
  return [...collisions].sort();
}

function subjectIsNonComparable(subject: NormalizedTwinSnapshotSubject, collisionRefs: Set<string>) {
  return (
    collisionRefs.has(subject.component_ref) ||
    subject.contradiction_component_refs.length > 0 ||
    subject.freshness_state === "STALE" ||
    subject.freshness_state === "LIMITED" ||
    subject.confidence_state === "LIMITED" ||
    subject.baseline_state === "MISSING" ||
    subject.authority_truth_state === "PARTIAL_ACK" ||
    subject.authority_truth_state === "UNKNOWN" ||
    subject.authority_truth_state === "OUT_OF_BAND"
  );
}

function deriveAssemblyState(input: {
  baseline_state: TwinSnapshotBaselineState;
  explicit?: TwinSnapshotAssemblyState;
  limitation_codes: readonly string[];
  normalized_subjects: readonly NormalizedTwinSnapshotSubject[];
  subject_key_collision_refs: readonly string[];
  contradictory_component_refs: readonly string[];
  freshness_state: TwinFreshnessState;
}) {
  if (input.explicit === "SUPERSEDED") {
    return "SUPERSEDED" as const;
  }
  if (input.normalized_subjects.length === 0) {
    return "UNAVAILABLE" as const;
  }
  if (input.baseline_state === "MISSING") {
    return "LIMITED" as const;
  }
  if (input.subject_key_collision_refs.length > 0 || input.contradictory_component_refs.length > 0) {
    return "CONTRADICTORY" as const;
  }
  if (input.freshness_state === "STALE") {
    return "STALE" as const;
  }
  if (input.freshness_state === "LIMITED" || input.limitation_codes.length > 0) {
    return "LIMITED" as const;
  }
  if (
    input.normalized_subjects.some((subject) =>
      subject.authority_truth_state === "PARTIAL_ACK" ||
      subject.authority_truth_state === "OUT_OF_BAND" ||
      subject.authority_truth_state === "UNKNOWN",
    )
  ) {
    return "PARTIAL" as const;
  }
  return input.explicit === "PARTIAL" ? "PARTIAL" : "ASSEMBLED";
}

function limitationCodesForState(input: {
  assembly_state: TwinSnapshotAssemblyState;
  explicit: readonly string[];
  baseline_state: TwinSnapshotBaselineState;
  contradictory_component_refs: readonly string[];
  freshness_state: TwinFreshnessState;
  subject_key_collision_refs: readonly string[];
}) {
  const codes = new Set(input.explicit);
  if (input.assembly_state === "UNAVAILABLE") {
    codes.add("LANE_UNAVAILABLE");
  }
  if (input.assembly_state === "PARTIAL") {
    codes.add("PARTIAL_LANE_ASSEMBLY");
  }
  if (input.assembly_state === "LIMITED" || input.freshness_state === "LIMITED") {
    codes.add("LIMITED_LANE_VISIBILITY");
  }
  if (input.assembly_state === "STALE" || input.freshness_state === "STALE") {
    codes.add("STALE_LANE");
  }
  if (input.subject_key_collision_refs.length > 0) {
    codes.add("SUBJECT_KEY_COLLISION");
  }
  if (input.contradictory_component_refs.length > 0) {
    codes.add("CONTRADICTORY_COMPONENTS");
  }
  if (input.baseline_state === "MISSING") {
    codes.add("BASELINE_MISSING");
  }
  if (input.assembly_state === "ASSEMBLED") {
    return [];
  }
  return [...codes].sort();
}

export function buildTwinStateSnapshotRecord(input: TwinStateSnapshotBuildInput): AssembledTwinStateSnapshot {
  const laneCode = input.lane_code;
  const normalizedSubjects = (input.subjects ?? [])
    .map(normalizeTwinSnapshotSubject)
    .sort((left, right) => left.comparison_key.localeCompare(right.comparison_key) || left.subject_ref.localeCompare(right.subject_ref));

  if (laneCode === "AUTHORITY") {
    const invalidAuthoritySubjects = normalizedSubjects.filter(
      (subject) =>
        subject.authority_admission !== "AUTHORITY_ORIGINATED" &&
        subject.authority_admission !== "RECONCILIATION_PROVEN",
    );
    if (invalidAuthoritySubjects.length > 0) {
      throw new TwinModelError(
        "TWIN_CONTRACT_INVALID",
        "AUTHORITY snapshots may assemble only from authority-originated or reconciliation-proven artifacts",
      );
    }
  }

  const explicitComponentRefs = normalizeSortedStringSet("component_refs", input.component_refs ?? []);
  const componentRefs = normalizeSortedStringSet("component_refs", [
    ...explicitComponentRefs,
    ...normalizedSubjects.map((subject) => subject.component_ref),
  ]);
  const detectedCollisionRefs = semanticCollisionRefs(normalizedSubjects);
  const subjectKeyCollisionRefs = normalizeSortedStringSet("subject_key_collision_refs", [
    ...detectedCollisionRefs,
    ...(input.subject_key_collision_refs ?? []),
  ]);
  const contradictoryComponentRefs = normalizeSortedStringSet("contradictory_component_refs", [
    ...normalizedSubjects.flatMap((subject) => subject.contradiction_component_refs),
    ...(input.contradictory_component_refs ?? []),
  ]);
  ensureSubset("subject_key_collision_refs", subjectKeyCollisionRefs, componentRefs);
  ensureSubset("contradictory_component_refs", contradictoryComponentRefs, componentRefs);

  const baselineState = (input.baseline_state ?? "NOT_APPLICABLE") as TwinSnapshotBaselineState;
  const freshnessState = (input.freshness_state ?? "LIVE") as TwinFreshnessState;
  const confidenceState = (input.confidence_state ?? "HIGH") as TwinConfidenceState;
  const initialLimitationCodes = normalizeSortedStringSet("limitation_codes", input.limitation_codes ?? []);
  const assemblyState = deriveAssemblyState({
    baseline_state: baselineState,
    contradictory_component_refs: contradictoryComponentRefs,
    explicit: input.assembly_state,
    freshness_state: freshnessState,
    limitation_codes: initialLimitationCodes,
    normalized_subjects: normalizedSubjects,
    subject_key_collision_refs: subjectKeyCollisionRefs,
  });
  const limitationCodes = limitationCodesForState({
    assembly_state: assemblyState,
    baseline_state: baselineState,
    contradictory_component_refs: contradictoryComponentRefs,
    explicit: initialLimitationCodes,
    freshness_state: freshnessState,
    subject_key_collision_refs: subjectKeyCollisionRefs,
  });
  const collisionSet = new Set(subjectKeyCollisionRefs);
  const nonComparableSubjectCount =
    assemblyState === "UNAVAILABLE"
      ? 0
      : normalizedSubjects.filter((subject) => subjectIsNonComparable(subject, collisionSet)).length;
  const subjectCount = assemblyState === "UNAVAILABLE" ? 0 : normalizedSubjects.length;
  const comparableSubjectCount = subjectCount - nonComparableSubjectCount;
  const generatedAt = normalizeTimestamp("generated_at", input.generated_at ?? input.as_of ?? new Date(0).toISOString());
  const asOf = normalizeTimestamp("as_of", input.as_of ?? generatedAt);
  const staleAfter = normalizeNullableTimestamp("stale_after", input.stale_after);
  if (staleAfter !== null && staleAfter < asOf) {
    throw new TwinModelError("TWIN_CONTRACT_INVALID", "stale_after must not predate as_of");
  }
  const baselineRef = normalizeNullableString("baseline_ref", input.baseline_ref);
  if (["NOT_APPLICABLE", "MISSING"].includes(baselineState) && baselineRef !== null) {
    throw new TwinModelError(
      "TWIN_CONTRACT_INVALID",
      "baseline_ref must be null when baseline_state is NOT_APPLICABLE or MISSING",
    );
  }
  if (!["NOT_APPLICABLE", "MISSING"].includes(baselineState) && baselineRef === null) {
    throw new TwinModelError(
      "TWIN_CONTRACT_INVALID",
      "baseline_ref must be present when baseline_state carries a legal baseline",
    );
  }

  const comparisonBasisRef =
    assemblyState === "UNAVAILABLE"
      ? null
      : normalizeNullableString("comparison_basis_ref", input.comparison_basis_ref);
  if (assemblyState !== "UNAVAILABLE" && comparisonBasisRef === null) {
    throw new TwinModelError(
      "TWIN_CONTRACT_INVALID",
      "non-UNAVAILABLE twin snapshots must retain comparison_basis_ref",
    );
  }

  const snapshot: TwinStateSnapshotRecord = {
    amendment_position: input.amendment_position ?? "NOT_APPLICABLE",
    artifact_type: "TwinStateSnapshot",
    as_of: asOf,
    assembly_state: assemblyState,
    authority_truth_state:
      input.authority_truth_state ?? (laneCode === "AUTHORITY" ? "UNKNOWN" : "NOT_APPLICABLE"),
    baseline_ref: baselineRef,
    baseline_state: baselineState,
    comparable_subject_count: comparableSubjectCount,
    comparison_basis_ref: comparisonBasisRef,
    comparison_key_profile_code: TWIN_COMPARISON_KEY_PROFILE,
    component_refs: assemblyState === "UNAVAILABLE" ? [] : componentRefs,
    confidence_state: confidenceState,
    contradictory_component_refs: assemblyState === "UNAVAILABLE" ? [] : contradictoryComponentRefs,
    freshness_state: freshnessState,
    generated_at: generatedAt,
    lane_code: laneCode,
    limitation_codes: limitationCodes,
    non_comparable_subject_count: nonComparableSubjectCount,
    replay_authoritativeness: input.replay_authoritativeness ?? "LIVE",
    snapshot_role: expectedSnapshotRole(laneCode),
    stale_after: staleAfter,
    subject_count: subjectCount,
    subject_key_collision_refs: assemblyState === "UNAVAILABLE" ? [] : subjectKeyCollisionRefs,
    twin_id: requireString("twin_id", input.twin_id),
    twin_state_snapshot_id:
      input.twin_state_snapshot_id ??
      `twin-state-snapshot.${laneCode.toLowerCase()}.${deriveTwinComparisonKey({
        basis_type_or_null: input.comparison_basis_ref ?? laneCode,
        subject_class: "STATUS",
        subject_identity_code: `${input.twin_id}:${laneCode}:${generatedAt}`,
      })}`,
  };

  return {
    snapshot: normalizeTwinStateSnapshotRecord(snapshot),
    subjects: normalizedSubjects,
  };
}

export function normalizeTwinStateSnapshotRecord(input: TwinStateSnapshotRecord): TwinStateSnapshotRecord {
  const record: TwinStateSnapshotRecord = {
    amendment_position: input.amendment_position,
    artifact_type: "TwinStateSnapshot",
    as_of: normalizeTimestamp("as_of", input.as_of),
    assembly_state: input.assembly_state,
    authority_truth_state: input.authority_truth_state,
    baseline_ref: normalizeNullableString("baseline_ref", input.baseline_ref),
    baseline_state: input.baseline_state,
    comparable_subject_count: Number(input.comparable_subject_count),
    comparison_basis_ref: normalizeNullableString("comparison_basis_ref", input.comparison_basis_ref),
    comparison_key_profile_code: TWIN_COMPARISON_KEY_PROFILE,
    component_refs: normalizeSortedStringSet("component_refs", input.component_refs),
    confidence_state: input.confidence_state,
    contradictory_component_refs: normalizeSortedStringSet(
      "contradictory_component_refs",
      input.contradictory_component_refs,
    ),
    freshness_state: input.freshness_state,
    generated_at: normalizeTimestamp("generated_at", input.generated_at),
    lane_code: input.lane_code,
    limitation_codes: normalizeSortedStringSet("limitation_codes", input.limitation_codes),
    non_comparable_subject_count: Number(input.non_comparable_subject_count),
    replay_authoritativeness: input.replay_authoritativeness,
    snapshot_role: input.snapshot_role,
    stale_after: normalizeNullableTimestamp("stale_after", input.stale_after),
    subject_count: Number(input.subject_count),
    subject_key_collision_refs: normalizeSortedStringSet(
      "subject_key_collision_refs",
      input.subject_key_collision_refs,
    ),
    twin_id: requireString("twin_id", input.twin_id),
    twin_state_snapshot_id: requireString("twin_state_snapshot_id", input.twin_state_snapshot_id),
  };

  if (record.snapshot_role !== expectedSnapshotRole(record.lane_code)) {
    throw new TwinModelError("TWIN_CONTRACT_INVALID", "snapshot_role must match lane_code");
  }
  if (record.subject_count !== record.comparable_subject_count + record.non_comparable_subject_count) {
    throw new TwinModelError(
      "TWIN_CONTRACT_INVALID",
      "subject_count must equal comparable_subject_count + non_comparable_subject_count",
    );
  }
  if (record.comparable_subject_count > record.subject_count) {
    throw new TwinModelError("TWIN_CONTRACT_INVALID", "comparable_subject_count must not exceed subject_count");
  }
  ensureSubset("subject_key_collision_refs", record.subject_key_collision_refs, record.component_refs);
  ensureSubset("contradictory_component_refs", record.contradictory_component_refs, record.component_refs);
  if (record.assembly_state === "UNAVAILABLE") {
    if (
      record.comparison_basis_ref !== null ||
      record.component_refs.length > 0 ||
      record.subject_key_collision_refs.length > 0 ||
      record.contradictory_component_refs.length > 0 ||
      record.subject_count !== 0 ||
      record.comparable_subject_count !== 0 ||
      record.non_comparable_subject_count !== 0
    ) {
      throw new TwinModelError("TWIN_CONTRACT_INVALID", "UNAVAILABLE snapshots must clear comparison content");
    }
  } else {
    if (record.comparison_basis_ref === null || record.component_refs.length === 0) {
      throw new TwinModelError(
        "TWIN_CONTRACT_INVALID",
        "non-UNAVAILABLE snapshots must retain comparison_basis_ref and component_refs",
      );
    }
  }
  if (record.assembly_state === "ASSEMBLED") {
    if (
      record.non_comparable_subject_count !== 0 ||
      record.subject_key_collision_refs.length > 0 ||
      record.contradictory_component_refs.length > 0 ||
      record.limitation_codes.length > 0
    ) {
      throw new TwinModelError("TWIN_CONTRACT_INVALID", "ASSEMBLED snapshots must clear limitation posture");
    }
  }
  if (record.subject_key_collision_refs.length > 0 && record.assembly_state !== "CONTRADICTORY") {
    throw new TwinModelError(
      "TWIN_CONTRACT_INVALID",
      "subject_key_collision_refs must force assembly_state=CONTRADICTORY",
    );
  }
  if (
    record.assembly_state === "CONTRADICTORY" &&
    record.subject_key_collision_refs.length === 0 &&
    record.contradictory_component_refs.length === 0
  ) {
    throw new TwinModelError(
      "TWIN_CONTRACT_INVALID",
      "CONTRADICTORY snapshots must retain subject-key collision refs or contradictory component refs",
    );
  }
  if (
    ["PARTIAL", "LIMITED", "STALE", "UNAVAILABLE", "CONTRADICTORY"].includes(record.assembly_state) &&
    record.limitation_codes.length === 0
  ) {
    throw new TwinModelError("TWIN_CONTRACT_INVALID", "limited snapshot states must retain limitation_codes");
  }
  if (record.baseline_ref !== null && ["NOT_APPLICABLE", "MISSING"].includes(record.baseline_state)) {
    throw new TwinModelError(
      "TWIN_CONTRACT_INVALID",
      "baseline_ref cannot be present without a baseline-bearing baseline_state",
    );
  }
  if (record.stale_after !== null && record.stale_after < record.as_of) {
    throw new TwinModelError("TWIN_CONTRACT_INVALID", "stale_after must not predate as_of");
  }
  return record;
}

export function cloneTwinStateSnapshotRecord(record: TwinStateSnapshotRecord) {
  return cloneRecord(record);
}

export function subjectsForKey(subjects: readonly NormalizedTwinSnapshotSubject[], comparisonKey: string) {
  return subjects.filter((subject) => subject.comparison_key === comparisonKey);
}

export function firstSubjectForKey(subjects: readonly NormalizedTwinSnapshotSubject[], comparisonKey: string) {
  return normalizeOrderedStringSet(
    "subjects_for_key",
    subjectsForKey(subjects, comparisonKey).map((subject) => subject.subject_ref),
  ).length
    ? subjectsForKey(subjects, comparisonKey).sort((left, right) => left.subject_ref.localeCompare(right.subject_ref))[0]
    : null;
}

export type { TwinSubjectClass };
