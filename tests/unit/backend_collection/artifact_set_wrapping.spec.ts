import { expect, test } from "@playwright/test";

import {
  ArtifactSetBuildError,
  buildCandidateFactSet,
  buildCanonicalFactSet,
  buildConflictSet,
  buildEvidenceItemSet,
  buildSourceRecordSet,
  candidateFactRef,
  deriveUnresolvedConflictHash,
  detectConflicts,
  extractCandidateFacts,
  freezeNormalizationContext,
  materializeEvidenceItems,
  materializeSourceRecords,
  promoteCanonicalFacts,
  recordArtifactContractRef,
  recordArtifactContractRefs,
  type CandidateFactRecord,
  type FetchDispatchResult,
  type NormalizationContextRecord,
  type SourceRecordRecord,
} from "../../../packages/backend-collection/src/index.ts";

const manifestId = "manifest-0119-unit";
const producedAt = "2026-04-27T15:00:00Z";

function fetchResult(rawPayloadRef: string): FetchDispatchResult {
  return {
    cursor_checkpoint_ref: "cursor://vat/checkpoint-0119",
    empty_response_confirmed: false,
    fetch_audit_refs: ["audit://fetch/vat/0119"],
    fetch_gap_code_or_null: null,
    fetch_posture: "FETCHED",
    observed_provider_schema_version: "schema://hmrc/vat/v1",
    outcome_code: "SOURCE_FETCHED",
    page_audit_refs: [`audit://fetch/vat/${rawPayloadRef}`],
    provider_api_version: "mtd-vat-v1",
    provider_environment_ref: "provider-env://hmrc/sandbox",
    raw_payload_refs: [{ page_index: 1, raw_payload_ref: rawPayloadRef }],
    request_audit_refs: ["audit://request/vat/0119"],
    revision_ref: "revision://vat/0119",
    source_domain: "vat_obligations",
  };
}

function normalizationContext() {
  return freezeNormalizationContext({
    connector_build_refs: ["connector-build://hmrc/0119"],
    evidence_rules_ref: "evidence-rules://2026-04",
    manifest_id: manifestId,
    mapping_rules_ref: "mapping-rules://2026-04",
    normalization_rules_ref: "normalization-rules://2026-04",
    produced_at: "2026-04-27T14:50:00Z",
    promotion_rules_ref: "promotion-rules://2026-04",
  });
}

function contextRef(context: NormalizationContextRecord) {
  return context.normalization_context_id.startsWith("normalization-context.")
    ? `normalization-context://${context.normalization_context_id}`
    : context.normalization_context_id;
}

function sourceAndEvidence(rawPayloadRef: string) {
  const sources = materializeSourceRecords({
    business_partition: "partition://vat/main",
    captured_at: "2026-04-27T14:40:00Z",
    client_id: "client-0119",
    collection_boundary_ref: "collection-boundary://manifest-0119-unit",
    effective_period: "tax-year://2025-2026",
    fetch_result: fetchResult(rawPayloadRef),
    ingestion_run_ref: "source-collection-run://manifest-0119-unit",
    manifest_id: manifestId,
    planned_partition_scope_refs: ["partition://vat/main"],
    provider: "HMRC",
    provider_account_ref: "provider-account://vrn/999999999",
    source_class: "INSTITUTIONAL_FEED",
    tenant_id: "tenant-0119",
  });
  const evidence = materializeEvidenceItems({
    evidence_extraction_available: true,
    expected_partition_scope_refs: ["partition://vat/main"],
    source_records: sources,
  });
  return { evidence, sources };
}

function fixture() {
  const context = normalizationContext();
  const first = sourceAndEvidence("raw://hmrc/vat/0119-a");
  const second = sourceAndEvidence("raw://hmrc/vat/0119-b");
  const sources = [...first.sources, ...second.sources];
  const evidence = [...first.evidence, ...second.evidence];
  const candidates = extractCandidateFacts({
    evidence_items: evidence,
    extraction_overrides: [
      {
        confidence: 0.96,
        evidence_item_id: evidence[0]!.evidence_item_id,
        value_payload_ref: "candidate-value://vat/0119/a",
      },
      {
        confidence: 0.94,
        evidence_item_id: evidence[1]!.evidence_item_id,
        value_payload_ref: "candidate-value://vat/0119/b",
      },
    ],
    normalization_context: context,
    source_records: sources,
  });
  const clearConflictSet = buildConflictSet({
    candidate_facts: candidates,
    conflict_detection_policy_ref: "conflict-policy://unit/0119",
    conflict_records: [],
    normalization_context_ref: contextRef(context),
    produced_at: "2026-04-27T14:58:00Z",
  });
  const canonical = promoteCanonicalFacts({
    candidate_facts: candidates,
    conflict_set: clearConflictSet,
    evidence_items: evidence,
    promoted_at: "2026-04-27T14:59:00Z",
    source_records: sources,
  });

  return { canonical, candidates, clearConflictSet, context, evidence, sources };
}

