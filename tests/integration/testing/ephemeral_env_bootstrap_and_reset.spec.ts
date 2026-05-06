import { execFile } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

import { expect, test } from "@playwright/test";

const execFileAsync = promisify(execFile);
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..");

type PythonOutcome =
  | { ok: true; stdout: string; stderr: string }
  | { ok: false; stdout: string; stderr: string; code: number | null };

type EphemeralManifest = {
  environment_id: string;
  lifecycle_state: string;
  current_phase_ref: string;
  completed_phase_refs: string[];
  seed_profile_ref: string;
  seed_profile_hash: string;
  reset_counter: number;
  last_reset_evidence_ref_or_null: string | null;
  browser_attachment: {
    environment_identity_chip: string;
    route_identity_ref: string;
  };
  namespaces: {
    object_prefix_refs: string[];
  };
  resource_state: {
    active_worker_leases: number;
    last_reset_scope_ref_or_null: string | null;
    object_prefix_object_counts: Record<string, number>;
    service_availability: Record<string, boolean>;
  };
};

type CleanlinessReport = {
  ok: boolean;
  failureCodes: string[];
  warningCodes: string[];
  cleanliness_hash: string;
};

type ResetEvidence = {
  action_kind: string;
  outcome: string;
  reset_scope_ref: string;
  source_lineage: string[];
  resource_counts: {
    object_prefix_object_count_total: number;
  };
};

const pythonPath = path.join(repoRoot, "scripts", "test");
const bootstrapScript = path.join(
  repoRoot,
  "scripts",
  "test",
  "bootstrap_ephemeral_environment.py",
);
const loadSeedScript = path.join(repoRoot, "scripts", "test", "load_ephemeral_seed_profile.py");
const verifyScript = path.join(repoRoot, "scripts", "test", "verify_ephemeral_cleanliness.py");
const resetScript = path.join(repoRoot, "scripts", "test", "reset_ephemeral_environment.py");

function environmentDir(stateDir: string, environmentId: string) {
  return path.join(stateDir, environmentId);
}

function manifestFile(stateDir: string, environmentId: string) {
  return path.join(environmentDir(stateDir, environmentId), "environment_manifest.json");
}

function seedMaterialFile(stateDir: string, environmentId: string) {
  return path.join(environmentDir(stateDir, environmentId), "seed_material.json");
}

function cleanlinessFile(stateDir: string, environmentId: string) {
  return path.join(environmentDir(stateDir, environmentId), "cleanliness_report.json");
}

function evidenceFile(stateDir: string, environmentId: string, evidenceName: string) {
  return path.join(environmentDir(stateDir, environmentId), "evidence", evidenceName);
}

async function readJson<T>(filePath: string) {
  return JSON.parse(await readFile(filePath, "utf8")) as T;
}

