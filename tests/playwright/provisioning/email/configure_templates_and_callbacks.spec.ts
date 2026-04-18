import { mkdtemp, readFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { expect, test } from "@playwright/test";

import { createRunContext } from "../../../../automation/provisioning/src/core/run_context.js";
import {
  configureTemplatesAndWebhooks,
  EMAIL_TEMPLATE_FLOW_ID,
  type ConfigureTemplatesAndWebhooksResult,
  type EmailTemplateProviderEntryUrls,
} from "../../../../automation/provisioning/src/providers/email/flows/configure_templates_and_webhooks.js";
import { EMAIL_PROVIDER_ID } from "../../../../automation/provisioning/src/providers/email/flows/create_email_account_and_sender_domain.js";

function fixtureEntryUrls(
  scenario: "fresh" | "existing" | "telemetry-drift",
): EmailTemplateProviderEntryUrls {
  return {
    controlPlane:
      `/automation/provisioning/tests/fixtures/postmark_email_console.html?scenario=existing&templateScenario=${scenario}` +
      `&telemetry=${scenario === "telemetry-drift" ? "drift" : "off"}`,
  };
}

function fixtureRunContext() {
  return createRunContext({
    runId: "run-fixture-email-notifications",
    providerId: EMAIL_PROVIDER_ID,
    flowId: EMAIL_TEMPLATE_FLOW_ID,
    productEnvironmentId: "env_local_provisioning_workstation",
    providerEnvironment: "fixture",
    executionMode: "fixture",
    operatorIdentityAlias: "ops.email.fixture",
    workspaceId: "wk-local-provisioning-email-notifications",
    evidenceRoot: "artifacts/runs/email-notifications-fixture",
  });
}

async function runFixtureFlow(
  page: Parameters<typeof configureTemplatesAndWebhooks>[0]["page"],
  scenario: "fresh" | "existing" | "telemetry-drift",
) {
  const rootDir = await mkdtemp(path.join(os.tmpdir(), `taxat-email-notify-${scenario}-`));
  const templateInventoryPath = path.join(rootDir, "email_template_inventory.json");

  const result = await configureTemplatesAndWebhooks({
    page,
    runContext: fixtureRunContext(),
    templateInventoryPath,
    entryUrls: fixtureEntryUrls(scenario),
  });

  const [templateInventoryRaw, evidenceManifestRaw] = await Promise.all([
    readFile(templateInventoryPath, "utf8"),
    readFile(result.evidenceManifestPath, "utf8"),
  ]);

  return {
    result,
    templateInventoryRaw,
    evidenceManifestRaw,
  };
}

function expectSuccessStatuses(result: ConfigureTemplatesAndWebhooksResult) {
  expect(result.steps.map((step) => step.status)).toEqual([
    "SUCCEEDED",
    "SUCCEEDED",
    "SUCCEEDED",
    "SUCCEEDED",
    "SUCCEEDED",
  ]);
}

test("fresh fixture configuration persists sanitized template inventory, webhook bindings, and evidence-only mapping", async ({
  page,
}) => {
  const flow = await runFixtureFlow(page, "fresh");

  expect(flow.result.outcome).toBe("EMAIL_TEMPLATES_AND_CALLBACKS_READY");
  expectSuccessStatuses(flow.result);
  expect(flow.result.templateCatalog.template_records).toHaveLength(6);
  expect(flow.result.webhookEndpointContract.callback_records).toHaveLength(3);
  expect(flow.result.deliveryEventMapping.event_mappings).toHaveLength(6);
  expect(flow.templateInventoryRaw).toContain("customer-request-info-created-v1");
  expect(flow.templateInventoryRaw).not.toContain("X-Taxat-Webhook-Secret:");
  expect(flow.templateInventoryRaw).not.toContain("postmark_api_test");
  expect(flow.evidenceManifestRaw).toContain(
    "Persisted sanitized template inventory",
  );
});

test("telemetry drift blocks policy acceptance instead of silently adopting open or click tracking", async ({
  page,
}) => {
  const flow = await runFixtureFlow(page, "telemetry-drift");

  expect(flow.result.outcome).toBe("EMAIL_TEMPLATE_POLICY_REVIEW_REQUIRED");
  expect(flow.result.steps[3]?.status).toBe("BLOCKED_BY_POLICY");
  expect(flow.result.steps[4]?.status).toBe("SUCCEEDED");
  expect(flow.result.notes).toEqual(
    expect.arrayContaining([
      expect.stringContaining("Open and click tracking remain disabled"),
    ]),
  );
  expect(flow.evidenceManifestRaw).toContain(
    "Telemetry drift was surfaced explicitly and blocked",
  );
});

test("notification copy atlas renders semantic regions, lifecycle focus, inspector behavior, and reduced-motion parity", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto(
    "/automation/provisioning/report_viewer/index.html?fixture=./data/sample_run.json&page=notification-copy-atlas",
  );

  await expect(page.locator("html")).toHaveAttribute("data-motion", "reduce");
  await expect(
    page.getByRole("navigation", { name: "Notification template families" }),
  ).toBeVisible();
  await expect(page.getByRole("heading", { name: "Email preview" })).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Continuity and merge provenance" }),
  ).toBeVisible();
  await expect(page.getByRole("heading", { name: "Webhook events" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Privacy notes" })).toBeVisible();
  await expect(page.locator("#run-title")).toHaveText("New request for information");
  await expect(page.locator("#run-status")).toHaveText("Customer transactional");
  await expect(page.locator("#environment-chip")).toHaveText("Production");

  await page
    .locator(".notification-template-rail-list button")
    .filter({ hasText: "Customer due date changed" })
    .click();
  await expect(page.locator("#main-title")).toHaveText("Customer due date changed");
  await expect(page.locator("#drawer-title")).toHaveText("Customer due date changed");
  await expect(page.getByText("Current due date: 28 Apr 2026")).toBeVisible();

  await page
    .locator(".notification-lifecycle-rail__button")
    .filter({ hasText: "Delivery Event" })
    .click();
  await expect(page.getByRole("heading", { name: "Delivery Event" })).toBeVisible();
  await expect(page.locator("#drawer-body")).toContainText("Open and click tracking remain disabled");
});
