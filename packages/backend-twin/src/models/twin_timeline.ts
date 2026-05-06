import {
  assertNumberFromZeroToOne,
  cloneRecord,
  normalizeNullableTimestamp,
  normalizeSortedStringSet,
  requireString,
  TwinModelError,
  type TwinConfidenceState,
  type TwinFreshnessState,
  type TwinLaneCode,
} from "./twin_common.ts";

export type TwinTimelineLifecycleState = "BUILT" | "STALE" | "SUPERSEDED";
export type TwinTemporalAlignmentState = "LOCKED" | "DRIFTING" | "DIVERGED";
export type TwinTimelineLaneCoverageState = "COMPLETE" | "PARTIAL" | "LIMITED" | "UNAVAILABLE";
export type TwinTimelineInterpretationSpace = "SOURCE_SPACE" | "COMPUTATION_SPACE" | "AUTHORITY_SPACE";

export type TwinTimelineLane = {
  as_of: string;
  confidence_state: TwinConfidenceState;
  coverage_state: TwinTimelineLaneCoverageState;
  event_refs: string[];
  freshness_state: TwinFreshnessState;
  interpretation_space: TwinTimelineInterpretationSpace;
  lane_code: TwinLaneCode;
  limited_by: string[];
};

export type TwinTimelineRecord = {
  aligned_anchor_count: number;
  alignment_reason_codes: string[];
  alignment_score: number;
  artifact_type: "TwinTimeline";
  contradictory_anchor_count: number;
  lanes: [TwinTimelineLane, TwinTimelineLane];
  lifecycle_state: TwinTimelineLifecycleState;
  primary_anchor_ref: string | null;
  temporal_alignment_state: TwinTemporalAlignmentState;
  twin_id: string;
  twin_timeline_id: string;
  unpaired_anchor_count: number;
  window_end_at: string | null;
  window_start_at: string | null;
};

export type TwinTimelineBuildInput = Partial<
  Omit<TwinTimelineRecord, "artifact_type" | "lanes" | "alignment_reason_codes">
> & {
  alignment_reason_codes?: readonly string[];
  lanes: readonly TwinTimelineLane[];
  twin_id: string;
};

export function twinTimelineRef(timeline: Pick<TwinTimelineRecord, "twin_timeline_id"> | string) {
  return `twin-timeline://${typeof timeline === "string" ? requireString("twin_timeline_id", timeline) : timeline.twin_timeline_id}`;
}

function normalizeLane(input: TwinTimelineLane): TwinTimelineLane {
  const lane: TwinTimelineLane = {
    as_of: normalizeNullableTimestamp("lane.as_of", input.as_of) ?? "",
    confidence_state: input.confidence_state,
    coverage_state: input.coverage_state,
    event_refs: normalizeSortedStringSet("lane.event_refs", input.event_refs),
    freshness_state: input.freshness_state,
    interpretation_space: input.interpretation_space,
    lane_code: input.lane_code,
    limited_by: normalizeSortedStringSet("lane.limited_by", input.limited_by),
  };
  if (lane.as_of === "") {
    throw new TwinModelError("TWIN_FIELD_REQUIRED", "timeline lane as_of is required");
  }
  if (lane.lane_code === "AUTHORITY" && lane.interpretation_space !== "AUTHORITY_SPACE") {
    throw new TwinModelError("TWIN_CONTRACT_INVALID", "AUTHORITY timeline lane must use AUTHORITY_SPACE");
  }
  if (lane.lane_code === "INTERNAL_COMPUTED" && lane.interpretation_space === "AUTHORITY_SPACE") {
    throw new TwinModelError("TWIN_CONTRACT_INVALID", "internal timeline lane cannot use AUTHORITY_SPACE");
  }
  if (lane.coverage_state === "COMPLETE") {
    if (lane.event_refs.length === 0 || lane.limited_by.length > 0) {
      throw new TwinModelError("TWIN_CONTRACT_INVALID", "complete timeline lanes require event refs and no limits");
    }
  }
  if (
    lane.coverage_state !== "COMPLETE" ||
    lane.freshness_state === "LIMITED" ||
    lane.confidence_state === "LIMITED"
  ) {
    if (lane.limited_by.length === 0) {
      throw new TwinModelError("TWIN_CONTRACT_INVALID", "limited timeline lanes must retain limited_by refs");
    }
  }
  return lane;
}

function normalizeLanes(lanes: readonly TwinTimelineLane[]): [TwinTimelineLane, TwinTimelineLane] {
  const normalized = lanes.map(normalizeLane).sort((left, right) => left.lane_code.localeCompare(right.lane_code));
  if (normalized.length !== 2) {
    throw new TwinModelError("TWIN_CONTRACT_INVALID", "TwinTimeline must retain exactly two lanes");
  }
  if (!normalized.some((lane) => lane.lane_code === "INTERNAL_COMPUTED") || !normalized.some((lane) => lane.lane_code === "AUTHORITY")) {
    throw new TwinModelError("TWIN_CONTRACT_INVALID", "TwinTimeline lanes must include internal and authority lanes");
  }
  return normalized as [TwinTimelineLane, TwinTimelineLane];
}

