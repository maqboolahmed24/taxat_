import { normalizeUtcInstantString } from "../../../domain-kernel/src/primitives/time.ts";
import {
  buildManifestBranchDecisionContract,
  buildRunManifestContinuationSet,
  buildRunManifestStateTransitionContract,
  normalizeRunManifestRecord,
  type RunManifestRecord,
} from "../models/run_manifest.ts";
import type { RunManifestRepository } from "../repositories/run_manifest_repository.ts";
import { validateRunManifestMirrorConsistency } from "./manifest_mirror_consistency_validator.ts";

export type BeginManifestInput = {
  created_at?: string;
  launch_context?: {
    nightly_batch_run_ref?: string | null;
    nightly_window_key?: string | null;
  };
  manifest: RunManifestRecord;
  persisted_at?: string;
  run_manifest_repository?: RunManifestRepository;
  transition_audit_ref?: string;
};

export async function beginManifest(input: BeginManifestInput) {
  const createdAt = normalizeUtcInstantString(input.created_at ?? input.manifest.created_at);
  const nightlyWindowKey: string | null =
    input.manifest.run_kind === "NIGHTLY"
      ? input.launch_context?.nightly_window_key ?? input.manifest.nightly_window_key ?? null
      : null;
  const branchDecision = buildManifestBranchDecisionContract({
    access_binding_hash: input.manifest.access_binding_hash,
    branch_action: "NEW_MANIFEST",
    idempotency_key: input.manifest.idempotency_key,
    manifest_id: input.manifest.manifest_id,
    requested_scope: input.manifest.requested_scope,
    mode: input.manifest.mode,
    run_kind: input.manifest.run_kind,
    replay_class_or_null: input.manifest.replay_class ?? null,
    nightly_window_key_or_null: nightlyWindowKey,
    root_manifest_id: input.manifest.manifest_id,
    parent_manifest_id_or_null: null,
    continuation_of_manifest_id_or_null: null,
    replay_of_manifest_id_or_null: null,
    supersedes_manifest_id_or_null: null,
    selected_manifest_generation: 0,
  });
  const manifest = validateRunManifestMirrorConsistency(
    normalizeRunManifestRecord({
      ...structuredClone(input.manifest),
      root_manifest_id: input.manifest.manifest_id,
      parent_manifest_id: null,
      continuation_of_manifest_id: null,
      replay_of_manifest_id: null,
      supersedes_manifest_id: null,
      manifest_generation: 0,
      continuation_basis: "NEW_MANIFEST",
      manifest_branch_decision: branchDecision,
      continuation_set: buildRunManifestContinuationSet(branchDecision),
      lifecycle_state: "ALLOCATED",
      state_transition_contract: buildRunManifestStateTransitionContract({
        current_state: "ALLOCATED",
        previous_state_or_null: null,
        transition_event_code: "manifest_allocated",
        transition_applied_at: createdAt,
        transition_audit_ref:
          input.transition_audit_ref ??
          `audit://${input.manifest.manifest_id}/manifest-allocated`,
      }),
      nightly_batch_run_ref:
        input.manifest.run_kind === "NIGHTLY"
          ? input.launch_context?.nightly_batch_run_ref ?? input.manifest.nightly_batch_run_ref ?? null
          : null,
      nightly_window_key: nightlyWindowKey,
      frozen_at: null,
      opened_at: null,
      sealed_at: null,
      completed_at: null,
      superseded_at: null,
      retired_at: null,
      config_freeze: null,
      input_freeze: null,
      hash_set: null,
      frozen_execution_binding: null,
      preseal_gate_evaluation: null,
      manifest_start_claim: null,
      append_only_outcome_projection: null,
      gating_decisions: [],
      output_refs: {},
      submission_refs: [],
      drift_refs: [],
      decision_bundle_hash: null,
      deterministic_outcome_hash: null,
      replay_attestation_ref: null,
      created_at: createdAt,
    }),
  );
  const stored_manifest = input.run_manifest_repository
    ? await input.run_manifest_repository.createManifest({
        manifest,
        persisted_at: normalizeUtcInstantString(input.persisted_at ?? createdAt),
      })
    : null;

  return {
    manifest,
    stored_manifest,
    root_manifest_id: manifest.root_manifest_id,
    nightly_launch_context: {
      nightly_batch_run_ref: manifest.nightly_batch_run_ref ?? null,
      nightly_window_key: manifest.nightly_window_key ?? null,
    },
  };
}
