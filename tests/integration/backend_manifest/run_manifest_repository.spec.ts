import { execFile } from "node:child_process";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

import { expect, test } from "@playwright/test";

import {
  LoadManifestService,
  RunManifestMirrorValidationError,
  RunManifestRepository,
  RunManifestRepositoryError,
  TransitionManifestService,
} from "../../../packages/backend-manifest/src/index.ts";
import {
  buildBaseAllocatedManifest,
  buildCompletedOutcomeProjection,
  buildFrozenBasis,
  buildSealReadyPresealEvaluation,
  buildStartedManifestClaim,
  buildTerminalManifestClaim,
} from "../../fixtures/run_manifest_fixture.ts";

const execFileAsync = promisify(execFile);
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const migrationPath = path.join(
  repoRoot,
  "db",
  "migrations",
  "phase03_0097_run_manifest_core.sql",
);

async function validatePayloadAgainstSchema(schemaName: string, payload: unknown) {
  const script = `
import json
import pathlib
import sys

repo = pathlib.Path(sys.argv[1])
sys.path.insert(0, str(repo / "packages" / "contracts-core" / "python"))
from validate_contracts import (  # type: ignore
    CUSTOM_VALIDATORS,
    Draft202012Validator,
    build_registry,
    load_json,
)

schema_name = sys.argv[2]
payload = json.loads(sys.argv[3])
schema = load_json(repo / "packages" / "contracts-core" / "schemas" / schema_name)
validator = Draft202012Validator(
    schema,
    registry=build_registry(),
    format_checker=Draft202012Validator.FORMAT_CHECKER,
)
issues = [
    f"schema:<{'/'.join(map(str, error.absolute_path)) or '<root>'}>: {error.message}"
    for error in sorted(validator.iter_errors(payload), key=lambda error: list(error.absolute_path))
]
custom_validator = CUSTOM_VALIDATORS.get(schema_name.replace(".schema.json", ""))
if custom_validator:
    issues.extend(
        f"custom:{getattr(issue, 'location', 'inline')}: {getattr(issue, 'message', str(issue))}"
        for issue in custom_validator(payload, "inline")
    )
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

test("migration defines the manifest root row, structured output links, and transition log", async () => {
  const sql = await readFile(migrationPath, "utf8");

  expect(sql).toContain("CREATE TABLE IF NOT EXISTS control_manifest.run_manifest_register");
  expect(sql).toContain(
    "CREATE TABLE IF NOT EXISTS control_manifest.run_manifest_output_link_register",
  );
  expect(sql).toContain(
    "CREATE TABLE IF NOT EXISTS control_manifest.run_manifest_transition_log",
  );
  expect(sql).toContain("manifest_row_version integer NOT NULL DEFAULT 1");
  expect(sql).toContain("CREATE UNIQUE INDEX IF NOT EXISTS run_manifest_tenant_idempotency_key");
  expect(sql).toContain("ENABLE ROW LEVEL SECURITY");
  expect(sql).toContain("control_support.require_tenant_context()");
});

test("repository stores, transitions, validates, and reloads structured output links without drift", async () => {
  const repository = new RunManifestRepository();
  const loader = new LoadManifestService({
    runManifestRepository: repository,
  });
  const transitionService = new TransitionManifestService({
    runManifestRepository: repository,
  });

  const allocated = buildBaseAllocatedManifest();
  const created = await repository.createManifest({
    manifest: allocated,
    persisted_at: "2026-04-23T09:00:00Z",
  });
  expect(created.manifest.access_binding_hash).toBe(
    created.manifest.scope_execution_binding.access_binding_hash,
  );

  const frozenBasis = buildFrozenBasis(allocated);
  const frozen = await transitionService.transition({
    tenant_id: allocated.tenant_id,
    manifest_id: allocated.manifest_id,
    expected_manifest_row_version: created.manifest_row_version,
    event_code: "freeze_success",
    persisted_at: "2026-04-23T09:10:00Z",
    transition_audit_ref: `audit://${allocated.manifest_id}/freeze-success`,
    transition_reason_code: "FREEZE_SUCCESS",
    mutate: (manifest) => ({
      ...manifest,
      frozen_at: "2026-04-23T09:10:00Z",
      ...frozenBasis,
    }),
  });
  await validatePayloadAgainstSchema("run_manifest.schema.json", frozen.manifest);
  expect(frozen.manifest.preseal_gate_evaluation?.completion_state).toBe(
    "PENDING_PREREQUISITES",
  );

  const { gates, evaluation } = buildSealReadyPresealEvaluation(frozen.manifest);
  const sealed = await transitionService.transition({
    tenant_id: allocated.tenant_id,
    manifest_id: allocated.manifest_id,
    expected_manifest_row_version: frozen.manifest_row_version,
    event_code: "seal_success",
    persisted_at: "2026-04-23T09:20:00Z",
    transition_audit_ref: `audit://${allocated.manifest_id}/seal-success`,
    transition_reason_code: "SEAL_SUCCESS",
    mutate: (manifest) => ({
      ...manifest,
      sealed_at: "2026-04-23T09:20:00Z",
      preseal_gate_evaluation: evaluation,
      append_only_outcome_projection: {
        ...manifest.append_only_outcome_projection!,
        gating_decisions: gates,
      },
      gating_decisions: gates,
      manifest_start_claim: null,
    }),
  });
  await validatePayloadAgainstSchema("run_manifest.schema.json", sealed.manifest);
  expect(sealed.manifest.manifest_start_claim?.claim_state).toBe("UNCLAIMED_SEALED");

  const openedAt = "2026-04-23T09:25:00Z";
  const inProgress = await transitionService.transition({
    tenant_id: allocated.tenant_id,
    manifest_id: allocated.manifest_id,
    expected_manifest_row_version: sealed.manifest_row_version,
    event_code: "run_started",
    persisted_at: openedAt,
    transition_audit_ref: `audit://${allocated.manifest_id}/run-started`,
    transition_reason_code: "RUN_STARTED",
    mutate: (manifest) => ({
      ...manifest,
      opened_at: openedAt,
      manifest_start_claim: buildStartedManifestClaim(
        {
          ...manifest,
          hash_set: manifest.hash_set!,
        },
        openedAt,
      ),
    }),
  });
  await validatePayloadAgainstSchema("run_manifest.schema.json", inProgress.manifest);

  const outcomeProjection = buildCompletedOutcomeProjection(inProgress.manifest);
  const completed = await transitionService.transition({
    tenant_id: allocated.tenant_id,
    manifest_id: allocated.manifest_id,
    expected_manifest_row_version: inProgress.manifest_row_version,
    event_code: "run_completed",
    persisted_at: "2026-04-23T09:40:00Z",
    transition_audit_ref: `audit://${allocated.manifest_id}/run-completed`,
    transition_reason_code: "RUN_COMPLETED",
    mutate: (manifest) => ({
      ...manifest,
      completed_at: "2026-04-23T09:40:00Z",
      append_only_outcome_projection: outcomeProjection,
      manifest_start_claim: buildTerminalManifestClaim(
        {
          ...manifest,
          hash_set: manifest.hash_set!,
        },
        openedAt,
        "COMPLETED",
      ),
    }),
  });
  await validatePayloadAgainstSchema("run_manifest.schema.json", completed.manifest);

  const reloaded = await loader.requireById(allocated.tenant_id, allocated.manifest_id);
  expect(reloaded.manifest.output_refs.decision_bundle.artifact_type).toBe("DecisionBundle");
  expect(
    reloaded.manifest.output_refs.decision_bundle.dependency_identity_refs,
  ).toEqual([`dependency://${allocated.manifest_id}/decision-bundle`]);
  expect(reloaded.manifest.decision_bundle_hash).toBe(
    `decision-bundle-hash://${allocated.manifest_id}`,
  );
  expect(
    await repository.listTransitions(allocated.tenant_id, allocated.manifest_id),
  ).toHaveLength(4);
});

