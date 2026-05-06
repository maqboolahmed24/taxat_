import {
  RecoveryCheckpointModelError,
  computeRecoveryCheckpointReopenReadinessState,
  normalizeRecoveryCheckpointRecord,
  requireTrimmedString,
  type RecoveryCheckpointRecord,
  type RestorePrivacyReconciliationContract,
} from "../models/recovery_checkpoint.ts";

export type BindRestoreDrillEvidenceInput = {
  checkpoint: RecoveryCheckpointRecord;
  restore_drill_ref: string;
  restore_tested_at: string;
  restore_verification_hash: string;
  privacy_reconciliation_contract: RestorePrivacyReconciliationContract;
  audit_continuity_verified?: boolean;
  queue_rebuild_verified?: boolean;
  authority_rebuild_verified?: boolean;
  authority_binding_revalidation_verified?: boolean;
};

export function bindRestoreDrillEvidence(
  input: BindRestoreDrillEvidenceInput,
): RecoveryCheckpointRecord {
  const current = normalizeRecoveryCheckpointRecord(input.checkpoint);
  if (current.checkpoint_state !== "CREATED") {
    throw new RecoveryCheckpointModelError(
      "RECOVERY_CHECKPOINT_EVIDENCE_INVALID",
      "restore-drill evidence can be bound only to CREATED checkpoints; other states require a named lifecycle transition",
    );
  }
  const next: RecoveryCheckpointRecord = {
    ...current,
    restore_drill_ref: requireTrimmedString(
      "recovery_checkpoint.restore_drill_ref",
      input.restore_drill_ref,
    ),
    restore_tested_at: input.restore_tested_at,
    restore_verification_hash: requireTrimmedString(
      "recovery_checkpoint.restore_verification_hash",
      input.restore_verification_hash,
    ),
    privacy_reconciliation_contract: input.privacy_reconciliation_contract,
    audit_continuity_verified: input.audit_continuity_verified ?? false,
    queue_rebuild_verified: input.queue_rebuild_verified ?? false,
    authority_rebuild_verified: input.authority_rebuild_verified ?? false,
    authority_binding_revalidation_verified:
      input.authority_binding_revalidation_verified ?? false,
    privacy_reconciliation_outcome_ref:
      input.privacy_reconciliation_contract.privacy_reconciliation_outcome_ref,
    quarantine_reason_code: null,
    reopen_readiness_state: "BLOCKED_PENDING_PRIVACY_RECONCILIATION",
  };
  return normalizeRecoveryCheckpointRecord({
    ...next,
    reopen_readiness_state: computeRecoveryCheckpointReopenReadinessState(next),
  });
}
