import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { expect, test } from "@playwright/test";

const execFileAsync = promisify(execFile);
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const importTool = path.join(repoRoot, "tools/contracts/import_algorithm_contracts.ts");
const hashChecker = path.join(repoRoot, "tools/contracts/sync_contract_hashes.py");
const importedValidator = path.join(
  repoRoot,
  "packages/contracts-core/python/validate_contracts.py",
);
const sourceMapPath = path.join(repoRoot, "packages/contracts-core/data/schema_source_map.json");
const sampleMapPath = path.join(repoRoot, "packages/contracts-core/data/sample_binding_map.json");

test.describe.configure({ mode: "serial" });
test.setTimeout(180_000);

test("import script can re-run without changing the mirrored contract outputs", async () => {
  const beforeSourceMap = await readFile(sourceMapPath, "utf8");
  const beforeSampleMap = await readFile(sampleMapPath, "utf8");

  await execFileAsync("node", ["--experimental-strip-types", importTool, "--emit"], {
    cwd: repoRoot,
    maxBuffer: 16 * 1024 * 1024,
  });

  const afterSourceMap = await readFile(sourceMapPath, "utf8");
  const afterSampleMap = await readFile(sampleMapPath, "utf8");

  expect(afterSourceMap).toBe(beforeSourceMap);
  expect(afterSampleMap).toBe(beforeSampleMap);
});

test("imported validator self-test and hash checker remain runnable", async () => {
  const hashCheck = await execFileAsync("python3", [hashChecker, "--check"], {
    cwd: repoRoot,
    maxBuffer: 16 * 1024 * 1024,
  });
  expect(hashCheck.stdout).toContain("PASS: imported contract hashes match");

  const validatorCheck = await execFileAsync(
    path.join(repoRoot, ".venv/bin/python3"),
    [importedValidator, "--self-test"],
    {
      cwd: repoRoot,
      maxBuffer: 16 * 1024 * 1024,
    },
  );
  expect(validatorCheck.stdout).toContain(
    "PASS: schemas, bundled samples, and custom invariants validated.",
  );
});
