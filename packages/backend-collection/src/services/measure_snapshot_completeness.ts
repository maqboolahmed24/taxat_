import type { SnapshotCompletenessRecord } from "../models/snapshot.ts";
import { normalizeCollectionStringSet } from "../models/collection_control_common.ts";
import type {
  SnapshotAssemblyCompletenessInput,
  SnapshotAssemblySetBindings,
} from "../types/snapshot_assembly_input.ts";

export type MeasureSnapshotCompletenessInput = SnapshotAssemblyCompletenessInput & {
  set_bindings: SnapshotAssemblySetBindings;
};

export type SnapshotCompletenessErrorCode = "SNAPSHOT_COMPLETENESS_SCORE_INVALID";

export class SnapshotCompletenessError extends Error {
  readonly code: SnapshotCompletenessErrorCode;

  constructor(code: SnapshotCompletenessErrorCode, detail: string) {
    super(`${code}: ${detail}`);
    this.name = "SnapshotCompletenessError";
    this.code = code;
  }
}

function normalizeScore(label: string, value: number) {
  if (!Number.isFinite(value) || value < 0 || value > 100) {
    throw new SnapshotCompletenessError(
      "SNAPSHOT_COMPLETENESS_SCORE_INVALID",
      `${label} must be a finite number between 0 and 100`,
    );
  }
  return Number(value.toFixed(4));
}

export function measureSnapshotCompleteness(
  input: MeasureSnapshotCompletenessInput,
): SnapshotCompletenessRecord {
  const expectedDomainRefs = normalizeCollectionStringSet(
    "snapshot.completeness.expected_domain_refs",
    input.expected_domain_refs ?? [],
  );
  const satisfiedDomainRefs = new Set(
    normalizeCollectionStringSet(
      "snapshot.completeness.satisfied_domain_refs",
      input.satisfied_domain_refs ?? expectedDomainRefs,
    ),
  );
  const inferredMissingDomainRefs = expectedDomainRefs.filter(
    (domainRef) => !satisfiedDomainRefs.has(domainRef),
  );
  const missingDomainRefs = normalizeCollectionStringSet("snapshot.completeness.missing_domain_refs", [
    ...inferredMissingDomainRefs,
    ...(input.missing_domain_refs ?? []),
  ]);
  const reasonCodes = normalizeCollectionStringSet("snapshot.completeness.reason_codes", [
    ...(input.reason_codes ?? []),
    ...(missingDomainRefs.length > 0 ? ["MISSING_DOMAIN_REFS_PRESENT"] : []),
  ]);
  const inferredScore =
    expectedDomainRefs.length === 0
      ? 100
      : ((expectedDomainRefs.length - missingDomainRefs.length) / expectedDomainRefs.length) * 100;

  return {
    completeness_score: normalizeScore(
      "snapshot.completeness.completeness_score",
      input.completeness_score ?? Math.max(0, inferredScore),
    ),
    missing_domain_refs: missingDomainRefs,
    reason_codes: reasonCodes,
  };
}
