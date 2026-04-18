import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { expect, test } from "@playwright/test";

import {
  createAuditAppendOnlyEnforcementPolicy,
  createControlAndAuditStoreLedgerViewModel,
  createPitrBackupRestorePolicy,
  createPostgresStoreInventoryTemplate,
  createRoleAndPrivilegeMatrix,
  validateAuditAppendOnlyEnforcement,
  validatePitrBackupRestorePolicy,
  validateRoleAndPrivilegeMatrix,
  type AuditAppendOnlyEnforcementPolicy,
  type ControlAndAuditStoreLedgerViewModel,
  type PitrBackupRestorePolicy,
  type PostgresStoreInventoryTemplate,
  type RoleAndPrivilegeMatrix,
} from "../../../../infra/postgres/bootstrap/provision_primary_postgresql_control_store_and_append_only_audit_store.js";

const repoRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
  "..",
  "..",
  "..",
);

async function readJson<T>(segments: string[]): Promise<T> {
  return JSON.parse(
    await readFile(path.join(repoRoot, ...segments), "utf8"),
  ) as T;
}

test("checked-in postgres topology artifacts and ledger payload match the builders", async () => {
  const persistedRoleMatrix = await readJson<RoleAndPrivilegeMatrix>([
    "config",
    "postgres",
    "role_and_privilege_matrix.json",
  ]);
  const persistedPitrPolicy = await readJson<PitrBackupRestorePolicy>([
    "config",
    "postgres",
    "pitr_backup_restore_policy.json",
  ]);
  const persistedAuditPolicy = await readJson<AuditAppendOnlyEnforcementPolicy>([
    "config",
    "postgres",
    "audit_append_only_enforcement.json",
  ]);
  const persistedInventory = await readJson<PostgresStoreInventoryTemplate>([
    "data",
    "provisioning",
    "postgres_store_inventory.template.json",
  ]);
  const sampleRun = await readJson<{
    controlAndAuditStoreLedger: ControlAndAuditStoreLedgerViewModel;
  }>([
    "automation",
    "provisioning",
    "report_viewer",
    "data",
    "sample_run.json",
  ]);

  expect(persistedRoleMatrix).toEqual(createRoleAndPrivilegeMatrix());
  expect(persistedPitrPolicy).toEqual(createPitrBackupRestorePolicy());
  expect(persistedAuditPolicy).toEqual(createAuditAppendOnlyEnforcementPolicy());
  expect(persistedInventory).toEqual(createPostgresStoreInventoryTemplate());
  expect(sampleRun.controlAndAuditStoreLedger).toEqual(
    createControlAndAuditStoreLedgerViewModel(),
  );
});

test("append-only policy and PITR policy stay fail-closed on mutations, retention, and restore gates", () => {
  const roleMatrix = createRoleAndPrivilegeMatrix();
  const pitrPolicy = createPitrBackupRestorePolicy();
  const auditPolicy = createAuditAppendOnlyEnforcementPolicy();

  validateRoleAndPrivilegeMatrix(roleMatrix);
  validatePitrBackupRestorePolicy(pitrPolicy);
  validateAuditAppendOnlyEnforcement(auditPolicy);

  expect(
    roleMatrix.role_rows.find((row) => row.role_ref === "role.pg.audit.append_writer")
      ?.forbidden_capabilities,
  ).toEqual(
    expect.arrayContaining(["UPDATE_AUDIT_ROWS", "DELETE_AUDIT_ROWS"]),
  );
  expect(auditPolicy.grant_posture.update_allowed_role_refs).toEqual([]);
  expect(auditPolicy.grant_posture.delete_allowed_role_refs).toEqual([]);
  expect(auditPolicy.maintenance_exception_path.row_update_allowed).toBe(false);
  expect(auditPolicy.maintenance_exception_path.row_delete_allowed).toBe(false);
  expect(auditPolicy.partitioning.strategy).toBe(
    "RANGE_RECORDED_AT_MONTHLY_PLUS_DEFAULT",
  );
  expect(auditPolicy.mutation_violation.reason_code).toBe(
    "AUDIT_APPEND_ONLY_VIOLATION",
  );
  expect(auditPolicy.stream_ordering.canonical_merge_key).toEqual([
    "audit_stream_ref",
    "stream_sequence",
  ]);
  expect(pitrPolicy.wal_policy.wal_level).toBe("replica");
  expect(pitrPolicy.wal_policy.archive_mode).toBe("on");
  expect(
    pitrPolicy.restore_gate_rows.map((row) => row.gate_code),
  ).toEqual(
    expect.arrayContaining([
      "RESTORE_EVIDENCE_BOUND",
      "PRIVACY_RECONCILIATION_BOUND",
      "AUDIT_CONTINUITY_VERIFIED",
      "QUEUE_REBUILD_VERIFIED",
      "AUTHORITY_REBUILD_VERIFIED",
      "AUTHORITY_BINDING_REVALIDATED",
    ]),
  );
});