async function writeJson(filePath: string, payload: unknown) {
  await writeFile(filePath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
}

async function runPython(scriptPath: string, args: string[]): Promise<PythonOutcome> {
  try {
    const result = await execFileAsync("python3", [scriptPath, ...args], {
      cwd: repoRoot,
      env: {
        ...process.env,
        PYTHONPATH: [pythonPath, process.env.PYTHONPATH ?? ""].filter(Boolean).join(path.delimiter),
      },
      maxBuffer: 32 * 1024 * 1024,
    });
    return { ok: true, stdout: result.stdout, stderr: result.stderr };
  } catch (error) {
    const failure = error as NodeJS.ErrnoException & {
      code?: number | string;
      stdout?: string;
      stderr?: string;
    };
    return {
      ok: false,
      stdout: failure.stdout ?? "",
      stderr: failure.stderr ?? "",
      code: typeof failure.code === "number" ? failure.code : null,
    };
  }
}

test("bootstrap resumes from a halted migration basis and full reset restores a clean deterministic basis", async () => {
  const stateDir = await mkdtemp(path.join(os.tmpdir(), "taxat-ephemeral-bootstrap-"));
  const environmentId = "env-ephemeral-ci-bootstrap-001";

  try {
    const bootstrapArgs = [
      "--environment-id",
      environmentId,
      "--scope-class",
      "CI_RUN_SHARD",
      "--owner-ref",
      "ci.run.20260423.bootstrap",
      "--shard-ref",
      "shard-a",
      "--runtime-profile",
      "local",
      "--state-dir",
      stateDir,
    ];

    const haltedBootstrap = await runPython(bootstrapScript, [
      ...bootstrapArgs,
      "--halt-after-phase",
      "MIGRATION_BASIS",
    ]);
    expect(haltedBootstrap.ok).toBe(false);
    expect(haltedBootstrap.code).toBe(1);

    let manifest = await readJson<EphemeralManifest>(manifestFile(stateDir, environmentId));
    expect(manifest.lifecycle_state).toBe("HALTED");
    expect(manifest.current_phase_ref).toBe("MIGRATION_BASIS");
    expect(manifest.completed_phase_refs).toContain("MIGRATION_BASIS");

    const seedLoad = await runPython(loadSeedScript, [
      "--environment-id",
      environmentId,
      "--state-dir",
      stateDir,
    ]);
    expect(seedLoad.ok).toBe(true);

    const seedMaterial = await readJson<{
      environment_id: string;
      route_identity_ref: string;
      retry_rebase_token: string;
    }>(seedMaterialFile(stateDir, environmentId));
    expect(seedMaterial.environment_id).toBe(environmentId);
    expect(seedMaterial.route_identity_ref).toContain(environmentId);
    expect(seedMaterial.retry_rebase_token).toContain("rebase.token.");

    const resumedBootstrap = await runPython(bootstrapScript, bootstrapArgs);
    expect(resumedBootstrap.ok).toBe(true);

    manifest = await readJson<EphemeralManifest>(manifestFile(stateDir, environmentId));
    expect(manifest.lifecycle_state).toBe("READY");
    expect(manifest.seed_profile_ref).toBe("PROFILE_GOLDEN_PACK_ONLY");
    expect(manifest.browser_attachment.environment_identity_chip).toBe(environmentId);
    expect(manifest.browser_attachment.route_identity_ref).toBe(seedMaterial.route_identity_ref);

    const verified = await runPython(verifyScript, [
      "--environment-id",
      environmentId,
      "--state-dir",
      stateDir,
    ]);
    expect(verified.ok).toBe(true);

    let cleanliness = await readJson<CleanlinessReport>(cleanlinessFile(stateDir, environmentId));
    expect(cleanliness.ok).toBe(true);
    expect(cleanliness.failureCodes).toEqual([]);

    const reset = await runPython(resetScript, [
      "--environment-id",
      environmentId,
      "--state-dir",
      stateDir,
      "--reset-scope",
      "FULL_TEST_ISOLATION",
    ]);
    expect(reset.ok).toBe(true);

    manifest = await readJson<EphemeralManifest>(manifestFile(stateDir, environmentId));
    cleanliness = await readJson<CleanlinessReport>(cleanlinessFile(stateDir, environmentId));
    const evidence = await readJson<ResetEvidence>(
      evidenceFile(stateDir, environmentId, "reset-0001.json"),
    );

    expect(manifest.lifecycle_state).toBe("READY");
    expect(manifest.reset_counter).toBe(1);
    expect(manifest.resource_state.last_reset_scope_ref_or_null).toBe("FULL_TEST_ISOLATION");
    expect(manifest.last_reset_evidence_ref_or_null).toBe("evidence/reset-0001.json");
    expect(cleanliness.ok).toBe(true);
    expect(evidence.action_kind).toBe("RESET");
    expect(evidence.outcome).toBe("SUCCEEDED");
    expect(evidence.reset_scope_ref).toBe("FULL_TEST_ISOLATION");
    expect(evidence.resource_counts.object_prefix_object_count_total).toBe(0);
    expect(evidence.source_lineage).toEqual(
      expect.arrayContaining([
        "ephemeral_environment_catalog",
        "ephemeral_environment_lifecycle_policy",
        "ephemeral_reset_scope_policy",
      ]),
    );
  } finally {
    await rm(stateDir, { recursive: true, force: true });
  }
});

test("reset fails closed for queue outages and live leases, then cleanliness verification catches object and seed drift", async () => {
  const stateDir = await mkdtemp(path.join(os.tmpdir(), "taxat-ephemeral-reset-"));
  const environmentId = "env-ephemeral-local-reset-001";

  try {
    const bootstrap = await runPython(bootstrapScript, [
      "--environment-id",
      environmentId,
      "--scope-class",
      "LOCAL_HIGH_FIDELITY_SHARD",
      "--owner-ref",
      "local.suite.20260423.reset",
      "--shard-ref",
      "browser-01",
      "--runtime-profile",
      "local",
      "--state-dir",
      stateDir,
    ]);
    expect(bootstrap.ok).toBe(true);

    let manifest = await readJson<EphemeralManifest>(manifestFile(stateDir, environmentId));
    manifest.resource_state.service_availability.QUEUE = false;
    await writeJson(manifestFile(stateDir, environmentId), manifest);

    const queueUnavailableReset = await runPython(resetScript, [
      "--environment-id",
      environmentId,
      "--state-dir",
      stateDir,
      "--reset-scope",
      "FULL_TEST_ISOLATION",
    ]);
    expect(queueUnavailableReset.ok).toBe(false);
    expect(queueUnavailableReset.code).toBe(1);

    manifest = await readJson<EphemeralManifest>(manifestFile(stateDir, environmentId));
    expect(manifest.lifecycle_state).toBe("HALTED");
    expect(manifest.current_phase_ref).toBe("RUNTIME_HEALTH_GATE");

    manifest.resource_state.service_availability.QUEUE = true;
    manifest.resource_state.active_worker_leases = 2;
    await writeJson(manifestFile(stateDir, environmentId), manifest);

    const liveLeaseReset = await runPython(resetScript, [
      "--environment-id",
      environmentId,
      "--state-dir",
      stateDir,
      "--reset-scope",
      "FULL_TEST_ISOLATION",
    ]);
    expect(liveLeaseReset.ok).toBe(false);
    expect(liveLeaseReset.code).toBe(1);

    manifest = await readJson<EphemeralManifest>(manifestFile(stateDir, environmentId));
    expect(manifest.lifecycle_state).toBe("HALTED");
    expect(manifest.resource_state.active_worker_leases).toBe(2);

    const forcedReset = await runPython(resetScript, [
      "--environment-id",
      environmentId,
      "--state-dir",
      stateDir,
      "--reset-scope",
      "FULL_TEST_ISOLATION",
      "--force-fence-workers",
    ]);
    expect(forcedReset.ok).toBe(true);

    manifest = await readJson<EphemeralManifest>(manifestFile(stateDir, environmentId));
    expect(manifest.lifecycle_state).toBe("READY");
    expect(manifest.resource_state.active_worker_leases).toBe(0);
    expect(manifest.resource_state.last_reset_scope_ref_or_null).toBe("FULL_TEST_ISOLATION");

    manifest.resource_state.object_prefix_object_counts[manifest.namespaces.object_prefix_refs[1]] =
      1;
    await writeJson(manifestFile(stateDir, environmentId), manifest);

    const objectDrift = await runPython(verifyScript, [
      "--environment-id",
      environmentId,
      "--state-dir",
      stateDir,
    ]);
    expect(objectDrift.ok).toBe(false);
    expect(objectDrift.stdout).toContain("OBJECT_PREFIX_NOT_EMPTY");

    manifest = await readJson<EphemeralManifest>(manifestFile(stateDir, environmentId));
    manifest.resource_state.object_prefix_object_counts[manifest.namespaces.object_prefix_refs[1]] =
      0;
    manifest.seed_profile_hash = "0".repeat(64);
    await writeJson(manifestFile(stateDir, environmentId), manifest);

    const seedDrift = await runPython(verifyScript, [
      "--environment-id",
      environmentId,
      "--state-dir",
      stateDir,
    ]);
    expect(seedDrift.ok).toBe(false);
    expect(seedDrift.stdout).toContain("SEED_PROFILE_HASH_DRIFT");
  } finally {
    await rm(stateDir, { recursive: true, force: true });
  }
});
