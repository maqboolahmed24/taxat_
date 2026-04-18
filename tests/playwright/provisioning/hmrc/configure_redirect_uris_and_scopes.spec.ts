import { mkdtemp } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { expect, test, type Page } from "@playwright/test";

import {
  configureRedirectUrisAndScopes,
} from "../../../../automation/provisioning/src/providers/hmrc/flows/configure_redirect_uris_and_scopes.js";
import {
  HMRC_SANDBOX_APP_FLOW_ID,
  registerSandboxApplication,
  type SandboxApplicationEntryUrls,
} from "../../../../automation/provisioning/src/providers/hmrc/flows/register_sandbox_application.js";
import {
  DEVELOPER_HUB_PROVIDER_ID,
} from "../../../../automation/provisioning/src/providers/hmrc/flows/developer_hub_shared.js";
import {
  createRunContext,
} from "../../../../automation/provisioning/src/core/run_context.js";

const CANONICAL_APPLICATION_NAME = "Taxat Sandbox Income Tax";
const CANONICAL_REDIRECT_URIS = [
  "https://auth.sandbox.taxat.example/oauth/hmrc/callback",
  "http://localhost:46080/oauth/hmrc/sandbox/native-callback",
  "https://auth.preprod.taxat.example/oauth/hmrc/callback",
  "http://localhost:46180/oauth/hmrc/preprod/native-callback",
];

function fixtureEntryUrls(scenario: string): SandboxApplicationEntryUrls {
  const base = `/automation/provisioning/tests/fixtures/hmrc_developer_hub_portal.html?scenario=${scenario}`;
  return {
    applications: `${base}&screen=applications`,
  };
}

function fixtureRunContext() {
  return createRunContext({
    providerId: DEVELOPER_HUB_PROVIDER_ID,
    flowId: HMRC_SANDBOX_APP_FLOW_ID,
    productEnvironmentId: "env_local_provisioning_workstation",
    providerEnvironment: "fixture",
    executionMode: "fixture",
    operatorIdentityAlias: "ops.hmrc.fixture",
    workspaceId: "wk-local-provisioning-sandbox",
    evidenceRoot: "artifacts/runs/hmrc-sandbox-oauth-settings-fixture",
  });
}

function blockedLiveRunContext() {
  return createRunContext({
    providerId: DEVELOPER_HUB_PROVIDER_ID,
    flowId: HMRC_SANDBOX_APP_FLOW_ID,
    productEnvironmentId: "env_local_provisioning_workstation",
    providerEnvironment: "sandbox",
    executionMode: "sandbox",
    operatorIdentityAlias: "ops.hmrc.live",
    workspaceId: "wk-local-provisioning-sandbox",
    evidenceRoot: "artifacts/runs/hmrc-sandbox-oauth-settings-live",
    liveProviderExecutionAllowed: false,
  });
}

async function bootstrapApplication(
  page: Page,
  scenario: string,
  rootDir: string,
) {
  const applicationRecordPath = path.join(rootDir, "sandbox_application_record.json");
  await registerSandboxApplication({
    page,
    runContext: fixtureRunContext(),
    applicationRecordPath,
    developerHubWorkspaceRecordRef: "./hmrc_developer_hub_workspace_record.template.json",
    applicationName: CANONICAL_APPLICATION_NAME,
    entryUrls: fixtureEntryUrls(scenario),
  });

  return {
    applicationRecordPath,
    redirectInventoryPath: path.join(rootDir, "hmrc_redirect_uri_inventory.json"),
    scopeBindingMatrixPath: path.join(rootDir, "hmrc_scope_and_callback_binding_matrix.json"),
    redirectSlotBudgetPath: path.join(rootDir, "hmrc_redirect_slot_budget.json"),
    oauthProfilePath: path.join(rootDir, "hmrc_sandbox_oauth_profile.json"),
  };
}

