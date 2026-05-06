import {
  deriveRestorePrivacyReconciliationContractHash,
  registerRecoveryCheckpoint,
  transitionRecoveryCheckpoint,
  type RecoveryCheckpointRecord,
  type RestorePrivacyAuditChainState,
  type RestorePrivacyReconciliationContract,
  type RestorePrivacyReconciliationState,
} from "../index.ts";

export const checkpointId = "checkpoint.pc0199.control-plane";
export const datastoreRef = "datastore://control-plane/legal-truth/pc0199";
export const restoreDrillRef = "restore-drill://pc0199/primary";
export const privacyOutcomeRef = "privacy-reconciliation://pc0199/outcome";

export function withPrivacyHash(
  contract: Omit<RestorePrivacyReconciliationContract, "reconciliation_contract_hash">,
): RestorePrivacyReconciliationContract {
  const payload: RestorePrivacyReconciliationContract = {
    ...contract,
    reconciliation_contract_hash: "pending",
  };
  return {
    ...payload,
    reconciliation_contract_hash:
      deriveRestorePrivacyReconciliationContractHash(payload) ??
      "restore-privacy-reconciliation-invalid",
  };
}

export function restorePrivacyContractFixture(input: {
  checkpoint_ref?: string;
  restore_drill_ref?: string;
  privacy_reconciliation_state?: RestorePrivacyReconciliationState;
  privacy_reconciliation_outcome_ref?: string;
  audit_chain_continuity_state?: RestorePrivacyAuditChainState;
} = {}): RestorePrivacyReconciliationContract {
  const state = input.privacy_reconciliation_state ?? "RECONCILED_NO_COMPENSATION_REQUIRED";
  const base = {
    contract_version: "RESTORE_PRIVACY_RECONCILIATION_V1" as const,
    checkpoint_ref: input.checkpoint_ref ?? checkpointId,
    restore_drill_ref: input.restore_drill_ref ?? restoreDrillRef,
    reconciliation_scope_policy: "RESTORE_REQUIRES_PRIVACY_LIMITATION_AND_RE_ERASURE_PROOF" as const,
    privacy_reconciliation_state: state,
    privacy_reconciliation_outcome_ref:
      input.privacy_reconciliation_outcome_ref ?? privacyOutcomeRef,
    audit_chain_continuity_state: input.audit_chain_continuity_state ?? "VERIFIED",
    audit_chain_continuity_ref: "audit-chain://pc0199/restore",
  };

  if (state === "PENDING_RECONCILIATION") {
    return withPrivacyHash({
      ...base,
      resurrected_data_posture: "UNKNOWN_UNTIL_RECONCILED",
      resurrected_subject_count_or_null: null,
      compensating_re_erasure_state: "NOT_REQUIRED",
      compensating_re_erasure_workflow_ref_or_null: null,
      compensating_re_erasure_audit_ref_or_null: null,
      legal_hold_ref_or_null: null,
      proof_preservation_basis_ref_or_null: null,
      authority_ambiguity_ref_or_null: null,
      audit_chain_continuity_state: input.audit_chain_continuity_state ?? "FAILED",
      replay_limitation_state: "FAILED",
      enquiry_limitation_state: "FAILED",
      reopen_access_state: "BLOCKED",
      reconciliation_decided_at_or_null: null,
      re_erasure_completed_at_or_null: null,
    });
  }

  if (state === "RECONCILED_NO_COMPENSATION_REQUIRED") {
    return withPrivacyHash({
      ...base,
      resurrected_data_posture: "NONE_DETECTED",
      resurrected_subject_count_or_null: 0,
      compensating_re_erasure_state: "NOT_REQUIRED",
      compensating_re_erasure_workflow_ref_or_null: null,
      compensating_re_erasure_audit_ref_or_null: null,
      legal_hold_ref_or_null: null,
      proof_preservation_basis_ref_or_null: null,
      authority_ambiguity_ref_or_null: null,
      replay_limitation_state: "VERIFIED",
      enquiry_limitation_state: "VERIFIED",
      reopen_access_state: "READY_FOR_REOPEN",
      reconciliation_decided_at_or_null: "2026-05-05T09:20:00Z",
      re_erasure_completed_at_or_null: null,
    });
  }

  const compensatingState = {
    COMPENSATING_RE_ERASURE_REQUIRED: "REQUIRED_PENDING",
    COMPENSATING_RE_ERASURE_IN_PROGRESS: "IN_PROGRESS",
    RECONCILED_WITH_COMPENSATING_RE_ERASURE: "COMPLETED",
    BLOCKED_LEGAL_HOLD: "BLOCKED",
    BLOCKED_PROOF_PRESERVATION: "BLOCKED",
    BLOCKED_AUTHORITY_AMBIGUITY: "BLOCKED",
  }[state];
  return withPrivacyHash({
    ...base,
    resurrected_data_posture: "ERASURE_OR_PSEUDONYMISATION_RESURRECTED",
    resurrected_subject_count_or_null: 2,
    compensating_re_erasure_state: compensatingState,
    compensating_re_erasure_workflow_ref_or_null: "workflow://pc0199/re-erasure",
    compensating_re_erasure_audit_ref_or_null: "audit://pc0199/re-erasure",
    legal_hold_ref_or_null: state === "BLOCKED_LEGAL_HOLD" ? "legal-hold://pc0199" : null,
    proof_preservation_basis_ref_or_null:
      state === "BLOCKED_PROOF_PRESERVATION" ? "proof-preservation://pc0199" : null,
    authority_ambiguity_ref_or_null:
      state === "BLOCKED_AUTHORITY_AMBIGUITY" ? "authority-ambiguity://pc0199" : null,
    replay_limitation_state:
      state === "BLOCKED_LEGAL_HOLD" ||
      state === "BLOCKED_PROOF_PRESERVATION" ||
      state === "BLOCKED_AUTHORITY_AMBIGUITY"
        ? "LIMITED_RECONCILED"
        : "VERIFIED",
    enquiry_limitation_state:
      state === "BLOCKED_LEGAL_HOLD" ||
      state === "BLOCKED_PROOF_PRESERVATION" ||
      state === "BLOCKED_AUTHORITY_AMBIGUITY"
        ? "LIMITED_RECONCILED"
        : "VERIFIED",
    reopen_access_state:
      state === "BLOCKED_LEGAL_HOLD" ||
      state === "BLOCKED_PROOF_PRESERVATION" ||
      state === "BLOCKED_AUTHORITY_AMBIGUITY"
        ? "LIMITED"
        : state === "RECONCILED_WITH_COMPENSATING_RE_ERASURE"
          ? "READY_FOR_REOPEN"
          : "BLOCKED",
    reconciliation_decided_at_or_null: "2026-05-05T09:20:00Z",
    re_erasure_completed_at_or_null:
      state === "RECONCILED_WITH_COMPENSATING_RE_ERASURE"
        ? "2026-05-05T09:25:00Z"
        : null,
  });
}

export function requestedCheckpointFixture() {
  return registerRecoveryCheckpoint({
    checkpoint_id: checkpointId,
    datastore_ref: datastoreRef,
    protected_workload_class: "CONTROL_PLANE_LEGAL_TRUTH",
    transition_applied_at: "2026-05-05T09:00:00Z",
    transition_audit_ref: "audit://pc0199/checkpoint-requested",
  });
}

export function createdCheckpointFixture(): RecoveryCheckpointRecord {
  return transitionRecoveryCheckpoint({
    checkpoint: requestedCheckpointFixture(),
    event_code: "snapshot_complete",
    backup_ref: "backup://pc0199/control-plane/001",
    checkpoint_inventory_ref: "checkpoint-inventory://pc0199/control-plane/001",
    snapshot_time: "2026-05-05T09:05:00Z",
    transition_applied_at: "2026-05-05T09:06:00Z",
    transition_audit_ref: "audit://pc0199/snapshot-complete",
  });
}
