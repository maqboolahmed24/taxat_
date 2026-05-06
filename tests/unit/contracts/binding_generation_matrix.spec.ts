import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { expect, test } from "@playwright/test";

import { schemaCatalog } from "../../../packages/contracts-core/src/schemaCatalog";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..");

async function readJson(relativePath: string) {
  return JSON.parse(await readFile(path.join(repoRoot, relativePath), "utf8"));
}

test("every schema family has a declared binding posture across TypeScript, Python, and Swift", async () => {
  const matrix = await readJson("config/contracts/binding_generation_matrix.json");
  const expectedCounts = new Map<string, number>();

  for (const entry of schemaCatalog) {
    expectedCounts.set(
      entry.logicalFamilyRef,
      (expectedCounts.get(entry.logicalFamilyRef) ?? 0) + 1,
    );
  }

  expect(matrix.packageOverrides["packages/generated-types"]).toBe("packages/generated-models");
  expect(matrix.families.map((family: { familyRef: string }) => family.familyRef).sort()).toEqual(
    [...expectedCounts.keys()].sort(),
  );

  for (const family of matrix.families) {
    expect(family.targets.TYPESCRIPT.enabled).toBe(true);
    expect(family.targets.PYTHON.enabled).toBe(true);
    expect(typeof family.targets.SWIFT.enabled).toBe("boolean");
    expect(family.expectedSchemaCount).toBe(expectedCounts.get(family.familyRef));
    if (!family.targets.SWIFT.enabled) {
      expect(family.targets.SWIFT.reason).toContain("NOT_TARGETED");
    }
  }
});

test("decimal and naming policy propagate into the generated binding primitives deterministically", async () => {
  const [policy, coverage, tsPrimitives, pyPrimitives, swiftPrimitives] = await Promise.all([
    readJson("config/contracts/binding_naming_and_decimal_policy.json"),
    readJson("data/contracts/binding_coverage_report.json"),
    readFile(
      path.join(repoRoot, "packages/generated-models/src/generated/typescript/primitives.ts"),
      "utf8",
    ),
    readFile(
      path.join(
        repoRoot,
        "python/generated_contract_models/src/taxat_generated_contract_models/generated/primitives.py",
      ),
      "utf8",
    ),
    readFile(
      path.join(
        repoRoot,
        "native/TaxatOperator/GeneratedContracts/Sources/GeneratedContracts/Generated/GeneratedPrimitives.swift",
      ),
      "utf8",
    ),
  ]);

  expect(policy.generatedFileBanner).toContain("DO NOT EDIT");
  expect(policy.exactDecimalPolicy.posture).toContain("NEVER_COERCE");

  expect(tsPrimitives).toContain("export type ExactDecimalString = string;");
  expect(tsPrimitives).toContain("export type ISO8601DateTimeString = string;");
  expect(pyPrimitives).toContain("type ExactDecimalString = str");
  expect(pyPrimitives).toContain("type ISO8601DateTimeString = str");
  expect(swiftPrimitives).toContain("public typealias ExactDecimalString = String");
  expect(swiftPrimitives).toContain("public typealias ISO8601DateTimeString = String");

  expect(coverage.packageOverride).toContain("packages/generated-models");
  expect(coverage.generationBasis.matrixVersion).toBe("BINDING_GENERATION_MATRIX_V1");
  expect(
    coverage.languages.map((language: { languageRef: string }) => language.languageRef),
  ).toEqual(["TYPESCRIPT", "PYTHON", "SWIFT", "GAP_REGISTRY"]);
});
