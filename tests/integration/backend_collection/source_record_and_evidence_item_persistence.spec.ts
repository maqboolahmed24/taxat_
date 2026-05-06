import { execFile } from "node:child_process";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

import { expect, test } from "@playwright/test";

import {
  EvidenceItemRepository,
  SourceRecordRepository,
  materializeEvidenceItems,
  materializeSourceRecords,
  sourceRecordRef,
  type FetchDispatchResult,
} from "../../../packages/backend-collection/src/index.ts";

const execFileAsync = promisify(execFile);
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const migrationPath = path.join(
  repoRoot,
  "db",
  "migrations",
  "phase03_0112_source_record_and_evidence_item.sql",
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

function fetchResult(overrides: Partial<FetchDispatchResult> = {}): FetchDispatchResult {
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
    raw_payload_refs: [{ page_index: 1, raw_payload_ref: "raw://hmrc/vat/page-1" }],
    request_audit_refs: ["audit://request/vat"],
    revision_ref: "revision://vat/1",
    source_domain: "vat_obligations",
    ...overrides,
  };
}

function materialize(
  overrides: {
    business_partition?: string;
    fetch_result?: FetchDispatchResult;
    provider_account_ref?: string;
    quarantined?: boolean;
    source_class?:
      | "AUTHORITY_ACKNOWLEDGEMENT"
      | "AUTHORITY_REFERENCE"
      | "INSTITUTIONAL_FEED"
      | "BOOKS_OF_ENTRY"
      | "DOCUMENTARY_EVIDENCE"
      | "DECLARED_ASSERTION"
      | "DETERMINISTIC_DERIVATION"
      | "PROBABILISTIC_INFERENCE"
      | "GOVERNANCE_ARTIFACT";
  } = {},
) {
  const sourceRecords = materializeSourceRecords({
    captured_at: "2026-04-27T11:10:00Z",
    client_id: "client-0112",
    collection_boundary_ref: "collection-boundary://manifest-0112",
    effective_period: "tax-year://2025-2026",
    fetch_result: overrides.fetch_result ?? fetchResult(),
    ingestion_run_ref: "source-collection-run://manifest-0112",
    manifest_id: "manifest-0112",
    planned_partition_scope_refs: ["partition://vat/primary"],
    provider: "HMRC",
    provider_account_ref: overrides.provider_account_ref ?? "provider-account://vrn/999999999",
    source_class: overrides.source_class ?? "INSTITUTIONAL_FEED",
    tenant_id: "tenant-0112",
    ...(overrides.business_partition === undefined
      ? {}
      : { business_partition: overrides.business_partition }),
    ...(overrides.quarantined === undefined ? {} : { quarantined: overrides.quarantined }),
  });
  const evidenceItems = materializeEvidenceItems({
    evidence_extraction_available: overrides.source_class === "DOCUMENTARY_EVIDENCE",
    expected_partition_scope_refs: ["partition://vat/primary"],
    source_records: sourceRecords,
  });
  return { evidenceItems, sourceRecords };
}

test("migration defines source record and evidence item durable registers", async () => {
  const sql = await readFile(migrationPath, "utf8");

  expect(sql).toContain("CREATE TABLE IF NOT EXISTS control_collection.source_record_register");
  expect(sql).toContain("CREATE TABLE IF NOT EXISTS control_collection.evidence_item_register");
  expect(sql).toContain("QUARANTINED_GATEWAY_CAPTURE");
  expect(sql).toContain("EXTRACTION_REVIEW_REQUIRED");
  expect(sql).toContain("QUARANTINE_BLOCKED_EXTRACTION");
  expect(sql).toContain("jsonb_array_length(lineage_refs) > 0");
  expect(sql).toContain("ENABLE ROW LEVEL SECURITY");
});

test("repositories persist and reload schema-valid source and evidence artifacts", async () => {
  const sourceRepository = new SourceRecordRepository();
  const evidenceRepository = new EvidenceItemRepository();
  const { evidenceItems, sourceRecords } = materialize();

  const storedSource = await sourceRepository.persistSourceRecord({
    source_record: sourceRecords[0]!,
    stored_at: "2026-04-27T11:11:00Z",
  });
  const storedEvidence = await evidenceRepository.persistEvidenceItem({
    evidence_item: evidenceItems[0]!,
    stored_at: "2026-04-27T11:12:00Z",
  });

  await validatePayloadAgainstSchema("source_record.schema.json", storedSource.source_record);
  await validatePayloadAgainstSchema("evidence_item.schema.json", storedEvidence.evidence_item);

  expect(await sourceRepository.getSourceRecordByRef(sourceRecordRef(sourceRecords[0]!))).toEqual(
    storedSource,
  );
  await expect(
    sourceRepository.listSourceRecordsByCollectionBoundaryRef(
      "collection-boundary://manifest-0112",
    ),
  ).resolves.toHaveLength(1);
  await expect(
    sourceRepository.listSourceRecordsBySourceClass("manifest-0112", "INSTITUTIONAL_FEED"),
  ).resolves.toHaveLength(1);
  await expect(
    evidenceRepository.listEvidenceItemsBySourceRecordId(sourceRecords[0]!.source_record_id),
  ).resolves.toEqual([storedEvidence]);
  await expect(
    evidenceRepository.listEvidenceItemsByKind("manifest-0112", "STRUCTURED_PROVIDER_PAYLOAD"),
  ).resolves.toHaveLength(1);
});

