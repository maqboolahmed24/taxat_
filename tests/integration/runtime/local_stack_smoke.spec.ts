import { execFile } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";

import { expect, test } from "@playwright/test";

const execFileAsync = promisify(execFile);
const repoRoot = "/Users/test/Code/taxat_";

async function runPython(args: string[]) {
  return execFileAsync("python3", args, {
    cwd: repoRoot,
    env: {
      ...process.env,
      PYTHONPATH: [path.join(repoRoot, "scripts", "local"), process.env.PYTHONPATH ?? ""]
        .filter(Boolean)
        .join(path.delimiter),
    },
    maxBuffer: 32 * 1024 * 1024,
  });
}

function healthySnapshot() {
  return {
    compose_service_states: [
      { compose_service_ref: "postgres", state: "running", health: "healthy", exit_code: null },
      { compose_service_ref: "postgres-bootstrap", state: "exited", health: null, exit_code: 0 },
      { compose_service_ref: "minio", state: "running", health: "healthy", exit_code: null },
      { compose_service_ref: "minio-bootstrap", state: "exited", health: null, exit_code: 0 },
      { compose_service_ref: "rabbitmq", state: "running", health: "healthy", exit_code: null },
      { compose_service_ref: "rabbitmq-bootstrap", state: "exited", health: null, exit_code: 0 },
      { compose_service_ref: "redis", state: "running", health: "healthy", exit_code: null },
      { compose_service_ref: "redis-bootstrap", state: "exited", health: null, exit_code: 0 },
    ],
  };
}

test("local seed and smoke scripts produce a deterministic semantic-ready state on cold boot", async () => {
  const tempDir = await mkdtemp(path.join(os.tmpdir(), "taxat-local-runtime-"));
  const snapshotPath = path.join(tempDir, "snapshot.json");

  try {
    await writeFile(snapshotPath, `${JSON.stringify(healthySnapshot(), null, 2)}\n`, "utf8");

    await runPython([
      "./scripts/local/seed_local_runtime.py",
      "--runtime-profile",
      "local",
      "--state-dir",
      tempDir,
    ]);
    const smoke = await runPython([
      "./scripts/local/smoke_local_runtime.py",
      "--state-dir",
      tempDir,
    ]);
    const wait = await runPython([
      "./scripts/local/wait_for_local_stack_ready.py",
      "--readiness-class",
      "SEMANTIC",
      "--snapshot",
      snapshotPath,
      "--state-dir",
      tempDir,
    ]);

    const state = JSON.parse(await readFile(path.join(tempDir, "local_runtime_state.json"), "utf8"));
    const smokePayload = JSON.parse(smoke.stdout);
    const waitPayload = JSON.parse(wait.stdout);

    expect(state.seed_profile_ref).toBe("PROFILE_DETERMINISTIC_BASELINE");
    expect(state.validator_status).toBe("PASSED");
    expect(state.markers.object_storage_bucket_refs).toContain("taxat-local-retained-evidence");
    expect(state.markers.queue_namespace_refs).toContain("queue.stage-work");
    expect(smokePayload.smoke.command_path.acceptance_state).toBe("ACCEPTED");
    expect(smokePayload.smoke.queue_path.queue_state).toBe("ACKNOWLEDGED");
    expect(smokePayload.smoke.audit_path.verification_status).toBe("VERIFIED");
    expect(waitPayload.ok).toBe(true);
    expect(waitPayload.readinessCodes).toEqual(
      expect.arrayContaining([
        "AUTHORITATIVE_VALIDATORS_PASSED",
        "CONTROL_SCHEMA_BUNDLE_ALIGNED",
        "OBJECT_STORAGE_BUCKETS_PRESENT",
        "QUEUE_NAMESPACES_PRESENT",
        "CACHE_NAMESPACES_PRESENT",
      ]),
    );
  } finally {
    await rm(tempDir, { force: true, recursive: true });
  }
});

test("wait script fails closed when broker health or bucket markers drift after a partial reset", async () => {
  const tempDir = await mkdtemp(path.join(os.tmpdir(), "taxat-local-runtime-drift-"));
  const snapshotPath = path.join(tempDir, "snapshot.json");

  try {
    await runPython([
      "./scripts/local/seed_local_runtime.py",
      "--runtime-profile",
      "local",
      "--state-dir",
      tempDir,
    ]);
    await runPython([
      "./scripts/local/smoke_local_runtime.py",
      "--state-dir",
      tempDir,
    ]);

    const statePath = path.join(tempDir, "local_runtime_state.json");
    const state = JSON.parse(await readFile(statePath, "utf8"));
    state.markers.object_storage_bucket_refs = ["taxat-local-upload-staging"];
    await writeFile(statePath, `${JSON.stringify(state, null, 2)}\n`, "utf8");

    await writeFile(
      snapshotPath,
      `${JSON.stringify(
        {
          compose_service_states: healthySnapshot().compose_service_states.map((service) =>
            service.compose_service_ref === "rabbitmq"
              ? { ...service, health: "unhealthy" }
              : service,
          ),
        },
        null,
        2,
      )}\n`,
      "utf8",
    );

    await expect(
      runPython([
        "./scripts/local/wait_for_local_stack_ready.py",
        "--readiness-class",
        "SEMANTIC",
        "--snapshot",
        snapshotPath,
        "--state-dir",
        tempDir,
      ]),
    ).rejects.toMatchObject({
      stdout: expect.stringContaining("OBJECT_STORAGE_BUCKET_MISSING"),
    });
  } finally {
    await rm(tempDir, { force: true, recursive: true });
  }
});
