# Recovery Checkpoint Model And Tiered Open/Close Rules

This document records the implementation decisions for `pc_0199`.

## Authoritative Objects

The recovery checkpoint package is `packages/backend-recovery`.

- `RecoveryCheckpointRecord` is defined in `packages/backend-recovery/src/models/recovery_checkpoint.ts`.
- `RecoveryCheckpointRepository` keeps append-friendly, row-versioned writes and query indexes by `datastore_ref`, `snapshot_time`, and `checkpoint_state`.
- The model validates the bound `recovery_governance_contract`, `state_transition_contract`, and `privacy_reconciliation_contract` before a checkpoint can be persisted by the repository or returned by a transition service.

The package was created for this task because `packages/backend-recovery` did not previously exist. Its workspace status is `ASSUMPTION_BACKEND_RECOVERY_PACKAGE_CREATED`.

## Workload Tier Mapping

The model uses the schema-backed mapping from `recovery_governance_contract.schema.json`:

| protected_workload_class | recovery_tier_class | rpo_class | rto_class |
| --- | --- | --- | --- |
| `CONTROL_PLANE_LEGAL_TRUTH` | `TIER_0_CONTROL_PLANE` | `RPO_15M` | `RTO_60M` |
| `REBUILDABLE_PROJECTION` | `TIER_1_REBUILDABLE` | `RPO_4H` | `RTO_4H` |
| `DISPOSABLE_RUNTIME_CACHE` | `TIER_2_DISPOSABLE` | `RPO_BEST_EFFORT` | `RTO_24H` |

`buildRecoveryGovernanceContract` fails closed if a caller attempts to serialize a mismatched or weaker tier, RPO, or RTO. Checkpoints always bind `boundary_scope=RECOVERY_CHECKPOINT` and `boundary_specific_binding_policy=CHECKPOINT_RETAINS_INVENTORY_RESTORE_EVIDENCE_AND_REOPEN_GATES`.

## State Machine

The implementation keeps the exact state/event tuples from `state_machines.md` and `validate_contracts.py`.

| Event | Legal previous state | New state |
| --- | --- | --- |
| `checkpoint_requested` | `null` | `REQUESTED` |
| `snapshot_complete` | `REQUESTED` | `CREATED` |
| `restore_drill_passed` | `CREATED` | `VERIFIED` |
| `restore_drill_failed` | `CREATED` | `QUARANTINED` |
| `privacy_reconciliation_failed` | `VERIFIED` | `QUARANTINED` |
| `remediation_and_redrill_passed` | `QUARANTINED` | `VERIFIED` |
| `retention_elapsed` | `CREATED`, `VERIFIED`, `QUARANTINED` | `EXPIRED` |

Every state change writes a `STATE_TRANSITION_CONTRACT_V1` contract with `object_family=RECOVERY_CHECKPOINT`, `machine_code=RECOVERY_CHECKPOINT_LIFECYCLE_V1`, `state_field_name=checkpoint_state`, and the shared fail-closed lifecycle policies.

## Reopen Readiness Precedence

`computeRecoveryCheckpointReopenReadinessState` persists one authoritative blocker field on every write. The blocker precedence is:

1. `REQUESTED` -> `BLOCKED_PENDING_CHECKPOINT_CREATION`
2. missing restore evidence -> `BLOCKED_PENDING_RESTORE_DRILL`
3. missing or pending privacy reconciliation -> `BLOCKED_PENDING_PRIVACY_RECONCILIATION`
4. open compensating re-erasure -> `BLOCKED_PENDING_COMPENSATING_RE_ERASURE`
5. legal hold -> `BLOCKED_LEGAL_HOLD_REVIEW`
6. proof preservation -> `BLOCKED_PROOF_PRESERVATION_REVIEW`
7. authority ambiguity -> `BLOCKED_AUTHORITY_AMBIGUITY_REVIEW`
8. missing audit continuity -> `BLOCKED_PENDING_AUDIT_CONTINUITY`
9. replay/enquiry or reopen-access limitation drift -> `BLOCKED_PENDING_LIMITATION_RECONCILIATION`
10. missing queue rebuild -> `BLOCKED_PENDING_QUEUE_REBUILD`
11. missing authority rebuild or authority binding revalidation -> `BLOCKED_PENDING_AUTHORITY_REVALIDATION`
12. all gates satisfied -> `READY_FOR_REOPEN`
13. `QUARANTINED` -> `QUARANTINED`
14. `EXPIRED` -> `EXPIRED`

`CREATED` checkpoints cannot retain `READY_FOR_REOPEN`; if all gates are satisfied they must advance by `restore_drill_passed`.

## Evidence Binding

Restore evidence is treated as one bound tuple:

- `restore_drill_ref`
- `restore_tested_at`
- `restore_verification_hash`
- `privacy_reconciliation_contract`
- `privacy_reconciliation_outcome_ref`
- `snapshot_time`

The model rejects partial restore evidence, mismatched privacy lineage, privacy hash drift, and `restore_tested_at` values earlier than `snapshot_time`. The privacy contract hash is recalculated with the same canonical field set used by `validate_contracts.py`.

## Quarantine And Expiry

Quarantine is a typed failure state, not staleness. The allowed `quarantine_reason_code` vocabulary is:

- `RESTORE_DRILL_FAILED`
- `PRIVACY_RECONCILIATION_FAILED`
- `COMPENSATING_RE_ERASURE_BLOCKED`
- `LEGAL_HOLD_REVIEW_REQUIRED`
- `PROOF_PRESERVATION_REVIEW_REQUIRED`
- `AUTHORITY_AMBIGUITY_REVIEW_REQUIRED`
- `AUDIT_CONTINUITY_FAILED`
- `QUEUE_REBUILD_FAILED`
- `AUTHORITY_REBUILD_FAILED`
- `AUTHORITY_BINDING_REVALIDATION_FAILED`
- `LIMITATION_RECONCILIATION_FAILED`
- `RESTORE_EVIDENCE_LINEAGE_DRIFT`
- `REOPEN_GATE_REGRESSION`

`QUARANTINED` checkpoints retain failing restore and privacy evidence. `EXPIRED` checkpoints retain `backup_ref`, `checkpoint_inventory_ref`, `snapshot_time`, and any bound restore evidence for ledger visibility. The current schema states that a non-null `quarantine_reason_code` implies `checkpoint_state=QUARANTINED`, so `retention_elapsed` clears `quarantine_reason_code` while preserving the failing evidence tuple and inventory linkage.
