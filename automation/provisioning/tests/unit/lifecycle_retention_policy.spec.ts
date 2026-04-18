import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { expect, test } from "@playwright/test";

import {
  createBucketPurposeMatrix,
  createEventNotificationContract,
  createLifecycleRetentionPolicy,
  createQuarantineIsolationPolicy,
  validateBucketPurposeMatrix,
  validateEventNotificationContract,
  validateLifecycleRetentionPolicy,
  validateQuarantineIsolationPolicy,
  type BucketPurposeMatrix,
  type EventNotificationContract,
  type LifecycleRetentionPolicy,
  type QuarantineIsolationPolicy,
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

test("checked-in bucket purpose, lifecycle, event, and quarantine artifacts match the builders", async () => {
  const persistedPurposeMatrix = await readJson<BucketPurposeMatrix>([
    "config",
    "object_storage",
    "bucket_purpose_matrix.json",
  ]);
  const persistedLifecyclePolicy = await readJson<LifecycleRetentionPolicy>([
    "config",
    "object_storage",
    "lifecycle_retention_policy.json",
  ]);
  const persistedEventContract = await readJson<EventNotificationContract>([
    "config",
    "object_storage",
    "event_notification_contract.json",
  ]);
  const persistedQuarantinePolicy = await readJson<QuarantineIsolationPolicy>([
    "config",
    "object_storage",
    "quarantine_isolation_policy.json",
  ]);

  expect(persistedPurposeMatrix).toEqual(createBucketPurposeMatrix());
  expect(persistedLifecyclePolicy).toEqual(createLifecycleRetentionPolicy());
  expect(persistedEventContract).toEqual(createEventNotificationContract());
  expect(persistedQuarantinePolicy).toEqual(createQuarantineIsolationPolicy());
});

test("purpose buckets remain fully covered by lifecycle law, event routes, and quarantine restrictions", () => {
  const purposeMatrix = createBucketPurposeMatrix();
  const lifecyclePolicy = createLifecycleRetentionPolicy();
  const eventContract = createEventNotificationContract();
  const quarantinePolicy = createQuarantineIsolationPolicy();

  validateBucketPurposeMatrix(purposeMatrix);
  validateLifecycleRetentionPolicy(lifecyclePolicy);
  validateEventNotificationContract(eventContract);
  validateQuarantineIsolationPolicy(quarantinePolicy);

  expect(purposeMatrix.purpose_rows).toHaveLength(8);
  expect(
    purposeMatrix.purpose_rows.every(
      (row) =>
        row.versioning_state === "ENABLED_REQUIRED" &&
        row.public_access_state === "PUBLIC_ACCESS_BLOCKED",
    ),
  ).toBe(true);

  const lifecyclePurposeRefs = new Set(
    lifecyclePolicy.lifecycle_rows.map((row) => row.purpose_ref),
  );
  const eventPurposeRefs = new Set(
    eventContract.route_rows.map((row) => row.purpose_ref),
  );
  purposeMatrix.purpose_rows.forEach((row) => {
    expect(lifecyclePurposeRefs.has(row.purpose_ref)).toBe(true);
    expect(eventPurposeRefs.has(row.purpose_ref)).toBe(true);
  });

  expect(
    lifecyclePolicy.lifecycle_rows.every(
      (row) =>
        row.duration_resolution_state ===
        "CANONICAL_DURATION_NOT_PUBLISHED_IN_CORPUS",
    ),
  ).toBe(true);
  expect(
    eventContract.route_rows.every(
      (row) =>
        row.delivery_posture === "AT_LEAST_ONCE" &&
        row.ordering_posture === "OUT_OF_ORDER_POSSIBLE" &&
        row.dedupe_fields.some((field) => field.includes("version")),
    ),
  ).toBe(true);

  expect(
    quarantinePolicy.rule_rows.every(
      (row) =>
        row.preview_allowed === false &&
        row.download_allowed === false &&
        row.direct_url_allowed === false,
    ),
  ).toBe(true);
  expect(
    quarantinePolicy.rule_rows.some(
      (row) =>
        row.release_mode ===
        "COPY_PROMOTE_WITH_NEW_CLEAN_OBJECT_VERSION_AND_HISTORY_RETAINED",
    ),
  ).toBe(true);
  expect(quarantinePolicy.truth_boundary_statement).toContain(
    "Release creates a new clean object boundary",
  );
});
