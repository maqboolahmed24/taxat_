import { execFile } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

import { expect, test } from "@playwright/test";

const execFileAsync = promisify(execFile);
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const pythonPath = path.join(repoRoot, "scripts", "test");
const bootstrapScript = path.join(
  repoRoot,
  "scripts",
  "test",
  "bootstrap_ephemeral_environment.py",
);
const destroyScript = path.join(repoRoot, "scripts", "test", "destroy_ephemeral_environment.py");
const resetScript = path.join(repoRoot, "scripts", "test", "reset_ephemeral_environment.py");
const verifyScript = path.join(repoRoot, "scripts", "test", "verify_ephemeral_cleanliness.py");

type PythonOutcome =
  | { ok: true; stdout: string; stderr: string }
  | { ok: false; stdout: string; stderr: string; code: number | null };

type EphemeralManifest = {
  environment_id: string;
  environment_ref: string;
  lifecycle_state: string;
  environment_identity_hash: string;
  namespace_hash: string;
  namespaces: {
    queue_namespace_refs: string[];
    object_prefix_refs: string[];
  };
  resource_state: {
    debug_retention_active: boolean;
  };
  last_reset_evidence_ref_or_null: string | null;
};

function environmentDir(stateDir: string, environmentId: string) {
  return path.join(stateDir, environmentId);
}

function manifestFile(stateDir: string, environmentId: string) {
  return path.join(environmentDir(stateDir, environmentId), "environment_manifest.json");
}

