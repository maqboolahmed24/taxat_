import { mkdtemp, readFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { expect, test } from "@playwright/test";

import {
  createDeveloperHubAccount,
} from "../../../../automation/provisioning/src/providers/hmrc/flows/create_developer_hub_account.js";
import {
  ensureHmrcProjectWorkspace,
  assertDeveloperHubWorkspaceRecordSanitized,
} from "../../../../automation/provisioning/src/providers/hmrc/flows/ensure_hmrc_project_workspace.js";
import {
  createDefaultDeveloperHubEntryUrls,
  DEVELOPER_HUB_FLOW_ID,
  DEVELOPER_HUB_PROVIDER_ID,
  type DeveloperHubEntryUrls,
} from "../../../../automation/provisioning/src/providers/hmrc/flows/developer_hub_shared.js";
import {
  createRunContext,
} from "../../../../automation/provisioning/src/core/run_context.js";

function fixtureEntryUrls(scenario: string): DeveloperHubEntryUrls {
  const base = `/automation/provisioning/tests/fixtures/hmrc_developer_hub_portal.html?scenario=${scenario}`;
  return {
    register: `${base}&screen=register`,
    signIn: `${base}&screen=login`,
    applications: `${base}&screen=applications`,
  };
}

function createFixtureRunContext() {
  return createRunContext({
    providerId: DEVELOPER_HUB_PROVIDER_ID,
    flowId: DEVELOPER_HUB_FLOW_ID,
    productEnvironmentId: "env_local_provisioning_workstation",
    providerEnvironment: "fixture",
    executionMode: "fixture",
    operatorIdentityAlias: "ops.hmrc.fixture",
    workspaceId: "wk-local-provisioning-sandbox",
    evidenceRoot: "artifacts/runs/hmrc-devhub-fixture",
  });
}

function fixtureCredentials() {
  return {
    firstName: "Taylor",
    lastName: "Provisioning",
    emailAddress: "hmrc-sandbox-ops@example.invalid",
    password: "DevHub!Pass1234",
  };
}

function fixtureSecretRefs() {
  return {
    accountAliasRef:
      "vault://kv/taxat/local-provisioning/sandbox/developer-hub/account-metadata/developer-hub/hmrc.sandbox.ops/alias",
    passwordRef:
      "vault://kv/taxat/local-provisioning/sandbox/developer-hub/passwords/developer-hub/hmrc.sandbox.ops/password/current",
    activationChannelRef:
      "vault://kv/taxat/local-provisioning/sandbox/developer-hub/activation-channel/developer-hub/hmrc.sandbox.ops/mailbox/current",
    browserStorageStateRef:
      "vault://kv/taxat/local-provisioning/sandbox/browser-state/hmrc-devhub/current",
  };
}

test("fresh registration creates a sanitized workspace record and lands in Applications", async ({
  page,
}) => {
  const rootDir = await mkdtemp(path.join(os.tmpdir(), "taxat-hmrc-devhub-create-"));
  const workspaceRecordPath = path.join(rootDir, "workspace_record.json");

  const result = await ensureHmrcProjectWorkspace({
    page,
    runContext: createFixtureRunContext(),
    workspaceRecordPath,
    resumeRoot: path.join(rootDir, "resume"),
    entryUrls: fixtureEntryUrls("fresh"),
    accountAlias: "hmrc.sandbox.ops",
    credentials: fixtureCredentials(),
    secretRefs: fixtureSecretRefs(),
    notes: ["Fixture registration path"],
  });

  await expect(page.getByRole("heading", { name: "Applications" })).toBeVisible();
  expect(result.outcome).toBe("APPLICATIONS_READY");
  expect(result.workspaceRecord.developer_hub_account.source_disposition).toBe(
    "CREATED_DURING_RUN",
  );
  expect(result.workspaceRecord.workspace_state.landing_status).toBe(
    "APPLICATIONS_HOME_REACHED",
  );
  assertDeveloperHubWorkspaceRecordSanitized(result.workspaceRecord, [
    fixtureCredentials().password,
  ]);

  const workspaceRecordRaw = await readFile(workspaceRecordPath, "utf8");
  expect(workspaceRecordRaw).not.toContain(fixtureCredentials().password);
  expect(workspaceRecordRaw).toContain("hmrc.sandbox.ops");
});

test("activation checkpoint persists resumable state without leaking raw credentials", async ({
  page,
}) => {
  const rootDir = await mkdtemp(path.join(os.tmpdir(), "taxat-hmrc-devhub-activation-"));
  const workspaceRecordPath = path.join(rootDir, "workspace_record.json");

  const result = await ensureHmrcProjectWorkspace({
    page,
    runContext: createFixtureRunContext(),
    workspaceRecordPath,
    resumeRoot: path.join(rootDir, "resume"),
    entryUrls: fixtureEntryUrls("activation"),
    accountAlias: "hmrc.sandbox.ops",
    credentials: fixtureCredentials(),
    secretRefs: fixtureSecretRefs(),
  });

  expect(result.outcome).toBe("MANUAL_CHECKPOINT_REQUIRED");
  expect(result.checkpoint?.reason).toBe("EMAIL_VERIFICATION");
  expect(result.workspaceRecord.workspace_state.manual_checkpoint_open).toBe(true);
  await expect.poll(async () => Boolean(result.resumeSnapshotPath)).toBe(true);

  const workspaceRecordRaw = await readFile(workspaceRecordPath, "utf8");
  expect(workspaceRecordRaw).not.toContain(fixtureCredentials().password);
  expect(workspaceRecordRaw).toContain("EMAIL_VERIFICATION_PENDING");
});

test("duplicate-account registration safely falls back to sign-in", async ({
  page,
}) => {
  const rootDir = await mkdtemp(path.join(os.tmpdir(), "taxat-hmrc-devhub-duplicate-"));
  const workspaceRecordPath = path.join(rootDir, "workspace_record.json");

  const result = await ensureHmrcProjectWorkspace({
    page,
    runContext: createFixtureRunContext(),
    workspaceRecordPath,
    resumeRoot: path.join(rootDir, "resume"),
    entryUrls: fixtureEntryUrls("duplicate"),
    accountAlias: "hmrc.sandbox.ops",
    credentials: fixtureCredentials(),
    secretRefs: fixtureSecretRefs(),
  });

  expect(result.outcome).toBe("APPLICATIONS_READY");
  expect(result.workspaceRecord.developer_hub_account.source_disposition).toBe(
    "ADOPTED_EXISTING",
  );
  expect(result.notes.join(" ")).toContain("fell back to sign-in");
});

test("selector drift on the registration CTA fails loudly instead of misclicking", async ({
  page,
}) => {
  await expect(
    createDeveloperHubAccount({
      page,
      runContext: createFixtureRunContext(),
      entryUrls: fixtureEntryUrls("drift-register"),
      accountAlias: "hmrc.sandbox.ops",
      credentials: fixtureCredentials(),
    }),
  ).rejects.toThrow(/Selector drift detected for registration-submit/);
});
