import type {
  ClientTimelineAuthorityTruthState,
  ClientTimelineEventKind,
} from "../types.ts";

export const nonAuthorityClientTimelineEventKinds = new Set<ClientTimelineEventKind>([
  "APPROVAL_READY",
  "APPROVAL_SIGNED",
  "ONBOARDING_STEP_COMPLETED",
  "UPLOAD_RECEIVED",
  "UPLOAD_REJECTED",
]);

const clientTimelineAuthorityTruthStates = new Set<ClientTimelineAuthorityTruthState>([
  "CONFIRMED",
  "NOT_APPLICABLE",
  "NOT_REQUESTED",
  "OUT_OF_BAND",
  "PARTIAL_ACK",
  "PENDING_ACK",
  "REJECTED",
  "UNKNOWN",
]);

const authorityTruthStateByFamily = new Map<string, ClientTimelineAuthorityTruthState>([
  ["AUTHORITY_ACK_CONFIRMED", "CONFIRMED"],
  ["AUTHORITY_ACK_PARTIAL", "PARTIAL_ACK"],
  ["AUTHORITY_ACK_PENDING", "PENDING_ACK"],
  ["AUTHORITY_ACK_REJECTED", "REJECTED"],
  ["AUTHORITY_ACK_UNKNOWN", "UNKNOWN"],
  ["AUTHORITY_CONFIRMED", "CONFIRMED"],
  ["AUTHORITY_OUTCOME_CONFIRMED", "CONFIRMED"],
  ["AUTHORITY_OUTCOME_REJECTED", "REJECTED"],
  ["AUTHORITY_OUTCOME_UNKNOWN", "UNKNOWN"],
  ["AUTHORITY_PARTIAL_ACK", "PARTIAL_ACK"],
  ["AUTHORITY_PENDING_ACK", "PENDING_ACK"],
  ["AUTHORITY_REJECTED", "REJECTED"],
  ["AUTHORITY_STATUS_CONFIRMED", "CONFIRMED"],
  ["AUTHORITY_STATUS_OUT_OF_BAND", "OUT_OF_BAND"],
  ["AUTHORITY_STATUS_PARTIAL_ACK", "PARTIAL_ACK"],
  ["AUTHORITY_STATUS_PENDING", "PENDING_ACK"],
  ["AUTHORITY_STATUS_REJECTED", "REJECTED"],
  ["AUTHORITY_STATUS_UNKNOWN", "UNKNOWN"],
  ["AUTHORITY_UNKNOWN", "UNKNOWN"],
  ["OUT_OF_BAND_AUTHORITY_UPDATE", "OUT_OF_BAND"],
  ["OUT_OF_BAND_DISCOVERY", "OUT_OF_BAND"],
  ["SUBMISSION_CONFIRMED", "CONFIRMED"],
  ["SUBMISSION_REJECTED", "REJECTED"],
  ["SUBMISSION_STATUS_OUT_OF_BAND", "OUT_OF_BAND"],
  ["SUBMISSION_STATUS_UNKNOWN", "UNKNOWN"],
]);

const authorityTruthStateBySubmissionLifecycle = new Map<
  string,
  ClientTimelineAuthorityTruthState
>([
  ["CONFIRMED", "CONFIRMED"],
  ["INTENT_RECORDED", "PENDING_ACK"],
  ["OUT_OF_BAND", "OUT_OF_BAND"],
  ["PENDING_ACK", "PENDING_ACK"],
  ["REJECTED", "REJECTED"],
  ["SUPERSEDED", "UNKNOWN"],
  ["TRANSMIT_PENDING", "PENDING_ACK"],
  ["TRANSMITTED", "PENDING_ACK"],
  ["UNKNOWN", "UNKNOWN"],
]);

function normalizeCode(value: string) {
  return value.trim().toUpperCase();
}

export function isClientTimelineAuthorityTruthState(
  value: unknown,
): value is ClientTimelineAuthorityTruthState {
  return (
    typeof value === "string" &&
    clientTimelineAuthorityTruthStates.has(value as ClientTimelineAuthorityTruthState)
  );
}

export function isNonAuthorityClientTimelineEventKind(value: unknown) {
  return (
    typeof value === "string" &&
    nonAuthorityClientTimelineEventKinds.has(value as ClientTimelineEventKind)
  );
}

export function deriveClientTimelineAuthorityTruthPosture(input: {
  authorityTruthState?: ClientTimelineAuthorityTruthState | string | null | undefined;
  eventKind: ClientTimelineEventKind;
  internalEventFamily?: string | null | undefined;
  submissionLifecycleState?: string | null | undefined;
}): ClientTimelineAuthorityTruthState {
  if (nonAuthorityClientTimelineEventKinds.has(input.eventKind)) {
    return "NOT_APPLICABLE";
  }

  if (input.eventKind === "SUBMISSION_SENT") {
    return "PENDING_ACK";
  }

  if (isClientTimelineAuthorityTruthState(input.authorityTruthState)) {
    return input.authorityTruthState;
  }

  if (typeof input.submissionLifecycleState === "string") {
    const state = authorityTruthStateBySubmissionLifecycle.get(
      normalizeCode(input.submissionLifecycleState),
    );
    if (state !== undefined) {
      return state;
    }
  }

  if (typeof input.internalEventFamily === "string") {
    const state = authorityTruthStateByFamily.get(normalizeCode(input.internalEventFamily));
    if (state !== undefined) {
      return state;
    }
  }

  return input.eventKind === "STATUS_UPDATED" ? "UNKNOWN" : "NOT_APPLICABLE";
}
