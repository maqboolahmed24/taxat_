import type {
  TelemetryResource,
  TelemetryResourceAttributeMap,
  TelemetryResourceCorrelationContext,
} from "../../../generated-models/src/generated/typescript/retention-failure-and-observability.ts";
import { stableJsonHash } from "../../../domain-kernel/src/primitives/hash.ts";
import { normalizeUtcInstantString } from "../../../domain-kernel/src/primitives/time.ts";
import {
  assertMetricEventContract,
  instrumentKindForMetricFamily,
  type MetricEvent,
  type MetricFamily,
} from "../models/metric_event.ts";
import {
  normalizeAttributeMap,
  ObservabilityContractError,
} from "../models/observability_correlation_context.ts";
import { buildObservabilityCorrelationContext } from "./build_observability_correlation_context.ts";

export type MetricEventSink = {
  metricEvents?: MetricEvent[];
};

export type RecordMetricEventInput = {
  correlationContext?: TelemetryResourceCorrelationContext;
  dimensions?: TelemetryResourceAttributeMap;
  metricFamily: MetricFamily;
  observedAt: string;
  resource: TelemetryResource;
  sink?: MetricEventSink;
  unit: string | null;
  value: number;
};

function dimensionsForMetric(
  metricFamily: MetricFamily,
  dimensions: TelemetryResourceAttributeMap,
  context: TelemetryResourceCorrelationContext,
) {
  const normalized = { ...dimensions };
  if (metricFamily === "NIGHTLY_SELECTION_DISPOSITION_COUNT") {
    if (!normalized.selection_disposition && context.selection_disposition) {
      normalized.selection_disposition = context.selection_disposition;
    }
  }
  if (
    metricFamily === "NIGHTLY_BATCH_OUTCOME_RATE" &&
    !normalized.outcome_bucket
  ) {
    throw new ObservabilityContractError(
      "OBSERVABILITY_ATTRIBUTE_INVALID",
      "NIGHTLY_BATCH_OUTCOME_RATE requires dimensions.outcome_bucket",
    );
  }
  return normalized;
}

export function recordMetricEvent(input: RecordMetricEventInput): MetricEvent {
  const correlationContext = buildObservabilityCorrelationContext({
    ...(input.correlationContext ?? {}),
    resource: input.resource,
  });
  const observedAt = normalizeUtcInstantString(input.observedAt);
  const dimensions = dimensionsForMetric(
    input.metricFamily,
    normalizeAttributeMap("MetricEvent.dimensions", input.dimensions),
    correlationContext,
  );
  const event: MetricEvent = {
    correlation_context: correlationContext,
    dimensions,
    instrument_kind: instrumentKindForMetricFamily(input.metricFamily),
    metric_event_id: `metric.${stableJsonHash({
      correlation_context: correlationContext,
      dimensions,
      metric_family: input.metricFamily,
      observed_at: observedAt,
      resource_ref: input.resource.resource_id,
      unit: input.unit,
      value: input.value,
    })}`,
    metric_family: input.metricFamily,
    observed_at: observedAt,
    resource_ref: input.resource.resource_id,
    unit: input.unit,
    value: input.value,
  };
  assertMetricEventContract(event);
  input.sink?.metricEvents?.push(event);
  return event;
}
