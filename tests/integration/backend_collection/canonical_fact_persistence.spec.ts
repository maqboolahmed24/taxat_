import { execFile } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

import { expect, test } from "@playwright/test";

import {
  CanonicalFactRepository,
  buildAdjustmentBinding,
  buildConflictSet,
  candidateFactRef,
  canonicalFactRef,
  detectConflicts,
  extractCandidateFacts,
  freezeNormalizationContext,
  materializeEvidenceItems,
  materializeSourceRecords,
  promoteCanonicalFacts,
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

function normalizationContext(manifest_id = "manifest-0116-persistence") {
  return freezeNormalizationContext({
    connector_build_refs: ["connector-build://hmrc/0116"],
    evidence_rules_ref: "evidence-rules://2026-04",
    mapping_rules_ref: "mapping-rules://2026-04",
    manifest_id,
    normalization_rules_ref: "normalization-rules://2026-04",
    produced_at: "2026-04-27T13:30:00Z",
    promotion_rules_ref: "promotion-rules://2026-04",
  });
}

function sourceAndEvidence(input: {
  manifest_id?: string;
  raw_payload_ref: string;
  source_class?: SourceRecordRecord["source_class"];
}) {
  const manifestId = input.manifest_id ?? "manifest-0116-persistence";
  const sources = materializeSourceRecords({
    business_partition: "partition://vat/primary",
    captured_at: "2026-04-27T13:25:00Z",
    client_id: "client-0116",
    collection_boundary_ref: `collection-boundary://${manifestId}`,
    effective_period: "tax-year://2025-2026",
    fetch_result: fetchResult(input.raw_payload_ref),
    ingestion_run_ref: `source-collection-run://${manifestId}`,
    manifest_id: manifestId,
    planned_partition_scope_refs: ["partition://vat/primary"],
    provider: "HMRC",
    provider_account_ref: "provider-account://vrn/999999999",
    source_class: input.source_class ?? "INSTITUTIONAL_FEED",
    tenant_id: "tenant-0116",
  });
  const evidence = materializeEvidenceItems({
    evidence_extraction_available: true,
    expected_partition_scope_refs: ["partition://vat/primary"],
    source_records: sources,
  });
  return { evidence, sources };
}

function candidatesFor(input: {
  execution_mode?: "COMPLIANCE" | "ANALYSIS";
  manifest_id?: string;
  records: Array<{
    adjustment?: boolean;
    confidence?: number;
    raw_payload_ref: string;
    source_class?: SourceRecordRecord["source_class"];
    value_payload_ref: string;
  }>;
}) {
  const manifestId = input.manifest_id ?? "manifest-0116-persistence";
  const groups = input.records.map((record) =>
    sourceAndEvidence({
      manifest_id: manifestId,
      raw_payload_ref: record.raw_payload_ref,
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

test("canonical repository persists and reloads schema-valid clear-frontier facts", async () => {
  const repository = new CanonicalFactRepository();
  const { candidates, evidence, sources } = candidatesFor({
    records: [
      {
        raw_payload_ref: "raw://hmrc/vat/canonical-clear",
        value_payload_ref: "candidate-value://vat/canonical-clear",
      },
    ],
  });
  const conflictSet = buildConflictSet({
    candidate_facts: candidates,
    conflict_detection_policy_ref: "conflict-policy://integration/0116",
    conflict_records: [],
    normalization_context_ref: candidates[0]!.normalization_context_ref,
    produced_at: "2026-04-27T13:35:00Z",
  });
  const [canonical] = promoteCanonicalFacts({
    candidate_facts: candidates,
    conflict_set: conflictSet,
    evidence_items: evidence,
    promoted_at: "2026-04-27T13:36:00Z",
    source_records: sources,
  });
  const stored = await repository.persistCanonicalFact({
    canonical_fact: canonical!,
    persisted_at: "2026-04-27T13:37:00Z",
  });

  await validatePayloadAgainstSchema("canonical_fact.schema.json", stored.canonical_fact);
  await expect(repository.getCanonicalFactByRef(canonicalFactRef(canonical!))).resolves.toEqual(
    stored,
  );
  await expect(
    repository.listCanonicalFactsByPromotionState("manifest-0116-persistence", "CANONICAL"),
  ).resolves.toEqual([stored]);
});

test("monitoring and contested canonical artifacts remain schema-valid", async () => {
  const repository = new CanonicalFactRepository();
  const monitoring = candidatesFor({
    manifest_id: "manifest-0116-monitoring",
    records: [
      {
        confidence: 0.5,
        raw_payload_ref: "raw://hmrc/vat/canonical-monitoring",
        value_payload_ref: "candidate-value://vat/canonical-monitoring",
      },
    ],
  });
  const monitoringConflicts = detectConflicts({
    candidate_facts: monitoring.candidates,
    conflict_detection_policy_ref: "conflict-policy://integration/0116",
  });
  const monitoringSet = buildConflictSet({
    candidate_facts: monitoring.candidates,
    conflict_detection_policy_ref: "conflict-policy://integration/0116",
    conflict_records: monitoringConflicts,
    normalization_context_ref: monitoring.candidates[0]!.normalization_context_ref,
    produced_at: "2026-04-27T13:38:00Z",
  });
  const [provisional] = promoteCanonicalFacts({
    candidate_facts: monitoring.candidates,
    conflict_set: monitoringSet,
    evidence_items: monitoring.evidence,
    promoted_at: "2026-04-27T13:39:00Z",
    source_records: monitoring.sources,
  });
  const storedProvisional = await repository.persistCanonicalFact({
    canonical_fact: provisional!,
    persisted_at: "2026-04-27T13:40:00Z",
  });
  await validatePayloadAgainstSchema(
    "canonical_fact.schema.json",
    storedProvisional.canonical_fact,
  );
  expect(storedProvisional.canonical_fact.promotion_state).toBe("PROVISIONAL");

  const blocking = candidatesFor({
    manifest_id: "manifest-0116-blocking",
    records: [
      {
        raw_payload_ref: "raw://hmrc/vat/canonical-blocking-a",
        source_class: "AUTHORITY_REFERENCE",
        value_payload_ref: "candidate-value://vat/canonical-blocking-a",
      },
      {
        raw_payload_ref: "raw://books/vat/canonical-blocking-b",
        source_class: "BOOKS_OF_ENTRY",
        value_payload_ref: "candidate-value://vat/canonical-blocking-b",
      },
    ],
  });
  const blockingConflicts = detectConflicts({
    candidate_facts: blocking.candidates,
    conflict_detection_policy_ref: "conflict-policy://integration/0116",
    semantic_projections: [
      {
        amount_value: "100.00",
        candidate_fact_ref: candidateFactRef(blocking.candidates[0]!),
        logical_subject_ref: "subject://vat/blocking",
      },
      {
        amount_value: "125.00",
        candidate_fact_ref: candidateFactRef(blocking.candidates[1]!),
        logical_subject_ref: "subject://vat/blocking",
      },
    ],
  });
  const blockingSet = buildConflictSet({
    candidate_facts: blocking.candidates,
    conflict_detection_policy_ref: "conflict-policy://integration/0116",
    conflict_records: blockingConflicts,
    normalization_context_ref: blocking.candidates[0]!.normalization_context_ref,
    produced_at: "2026-04-27T13:41:00Z",
  });
  const [contested] = promoteCanonicalFacts({
    candidate_facts: blocking.candidates,
    conflict_set: blockingSet,
    evidence_items: blocking.evidence,
    promoted_at: "2026-04-27T13:42:00Z",
    source_records: blocking.sources,
  });
  const storedContested = await repository.persistCanonicalFact({
    canonical_fact: contested!,
    persisted_at: "2026-04-27T13:43:00Z",
  });
  await validatePayloadAgainstSchema("canonical_fact.schema.json", storedContested.canonical_fact);
  expect(storedContested.canonical_fact.promotion_state).toBe("CONTESTED");
  expect(storedContested.canonical_fact.conflict_membership_refs.length).toBeGreaterThan(0);
});

test("canonical persistence is idempotent and rejects semantic dedupe collisions", async () => {
  const repository = new CanonicalFactRepository();
  const { candidates, evidence, sources } = candidatesFor({
    manifest_id: "manifest-0116-idempotent",
    records: [
      {
        raw_payload_ref: "raw://hmrc/vat/idempotent",
        value_payload_ref: "candidate-value://vat/idempotent",
      },
    ],
  });
  const conflictSet = buildConflictSet({
    candidate_facts: candidates,
    conflict_detection_policy_ref: "conflict-policy://integration/0116",
    conflict_records: [],
    normalization_context_ref: candidates[0]!.normalization_context_ref,
    produced_at: "2026-04-27T13:44:00Z",
  });
  const [canonical] = promoteCanonicalFacts({
    candidate_facts: candidates,
    conflict_set: conflictSet,
    evidence_items: evidence,
    promoted_at: "2026-04-27T13:45:00Z",
    source_records: sources,
  });
  const stored = await repository.persistCanonicalFact({
    canonical_fact: canonical!,
    persisted_at: "2026-04-27T13:46:00Z",
  });

  await expect(
    repository.persistCanonicalFact({
      canonical_fact: canonical!,
      persisted_at: "2026-04-27T13:47:00Z",
    }),
  ).resolves.toEqual(stored);
  await expect(
    repository.persistCanonicalFact({
      canonical_fact: {
        ...canonical!,
        canonical_fact_id: `${canonical!.canonical_fact_id}.collision`,
      },
      persisted_at: "2026-04-27T13:48:00Z",
    }),
  ).rejects.toThrow();
});
