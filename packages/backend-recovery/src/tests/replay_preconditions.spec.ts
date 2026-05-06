import { expect, test } from "@playwright/test";

import { stableJsonHash } from "../../../domain-kernel/src/primitives/hash.ts";
import {
  beginChildManifest,
  buildRunManifestStartClaimContract,
  normalizeAppendOnlyOutcomeProjection,
  deriveRunManifestPostSealBasisHash,
  type RunManifestRecord,
  type RunManifestReplayClass,
} from "../../../backend-manifest/src/index.ts";
import {
  validateReplayPreconditions,
} from "../index.ts";
import {
  buildBaseAllocatedManifest,
  buildCompletedOutcomeProjection,
  buildFrozenBasis,
  buildSealReadyPresealEvaluation,
  buildStartedManifestClaim,
  buildTerminalManifestClaim,
} from "../../../../tests/fixtures/run_manifest_fixture.ts";

function sealedManifest(overrides?: Partial<RunManifestRecord>): RunManifestRecord {
  const allocated = buildBaseAllocatedManifest(overrides);
  const frozen = {
    ...allocated,
    lifecycle_state: "FROZEN" as const,
    frozen_at: "2026-05-05T08:10:00Z",
    ...buildFrozenBasis(allocated),
  } as unknown as RunManifestRecord;
  const { gates, evaluation } = buildSealReadyPresealEvaluation(frozen);
  return {
    ...frozen,
    lifecycle_state: "SEALED" as const,
    sealed_at: "2026-05-05T08:20:00Z",
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

function withMaterialPostSealBasis(manifest: RunManifestRecord): RunManifestRecord {
  const postSealBasis = {
    basis_state: "MATERIAL" as const,
    post_seal_basis_hash: "",
    authority_context_ref: `authority-context://${manifest.manifest_id}`,
    authority_context_hash: `authority-context-hash://${manifest.manifest_id}`,
    late_data_monitor_result_ref: `late-data-monitor://${manifest.manifest_id}`,
    late_data_monitor_result_hash: `late-data-monitor-hash://${manifest.manifest_id}`,
    baseline_envelope_refs: [`baseline-envelope://${manifest.manifest_id}`],
    baseline_envelope_hashes: [`baseline-envelope-hash://${manifest.manifest_id}`],
    temporal_propagation_event_refs: [`temporal-event://${manifest.manifest_id}`],
    temporal_propagation_event_hashes: [`temporal-event-hash://${manifest.manifest_id}`],
    authority_calculation_result_refs: [`authority-calc://${manifest.manifest_id}`],
    authority_calculation_result_hashes: [`authority-calc-hash://${manifest.manifest_id}`],
    drift_record_refs: [`drift-record://${manifest.manifest_id}`],
    drift_record_hashes: [`drift-record-hash://${manifest.manifest_id}`],
  };
  postSealBasis.post_seal_basis_hash = deriveRunManifestPostSealBasisHash(postSealBasis);
  const projection = normalizeAppendOnlyOutcomeProjection({
    ...manifest.append_only_outcome_projection!,
    post_seal_basis: postSealBasis,
  });
  return {
    ...manifest,
    append_only_outcome_projection: projection,
    audit_refs: projection.audit_refs,
    decision_bundle_hash: projection.decision_bundle_hash,
    deterministic_outcome_hash: projection.deterministic_outcome_hash,
    drift_refs: projection.drift_refs,
    gating_decisions: projection.gating_decisions,
    output_refs: projection.output_refs,
    replay_attestation_ref: projection.replay_attestation_ref,
    submission_refs: projection.submission_refs,
  };
}

function completedManifest(overrides?: Partial<RunManifestRecord>) {
  const sealed = sealedManifest(overrides);
  const openedAt = "2026-05-05T08:25:00Z";
  const inProgress = {
    ...sealed,
    lifecycle_state: "IN_PROGRESS" as const,
    opened_at: openedAt,
    manifest_start_claim: buildStartedManifestClaim(sealed, openedAt),
  } as RunManifestRecord;
  const projection = buildCompletedOutcomeProjection(inProgress);
  return withMaterialPostSealBasis({
    ...inProgress,
    lifecycle_state: "COMPLETED" as const,
    completed_at: "2026-05-05T08:40:00Z",
    append_only_outcome_projection: projection,
    audit_refs: projection.audit_refs,
    decision_bundle_hash: projection.decision_bundle_hash,
    deterministic_outcome_hash: projection.deterministic_outcome_hash,
    drift_refs: projection.drift_refs,
    gating_decisions: projection.gating_decisions,
    output_refs: projection.output_refs,
    replay_attestation_ref: projection.replay_attestation_ref,
    submission_refs: projection.submission_refs,
    manifest_start_claim: buildTerminalManifestClaim(inProgress, openedAt, "COMPLETED"),
  } as RunManifestRecord);
}

function exactChildBasis(source: RunManifestRecord, child: RunManifestRecord) {
  const hashSet = {
    ...source.hash_set!,
    manifest_hash: stableJsonHash({
      execution_basis_hash: source.hash_set!.execution_basis_hash,
      manifest_id: child.manifest_id,
      source_manifest_hash: source.hash_set!.manifest_hash,
    }),
  };
  return {
    ...child,
    config_freeze: source.config_freeze,
    frozen_execution_binding: {
      ...source.frozen_execution_binding!,
      config_inheritance_mode: child.continuation_set.config_inheritance_mode,
      continuation_basis: child.continuation_basis,
      continuation_of_manifest_id: child.continuation_of_manifest_id,
      input_inheritance_mode: child.continuation_set.input_inheritance_mode,
      manifest_generation: child.manifest_generation,
      manifest_hash: hashSet.manifest_hash,
      manifest_id: child.manifest_id,
      parent_manifest_hash_at_branch: child.continuation_set.parent_manifest_hash_at_branch,
      parent_manifest_id: child.parent_manifest_id,
      replay_of_manifest_id: child.replay_of_manifest_id,
      root_manifest_id: child.root_manifest_id,
      supersedes_manifest_id: child.supersedes_manifest_id,
    },
    hash_set: hashSet,
    input_freeze: source.input_freeze,
  } as RunManifestRecord;
}

function replayChild(
  source: RunManifestRecord,
  replayClass: RunManifestReplayClass = "STANDARD_REPLAY",
) {
  const allocation = beginChildManifest({
    continuation_basis: "REPLAY_CHILD",
    manifest: buildBaseAllocatedManifest({
      access_binding_hash: source.access_binding_hash,
      code_build_id: source.code_build_id,
      code_commit_sha: source.code_commit_sha,
      container_image_digest: source.container_image_digest,
      deterministic_seed: source.deterministic_seed,
      idempotency_key: `idempotency://${source.manifest_id}/replay`,
      manifest_id: `${source.manifest_id}.replay-child`,
      mode: replayClass === "COUNTERFACTUAL_ANALYSIS" ? "ANALYSIS" : "COMPLIANCE",
      replay_class: replayClass,
      requested_scope: source.requested_scope,
      run_kind: "REPLAY",
      schema_bundle_hash: source.schema_bundle_hash,
    }),
    parent_manifest: source,
  });
  return exactChildBasis(source, allocation.manifest);
}

function recoverableSource() {
  const sealed = sealedManifest({
    idempotency_key: "idempotency://manifest.pc0201.recovery-source",
    manifest_id: "manifest.pc0201.recovery-source",
  });
  const openedAt = "2026-05-05T08:25:00Z";
  const started = {
    ...sealed,
    lifecycle_state: "IN_PROGRESS" as const,
    opened_at: openedAt,
    manifest_start_claim: {
      ...buildStartedManifestClaim(sealed, openedAt),
      claim_state: "STALE_RECLAIM_REQUIRED" as const,
      claim_status_code: "STALE_RECLAIM_REQUIRED" as const,
      publication_state: "PUBLISHED_STALE_RECLAIM_REQUIRED" as const,
      stale_reclaim_reason_code_or_null: "LEASE_EXPIRED_OWNER_UNHEALTHY" as const,
    },
  } as RunManifestRecord;
  return withMaterialPostSealBasis(started);
}

function recoveryChild(source: RunManifestRecord) {
  const allocation = beginChildManifest({
    continuation_basis: "RECOVERY_CHILD",
    manifest: buildBaseAllocatedManifest({
      access_binding_hash: source.access_binding_hash,
      deterministic_seed: source.deterministic_seed,
      idempotency_key: "idempotency://manifest.pc0201.recovery-child",
      manifest_id: "manifest.pc0201.recovery-child",
      requested_scope: source.requested_scope,
      schema_bundle_hash: source.schema_bundle_hash,
    }),
    parent_manifest: source,
  });
  return exactChildBasis(source, allocation.manifest);
}

test("exact replay without execution_basis_hash fails closed", () => {
  const source = completedManifest({
    idempotency_key: "idempotency://manifest.pc0201.source-missing-basis",
    manifest_id: "manifest.pc0201.source-missing-basis",
  });
  const child = {
    ...replayChild(source),
    frozen_execution_binding: null,
    hash_set: null,
  } as RunManifestRecord;

  const result = validateReplayPreconditions({
    replay_manifest: child,
    source_manifest: source,
  });

  expect(result.precondition_state).toBe("BLOCKED");
  expect(result.failure_codes).toContain("EXECUTION_BASIS_HASH_MISSING");
  expect(result.exact_replay_claim_allowed).toBe(false);
});

test("exact replay rejects fresh source, authority, and late-data reads", () => {
  const source = completedManifest({
    idempotency_key: "idempotency://manifest.pc0201.source-fresh-reads",
    manifest_id: "manifest.pc0201.source-fresh-reads",
  });
  const result = validateReplayPreconditions({
    fresh_source_collection_requested: true,
    late_data_rescan_requested: true,
    live_authority_read_requested: true,
    live_connector_read_requested: true,
    replay_manifest: replayChild(source),
    source_manifest: source,
  });

  expect(result.failure_codes).toEqual(
    expect.arrayContaining([
      "LIVE_CONNECTOR_READ_FORBIDDEN",
      "LIVE_AUTHORITY_READ_FORBIDDEN",
      "LATE_DATA_RESCAN_FORBIDDEN",
    ]),
  );
  expect(result.precondition_state).toBe("BLOCKED");
});

test("same-attempt recovery reuses exact frozen basis and ignores transport metadata", () => {
  const source = recoverableSource();
  const child = recoveryChild(source);

  const result = validateReplayPreconditions({
    replay_manifest: child,
    source_manifest: source,
    transport_recovery_metadata: {
      frame_epoch: 99,
      resume_token: "resume-token://not-a-replay-basis",
      shell_stability_token: "shell-stability://not-a-replay-basis",
    },
  });

  expect(result.precondition_state).toBe("READY");
  expect(result.actual_execution_basis_hash).toBe(result.expected_execution_basis_hash);

  const freshChild = {
    ...child,
    continuation_set: {
      ...child.continuation_set,
      config_inheritance_mode: "FRESH_CHILD_RESOLUTION" as const,
      input_inheritance_mode: "FRESH_CHILD_COLLECTION" as const,
    },
  } as RunManifestRecord;
  const blocked = validateReplayPreconditions({
    replay_manifest: freshChild,
    source_manifest: source,
  });
  expect(blocked.failure_codes).toEqual(
    expect.arrayContaining(["CONFIG_INHERITANCE_NOT_EXACT", "INPUT_INHERITANCE_NOT_EXACT"]),
  );
});

test("counterfactual analysis requires declared basis differences and never enables exact posture", () => {
  const source = completedManifest({
    idempotency_key: "idempotency://manifest.pc0201.source-counterfactual",
    manifest_id: "manifest.pc0201.source-counterfactual",
  });
  const child = replayChild(source, "COUNTERFACTUAL_ANALYSIS");

  const missingBasis = validateReplayPreconditions({
    replay_manifest: child,
    source_manifest: source,
  });
  expect(missingBasis.failure_codes).toContain("COUNTERFACTUAL_BASIS_MISSING");

  const declared = validateReplayPreconditions({
    counterfactual_basis: "counterfactual-basis://pc0201/rule-profile-v2",
    declared_counterfactual_dimensions: ["CONFIG"],
    replay_manifest: child,
    source_manifest: source,
  });
  expect(declared.precondition_state).toBe("READY");
  expect(declared.exact_replay_claim_allowed).toBe(false);
  expect(declared.basis_integrity_contract.declared_counterfactual_dimensions).toContain(
    "CONFIG",
  );
});
