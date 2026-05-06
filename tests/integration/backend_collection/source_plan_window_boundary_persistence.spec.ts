import { execFile } from "node:child_process";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

import { expect, test } from "@playwright/test";

import {
  CollectionBoundaryRepository,
  SourcePlanRepository,
  SourceWindowRepository,
  buildCollectionBoundary,
  buildSourcePlan,
  buildSourceWindow,
  collectionBoundaryRef,
  sourcePlanRef,
  sourceWindowRef,
  type CollectionBoundarySourceBoundaryRecord,
  type SourcePlanPlannedSourceRecord,
} from "../../../packages/backend-collection/src/index.ts";

const execFileAsync = promisify(execFile);
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const migrationPath = path.join(
  repoRoot,
  "db",
  "migrations",
  "phase03_0109_source_plan_window_boundary.sql",
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

function plannedSource(source_domain: string): SourcePlanPlannedSourceRecord {
  return {
    source_domain,
    source_class: "AUTHORITY_REFERENCE",
    provider_binding_ref: `provider-binding://${source_domain}`,
    partition_scope_refs: [`partition://${source_domain}/primary`],
    query_basis_ref: `query-basis://${source_domain}`,
    cursor_strategy_ref: `cursor-strategy://${source_domain}`,
    read_model: "AS_OF",
    late_data_policy_ref: "REVIEW_IF_LATE",
    completeness_expectation_ref: `completeness://${source_domain}`,
    freshness_slo_ref: `freshness://${source_domain}`,
    required_schema_refs: [`schema://${source_domain}`],
    required_source_class_refs: [],
  };
}

function boundarySource(
  source_domain: string,
  disposition: CollectionBoundarySourceBoundaryRecord["boundary_disposition"],
): CollectionBoundarySourceBoundaryRecord {
  return {
    source_domain,
    source_class: "AUTHORITY_REFERENCE",
    partition_scope_refs: [`partition://${source_domain}/primary`],
    runtime_scope_refs: ["year_end"],
    provider_environment_ref: `provider-env://${source_domain}`,
    provider_api_version: "api.v1",
    provider_schema_version: "schema.v1",
    cursor_checkpoint_ref: `cursor://${source_domain}`,
    revision_ref: `revision://${source_domain}`,
    request_audit_refs: [`audit://${source_domain}/request`],
    page_request_audit_refs: [],
    completeness_expectation_ref: `completeness://${source_domain}`,
    late_data_policy_ref: "REVIEW_IF_LATE",
    boundary_disposition: disposition,
  };
}

function buildArtifacts() {
  const sourcePlan = buildSourcePlan({
    manifest_id: "manifest.run.collection.persistence.0109",
    required_domains: ["income_sources", "vat_obligations"],
    planned_sources: [plannedSource("income_sources"), plannedSource("vat_obligations")],
  });
  const sourceWindow = buildSourceWindow({
    source_plan: sourcePlan,
    collection_started_at: "2026-04-26T13:00:00Z",
    collection_completed_at: "2026-04-26T13:15:00Z",
    read_cutoff_at: "2026-04-26T13:30:00Z",
  });
  const collectionBoundary = buildCollectionBoundary({
    source_plan: sourcePlan,
    source_window: sourceWindow,
    connector_profile_ref: "connector-profile://hmrc",
    connector_build_id: "connector-build://0109",
    source_boundaries: [
      boundarySource("income_sources", "IN_SCOPE_COLLECTED"),
      boundarySource("vat_obligations", "NO_DATA_CONFIRMED_AT_CUTOFF"),
    ],
  });
  return { collectionBoundary, sourcePlan, sourceWindow };
}

test("migration defines source plan, window, boundary aggregate and child tables", async () => {
  const sql = await readFile(migrationPath, "utf8");

  expect(sql).toContain("CREATE SCHEMA IF NOT EXISTS control_collection");
  expect(sql).toContain("CREATE TABLE IF NOT EXISTS control_collection.source_plan_register");
  expect(sql).toContain("CREATE TABLE IF NOT EXISTS control_collection.source_plan_planned_source");
  expect(sql).toContain("CREATE TABLE IF NOT EXISTS control_collection.source_window_register");
  expect(sql).toContain("CREATE TABLE IF NOT EXISTS control_collection.collection_boundary_register");
  expect(sql).toContain(
    "CREATE TABLE IF NOT EXISTS control_collection.collection_boundary_source_boundary",
  );
  expect(sql).toContain("HARD_CLOSED_AT_READ_CUTOFF");
  expect(sql).toContain("LATE_DATA_ONLY");
  expect(sql).toContain("EXPLICIT_SOURCE_DOMAIN_ACCOUNTING");
  expect(sql).toContain("ENABLE ROW LEVEL SECURITY");
});

test("repositories persist and reload schema-valid collection control artifacts", async () => {
  const sourcePlanRepository = new SourcePlanRepository();
  const sourceWindowRepository = new SourceWindowRepository();
  const collectionBoundaryRepository = new CollectionBoundaryRepository();
  const { collectionBoundary, sourcePlan, sourceWindow } = buildArtifacts();

  const storedPlan = await sourcePlanRepository.persistSourcePlan({
    source_plan: sourcePlan,
    persisted_at: "2026-04-26T13:31:00Z",
  });
  const storedWindow = await sourceWindowRepository.persistSourceWindow({
    source_window: sourceWindow,
    persisted_at: "2026-04-26T13:32:00Z",
  });
  const storedBoundary = await collectionBoundaryRepository.persistCollectionBoundary({
    collection_boundary: collectionBoundary,
    persisted_at: "2026-04-26T13:33:00Z",
  });

  await validatePayloadAgainstSchema("source_plan.schema.json", storedPlan.source_plan);
  await validatePayloadAgainstSchema("source_window.schema.json", storedWindow.source_window);
  await validatePayloadAgainstSchema(
    "collection_boundary.schema.json",
    storedBoundary.collection_boundary,
  );

  expect(await sourcePlanRepository.getSourcePlanByRef(sourcePlanRef(sourcePlan))).toEqual(
    storedPlan,
  );
  expect(await sourceWindowRepository.getSourceWindowByRef(sourceWindowRef(sourceWindow))).toEqual(
    storedWindow,
  );
  expect(
    await collectionBoundaryRepository.getCollectionBoundaryByRef(
      collectionBoundaryRef(collectionBoundary),
    ),
  ).toEqual(storedBoundary);

  await expect(sourcePlanRepository.listSourcePlansByManifestId(sourcePlan.manifest_id)).resolves.toHaveLength(1);
  await expect(sourceWindowRepository.listSourceWindowsBySourcePlanRef(sourcePlanRef(sourcePlan))).resolves.toHaveLength(1);
  await expect(
    collectionBoundaryRepository.listCollectionBoundariesBySourceWindowId(
      sourceWindow.source_window_id,
    ),
  ).resolves.toHaveLength(1);
});

test("repository duplicate handling is idempotent only for byte-identical payloads", async () => {
  const repository = new SourcePlanRepository();
  const { sourcePlan } = buildArtifacts();
  const first = await repository.persistSourcePlan({
    source_plan: sourcePlan,
    persisted_at: "2026-04-26T13:31:00Z",
  });
  const second = await repository.persistSourcePlan({
    source_plan: sourcePlan,
    persisted_at: "2026-04-26T13:32:00Z",
  });
  expect(second).toEqual(first);

  await expect(
    repository.persistSourcePlan({
      source_plan: {
        ...sourcePlan,
        required_domains: [...sourcePlan.required_domains, "additional_domain"],
      },
      persisted_at: "2026-04-26T13:33:00Z",
    }),
  ).rejects.toThrow();
});
