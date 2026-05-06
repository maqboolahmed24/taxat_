import { execFile } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

import { expect, test } from "@playwright/test";

import {
  InputFreezeRepository,
  LateDataFindingRepository,
  LateDataIndicatorSetRepository,
  LateDataMonitorResultRepository,
  buildCollectionBoundary,
  buildConflictSet,
  buildSourcePlan,
  buildSourceWindow,
  classifyCollectionLateData,
  collectionBoundaryRef,
  extractCandidateFacts,
  freezeInputSet,
  freezeNormalizationContext,
  inputFreezeRef,
  materializeEvidenceItems,
  materializeSourceRecords,
  promoteCanonicalFacts,
  type FetchDispatchResult,
  type SourcePlanPlannedSourceRecord,
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
    cursor_checkpoint_ref: "cursor://vat_obligations/checkpoint-1",
    empty_response_confirmed: false,
    fetch_audit_refs: ["audit://fetch/vat_obligations"],
    fetch_gap_code_or_null: null,
    fetch_posture: "FETCHED",
    observed_provider_schema_version: "schema://vat_obligations/v1",
    outcome_code: "SOURCE_FETCHED",
    page_audit_refs: ["audit://fetch/vat_obligations/page-1"],
    provider_api_version: "mtd-v1",
    provider_environment_ref: "provider-env://hmrc/sandbox",
    raw_payload_refs: [{ page_index: 1, raw_payload_ref: rawPayloadRef }],
    request_audit_refs: ["audit://request/vat_obligations"],
    revision_ref: "revision://vat_obligations/1",
    source_domain: "vat_obligations",
  };
}

function normalizationContext(manifestId: string) {
  return freezeNormalizationContext({
    connector_build_refs: ["connector-build://hmrc/0117"],
    evidence_rules_ref: "evidence-rules://2026-04",
    manifest_id: manifestId,
    mapping_rules_ref: "mapping-rules://2026-04",
    normalization_rules_ref: "normalization-rules://2026-04",
    produced_at: "2026-04-27T13:55:00Z",
    promotion_rules_ref: "promotion-rules://2026-04",
  });
}

function artifactContractRefs() {
  return [
    "artifact-contract://source-plan",
    "artifact-contract://source-window",
    "artifact-contract://collection-boundary",
    "artifact-contract://normalization-context",
    "artifact-contract://source-record-set",
    "artifact-contract://evidence-item-set",
    "artifact-contract://candidate-fact-set",
    "artifact-contract://conflict-set",
    "artifact-contract://canonical-fact-set",
    "artifact-contract://snapshot",
  ];
}

function buildFixture() {
  const manifestId = "manifest-0117-integration";
  const plan = buildSourcePlan({
    manifest_id: manifestId,
    planned_sources: [plannedSource()],
    required_domains: ["vat_obligations"],
  });
  const window = buildSourceWindow({
    collection_completed_at: "2026-04-27T13:50:00Z",
    collection_started_at: "2026-04-27T13:00:00Z",
    read_cutoff_at: "2026-04-27T14:00:00Z",
    source_plan: plan,
  });
  const boundary = buildCollectionBoundary({
    collection_boundary_id: `collection-boundary.${manifestId}`,
    connector_build_id: "connector-build://hmrc/0117",
    connector_profile_ref: "connector-profile://hmrc/mtd",
    source_boundaries: [
      {
        boundary_disposition: "IN_SCOPE_COLLECTED",
        completeness_expectation_ref: "completeness://vat_obligations",
        cursor_checkpoint_ref: "cursor://vat_obligations/checkpoint-1",
        late_data_policy_ref: "REVIEW_IF_LATE",
        page_request_audit_refs: ["audit://fetch/vat_obligations/page-1"],
        partition_scope_refs: ["partition://vat/main"],
        provider_api_version: "mtd-v1",
        provider_environment_ref: "provider-env://hmrc/sandbox",
        provider_schema_version: "schema://vat_obligations/v1",
        request_audit_refs: ["audit://request/vat_obligations"],
        revision_ref: "revision://vat_obligations/1",
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
    captured_at: "2026-04-27T13:45:00Z",
    client_id: "client-0117",
    collection_boundary_ref: collectionBoundaryRef(boundary),
    effective_period: "tax-year://2025-2026",
    fetch_result: fetchResult("raw://hmrc/vat/integration"),
    ingestion_run_ref: "source-collection-run://0117-integration",
    manifest_id: manifestId,
    planned_partition_scope_refs: ["partition://vat/main"],
    provider: "HMRC",
    provider_account_ref: "provider-account://vrn/999999999",
    source_class: "INSTITUTIONAL_FEED",
    tenant_id: "tenant-0117",
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
        value_payload_ref: "candidate-value://vat/integration",
      },
    ],
    normalization_context: context,
    source_records: sources,
  });
  const conflictSet = buildConflictSet({
    candidate_facts: candidates,
    conflict_detection_policy_ref: "conflict-policy://integration/0117",
    conflict_records: [],
    normalization_context_ref: context.normalization_context_id.startsWith("normalization-context.")
      ? `normalization-context://${context.normalization_context_id}`
      : context.normalization_context_id,
    produced_at: "2026-04-27T13:57:00Z",
  });
  const canonical = promoteCanonicalFacts({
    candidate_facts: candidates,
    conflict_set: conflictSet,
    evidence_items: evidence,
    promoted_at: "2026-04-27T13:58:00Z",
    source_records: sources,
  });
  return { boundary, canonical, candidates, conflictSet, context, evidence, plan, sources, window };
}

