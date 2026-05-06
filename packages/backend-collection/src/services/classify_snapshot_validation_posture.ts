import type { SnapshotCompletenessRecord, SnapshotQualityRecord } from "../models/snapshot.ts";

export type SnapshotValidationPosture = "VALID" | "WARNED" | "INVALID";

export function classifySnapshotValidationPosture(input: {
  completeness: SnapshotCompletenessRecord;
  invalid_completeness_score_below?: number;
  invalid_quality_score_below?: number;
  quality: SnapshotQualityRecord;
}) {
  const invalidQualityThreshold = input.invalid_quality_score_below ?? 70;
  const invalidCompletenessThreshold = input.invalid_completeness_score_below ?? 90;

  if (
    input.quality.invalid_domain_refs.length > 0 ||
    input.completeness.missing_domain_refs.length > 0 ||
    input.quality.data_quality_score < invalidQualityThreshold ||
    input.completeness.completeness_score < invalidCompletenessThreshold
  ) {
    return "INVALID" satisfies SnapshotValidationPosture;
  }

  if (
    input.quality.reason_codes.length > 0 ||
    input.completeness.reason_codes.length > 0 ||
    input.quality.data_quality_score < 100 ||
    input.completeness.completeness_score < 100
  ) {
    return "WARNED" satisfies SnapshotValidationPosture;
  }

  return "VALID" satisfies SnapshotValidationPosture;
}
