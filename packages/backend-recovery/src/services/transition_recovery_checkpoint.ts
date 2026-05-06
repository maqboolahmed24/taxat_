import {
  buildRecoveryCheckpointStateTransitionContract,
  computeRecoveryCheckpointReopenReadinessState,
  getNextRecoveryCheckpointState,
  normalizeRecoveryCheckpointRecord,
  requireTrimmedString,
  type RecoveryCheckpointQuarantineReasonCode,
  type RecoveryCheckpointRecord,
  type RestorePrivacyReconciliationContract,
} from "../models/recovery_checkpoint.ts";

type TransitionBase = {
  checkpoint: RecoveryCheckpointRecord;
  transition_applied_at: string;
  transition_audit_ref: string;
};

type VerifiedRestoreEvidenceInput = {
  restore_drill_ref: string;
  restore_tested_at: string;
  restore_verification_hash: string;
  privacy_reconciliation_contract: RestorePrivacyReconciliationContract;
  audit_continuity_verified: boolean;
  queue_rebuild_verified: boolean;
  authority_rebuild_verified: boolean;
  authority_binding_revalidation_verified: boolean;
};

export type TransitionRecoveryCheckpointInput =
  | (TransitionBase & {
      event_code: "snapshot_complete";
      backup_ref: string;
      checkpoint_inventory_ref: string;
      snapshot_time: string;
    })
  | (TransitionBase &
      VerifiedRestoreEvidenceInput & {
        event_code: "restore_drill_passed" | "remediation_and_redrill_passed";
      })
  | (TransitionBase & {
      event_code: "restore_drill_failed";
      restore_drill_ref: string;
      restore_tested_at: string;
      restore_verification_hash: string;
      privacy_reconciliation_contract: RestorePrivacyReconciliationContract;
      quarantine_reason_code?: RecoveryCheckpointQuarantineReasonCode;
      audit_continuity_verified?: boolean;
      queue_rebuild_verified?: boolean;
      authority_rebuild_verified?: boolean;
      authority_binding_revalidation_verified?: boolean;
    })
  | (TransitionBase & {
      event_code: "privacy_reconciliation_failed";
      privacy_reconciliation_contract: RestorePrivacyReconciliationContract;
      quarantine_reason_code?: RecoveryCheckpointQuarantineReasonCode;
      audit_continuity_verified?: boolean;
      queue_rebuild_verified?: boolean;
      authority_rebuild_verified?: boolean;
      authority_binding_revalidation_verified?: boolean;
    })
  | (TransitionBase & {
      event_code: "retention_elapsed";
    });

function applyTransitionContract(
  current: RecoveryCheckpointRecord,
  next: RecoveryCheckpointRecord,
  input: Pick<TransitionRecoveryCheckpointInput, "event_code" | "transition_applied_at" | "transition_audit_ref">,
) {
  return {
    ...next,
    state_transition_contract: buildRecoveryCheckpointStateTransitionContract({
      current_state: next.checkpoint_state,
      previous_state_or_null: current.checkpoint_state,
      transition_event_code: input.event_code,
      transition_applied_at: input.transition_applied_at,
      transition_audit_ref: input.transition_audit_ref,
    }),
  };
}

function withComputedReadiness(record: RecoveryCheckpointRecord): RecoveryCheckpointRecord {
  return {
    ...record,
    reopen_readiness_state: computeRecoveryCheckpointReopenReadinessState(record),
  };
}

function outcomeRef(contract: RestorePrivacyReconciliationContract) {
  return requireTrimmedString(
    "privacy_reconciliation_contract.privacy_reconciliation_outcome_ref",
    contract.privacy_reconciliation_outcome_ref,
  );
}

