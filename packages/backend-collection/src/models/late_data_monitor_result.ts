import { LateDataMonitorResultSchemaLineage } from "../../../generated-models/src/generated/typescript/domain-workflow-and-filing.ts";
import type { SchemaBundleArtifactContract } from "../../../generated-models/src/generated/typescript/manifest-and-release.ts";
import { normalizeUtcInstantString } from "../../../domain-kernel/src/primitives/time.ts";
import {
  buildCollectionArtifactContract,
  deriveCollectionControlHash,
  normalizeCollectionRuntimeScopes,
  normalizeCollectionString,
  normalizeCollectionStringSet,
} from "./collection_control_common.ts";
import {
  normalizeLateDataTemporalContract,
  type LateDataConsequenceSummaryRecord,
  type LateDataRuntimeScopeRefs,
} from "./late_data_indicator.ts";
import {
  lateDataFindingRef,
  normalizeLateDataFindingRecord,
  type LateDataFindingRecord,
} from "./late_data_finding.ts";
import {
  lateDataIndicatorSetRef,
  type LateDataIndicatorSetRecord,
} from "./late_data_indicator_set.ts";

export const LATE_DATA_MONITOR_STATUSES = [
  "NO_LATE_DATA",
  "EXCLUDED_LATE_ONLY",
  "REVIEW_REQUIRED",
  "SPAWN_CHILD_MANIFEST_REQUIRED",
] as const;

export type LateDataMonitorStatus = (typeof LATE_DATA_MONITOR_STATUSES)[number];

export type LateDataMonitorResultRecord = {
  artifact_type: "LateDataMonitorResult";
  child_manifest_refs: string[];
  child_manifest_required_count: number;
  classified_at: string;
  collection_boundary_ref: string;
  excluded_count: number;
  execution_basis_hash: string;
  finding_refs: string[];
  input_freeze_ref: string;
  late_data_monitor_id: string;
  late_data_status: LateDataMonitorStatus;
  latest_indicator_set_ref: string;
  manifest_hash: string;
  manifest_id: string;
  reason_codes: string[];
  review_required_count: number;
  runtime_scope_refs: LateDataRuntimeScopeRefs;
  source_window_ref: string;
  temporal_consequence_summary: LateDataConsequenceSummaryRecord;
  temporal_propagation_event_refs: string[];
  total_finding_count: number;
  workflow_item_refs: string[];
};

export type LateDataMonitorResultBuildInput = Omit<
  LateDataMonitorResultRecord,
  "artifact_type" | "late_data_monitor_id"
> & {
  late_data_monitor_id?: string;
};

export type LateDataMonitorResultModelErrorCode =
  | "LATE_DATA_MONITOR_ARTIFACT_TYPE_INVALID"
  | "LATE_DATA_MONITOR_COUNT_MISMATCH"
  | "LATE_DATA_MONITOR_STATUS_INVALID"
  | "LATE_DATA_MONITOR_STATUS_MISMATCH"
  | "LATE_DATA_SUMMARY_INVALID";

export class LateDataMonitorResultModelError extends Error {
  readonly code: LateDataMonitorResultModelErrorCode;

  constructor(code: LateDataMonitorResultModelErrorCode, detail: string) {
    super(`${code}: ${detail}`);
    this.name = "LateDataMonitorResultModelError";
    this.code = code;
  }
}

function normalizeMonitorStatus(value: unknown): LateDataMonitorStatus {
  const normalized = normalizeCollectionString("late_data_monitor_result.late_data_status", value);
  if (!LATE_DATA_MONITOR_STATUSES.includes(normalized as LateDataMonitorStatus)) {
    throw new LateDataMonitorResultModelError(
      "LATE_DATA_MONITOR_STATUS_INVALID",
      "late_data_status must be canonical",
    );
  }
  return normalized as LateDataMonitorStatus;
}

