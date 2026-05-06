import type { RunManifestRecord } from "../models/run_manifest.ts";

export type ManifestLineageProjectionInvalidReasonCode =
  | "BRANCH_DECISION_LINEAGE_MISMATCH"
  | "CHILD_PARENT_HASH_MISSING"
  | "CHILD_PARENT_MISSING"
  | "FROZEN_EXECUTION_BINDING_LINEAGE_MISMATCH"
  | "NEW_MANIFEST_CHILD_LINEAGE_PRESENT"
  | "NEW_MANIFEST_GENERATION_INVALID"
  | "REPLAY_PARENT_MISMATCH"
  | "TOP_LEVEL_CONTINUATION_SET_MISMATCH";

export type ManifestLineageProjectionValidation = {
  reason_codes: ManifestLineageProjectionInvalidReasonCode[];
  valid: boolean;
};

export class ManifestLineageProjectionValidationError extends Error {
  readonly reason_codes: ManifestLineageProjectionInvalidReasonCode[];

  constructor(reasonCodes: ManifestLineageProjectionInvalidReasonCode[]) {
    super(`MANIFEST_LINEAGE_PROJECTION_INVALID: ${reasonCodes.join(", ")}`);
    this.name = "ManifestLineageProjectionValidationError";
    this.reason_codes = [...reasonCodes];
  }
}

function valuesEqual(left: unknown, right: unknown) {
  return JSON.stringify(left) === JSON.stringify(right);
}

function pushUnique<T>(values: T[], value: T) {
  if (!values.includes(value)) {
    values.push(value);
  }
}

export function validateManifestLineageProjection(
  manifest: RunManifestRecord,
): ManifestLineageProjectionValidation {
  const reasonCodes: ManifestLineageProjectionInvalidReasonCode[] = [];
  for (const field of [
    "root_manifest_id",
    "parent_manifest_id",
    "continuation_of_manifest_id",
    "replay_of_manifest_id",
    "supersedes_manifest_id",
    "manifest_generation",
  ] as const) {
    if (!valuesEqual(manifest[field], manifest.continuation_set[field])) {
      pushUnique(reasonCodes, "TOP_LEVEL_CONTINUATION_SET_MISMATCH");
    }
  }

  const branchDecision = manifest.manifest_branch_decision;
  if (
    branchDecision.selected_manifest_id !== manifest.manifest_id ||
    branchDecision.selected_manifest_continuation_basis !== manifest.continuation_basis ||
    !valuesEqual(branchDecision.root_manifest_id, manifest.root_manifest_id) ||
    !valuesEqual(branchDecision.parent_manifest_id_or_null, manifest.parent_manifest_id) ||
    !valuesEqual(
      branchDecision.continuation_of_manifest_id_or_null,
      manifest.continuation_of_manifest_id,
    ) ||
    !valuesEqual(branchDecision.replay_of_manifest_id_or_null, manifest.replay_of_manifest_id) ||
    !valuesEqual(branchDecision.supersedes_manifest_id_or_null, manifest.supersedes_manifest_id) ||
    !valuesEqual(branchDecision.selected_manifest_generation, manifest.manifest_generation) ||
    !valuesEqual(
      branchDecision.config_inheritance_mode_or_null,
      manifest.continuation_set.config_inheritance_mode,
    ) ||
    !valuesEqual(
      branchDecision.input_inheritance_mode_or_null,
      manifest.continuation_set.input_inheritance_mode,
    )
  ) {
    pushUnique(reasonCodes, "BRANCH_DECISION_LINEAGE_MISMATCH");
  }

  if (manifest.continuation_basis === "NEW_MANIFEST") {
    if (manifest.root_manifest_id !== manifest.manifest_id || manifest.manifest_generation !== 0) {
      pushUnique(reasonCodes, "NEW_MANIFEST_GENERATION_INVALID");
    }
    if (
      manifest.parent_manifest_id !== null ||
      manifest.continuation_of_manifest_id !== null ||
      manifest.replay_of_manifest_id !== null ||
      manifest.supersedes_manifest_id !== null
    ) {
      pushUnique(reasonCodes, "NEW_MANIFEST_CHILD_LINEAGE_PRESENT");
    }
  } else {
    if (manifest.parent_manifest_id === null || manifest.root_manifest_id === null) {
      pushUnique(reasonCodes, "CHILD_PARENT_MISSING");
    }
    if (manifest.continuation_set.parent_manifest_hash_at_branch === null) {
      pushUnique(reasonCodes, "CHILD_PARENT_HASH_MISSING");
    }
  }

  if (
    manifest.continuation_basis === "REPLAY_CHILD" &&
    manifest.parent_manifest_id !== manifest.replay_of_manifest_id
  ) {
    pushUnique(reasonCodes, "REPLAY_PARENT_MISMATCH");
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
    ] as const) {
      if (!valuesEqual(manifest.frozen_execution_binding[field], manifest[field])) {
        pushUnique(reasonCodes, "FROZEN_EXECUTION_BINDING_LINEAGE_MISMATCH");
      }
    }
    for (const field of [
      "parent_manifest_hash_at_branch",
      "config_inheritance_mode",
      "input_inheritance_mode",
      "inherited_config_freeze_ref",
      "fresh_resolution_reason_code",
      "inherited_input_freeze_ref",
      "fresh_collection_reason_code",
    ] as const) {
      if (!valuesEqual(manifest.frozen_execution_binding[field], manifest.continuation_set[field])) {
        pushUnique(reasonCodes, "FROZEN_EXECUTION_BINDING_LINEAGE_MISMATCH");
      }
    }
  }

  return {
    valid: reasonCodes.length === 0,
    reason_codes: reasonCodes,
  };
}

export function assertManifestLineageProjection(manifest: RunManifestRecord) {
  const validation = validateManifestLineageProjection(manifest);
  if (!validation.valid) {
    throw new ManifestLineageProjectionValidationError(validation.reason_codes);
  }
  return manifest;
}
