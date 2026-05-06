import { execFile } from "node:child_process";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

import { expect, test } from "@playwright/test";

import {
  SnapshotRepository,
  buildSnapshot,
  snapshotRef,
  transitionSnapshot,
  type SnapshotAssemblySetBindings,
} from "../../../packages/backend-collection/src/index.ts";

const execFileAsync = promisify(execFile);
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const migrationPath = path.join(repoRoot, "db", "migrations", "phase03_0118_snapshot.sql");

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

function setBindings(manifestId: string, suffix: string): SnapshotAssemblySetBindings {
  return {
    candidate_fact_set: {
      artifact_type: "CandidateFactSet",
      manifest_id: manifestId,
      set_hash: `candidate-fact-set-hash://${suffix}`,
      set_ref: `candidate-fact-set://${suffix}`,
    },
    canonical_fact_set: {
      artifact_type: "CanonicalFactSet",
      manifest_id: manifestId,
      set_hash: `canonical-fact-set-hash://${suffix}`,
      set_ref: `canonical-fact-set://${suffix}`,
    },
    conflict_set: {
      artifact_type: "ConflictSet",
      manifest_id: manifestId,
      set_hash: `conflict-set-hash://${suffix}`,
      set_ref: `conflict-set://${suffix}`,
    },
    evidence_item_set: {
      artifact_type: "EvidenceItemSet",
      manifest_id: manifestId,
      set_hash: `evidence-item-set-hash://${suffix}`,
      set_ref: `evidence-item-set://${suffix}`,
    },
    source_record_set: {
      artifact_type: "SourceRecordSet",
      manifest_id: manifestId,
      set_hash: `source-record-set-hash://${suffix}`,
      set_ref: `source-record-set://${suffix}`,
    },
  };
}

test("migration defines snapshot register, transition log, indexes, and RLS", async () => {
  const sql = await readFile(migrationPath, "utf8");

  expect(sql).toContain("CREATE TABLE IF NOT EXISTS control_collection.snapshot_register");
  expect(sql).toContain("CREATE TABLE IF NOT EXISTS control_collection.snapshot_transition_log");
  expect(sql).toContain("state_transition_contract jsonb NOT NULL");
  expect(sql).toContain("source_record_set_hash text NOT NULL");
  expect(sql).toContain("snapshot_lifecycle_idx");
  expect(sql).toContain("snapshot_transition_idx");
  expect(sql).toContain("ENABLE ROW LEVEL SECURITY");
});

test("snapshot repository persists schema-valid lifecycle and retains transition history", async () => {
  const manifestId = "manifest-0118-integration";
  const repository = new SnapshotRepository();
  const built = await buildSnapshot({
    built_at: "2026-04-27T16:00:00Z",
    completeness: {
      expected_domain_refs: ["domain://vat_obligations"],
      satisfied_domain_refs: ["domain://vat_obligations"],
    },
    manifest_id: manifestId,
    persisted_at: "2026-04-27T16:00:01Z",
    repository,
    set_bindings: setBindings(manifestId, "current"),
  });

  await validatePayloadAgainstSchema("snapshot.schema.json", built);
  await expect(repository.getSnapshotByRef(snapshotRef(built))).resolves.toMatchObject({
    snapshot_id: built.snapshot_id,
    snapshot_row_version: 1,
  });

  const valid = transitionSnapshot({
    event_code: "snapshot_validation_passed",
    snapshot: built,
    transitioned_at: "2026-04-27T16:01:00Z",
    transition_audit_ref: "audit://snapshot/integration/valid",
  });
  const storedValid = await repository.compareAndSwapSnapshot({
    expected_snapshot_row_version: 1,
    next_snapshot: valid,
    persisted_at: "2026-04-27T16:01:01Z",
    transition: {
      event_code: "snapshot_validation_passed",
      from_lifecycle_state: "BUILT",
      to_lifecycle_state: "VALID",
      transition_audit_ref: "audit://snapshot/integration/valid",
      transitioned_at: "2026-04-27T16:01:00Z",
    },
  });
  await validatePayloadAgainstSchema("snapshot.schema.json", storedValid.snapshot);

  const successor = await buildSnapshot({
    built_at: "2026-04-27T16:02:00Z",
    manifest_id: manifestId,
    persisted_at: "2026-04-27T16:02:01Z",
    repository,
    set_bindings: setBindings(manifestId, "successor"),
  });
  const superseded = transitionSnapshot({
    event_code: "snapshot_superseded",
    snapshot: storedValid.snapshot,
    superseded_by_snapshot_id: successor.snapshot_id,
    transitioned_at: "2026-04-27T16:03:00Z",
    transition_audit_ref: "audit://snapshot/integration/superseded",
  });
  const prematureSuccessorValid = transitionSnapshot({
    event_code: "snapshot_validation_passed",
    snapshot: successor,
    transitioned_at: "2026-04-27T16:02:30Z",
    transition_audit_ref: "audit://snapshot/integration/successor-premature-valid",
  });
  await expect(
    repository.compareAndSwapSnapshot({
      expected_snapshot_row_version: 1,
      next_snapshot: prematureSuccessorValid,
      persisted_at: "2026-04-27T16:02:31Z",
    }),
  ).rejects.toThrow("SNAPSHOT_CURRENT_COLLISION");
  const storedSuperseded = await repository.compareAndSwapSnapshot({
    expected_snapshot_row_version: 2,
    next_snapshot: superseded,
    persisted_at: "2026-04-27T16:03:01Z",
    transition: {
      event_code: "snapshot_superseded",
      from_lifecycle_state: "VALID",
      to_lifecycle_state: "SUPERSEDED",
      transition_audit_ref: "audit://snapshot/integration/superseded",
      transitioned_at: "2026-04-27T16:03:00Z",
    },
  });
  await validatePayloadAgainstSchema("snapshot.schema.json", storedSuperseded.snapshot);

  const successorValid = transitionSnapshot({
    event_code: "snapshot_validation_passed",
    snapshot: successor,
    transitioned_at: "2026-04-27T16:04:00Z",
    transition_audit_ref: "audit://snapshot/integration/successor-valid",
  });
  await repository.compareAndSwapSnapshot({
    expected_snapshot_row_version: 1,
    next_snapshot: successorValid,
    persisted_at: "2026-04-27T16:04:01Z",
  });

  await expect(repository.listSnapshotsByLifecycleState("SUPERSEDED")).resolves.toHaveLength(1);
  await expect(repository.listSnapshotVersions(built.snapshot_id)).resolves.toHaveLength(3);
  await expect(repository.listTransitions(built.snapshot_id)).resolves.toHaveLength(2);
});

