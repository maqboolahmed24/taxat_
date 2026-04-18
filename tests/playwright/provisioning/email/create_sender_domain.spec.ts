import { mkdtemp, readFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { expect, test } from "@playwright/test";

import { createRunContext } from "../../../../automation/provisioning/src/core/run_context.js";
import {
  createEmailAccountAndSenderDomain,
  EMAIL_FLOW_ID,
  EMAIL_PROVIDER_ID,
  type CreateEmailAccountAndSenderDomainResult,
  type EmailProviderEntryUrls,
} from "../../../../automation/provisioning/src/providers/email/flows/create_email_account_and_sender_domain.js";

function fixtureEntryUrls(
  scenario: "fresh" | "existing" | "dns-pending",
): EmailProviderEntryUrls {
  return {
    controlPlane:
      `/automation/provisioning/tests/fixtures/postmark_email_console.html?scenario=${scenario}`,
  };
}

function fixtureRunContext() {
  return createRunContext({
    runId: "run-fixture-email-delivery",
    providerId: EMAIL_PROVIDER_ID,
    flowId: EMAIL_FLOW_ID,
    productEnvironmentId: "env_local_provisioning_workstation",
    providerEnvironment: "fixture",
    executionMode: "fixture",
    operatorIdentityAlias: "ops.email.fixture",
    workspaceId: "wk-local-provisioning-email",
    evidenceRoot: "artifacts/runs/email-delivery-fixture",
  });
}

async function runFixtureFlow(
  page: Parameters<typeof createEmailAccountAndSenderDomain>[0]["page"],
  scenario: "fresh" | "existing" | "dns-pending",
) {
  const rootDir = await mkdtemp(path.join(os.tmpdir(), `taxat-email-${scenario}-`));
  const workspaceRecordPath = path.join(rootDir, "email_provider_workspace.json");
  const senderDomainRecordPath = path.join(rootDir, "sender_domain_record.json");
  const dnsInventoryPath = path.join(rootDir, "email_dns_inventory.json");
  const messageStreamCatalogPath = path.join(rootDir, "email_message_stream_catalog.json");

  const result = await createEmailAccountAndSenderDomain({
    page,
    runContext: fixtureRunContext(),
    workspaceRecordPath,
    senderDomainRecordPath,
    dnsInventoryPath,
    messageStreamCatalogPath,
    entryUrls: fixtureEntryUrls(scenario),
  });

  const [workspaceRaw, senderDomainRaw, evidenceRaw] = await Promise.all([
    readFile(workspaceRecordPath, "utf8"),
    readFile(senderDomainRecordPath, "utf8"),
    readFile(result.evidenceManifestPath, "utf8"),
  ]);

  return {
    result,
    workspaceRaw,
    senderDomainRaw,
    evidenceRaw,
  };
}

function expectSuccessfulEnd(result: CreateEmailAccountAndSenderDomainResult) {
  expect(result.steps[4]?.status).toBe("SUCCEEDED");
  expect(result.workspaceRecord.workspace_rows).toHaveLength(4);
  expect(result.senderDomainRecord.sender_domains).toHaveLength(3);
  expect(result.dnsInventory.rows).toHaveLength(12);
  expect(result.messageStreamCatalog.streams).toHaveLength(9);
}

test("fresh bootstrap persists sanitized workspace, sender-domain, DNS, and stream artifacts", async ({
  page,
}) => {
  const flow = await runFixtureFlow(page, "fresh");

  await expect(
    page.getByRole("heading", { name: "Transactional email control plane" }),
  ).toBeVisible();
  expect(flow.result.outcome).toBe("EMAIL_DOMAIN_READY");
  expect(flow.result.steps.map((step) => step.status)).toEqual([
    "SUCCEEDED",
    "SUCCEEDED",
    "SUCCEEDED",
    "SUCCEEDED",
    "SUCCEEDED",
  ]);
  expectSuccessfulEnd(flow.result);
  expect(flow.workspaceRaw).not.toContain("X-Postmark");
  expect(flow.workspaceRaw).not.toContain("POSTMARK_API");
  expect(flow.senderDomainRaw).toContain("notify.production.taxat.example");
  expect(flow.evidenceRaw).toContain("Persisted sanitized workspace");
});

test("existing workspace and domains are adopted instead of duplicated", async ({
  page,
}) => {
  const flow = await runFixtureFlow(page, "existing");

  expect(flow.result.outcome).toBe("EMAIL_DOMAIN_READY");
  expect(flow.result.steps.map((step) => step.status)).toEqual([
    "SUCCEEDED",
    "SKIPPED_AS_ALREADY_PRESENT",
    "SKIPPED_AS_ALREADY_PRESENT",
    "SUCCEEDED",
    "SUCCEEDED",
  ]);
  expectSuccessfulEnd(flow.result);
});

test("dns-pending posture stops at an explicit manual checkpoint while still persisting inventory", async ({
  page,
}) => {
  const flow = await runFixtureFlow(page, "dns-pending");

  expect(flow.result.outcome).toBe("EMAIL_DNS_VERIFICATION_PENDING");
  expect(flow.result.steps[3]?.status).toBe("MANUAL_CHECKPOINT_REQUIRED");
  expect(flow.result.steps[3]?.manualCheckpoint?.reason).toBe("HUMAN_REVIEW");
  expect(
    flow.result.senderDomainRecord.sender_domains.find(
      (domain) => domain.domain_ref === "email_domain_notify_preprod",
    )?.manual_checkpoint_open,
  ).toBe(true);
  expect(flow.senderDomainRaw).toContain("MANUAL_CHECKPOINT_REQUIRED");
});

test("email readiness board renders semantic regions, persistent inspector detail, and reduced-motion parity", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto(
    "/automation/provisioning/report_viewer/index.html?fixture=./data/sample_run.json&page=email-domain-readiness-board",
  );

  await expect(page.locator("html")).toHaveAttribute("data-motion", "reduce");
  await expect(
    page.getByRole("navigation", { name: "Sender domains and streams" }),
  ).toBeVisible();
  await expect(page.getByRole("heading", { name: "Workspace" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Domain Identity" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "DNS Records" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Message Streams" })).toBeVisible();
  await expect(page.locator("#main-title")).toHaveText("notify.sandbox.taxat.example");
  await expect(page.locator("#drawer-title")).toHaveText(
    "20260418.pm._domainkey.notify.sandbox.taxat.example",
  );

  await page
    .locator(".domain-rail-list button")
    .filter({ hasText: "notify.preprod.taxat.example" })
    .click();
  await expect(page.locator("#main-title")).toHaveText("notify.preprod.taxat.example");
  await expect(page.locator("#run-status")).toHaveText("Manual Checkpoint Required");

  await page
    .locator(".dns-record-list button")
    .filter({ hasText: "Return-Path CNAME" })
    .first()
    .click();
  await expect(page.locator("#drawer-title")).toHaveText(
    "pm-bounces.notify.preprod.taxat.example",
  );
  await expect(page.locator("#drawer-body")).toContainText("pm.mtasv.net");
});
