import { mkdtemp } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { expect, test, type Page } from "@playwright/test";

import {
  HMRC_SANDBOX_APP_FLOW_ID,
  registerSandboxApplication,
  type SandboxApplicationEntryUrls,
} from "../../../../automation/provisioning/src/providers/hmrc/flows/register_sandbox_application.js";
import {
  subscribeRequiredMtdApis,
} from "../../../../automation/provisioning/src/providers/hmrc/flows/subscribe_required_mtd_apis.js";
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
    evidenceRoot: "artifacts/runs/hmrc-sandbox-app-subscriptions",
  });
}

async function bootstrapApplication(
  page: Page,
  scenario: string,
  rootDir: string,
) {
  const applicationRecordPath = path.join(rootDir, "sandbox_application_record.json");
  const subscriptionMatrixPath = path.join(rootDir, "sandbox_subscription_matrix.json");

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
    subscriptionMatrixPath,
  };
}

test("partial-subscription remediation subscribes every required-now API", async ({
  page,
}) => {
  const rootDir = await mkdtemp(path.join(os.tmpdir(), "taxat-hmrc-subscriptions-partial-"));
  const paths = await bootstrapApplication(page, "app-partial", rootDir);

  const result = await subscribeRequiredMtdApis({
    page,
    runContext: fixtureRunContext(),
    applicationRecordPath: paths.applicationRecordPath,
    subscriptionMatrixPath: paths.subscriptionMatrixPath,
    entryUrls: fixtureEntryUrls("app-partial"),
  });

  expect(result.outcome).toBe("SUBSCRIPTIONS_READY");
  expect(result.subscriptionMatrix.required_now_complete).toBe(true);
  expect(
    result.subscriptionMatrix.rows.filter(
      (row) =>
        row.scope_bucket === "REQUIRED_NOW" &&
        row.action_taken === "SUBSCRIBED_DURING_RUN",
    ),
  ).toEqual(
    expect.arrayContaining([
      expect.objectContaining({ api_key: "individual_calculations" }),
      expect.objectContaining({ api_key: "property_business" }),
    ]),
  );
  expect(
    result.subscriptionMatrix.rows.filter((row) => row.scope_bucket === "LIKELY_REQUIRED_LATER"),
  ).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        api_key: "business_source_adjustable_summary",
        action_taken: "DEFERRED_SCOPE",
      }),
      expect.objectContaining({
        api_key: "individual_losses",
        action_taken: "DEFERRED_SCOPE",
      }),
    ]),
  );
  expect(result.applicationRecord.sandbox_application.subscription_state).toBe(
    "REQUIRED_NOW_SUBSCRIBED",
  );
});

test("API-label drift is resolved through alias matching and captured in the matrix", async ({
  page,
}) => {
  const rootDir = await mkdtemp(path.join(os.tmpdir(), "taxat-hmrc-subscriptions-drift-"));
  const paths = await bootstrapApplication(page, "app-label-drift", rootDir);

  const result = await subscribeRequiredMtdApis({
    page,
    runContext: fixtureRunContext(),
    applicationRecordPath: paths.applicationRecordPath,
    subscriptionMatrixPath: paths.subscriptionMatrixPath,
    entryUrls: fixtureEntryUrls("app-label-drift"),
  });

  expect(result.subscriptionMatrix.required_now_complete).toBe(true);
  expect(
    result.subscriptionMatrix.rows.filter(
      (row) =>
        row.scope_bucket === "REQUIRED_NOW" && row.label_resolution === "ALIAS_MATCH",
    ).length,
  ).toBeGreaterThan(0);
  expect(result.subscriptionMatrix.typed_gaps.join(" ")).toContain("Portal label drift resolved");
});
