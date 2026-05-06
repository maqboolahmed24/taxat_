import { expect, test } from "@playwright/test";

import {
  buildConflictRecord,
  buildConflictSet,
  candidateFactRef,
  detectConflicts,
  detectCrossPartitionConflicts,
  extractCandidateFacts,
  freezeNormalizationContext,
  materializeEvidenceItems,
  materializeSourceRecords,
  projectConflictFrontier,
  rebindCandidateConflictMembership,
  type CandidateFactRecord,
  type FetchDispatchResult,
  type SourceRecordRecord,
} from "../../../packages/backend-collection/src/index.ts";

function fetchResult(raw_payload_ref: string): FetchDispatchResult {
  return {
    cursor_checkpoint_ref: "cursor://vat/checkpoint-1",
    empty_response_confirmed: false,
    fetch_audit_refs: ["audit://fetch/vat"],
    fetch_gap_code_or_null: null,
    fetch_posture: "FETCHED",
    observed_provider_schema_version: "schema://hmrc/vat/v1",
    outcome_code: "SOURCE_FETCHED",
    page_audit_refs: [`audit://fetch/vat/${raw_payload_ref}`],
    provider_api_version: "mtd-vat-v1",
    provider_environment_ref: "provider-env://hmrc/sandbox",
    raw_payload_refs: [{ page_index: 1, raw_payload_ref }],
    request_audit_refs: ["audit://request/vat"],
    revision_ref: "revision://vat/1",
    source_domain: "vat_obligations",
  };
}

function normalizationContext(manifest_id = "manifest-0115") {
  return freezeNormalizationContext({
    connector_build_refs: ["connector-build://hmrc/0115"],
    evidence_rules_ref: "evidence-rules://2026-04",
    mapping_rules_ref: "mapping-rules://2026-04",
    manifest_id,
    normalization_rules_ref: "normalization-rules://2026-04",
    produced_at: "2026-04-27T12:20:00Z",
    promotion_rules_ref: "promotion-rules://2026-04",
  });
}

function sourceAndEvidence(input: {
  business_partition?: string;
  manifest_id?: string;
  raw_payload_ref: string;
  source_class?: SourceRecordRecord["source_class"];
}) {
  const manifestId = input.manifest_id ?? "manifest-0115";
  const partition = input.business_partition ?? "partition://vat/primary";
  const sources = materializeSourceRecords({
    business_partition: partition,
    captured_at: "2026-04-27T12:10:00Z",
    client_id: "client-0115",
    collection_boundary_ref: `collection-boundary://${manifestId}`,
    effective_period: "tax-year://2025-2026",
    fetch_result: fetchResult(input.raw_payload_ref),
    ingestion_run_ref: `source-collection-run://${manifestId}`,
    manifest_id: manifestId,
    planned_partition_scope_refs: [partition],
    provider: "HMRC",
    provider_account_ref: "provider-account://vrn/999999999",
    source_class: input.source_class ?? "INSTITUTIONAL_FEED",
    tenant_id: "tenant-0115",
  });
  const evidence = materializeEvidenceItems({
    evidence_extraction_available: true,
    expected_partition_scope_refs: [partition],
    source_records: sources,
  });
  return { evidence, sources };
}

function candidatesFor(input: {
  manifest_id?: string;
  records: Array<{
    business_partition?: string;
    confidence?: number;
    raw_payload_ref: string;
    source_class?: SourceRecordRecord["source_class"];
    value_payload_ref: string;
  }>;
}) {
  const manifestId = input.manifest_id ?? "manifest-0115";
  const groups = input.records.map((record) =>
    sourceAndEvidence({
      manifest_id: manifestId,
      raw_payload_ref: record.raw_payload_ref,
      ...(record.business_partition === undefined
        ? {}
        : { business_partition: record.business_partition }),
      ...(record.source_class === undefined ? {} : { source_class: record.source_class }),
    }),
  );
  return extractCandidateFacts({
    evidence_items: groups.flatMap((group) => group.evidence),
    extraction_overrides: groups.map((group, index) => ({
      evidence_item_id: group.evidence[0]!.evidence_item_id,
      ...(input.records[index]!.confidence === undefined
        ? {}
        : { confidence: input.records[index]!.confidence }),
      value_payload_ref: input.records[index]!.value_payload_ref,
    })),
    normalization_context: normalizationContext(manifestId),
    source_records: groups.flatMap((group) => group.sources),
  });
}

