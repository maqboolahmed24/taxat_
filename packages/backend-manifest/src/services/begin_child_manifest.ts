import type { ManifestBranchDecisionContract } from "../../../generated-models/src/generated/typescript/manifest-and-release.ts";
import { normalizeUtcInstantString } from "../../../domain-kernel/src/primitives/time.ts";
import {
  buildManifestBranchDecisionContract,
  buildRunManifestContinuationSet,
  buildRunManifestStateTransitionContract,
  normalizeRunManifestRecord,
  type RunManifestContinuationBasis,
  type RunManifestRecord,
} from "../models/run_manifest.ts";
import { getPriorManifestHash } from "./prior_manifest_compatibility_validator.ts";
import { buildAttemptLineageRef } from "./attempt_lineage_ref_service.ts";
import { validateRunManifestMirrorConsistency } from "./manifest_mirror_consistency_validator.ts";

export type ChildManifestContinuationBasis = Exclude<
  RunManifestContinuationBasis,
  "NEW_MANIFEST"
>;

export type BeginChildManifestErrorCode =
  | "CHILD_BRANCH_DECISION_REQUIRED"
  | "PARENT_MANIFEST_HASH_REQUIRED"
  | "RECOVERY_CHILD_BLOCKED_ACTIVE_LEASE";

export class BeginChildManifestError extends Error {
  readonly code: BeginChildManifestErrorCode;

  constructor(code: BeginChildManifestErrorCode, detail: string) {
    super(`${code}: ${detail}`);
    this.name = "BeginChildManifestError";
    this.code = code;
  }
}

function inheritanceForBasis(basis: ChildManifestContinuationBasis) {
  switch (basis) {
    case "REPLAY_CHILD":
      return {
        config_inheritance_mode_or_null: "REPLAY_EXACT" as const,
        input_inheritance_mode_or_null: "REPLAY_EXACT" as const,
      };
    case "RECOVERY_CHILD":
      return {
        config_inheritance_mode_or_null: "RECOVERY_EXACT" as const,
        input_inheritance_mode_or_null: "RECOVERY_EXACT" as const,
      };
    case "CONTINUATION_CHILD":
    case "NEW_REQUEST_CHILD":
      return {
        config_inheritance_mode_or_null: "FRESH_CHILD_RESOLUTION" as const,
        input_inheritance_mode_or_null: "FRESH_CHILD_COLLECTION" as const,
      };
  }
}

function buildDefaultChildBranchDecision(input: {
  child_manifest: RunManifestRecord;
  continuation_basis: ChildManifestContinuationBasis;
  parent_manifest: RunManifestRecord;
}): ManifestBranchDecisionContract {
  const parentHash = getPriorManifestHash(input.parent_manifest);
  if (parentHash == null) {
    throw new BeginChildManifestError(
      "PARENT_MANIFEST_HASH_REQUIRED",
      "child manifest allocation requires parent manifest_hash at branch",
    );
  }
  const inheritance = inheritanceForBasis(input.continuation_basis);
  return buildManifestBranchDecisionContract({
    access_binding_hash: input.child_manifest.access_binding_hash,
    branch_action: input.continuation_basis,
    idempotency_key: input.child_manifest.idempotency_key,
    manifest_id: input.child_manifest.manifest_id,
    requested_scope: input.child_manifest.requested_scope,
    mode: input.child_manifest.mode,
    run_kind: input.child_manifest.run_kind,
    replay_class_or_null: input.child_manifest.replay_class ?? null,
    nightly_window_key_or_null: input.child_manifest.nightly_window_key ?? null,
    root_manifest_id: input.parent_manifest.root_manifest_id ?? input.parent_manifest.manifest_id,
    parent_manifest_id_or_null: input.parent_manifest.manifest_id,
    continuation_of_manifest_id_or_null:
      input.continuation_basis === "REPLAY_CHILD" ? null : input.parent_manifest.manifest_id,
    replay_of_manifest_id_or_null:
      input.continuation_basis === "REPLAY_CHILD" ? input.parent_manifest.manifest_id : null,
    supersedes_manifest_id_or_null:
      input.continuation_basis === "NEW_REQUEST_CHILD" ? input.parent_manifest.manifest_id : null,
    selected_manifest_generation: input.parent_manifest.manifest_generation + 1,
    prior_manifest_id_or_null: input.parent_manifest.manifest_id,
    prior_manifest_hash_at_decision_or_null: parentHash,
    prior_manifest_lifecycle_state_or_null: input.parent_manifest.lifecycle_state,
    config_inheritance_mode_or_null: inheritance.config_inheritance_mode_or_null,
    input_inheritance_mode_or_null: inheritance.input_inheritance_mode_or_null,
  });
}

