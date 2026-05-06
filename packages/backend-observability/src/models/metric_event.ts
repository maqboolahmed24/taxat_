import type { TelemetryResourceAttributeMap } from "../../../generated-models/src/generated/typescript/retention-failure-and-observability.ts";
import type { ObservabilityCorrelationContext } from "./observability_correlation_context.ts";
import {
  normalizeAttributeMap,
  ObservabilityContractError,
} from "./observability_correlation_context.ts";

export const METRIC_FAMILIES = [
  "RUN_OUTCOME_RATE",
  "NIGHTLY_BATCH_OUTCOME_RATE",
  "AUTHORITY_REQUEST_OUTCOME_RATE",
  "RECONCILIATION_RESOLUTION_RATE",
  "AMENDMENT_OUTCOME_RATE",
  "EXPERIENCE_STREAM_RESUME_REBASE_RATE",
  "STALE_VIEW_CONFLICT_RATE",
  "RELEASE_CANARY_ABORT_RATE",
  "MIGRATION_OUTCOME_RATE",
  "RESTORE_DRILL_SUCCESS_RATE",
  "RESTORE_DRILL_AGE",
  "COMPLETENESS_SCORE_DISTRIBUTION",
  "DATA_QUALITY_SCORE_DISTRIBUTION",
  "PARITY_CLASSIFICATION_DISTRIBUTION",
  "TRUST_BAND_DISTRIBUTION",
  "GRAPH_CRITICAL_PATH_COVERAGE_DISTRIBUTION",
  "MODULE_LATENCY",
  "QUEUE_DELAY",
  "OPERATOR_DIGEST_PUBLISH_LATENCY",
  "NIGHTLY_SELECTION_DISPOSITION_COUNT",
  "RETRY_VOLUME",
  "DUPLICATE_SUPPRESSION_VOLUME",
  "RETENTION_LIMITATION_VOLUME",
  "ERASURE_THROUGHPUT",
  "STREAM_HEARTBEAT_LAG",
  "OUTBOX_BACKLOG_AGE",
  "INBOX_DEDUPE_HIT_RATE",
  "SECRET_ROTATION_LAG",
  "BACKUP_FRESHNESS_BY_RECOVERY_TIER",
  "STEP_UP_EVENTS",
  "ACCESS_DENIALS",
  "MASKED_VS_FULL_SENSITIVE_VIEWS",
  "EXPORT_ATTEMPTS",
  "LEGAL_HOLD_BLOCKS",
  "ERASURE_BLOCKS",
  "CSRF_REJECTION_RATE",
  "SESSION_REVOCATIONS",
  "EGRESS_POLICY_VIOLATIONS",
  "SIGNED_BUILD_VERIFICATION_FAILURES",
] as const;

export type MetricFamily = (typeof METRIC_FAMILIES)[number];
export type MetricInstrumentKind = "COUNTER" | "GAUGE" | "HISTOGRAM";

export type MetricEvent = {
  correlation_context: ObservabilityCorrelationContext;
  dimensions: TelemetryResourceAttributeMap;
  instrument_kind: MetricInstrumentKind;
  metric_event_id: string;
  metric_family: MetricFamily;
  observed_at: string;
  resource_ref: string;
  unit: string | null;
  value: number;
};

const COUNTER_FAMILIES = new Set<MetricFamily>([
  "RUN_OUTCOME_RATE",
  "NIGHTLY_BATCH_OUTCOME_RATE",
  "AUTHORITY_REQUEST_OUTCOME_RATE",
  "RECONCILIATION_RESOLUTION_RATE",
  "AMENDMENT_OUTCOME_RATE",
  "EXPERIENCE_STREAM_RESUME_REBASE_RATE",
  "STALE_VIEW_CONFLICT_RATE",
  "RELEASE_CANARY_ABORT_RATE",
  "MIGRATION_OUTCOME_RATE",
  "RESTORE_DRILL_SUCCESS_RATE",
  "NIGHTLY_SELECTION_DISPOSITION_COUNT",
  "RETRY_VOLUME",
  "DUPLICATE_SUPPRESSION_VOLUME",
  "RETENTION_LIMITATION_VOLUME",
  "ERASURE_THROUGHPUT",
  "INBOX_DEDUPE_HIT_RATE",
  "STEP_UP_EVENTS",
  "ACCESS_DENIALS",
  "EXPORT_ATTEMPTS",
  "LEGAL_HOLD_BLOCKS",
  "ERASURE_BLOCKS",
  "CSRF_REJECTION_RATE",
  "SESSION_REVOCATIONS",
  "EGRESS_POLICY_VIOLATIONS",
  "SIGNED_BUILD_VERIFICATION_FAILURES",
]);

