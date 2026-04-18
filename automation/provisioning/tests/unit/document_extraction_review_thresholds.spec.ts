import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { expect, test } from "@playwright/test";

import { createRunContext } from "../../src/core/run_context.js";
import {
  createDocumentExtractionGovernanceBoardViewModel,
  createRecommendedDocumentExtractionProfileCatalog,
  createRecommendedDocumentExtractionProviderInventory,
  createRecommendedDocumentExtractionReviewThresholds,
  createRecommendedDocumentExtractionSelectionRecord,
  OCR_PROVIDER_ID,
  DOCUMENT_EXTRACTION_FLOW_ID,
  validateDocumentExtractionProfileCatalog,
  validateDocumentExtractionProviderInventory,
  validateDocumentExtractionReviewThresholds,
  validateDocumentExtractionSelectionRecord,
  type DocumentExtractionGovernanceBoardViewModel,
  type DocumentExtractionProfileCatalog,
  type DocumentExtractionProviderInventory,
  type DocumentExtractionReviewThresholds,
  type DocumentExtractionSelectionRecord,
} from "../../src/providers/ocr/flows/create_managed_document_extraction_project_or_record_self_host_decision.js";

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

function documentExtractionRunContext() {
  return createRunContext({
    runId: "document-extraction-selection-2026-04-18",
    providerId: OCR_PROVIDER_ID,
    flowId: DOCUMENT_EXTRACTION_FLOW_ID,
    productEnvironmentId: "env_shared_sandbox_integration",
    providerEnvironment: "fixture",
    executionMode: "fixture",
    operatorIdentityAlias: "ops.document.extraction",
    workspaceId: "wk-document-extraction-control-plane",
    evidenceRoot: "artifacts/runs/document-extraction-control-plane",
  });
}

test("checked-in OCR selection artifacts and governance board match the builders", async () => {
  const persistedSelectionRecord =
    await readJson<DocumentExtractionSelectionRecord>([
      "data",
      "provisioning",
      "document_extraction_selection_record.template.json",
    ]);
  const persistedProviderInventory =
    await readJson<DocumentExtractionProviderInventory>([
      "data",
      "provisioning",
      "document_extraction_provider_inventory.template.json",
    ]);
  const persistedProfileCatalog = await readJson<DocumentExtractionProfileCatalog>([
    "config",
    "evidence",
    "document_extraction_profile_catalog.json",
  ]);
  const persistedReviewThresholds =
    await readJson<DocumentExtractionReviewThresholds>([
      "config",
      "evidence",
      "document_extraction_review_thresholds.json",
    ]);
  const sampleRun = await readJson<{
    documentExtractionGovernanceBoard: DocumentExtractionGovernanceBoardViewModel;
  }>([
    "automation",
    "provisioning",
    "report_viewer",
    "data",
    "sample_run.json",
  ]);

  expect(persistedSelectionRecord).toEqual(
    createRecommendedDocumentExtractionSelectionRecord(
      documentExtractionRunContext(),
    ),
  );
  expect(persistedProviderInventory).toEqual(
    createRecommendedDocumentExtractionProviderInventory(
      documentExtractionRunContext(),
    ),
  );
  expect(persistedProfileCatalog).toEqual(
    createRecommendedDocumentExtractionProfileCatalog(),
  );
  expect(persistedReviewThresholds).toEqual(
    createRecommendedDocumentExtractionReviewThresholds(),
  );
  expect(sampleRun.documentExtractionGovernanceBoard).toEqual(
    createDocumentExtractionGovernanceBoardViewModel(),
  );
});

test("canonical OCR selection stays blocked on platform choice while profile and threshold policy remain deterministic", () => {
  const selectionRecord = createRecommendedDocumentExtractionSelectionRecord(
    documentExtractionRunContext(),
  );
  const providerInventory = createRecommendedDocumentExtractionProviderInventory(
    documentExtractionRunContext(),
  );
  const profileCatalog = createRecommendedDocumentExtractionProfileCatalog();
  const reviewThresholds = createRecommendedDocumentExtractionReviewThresholds();

  validateDocumentExtractionSelectionRecord(selectionRecord);
  validateDocumentExtractionProviderInventory(providerInventory);
  validateDocumentExtractionProfileCatalog(profileCatalog);
  validateDocumentExtractionReviewThresholds(reviewThresholds);

  expect(selectionRecord.selection_status).toBe("SELF_HOST_DECISION_REQUIRED");
  expect(selectionRecord.managed_default_status).toBe(
    "BLOCKED_BY_PLATFORM_PROVIDER_SELECTION",
  );
  expect(providerInventory.option_rows).toHaveLength(4);
  expect(
    profileCatalog.profiles.map((profile) => profile.document_class),
  ).toEqual(
    expect.arrayContaining([
      "EXPENSE_RECEIPT",
      "SUPPLIER_INVOICE",
      "BANK_STATEMENT",
      "AUTHORITY_CORRESPONDENCE",
      "SCREENSHOT_OR_UPLOADED_IMAGE",
      "HANDWRITTEN_NOTE",
    ]),
  );
  expect(reviewThresholds.blocked_upload_gate_states).toEqual(
    expect.arrayContaining([
      "SCAN_PENDING",
      "QUARANTINED",
      "ATTACHMENT_UNCONFIRMED",
    ]),
  );
  expect(reviewThresholds.typed_actions).toEqual(
    expect.arrayContaining([
      "AUTO_ACCEPT_TO_CANDIDATE",
      "REVIEW_REQUIRED",
      "LAYOUT_ONLY_RETAIN",
      "UNSUPPORTED_FORMAT",
      "QUALITY_TOO_LOW",
      "BLOCKED_BY_QUARANTINE",
    ]),
  );
});