function monitoringConflicts(candidates: readonly CandidateFactRecord[]) {
  return detectConflicts({
    candidate_facts: candidates,
    conflict_detection_policy_ref: "conflict-policy://unit/0119",
    low_confidence_threshold: 0.99,
  });
}

function blockingConflicts(candidates: readonly CandidateFactRecord[]) {
  return detectConflicts({
    candidate_facts: candidates,
    conflict_detection_policy_ref: "conflict-policy://unit/0119",
    semantic_projections: [
      {
        amount_value: "100.00",
        candidate_fact_ref: candidateFactRef(candidates[0]!),
        logical_subject_ref: "subject://vat/turnover/current",
      },
      {
        amount_value: "120.00",
        candidate_fact_ref: candidateFactRef(candidates[1]!),
        logical_subject_ref: "subject://vat/turnover/current",
      },
    ],
  });
}

test("all intake set builders are insertion-order stable and collapse identical duplicates", () => {
  const data = fixture();
  const sourceSet = buildSourceRecordSet({
    manifest_id: manifestId,
    produced_at: producedAt,
    source_records: [data.sources[1]!, data.sources[0]!, data.sources[0]!],
  });
  const sourceSetReplay = buildSourceRecordSet({
    manifest_id: manifestId,
    produced_at: producedAt,
    source_records: data.sources,
  });
  expect(sourceSet.items.map((item) => item.source_record_id)).toEqual(
    sourceSetReplay.items.map((item) => item.source_record_id),
  );
  expect(sourceSet.set_hash).toBe(sourceSetReplay.set_hash);
  expect(sourceSet.items).toHaveLength(2);

  const evidenceSet = buildEvidenceItemSet({
    evidence_items: [data.evidence[1]!, data.evidence[0]!, data.evidence[0]!],
    manifest_id: manifestId,
    produced_at: producedAt,
  });
  const evidenceSetReplay = buildEvidenceItemSet({
    evidence_items: data.evidence,
    manifest_id: manifestId,
    produced_at: producedAt,
  });
  expect(evidenceSet.set_hash).toBe(evidenceSetReplay.set_hash);
  expect(evidenceSet.items).toHaveLength(2);

  const candidateSet = buildCandidateFactSet({
    candidate_facts: [data.candidates[1]!, data.candidates[0]!, data.candidates[0]!],
    manifest_id: manifestId,
    produced_at: producedAt,
  });
  const candidateSetReplay = buildCandidateFactSet({
    candidate_facts: data.candidates,
    manifest_id: manifestId,
    produced_at: producedAt,
  });
  expect(candidateSet.set_hash).toBe(candidateSetReplay.set_hash);
  expect(candidateSet.items).toHaveLength(2);

  const canonicalSet = buildCanonicalFactSet({
    canonical_facts: [data.canonical[1]!, data.canonical[0]!, data.canonical[0]!],
    manifest_id: manifestId,
    produced_at: producedAt,
  });
  const canonicalSetReplay = buildCanonicalFactSet({
    canonical_facts: data.canonical,
    manifest_id: manifestId,
    produced_at: producedAt,
  });
  expect(canonicalSet.set_hash).toBe(canonicalSetReplay.set_hash);
  expect(canonicalSet.items).toHaveLength(2);

  const conflicts = monitoringConflicts(data.candidates);
  const conflictSet = buildConflictSet({
    candidate_facts: data.candidates,
    conflict_detection_policy_ref: "conflict-policy://unit/0119",
    conflict_records: [conflicts[1]!, conflicts[0]!, conflicts[0]!],
    normalization_context_ref: contextRef(data.context),
    produced_at: producedAt,
  });
  const conflictSetReplay = buildConflictSet({
    candidate_facts: data.candidates,
    conflict_detection_policy_ref: "conflict-policy://unit/0119",
    conflict_records: conflicts,
    normalization_context_ref: contextRef(data.context),
    produced_at: producedAt,
  });
  expect(conflictSet.set_hash).toBe(conflictSetReplay.set_hash);
  expect(conflictSet.items).toHaveLength(conflicts.length);
});

