import {
  collectionBoundaryRef,
  normalizeCollectionBoundaryRecord,
  type CollectionBoundaryRecord,
} from "../models/collection_boundary.ts";
import {
  buildLateDataIndicatorRecord,
  buildLateDataTemporalContract,
  lateDataPolicyBindingRef,
  lateDataPolicyRefSeverity,
  normalizeLateDataPolicyBinding,
  type LateDataDetectionBasis,
  type LateDataIndicatorRecord,
  type LateDataIndicatorType,
  type LateDataPolicyBindingRecord,
} from "../models/late_data_indicator.ts";
import {
  normalizeCollectionRuntimeScopes,
  normalizeCollectionSourceClassOrNull,
  normalizeCollectionString,
  normalizeCollectionStringSet,
  type CollectionSourceClassOrNull,
} from "../models/collection_control_common.ts";

export const COLLECTION_LATE_DATA_DRIFT_SIGNALS = [
  "POST_CUTOFF_RECORD_OBSERVED",
  "CURSOR_ADVANCED_AFTER_CUTOFF",
  "REVISION_ADVANCED_AFTER_CUTOFF",
  "SCHEMA_VERSION_ADVANCED_AFTER_CUTOFF",
  "FRESHNESS_SLO_BREACH_AT_CUTOFF",
] as const;

export type CollectionLateDataDriftSignal =
  (typeof COLLECTION_LATE_DATA_DRIFT_SIGNALS)[number];

export type CollectionLateDataObservation = {
  authority_originated?: boolean;
  baseline_effective_at?: string | null;
  baseline_scope_class?: "NONE" | "CURRENT_SCOPE" | "PRIOR_SUBMISSION_CHAIN";
  discovered_at: string;
  drift_signal: CollectionLateDataDriftSignal;
  evidence_ref?: string | null;
  filing_critical_baseline_touch?: boolean;
  partition_scope_refs?: readonly string[];
  reason_codes?: readonly string[];
  request_audit_ref?: string | null;
  runtime_scope_refs?: readonly string[];
  source_class?: CollectionSourceClassOrNull;
  source_domain: string;
  source_record_ref?: string | null;
  t_effective_or_null?: string | null;
  t_visible_or_null?: string | null;
};

export type LateDataIndicatorBuilderErrorCode =
  | "LATE_DATA_DRIFT_SIGNAL_INVALID"
  | "LATE_DATA_OBSERVATION_ANCHOR_REQUIRED";

export class LateDataIndicatorBuilderError extends Error {
  readonly code: LateDataIndicatorBuilderErrorCode;

  constructor(code: LateDataIndicatorBuilderErrorCode, detail: string) {
    super(`${code}: ${detail}`);
    this.name = "LateDataIndicatorBuilderError";
    this.code = code;
  }
}

export function mapCollectionBoundaryDriftSignal(signal: CollectionLateDataDriftSignal): {
  detection_basis: LateDataDetectionBasis;
  indicator_type: LateDataIndicatorType;
  reason_code: string;
} {
  switch (signal) {
    case "POST_CUTOFF_RECORD_OBSERVED":
      return {
        detection_basis: "SOURCE_RECORD_TIMESTAMP",
        indicator_type: "POST_CUTOFF_RECORD",
        reason_code: "POST_CUTOFF_RECORD_NOT_ADOPTED",
      };
    case "CURSOR_ADVANCED_AFTER_CUTOFF":
      return {
        detection_basis: "CURSOR_CHECKPOINT",
        indicator_type: "CURSOR_ADVANCED",
        reason_code: "CURSOR_ADVANCED_AFTER_CUTOFF",
      };
    case "REVISION_ADVANCED_AFTER_CUTOFF":
      return {
        detection_basis: "REVISION_MARKER",
        indicator_type: "REVISION_ADVANCED",
        reason_code: "REVISION_ADVANCED_AFTER_CUTOFF",
      };
    case "SCHEMA_VERSION_ADVANCED_AFTER_CUTOFF":
      return {
        detection_basis: "PROVIDER_SCHEMA_SIGNAL",
        indicator_type: "SCHEMA_VERSION_ADVANCED",
        reason_code: "PROVIDER_SCHEMA_VERSION_ADVANCED_AFTER_CUTOFF",
      };
    case "FRESHNESS_SLO_BREACH_AT_CUTOFF":
      return {
        detection_basis: "FRESHNESS_EVALUATION",
        indicator_type: "FRESHNESS_SLO_BREACH",
        reason_code: "FRESHNESS_SLO_BREACH_AT_CUTOFF",
      };
  }
}

