import { execFile } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

import { expect, test } from "@playwright/test";

import {
  ManifestLineageTraceRepository,
  ManifestReuseRecoveryReplaySupersessionService,
  RunManifestRepository,
  buildManifestDecisionLineageTrace,
  buildRunManifestStartClaimContract,
  computeRequestIdentityHash,
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
    frozen_at: "2026-04-26T11:10:00Z",
    ...buildFrozenBasis(allocated),
  };
  const { gates, evaluation } = buildSealReadyPresealEvaluation(frozen);
  return withRequestIdentity({
    ...frozen,
    lifecycle_state: "SEALED" as const,
    sealed_at: "2026-04-26T11:20:00Z",
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
  const openedAt = "2026-04-26T11:25:00Z";
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
    completed_at: "2026-04-26T11:40:00Z",
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

test("repository-backed service emits schema-valid deterministic decision and lineage trace", async () => {
  const runManifestRepository = new RunManifestRepository();
  const lineageRepository = new ManifestLineageTraceRepository({
    runManifestRepository,
  });
  const service = new ManifestReuseRecoveryReplaySupersessionService({
    runManifestRepository,
  });
  const completed = completedManifest({
    manifest_id: "manifest.run.service.return.0108",
    idempotency_key: "idempotency://manifest.run.service.return.0108",
  });
  await runManifestRepository.createManifest({
    manifest: completed,
    persisted_at: "2026-04-26T11:45:00Z",
  });

  const input = {
    candidate_manifest_id: "manifest.run.service.return.child.0108",
    prior_manifest_id: completed.manifest_id,
    request: requestIdentityFromManifest(completed),
    tenant_id: completed.tenant_id,
  };
  const first = await service.decide(input);
  const second = await service.decide(input);

  expect(first.selected_branch_action).toBe("RETURN_EXISTING_BUNDLE");
  expect(first.lineage_trace_ready).toBe(true);
  expect(JSON.stringify(first.branch_decision_contract)).toBe(
    JSON.stringify(second.branch_decision_contract),
  );
  expect(JSON.stringify(first.candidate_evaluations)).toBe(
    JSON.stringify(second.candidate_evaluations),
  );
  await validatePayloadAgainstSchema(
    "manifest_branch_decision_contract.schema.json",
    first.branch_decision_contract,
  );

  const trace = buildManifestDecisionLineageTrace({ decision: first });
  const stored = await lineageRepository.persistTrace({
    tenant_id: completed.tenant_id,
    trace,
    persisted_at: "2026-04-26T11:50:00Z",
  });
  await validatePayloadAgainstSchema("manifest_lineage_trace.schema.json", stored.trace);

  const reloaded = await runManifestRepository.requireManifestById(
    completed.tenant_id,
    completed.manifest_id,
  );
  expect(reloaded.manifest.manifest_lineage_trace_refs).toContain(stored.lineage_trace_ref);
});

test("active recovery remains blocked and stale recovery prepares exact inheritance", async () => {
  const runManifestRepository = new RunManifestRepository();
  const service = new ManifestReuseRecoveryReplaySupersessionService({
    runManifestRepository,
  });
  const activeBase = sealedManifest({
    manifest_id: "manifest.run.service.active.0108",
    idempotency_key: "idempotency://manifest.run.service.active.0108",
  });
  const active = withRequestIdentity({
    ...activeBase,
    lifecycle_state: "IN_PROGRESS" as const,
    opened_at: "2026-04-26T12:00:00Z",
    manifest_start_claim: buildStartedManifestClaim(activeBase, "2026-04-26T12:00:00Z"),
  });
  await runManifestRepository.createManifest({
    manifest: active,
    persisted_at: "2026-04-26T12:00:00Z",
  });

  const activeDecision = await service.decide({
    candidate_manifest_id: "manifest.run.service.active.child.0108",
    prior_manifest_id: active.manifest_id,
    recovery_requested: true,
    request: requestIdentityFromManifest(active),
    tenant_id: active.tenant_id,
  });
  expect(activeDecision.decision_state).toBe("BLOCKED");
  expect(activeDecision.replay_or_recovery_guard.guard_state).toBe("BLOCKED");
  expect(activeDecision.replay_or_recovery_guard.reason_codes).toContain(
    "ACTIVE_LEASE_BLOCKS_RECOVERY",
  );

  const staleBase = sealedManifest({
    manifest_id: "manifest.run.service.stale.0108",
    idempotency_key: "idempotency://manifest.run.service.stale.0108",
  });
  const stale = withRequestIdentity({
    ...staleBase,
    lifecycle_state: "FAILED" as const,
    opened_at: "2026-04-26T12:10:00Z",
    manifest_start_claim: {
      ...buildStartedManifestClaim(staleBase, "2026-04-26T12:10:00Z"),
      claim_state: "STALE_RECLAIM_REQUIRED" as const,
      claim_status_code: "STALE_RECLAIM_REQUIRED" as const,
      stale_reclaim_reason_code_or_null: "LEASE_EXPIRED_OWNER_UNHEALTHY" as const,
    },
  });
  await runManifestRepository.createManifest({
    manifest: stale,
    persisted_at: "2026-04-26T12:10:00Z",
  });

  const staleDecision = await service.decide({
    candidate_manifest_id: "manifest.run.service.stale.child.0108",
    prior_manifest_id: stale.manifest_id,
    recovery_requested: true,
    request: requestIdentityFromManifest(stale),
    tenant_id: stale.tenant_id,
  });
  expect(staleDecision.selected_branch_action).toBe("RECOVERY_CHILD");
  expect(staleDecision.replay_or_recovery_guard.guard_state).toBe("ALLOWED");
  expect(staleDecision.child_allocation?.config_inheritance_mode_or_null).toBe(
    "RECOVERY_EXACT",
  );
  await validatePayloadAgainstSchema(
    "manifest_branch_decision_contract.schema.json",
    staleDecision.branch_decision_contract,
  );
});

test("supersession preparation is append-only and does not rewrite source manifest truth", async () => {
  const runManifestRepository = new RunManifestRepository();
  const service = new ManifestReuseRecoveryReplaySupersessionService({
    runManifestRepository,
  });
  const completed = completedManifest({
    manifest_id: "manifest.run.service.supersession.0108",
    idempotency_key: "idempotency://manifest.run.service.supersession.0108",
  });
  await runManifestRepository.createManifest({
    manifest: completed,
    persisted_at: "2026-04-26T12:20:00Z",
  });

  const decision = await service.decide({
    candidate_manifest_id: "manifest.run.service.supersession.child.0108",
    prior_manifest_id: completed.manifest_id,
    request: {
      ...requestIdentityFromManifest(completed),
      idempotency_key: "idempotency://manifest.run.service.supersession.0108/new",
    },
    tenant_id: completed.tenant_id,
  });

  expect(decision.selected_branch_action).toBe("NEW_REQUEST_CHILD");
  expect(decision.supersession_guard.guard_state).toBe("PREPARED");
  expect(decision.supersession_guard.supersedes_manifest_id_or_null).toBe(
    completed.manifest_id,
  );
  expect(decision.child_allocation?.supersedes_manifest_id_or_null).toBe(
    completed.manifest_id,
  );

  const reloaded = await runManifestRepository.requireManifestById(
    completed.tenant_id,
    completed.manifest_id,
  );
  expect(reloaded.manifest.supersedes_manifest_id).toBeNull();
  expect(reloaded.manifest.superseded_at).toBeNull();
  expect(reloaded.manifest.decision_bundle_hash).toBe(completed.decision_bundle_hash);
});
