import { mkdtemp, readFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { expect, test } from "@playwright/test";

import { createRunContext } from "../../../../automation/provisioning/src/core/run_context.js";
import {
  createManagedDocumentExtractionProjectOrRecordSelfHostDecision,
  DOCUMENT_EXTRACTION_FLOW_ID,
  OCR_PROVIDER_ID,
  type CreateManagedDocumentExtractionProjectResult,
  type DocumentExtractionProviderEntryUrls,
} from "../../../../automation/provisioning/src/providers/ocr/flows/create_managed_document_extraction_project_or_record_self_host_decision.js";

function fixtureEntryUrls(): DocumentExtractionProviderEntryUrls {
  return {
    controlPlane:
      "/automation/provisioning/tests/fixtures/document_extraction_control_plane.html?scenario=blocked-by-platform",
  };
}

function fixtureRunContext() {
  return createRunContext({
    runId: "run-fixture-document-extraction",
    providerId: OCR_PROVIDER_ID,
    flowId: DOCUMENT_EXTRACTION_FLOW_ID,
    productEnvironmentId: "env_local_provisioning_workstation",
    providerEnvironment: "fixture",
    executionMode: "fixture",
    operatorIdentityAlias: "ops.document.extraction.fixture",
    workspaceId: "wk-local-provisioning-document-extraction",
    evidenceRoot: "artifacts/runs/document-extraction-fixture",
  });
}

async function runFixtureFlow(
  page: Parameters<
    typeof createManagedDocumentExtractionProjectOrRecordSelfHostDecision
  >[0]["page"],
) {
  const rootDir = await mkdtemp(
    path.join(os.tmpdir(), "taxat-document-extraction-"),
  );
  const providerInventoryPath = path.join(
    rootDir,
    "document_extraction_provider_inventory.template.json",
  );
  const selectionRecordPath = path.join(
    rootDir,
    "document_extraction_selection_record.template.json",
  );

  const result =
    await createManagedDocumentExtractionProjectOrRecordSelfHostDecision({
      page,
      runContext: fixtureRunContext(),
      providerInventoryPath,
      selectionRecordPath,
      entryUrls: fixtureEntryUrls(),
    });

  const [providerInventoryRaw, selectionRecordRaw, evidenceManifestRaw] =
    await Promise.all([
      readFile(providerInventoryPath, "utf8"),
      readFile(selectionRecordPath, "utf8"),
      readFile(result.evidenceManifestPath, "utf8"),
    ]);

  return {
    result,
    providerInventoryRaw,
    selectionRecordRaw,
    evidenceManifestRaw,
  };
}

function expectSuccessStatuses(
  result: CreateManagedDocumentExtractionProjectResult,
) {
  expect(result.steps.map((step) => step.status)).toEqual([
    "SUCCEEDED",
    "SUCCEEDED",
    "SUCCEEDED",
    "SUCCEEDED",
    "SUCCEEDED",
    "SUCCEEDED",
  ]);
}

test("fixture OCR flow records self-host decision required and persists sanitized selection artifacts", async ({
  page,
}) => {
  const flow = await runFixtureFlow(page);

  expect(flow.result.outcome).toBe(
    "DOCUMENT_EXTRACTION_SELF_HOST_DECISION_REQUIRED",
  );
  expectSuccessStatuses(flow.result);
  expect(flow.result.selectionRecord.selection_status).toBe(
    "SELF_HOST_DECISION_REQUIRED",
  );
  expect(flow.result.selectionRecord.managed_default_status).toBe(
    "BLOCKED_BY_PLATFORM_PROVIDER_SELECTION",
  );
  expect(flow.result.providerInventory.option_rows).toHaveLength(4);
  expect(flow.providerInventoryRaw).not.toContain("api_key");
  expect(flow.providerInventoryRaw).not.toContain("Bearer ");
  expect(flow.selectionRecordRaw).not.toContain("client_secret");
  expect(flow.evidenceManifestRaw).toContain(
    "Persisted OCR selection artifacts without provider credentials",
  );
});

test("document extraction governance board renders the evidence atelier layout, persistent inspector, and reduced-motion parity", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto(
    "/automation/provisioning/report_viewer/index.html?fixture=./data/sample_run.json&page=document-extraction-governance-board",
  );

  await expect(page.locator("html")).toHaveAttribute("data-motion", "reduce");
  await expect(
    page.getByRole("navigation", { name: "Document extraction profiles" }),
  ).toBeVisible();
  await expect(page.getByRole("heading", { name: "Source Artifact" })).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Normalized Extraction" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Candidate-Fact Boundary" }),
  ).toBeVisible();
  await expect(page.locator("#run-status")).toHaveText(
    "Self-host decision required",
  );
  await expect(page.locator("#drawer-title")).toHaveText("EXPENSE RECEIPT");

  await page
    .locator(".document-extraction-profile-rail-list button")
    .filter({ hasText: "BANK STATEMENT" })
    .click();
  await expect(page.locator("#main-title")).toHaveText("BANK STATEMENT");
  await expect(page.locator("#drawer-title")).toHaveText("BANK STATEMENT");
  await expect(
    page
      .locator("#step-list")
      .getByText(
        "upload object version -> extraction run -> evidence item -> candidate facts",
      )
      .first(),
  ).toBeVisible();
  await expect(
    page.getByText("Bank statement table extraction is never auto-accepted"),
  ).toBeVisible();
});
