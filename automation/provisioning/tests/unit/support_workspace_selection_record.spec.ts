import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { expect, test } from "@playwright/test";

import { createRunContext } from "../../src/core/run_context.js";
import {
  createRecommendedPortalHelpToExternalTicketMapping,
  createRecommendedSupportChannelPolicy,
  createRecommendedSupportFieldMappingTemplate,
  createRecommendedSupportWebhookEndpointContract,
  createRecommendedSupportWorkspaceSelectionRecord,
  createSupportContextMappingBoardViewModel,
  SUPPORT_FLOW_ID,
  SUPPORT_PROVIDER_ID,
  validateSupportChannelPolicy,
  validateSupportFieldMappingTemplate,
  validateSupportWebhookEndpointContract,
  validateSupportWorkspaceSelectionRecord,
  type PortalHelpToExternalTicketMapping,
  type SupportChannelPolicy,
  type SupportContextMappingBoardViewModel,
  type SupportFieldMappingTemplate,
  type SupportWebhookEndpointContract,
  type SupportWorkspaceSelectionRecord,
} from "../../src/providers/support/flows/create_support_workspace_if_selected.js";

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

function supportRunContext() {
  return createRunContext({
    runId: "support-selection-2026-04-18",
    providerId: SUPPORT_PROVIDER_ID,
    flowId: SUPPORT_FLOW_ID,
    productEnvironmentId: "env_shared_sandbox_integration",
    providerEnvironment: "fixture",
    executionMode: "fixture",
    operatorIdentityAlias: "ops.support.control",
    workspaceId: "wk-support-control-plane",
    evidenceRoot: "artifacts/runs/support-control-plane",
  });
}

test("checked-in support selection artifacts and board match the builders", async () => {
  const persistedSelectionRecord = await readJson<SupportWorkspaceSelectionRecord>([
    "data",
    "provisioning",
    "support_workspace_selection_record.template.json",
  ]);
  const persistedFieldMapping = await readJson<SupportFieldMappingTemplate>([
    "data",
    "provisioning",
    "support_field_mapping.template.json",
  ]);
  const persistedChannelPolicy = await readJson<SupportChannelPolicy>([
    "config",
    "support",
    "support_channel_policy.json",
  ]);
  const persistedPortalHelpMapping = await readJson<PortalHelpToExternalTicketMapping>([
    "config",
    "support",
    "portal_help_to_external_ticket_mapping.json",
  ]);
  const persistedWebhookContract = await readJson<SupportWebhookEndpointContract>([
    "config",
    "support",
    "support_webhook_endpoint_contract.json",
  ]);
  const sampleRun = await readJson<{
    supportContextMappingBoard: SupportContextMappingBoardViewModel;
  }>([
    "automation",
    "provisioning",
    "report_viewer",
    "data",
    "sample_run.json",
  ]);

  expect(persistedSelectionRecord).toEqual(
    createRecommendedSupportWorkspaceSelectionRecord(supportRunContext()),
  );
  expect(persistedFieldMapping).toEqual(
    createRecommendedSupportFieldMappingTemplate(supportRunContext()),
  );
  expect(persistedChannelPolicy).toEqual(createRecommendedSupportChannelPolicy());
  expect(persistedPortalHelpMapping).toEqual(
    createRecommendedPortalHelpToExternalTicketMapping(),
  );
  expect(persistedWebhookContract).toEqual(
    createRecommendedSupportWebhookEndpointContract(),
  );
  expect(sampleRun.supportContextMappingBoard).toEqual(
    createSupportContextMappingBoardViewModel(),
  );
});

test("canonical support selection stays explicitly not-selected while preserving a future-safe adapter baseline", () => {
  const selectionRecord = createRecommendedSupportWorkspaceSelectionRecord(
    supportRunContext(),
  );
  const fieldMapping = createRecommendedSupportFieldMappingTemplate(
    supportRunContext(),
  );
  const channelPolicy = createRecommendedSupportChannelPolicy();
  const webhookContract = createRecommendedSupportWebhookEndpointContract();

  validateSupportWorkspaceSelectionRecord(selectionRecord);
  validateSupportFieldMappingTemplate(fieldMapping);
  validateSupportChannelPolicy(channelPolicy);
  validateSupportWebhookEndpointContract(webhookContract);

  expect(selectionRecord.selection_status).toBe("NOT_SELECTED");
  expect(selectionRecord.selected_vendor_adapter_or_null).toBeNull();
  expect(selectionRecord.selected_vendor_label_or_null).toBeNull();
  expect(selectionRecord.future_default_vendor_adapter_or_null).toBe(
    "ZENDESK_COMPATIBLE_BASELINE",
  );
  expect(fieldMapping.selection_status).toBe("NOT_SELECTED");
  expect(channelPolicy.channel_rows.map((row) => row.restate_required)).toEqual([
    false,
    false,
    false,
  ]);
  expect(
    webhookContract.webhook_rows.every(
      (row) =>
        row.activation_state === "NOT_SELECTED" &&
        row.callback_url_ref_or_null === null,
    ),
  ).toBe(true);
});
