import { execFile } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

import { expect, test } from "@playwright/test";

const execFileAsync = promisify(execFile);
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const taskGraphPath = path.join(repoRoot, "scripts", "tasks", "task_graph.py");
const profileResolverPath = path.join(repoRoot, "scripts", "agent", "resolve_environment_profile.py");

type PythonOk = {
  ok: true;
  stdout: string;
  stderr: string;
};

type PythonFailure = {
  ok: false;
  stdout: string;
  stderr: string;
  code: number | null;
};

async function runPython(args: string[]): Promise<PythonOk | PythonFailure> {
  try {
    const result = await execFileAsync("python3", args, {
      cwd: repoRoot,
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

test("task catalog validates and docs generation resolves its canonical dependencies", async () => {
  const validation = await runPython([taskGraphPath, "--json", "validate"]);
  expect(validation.ok).toBe(true);
  if (!validation.ok) {
    throw new Error("task graph validation failed");
  }

  const validationPayload = JSON.parse(validation.stdout) as {
    ok: boolean;
    taskCount: number;
    cardBindingCount: number;
  };
  expect(validationPayload.ok).toBe(true);
  expect(validationPayload.taskCount).toBeGreaterThanOrEqual(10);
  expect(validationPayload.cardBindingCount).toBeGreaterThanOrEqual(5);

  const resolution = await runPython([
    taskGraphPath,
    "--json",
    "resolve",
    "--task-ref",
    "docs.generate",
    "--profile",
    "ci-validation",
  ]);
  expect(resolution.ok).toBe(true);
  if (!resolution.ok) {
    throw new Error("docs.generate resolution failed");
  }

  const payload = JSON.parse(resolution.stdout) as {
    ok: boolean;
    resolvedTaskRefs: string[];
    plan: Array<{ taskRef: string }>;
  };
  expect(payload.ok).toBe(true);
  expect(payload.resolvedTaskRefs).toEqual([
    "contracts.import",
    "contracts.bindings",
    "drift.report",
    "docs.generate",
  ]);
  expect(payload.plan.at(-1)?.taskRef).toBe("docs.generate");
});

test("duplicate task aliases are rejected fail closed", async () => {
  const tempDir = await mkdtemp(path.join(os.tmpdir(), "taxat-task-catalog-"));
  const tempCatalogPath = path.join(tempDir, "task_catalog.json");

  try {
    const catalog = JSON.parse(
      await readFile(path.join(repoRoot, "scripts", "tasks", "task_catalog.json"), "utf8"),
    ) as {
      tasks: Array<{ aliases: string[] }>;
    };

    const duplicateTarget = catalog.tasks[1];
    expect(duplicateTarget).toBeDefined();
    if (!duplicateTarget) {
      throw new Error("expected a second task in the catalog fixture");
    }
    duplicateTarget.aliases = [...duplicateTarget.aliases, "bootstrap"];
    await writeFile(tempCatalogPath, `${JSON.stringify(catalog, null, 2)}\n`, "utf8");

    const validation = await runPython([
      taskGraphPath,
      "--catalog-path",
      tempCatalogPath,
      "--json",
      "validate",
    ]);
    expect(validation.ok).toBe(false);
    if (validation.ok) {
      throw new Error("duplicate alias unexpectedly validated");
    }

    const payload = JSON.parse(validation.stdout) as {
      code: string;
      message: string;
    };
    expect(payload.code).toBe("TASK_ALIAS_COLLISION");
    expect(payload.message).toContain("bootstrap");
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
});

test("environment profile resolution enforces destructive gating and supported profile law", async () => {
  const unsupported = await runPython([
    profileResolverPath,
    "--json",
    "--task-ref",
    "ephemeral.destroy",
    "--profile",
    "ci-validation",
  ]);
  expect(unsupported.ok).toBe(false);
  if (unsupported.ok) {
    throw new Error("unsupported destructive profile unexpectedly resolved");
  }
  expect(JSON.parse(unsupported.stdout).code).toBe(
    "UNSUPPORTED_ENVIRONMENT_PROFILE_FOR_DESTRUCTIVE_COMMAND",
  );

  const missingAck = await runPython([
    profileResolverPath,
    "--json",
    "--task-ref",
    "local.reset.full",
    "--profile",
    "local",
    "--enforce-dangerous",
  ]);
  expect(missingAck.ok).toBe(false);
  if (missingAck.ok) {
    throw new Error("destructive task resolved without acknowledgement");
  }
  expect(JSON.parse(missingAck.stdout).code).toBe("DANGEROUS_PROFILE_ACK_REQUIRED");

  const acknowledged = await runPython([
    profileResolverPath,
    "--json",
    "--task-ref",
    "local.reset.full",
    "--profile",
    "local",
    "--enforce-dangerous",
    "--ack-token",
    "ALLOW_DURABLE_LOCAL_RESET",
  ]);
  expect(acknowledged.ok).toBe(true);
  if (!acknowledged.ok) {
    throw new Error("destructive task did not resolve with acknowledgement");
  }

  const acknowledgedPayload = JSON.parse(acknowledged.stdout) as {
    ok: boolean;
    environmentRef: string;
    runtimeProfileRef: string;
  };
  expect(acknowledgedPayload.ok).toBe(true);
  expect(acknowledgedPayload.environmentRef).toBe("env_local_authoring");
  expect(acknowledgedPayload.runtimeProfileRef).toBe("local");
});

test("card bindings resolve to stable task families and unknown card ids fail closed", async () => {
  const binding = await runPython([
    taskGraphPath,
    "--json",
    "resolve-card",
    "--card-id",
    "pc_0082",
    "--phase",
    "all",
  ]);
  expect(binding.ok).toBe(true);
  if (!binding.ok) {
    throw new Error("pc_0082 binding did not resolve");
  }

  const payload = JSON.parse(binding.stdout) as {
    ok: boolean;
    executionPlan: string[];
    verificationPlan: string[];
  };
  expect(payload.ok).toBe(true);
  expect(payload.executionPlan).toContain("bootstrap.workspace");
  expect(payload.executionPlan).toContain("validate.repo");
  expect(payload.verificationPlan).toContain("test.unit.repository");
  expect(payload.verificationPlan).toContain("agent.verify-evidence");

  const unknown = await runPython([
    taskGraphPath,
    "--json",
    "resolve-card",
    "--card-id",
    "pc_9999",
    "--phase",
    "all",
  ]);
  expect(unknown.ok).toBe(false);
  if (unknown.ok) {
    throw new Error("unknown card id unexpectedly resolved");
  }
  expect(JSON.parse(unknown.stdout).code).toBe("CARD_ID_UNKNOWN");
});