function duplicateCandidate(candidate: CandidateFactRecord, suffix: string): CandidateFactRecord {
  return {
    ...candidate,
    candidate_fact_id: `${candidate.candidate_fact_id}.${suffix}`,
    contract: {
      ...candidate.contract,
      artifact_id: `${candidate.contract.artifact_id}.${suffix}`,
    },
  };
}

test("same-partition detector emits duplicate, monitoring, and decisive blocking conflicts", () => {
  const amountCandidates = candidatesFor({
    records: [
      {
        confidence: 0.95,
        raw_payload_ref: "raw://hmrc/vat/primary-a",
        source_class: "AUTHORITY_REFERENCE",
        value_payload_ref: "candidate-value://vat/turnover/100",
      },
      {
        confidence: 0.42,
        raw_payload_ref: "raw://books/vat/primary-b",
        source_class: "BOOKS_OF_ENTRY",
        value_payload_ref: "candidate-value://vat/turnover/120",
      },
    ],
  });
  const first = amountCandidates.find(
    (candidate) => candidate.value_payload_ref === "candidate-value://vat/turnover/100",
  )!;
  const second = amountCandidates.find(
    (candidate) => candidate.value_payload_ref === "candidate-value://vat/turnover/120",
  )!;
  const duplicate = duplicateCandidate(first!, "duplicate");
  const conflicts = detectConflicts({
    candidate_facts: [first!, second!, duplicate],
    conflict_detection_policy_ref: "conflict-policy://unit/0115",
    semantic_projections: [
      {
        amount_value: "100.00",
        candidate_fact_ref: candidateFactRef(first!),
        logical_subject_ref: "subject://vat/turnover/current",
      },
      {
        amount_value: "120.00",
        candidate_fact_ref: candidateFactRef(second!),
        logical_subject_ref: "subject://vat/turnover/current",
      },
      {
        amount_value: "100.00",
        candidate_fact_ref: candidateFactRef(duplicate),
        logical_subject_ref: "subject://vat/turnover/current",
      },
    ],
  });

  expect(conflicts.map((conflict) => conflict.conflict_type).sort()).toEqual([
    "AMOUNT_MISMATCH",
    "DUPLICATE_CANDIDATE",
    "LOW_CONFIDENCE_EXTRACTION",
  ]);
  const amount = conflicts.find((conflict) => conflict.conflict_type === "AMOUNT_MISMATCH")!;
  expect(amount.blocking_class).toBe("BLOCKS_FILING");
  expect(amount.contradiction_class).toBe("DECISIVE_CONTRADICTION");
  expect(amount.decisive_target_refs.length).toBeGreaterThan(0);
  const frontier = projectConflictFrontier(conflicts);
  expect(frontier.resolution_frontier).toBe("BLOCKING_PRESENT");
  expect(frontier.blocking_conflict_count).toBe(1);
});

test("frontier projection and candidate rebinding mirror monitoring versus blocking posture", () => {
  const monitoringCandidates = candidatesFor({
    records: [
      {
        confidence: 0.5,
        raw_payload_ref: "raw://books/vat/monitoring",
        value_payload_ref: "candidate-value://vat/monitoring",
      },
      {
        raw_payload_ref: "raw://books/vat/clean",
        value_payload_ref: "candidate-value://vat/clean",
      },
    ],
  });
  const first = monitoringCandidates.find((candidate) => candidate.confidence < 0.75)!;
  const second = monitoringCandidates.find((candidate) => candidate.confidence >= 0.75)!;
  const monitoringConflicts = detectConflicts({
    candidate_facts: [first!, second!],
    conflict_detection_policy_ref: "conflict-policy://unit/0115",
  });
  const monitoringSet = buildConflictSet({
    candidate_facts: [first!, second!],
    conflict_detection_policy_ref: "conflict-policy://unit/0115",
    conflict_records: monitoringConflicts,
    normalization_context_ref: first!.normalization_context_ref,
    produced_at: "2026-04-27T12:30:00Z",
  });
  expect(monitoringSet.resolution_frontier).toBe("MONITORING_ONLY");
  expect(monitoringSet.blocking_conflict_ids).toEqual([]);

  const [reboundMonitoring] = rebindCandidateConflictMembership({
    candidate_facts: [first!],
    conflict_set: monitoringSet,
  });
  expect(reboundMonitoring!.promotion_readiness.readiness_state).toBe("PROVISIONAL_ALLOWED");
  expect(reboundMonitoring!.promotion_state).toBe("PROVISIONAL");

  const blockingConflicts = detectConflicts({
    candidate_facts: [first!, second!],
    conflict_detection_policy_ref: "conflict-policy://unit/0115",
    semantic_projections: [
      {
        amount_value: "50.00",
        candidate_fact_ref: candidateFactRef(first!),
        logical_subject_ref: "subject://vat/blocking",
      },
      {
        amount_value: "60.00",
        candidate_fact_ref: candidateFactRef(second!),
        logical_subject_ref: "subject://vat/blocking",
      },
    ],
  });
  const blockingSet = buildConflictSet({
    candidate_facts: [first!, second!],
    conflict_detection_policy_ref: "conflict-policy://unit/0115",
    conflict_records: blockingConflicts,
    normalization_context_ref: first!.normalization_context_ref,
    produced_at: "2026-04-27T12:31:00Z",
  });
  const reboundBlocking = rebindCandidateConflictMembership({
    candidate_facts: [first!, second!],
    conflict_set: blockingSet,
  });
  expect(blockingSet.resolution_frontier).toBe("BLOCKING_PRESENT");
  expect(reboundBlocking.every((candidate) => candidate.promotion_state === "CONTESTED")).toBe(
    true,
  );
});

