# PostgreSQL Control And Audit Store Runbook

## Purpose

This runbook freezes the durable relational truth boundary for Taxat's broader product:

- `taxat_control` is the transactional source of truth for manifests, workflow state, receipts, upload state, authority state, retention controls, migration metadata, and restore verification metadata.
- `taxat_audit` is the append-only evidence ledger for audit events, provenance, replay attestations, and restore continuity proof.

The current posture is intentionally portable and fail-closed. `ADR-002` fixed the relational topology, but platform procurement still has not fixed the exact managed provider. This pack therefore records the lawful PostgreSQL shape now and leaves cloud product names, region IDs, and managed-backup mechanics unresolved until the later platform decision is actually made.

## Frozen Topology

- One PostgreSQL cluster per environment.
- Two separately credentialed databases per cluster: `taxat_control` and `taxat_audit`.
- Hard schema and role separation between transactional truth and append-only evidence.
- Read replicas and restore-drill clusters are explicit profiles only. They never become commit truth.

The rationale is narrow and pragmatic: one cluster with two databases preserves the corpus rule that control truth and audit evidence are distinct, while avoiding invented cloud-vendor details before platform selection is finished.

## Environment Posture

The authoritative machine-readable inventory is [postgres_store_inventory.template.json](/Users/test/Code/taxat_/data/provisioning/postgres_store_inventory.template.json).

- `env_local_provisioning_workstation`: local-only shadow, non-authoritative, no commit truth, restore posture for operator development only.
- `env_shared_sandbox_integration`: UK non-production primary, standby required, WAL archival and restore drills still mandatory.
- `env_preproduction_verification`: UK preproduction primary, multi-zone standby and required read-only replica, used to prove migration and restore admissibility before promotion.
- `env_production`: UK production primary, multi-zone standby and required read-only replica, Tier 0 truth.
- `env_disaster_recovery_drill`: isolated restore target, read-only until every reopen gate is satisfied.

## Database And Schema Boundaries

### Control Store

Database: `taxat_control`

Schemas:

- `control_manifest`
- `control_workflow`
- `control_receipt`
- `control_upload`
- `control_authority`
- `control_retention`
- `control_support`
- `meta_migration`
- `restore_verification`

`meta_migration` carries expand/backfill/contract and compatibility-window posture. `restore_verification` carries restore checkpoints, drill evidence, and reopen gates. `control_support` currently freezes the tenant-context helpers that later row-security policies can bind to.

### Audit Store

Database: `taxat_audit`

Schemas:

- `audit_ledger`
- `audit_admin`

`audit_ledger.audit_event_stream` is the append-only evidence table. `audit_admin.audit_stream_head` is the mutable monotonicity register used to guard per-stream ordering.

## Role Model

The canonical matrix is [role_and_privilege_matrix.json](/Users/test/Code/taxat_/config/postgres/role_and_privilege_matrix.json).

Key roles:

- `pg_control_owner`: owns control schemas and default privileges.
- `pg_control_migrator`: explicit migration role with `SET ROLE` access into the owner only during migration windows.
- `pg_control_runtime_api`: transactional truth mutator for API-facing runtime paths.
- `pg_control_orchestrator`: manifest and receipt coordinator.
- `pg_control_worker`: stage worker for durable control mutations.
- `pg_control_projector_ro`: read-only consumer for projection rebuilds and replica-safe reads.
- `pg_audit_owner`: owns audit schemas and default privileges.
- `pg_audit_append_writer`: insert-only evidence writer.
- `pg_audit_investigator_ro`: read-only audit investigator.
- `pg_audit_partition_maintainer`: partition-only retention maintainer.
- `pg_control_backup_restore`: backup, restore, and drill operator.
- `pg_break_glass_operator`: explicit emergency read-mostly posture with approval-bound `SET ROLE`.

Every role is a `NOLOGIN` group role. Login bindings and secret rotation attach later through the secret-root topology from `pc_0049`.

## Tenant Separation And Row Security

The phase-01 baseline does not invent table-specific row-security policies before the domain tables exist. It does freeze the fail-closed scaffolding:

- `control_support.current_tenant_id()`
- `control_support.require_tenant_context()`

