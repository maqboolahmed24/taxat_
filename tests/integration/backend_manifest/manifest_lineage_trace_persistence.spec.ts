import { execFile } from "node:child_process";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

import { expect, test } from "@playwright/test";

import {
  buildManifestBranchDecisionContract,
  buildManifestLineageTrace,
  buildRunManifestStartClaimContract,
  type ManifestBranchAction,
  ManifestLineageTraceRepository,
  RunManifestMirrorValidationError,
  RunManifestRepository,
} from "../../../packages/backend-manifest/src/index.ts";
import type { ManifestLineageTraceCandidateEvaluation } from "../../../packages/generated-models/src/generated/typescript/manifest-and-release.ts";
import { buildBaseAllocatedManifest } from "../../fixtures/run_manifest_fixture.ts";

const execFileAsync = promisify(execFile);
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const migrationPath = path.join(
  repoRoot,
  "db",
  "migrations",
  "phase03_0098_manifest_lineage_trace.sql",
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

function candidateEvaluations(
  selectedAction: ManifestBranchAction,
): ManifestLineageTraceCandidateEvaluation[] {
  return [
    {
      candidate_action: "NEW_MANIFEST",
      evaluation_state: selectedAction === "NEW_MANIFEST" ? "SELECTED" : "REJECTED",
      compared_manifest_id_or_null: null,
      compared_manifest_hash_or_null: null,
      compared_manifest_lifecycle_state_or_null: null,
      disqualifier_reason_codes:
        selectedAction === "NEW_MANIFEST" ? [] : ["CHILD_ALLOCATION_NOT_REQUIRED"],
    },
    {
      candidate_action: "RETURN_EXISTING_BUNDLE",
      evaluation_state: selectedAction === "RETURN_EXISTING_BUNDLE" ? "SELECTED" : "REJECTED",
      compared_manifest_id_or_null: "manifest.run.return.integration",
      compared_manifest_hash_or_null: "manifest-hash://return.integration",
      compared_manifest_lifecycle_state_or_null: "COMPLETED",
      disqualifier_reason_codes:
        selectedAction === "RETURN_EXISTING_BUNDLE" ? [] : ["RETURNED_BUNDLE_NOT_AVAILABLE"],
    },
    {
      candidate_action: "REUSE_SEALED_MANIFEST",
      evaluation_state: selectedAction === "REUSE_SEALED_MANIFEST" ? "SELECTED" : "REJECTED",
      compared_manifest_id_or_null: "manifest.run.return.integration",
      compared_manifest_hash_or_null: "manifest-hash://return.integration",
      compared_manifest_lifecycle_state_or_null: "COMPLETED",
      disqualifier_reason_codes:
        selectedAction === "REUSE_SEALED_MANIFEST"
          ? []
          : ["PRIOR_MANIFEST_NOT_SEALED", "PRIOR_MANIFEST_ALREADY_STARTED"],
    },
    {
      candidate_action: "REPLAY_CHILD",
      evaluation_state: selectedAction === "REPLAY_CHILD" ? "SELECTED" : "REJECTED",
      compared_manifest_id_or_null: "manifest.run.return.integration",
      compared_manifest_hash_or_null: "manifest-hash://return.integration",
      compared_manifest_lifecycle_state_or_null: "COMPLETED",
      disqualifier_reason_codes:
        selectedAction === "REPLAY_CHILD" ? [] : ["REPLAY_CLASS_MISMATCH", "REPLAY_NOT_REQUESTED"],
    },
    {
      candidate_action: "RECOVERY_CHILD",
      evaluation_state: selectedAction === "RECOVERY_CHILD" ? "SELECTED" : "REJECTED",
      compared_manifest_id_or_null: "manifest.run.return.integration",
      compared_manifest_hash_or_null: "manifest-hash://return.integration",
      compared_manifest_lifecycle_state_or_null: "COMPLETED",
      disqualifier_reason_codes:
        selectedAction === "RECOVERY_CHILD" ? [] : ["RECOVERY_NOT_REQUIRED"],
    },
    {
      candidate_action: "CONTINUATION_CHILD",
      evaluation_state: selectedAction === "CONTINUATION_CHILD" ? "SELECTED" : "REJECTED",
      compared_manifest_id_or_null: "manifest.run.return.integration",
      compared_manifest_hash_or_null: "manifest-hash://return.integration",
      compared_manifest_lifecycle_state_or_null: "COMPLETED",
      disqualifier_reason_codes:
        selectedAction === "CONTINUATION_CHILD" ? [] : ["CONTINUATION_NOT_LEGAL"],
    },
    {
      candidate_action: "NEW_REQUEST_CHILD",
      evaluation_state: selectedAction === "NEW_REQUEST_CHILD" ? "SELECTED" : "REJECTED",
      compared_manifest_id_or_null: "manifest.run.return.integration",
      compared_manifest_hash_or_null: "manifest-hash://return.integration",
      compared_manifest_lifecycle_state_or_null: "COMPLETED",
      disqualifier_reason_codes:
        selectedAction === "NEW_REQUEST_CHILD"
          ? []
          : ["REQUEST_IDENTITY_CONTINUATION_NOT_REQUIRED"],
    },
  ];
}

function buildCompletedManifest() {
  const manifest = buildBaseAllocatedManifest({
    manifest_id: "manifest.run.return.integration",
    access_binding_hash: "access-binding-hash://manifest.run.return.integration",
    idempotency_key: "idempotency://manifest.run.return.integration",
    manifest_lineage_trace_refs: [
      "manifest-lineage-trace://manifest.run.return.integration/original",
    ],
  });
  return {
    ...manifest,
    lifecycle_state: "COMPLETED" as const,
    completed_at: "2026-04-24T11:00:00Z",
    decision_bundle_hash: "decision-bundle-hash://manifest.run.return.integration",
    manifest_start_claim: buildRunManifestStartClaimContract({
      access_binding_hash: manifest.access_binding_hash,
      claim_state: "TERMINAL_RESULT_RECORDED",
      execution_basis_hash: "execution-basis-hash://manifest.run.return.integration",
      manifest_hash: "manifest-hash://return.integration",
      manifest_id: manifest.manifest_id,
      claim_acquired_at_or_null: "2026-04-24T10:30:00Z",
      claim_released_at_or_null: "2026-04-24T11:00:00Z",
      claim_release_reason_code_or_null: "COMPLETED",
    }),
  };
}

function buildReturnTrace(selectedManifest = buildCompletedManifest()) {
  const branchDecision = buildManifestBranchDecisionContract({
    branch_action: "RETURN_EXISTING_BUNDLE",
    access_binding_hash: selectedManifest.access_binding_hash,
    idempotency_key: selectedManifest.idempotency_key,
    manifest_id: selectedManifest.manifest_id,
    mode: selectedManifest.mode,
    requested_scope: selectedManifest.requested_scope,
    run_kind: "NIGHTLY",
    nightly_window_key_or_null: "2026-W17",
    prior_manifest_id_or_null: selectedManifest.manifest_id,
    prior_manifest_hash_at_decision_or_null: "manifest-hash://return.integration",
    prior_manifest_lifecycle_state_or_null: "COMPLETED",
    request_identity_hash: "request-identity-hash://return.integration",
    returned_decision_bundle_hash_or_null: selectedManifest.decision_bundle_hash,
  });
  return buildManifestLineageTrace({
    selected_manifest: selectedManifest,
    request_branch_decision: branchDecision,
    candidate_evaluations: candidateEvaluations("RETURN_EXISTING_BUNDLE"),
    branch_decision_audit_refs: ["audit://manifest.run.return.integration/branch"],
    branch_decision_trace_span_refs: ["trace://manifest.run.return.integration/branch"],
  });
}

test("migration defines lineage trace rows, candidate evaluations, and selected-manifest links", async () => {
  const sql = await readFile(migrationPath, "utf8");

  expect(sql).toContain(
    "CREATE TABLE IF NOT EXISTS control_manifest.manifest_lineage_trace_register",
  );
  expect(sql).toContain(
    "CREATE TABLE IF NOT EXISTS control_manifest.manifest_lineage_trace_candidate_evaluation",
  );
  expect(sql).toContain(
    "CREATE TABLE IF NOT EXISTS control_manifest.manifest_lineage_trace_selected_manifest_link",
  );
  expect(sql).toContain("manifest_lineage_trace_request_identity_unique");
  expect(sql).toContain("ENABLE ROW LEVEL SECURITY");
  expect(sql).toContain("control_support.require_tenant_context()");
});

test("repository persists traces and appends selected-manifest refs without rewriting lineage truth", async () => {
  const runManifestRepository = new RunManifestRepository();
  const lineageTraceRepository = new ManifestLineageTraceRepository({
    runManifestRepository,
  });
  const selectedManifest = buildCompletedManifest();

  await runManifestRepository.createManifest({
    manifest: selectedManifest,
    persisted_at: "2026-04-24T11:00:00Z",
  });

  const trace = buildReturnTrace(selectedManifest);
  const stored = await lineageTraceRepository.persistTrace({
    tenant_id: selectedManifest.tenant_id,
    trace,
    persisted_at: "2026-04-24T11:05:00Z",
  });
  await validatePayloadAgainstSchema("manifest_lineage_trace.schema.json", stored.trace);

  const reloadedManifest = await runManifestRepository.requireManifestById(
    selectedManifest.tenant_id,
    selectedManifest.manifest_id,
  );
  expect(reloadedManifest.manifest.manifest_branch_decision.branch_action).toBe("NEW_MANIFEST");
  expect(stored.trace.selected_branch_action).toBe("RETURN_EXISTING_BUNDLE");
  expect(stored.trace.selected_manifest_continuation_basis).toBe("NEW_MANIFEST");
  expect(reloadedManifest.manifest.manifest_lineage_trace_refs).toEqual([
    "manifest-lineage-trace://manifest.run.return.integration/original",
    stored.lineage_trace_ref,
  ]);
  expect(stored.selected_manifest_row_version_after_append).toBe(
    stored.selected_manifest_row_version_before_append + 1,
  );

  const secondPersist = await lineageTraceRepository.persistTrace({
    tenant_id: selectedManifest.tenant_id,
    trace,
    persisted_at: "2026-04-24T11:06:00Z",
  });
  const afterDuplicate = await runManifestRepository.requireManifestById(
    selectedManifest.tenant_id,
    selectedManifest.manifest_id,
  );
  expect(secondPersist.lineage_trace_ref).toBe(stored.lineage_trace_ref);
  expect(afterDuplicate.manifest.manifest_lineage_trace_refs).toEqual(
    reloadedManifest.manifest.manifest_lineage_trace_refs,
  );
});

test("trace persistence rejects selected-manifest mirror drift", async () => {
  const runManifestRepository = new RunManifestRepository();
  const lineageTraceRepository = new ManifestLineageTraceRepository({
    runManifestRepository,
  });
  const selectedManifest = buildCompletedManifest();

  await runManifestRepository.createManifest({
    manifest: selectedManifest,
    persisted_at: "2026-04-24T11:00:00Z",
  });
  await runManifestRepository.unsafeCorruptManifestForTesting({
    manifest_id: selectedManifest.manifest_id,
    mutate: (manifest) => ({
      ...manifest,
      root_manifest_id: "manifest.run.return.integration.drift",
    }),
  });

  await expect(
    lineageTraceRepository.persistTrace({
      tenant_id: selectedManifest.tenant_id,
      trace: buildReturnTrace(selectedManifest),
      persisted_at: "2026-04-24T11:05:00Z",
    }),
  ).rejects.toThrow(RunManifestMirrorValidationError);
});
