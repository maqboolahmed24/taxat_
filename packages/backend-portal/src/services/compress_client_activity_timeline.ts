import {
  type BuildClientTimelineEventInput,
  projectClientTimelineEvent,
} from "../projectors/build_client_timeline_event.ts";
import {
  assertClientTimelineCopyIsCustomerSafe,
  assertClientTimelineHeadlineAuthorityCopy,
} from "./derive_client_timeline_headline.ts";
import {
  type ClientPortalWorkspaceTimelineEventRecord,
  type ClientTimelineEventRecord,
} from "../types.ts";

export type ClientActivityTimelineCompressionResult = {
  compressedEventIds: string[];
  droppedEventIds: string[];
  events: ClientTimelineEventRecord[];
  workspaceTimeline: ClientPortalWorkspaceTimelineEventRecord[];
};

type CompressibleClientTimelineInput = BuildClientTimelineEventInput | ClientTimelineEventRecord;

const eventKindPriority = new Map<ClientTimelineEventRecord["event_kind"], number>([
  ["STATUS_UPDATED", 70],
  ["SUBMISSION_SENT", 65],
  ["UPLOAD_REJECTED", 60],
  ["APPROVAL_SIGNED", 55],
  ["APPROVAL_READY", 50],
  ["UPLOAD_RECEIVED", 45],
  ["ONBOARDING_STEP_COMPLETED", 40],
]);

function isClientTimelineEventRecord(
  value: CompressibleClientTimelineInput,
): value is ClientTimelineEventRecord {
  return (
    typeof value === "object" &&
    value !== null &&
    "artifact_type" in value &&
    value.artifact_type === "ClientTimelineEvent"
  );
}

function epoch(value: string) {
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : Number.NEGATIVE_INFINITY;
}

function priority(event: ClientTimelineEventRecord) {
  return eventKindPriority.get(event.event_kind) ?? 0;
}

function compareTimelineEvents(
  left: ClientTimelineEventRecord,
  right: ClientTimelineEventRecord,
) {
  const epochDelta = epoch(right.occurred_at) - epoch(left.occurred_at);
  if (epochDelta !== 0) {
    return epochDelta;
  }
  const priorityDelta = priority(right) - priority(left);
  if (priorityDelta !== 0) {
    return priorityDelta;
  }
  return left.event_id.localeCompare(right.event_id);
}

function compressionKey(event: ClientTimelineEventRecord) {
  const objectRef = event.related_object_ref ?? "<none>";
  switch (event.event_kind) {
    case "STATUS_UPDATED":
      return `${event.event_kind}:${objectRef}:${event.authority_truth_state}`;
    case "SUBMISSION_SENT":
      return `${event.event_kind}:${objectRef}:PENDING_ACK`;
    case "APPROVAL_READY":
    case "APPROVAL_SIGNED":
    case "ONBOARDING_STEP_COMPLETED":
    case "UPLOAD_RECEIVED":
    case "UPLOAD_REJECTED":
      return `${event.event_kind}:${objectRef}`;
  }
}

function normalizeEvents(events: readonly CompressibleClientTimelineInput[]) {
  return events.flatMap((event) => {
    if (isClientTimelineEventRecord(event)) {
      return [event];
    }
    const projected = projectClientTimelineEvent(event);
    return projected === null ? [] : [projected];
  });
}

function clampCopyToBudget(value: string, maxLength: number) {
  const trimmed = value.trim().replace(/\s+/g, " ");
  if (trimmed.length <= maxLength) {
    return trimmed;
  }
  return `${trimmed.slice(0, Math.max(0, maxLength - 3)).trimEnd()}...`;
}

