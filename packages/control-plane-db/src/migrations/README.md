# Control-Plane Migration Workspace

This directory is the immutable SQL chain for the PostgreSQL control datastore.

Rules:

- migration filenames are six-digit, forward-only sequence numbers such as `000001_baseline.sql`
- once a numbered migration lands, its bytes are immutable
- structural DDL stays separate from resumable backfill execution
- `schema_migration_ledger.sql` owns the canonical ledger, lock, and backfill evidence tables that every numbered migration depends on
- migration application is never hidden behind app startup or ORM auto-diff behavior

Execution posture:

- acquire a transaction-scoped PostgreSQL advisory lock before any structural change
- apply numbered SQL in order
- write the `SchemaMigrationLedger` transition in the same transaction whenever the DDL shape permits it
- run resumable backfill through `tools/database/run_backfill.ts`
- close the reader compatibility window only after verification proves replay, restore, and protected historical readers remain lawful

Canonical entrypoints:

- `node --experimental-strip-types ./tools/database/plan_migration.ts --target-version=000001`
- `node --experimental-strip-types ./tools/database/apply_migration.ts --target-version=000001 --event=start_apply`
- `node --experimental-strip-types ./tools/database/run_backfill.ts --target-version=000001 --action=start`
