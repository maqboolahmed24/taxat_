# Migration Framework Runbook

## Scope

This runbook defines the control-store migration posture introduced by `pc_0066`.
It governs immutable SQL numbering, schema-bundle version binding, PostgreSQL singleton locking,
reader-window compatibility, resumable backfill execution, and the explicit
`expand -> backfill -> verify -> contract` chronology.

## Baseline assets

- catalog: `config/migrations/schema_bundle_version_catalog.json`
- reader window baseline: `config/migrations/schema_reader_window_baseline.json`
- backfill policy baseline: `config/migrations/backfill_execution_policy.json`
- immutable SQL chain: `packages/control-plane-db/src/migrations`
- operator entrypoints:
  - `tools/database/plan_migration.ts`
  - `tools/database/apply_migration.ts`
  - `tools/database/run_backfill.ts`

## Numbering and immutability

- Numbered migration files use six digits and never change after landing.
- `schema_migration_ledger.sql` is the shared object-family bootstrap that numbered migrations depend on.
- If a later version needs more DDL, add `000002_*.sql`, `000003_*.sql`, and so on.
- ORM auto-diff output is not an admissible source of truth.

## Schema bundle and release binding

- The current imported contracts-core schema bundle hash is computed from authoritative schema and validator hash lineage.
- `schema_bundle_version_catalog.json` binds that hash to target version `000001`.
- Release candidate identity and migration evidence must carry the same target version and schema bundle hash tuple.

## Locking posture

- Default singleton execution is PostgreSQL `pg_advisory_xact_lock`.
- Lock scope is transaction-scoped so the lease releases when the migration transaction commits or rolls back.
- Session-scoped advisory locks are reserved for explicit break-glass maintenance and are not the normal runner posture.
- Structural DDL and ledger mutation must share one transaction whenever the DDL shape permits it.

## Expand / backfill / verify / contract

1. `EXPAND`
   - apply additive DDL only
   - record `SchemaMigrationLedger.phase_state = APPLYING` then `APPLIED`
   - keep the reader window open
2. `BACKFILL`
   - run through `tools/database/run_backfill.ts`
   - backfill work must be idempotent, resumable, and separately evidenced
   - do not hide backfill inside numbered SQL
3. `VERIFY`
   - prove replay, restore, reader-window, and release-admission safety
   - set `verification_ref` and only then move to `VERIFIED`
4. `CONTRACT`
   - allowed only when `contract_phase_required = true`
   - close the compatibility window explicitly before destructive cleanup
   - once closed, rollback class becomes `FAIL_FORWARD_ONLY`

## Rollback classes

- `ROLLBACK_SAFE`
  - compatibility window still open
  - prior readers remain supported
  - destructive cleanup has not started
- `FAIL_FORWARD_ONLY`
  - compatibility window closed
  - destructive contract work started or the prior data shape is no longer safely restorable
  - compensating release lineage is now mandatory

## Halt and failure handling

- `HALTED`
  - preserves the halted subphase and can later resume into the same phase family
  - allowed while keeping rollback-safe posture if the reader window remains open
- `FAILED`
  - requires a durable `failure_ref`
  - once the compatibility window has closed, failure handling must proceed through fail-forward ownership

## Reader window rules

- writer schema hash must always be present in the supported reader set
- protected historical hashes must stay inside the supported reader set
- contract cleanup is blocked until the window closes
- replay and restore remain lawful only while a compatible recorded bundle or compatible reader exists

## Commands

Plan:

```sh
node --experimental-strip-types ./tools/database/plan_migration.ts --target-version=000001
```

Apply a phase transition:

```sh
node --experimental-strip-types ./tools/database/apply_migration.ts \
  --target-version=000001 \
  --event=start_apply \
  --run-id=ops-migration-001 \
  --state-file=/tmp/taxat-migration-state.json
```

Run resumable backfill:

```sh
node --experimental-strip-types ./tools/database/run_backfill.ts \
  --target-version=000001 \
  --action=start \
  --run-id=ops-backfill-001 \
  --state-file=/tmp/taxat-migration-state.json
```

## Notes

- Live datastore mutation stays opt-in and environment-gated.
- The internal migration atlas is read-only and exists for inspection, not mutation.
