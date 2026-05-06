import { execFile } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

import { expect, test } from "@playwright/test";

import {
  CandidateFactRepository,
  ConflictRecordRepository,
  ConflictSetRepository,
  buildConflictSet,
  candidateFactRef,
  conflictSetRef,
  detectConflicts,
  detectCrossPartitionConflicts,
  extractCandidateFacts,
  freezeNormalizationContext,
  materializeEvidenceItems,
  materializeSourceRecords,
  rebindCandidateConflictMembership,
  type FetchDispatchResult,
  type SourceRecordRecord,
} from "../../../packages/backend-collection/src/index.ts";

const execFileAsync = promisify(execFile);
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..");

async function validatePayloadAgainstSchema(schemaName: string, payload: unknown) {
  const script = `
import json
import pathlib
import sys

repo = pathlib.Path(sys.argv[1])
sys.path.insert(0, str(repo / "packages" / "contracts-core" / "python"))
from validate_contracts import Draft202012Validator, build_registry, load_json  # type: ignore

schema_name = sys.argv[2]
payload = json.loads(sys.argv[3])
schema = load_json(repo / "packages" / "contracts-core" / "schemas" / schema_name)
validator = Draft202012Validator(
    schema,
    registry=build_registry(),
    format_checker=Draft202012Validator.FORMAT_CHECKER,
)
issues = [
    f"{'/'.join(map(str, error.absolute_path)) or '<root>'}: {error.message}"
    for error in sorted(validator.iter_errors(payload), key=lambda error: list(error.absolute_path))
]
if issues:
    raise SystemExit("\\n".join(issues))
`;

  await execFileAsync(path.join(repoRoot, ".venv", "bin", "python3"), [
    "-c",
    script,
    repoRoot,
    schemaName,
    JSON.stringify(payload),
  ]);
}

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

function normalizationContext(manifest_id = "manifest-0115-persistence") {
  return freezeNormalizationContext({
    connector_build_refs: ["connector-build://hmrc/0115"],
    evidence_rules_ref: "evidence-rules://2026-04",
    mapping_rules_ref: "mapping-rules://2026-04",
    manifest_id,
    normalization_rules_ref: "normalization-rules://2026-04",
    produced_at: "2026-04-27T12:40:00Z",
    promotion_rules_ref: "promotion-rules://2026-04",
  });
}

function sourceAndEvidence(input: {
  business_partition?: string;
  manifest_id?: string;
  raw_payload_ref: string;
  source_class?: SourceRecordRecord["source_class"];
}) {
  const manifestId = input.manifest_id ?? "manifest-0115-persistence";
  const partition = input.business_partition ?? "partition://vat/primary";
  const sources = materializeSourceRecords({
    business_partition: partition,
    captured_at: "2026-04-27T12:35:00Z",
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
    raw_payload_ref: string;
    source_class?: SourceRecordRecord["source_class"];
    value_payload_ref: string;
  }>;
}) {
  const manifestId = input.manifest_id ?? "manifest-0115-persistence";
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
      value_payload_ref: input.records[index]!.value_payload_ref,
    })),
    normalization_context: normalizationContext(manifestId),
    source_records: groups.flatMap((group) => group.sources),
  });
}

