import {
  computeRecoveryCheckpointReopenReadinessState,
  normalizeRecoveryCheckpointRecord,
  RecoveryCheckpointModelError,
  type RecoveryCheckpointRecord,
  type ReopenReadinessState,
} from "../../../backend-recovery/src/index.ts";

export type CheckpointReopenReadinessReport = {
  checkpoint_id: string;
  checkpoint_state: RecoveryCheckpointRecord["checkpoint_state"];
  expected_reopen_readiness_state: ReopenReadinessState;
  actual_reopen_readiness_state: ReopenReadinessState;
  reopen_allowed: boolean;
  blocker_state_or_null: Exclude<ReopenReadinessState, "READY_FOR_REOPEN"> | null;
  recovery_tier_class: RecoveryCheckpointRecord["recovery_governance_contract"]["recovery_tier_class"];
  rpo_class: RecoveryCheckpointRecord["rpo_class"];
  rto_class: RecoveryCheckpointRecord["rto_class"];
};

export function validateCheckpointReopenReadiness(
  checkpoint: RecoveryCheckpointRecord,
): CheckpointReopenReadinessReport {
  const normalized = normalizeRecoveryCheckpointRecord(checkpoint);
  const expectedReadiness =
    computeRecoveryCheckpointReopenReadinessState(normalized);
  if (normalized.reopen_readiness_state !== expectedReadiness) {
    throw new RecoveryCheckpointModelError(
      "RECOVERY_CHECKPOINT_REOPEN_INVALID",
      `reopen_readiness_state must be ${expectedReadiness} for the current checkpoint evidence`,
    );
  }
  return {
    checkpoint_id: normalized.checkpoint_id,
    checkpoint_state: normalized.checkpoint_state,
    expected_reopen_readiness_state: expectedReadiness,
    actual_reopen_readiness_state: normalized.reopen_readiness_state,
    reopen_allowed:
      normalized.checkpoint_state === "VERIFIED" &&
      normalized.reopen_readiness_state === "READY_FOR_REOPEN",
    blocker_state_or_null:
      expectedReadiness === "READY_FOR_REOPEN" ? null : expectedReadiness,
    recovery_tier_class:
      normalized.recovery_governance_contract.recovery_tier_class,
    rpo_class: normalized.rpo_class,
    rto_class: normalized.rto_class,
  };
}

export function assertCheckpointReadyForReopen(
  checkpoint: RecoveryCheckpointRecord,
) {
  const report = validateCheckpointReopenReadiness(checkpoint);
  if (!report.reopen_allowed) {
    throw new RecoveryCheckpointModelError(
      "RECOVERY_CHECKPOINT_REOPEN_INVALID",
      `checkpoint ${report.checkpoint_id} is blocked by ${report.blocker_state_or_null}`,
    );
  }
  return report;
}
