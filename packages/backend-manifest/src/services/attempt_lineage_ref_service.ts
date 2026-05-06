import type { RunManifestContinuationBasis, RunManifestRecord } from "../models/run_manifest.ts";

export type AttemptLineageRefErrorCode =
  | "ATTEMPT_LINEAGE_REF_REQUIRED"
  | "RECOVERY_SOURCE_ATTEMPT_LINEAGE_REQUIRED";

export class AttemptLineageRefError extends Error {
  readonly code: AttemptLineageRefErrorCode;

  constructor(code: AttemptLineageRefErrorCode, detail: string) {
    super(`${code}: ${detail}`);
    this.name = "AttemptLineageRefError";
    this.code = code;
  }
}

function requireNonEmpty(label: string, value: string | null | undefined) {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new AttemptLineageRefError(
      "ATTEMPT_LINEAGE_REF_REQUIRED",
      `${label} must be a non-empty attempt lineage ref`,
    );
  }
  return value.trim();
}

function prefixForBasis(basis: RunManifestContinuationBasis) {
  switch (basis) {
    case "NEW_MANIFEST":
      return "attempt-lineage";
    case "REPLAY_CHILD":
      return "attempt-lineage://replay";
    case "RECOVERY_CHILD":
      return "attempt-lineage://recovery";
    case "CONTINUATION_CHILD":
      return "attempt-lineage://continuation";
    case "NEW_REQUEST_CHILD":
      return "attempt-lineage://new-request";
  }
}

export function attemptLineageRefFromManifest(
  manifest: RunManifestRecord,
): string | null {
  return manifest.manifest_start_claim?.attempt_lineage_ref ?? null;
}

export function buildAttemptLineageRef(input: {
  explicit_attempt_lineage_ref?: string | null;
  manifest: RunManifestRecord;
  source_manifest?: RunManifestRecord | null;
}): string {
  if (input.explicit_attempt_lineage_ref != null) {
    return requireNonEmpty("explicit_attempt_lineage_ref", input.explicit_attempt_lineage_ref);
  }
  const existing = attemptLineageRefFromManifest(input.manifest);
  if (existing != null) {
    return requireNonEmpty("manifest.manifest_start_claim.attempt_lineage_ref", existing);
  }
  if (input.manifest.continuation_basis === "RECOVERY_CHILD") {
    const sourceAttemptLineage = input.source_manifest?.manifest_start_claim?.attempt_lineage_ref;
    if (!sourceAttemptLineage) {
      throw new AttemptLineageRefError(
        "RECOVERY_SOURCE_ATTEMPT_LINEAGE_REQUIRED",
        "recovery children must reuse the source manifest attempt_lineage_ref",
      );
    }
    return requireNonEmpty(
      "source_manifest.manifest_start_claim.attempt_lineage_ref",
      sourceAttemptLineage,
    );
  }
  const prefix = prefixForBasis(input.manifest.continuation_basis);
  return prefix === "attempt-lineage"
    ? `attempt-lineage://${input.manifest.manifest_id}`
    : `${prefix}/${input.manifest.manifest_id}`;
}
