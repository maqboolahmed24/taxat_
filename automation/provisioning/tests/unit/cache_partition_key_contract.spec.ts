import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { expect, test } from "@playwright/test";

import {
  createCacheInventoryTemplate,
  createCachePartitionKeyContract,
  createResumeIsolationAtlasViewModel,
  validateCachePartitionKeyContract,
  type CacheInventoryTemplate,
  type CachePartitionKeyContract,
  type ResumeIsolationAtlasViewModel,
} from "../../../../infra/cache/bootstrap/provision_cache_and_stream_resume_store.js";

const repoRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
  "..",
  "..",
  "..",
);

async function readJson<T>(segments: string[]): Promise<T> {
  return JSON.parse(
    await readFile(path.join(repoRoot, ...segments), "utf8"),
  ) as T;
}

test("checked-in partition contract, inventory, and atlas payload match the builder", async () => {
  const persistedContract = await readJson<CachePartitionKeyContract>([
    "config",
    "cache",
    "cache_partition_key_contract.json",
  ]);
  const persistedInventory = await readJson<CacheInventoryTemplate>([
    "data",
    "provisioning",
    "cache_inventory.template.json",
  ]);
  const sampleRun = await readJson<{
    resumeIsolationAtlas: ResumeIsolationAtlasViewModel;
  }>([
    "automation",
    "provisioning",
    "report_viewer",
    "data",
    "sample_run.json",
  ]);

  expect(persistedContract).toEqual(createCachePartitionKeyContract());
  expect(persistedInventory).toEqual(createCacheInventoryTemplate());
  expect(sampleRun.resumeIsolationAtlas).toEqual(
    createResumeIsolationAtlasViewModel(),
  );
});

test("partition keys stay identity-rich and preserve visibility or native legality dimensions", () => {
  const contract = createCachePartitionKeyContract();
  validateCachePartitionKeyContract(contract);

  expect(contract.key_rows).toHaveLength(5);

  const workspaceRow = contract.key_rows.find(
    (row) => row.partition_ref === "partition.collaboration_workspace",
  );
  expect(workspaceRow?.key_segments).toEqual(
    expect.arrayContaining([
      "tenant_id",
      "session_binding_hash",
      "access_binding_hash_or_null",
      "masking_posture_fingerprint_or_null",
      "visibility_cache_partition_key_or_null",
      "route_identity_ref",
      "canonical_object_ref",
    ]),
  );
  expect(workspaceRow?.visibility_partition_required).toBe(true);

  const portalRow = contract.key_rows.find(
    (row) => row.partition_ref === "partition.client_portal_workspace",
  );
  expect(portalRow?.key_template).toContain("customer_safe_projection_ref");
  expect(portalRow?.local_persistence_policy).toBe(
    "BROWSER_SESSION_EPHEMERAL_ONLY",
  );

  const nativeRow = contract.key_rows.find(
    (row) => row.partition_ref === "partition.native_operator_hydration",
  );
  expect(nativeRow?.key_segments).toEqual(
    expect.arrayContaining([
      "session_lineage_ref_or_null",
      "schema_compatibility_ref",
      "projection_guard_ref",
      "route_identity_ref",
      "canonical_object_ref",
    ]),
  );
  expect(nativeRow?.local_persistence_policy).toBe(
    "NATIVE_DISK_WITH_PURGE_ONLY",
  );
});
