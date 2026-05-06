import {
  RECOVERY_TIER_BY_PROTECTED_WORKLOAD_CLASS,
  buildRecoveryCheckpointStateTransitionContract,
  normalizeRecoveryCheckpointRecord,
  requireTrimmedString,
  type ProtectedWorkloadClass,
  type RecoveryCheckpointRecord,
  type RecoveryTierClass,
  type RpoClass,
  type RtoClass,
} from "../models/recovery_checkpoint.ts";
import { buildRecoveryGovernanceContract } from "./build_recovery_governance_contract.ts";

export type RegisterRecoveryCheckpointInput = {
  checkpoint_id: string;
  datastore_ref: string;
  protected_workload_class: ProtectedWorkloadClass;
  transition_applied_at: string;
  transition_audit_ref: string;
  attempted_recovery_tier_class?: RecoveryTierClass;
  attempted_rpo_class?: RpoClass;
  attempted_rto_class?: RtoClass;
};

export function registerRecoveryCheckpoint(
  input: RegisterRecoveryCheckpointInput,
): RecoveryCheckpointRecord {
  const recoveryGovernanceContract = buildRecoveryGovernanceContract(input);
  const mapping = RECOVERY_TIER_BY_PROTECTED_WORKLOAD_CLASS[input.protected_workload_class];
  return normalizeRecoveryCheckpointRecord({
    checkpoint_id: requireTrimmedString("recovery_checkpoint.checkpoint_id", input.checkpoint_id),
    datastore_ref: requireTrimmedString("recovery_checkpoint.datastore_ref", input.datastore_ref),
    recovery_governance_contract: recoveryGovernanceContract,
    backup_ref: null,
    checkpoint_inventory_ref: null,
    snapshot_time: null,
    restore_tested_at: null,
    restore_verification_hash: null,
    rpo_class: mapping.rpo_class,
    rto_class: mapping.rto_class,
    checkpoint_state: "REQUESTED",
    state_transition_contract: buildRecoveryCheckpointStateTransitionContract({
      current_state: "REQUESTED",
      previous_state_or_null: null,
      transition_event_code: "checkpoint_requested",
      transition_applied_at: input.transition_applied_at,
      transition_audit_ref: input.transition_audit_ref,
    }),
    restore_drill_ref: null,
    privacy_reconciliation_contract: null,
    audit_continuity_verified: false,
    queue_rebuild_verified: false,
    authority_rebuild_verified: false,
    authority_binding_revalidation_verified: false,
    privacy_reconciliation_outcome_ref: null,
    reopen_readiness_state: "BLOCKED_PENDING_CHECKPOINT_CREATION",
    quarantine_reason_code: null,
  });
}