function seedMaterialFile(stateDir: string, environmentId: string) {
  return path.join(environmentDir(stateDir, environmentId), "seed_material.json");
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

test("parallel environments derive distinct namespaces and destroying one leaves the sibling intact", async () => {
  const stateDir = await mkdtemp(path.join(os.tmpdir(), "taxat-ephemeral-parallel-"));

  try {
    const sharedArgs = [
      "--scope-class",
      "CI_RUN_SHARD",
      "--owner-ref",
      "ci.parallel.20260423",
      "--runtime-profile",
      "local",
      "--state-dir",
      stateDir,
    ];

    const firstId = "env-ephemeral-ci-parallel-001";
    const secondId = "env-ephemeral-ci-parallel-002";

    const [first, second] = await Promise.all([
      runPython(bootstrapScript, [
        "--environment-id",
        firstId,
        "--shard-ref",
        "shard-a",
        ...sharedArgs,
      ]),
      runPython(bootstrapScript, [
        "--environment-id",
        secondId,
        "--shard-ref",
        "shard-b",
        ...sharedArgs,
      ]),
    ]);

    expect(first.ok).toBe(true);
    expect(second.ok).toBe(true);

    const [firstManifest, secondManifest] = await Promise.all([
      readJson<EphemeralManifest>(manifestFile(stateDir, firstId)),
      readJson<EphemeralManifest>(manifestFile(stateDir, secondId)),
    ]);

    expect(firstManifest.lifecycle_state).toBe("READY");
    expect(secondManifest.lifecycle_state).toBe("READY");
    expect(firstManifest.environment_identity_hash).not.toBe(
      secondManifest.environment_identity_hash,
    );
    expect(firstManifest.namespace_hash).not.toBe(secondManifest.namespace_hash);
    expect(firstManifest.namespaces.queue_namespace_refs[0]).not.toBe(
      secondManifest.namespaces.queue_namespace_refs[0],
    );
    expect(firstManifest.namespaces.object_prefix_refs[0]).not.toBe(
      secondManifest.namespaces.object_prefix_refs[0],
    );

    const destroyed = await runPython(destroyScript, [
      "--environment-id",
      firstId,
      "--state-dir",
      stateDir,
    ]);
    expect(destroyed.ok).toBe(true);

    const postDestroyFirst = await readJson<EphemeralManifest>(manifestFile(stateDir, firstId));
    expect(postDestroyFirst.lifecycle_state).toBe("DESTROYED");
    expect(postDestroyFirst.last_reset_evidence_ref_or_null).toBe("evidence/destroy-0001.json");

    const survivingManifest = await readJson<EphemeralManifest>(manifestFile(stateDir, secondId));
    expect(survivingManifest.lifecycle_state).toBe("READY");

    const siblingVerify = await runPython(verifyScript, [
      "--environment-id",
      secondId,
      "--state-dir",
      stateDir,
    ]);
    expect(siblingVerify.ok).toBe(true);
    await expect(readFile(seedMaterialFile(stateDir, secondId), "utf8")).resolves.toContain(
      secondId,
    );
  } finally {
    await rm(stateDir, { recursive: true, force: true });
  }
});

test("destroy respects debug retention and reset or destroy refuse non-ephemeral manifests", async () => {
  const stateDir = await mkdtemp(path.join(os.tmpdir(), "taxat-ephemeral-guard-"));

  try {
    const debugId = "env-ephemeral-local-debug-001";
    const debugBootstrap = await runPython(bootstrapScript, [
      "--environment-id",
      debugId,
      "--scope-class",
      "LOCAL_HIGH_FIDELITY_SHARD",
      "--owner-ref",
      "local.debug.20260423",
      "--shard-ref",
      "debug-a",
      "--runtime-profile",
      "local",
      "--state-dir",
      stateDir,
      "--debug-retention-active",
    ]);
    expect(debugBootstrap.ok).toBe(true);

    const blockedDestroy = await runPython(destroyScript, [
      "--environment-id",
      debugId,
      "--state-dir",
      stateDir,
    ]);
    expect(blockedDestroy.ok).toBe(false);
    expect(blockedDestroy.code).toBe(1);

    let debugManifest = await readJson<EphemeralManifest>(manifestFile(stateDir, debugId));
    expect(debugManifest.lifecycle_state).toBe("HALTED");
    expect(debugManifest.resource_state.debug_retention_active).toBe(true);

    const overrideDestroy = await runPython(destroyScript, [
      "--environment-id",
      debugId,
      "--state-dir",
      stateDir,
      "--override-debug-retention",
    ]);
    expect(overrideDestroy.ok).toBe(true);

    debugManifest = await readJson<EphemeralManifest>(manifestFile(stateDir, debugId));
    expect(debugManifest.lifecycle_state).toBe("DESTROYED");
    expect(debugManifest.last_reset_evidence_ref_or_null).toBe("evidence/destroy-0001.json");

    const fakeId = "env-ephemeral-ci-guard-001";
    const fakeBootstrap = await runPython(bootstrapScript, [
      "--environment-id",
      fakeId,
      "--scope-class",
      "CI_RUN_SHARD",
      "--owner-ref",
      "ci.guard.20260423",
      "--shard-ref",
      "guard-a",
      "--runtime-profile",
      "local",
      "--state-dir",
      stateDir,
    ]);
    expect(fakeBootstrap.ok).toBe(true);

    const fakeManifest = await readJson<EphemeralManifest>(manifestFile(stateDir, fakeId));
    await writeJson(manifestFile(stateDir, fakeId), {
      ...fakeManifest,
      environment_ref: "env_shared_stage",
    });

    const resetFake = await runPython(resetScript, [
      "--environment-id",
      fakeId,
      "--state-dir",
      stateDir,
    ]);
    expect(resetFake.ok).toBe(false);
    expect(resetFake.stderr).toContain("is not ephemeral and cannot be targeted");

    const destroyFake = await runPython(destroyScript, [
      "--environment-id",
      fakeId,
      "--state-dir",
      stateDir,
    ]);
    expect(destroyFake.ok).toBe(false);
    expect(destroyFake.stderr).toContain("is not ephemeral and cannot be targeted");
  } finally {
    await rm(stateDir, { recursive: true, force: true });
  }
});
