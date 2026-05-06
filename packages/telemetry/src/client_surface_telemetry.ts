import type {
  TelemetryResource,
  TelemetryResourceAttributeMap,
  TelemetryResourceCorrelationContext,
} from "../../generated-models/src/generated/typescript/retention-failure-and-observability.ts";
import { stableJsonHash } from "../../domain-kernel/src/primitives/hash.ts";
import { normalizeUtcInstantString } from "../../domain-kernel/src/primitives/time.ts";
import {
  createStructuredLogRecord,
  type StructuredLogRecord,
} from "./structured_log_adapter.ts";

export type ClientSurfaceMetricEvent = {
  correlation_context: TelemetryResourceCorrelationContext;
  dimensions: TelemetryResourceAttributeMap;
  instrument_kind: "COUNTER" | "GAUGE" | "HISTOGRAM";
  metric_event_id: string;
  metric_family: string;
  observed_at: string;
  resource_ref: string;
  unit: string | null;
  value: number;
};

type PolicyBundleShape = {
  logRedactionPolicy: {
    client_surface_allowed_fields: string[];
    client_surface_forbidden_keys: string[];
  };
  samplingClassPolicy: {
    metric_family_rules: Array<{
      instrument_kind: ClientSurfaceMetricEvent["instrument_kind"];
      metric_family: string;
      retention_class: string;
    }>;
  };
};

export type ClientSurfaceMetricInput = {
  correlationContext: TelemetryResourceCorrelationContext;
  dimensions: TelemetryResourceAttributeMap;
  metricFamily: string;
  observedAt: string;
  policyBundle: PolicyBundleShape;
  resource: TelemetryResource;
  unit: string | null;
  value: number;
};

export type ClientSurfaceLogInput = {
  correlationContext: TelemetryResourceCorrelationContext;
  eventCode: string;
  messageTemplate: string;
  policyBundle: PolicyBundleShape & Parameters<typeof createStructuredLogRecord>[0]["policyBundle"];
  resource: TelemetryResource;
  severity: StructuredLogRecord["severity"];
  structuredFields: TelemetryResourceAttributeMap;
  timestamp: string;
};

function sanitizeClientSurfaceFields(
  fields: TelemetryResourceAttributeMap,
  policyBundle: PolicyBundleShape,
) {
  const allowed = new Set(policyBundle.logRedactionPolicy.client_surface_allowed_fields);
  const forbidden = new Set(policyBundle.logRedactionPolicy.client_surface_forbidden_keys);
  const sanitized: TelemetryResourceAttributeMap = {};

  for (const [key, value] of Object.entries(fields)) {
    if (forbidden.has(key)) {
      throw new Error(`CLIENT_SURFACE_FIELD_FORBIDDEN:${key}`);
    }
    if (!allowed.has(key)) {
      throw new Error(`CLIENT_SURFACE_FIELD_NOT_ALLOWED:${key}`);
    }
    if (
      value === null ||
      typeof value === "string" ||
      typeof value === "number" ||
      typeof value === "boolean"
    ) {
      sanitized[key] = value;
      continue;
    }
    throw new Error(`CLIENT_SURFACE_FIELD_VALUE_INVALID:${key}`);
  }

  return sanitized;
}

export function createClientSurfaceMetricEvent(
  input: ClientSurfaceMetricInput,
): ClientSurfaceMetricEvent {
  const rule = input.policyBundle.samplingClassPolicy.metric_family_rules.find(
    (entry) => entry.metric_family === input.metricFamily,
  );
  if (!rule) {
    throw new Error(`CLIENT_SURFACE_METRIC_RULE_MISSING:${input.metricFamily}`);
  }

  const dimensions = sanitizeClientSurfaceFields(input.dimensions, input.policyBundle);
  const observedAt = normalizeUtcInstantString(input.observedAt);
  return {
    correlation_context: input.correlationContext,
    dimensions,
    instrument_kind: rule.instrument_kind,
    metric_event_id: `metric.${stableJsonHash({
      correlation_context: input.correlationContext,
      dimensions,
      metric_family: input.metricFamily,
      observed_at: observedAt,
      value: input.value,
    })}`,
    metric_family: input.metricFamily,
    observed_at: observedAt,
    resource_ref: input.resource.resource_id,
    unit: input.unit,
    value: input.value,
  };
}

export function createClientSurfaceLogRecord(input: ClientSurfaceLogInput) {
  const structuredFields = sanitizeClientSurfaceFields(
    input.structuredFields,
    input.policyBundle,
  );
  return createStructuredLogRecord({
    correlationContext: input.correlationContext,
    eventCode: input.eventCode,
    logFamily: "RUNTIME",
    messageTemplate: input.messageTemplate,
    policyBundle: input.policyBundle,
    resource: input.resource,
    severity: input.severity,
    structuredFields,
    timestamp: input.timestamp,
  });
}
