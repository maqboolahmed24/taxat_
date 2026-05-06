import { parseUtcInstant } from "../../../domain-kernel/src/primitives/time.ts";

import type { RunManifestRecord } from "../models/run_manifest.ts";

export type RunManifestMirrorValidationErrorCode =
  | "MANIFEST_LINEAGE_PROJECTION_MISMATCH"
  | "MANIFEST_OUTCOME_PROJECTION_MISMATCH"
  | "MANIFEST_FROZEN_BINDING_MISMATCH"
  | "MANIFEST_HASH_SET_MISMATCH"
  | "MANIFEST_PRESEAL_POSTURE_INVALID"
  | "MANIFEST_START_CLAIM_INVALID"
  | "MANIFEST_RUNTIME_POSTURE_INVALID";

export class RunManifestMirrorValidationError extends Error {
  readonly code: RunManifestMirrorValidationErrorCode;

  constructor(code: RunManifestMirrorValidationErrorCode, detail: string) {
    super(`${code}: ${detail}`);
    this.name = "RunManifestMirrorValidationError";
    this.code = code;
  }
}

function assertCondition(
  condition: unknown,
  code: RunManifestMirrorValidationErrorCode,
  detail: string,
): asserts condition {
  if (!condition) {
    throw new RunManifestMirrorValidationError(code, detail);
  }
}

function valuesEqual(left: unknown, right: unknown) {
  return JSON.stringify(left) === JSON.stringify(right);
}