function normalizeConsequenceSummary(
  input: LateDataConsequenceSummaryRecord,
): LateDataConsequenceSummaryRecord {
  if (input.summary_profile_code !== "LATE_DATA_SUMMARY_V1") {
    throw new LateDataMonitorResultModelError(
      "LATE_DATA_SUMMARY_INVALID",
      "summary_profile_code must be LATE_DATA_SUMMARY_V1",
    );
  }
  if (input.replay_lineage_policy !== "HISTORICAL_LINEAGE_ONLY") {
    throw new LateDataMonitorResultModelError(
      "LATE_DATA_SUMMARY_INVALID",
      "summary replay_lineage_policy must be HISTORICAL_LINEAGE_ONLY",
    );
  }
  const reasonCodes = normalizeCollectionStringSet(
    "late_data_monitor_result.temporal_consequence_summary.reason_codes",
    input.reason_codes,
    {
      minItems:
        input.temporally_unproved_count > 0 ||
        input.retroactive_impact_required ||
        input.trust_invalidation_required ||
        input.proof_staleness_required ||
        input.amendment_reuse_invalidated ||
        input.blocking_temporal_uncertainty_present
          ? 1
          : 0,
    },
  );
  if (
    input.highest_legal_consequence === "NONE" &&
    (input.retroactive_impact_required ||
      input.trust_invalidation_required ||
      input.proof_staleness_required ||
      input.amendment_reuse_invalidated ||
      input.blocking_temporal_uncertainty_present)
  ) {
    throw new LateDataMonitorResultModelError(
      "LATE_DATA_SUMMARY_INVALID",
      "NONE consequence cannot carry invalidation flags",
    );
  }
  if (
    input.temporally_unproved_count > 0 &&
    (input.highest_legal_consequence !== "TEMPORAL_UNCERTAINTY_BLOCK" ||
      !input.trust_invalidation_required ||
      !input.proof_staleness_required ||
      !input.amendment_reuse_invalidated ||
      !input.blocking_temporal_uncertainty_present)
  ) {
    throw new LateDataMonitorResultModelError(
      "LATE_DATA_SUMMARY_INVALID",
      "temporal uncertainty requires blocking uncertainty posture",
    );
  }
  if (
    input.retroactive_impact_required &&
    !["RETROACTIVE_IMPACT_REVIEW", "TEMPORAL_UNCERTAINTY_BLOCK"].includes(
      input.highest_legal_consequence,
    )
  ) {
    throw new LateDataMonitorResultModelError(
      "LATE_DATA_SUMMARY_INVALID",
      "retroactive impact requires retroactive review or temporal uncertainty consequence",
    );
  }
  return {
    amendment_reuse_invalidated: input.amendment_reuse_invalidated,
    authority_posting_lag_count: input.authority_posting_lag_count,
    blocking_temporal_uncertainty_present: input.blocking_temporal_uncertainty_present,
    highest_legal_consequence: input.highest_legal_consequence,
    post_cutoff_discovery_pre_baseline_fact_count:
      input.post_cutoff_discovery_pre_baseline_fact_count,
    pre_cutoff_preexisting_late_arrival_count:
      input.pre_cutoff_preexisting_late_arrival_count,
    proof_staleness_required: input.proof_staleness_required,
    reason_codes: reasonCodes,
    replay_lineage_policy: "HISTORICAL_LINEAGE_ONLY",
    retroactive_impact_required: input.retroactive_impact_required,
    summary_profile_code: "LATE_DATA_SUMMARY_V1",
    temporally_unproved_count: input.temporally_unproved_count,
    true_post_baseline_event_count: input.true_post_baseline_event_count,
    trust_invalidation_required: input.trust_invalidation_required,
  };
}

function expectedStatus(input: {
  child_manifest_required_count: number;
  excluded_count: number;
  review_required_count: number;
  total_finding_count: number;
}): LateDataMonitorStatus {
  if (input.child_manifest_required_count > 0) {
    return "SPAWN_CHILD_MANIFEST_REQUIRED";
  }
  if (input.review_required_count > 0) {
    return "REVIEW_REQUIRED";
  }
  if (input.excluded_count > 0) {
    return "EXCLUDED_LATE_ONLY";
  }
  if (input.total_finding_count === 0) {
    return "NO_LATE_DATA";
  }
  return "REVIEW_REQUIRED";
}

