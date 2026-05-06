import { execFile } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

import { expect, test } from "@playwright/test";

import { CollectionBoundarySchemaLineage } from "../../../packages/generated-models/src/generated/typescript/domain-workflow-and-filing.ts";
import {
  CandidateFactSetSchemaLineage,
  CanonicalFactSetSchemaLineage,
  ConflictSetSchemaLineage,
  EvidenceItemSetSchemaLineage,
  InputFreezeSchemaLineage,
  NormalizationContextSchemaLineage,
  SnapshotSchemaLineage,
  SourcePlanSchemaLineage,
  SourceRecordSetSchemaLineage,
  SourceWindowSchemaLineage,
} from "../../../packages/generated-models/src/generated/typescript/provenance-and-evidence.ts";
import {
  artifactContractGate,
  buildCandidateFactSet,
  buildCanonicalFactSet,
  buildCollectionBoundary,
  buildConflictSet,
  buildEvidenceItemSet,
  buildSnapshot,
  buildSourcePlan,
  buildSourceRecordSet,
  buildSourceWindow,
  candidateFactSetRef,
  canonicalFactSetRef,
  collectionBoundaryRef,
  conflictSetRef,
  evidenceItemSetRef,
  extractCandidateFacts,
  freezeInputSet,
  freezeNormalizationContext,
  materializeEvidenceItems,
  materializeSourceRecords,
  promoteCanonicalFacts,
  recordArtifactContractRefs,
  sourceRecordSetRef,
  validateArtifactContractsForPresealSet,
  type ArtifactSchemaValidator,
  type FetchDispatchResult,
  type SourcePlanPlannedSourceRecord,
} from "../../../packages/backend-collection/src/index.ts";
import {
  buildSchemaBundleRecord,
  buildSchemaReaderWindowContract,
  type SchemaBundleEntryRecord,
} from "../../../packages/backend-manifest/src/index.ts";

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

const pythonSchemaValidator: ArtifactSchemaValidator = async (input) => {
  const schemaName = input.schema_id.split("/").at(-1);
  if (!schemaName) {
    return {
      issues: [{ message: "schema id does not contain a schema filename", path: "<schema_id>" }],
      valid: false,
    };
  }
  try {
    await validatePayloadAgainstSchema(schemaName, input.artifact);
    return { issues: [], valid: true };
  } catch (error) {
    return {
      issues: [
        {
          message: error instanceof Error ? error.message : "schema validation failed",
          path: "<root>",
        },
      ],
      valid: false,
    };
  }
};

function schemaEntry(input: {
  artifact_type: string;
  content_hash: string;
  schema_id: string;
}): SchemaBundleEntryRecord {
  return {
    allowed_upgrade_kinds: ["PATCH_BACKWARD", "MINOR_BACKWARD"],
    artifact_type: input.artifact_type,
    compatibility_class: "BACKWARD_COMPATIBLE",
    content_hash: input.content_hash,
    dialect_ref: "json-schema-draft-2020-12",
    schema_id: input.schema_id,
    semantic_version: "1.0.0",
    supersedes_schema_id: null,
    writer_min_reader_version: "1.0.0",
  };
}

