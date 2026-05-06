import { execFile } from "node:child_process";
import { createHash } from "node:crypto";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";

import { expect, test } from "@playwright/test";

import {
  SurfaceAndExperienceBindingManifest,
  generatedModelsBoundary,
} from "../../../packages/generated-models/src/index";

const execFileAsync = promisify(execFile);
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const generatorTool = path.join(repoRoot, "tools/contracts/generate_language_bindings.ts");
const sourceMapPath = path.join(repoRoot, "packages/contracts-core/data/schema_source_map.json");
const coverageReportPath = path.join(repoRoot, "data/contracts/binding_coverage_report.json");
const gapRegisterPath = path.join(repoRoot, "data/contracts/binding_gap_register.json");
const atlasPayloadPath = path.join(
  repoRoot,
  "apps/operator-web/public/internal/binding-coverage-atlas/data/binding-coverage-atlas.json",
);
const tsIndexPath = path.join(
  repoRoot,
  "packages/generated-models/src/generated/typescript/index.ts",
);
const pythonGeneratedDir = path.join(
  repoRoot,
  "python/generated_contract_models/src/taxat_generated_contract_models/generated",
);

function sha256(buffer: Buffer | string) {
  return createHash("sha256").update(buffer).digest("hex");
}

test.describe.configure({ mode: "serial" });
test.setTimeout(240_000);

test("binding generation can re-run without drift and preserves source-hash lineage", async () => {
  const [beforeCoverage, beforeGapRegister, beforeAtlas, beforeTsIndex] = await Promise.all([
    readFile(coverageReportPath, "utf8"),
    readFile(gapRegisterPath, "utf8"),
    readFile(atlasPayloadPath, "utf8"),
    readFile(tsIndexPath, "utf8"),
  ]);

  await execFileAsync("node", ["--experimental-strip-types", generatorTool, "--emit"], {
    cwd: repoRoot,
    maxBuffer: 32 * 1024 * 1024,
  });

  const [afterCoverage, afterGapRegister, afterAtlas, afterTsIndex, sourceMapBuffer] =
    await Promise.all([
      readFile(coverageReportPath, "utf8"),
      readFile(gapRegisterPath, "utf8"),
      readFile(atlasPayloadPath, "utf8"),
      readFile(tsIndexPath, "utf8"),
      readFile(sourceMapPath),
    ]);

  expect(afterCoverage).toBe(beforeCoverage);
  expect(afterGapRegister).toBe(beforeGapRegister);
  expect(afterAtlas).toBe(beforeAtlas);
  expect(afterTsIndex).toBe(beforeTsIndex);

  const coverage = JSON.parse(afterCoverage);
  const gapRegister = JSON.parse(afterGapRegister);

  expect(coverage.generationBasis.sourceMapHash).toBe(sha256(sourceMapBuffer));
  expect(
    coverage.languages
      .find((language: { languageRef: string }) => language.languageRef === "SWIFT")
      .families.some(
        (family: { coverageClass: string }) => family.coverageClass === "NOT_TARGETED",
      ),
  ).toBe(true);
  expect(
    gapRegister.entries.some(
      (entry: { gapId: string }) =>
        entry.gapId === "SWIFT:GOVERNANCE_AND_POLICY:SWIFT_FAMILY_NOT_TARGETED",
    ),
  ).toBe(true);
});

test("generated TypeScript, Python, and Swift surfaces remain loadable", async () => {
  expect(generatedModelsBoundary.packageId).toBe("generated-models");
  expect(SurfaceAndExperienceBindingManifest.familyRef).toBe("SURFACE_AND_EXPERIENCE");
  expect(SurfaceAndExperienceBindingManifest.schemaCount).toBeGreaterThan(0);

  const pythonFiles = (await readdir(pythonGeneratedDir))
    .filter((name) => name.endsWith(".py"))
    .map((name) => path.join(pythonGeneratedDir, name));

  await execFileAsync("python3", ["-m", "py_compile", ...pythonFiles], {
    cwd: repoRoot,
    maxBuffer: 32 * 1024 * 1024,
  });

  const swift = await execFileAsync("swift", ["test"], {
    cwd: path.join(repoRoot, "native/TaxatOperator"),
    maxBuffer: 32 * 1024 * 1024,
  });
  expect(`${swift.stdout}${swift.stderr}`).toContain("GeneratedContractsSmokeTests");

  const check = await execFileAsync(
    "node",
    ["--experimental-strip-types", generatorTool, "--check"],
    {
      cwd: repoRoot,
      maxBuffer: 32 * 1024 * 1024,
    },
  );
  expect(check.stdout).toContain("verified language bindings");
});
