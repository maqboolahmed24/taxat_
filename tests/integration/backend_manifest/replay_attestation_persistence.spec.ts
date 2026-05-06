import { execFile } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

import { expect, test } from "@playwright/test";

import {
  beginChildManifest,
  buildReplayAttestation,
  buildReplayBasisDimensionResults,
  buildReplayOutcomeComponentResults,
  computeDeterministicOutcomeHash,
  type MaterialOutcomeComponentInput,
  OUTCOME_COMPONENT_CLASSES,
  persistReplayAttestation,
  REPLAY_BASIS_DIMENSION_CODES,
  ReplayAttestationRepository,
  type RunManifestRecord,
  RunManifestRepository,
} from "../../../packages/backend-manifest/src/index.ts";
import {
  buildBaseAllocatedManifest,
  buildCompletedOutcomeProjection,
  buildFrozenBasis,
  buildRunManifestScopeBinding,
  buildSealReadyPresealEvaluation,
  buildStartedManifestClaim,
  buildTerminalManifestClaim,
} from "../../fixtures/run_manifest_fixture.ts";

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

function completedManifest(overrides?: Partial<RunManifestRecord>) {
  const allocated = buildBaseAllocatedManifest(overrides);
  const frozen = {
    ...allocated,
    lifecycle_state: "FROZEN" as const,
    frozen_at: "2026-04-27T14:10:00Z",
    ...buildFrozenBasis(allocated),
  };
  const { gates, evaluation } = buildSealReadyPresealEvaluation(frozen);
  const sealed = {
    ...frozen,
    lifecycle_state: "SEALED" as const,
    sealed_at: "2026-04-27T14:20:00Z",
    preseal_gate_evaluation: evaluation,
    append_only_outcome_projection: {
      ...frozen.append_only_outcome_projection!,
      gating_decisions: gates,
    },
    gating_decisions: gates,
  } as RunManifestRecord;
  const openedAt = "2026-04-27T14:25:00Z";
  const inProgress = {
    ...sealed,
    lifecycle_state: "IN_PROGRESS" as const,
    opened_at: openedAt,
    manifest_start_claim: buildStartedManifestClaim(sealed, openedAt),
  };
  const projection = buildCompletedOutcomeProjection(inProgress);
  return {
    ...inProgress,
    lifecycle_state: "COMPLETED" as const,
    completed_at: "2026-04-27T14:40:00Z",
    append_only_outcome_projection: projection,
    gating_decisions: projection.gating_decisions,
    output_refs: projection.output_refs,
    audit_refs: projection.audit_refs,
    submission_refs: projection.submission_refs,
    drift_refs: projection.drift_refs,
    decision_bundle_hash: projection.decision_bundle_hash,
    deterministic_outcome_hash: projection.deterministic_outcome_hash,
    replay_attestation_ref: projection.replay_attestation_ref,
    manifest_start_claim: buildTerminalManifestClaim(inProgress, openedAt, "COMPLETED"),
  } as RunManifestRecord;
}

function replayTemplate(input: { manifest_id: string; source: RunManifestRecord }) {
  return buildBaseAllocatedManifest({
    idempotency_key: `idempotency://${input.manifest_id}`,
    manifest_id: input.manifest_id,
    replay_class: "STANDARD_REPLAY",
    run_kind: "REPLAY",
    scope_execution_binding: buildRunManifestScopeBinding({
      access_binding_hash: `authorization-decision-access-binding-hash://${input.manifest_id}`,
      mode: "COMPLIANCE",
      scope: input.source.requested_scope,
    }),
  });
}

async function prepareReplayChildForAttestation(input: {
  repository: RunManifestRepository;
  replay_child: Awaited<ReturnType<RunManifestRepository["createManifest"]>>;
}) {
  const frozenBasis = buildFrozenBasis(input.replay_child.manifest);
  const frozen = {
    ...input.replay_child.manifest,
    lifecycle_state: "FROZEN" as const,
    frozen_at: "2026-04-27T14:52:00Z",
    ...frozenBasis,
  } as RunManifestRecord;
  const { gates, evaluation } = buildSealReadyPresealEvaluation(frozen);
  const openedAt = "2026-04-27T14:55:00Z";
  const inProgress = {
    ...frozen,
    lifecycle_state: "IN_PROGRESS" as const,
    sealed_at: "2026-04-27T14:54:00Z",
    opened_at: openedAt,
    preseal_gate_evaluation: evaluation,
    append_only_outcome_projection: {
      ...frozen.append_only_outcome_projection!,
      gating_decisions: gates,
    },
    gating_decisions: gates,
    manifest_start_claim: buildStartedManifestClaim(frozen, openedAt),
  } as RunManifestRecord;

  return input.repository.compareAndSwapManifest({
    expected_manifest_row_version: input.replay_child.manifest_row_version,
    next_manifest: inProgress,
    persisted_at: "2026-04-27T14:55:00Z",
  });
}

