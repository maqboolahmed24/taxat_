# Recovery Governance, Fail-Forward, and Checkpoint Rules

`RecoveryGovernanceContract` is the shared machine law for `RecoveryCheckpoint` and `DeploymentRelease`.

Local implementation:

- [Recovery governance model](../../packages/backend-release/src/models/recovery_governance_contract.ts)
- [Governance derivation service](../../packages/backend-release/src/services/derive_recovery_governance_contract.ts)
- [Checkpoint reopen readiness service](../../packages/backend-release/src/services/validate_checkpoint_reopen_readiness.ts)
- [Release fail-forward boundary service](../../packages/backend-release/src/services/apply_release_fail_forward_boundary.ts)
- [Algorithm recovery contract](../../Algorithm/recovery_tier_checkpoint_and_fail_forward_governance_contract.md)
- [Recovery governance schema](../../Algorithm/schemas/recovery_governance_contract.schema.json)
- [Recovery checkpoint schema](../../Algorithm/schemas/recovery_checkpoint.schema.json)
- [Deployment release schema](../../Algorithm/schemas/deployment_release.schema.json)

Authoritative tier mapping:

- `CONTROL_PLANE_LEGAL_TRUTH` -> `TIER_0_CONTROL_PLANE`, `RPO_15M`, `RTO_60M`
- `REBUILDABLE_PROJECTION` -> `TIER_1_REBUILDABLE`, `RPO_4H`, `RTO_4H`
- `DISPOSABLE_RUNTIME_CACHE` -> `TIER_2_DISPOSABLE`, `RPO_BEST_EFFORT`, `RTO_24H`

Boundary rules:

- `boundary_scope = RECOVERY_CHECKPOINT` uses `CHECKPOINT_RETAINS_INVENTORY_RESTORE_EVIDENCE_AND_REOPEN_GATES`.
- `boundary_scope = DEPLOYMENT_RELEASE` uses `RELEASE_RETAINS_ROLLBACK_BOUNDARY_AND_FAIL_FORWARD_GOVERNANCE`.
- Deployment releases are control-plane release truth and therefore always bind `CONTROL_PLANE_LEGAL_TRUTH`, `TIER_0_CONTROL_PLANE`, `RPO_15M`, and `RTO_60M`.

Checkpoint reopen rules:

- `checkpoint_state = VERIFIED` is lawful only when restore evidence, privacy reconciliation, audit continuity, queue rebuild, authority rebuild, authority binding revalidation, replay limitation, enquiry limitation, and `READY_FOR_REOPEN` all hold.
- Pre-verified checkpoints retain the exact blocker state, such as `BLOCKED_PENDING_PRIVACY_RECONCILIATION`, `BLOCKED_PENDING_QUEUE_REBUILD`, or `BLOCKED_AUTHORITY_AMBIGUITY_REVIEW`.
- The backend-release readiness service reuses the persisted backend-recovery checkpoint contract and returns a typed blocker report rather than inventing a second checkpoint model.

Release rollback and fail-forward rules:

- Rollback remains allowed only while the schema reader window and compatibility gate both retain `ROLLBACK_ALLOWED`.
- Closed reader windows force `FAIL_FORWARD_ONLY`.
- `ROLLED_BACK` is rejected when the boundary is `FAIL_FORWARD_ONLY`.
- `FAILED_FORWARD` requires `compensating_release_id_or_null`, `fail_forward_owner_ref_or_null`, and the release fail-forward runbook lineage.
- Canary abort keeps rollback-safe posture only while rollback remains lawful.
