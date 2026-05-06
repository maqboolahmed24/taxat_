import type { ManifestBranchDecisionContract } from "../../../generated-models/src/generated/typescript/manifest-and-release.ts";
import type { RunManifestContinuationSet } from "../../../generated-models/src/generated/typescript/domain-workflow-and-filing.ts";
import type { RunManifestRecord } from "../models/run_manifest.ts";
import { assertManifestLineageProjection } from "./validate_manifest_lineage_projection.ts";

export type SyncManifestPresealMirrorsErrorCode =
  | "MANIFEST_PRESEAL_MIRROR_PATCH_SEALED"
  | "MANIFEST_PRESEAL_MIRROR_SELECTED_ID_MISMATCH";

export class SyncManifestPresealMirrorsError extends Error {
  readonly code: SyncManifestPresealMirrorsErrorCode;

  constructor(code: SyncManifestPresealMirrorsErrorCode, detail: string) {
    super(`${code}: ${detail}`);
    this.name = "SyncManifestPresealMirrorsError";
    this.code = code;
  }
}

function assertPresealMutable(manifest: RunManifestRecord) {
  if (
    manifest.sealed_at !== null ||
    !["ALLOCATED", "FROZEN", "BLOCKED"].includes(manifest.lifecycle_state)
  ) {
    throw new SyncManifestPresealMirrorsError(
      "MANIFEST_PRESEAL_MIRROR_PATCH_SEALED",
      "sealed or post-start manifests cannot rewrite pre-seal mirrors",
    );
  }
}

function syncBranchDecision(
  manifest: RunManifestRecord,
  continuationSet: RunManifestContinuationSet,
): ManifestBranchDecisionContract {
  if (manifest.manifest_branch_decision.selected_manifest_id !== manifest.manifest_id) {
    throw new SyncManifestPresealMirrorsError(
      "MANIFEST_PRESEAL_MIRROR_SELECTED_ID_MISMATCH",
      "manifest_branch_decision.selected_manifest_id must continue to mirror manifest_id",
    );
  }
  return {
    ...structuredClone(manifest.manifest_branch_decision),
    selected_manifest_continuation_basis: manifest.continuation_basis,
    root_manifest_id: continuationSet.root_manifest_id ?? manifest.manifest_id,
    parent_manifest_id_or_null: continuationSet.parent_manifest_id,
    continuation_of_manifest_id_or_null: continuationSet.continuation_of_manifest_id,
    replay_of_manifest_id_or_null: continuationSet.replay_of_manifest_id,
    supersedes_manifest_id_or_null: continuationSet.supersedes_manifest_id,
    selected_manifest_generation: continuationSet.manifest_generation,
    config_inheritance_mode_or_null: continuationSet.config_inheritance_mode,
    input_inheritance_mode_or_null: continuationSet.input_inheritance_mode,
  };
}

export function syncManifestPresealMirrors(input: {
  continuation_set_patch?: Partial<RunManifestContinuationSet> | undefined;
  manifest: RunManifestRecord;
}): RunManifestRecord {
  assertPresealMutable(input.manifest);
  const continuationSet: RunManifestContinuationSet = {
    ...structuredClone(input.manifest.continuation_set),
    ...(input.continuation_set_patch ?? {}),
  };
  const nextManifest: RunManifestRecord = {
    ...structuredClone(input.manifest),
    root_manifest_id: continuationSet.root_manifest_id,
    parent_manifest_id: continuationSet.parent_manifest_id,
    continuation_of_manifest_id: continuationSet.continuation_of_manifest_id,
    replay_of_manifest_id: continuationSet.replay_of_manifest_id,
    supersedes_manifest_id: continuationSet.supersedes_manifest_id,
    manifest_generation: continuationSet.manifest_generation,
    continuation_set: continuationSet,
    manifest_branch_decision: syncBranchDecision(input.manifest, continuationSet),
  };

  if (nextManifest.frozen_execution_binding != null) {
    nextManifest.frozen_execution_binding = {
      ...structuredClone(nextManifest.frozen_execution_binding),
      root_manifest_id: continuationSet.root_manifest_id ?? nextManifest.manifest_id,
      parent_manifest_id: continuationSet.parent_manifest_id,
      continuation_of_manifest_id: continuationSet.continuation_of_manifest_id,
      replay_of_manifest_id: continuationSet.replay_of_manifest_id,
      supersedes_manifest_id: continuationSet.supersedes_manifest_id,
      manifest_generation: continuationSet.manifest_generation,
      parent_manifest_hash_at_branch: continuationSet.parent_manifest_hash_at_branch,
      config_inheritance_mode: continuationSet.config_inheritance_mode,
      input_inheritance_mode: continuationSet.input_inheritance_mode,
      inherited_config_freeze_ref: continuationSet.inherited_config_freeze_ref,
      fresh_resolution_reason_code: continuationSet.fresh_resolution_reason_code,
      inherited_input_freeze_ref: continuationSet.inherited_input_freeze_ref,
      fresh_collection_reason_code: continuationSet.fresh_collection_reason_code,
    };
  }

  return assertManifestLineageProjection(nextManifest);
}
