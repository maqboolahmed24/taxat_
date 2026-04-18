import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { expect, test } from "@playwright/test";

import { createRunContext } from "../../src/core/run_context.js";
import {
  createDeviceMessagingTopologyBoardViewModel,
  createRecommendedPushChannelCatalog,
  createRecommendedPushKeyLineage,
  createRecommendedPushProjectInventory,
  PUSH_FLOW_ID,
  PUSH_PROVIDER_ID,
  validatePushChannelCatalog,
  validatePushKeyLineage,
  validatePushProjectInventory,
  type DeviceMessagingTopologyBoardViewModel,
  type PushChannelCatalog,
  type PushKeyLineage,
  type PushProjectInventory,
} from "../../src/providers/push/flows/create_device_messaging_project_and_keys.js";

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

function pushRunContext() {
  return createRunContext({
    runId: "push-device-messaging-2026-04-18",
    providerId: PUSH_PROVIDER_ID,
    flowId: PUSH_FLOW_ID,
    productEnvironmentId: "env_shared_sandbox_integration",
    providerEnvironment: "fixture",
    executionMode: "fixture",
    operatorIdentityAlias: "ops.push.control",
    workspaceId: "wk-push-control-plane",
    evidenceRoot: "artifacts/runs/push-control-plane",
  });
}

test("checked-in push channel artifacts and topology board match the builders", async () => {
  const persistedCatalog = await readJson<PushChannelCatalog>([
    "config",
    "notifications",
    "push_channel_catalog.json",
  ]);
  const persistedInventory = await readJson<PushProjectInventory>([
    "data",
    "provisioning",
    "push_project_inventory.template.json",
  ]);
  const persistedLineage = await readJson<PushKeyLineage>([
    "data",
    "provisioning",
    "push_key_lineage.template.json",
  ]);
  const sampleRun = await readJson<{
    deviceMessagingTopologyBoard: DeviceMessagingTopologyBoardViewModel;
  }>([
    "automation",
    "provisioning",
    "report_viewer",
    "data",
    "sample_run.json",
  ]);

  expect(persistedCatalog).toEqual(createRecommendedPushChannelCatalog());
  expect(persistedInventory).toEqual(
    createRecommendedPushProjectInventory(pushRunContext()),
  );
  expect(persistedLineage).toEqual(
    createRecommendedPushKeyLineage(pushRunContext()),
  );
  expect(sampleRun.deviceMessagingTopologyBoard).toEqual(
    createDeviceMessagingTopologyBoardViewModel(),
  );
});

test("active push channels stay native-only while browser push remains explicitly deferred", () => {
  const catalog = createRecommendedPushChannelCatalog();
  const inventory = createRecommendedPushProjectInventory(pushRunContext());
  const lineage = createRecommendedPushKeyLineage(pushRunContext());

  validatePushChannelCatalog(catalog);
  validatePushProjectInventory(inventory, lineage);
  validatePushKeyLineage(lineage);

  expect(
    catalog.channel_records.filter((row) => row.delivery_state === "ACTIVE"),
  ).toHaveLength(3);
  expect(
    catalog.channel_records.every((row) =>
      row.client_surface === "NATIVE_MACOS_OPERATOR"
        ? row.visibility_class === "INTERNAL_ONLY"
        : row.delivery_state !== "ACTIVE",
    ),
  ).toBe(true);
  expect(
    catalog.surface_decisions,
  ).toEqual({
    customer_portal_web_push: "DISABLED",
    operator_web_push: "DISABLED",
    macos_native_system_notifications: "ENABLED",
  });
});