test("duplicate persistence is idempotent only for equivalent artifacts", async () => {
  const sourceRepository = new SourceRecordRepository();
  const evidenceRepository = new EvidenceItemRepository();
  const first = materialize({ provider_account_ref: "provider-account://vrn/111111111" });
  const second = materialize({ provider_account_ref: "provider-account://vrn/222222222" });

  const storedFirstSource = await sourceRepository.persistSourceRecord({
    source_record: first.sourceRecords[0]!,
    stored_at: "2026-04-27T11:11:00Z",
  });
  const replayedFirstSource = await sourceRepository.persistSourceRecord({
    source_record: first.sourceRecords[0]!,
    stored_at: "2026-04-27T11:15:00Z",
  });
  const storedSecondSource = await sourceRepository.persistSourceRecord({
    source_record: second.sourceRecords[0]!,
    stored_at: "2026-04-27T11:16:00Z",
  });

  expect(replayedFirstSource).toEqual(storedFirstSource);
  expect(storedSecondSource.source_record.raw_hash).toBe(storedFirstSource.source_record.raw_hash);
  expect(storedSecondSource.source_record_id).not.toBe(storedFirstSource.source_record_id);
  await expect(
    sourceRepository.listSourceRecordsByManifestId("manifest-0112"),
  ).resolves.toHaveLength(2);

  const storedEvidence = await evidenceRepository.persistEvidenceItem({
    evidence_item: first.evidenceItems[0]!,
    stored_at: "2026-04-27T11:17:00Z",
  });
  await expect(
    evidenceRepository.persistEvidenceItem({
      evidence_item: first.evidenceItems[0]!,
      stored_at: "2026-04-27T11:18:00Z",
    }),
  ).resolves.toEqual(storedEvidence);
});

test("documentary weak extraction and quarantined evidence remain schema-valid and attributable", async () => {
  const sourceRepository = new SourceRecordRepository();
  const evidenceRepository = new EvidenceItemRepository();
  const documentary = materialize({ source_class: "DOCUMENTARY_EVIDENCE" });
  const quarantine = materialize({ quarantined: true });
  const documentaryWeakEvidence = materializeEvidenceItems({
    evidence_extraction_available: false,
    source_records: documentary.sourceRecords,
  })[0]!;

  const storedDocumentaryEvidence = await evidenceRepository.persistEvidenceItem({
    evidence_item: documentaryWeakEvidence,
    stored_at: "2026-04-27T11:20:00Z",
  });
  const storedQuarantinedSource = await sourceRepository.persistSourceRecord({
    source_record: quarantine.sourceRecords[0]!,
    stored_at: "2026-04-27T11:21:00Z",
  });
  const storedQuarantinedEvidence = await evidenceRepository.persistEvidenceItem({
    evidence_item: quarantine.evidenceItems[0]!,
    stored_at: "2026-04-27T11:22:00Z",
  });

  await validatePayloadAgainstSchema(
    "evidence_item.schema.json",
    storedDocumentaryEvidence.evidence_item,
  );
  await validatePayloadAgainstSchema(
    "source_record.schema.json",
    storedQuarantinedSource.source_record,
  );
  await validatePayloadAgainstSchema(
    "evidence_item.schema.json",
    storedQuarantinedEvidence.evidence_item,
  );

  expect(storedDocumentaryEvidence.evidence_item.evidence_kind).toBe("EXTRACTION_REVIEW_REQUIRED");
  expect(storedDocumentaryEvidence.evidence_item.extraction_confidence).toBe(0);
  expect(storedDocumentaryEvidence.evidence_item.lineage_refs).toContain(
    sourceRecordRef(documentary.sourceRecords[0]!),
  );
  expect(storedQuarantinedSource.source_record.erasure_state).toBe("LIMITED");
  expect(storedQuarantinedEvidence.evidence_item.evidence_kind).toBe("QUARANTINED_CONTENT");
  expect(storedQuarantinedEvidence.evidence_item.extraction_method).toBe(
    "QUARANTINE_BLOCKED_EXTRACTION",
  );
});
