import { expect, test } from "@playwright/test";

import {
  buildFrozenBasis,
  buildBaseAllocatedManifest,
  buildCompletedOutcomeProjection,
  buildSealReadyPresealEvaluation,
  buildStartedManifestClaim,
  buildTerminalManifestClaim,
} from "../../fixtures/run_manifest_fixture.ts";
import {
  applyRunManifestTransitionDefaults,
  getNextRunManifestLifecycleState,
  RunManifestLifecycleError,
  RunManifestMirrorValidationError,
  validateRunManifestMirrorConsistency,
  validateRunManifestTransition,
} from "../../../packages/backend-manifest/src/index.ts";

test("run manifest lifecycle machine only permits the governed transition graph", () => {
  expect(getNextRunManifestLifecycleState("ALLOCATED", "freeze_success")).toBe("FROZEN");
  expect(getNextRunManifestLifecycleState("FROZEN", "seal_success")).toBe("SEALED");
  expect(getNextRunManifestLifecycleState("SEALED", "run_started")).toBe("IN_PROGRESS");
  expect(getNextRunManifestLifecycleState("IN_PROGRESS", "run_completed")).toBe("COMPLETED");
  expect(getNextRunManifestLifecycleState("COMPLETED", "replay_designation")).toBe(
    "REPLAY_ONLY",
  );
  expect(() =>
    getNextRunManifestLifecycleState("SEALED", "run_completed"),
  ).toThrow(RunManifestLifecycleError);
  expect(() =>
    getNextRunManifestLifecycleState("BLOCKED", "run_started"),
  ).toThrow(RunManifestLifecycleError);
});

test("transition validation preserves the immutable envelope and state-specific placeholders", () => {
  const allocated = buildBaseAllocatedManifest();
  const frozenBasis = buildFrozenBasis(allocated);
  const frozen = {
    ...allocated,
    frozen_at: "2026-04-23T09:10:00Z",
    ...frozenBasis,
  };
  applyRunManifestTransitionDefaults({
    current_manifest: allocated,
    event_code: "freeze_success",
    transition_applied_at: "2026-04-23T09:10:00Z",
    transition_audit_ref: `audit://${allocated.manifest_id}/freeze-success`,
    next_manifest: frozen,
  });

  validateRunManifestTransition({
    current_manifest: allocated,
    event_code: "freeze_success",
    next_manifest: frozen,
  });

  const { gates, evaluation } = buildSealReadyPresealEvaluation(frozen);
  const sealed = {
    ...frozen,
    sealed_at: "2026-04-23T09:20:00Z",
    preseal_gate_evaluation: evaluation,
    append_only_outcome_projection: {
      ...frozen.append_only_outcome_projection!,
      gating_decisions: gates,
    },
    gating_decisions: gates,
    manifest_start_claim: buildTerminalManifestClaim(
      {
        ...frozen,
        hash_set: frozen.hash_set!,
      },
      "2026-04-23T09:15:00Z",
      "COMPLETED",
    ),
  };
  applyRunManifestTransitionDefaults({
    current_manifest: frozen,
    event_code: "seal_success",
    transition_applied_at: "2026-04-23T09:20:00Z",
    transition_audit_ref: `audit://${allocated.manifest_id}/seal-success`,
    next_manifest: sealed,
  });

  expect(() =>
    validateRunManifestTransition({
      current_manifest: frozen,
      event_code: "seal_success",
      next_manifest: sealed,
    }),
  ).toThrow(/UNCLAIMED_SEALED/);
});