function assertStatusShape(input: LateDataMonitorResultRecord) {
  if (
    input.total_finding_count !== input.finding_refs.length ||
    input.excluded_count + input.review_required_count + input.child_manifest_required_count !==
      input.total_finding_count
  ) {
    throw new LateDataMonitorResultModelError(
      "LATE_DATA_MONITOR_COUNT_MISMATCH",
      "monitor counts must equal the persisted finding refs",
    );
  }
  if (input.late_data_status !== expectedStatus(input)) {
    throw new LateDataMonitorResultModelError(
      "LATE_DATA_MONITOR_STATUS_MISMATCH",
      "late_data_status must follow child > review > excluded > no-late-data precedence",
    );
  }
  if (input.late_data_status === "NO_LATE_DATA") {
    if (
      input.finding_refs.length > 0 ||
      input.total_finding_count !== 0 ||
      input.excluded_count !== 0 ||
      input.review_required_count !== 0 ||
      input.child_manifest_required_count !== 0 ||
      input.child_manifest_refs.length > 0 ||
      input.workflow_item_refs.length > 0 ||
      input.temporal_propagation_event_refs.length > 0 ||
      input.reason_codes.length > 0 ||
      input.temporal_consequence_summary.highest_legal_consequence !== "NONE"
    ) {
      throw new LateDataMonitorResultModelError(
        "LATE_DATA_MONITOR_STATUS_MISMATCH",
        "NO_LATE_DATA monitor results must not carry findings, work refs, or consequences",
      );
    }
  }
  if (input.child_manifest_required_count === 0 && input.child_manifest_refs.length > 0) {
    throw new LateDataMonitorResultModelError(
      "LATE_DATA_MONITOR_STATUS_MISMATCH",
      "child manifest refs require child-manifest findings",
    );
  }
  if (input.late_data_status === "REVIEW_REQUIRED" && input.workflow_item_refs.length === 0) {
    throw new LateDataMonitorResultModelError(
      "LATE_DATA_MONITOR_STATUS_MISMATCH",
      "review-required monitor results require workflow refs",
    );
  }
  if (
    input.late_data_status === "SPAWN_CHILD_MANIFEST_REQUIRED" &&
    input.child_manifest_refs.length === 0
  ) {
    throw new LateDataMonitorResultModelError(
      "LATE_DATA_MONITOR_STATUS_MISMATCH",
      "child-manifest monitor results require child manifest refs",
    );
  }
  if (
    (input.late_data_status === "REVIEW_REQUIRED" ||
      input.late_data_status === "SPAWN_CHILD_MANIFEST_REQUIRED") &&
    input.temporal_propagation_event_refs.length === 0
  ) {
    throw new LateDataMonitorResultModelError(
      "LATE_DATA_MONITOR_STATUS_MISMATCH",
      "review or child-manifest monitor results require temporal propagation event refs",
    );
  }
}

export function lateDataMonitorResultRef(
  monitor: Pick<LateDataMonitorResultRecord, "late_data_monitor_id">,
) {
  return `late-data-monitor-result://${monitor.late_data_monitor_id}`;
}

export function deriveLateDataMonitorResultId(
  input: Omit<LateDataMonitorResultRecord, "late_data_monitor_id">,
) {
  return `late-data-monitor-result.${deriveCollectionControlHash({
    artifact_family: "LATE_DATA_MONITOR_RESULT_ID",
    payload: input,
  })}`;
}

