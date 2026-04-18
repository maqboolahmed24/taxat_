import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { expect, test } from "@playwright/test";

import {
  createKeyHierarchyAndEnvelopePolicy,
  createRotationAndRevocationPolicy,
  createSecretAliasCatalog,
  createSecretRootInventoryTemplate,
  createSecretRootTopologyLedgerViewModel,
  validateSecretAliasCatalog,
} from "../../../../infra/secrets/bootstrap/provision_secrets_manager_kms_or_hsm_roots.js";

const repoRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
  "..",
  "..",
  "..",
);

async function readJson<T>(segments: string[]): Promise<T> {
  const filePath = path.join(repoRoot, ...segments);
  return JSON.parse(await readFile(filePath, "utf8")) as T;
}

test("checked-in secret alias, hierarchy, rotation, inventory, and viewer artifacts stay aligned with the builder", async () => {
  const persistedAliasCatalog = await readJson([
    "config",
    "secrets",
    "secret_alias_catalog.json",
  ]);
  const persistedKeyHierarchy = await readJson([
    "config",
    "secrets",
    "key_hierarchy_and_envelope_policy.json",
  ]);
  const persistedRotationPolicy = await readJson([
    "config",
    "secrets",
    "rotation_and_revocation_policy.json",
  ]);
  const persistedInventory = await readJson([
    "data",
    "provisioning",
    "secret_root_inventory.template.json",
  ]);
  const sampleRun = await readJson<{
    secretRootTopologyLedger: ReturnType<
      typeof createSecretRootTopologyLedgerViewModel
    >;
  }>([
    "automation",
    "provisioning",
    "report_viewer",
    "data",
    "sample_run.json",
  ]);

  expect(persistedAliasCatalog).toEqual(createSecretAliasCatalog());
  expect(persistedKeyHierarchy).toEqual(createKeyHierarchyAndEnvelopePolicy());
  expect(persistedRotationPolicy).toEqual(createRotationAndRevocationPolicy());
  expect(persistedInventory).toEqual(createSecretRootInventoryTemplate());
  expect(sampleRun.secretRootTopologyLedger).toEqual(
    createSecretRootTopologyLedgerViewModel(),
  );
});

test("alias families remain unique and namespace-partitioned", () => {
  const catalog = createSecretAliasCatalog();
  validateSecretAliasCatalog(catalog);

  expect(catalog.summary.alias_count).toBe(20);
  expect(catalog.summary.namespace_partition_count).toBe(16);
  expect(
    catalog.aliases.every((alias) =>
      alias.namespace_refs.length <= 1
        ? true
        : alias.store_ref_template.includes("{namespace}"),
    ),
  ).toBe(true);

  const authorityAliases = catalog.aliases.filter((alias) =>
    alias.secret_class === "AUTHORITY_CLIENT_SECRET",
  );
  expect(
    authorityAliases.every((alias) =>
      alias.namespace_refs.every((namespaceRef) =>
        namespaceRef.includes("authority"),
      ),
    ),
  ).toBe(true);
});