function buildIntakeSchemaBundle() {
  return buildSchemaBundleRecord({
    compatibility_profile_ref: "compat-profile://collection/0120",
    entries: [
      schemaEntry({
        artifact_type: "SourcePlan",
        content_hash: SourcePlanSchemaLineage.sourceHash,
        schema_id: SourcePlanSchemaLineage.schemaId,
      }),
      schemaEntry({
        artifact_type: "SourceWindow",
        content_hash: SourceWindowSchemaLineage.sourceHash,
        schema_id: SourceWindowSchemaLineage.schemaId,
      }),
      schemaEntry({
        artifact_type: "CollectionBoundary",
        content_hash: CollectionBoundarySchemaLineage.sourceHash,
        schema_id: CollectionBoundarySchemaLineage.schemaId,
      }),
      schemaEntry({
        artifact_type: "NormalizationContext",
        content_hash: NormalizationContextSchemaLineage.sourceHash,
        schema_id: NormalizationContextSchemaLineage.schemaId,
      }),
      schemaEntry({
        artifact_type: "SourceRecordSet",
        content_hash: SourceRecordSetSchemaLineage.sourceHash,
        schema_id: SourceRecordSetSchemaLineage.schemaId,
      }),
      schemaEntry({
        artifact_type: "EvidenceItemSet",
        content_hash: EvidenceItemSetSchemaLineage.sourceHash,
        schema_id: EvidenceItemSetSchemaLineage.schemaId,
      }),
      schemaEntry({
        artifact_type: "CandidateFactSet",
        content_hash: CandidateFactSetSchemaLineage.sourceHash,
        schema_id: CandidateFactSetSchemaLineage.schemaId,
      }),
      schemaEntry({
        artifact_type: "ConflictSet",
        content_hash: ConflictSetSchemaLineage.sourceHash,
        schema_id: ConflictSetSchemaLineage.schemaId,
      }),
      schemaEntry({
        artifact_type: "CanonicalFactSet",
        content_hash: CanonicalFactSetSchemaLineage.sourceHash,
        schema_id: CanonicalFactSetSchemaLineage.schemaId,
      }),
      schemaEntry({
        artifact_type: "Snapshot",
        content_hash: SnapshotSchemaLineage.sourceHash,
        schema_id: SnapshotSchemaLineage.schemaId,
      }),
      schemaEntry({
        artifact_type: "InputFreeze",
        content_hash: InputFreezeSchemaLineage.sourceHash,
        schema_id: InputFreezeSchemaLineage.schemaId,
      }),
    ],
    published_at: "2026-04-27T19:00:00Z",
    schema_reader_window_contract: buildSchemaReaderWindowContract({
      compatibility_window_ref: "compat-window://collection/0120",
      supported_reader_schema_bundle_hashes: ["schema-bundle-hash://provisional"],
      window_state: "VERIFIED_PREVIOUS_READERS_SUPPORTED",
      writer_schema_bundle_hash: "schema-bundle-hash://provisional",
    }),
  });
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
    cursor_checkpoint_ref: "cursor://vat_obligations/checkpoint-0120",
    empty_response_confirmed: false,
    fetch_audit_refs: ["audit://fetch/vat_obligations/0120"],
    fetch_gap_code_or_null: null,
    fetch_posture: "FETCHED",
    observed_provider_schema_version: "schema://vat_obligations/v1",
    outcome_code: "SOURCE_FETCHED",
    page_audit_refs: ["audit://fetch/vat_obligations/page-0120"],
    provider_api_version: "mtd-v1",
    provider_environment_ref: "provider-env://hmrc/sandbox",
    raw_payload_refs: [{ page_index: 1, raw_payload_ref: rawPayloadRef }],
    request_audit_refs: ["audit://request/vat_obligations/0120"],
    revision_ref: "revision://vat_obligations/0120",
    source_domain: "vat_obligations",
  };
}

function setBindingFor<TArtifactType extends string>(record: {
  artifact_contract_hash: string;
  artifact_type: TArtifactType;
  item_identity_hash: string;
  items: readonly unknown[];
  manifest_id: string;
  produced_at: string;
  set_hash: string;
  set_id: string;
}) {
  const setRef =
    record.artifact_type === "SourceRecordSet"
      ? sourceRecordSetRef(record)
      : record.artifact_type === "EvidenceItemSet"
        ? evidenceItemSetRef(record)
        : record.artifact_type === "CandidateFactSet"
          ? candidateFactSetRef(record)
          : record.artifact_type === "ConflictSet"
            ? conflictSetRef(record)
            : canonicalFactSetRef(record);
  return {
    artifact_contract_hash: record.artifact_contract_hash,
    artifact_type: record.artifact_type,
    item_count: record.items.length,
    item_identity_hash: record.item_identity_hash,
    manifest_id: record.manifest_id,
    produced_at: record.produced_at,
    set_hash: record.set_hash,
    set_ref: setRef,
  };
}

