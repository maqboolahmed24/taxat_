import { type ObligationMirrorBuildInput } from "../models/obligation_mirror.ts";
import { type SubmissionRecord } from "../models/submission_record.ts";
import {
  projectSubmissionTruthToClientTimeline,
} from "./project_submission_truth_to_client_timeline.ts";
import {
  projectSubmissionTruthToObligationMirror,
} from "./project_submission_truth_to_obligation_mirror.ts";
import {
  projectSubmissionTruthToWorkflow,
} from "./project_submission_truth_to_workflow.ts";

export type ProjectAuthorityTruthBundleInput = Omit<
  ObligationMirrorBuildInput,
  | "authority_ingress_proof_contract"
  | "authority_status_ref"
  | "authority_truth_state"
  | "blocked_reason_codes"
  | "current_submission_ref"
  | "last_authority_sync_at"
  | "last_confirmed_submission_ref"
  | "lifecycle_state"
  | "ready_manifest_ref"
  | "reconciliation_control_contract_or_null"
> & {
  submission: SubmissionRecord;
};

export function projectAuthorityTruthBundle(input: ProjectAuthorityTruthBundleInput) {
  const obligation_mirror = projectSubmissionTruthToObligationMirror(input);
  const workflow_projection = projectSubmissionTruthToWorkflow(input.submission);
  const client_timeline_event = projectSubmissionTruthToClientTimeline(input.submission);
  return {
    client_timeline_event,
    obligation_mirror,
    submission: input.submission,
    workflow_projection,
  };
}
