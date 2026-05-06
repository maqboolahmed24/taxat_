import { createHash } from "node:crypto";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { expect, test } from "@playwright/test";

import {
  contractImportBundle,
  sampleBindingCatalog,
  schemaCatalog,
  schemaCatalogById,
  schemaCatalogByName,
} from "../../../packages/contracts-core/src/schemaCatalog";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..");

function sha256(buffer: Buffer | string) {
  return createHash("sha256").update(buffer).digest("hex");
}

test("every imported schema and sample is represented in the generated source maps", async () => {
  const schemaDir = path.join(repoRoot, "packages/contracts-core/schemas");
  const sampleDir = path.join(repoRoot, "packages/contracts-core/samples");

  const schemaFiles = (await readdir(schemaDir))
    .filter((name) => name.endsWith(".schema.json"))
    .sort();
  const sampleFiles = (await readdir(sampleDir))
    .filter((name) => name.startsWith("sample_") && name.endsWith(".json"))
    .sort();

  expect(contractImportBundle.packagePath).toBe("packages/contracts-core");
  expect(contractImportBundle.packageOverride).toContain("packages/contracts-core");
  expect(contractImportBundle.counts.schemas).toBe(schemaFiles.length);
  expect(contractImportBundle.counts.samples).toBe(sampleFiles.length);

  expect(schemaCatalog.map((entry) => entry.schemaName).sort()).toEqual(schemaFiles);
  expect(sampleBindingCatalog.map((entry) => entry.sampleName).sort()).toEqual(sampleFiles);

  for (const sample of sampleBindingCatalog) {
    expect(schemaCatalogByName[sample.inferredSchemaName]).toBeDefined();
    expect(sample.inferredSchemaId).toBe(schemaCatalogByName[sample.inferredSchemaName].schemaId);
  }
});

test("stored hashes and resolved schema refs make import drift and ref breakage detectable", async () => {
  for (const schema of schemaCatalog) {
    const sourceBuffer = await readFile(path.join(repoRoot, schema.sourcePath));
    const destinationBuffer = await readFile(path.join(repoRoot, schema.destinationPath));

    expect(schema.sourceHash).toBe(sha256(sourceBuffer));
    expect(schema.destinationHash).toBe(sha256(destinationBuffer));

    for (const resolvedRef of schema.resolvedSchemaRefs) {
      expect(schemaCatalogByName[resolvedRef]).toBeDefined();
      expect(schemaCatalogById[schemaCatalogByName[resolvedRef].schemaId]).toBeDefined();
    }
  }

  for (const sample of sampleBindingCatalog) {
    const sourceBuffer = await readFile(path.join(repoRoot, sample.sourcePath));
    const destinationBuffer = await readFile(path.join(repoRoot, sample.destinationPath));

    expect(sample.sourceHash).toBe(sha256(sourceBuffer));
    expect(sample.destinationHash).toBe(sha256(destinationBuffer));
  }
});
