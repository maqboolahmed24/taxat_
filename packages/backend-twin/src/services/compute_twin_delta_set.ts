import {
  buildTwinDeltaArcRecord,
  sortTwinDeltaArcsByRank,
  type TwinDeltaArcRecord,
  type TwinDeltaClass,
} from "../models/twin_delta_arc.ts";
import {
  TwinModelError,
  stableEqual,
  type TwinBaselineState,
  type TwinMaterialityClass,
  type TwinResolutionClass,
} from "../models/twin_common.ts";
import {
  subjectsForKey,
  type NormalizedTwinSnapshotSubject,
  type TwinStateSnapshotRecord,
} from "../models/twin_state_snapshot.ts";
import { twinTimelineRef, type TwinTimelineRecord } from "../models/twin_timeline.ts";
import { TwinDeltaArcRepository } from "../repositories/twin_delta_arc_repository.ts";

export type ComputeTwinDeltaSetInput = {
  authority_snapshot: TwinStateSnapshotRecord;
  authority_subjects: readonly NormalizedTwinSnapshotSubject[];
  compared_at: string;
  internal_snapshot: TwinStateSnapshotRecord;
  internal_subjects: readonly NormalizedTwinSnapshotSubject[];
  repository?: TwinDeltaArcRepository;
  timeline: TwinTimelineRecord;
};

export type ComputeTwinDeltaSetResult = {
  deltas: TwinDeltaArcRecord[];
  repository: TwinDeltaArcRepository;
  stored: Awaited<ReturnType<TwinDeltaArcRepository["persistTwinDeltaSet"]>>;
};

function firstSorted(subjects: readonly NormalizedTwinSnapshotSubject[]) {
  return [...subjects].sort((left, right) => left.subject_ref.localeCompare(right.subject_ref))[0] ?? null;
}

function combinedBaselineState(
  left: NormalizedTwinSnapshotSubject | null,
  right: NormalizedTwinSnapshotSubject | null,
  internalSnapshot: TwinStateSnapshotRecord,
  authoritySnapshot: TwinStateSnapshotRecord,
): TwinBaselineState {
  const states = [
    left?.baseline_state,
    right?.baseline_state,
    internalSnapshot.baseline_state === "SUPERSEDED" ? "STALE" : internalSnapshot.baseline_state,
    authoritySnapshot.baseline_state === "SUPERSEDED" ? "STALE" : authoritySnapshot.baseline_state,
  ].filter((state): state is TwinBaselineState => state != null);
  if (states.includes("MISSING")) {
    return "MISSING";
  }
  if (states.includes("STALE")) {
    return "STALE";
  }
  if (states.includes("PARTIAL")) {
    return "PARTIAL";
  }
  if (states.includes("PROVED")) {
    return "PROVED";
  }
  return "NOT_APPLICABLE";
}

function mostLimitedFreshness(
  left: NormalizedTwinSnapshotSubject | null,
  right: NormalizedTwinSnapshotSubject | null,
  internalSnapshot: TwinStateSnapshotRecord,
  authoritySnapshot: TwinStateSnapshotRecord,
) {
  const values = [left?.freshness_state, right?.freshness_state, internalSnapshot.freshness_state, authoritySnapshot.freshness_state];
  if (values.includes("STALE")) {
    return "STALE" as const;
  }
  if (values.includes("LIMITED")) {
    return "LIMITED" as const;
  }
  if (values.includes("RECENT")) {
    return "RECENT" as const;
  }
  return "LIVE" as const;
}

function lowestConfidence(left: NormalizedTwinSnapshotSubject | null, right: NormalizedTwinSnapshotSubject | null) {
  const values = [left?.confidence_state, right?.confidence_state].filter(Boolean);
  if (values.includes("LIMITED")) {
    return "LIMITED" as const;
  }
  if (values.includes("LOW")) {
    return "LOW" as const;
  }
  if (values.includes("MEDIUM")) {
    return "MEDIUM" as const;
  }
  return "HIGH" as const;
}

function valuesEquivalent(left: NormalizedTwinSnapshotSubject, right: NormalizedTwinSnapshotSubject) {
  return (
    left.semantic_equivalence_reason_codes.length > 0 ||
    right.semantic_equivalence_reason_codes.length > 0 ||
    left.equivalence_reason_codes.length > 0 ||
    right.equivalence_reason_codes.length > 0
  );
}

