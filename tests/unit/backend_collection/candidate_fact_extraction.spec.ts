import { expect, test } from "@playwright/test";

import {
  AdjustmentBindingError,
  CandidatePartitionValidationError,
  ExtractCandidateFactsError,
  buildAdjustmentBinding,
  classifyFactFamily,
  deriveCandidateDedupeKey,
  deriveEvidenceLineageHash,
  deriveSourceRecordLineageHash,
  extractCandidateFacts,
  freezeNormalizationContext,
  materializeEvidenceItems,
  materializeSourceRecords,
  sourceRecordRef,
  validateCandidatePartitionScope,
  type EvidenceItemRecord,
  type FetchDispatchResult,
  type SourceRecordRecord,
} from "../../../packages/backend-collection/src/index.ts";

function fetchResult(raw_payload_ref = "raw://hmrc/vat/page-1"): FetchDispatchResult {
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
    raw_payload_refs: [{ page_index: 1, raw_payload_ref }],
    request_audit_refs: ["audit://request/vat"],
    revision_ref: "revision://vat/1",
    source_domain: "vat_obligations",
  };
}

function normalizationContext() {
  return freezeNormalizationContext({
    connector_build_refs: ["connector-build://hmrc/0114"],
    evidence_rules_ref: "evidence-rules://2026-04",
    mapping_rules_ref: "mapping-rules://2026-04",
    manifest_id: "manifest-0114",
    normalization_rules_ref: "normalization-rules://2026-04",
    produced_at: "2026-04-27T11:20:00Z",
    promotion_rules_ref: "promotion-rules://2026-04",
  });
}

function sourceAndEvidence(
  input: {
    business_partition?: string;
    raw_payload_ref?: string;
    source_class?: SourceRecordRecord["source_class"];
  } = {},
) {
  const partition = input.business_partition ?? "partition://vat/primary";
  const sources = materializeSourceRecords({
    business_partition: partition,
    captured_at: "2026-04-27T11:10:00Z",
    client_id: "client-0114",
    collection_boundary_ref: "collection-boundary://manifest-0114",
    effective_period: "tax-year://2025-2026",
    fetch_result: fetchResult(input.raw_payload_ref),
    ingestion_run_ref: "source-collection-run://manifest-0114",
    manifest_id: "manifest-0114",
    planned_partition_scope_refs: [partition],
    provider: "HMRC",
    provider_account_ref: "provider-account://vrn/999999999",
    source_class: input.source_class ?? "INSTITUTIONAL_FEED",
    tenant_id: "tenant-0114",
  });
  const evidence = materializeEvidenceItems({
    evidence_extraction_available: true,
    expected_partition_scope_refs: [partition],
    source_records: sources,
  });
  return { evidence, sources };
}

test("fact family classification and lineage hashes are deterministic", () => {
  expect(
    classifyFactFamily({
      evidence_kind: "STRUCTURED_PROVIDER_PAYLOAD",
      source_class: "AUTHORITY_REFERENCE",
    }),
  ).toMatchObject({ fact_family: "OBLIGATION_FACT" });
  expect(
    classifyFactFamily({
      evidence_kind: "DECLARED_ASSERTION_TEXT",
      source_class: "DECLARED_ASSERTION",
    }),
  ).toMatchObject({ fact_family: "PROFILE_FACT" });
  expect(deriveSourceRecordLineageHash(["source-record://b", "source-record://a"])).toBe(
    deriveSourceRecordLineageHash(["source-record://a", "source-record://b"]),
  );
  expect(deriveEvidenceLineageHash(["evidence-item://b", "evidence-item://a"])).toBe(
    deriveEvidenceLineageHash(["evidence-item://a", "evidence-item://b"]),
  );
});

test("compliance extraction emits schema-shaped exact-partition candidates", () => {
  const { evidence, sources } = sourceAndEvidence();
  const [candidate] = extractCandidateFacts({
    evidence_items: evidence,
    normalization_context: normalizationContext(),
    source_records: sources,
  });

  expect(candidate).toBeDefined();
  expect(candidate!.execution_mode).toBe("COMPLIANCE");
  expect(candidate!.analysis_only).toBe(false);
  expect(candidate!.counterfactual_basis).toBeNull();
  expect(candidate!.non_compliance_config_refs).toEqual([]);
  expect(candidate!.visibility_basis).toBe("UNMASKED_AUTHORITATIVE_ONLY");
  expect(candidate!.partition_scope).toBe("partition://vat/primary");
  expect(candidate!.partition_scope_refs).toEqual(["partition://vat/primary"]);
  expect(candidate!.source_record_refs).toEqual([sourceRecordRef(sources[0]!)]);
  expect(candidate!.supporting_evidence_refs).toHaveLength(1);
  expect(candidate!.promotion_readiness.readiness_state).toBe("CANDIDATE_ONLY");
});

