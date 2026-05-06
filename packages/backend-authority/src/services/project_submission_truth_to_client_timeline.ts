import { AuthorityModelError, type AuthorityTruthState } from "../models/authority_common.ts";
import {
  type SubmissionRecord,
  submissionRecordRef,
} from "../models/submission_record.ts";

export type SubmissionClientTimelineProjection = {
  authority_truth_state: AuthorityTruthState;
  client_timeline_event_ref: string;
  customer_status_projection:
    | "SUBMISSION_IN_PROGRESS"
    | "WAITING_FOR_AUTHORITY"
    | "AUTHORITY_CONFIRMED"
    | "AUTHORITY_REJECTED"
    | "AUTHORITY_OUTCOME_UNKNOWN"
    | "OUT_OF_BAND_RECONCILIATION"
    | "AUTHORITY_CORRECTION_REOPENED";
  headline: string;
  is_confirming: boolean;
  requires_reopen: boolean;
  submission_record_ref: string;
};

function authorityTruthStateForTimeline(submission: SubmissionRecord): AuthorityTruthState {
  if (
    submission.lifecycle_state === "INTENT_RECORDED" ||
    submission.lifecycle_state === "TRANSMIT_PENDING" ||
    submission.lifecycle_state === "TRANSMITTED"
  ) {
    return "PENDING_ACK";
  }
  if (submission.lifecycle_state === "SUPERSEDED") {
    return "UNKNOWN";
  }
  return submission.lifecycle_state;
}

export function validateSubmissionClientTimelineProjection(
  projection: SubmissionClientTimelineProjection,
) {
  if (projection.authority_truth_state !== "CONFIRMED") {
    const lowerHeadline = projection.headline.toLowerCase();
    if (
      projection.is_confirming ||
      lowerHeadline.includes("confirmed") ||
      lowerHeadline.includes("resolved") ||
      lowerHeadline === "status updated" ||
      lowerHeadline.includes("complete")
    ) {
      throw new AuthorityModelError(
        "AUTHORITY_CONTRACT_INVALID",
        "non-confirmed authority truth must not publish confirming client timeline copy",
      );
    }
  }
  return projection;
}

export function projectSubmissionTruthToClientTimeline(
  submission: SubmissionRecord,
): SubmissionClientTimelineProjection {
  const authorityTruthState = authorityTruthStateForTimeline(submission);
  const base = {
    authority_truth_state: authorityTruthState,
    client_timeline_event_ref: `client-timeline-event://${submission.submission_id}`,
    submission_record_ref: submissionRecordRef(submission),
  };
  switch (authorityTruthState) {
    case "CONFIRMED":
      return validateSubmissionClientTimelineProjection({
        ...base,
        customer_status_projection: "AUTHORITY_CONFIRMED",
        headline: "Authority confirmed the submission",
        is_confirming: true,
        requires_reopen: false,
      });
    case "REJECTED":
      return validateSubmissionClientTimelineProjection({
        ...base,
        customer_status_projection: "AUTHORITY_REJECTED",
        headline: "Authority rejected the submission",
        is_confirming: false,
        requires_reopen: true,
      });
    case "OUT_OF_BAND":
      return validateSubmissionClientTimelineProjection({
        ...base,
        customer_status_projection: "OUT_OF_BAND_RECONCILIATION",
        headline: "External authority state needs reconciliation",
        is_confirming: false,
        requires_reopen: true,
      });
    case "UNKNOWN":
      return validateSubmissionClientTimelineProjection({
        ...base,
        customer_status_projection:
          submission.lifecycle_state === "SUPERSEDED"
            ? "AUTHORITY_CORRECTION_REOPENED"
            : "AUTHORITY_OUTCOME_UNKNOWN",
        headline:
          submission.lifecycle_state === "SUPERSEDED"
            ? "Authority correction reopened review"
            : "Authority outcome needs reconciliation",
        is_confirming: false,
        requires_reopen: true,
      });
    case "PENDING_ACK":
      return validateSubmissionClientTimelineProjection({
        ...base,
        customer_status_projection:
          submission.lifecycle_state === "INTENT_RECORDED" ||
          submission.lifecycle_state === "TRANSMIT_PENDING" ||
          submission.lifecycle_state === "TRANSMITTED"
            ? "SUBMISSION_IN_PROGRESS"
            : "WAITING_FOR_AUTHORITY",
        headline:
          submission.lifecycle_state === "INTENT_RECORDED" ||
          submission.lifecycle_state === "TRANSMIT_PENDING" ||
          submission.lifecycle_state === "TRANSMITTED"
            ? "Submission is in progress"
            : "Waiting for authority acknowledgement",
        is_confirming: false,
        requires_reopen: false,
      });
    default:
      return validateSubmissionClientTimelineProjection({
        ...base,
        customer_status_projection: "AUTHORITY_OUTCOME_UNKNOWN",
        headline: "Authority outcome needs reconciliation",
        is_confirming: false,
        requires_reopen: true,
      });
  }
}