test("snapshot retention limitation and erasure remain schema-valid and compare-and-swap guarded", async () => {
  const manifestId = "manifest-0118-retention";
  const repository = new SnapshotRepository();
  const built = await buildSnapshot({
    built_at: "2026-04-27T16:10:00Z",
    manifest_id: manifestId,
    persisted_at: "2026-04-27T16:10:01Z",
    repository,
    set_bindings: setBindings(manifestId, "retention"),
  });
  const valid = transitionSnapshot({
    event_code: "snapshot_validation_passed",
    snapshot: built,
    transitioned_at: "2026-04-27T16:11:00Z",
    transition_audit_ref: "audit://snapshot/retention/valid",
  });
  await repository.compareAndSwapSnapshot({
    expected_snapshot_row_version: 1,
    next_snapshot: valid,
    persisted_at: "2026-04-27T16:11:01Z",
  });
  await expect(
    repository.compareAndSwapSnapshot({
      expected_snapshot_row_version: 1,
      next_snapshot: valid,
      persisted_at: "2026-04-27T16:11:02Z",
    }),
  ).rejects.toThrow("SNAPSHOT_COMPARE_AND_SWAP_CONFLICT");

  const retentionLimited = transitionSnapshot({
    event_code: "snapshot_retention_limited",
    retention_limitation_ref: "retention-limitation://snapshot/integration",
    snapshot: valid,
    transitioned_at: "2026-04-27T16:12:00Z",
    transition_audit_ref: "audit://snapshot/retention/limited",
  });
  const storedLimited = await repository.compareAndSwapSnapshot({
    expected_snapshot_row_version: 2,
    next_snapshot: retentionLimited,
    persisted_at: "2026-04-27T16:12:01Z",
  });
  await validatePayloadAgainstSchema("snapshot.schema.json", storedLimited.snapshot);

  const erased = transitionSnapshot({
    erasure_proof_ref: "erasure-proof://snapshot/integration",
    event_code: "erasure_complete",
    snapshot: storedLimited.snapshot,
    transitioned_at: "2026-04-27T16:13:00Z",
    transition_audit_ref: "audit://snapshot/retention/erased",
  });
  const storedErased = await repository.compareAndSwapSnapshot({
    expected_snapshot_row_version: 3,
    next_snapshot: erased,
    persisted_at: "2026-04-27T16:13:01Z",
  });
  await validatePayloadAgainstSchema("snapshot.schema.json", storedErased.snapshot);
  expect(storedErased.snapshot.lifecycle_state).toBe("ERASED");
  expect(storedErased.snapshot.erasure_proof_ref_or_null).toBe(
    "erasure-proof://snapshot/integration",
  );
});

test("schema-invalid snapshot payloads do not leave partial repository writes", async () => {
  const manifestId = "manifest-0118-no-partial";
  const repository = new SnapshotRepository();
  const built = await buildSnapshot({
    built_at: "2026-04-27T16:20:00Z",
    manifest_id: manifestId,
    set_bindings: setBindings(manifestId, "bad-source"),
  });
  const badPayload = {
    ...built,
    quality: undefined,
    snapshot_id: "snapshot.bad-schema-0118",
  };

  await expect(
    repository.persistSnapshot({
      persisted_at: "2026-04-27T16:20:01Z",
      snapshot: badPayload as never,
    }),
  ).rejects.toThrow();
  await expect(repository.getSnapshotById("snapshot.bad-schema-0118")).resolves.toBeNull();
});