test("conflict repositories persist schema-valid blocking frontier and rebound candidates", async () => {
  const [first, second] = candidatesFor({
    records: [
      {
        raw_payload_ref: "raw://hmrc/vat/persist-a",
        source_class: "AUTHORITY_REFERENCE",
        value_payload_ref: "candidate-value://vat/turnover/100",
      },
      {
        raw_payload_ref: "raw://books/vat/persist-b",
        source_class: "BOOKS_OF_ENTRY",
        value_payload_ref: "candidate-value://vat/turnover/120",
      },
    ],
  });
  const conflictRecords = detectConflicts({
    candidate_facts: [first!, second!],
    conflict_detection_policy_ref: "conflict-policy://integration/0115",
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
    ],
  });
  const conflictSet = buildConflictSet({
    candidate_facts: [first!, second!],
    conflict_detection_policy_ref: "conflict-policy://integration/0115",
    conflict_records: conflictRecords,
    normalization_context_ref: first!.normalization_context_ref,
    produced_at: "2026-04-27T12:45:00Z",
  });

  const recordRepository = new ConflictRecordRepository();
  const setRepository = new ConflictSetRepository();
  for (const conflictRecord of conflictRecords) {
    const stored = await recordRepository.persistConflictRecord({
      conflict_record: conflictRecord,
      persisted_at: "2026-04-27T12:46:00Z",
    });
    await validatePayloadAgainstSchema("conflict_record.schema.json", stored.conflict_record);
  }
  const storedSet = await setRepository.persistConflictSet({
    conflict_set: conflictSet,
    persisted_at: "2026-04-27T12:47:00Z",
  });
  await validatePayloadAgainstSchema("conflict_set.schema.json", storedSet.conflict_set);
  await expect(setRepository.getConflictSetByRef(conflictSetRef(conflictSet))).resolves.toEqual(
    storedSet,
  );
  expect(storedSet.conflict_set.resolution_frontier).toBe("BLOCKING_PRESENT");
  expect(storedSet.conflict_set.blocking_conflict_ids).toEqual(
    conflictRecords.map((record) => record.conflict_id),
  );

  const candidateRepository = new CandidateFactRepository();
  const rebound = rebindCandidateConflictMembership({
    candidate_facts: [first!, second!],
    conflict_set: storedSet.conflict_set,
  });
  for (const candidate of rebound) {
    const storedCandidate = await candidateRepository.persistCandidateFact({
      candidate_fact: candidate,
      persisted_at: "2026-04-27T12:48:00Z",
    });
    await validatePayloadAgainstSchema(
      "candidate_fact.schema.json",
      storedCandidate.candidate_fact,
    );
    expect(storedCandidate.candidate_fact.promotion_state).toBe("CONTESTED");
    expect(storedCandidate.candidate_fact.promotion_readiness.conflict_set_ref).toBe(
      conflictSetRef(conflictSet),
    );
  }
});

test("conflict set persistence is idempotent and cross-partition posture stays explicit", async () => {
  const crossPartitionCandidates = candidatesFor({
    manifest_id: "manifest-0115-cross",
    records: [
      {
        business_partition: "partition://vat/primary",
        raw_payload_ref: "raw://hmrc/vat/cross-primary",
        value_payload_ref: "candidate-value://vat/shared-obligation",
      },
      {
        business_partition: "partition://vat/secondary",
        raw_payload_ref: "raw://hmrc/vat/cross-secondary",
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
    conflict_detection_policy_ref: "conflict-policy://integration/0115-cross",
  });
  const conflictSet = buildConflictSet({
    candidate_facts: [primary!, secondary!],
    conflict_detection_policy_ref: "conflict-policy://integration/0115-cross",
    conflict_records: conflicts,
    normalization_context_ref: primary!.normalization_context_ref,
    produced_at: "2026-04-27T12:50:00Z",
  });
  const repository = new ConflictSetRepository();
  const stored = await repository.persistConflictSet({
    conflict_set: conflictSet,
    persisted_at: "2026-04-27T12:51:00Z",
  });

  await expect(
    repository.persistConflictSet({
      conflict_set: conflictSet,
      persisted_at: "2026-04-27T12:52:00Z",
    }),
  ).resolves.toEqual(stored);
  await validatePayloadAgainstSchema("conflict_set.schema.json", stored.conflict_set);
  expect(stored.conflict_set.business_partition_refs).toEqual([
    "partition://vat/primary",
    "partition://vat/secondary",
  ]);
  expect(primary!.partition_scope_refs).toEqual(["partition://vat/primary"]);
  expect(secondary!.partition_scope_refs).toEqual(["partition://vat/secondary"]);
});
