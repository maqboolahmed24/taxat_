import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { expect, test } from "@playwright/test";

import { createRunContext } from "../../src/core/run_context.js";
import {
  createNotificationCopyAtlasViewModel,
  createRecommendedEmailTemplateCatalog,
  createRecommendedEmailWebhookEndpointContract,
  createTemplateEmailInventory,
  EMAIL_TEMPLATE_FLOW_ID,
  validateEmailTemplateCatalog,
  validateEmailTemplateInventory,
  type EmailTemplateCatalog,
  type EmailTemplateInventory,
  type NotificationCopyAtlasViewModel,
} from "../../src/providers/email/flows/configure_templates_and_webhooks.js";
import { EMAIL_PROVIDER_ID } from "../../src/providers/email/flows/create_email_account_and_sender_domain.js";

const repoRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
  "..",
  "..",
  "..",
);

async function readJson<T>(segments: string[]): Promise<T> {
  const filePath = path.join(repoRoot, ...segments);
  return JSON.parse(await readFile(filePath, "utf8")) as T;
}

function templateRunContext() {
  return createRunContext({
    runId: "template-email-notifications-2026-04-18",
    providerId: EMAIL_PROVIDER_ID,
    flowId: EMAIL_TEMPLATE_FLOW_ID,
    productEnvironmentId: "env_shared_sandbox_integration",
    providerEnvironment: "fixture",
    executionMode: "fixture",
    operatorIdentityAlias: "ops.email.template",
    workspaceId: "wk-template-email-notifications",
    evidenceRoot: "artifacts/runs/email-notifications-template",
  });
}

test("checked-in template catalog, inventory, and notification atlas match the builders", async () => {
  const persistedCatalog = await readJson<EmailTemplateCatalog>([
    "config",
    "notifications",
    "email_template_catalog.json",
  ]);
  const persistedInventory = await readJson<EmailTemplateInventory>([
    "data",
    "provisioning",
    "email_template_inventory.template.json",
  ]);
  const sampleRun = await readJson<{
    notificationCopyAtlas: NotificationCopyAtlasViewModel;
  }>([
    "automation",
    "provisioning",
    "report_viewer",
    "data",
    "sample_run.json",
  ]);

  expect(persistedCatalog).toEqual(createRecommendedEmailTemplateCatalog());
  expect(persistedInventory).toEqual(createTemplateEmailInventory(templateRunContext()));
  expect(sampleRun.notificationCopyAtlas).toEqual(
    createNotificationCopyAtlasViewModel(),
  );
});

test("every configured template stays inside the allowed customer-visible families with safe variables and explicit sender bindings", () => {
  const catalog = createRecommendedEmailTemplateCatalog();
  const inventory = createTemplateEmailInventory(templateRunContext());
  const webhookContract = createRecommendedEmailWebhookEndpointContract();

  validateEmailTemplateCatalog(catalog);
  validateEmailTemplateInventory(inventory, catalog, webhookContract);

  expect(catalog.template_records).toHaveLength(6);
  expect(
    new Set(catalog.template_records.map((record) => record.notification_family)),
  ).toEqual(
    new Set([
      "REQUEST_INFO_CREATED",
      "STAFF_CUSTOMER_COMMENT_CREATED",
      "CUSTOMER_DUE_DATE_CHANGED",
      "ITEM_RESOLVED_OR_CLOSED",
      "PORTAL_HELP_ACKNOWLEDGED",
      "SUPPORT_CONTACT_ACKNOWLEDGED",
    ]),
  );
  expect(
    catalog.template_records.every(
      (record) =>
        record.visibility_class === "CUSTOMER_VISIBLE" &&
        record.sender_stream_ref === "email_stream_customer_transactional" &&
        record.required_merge_variables.every((variable) =>
          record.allowed_merge_variables.includes(variable),
        ),
    ),
  ).toBe(true);
  expect(
    catalog.template_records.some(
      (record) => record.sender_identity_profile_ref === "support_acknowledgement_help",
    ),
  ).toBe(true);
  expect(
    catalog.blocked_event_families,
  ).toEqual(
    expect.arrayContaining([
      "InternalNoteAdded",
      "WorkItemAssigned",
      "WorkItemEscalated",
      "AuditOnlyEvent",
    ]),
  );
});