function requiredAnchorForBasis(
  basis: LateDataDetectionBasis,
  observation: CollectionLateDataObservation,
) {
  if (basis === "SOURCE_RECORD_TIMESTAMP" && !observation.source_record_ref) {
    throw new LateDataIndicatorBuilderError(
      "LATE_DATA_OBSERVATION_ANCHOR_REQUIRED",
      "post-cutoff source-record indicators require source_record_ref",
    );
  }
  if (basis === "FRESHNESS_EVALUATION" && !observation.evidence_ref) {
    throw new LateDataIndicatorBuilderError(
      "LATE_DATA_OBSERVATION_ANCHOR_REQUIRED",
      "freshness indicators require evidence_ref",
    );
  }
  if (
    basis !== "SOURCE_RECORD_TIMESTAMP" &&
    basis !== "FRESHNESS_EVALUATION" &&
    !observation.request_audit_ref &&
    !observation.source_record_ref &&
    !observation.evidence_ref
  ) {
    throw new LateDataIndicatorBuilderError(
      "LATE_DATA_OBSERVATION_ANCHOR_REQUIRED",
      "late-data drift indicators require a request, source-record, or evidence anchor",
    );
  }
}

export function buildLateDataIndicator(input: {
  binding: LateDataPolicyBindingRecord;
  collection_boundary: CollectionBoundaryRecord;
  observation: CollectionLateDataObservation;
}): LateDataIndicatorRecord {
  const binding = normalizeLateDataPolicyBinding(input.binding);
  const boundary = normalizeCollectionBoundaryRecord(input.collection_boundary);
  const sourceDomain = normalizeCollectionString(
    "late_data_observation.source_domain",
    input.observation.source_domain,
  );
  const sourceClass = normalizeCollectionSourceClassOrNull(
    "late_data_observation.source_class",
    input.observation.source_class ?? binding.source_class,
  );
  const partitionScopeRefs = normalizeCollectionStringSet(
    "late_data_observation.partition_scope_refs",
    input.observation.partition_scope_refs ?? binding.partition_scope_refs,
  );
  const runtimeScopeRefs = normalizeCollectionRuntimeScopes(
    "late_data_observation.runtime_scope_refs",
    input.observation.runtime_scope_refs ?? binding.runtime_scope_refs,
  );
  const mapping = mapCollectionBoundaryDriftSignal(input.observation.drift_signal);
  requiredAnchorForBasis(mapping.detection_basis, input.observation);
  const temporalContract = buildLateDataTemporalContract({
    authority_originated: input.observation.authority_originated ?? false,
    baseline_effective_at: input.observation.baseline_effective_at ?? null,
    ...(input.observation.baseline_scope_class === undefined
      ? {}
      : { baseline_scope_class: input.observation.baseline_scope_class }),
    filing_critical_baseline_touch:
      input.observation.filing_critical_baseline_touch ?? false,
    reason_codes: input.observation.reason_codes ?? [],
    t_cutoff: boundary.read_cutoff_at,
    t_discovered: input.observation.discovered_at,
    t_effective_or_null: input.observation.t_effective_or_null ?? null,
    t_visible_or_null: input.observation.t_visible_or_null ?? null,
  });

  return buildLateDataIndicatorRecord({
    artifact_type: "LateDataIndicator",
    binding_ref: lateDataPolicyBindingRef(binding),
    collection_boundary_ref: collectionBoundaryRef(boundary),
    detection_basis: mapping.detection_basis,
    discovered_at: input.observation.discovered_at,
    evidence_ref: input.observation.evidence_ref ?? null,
    indicator_type: mapping.indicator_type,
    late_data_policy_ref: binding.late_data_policy_ref,
    manifest_id: boundary.manifest_id,
    partition_scope_refs: partitionScopeRefs,
    reason_codes: [
      mapping.reason_code,
      `LATE_DATA_POLICY_${binding.late_data_policy_ref}`,
      ...temporalContract.reason_codes,
      ...(input.observation.reason_codes ?? []),
    ],
    request_audit_ref: input.observation.request_audit_ref ?? null,
    runtime_scope_refs: runtimeScopeRefs,
    severity: lateDataPolicyRefSeverity(binding.late_data_policy_ref),
    source_class: sourceClass,
    source_domain: sourceDomain,
    source_plan_ref: boundary.source_plan_ref,
    source_record_ref: input.observation.source_record_ref ?? null,
    temporal_classification_contract: temporalContract,
  });
}