test("duplicate identities with different payloads fail before wrapping", () => {
  const data = fixture();
  const mutated: SourceRecordRecord = {
    ...data.sources[0]!,
    raw_payload_ref: "raw://hmrc/vat/0119-mutated",
  };

  expect(() =>
    buildSourceRecordSet({
      manifest_id: manifestId,
      produced_at: producedAt,
      source_records: [data.sources[0]!, mutated],
    }),
  ).toThrow(ArtifactSetBuildError);
});

test("conflict set frontier invariants are derived from unresolved conflicts", () => {
  const data = fixture();
  expect(data.clearConflictSet.resolution_frontier).toBe("CLEAR");
  expect(data.clearConflictSet.open_conflict_count).toBe(0);
  expect(data.clearConflictSet.blocking_conflict_count).toBe(0);
  expect(data.clearConflictSet.dominant_blocking_class).toBeNull();

  const monitoringSet = buildConflictSet({
    candidate_facts: data.candidates,
    conflict_detection_policy_ref: "conflict-policy://unit/0119",
    conflict_records: monitoringConflicts(data.candidates),
    normalization_context_ref: contextRef(data.context),
    produced_at: producedAt,
  });
  expect(monitoringSet.resolution_frontier).toBe("MONITORING_ONLY");
  expect(monitoringSet.open_conflict_count).toBeGreaterThan(0);
  expect(monitoringSet.blocking_conflict_count).toBe(0);
  expect(monitoringSet.dominant_blocking_class).toBeNull();

  const blockingSet = buildConflictSet({
    candidate_facts: data.candidates,
    conflict_detection_policy_ref: "conflict-policy://unit/0119",
    conflict_records: blockingConflicts(data.candidates),
    normalization_context_ref: contextRef(data.context),
    produced_at: producedAt,
  });
  expect(blockingSet.resolution_frontier).toBe("BLOCKING_PRESENT");
  expect(blockingSet.open_conflict_count).toBeGreaterThan(0);
  expect(blockingSet.blocking_conflict_count).toBeGreaterThan(0);
  expect(blockingSet.dominant_blocking_class).not.toBeNull();
  expect(blockingSet.unresolved_conflict_hash).toBe(
    deriveUnresolvedConflictHash({
      blocking_conflict_ids: blockingSet.blocking_conflict_ids,
      dominant_blocking_class: blockingSet.dominant_blocking_class,
      open_conflict_ids: blockingSet.open_conflict_ids,
      resolution_frontier: blockingSet.resolution_frontier,
    }),
  );
  expect(blockingSet.unresolved_conflict_hash).not.toBe(
    data.clearConflictSet.unresolved_conflict_hash,
  );
});

test("artifact contract refs are canonical and aggregate hashes track ref and content changes", () => {
  const data = fixture();
  const sourceSet = buildSourceRecordSet({
    manifest_id: manifestId,
    produced_at: producedAt,
    source_records: data.sources,
  });
  const evidenceSet = buildEvidenceItemSet({
    evidence_items: data.evidence,
    manifest_id: manifestId,
    produced_at: producedAt,
  });
  const candidateSet = buildCandidateFactSet({
    candidate_facts: data.candidates,
    manifest_id: manifestId,
    produced_at: producedAt,
  });
  const canonicalSet = buildCanonicalFactSet({
    canonical_facts: data.canonical,
    manifest_id: manifestId,
    produced_at: producedAt,
  });
  const contracts = [
    sourceSet.contract,
    evidenceSet.contract,
    candidateSet.contract,
    data.clearConflictSet.contract,
    canonicalSet.contract,
  ];
  const recorded = recordArtifactContractRefs({ contracts });
  const replay = recordArtifactContractRefs({ contracts: [...contracts].reverse() });

  expect(recorded).toEqual(replay);
  expect(recordArtifactContractRef({ contract: sourceSet.contract }).artifact_contract_hash).toBe(
    sourceSet.artifact_contract_hash,
  );
  expect(recorded.artifact_contract_refs).toEqual([...recorded.artifact_contract_refs].sort());
  expect(recorded.artifact_contract_refs[0]).toMatch(/^artifact-contract:\/\//);

  const changedContract = {
    ...sourceSet.contract,
    artifact_content_hash: `${sourceSet.contract.artifact_content_hash}.changed`,
  };
  const changed = recordArtifactContractRefs({
    contracts: [changedContract, ...contracts.slice(1)],
  });
  expect(changed.artifact_contract_hash).not.toBe(recorded.artifact_contract_hash);
  expect(changed.artifact_contract_refs).not.toEqual(recorded.artifact_contract_refs);
});
