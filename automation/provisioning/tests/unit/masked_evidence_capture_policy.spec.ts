import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { expect, test } from "@playwright/test";

import {
  createExternalCredentialSmokeInventoryTemplate,
  createMaskedEvidenceCapturePolicy,
  validateMaskedEvidenceCapturePolicy,
  type MaskedEvidenceCapturePolicy,
} from "../../../smoke/execute_external_credential_smoke_matrix.js";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "..");

async function readJson<T>(segments: string[]): Promise<T> {
  return JSON.parse(await readFile(path.join(repoRoot, ...segments), "utf8")) as T;
}

test("checked-in masked evidence capture policy matches the builder and bans raw secret persistence", async () => {
  const persistedPolicy = await readJson<MaskedEvidenceCapturePolicy>([
    "config",
    "smoke",
    "masked_evidence_capture_policy.json",
  ]);

  expect(persistedPolicy).toEqual(createMaskedEvidenceCapturePolicy());
  validateMaskedEvidenceCapturePolicy(persistedPolicy);

  expect(persistedPolicy.retained_safe_fields).toEqual(
    expect.arrayContaining([
      "safe_credential_ref",
      "vault_metadata_ref",
      "principal_identity",
      "masked_http_status",
    ]),
  );
  expect(persistedPolicy.forbidden_persisted_fields).toEqual(
    expect.arrayContaining([
      "raw_secret",
      "raw_bearer_token",
      "raw_session_cookie",
      "raw_authorization_header",
      "raw_browser_storage",
    ]),
  );
  expect(persistedPolicy.rule_rows).toHaveLength(6);
});

test("generated smoke inventory keeps evidence copy-safe and excludes raw provider material", () => {
  const inventory = createExternalCredentialSmokeInventoryTemplate({ repoRoot });
  const serializedInventory = JSON.stringify(inventory);

  expect(serializedInventory).not.toContain("raw_secret");
  expect(serializedInventory).not.toContain("raw_bearer_token");
  expect(serializedInventory).not.toContain("raw_session_cookie");
  expect(serializedInventory).not.toContain("raw_authorization_header");
  expect(serializedInventory).not.toContain("raw_browser_storage");
  expect(serializedInventory).not.toContain("vault://secret/");
  expect(serializedInventory).not.toContain("BEGIN PRIVATE KEY");
});
