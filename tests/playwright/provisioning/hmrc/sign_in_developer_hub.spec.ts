import { mkdtemp, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { expect, test } from "@playwright/test";

import {
  ensureHmrcProjectWorkspace,
} from "../../../../automation/provisioning/src/providers/hmrc/flows/ensure_hmrc_project_workspace.js";
import {
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

function existingRunContext() {
  return createRunContext({
    providerId: DEVELOPER_HUB_PROVIDER_ID,
    flowId: DEVELOPER_HUB_FLOW_ID,
    productEnvironmentId: "env_local_provisioning_workstation",
    providerEnvironment: "fixture",
    executionMode: "fixture",
    operatorIdentityAlias: "ops.hmrc.fixture",
    workspaceId: "wk-local-provisioning-sandbox",
    evidenceRoot: "artifacts/runs/hmrc-devhub-signin",
  });
}

function liveRunContextWithoutApproval() {
  return createRunContext({
    providerId: DEVELOPER_HUB_PROVIDER_ID,
    flowId: DEVELOPER_HUB_FLOW_ID,
    productEnvironmentId: "env_local_provisioning_workstation",
    providerEnvironment: "sandbox",
    executionMode: "sandbox",
    operatorIdentityAlias: "ops.hmrc.live",
    workspaceId: "wk-local-provisioning-sandbox",
    evidenceRoot: "artifacts/runs/hmrc-devhub-live",
    liveProviderExecutionAllowed: false,
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
  };
}

test("existing account sign-in reaches the Applications area and persists a safe record", async ({
  page,
}) => {
  const rootDir = await mkdtemp(path.join(os.tmpdir(), "taxat-hmrc-devhub-signin-"));
  const workspaceRecordPath = path.join(rootDir, "workspace_record.json");
  await writeFile(workspaceRecordPath, "{}");

  await page.goto("data:text/plain,seed");
  await page.context().storageState();

  await expect(
    ensureHmrcProjectWorkspace({
      page,
      runContext: existingRunContext(),
      workspaceRecordPath,
      resumeRoot: path.join(rootDir, "resume"),
      entryUrls: fixtureEntryUrls("existing-account"),
      accountAlias: "hmrc.sandbox.ops",
      credentials: fixtureCredentials(),
      secretRefs: fixtureSecretRefs(),
      notes: ["Preseeded workspace record should force sign-in-first."],
    }),
  ).resolves.toMatchObject({
    outcome: "APPLICATIONS_READY",
    workspaceRecord: {
      developer_hub_account: {
        source_disposition: "ADOPTED_EXISTING",
      },
      workspace_state: {
        landing_status: "APPLICATIONS_HOME_REACHED",
      },
    },
  });
});

test("already signed-in sessions are adopted instead of forcing a new login", async ({
  page,
}) => {
  const rootDir = await mkdtemp(path.join(os.tmpdir(), "taxat-hmrc-devhub-session-"));
  const workspaceRecordPath = path.join(rootDir, "workspace_record.json");

  const result = await ensureHmrcProjectWorkspace({
    page,
    runContext: existingRunContext(),
    workspaceRecordPath,
    resumeRoot: path.join(rootDir, "resume"),
    entryUrls: fixtureEntryUrls("already-signed-in"),
    accountAlias: "hmrc.sandbox.ops",
    credentials: fixtureCredentials(),
    secretRefs: fixtureSecretRefs(),
  });

  expect(result.outcome).toBe("APPLICATIONS_READY");
  expect(result.workspaceRecord.developer_hub_account.source_disposition).toBe(
    "ADOPTED_EXISTING",
  );
  expect(result.notes.join(" ")).toContain("adopted safely");
});

test("MFA or suspicious-login interstitials surface as resumable manual checkpoints", async ({
  page,
}) => {
  const rootDir = await mkdtemp(path.join(os.tmpdir(), "taxat-hmrc-devhub-mfa-"));
  const workspaceRecordPath = path.join(rootDir, "workspace_record.json");
  await writeFile(workspaceRecordPath, "{}");

  await ensureHmrcProjectWorkspace({
    page,
    runContext: existingRunContext(),
    workspaceRecordPath,
    resumeRoot: path.join(rootDir, "resume"),
    entryUrls: fixtureEntryUrls("existing-security"),
    accountAlias: "hmrc.sandbox.ops",
    credentials: fixtureCredentials(),
    secretRefs: fixtureSecretRefs(),
  }).then((result) => {
    expect(result.outcome).toBe("MANUAL_CHECKPOINT_REQUIRED");
    expect(result.checkpoint?.reason).toBe("MFA");
    expect(result.workspaceRecord.workspace_state.manual_checkpoint_open).toBe(true);
    expect(result.resumeSnapshotPath).toBeTruthy();
  });
});

test("live HMRC entry points stay gated unless explicit approval is enabled", async ({
  page,
}) => {
  const rootDir = await mkdtemp(path.join(os.tmpdir(), "taxat-hmrc-devhub-live-gate-"));
  await expect(
    ensureHmrcProjectWorkspace({
      page,
      runContext: liveRunContextWithoutApproval(),
      workspaceRecordPath: path.join(rootDir, "workspace_record.json"),
      resumeRoot: path.join(rootDir, "resume"),
      accountAlias: "hmrc.sandbox.ops",
      credentials: fixtureCredentials(),
      secretRefs: fixtureSecretRefs(),
    }),
  ).rejects.toThrow(/live provider execution is not enabled/i);
});
