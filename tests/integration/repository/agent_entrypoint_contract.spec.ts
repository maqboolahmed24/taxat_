import { execFile } from "node:child_process";
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

import { expect, test } from "@playwright/test";

const execFileAsync = promisify(execFile);
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const bootstrapScript = path.join(repoRoot, "scripts", "agent", "bootstrap_agent_workspace.sh");
const runCardScript = path.join(repoRoot, "scripts", "agent", "run_card_task.sh");
const taskGraphPath = path.join(repoRoot, "scripts", "tasks", "task_graph.py");

type CommandOutcome =
  | { ok: true; stdout: string; stderr: string }
  | { ok: false; stdout: string; stderr: string; code: number | null };

async function runCommand(
  executable: string,
  args: string[],
  env: NodeJS.ProcessEnv = process.env,
): Promise<CommandOutcome> {
  try {
    const result = await execFileAsync(executable, args, {
      cwd: repoRoot,
      env,
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

test("bootstrap and card entrypoints produce deterministic dry-run plans", async () => {
  const bootstrap = await runCommand("bash", [
    bootstrapScript,
    "--profile",
    "ci-validation",
    "--dry-run",
    "--json",
  ]);
  expect(bootstrap.ok).toBe(true);
  if (!bootstrap.ok) {
    throw new Error("bootstrap agent workspace dry-run failed");
  }

  const bootstrapPayload = JSON.parse(bootstrap.stdout) as {
    ok: boolean;
    action: string;
    requiredTools: string[];
    commands: string[][];
  };
  expect(bootstrapPayload.ok).toBe(true);
  expect(bootstrapPayload.action).toBe("bootstrap.workspace");
  expect(bootstrapPayload.requiredTools).toEqual(["bash", "node", "pnpm", "python3"]);
  expect(bootstrapPayload.commands[0]).toEqual(["pnpm", "install", "--frozen-lockfile"]);

  const cardRun = await runCommand("bash", [
    runCardScript,
    "--card-id",
    "pc_0082",
    "--profile",
    "ci-validation",
    "--dry-run",
    "--json",
  ]);
  expect(cardRun.ok).toBe(true);
  if (!cardRun.ok) {
    throw new Error("card dry-run failed");
  }

  const cardPayload = JSON.parse(cardRun.stdout) as {
    ok: boolean;
    cardId: string;
    binding: {
      executionPlan: string[];
      verificationPlan: string[];
    };
    run: {
      dryRun: boolean;
      resolvedTaskRefs: string[];
    };
  };
  expect(cardPayload.ok).toBe(true);
  expect(cardPayload.cardId).toBe("pc_0082");
  expect(cardPayload.binding.executionPlan).toContain("validate.repo");
  expect(cardPayload.binding.verificationPlan).toContain("test.smoke.repository");
  expect(cardPayload.run.dryRun).toBe(true);
  expect(cardPayload.run.resolvedTaskRefs).toContain("test.integration.repository");
});

test("entrypoints fail closed for unknown cards and missing local stack health", async () => {
  const unknownCard = await runCommand("bash", [
    runCardScript,
    "--card-id",
    "pc_9999",
    "--profile",
    "ci-validation",
    "--dry-run",
    "--json",
  ]);
  expect(unknownCard.ok).toBe(false);
  if (unknownCard.ok) {
    throw new Error("unknown card unexpectedly passed");
  }
  expect(JSON.parse(unknownCard.stdout).code).toBe("CARD_ID_UNKNOWN");

  const tempDir = await mkdtemp(path.join(os.tmpdir(), "taxat-task-runner-"));
  try {
    const missingLocalState = await runCommand("python3", [
      taskGraphPath,
      "--json",
      "run",
      "--task-ref",
      "ephemeral.bootstrap",
      "--profile",
      "ci-validation",
      "--param",
      "environment_id=env-ephemeral-ci-contract-001",
      "--param",
      "owner_ref=ci.contract.entrypoint",
      "--param",
      "shard_ref=shard-a",
      "--param",
      `state_dir=${tempDir}`,
      "--param",
      `local_state_dir=${path.join(tempDir, "local-runtime")}`,
    ]);
    expect(missingLocalState.ok).toBe(false);
    if (missingLocalState.ok) {
      throw new Error("ephemeral bootstrap unexpectedly ignored local stack health");
    }
    expect(JSON.parse(missingLocalState.stdout).code).toBe("LOCAL_STACK_UNHEALTHY");
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
});