function valuesExact(left: NormalizedTwinSnapshotSubject, right: NormalizedTwinSnapshotSubject) {
  return stableEqual(
    {
      status_normal_form: left.status_normal_form,
      value_normal_form: left.value_normal_form,
    },
    {
      status_normal_form: right.status_normal_form,
      value_normal_form: right.value_normal_form,
    },
  );
}

function mismatchClassForSubject(subjectClass: NormalizedTwinSnapshotSubject["subject_class"]): TwinDeltaClass {
  switch (subjectClass) {
    case "TOTAL":
      return "TOTAL_MISMATCH";
    case "STATUS":
      return "STATUS_MISMATCH";
    case "DECLARED_BASIS":
      return "BASIS_MISMATCH";
    case "ACKNOWLEDGEMENT":
      return "ACK_CONTRADICTORY";
    default:
      return "VALUE_MISMATCH";
  }
}

function classifyDelta(input: {
  authority_snapshot: TwinStateSnapshotRecord;
  key: string;
  left: NormalizedTwinSnapshotSubject | null;
  right: NormalizedTwinSnapshotSubject | null;
  internal_snapshot: TwinStateSnapshotRecord;
}): {
  delta_class: TwinDeltaClass;
  materiality_class?: TwinMaterialityClass;
  resolution_class?: TwinResolutionClass;
} {
  const baselineState = combinedBaselineState(input.left, input.right, input.internal_snapshot, input.authority_snapshot);
  if (baselineState === "MISSING") {
    return { delta_class: "BASELINE_MISSING" };
  }
  const freshnessState = mostLimitedFreshness(input.left, input.right, input.internal_snapshot, input.authority_snapshot);
  if (freshnessState === "STALE") {
    return { delta_class: "STALE_COMPARISON" };
  }
  const limitationPresent =
    input.internal_snapshot.assembly_state === "LIMITED" ||
    input.authority_snapshot.assembly_state === "LIMITED" ||
    (input.left?.limitation_codes.length ?? 0) > 0 ||
    (input.right?.limitation_codes.length ?? 0) > 0;
  if (limitationPresent) {
    return { delta_class: "LIMITED_VISIBILITY" };
  }
  if (
    input.internal_snapshot.replay_authoritativeness !== "LIVE" ||
    input.authority_snapshot.replay_authoritativeness !== "LIVE"
  ) {
    return { delta_class: "REPLAY_NON_AUTHORITATIVE" };
  }
  if (input.left !== null && input.right === null) {
    return { delta_class: "INTERNAL_ONLY" };
  }
  if (input.left === null && input.right !== null) {
    return { delta_class: "AUTHORITY_ONLY" };
  }
  if (input.left === null || input.right === null) {
    throw new TwinModelError("TWIN_CONTRACT_INVALID", `comparison key ${input.key} has no lane subjects`);
  }
  const contradictionRefs = [
    ...input.left.contradiction_component_refs,
    ...input.right.contradiction_component_refs,
    ...input.authority_snapshot.contradictory_component_refs,
  ];
  if (
    input.right.subject_class === "ACKNOWLEDGEMENT" ||
    ["PENDING_ACK", "PARTIAL_ACK", "REJECTED"].includes(input.authority_snapshot.authority_truth_state)
  ) {
    if (input.authority_snapshot.authority_truth_state === "PENDING_ACK" || input.right.authority_truth_state === "PENDING_ACK") {
      return { delta_class: "ACK_PENDING" };
    }
    if (input.authority_snapshot.authority_truth_state === "PARTIAL_ACK" || input.right.authority_truth_state === "PARTIAL_ACK") {
      return { delta_class: "ACK_PARTIAL" };
    }
    if (input.authority_snapshot.authority_truth_state === "REJECTED" || input.right.authority_truth_state === "REJECTED") {
      return { delta_class: "REJECTED_OR_REVERSED" };
    }
  }
  if (input.authority_snapshot.authority_truth_state === "OUT_OF_BAND" || input.right.authority_truth_state === "OUT_OF_BAND") {
    return { delta_class: "OUT_OF_BAND" };
  }
  if (input.left.timeline_posture === "LAG" || input.right.timeline_posture === "LAG") {
    return { delta_class: "TIMELINE_LAG" };
  }
  if (input.left.timeline_posture === "GAP" || input.right.timeline_posture === "GAP") {
    return { delta_class: "TIMELINE_GAP" };
  }
  if (contradictionRefs.length > 0 || !valuesExact(input.left, input.right)) {
    return {
      delta_class: mismatchClassForSubject(input.left.subject_class),
      materiality_class: contradictionRefs.length > 0 ? "BLOCKING" : undefined,
      resolution_class: contradictionRefs.length > 0 ? "RUN_RECONCILIATION" : undefined,
    };
  }
  if (valuesEquivalent(input.left, input.right)) {
    return { delta_class: "MATCH_EQUIVALENT" };
  }
  return { delta_class: "MATCH_EXACT" };
}

