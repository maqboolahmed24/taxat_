import { expect, test } from "@playwright/test";

import {
  BeginChildManifestError,
  beginChildManifest,
  beginManifest,
  buildReclaimStartAtomicPublication,
  buildRunManifestStartClaimContract,
  buildStartClaimAtomicPublication,
  buildTerminalResultRecordedStartClaim,
  validatePrestartManifestTarget,
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

function sealedManifest(overrides?: Partial<RunManifestRecord>): RunManifestRecord {
  const allocated = buildBaseAllocatedManifest(overrides);
  const frozen = {
    ...allocated,
    lifecycle_state: "FROZEN" as const,
    frozen_at: "2026-04-26T09:10:00Z",
    ...buildFrozenBasis(allocated),
  } as unknown as RunManifestRecord;
  const { gates, evaluation } = buildSealReadyPresealEvaluation(frozen);
  return {
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
  } as RunManifestRecord;
}

function completedManifest(overrides?: Partial<RunManifestRecord>): RunManifestRecord {
  const sealed = sealedManifest(overrides);
  const openedAt = "2026-04-26T09:25:00Z";
  const inProgress = {
    ...sealed,
    lifecycle_state: "IN_PROGRESS" as const,
    opened_at: openedAt,
    manifest_start_claim: buildStartedManifestClaim(sealed, openedAt),
  } as RunManifestRecord;
  const projection = buildCompletedOutcomeProjection(inProgress);
  return {
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
  } as RunManifestRecord;
}

test("beginManifest allocates root lineage and captures nightly launch context", async () => {
  const rootTemplate = buildBaseAllocatedManifest({
    manifest_id: "manifest.run.root.0103",
    idempotency_key: "idempotency://manifest.run.root.0103",
    run_kind: "NIGHTLY",
    nightly_window_key: "2026-W17",
  });

  const allocation = await beginManifest({
    manifest: rootTemplate,
    launch_context: {
      nightly_batch_run_ref: "nightly-batch://2026-W17",
      nightly_window_key: "2026-W17",
    },
  });

  expect(allocation.manifest.root_manifest_id).toBe("manifest.run.root.0103");
  expect(allocation.manifest.parent_manifest_id).toBeNull();
  expect(allocation.manifest.manifest_generation).toBe(0);
  expect(allocation.manifest.continuation_basis).toBe("NEW_MANIFEST");
  expect(allocation.manifest.nightly_batch_run_ref).toBe("nightly-batch://2026-W17");
  expect(allocation.manifest.nightly_window_key).toBe("2026-W17");
});

test("beginChildManifest persists replay lineage and recovery attempt reuse", () => {
  const parent = completedManifest({
    manifest_id: "manifest.run.parent.0103",
    idempotency_key: "idempotency://manifest.run.parent.0103",
  });
  const replayTemplate = buildBaseAllocatedManifest({
    manifest_id: "manifest.run.replay-child.0103",
    idempotency_key: "idempotency://manifest.run.replay-child.0103",
    run_kind: "REPLAY",
    replay_class: "STANDARD_REPLAY",
  });

  const replay = beginChildManifest({
    manifest: replayTemplate,
    parent_manifest: parent,
    continuation_basis: "REPLAY_CHILD",
  });

  expect(replay.manifest.parent_manifest_id).toBe(parent.manifest_id);
  expect(replay.manifest.replay_of_manifest_id).toBe(parent.manifest_id);
  expect(replay.manifest.continuation_set.config_inheritance_mode).toBe("REPLAY_EXACT");
  expect(replay.manifest.continuation_set.input_inheritance_mode).toBe("REPLAY_EXACT");

  const staleSource = {
    ...sealedManifest({
      manifest_id: "manifest.run.stale-source.0103",
      idempotency_key: "idempotency://manifest.run.stale-source.0103",
    }),
    lifecycle_state: "IN_PROGRESS" as const,
    opened_at: "2026-04-26T10:25:00Z",
  } as RunManifestRecord;
  const stale = {
    ...staleSource,
    manifest_start_claim: {
      ...buildStartedManifestClaim(staleSource, "2026-04-26T10:25:00Z"),
      claim_state: "STALE_RECLAIM_REQUIRED" as const,
      claim_status_code: "STALE_RECLAIM_REQUIRED" as const,
      publication_state: "PUBLISHED_STALE_RECLAIM_REQUIRED" as const,
      stale_reclaim_reason_code_or_null: "LEASE_EXPIRED_OWNER_UNHEALTHY" as const,
    },
  } as RunManifestRecord;
  const recovery = beginChildManifest({
    manifest: buildBaseAllocatedManifest({
      manifest_id: "manifest.run.recovery-child.0103",
      idempotency_key: "idempotency://manifest.run.recovery-child.0103",
    }),
    parent_manifest: stale,
    continuation_basis: "RECOVERY_CHILD",
  });
  expect(recovery.expected_attempt_lineage_ref).toBe(
    stale.manifest_start_claim!.attempt_lineage_ref,
  );
  expect(recovery.manifest.continuation_set.config_inheritance_mode).toBe("RECOVERY_EXACT");
});

test("beginChildManifest blocks recovery while the source attempt is active", () => {
  const activeSource = {
    ...sealedManifest({
      manifest_id: "manifest.run.active-source.0103",
      idempotency_key: "idempotency://manifest.run.active-source.0103",
    }),
    lifecycle_state: "IN_PROGRESS" as const,
    opened_at: "2026-04-26T10:25:00Z",
  } as RunManifestRecord;
  const active = {
    ...activeSource,
    manifest_start_claim: buildStartedManifestClaim(activeSource, "2026-04-26T10:25:00Z"),
  } as RunManifestRecord;

  expect(() =>
    beginChildManifest({
      manifest: buildBaseAllocatedManifest({
        manifest_id: "manifest.run.blocked-recovery.0103",
        idempotency_key: "idempotency://manifest.run.blocked-recovery.0103",
      }),
      parent_manifest: active,
      continuation_basis: "RECOVERY_CHILD",
    }),
  ).toThrow(BeginChildManifestError);
});

test("start claim publication commits opened_at, lease, and first-publication proof together", () => {
  const sealed = sealedManifest({
    manifest_id: "manifest.run.claim-publication.0103",
    idempotency_key: "idempotency://manifest.run.claim-publication.0103",
  });
  const claimed = buildStartClaimAtomicPublication({
    manifest: sealed,
    claim_acquired_at: "2026-04-26T11:00:00Z",
    claim_expires_at: "2026-04-26T11:30:00Z",
    claim_holder_ref: "worker://claimant-a",
    claim_token: "claim-token://claimant-a",
    stage_dag_ref: "stage-dag://claim-publication",
    outbox_batch_ref: "outbox-batch://claim-publication",
  });

  expect(claimed.lifecycle_state).toBe("IN_PROGRESS");
  expect(claimed.opened_at).toBe("2026-04-26T11:00:00Z");
  expect(claimed.manifest_start_claim?.claim_state).toBe("ACTIVE_LEASED");
  expect(claimed.manifest_start_claim?.claim_token_or_null).toBe("claim-token://claimant-a");
  expect(claimed.manifest_start_claim?.stage_dag_ref_or_null).toBe(
    "stage-dag://claim-publication",
  );

  const terminal = buildTerminalResultRecordedStartClaim({
    manifest: claimed,
    released_at: "2026-04-26T11:20:00Z",
    release_reason_code: "COMPLETED",
  });
  expect(terminal.claim_state).toBe("TERMINAL_RESULT_RECORDED");
  expect(terminal.claim_token_or_null).toBe("claim-token://claimant-a");
});

test("prestart validator fails closed on opened manifests and hidden outputs", () => {
  const sealed = sealedManifest({
    manifest_id: "manifest.run.prestart-validator.0103",
    idempotency_key: "idempotency://manifest.run.prestart-validator.0103",
  });
  expect(validatePrestartManifestTarget(sealed).valid).toBe(true);

  const drifted = {
    ...sealed,
    opened_at: "2026-04-26T11:00:00Z",
    output_refs: {
      decision_bundle: {
        linkage_role_code: "DECISION_BUNDLE" as const,
        artifact_type: "DecisionBundle",
        artifact_ref: "decision-bundle://drifted",
        artifact_hash_or_null: "decision-bundle-hash://drifted",
        produced_by_manifest_id: sealed.manifest_id,
        dependency_identity_refs: [],
      },
    },
  } as RunManifestRecord;
  const validation = validatePrestartManifestTarget(drifted);
  expect(validation.valid).toBe(false);
  expect(validation.reason_codes).toContain("OPENED_AT_PRESENT");
  expect(validation.reason_codes).toContain("OUTPUT_REFS_PRESENT");
});

test("reclaim publication preserves attempt lineage and original first-publication proof", () => {
  const sealed = sealedManifest({
    manifest_id: "manifest.run.reclaim-builder.0103",
    idempotency_key: "idempotency://manifest.run.reclaim-builder.0103",
  });
  const active = buildStartClaimAtomicPublication({
    manifest: sealed,
    claim_acquired_at: "2026-04-26T12:00:00Z",
    claim_expires_at: "2026-04-26T12:10:00Z",
    claim_holder_ref: "worker://original",
    claim_token: "claim-token://original",
    stage_dag_ref: "stage-dag://reclaim-builder",
    outbox_batch_ref: "outbox-batch://reclaim-builder",
  });
  const stale = {
    ...active,
    manifest_start_claim: {
      ...active.manifest_start_claim!,
      claim_state: "STALE_RECLAIM_REQUIRED" as const,
      claim_status_code: "STALE_RECLAIM_REQUIRED" as const,
      publication_state: "PUBLISHED_STALE_RECLAIM_REQUIRED" as const,
      stale_reclaim_reason_code_or_null: "LEASE_EXPIRED_OWNER_UNHEALTHY" as const,
    },
  } as RunManifestRecord;

  const reclaimed = buildReclaimStartAtomicPublication({
    manifest: stale,
    reclaimed_at: "2026-04-26T12:20:00Z",
    claim_expires_at: "2026-04-26T12:50:00Z",
    claim_holder_ref: "worker://successor",
    claim_token: "claim-token://successor",
  });

  expect(reclaimed.manifest_start_claim?.attempt_lineage_ref).toBe(
    active.manifest_start_claim?.attempt_lineage_ref,
  );
  expect(reclaimed.manifest_start_claim?.first_publication_committed_at_or_null).toBe(
    "2026-04-26T12:00:00Z",
  );
  expect(reclaimed.manifest_start_claim?.claim_epoch).toBe(2);
  expect(reclaimed.manifest_start_claim?.claim_holder_ref_or_null).toBe("worker://successor");
});