export function transitionRecoveryCheckpoint(
  input: TransitionRecoveryCheckpointInput,
): RecoveryCheckpointRecord {
  const current = normalizeRecoveryCheckpointRecord(input.checkpoint);
  const nextState = getNextRecoveryCheckpointState(current.checkpoint_state, input.event_code);

  switch (input.event_code) {
    case "snapshot_complete": {
      const next = withComputedReadiness({
        ...current,
        backup_ref: input.backup_ref,
        checkpoint_inventory_ref: input.checkpoint_inventory_ref,
        snapshot_time: input.snapshot_time,
        restore_tested_at: null,
        restore_verification_hash: null,
        checkpoint_state: nextState,
        restore_drill_ref: null,
        privacy_reconciliation_contract: null,
        audit_continuity_verified: false,
        queue_rebuild_verified: false,
        authority_rebuild_verified: false,
        authority_binding_revalidation_verified: false,
        privacy_reconciliation_outcome_ref: null,
        quarantine_reason_code: null,
      });
      return normalizeRecoveryCheckpointRecord(applyTransitionContract(current, next, input));
    }
    case "restore_drill_passed":
    case "remediation_and_redrill_passed": {
      const next = withComputedReadiness({
        ...current,
        restore_drill_ref: input.restore_drill_ref,
        restore_tested_at: input.restore_tested_at,
        restore_verification_hash: input.restore_verification_hash,
        checkpoint_state: nextState,
        privacy_reconciliation_contract: input.privacy_reconciliation_contract,
        audit_continuity_verified: input.audit_continuity_verified,
        queue_rebuild_verified: input.queue_rebuild_verified,
        authority_rebuild_verified: input.authority_rebuild_verified,
        authority_binding_revalidation_verified:
          input.authority_binding_revalidation_verified,
        privacy_reconciliation_outcome_ref: outcomeRef(input.privacy_reconciliation_contract),
        quarantine_reason_code: null,
      });
      return normalizeRecoveryCheckpointRecord(applyTransitionContract(current, next, input));
    }
    case "restore_drill_failed": {
      const next = withComputedReadiness({
        ...current,
        restore_drill_ref: input.restore_drill_ref,
        restore_tested_at: input.restore_tested_at,
        restore_verification_hash: input.restore_verification_hash,
        checkpoint_state: nextState,
        privacy_reconciliation_contract: input.privacy_reconciliation_contract,
        audit_continuity_verified: input.audit_continuity_verified ?? false,
        queue_rebuild_verified: input.queue_rebuild_verified ?? false,
        authority_rebuild_verified: input.authority_rebuild_verified ?? false,
        authority_binding_revalidation_verified:
          input.authority_binding_revalidation_verified ?? false,
        privacy_reconciliation_outcome_ref: outcomeRef(input.privacy_reconciliation_contract),
        quarantine_reason_code: input.quarantine_reason_code ?? "RESTORE_DRILL_FAILED",
      });
      return normalizeRecoveryCheckpointRecord(applyTransitionContract(current, next, input));
    }
    case "privacy_reconciliation_failed": {
      const next = withComputedReadiness({
        ...current,
        checkpoint_state: nextState,
        privacy_reconciliation_contract: input.privacy_reconciliation_contract,
        audit_continuity_verified:
          input.audit_continuity_verified ?? current.audit_continuity_verified,
        queue_rebuild_verified: input.queue_rebuild_verified ?? current.queue_rebuild_verified,
        authority_rebuild_verified:
          input.authority_rebuild_verified ?? current.authority_rebuild_verified,
        authority_binding_revalidation_verified:
          input.authority_binding_revalidation_verified ??
          current.authority_binding_revalidation_verified,
        privacy_reconciliation_outcome_ref: outcomeRef(input.privacy_reconciliation_contract),
        quarantine_reason_code: input.quarantine_reason_code ?? "PRIVACY_RECONCILIATION_FAILED",
      });
      return normalizeRecoveryCheckpointRecord(applyTransitionContract(current, next, input));
    }
    case "retention_elapsed": {
      const next = withComputedReadiness({
        ...current,
        checkpoint_state: nextState,
        quarantine_reason_code: null,
      });
      return normalizeRecoveryCheckpointRecord(applyTransitionContract(current, next, input));
    }
  }
}