test("cross-partition contamination becomes conflict posture without widening facts", () => {
  const crossPartitionCandidates = candidatesFor({
    records: [
      {
        business_partition: "partition://vat/primary",
        raw_payload_ref: "raw://hmrc/vat/shared",
        value_payload_ref: "candidate-value://vat/shared-obligation",
      },
      {
        business_partition: "partition://vat/secondary",
        raw_payload_ref: "raw://hmrc/vat/shared",
        value_payload_ref: "candidate-value://vat/shared-obligation",
      },
    ],
  });
  const primary = crossPartitionCandidates.find(
    (candidate) => candidate.partition_scope === "partition://vat/primary",
  )!;
  const secondary = crossPartitionCandidates.find(
    (candidate) => candidate.partition_scope === "partition://vat/secondary",
  )!;
  const conflicts = detectCrossPartitionConflicts({
    candidate_facts: [primary!, secondary!],
    conflict_detection_policy_ref: "conflict-policy://unit/0115",
  });

  expect(conflicts).toHaveLength(1);
  expect(conflicts[0]!.conflict_type).toBe("BUSINESS_PARTITION_CONFLICT");
  expect(conflicts[0]!.blocking_class).toBe("BLOCKS_RUN");
  expect(primary!.partition_scope).toBe("partition://vat/primary");
  expect(primary!.partition_scope_refs).toEqual(["partition://vat/primary"]);
  expect(secondary!.partition_scope).toBe("partition://vat/secondary");
  expect(secondary!.partition_scope_refs).toEqual(["partition://vat/secondary"]);
});

test("schema-invalid conflict records fail closed before persistence", () => {
  expect(() =>
    buildConflictRecord({
      conflict_detection_policy_ref: "conflict-policy://unit/0115",
      draft: {
        artifact_type: "ConflictRecord",
        authority_position_refs: [],
        blocking_class: "NON_BLOCKING",
        conflict_type: "LOW_CONFIDENCE_EXTRACTION",
        contradiction_class: "SOFT_CONTRADICTION",
        decisive_target_refs: [],
        evidence_refs: [],
        involved_fact_refs: ["candidate-fact://single"],
        manifest_id: "manifest-0115",
        reason_codes: ["ONE_REF_ONLY"],
        resolution_state: "OPEN",
        severity: "WARNING",
        supersedes_conflict_id: null,
      },
    }),
  ).toThrow();

  expect(() =>
    buildConflictRecord({
      conflict_detection_policy_ref: "conflict-policy://unit/0115",
      draft: {
        artifact_type: "ConflictRecord",
        authority_position_refs: [],
        blocking_class: "NON_BLOCKING",
        conflict_type: "LOW_CONFIDENCE_EXTRACTION",
        contradiction_class: "SOFT_CONTRADICTION",
        decisive_target_refs: [],
        evidence_refs: [],
        involved_fact_refs: ["candidate-fact://a", "evidence-item://a"],
        manifest_id: "manifest-0115",
        reason_codes: [],
        resolution_state: "OPEN",
        severity: "WARNING",
        supersedes_conflict_id: null,
      },
    }),
  ).toThrow();
});
