import { mkdtemp, readFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { expect, test } from "@playwright/test";

import { createRunContext } from "../../../../automation/provisioning/src/core/run_context.js";
import {
  createSupportWorkspaceIfSelected,
  SUPPORT_FLOW_ID,
  SUPPORT_PROVIDER_ID,
  type CreateSupportWorkspaceIfSelectedResult,
  type SupportFieldMappingTemplate,
  type SupportProviderEntryUrls,
  type SupportWorkspaceSelectionRecord,
} from "../../../../automation/provisioning/src/providers/support/flows/create_support_workspace_if_selected.js";

function fixtureEntryUrls(
  scenario: "not-selected" | "selected-with-gaps",
): SupportProviderEntryUrls {
  return {
    controlPlane:
      `/automation/provisioning/tests/fixtures/support_selection_console.html?scenario=${scenario}`,
  };
}

function fixtureRunContext(
  executionMode: "fixture" | "sandbox" = "fixture",
) {
  return createRunContext({
    runId: `support-selection-${executionMode}-2026-04-18`,
    providerId: SUPPORT_PROVIDER_ID,
    flowId: SUPPORT_FLOW_ID,
    productEnvironmentId:
      executionMode === "fixture"
        ? "env_local_provisioning_workstation"
        : "env_shared_sandbox_integration",
    providerEnvironment: executionMode === "fixture" ? "fixture" : "sandbox",
    executionMode,
    operatorIdentityAlias: "ops.support.fixture",
    workspaceId: "wk-support-selection-fixture",
    evidenceRoot: "artifacts/runs/support-selection-fixture",
  });
}

async function runFixtureFlow(
  page: Parameters<typeof createSupportWorkspaceIfSelected>[0]["page"],
  scenario: "not-selected" | "selected-with-gaps",
) {
  const rootDir = await mkdtemp(path.join(os.tmpdir(), `taxat-support-${scenario}-`));
  const selectionRecordPath = path.join(
    rootDir,
    "support_workspace_selection_record.template.json",
  );
  const fieldMappingPath = path.join(rootDir, "support_field_mapping.template.json");

  const result = await createSupportWorkspaceIfSelected({
    page,
    runContext: fixtureRunContext(),
    selectionRecordPath,
    fieldMappingPath,
    entryUrls: fixtureEntryUrls(scenario),
  });

  const [selectionRecordRaw, fieldMappingRaw, evidenceManifestRaw] =
    await Promise.all([
      readFile(selectionRecordPath, "utf8"),
      readFile(fieldMappingPath, "utf8"),
      readFile(result.evidenceManifestPath, "utf8"),
    ]);

  return {
    result,
    selectionRecordRaw,
    fieldMappingRaw,
    evidenceManifestRaw,
    selectionRecord: JSON.parse(selectionRecordRaw) as SupportWorkspaceSelectionRecord,
    fieldMapping: JSON.parse(fieldMappingRaw) as SupportFieldMappingTemplate,
  };
}

function expectSuccessfulStatuses(result: CreateSupportWorkspaceIfSelectedResult) {
  expect(result.steps.map((step) => step.status)).toEqual([
    "SUCCEEDED",
    "SUCCEEDED",
    "SUCCEEDED",
    "SUCCEEDED",
    "SUCCEEDED",
  ]);
}

test("not-selected fixture flow emits a deterministic support decision record and sanitized mapping pack", async ({
  page,
}) => {
  const flow = await runFixtureFlow(page, "not-selected");

  expect(flow.result.outcome).toBe("SUPPORT_INTEGRATION_NOT_SELECTED");
  expectSuccessfulStatuses(flow.result);
  expect(flow.selectionRecord.selection_status).toBe("NOT_SELECTED");
  expect(flow.selectionRecord.selected_vendor_adapter_or_null).toBeNull();
  expect(flow.selectionRecord.future_default_vendor_adapter_or_null).toBe(
    "ZENDESK_COMPATIBLE_BASELINE",
  );
  expect(flow.fieldMapping.selection_status).toBe("NOT_SELECTED");
  expect(flow.selectionRecordRaw).not.toContain("Bearer ");
  expect(flow.selectionRecordRaw).not.toContain("api_token");
  expect(flow.fieldMappingRaw).not.toContain("Bearer ");
  expect(flow.evidenceManifestRaw).toContain(
    "Persisted support-selection records without vendor tokens, webhook secrets, or raw support transcripts.",
  );
});

test("selected-with-gaps fixture flow records a future vendor-binding posture without treating it as ready", async ({
  page,
}) => {
  const flow = await runFixtureFlow(page, "selected-with-gaps");

  expect(flow.result.outcome).toBe("SUPPORT_INTEGRATION_SELECTED_WITH_GAPS");
  expectSuccessfulStatuses(flow.result);
  expect(flow.selectionRecord.selection_status).toBe("SELECTED_WITH_GAPS");
  expect(flow.selectionRecord.selected_vendor_adapter_or_null).toBe(
    "ZENDESK_COMPATIBLE_BASELINE",
  );
  expect(flow.selectionRecord.selected_vendor_label_or_null).toContain("Zendesk-compatible");
  expect(flow.fieldMapping.selection_status).toBe("SELECTED_WITH_GAPS");
  expect(flow.result.notes).toEqual(
    expect.arrayContaining([
      expect.stringContaining("selected conceptually"),
    ]),
  );
});

test("live-provider execution remains blocked unless explicitly enabled when a support vendor is selected", async ({
  page,
}) => {
  const rootDir = await mkdtemp(path.join(os.tmpdir(), "taxat-support-live-gate-"));

  await expect(
    createSupportWorkspaceIfSelected({
      page,
      runContext: fixtureRunContext("sandbox"),
      selectionRecordPath: path.join(
        rootDir,
        "support_workspace_selection_record.template.json",
      ),
      fieldMappingPath: path.join(rootDir, "support_field_mapping.template.json"),
      entryUrls: fixtureEntryUrls("selected-with-gaps"),
      selectionOverride: "SELECTED_WITH_GAPS",
    }),
  ).rejects.toThrow(/live provider execution is not enabled/i);
});

test("support context mapping board renders scenario switching, persistent inspector, and reduced-motion parity", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto(
    "/automation/provisioning/report_viewer/index.html?fixture=./data/sample_run.json&page=support-context-mapping-board",
  );

  await expect(page.locator("html")).toHaveAttribute("data-motion", "reduce");
  await expect(
    page.getByRole("navigation", { name: "Support mapping scenarios" }),
  ).toBeVisible();
  await expect(page.getByRole("heading", { name: "Portal Context" })).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "External Ticket Fields" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Return/Mirror Rules" }),
  ).toBeVisible();
  await expect(page.locator("#drawer-title")).toHaveText("Contextual request help");

  await page
    .locator(".support-scenario-rail-list button")
    .filter({ hasText: "Support acknowledgement" })
    .click();
  await expect(page.locator("#main-title")).toHaveText("Support acknowledgement");
  await expect(page.locator("#drawer-title")).toHaveText("Support acknowledgement");
  await expect(page.getByText("NO EXTERNAL WRITE")).toBeVisible();
  await expect(
    page.getByText(
      "restate_required = false remains product law whether or not a vendor is later selected.",
    ),
  ).toBeVisible();
});
