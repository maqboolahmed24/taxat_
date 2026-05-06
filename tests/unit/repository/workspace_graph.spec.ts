import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { expect, test } from "@playwright/test";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..");

async function readJson(relativePath: string) {
  return JSON.parse(await readFile(path.join(repoRoot, relativePath), "utf8"));
}

test("workspace root stays private and exposes the expected task families", async () => {
  const packageJson = await readJson("package.json");
  const turboJson = await readJson("turbo.json");
  const workspaceManifest = await readFile(path.join(repoRoot, "pnpm-workspace.yaml"), "utf8");

  expect(packageJson.private).toBe(true);
  expect(packageJson.packageManager).toMatch(/^pnpm@10\./);
  expect(Object.keys(packageJson.scripts)).toEqual(
    expect.arrayContaining([
      "build",
      "test",
      "typecheck",
      "generate",
      "validate-contracts",
      "playwright",
      "lint",
    ]),
  );
  expect(packageJson.taxatBootstrap.lockfilePolicy).toContain("pnpm-lock.yaml");

  expect(workspaceManifest).toContain('"apps/*"');
  expect(workspaceManifest).toContain('"packages/*"');
  expect(workspaceManifest).toContain('"tools/*"');

  expect(Object.keys(turboJson.tasks)).toEqual(
    expect.arrayContaining([
      "build",
      "typecheck",
      "lint",
      "test",
      "generate",
      "playwright",
      "validate-contracts",
    ]),
  );
});

test("workspace topology atlas preserves family coverage and generated-package directionality", async () => {
  const atlas = await readJson(
    "apps/operator-web/public/internal/workspace-topology-atlas/data/workspace-topology-atlas.json",
  );

  expect(atlas.families.map((family: { family_ref: string }) => family.family_ref)).toEqual([
    "APPS",
    "SHARED_PACKAGES",
    "GENERATED",
    "PYTHON_TOOLING",
    "NATIVE_MACOS",
  ]);

  const generatedFamily = atlas.families.find(
    (family: { family_ref: string }) => family.family_ref === "GENERATED",
  );
  const sharedFamily = atlas.families.find(
    (family: { family_ref: string }) => family.family_ref === "SHARED_PACKAGES",
  );
  const generatedModels = generatedFamily.nodes.find(
    (node: { node_ref: string }) => node.node_ref === "generated-models",
  );
  const contractsCore = sharedFamily.nodes.find(
    (node: { node_ref: string }) => node.node_ref === "contracts-core",
  );

  expect(generatedModels.dependencies).toEqual(["contracts-core"]);
  expect(contractsCore.dependencies).toEqual([]);
  expect(atlas.overrides.map((entry: { adopted: string }) => entry.adopted)).toEqual(
    expect.arrayContaining([
      "packages/contracts-core",
      "packages/generated-models",
      "packages/runtime-foundation",
      "packages/web-platform",
      "packages/testing-harnesses",
    ]),
  );

  const bootstrappedNodeRefs = atlas.families
    .flatMap((family: { nodes: Array<{ node_ref: string; status: string }> }) => family.nodes)
    .filter((node: { status: string }) => node.status === "BOOTSTRAPPED")
    .map((node: { node_ref: string }) => node.node_ref);

  expect(bootstrappedNodeRefs).toEqual(
    expect.arrayContaining([
      "contracts-core",
      "generated-models",
      "runtime-foundation",
      "domain-kernel",
      "web-platform",
      "apps/operator-web",
      "python/validators",
      "native/TaxatOperator",
    ]),
  );
});