test("duplicate logical candidates collapse through deterministic dedupe", () => {
  const first = sourceAndEvidence({ raw_payload_ref: "raw://hmrc/vat/page-1" });
  const second = sourceAndEvidence({ raw_payload_ref: "raw://hmrc/vat/page-2" });
  const valuePayloadRef = "candidate-value://normalized/vat-obligation/current";
  const candidates = extractCandidateFacts({
    evidence_items: [...first.evidence, ...second.evidence],
    extraction_overrides: [
      {
        evidence_item_id: first.evidence[0]!.evidence_item_id,
        value_payload_ref: valuePayloadRef,
      },
      {
        evidence_item_id: second.evidence[0]!.evidence_item_id,
        value_payload_ref: valuePayloadRef,
      },
    ],
    normalization_context: normalizationContext(),
    source_records: [...first.sources, ...second.sources],
  });

  expect(candidates).toHaveLength(1);
  expect(candidates[0]!.source_record_refs).toHaveLength(2);
  expect(candidates[0]!.supporting_evidence_refs).toHaveLength(2);
  expect(candidates[0]!.dedupe_key).toBe(
    deriveCandidateDedupeKey({
      adjustment_binding: null,
      collection_boundary_ref: "collection-boundary://manifest-0114",
      execution_mode: "COMPLIANCE",
      fact_family: "RECORD_FACT",
      manifest_id: "manifest-0114",
      normalization_context_ref: "normalization-context://normalization-context.manifest-0114",
      partition_scope: "partition://vat/primary",
      value_payload_ref: valuePayloadRef,
    }),
  );
});

test("adjustment and analysis-mode candidates keep explicit posture", () => {
  const { evidence, sources } = sourceAndEvidence({ source_class: "BOOKS_OF_ENTRY" });
  const adjustmentBinding = buildAdjustmentBinding({
    applicable_reporting_scopes: ["quarterly_update"],
    execution_mode: "ANALYSIS",
    time_window_basis: "CURRENT_QUARTER_ONLY",
  });
  const [candidate] = extractCandidateFacts({
    counterfactual_basis: "counterfactual://cash-basis-estimate",
    evidence_items: evidence,
    execution_mode: "ANALYSIS",
    extraction_overrides: [
      {
        adjustment_binding: adjustmentBinding,
        evidence_item_id: evidence[0]!.evidence_item_id,
        fact_family: "ADJUSTMENT_FACT",
        value_payload_ref: "candidate-value://adjustment/quarterly-cash-basis",
      },
    ],
    non_compliance_config_refs: ["config://analysis/cash-basis-estimate"],
    normalization_context: normalizationContext(),
    source_records: sources,
  });

  expect(candidate!.execution_mode).toBe("ANALYSIS");
  expect(candidate!.analysis_only).toBe(true);
  expect(candidate!.counterfactual_basis).toBe("counterfactual://cash-basis-estimate");
  expect(candidate!.fact_family).toBe("ADJUSTMENT_FACT");
  expect(candidate!.adjustment_binding).toMatchObject({
    analysis_mode_treatment: "COUNTERFACTUAL_ONLY",
    partition_application: "EXACT_PARTITION_ONLY",
    quarterly_basis_profile: "PERIODIC",
  });
});

test("support-free, masked, and scope-widened candidates fail closed", () => {
  const { evidence, sources } = sourceAndEvidence();
  expect(() =>
    extractCandidateFacts({
      evidence_items: [
        {
          ...evidence[0]!,
          source_record_id: "source-record.missing",
        },
      ],
      normalization_context: normalizationContext(),
      source_records: sources,
    }),
  ).toThrow(ExtractCandidateFactsError);

  expect(() =>
    extractCandidateFacts({
      counterfactual_basis: "counterfactual://not-allowed",
      evidence_items: evidence,
      normalization_context: normalizationContext(),
      source_records: sources,
    }),
  ).toThrow(ExtractCandidateFactsError);

  const other = sourceAndEvidence({
    business_partition: "partition://vat/secondary",
    raw_payload_ref: "raw://hmrc/vat/secondary",
  });
  expect(() =>
    validateCandidatePartitionScope({
      evidence_items: [...evidence, ...other.evidence] as EvidenceItemRecord[],
      source_records: [...sources, ...other.sources],
    }),
  ).toThrow(CandidatePartitionValidationError);

  expect(() =>
    buildAdjustmentBinding({
      execution_mode: "COMPLIANCE",
      time_window_basis: "EXPLICIT_WINDOW",
    }),
  ).toThrow(AdjustmentBindingError);
});
