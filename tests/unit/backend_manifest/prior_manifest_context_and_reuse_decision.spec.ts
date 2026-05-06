import { expect, test } from "@playwright/test";

import {
  buildRunManifestStartClaimContract,
  computeRequestIdentityHash,
  decideManifestReuseStrategy,
  loadAndValidatePriorManifestContext,
  requestIdentityFromManifest,
  validatePriorManifestCompatibility,
  validateReuseSealedContext,
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
    frozen_at: "2026-04-25T09:10:00Z",
    ...buildFrozenBasis(allocated),
  };
  const { gates, evaluation } = buildSealReadyPresealEvaluation(frozen);
  return withRequestIdentity({
    ...frozen,
    lifecycle_state: "SEALED" as const,
    sealed_at: "2026-04-25T09:20:00Z",
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
  const openedAt = "2026-04-25T09:25:00Z";
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
    completed_at: "2026-04-25T09:40:00Z",
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

async function contextFor(priorManifest: RunManifestRecord | null, request: ManifestRequestIdentityInput) {
  return loadAndValidatePriorManifestContext({
    prior_manifest: priorManifest,
    request,
  });
}

test("request identity hash is canonical and separates nightly window drift", () => {
  const manifest = buildBaseAllocatedManifest({
    manifest_id: "manifest.run.identity.0102",
    idempotency_key: "idempotency://manifest.run.identity.0102",
  });
  const first = computeRequestIdentityHash(requestIdentityFromManifest(manifest));
  const second = computeRequestIdentityHash({
    ...requestIdentityFromManifest(manifest),
    requested_scope: [...manifest.requested_scope].reverse(),
  });
  expect(first.hash).toBe(second.hash);

  const nightly = requestIdentityFromManifest(
    buildBaseAllocatedManifest({
      manifest_id: "manifest.run.identity.nightly.0102",
      idempotency_key: "idempotency://manifest.run.identity.nightly.0102",
      run_kind: "NIGHTLY",
      nightly_window_key: "2026-W17",
    }),
  );
  expect(computeRequestIdentityHash(nightly).hash).not.toBe(
    computeRequestIdentityHash({
      ...nightly,
      nightly_window_key_or_null: "2026-W18",
    }).hash,
  );
});

test("absent prior manifest selects NEW_MANIFEST with exhaustive candidates", async () => {
  const request = requestIdentityFromManifest(
    buildBaseAllocatedManifest({
      manifest_id: "manifest.run.absent.0102",
      idempotency_key: "idempotency://manifest.run.absent.0102",
    }),
  );
  const context = await contextFor(null, request);
  const strategy = decideManifestReuseStrategy({
    candidate_manifest_id: "manifest.run.absent.new.0102",
    prior_context: context,
  });

  expect(context.status).toBe("ABSENT");
  expect(strategy.selected_branch_action).toBe("NEW_MANIFEST");
  expect(strategy.branch_decision_contract?.branch_reason_code).toBe("NO_PRIOR_MANIFEST");
  expect(strategy.candidate_evaluations).toHaveLength(7);
  expect(strategy.candidate_evaluations.filter((candidate) => candidate.evaluation_state === "SELECTED")).toHaveLength(1);
});

test("terminal same-request return outranks child allocation", async () => {
  const prior = completedManifest({
    manifest_id: "manifest.run.terminal.0102",
    idempotency_key: "idempotency://manifest.run.terminal.0102",
  });
  const context = await contextFor(prior, requestIdentityFromManifest(prior));
  const strategy = decideManifestReuseStrategy({
    candidate_manifest_id: "manifest.run.terminal.child.0102",
    prior_context: context,
    recovery_requested: true,
  });

  expect(strategy.selected_branch_action).toBe("RETURN_EXISTING_BUNDLE");
  expect(strategy.branch_decision_contract?.returned_decision_bundle_hash_or_null).toBe(
    prior.decision_bundle_hash,
  );
  expect(strategy.selected_manifest_continuation_basis).toBe(prior.continuation_basis);
});

test("sealed same-request reuse fails closed on hidden post-start drift", async () => {
  const prior = sealedManifest({
    manifest_id: "manifest.run.sealed.0102",
    idempotency_key: "idempotency://manifest.run.sealed.0102",
  });
  const context = await contextFor(prior, requestIdentityFromManifest(prior));
  const strategy = decideManifestReuseStrategy({
    candidate_manifest_id: "manifest.run.sealed.child.0102",
    prior_context: context,
  });

  expect(strategy.selected_branch_action).toBe("REUSE_SEALED_MANIFEST");
  expect(validateReuseSealedContext(prior).reusable).toBe(true);
  expect(
    validateReuseSealedContext({
      ...prior,
      decision_bundle_hash: "decision-bundle-hash://hidden-drift",
    }).reason_codes,
  ).toContain("PRIOR_MANIFEST_ALREADY_STARTED");
});

test("replay rerun dedupes completed replay child but fresh replay branches from terminal source", async () => {
  const source = completedManifest({
    manifest_id: "manifest.run.replay-source.0102",
    idempotency_key: "idempotency://manifest.run.replay-source.0102",
  });
  const replayRequest = {
    ...requestIdentityFromManifest(source),
    idempotency_key: "idempotency://manifest.run.replay-source.0102/replay",
    run_kind: "REPLAY" as const,
    replay_class_or_null: "STANDARD_REPLAY" as const,
  };
  const replayStrategy = decideManifestReuseStrategy({
    candidate_manifest_id: "manifest.run.replay-child.0102",
    prior_context: await contextFor(source, replayRequest),
  });
  expect(replayStrategy.selected_branch_action).toBe("REPLAY_CHILD");
  expect(replayStrategy.branch_decision_contract?.config_inheritance_mode_or_null).toBe(
    "REPLAY_EXACT",
  );

  const replayChild = completedManifest({
    manifest_id: "manifest.run.replay-child.done.0102",
    idempotency_key: replayRequest.idempotency_key,
    run_kind: "REPLAY",
    replay_class: "STANDARD_REPLAY",
  });
  const replayChildRequest = requestIdentityFromManifest(replayChild);
  const deduped = decideManifestReuseStrategy({
    candidate_manifest_id: "manifest.run.replay-child.duplicate.0102",
    prior_context: await contextFor(withRequestIdentity(replayChild, replayChildRequest), replayChildRequest),
  });
  expect(deduped.selected_branch_action).toBe("RETURN_EXISTING_BUNDLE");
});

test("active lease blocks recovery while stale claim allows RECOVERY_CHILD", async () => {
  const active = sealedManifest({
    manifest_id: "manifest.run.active-recovery.0102",
    idempotency_key: "idempotency://manifest.run.active-recovery.0102",
  });
  const activeStarted = withRequestIdentity({
    ...active,
    lifecycle_state: "IN_PROGRESS" as const,
    opened_at: "2026-04-25T09:30:00Z",
    manifest_start_claim: buildStartedManifestClaim(active, "2026-04-25T09:30:00Z"),
  });
  const activeStrategy = decideManifestReuseStrategy({
    candidate_manifest_id: "manifest.run.active-recovery.child.0102",
    prior_context: await contextFor(activeStarted, requestIdentityFromManifest(activeStarted)),
    recovery_requested: true,
  });
  expect(activeStrategy.decision_state).toBe("BLOCKED");
  expect(activeStrategy.blocked_reason_codes).toContain("ACTIVE_LEASE_BLOCKS_RECOVERY");

  const staleBase = sealedManifest({
    manifest_id: "manifest.run.stale-recovery.0102",
    idempotency_key: "idempotency://manifest.run.stale-recovery.0102",
  });
  const stale = withRequestIdentity({
    ...staleBase,
    lifecycle_state: "FAILED" as const,
    opened_at: "2026-04-25T09:30:00Z",
    manifest_start_claim: {
      ...buildStartedManifestClaim(staleBase, "2026-04-25T09:30:00Z"),
      claim_state: "STALE_RECLAIM_REQUIRED" as const,
      claim_status_code: "STALE_RECLAIM_REQUIRED" as const,
      stale_reclaim_reason_code_or_null: "LEASE_EXPIRED_OWNER_UNHEALTHY" as const,
    },
  });
  const staleStrategy = decideManifestReuseStrategy({
    candidate_manifest_id: "manifest.run.stale-recovery.child.0102",
    prior_context: await contextFor(stale, requestIdentityFromManifest(stale)),
    recovery_requested: true,
  });
  expect(staleStrategy.selected_branch_action).toBe("RECOVERY_CHILD");
});

test("compatibility validator reports typed drift without normalizing it away", () => {
  const prior = completedManifest({
    manifest_id: "manifest.run.drift.0102",
    idempotency_key: "idempotency://manifest.run.drift.0102",
  });
  const accessDrift = validatePriorManifestCompatibility({
    prior_manifest: prior,
    request: {
      ...requestIdentityFromManifest(prior),
      access_binding_hash: "access-binding-hash://changed",
    },
  });
  expect(accessDrift.blocking_reason_codes).toContain("ACCESS_BINDING_HASH_MISMATCH");

  const lineageDrift = validatePriorManifestCompatibility({
    prior_manifest: {
      ...prior,
      continuation_set: {
        ...prior.continuation_set,
        root_manifest_id: "manifest.run.other-root.0102",
      },
    },
    request: requestIdentityFromManifest(prior),
  });
  expect(lineageDrift.blocking_reason_codes).toContain("LINEAGE_MIRROR_MISMATCH");
});