function fullOutcomeSurface(seed: string) {
  return OUTCOME_COMPONENT_CLASSES.map((componentClass, index) => ({
    component_class: componentClass,
    component_ref: `artifact://${seed}/${componentClass.toLowerCase().replaceAll("_", "-")}`,
    payload: {
      artifact_hash: `artifact-hash://${seed}/${componentClass}`,
      component_class: componentClass,
      ordinal: index + 1,
    },
  })) satisfies MaterialOutcomeComponentInput[];
}

function basisRows(source: RunManifestRecord) {
  const hashes = Object.fromEntries(
    REPLAY_BASIS_DIMENSION_CODES.map((dimension) => [
      dimension,
      dimension === "CONFIG"
        ? source.config_freeze!.config_surface_hash
        : dimension === "INPUT"
          ? source.input_freeze!.input_set_hash
          : dimension === "POST_SEAL"
            ? source.append_only_outcome_projection!.post_seal_basis.post_seal_basis_hash
            : `basis-hash://${source.manifest_id}/${dimension}`,
    ]),
  );

  return buildReplayBasisDimensionResults({
    actual_hashes: hashes,
    expected_hashes: hashes,
  });
}

function exactReplayAttestation(input: {
  manifest_id: string;
  replay_of_manifest: RunManifestRecord;
}) {
  const outcome = computeDeterministicOutcomeHash({
    components: fullOutcomeSurface(input.replay_of_manifest.manifest_id),
  });
  const comparison = buildReplayOutcomeComponentResults({
    actual: outcome.normalized_components,
    expected: outcome.normalized_components,
  });

  return buildReplayAttestation({
    actual_deterministic_outcome_hash: outcome.deterministic_outcome_hash,
    actual_execution_basis_hash: input.replay_of_manifest.hash_set!.execution_basis_hash,
    basis_dimension_results: basisRows(input.replay_of_manifest),
    basis_validation_state: "VALID",
    compared_at: "2026-04-27T15:00:00Z",
    expected_deterministic_outcome_hash: outcome.deterministic_outcome_hash,
    expected_execution_basis_hash: input.replay_of_manifest.hash_set!.execution_basis_hash,
    manifest_id: input.manifest_id,
    mismatch_inventory: comparison.mismatch_inventory,
    outcome_component_results: comparison.outcome_component_results,
    replay_class: "STANDARD_REPLAY",
    replay_of_manifest_id: input.replay_of_manifest.manifest_id,
  });
}

function canExposeReplayPosture(manifest: RunManifestRecord) {
  return (
    manifest.run_kind === "REPLAY" &&
    manifest.deterministic_outcome_hash !== null &&
    manifest.replay_attestation_ref !== null
  );
}