function inheritedFreezeRefs(parentManifest: RunManifestRecord) {
  return {
    inherited_config_freeze_ref:
      parentManifest.config_freeze?.config_freeze_id ??
      parentManifest.frozen_execution_binding?.config_freeze_ref ??
      null,
    inherited_input_freeze_ref:
      parentManifest.input_freeze?.input_freeze_id ??
      parentManifest.frozen_execution_binding?.input_freeze_ref ??
      null,
  };
}

export function beginChildManifest(input: {
  branch_decision?: ManifestBranchDecisionContract;
  continuation_basis?: ChildManifestContinuationBasis;
  created_at?: string;
  launch_context?: {
    nightly_batch_run_ref?: string | null;
    nightly_window_key?: string | null;
  };
  manifest: RunManifestRecord;
  parent_manifest: RunManifestRecord;
  transition_audit_ref?: string;
}) {
  const continuationBasis =
    input.continuation_basis ??
    (input.branch_decision?.selected_manifest_continuation_basis as
      | ChildManifestContinuationBasis
      | undefined);
  if (!continuationBasis) {
    throw new BeginChildManifestError(
      "CHILD_BRANCH_DECISION_REQUIRED",
      "child allocation requires a manifest-producing child continuation basis",
    );
  }
  if (
    continuationBasis === "RECOVERY_CHILD" &&
    input.parent_manifest.manifest_start_claim?.claim_state === "ACTIVE_LEASED"
  ) {
    throw new BeginChildManifestError(
      "RECOVERY_CHILD_BLOCKED_ACTIVE_LEASE",
      "recovery children cannot be allocated while the source manifest has an active lease",
    );
  }

  const createdAt = normalizeUtcInstantString(input.created_at ?? input.manifest.created_at);
  const branchDecision =
    input.branch_decision ??
    buildDefaultChildBranchDecision({
      child_manifest: input.manifest,
      continuation_basis: continuationBasis,
      parent_manifest: input.parent_manifest,
    });
  const continuationSet = {
    ...buildRunManifestContinuationSet(branchDecision),
    ...(["REPLAY_CHILD", "RECOVERY_CHILD"].includes(continuationBasis)
      ? inheritedFreezeRefs(input.parent_manifest)
      : {}),
  };
  const nightlyWindowKey: string | null =
    input.manifest.run_kind === "NIGHTLY"
      ? input.launch_context?.nightly_window_key ??
        input.manifest.nightly_window_key ??
        input.parent_manifest.nightly_window_key ??
        null
      : null;

  const manifest = validateRunManifestMirrorConsistency(
    normalizeRunManifestRecord({
      ...structuredClone(input.manifest),
      root_manifest_id: branchDecision.root_manifest_id,
      parent_manifest_id: branchDecision.parent_manifest_id_or_null,
      continuation_of_manifest_id: branchDecision.continuation_of_manifest_id_or_null,
      replay_of_manifest_id: branchDecision.replay_of_manifest_id_or_null,
      supersedes_manifest_id: branchDecision.supersedes_manifest_id_or_null,
      manifest_generation: branchDecision.selected_manifest_generation,
      continuation_basis: continuationBasis,
      manifest_branch_decision: branchDecision,
      continuation_set: continuationSet,
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
          ? input.launch_context?.nightly_batch_run_ref ??
            input.manifest.nightly_batch_run_ref ??
            input.parent_manifest.nightly_batch_run_ref ??
            null
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

  return {
    manifest,
    parent_manifest_id: manifest.parent_manifest_id,
    root_manifest_id: manifest.root_manifest_id,
    parent_manifest_hash_at_branch: manifest.continuation_set.parent_manifest_hash_at_branch,
    expected_attempt_lineage_ref:
      continuationBasis === "RECOVERY_CHILD"
        ? buildAttemptLineageRef({
            manifest,
            source_manifest: input.parent_manifest,
          })
        : buildAttemptLineageRef({ manifest }),
  };
}