Later tenant-scoped tables must bind `USING` and `WITH CHECK` policies to `taxat.current_tenant_id`. Until then, the runbook keeps schema and role boundaries explicit and avoids fake RLS coverage.

## Append-Only Audit Enforcement

The canonical machine-readable policy is [audit_append_only_enforcement.json](/Users/test/Code/taxat_/config/postgres/audit_append_only_enforcement.json).

The enforced posture is:

- `INSERT` only for `pg_audit_append_writer`.
- `SELECT` only for explicitly named read and restore roles.
- no `UPDATE` grants.
- no `DELETE` grants.
- no row-level maintenance exception.
- retention acts only by partition detach or drop after retention expiry.

`audit_admin.guard_audit_event_insert()` enforces:

- first event in a stream must use `stream_sequence = 1`
- later events must increment monotonically
- `prev_event_hash` must match the last recorded hash in the stream head

`audit_admin.reject_audit_event_mutation()` rejects any `UPDATE` or `DELETE` with the `append_only_violation:update_delete_forbidden` posture. Canonical ordering remains `audit_stream_ref + stream_sequence`; `recorded_at` exists for partitioning and time-bounded retrieval, not for legal ordering truth.

## PITR, WAL, Restore, And Reopen Gates

The canonical policy is [pitr_backup_restore_policy.json](/Users/test/Code/taxat_/config/postgres/pitr_backup_restore_policy.json).

Frozen rules:

- `wal_level = replica`
- `archive_mode = on`
- authoritative environments keep `archive_timeout = 60s`
- WAL archiving must remain continuous back to the start of the latest admissible base backup
- WAL archive deficiencies block restore readiness

Restore drills must prove more than "database boots":

1. restore latest admissible base backup into an isolated drill target
2. replay WAL to the requested recovery point
3. verify schema bundle and reader-window compatibility
4. verify audit continuity
5. rebuild queue state from durable truth
6. rebuild authority work from control plus audit stores
7. complete privacy reconciliation before any reopen

No environment becomes reopen-safe until all of these gates are satisfied:

- `RESTORE_EVIDENCE_BOUND`
- `PRIVACY_RECONCILIATION_BOUND`
- `AUDIT_CONTINUITY_VERIFIED`
- `QUEUE_REBUILD_VERIFIED`
- `AUTHORITY_REBUILD_VERIFIED`
- `AUTHORITY_BINDING_REVALIDATED`

## Migration Window Law

The baseline SQL and PITR policy freeze the expand -> backfill -> contract doctrine now:

- expand steps may add schemas, columns, roles, or partitions while prior readers still work
- backfills must be idempotent and replay-safe
- contract steps remain blocked until the supported reader window, restore drills, and rollback boundary all remain green
- if destructive change closes the safe rollback boundary, the sanctioned recovery path is fail-forward with compensating migration work

## Adoption, Drift, And Rerun Safety

The bootstrap flow is [provision_primary_postgresql_control_store_and_append_only_audit_store.ts](/Users/test/Code/taxat_/infra/postgres/bootstrap/provision_primary_postgresql_control_store_and_append_only_audit_store.ts).

It is designed to:

- emit a sanitized topology record without printing credentials
- stay blocked when the provider service type remains unresolved
- adopt an existing matching topology without destructive reset
- stop on topology drift instead of silently overwriting prior state

The checked-in inventory therefore contains role aliases, schema names, restore posture, and secret alias refs only.

## Official PostgreSQL Grounding

Current PostgreSQL guidance used to freeze this phase-01 topology:

- [Continuous archiving and point-in-time recovery](https://www.postgresql.org/docs/18/continuous-archiving.html)
- [Row security policies](https://www.postgresql.org/docs/18/ddl-rowsecurity.html)
- [Partitioning](https://www.postgresql.org/docs/18/ddl-partitioning.html)
- [GRANT](https://www.postgresql.org/docs/18/sql-grant.html)
- [CREATE ROLE](https://www.postgresql.org/docs/18/sql-createrole.html)
- [ALTER DEFAULT PRIVILEGES](https://www.postgresql.org/docs/18/sql-alterdefaultprivileges.html)
- [Role membership](https://www.postgresql.org/docs/18/role-membership.html)
