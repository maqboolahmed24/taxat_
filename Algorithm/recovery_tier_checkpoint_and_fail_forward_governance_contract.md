# Recovery Tier, Checkpoint, and Fail-Forward Governance Contract

## Purpose

Recovery posture SHALL be a machine-bound control contract, not a runbook-only promise. The platform
must be able to prove which workloads are Tier 0 control-plane truth, which artifacts are
inventory-linked restore checkpoints, when post-restore reopen is still blocked, and when release
rollback is no longer lawful and must become explicit fail-forward governance.
This includes an explicit checkpoint reopen boundary for restored truth-bearing workloads.

## Shared recovery-governance boundary

`recovery_governance_contract{...}` is the shared contract boundary for:

- `RecoveryCheckpoint`
- `DeploymentRelease`

The shared contract freezes:

- `boundary_scope`
- `protected_workload_class`
- `recovery_tier_class`
- exact `rpo_class` / `rto_class`
- checkpoint inventory policy
- verified-checkpoint evidence policy
- post-restore privacy reconciliation policy
- compensating re-erasure policy
- replay-safe and enquiry-safe limitation reconciliation policy
- durable queue-rebuild policy
- authority-mutation lineage and binding-revalidation policy
- post-restore reopen gate policy
- rollback-boundary policy
- fail-forward governance policy
- failover/failback auditability policy

Tier mapping is authoritative and machine-enforced:

- `CONTROL_PLANE_LEGAL_TRUTH` -> `TIER_0_CONTROL_PLANE`, `RPO_15M`, `RTO_60M`
- `REBUILDABLE_PROJECTION` -> `TIER_1_REBUILDABLE`, `RPO_4H`, `RTO_4H`
- `DISPOSABLE_RUNTIME_CACHE` -> `TIER_2_DISPOSABLE`, `RPO_BEST_EFFORT`, `RTO_24H`

No control-plane checkpoint or release may serialize a weaker tier than the workload class allows.

## Recovery checkpoint law

`RecoveryCheckpoint` is the authoritative restoreability control object. It SHALL retain:

- one bound `recovery_governance_contract{...}`
- one `checkpoint_inventory_ref`
- bound restore-drill lineage through `restore_drill_ref` and `restore_verification_hash`
- explicit `audit_continuity_verified`
- explicit `queue_rebuild_verified`
- explicit `authority_rebuild_verified`
- explicit `authority_binding_revalidation_verified`
- one bound `privacy_reconciliation_contract{...}`
- explicit privacy reconciliation outcome
- one typed `reopen_readiness_state`

`checkpoint_state = VERIFIED` is lawful only when:

- restore evidence is bound to the exact checkpoint
- privacy reconciliation is complete
- audit continuity is verified
- queue rebuild is verified from durable truth
- authority rebuild and binding revalidation are complete
- replay-safe and enquiry-safe limitation posture is verified
- `reopen_readiness_state = READY_FOR_REOPEN`

`checkpoint_state = CREATED` may retain partial restore evidence only while
`reopen_readiness_state` names the exact blocker:

- `BLOCKED_PENDING_RESTORE_DRILL`
- `BLOCKED_PENDING_PRIVACY_RECONCILIATION`
- `BLOCKED_PENDING_COMPENSATING_RE_ERASURE`
- `BLOCKED_PENDING_LIMITATION_RECONCILIATION`
- `BLOCKED_LEGAL_HOLD_REVIEW`
- `BLOCKED_PROOF_PRESERVATION_REVIEW`
- `BLOCKED_AUTHORITY_AMBIGUITY_REVIEW`
- `BLOCKED_PENDING_AUDIT_CONTINUITY`
- `BLOCKED_PENDING_QUEUE_REBUILD`
- `BLOCKED_PENDING_AUTHORITY_REVALIDATION`

This closes the failure mode where restore passed mechanically but the environment reopened before
privacy, audit, queue, or authority safety checks were complete.

## Restore privacy reconciliation law

`RestorePrivacyReconciliationContract` is the authoritative post-restore privacy control boundary.
It SHALL retain:

- exact `checkpoint_ref` and `restore_drill_ref`
- one `reconciliation_contract_hash`
- explicit resurrected-data posture and typed subject count
- one typed `privacy_reconciliation_state`
- one typed compensating re-erasure workflow and audit lineage when resurrected restricted data exists
- explicit legal-hold, proof-preservation, and authority-ambiguity blockers
- explicit `audit_chain_continuity_state`
- explicit replay-safe and enquiry-safe limitation posture
- one typed `reopen_access_state`

Restore evidence is not lawful production evidence until this contract reaches either
`RECONCILED_NO_COMPENSATION_REQUIRED` or `RECONCILED_WITH_COMPENSATING_RE_ERASURE`. Blocked states
remain explicit legal posture, not operator notes:

- `BLOCKED_LEGAL_HOLD`
- `BLOCKED_PROOF_PRESERVATION`
- `BLOCKED_AUTHORITY_AMBIGUITY`

Those blocked states keep reopened access limited, preserve the compensating cleanup workflow and
audit lineage, and prevent the platform from silently treating resurrected erased-path data as
ordinary restore success.

## Queue and authority recovery law

Broker or queue loss SHALL be treated as transport loss, not truth loss.

- Queues are rebuilt from durable outbox, inbox, receipt, interaction, submission, workflow, and
  audit truth.
- Recovery SHALL NOT blindly replay live authority mutations from transport artifacts alone.
- Reopened authority work requires explicit lineage comparison and binding revalidation.

The shared contract therefore pins:

- `queue_recovery_policy = QUEUES_REBUILT_FROM_DURABLE_TRUTH_ONLY`
- `authority_recovery_policy = AUTHORITY_MUTATIONS_REQUIRE_LINEAGE_AND_BINDING_REVALIDATION`

## Rollback and fail-forward law

`DeploymentRelease` is the authoritative rollout-governance object. It SHALL retain:

- one bound `recovery_governance_contract{...}`
- one explicit `rollback_boundary_state`
- optional `rollback_of_release_id`
- optional `compensating_release_id_or_null`
- optional `fail_forward_owner_ref_or_null`
- rollback and fail-forward runbook refs

The law is:

- `rollback_boundary_state = ROLLBACK_ALLOWED` only while the schema reader window remains
  rollback-compatible
- `rollback_boundary_state = FAIL_FORWARD_ONLY` once the compatibility window is closed or rollback
  safety is otherwise broken
- `rollout_state = ROLLED_BACK` is rejected when `rollback_boundary_state = FAIL_FORWARD_ONLY`
- `rollout_state = FAILED_FORWARD` requires:
  - `compensating_release_id_or_null`
  - `fail_forward_owner_ref_or_null`
  - fail-forward runbook lineage

This closes the failure mode where operators could declare fail-forward without a named owner or
without explicit compensating-release governance.

## Validation coverage

Validation must fail closed for at least these cases:

- control-plane workloads serialized with weaker recovery tiers
- verified checkpoints without bound restore evidence
- reopen claims before privacy reconciliation or audit continuity
- queue or broker recovery that lacks durable-truth rebuild verification
- authority recovery without rebuild or binding revalidation
- rollback attempts after the reader window is closed
- fail-forward posture without compensating-release or operator-owner linkage
- canary aborts that do not preserve explicit rollback-safe posture