test("stale redirect URIs are reconciled, saved, and re-read after refresh", async ({
  page,
}) => {
  const rootDir = await mkdtemp(path.join(os.tmpdir(), "taxat-hmrc-oauth-settings-stale-"));
  const paths = await bootstrapApplication(page, "app-oauth-stale", rootDir);

  const result = await configureRedirectUrisAndScopes({
    page,
    runContext: fixtureRunContext(),
    applicationRecordPath: paths.applicationRecordPath,
    redirectInventoryPath: paths.redirectInventoryPath,
    scopeBindingMatrixPath: paths.scopeBindingMatrixPath,
    redirectSlotBudgetPath: paths.redirectSlotBudgetPath,
    oauthProfilePath: paths.oauthProfilePath,
    entryUrls: fixtureEntryUrls("app-oauth-stale"),
  });

  expect(result.outcome).toBe("OAUTH_SETTINGS_READY");
  expect(result.redirectInventory.configured_redirect_uris).toEqual(CANONICAL_REDIRECT_URIS);
  expect(result.redirectSlotBudget.configured_slot_count).toBe(4);
  expect(result.redirectSlotBudget.remaining_slot_count).toBe(1);
  expect(result.scopeBindingMatrix.scope_sets[0]?.scopes).toEqual([
    "read:self-assessment",
    "write:self-assessment",
  ]);
  expect(result.redirectInventory.typed_gaps.join(" ")).toContain("user-restricted guidance");
  expect(result.applicationRecord.notes.join(" ")).toContain("Redirect inventory ref");

  await expect(page.getByRole("heading", { name: "Redirect URIs" })).toBeVisible();
  await expect(page.getByLabel("Redirect URI 1")).toHaveValue(CANONICAL_REDIRECT_URIS[0]!);
  await expect(page.getByLabel("Redirect URI 4")).toHaveValue(CANONICAL_REDIRECT_URIS[3]!);
});

test("clean redirect settings still persist the canonical four-slot inventory", async ({
  page,
}) => {
  const rootDir = await mkdtemp(path.join(os.tmpdir(), "taxat-hmrc-oauth-settings-clean-"));
  const paths = await bootstrapApplication(page, "app-oauth-clean", rootDir);

  const result = await configureRedirectUrisAndScopes({
    page,
    runContext: fixtureRunContext(),
    applicationRecordPath: paths.applicationRecordPath,
    redirectInventoryPath: paths.redirectInventoryPath,
    scopeBindingMatrixPath: paths.scopeBindingMatrixPath,
    redirectSlotBudgetPath: paths.redirectSlotBudgetPath,
    oauthProfilePath: paths.oauthProfilePath,
    entryUrls: fixtureEntryUrls("app-oauth-clean"),
  });

  expect(result.redirectInventory.configured_rows).toHaveLength(4);
  expect(
    result.redirectInventory.disallowed_rows.map((row) => row.callback_profile_ref),
  ).toEqual(
    expect.arrayContaining([
      "cb_local_browser_loopback_sandbox",
      "cb_local_native_loopback_sandbox",
      "cb_production_web",
      "cb_production_desktop",
    ]),
  );
  expect(result.oauthProfile.authorization_endpoint_runtime).toBe(
    "https://test-www.tax.service.gov.uk/oauth/authorize",
  );
});

test("live sandbox redirect configuration remains gated without explicit approval", async ({
  page,
}) => {
  const rootDir = await mkdtemp(path.join(os.tmpdir(), "taxat-hmrc-oauth-settings-live-"));

  await expect(
    configureRedirectUrisAndScopes({
      page,
      runContext: blockedLiveRunContext(),
      applicationRecordPath: path.join(rootDir, "sandbox_application_record.json"),
      redirectInventoryPath: path.join(rootDir, "hmrc_redirect_uri_inventory.json"),
      scopeBindingMatrixPath: path.join(rootDir, "hmrc_scope_and_callback_binding_matrix.json"),
      redirectSlotBudgetPath: path.join(rootDir, "hmrc_redirect_slot_budget.json"),
      oauthProfilePath: path.join(rootDir, "hmrc_sandbox_oauth_profile.json"),
      entryUrls: fixtureEntryUrls("app-oauth-clean"),
    }),
  ).rejects.toThrow(/live provider execution is not enabled/i);
});
