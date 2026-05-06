import { expect, test } from "@playwright/test";

import {
  MaterializeEvidenceItemsError,
  MaterializeSourceRecordsError,
  buildEvidenceLineageRefs,
  classifyEvidenceKind,
  materializeEvidenceItems,
  materializeSourceRecords,
  resolveDefaultFreshnessState,
  resolveSourceStrengthTier,
  sourceRecordRef,
  type FetchDispatchResult,
} from "../../../packages/backend-collection/src/index.ts";

function fetchResult(overrides: Partial<FetchDispatchResult> = {}): FetchDispatchResult {
  return {
    cursor_checkpoint_ref: "cursor://vat/checkpoint-1",
    empty_response_confirmed: false,
    fetch_audit_refs: ["audit://fetch/vat"],
    fetch_gap_code_or_null: null,
    fetch_posture: "FETCHED",
    observed_provider_schema_version: "schema://hmrc/vat/v1",
    outcome_code: "SOURCE_FETCHED",
    page_audit_refs: ["audit://fetch/vat/page-1"],
    provider_api_version: "mtd-vat-v1",
    provider_environment_ref: "provider-env://hmrc/sandbox",
    raw_payload_refs: [{ page_index: 1, raw_payload_ref: "raw://hmrc/vat/page-1" }],
    request_audit_refs: ["audit://request/vat"],
    revision_ref: "revision://vat/1",
    source_domain: "vat_obligations",
    ...overrides,
  };
}

function sourceRecords(
  overrides: {
    business_partition?: string;
    fetch_result?: FetchDispatchResult;
    provider_account_ref?: string;
    quarantined?: boolean;
    source_class?:
      | "AUTHORITY_ACKNOWLEDGEMENT"
      | "AUTHORITY_REFERENCE"
      | "INSTITUTIONAL_FEED"
      | "BOOKS_OF_ENTRY"
      | "DOCUMENTARY_EVIDENCE"
      | "DECLARED_ASSERTION"
      | "DETERMINISTIC_DERIVATION"
      | "PROBABILISTIC_INFERENCE"
      | "GOVERNANCE_ARTIFACT";
  } = {},
) {
  return materializeSourceRecords({
    captured_at: "2026-04-27T11:10:00Z",
    client_id: "client-0112",
    collection_boundary_ref: "collection-boundary://manifest-0112",
    effective_period: "tax-year://2025-2026",
    fetch_result: overrides.fetch_result ?? fetchResult(),
    ingestion_run_ref: "source-collection-run://manifest-0112",
    manifest_id: "manifest-0112",
    planned_partition_scope_refs: ["partition://vat/primary"],
    provider: "HMRC",
    provider_account_ref: overrides.provider_account_ref ?? "provider-account://vrn/999999999",
    source_class: overrides.source_class ?? "INSTITUTIONAL_FEED",
    tenant_id: "tenant-0112",
    ...(overrides.business_partition === undefined
      ? {}
      : { business_partition: overrides.business_partition }),
    ...(overrides.quarantined === undefined ? {} : { quarantined: overrides.quarantined }),
  });
}

test("source strength and freshness mapping is deterministic", () => {
  expect(resolveSourceStrengthTier("AUTHORITY_ACKNOWLEDGEMENT")).toBe("TIER_1_AUTHORITY_FINAL");
  expect(resolveSourceStrengthTier("INSTITUTIONAL_FEED")).toBe("TIER_3_STRUCTURED_EXTERNAL");
  expect(resolveSourceStrengthTier("DOCUMENTARY_EVIDENCE")).toBe("TIER_5_DOCUMENT_SUPPORT");
  expect(resolveSourceStrengthTier("DECLARED_ASSERTION")).toBe("TIER_6_DECLARED_ONLY");
  expect(resolveSourceStrengthTier("PROBABILISTIC_INFERENCE")).toBe("TIER_7_INFERRED");
  expect(resolveDefaultFreshnessState({ source_class: "PROBABILISTIC_INFERENCE" })).toBe("UNKNOWN");
  expect(
    resolveDefaultFreshnessState({
      fetch_result: fetchResult({ fetch_gap_code_or_null: "SCHEMA_DRIFT" }),
      source_class: "INSTITUTIONAL_FEED",
    }),
  ).toBe("STALE");
});