const HISTOGRAM_FAMILIES = new Set<MetricFamily>([
  "COMPLETENESS_SCORE_DISTRIBUTION",
  "DATA_QUALITY_SCORE_DISTRIBUTION",
  "PARITY_CLASSIFICATION_DISTRIBUTION",
  "TRUST_BAND_DISTRIBUTION",
  "GRAPH_CRITICAL_PATH_COVERAGE_DISTRIBUTION",
  "MODULE_LATENCY",
  "QUEUE_DELAY",
  "OPERATOR_DIGEST_PUBLISH_LATENCY",
]);

export function instrumentKindForMetricFamily(
  metricFamily: MetricFamily,
): MetricInstrumentKind {
  if (HISTOGRAM_FAMILIES.has(metricFamily)) {
    return "HISTOGRAM";
  }
  if (COUNTER_FAMILIES.has(metricFamily)) {
    return "COUNTER";
  }
  return "GAUGE";
}

export function retentionClassForMetricFamily(_metricFamily: MetricFamily) {
  return "retention.telemetry.metric_rollup_30d";
}

export function assertMetricEventContract(event: MetricEvent) {
  if (!METRIC_FAMILIES.includes(event.metric_family)) {
    throw new ObservabilityContractError(
      "OBSERVABILITY_CONTEXT_FIELD_INVALID",
      "metric_family is outside the frozen MetricEvent vocabulary",
    );
  }
  if (event.value < 0 || !Number.isFinite(event.value)) {
    throw new ObservabilityContractError(
      "OBSERVABILITY_ATTRIBUTE_INVALID",
      "MetricEvent.value must be a non-negative finite number",
    );
  }
  if (!event.correlation_context.service_name || !event.correlation_context.environment_ref) {
    throw new ObservabilityContractError(
      "OBSERVABILITY_CONTEXT_FIELD_INVALID",
      "MetricEvent correlation_context must carry service_name and environment_ref",
    );
  }
  if (
    [
      "NIGHTLY_BATCH_OUTCOME_RATE",
      "NIGHTLY_SELECTION_DISPOSITION_COUNT",
      "OPERATOR_DIGEST_PUBLISH_LATENCY",
    ].includes(event.metric_family) &&
    (!event.correlation_context.nightly_batch_run_ref ||
      !event.correlation_context.nightly_window_key)
  ) {
    throw new ObservabilityContractError(
      "OBSERVABILITY_CONTEXT_NIGHTLY_DRIFT",
      `${event.metric_family} requires nightly batch and window correlation`,
    );
  }
  if (
    event.metric_family === "NIGHTLY_BATCH_OUTCOME_RATE" &&
    !["COMPLETED", "COMPLETED_WITH_FAILURES", "FAILED"].includes(
      String(event.dimensions.outcome_bucket),
    )
  ) {
    throw new ObservabilityContractError(
      "OBSERVABILITY_ATTRIBUTE_INVALID",
      "NIGHTLY_BATCH_OUTCOME_RATE requires dimensions.outcome_bucket",
    );
  }
  if (
    event.metric_family === "NIGHTLY_SELECTION_DISPOSITION_COUNT" &&
    event.dimensions.selection_disposition !==
      event.correlation_context.selection_disposition
  ) {
    throw new ObservabilityContractError(
      "OBSERVABILITY_CONTEXT_NIGHTLY_DRIFT",
      "nightly selection metric dimension must mirror correlation_context.selection_disposition",
    );
  }
  if (
    event.metric_family === "MASKED_VS_FULL_SENSITIVE_VIEWS" &&
    !["MASKED_ONLY", "FULL_ALLOWED"].includes(String(event.dimensions.view_posture))
  ) {
    throw new ObservabilityContractError(
      "OBSERVABILITY_ATTRIBUTE_INVALID",
      "MASKED_VS_FULL_SENSITIVE_VIEWS requires dimensions.view_posture",
    );
  }
  normalizeAttributeMap("MetricEvent.dimensions", event.dimensions);
}
