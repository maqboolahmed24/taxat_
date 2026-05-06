import {
  RecoveryCheckpointModelError,
  normalizeRecoveryCheckpointInstant,
  requireTrimmedString,
  type RestorePrivacyAuditChainState,
  type RestorePrivacyReconciliationContract,
  type RestorePrivacyReconciliationState,
} from "../models/recovery_checkpoint.ts";
import {
  isRestorePrivacyBlockedLimitedState,
  signRestorePrivacyReconciliationContract,
} from "../models/restore_privacy_reconciliation_contract.ts";
import type { CompensatingReErasureWorkflow } from "./build_compensating_re_erasure_workflow.ts";
import type { RestoreResurrectedDataPostureClassification } from "./classify_restore_resurrected_data_posture.ts";
import type { PostRestoreLimitationPass } from "./run_post_restore_limitation_pass.ts";

export type RestorePrivacyBlockerRefs = {
  legal_hold_ref_or_null?: string | null;
  proof_preservation_basis_ref_or_null?: string | null;
  authority_ambiguity_ref_or_null?: string | null;
};

export type BuildRestorePrivacyReconciliationContractInput = {
  checkpoint_ref: string;
  restore_drill_ref: string;
  privacy_reconciliation_outcome_ref: string;
  privacy_reconciliation_state: RestorePrivacyReconciliationState;
  resurrected_data: RestoreResurrectedDataPostureClassification;
  compensating_re_erasure_workflow_or_null: CompensatingReErasureWorkflow | null;
  audit_chain_continuity_state: RestorePrivacyAuditChainState;
  audit_chain_continuity_ref: string;
  limitation_pass: Pick<
    PostRestoreLimitationPass,
    "replay_limitation_state" | "enquiry_limitation_state" | "reopen_access_state"
  >;
  blocker_refs?: RestorePrivacyBlockerRefs;
  reconciliation_decided_at_or_null?: string | null;
};

function optionalRef(label: string, value: string | null | undefined) {
  return value === null || value === undefined ? null : requireTrimmedString(label, value);
}

function optionalInstant(label: string, value: string | null | undefined) {
  return value === null || value === undefined ? null : normalizeRecoveryCheckpointInstant(value);
}

function assertPrivacy(condition: unknown, detail: string): asserts condition {
  if (!condition) {
    throw new RecoveryCheckpointModelError("RECOVERY_CHECKPOINT_PRIVACY_INVALID", detail);
  }
}

const expectedCompensatingStateByPrivacyState = {
  PENDING_RECONCILIATION: "NOT_REQUIRED",
  RECONCILED_NO_COMPENSATION_REQUIRED: "NOT_REQUIRED",
  COMPENSATING_RE_ERASURE_REQUIRED: "REQUIRED_PENDING",
  COMPENSATING_RE_ERASURE_IN_PROGRESS: "IN_PROGRESS",
  RECONCILED_WITH_COMPENSATING_RE_ERASURE: "COMPLETED",
  BLOCKED_LEGAL_HOLD: "BLOCKED",
  BLOCKED_PROOF_PRESERVATION: "BLOCKED",
  BLOCKED_AUTHORITY_AMBIGUITY: "BLOCKED",
} as const satisfies Record<
  RestorePrivacyReconciliationState,
  NonNullable<CompensatingReErasureWorkflow>["compensating_re_erasure_state"]
>;

function assertWorkflowBinding(input: {
  checkpoint_ref: string;
  restore_drill_ref: string;
  privacy_reconciliation_outcome_ref: string;
  workflow: CompensatingReErasureWorkflow;
}) {
  assertPrivacy(
    input.workflow.checkpoint_ref === input.checkpoint_ref &&
      input.workflow.restore_drill_ref === input.restore_drill_ref &&
      input.workflow.privacy_reconciliation_outcome_ref === input.privacy_reconciliation_outcome_ref,
    "compensating re-erasure workflow must bind the exact checkpoint, restore drill, and privacy outcome refs",
  );
}

