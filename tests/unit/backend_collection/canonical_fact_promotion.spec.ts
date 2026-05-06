import { expect, test } from "@playwright/test";

import {
  PartitionPromotionGuardError,
  SelectPromotionStateError,
  buildAdjustmentBinding,
  buildConflictSet,
  buildPromotionRecord,
  candidateFactRef,
  detectConflicts,
  detectCrossPartitionConflicts,
  extractCandidateFacts,
  freezeNormalizationContext,
  materializeEvidenceItems,
  materializeSourceRecords,
  promoteCanonicalFacts,
  selectPromotionState,
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

function normalizationContext(manifest_id = "manifest-0116") {
  return freezeNormalizationContext({
    connector_build_refs: ["connector-build://hmrc/0116"],
    evidence_rules_ref: "evidence-rules://2026-04",
    mapping_rules_ref: "mapping-rules://2026-04",
    manifest_id,
    normalization_rules_ref: "normalization-rules://2026-04",
    produced_at: "2026-04-27T13:00:00Z",
    promotion_rules_ref: "promotion-rules://2026-04",
  });
}

function sourceAndEvidence(input: {
  business_partition?: string;
  manifest_id?: string;
  raw_payload_ref: string;
  source_class?: SourceRecordRecord["source_class"];
}) {
  const manifestId = input.manifest_id ?? "manifest-0116";
  const partition = input.business_partition ?? "partition://vat/primary";
  const sources = materializeSourceRecords({
    business_partition: partition,
    captured_at: "2026-04-27T12:55:00Z",
    client_id: "client-0116",
    collection_boundary_ref: `collection-boundary://${manifestId}`,
    effective_period: "tax-year://2025-2026",
    fetch_result: fetchResult(input.raw_payload_ref),
    ingestion_run_ref: `source-collection-run://${manifestId}`,
    manifest_id: manifestId,
    planned_partition_scope_refs: [partition],
    provider: "HMRC",
    provider_account_ref: "provider-account://vrn/999999999",
    source_class: input.source_class ?? "INSTITUTIONAL_FEED",
    tenant_id: "tenant-0116",
  });
  const evidence = materializeEvidenceItems({
    evidence_extraction_available: true,
    expected_partition_scope_refs: [partition],
    source_records: sources,
  });
  return { evidence, sources };
}

function candidatesFor(input: {
  execution_mode?: "COMPLIANCE" | "ANALYSIS";
  manifest_id?: string;
  records: Array<{
    adjustment?: boolean;
    business_partition?: string;
    confidence?: number;
    raw_payload_ref: string;
    source_class?: SourceRecordRecord["source_class"];
    value_payload_ref: string;
  }>;
}) {
  const manifestId = input.manifest_id ?? "manifest-0116";
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
  return {
    candidates: extractCandidateFacts({
      ...(input.execution_mode === "ANALYSIS"
        ? {
            counterfactual_basis: "counterfactual://analysis/0116",
            execution_mode: "ANALYSIS" as const,
            non_compliance_config_refs: ["config://analysis/0116"],
          }
        : {}),
      evidence_items: groups.flatMap((group) => group.evidence),
      extraction_overrides: groups.map((group, index) => ({
        ...(input.records[index]!.adjustment
          ? {
              adjustment_binding: buildAdjustmentBinding({
                applicable_reporting_scopes: ["quarterly_update"],
                execution_mode: input.execution_mode ?? "COMPLIANCE",
                time_window_basis: "CURRENT_QUARTER_ONLY",
              }),
              fact_family: "ADJUSTMENT_FACT" as const,
            }
          : {}),
        ...(input.records[index]!.confidence === undefined
          ? {}
          : { confidence: input.records[index]!.confidence }),
        evidence_item_id: group.evidence[0]!.evidence_item_id,
        value_payload_ref: input.records[index]!.value_payload_ref,
      })),
      normalization_context: normalizationContext(manifestId),
      source_records: groups.flatMap((group) => group.sources),
    }),
    evidence: groups.flatMap((group) => group.evidence),
    sources: groups.flatMap((group) => group.sources),
  };
}

function clearConflictSet(candidates: readonly CandidateFactRecord[]) {
  return buildConflictSet({
    candidate_facts: candidates,
    conflict_detection_policy_ref: "conflict-policy://unit/0116",
    conflict_records: [],
    normalization_context_ref: candidates[0]!.normalization_context_ref,
    produced_at: "2026-04-27T13:05:00Z",
  });
}

function duplicateCandidate(candidate: CandidateFactRecord): CandidateFactRecord {
  return {
    ...candidate,
    candidate_fact_id: `${candidate.candidate_fact_id}.duplicate`,
    contract: {
      ...candidate.contract,
      artifact_id: `${candidate.contract.artifact_id}.duplicate`,
    },
  };
}

test("promotion state selection and promotion record are deterministic", () => {
  expect(
    selectPromotionState({
      blocking_conflict_count: 0,
      conflict_membership_refs: [],
      resolution_frontier: "CLEAR",
    }).promotion_state,
  ).toBe("CANONICAL");
  expect(
    selectPromotionState({
      blocking_conflict_count: 0,
      conflict_membership_refs: ["conflict://monitoring"],
      resolution_frontier: "MONITORING_ONLY",
    }).promotion_state,
  ).toBe("PROVISIONAL");
  expect(() =>
    selectPromotionState({
      blocking_conflict_count: 1,
      conflict_membership_refs: ["conflict://blocking"],
      policy: { contested_output_mode: "FAIL_CLOSED" },
      resolution_frontier: "BLOCKING_PRESENT",
    }),
  ).toThrow(SelectPromotionStateError);

  const first = buildPromotionRecord({
    blocking_conflict_ids_at_promotion: [],
    conflict_set_ref: "conflict-set://clear",
    promoted_at: "2026-04-27T13:10:00Z",
    promoted_from_candidate_fact_refs: ["candidate-fact://a"],
    promotion_rule_ref: "promotion-rules://2026-04",
    resolution_frontier_at_promotion: "CLEAR",
  });
  const second = buildPromotionRecord({
    blocking_conflict_ids_at_promotion: [],
    conflict_set_ref: "conflict-set://clear",
    promoted_at: "2026-04-27T13:10:00Z",
    promoted_from_candidate_fact_refs: ["candidate-fact://a"],
    promotion_rule_ref: "promotion-rules://2026-04",
    resolution_frontier_at_promotion: "CLEAR",
  });
  expect(first).toEqual(second);
});

test("clear frontier promotes a candidate to canonical with exact lineage", () => {
  const { candidates, evidence, sources } = candidatesFor({
    records: [
      {
        raw_payload_ref: "raw://hmrc/vat/clear",
        value_payload_ref: "candidate-value://vat/clear",
      },
    ],
  });
  const [canonical] = promoteCanonicalFacts({
    candidate_facts: candidates,
    conflict_set: clearConflictSet(candidates),
    evidence_items: evidence,
    promoted_at: "2026-04-27T13:10:00Z",
    source_records: sources,
  });

  expect(canonical!.promotion_state).toBe("CANONICAL");
  expect(canonical!.promotion_record.blocking_conflict_count_at_promotion).toBe(0);
  expect(canonical!.partition_scope_refs).toEqual([canonical!.partition_scope]);
  expect(canonical!.supporting_evidence_refs).toEqual(candidates[0]!.supporting_evidence_refs);
  expect(canonical!.promoted_from_candidate_fact_refs).toEqual([candidateFactRef(candidates[0]!)]);
  expect(canonical!.freshness_state).toBe("CURRENT");
});

test("monitoring-only promotion is provisional by default and canonical only by policy", () => {
  const { candidates, evidence, sources } = candidatesFor({
    records: [
      {
        confidence: 0.5,
        raw_payload_ref: "raw://hmrc/vat/monitoring",
        value_payload_ref: "candidate-value://vat/monitoring",
      },
    ],
  });
  const conflicts = detectConflicts({
    candidate_facts: candidates,
    conflict_detection_policy_ref: "conflict-policy://unit/0116",
  });
  const conflictSet = buildConflictSet({
    candidate_facts: candidates,
    conflict_detection_policy_ref: "conflict-policy://unit/0116",
    conflict_records: conflicts,
    normalization_context_ref: candidates[0]!.normalization_context_ref,
    produced_at: "2026-04-27T13:11:00Z",
  });

  const [provisional] = promoteCanonicalFacts({
    candidate_facts: candidates,
    conflict_set: conflictSet,
    evidence_items: evidence,
    promoted_at: "2026-04-27T13:12:00Z",
    source_records: sources,
  });
  const [canonical] = promoteCanonicalFacts({
    candidate_facts: candidates,
    conflict_set: conflictSet,
    evidence_items: evidence,
    promoted_at: "2026-04-27T13:12:00Z",
    promotion_policy: { monitoring_only_canonical_allowed: true },
    source_records: sources,
  });

  expect(provisional!.promotion_state).toBe("PROVISIONAL");
  expect(provisional!.conflict_membership_refs).toHaveLength(1);
  expect(canonical!.promotion_state).toBe("CANONICAL");
  expect(canonical!.promotion_record.resolution_frontier_at_promotion).toBe("MONITORING_ONLY");
});

test("blocking conflicts can emit contested posture or fail closed by policy", () => {
  const { candidates, evidence, sources } = candidatesFor({
    records: [
      {
        raw_payload_ref: "raw://hmrc/vat/blocking-a",
        source_class: "AUTHORITY_REFERENCE",
        value_payload_ref: "candidate-value://vat/blocking-a",
      },
      {
        raw_payload_ref: "raw://books/vat/blocking-b",
        source_class: "BOOKS_OF_ENTRY",
        value_payload_ref: "candidate-value://vat/blocking-b",
      },
    ],
  });
  const conflicts = detectConflicts({
    candidate_facts: candidates,
    conflict_detection_policy_ref: "conflict-policy://unit/0116",
    semantic_projections: [
      {
        amount_value: "100.00",
        candidate_fact_ref: candidateFactRef(candidates[0]!),
        logical_subject_ref: "subject://vat/blocking",
      },
      {
        amount_value: "120.00",
        candidate_fact_ref: candidateFactRef(candidates[1]!),
        logical_subject_ref: "subject://vat/blocking",
      },
    ],
  });
  const conflictSet = buildConflictSet({
    candidate_facts: candidates,
    conflict_detection_policy_ref: "conflict-policy://unit/0116",
    conflict_records: conflicts,
    normalization_context_ref: candidates[0]!.normalization_context_ref,
    produced_at: "2026-04-27T13:13:00Z",
  });

  const contested = promoteCanonicalFacts({
    candidate_facts: candidates,
    conflict_set: conflictSet,
    evidence_items: evidence,
    promoted_at: "2026-04-27T13:14:00Z",
    source_records: sources,
  });
  expect(contested.every((fact) => fact.promotion_state === "CONTESTED")).toBe(true);
  expect(contested.every((fact) => fact.conflict_membership_refs.length > 0)).toBe(true);
  expect(() =>
    promoteCanonicalFacts({
      candidate_facts: candidates,
      conflict_set: conflictSet,
      evidence_items: evidence,
      promoted_at: "2026-04-27T13:14:00Z",
      promotion_policy: { contested_output_mode: "FAIL_CLOSED" },
      source_records: sources,
    }),
  ).toThrow(SelectPromotionStateError);
});

test("duplicate logical candidates collapse without dropping lineage", () => {
  const { candidates, evidence, sources } = candidatesFor({
    records: [
      {
        raw_payload_ref: "raw://hmrc/vat/duplicate",
        value_payload_ref: "candidate-value://vat/duplicate",
      },
    ],
  });
  const duplicate = duplicateCandidate(candidates[0]!);
  const canonicalFacts = promoteCanonicalFacts({
    candidate_facts: [candidates[0]!, duplicate],
    conflict_set: clearConflictSet([candidates[0]!, duplicate]),
    evidence_items: evidence,
    promoted_at: "2026-04-27T13:15:00Z",
    source_records: sources,
  });

  expect(canonicalFacts).toHaveLength(1);
  expect(canonicalFacts[0]!.promoted_from_candidate_fact_refs.sort()).toEqual(
    [candidateFactRef(candidates[0]!), candidateFactRef(duplicate)].sort(),
  );
  expect(canonicalFacts[0]!.source_record_refs).toEqual(candidates[0]!.source_record_refs);
});

test("analysis adjustment posture is preserved and cross-partition grouping fails closed", () => {
  const adjustment = candidatesFor({
    execution_mode: "ANALYSIS",
    records: [
      {
        adjustment: true,
        raw_payload_ref: "raw://books/vat/adjustment",
        source_class: "BOOKS_OF_ENTRY",
        value_payload_ref: "candidate-value://adjustment/0116",
      },
    ],
  });
  const [canonicalAdjustment] = promoteCanonicalFacts({
    candidate_facts: adjustment.candidates,
    conflict_set: clearConflictSet(adjustment.candidates),
    evidence_items: adjustment.evidence,
    promoted_at: "2026-04-27T13:16:00Z",
    source_records: adjustment.sources,
  });
  expect(canonicalAdjustment!.execution_mode).toBe("ANALYSIS");
  expect(canonicalAdjustment!.analysis_only).toBe(true);
  expect(canonicalAdjustment!.counterfactual_basis).toBe("counterfactual://analysis/0116");
  expect(canonicalAdjustment!.adjustment_binding?.analysis_mode_treatment).toBe(
    "COUNTERFACTUAL_ONLY",
  );

  const cross = candidatesFor({
    records: [
      {
        business_partition: "partition://vat/primary",
        raw_payload_ref: "raw://hmrc/vat/cross-primary",
        value_payload_ref: "candidate-value://vat/cross",
      },
      {
        business_partition: "partition://vat/secondary",
        raw_payload_ref: "raw://hmrc/vat/cross-secondary",
        value_payload_ref: "candidate-value://vat/cross",
      },
    ],
  });
  const conflicts = detectCrossPartitionConflicts({
    candidate_facts: cross.candidates,
    conflict_detection_policy_ref: "conflict-policy://unit/0116",
  });
  const conflictSet = buildConflictSet({
    candidate_facts: cross.candidates,
    conflict_detection_policy_ref: "conflict-policy://unit/0116",
    conflict_records: conflicts,
    normalization_context_ref: cross.candidates[0]!.normalization_context_ref,
    produced_at: "2026-04-27T13:17:00Z",
  });
  expect(() =>
    promoteCanonicalFacts({
      candidate_facts: cross.candidates.map((candidate) => ({
        ...candidate,
        dedupe_key: cross.candidates[0]!.dedupe_key,
        partition_scope: cross.candidates[0]!.partition_scope,
        partition_scope_refs: cross.candidates[0]!.partition_scope_refs,
      })),
      conflict_set: conflictSet,
      evidence_items: cross.evidence,
      promoted_at: "2026-04-27T13:18:00Z",
      source_records: cross.sources,
    }),
  ).toThrow(PartitionPromotionGuardError);
});