export function validateRunManifestMirrorConsistency(manifest: RunManifestRecord) {
  for (const field of [
    "root_manifest_id",
    "parent_manifest_id",
    "continuation_of_manifest_id",
    "replay_of_manifest_id",
    "supersedes_manifest_id",
    "manifest_generation",
  ] as const) {
    assertCondition(
      valuesEqual(manifest[field], manifest.continuation_set[field]),
      "MANIFEST_LINEAGE_PROJECTION_MISMATCH",
      `${field} must mirror continuation_set.${field}`,
    );
  }

  assertCondition(
    valuesEqual(
      manifest.manifest_branch_decision.selected_manifest_id,
      manifest.manifest_id,
    ),
    "MANIFEST_LINEAGE_PROJECTION_MISMATCH",
    "manifest_branch_decision.selected_manifest_id must mirror manifest_id",
  );
  assertCondition(
    manifest.manifest_branch_decision.branch_action === manifest.continuation_basis,
    "MANIFEST_LINEAGE_PROJECTION_MISMATCH",
    "manifest_branch_decision.branch_action must mirror continuation_basis",
  );
  assertCondition(
    valuesEqual(
      manifest.manifest_branch_decision.selected_manifest_continuation_basis,
      manifest.continuation_basis,
    ),
    "MANIFEST_LINEAGE_PROJECTION_MISMATCH",
    "manifest_branch_decision.selected_manifest_continuation_basis must mirror continuation_basis",
  );
  assertCondition(
    manifest.manifest_lineage_trace_refs.length > 0,
    "MANIFEST_LINEAGE_PROJECTION_MISMATCH",
    "manifest_lineage_trace_refs must retain at least one persisted lineage trace ref",
  );

  if (manifest.append_only_outcome_projection != null) {
    for (const field of [
      "gating_decisions",
      "output_refs",
      "audit_refs",
      "submission_refs",
      "drift_refs",
      "decision_bundle_hash",
      "deterministic_outcome_hash",
      "replay_attestation_ref",
    ] as const) {
      assertCondition(
        valuesEqual(manifest[field], manifest.append_only_outcome_projection[field]),
        "MANIFEST_OUTCOME_PROJECTION_MISMATCH",
        `${field} must mirror append_only_outcome_projection.${field}`,
      );
    }
  }

  if (manifest.hash_set != null) {
    assertCondition(
      manifest.hash_set.access_binding_hash === manifest.access_binding_hash,
      "MANIFEST_HASH_SET_MISMATCH",
      "hash_set.access_binding_hash must mirror access_binding_hash",
    );
    if (manifest.config_freeze != null) {
      assertCondition(
        manifest.hash_set.config_freeze_hash === manifest.config_freeze.config_freeze_hash,
        "MANIFEST_HASH_SET_MISMATCH",
        "hash_set.config_freeze_hash must mirror config_freeze.config_freeze_hash",
      );
      assertCondition(
        manifest.hash_set.config_surface_hash === manifest.config_freeze.config_surface_hash,
        "MANIFEST_HASH_SET_MISMATCH",
        "hash_set.config_surface_hash must mirror config_freeze.config_surface_hash",
      );
    }
    if (manifest.input_freeze != null) {
      assertCondition(
        manifest.hash_set.input_set_hash === manifest.input_freeze.input_set_hash,
        "MANIFEST_HASH_SET_MISMATCH",
        "hash_set.input_set_hash must mirror input_freeze.input_set_hash",
      );
    }
  }

  if (manifest.frozen_execution_binding != null) {
    for (const field of [
      "manifest_id",
      "continuation_basis",
      "root_manifest_id",
      "parent_manifest_id",
      "continuation_of_manifest_id",
      "replay_of_manifest_id",
      "supersedes_manifest_id",
      "manifest_generation",
      "access_binding_hash",
      "environment_ref",
      "provider_environment_refs",
      "code_build_id",
      "schema_bundle_hash",
      "feature_flag_snapshot_hash",
      "deterministic_seed",
      "authority_context_ref",
    ] as const) {
      assertCondition(
        valuesEqual(manifest.frozen_execution_binding[field], manifest[field]),
        "MANIFEST_FROZEN_BINDING_MISMATCH",
        `frozen_execution_binding.${field} must mirror manifest.${field}`,
      );
    }
    assertCondition(
      valuesEqual(
        manifest.frozen_execution_binding.requested_scope,
        manifest.requested_scope,
      ),
      "MANIFEST_FROZEN_BINDING_MISMATCH",
      "frozen_execution_binding.requested_scope must mirror requested_scope",
    );
    assertCondition(
      valuesEqual(
        manifest.frozen_execution_binding.scope_execution_binding.requested_scope,
        manifest.scope_execution_binding.requested_scope,
      ) &&
        valuesEqual(
          manifest.frozen_execution_binding.scope_execution_binding.executable_scope,
          manifest.scope_execution_binding.executable_scope,
        ),
      "MANIFEST_FROZEN_BINDING_MISMATCH",
      "frozen_execution_binding.scope_execution_binding must mirror the manifest scope_execution_binding",
    );
    if (manifest.hash_set != null) {
      assertCondition(
        manifest.frozen_execution_binding.execution_basis_hash ===
          manifest.hash_set.execution_basis_hash,
        "MANIFEST_FROZEN_BINDING_MISMATCH",
        "frozen_execution_binding.execution_basis_hash must mirror hash_set.execution_basis_hash",
      );
      assertCondition(
        manifest.frozen_execution_binding.manifest_hash === manifest.hash_set.manifest_hash,
        "MANIFEST_FROZEN_BINDING_MISMATCH",
        "frozen_execution_binding.manifest_hash must mirror hash_set.manifest_hash",
      );
    }
  }

  assertCondition(
    manifest.run_kind === "REPLAY" ? manifest.replay_class != null : manifest.replay_class == null,
    "MANIFEST_RUNTIME_POSTURE_INVALID",
    "replay_class must be present only for replay runs",
  );
  assertCondition(
    manifest.run_kind === "NIGHTLY"
      ? manifest.nightly_window_key !== null && manifest.nightly_window_key !== undefined
      : manifest.nightly_window_key == null,
    "MANIFEST_RUNTIME_POSTURE_INVALID",
    "nightly_window_key must be present only for nightly runs",
  );
  if (
    manifest.requested_scope.some((token) =>
      ["prepare_submission", "submit", "amendment_intent", "amendment_submit"].includes(
        token,
      ),
    )
  ) {
    assertCondition(
      manifest.provider_environment_refs.length > 0,
      "MANIFEST_RUNTIME_POSTURE_INVALID",
      "live and amendment-capable manifests must retain provider_environment_refs",
    );
  }

  if (manifest.frozen_at !== null) {
    assertCondition(
      manifest.preseal_gate_evaluation != null,
      "MANIFEST_PRESEAL_POSTURE_INVALID",
      "frozen manifests must retain a preseal_gate_evaluation",
    );
  }
  if (manifest.sealed_at !== null) {
    assertCondition(
      manifest.manifest_start_claim != null,
      "MANIFEST_START_CLAIM_INVALID",
      "sealed manifests must retain a manifest_start_claim",
    );
  }

  if (manifest.lifecycle_state === "SEALED") {
    assertCondition(
      manifest.opened_at === null,
      "MANIFEST_START_CLAIM_INVALID",
      "SEALED manifests must remain pre-start and keep opened_at = null",
    );
    assertCondition(
      Object.keys(manifest.output_refs).length === 0 &&
        manifest.submission_refs.length === 0 &&
        manifest.drift_refs.length === 0 &&
        manifest.decision_bundle_hash === null &&
        manifest.deterministic_outcome_hash === null &&
        manifest.replay_attestation_ref === null,
      "MANIFEST_OUTCOME_PROJECTION_MISMATCH",
      "SEALED manifests must not carry post-start outputs or projections",
    );
    assertCondition(
      manifest.manifest_start_claim?.claim_state === "UNCLAIMED_SEALED",
      "MANIFEST_START_CLAIM_INVALID",
      "SEALED manifests must keep UNCLAIMED_SEALED start-claim posture",
    );
  }

  if (manifest.lifecycle_state === "IN_PROGRESS") {
    assertCondition(
      manifest.opened_at !== null,
      "MANIFEST_START_CLAIM_INVALID",
      "IN_PROGRESS manifests must retain opened_at",
    );
    assertCondition(
      manifest.manifest_start_claim?.claim_state === "ACTIVE_LEASED" ||
        manifest.manifest_start_claim?.claim_state === "STALE_RECLAIM_REQUIRED",
      "MANIFEST_START_CLAIM_INVALID",
      "IN_PROGRESS manifests must retain an active or reclaimable start-claim posture",
    );
  }

  if (manifest.lifecycle_state === "FAILED") {
    assertCondition(
      manifest.manifest_start_claim?.claim_state === "STALE_RECLAIM_REQUIRED" ||
        manifest.manifest_start_claim?.claim_state === "TERMINAL_RESULT_RECORDED",
      "MANIFEST_START_CLAIM_INVALID",
      "FAILED manifests must distinguish reclaim-required from terminal-result posture",
    );
  }

  if (
    ["COMPLETED", "SUPERSEDED", "REPLAY_ONLY", "RETIRED"].includes(
      manifest.lifecycle_state,
    )
  ) {
    assertCondition(
      manifest.manifest_start_claim?.claim_state === "TERMINAL_RESULT_RECORDED",
      "MANIFEST_START_CLAIM_INVALID",
      `${manifest.lifecycle_state} manifests must retain terminal start-claim posture`,
    );
  }

  if (manifest.lifecycle_state === "BLOCKED" && manifest.sealed_at !== null) {
    assertCondition(
      manifest.manifest_start_claim?.claim_state === "TERMINAL_RESULT_RECORDED",
      "MANIFEST_START_CLAIM_INVALID",
      "post-start BLOCKED manifests must retain terminal start-claim posture",
    );
  }

  const timestamps = [
    manifest.created_at,
    manifest.frozen_at,
    manifest.sealed_at,
    manifest.opened_at,
    manifest.completed_at,
    manifest.superseded_at,
    manifest.retired_at,
  ]
    .filter((value): value is string => value !== null)
    .map((value) => parseUtcInstant(value).valueOf());

  for (let index = 1; index < timestamps.length; index += 1) {
    assertCondition(
      timestamps[index] >= timestamps[index - 1],
      "MANIFEST_RUNTIME_POSTURE_INVALID",
      "manifest timestamps must remain monotonic",
    );
  }

  return structuredClone(manifest);
}
