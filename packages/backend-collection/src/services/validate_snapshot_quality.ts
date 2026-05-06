import type { SnapshotQualityRecord } from "../models/snapshot.ts";
import { normalizeCollectionStringSet } from "../models/collection_control_common.ts";
import type {
  SnapshotAssemblyQualityInput,
  SnapshotAssemblySetBindings,
} from "../types/snapshot_assembly_input.ts";

export type ValidateSnapshotQualityInput = SnapshotAssemblyQualityInput & {
  set_bindings: SnapshotAssemblySetBindings;
};

export type SnapshotQualityErrorCode = "SNAPSHOT_QUALITY_SCORE_INVALID";

export class SnapshotQualityError extends Error {
  readonly code: SnapshotQualityErrorCode;

  constructor(code: SnapshotQualityErrorCode, detail: string) {
    super(`${code}: ${detail}`);
    this.name = "SnapshotQualityError";
    this.code = code;
  }
}

function normalizeScore(label: string, value: number) {
  if (!Number.isFinite(value) || value < 0 || value > 100) {
    throw new SnapshotQualityError(
      "SNAPSHOT_QUALITY_SCORE_INVALID",
      `${label} must be a finite number between 0 and 100`,
    );
  }
  return Number(value.toFixed(4));
}

export function validateSnapshotQuality(
  input: ValidateSnapshotQualityInput,
): SnapshotQualityRecord {
  const invalidDomainRefs = normalizeCollectionStringSet(
    "snapshot.quality.invalid_domain_refs",
    input.invalid_domain_refs ?? [],
  );
  const reasonCodes = normalizeCollectionStringSet("snapshot.quality.reason_codes", [
    ...(input.reason_codes ?? []),
    ...(invalidDomainRefs.length > 0 ? ["INVALID_DOMAIN_REFS_PRESENT"] : []),
  ]);
  const inferredScore = Math.max(0, 100 - invalidDomainRefs.length * 35 - reasonCodes.length * 5);

  return {
    data_quality_score: normalizeScore(
      "snapshot.quality.data_quality_score",
      input.data_quality_score ?? inferredScore,
    ),
    invalid_domain_refs: invalidDomainRefs,
    reason_codes: reasonCodes,
  };
}
