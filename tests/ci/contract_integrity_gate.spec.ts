import { execFile } from "node:child_process";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

import { expect, test } from "@playwright/test";

const execFileAsync = promisify(execFile);
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");

async function readText(relativePath: string): Promise<string> {
  return readFile(path.join(repoRoot, relativePath), "utf8");
}

async function readJson(relativePath: string) {
  return JSON.parse(await readText(relativePath));
}

test("package scripts expose the contract-integrity wrapper as the local entrypoint", async () => {
  const packageJson = await readJson("package.json");

  expect(packageJson.scripts["contract-integrity"]).toBe(
    "bash ./scripts/ci/run_contract_integrity_gate.sh",
  );
  expect(packageJson.scripts["contract-integrity:dry-run"]).toBe(
    "bash ./scripts/ci/run_contract_integrity_gate.sh --dry-run",
  );
  expect(packageJson.scripts["validate-contracts"]).toContain("pnpm run contract-integrity");
});

test("workflow uses the same wrapper and runs as a blocking PR/main/release gate", async () => {
  const workflow = await readText(".github/workflows/contract-integrity.yml");

  expect(workflow).toContain("pull_request:");
  expect(workflow).toContain("branches:");
  expect(workflow).toContain("main");
  expect(workflow).toContain("release/**");
  expect(workflow).toContain("python-version: \"3.14\"");
  expect(workflow).toContain("bash scripts/ci/run_contract_integrity_gate.sh");
  expect(workflow).not.toContain("continue-on-error: true");
});

test("task catalog delegates validate.contracts to the same wrapper", async () => {
  const catalog = await readJson("scripts/tasks/task_catalog.json");
  const task = catalog.tasks.find(
    (entry: { taskRef: string }) => entry.taskRef === "validate.contracts",
  );

  expect(task).toBeDefined();
  expect(task.commands[0]).toEqual({
    commandRef: "contract-integrity-gate",
    argv: ["bash", "./scripts/ci/run_contract_integrity_gate.sh"],
  });
  expect(task.commands[1].commandRef).toBe("contracts-core-self-test");
});

test("dry-run resolves the canonical validator and forensic guard commands", async () => {
  const result = await execFileAsync(
    "bash",
    ["scripts/ci/run_contract_integrity_gate.sh", "--dry-run"],
    {
      cwd: repoRoot,
      maxBuffer: 1024 * 1024,
    },
  );

  expect(result.stdout).toContain("contract integrity gate: dry run");
  expect(result.stdout).toContain("Algorithm/scripts/validate_contracts.py --self-test");
  expect(result.stdout).toContain("Algorithm/tools/forensic_contract_guard.py");
});

test("wrapper stays deterministic and does not perform dependency or network fetches", async () => {
  const wrapper = await readText("scripts/ci/run_contract_integrity_gate.sh");

  expect(wrapper).toContain("PYTHONDONTWRITEBYTECODE=1");
  expect(wrapper).toContain("PYTHONHASHSEED=0");
  expect(wrapper).toContain("GITHUB_ACTIONS");
  expect(wrapper).not.toMatch(/\b(curl|wget|npm install|pnpm install|pip install)\b/);
});