export function normalizeLateDataMonitorResultRecord(
  input: LateDataMonitorResultRecord,
): LateDataMonitorResultRecord {
  if (input.artifact_type !== "LateDataMonitorResult") {
    throw new LateDataMonitorResultModelError(
      "LATE_DATA_MONITOR_ARTIFACT_TYPE_INVALID",
      "late-data monitor results must carry artifact_type LateDataMonitorResult",
    );
  }
  const record: LateDataMonitorResultRecord = {
    artifact_type: "LateDataMonitorResult",
    child_manifest_refs: normalizeCollectionStringSet(
      "late_data_monitor_result.child_manifest_refs",
      input.child_manifest_refs,
    ),
    child_manifest_required_count: input.child_manifest_required_count,
    classified_at: normalizeUtcInstantString(input.classified_at),
    collection_boundary_ref: normalizeCollectionString(
      "late_data_monitor_result.collection_boundary_ref",
      input.collection_boundary_ref,
    ),
    excluded_count: input.excluded_count,
    execution_basis_hash: normalizeCollectionString(
      "late_data_monitor_result.execution_basis_hash",
      input.execution_basis_hash,
    ),
    finding_refs: normalizeCollectionStringSet(
      "late_data_monitor_result.finding_refs",
      input.finding_refs,
    ),
    input_freeze_ref: normalizeCollectionString(
      "late_data_monitor_result.input_freeze_ref",
      input.input_freeze_ref,
    ),
    late_data_monitor_id: normalizeCollectionString(
      "late_data_monitor_result.late_data_monitor_id",
      input.late_data_monitor_id,
    ),
    late_data_status: normalizeMonitorStatus(input.late_data_status),
    latest_indicator_set_ref: normalizeCollectionString(
      "late_data_monitor_result.latest_indicator_set_ref",
      input.latest_indicator_set_ref,
    ),
    manifest_hash: normalizeCollectionString(
      "late_data_monitor_result.manifest_hash",
      input.manifest_hash,
    ),
    manifest_id: normalizeCollectionString("late_data_monitor_result.manifest_id", input.manifest_id),
    reason_codes: normalizeCollectionStringSet(
      "late_data_monitor_result.reason_codes",
      input.reason_codes,
      { minItems: input.late_data_status === "NO_LATE_DATA" ? 0 : 1 },
    ),
    review_required_count: input.review_required_count,
    runtime_scope_refs: normalizeCollectionRuntimeScopes(
      "late_data_monitor_result.runtime_scope_refs",
      input.runtime_scope_refs,
    ) as LateDataRuntimeScopeRefs,
    source_window_ref: normalizeCollectionString(
      "late_data_monitor_result.source_window_ref",
      input.source_window_ref,
    ),
    temporal_consequence_summary: normalizeConsequenceSummary(
      input.temporal_consequence_summary,
    ),
    temporal_propagation_event_refs: normalizeCollectionStringSet(
      "late_data_monitor_result.temporal_propagation_event_refs",
      input.temporal_propagation_event_refs,
    ),
    total_finding_count: input.total_finding_count,
    workflow_item_refs: normalizeCollectionStringSet(
      "late_data_monitor_result.workflow_item_refs",
      input.workflow_item_refs,
    ),
  };
  assertStatusShape(record);
  return record;
}

export function emptyLateDataConsequenceSummary(): LateDataConsequenceSummaryRecord {
  return {
    amendment_reuse_invalidated: false,
    authority_posting_lag_count: 0,
    blocking_temporal_uncertainty_present: false,
    highest_legal_consequence: "NONE",
    post_cutoff_discovery_pre_baseline_fact_count: 0,
    pre_cutoff_preexisting_late_arrival_count: 0,
    proof_staleness_required: false,
    reason_codes: [],
    replay_lineage_policy: "HISTORICAL_LINEAGE_ONLY",
    retroactive_impact_required: false,
    summary_profile_code: "LATE_DATA_SUMMARY_V1",
    temporally_unproved_count: 0,
    true_post_baseline_event_count: 0,
    trust_invalidation_required: false,
  };
}

