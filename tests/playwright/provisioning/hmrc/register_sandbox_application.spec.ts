import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { expect, test } from "@playwright/test";

import {
  HMRC_SANDBOX_APP_FLOW_ID,
  assertSandboxApplicationRecordSanitized,
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
    evidenceRoot: "artifacts/runs/hmrc-sandbox-app-fixture",
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
    evidenceRoot: "artifacts/runs/hmrc-sandbox-app-live",
    liveProviderExecutionAllowed: false,
  });
}

test("create-new sandbox application persists a sanitized application record", async ({
  page,
}) => {
  const rootDir = await mkdtemp(path.join(os.tmpdir(), "taxat-hmrc-sandbox-app-create-"));
  const applicationRecordPath = path.join(rootDir, "sandbox_application_record.json");

  const result = await registerSandboxApplication({
    page,
    runContext: fixtureRunContext(),
    applicationRecordPath,
    developerHubWorkspaceRecordRef: "./hmrc_developer_hub_workspace_record.template.json",
    applicationName: CANONICAL_APPLICATION_NAME,
    entryUrls: fixtureEntryUrls("app-create-new"),
  });

  await expect(page.getByRole("heading", { name: CANONICAL_APPLICATION_NAME })).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Manage API subscriptions" }),
  ).toBeVisible();
  expect(result.outcome).toBe("APPLICATION_READY");
  expect(result.sourceDisposition).toBe("CREATED_DURING_RUN");
  assertSandboxApplicationRecordSanitized(result.applicationRecord);

  const recordRaw = await readFile(applicationRecordPath, "utf8");
  expect(recordRaw).toContain(CANONICAL_APPLICATION_NAME);
  expect(recordRaw.toLowerCase()).not.toContain("client_secret");
  expect(recordRaw.toLowerCase()).not.toContain("client_id");
});

test("existing sandbox application is adopted instead of creating a duplicate", async ({
  page,
}) => {
  const rootDir = await mkdtemp(path.join(os.tmpdir(), "taxat-hmrc-sandbox-app-adopt-"));
  const applicationRecordPath = path.join(rootDir, "sandbox_application_record.json");

  const result = await registerSandboxApplication({
    page,
    runContext: fixtureRunContext(),
    applicationRecordPath,
    developerHubWorkspaceRecordRef: "./hmrc_developer_hub_workspace_record.template.json",
    applicationName: CANONICAL_APPLICATION_NAME,
    entryUrls: fixtureEntryUrls("app-existing"),
  });

  expect(result.sourceDisposition).toBe("ADOPTED_EXISTING");
  expect(result.steps[1]?.status).toBe("SKIPPED_AS_ALREADY_PRESENT");
  expect(result.applicationRecord.sandbox_application.subscription_state).toBe(
    "NOT_YET_VERIFIED",
  );
});

test("missing canonical app after a prior record is treated as retention-expiry recreation", async ({
  page,
}) => {
  const rootDir = await mkdtemp(path.join(os.tmpdir(), "taxat-hmrc-sandbox-app-recreate-"));
  const applicationRecordPath = path.join(rootDir, "sandbox_application_record.json");
  await writeFile(applicationRecordPath, "{}\n");

  const result = await registerSandboxApplication({
    page,
    runContext: fixtureRunContext(),
    applicationRecordPath,
    developerHubWorkspaceRecordRef: "./hmrc_developer_hub_workspace_record.template.json",
    applicationName: CANONICAL_APPLICATION_NAME,
    entryUrls: fixtureEntryUrls("app-create-new"),
  });

  expect(result.sourceDisposition).toBe("RECREATED_AFTER_RETENTION_EXPIRY");
});

test("live sandbox application registration remains gated without explicit approval", async ({
  page,
}) => {
  const rootDir = await mkdtemp(path.join(os.tmpdir(), "taxat-hmrc-sandbox-app-live-gate-"));

  await expect(
    registerSandboxApplication({
      page,
      runContext: blockedLiveRunContext(),
      applicationRecordPath: path.join(rootDir, "sandbox_application_record.json"),
      developerHubWorkspaceRecordRef: "./hmrc_developer_hub_workspace_record.template.json",
      applicationName: CANONICAL_APPLICATION_NAME,
      entryUrls: fixtureEntryUrls("app-create-new"),
    }),
  ).rejects.toThrow(/live provider execution is not enabled/i);
});
