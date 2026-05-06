import {
  RECOVERY_GOVERNANCE_CONTRACT_VERSION,
  RECOVERY_TIER_BY_PROTECTED_WORKLOAD_CLASS,
  type ProtectedWorkloadClass,
  type RecoveryGovernanceContract,
  type RecoveryTierClass,
  type RpoClass,
  type RtoClass,
  RecoveryCheckpointModelError,
  normalizeRecoveryGovernanceContract,
} from "../models/recovery_checkpoint.ts";

export type BuildRecoveryGovernanceContractInput = {
  protected_workload_class: ProtectedWorkloadClass;
  attempted_recovery_tier_class?: RecoveryTierClass;
  attempted_rpo_class?: RpoClass;
  attempted_rto_class?: RtoClass;
};

export function buildRecoveryGovernanceContract(
  input: BuildRecoveryGovernanceContractInput,
): RecoveryGovernanceContract {
  const mapping = RECOVERY_TIER_BY_PROTECTED_WORKLOAD_CLASS[input.protected_workload_class];
  if (
    (input.attempted_recovery_tier_class !== undefined &&
      input.attempted_recovery_tier_class !== mapping.recovery_tier_class) ||
    (input.attempted_rpo_class !== undefined && input.attempted_rpo_class !== mapping.rpo_class) ||
    (input.attempted_rto_class !== undefined && input.attempted_rto_class !== mapping.rto_class)
  ) {
    throw new RecoveryCheckpointModelError(
      "RECOVERY_CHECKPOINT_TIER_INVALID",
      "protected_workload_class cannot be serialized with a weaker or mismatched recovery tier, RPO, or RTO",
    );
  }

  return normalizeRecoveryGovernanceContract(
    {
      contract_version: RECOVERY_GOVERNANCE_CONTRACT_VERSION,
      boundary_scope: "RECOVERY_CHECKPOINT",
      protected_workload_class: input.protected_workload_class,
      recovery_tier_class: mapping.recovery_tier_class,
      rpo_class: mapping.rpo_class,
      rto_class: mapping.rto_class,
      boundary_specific_binding_policy:
        "CHECKPOINT_RETAINS_INVENTORY_RESTORE_EVIDENCE_AND_REOPEN_GATES",
      checkpoint_inventory_policy: "CHECKPOINTS_REQUIRED_AND_INVENTORY_LINKED",
      checkpoint_evidence_policy: "VERIFIED_CHECKPOINT_REQUIRES_BOUND_RESTORE_DRILL",
      privacy_reconciliation_policy:
        "POST_RESTORE_PRIVACY_RECONCILIATION_REQUIRED_BEFORE_REOPEN",
      compensating_re_erasure_policy:
        "RESURRECTED_RESTRICTED_DATA_REQUIRES_TYPED_COMPENSATING_RE_ERASURE",
      limitation_reconciliation_policy:
        "REPLAY_AND_ENQUIRY_LIMITATIONS_MUST_REMAIN_REOPEN_SAFE",
      queue_recovery_policy: "QUEUES_REBUILT_FROM_DURABLE_TRUTH_ONLY",
      authority_recovery_policy:
        "AUTHORITY_MUTATIONS_REQUIRE_LINEAGE_AND_BINDING_REVALIDATION",
      reopen_gate_policy: "REOPEN_BLOCKED_UNTIL_RESTORE_PRIVACY_AUDIT_QUEUE_AND_AUTHORITY_PASS",
      rollback_boundary_policy: "ROLLBACK_ONLY_WHILE_SCHEMA_WINDOW_COMPATIBLE",
      fail_forward_policy: "FAIL_FORWARD_REQUIRES_COMPENSATING_RELEASE_AND_OWNER",
      failover_audit_policy: "FAILOVER_AND_FAILBACK_REQUIRE_AUDITABLE_OWNER",
    },
    {
      boundary_scope: "RECOVERY_CHECKPOINT",
      rpo_class: mapping.rpo_class,
      rto_class: mapping.rto_class,
    },
  );
}
