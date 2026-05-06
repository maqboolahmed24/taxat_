import { execFile } from "node:child_process";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

import { expect, test } from "@playwright/test";

import {
  InputFreezeRepository,
  buildCandidateFactSet,
  buildCanonicalFactSet,
  buildCollectionBoundary,
  buildConflictSet,
  buildEvidenceItemSet,
  buildSourcePlan,
  buildSourceRecordSet,
  buildSourceWindow,
  collectionBoundaryRef,
  extractCandidateFacts,
  freezeInputSet,
  freezeNormalizationContext,
  inputFreezeRef,
  materializeEvidenceItems,
  materializeSourceRecords,
  promoteCanonicalFacts,
  recordArtifactContractRefs,
  type FetchDispatchResult,
  type NormalizationContextRecord,
  type SourcePlanPlannedSourceRecord,
} from "../../../packages/backend-collection/src/index.ts";

const execFileAsync = promisify(execFile);
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const migrationPath = path.join(
  repoRoot,
  "db",
  "migrations",
  "phase03_0119_intake_artifact_sets.sql",
);

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

function plannedSource(): SourcePlanPlannedSourceRecord {
  return {
    completeness_expectation_ref: "completeness://vat_obligations",
    cursor_strategy_ref: "cursor-strategy://vat_obligations",
    freshness_slo_ref: "freshness-slo://vat_obligations",
    late_data_policy_ref: "REVIEW_IF_LATE",
    partition_scope_refs: ["partition://vat/main"],
    provider_binding_ref: "provider-binding://vat_obligations",
    query_basis_ref: "query-basis://vat_obligations",
    read_model: "AS_OF",
    required_schema_refs: ["schema://vat_obligations/v1"],
    required_source_class_refs: [],
    source_class: "INSTITUTIONAL_FEED",
    source_domain: "vat_obligations",
  };
}

function fetchResult(rawPayloadRef: string): FetchDispatchResult {
  return {
    cursor_checkpoint_ref: "cursor://vat_obligations/checkpoint-0119",
    empty_response_confirmed: false,
    fetch_audit_refs: ["audit://fetch/vat_obligations/0119"],
    fetch_gap_code_or_null: null,
    fetch_posture: "FETCHED",
    observed_provider_schema_version: "schema://vat_obligations/v1",
    outcome_code: "SOURCE_FETCHED",
    page_audit_refs: ["audit://fetch/vat_obligations/page-0119"],
    provider_api_version: "mtd-v1",
    provider_environment_ref: "provider-env://hmrc/sandbox",
    raw_payload_refs: [{ page_index: 1, raw_payload_ref: rawPayloadRef }],
    request_audit_refs: ["audit://request/vat_obligations/0119"],
    revision_ref: "revision://vat_obligations/0119",
    source_domain: "vat_obligations",
  };
}

function contextRef(context: NormalizationContextRecord) {
  return context.normalization_context_id.startsWith("normalization-context.")
    ? `normalization-context://${context.normalization_context_id}`
    : context.normalization_context_id;
}

function normalizationContext(manifestId: string) {
  return freezeNormalizationContext({
    connector_build_refs: ["connector-build://hmrc/0119"],
    evidence_rules_ref: "evidence-rules://2026-04",
    manifest_id: manifestId,
    mapping_rules_ref: "mapping-rules://2026-04",
    normalization_rules_ref: "normalization-rules://2026-04",
    produced_at: "2026-04-27T17:55:00Z",
    promotion_rules_ref: "promotion-rules://2026-04",
  });
}

