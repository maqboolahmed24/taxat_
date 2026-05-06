# Restore Drill Result And Promotion Binding

## Scope

`RestoreDrillResult` is the release evidence artifact for restore verification. It records the exact checkpoint tested, the release candidate runtime tuple, the schema reader window, the restore privacy reconciliation contract, the drill report ref, and the verification basis for audit continuity, queue rebuild, authority rebuild, and authority binding revalidation.

Restore success is not promotion readiness by itself. A restore drill becomes release-promotion evidence only when the result is candidate-bound, checkpoint-bound, privacy-reconciliation-bound, and all rebuild and revalidation checks are true.

## Drill Scope

`drill_scope` has two governed values:

- `CURRENT_RELEASE_CANDIDATE`: restore evidence used to prove the current candidate can reopen safely.
- `DR_FAILOVER_FAILBACK`: broader disaster-recovery evidence for failover or failback exercises.

Both scopes retain the same candidate tuple and checkpoint lineage. The scope changes the operational reason for the drill, not the evidence required to pass.

## Promotion Readiness

`deriveRestoreVerificationHash` computes the deterministic restore verification hash from the checkpoint ref, restore drill ref, candidate identity hash, build artifact ref, schema bundle hash, config bundle hash, migration plan ref, enabled provider profiles, drill scope, outcome, rebuild booleans, and privacy reconciliation contract hash.

`validateRestoreDrillPromotionReadiness` requires:

- `outcome = PASSED`
- audit continuity verified
- privacy reconciliation verified
- queue rebuild verified
- authority rebuild verified
- authority binding revalidation verified
- privacy reconciliation in a final reconciled state
- audit chain, replay limitation, and enquiry limitation all `VERIFIED`
- reopen access `READY_FOR_REOPEN`

Blocked, incomplete, limited, or pending privacy reconciliation prevents promotion readiness even when byte-level restore checks pass.

## Canonical Ordering

`enabled_provider_profile_refs[]` and `failure_reason_codes[]` must already be sorted and unique when serialized. Non-canonical order fails closed so restore evidence has stable identity and cannot be normalized after publication.

Passed drills must carry no failure reason codes. Failed or quarantined drills must carry at least one reason code and expose at least one failed verification basis.

## Release Binding

`bindRestoreDrillIntoReleaseEvidence` projects a restore drill into:

- a `VerificationSuiteResult` with `suite_family = RESTORE_DRILL`
- a `GateAdmissibilityRecord` carrying admissibility and reason-code posture
- a restore gate evidence row for manifest assembly

Green restore gate evidence is emitted only when the admissibility record is admissible. The release manifest assembly still requires both `restore_drill_ref_or_null` and `restore_checkpoint_ref_or_null` before a green restore gate can be accepted.

## Persistence

`RestoreDrillResultRepository` validates every payload against `restore_drill_result` before persistence. Rows are immutable and keyed by `restore_drill_id`, with query indexes for checkpoint ref, candidate identity hash, build artifact ref, drill scope, and outcome.

Duplicate writes are idempotent only when the existing immutable payload is byte-stable under canonical JSON hashing. Reusing a restore drill id with a different payload is rejected.
