import { execFile } from "node:child_process";
import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

import { expect, test } from "@playwright/test";

const execFileAsync = promisify(execFile);
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const planTool = path.join(repoRoot, "tools", "database", "plan_migration.ts");
const applyTool = path.join(repoRoot, "tools", "database", "apply_migration.ts");
const backfillTool = path.join(repoRoot, "tools", "database", "run_backfill.ts");
const baselineSqlPath = path.join(
  repoRoot,
  "packages",
  "control-plane-db",
  "src",
  "migrations",
  "000001_baseline.sql",
);

test.describe.configure({ mode: "serial" });

test("plan tool freezes the baseline migration files, schema bundle hash, and advisory lock posture", async () => {
  const { stdout } = await execFileAsync(
    "node",
    ["--experimental-strip-types", planTool, "--target-version=000001", "--quiet"],
    {
      cwd: repoRoot,
      maxBuffer: 16 * 1024 * 1024,
    },
  );

  const plan = JSON.parse(stdout);
  const baselineSql = await readFile(baselineSqlPath, "utf8");

  expect(plan.targetVersion).toBe("000001");
  expect(plan.schemaBundleHash).toHaveLength(64);
  expect(plan.advisoryLockPosture.lockFunction).toBe("pg_advisory_xact_lock");
  expect(plan.migrationFiles).toContain(
    "packages/control-plane-db/src/migrations/000001_baseline.sql",
  );
  expect(baselineSql).toContain("GRANT pg_control_owner TO pg_control_migrator WITH SET TRUE, INHERIT FALSE;");
  expect(baselineSql).toContain("\\i schema_migration_ledger.sql");
});

test("apply and backfill flows enforce singleton execution, preserve halted state, and resume partial progress", async () => {
  const tempDir = await mkdtemp(path.join(os.tmpdir(), "taxat-migration-framework-"));
  const statePath = path.join(tempDir, "migration_state.json");

  const startApply = await execFileAsync(
    "node",
    [
      "--experimental-strip-types",
      applyTool,
      "--target-version=000001",
      "--event=start_apply",
      "--run-id=ops-run-1",
      `--state-file=${statePath}`,
      "--hold-lock",
    ],
    {
      cwd: repoRoot,
      maxBuffer: 16 * 1024 * 1024,
    },
  );
  const applying = JSON.parse(startApply.stdout);
  expect(applying.record.phase_state).toBe("APPLYING");
  expect(applying.lock.heldByRunIdOrNull).toBe("ops-run-1");

  await expect(
    execFileAsync(
      "node",
      [
        "--experimental-strip-types",
        applyTool,
        "--target-version=000001",
        "--event=start_apply",
        "--run-id=ops-run-2",
        `--state-file=${statePath}`,
      ],
      {
        cwd: repoRoot,
        maxBuffer: 16 * 1024 * 1024,
      },
    ),
  ).rejects.toMatchObject({
    stderr: expect.stringContaining("Lock already held"),
  });

  const applyComplete = await execFileAsync(
    "node",
    [
      "--experimental-strip-types",
      applyTool,
      "--target-version=000001",
      "--event=apply_complete",
      "--run-id=ops-run-1",
      `--state-file=${statePath}`,
    ],
    {
      cwd: repoRoot,
      maxBuffer: 16 * 1024 * 1024,
    },
  );
  const applied = JSON.parse(applyComplete.stdout);
  expect(applied.record.phase_state).toBe("APPLIED");
  expect(applied.lock.heldByRunIdOrNull).toBeNull();

  const mutableState = JSON.parse(await readFile(statePath, "utf8"));
  mutableState.ledgers[0].backfill_execution_contract.execution_requirement =
    "IDEMPOTENT_BACKFILL_REQUIRED";
  mutableState.ledgers[0].backfill_execution_contract.execution_state = "PLANNED";
  mutableState.ledgers[0].backfill_execution_contract.affected_artifact_types = [
    "control_manifest.request_projection",
  ];
  await writeFile(statePath, `${JSON.stringify(mutableState, null, 2)}\n`, "utf8");

  const backfillStart = await execFileAsync(
    "node",
    [
      "--experimental-strip-types",
      backfillTool,
      "--target-version=000001",
      "--action=start",
      "--run-id=ops-backfill-1",
      `--state-file=${statePath}`,
    ],
    {
      cwd: repoRoot,
      maxBuffer: 16 * 1024 * 1024,
    },
  );
  const inProgress = JSON.parse(backfillStart.stdout);
  expect(inProgress.record.backfill_execution_contract.execution_state).toBe("IN_PROGRESS");

  const backfillHalt = await execFileAsync(
    "node",
    [
      "--experimental-strip-types",
      backfillTool,
      "--target-version=000001",
      "--action=halt",
      "--run-id=ops-backfill-1",
      `--state-file=${statePath}`,
    ],
    {
      cwd: repoRoot,
      maxBuffer: 16 * 1024 * 1024,
    },
  );
  const halted = JSON.parse(backfillHalt.stdout);
  expect(halted.record.phase_state).toBe("HALTED");
  expect(halted.record.backfill_execution_contract.execution_state).toBe("HALTED");

  const backfillResume = await execFileAsync(
    "node",
    [
      "--experimental-strip-types",
      backfillTool,
      "--target-version=000001",
      "--action=resume",
      "--run-id=ops-backfill-1",
      `--state-file=${statePath}`,
    ],
    {
      cwd: repoRoot,
      maxBuffer: 16 * 1024 * 1024,
    },
  );
  const resumed = JSON.parse(backfillResume.stdout);
  expect(resumed.record.phase_state).toBe("APPLIED");
  expect(resumed.record.backfill_execution_contract.execution_state).toBe("IN_PROGRESS");

  const backfillComplete = await execFileAsync(
    "node",
    [
      "--experimental-strip-types",
      backfillTool,
      "--target-version=000001",
      "--action=complete",
      "--run-id=ops-backfill-1",
      `--state-file=${statePath}`,
    ],
    {
      cwd: repoRoot,
      maxBuffer: 16 * 1024 * 1024,
    },
  );
  const completed = JSON.parse(backfillComplete.stdout);
  expect(completed.record.backfill_execution_contract.execution_state).toBe("COMPLETE");
  expect(completed.record.backfill_execution_contract.backfill_audit_refs).toContain(
    "audit.meta_migration.backfill.000001.complete.ops-backfill-1",
  );
});