function buildFixture() {
  const manifestId = "manifest-0119-integration";
  const plan = buildSourcePlan({
    manifest_id: manifestId,
    planned_sources: [plannedSource()],
    required_domains: ["vat_obligations"],
  });
  const window = buildSourceWindow({
    collection_completed_at: "2026-04-27T17:50:00Z",
    collection_started_at: "2026-04-27T17:00:00Z",
    read_cutoff_at: "2026-04-27T18:00:00Z",
    source_plan: plan,
  });
  const boundary = buildCollectionBoundary({
    collection_boundary_id: `collection-boundary.${manifestId}`,
    connector_build_id: "connector-build://hmrc/0119",
    connector_profile_ref: "connector-profile://hmrc/mtd",
    source_boundaries: [
      {
        boundary_disposition: "IN_SCOPE_COLLECTED",
        completeness_expectation_ref: "completeness://vat_obligations",
        cursor_checkpoint_ref: "cursor://vat_obligations/checkpoint-0119",
        late_data_policy_ref: "REVIEW_IF_LATE",
        page_request_audit_refs: ["audit://fetch/vat_obligations/page-0119"],
        partition_scope_refs: ["partition://vat/main"],
        provider_api_version: "mtd-v1",
        provider_environment_ref: "provider-env://hmrc/sandbox",
        provider_schema_version: "schema://vat_obligations/v1",
        request_audit_refs: ["audit://request/vat_obligations/0119"],
        revision_ref: "revision://vat_obligations/0119",
        runtime_scope_refs: ["prepare_submission"],
        source_class: "INSTITUTIONAL_FEED",
        source_domain: "vat_obligations",
      },
    ],
    source_plan: plan,
    source_window: window,
  });
  const sources = materializeSourceRecords({
    business_partition: "partition://vat/main",
    captured_at: "2026-04-27T17:45:00Z",
    client_id: "client-0119",
    collection_boundary_ref: collectionBoundaryRef(boundary),
    effective_period: "tax-year://2025-2026",
    fetch_result: fetchResult("raw://hmrc/vat/0119-integration"),
    ingestion_run_ref: "source-collection-run://0119-integration",
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
  const context = normalizationContext(manifestId);
  const candidates = extractCandidateFacts({
    evidence_items: evidence,
    extraction_overrides: [
      {
        evidence_item_id: evidence[0]!.evidence_item_id,
        value_payload_ref: "candidate-value://vat/0119-integration",
      },
    ],
    normalization_context: context,
    source_records: sources,
  });
  const conflictSet = buildConflictSet({
    candidate_facts: candidates,
    conflict_detection_policy_ref: "conflict-policy://integration/0119",
    conflict_records: [],
    normalization_context_ref: contextRef(context),
    produced_at: "2026-04-27T17:57:00Z",
  });
  const canonical = promoteCanonicalFacts({
    candidate_facts: candidates,
    conflict_set: conflictSet,
    evidence_items: evidence,
    promoted_at: "2026-04-27T17:58:00Z",
    source_records: sources,
  });
  const sourceRecordSet = buildSourceRecordSet({
    manifest_id: manifestId,
    produced_at: "2026-04-27T17:59:00Z",
    source_records: sources,
  });
  const evidenceItemSet = buildEvidenceItemSet({
    evidence_items: evidence,
    manifest_id: manifestId,
    produced_at: "2026-04-27T17:59:00Z",
  });
  const candidateFactSet = buildCandidateFactSet({
    candidate_facts: candidates,
    manifest_id: manifestId,
    produced_at: "2026-04-27T17:59:00Z",
  });
  const canonicalFactSet = buildCanonicalFactSet({
    canonical_facts: canonical,
    manifest_id: manifestId,
    produced_at: "2026-04-27T17:59:00Z",
  });

  return {
    boundary,
    candidateFactSet,
    candidates,
    canonical,
    canonicalFactSet,
    conflictSet,
    context,
    evidence,
    evidenceItemSet,
    manifestId,
    plan,
    sourceRecordSet,
    sources,
    window,
  };
}

test("migration defines intake artifact set and contract-ref registers", async () => {
  const sql = await readFile(migrationPath, "utf8");

  expect(sql).toContain(
    "CREATE TABLE IF NOT EXISTS control_collection.intake_artifact_set_register",
  );
  expect(sql).toContain(
    "CREATE TABLE IF NOT EXISTS control_collection.intake_artifact_contract_ref_register",
  );
  expect(sql).toContain(
    "CREATE TABLE IF NOT EXISTS control_collection.intake_artifact_contract_pack_register",
  );
  expect(sql).toContain("intake_artifact_set_contract_hash_idx");
  expect(sql).toContain("intake_artifact_contract_ref_schema_bundle_idx");
  expect(sql).toContain("ENABLE ROW LEVEL SECURITY");
});

test("set artifacts validate and recorded contract refs freeze a schema-valid intake pack", async () => {
  const fixture = buildFixture();

  await validatePayloadAgainstSchema("source_record_set.schema.json", fixture.sourceRecordSet);
  await validatePayloadAgainstSchema("evidence_item_set.schema.json", fixture.evidenceItemSet);
  await validatePayloadAgainstSchema("candidate_fact_set.schema.json", fixture.candidateFactSet);
  await validatePayloadAgainstSchema("conflict_set.schema.json", fixture.conflictSet);
  await validatePayloadAgainstSchema("canonical_fact_set.schema.json", fixture.canonicalFactSet);

  const contracts = [
    fixture.plan.contract,
    fixture.window.contract,
    fixture.boundary.contract,
    fixture.context.contract,
    fixture.sourceRecordSet.contract,
    fixture.evidenceItemSet.contract,
    fixture.candidateFactSet.contract,
    fixture.conflictSet.contract,
    fixture.canonicalFactSet.contract,
    ...fixture.sources.map((record) => record.contract),
    ...fixture.evidence.map((record) => record.contract),
    ...fixture.candidates.map((record) => record.contract),
    ...fixture.canonical.map((record) => record.contract),
  ];
  const recorded = recordArtifactContractRefs({ contracts });
  const replay = recordArtifactContractRefs({ contracts: [...contracts].reverse() });
  const changed = recordArtifactContractRefs({
    contracts: [
      {
        ...fixture.sourceRecordSet.contract,
        artifact_content_hash: `${fixture.sourceRecordSet.contract.artifact_content_hash}.changed`,
      },
      ...contracts.slice(1),
    ],
  });

  expect(recorded.artifact_contract_refs.length).toBeGreaterThanOrEqual(10);
  expect(recorded).toEqual(replay);
  expect(changed.artifact_contract_hash).not.toBe(recorded.artifact_contract_hash);
  const sourceRecordSetRefPattern =
    /^artifact-contract:\/\/SourceRecordSet\?artifact_id=.*&schema_id=.*&schema_bundle_hash=.*&artifact_content_hash=.*&artifact_contract_hash=.*/;
  expect(recorded.artifact_contract_refs.some((ref) => sourceRecordSetRefPattern.test(ref))).toBe(
    true,
  );

  const repository = new InputFreezeRepository();
  const inputFreeze = await freezeInputSet({
    artifact_contract_hash: recorded.artifact_contract_hash,
    artifact_contract_refs: recorded.artifact_contract_refs,
    candidate_facts: fixture.candidates,
    canonical_facts: fixture.canonical,
    collection_boundary: fixture.boundary,
    conflict_set: fixture.conflictSet,
    evidence_items: fixture.evidence,
    input_policy_ref: "input-policy://integration/0119",
    normalization_context: fixture.context,
    persisted_at: "2026-04-27T18:01:00Z",
    repository,
    runtime_scope_refs: ["prepare_submission"],
    source_plan: fixture.plan,
    source_records: fixture.sources,
    source_window: fixture.window,
  });
  const stored = await repository.requireInputFreezeById(inputFreeze.input_freeze_id);

  await validatePayloadAgainstSchema("input_freeze.schema.json", stored.input_freeze);
  expect(stored.input_freeze.artifact_contract_hash).toBe(recorded.artifact_contract_hash);
  await expect(repository.getInputFreezeByRef(inputFreezeRef(inputFreeze))).resolves.toEqual(
    stored,
  );
});
