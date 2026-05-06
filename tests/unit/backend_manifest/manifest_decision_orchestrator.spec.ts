import { expect, test } from "@playwright/test";

import {
  CANONICAL_BRANCH_ACTION_ORDER,
  buildManifestDecisionLineageTrace,
  buildRunManifestStartClaimContract,
  computeRequestIdentityHash,
  decideManifestOrchestration,
  requestIdentityFromManifest,
  type ManifestDecisionServiceResult,
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
    frozen_at: "2026-04-26T09:10:00Z",
    ...buildFrozenBasis(allocated),
  };
  const { gates, evaluation } = buildSealReadyPresealEvaluation(frozen);
  return withRequestIdentity({
    ...frozen,
    lifecycle_state: "SEALED" as const,
    sealed_at: "2026-04-26T09:20:00Z",
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
  const openedAt = "2026-04-26T09:25:00Z";
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
    completed_at: "2026-04-26T09:40:00Z",
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

function completedWithoutDecisionBundle(overrides?: Partial<RunManifestRecord>) {
  const completed = completedManifest(overrides);
  const projection = completed.append_only_outcome_projection
    ? {
        ...completed.append_only_outcome_projection,
        output_refs: Object.fromEntries(
          Object.entries(completed.append_only_outcome_projection.output_refs).filter(
            ([key]) => key !== "decision_bundle",
          ),
        ),
        decision_bundle_hash: null,
      }
    : null;
  return withRequestIdentity({
    ...completed,
    append_only_outcome_projection: projection,
    output_refs: projection?.output_refs ?? {},
    decision_bundle_hash: null,
  });
}

function nightlyCompletedManifest(input: {
  manifest_id: string;
  nightly_window_key: string;
}) {
  const manifest = completedManifest({
    manifest_id: input.manifest_id,
    idempotency_key: `idempotency://${input.manifest_id}`,
    run_kind: "NIGHTLY",
    nightly_window_key: input.nightly_window_key,
  });
  const patched = {
    ...manifest,
    nightly_window_key: input.nightly_window_key,
  };
  return withRequestIdentity(patched, requestIdentityFromManifest(patched));
}

function selectedCount(decision: ManifestDecisionServiceResult) {
  return decision.candidate_evaluations.filter(
    (candidate) => candidate.evaluation_state === "SELECTED",
  ).length;
}

test("same-request terminal return emits branch contract and trace-ready exhaustive candidates", async () => {
  const prior = completedManifest({
    manifest_id: "manifest.run.orchestrator.return.0108",
    idempotency_key: "idempotency://manifest.run.orchestrator.return.0108",
  });
  const decision = await decideManifestOrchestration({
    candidate_manifest_id: "manifest.run.orchestrator.return.child.0108",
    prior_manifest: prior,
    request: requestIdentityFromManifest(prior),
  });

  expect(decision.decision_state).toBe("SELECTED");
  expect(decision.selected_branch_action).toBe("RETURN_EXISTING_BUNDLE");
  expect(decision.branch_decision_contract?.returned_decision_bundle_hash_or_null).toBe(
    prior.decision_bundle_hash,
  );
  expect(decision.selected_manifest_snapshot?.manifest_id).toBe(prior.manifest_id);
  expect(decision.lineage_trace_ready).toBe(true);
  expect(decision.child_allocation).toBeNull();
  expect(decision.candidate_evaluations.map((candidate) => candidate.candidate_action)).toEqual(
    CANONICAL_BRANCH_ACTION_ORDER,
  );
  expect(selectedCount(decision)).toBe(1);

  const trace = buildManifestDecisionLineageTrace({ decision });
  expect(trace.selected_branch_action).toBe("RETURN_EXISTING_BUNDLE");
  expect(trace.candidate_evaluations).toHaveLength(CANONICAL_BRANCH_ACTION_ORDER.length);
});

test("same-request terminal manifest without a decision bundle fails closed", async () => {
  const prior = completedWithoutDecisionBundle({
    manifest_id: "manifest.run.orchestrator.no-bundle.0108",
    idempotency_key: "idempotency://manifest.run.orchestrator.no-bundle.0108",
  });
  const decision = await decideManifestOrchestration({
    candidate_manifest_id: "manifest.run.orchestrator.no-bundle.child.0108",
    prior_manifest: prior,
    request: requestIdentityFromManifest(prior),
  });

  expect(decision.decision_state).toBe("BLOCKED");
  expect(decision.selected_branch_action).toBeNull();
  expect(decision.branch_decision_contract).toBeNull();
  expect(decision.lineage_trace_ready).toBe(false);
  expect(selectedCount(decision)).toBe(0);
  expect(
    decision.candidate_evaluations.find(
      (candidate) => candidate.candidate_action === "RETURN_EXISTING_BUNDLE",
    )?.disqualifier_reason_codes,
  ).toContain("RETURNED_BUNDLE_NOT_AVAILABLE");
});

test("sealed same-request reuse returns the sealed manifest snapshot", async () => {
  const prior = sealedManifest({
    manifest_id: "manifest.run.orchestrator.sealed.0108",
    idempotency_key: "idempotency://manifest.run.orchestrator.sealed.0108",
  });
  const decision = await decideManifestOrchestration({
    candidate_manifest_id: "manifest.run.orchestrator.sealed.child.0108",
    prior_manifest: prior,
    request: requestIdentityFromManifest(prior),
  });

  expect(decision.selected_branch_action).toBe("REUSE_SEALED_MANIFEST");
  expect(decision.selected_manifest_snapshot?.manifest_id).toBe(prior.manifest_id);
  expect(decision.lineage_trace_ready).toBe(true);
  expect(decision.child_allocation).toBeNull();
});

test("exact replay rerun returns the existing replay result instead of duplicating a child", async () => {
  const replayChild = completedManifest({
    manifest_id: "manifest.run.orchestrator.replay.done.0108",
    idempotency_key: "idempotency://manifest.run.orchestrator.replay.done.0108",
    run_kind: "REPLAY",
    replay_class: "STANDARD_REPLAY",
  });
  const request = requestIdentityFromManifest(replayChild);
  const decision = await decideManifestOrchestration({
    candidate_manifest_id: "manifest.run.orchestrator.replay.duplicate.0108",
    prior_manifest: withRequestIdentity(replayChild, request),
    request,
  });

  expect(decision.selected_branch_action).toBe("RETURN_EXISTING_BUNDLE");
  expect(decision.branch_decision_contract?.returned_decision_bundle_hash_or_null).toBe(
    replayChild.decision_bundle_hash,
  );
  expect(decision.replay_or_recovery_guard.guard_state).toBe("NOT_APPLICABLE");
});

test("replay and recovery child decisions expose explicit guards and inheritance", async () => {
  const source = completedManifest({
    manifest_id: "manifest.run.orchestrator.replay-source.0108",
    idempotency_key: "idempotency://manifest.run.orchestrator.replay-source.0108",
  });
  const replayRequest = {
    ...requestIdentityFromManifest(source),
    idempotency_key: "idempotency://manifest.run.orchestrator.replay-source.0108/replay",
    run_kind: "REPLAY" as const,
    replay_class_or_null: "STANDARD_REPLAY" as const,
  };
  const replayDecision = await decideManifestOrchestration({
    candidate_manifest_id: "manifest.run.orchestrator.replay-child.0108",
    prior_manifest: source,
    request: replayRequest,
  });
  expect(replayDecision.selected_branch_action).toBe("REPLAY_CHILD");
  expect(replayDecision.replay_or_recovery_guard.guard_state).toBe("ALLOWED");
  expect(replayDecision.child_allocation?.continuation_basis).toBe("REPLAY_CHILD");
  expect(replayDecision.child_allocation?.config_inheritance_mode_or_null).toBe(
    "REPLAY_EXACT",
  );

  const staleBase = sealedManifest({
    manifest_id: "manifest.run.orchestrator.stale.0108",
    idempotency_key: "idempotency://manifest.run.orchestrator.stale.0108",
  });
  const stale = withRequestIdentity({
    ...staleBase,
    lifecycle_state: "FAILED" as const,
    opened_at: "2026-04-26T10:00:00Z",
    manifest_start_claim: {
      ...buildStartedManifestClaim(staleBase, "2026-04-26T10:00:00Z"),
      claim_state: "STALE_RECLAIM_REQUIRED" as const,
      claim_status_code: "STALE_RECLAIM_REQUIRED" as const,
      stale_reclaim_reason_code_or_null: "LEASE_EXPIRED_OWNER_UNHEALTHY" as const,
    },
  });
  const recoveryDecision = await decideManifestOrchestration({
    candidate_manifest_id: "manifest.run.orchestrator.recovery-child.0108",
    prior_manifest: stale,
    recovery_requested: true,
    request: requestIdentityFromManifest(stale),
  });
  expect(recoveryDecision.selected_branch_action).toBe("RECOVERY_CHILD");
  expect(recoveryDecision.replay_or_recovery_guard.guard_state).toBe("ALLOWED");
  expect(recoveryDecision.replay_or_recovery_guard.attempt_lineage_ref_or_null).toBe(
    stale.manifest_start_claim?.attempt_lineage_ref,
  );
  expect(recoveryDecision.child_allocation?.continuation_basis).toBe("RECOVERY_CHILD");
  expect(recoveryDecision.child_allocation?.input_inheritance_mode_or_null).toBe(
    "RECOVERY_EXACT",
  );
});

test("active lease blocks recovery through the orchestrator guard", async () => {
  const activeBase = sealedManifest({
    manifest_id: "manifest.run.orchestrator.active.0108",
    idempotency_key: "idempotency://manifest.run.orchestrator.active.0108",
  });
  const active = withRequestIdentity({
    ...activeBase,
    lifecycle_state: "IN_PROGRESS" as const,
    opened_at: "2026-04-26T10:10:00Z",
    manifest_start_claim: buildStartedManifestClaim(activeBase, "2026-04-26T10:10:00Z"),
  });
  const decision = await decideManifestOrchestration({
    candidate_manifest_id: "manifest.run.orchestrator.active.child.0108",
    prior_manifest: active,
    recovery_requested: true,
    request: requestIdentityFromManifest(active),
  });

  expect(decision.decision_state).toBe("BLOCKED");
  expect(decision.blocked_reason_codes).toContain("ACTIVE_LEASE_BLOCKS_RECOVERY");
  expect(decision.replay_or_recovery_guard.path).toBe("RECOVERY_CHILD");
  expect(decision.replay_or_recovery_guard.guard_state).toBe("BLOCKED");
  expect(decision.replay_or_recovery_guard.reason_codes).toContain(
    "ACTIVE_LEASE_BLOCKS_RECOVERY",
  );
});

test("post-terminal continuation stays distinct from request-drift supersession", async () => {
  const continuationPrior = completedWithoutDecisionBundle({
    manifest_id: "manifest.run.orchestrator.continuation.0108",
    idempotency_key: "idempotency://manifest.run.orchestrator.continuation.0108",
  });
  const continuationDecision = await decideManifestOrchestration({
    candidate_manifest_id: "manifest.run.orchestrator.continuation.child.0108",
    continuation_requested: true,
    prior_manifest: continuationPrior,
    request: requestIdentityFromManifest(continuationPrior),
  });
  expect(continuationDecision.selected_branch_action).toBe("CONTINUATION_CHILD");
  expect(continuationDecision.selected_branch_reason_code).toBe(
    "POST_TERMINAL_CONTINUATION_REQUIRED",
  );
  expect(continuationDecision.supersession_guard.guard_state).toBe("NOT_APPLICABLE");

  const supersessionPrior = completedManifest({
    manifest_id: "manifest.run.orchestrator.supersession.0108",
    idempotency_key: "idempotency://manifest.run.orchestrator.supersession.0108",
  });
  const supersessionDecision = await decideManifestOrchestration({
    candidate_manifest_id: "manifest.run.orchestrator.supersession.child.0108",
    prior_manifest: supersessionPrior,
    request: {
      ...requestIdentityFromManifest(supersessionPrior),
      idempotency_key: "idempotency://manifest.run.orchestrator.supersession.0108/new",
    },
  });
  expect(supersessionDecision.selected_branch_action).toBe("NEW_REQUEST_CHILD");
  expect(supersessionDecision.selected_branch_reason_code).toBe("REQUEST_IDENTITY_CHANGED");
  expect(supersessionDecision.supersession_guard.guard_state).toBe("PREPARED");
  expect(supersessionDecision.supersession_guard.append_only_policy).toBe(
    "NO_HISTORICAL_REWRITE",
  );
  expect(supersessionDecision.child_allocation?.supersedes_manifest_id_or_null).toBe(
    supersessionPrior.manifest_id,
  );
});

test("nightly window advancement remains a typed continuation branch", async () => {
  const prior = nightlyCompletedManifest({
    manifest_id: "manifest.run.orchestrator.nightly.0108",
    nightly_window_key: "2026-W17",
  });
  const decision = await decideManifestOrchestration({
    candidate_manifest_id: "manifest.run.orchestrator.nightly.child.0108",
    prior_manifest: prior,
    request: {
      ...requestIdentityFromManifest(prior),
      idempotency_key: "idempotency://manifest.run.orchestrator.nightly.0108/W18",
      nightly_window_key_or_null: "2026-W18",
    },
  });

  expect(decision.selected_branch_action).toBe("CONTINUATION_CHILD");
  expect(decision.selected_branch_reason_code).toBe("NIGHTLY_WINDOW_ADVANCED");
  expect(decision.child_allocation?.continuation_basis).toBe("CONTINUATION_CHILD");
  expect(decision.supersession_guard.guard_state).toBe("NOT_APPLICABLE");
});
