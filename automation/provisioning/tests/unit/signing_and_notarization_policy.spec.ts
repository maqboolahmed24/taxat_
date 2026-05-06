import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { expect, test } from "@playwright/test";

import {
  createBuildTargetCatalog,
  createSigningAndNotarizationPolicy,
  validateBuildTargetCatalog,
  validateSigningAndNotarizationPolicy,
  type BuildTargetCatalog,
  type SigningAndNotarizationPolicy,
} from "../../../../infra/supplychain/bootstrap/provision_registry_signing_and_attestation.js";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "..");

async function readJson<T>(segments: string[]): Promise<T> {
  return JSON.parse(await readFile(path.join(repoRoot, ...segments), "utf8")) as T;
}

test("checked-in build target catalog and signing policy match the builder", async () => {
  const persistedCatalog = await readJson<BuildTargetCatalog>([
    "config",
    "supplychain",
    "build_target_catalog.json",
  ]);
  const persistedPolicy = await readJson<SigningAndNotarizationPolicy>([
    "config",
    "supplychain",
    "signing_and_notarization_policy.json",
  ]);

  expect(persistedCatalog).toEqual(createBuildTargetCatalog());
  expect(persistedPolicy).toEqual(createSigningAndNotarizationPolicy());
});

test("every declared build target has explicit signing posture and macOS targets fail closed", () => {
  const catalog = createBuildTargetCatalog();
  const policy = createSigningAndNotarizationPolicy();

  validateBuildTargetCatalog(catalog);
  validateSigningAndNotarizationPolicy(policy, catalog);

  expect(catalog.target_rows).toHaveLength(8);

  for (const target of catalog.target_rows) {
    expect(target.signature_requirement_ref).not.toHaveLength(0);
    expect(target.provenance_requirement_ref).not.toHaveLength(0);
    expect(target.sbom_requirement_ref).not.toHaveLength(0);
    expect(target.retention_class_ref).not.toHaveLength(0);
    expect(target.admission_profile_ref).not.toHaveLength(0);

    const binding = policy.target_bindings.find((row) => row.target_ref === target.target_ref);
    expect(binding).toBeTruthy();
    expect(binding?.signature_required).toBe(true);
    expect(binding?.trust_root_refs.length).toBeGreaterThan(0);
  }

  const macosTargets = catalog.target_rows.filter(
    (target) => target.distribution_target === "MACOS_DESKTOP",
  );
  expect(macosTargets).toHaveLength(1);
  expect(macosTargets[0]?.notarization_requirement_ref_or_null).toBe(
    "notarization.apple-developer-id",
  );

  const nativeFamily = policy.family_rows.find(
    (row) => row.artifact_family_ref === "NATIVE_DESKTOP",
  );
  expect(nativeFamily?.notarization_required_for_distribution_targets).toContain("MACOS_DESKTOP");
  expect(nativeFamily?.trust_root_refs).toEqual(
    expect.arrayContaining(["trust_root.apple.developer-id"]),
  );

  const serialized = JSON.stringify(policy);
  expect(serialized).not.toContain("BEGIN PRIVATE KEY");
  expect(serialized.toLowerCase()).not.toContain("password");
});
