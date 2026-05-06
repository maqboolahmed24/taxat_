import { execFile } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

import { expect, test } from "@playwright/test";

import {
  RunManifestRepository,
  buildRunManifestStartClaimContract,
  computeRequestIdentityHash,
  decideManifestReuseStrategy,
  loadAndValidatePriorManifestContext,
  requestIdentityFromManifest,
  type ManifestRequestIdentityInput,
  type RunManifestRecord,
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

function withRequestIdentity(
  manifest: RunManifestRecord,
  request: ManifestRequestIdentityInput = requestIdentityFromManifest(manifest),
) {
  const identity = computeRequestIdentityHash(request);
  return {
    ...manifest,
    manifest_branch_decision: {
      ...manifest.manifest_branch_decision,
      request_identity_hash: identity.hash,
      idempotency_key: request.idempotency_key,
      access_binding_hash: request.access_binding_hash,
      requested_scope: identity.vector.requested_scope,
      effective_scope: identity.vector.effective_scope,
      mode: request.mode,
      run_kind: request.run_kind,
      replay_class_or_null: identity.vector.replay_class_or_null,
      nightly_window_key_or_null: identity.vector.nightly_window_key_or_null,
    },
  };
}

function sealedManifest(overrides?: Partial<RunManifestRecord>) {
  const allocated = withRequestIdentity(buildBaseAllocatedManifest(overrides));
  const frozen = {
    ...allocated,
    lifecycle_state: "FROZEN" as const,
    frozen_at: "2026-04-25T10:10:00Z",
    ...buildFrozenBasis(allocated),
  };
  const { gates, evaluation } = buildSealReadyPresealEvaluation(frozen);
  return withRequestIdentity({
    ...frozen,
    lifecycle_state: "SEALED" as const,
    sealed_at: "2026-04-25T10:20:00Z",
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
  });
}

function completedManifest(overrides?: Partial<RunManifestRecord>) {
  const sealed = sealedManifest(overrides);
  const openedAt = "2026-04-25T10:25:00Z";
  const inProgress = {
    ...sealed,
    lifecycle_state: "IN_PROGRESS" as const,
    opened_at: openedAt,
    manifest_start_claim: buildStartedManifestClaim(sealed, openedAt),
  };
  const projection = buildCompletedOutcomeProjection(inProgress);
  return withRequestIdentity({
    ...inProgress,
    lifecycle_state: "COMPLETED" as const,
    completed_at: "2026-04-25T10:40:00Z",
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
  });
}

async function loadContext(repository: RunManifestRepository, manifest: RunManifestRecord, request = requestIdentityFromManifest(manifest)) {
  return loadAndValidatePriorManifestContext({
    run_manifest_repository: repository,
    prior_manifest_id: manifest.manifest_id,
    tenant_id: manifest.tenant_id,
    request,
  });
}

test("repository-backed strategy returns terminal result and reuses sealed pre-start context", async () => {
  const repository = new RunManifestRepository();
  const completed = completedManifest({
    manifest_id: "manifest.run.strategy.completed.0102",
    idempotency_key: "idempotency://manifest.run.strategy.completed.0102",
  });
  await repository.createManifest({
    manifest: completed,
    persisted_at: "2026-04-25T10:50:00Z",
  });

  const terminalStrategy = decideManifestReuseStrategy({
    candidate_manifest_id: "manifest.run.strategy.completed.child.0102",
    prior_context: await loadContext(repository, completed),
  });
  expect(terminalStrategy.selected_branch_action).toBe("RETURN_EXISTING_BUNDLE");
  await validatePayloadAgainstSchema(
    "manifest_branch_decision_contract.schema.json",
    terminalStrategy.branch_decision_contract,
  );

  const sealed = sealedManifest({
    manifest_id: "manifest.run.strategy.sealed.0102",
    idempotency_key: "idempotency://manifest.run.strategy.sealed.0102",
  });
  await repository.createManifest({
    manifest: sealed,
    persisted_at: "2026-04-25T11:00:00Z",
  });
  const sealedStrategy = decideManifestReuseStrategy({
    candidate_manifest_id: "manifest.run.strategy.sealed.child.0102",
    prior_context: await loadContext(repository, sealed),
  });
  expect(sealedStrategy.selected_branch_action).toBe("REUSE_SEALED_MANIFEST");
  await validatePayloadAgainstSchema(
    "manifest_branch_decision_contract.schema.json",
    sealedStrategy.branch_decision_contract,
  );
});

test("replay dedupe and stale-versus-active recovery are deterministic", async () => {
  const repository = new RunManifestRepository();
  const source = completedManifest({
    manifest_id: "manifest.run.strategy.replay-source.0102",
    idempotency_key: "idempotency://manifest.run.strategy.replay-source.0102",
  });
  await repository.createManifest({
    manifest: source,
    persisted_at: "2026-04-25T11:10:00Z",
  });
  const replayRequest = {
    ...requestIdentityFromManifest(source),
    idempotency_key: "idempotency://manifest.run.strategy.replay-source.0102/replay",
    run_kind: "REPLAY" as const,
    replay_class_or_null: "STANDARD_REPLAY" as const,
  };
  const replayStrategy = decideManifestReuseStrategy({
    candidate_manifest_id: "manifest.run.strategy.replay-child.0102",
    prior_context: await loadContext(repository, source, replayRequest),
  });
  expect(replayStrategy.selected_branch_action).toBe("REPLAY_CHILD");

  const replayChild = completedManifest({
    manifest_id: "manifest.run.strategy.replay-child.done.0102",
    idempotency_key: replayRequest.idempotency_key,
    run_kind: "REPLAY",
    replay_class: "STANDARD_REPLAY",
  });
  await repository.createManifest({
    manifest: withRequestIdentity(replayChild, requestIdentityFromManifest(replayChild)),
    persisted_at: "2026-04-25T11:20:00Z",
  });
  const replayDedupe = decideManifestReuseStrategy({
    candidate_manifest_id: "manifest.run.strategy.replay-child.duplicate.0102",
    prior_context: await loadContext(repository, replayChild, requestIdentityFromManifest(replayChild)),
  });
  expect(replayDedupe.selected_branch_action).toBe("RETURN_EXISTING_BUNDLE");

  const active = sealedManifest({
    manifest_id: "manifest.run.strategy.active.0102",
    idempotency_key: "idempotency://manifest.run.strategy.active.0102",
  });
  const activeStarted = withRequestIdentity({
    ...active,
    lifecycle_state: "IN_PROGRESS" as const,
    opened_at: "2026-04-25T11:30:00Z",
    manifest_start_claim: buildStartedManifestClaim(active, "2026-04-25T11:30:00Z"),
  });
  await repository.createManifest({
    manifest: activeStarted,
    persisted_at: "2026-04-25T11:30:00Z",
  });
  const activeStrategy = decideManifestReuseStrategy({
    candidate_manifest_id: "manifest.run.strategy.active.child.0102",
    prior_context: await loadContext(repository, activeStarted),
    recovery_requested: true,
  });
  expect(activeStrategy.decision_state).toBe("BLOCKED");

  const staleBase = sealedManifest({
    manifest_id: "manifest.run.strategy.stale.0102",
    idempotency_key: "idempotency://manifest.run.strategy.stale.0102",
  });
  const stale = withRequestIdentity({
    ...staleBase,
    lifecycle_state: "FAILED" as const,
    opened_at: "2026-04-25T11:35:00Z",
    manifest_start_claim: {
      ...buildStartedManifestClaim(staleBase, "2026-04-25T11:35:00Z"),
      claim_state: "STALE_RECLAIM_REQUIRED" as const,
      claim_status_code: "STALE_RECLAIM_REQUIRED" as const,
      stale_reclaim_reason_code_or_null: "LEASE_EXPIRED_OWNER_UNHEALTHY" as const,
    },
  });
  await repository.createManifest({
    manifest: stale,
    persisted_at: "2026-04-25T11:35:00Z",
  });
  const staleStrategy = decideManifestReuseStrategy({
    candidate_manifest_id: "manifest.run.strategy.stale.child.0102",
    prior_context: await loadContext(repository, stale),
    recovery_requested: true,
  });
  expect(staleStrategy.selected_branch_action).toBe("RECOVERY_CHILD");
});
