import { mkdtemp, readFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { expect, test } from "@playwright/test";

import {
  createPostgresStoreInventoryTemplate,
  provisionPrimaryPostgresqlControlStoreAndAppendOnlyAuditStore,
} from "../../../infra/postgres/bootstrap/provision_primary_postgresql_control_store_and_append_only_audit_store.js";

test("dry-run bootstrap freezes a sanitized provider-unresolved topology and supports adoption without destructive reset", async () => {
  const tempDir = await mkdtemp(path.join(os.tmpdir(), "taxat-postgres-topology-"));
  const inventoryPath = path.join(tempDir, "postgres_store_inventory.json");

  const result = await provisionPrimaryPostgresqlControlStoreAndAppendOnlyAuditStore({
    runContext: {
      runId: "run-fixture-postgres-topology-001",
      workspaceId: "wk-fixture-postgres-topology",
      operatorIdentityAlias: "ops.database.fixture",
    },
    inventoryPath,
  });

  const persisted = JSON.parse(await readFile(inventoryPath, "utf8"));

  expect(result.outcome).toBe(
    "POSTGRES_TOPOLOGY_DECLARED_PROVIDER_SELECTION_REQUIRED",
  );
  expect(result.selection_status).toBe("PROVIDER_SELECTION_REQUIRED");
  expect(result.steps[0]?.status).toBe("BLOCKED_BY_POLICY");
  expect(result.steps.slice(1).every((step) => step.status === "SUCCEEDED")).toBe(
    true,
  );
  expect(result.notes).toEqual(
    expect.arrayContaining([
      "No live provider mutation occurred.",
      "This flow is safe to rerun because unresolved-provider posture only writes sanitized inventory and compares drift explicitly.",
    ]),
  );
  expect(persisted).toEqual(
    createPostgresStoreInventoryTemplate({
      runId: "run-fixture-postgres-topology-001",
      workspaceId: "wk-fixture-postgres-topology",
      operatorIdentityAlias: "ops.database.fixture",
    }),
  );
  expect(JSON.stringify(persisted)).not.toContain("postgres://");
  expect(JSON.stringify(persisted)).not.toContain("BEGIN PRIVATE KEY");

  const adopted = await provisionPrimaryPostgresqlControlStoreAndAppendOnlyAuditStore({
    runContext: {
      runId: "run-fixture-postgres-topology-002",
      workspaceId: "wk-fixture-postgres-topology",
      operatorIdentityAlias: "ops.database.fixture",
    },
    inventoryPath,
    existingInventoryPath: inventoryPath,
  });

  expect(adopted.outcome).toBe(
    "POSTGRES_TOPOLOGY_DECLARED_PROVIDER_SELECTION_REQUIRED",
  );
  expect(adopted.steps[5]?.status).toBe("SKIPPED_AS_ALREADY_PRESENT");
});

test("baseline migrations freeze the control schemas, restore gates, and append-only audit guards", async () => {
  const repoRoot = path.resolve(
    path.dirname(fileURLToPath(import.meta.url)),
    "..",
    "..",
    "..",
  );
  const controlSql = await readFile(
    path.join(repoRoot, "db", "migrations", "control", "0001_bootstrap_control_store.sql"),
    "utf8",
  );
  const auditSql = await readFile(
    path.join(repoRoot, "db", "migrations", "audit", "0001_bootstrap_append_only_audit_store.sql"),
    "utf8",
  );

  expect(controlSql).toContain(
    "CREATE TABLE IF NOT EXISTS meta_migration.schema_migration_ledger",
  );
  expect(controlSql).toContain(
    "CREATE TABLE IF NOT EXISTS restore_verification.restore_checkpoint_register",
  );
  expect(controlSql).toContain(
    "CREATE OR REPLACE FUNCTION control_support.current_tenant_id()",
  );
  expect(controlSql).toContain("GRANT pg_control_owner TO pg_control_migrator WITH SET TRUE, INHERIT FALSE;");

  expect(auditSql).toContain(
    "CREATE TABLE IF NOT EXISTS audit_ledger.audit_event_stream",
  );
  expect(auditSql).toContain("PARTITION BY RANGE (recorded_at)");
  expect(auditSql).toContain(
    "CREATE OR REPLACE FUNCTION audit_admin.guard_audit_event_insert()",
  );
  expect(auditSql).toContain(
    "CREATE OR REPLACE FUNCTION audit_admin.reject_audit_event_mutation()",
  );
  expect(auditSql).toContain(
    "MESSAGE = 'append_only_violation:update_delete_forbidden'",
  );
  expect(auditSql).toContain("GRANT INSERT, SELECT ON audit_ledger.audit_event_stream TO pg_audit_append_writer;");
});