function subjectRefs(subjects: readonly NormalizedTwinSnapshotSubject[]) {
  return subjects.map((subject) => subject.subject_ref).sort();
}

export async function computeTwinDeltaSet(input: ComputeTwinDeltaSetInput): Promise<ComputeTwinDeltaSetResult> {
  const repository = input.repository ?? new TwinDeltaArcRepository();
  const timelineRef = twinTimelineRef(input.timeline);
  const keys = [
    ...new Set([
      ...input.internal_subjects.map((subject) => subject.comparison_key),
      ...input.authority_subjects.map((subject) => subject.comparison_key),
    ]),
  ].sort();
  if (keys.length === 0) {
    throw new TwinModelError("TWIN_CONTRACT_INVALID", "twin delta set requires at least one comparison subject");
  }

  const deltas = keys.map((key) => {
    const leftSubjects = subjectsForKey(input.internal_subjects, key);
    const rightSubjects = subjectsForKey(input.authority_subjects, key);
    const left = firstSorted(leftSubjects);
    const right = firstSorted(rightSubjects);
    const representative = left ?? right;
    if (!representative) {
      throw new TwinModelError("TWIN_CONTRACT_INVALID", `comparison key ${key} has no representative subject`);
    }
    const classification = classifyDelta({
      authority_snapshot: input.authority_snapshot,
      internal_snapshot: input.internal_snapshot,
      key,
      left,
      right,
    });
    const contradictionComponentRefs = [
      ...new Set([
        ...(left?.contradiction_component_refs ?? []),
        ...(right?.contradiction_component_refs ?? []),
        ...input.authority_snapshot.contradictory_component_refs,
        ...input.internal_snapshot.contradictory_component_refs,
      ]),
    ].filter((ref) => [...subjectRefs(leftSubjects), ...subjectRefs(rightSubjects)].includes(ref)).sort();
    return buildTwinDeltaArcRecord({
      ...representative,
      baseline_state: combinedBaselineState(left, right, input.internal_snapshot, input.authority_snapshot),
      blocking_reason_codes:
        classification.delta_class === "BASELINE_MISSING"
          ? ["BASELINE_MISSING"]
          : contradictionComponentRefs.length > 0
            ? ["CONTRADICTION_COMPONENTS"]
            : undefined,
      confidence_state: lowestConfidence(left, right),
      contradiction_component_refs: contradictionComponentRefs,
      delta_class: classification.delta_class,
      equivalence_reason_codes: [
        ...(left?.equivalence_reason_codes ?? []),
        ...(right?.equivalence_reason_codes ?? []),
        ...(left?.semantic_equivalence_reason_codes ?? []),
        ...(right?.semantic_equivalence_reason_codes ?? []),
      ],
      explanation_ref: left?.explanation_ref ?? right?.explanation_ref ?? undefined,
      freshness_state: mostLimitedFreshness(left, right, input.internal_snapshot, input.authority_snapshot),
      last_compared_at: input.compared_at,
      left_observed_at: left?.observed_at ?? null,
      left_subject_refs: subjectRefs(leftSubjects),
      limitation_codes: [
        ...new Set([
          ...(left?.limitation_codes ?? []),
          ...(right?.limitation_codes ?? []),
          ...input.internal_snapshot.limitation_codes,
          ...input.authority_snapshot.limitation_codes,
        ]),
      ].sort(),
      materiality_class: classification.materiality_class,
      parity_delta_ref: left?.parity_delta_ref ?? right?.parity_delta_ref ?? null,
      resolution_class: classification.resolution_class,
      resolution_deadline_at: left?.resolution_deadline_at ?? right?.resolution_deadline_at ?? null,
      right_observed_at: right?.observed_at ?? null,
      right_subject_refs: subjectRefs(rightSubjects),
      subject_ref: representative.subject_ref,
      timeline_ref: timelineRef,
      twin_id: input.internal_snapshot.twin_id,
    });
  });

  const sorted = sortTwinDeltaArcsByRank(deltas);
  const stored = await repository.persistTwinDeltaSet({ deltas: sorted });
  return {
    deltas: sorted,
    repository,
    stored,
  };
}
