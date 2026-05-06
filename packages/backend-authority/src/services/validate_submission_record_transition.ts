import { AuthorityModelError } from "../models/authority_common.ts";
import {
  type SubmissionRecord,
  type SubmissionRecordLifecycleState,
} from "../models/submission_record.ts";

export type SubmissionRecordTransitionEvent =
  | "send_queued"
  | "request_sent"
  | "awaiting_authority_confirmation"
  | "authority_immediate_confirm"
  | "authority_immediate_reject"
  | "authority_confirms"
  | "authority_rejects"
  | "authority_not_resolved"
  | "late_authority_confirms"
  | "late_authority_rejects"
  | "out_of_band_state_proved"
  | "current_packet_lineage_later_proved"
  | "external_filing_detected"
  | "new_submission_supersedes";

const TARGET_BY_EVENT: Record<SubmissionRecordTransitionEvent, SubmissionRecordLifecycleState> = {
  authority_confirms: "CONFIRMED",
  authority_immediate_confirm: "CONFIRMED",
  authority_immediate_reject: "REJECTED",
  authority_not_resolved: "UNKNOWN",
  authority_rejects: "REJECTED",
  awaiting_authority_confirmation: "PENDING_ACK",
  current_packet_lineage_later_proved: "CONFIRMED",
  external_filing_detected: "OUT_OF_BAND",
  late_authority_confirms: "CONFIRMED",
  late_authority_rejects: "REJECTED",
  new_submission_supersedes: "SUPERSEDED",
  out_of_band_state_proved: "OUT_OF_BAND",
  request_sent: "TRANSMITTED",
  send_queued: "TRANSMIT_PENDING",
};

const ALLOWED: Record<SubmissionRecordLifecycleState, SubmissionRecordTransitionEvent[]> = {
  CONFIRMED: ["new_submission_supersedes"],
  INTENT_RECORDED: ["send_queued", "external_filing_detected"],
  OUT_OF_BAND: ["current_packet_lineage_later_proved"],
  PENDING_ACK: [
    "authority_confirms",
    "authority_rejects",
    "authority_not_resolved",
    "external_filing_detected",
  ],
  REJECTED: ["external_filing_detected"],
  SUPERSEDED: [],
  TRANSMIT_PENDING: ["request_sent", "external_filing_detected"],
  TRANSMITTED: [
    "awaiting_authority_confirmation",
    "authority_immediate_confirm",
    "authority_immediate_reject",
    "external_filing_detected",
  ],
  UNKNOWN: [
    "late_authority_confirms",
    "late_authority_rejects",
    "out_of_band_state_proved",
    "external_filing_detected",
  ],
};

export function targetSubmissionLifecycleStateForEvent(event: SubmissionRecordTransitionEvent) {
  return TARGET_BY_EVENT[event];
}

export function validateSubmissionRecordTransition(input: {
  current: Pick<SubmissionRecord, "lifecycle_state" | "submission_id">;
  event: SubmissionRecordTransitionEvent;
}) {
  const allowedEvents = ALLOWED[input.current.lifecycle_state] ?? [];
  if (!allowedEvents.includes(input.event)) {
    throw new AuthorityModelError(
      "AUTHORITY_CONTRACT_INVALID",
      `${input.current.lifecycle_state} submission record cannot transition with ${input.event}`,
    );
  }
  return {
    event: input.event,
    from_state: input.current.lifecycle_state,
    submission_id: input.current.submission_id,
    to_state: TARGET_BY_EVENT[input.event],
  };
}