export function summarizeLateDataConsequences(
  findings: readonly LateDataFindingRecord[],
): LateDataConsequenceSummaryRecord {
  if (findings.length === 0) {
    return emptyLateDataConsequenceSummary();
  }
  const normalized = findings.map((finding) => normalizeLateDataFindingRecord(finding));
  const counts = {
    authority_posting_lag_count: 0,
    post_cutoff_discovery_pre_baseline_fact_count: 0,
    pre_cutoff_preexisting_late_arrival_count: 0,
    temporally_unproved_count: 0,
    true_post_baseline_event_count: 0,
  };
  let retroactive = false;
  let trustInvalidation = false;
  let proofStaleness = false;
  let amendmentInvalidated = false;
  const reasonCodes: string[] = [];

  for (const finding of normalized) {
    const temporal = normalizeLateDataTemporalContract(finding.temporal_classification_contract);
    switch (temporal.temporal_classification) {
      case "AUTHORITY_POSTING_LAG":
        counts.authority_posting_lag_count += 1;
        break;
      case "POST_CUTOFF_DISCOVERY_PRE_BASELINE_FACT":
        counts.post_cutoff_discovery_pre_baseline_fact_count += 1;
        break;
      case "PRE_CUTOFF_PREEXISTING_LATE_ARRIVAL":
        counts.pre_cutoff_preexisting_late_arrival_count += 1;
        break;
      case "TEMPORALLY_UNPROVED":
        counts.temporally_unproved_count += 1;
        break;
      case "TRUE_POST_BASELINE_EVENT":
        counts.true_post_baseline_event_count += 1;
        break;
    }
    retroactive = retroactive || temporal.retroactive_impact_required;
    trustInvalidation = trustInvalidation || temporal.trust_invalidation_required;
    proofStaleness = proofStaleness || temporal.proof_staleness_required;
    amendmentInvalidated = amendmentInvalidated || temporal.amendment_reuse_invalidated;
    reasonCodes.push(...finding.reason_codes, ...temporal.reason_codes);
  }

  const blockingTemporalUncertainty = counts.temporally_unproved_count > 0;
  const highestLegalConsequence =
    blockingTemporalUncertainty
      ? "TEMPORAL_UNCERTAINTY_BLOCK"
      : retroactive
        ? "RETROACTIVE_IMPACT_REVIEW"
        : trustInvalidation || proofStaleness || amendmentInvalidated
          ? "CURRENT_SCOPE_INVALIDATION"
          : "NONE";

  return normalizeConsequenceSummary({
    ...counts,
    amendment_reuse_invalidated: amendmentInvalidated || blockingTemporalUncertainty,
    blocking_temporal_uncertainty_present: blockingTemporalUncertainty,
    highest_legal_consequence: highestLegalConsequence,
    proof_staleness_required: proofStaleness || blockingTemporalUncertainty,
    reason_codes: normalizeCollectionStringSet(
      "late_data_monitor_result.temporal_consequence_summary.reason_codes",
      reasonCodes,
      { minItems: highestLegalConsequence === "NONE" ? 0 : 1 },
    ),
    replay_lineage_policy: "HISTORICAL_LINEAGE_ONLY",
    retroactive_impact_required: retroactive,
    summary_profile_code: "LATE_DATA_SUMMARY_V1",
    trust_invalidation_required: trustInvalidation || blockingTemporalUncertainty,
  });
}

export function buildLateDataMonitorResultRecord(
  input: LateDataMonitorResultBuildInput,
): LateDataMonitorResultRecord {
  const { late_data_monitor_id: explicitMonitorId, ...payload } = input;
  const base: Omit<LateDataMonitorResultRecord, "late_data_monitor_id"> = {
    ...payload,
    artifact_type: "LateDataMonitorResult",
  };
  const monitorId = explicitMonitorId ?? deriveLateDataMonitorResultId(base);
  return normalizeLateDataMonitorResultRecord({
    ...base,
    late_data_monitor_id: monitorId,
  });
}

