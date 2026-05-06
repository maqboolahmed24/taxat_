# Restore Privacy Reconciliation and Post-Restore Limitation Pass

`RestorePrivacyReconciliationContract` is the restore privacy legality boundary for recovery
checkpoints. The implementation in `packages/backend-recovery` keeps this as one persisted contract,
not as checkpoint-only booleans or operator notes.

## Contract Boundary

The contract version is `RESTORE_PRIVACY_RECONCILIATION_V1` and the scope policy is fixed to
`RESTORE_REQUIRES_PRIVACY_LIMITATION_AND_RE_ERASURE_PROOF`.

`reconciliation_contract_hash` is the canonical SHA-256 hash of the schema material fields used by
`Algorithm/scripts/validate_contracts.py`: checkpoint and restore refs, the fixed scope policy,
resurrected-data posture and count, reconciliation state, outcome ref, compensating workflow refs,
blocker refs, audit continuity, replay and enquiry limitation posture, reopen access posture, and
decision/completion timestamps. The repository persists the current row and an append-only version
history keyed by outcome ref and hash.

## Resurrected Data Detection

`classifyRestoreResurrectedDataPosture` accepts only aggregate detection inputs:

- `resurrected_restricted_data_subject_count_or_null`
- one detection-basis ref
- erased or pseudonymised lineage refs

It never carries subject identifiers or payload data. Pending reconciliation keeps count `null`.
Completed clean reconciliation requires count `0`. Resurrected restricted data requires count `>= 1`
and at least one erased or pseudonymised lineage ref.

## Compensating Re-Erasure

`buildCompensatingReErasureWorkflow` binds compensating cleanup to the exact checkpoint ref, restore
drill ref, and privacy outcome ref. Any compensating state other than `NOT_REQUIRED` requires a
workflow ref and audit ref. `COMPLETED` also requires `re_erasure_completed_at_or_null`; open and
blocked states must keep completion null.

## Limitation and Reopen Mapping

`runPostRestoreLimitationPass` is pure over persisted privacy posture, audit continuity, and replay
or enquiry rail evidence.

- Final reconciled states require replay `VERIFIED`, enquiry `VERIFIED`, audit `VERIFIED`, and then
  derive `READY_FOR_REOPEN`.
- Pending reconciliation always derives failed rails and `BLOCKED`.
- Open compensating states may have verified rails, but still derive `BLOCKED`.
- `BLOCKED_LEGAL_HOLD`, `BLOCKED_PROOF_PRESERVATION`, and `BLOCKED_AUTHORITY_AMBIGUITY` require
  limited replay and enquiry refs, then derive `LIMITED`.
- Any failed rail or failed audit continuity derives `BLOCKED`.

`buildRestorePrivacyReconciliationContract` signs and validates the final emitted contract against
the same invariants used by checkpoint normalization and the Python validator.

## Persistence

`RestorePrivacyReconciliationRepository` stores the current contract row by
`privacy_reconciliation_outcome_ref`, indexes current rows by checkpoint ref, restore drill ref,
privacy state, and reopen access state, and records each material compare-and-swap update in history.
It treats same-hash persistence as idempotent and rejects duplicate outcome refs with different
payloads outside compare-and-swap.
