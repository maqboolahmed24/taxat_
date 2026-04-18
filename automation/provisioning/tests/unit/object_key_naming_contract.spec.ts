import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { expect, test } from "@playwright/test";

import {
  createObjectKeyNamingContract,
  createObjectStorageInventoryTemplate,
  createStorageBucketTopologyBoardViewModel,
  validateObjectKeyNamingContract,
  type ObjectKeyNamingContract,
  type ObjectStorageInventoryTemplate,
  type StorageBucketTopologyBoardViewModel,
} from "../../../../infra/object_storage/bootstrap/provision_buckets_for_evidence_artifacts_exports_and_quarantine.js";

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

test("checked-in object key naming artifacts and storage viewer payload match the builder", async () => {
  const persistedContract = await readJson<ObjectKeyNamingContract>([
    "config",
    "object_storage",
    "object_key_naming_contract.json",
  ]);
  const persistedInventory = await readJson<ObjectStorageInventoryTemplate>([
    "data",
    "provisioning",
    "object_storage_inventory.template.json",
  ]);
  const sampleRun = await readJson<{
    storageBucketTopologyBoard: StorageBucketTopologyBoardViewModel;
  }>([
    "automation",
    "provisioning",
    "report_viewer",
    "data",
    "sample_run.json",
  ]);

  expect(persistedContract).toEqual(createObjectKeyNamingContract());
  expect(persistedInventory).toEqual(createObjectStorageInventoryTemplate());
  expect(sampleRun.storageBucketTopologyBoard).toEqual(
    createStorageBucketTopologyBoardViewModel(),
  );
});

test("object key families stay lineage-rich, version-bound, and export-segmented", () => {
  const contract = createObjectKeyNamingContract();
  validateObjectKeyNamingContract(contract);

  expect(contract.key_family_rows).toHaveLength(9);
  expect(
    contract.key_family_rows.every(
      (row) =>
        row.required_dimensions.length >= 5 &&
        row.version_identity_dimensions.length >= 2 &&
        row.forbidden_shortcuts.length >= 1,
    ),
  ).toBe(true);

  const uploadBody = contract.key_family_rows.find(
    (row) => row.key_family_ref === "key_family.upload_staging_body",
  );
  expect(uploadBody?.required_dimensions).toEqual(
    expect.arrayContaining([
      "tenant_id",
      "client_id",
      "request_id",
      "request_version_ref",
      "upload_session_id",
      "object_version_ref",
      "content_sha256",
    ]),
  );

  const masked = contract.key_family_rows.find(
    (row) => row.key_family_ref === "key_family.export_masked_bundle",
  );
  const restricted = contract.key_family_rows.find(
    (row) => row.key_family_ref === "key_family.export_restricted_bundle",
  );
  expect(masked?.preview_or_masking_dimension_or_null).toBe("masking_posture");
  expect(restricted?.preview_or_masking_dimension_or_null).toBe(
    "masking_posture",
  );
  expect(masked?.key_template).not.toBe(restricted?.key_template);
  expect(masked?.key_template).toContain("/masking/{masking_posture}/");
  expect(restricted?.key_template).toContain("/step-up/{step_up_binding_ref}/");

  const quarantine = contract.key_family_rows.find(
    (row) => row.key_family_ref === "key_family.quarantine_body",
  );
  expect(quarantine?.required_dimensions).toEqual(
    expect.arrayContaining([
      "upload_session_id",
      "source_object_version_ref",
      "quarantine_event_ref",
      "hazard_code",
      "artifact_version_ref",
    ]),
  );
  expect(quarantine?.forbidden_shortcuts).toEqual(
    expect.arrayContaining([
      "quarantine/{filename}",
      "clean-or-quarantine-shared-path",
    ]),
  );
});
