import {
  type FailureAcceptedRiskPostureState,
  type FailureCompensationPostureState,
  type FailureInvestigationPostureState,
  type FailureLifecycleDashboardNextLegalAction,
  type FailureLifecycleDashboardSourceArtifactType,
  type FailureLineageState,
  type FailureRemediationTaskState,
  type FailureWaitingOnActor,
} from "../models/failure_lifecycle_dashboard.ts";

export type FailureNextLegalActionContext = {
  accepted_risk: {
    approval_ref_or_null: string | null;
    expires_at_or_null: string | null;
    state: FailureAcceptedRiskPostureState;
  };
  compensation: {
    active_compensation_ref_or_null: string | null;
    due_at_or_null?: string | null | undefined;
    state: FailureCompensationPostureState;
  };
  current_error_ref: string;
  current_lineage_state: FailureLineageState;
  investigation: {
    active_investigation_ref_or_null: string | null;
    due_at_or_null?: string | null | undefined;
    state: FailureInvestigationPostureState;
    waiting_on_external?: boolean | undefined;
  };
  remediation: {
    active_task_ref_or_null: string | null;
    due_at_or_null: string | null;
    owner_type_or_null?: string | null | undefined;
    task_state_or_null: FailureRemediationTaskState | null;
  };
  retry_due_at_or_null?: string | null | undefined;
  workflow: {
    due_at_or_null?: string | null | undefined;
    waiting_on_actor_or_null: FailureWaitingOnActor | null;
    workflow_item_ref_or_null: string | null;
  };
};

function action(input: {
  action_code_or_null: string | null;
  action_ref_or_null: string | null;
  action_state: FailureLifecycleDashboardNextLegalAction["action_state"];
  due_at_or_null?: string | null | undefined;
  reason_codes?: readonly string[] | undefined;
  source_artifact_type_or_null: FailureLifecycleDashboardSourceArtifactType | null;
  waiting_on_actor_or_null?: FailureWaitingOnActor | null | undefined;
}): FailureLifecycleDashboardNextLegalAction {
  return {
    action_code_or_null: input.action_code_or_null,
    action_ref_or_null: input.action_ref_or_null,
    action_state: input.action_state,
    due_at_or_null: input.due_at_or_null ?? null,
    reason_codes: [...(input.reason_codes ?? [])],
    source_artifact_type_or_null: input.source_artifact_type_or_null,
    waiting_on_actor_or_null: input.waiting_on_actor_or_null ?? null,
  };
}

