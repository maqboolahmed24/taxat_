import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { expect, test } from "@playwright/test";

import {
  assertOcrCandidateBoundary,
  createRecommendedDocumentExtractionProfileCatalog,
  createRecommendedDocumentExtractionReviewThresholds,
  createRecommendedOcrOutputToCandidateFactMapping,
  validateOcrOutputToCandidateFactMapping,
  type OcrOutputToCandidateFactMapping,
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

test("checked-in OCR mapping matches the builder and never targets canonical facts", async () => {
  const persistedMapping = await readJson<OcrOutputToCandidateFactMapping>([
    "config",
    "evidence",
    "ocr_output_to_candidate_fact_mapping.json",
  ]);

  expect(persistedMapping).toEqual(
    createRecommendedOcrOutputToCandidateFactMapping(),
  );

  validateOcrOutputToCandidateFactMapping(persistedMapping);
  assertOcrCandidateBoundary(persistedMapping);
});

test("OCR mapping stays aligned with the profile catalog and review-threshold contract", () => {
  const profileCatalog = createRecommendedDocumentExtractionProfileCatalog();
  const reviewThresholds = createRecommendedDocumentExtractionReviewThresholds();
  const mapping = createRecommendedOcrOutputToCandidateFactMapping();

  const profileRefs = new Set(profileCatalog.profiles.map((profile) => profile.profile_ref));
  const thresholdRefs = new Set(
    reviewThresholds.profile_rules.map((rule) => rule.profile_ref),
  );

  mapping.mapping_rows.forEach((row) => {
    expect(profileRefs.has(row.profile_ref)).toBe(true);
    expect(thresholdRefs.has(row.profile_ref)).toBe(true);
    expect(row.candidate_fact_family.endsWith("_CANDIDATE")).toBe(true);
    expect(row.promotion_guard).toBe("CANDIDATE_ONLY_NEVER_CANONICAL");
    expect(row.prohibited_canonical_targets.length).toBeGreaterThan(0);
  });

  const bankStatementRow = mapping.mapping_rows.find(
    (row) => row.mapping_ref === "ocr_map_statement_rows",
  );
  expect(bankStatementRow?.candidate_value_kind).toBe("TABLE_ROW_SET");
  expect(bankStatementRow?.prohibited_canonical_targets).toEqual(
    expect.arrayContaining(["ledger_entry", "cashbook_line"]),
  );

  const screenshotRow = mapping.mapping_rows.find(
    (row) => row.mapping_ref === "ocr_map_screenshot_text",
  );
  expect(screenshotRow?.review_requirements).toEqual(
    expect.arrayContaining(["layout-only-default"]),
  );
});
