import { AuthorityModelError, type AuthorityTruthState } from "../models/authority_common.ts";
import {
  type SubmissionRecord,
  submissionRecordRef,
} from "../models/submission_record.ts";

export type SubmissionWorkflowProjection = {
  authority_truth_state: AuthorityTruthState;
  confirming_copy_allowed: boolean;
  customer_safe_resolution_state:
    | "AUTHORITY_UNRESOLVED"
    | "AUTHORITY_CONFIRMED_RESOLVED"
    | "AUTHORITY_REJECTED_BLOCKED"
    | "AUTHORITY_CORRECTION_REOPENED";
  lifecycle_state: "WAITING_ON_AUTHORITY" | "RESOLVED" | "BLOCKED" | "REOPENED";
  reason_codes: string[];
  submission_record_ref: string;
  waiting_on: "AUTHORITY" | "OPERATOR" | "NONE";
  workflow_projection_ref: string;
};

function authorityTruthStateForSubmission(submission: SubmissionRecord): AuthorityTruthState {
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

export function validateSubmissionWorkflowProjection(projection: SubmissionWorkflowProjection) {
  if (
    projection.authority_truth_state !== "CONFIRMED" &&
    (projection.lifecycle_state === "RESOLVED" ||
      projection.customer_safe_resolution_state === "AUTHORITY_CONFIRMED_RESOLVED" ||
      projection.confirming_copy_allowed)
  ) {
    throw new AuthorityModelError(
      "AUTHORITY_CONTRACT_INVALID",
      "non-confirmed authority truth must not publish resolved workflow or confirming copy",
    );
  }
  return projection;
}

export function projectSubmissionTruthToWorkflow(submission: SubmissionRecord): SubmissionWorkflowProjection {
  const authorityTruthState = authorityTruthStateForSubmission(submission);
  const submissionRef = submissionRecordRef(submission);
  if (authorityTruthState === "CONFIRMED") {
    return validateSubmissionWorkflowProjection({
      authority_truth_state: "CONFIRMED",
      confirming_copy_allowed: true,
      customer_safe_resolution_state: "AUTHORITY_CONFIRMED_RESOLVED",
      lifecycle_state: "RESOLVED",
      reason_codes: ["AUTHORITY_CONFIRMED_SETTLEMENT"],
      submission_record_ref: submissionRef,
      waiting_on: "NONE",
      workflow_projection_ref: `workflow-projection://${submission.submission_id}`,
    });
  }
  if (authorityTruthState === "REJECTED") {
    return validateSubmissionWorkflowProjection({
      authority_truth_state: "REJECTED",
      confirming_copy_allowed: false,
      customer_safe_resolution_state: "AUTHORITY_REJECTED_BLOCKED",
      lifecycle_state: "BLOCKED",
      reason_codes: ["AUTHORITY_REJECTED_SUBMISSION"],
      submission_record_ref: submissionRef,
      waiting_on: "OPERATOR",
      workflow_projection_ref: `workflow-projection://${submission.submission_id}`,
    });
  }
  if (authorityTruthState === "OUT_OF_BAND") {
    return validateSubmissionWorkflowProjection({
      authority_truth_state: "OUT_OF_BAND",
      confirming_copy_allowed: false,
      customer_safe_resolution_state: "AUTHORITY_UNRESOLVED",
      lifecycle_state: "REOPENED",
      reason_codes: ["OUT_OF_BAND_AUTHORITY_STATE_REQUIRES_RECONCILIATION"],
      submission_record_ref: submissionRef,
      waiting_on: "OPERATOR",
      workflow_projection_ref: `workflow-projection://${submission.submission_id}`,
    });
  }
  return validateSubmissionWorkflowProjection({
    authority_truth_state: authorityTruthState,
    confirming_copy_allowed: false,
    customer_safe_resolution_state:
      submission.lifecycle_state === "SUPERSEDED"
        ? "AUTHORITY_CORRECTION_REOPENED"
        : "AUTHORITY_UNRESOLVED",
    lifecycle_state:
      submission.lifecycle_state === "SUPERSEDED" ? "REOPENED" : "WAITING_ON_AUTHORITY",
    reason_codes: [
      submission.lifecycle_state === "SUPERSEDED"
        ? "SUBMISSION_SUPERSEDED_BY_NEW_LINEAGE"
        : `${authorityTruthState}_REQUIRES_AUTHORITY_RECONCILIATION`,
    ],
    submission_record_ref: submissionRef,
    waiting_on: submission.lifecycle_state === "SUPERSEDED" ? "OPERATOR" : "AUTHORITY",
    workflow_projection_ref: `workflow-projection://${submission.submission_id}`,
  });
}
