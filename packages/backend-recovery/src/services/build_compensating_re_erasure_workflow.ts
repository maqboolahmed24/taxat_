import {
  RecoveryCheckpointModelError,
  normalizeRecoveryCheckpointInstant,
  requireTrimmedString,
  type RestorePrivacyCompensatingState,
} from "../models/recovery_checkpoint.ts";

export type CompensatingReErasureWorkflow = {
  checkpoint_ref: string;
  restore_drill_ref: string;
  privacy_reconciliation_outcome_ref: string;
  compensating_re_erasure_state: RestorePrivacyCompensatingState;
  compensating_re_erasure_workflow_ref_or_null: string | null;
  compensating_re_erasure_audit_ref_or_null: string | null;
  resurrected_subject_count_or_null: number | null;
  workflow_started_at_or_null: string | null;
  re_erasure_completed_at_or_null: string | null;
  workflow_binding_policy:
    | "NO_RESURRECTED_RESTRICTED_DATA_NO_WORKFLOW"
    | "RESURRECTED_RESTRICTED_DATA_REQUIRES_WORKFLOW_AND_AUDIT_REF";
};

export type BuildCompensatingReErasureWorkflowInput = {
  checkpoint_ref: string;
  restore_drill_ref: string;
  privacy_reconciliation_outcome_ref: string;
  compensating_re_erasure_state: RestorePrivacyCompensatingState;
  resurrected_subject_count_or_null: number | null;
  compensating_re_erasure_workflow_ref_or_null: string | null;
  compensating_re_erasure_audit_ref_or_null: string | null;
  workflow_started_at_or_null?: string | null;
  re_erasure_completed_at_or_null?: string | null;
};

function normalizeOptionalRef(label: string, value: string | null | undefined) {
  return value === null || value === undefined ? null : requireTrimmedString(label, value);
}

function normalizeOptionalInstant(label: string, value: string | null | undefined) {
  return value === null || value === undefined ? null : normalizeRecoveryCheckpointInstant(value);
}

function assertWorkflow(condition: unknown, detail: string): asserts condition {
  if (!condition) {
    throw new RecoveryCheckpointModelError("RECOVERY_CHECKPOINT_PRIVACY_INVALID", detail);
  }
}

export function buildCompensatingReErasureWorkflow(
  input: BuildCompensatingReErasureWorkflowInput,
): CompensatingReErasureWorkflow {
  const checkpointRef = requireTrimmedString(
    "compensating_re_erasure.checkpoint_ref",
    input.checkpoint_ref,
  );
  const restoreDrillRef = requireTrimmedString(
    "compensating_re_erasure.restore_drill_ref",
    input.restore_drill_ref,
  );
  const outcomeRef = requireTrimmedString(
    "compensating_re_erasure.privacy_reconciliation_outcome_ref",
    input.privacy_reconciliation_outcome_ref,
  );
  const workflowRef = normalizeOptionalRef(
    "compensating_re_erasure.compensating_re_erasure_workflow_ref_or_null",
    input.compensating_re_erasure_workflow_ref_or_null,
  );
  const auditRef = normalizeOptionalRef(
    "compensating_re_erasure.compensating_re_erasure_audit_ref_or_null",
    input.compensating_re_erasure_audit_ref_or_null,
  );
  const startedAt = normalizeOptionalInstant(
    "compensating_re_erasure.workflow_started_at_or_null",
    input.workflow_started_at_or_null,
  );
  const completedAt = normalizeOptionalInstant(
    "compensating_re_erasure.re_erasure_completed_at_or_null",
    input.re_erasure_completed_at_or_null,
  );
  const subjectCount = input.resurrected_subject_count_or_null;

  if (input.compensating_re_erasure_state === "NOT_REQUIRED") {
    assertWorkflow(
      subjectCount === 0 || subjectCount === null,
      "compensating re-erasure is not required only when no resurrected restricted subjects exist",
    );
    assertWorkflow(
      workflowRef === null && auditRef === null && completedAt === null,
      "NOT_REQUIRED compensating re-erasure must clear workflow, audit, and completion refs",
    );
    return {
      checkpoint_ref: checkpointRef,
      restore_drill_ref: restoreDrillRef,
      privacy_reconciliation_outcome_ref: outcomeRef,
      compensating_re_erasure_state: "NOT_REQUIRED",
      compensating_re_erasure_workflow_ref_or_null: null,
      compensating_re_erasure_audit_ref_or_null: null,
      resurrected_subject_count_or_null: subjectCount,
      workflow_started_at_or_null: null,
      re_erasure_completed_at_or_null: null,
      workflow_binding_policy: "NO_RESURRECTED_RESTRICTED_DATA_NO_WORKFLOW",
    };
  }

  assertWorkflow(
    typeof subjectCount === "number" && Number.isInteger(subjectCount) && subjectCount >= 1,
    "compensating re-erasure workflow requires at least one resurrected restricted subject count",
  );
  assertWorkflow(
    workflowRef !== null && auditRef !== null,
    "compensating re-erasure workflow requires workflow and audit refs",
  );
  if (input.compensating_re_erasure_state === "COMPLETED") {
    assertWorkflow(
      completedAt !== null,
      "completed compensating re-erasure requires re_erasure_completed_at_or_null",
    );
  } else {
    assertWorkflow(
      completedAt === null,
      "open or blocked compensating re-erasure cannot publish a completion timestamp",
    );
  }

  return {
    checkpoint_ref: checkpointRef,
    restore_drill_ref: restoreDrillRef,
    privacy_reconciliation_outcome_ref: outcomeRef,
    compensating_re_erasure_state: input.compensating_re_erasure_state,
    compensating_re_erasure_workflow_ref_or_null: workflowRef,
    compensating_re_erasure_audit_ref_or_null: auditRef,
    resurrected_subject_count_or_null: subjectCount,
    workflow_started_at_or_null: startedAt,
    re_erasure_completed_at_or_null: completedAt,
    workflow_binding_policy:
      "RESURRECTED_RESTRICTED_DATA_REQUIRES_WORKFLOW_AND_AUDIT_REF",
  };
}
