import { execFile } from "node:child_process";
import { readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

import { expect, test } from "@playwright/test";

const execFileAsync = promisify(execFile);
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const generatorPath = path.join(
  repoRoot,
  "packages/contracts-docs/src/generate_contract_observatory.ts",
);
const siteManifestPath = path.join(
  repoRoot,
  "apps/operator-web/public/internal/contracts-observatory/data/site-manifest.json",
);
const navigationIndexPath = path.join(
  repoRoot,
  "apps/operator-web/public/internal/contracts-observatory/data/navigation-index.json",
);
const overviewArtifactPath = path.join(
  repoRoot,
  "apps/operator-web/public/internal/contracts-observatory/data/artifacts/overview.json",
);

test.describe.configure({ mode: "serial" });
test.setTimeout(180_000);

test("generator emit and check remain deterministic for the live observatory payload", async () => {
  await execFileAsync(
    "node",
    ["--experimental-strip-types", generatorPath, "--emit"],
    { cwd: repoRoot, maxBuffer: 32 * 1024 * 1024 },
  );

  const [siteManifestBefore, navigationBefore, overviewBefore] = await Promise.all([
    readFile(siteManifestPath, "utf8"),
    readFile(navigationIndexPath, "utf8"),
    readFile(overviewArtifactPath, "utf8"),
  ]);

  const check = await execFileAsync(
    "node",
    ["--experimental-strip-types", generatorPath, "--check"],
    { cwd: repoRoot, maxBuffer: 32 * 1024 * 1024 },
  );
  expect(check.stdout).toContain("verified contract observatory artifacts");

  const [siteManifestAfter, navigationAfter, overviewAfter] = await Promise.all([
    readFile(siteManifestPath, "utf8"),
    readFile(navigationIndexPath, "utf8"),
    readFile(overviewArtifactPath, "utf8"),
  ]);

  expect(siteManifestAfter).toBe(siteManifestBefore);
  expect(navigationAfter).toBe(navigationBefore);
  expect(overviewAfter).toBe(overviewBefore);
});

test("generator fails closed when an authoritative Algorithm document introduces a broken reference", async () => {
  const fixturePath = path.join(repoRoot, "Algorithm", "contract_observatory_failure_fixture.md");

  await writeFile(
    fixturePath,
    [
      "# Contract Observatory Failure Fixture",
      "",
      "This file mentions `missing_contract_observatory_fixture.schema.json`.",
      "",
      "[Broken relative link](./definitely_missing_contract_observatory_target.md)",
    ].join("\n"),
    "utf8",
  );

  try {
    await expect(
      execFileAsync(
        "node",
        ["--experimental-strip-types", generatorPath, "--emit"],
        { cwd: repoRoot, maxBuffer: 32 * 1024 * 1024 },
      ),
    ).rejects.toMatchObject({
      stderr: expect.stringContaining("contract observatory validation failed"),
    });
  } finally {
    await rm(fixturePath, { force: true });
    await execFileAsync(
      "node",
      ["--experimental-strip-types", generatorPath, "--emit"],
      { cwd: repoRoot, maxBuffer: 32 * 1024 * 1024 },
    );
  }
});
