import type {
  TelemetryResource,
  TelemetryResourceAttributeMap,
  TelemetryResourceCorrelationContext,
} from "../../../generated-models/src/generated/typescript/retention-failure-and-observability.ts";
import { normalizeUtcInstantString } from "../../../domain-kernel/src/primitives/time.ts";
import {
  assertTraceSpanContract,
  retentionClassForSpanCode,
  samplingClassForSpanCode,
  type TraceSpan,
  type TraceSpanCode,
  type TraceSpanStatusCode,
} from "../models/trace_span.ts";
import { normalizeAttributeMap } from "../models/observability_correlation_context.ts";
import { buildObservabilityCorrelationContext } from "./build_observability_correlation_context.ts";

export type TraceSpanSink = {
  traceSpans?: TraceSpan[];
};

export type RecordTraceSpanInput = {
  correlationContext?: TelemetryResourceCorrelationContext;
  endedAtOrNull?: string | null;
  manifestId: string;
  parentSpanIdOrNull?: string | null;
  resource: TelemetryResource;
  sink?: TraceSpanSink;
  spanAttributes?: TelemetryResourceAttributeMap;
  spanCode: TraceSpanCode;
  spanSeed?: string | null;
  startedAt: string;
  statusCode: TraceSpanStatusCode;
  traceSeed?: string | null;
};

export function recordTraceSpan(input: RecordTraceSpanInput): TraceSpan {
  const isRootSpan = input.spanCode === "RUN_ROOT";
  const parentSpanId =
    isRootSpan ? null : input.parentSpanIdOrNull ?? input.correlationContext?.span_id ?? null;
  const baseCorrelationContext = { ...(input.correlationContext ?? {}) };
  if (!isRootSpan && input.spanSeed && parentSpanId !== null) {
    delete baseCorrelationContext.span_id;
  }
  const correlationContext = buildObservabilityCorrelationContext({
    ...baseCorrelationContext,
    manifest_id: input.manifestId,
    parentContext: input.correlationContext,
    resource: input.resource,
    spanSeed: input.spanSeed,
    traceSeed: input.traceSeed,
  });
  const span: TraceSpan = {
    artifact_type: "TraceSpan",
    correlation_context: correlationContext,
    ended_at: input.endedAtOrNull
      ? normalizeUtcInstantString(input.endedAtOrNull)
      : null,
    manifest_id: input.manifestId,
    parent_span_id: parentSpanId,
    resource_ref: input.resource.resource_id,
    retention_class: retentionClassForSpanCode(input.spanCode),
    sampling_class: samplingClassForSpanCode(input.spanCode),
    span_attributes: normalizeAttributeMap("TraceSpan.span_attributes", input.spanAttributes),
    span_code: input.spanCode,
    span_id: String(correlationContext.span_id),
    span_scope_class: "MANIFEST_RUNTIME",
    started_at: normalizeUtcInstantString(input.startedAt),
    status_code: input.statusCode,
    trace_id: String(correlationContext.trace_id),
  };
  assertTraceSpanContract(span);
  input.sink?.traceSpans?.push(span);
  return span;
}
