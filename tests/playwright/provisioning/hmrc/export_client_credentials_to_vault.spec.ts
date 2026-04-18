import { mkdtemp, readFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { expect, test, type Page } from "@playwright/test";

import {
  createRunContext,
} from "../../../../automation/provisioning/src/core/run_context.js";
import {
  DEVELOPER_HUB_PROVIDER_ID,
} from "../../../../automation/provisioning/src/providers/hmrc/flows/developer_hub_shared.js";
import {
  exportClientCredentialsToVault,
  HMRC_CLIENT_EXPORT_FLOW_ID,
} from "../../../../automation/provisioning/src/providers/hmrc/flows/export_client_credentials_to_vault.js";
import {
  HMRC_SANDBOX_APP_FLOW_ID,
  registerSandboxApplication,
  type SandboxApplicationEntryUrls,
} from "../../../../automation/provisioning/src/providers/hmrc/flows/register_sandbox_application.js";

const CANONICAL_APPLICATION_NAME = "Taxat Sandbox Income Tax";

function fixtureEntryUrls(scenario: string): SandboxApplicationEntryUrls {
  const base =
    `/automation/provisioning/tests/fixtures/hmrc_developer_hub_portal.html?scenario=${scenario}`;
  return {
    applications: `${base}&screen=applications`,
  };
}

function deriveFixtureClientId(name: string): string {
  return `${name.toLowerCase().replace(/[^a-z0-9]+/g, "_")}_sandbox_client_id`;
}

function sandboxApplicationRunContext() {
  return createRunContext({
    providerId: DEVELOPER_HUB_PROVIDER_ID,
    flowId: HMRC_SANDBOX_APP_FLOW_ID,
    productEnvironmentId: "env_local_provisioning_workstation",
    providerEnvironment: "fixture",
    executionMode: "fixture",
    operatorIdentityAlias: "ops.hmrc.fixture",
    workspaceId: "wk-local-provisioning-sandbox",
    evidenceRoot: "artifacts/runs/hmrc-sandbox-app-fixture",
  });
}

function clientExportRunContext() {
  return createRunContext({
    providerId: DEVELOPER_HUB_PROVIDER_ID,
    flowId: HMRC_CLIENT_EXPORT_FLOW_ID,
    productEnvironmentId: "env_local_provisioning_workstation",
    providerEnvironment: "fixture",
    executionMode: "fixture",
    operatorIdentityAlias: "ops.hmrc.fixture",
    workspaceId: "wk-local-provisioning-sandbox",
    evidenceRoot: "artifacts/runs/hmrc-client-export-fixture",
  });
}

async function bootstrapApplication(page: Page, scenario: string, rootDir: string) {
  const applicationRecordPath = path.join(rootDir, "sandbox_application_record.json");
  await registerSandboxApplication({
    page,
    runContext: sandboxApplicationRunContext(),
    applicationRecordPath,
    developerHubWorkspaceRecordRef: "./hmrc_developer_hub_workspace_record.template.json",
    applicationName: CANONICAL_APPLICATION_NAME,
    entryUrls: fixtureEntryUrls(scenario),
  });

  return {
    applicationRecordPath,
    applicationInventoryPath: path.join(rootDir, "hmrc_client_application_inventory.json"),
    vaultBindingPath: path.join(rootDir, "hmrc_client_vault_binding.json"),
    secretLineagePath: path.join(rootDir, "hmrc_client_secret_lineage.json"),
  };
}

test("manual checkpoint branch freezes schema-valid placeholder lineage without leaking raw credentials", async ({
  page,
}) => {
  const rootDir = await mkdtemp(path.join(os.tmpdir(), "taxat-hmrc-client-export-manual-"));
  const paths = await bootstrapApplication(page, "app-existing", rootDir);
  const rawClientId = deriveFixtureClientId(CANONICAL_APPLICATION_NAME);

  const result = await exportClientCredentialsToVault({
    page,
    runContext: clientExportRunContext(),
    applicationRecordPath: paths.applicationRecordPath,
    applicationInventoryPath: paths.applicationInventoryPath,
    vaultBindingPath: paths.vaultBindingPath,
    secretLineagePath: paths.secretLineagePath,
  });

  expect(result.outcome).toBe("MANUAL_CHECKPOINT_REQUIRED");
  expect(result.checkpoint?.reason).toBe("POLICY_CONFIRMATION");
  expect(result.steps[3]?.status).toBe("MANUAL_CHECKPOINT_REQUIRED");
  expect(result.vaultBinding.environment_bindings).toHaveLength(4);
  expect(result.applicationInventory.manual_checkpoint_refs).toEqual(
    expect.arrayContaining(["hmrc.devhub.client-export.export-secret.checkpoint"]),
  );

  const inventoryRaw = await readFile(paths.applicationInventoryPath, "utf8");
  const bindingRaw = await readFile(paths.vaultBindingPath, "utf8");
  const lineageRaw = await readFile(paths.secretLineagePath, "utf8");
  expect(inventoryRaw).not.toContain(rawClientId);
  expect(bindingRaw).not.toContain(rawClientId);
  expect(lineageRaw).not.toContain("HMRC-SECRET-");
});

test("one-time reveal export persists sanitized lineage, then later runs adopt the existing governed secret", async ({
  page,
}) => {
  const rootDir = await mkdtemp(path.join(os.tmpdir(), "taxat-hmrc-client-export-reveal-"));
  const paths = await bootstrapApplication(page, "app-existing", rootDir);
  const rawClientId = deriveFixtureClientId(CANONICAL_APPLICATION_NAME);

  const exported = await exportClientCredentialsToVault({
    page,
    runContext: clientExportRunContext(),
    applicationRecordPath: paths.applicationRecordPath,
    applicationInventoryPath: paths.applicationInventoryPath,
    vaultBindingPath: paths.vaultBindingPath,
    secretLineagePath: paths.secretLineagePath,
    allowOneTimeSecretReveal: true,
  });

  expect(exported.outcome).toBe("CLIENT_CREDENTIALS_EXPORTED");
  expect(exported.applicationInventory.secret_export_posture.capture_method).toBe(
    "PROVIDER_ONE_TIME_REVEAL_CAPTURE",
  );
  expect(exported.vaultBinding.environment_bindings).toHaveLength(4);
  expect(exported.secretLineage.active_version_ids).toHaveLength(1);
  expect(exported.secretLineage.versions.at(-1)?.capture_channel_id).toBe(
    "PROVIDER_ONE_TIME_REVEAL_CAPTURE",
  );

  const inventoryRaw = await readFile(paths.applicationInventoryPath, "utf8");
  const bindingRaw = await readFile(paths.vaultBindingPath, "utf8");
  const lineageRaw = await readFile(paths.secretLineagePath, "utf8");
  expect(inventoryRaw).not.toContain(rawClientId);
  expect(bindingRaw).not.toContain(rawClientId);
  expect(lineageRaw).not.toContain("HMRC-SECRET-");

  const adopted = await exportClientCredentialsToVault({
    page,
    runContext: clientExportRunContext(),
    applicationRecordPath: paths.applicationRecordPath,
    applicationInventoryPath: paths.applicationInventoryPath,
    vaultBindingPath: paths.vaultBindingPath,
    secretLineagePath: paths.secretLineagePath,
  });

  expect(adopted.outcome).toBe("CLIENT_CREDENTIALS_EXPORTED");
  expect(adopted.steps[3]?.status).toBe("SKIPPED_AS_ALREADY_PRESENT");
  expect(adopted.applicationInventory.secret_export_posture.capture_method).toBe(
    "ADOPT_EXISTING_LINEAGE",
  );
});

test("credential-lineage ledger renders safe-copy inspection without exposing raw secrets", async ({
  page,
}) => {
  await page.goto(
    "/automation/provisioning/report_viewer/index.html?fixture=./data/sample_run.json&page=credential-lineage-ledger",
  );

  await expect(
    page.getByRole("navigation", { name: "Application partitions" }),
  ).toBeVisible();
  await expect(page.getByRole("heading", { name: "Identifiers" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Bindings" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Secret lineage" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Copy client alias" })).toBeVisible();

  const inspect = page.getByRole("button", { name: "Inspect evidence" }).nth(1);
  await inspect.click();
  await expect(page.getByRole("heading", { name: "Vault write receipt" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Copy safe ref" }).first()).toBeVisible();
  await expect(page.getByText("HMRC-SECRET-")).toHaveCount(0);
});