test("repository compare-and-swap rejects stale transition attempts", async () => {
  const repository = new RunManifestRepository();
  const transitionService = new TransitionManifestService({
    runManifestRepository: repository,
  });
  const allocated = buildBaseAllocatedManifest({
    manifest_id: "manifest.run.cas.0097",
    idempotency_key: "idempotency://manifest.run.cas.0097",
  });

  const created = await repository.createManifest({
    manifest: allocated,
    persisted_at: "2026-04-23T10:00:00Z",
  });
  const frozenBasis = buildFrozenBasis(allocated);

  await transitionService.transition({
    tenant_id: allocated.tenant_id,
    manifest_id: allocated.manifest_id,
    expected_manifest_row_version: created.manifest_row_version,
    event_code: "freeze_success",
    persisted_at: "2026-04-23T10:10:00Z",
    transition_audit_ref: `audit://${allocated.manifest_id}/freeze-success`,
    transition_reason_code: "FREEZE_SUCCESS",
    mutate: (manifest) => ({
      ...manifest,
      frozen_at: "2026-04-23T10:10:00Z",
      ...frozenBasis,
    }),
  });

  await expect(
    transitionService.transition({
      tenant_id: allocated.tenant_id,
      manifest_id: allocated.manifest_id,
      expected_manifest_row_version: created.manifest_row_version,
      event_code: "seal_success",
      persisted_at: "2026-04-23T10:20:00Z",
      transition_audit_ref: `audit://${allocated.manifest_id}/seal-success`,
      transition_reason_code: "SEAL_SUCCESS",
      mutate: (manifest) => {
        const { gates, evaluation } = buildSealReadyPresealEvaluation(manifest);
        return {
          ...manifest,
          sealed_at: "2026-04-23T10:20:00Z",
          preseal_gate_evaluation: evaluation,
          append_only_outcome_projection: {
            ...manifest.append_only_outcome_projection!,
            gating_decisions: gates,
          },
          gating_decisions: gates,
          manifest_start_claim: null,
        };
      },
    }),
  ).rejects.toThrow(RunManifestRepositoryError);
});

test("corrupted stored lineage mirrors fail closed on reload", async () => {
  const repository = new RunManifestRepository();
  const loader = new LoadManifestService({
    runManifestRepository: repository,
  });
  const allocated = buildBaseAllocatedManifest({
    manifest_id: "manifest.run.corrupt.0097",
    idempotency_key: "idempotency://manifest.run.corrupt.0097",
  });

  await repository.createManifest({
    manifest: allocated,
    persisted_at: "2026-04-23T11:00:00Z",
  });

  await repository.unsafeCorruptManifestForTesting({
    manifest_id: allocated.manifest_id,
    mutate: (manifest) => ({
      ...manifest,
      root_manifest_id: "manifest.run.corrupt.other-root",
    }),
  });

  await expect(loader.requireById(allocated.tenant_id, allocated.manifest_id)).rejects.toThrow(
    RunManifestMirrorValidationError,
  );
});