test("mirror validation rejects replay drift and sealed pre-start output drift", () => {
  const allocated = buildBaseAllocatedManifest();
  const frozenBasis = buildFrozenBasis(allocated);
  const frozen = {
    ...allocated,
    lifecycle_state: "FROZEN" as const,
    frozen_at: "2026-04-23T09:10:00Z",
    ...frozenBasis,
  };
  const { gates, evaluation } = buildSealReadyPresealEvaluation(frozen);
  const sealed = {
    ...frozen,
    lifecycle_state: "SEALED" as const,
    sealed_at: "2026-04-23T09:20:00Z",
    preseal_gate_evaluation: evaluation,
    append_only_outcome_projection: {
      ...frozen.append_only_outcome_projection!,
      gating_decisions: gates,
    },
    gating_decisions: gates,
    manifest_start_claim: {
      contract_class: "MANIFEST_START_CLAIM",
      manifest_id: frozen.manifest_id,
      manifest_hash: frozen.hash_set!.manifest_hash,
      execution_basis_hash: frozen.hash_set!.execution_basis_hash,
      access_binding_hash: frozen.access_binding_hash,
      attempt_lineage_ref: `attempt-lineage://${frozen.manifest_id}`,
      claim_state: "UNCLAIMED_SEALED",
      claim_status_code: "CLAIMABLE",
      claim_epoch: 0,
      claim_holder_ref_or_null: null,
      claim_token_or_null: null,
      claim_acquired_at_or_null: null,
      claim_expires_at_or_null: null,
      claim_released_at_or_null: null,
      claim_release_reason_code_or_null: null,
      stale_reclaim_reason_code_or_null: null,
      publication_state: "NOT_PUBLISHED",
      stage_dag_ref_or_null: null,
      outbox_batch_ref_or_null: null,
      first_publication_committed_at_or_null: null,
      concurrency_policy: "SINGLE_WRITER_LEASED_START_ONLY",
      claim_publication_atomicity: "CLAIM_AND_FIRST_PUBLICATION_COMMIT_TOGETHER",
      stale_reclaim_policy: "EXPLICIT_SUCCESSOR_PROOF_REQUIRED",
      recovery_child_policy: "FORBID_WHILE_ACTIVE_LEASE",
      nightly_reclaim_policy: "DEFER_DUPLICATE_START_WHILE_ACTIVE_LEASE",
    },
  };

  expect(() =>
    validateRunManifestMirrorConsistency({
      ...sealed,
      replay_class: "STANDARD_REPLAY",
    }),
  ).toThrow(RunManifestMirrorValidationError);

  expect(() =>
    validateRunManifestMirrorConsistency({
      ...sealed,
      output_refs: {
        decision_bundle: {
          linkage_role_code: "DECISION_BUNDLE",
          artifact_type: "DecisionBundle",
          artifact_ref: "decision-bundle://sealed-drift",
          artifact_hash_or_null: "decision-bundle-hash://sealed-drift",
          produced_by_manifest_id: sealed.manifest_id,
          dependency_identity_refs: [],
        },
      },
    }),
  ).toThrow(RunManifestMirrorValidationError);
});

test("terminal output projections remain structured and subordinate to the nested carrier", () => {
  const allocated = buildBaseAllocatedManifest();
  const frozenBasis = buildFrozenBasis(allocated);
  const frozen = {
    ...allocated,
    lifecycle_state: "FROZEN" as const,
    frozen_at: "2026-04-23T09:10:00Z",
    ...frozenBasis,
  };
  const { gates, evaluation } = buildSealReadyPresealEvaluation(frozen);
  const openedAt = "2026-04-23T09:25:00Z";
  const inProgress = {
    ...frozen,
    lifecycle_state: "IN_PROGRESS" as const,
    sealed_at: "2026-04-23T09:20:00Z",
    opened_at: openedAt,
    preseal_gate_evaluation: evaluation,
    append_only_outcome_projection: {
      ...frozen.append_only_outcome_projection!,
      gating_decisions: gates,
    },
    gating_decisions: gates,
    manifest_start_claim: buildStartedManifestClaim(
      {
        ...frozen,
        hash_set: frozen.hash_set!,
      },
      openedAt,
    ),
  };
  const outcomeProjection = buildCompletedOutcomeProjection(inProgress);
  const completed = {
    ...inProgress,
    lifecycle_state: "COMPLETED" as const,
    completed_at: "2026-04-23T09:40:00Z",
    append_only_outcome_projection: outcomeProjection,
    gating_decisions: outcomeProjection.gating_decisions,
    output_refs: outcomeProjection.output_refs,
    audit_refs: outcomeProjection.audit_refs,
    submission_refs: outcomeProjection.submission_refs,
    drift_refs: outcomeProjection.drift_refs,
    decision_bundle_hash: outcomeProjection.decision_bundle_hash,
    deterministic_outcome_hash: outcomeProjection.deterministic_outcome_hash,
    replay_attestation_ref: outcomeProjection.replay_attestation_ref,
    manifest_start_claim: buildTerminalManifestClaim(
      {
        ...inProgress,
        hash_set: inProgress.hash_set!,
      },
      openedAt,
      "COMPLETED",
    ),
  };

  const validated = validateRunManifestMirrorConsistency(completed);
  expect(validated.output_refs.decision_bundle.dependency_identity_refs).toEqual([
    `dependency://${completed.manifest_id}/decision-bundle`,
  ]);
  expect(validated.decision_bundle_hash).toBe(
    `decision-bundle-hash://${completed.manifest_id}`,
  );
});