async function buildFixture() {
  const schemaBundle = buildIntakeSchemaBundle();
  const schemaBundleHash = schemaBundle.schema_bundle_hash;
  const manifestId = "manifest-0120-integration";
  const plan = buildSourcePlan({
    manifest_id: manifestId,
    planned_sources: [plannedSource()],
    required_domains: ["vat_obligations"],
    schema_bundle_hash: schemaBundleHash,
  });
  const window = buildSourceWindow({
    collection_completed_at: "2026-04-27T19:40:00Z",
    collection_started_at: "2026-04-27T19:00:00Z",
    read_cutoff_at: "2026-04-27T20:00:00Z",
    schema_bundle_hash: schemaBundleHash,
    source_plan: plan,
  });
  const boundary = buildCollectionBoundary({
    collection_boundary_id: `collection-boundary.${manifestId}`,
    connector_build_id: "connector-build://hmrc/0120",
    connector_profile_ref: "connector-profile://hmrc/mtd",
    schema_bundle_hash: schemaBundleHash,
    source_boundaries: [
      {
        boundary_disposition: "IN_SCOPE_COLLECTED",
        completeness_expectation_ref: "completeness://vat_obligations",
        cursor_checkpoint_ref: "cursor://vat_obligations/checkpoint-0120",
        late_data_policy_ref: "REVIEW_IF_LATE",
        page_request_audit_refs: ["audit://fetch/vat_obligations/page-0120"],
        partition_scope_refs: ["partition://vat/main"],
        provider_api_version: "mtd-v1",
        provider_environment_ref: "provider-env://hmrc/sandbox",
        provider_schema_version: "schema://vat_obligations/v1",
        request_audit_refs: ["audit://request/vat_obligations/0120"],
        revision_ref: "revision://vat_obligations/0120",
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
    captured_at: "2026-04-27T19:35:00Z",
    client_id: "client-0120",
    collection_boundary_ref: collectionBoundaryRef(boundary),
    effective_period: "tax-year://2025-2026",
    fetch_result: fetchResult("raw://hmrc/vat/0120-integration"),
    ingestion_run_ref: "source-collection-run://0120-integration",
    manifest_id: manifestId,
    planned_partition_scope_refs: ["partition://vat/main"],
    provider: "HMRC",
    provider_account_ref: "provider-account://vrn/999999999",
    source_class: "INSTITUTIONAL_FEED",
    tenant_id: "tenant-0120",
  });
  const evidence = materializeEvidenceItems({
    evidence_extraction_available: true,
    expected_partition_scope_refs: ["partition://vat/main"],
    source_records: sources,
  });
  const context = freezeNormalizationContext({
    connector_build_refs: ["connector-build://hmrc/0120"],
    evidence_rules_ref: "evidence-rules://2026-04",
    manifest_id: manifestId,
    mapping_rules_ref: "mapping-rules://2026-04",
    normalization_rules_ref: "normalization-rules://2026-04",
    produced_at: "2026-04-27T19:42:00Z",
    promotion_rules_ref: "promotion-rules://2026-04",
    schema_bundle_hash: schemaBundleHash,
  });
  const candidates = extractCandidateFacts({
    evidence_items: evidence,
    extraction_overrides: [
      {
        evidence_item_id: evidence[0]!.evidence_item_id,
        value_payload_ref: "candidate-value://vat/0120-integration",
      },
    ],
    normalization_context: context,
    schema_bundle_hash: schemaBundleHash,
    source_records: sources,
  });
  const contextRef = `normalization-context://${context.normalization_context_id}`;
  const conflictSet = buildConflictSet({
    candidate_facts: candidates,
    conflict_detection_policy_ref: "conflict-policy://integration/0120",
    conflict_records: [],
    normalization_context_ref: contextRef,
    produced_at: "2026-04-27T19:46:00Z",
    schema_bundle_hash: schemaBundleHash,
  });
  const canonical = promoteCanonicalFacts({
    candidate_facts: candidates,
    conflict_set: conflictSet,
    evidence_items: evidence,
    promoted_at: "2026-04-27T19:47:00Z",
    schema_bundle_hash: schemaBundleHash,
    source_records: sources,
  });
  const sourceRecordSet = buildSourceRecordSet({
    manifest_id: manifestId,
    produced_at: "2026-04-27T19:48:00Z",
    schema_bundle_hash: schemaBundleHash,
    source_records: sources,
  });
  const evidenceItemSet = buildEvidenceItemSet({
    evidence_items: evidence,
    manifest_id: manifestId,
    produced_at: "2026-04-27T19:48:00Z",
    schema_bundle_hash: schemaBundleHash,
  });
  const candidateFactSet = buildCandidateFactSet({
    candidate_facts: candidates,
    manifest_id: manifestId,
    produced_at: "2026-04-27T19:48:00Z",
    schema_bundle_hash: schemaBundleHash,
  });
  const canonicalFactSet = buildCanonicalFactSet({
    canonical_facts: canonical,
    manifest_id: manifestId,
    produced_at: "2026-04-27T19:48:00Z",
    schema_bundle_hash: schemaBundleHash,
  });
  const snapshot = await buildSnapshot({
    built_at: "2026-04-27T19:50:00Z",
    manifest_id: manifestId,
    schema_bundle_hash: schemaBundleHash,
    set_bindings: {
      candidate_fact_set: setBindingFor(candidateFactSet),
      canonical_fact_set: setBindingFor(canonicalFactSet),
      conflict_set: setBindingFor(conflictSet),
      evidence_item_set: setBindingFor(evidenceItemSet),
      source_record_set: setBindingFor(sourceRecordSet),
    },
  });
  const recorded = recordArtifactContractRefs({
    contracts: [
      plan.contract,
      window.contract,
      boundary.contract,
      context.contract,
      sourceRecordSet.contract,
      evidenceItemSet.contract,
      candidateFactSet.contract,
      conflictSet.contract,
      canonicalFactSet.contract,
      snapshot.contract,
    ],
  });
  const inputFreeze = await freezeInputSet({
    artifact_contract_hash: recorded.artifact_contract_hash,
    artifact_contract_refs: recorded.artifact_contract_refs,
    candidate_facts: candidates,
    canonical_facts: canonical,
    collection_boundary: boundary,
    conflict_set: conflictSet,
    evidence_items: evidence,
    input_policy_ref: "input-policy://integration/0120",
    normalization_context: context,
    runtime_scope_refs: ["prepare_submission"],
    schema_bundle_hash: schemaBundleHash,
    source_plan: plan,
    source_records: sources,
    source_window: window,
  });

  return {
    artifacts: {
      candidate_fact_set: candidateFactSet,
      canonical_fact_set: canonicalFactSet,
      collection_boundary: boundary,
      conflict_set: conflictSet,
      evidence_item_set: evidenceItemSet,
      input_freeze: inputFreeze,
      normalization_context: context,
      snapshot,
      source_plan: plan,
      source_record_set: sourceRecordSet,
      source_window: window,
    },
    inputFreeze,
    manifestId,
    schemaBundle,
  };
}

test("full frozen intake pack validates and emits schema-valid artifact contract gate", async () => {
  const fixture = await buildFixture();
  await validatePayloadAgainstSchema("schema_bundle.schema.json", fixture.schemaBundle);

  const validation = await validateArtifactContractsForPresealSet({
    artifacts: fixture.artifacts,
    schema_bundle: fixture.schemaBundle,
    schema_validator: pythonSchemaValidator,
  });
  expect(validation.decision).toBe("PASS");
  expect(validation.artifact_contract_hash_expected).toBe(
    fixture.inputFreeze.artifact_contract_hash,
  );

  const gate = await artifactContractGate({
    artifacts: fixture.artifacts,
    decided_at: "2026-04-27T20:01:00Z",
    effective_scope: ["year_end", "prepare_submission"],
    manifest_id: fixture.manifestId,
    prerequisite_gate_refs: [`gate.${fixture.manifestId}.manifest_gate`],
    schema_bundle: fixture.schemaBundle,
    schema_validator: pythonSchemaValidator,
  });

  expect(gate.gate_record.decision).toBe("PASS");
  expect(gate.gate_record.reason_codes).toEqual(["ARTIFACT_CONTRACTS_VALID"]);
  await validatePayloadAgainstSchema("gate_decision_record.schema.json", gate.gate_record);
});

test("validation rejects live schema fallback and missing canonical boundary refs", async () => {
  const fixture = await buildFixture();
  const liveFallback = structuredClone(fixture.artifacts);
  liveFallback.source_plan = {
    ...fixture.artifacts.source_plan,
    contract: {
      ...fixture.artifacts.source_plan.contract,
      schema_bundle_hash: "schema-bundle-hash://live-compatible-but-not-frozen",
    },
  };
  const liveResult = await artifactContractGate({
    artifacts: liveFallback,
    decided_at: "2026-04-27T20:02:00Z",
    effective_scope: ["year_end", "prepare_submission"],
    manifest_id: fixture.manifestId,
    schema_bundle: fixture.schemaBundle,
    schema_validator: pythonSchemaValidator,
  });
  expect(liveResult.gate_record.decision).toBe("HARD_BLOCK");
  expect(liveResult.gate_record.reason_codes).toContain("ARTIFACT_SCHEMA_NOT_IN_BUNDLE");

  const missingRef = structuredClone(fixture.artifacts);
  missingRef.input_freeze = {
    ...fixture.inputFreeze,
    artifact_contract_refs: fixture.inputFreeze.artifact_contract_refs.filter(
      (ref) => !ref.includes("SourceWindow"),
    ),
  };
  const missingResult = await artifactContractGate({
    artifacts: missingRef,
    decided_at: "2026-04-27T20:03:00Z",
    effective_scope: ["year_end", "prepare_submission"],
    manifest_id: fixture.manifestId,
    schema_bundle: fixture.schemaBundle,
    schema_validator: pythonSchemaValidator,
  });
  expect(missingResult.gate_record.decision).toBe("HARD_BLOCK");
  expect(missingResult.gate_record.reason_codes).toContain("ARTIFACT_CONTRACT_REF_MISSING");
});