test("replay attestation persists and synchronizes replay manifest outcome mirrors", async () => {
  const runManifestRepository = new RunManifestRepository();
  const replayAttestationRepository = new ReplayAttestationRepository();
  const source = completedManifest({
    idempotency_key: "idempotency://manifest.run.replay-source.0107",
    manifest_id: "manifest.run.replay-source.0107",
  });
  await runManifestRepository.createManifest({
    manifest: source,
    persisted_at: "2026-04-27T14:45:00Z",
  });

  const child = beginChildManifest({
    continuation_basis: "REPLAY_CHILD",
    manifest: replayTemplate({
      manifest_id: "manifest.run.replay-child.0107",
      source,
    }),
    parent_manifest: source,
  });
  const childAllocated = await runManifestRepository.createManifest({
    manifest: child.manifest,
    persisted_at: "2026-04-27T14:50:00Z",
  });
  const childStored = await prepareReplayChildForAttestation({
    replay_child: childAllocated,
    repository: runManifestRepository,
  });
  expect(canExposeReplayPosture(childStored.manifest)).toBe(false);

  const attestation = exactReplayAttestation({
    manifest_id: childStored.manifest.manifest_id,
    replay_of_manifest: source,
  });
  await validatePayloadAgainstSchema("replay_attestation.schema.json", attestation);

  const persisted = await persistReplayAttestation({
    attestation,
    decision_bundle_hash: `decision-bundle-hash://${childStored.manifest.manifest_id}`,
    decision_bundle_ref: `decision-bundle://${childStored.manifest.manifest_id}`,
    expected_manifest_row_version: childStored.manifest_row_version,
    persisted_at: "2026-04-27T15:01:00Z",
    replay_attestation_repository: replayAttestationRepository,
    run_manifest_repository: runManifestRepository,
    tenant_id: childStored.manifest.tenant_id,
  });

  expect(canExposeReplayPosture(persisted.manifest)).toBe(true);
  expect(persisted.manifest.deterministic_outcome_hash).toBe(
    attestation.actual_deterministic_outcome_hash,
  );
  expect(persisted.manifest.replay_attestation_ref).toBe(attestation.replay_attestation_id);
  expect(persisted.manifest.output_refs.replay_attestation.linkage_role_code).toBe(
    "REPLAY_ATTESTATION",
  );
  expect(persisted.manifest.output_refs.decision_bundle.artifact_hash_or_null).toBe(
    `decision-bundle-hash://${childStored.manifest.manifest_id}`,
  );
  await validatePayloadAgainstSchema("run_manifest.schema.json", persisted.manifest);

  const reloadedAttestation = await replayAttestationRepository.getReplayAttestationById(
    attestation.replay_attestation_id,
  );
  expect(reloadedAttestation?.contract.artifact_content_hash).toBe(
    attestation.contract.artifact_content_hash,
  );
});

test("replay attestation persistence rejects stale rows and missing actual outcome hash", async () => {
  const runManifestRepository = new RunManifestRepository();
  const replayAttestationRepository = new ReplayAttestationRepository();
  const source = completedManifest({
    idempotency_key: "idempotency://manifest.run.replay-source-stale.0107",
    manifest_id: "manifest.run.replay-source-stale.0107",
  });
  await runManifestRepository.createManifest({
    manifest: source,
    persisted_at: "2026-04-27T15:10:00Z",
  });
  const child = beginChildManifest({
    continuation_basis: "REPLAY_CHILD",
    manifest: replayTemplate({
      manifest_id: "manifest.run.replay-child-stale.0107",
      source,
    }),
    parent_manifest: source,
  });
  const childAllocated = await runManifestRepository.createManifest({
    manifest: child.manifest,
    persisted_at: "2026-04-27T15:11:00Z",
  });
  const childStored = await prepareReplayChildForAttestation({
    replay_child: childAllocated,
    repository: runManifestRepository,
  });
  const attestation = exactReplayAttestation({
    manifest_id: childStored.manifest.manifest_id,
    replay_of_manifest: source,
  });

  await expect(
    persistReplayAttestation({
      attestation: {
        ...attestation,
        actual_deterministic_outcome_hash: null,
      },
      decision_bundle_hash: `decision-bundle-hash://${childStored.manifest.manifest_id}`,
      expected_manifest_row_version: childStored.manifest_row_version,
      persisted_at: "2026-04-27T15:12:00Z",
      replay_attestation_repository: replayAttestationRepository,
      run_manifest_repository: runManifestRepository,
      tenant_id: childStored.manifest.tenant_id,
    }),
  ).rejects.toThrow("actual_deterministic_outcome_hash");

  const persisted = await persistReplayAttestation({
    attestation,
    decision_bundle_hash: `decision-bundle-hash://${childStored.manifest.manifest_id}`,
    expected_manifest_row_version: childStored.manifest_row_version,
    persisted_at: "2026-04-27T15:13:00Z",
    replay_attestation_repository: replayAttestationRepository,
    run_manifest_repository: runManifestRepository,
    tenant_id: childStored.manifest.tenant_id,
  });

  await expect(
    persistReplayAttestation({
      attestation,
      decision_bundle_hash: `decision-bundle-hash://${childStored.manifest.manifest_id}`,
      expected_manifest_row_version: childStored.manifest_row_version,
      persisted_at: "2026-04-27T15:14:00Z",
      replay_attestation_repository: replayAttestationRepository,
      run_manifest_repository: runManifestRepository,
      tenant_id: childStored.manifest.tenant_id,
    }),
  ).rejects.toThrow("row version is stale");
  expect(persisted.manifest_row_version).toBe(childStored.manifest_row_version + 1);
});