export function buildFailureNextLegalAction(
  input: FailureNextLegalActionContext,
): FailureLifecycleDashboardNextLegalAction {
  if (["RESOLVED", "SUPERSEDED", "CANCELLED"].includes(input.current_lineage_state)) {
    return action({
      action_code_or_null: null,
      action_ref_or_null: null,
      action_state: "NO_FURTHER_ACTION",
      source_artifact_type_or_null: null,
    });
  }

  if (input.current_lineage_state === "ACCEPTED_RISK_ACTIVE") {
    const workflowRef = input.workflow.workflow_item_ref_or_null;
    return action({
      action_code_or_null: "REVIEW_ACCEPTED_RISK_EXPIRY",
      action_ref_or_null: workflowRef ?? input.accepted_risk.approval_ref_or_null,
      action_state: "REVIEW_DUE",
      due_at_or_null: input.accepted_risk.expires_at_or_null,
      reason_codes: ["ACCEPTED_RISK_EXPIRY_REVIEW_REQUIRED"],
      source_artifact_type_or_null: workflowRef === null ? "ACCEPTED_RISK_APPROVAL" : "WORKFLOW_ITEM",
      waiting_on_actor_or_null: "STAFF",
    });
  }

  if (input.current_lineage_state === "INVESTIGATION_ACTIVE") {
    return action({
      action_code_or_null: input.investigation.waiting_on_external
        ? "AWAIT_INVESTIGATION_INPUT"
        : "PROGRESS_FAILURE_INVESTIGATION",
      action_ref_or_null: input.investigation.active_investigation_ref_or_null,
      action_state: input.investigation.waiting_on_external
        ? "WAITING_ON_EXTERNAL"
        : "ACTION_AVAILABLE",
      due_at_or_null: input.investigation.due_at_or_null ?? null,
      reason_codes: input.investigation.waiting_on_external
        ? ["INVESTIGATION_EXTERNAL_INPUT_REQUIRED"]
        : ["INVESTIGATION_REVIEW_REQUIRED"],
      source_artifact_type_or_null: "FAILURE_INVESTIGATION",
      waiting_on_actor_or_null: input.investigation.waiting_on_external ? "AUTHORITY" : "STAFF",
    });
  }

  if (input.current_lineage_state === "COMPENSATION_ACTIVE") {
    const applied = input.compensation.state === "APPLIED";
    return action({
      action_code_or_null: applied ? "VERIFY_COMPENSATION" : "COMPLETE_COMPENSATION",
      action_ref_or_null: input.compensation.active_compensation_ref_or_null,
      action_state: applied ? "REVIEW_DUE" : "ACTION_AVAILABLE",
      due_at_or_null: input.compensation.due_at_or_null ?? null,
      reason_codes: applied
        ? ["COMPENSATION_VERIFICATION_REQUIRED"]
        : ["COMPENSATION_COMPLETION_REQUIRED"],
      source_artifact_type_or_null: "COMPENSATION_RECORD",
      waiting_on_actor_or_null: "STAFF",
    });
  }

  if (input.current_lineage_state === "REMEDIATION_ACTIVE") {
    const waiting = input.remediation.task_state_or_null === "WAITING";
    const waitingActor =
      input.remediation.owner_type_or_null === "CLIENT" ? "CUSTOMER" : "STAFF";
    return action({
      action_code_or_null: waiting ? "AWAIT_REMEDIATION_INPUT" : "PROGRESS_REMEDIATION_TASK",
      action_ref_or_null: input.remediation.active_task_ref_or_null,
      action_state: waiting ? "WAITING_ON_EXTERNAL" : "ACTION_AVAILABLE",
      due_at_or_null: input.remediation.due_at_or_null,
      reason_codes: waiting
        ? ["REMEDIATION_EXTERNAL_INPUT_REQUIRED"]
        : ["REMEDIATION_TASK_ACTION_REQUIRED"],
      source_artifact_type_or_null: "REMEDIATION_TASK",
      waiting_on_actor_or_null: waiting ? waitingActor : "STAFF",
    });
  }

  if (input.current_lineage_state === "RETRY_SCHEDULED") {
    return action({
      action_code_or_null: "WAIT_FOR_RETRY_WINDOW",
      action_ref_or_null: input.current_error_ref,
      action_state: "WAITING_ON_SCHEDULE",
      due_at_or_null: input.retry_due_at_or_null ?? null,
      reason_codes: ["RETRY_WINDOW_SCHEDULED"],
      source_artifact_type_or_null: "ERROR_RECORD",
      waiting_on_actor_or_null: "SYSTEM",
    });
  }

  if (input.workflow.workflow_item_ref_or_null !== null) {
    const waitingActor = input.workflow.waiting_on_actor_or_null ?? "STAFF";
    const waiting = waitingActor !== "NONE" && waitingActor !== "STAFF";
    return action({
      action_code_or_null: waiting ? "AWAIT_WORKFLOW_INPUT" : "REVIEW_FAILURE_WORKFLOW",
      action_ref_or_null: input.workflow.workflow_item_ref_or_null,
      action_state: waiting ? "WAITING_ON_EXTERNAL" : "ACTION_AVAILABLE",
      due_at_or_null: input.workflow.due_at_or_null ?? null,
      reason_codes: waiting
        ? ["WORKFLOW_EXTERNAL_INPUT_REQUIRED"]
        : ["WORKFLOW_REVIEW_REQUIRED"],
      source_artifact_type_or_null: "WORKFLOW_ITEM",
      waiting_on_actor_or_null: waitingActor,
    });
  }

  return action({
    action_code_or_null: "REVIEW_FAILURE",
    action_ref_or_null: input.current_error_ref,
    action_state: "ACTION_AVAILABLE",
    reason_codes: ["FAILURE_REVIEW_REQUIRED"],
    source_artifact_type_or_null: "ERROR_RECORD",
    waiting_on_actor_or_null: "STAFF",
  });
}
