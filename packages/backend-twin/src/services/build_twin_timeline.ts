import {
  buildTwinTimelineRecord,
  type TwinTimelineLane,
  type TwinTimelineRecord,
} from "../models/twin_timeline.ts";
import type {
  NormalizedTwinSnapshotSubject,
  TwinStateSnapshotRecord,
} from "../models/twin_state_snapshot.ts";
import { TwinViewRepository } from "../repositories/twin_view_repository.ts";

export type BuildTwinTimelineInput = {
  authority_snapshot: TwinStateSnapshotRecord;
  authority_subjects: readonly NormalizedTwinSnapshotSubject[];
  generated_at: string;
  internal_snapshot: TwinStateSnapshotRecord;
  internal_subjects: readonly NormalizedTwinSnapshotSubject[];
  repository?: TwinViewRepository;
  twin_id: string;
};

export type BuildTwinTimelineResult = {
  repository: TwinViewRepository;
  stored: Awaited<ReturnType<TwinViewRepository["persistTwinTimeline"]>>;
  timeline: TwinTimelineRecord;
};

function coverageState(snapshot: TwinStateSnapshotRecord): TwinTimelineLane["coverage_state"] {
  if (snapshot.assembly_state === "ASSEMBLED") {
    return "COMPLETE";
  }
  if (snapshot.assembly_state === "UNAVAILABLE") {
    return "UNAVAILABLE";
  }
  if (snapshot.assembly_state === "LIMITED") {
    return "LIMITED";
  }
  return "PARTIAL";
}

function laneForSnapshot(input: {
  snapshot: TwinStateSnapshotRecord;
  subjects: readonly NormalizedTwinSnapshotSubject[];
}): TwinTimelineLane {
  const coverage = coverageState(input.snapshot);
  const limits = coverage === "COMPLETE" ? [] : input.snapshot.limitation_codes.length ? input.snapshot.limitation_codes : [`${input.snapshot.lane_code}_COVERAGE_LIMITED`];
  return {
    as_of: input.snapshot.as_of,
    confidence_state: input.snapshot.confidence_state,
    coverage_state: coverage,
    event_refs: input.snapshot.component_refs.length
      ? input.snapshot.component_refs
      : input.subjects.map((subject) => subject.subject_ref),
    freshness_state: input.snapshot.freshness_state,
    interpretation_space: input.snapshot.lane_code === "AUTHORITY" ? "AUTHORITY_SPACE" : "COMPUTATION_SPACE",
    lane_code: input.snapshot.lane_code,
    limited_by: limits,
  };
}

function observedInstants(subjects: readonly NormalizedTwinSnapshotSubject[], fallback: string) {
  const values = subjects.map((subject) => subject.observed_at).filter((value): value is string => value !== null);
  return values.length > 0 ? values : [fallback];
}

export async function buildTwinTimeline(input: BuildTwinTimelineInput): Promise<BuildTwinTimelineResult> {
  const repository = input.repository ?? new TwinViewRepository();
  const internalKeys = new Set(input.internal_subjects.map((subject) => subject.comparison_key));
  const authorityKeys = new Set(input.authority_subjects.map((subject) => subject.comparison_key));
  const allKeys = new Set([...internalKeys, ...authorityKeys]);
  const alignedAnchorCount = [...allKeys].filter((key) => internalKeys.has(key) && authorityKeys.has(key)).length;
  const unpairedAnchorCount = [...allKeys].filter((key) => !internalKeys.has(key) || !authorityKeys.has(key)).length;
  const contradictoryAnchorCount =
    input.internal_snapshot.contradictory_component_refs.length +
    input.authority_snapshot.contradictory_component_refs.length;
  const denominator = Math.max(1, allKeys.size);
  const alignmentScore = Math.max(
    0,
    (alignedAnchorCount - 0.5 * unpairedAnchorCount - contradictoryAnchorCount) / denominator,
  );
  const instants = [
    ...observedInstants(input.internal_subjects, input.internal_snapshot.as_of),
    ...observedInstants(input.authority_subjects, input.authority_snapshot.as_of),
  ].sort();
  const firstEventRef = [
    ...input.internal_snapshot.component_refs,
    ...input.authority_snapshot.component_refs,
    ...input.internal_subjects.map((subject) => subject.component_ref),
    ...input.authority_subjects.map((subject) => subject.component_ref),
  ].sort()[0] ?? null;
  const timeline = buildTwinTimelineRecord({
    aligned_anchor_count: alignedAnchorCount,
    alignment_score: Number(alignmentScore.toFixed(6)),
    contradictory_anchor_count: contradictoryAnchorCount,
    lanes: [
      laneForSnapshot({ snapshot: input.internal_snapshot, subjects: input.internal_subjects }),
      laneForSnapshot({ snapshot: input.authority_snapshot, subjects: input.authority_subjects }),
    ],
    lifecycle_state:
      input.internal_snapshot.assembly_state === "STALE" || input.authority_snapshot.assembly_state === "STALE"
        ? "STALE"
        : "BUILT",
    primary_anchor_ref:
      [
        ...new Set([
          ...input.internal_subjects
            .filter((subject) => authorityKeys.has(subject.comparison_key))
            .map((subject) => subject.component_ref),
        ]),
      ].sort()[0] ?? firstEventRef,
    twin_id: input.twin_id,
    twin_timeline_id: `twin-timeline.${input.twin_id}.${input.generated_at}`,
    unpaired_anchor_count: unpairedAnchorCount,
    window_end_at: instants[instants.length - 1] ?? input.generated_at,
    window_start_at: instants[0] ?? input.generated_at,
  });
  const stored = await repository.persistTwinTimeline({ timeline });
  return {
    repository,
    stored,
    timeline,
  };
}
