import { execFile } from "node:child_process";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

import { expect, test } from "@playwright/test";

import {
  SourceCollectionRunOrchestrator,
  SourceCollectionRunRepository,
  SourceCollectionRunRepositoryError,
  buildSourceCollectionRun,
  createOrReuseSourceCollectionRun,
  transitionSourceCollectionRun,
} from "../../../packages/backend-collection/src/index.ts";

const execFileAsync = promisify(execFile);
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const migrationPath = path.join(
  repoRoot,
  "db",
  "migrations",
  "phase03_0110_source_collection_run.sql",
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

function sequenceClock(...instants: string[]) {
  let index = 0;
  return () => {
    if (instants.length === 0) {
      throw new Error("sequenceClock requires at least one instant");
    }
    const value = instants[Math.min(index, instants.length - 1)];
    index += 1;
    return value!;
  };
}

test("migration defines source collection run register, transition log, indexes, and RLS", async () => {
  const sql = await readFile(migrationPath, "utf8");

  expect(sql).toContain("CREATE TABLE IF NOT EXISTS control_collection.source_collection_run_register");
  expect(sql).toContain("CREATE TABLE IF NOT EXISTS control_collection.source_collection_run_transition_log");
  expect(sql).toContain("manifest_id text NOT NULL UNIQUE");
  expect(sql).toContain("source_window_ref text NOT NULL UNIQUE");
  expect(sql).toContain("source_collection_run_lifecycle_idx");
  expect(sql).toContain("source_collection_run_window_ref_idx");
  expect(sql).toContain("ENABLE ROW LEVEL SECURITY");
});

test("repository persists schema-valid run lifecycle and rejects stale CAS writes", async () => {
  const repository = new SourceCollectionRunRepository();
  const run = buildSourceCollectionRun({
    created_at: "2026-04-26T13:00:00Z",
    manifest_id: "manifest.collection.0110.persistence",
  });
  const created = await repository.createSourceCollectionRun({
    collection_run: run,
    persisted_at: "2026-04-26T13:00:00Z",
  });
  const fetchingRun = transitionSourceCollectionRun({
    event_code: "fetch_begin",
    run: created.collection_run,
    transitioned_at: "2026-04-26T13:01:00Z",
    transition_audit_ref: "audit://source-collection-run/persistence/fetch_begin",
  });
  const fetching = await repository.compareAndSwapSourceCollectionRun({
    expected_source_collection_run_row_version: created.source_collection_run_row_version,
    next_collection_run: fetchingRun,
    persisted_at: "2026-04-26T13:01:00Z",
  });

  await validatePayloadAgainstSchema("source_collection_run.schema.json", fetching.collection_run);

  await expect(
    repository.compareAndSwapSourceCollectionRun({
      expected_source_collection_run_row_version: created.source_collection_run_row_version,
      next_collection_run: fetchingRun,
      persisted_at: "2026-04-26T13:02:00Z",
    }),
  ).rejects.toThrow(SourceCollectionRunRepositoryError);
  await expect(repository.listSourceCollectionRunsByLifecycleState("FETCHING")).resolves.toHaveLength(1);
});

test("orchestrator resumes by manifest, classifies partial gaps, and preserves audit lineage", async () => {
  const repository = new SourceCollectionRunRepository();
  const orchestrator = new SourceCollectionRunOrchestrator({
    dispatch: async () => [
      {
        fetch_audit_refs: ["audit://fetch/request", "audit://fetch/request"],
        outcome_code: "SOURCE_EMPTY_CONFIRMED",
        page_audit_refs: ["audit://fetch/page-empty"],
        source_domain: "income_sources",
      },
      {
        fetch_audit_refs: ["audit://fetch/partial"],
        outcome_code: "SOURCE_PARTIAL_GAP",
        partial_gap_refs: ["partial-gap://vat_obligations/MISSING_AT_CUTOFF"],
        source_domain: "vat_obligations",
      },
    ],
    now: sequenceClock("2026-04-26T14:01:00Z", "2026-04-26T14:02:00Z"),
    repository,
  });

  const partial = await orchestrator.runManifestCollection({
    created_at: "2026-04-26T14:00:00Z",
    manifest_id: "manifest.collection.0110.integration.partial",
  });
  const resumed = await orchestrator.runManifestCollection({
    created_at: "2026-04-26T14:10:00Z",
    manifest_id: "manifest.collection.0110.integration.partial",
  });

  expect(partial.stored_run.collection_run.lifecycle_state).toBe("PARTIAL");
  expect(partial.stored_run.collection_run.fetch_audit_refs).toEqual([
    "audit://fetch/page-empty",
    "audit://fetch/partial",
    "audit://fetch/request",
  ]);
  expect(partial.stored_run.collection_run.partial_gap_refs).toEqual([
    "partial-gap://vat_obligations/MISSING_AT_CUTOFF",
  ]);
  expect(resumed.action).toBe("REUSED_TERMINAL");
  expect(resumed.stored_run.collection_run_id).toBe(partial.stored_run.collection_run_id);

  await validatePayloadAgainstSchema(
    "source_collection_run.schema.json",
    partial.stored_run.collection_run,
  );
});

test("same manifest creation reuses the existing run and does not allocate a second active object", async () => {
  const repository = new SourceCollectionRunRepository();
  const first = await createOrReuseSourceCollectionRun({
    created_at: "2026-04-26T15:00:00Z",
    manifest_id: "manifest.collection.0110.idempotent",
    repository,
  });
  const second = await createOrReuseSourceCollectionRun({
    created_at: "2026-04-26T15:01:00Z",
    manifest_id: "manifest.collection.0110.idempotent",
    repository,
  });

  expect(first.reused_existing).toBe(false);
  expect(second.reused_existing).toBe(true);
  expect(await repository.getSourceCollectionRunByManifestId("manifest.collection.0110.idempotent")).toEqual(
    first.stored_run,
  );
  await expect(repository.listSourceCollectionRunsByLifecycleState("NOT_STARTED")).resolves.toHaveLength(1);
});