test("input freeze repository persists schema-valid frozen intake", async () => {
  const fixture = buildFixture();
  const repository = new InputFreezeRepository();
  const inputFreeze = await freezeInputSet({
    artifact_contract_hash: "artifact-contract-hash://integration/0117",
    artifact_contract_refs: artifactContractRefs(),
    candidate_facts: fixture.candidates,
    canonical_facts: fixture.canonical,
    collection_boundary: fixture.boundary,
    conflict_set: fixture.conflictSet,
    evidence_items: fixture.evidence,
    input_policy_ref: "input-policy://integration/0117",
    normalization_context: fixture.context,
    persisted_at: "2026-04-27T14:01:00Z",
    repository,
    runtime_scope_refs: ["prepare_submission"],
    source_plan: fixture.plan,
    source_records: fixture.sources,
    source_window: fixture.window,
  });
  const stored = await repository.requireInputFreezeById(inputFreeze.input_freeze_id);

  await validatePayloadAgainstSchema("input_freeze.schema.json", stored.input_freeze);
  await expect(repository.getInputFreezeByRef(inputFreezeRef(inputFreeze))).resolves.toEqual(
    stored,
  );
  expect(stored.input_freeze.source_domain_postures[0]!.source_record_count).toBe(1);
});

test("late-data repositories persist no-late and review-required schema-valid monitor lineage", async () => {
  const fixture = buildFixture();
  const inputFreeze = await freezeInputSet({
    artifact_contract_hash: "artifact-contract-hash://integration/0117-monitor",
    artifact_contract_refs: artifactContractRefs(),
    candidate_facts: fixture.candidates,
    canonical_facts: fixture.canonical,
    collection_boundary: fixture.boundary,
    conflict_set: fixture.conflictSet,
    evidence_items: fixture.evidence,
    input_policy_ref: "input-policy://integration/0117",
    normalization_context: fixture.context,
    runtime_scope_refs: ["prepare_submission"],
    source_plan: fixture.plan,
    source_records: fixture.sources,
    source_window: fixture.window,
  });
  const indicatorSets = new LateDataIndicatorSetRepository();
  const findings = new LateDataFindingRepository();
  const monitors = new LateDataMonitorResultRepository();

  const noLate = await classifyCollectionLateData({
    classified_at: "2026-04-27T14:05:00Z",
    collection_boundary: fixture.boundary,
    execution_basis_hash: "execution-basis-hash://integration/no-late",
    finding_repository: findings,
    indicator_set_repository: indicatorSets,
    input_freeze_ref: inputFreezeRef(inputFreeze),
    manifest_hash: "manifest-hash://integration/no-late",
    monitor_result_repository: monitors,
    persisted_at: "2026-04-27T14:05:01Z",
    runtime_scope_refs: ["prepare_submission"],
    source_window_ref: `source-window://${fixture.window.source_window_id}`,
  });
  await validatePayloadAgainstSchema("late_data_indicator_set.schema.json", noLate.indicator_set);
  await validatePayloadAgainstSchema("late_data_monitor_result.schema.json", noLate.monitor_result);

  const review = await classifyCollectionLateData({
    classified_at: "2026-04-27T14:06:00Z",
    collection_boundary: fixture.boundary,
    execution_basis_hash: "execution-basis-hash://integration/review",
    finding_repository: findings,
    indicator_set_repository: indicatorSets,
    input_freeze_ref: inputFreezeRef(inputFreeze),
    manifest_hash: "manifest-hash://integration/review",
    monitor_result_repository: monitors,
    observations: [
      {
        discovered_at: "2026-04-27T14:06:00Z",
        drift_signal: "POST_CUTOFF_RECORD_OBSERVED",
        partition_scope_refs: ["partition://vat/main"],
        request_audit_ref: "audit://request/vat_obligations/post-cutoff",
        runtime_scope_refs: ["prepare_submission"],
        source_class: "INSTITUTIONAL_FEED",
        source_domain: "vat_obligations",
        source_record_ref: "source-record://late-vat-integration",
        t_effective_or_null: "2026-04-27T13:35:00Z",
        t_visible_or_null: "2026-04-27T14:03:00Z",
      },
    ],
    persisted_at: "2026-04-27T14:06:01Z",
    runtime_scope_refs: ["prepare_submission"],
    source_window_ref: `source-window://${fixture.window.source_window_id}`,
  });

  await validatePayloadAgainstSchema("late_data_indicator_set.schema.json", review.indicator_set);
  await validatePayloadAgainstSchema("late_data_finding.schema.json", review.findings[0]);
  await validatePayloadAgainstSchema("late_data_monitor_result.schema.json", review.monitor_result);
  await expect(
    monitors.listLateDataMonitorResultsByManifestId(fixture.boundary.manifest_id),
  ).resolves.toHaveLength(2);
});
