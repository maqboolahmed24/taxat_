# Schema Migration Ledger And Reader Window Rules

`pc_0221` implements the release-side persistence model for schema migration chronology. The canonical objects are `SchemaMigrationLedger`, `SchemaReaderWindowContract`, and `BackfillExecutionContract`; each payload is normalized and validated against the shared contract schema before repository persistence.

## Persisted Contracts

`SchemaReaderWindowContract` records the exact writer schema bundle, supported reader bundle hashes, protected historical bundle hashes, and the current reader-window state. The writer bundle hash must be present in the supported reader set. Protected historical hashes must be a subset of supported readers and cannot include the current writer hash.

`BackfillExecutionContract` records whether idempotent backfill is required, the lawful execution state, affected artifact types, and audit refs. `NO_BACKFILL_REQUIRED` stays `NOT_APPLICABLE` with empty artifact and audit lists. `IDEMPOTENT_BACKFILL_REQUIRED` must name affected artifact types, and terminal backfill states must retain audit refs.

`SchemaMigrationLedger` binds the migration id, datastore, target version, target schema bundle hash, compatibility window, state transition contract, reader window, and backfill execution contract. Nullable chronology fields remain explicit on every payload, including planned ledgers.

## Phase Gates

| Phase | Required posture |
| --- | --- |
| `PLANNED` | No apply, verification, halt, closure, or failure timestamps/refs. |
| `APPLYING` / `APPLIED` | `applied_at` is required. No-backfill migrations remain expand-only before verification. |
| `VERIFYING` | `verification_ref` is required. Required backfill must already be complete. |
| `VERIFIED` | `verified_at` and `verification_ref` are required. Reader window remains `VERIFIED_PREVIOUS_READERS_SUPPORTED`. |
| `CONTRACTING` / `CONTRACTED` | Contract phase must be required, compatibility window closure must be explicit, reader window must be closed, and rollback class is `FAIL_FORWARD_ONLY`. |
| `HALTED` / `FAILED` | Failure evidence is retained only in lawful failure states. `HALTED` also records the halted subphase. |
| `SUPERSEDED` | Post-verification chronology remains explicit and the closed reader-window posture forces fail-forward. |

## Blocking Rules

Destructive contract is blocked until `SchemaReaderWindowContract.window_state` is `CONTRACT_ELIGIBLE_WINDOW_CLOSED`. Once closed, rollback is no longer considered safe and the ledger must carry `rollback_class = FAIL_FORWARD_ONLY`.

Replay and restore checks require a reader bundle that is supported by the recorded window, or exact historical bundle availability. Historical manifests remain protected only when their bundle hash is recorded as supported or protected by the window contract.

## Repository Guarantees

`SchemaMigrationLedgerRepository` validates nested reader-window, backfill, state-transition, and ledger payloads before writes. Ledger phase advancement uses named transition events and compare-and-swap row versions. Retries with the same transition event and audit ref return the already persisted record without a partial rewrite.