function defaultDetailForEvent(event: ClientTimelineEventRecord) {
  switch (event.event_kind) {
    case "APPROVAL_READY":
      return "Please review it when you are ready.";
    case "APPROVAL_SIGNED":
      return "Your signed approval is recorded in this portal.";
    case "ONBOARDING_STEP_COMPLETED":
      return "Your portal progress was saved.";
    case "SUBMISSION_SENT":
      return "We will show the authority result when it is available.";
    case "UPLOAD_RECEIVED":
      return "We received the file and will review it next.";
    case "UPLOAD_REJECTED":
      return "Please open the request to send a replacement.";
    case "STATUS_UPDATED":
      switch (event.authority_truth_state) {
        case "CONFIRMED":
          return "The authority result is confirmed.";
        case "NOT_APPLICABLE":
          return "The visible portal status changed.";
        case "NOT_REQUESTED":
          return "No authority submission has been sent for this item.";
        case "OUT_OF_BAND":
          return "We found external authority information that needs review.";
        case "PARTIAL_ACK":
          return "Part of the authority acknowledgement is still being checked.";
        case "PENDING_ACK":
          return "The authority acknowledgement is still pending.";
        case "REJECTED":
          return "The authority response means this needs review.";
        case "UNKNOWN":
          return "We are checking the authority result before showing a final status.";
      }
  }
}

function workspaceDetail(input: {
  detailByRef: Readonly<Record<string, string>>;
  event: ClientTimelineEventRecord;
}) {
  const fromRef =
    input.event.detail_ref === null ? undefined : input.detailByRef[input.event.detail_ref];
  const detail = clampCopyToBudget(fromRef ?? defaultDetailForEvent(input.event), 180);
  assertClientTimelineCopyIsCustomerSafe({
    eventKind: input.event.event_kind,
    field: "detail",
    maxLength: 180,
    text: detail,
  });
  return detail;
}

export function buildClientPortalWorkspaceTimelineRows(input: {
  detailByRef?: Readonly<Record<string, string>> | undefined;
  events: readonly ClientTimelineEventRecord[];
}): ClientPortalWorkspaceTimelineEventRecord[] {
  const detailByRef = input.detailByRef ?? {};
  return input.events.map((event) => {
    assertClientTimelineHeadlineAuthorityCopy({
      authorityTruthState: event.authority_truth_state,
      eventKind: event.event_kind,
      headline: event.headline,
    });
    return {
      detail: workspaceDetail({ detailByRef, event }),
      event_id: event.event_id,
      event_kind: event.event_kind,
      headline: event.headline,
      occurred_at: event.occurred_at,
    };
  });
}

export function compressClientActivityTimeline(input: {
  detailByRef?: Readonly<Record<string, string>> | undefined;
  events: readonly CompressibleClientTimelineInput[];
  maxEvents?: number | undefined;
}): ClientActivityTimelineCompressionResult {
  const maxEvents = Math.max(0, Math.min(input.maxEvents ?? 12, 12));
  const sorted = normalizeEvents(input.events).sort(compareTimelineEvents);
  const seenEventIds = new Set<string>();
  const seenCompressionKeys = new Set<string>();
  const compressedEventIds: string[] = [];
  const droppedEventIds: string[] = [];
  const events: ClientTimelineEventRecord[] = [];

  for (const event of sorted) {
    assertClientTimelineHeadlineAuthorityCopy({
      authorityTruthState: event.authority_truth_state,
      eventKind: event.event_kind,
      headline: event.headline,
    });

    const duplicateEventId = seenEventIds.has(event.event_id);
    seenEventIds.add(event.event_id);
    if (duplicateEventId) {
      compressedEventIds.push(event.event_id);
      continue;
    }

    const key = compressionKey(event);
    if (seenCompressionKeys.has(key)) {
      compressedEventIds.push(event.event_id);
      continue;
    }
    seenCompressionKeys.add(key);

    if (events.length >= maxEvents) {
      droppedEventIds.push(event.event_id);
      continue;
    }
    events.push(event);
  }

  return {
    compressedEventIds,
    droppedEventIds,
    events,
    workspaceTimeline: buildClientPortalWorkspaceTimelineRows({
      detailByRef: input.detailByRef,
      events,
    }),
  };
}