export function buildRestorePrivacyReconciliationContract(
  input: BuildRestorePrivacyReconciliationContractInput,
): RestorePrivacyReconciliationContract {
  const checkpointRef = requireTrimmedString("restore_privacy.checkpoint_ref", input.checkpoint_ref);
  const restoreDrillRef = requireTrimmedString(
    "restore_privacy.restore_drill_ref",
    input.restore_drill_ref,
  );
  const outcomeRef = requireTrimmedString(
    "restore_privacy.privacy_reconciliation_outcome_ref",
    input.privacy_reconciliation_outcome_ref,
  );
  const auditContinuityRef = requireTrimmedString(
    "restore_privacy.audit_chain_continuity_ref",
    input.audit_chain_continuity_ref,
  );
  const decidedAt = optionalInstant(
    "restore_privacy.reconciliation_decided_at_or_null",
    input.reconciliation_decided_at_or_null,
  );
  const workflow = input.compensating_re_erasure_workflow_or_null;
  const expectedCompensatingState =
    expectedCompensatingStateByPrivacyState[input.privacy_reconciliation_state];

  if (input.privacy_reconciliation_state === "PENDING_RECONCILIATION") {
    assertPrivacy(
      input.resurrected_data.resurrected_data_posture === "UNKNOWN_UNTIL_RECONCILED" &&
        input.resurrected_data.resurrected_subject_count_or_null === null,
      "pending restore privacy reconciliation must keep resurrected-data posture unknown",
    );
    assertPrivacy(
      workflow === null || workflow.compensating_re_erasure_state === "NOT_REQUIRED",
      "pending restore privacy reconciliation must not bind compensating workflow refs",
    );
  } else {
    assertPrivacy(
      decidedAt !== null,
      "decided restore privacy states require reconciliation_decided_at_or_null",
    );
  }

  if (expectedCompensatingState === "NOT_REQUIRED") {
    assertPrivacy(
      workflow === null || workflow.compensating_re_erasure_state === "NOT_REQUIRED",
      "privacy state requires compensating_re_erasure_state=NOT_REQUIRED",
    );
  } else {
    assertPrivacy(
      workflow !== null,
      "resurrected restricted-data states require a compensating re-erasure workflow",
    );
    assertWorkflowBinding({
      checkpoint_ref: checkpointRef,
      restore_drill_ref: restoreDrillRef,
      privacy_reconciliation_outcome_ref: outcomeRef,
      workflow,
    });
    assertPrivacy(
      workflow.compensating_re_erasure_state === expectedCompensatingState,
      `privacy state ${input.privacy_reconciliation_state} requires compensating_re_erasure_state=${expectedCompensatingState}`,
    );
  }

  if (input.privacy_reconciliation_state === "RECONCILED_NO_COMPENSATION_REQUIRED") {
    assertPrivacy(
      input.resurrected_data.resurrected_data_posture === "NONE_DETECTED" &&
        input.resurrected_data.resurrected_subject_count_or_null === 0,
      "clean restore privacy reconciliation requires no resurrected restricted data",
    );
  }
  if (expectedCompensatingState !== "NOT_REQUIRED") {
    assertPrivacy(
      input.resurrected_data.resurrected_data_posture ===
        "ERASURE_OR_PSEUDONYMISATION_RESURRECTED" &&
        typeof input.resurrected_data.resurrected_subject_count_or_null === "number" &&
        input.resurrected_data.resurrected_subject_count_or_null >= 1,
      "compensating restore privacy states require resurrected restricted-data posture and count",
    );
  }

  const blockerRefs = {
    legal_hold_ref_or_null: optionalRef(
      "restore_privacy.legal_hold_ref_or_null",
      input.blocker_refs?.legal_hold_ref_or_null,
    ),
    proof_preservation_basis_ref_or_null: optionalRef(
      "restore_privacy.proof_preservation_basis_ref_or_null",
      input.blocker_refs?.proof_preservation_basis_ref_or_null,
    ),
    authority_ambiguity_ref_or_null: optionalRef(
      "restore_privacy.authority_ambiguity_ref_or_null",
      input.blocker_refs?.authority_ambiguity_ref_or_null,
    ),
  };

  if (!isRestorePrivacyBlockedLimitedState(input.privacy_reconciliation_state)) {
    assertPrivacy(
      blockerRefs.legal_hold_ref_or_null === null &&
        blockerRefs.proof_preservation_basis_ref_or_null === null &&
        blockerRefs.authority_ambiguity_ref_or_null === null,
      "legal hold, proof preservation, and authority ambiguity refs are only lawful on their matching blocked states",
    );
  }

  return signRestorePrivacyReconciliationContract(
    {
      contract_version: "RESTORE_PRIVACY_RECONCILIATION_V1",
      checkpoint_ref: checkpointRef,
      restore_drill_ref: restoreDrillRef,
      reconciliation_scope_policy: "RESTORE_REQUIRES_PRIVACY_LIMITATION_AND_RE_ERASURE_PROOF",
      resurrected_data_posture: input.resurrected_data.resurrected_data_posture,
      resurrected_subject_count_or_null:
        input.resurrected_data.resurrected_subject_count_or_null,
      privacy_reconciliation_state: input.privacy_reconciliation_state,
      privacy_reconciliation_outcome_ref: outcomeRef,
      compensating_re_erasure_state: workflow?.compensating_re_erasure_state ?? "NOT_REQUIRED",
      compensating_re_erasure_workflow_ref_or_null:
        workflow?.compensating_re_erasure_workflow_ref_or_null ?? null,
      compensating_re_erasure_audit_ref_or_null:
        workflow?.compensating_re_erasure_audit_ref_or_null ?? null,
      legal_hold_ref_or_null: blockerRefs.legal_hold_ref_or_null,
      proof_preservation_basis_ref_or_null: blockerRefs.proof_preservation_basis_ref_or_null,
      authority_ambiguity_ref_or_null: blockerRefs.authority_ambiguity_ref_or_null,
      audit_chain_continuity_state: input.audit_chain_continuity_state,
      audit_chain_continuity_ref: auditContinuityRef,
      replay_limitation_state: input.limitation_pass.replay_limitation_state,
      enquiry_limitation_state: input.limitation_pass.enquiry_limitation_state,
      reopen_access_state: input.limitation_pass.reopen_access_state,
      reconciliation_decided_at_or_null:
        input.privacy_reconciliation_state === "PENDING_RECONCILIATION" ? null : decidedAt,
      re_erasure_completed_at_or_null: workflow?.re_erasure_completed_at_or_null ?? null,
    },
    {
      checkpoint_ref: checkpointRef,
      restore_drill_ref: restoreDrillRef,
      privacy_reconciliation_outcome_ref: outcomeRef,
    },
  );
}
