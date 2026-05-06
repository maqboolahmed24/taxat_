import { execFile } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

import { expect, test } from "@playwright/test";

import {
  CandidateFactRepository,
  buildAdjustmentBinding,
  candidateFactRef,
  extractCandidateFacts,
  freezeNormalizationContext,
  materializeEvidenceItems,
  materializeSourceRecords,
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
    manifest_id: "manifest-0114-persistence",
    normalization_rules_ref: "normalization-rules://2026-04",
    produced_at: "2026-04-27T11:20:00Z",
    promotion_rules_ref: "promotion-rules://2026-04",
  });
}

function sourceAndEvidence(
  input: { raw_payload_ref?: string; source_class?: SourceRecordRecord["source_class"] } = {},
) {
  const sources = materializeSourceRecords({
    business_partition: "partition://vat/primary",
    captured_at: "2026-04-27T11:10:00Z",
    client_id: "client-0114",
    collection_boundary_ref: "collection-boundary://manifest-0114-persistence",
    effective_period: "tax-year://2025-2026",
    fetch_result: fetchResult(input.raw_payload_ref),
    ingestion_run_ref: "source-collection-run://manifest-0114-persistence",
    manifest_id: "manifest-0114-persistence",
    planned_partition_scope_refs: ["partition://vat/primary"],
    provider: "HMRC",
    provider_account_ref: "provider-account://vrn/999999999",
    source_class: input.source_class ?? "INSTITUTIONAL_FEED",
    tenant_id: "tenant-0114",
  });
  const evidence = materializeEvidenceItems({
    evidence_extraction_available: true,
    expected_partition_scope_refs: ["partition://vat/primary"],
    source_records: sources,
  });
  return { evidence, sources };
}

test("candidate repository persists and reloads schema-valid compliance candidates", async () => {
  const repository = new CandidateFactRepository();
  const { evidence, sources } = sourceAndEvidence();
  const [candidate] = extractCandidateFacts({
    evidence_items: evidence,
    normalization_context: normalizationContext(),
    source_records: sources,
  });
  const stored = await repository.persistCandidateFact({
    candidate_fact: candidate!,
    persisted_at: "2026-04-27T11:21:00Z",
  });

  await validatePayloadAgainstSchema("candidate_fact.schema.json", stored.candidate_fact);
  expect(await repository.getCandidateFactByRef(candidateFactRef(candidate!))).toEqual(stored);
  await expect(
    repository.listCandidateFactsByPartition(
      "manifest-0114-persistence",
      "partition://vat/primary",
    ),
  ).resolves.toEqual([stored]);
  await expect(
    repository.listCandidateFactsByFactFamily("manifest-0114-persistence", "RECORD_FACT"),
  ).resolves.toHaveLength(1);
});

test("candidate persistence is idempotent and rejects semantic dedupe collisions", async () => {
  const repository = new CandidateFactRepository();
  const first = sourceAndEvidence({ raw_payload_ref: "raw://hmrc/vat/page-1" });
  const second = sourceAndEvidence({ raw_payload_ref: "raw://hmrc/vat/page-2" });
  const candidates = extractCandidateFacts({
    evidence_items: [...first.evidence, ...second.evidence],
    extraction_overrides: [
      {
        evidence_item_id: first.evidence[0]!.evidence_item_id,
        value_payload_ref: "candidate-value://normalized/vat-obligation/current",
      },
      {
        evidence_item_id: second.evidence[0]!.evidence_item_id,
        value_payload_ref: "candidate-value://normalized/vat-obligation/current",
      },
    ],
    normalization_context: normalizationContext(),
    source_records: [...first.sources, ...second.sources],
  });
  const stored = await repository.persistCandidateFact({
    candidate_fact: candidates[0]!,
    persisted_at: "2026-04-27T11:21:00Z",
  });

  await expect(
    repository.persistCandidateFact({
      candidate_fact: candidates[0]!,
      persisted_at: "2026-04-27T11:22:00Z",
    }),
  ).resolves.toEqual(stored);
  await expect(
    repository.persistCandidateFact({
      candidate_fact: {
        ...candidates[0]!,
        candidate_fact_id: `${candidates[0]!.candidate_fact_id}.collision`,
      },
      persisted_at: "2026-04-27T11:23:00Z",
    }),
  ).rejects.toThrow();
});

test("analysis adjustment candidates remain schema-valid but analysis-only", async () => {
  const repository = new CandidateFactRepository();
  const { evidence, sources } = sourceAndEvidence({ source_class: "BOOKS_OF_ENTRY" });
  const [candidate] = extractCandidateFacts({
    counterfactual_basis: "counterfactual://quarterly-estimate",
    evidence_items: evidence,
    execution_mode: "ANALYSIS",
    extraction_overrides: [
      {
        adjustment_binding: buildAdjustmentBinding({
          applicable_reporting_scopes: ["quarterly_update"],
          execution_mode: "ANALYSIS",
          time_window_basis: "CURRENT_QUARTER_ONLY",
        }),
        evidence_item_id: evidence[0]!.evidence_item_id,
        fact_family: "ADJUSTMENT_FACT",
        value_payload_ref: "candidate-value://adjustment/quarterly-estimate",
      },
    ],
    non_compliance_config_refs: ["config://analysis/quarterly-estimate"],
    normalization_context: normalizationContext(),
    source_records: sources,
  });
  const stored = await repository.persistCandidateFact({
    candidate_fact: candidate!,
    persisted_at: "2026-04-27T11:24:00Z",
  });

  await validatePayloadAgainstSchema("candidate_fact.schema.json", stored.candidate_fact);
  expect(stored.candidate_fact.execution_mode).toBe("ANALYSIS");
  expect(stored.candidate_fact.analysis_only).toBe(true);
  expect(stored.candidate_fact.adjustment_binding).not.toBeNull();
});
