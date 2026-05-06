import type { RunManifestRecord } from "../models/run_manifest.ts";
import type { ManifestMirrorSource } from "../models/manifest_branch_decision_contract.ts";
import { validateManifestLocalBranchDecisionContract } from "../models/manifest_branch_decision_contract.ts";

export type MirrorConsistencyStateEvaluation = {
  mirror_consistency_state: "ALL_MIRRORS_IN_SYNC";
  mirror_sources: ManifestMirrorSource[];
};

export type ManifestLineageMirrorConsistencyErrorCode =
  | "MANIFEST_LINEAGE_TRACE_MIRROR_DRIFT"
  | "MANIFEST_LINEAGE_TRACE_MIRROR_SOURCE_INCOMPLETE";

export class ManifestLineageMirrorConsistencyError extends Error {
  readonly code: ManifestLineageMirrorConsistencyErrorCode;

  constructor(code: ManifestLineageMirrorConsistencyErrorCode, detail: string) {
    super(`${code}: ${detail}`);
    this.name = "ManifestLineageMirrorConsistencyError";
    this.code = code;
  }
}

function assertMirrorConsistency(
  condition: unknown,
  code: ManifestLineageMirrorConsistencyErrorCode,
  detail: string,
): asserts condition {
  if (!condition) {
    throw new ManifestLineageMirrorConsistencyError(code, detail);
  }
}

function assertSame(label: string, left: unknown, right: unknown) {
  assertMirrorConsistency(
    JSON.stringify(left) === JSON.stringify(right),
    "MANIFEST_LINEAGE_TRACE_MIRROR_DRIFT",
    `${label} mirrors diverged`,
  );
}

export function evaluateManifestLineageMirrorConsistency(
  manifest: RunManifestRecord,
): MirrorConsistencyStateEvaluation {
  for (const field of [
    "root_manifest_id",
    "parent_manifest_id",
    "continuation_of_manifest_id",
    "replay_of_manifest_id",
    "supersedes_manifest_id",
    "manifest_generation",
  ] as const) {
    assertSame(`RunManifest.${field}`, manifest[field], manifest.continuation_set[field]);
  }

  validateManifestLocalBranchDecisionContract({
    decision: manifest.manifest_branch_decision,
    selected_manifest: manifest,
  });

  const mirrorSources: ManifestMirrorSource[] = [
    "RUN_MANIFEST_TOP_LEVEL",
    "CONTINUATION_SET",
    "MANIFEST_BRANCH_DECISION",
  ];

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
      assertSame(`frozen_execution_binding.${field}`, manifest.frozen_execution_binding[field], manifest[field]);
    }
    assertSame(
      "frozen_execution_binding.requested_scope",
      manifest.frozen_execution_binding.requested_scope,
      manifest.requested_scope,
    );
    mirrorSources.push("FROZEN_EXECUTION_BINDING");
  }

  assertMirrorConsistency(
    mirrorSources.length >= 3,
    "MANIFEST_LINEAGE_TRACE_MIRROR_SOURCE_INCOMPLETE",
    "trace mirror evaluation must include top-level, continuation_set, and manifest_branch_decision",
  );

  return {
    mirror_consistency_state: "ALL_MIRRORS_IN_SYNC",
    mirror_sources: mirrorSources,
  };
}