export function buildTwinTimelineRecord(input: TwinTimelineBuildInput): TwinTimelineRecord {
  const lanes = normalizeLanes(input.lanes);
  const eventRefs = new Set(lanes.flatMap((lane) => lane.event_refs));
  const primaryAnchorRef =
    input.primary_anchor_ref === undefined ? [...eventRefs].sort()[0] ?? null : input.primary_anchor_ref;
  const alignedAnchorCount = Number(input.aligned_anchor_count ?? 0);
  const contradictoryAnchorCount = Number(input.contradictory_anchor_count ?? 0);
  const unpairedAnchorCount = Number(input.unpaired_anchor_count ?? 0);
  const alignmentScore = assertNumberFromZeroToOne("alignment_score", input.alignment_score ?? 0);
  let temporalAlignmentState = input.temporal_alignment_state;
  if (!temporalAlignmentState) {
    if (alignmentScore >= 0.9 && contradictoryAnchorCount === 0 && primaryAnchorRef !== null) {
      temporalAlignmentState = "LOCKED";
    } else if (alignmentScore >= 0.6 && alignmentScore < 0.9 && contradictoryAnchorCount === 0) {
      temporalAlignmentState = "DRIFTING";
    } else {
      temporalAlignmentState = "DIVERGED";
    }
  }
  const record: TwinTimelineRecord = {
    aligned_anchor_count: alignedAnchorCount,
    alignment_reason_codes: normalizeSortedStringSet(
      "alignment_reason_codes",
      input.alignment_reason_codes ?? (temporalAlignmentState === "LOCKED" ? [] : ["TIMELINE_ALIGNMENT_LIMITED"]),
    ),
    alignment_score: alignmentScore,
    artifact_type: "TwinTimeline",
    contradictory_anchor_count: contradictoryAnchorCount,
    lanes,
    lifecycle_state: input.lifecycle_state ?? "BUILT",
    primary_anchor_ref: primaryAnchorRef,
    temporal_alignment_state: temporalAlignmentState,
    twin_id: requireString("twin_id", input.twin_id),
    twin_timeline_id: input.twin_timeline_id ?? `twin-timeline.${input.twin_id}.${primaryAnchorRef ?? "unanchored"}`,
    unpaired_anchor_count: unpairedAnchorCount,
    window_end_at: normalizeNullableTimestamp("window_end_at", input.window_end_at),
    window_start_at: normalizeNullableTimestamp("window_start_at", input.window_start_at),
  };
  return normalizeTwinTimelineRecord(record);
}

export function normalizeTwinTimelineRecord(input: TwinTimelineRecord): TwinTimelineRecord {
  const lanes = normalizeLanes(input.lanes);
  const record: TwinTimelineRecord = {
    ...input,
    alignment_reason_codes: normalizeSortedStringSet("alignment_reason_codes", input.alignment_reason_codes),
    alignment_score: assertNumberFromZeroToOne("alignment_score", input.alignment_score),
    artifact_type: "TwinTimeline",
    lanes,
    primary_anchor_ref: input.primary_anchor_ref === null ? null : requireString("primary_anchor_ref", input.primary_anchor_ref),
    twin_id: requireString("twin_id", input.twin_id),
    twin_timeline_id: requireString("twin_timeline_id", input.twin_timeline_id),
    window_end_at: normalizeNullableTimestamp("window_end_at", input.window_end_at),
    window_start_at: normalizeNullableTimestamp("window_start_at", input.window_start_at),
  };
  if (record.window_start_at !== null && record.window_end_at !== null && record.window_start_at > record.window_end_at) {
    throw new TwinModelError("TWIN_CONTRACT_INVALID", "window_start_at must not be later than window_end_at");
  }
  const totalAnchorCount =
    record.aligned_anchor_count + record.contradictory_anchor_count + record.unpaired_anchor_count;
  if (totalAnchorCount === 0 && record.primary_anchor_ref !== null) {
    throw new TwinModelError("TWIN_CONTRACT_INVALID", "primary_anchor_ref must clear when no anchors exist");
  }
  if (totalAnchorCount > 0 && record.primary_anchor_ref === null) {
    throw new TwinModelError("TWIN_CONTRACT_INVALID", "primary_anchor_ref is required when anchors exist");
  }
  const eventRefs = new Set(record.lanes.flatMap((lane) => lane.event_refs));
  if (record.primary_anchor_ref !== null && !eventRefs.has(record.primary_anchor_ref)) {
    throw new TwinModelError("TWIN_CONTRACT_INVALID", "primary_anchor_ref must resolve to a lane event ref");
  }
  if (record.temporal_alignment_state === "LOCKED") {
    if (record.alignment_score < 0.9 || record.primary_anchor_ref === null || record.contradictory_anchor_count !== 0) {
      throw new TwinModelError("TWIN_CONTRACT_INVALID", "LOCKED timelines require high score, anchor, and no contradictions");
    }
  }
  if (record.temporal_alignment_state === "DRIFTING" && (record.alignment_score < 0.6 || record.alignment_score >= 0.9)) {
    throw new TwinModelError("TWIN_CONTRACT_INVALID", "DRIFTING timelines require 0.60 <= score < 0.90");
  }
  if (record.temporal_alignment_state === "DIVERGED" && record.alignment_score >= 0.6 && record.contradictory_anchor_count === 0) {
    throw new TwinModelError("TWIN_CONTRACT_INVALID", "DIVERGED timelines require low score or contradiction");
  }
  return record;
}

export function cloneTwinTimelineRecord(record: TwinTimelineRecord) {
  return cloneRecord(record);
}