export function buildLateDataMonitorResultFromFindings(input: {
  classified_at: string;
  collection_boundary_ref: string;
  execution_basis_hash: string;
  findings: readonly LateDataFindingRecord[];
  indicator_set: LateDataIndicatorSetRecord;
  input_freeze_ref: string;
  manifest_hash: string;
  manifest_id: string;
  runtime_scope_refs: readonly string[];
  source_window_ref: string;
}) {
  const findings = input.findings.map((finding) => normalizeLateDataFindingRecord(finding));
  const findingRefs = findings.map((finding) => lateDataFindingRef(finding));
  const excludedCount = findings.filter(
    (finding) => finding.late_data_policy_ref === "EXCLUDE_LATE",
  ).length;
  const reviewRequiredCount = findings.filter(
    (finding) => finding.late_data_policy_ref === "REVIEW_IF_LATE",
  ).length;
  const childManifestRequiredCount = findings.filter(
    (finding) => finding.late_data_policy_ref === "SPAWN_CHILD_MANIFEST",
  ).length;
  const childManifestRefs = findings
    .map((finding) => finding.child_manifest_ref)
    .filter((ref): ref is string => ref !== null);
  const workflowItemRefs = findings
    .map((finding) => finding.workflow_item_ref)
    .filter((ref): ref is string => ref !== null);
  const temporalPropagationEventRefs =
    reviewRequiredCount + childManifestRequiredCount === 0
      ? []
      : findings
          .filter((finding) => finding.late_data_policy_ref !== "EXCLUDE_LATE")
          .map(
            (finding) =>
              `temporal-propagation-event://late-data/${deriveCollectionControlHash({
                artifact_family: "LATE_DATA_TEMPORAL_PROPAGATION_EVENT",
                payload: { finding_ref: lateDataFindingRef(finding) },
              })}`,
          );
  const status = expectedStatus({
    child_manifest_required_count: childManifestRequiredCount,
    excluded_count: excludedCount,
    review_required_count: reviewRequiredCount,
    total_finding_count: findings.length,
  });
  const reasonCodes =
    findings.length === 0
      ? []
      : normalizeCollectionStringSet(
          "late_data_monitor_result.reason_codes",
          findings.flatMap((finding) => finding.reason_codes),
          { minItems: 1 },
        );

  return buildLateDataMonitorResultRecord({
    child_manifest_refs: childManifestRefs,
    child_manifest_required_count: childManifestRequiredCount,
    classified_at: input.classified_at,
    collection_boundary_ref: input.collection_boundary_ref,
    excluded_count: excludedCount,
    execution_basis_hash: input.execution_basis_hash,
    finding_refs: findingRefs,
    input_freeze_ref: input.input_freeze_ref,
    late_data_status: status,
    latest_indicator_set_ref: lateDataIndicatorSetRef(input.indicator_set),
    manifest_hash: input.manifest_hash,
    manifest_id: input.manifest_id,
    reason_codes: reasonCodes,
    review_required_count: reviewRequiredCount,
    runtime_scope_refs: input.runtime_scope_refs as LateDataRuntimeScopeRefs,
    source_window_ref: input.source_window_ref,
    temporal_consequence_summary: summarizeLateDataConsequences(findings),
    temporal_propagation_event_refs: temporalPropagationEventRefs,
    total_finding_count: findings.length,
    workflow_item_refs: workflowItemRefs,
  });
}

export function buildLateDataMonitorResultContract(input: {
  monitor_payload_hash: string;
  late_data_monitor_id: string;
  schema_bundle_hash?: string;
  writer_build_id?: string;
}): SchemaBundleArtifactContract {
  return buildCollectionArtifactContract({
    artifact_content_hash: input.monitor_payload_hash,
    artifact_id: lateDataMonitorResultRef({
      late_data_monitor_id: input.late_data_monitor_id,
    }),
    artifact_type: "LateDataMonitorResult",
    ...(input.schema_bundle_hash === undefined
      ? {}
      : { schema_bundle_hash: input.schema_bundle_hash }),
    schema_id: LateDataMonitorResultSchemaLineage.schemaId,
    schema_source_hash: LateDataMonitorResultSchemaLineage.sourceHash,
    writer_build_id: input.writer_build_id ?? "build.taxat.collection.0117",
  });
}

export function deriveLateDataMonitorResultPayloadHash(record: LateDataMonitorResultRecord) {
  return `late-data-monitor-result-hash://${deriveCollectionControlHash({
    artifact_family: "LATE_DATA_MONITOR_RESULT",
    payload: normalizeLateDataMonitorResultRecord(record),
  })}`;
}

export function cloneLateDataMonitorResultRecord(record: LateDataMonitorResultRecord) {
  return structuredClone(record);
}
