import {
  RecoveryCheckpointModelError,
  normalizeRecoveryCheckpointRecord,
  type RecoveryCheckpointQuarantineReasonCode,
  type RecoveryCheckpointRecord,
  type RestorePrivacyReconciliationContract,
} from "../models/recovery_checkpoint.ts";
import { transitionRecoveryCheckpoint } from "./transition_recovery_checkpoint.ts";

export type QuarantineRecoveryCheckpointInput = {
  checkpoint: RecoveryCheckpointRecord;
  transition_applied_at: string;
  transition_audit_ref: string;
  quarantine_reason_code?: RecoveryCheckpointQuarantineReasonCode;
  restore_drill_ref?: string;
  restore_tested_at?: string;
  restore_verification_hash?: string;
  privacy_reconciliation_contract?: RestorePrivacyReconciliationContract;
  audit_continuity_verified?: boolean;
  queue_rebuild_verified?: boolean;
  authority_rebuild_verified?: boolean;
  authority_binding_revalidation_verified?: boolean;
};

function requireExistingEvidence(
  checkpoint: RecoveryCheckpointRecord,
  input: QuarantineRecoveryCheckpointInput,
) {
  const restoreDrillRef = input.restore_drill_ref ?? checkpoint.restore_drill_ref;
  const restoreTestedAt = input.restore_tested_at ?? checkpoint.restore_tested_at;
  const restoreVerificationHash =
    input.restore_verification_hash ?? checkpoint.restore_verification_hash;
  const privacyContract =
    input.privacy_reconciliation_contract ?? checkpoint.privacy_reconciliation_contract;
  if (
    restoreDrillRef === null ||
    restoreDrillRef === undefined ||
    restoreTestedAt === null ||
    restoreTestedAt === undefined ||
    restoreVerificationHash === null ||
    restoreVerificationHash === undefined ||
    privacyContract === null ||
    privacyContract === undefined
  ) {
    throw new RecoveryCheckpointModelError(
      "RECOVERY_CHECKPOINT_QUARANTINE_INVALID",
      "quarantine requires failing restore-drill evidence and privacy evidence to remain bound",
    );
  }
  return {
    restoreDrillRef,
    restoreTestedAt,
    restoreVerificationHash,
    privacyContract,
  };
}

export function quarantineRecoveryCheckpoint(
  input: QuarantineRecoveryCheckpointInput,
): RecoveryCheckpointRecord {
  const current = normalizeRecoveryCheckpointRecord(input.checkpoint);
  const evidence = requireExistingEvidence(current, input);
  if (current.checkpoint_state === "CREATED") {
    return transitionRecoveryCheckpoint({
      checkpoint: current,
      event_code: "restore_drill_failed",
      transition_applied_at: input.transition_applied_at,
      transition_audit_ref: input.transition_audit_ref,
      restore_drill_ref: evidence.restoreDrillRef,
      restore_tested_at: evidence.restoreTestedAt,
      restore_verification_hash: evidence.restoreVerificationHash,
      privacy_reconciliation_contract: evidence.privacyContract,
      audit_continuity_verified: input.audit_continuity_verified ?? current.audit_continuity_verified,
      queue_rebuild_verified: input.queue_rebuild_verified ?? current.queue_rebuild_verified,
      authority_rebuild_verified:
        input.authority_rebuild_verified ?? current.authority_rebuild_verified,
      authority_binding_revalidation_verified:
        input.authority_binding_revalidation_verified ??
        current.authority_binding_revalidation_verified,
      quarantine_reason_code: input.quarantine_reason_code ?? "RESTORE_DRILL_FAILED",
    });
  }
  if (current.checkpoint_state === "VERIFIED") {
    return transitionRecoveryCheckpoint({
      checkpoint: current,
      event_code: "privacy_reconciliation_failed",
      transition_applied_at: input.transition_applied_at,
      transition_audit_ref: input.transition_audit_ref,
      privacy_reconciliation_contract: evidence.privacyContract,
      audit_continuity_verified: input.audit_continuity_verified ?? current.audit_continuity_verified,
      queue_rebuild_verified: input.queue_rebuild_verified ?? current.queue_rebuild_verified,
      authority_rebuild_verified:
        input.authority_rebuild_verified ?? current.authority_rebuild_verified,
      authority_binding_revalidation_verified:
        input.authority_binding_revalidation_verified ??
        current.authority_binding_revalidation_verified,
      quarantine_reason_code: input.quarantine_reason_code ?? "PRIVACY_RECONCILIATION_FAILED",
    });
  }
  throw new RecoveryCheckpointModelError(
    "RECOVERY_CHECKPOINT_QUARANTINE_INVALID",
    `checkpoint_state=${current.checkpoint_state} cannot be quarantined without a legal named transition`,
  );
}
