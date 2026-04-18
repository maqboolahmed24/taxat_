import { mkdtemp, readFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { expect, test } from "@playwright/test";

import { createRunContext } from "../../../../automation/provisioning/src/core/run_context.js";
import {
  createDeviceMessagingProjectAndKeys,
  PUSH_FLOW_ID,
  PUSH_PROVIDER_ID,
  type CreateDeviceMessagingProjectAndKeysResult,
  type DeviceMessagingProjectEntryUrls,
  type PushKeyLineage,
  type PushProjectInventory,
} from "../../../../automation/provisioning/src/providers/push/flows/create_device_messaging_project_and_keys.js";

function fixtureEntryUrls(
  scenario: "fresh" | "existing" | "apns-missing",
): DeviceMessagingProjectEntryUrls {
  return {
    controlPlane:
      `/automation/provisioning/tests/fixtures/firebase_push_console.html?scenario=${scenario}`,
  };
}

function fixtureRunContext() {
  return createRunContext({
    runId: "run-fixture-push-topology",
    providerId: PUSH_PROVIDER_ID,
    flowId: PUSH_FLOW_ID,
    productEnvironmentId: "env_local_provisioning_workstation",
    providerEnvironment: "fixture",
    executionMode: "fixture",
    operatorIdentityAlias: "ops.push.fixture",
    workspaceId: "wk-local-provisioning-push",
    evidenceRoot: "artifacts/runs/push-topology-fixture",
  });
}

async function runFixtureFlow(
  page: Parameters<typeof createDeviceMessagingProjectAndKeys>[0]["page"],
  scenario: "fresh" | "existing" | "apns-missing",
) {
  const rootDir = await mkdtemp(path.join(os.tmpdir(), `taxat-push-${scenario}-`));
  const projectInventoryPath = path.join(rootDir, "push_project_inventory.json");
  const keyLineagePath = path.join(rootDir, "push_key_lineage.json");

  const result = await createDeviceMessagingProjectAndKeys({
    page,
    runContext: fixtureRunContext(),
    projectInventoryPath,
    keyLineagePath,
    entryUrls: fixtureEntryUrls(scenario),
  });

  const [projectInventoryRaw, keyLineageRaw, evidenceManifestRaw] =
    await Promise.all([
      readFile(projectInventoryPath, "utf8"),
      readFile(keyLineagePath, "utf8"),
      readFile(result.evidenceManifestPath, "utf8"),
    ]);

  return {
    result,
    projectInventoryRaw,
    keyLineageRaw,
    evidenceManifestRaw,
    projectInventory: JSON.parse(projectInventoryRaw) as PushProjectInventory,
    keyLineage: JSON.parse(keyLineageRaw) as PushKeyLineage,
  };
}

function expectSuccessfulStatuses(result: CreateDeviceMessagingProjectAndKeysResult) {
  expect(result.steps.map((step) => step.status)).toEqual([
    "SUCCEEDED",
    "SUCCEEDED",
    "SUCCEEDED",
    "SUCCEEDED",
    "SUCCEEDED",
    "SUCCEEDED",
  ]);
}

test("fresh fixture bootstrap creates the native-only messaging topology without persisting raw key material", async ({
  page,
}) => {
  const flow = await runFixtureFlow(page, "fresh");

  expect(flow.result.outcome).toBe("DEVICE_MESSAGING_TOPOLOGY_READY");
  expectSuccessfulStatuses(flow.result);
  expect(flow.projectInventory.workspace_rows).toHaveLength(4);
  expect(flow.keyLineage.credential_records).toHaveLength(6);
  expect(flow.result.pushChannelCatalog.channel_records).toHaveLength(6);
  expect(flow.result.continuityMatrix.continuity_rows).toHaveLength(4);
  expect(flow.projectInventoryRaw).not.toContain("-----BEGIN PRIVATE KEY-----");
  expect(flow.projectInventoryRaw).not.toContain(".p8");
  expect(flow.keyLineageRaw).not.toContain("\"private_key\"");
  expect(flow.keyLineageRaw).not.toContain("AIza");
  expect(flow.evidenceManifestRaw).toContain(
    "Persisted sanitized push inventory and key lineage without raw service-account or APNs material.",
  );
});

test("existing fixture bootstrap adopts the current project and credentials instead of duplicating them", async ({
  page,
}) => {
  const flow = await runFixtureFlow(page, "existing");

  expect(flow.result.outcome).toBe("DEVICE_MESSAGING_TOPOLOGY_READY");
  expect(flow.result.steps.map((step) => step.status)).toEqual([
    "SUCCEEDED",
    "SKIPPED_AS_ALREADY_PRESENT",
    "SKIPPED_AS_ALREADY_PRESENT",
    "SUCCEEDED",
    "SUCCEEDED",
    "SUCCEEDED",
  ]);
  expect(
    flow.projectInventory.workspace_rows
      .filter((row) => row.product_environment_id !== "env_local_provisioning_workstation")
      .every((row) => row.source_disposition === "ADOPTED_EXISTING"),
  ).toBe(true);
  expect(
    flow.keyLineage.credential_records.every(
      (row) => row.source_disposition === "ADOPTED_EXISTING",
    ),
  ).toBe(true);
});

test("missing APNs binding blocks policy acceptance instead of silently downgrading native delivery posture", async ({
  page,
}) => {
  const flow = await runFixtureFlow(page, "apns-missing");

  expect(flow.result.outcome).toBe("DEVICE_MESSAGING_POLICY_REVIEW_REQUIRED");
  expect(flow.result.steps[2]?.status).toBe("BLOCKED_BY_POLICY");
  expect(flow.result.steps[5]?.status).toBe("SUCCEEDED");
  expect(flow.result.notes).toEqual(
    expect.arrayContaining([
      expect.stringContaining("APNs binding must remain present"),
    ]),
  );
  expect(flow.evidenceManifestRaw).toContain(
    "APNs drift was surfaced explicitly and blocked instead of being silently accepted.",
  );
});

test("live-provider execution remains blocked unless the run context explicitly opts in", async ({
  page,
}) => {
  const rootDir = await mkdtemp(path.join(os.tmpdir(), "taxat-push-live-gate-"));

  await expect(
    createDeviceMessagingProjectAndKeys({
      page,
      runContext: createRunContext({
        providerId: PUSH_PROVIDER_ID,
        flowId: PUSH_FLOW_ID,
        productEnvironmentId: "env_shared_sandbox_integration",
        providerEnvironment: "sandbox",
        executionMode: "sandbox",
        operatorIdentityAlias: "ops.push.live",
        workspaceId: "wk-live-push-topology",
        evidenceRoot: "artifacts/runs/push-topology-live",
      }),
      projectInventoryPath: path.join(rootDir, "push_project_inventory.json"),
      keyLineagePath: path.join(rootDir, "push_key_lineage.json"),
    }),
  ).rejects.toThrow(/live provider execution is not enabled/i);
});

test("device messaging topology board renders semantic lanes, continuity targets, and safe lineage refs only", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto(
    "/automation/provisioning/report_viewer/index.html?fixture=./data/sample_run.json&page=device-messaging-topology-board",
  );

  await expect(page.locator("html")).toHaveAttribute("data-motion", "reduce");
  await expect(
    page.getByRole("navigation", { name: "Device messaging channels" }),
  ).toBeVisible();
  await expect(page.locator("#main-title")).toHaveText("Local fixture sink");
  await expect(page.getByRole("heading", { name: "Product notification families" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Provider channels" })).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Shell/route continuity targets" }),
  ).toBeVisible();

  await page
    .locator(".push-channel-rail-list button")
    .filter({ hasText: "Native macOS system notification (Production)" })
    .click();
  await expect(page.locator("#drawer-title")).toHaveText(
    "Native macOS system notification (Production)",
  );
  await expect(page.getByText("vault://push/apns/production/auth-key")).toBeVisible();
  await expect(page.getByText("focus.sla-breached:{item_id}")).toBeVisible();
  await expect(page.getByText("-----BEGIN PRIVATE KEY-----")).toHaveCount(0);
});
