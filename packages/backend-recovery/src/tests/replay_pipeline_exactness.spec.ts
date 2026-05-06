import { expect, test } from "@playwright/test";

import { stableJsonHash } from "../../../domain-kernel/src/primitives/hash.ts";
import {
  beginChildManifest,
  buildRunManifestStartClaimContract,
  deriveRunManifestPostSealBasisHash,
  normalizeAppendOnlyOutcomeProjection,
  type RunManifestRecord,
  type RunManifestReplayClass,
} from "../../../backend-manifest/src/index.ts";
import { validateContractSchema } from "../../../../tests/unit/backend_northbound/audit_and_enquiry_fixtures.ts";
import {
  executeReplayAgainstHistoricalBasis,
  loadHistoricalConfigFreeze,
  loadHistoricalInputFreeze,
  loadHistoricalPostSealBasis,
  loadHistoricalPresealGateContext,
  orchestrateReplayPipeline,
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
    frozen_at: "2026-05-05T09:10:00Z",
    ...buildFrozenBasis(allocated),
  } as unknown as RunManifestRecord;
  const { gates, evaluation } = buildSealReadyPresealEvaluation(frozen);
  return {
    ...frozen,
    lifecycle_state: "SEALED" as const,
    sealed_at: "2026-05-05T09:20:00Z",
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
  const openedAt = "2026-05-05T09:25:00Z";
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
    completed_at: "2026-05-05T09:40:00Z",
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
      manifest_id: `${source.manifest_id}.replay-child.${replayClass.toLowerCase()}`,
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

function loadedBasis(source: RunManifestRecord) {
  return {
    config: loadHistoricalConfigFreeze({ source_manifest: source }),
    input: loadHistoricalInputFreeze({ source_manifest: source }),
    post_seal: loadHistoricalPostSealBasis({ source_manifest: source }),
    preseal: loadHistoricalPresealGateContext({ source_manifest: source }),
  };
}

test("exact replay loads historical basis and emits schema-valid exact attestation", async () => {
  const source = completedManifest({
    idempotency_key: "idempotency://manifest.pc0201.pipeline-source",
    manifest_id: "manifest.pc0201.pipeline-source",
  });
  const child = replayChild(source);

  const result = orchestrateReplayPipeline({
    compared_at: "2026-05-05T10:00:00Z",
    replay_manifest: child,
    request_idempotency_key: child.idempotency_key,
    require_material_post_seal_basis: true,
    source_manifest: source,
  });

  expect(result.kind).toBe("REPLAY_EXECUTED");
  if (result.kind !== "REPLAY_EXECUTED") {
    throw new Error("expected replay execution");
  }
  const attestation = result.execution.attestation;
  await validateContractSchema("replay_attestation", attestation);
  await validateContractSchema(
    "replay_basis_integrity_contract",
    attestation.basis_integrity_contract,
  );
  expect(attestation.comparison_mode).toBe("EXACT_HASH_MATCH");
  expect(attestation.outcome_class).toBe("EXACT_MATCH");
  expect(attestation.expected_execution_basis_hash).toBe(source.hash_set!.execution_basis_hash);
  expect(attestation.actual_execution_basis_hash).toBe(source.hash_set!.execution_basis_hash);
  expect(attestation.expected_deterministic_outcome_hash).toBe(
    source.append_only_outcome_projection!.deterministic_outcome_hash,
  );
  expect(
    attestation.outcome_component_results
      .filter((row) => row.comparison_state !== "UNOBSERVABLE")
      .every((row) => row.component_ref !== null),
  ).toBe(true);
});

test("missing, corrupt, and schema-incompatible historical basis fail with typed blockers", () => {
  const source = completedManifest({
    idempotency_key: "idempotency://manifest.pc0201.pipeline-failures",
    manifest_id: "manifest.pc0201.pipeline-failures",
  });

  const corrupt = orchestrateReplayPipeline({
    compared_at: "2026-05-05T10:00:00Z",
    historical_artifact_states: { INPUT: "CORRUPT" },
    replay_manifest: replayChild(source),
    request_idempotency_key: `idempotency://${source.manifest_id}/replay`,
    source_manifest: source,
  });
  expect(corrupt.kind).toBe("PRECONDITION_BLOCKED");
  if (corrupt.kind !== "PRECONDITION_BLOCKED") {
    throw new Error("expected precondition blocker");
  }
  expect(corrupt.preconditions.basis_validation_state).toBe("CORRUPT");
  expect(corrupt.preconditions.failure_codes).toContain("HISTORICAL_ARTIFACT_CORRUPT");

  const incompatibleChild = {
    ...replayChild(source),
    schema_bundle_hash: "schema.bundle.hash.unsupported",
  } as RunManifestRecord;
  const incompatible = orchestrateReplayPipeline({
    compared_at: "2026-05-05T10:00:00Z",
    replay_manifest: incompatibleChild,
    replay_reader_schema_bundle_hash_or_null: "schema.bundle.hash.unsupported",
    request_idempotency_key: incompatibleChild.idempotency_key,
    source_manifest: source,
  });
  expect(incompatible.kind).toBe("PRECONDITION_BLOCKED");
  if (incompatible.kind !== "PRECONDITION_BLOCKED") {
    throw new Error("expected schema blocker");
  }
  expect(incompatible.preconditions.failure_codes).toContain("SCHEMA_READER_INCOMPATIBLE");
});

test("exact same-request replay rerun returns the existing replay child and attestation", () => {
  const source = completedManifest({
    idempotency_key: "idempotency://manifest.pc0201.idempotent-source",
    manifest_id: "manifest.pc0201.idempotent-source",
  });
  const child = replayChild(source);
  const execution = executeReplayAgainstHistoricalBasis({
    compared_at: "2026-05-05T10:00:00Z",
    historical_basis: loadedBasis(source),
    replay_manifest: child,
    source_manifest: source,
  });

  const rerun = orchestrateReplayPipeline({
    compared_at: "2026-05-05T10:05:00Z",
    existing_replay_candidates: [
      {
        attestation: execution.attestation,
        replay_manifest: child,
      },
    ],
    replay_manifest: child,
    request_idempotency_key: child.idempotency_key,
    source_manifest: source,
  });

  expect(rerun.kind).toBe("IDEMPOTENT_REPLAY_RETURNED");
  if (rerun.kind !== "IDEMPOTENT_REPLAY_RETURNED") {
    throw new Error("expected idempotent replay return");
  }
  expect(rerun.replay_manifest.manifest_id).toBe(child.manifest_id);
  expect(rerun.attestation.replay_attestation_id).toBe(execution.attestation.replay_attestation_id);
});

test("counterfactual replay preserves declared differences and analysis posture", async () => {
  const source = completedManifest({
    idempotency_key: "idempotency://manifest.pc0201.counterfactual-source",
    manifest_id: "manifest.pc0201.counterfactual-source",
  });
  const child = replayChild(source, "COUNTERFACTUAL_ANALYSIS");

  const result = orchestrateReplayPipeline({
    compared_at: "2026-05-05T10:00:00Z",
    counterfactual_basis: "counterfactual-basis://pc0201/rule-profile-v2",
    declared_counterfactual_dimensions: ["CONFIG"],
    replay_manifest: child,
    request_idempotency_key: child.idempotency_key,
    source_manifest: source,
  });

  expect(result.kind).toBe("REPLAY_EXECUTED");
  if (result.kind !== "REPLAY_EXECUTED") {
    throw new Error("expected counterfactual execution");
  }
  const attestation = result.execution.attestation;
  await validateContractSchema("replay_attestation", attestation);
  expect(attestation.analysis_only).toBe(true);
  expect(attestation.counterfactual_basis).toBe("counterfactual-basis://pc0201/rule-profile-v2");
  expect(attestation.comparison_mode).toBe("COUNTERFACTUAL_DECLARED");
  expect(attestation.outcome_class).toBe("EXPECTED_EQUIVALENCE");
  expect(attestation.comparison_mode).not.toBe("EXACT_HASH_MATCH");
  expect(attestation.basis_integrity_contract.declared_counterfactual_dimensions).toContain(
    "CONFIG",
  );
});
