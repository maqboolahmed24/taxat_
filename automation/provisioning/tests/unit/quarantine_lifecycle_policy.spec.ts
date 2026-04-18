import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { expect, test } from "@playwright/test";

import {
  createRecommendedQuarantineLifecyclePolicy,
  createRecommendedQuarantineReleasePolicy,
  createRecommendedQuarantineStorageBinding,
  validateQuarantineLifecyclePolicy,
  validateQuarantineReleasePolicy,
  type QuarantineLifecyclePolicy,
  type QuarantineReleasePolicy,
  type QuarantineStorageBinding,
} from "../../src/providers/malware/flows/create_managed_scanning_service_or_record_self_host_decision.js";

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

test("checked-in quarantine lifecycle and release artifacts match the builders", async () => {
  const persistedLifecycle = await readJson<QuarantineLifecyclePolicy>([
    "config",
    "uploads",
    "quarantine_lifecycle_policy.json",
  ]);
  const persistedRelease = await readJson<QuarantineReleasePolicy>([
    "config",
    "uploads",
    "quarantine_release_policy.json",
  ]);
  const persistedBinding = await readJson<QuarantineStorageBinding>([
    "data",
    "provisioning",
    "quarantine_storage_binding.template.json",
  ]);

  expect(persistedLifecycle).toEqual(
    createRecommendedQuarantineLifecyclePolicy(),
  );
  expect(persistedRelease).toEqual(
    createRecommendedQuarantineReleasePolicy(),
  );
  expect(persistedBinding).toEqual(
    createRecommendedQuarantineStorageBinding(),
  );
});

test("quarantine lifecycle keeps pending, rejected, and quarantined artifacts unavailable and audit-preserving", () => {
  const lifecyclePolicy = createRecommendedQuarantineLifecyclePolicy();
  const releasePolicy = createRecommendedQuarantineReleasePolicy();
  const storageBinding = createRecommendedQuarantineStorageBinding();

  validateQuarantineLifecyclePolicy(lifecyclePolicy);
  validateQuarantineReleasePolicy(releasePolicy);

  lifecyclePolicy.lifecycle_rows
    .filter((row) => row.governed_scan_state !== "CLEAN")
    .forEach((row) => {
      expect(row.preview_policy).toBe("NOT_AVAILABLE");
      expect(row.download_state).not.toBe("DOWNLOADABLE");
      expect(row.history_preserved).toBe(true);
    });

  expect(
    releasePolicy.release_rows.every((row) => row.history_preserved),
  ).toBe(true);
  expect(
    releasePolicy.release_rows.some((row) => row.resulting_scan_state === "CLEAN"),
  ).toBe(true);
  expect(storageBinding.isolation_strategy).toContain("QUARANTINE_STORAGE_IS_SEPARATE");
  expect(storageBinding.preview_download_posture).toContain(
    "NON_PREVIEWABLE_AND_NON_DOWNLOADABLE",
  );
});
