import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { expect, test } from "@playwright/test";

import {
  createPreviewEnvironmentPolicy,
  validatePreviewEnvironmentPolicy,
  type PreviewEnvironmentPolicy,
} from "../../../../infra/ci/bootstrap/provision_ci_cd_runners_and_preview_accounts.js";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "..");

async function readJson<T>(segments: string[]): Promise<T> {
  return JSON.parse(await readFile(path.join(repoRoot, ...segments), "utf8")) as T;
}

test("checked-in preview policy matches the builder", async () => {
  const persistedPolicy = await readJson<PreviewEnvironmentPolicy>([
    "config",
    "ci",
    "preview_environment_policy.json",
  ]);

  expect(persistedPolicy).toEqual(createPreviewEnvironmentPolicy());
});

test("preview environments remain synthetic, review-zone scoped, and denied production or authority secrets", () => {
  const policy = createPreviewEnvironmentPolicy();

  validatePreviewEnvironmentPolicy(policy);

  expect(policy.preview_policy_rows).toHaveLength(3);

  for (const row of policy.preview_policy_rows) {
    expect(row.environment_ref).toBe("env_ephemeral_review_preview");
    expect(row.synthetic_data_only).toBe(true);
    expect(row.provider_credentials_allowed).toBe(false);
    expect(row.domain_patterns).toEqual(
      expect.arrayContaining([expect.stringContaining("review.taxat.example")]),
    );
    expect(row.allowed_secret_refs).not.toEqual(
      expect.arrayContaining([
        expect.stringMatching(/^sec_preprod_/),
        expect.stringMatching(/^sec_production_/),
      ]),
    );
    expect(row.allowed_secret_refs.some((secretRef) => secretRef.includes("authority"))).toBe(
      false,
    );
    expect(row.teardown_triggers).toEqual(
      expect.arrayContaining(["pull_request.closed", "workflow_run.cancelled"]),
    );
  }

  const accessBoundary = policy.preview_policy_rows.find(
    (row) => row.preview_policy_ref === "preview.access.boundary",
  );
  expect(accessBoundary?.denied_secret_refs).toEqual(
    expect.arrayContaining([
      "sec_sandbox_web_authority",
      "sec_preprod_web_authority",
      "sec_production_web_authority",
      "sec_production_desktop_authority",
    ]),
  );
});
