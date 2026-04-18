import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { expect, test } from "@playwright/test";

import {
  createRecommendedEmailDeliveryEventMapping,
  createRecommendedEmailWebhookEndpointContract,
  validateEmailDeliveryEventMapping,
  validateEmailWebhookEndpointContract,
  type EmailDeliveryEventMapping,
  type EmailWebhookEndpointContract,
} from "../../src/providers/email/flows/configure_templates_and_webhooks.js";

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

test("checked-in delivery-event mapping and webhook contract match the builders", async () => {
  const persistedMapping = await readJson<EmailDeliveryEventMapping>([
    "config",
    "notifications",
    "email_delivery_event_mapping.json",
  ]);
  const persistedWebhookContract = await readJson<EmailWebhookEndpointContract>([
    "config",
    "notifications",
    "email_webhook_endpoint_contract.json",
  ]);

  expect(persistedMapping).toEqual(createRecommendedEmailDeliveryEventMapping());
  expect(persistedWebhookContract).toEqual(
    createRecommendedEmailWebhookEndpointContract(),
  );
});

test("delivery-event mapping distinguishes allowed evidence updates from prohibited workflow mutations", () => {
  const mapping = createRecommendedEmailDeliveryEventMapping();
  const webhookContract = createRecommendedEmailWebhookEndpointContract();

  validateEmailDeliveryEventMapping(mapping);
  validateEmailWebhookEndpointContract(webhookContract, mapping);

  expect(mapping.idempotency_policy.duplicate_effect).toBe(
    "RETURN_200_NO_DUPLICATE_EVIDENCE",
  );
  expect(mapping.telemetry_defaults.track_opens).toBe(false);
  expect(mapping.telemetry_defaults.track_links).toBe("None");

  for (const row of mapping.event_mappings) {
    expect(row.prohibited_internal_updates).toEqual(
      expect.arrayContaining([
        "WorkflowItem.lifecycle_state",
        "ClientApprovalPack.approval_state",
        "PortalHelpRequest.lifecycle_state",
        "AuthorityTruthContract.truth_surface_role",
      ]),
    );
  }

  const disabledTelemetry = mapping.event_mappings.filter(
    (row) => row.provider_event_type === "Open" || row.provider_event_type === "Click",
  );
  expect(disabledTelemetry.every((row) => !row.enabled_by_default)).toBe(true);
  expect(
    webhookContract.callback_records.every(
      (record) =>
        record.disabled_event_types.includes("Open") &&
        record.disabled_event_types.includes("Click"),
    ),
  ).toBe(true);

  const brokenMapping = structuredClone(mapping);
  brokenMapping.event_mappings[0]!.allowed_internal_updates.push(
    "WorkflowItem.lifecycle_state",
  );
  expect(() => validateEmailDeliveryEventMapping(brokenMapping)).toThrow(
    /must not mutate workflow or authority truth/i,
  );
});