test("structured feed materialization preserves raw origin and evidence lineage", () => {
  const [sourceRecord] = sourceRecords();
  expect(sourceRecord).toBeDefined();
  expect(sourceRecord!.source_strength_tier).toBe("TIER_3_STRUCTURED_EXTERNAL");
  expect(sourceRecord!.capture_method).toBe("CONTROLLED_GATEWAY_FETCH");
  expect(sourceRecord!.business_partition).toBe("partition://vat/primary");
  expect(sourceRecord!.raw_payload_ref).toBe("raw://hmrc/vat/page-1");
  expect(sourceRecord!.raw_hash).toMatch(/^raw-hash:\/\//);
  expect(sourceRecord!.retention_tag.erasure_eligibility).toBe("BLOCKED_STATUTORY_MINIMUM");

  const [evidenceItem] = materializeEvidenceItems({
    additional_lineage_refs: ["audit://normalization/context-1"],
    evidence_extraction_available: true,
    expected_partition_scope_refs: ["partition://vat/primary"],
    source_records: [sourceRecord!],
  });
  expect(evidenceItem).toBeDefined();
  expect(evidenceItem!.evidence_kind).toBe("STRUCTURED_PROVIDER_PAYLOAD");
  expect(evidenceItem!.extraction_method).toBe("STRUCTURED_PAYLOAD_DIRECT");
  expect(evidenceItem!.extraction_confidence).toBe(1);
  expect(evidenceItem!.lineage_refs).toEqual([
    "audit://normalization/context-1",
    "raw://hmrc/vat/page-1",
    "source-collection-run://manifest-0112",
    sourceRecordRef(sourceRecord!),
  ]);
});

test("documentary evidence without extraction remains explicit weak evidence", () => {
  const [sourceRecord] = sourceRecords({ source_class: "DOCUMENTARY_EVIDENCE" });
  const [evidenceItem] = materializeEvidenceItems({
    evidence_extraction_available: false,
    source_records: [sourceRecord!],
  });

  expect(evidenceItem!.evidence_kind).toBe("EXTRACTION_REVIEW_REQUIRED");
  expect(evidenceItem!.extraction_method).toBe("NO_TEXT_EXTRACTION_RETAINED");
  expect(evidenceItem!.extraction_confidence).toBe(0);
  expect(evidenceItem!.source_strength_tier).toBe("TIER_5_DOCUMENT_SUPPORT");
  expect(evidenceItem!.lineage_refs).toContain(sourceRecordRef(sourceRecord!));
});

test("declared assertions and classification use closed internal vocabulary", () => {
  expect(classifyEvidenceKind({ source_class: "DECLARED_ASSERTION" })).toEqual({
    default_extraction_confidence: 0.8,
    evidence_kind: "DECLARED_ASSERTION_TEXT",
    extraction_method: "DECLARED_TEXT_DIRECT",
  });
  const [sourceRecord] = sourceRecords({ source_class: "DECLARED_ASSERTION" });
  const [evidenceItem] = materializeEvidenceItems({
    source_records: [sourceRecord!],
  });
  expect(evidenceItem!.evidence_kind).toBe("DECLARED_ASSERTION_TEXT");
  expect(evidenceItem!.extraction_method).toBe("DECLARED_TEXT_DIRECT");
});

test("identical raw payload refs from different provider accounts stay distinct", () => {
  const [first] = sourceRecords({
    provider_account_ref: "provider-account://vrn/111111111",
  });
  const [second] = sourceRecords({
    provider_account_ref: "provider-account://vrn/222222222",
  });

  expect(first!.raw_hash).toBe(second!.raw_hash);
  expect(first!.source_record_id).not.toBe(second!.source_record_id);
  expect(first!.provider_account_ref).not.toBe(second!.provider_account_ref);
});

test("quarantine posture cannot masquerade as normal evidence support", () => {
  const [sourceRecord] = sourceRecords({ quarantined: true });
  const [evidenceItem] = materializeEvidenceItems({
    evidence_extraction_available: true,
    source_records: [sourceRecord!],
  });

  expect(sourceRecord!.capture_method).toBe("QUARANTINED_GATEWAY_CAPTURE");
  expect(sourceRecord!.erasure_state).toBe("LIMITED");
  expect(sourceRecord!.retention_tag.limitation_behavior).toBe("SURVIVE_WITH_LIMITATION_NOTES");
  expect(evidenceItem!.evidence_kind).toBe("QUARANTINED_CONTENT");
  expect(evidenceItem!.extraction_method).toBe("QUARANTINE_BLOCKED_EXTRACTION");
  expect(evidenceItem!.extraction_confidence).toBe(0);
  expect(evidenceItem!.erasure_state).toBe("LIMITED");
});

test("source and evidence partition guards fail closed", () => {
  expect(() => sourceRecords({ business_partition: "partition://vat/other" })).toThrow(
    MaterializeSourceRecordsError,
  );

  const [sourceRecord] = sourceRecords();
  expect(() =>
    materializeEvidenceItems({
      expected_partition_scope_refs: ["partition://vat/other"],
      source_records: [sourceRecord!],
    }),
  ).toThrow(MaterializeEvidenceItemsError);
});

test("lineage refs are stable and de-duplicated", () => {
  const [sourceRecord] = sourceRecords();

  expect(
    buildEvidenceLineageRefs({
      additional_lineage_refs: [
        "audit://normalization/context-1",
        "audit://normalization/context-1",
      ],
      source_record: sourceRecord!,
    }),
  ).toEqual([
    "audit://normalization/context-1",
    "raw://hmrc/vat/page-1",
    "source-collection-run://manifest-0112",
    sourceRecordRef(sourceRecord!),
  ]);
});
