import { execFile } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

import { expect, test } from "@playwright/test";

import {
  RunManifestRepository,
  UpdateManifestPresealContextError,
  buildRunManifestStartClaimContract,
  updateManifestPresealContext,
  type RunManifestRecord,
} from "../../../packages/backend-manifest/src/index.ts";
import {
  buildBaseAllocatedManifest,
  buildFrozenBasis,
  buildSealReadyPresealEvaluation,
} from "../../fixtures/run_manifest_fixture.ts";

const execFileAsync = promisify(execFile);
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..");

type FrozenBasisFixture = ReturnType<typeof buildFrozenBasis>;

function configFreezeForPatch(
  basis: FrozenBasisFixture,
): NonNullable<RunManifestRecord["config_freeze"]> {
  return basis.config_freeze as unknown as NonNullable<RunManifestRecord["config_freeze"]>;
}

function inputFreezeForPatch(
  basis: FrozenBasisFixture,
): NonNullable<RunManifestRecord["input_freeze"]> {
  return basis.input_freeze as unknown as NonNullable<RunManifestRecord["input_freeze"]>;
}

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

function sealedManifest(overrides?: Partial<RunManifestRecord>): RunManifestRecord {
  const allocated = buildBaseAllocatedManifest(overrides);
  const basis = buildFrozenBasis(allocated);
  const frozen = {
    ...allocated,
    lifecycle_state: "FROZEN" as const,
    frozen_at: "2026-04-27T09:10:00Z",
    ...basis,
  } as unknown as RunManifestRecord;
  const { gates, evaluation } = buildSealReadyPresealEvaluation(frozen);
  return {
    ...frozen,
    lifecycle_state: "SEALED" as const,
    sealed_at: "2026-04-27T09:20:00Z",
    preseal_gate_evaluation: evaluation,
    append_only_outcome_projection: {
      ...frozen.append_only_outcome_projection!,
      gating_decisions: gates,
    },
    gating_decisions: gates,
    manifest_start_claim: buildRunManifestStartClaimContract({
      manifest_id: frozen.manifest_id,
      manifest_hash: frozen.hash_set!.manifest_hash,
      execution_basis_hash: frozen.hash_set!.execution_basis_hash,
      access_binding_hash: frozen.access_binding_hash,
      claim_state: "UNCLAIMED_SEALED",
    }),
  } as RunManifestRecord;
}

test("preseal context patch atomically persists frozen binding and hash mirrors", async () => {
  const repository = new RunManifestRepository();
  const manifest = buildBaseAllocatedManifest({
    manifest_id: "manifest.run.atomic-preseal.0104",
    idempotency_key: "idempotency://manifest.run.atomic-preseal.0104",
  });
  const created = await repository.createManifest({
    manifest,
    persisted_at: "2026-04-27T09:00:00Z",
  });
  const basis = buildFrozenBasis(manifest);

  const updated = await updateManifestPresealContext({
    run_manifest_repository: repository,
    tenant_id: manifest.tenant_id,
    manifest_id: manifest.manifest_id,
    expected_manifest_row_version: created.manifest_row_version,
    persisted_at: "2026-04-27T09:05:00Z",
    patch: {
      config_freeze: configFreezeForPatch(basis),
      input_freeze: inputFreezeForPatch(basis),
    },
  });

  expect(updated.stored_manifest.manifest_row_version).toBe(created.manifest_row_version + 1);
  expect(updated.manifest.hash_set?.execution_basis_hash).toBe(
    basis.hash_set.execution_basis_hash,
  );
  expect(updated.manifest.frozen_execution_binding?.execution_basis_hash).toBe(
    updated.manifest.hash_set?.execution_basis_hash,
  );
  expect(updated.manifest.frozen_execution_binding?.scope_execution_binding.requested_scope).toEqual(
    updated.manifest.scope_execution_binding.requested_scope,
  );
  await validatePayloadAgainstSchema("run_manifest.schema.json", updated.manifest);
  await validatePayloadAgainstSchema(
    "scope_execution_binding.schema.json",
    updated.manifest.frozen_execution_binding?.scope_execution_binding,
  );
});

test("partial freeze patch rejects without leaving a half-frozen manifest", async () => {
  const repository = new RunManifestRepository();
  const manifest = buildBaseAllocatedManifest({
    manifest_id: "manifest.run.partial-preseal.0104",
    idempotency_key: "idempotency://manifest.run.partial-preseal.0104",
  });
  const created = await repository.createManifest({
    manifest,
    persisted_at: "2026-04-27T10:00:00Z",
  });
  const basis = buildFrozenBasis(manifest);

  await expect(
    updateManifestPresealContext({
      run_manifest_repository: repository,
      tenant_id: manifest.tenant_id,
      manifest_id: manifest.manifest_id,
      expected_manifest_row_version: created.manifest_row_version,
      persisted_at: "2026-04-27T10:05:00Z",
      patch: {
        config_freeze: configFreezeForPatch(basis),
      },
    }),
  ).rejects.toThrow(UpdateManifestPresealContextError);

  const reloaded = await repository.requireManifestById(manifest.tenant_id, manifest.manifest_id);
  expect(reloaded.manifest.config_freeze ?? null).toBeNull();
  expect(reloaded.manifest.hash_set ?? null).toBeNull();
  expect(reloaded.manifest.frozen_execution_binding ?? null).toBeNull();
});

test("sealed manifests cannot be rewritten through preseal update", async () => {
  const repository = new RunManifestRepository();
  const sealed = sealedManifest({
    manifest_id: "manifest.run.sealed-preseal.0104",
    idempotency_key: "idempotency://manifest.run.sealed-preseal.0104",
  });
  const created = await repository.createManifest({
    manifest: sealed,
    persisted_at: "2026-04-27T11:00:00Z",
  });

  await expect(
    updateManifestPresealContext({
      run_manifest_repository: repository,
      tenant_id: sealed.tenant_id,
      manifest_id: sealed.manifest_id,
      expected_manifest_row_version: created.manifest_row_version,
      persisted_at: "2026-04-27T11:05:00Z",
      patch: {
        preseal_gate_evaluation: null,
      },
    }),
  ).rejects.toThrow(UpdateManifestPresealContextError);

  const reloaded = await repository.requireManifestById(sealed.tenant_id, sealed.manifest_id);
  expect(reloaded.manifest.preseal_gate_evaluation).not.toBeNull();
  expect(reloaded.manifest.sealed_at).toBe("2026-04-27T09:20:00Z");
});
