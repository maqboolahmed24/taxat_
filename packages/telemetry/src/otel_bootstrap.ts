import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import type {
  TelemetryResource,
  TelemetryResourceAttributeMap,
  TelemetryResourceCorrelationContext,
} from "../../generated-models/src/generated/typescript/retention-failure-and-observability.ts";
import { stableJsonHash } from "../../domain-kernel/src/primitives/hash.ts";
import { normalizeUtcInstantString } from "../../domain-kernel/src/primitives/time.ts";
import {
  createClientSurfaceLogRecord,
  createClientSurfaceMetricEvent,
  type ClientSurfaceLogInput,
  type ClientSurfaceMetricInput,
  type ClientSurfaceMetricEvent,
} from "./client_surface_telemetry.ts";
import { extractHttpContext, injectHttpContext, type HttpExtractionInput } from "./http_context_propagation.ts";
import {
  createMessageContextEnvelope,
  extractMessageContextEnvelope,
  type MessagePropagationEnvelope,
} from "./message_context_propagation.ts";
import { createStructuredLogAdapter, type StructuredLogRecord } from "./structured_log_adapter.ts";
import { createTelemetryResource, type TelemetryResourceInput } from "./telemetry_resource_builder.ts";

export type TelemetrySignalCatalog = {
  audit_join_boundary: "TELEMETRY_CORRELATES_TO_AUDIT_BUT_DOES_NOT_REPLACE_IT";
  policy_id: "telemetry_signal_catalog";
  schema_version: string;
  signal_rows: Array<{
    contract_artifact: string;
    default_channel_ref: string;
    default_retention_class: string;
    label: string;
    notes: string[];
    signal_ref: "TRACE" | "METRIC" | "LOG" | "HTTP" | "QUEUE" | "STREAM" | "CLIENT";
    vendor_exportable: boolean;
  }>;
};

export type CorrelationKeyMatrix = {
  context_contract: {
    audit_join_keys: string[];
    authoritative_only_keys: string[];
    mandatory_keys: string[];
    optional_keys: string[];
  };
  policy_id: "correlation_key_matrix";
  resource_attribute_contract: {
    optional_attributes: string[];
    required_attributes: string[];
  };
  schema_version: string;
  channel_rows: Array<{
    channel_ref:
      | "TRACE_SIGNAL"
      | "METRIC_SIGNAL"
      | "LOG_SIGNAL"
      | "HTTP_PUBLIC_INGRESS"
      | "HTTP_INTERNAL_PROPAGATION"
      | "QUEUE_MESSAGE"
      | "STREAM_PUBLICATION"
      | "UPLOAD_CONTINUATION"
      | "CLIENT_SURFACE";
    label: string;
    notes: string[];
    optional_keys: string[];
    propagation_mode: string;
    redacted_keys: string[];
    retained_keys: string[];
    surface_limited_keys: string[];
    trust_boundary: string;
  }>;
};

export type SamplingClassPolicy = {
  audit_join_boundary: "TELEMETRY_CORRELATES_TO_AUDIT_BUT_DOES_NOT_REPLACE_IT";
  default_metric_retention_class: string;
  default_trace_retention_class: string;
  log_family_rules: Array<{
    access_tier: StructuredLogRecord["access_tier"];
    log_family: StructuredLogRecord["log_family"];
    retention_class: string;
  }>;
  metric_family_rules: Array<{
    instrument_kind: ClientSurfaceMetricEvent["instrument_kind"];
    metric_family: string;
    retention_class: string;
  }>;
  policy_id: "sampling_class_policy";
  sampling_class_rows: Array<{
    default_retention_class: string;
    label: string;
    notes: string[];
    sampled_out_behavior: string;
    sampling_class_ref:
      | "MANDATORY_FORENSIC"
      | "DETERMINISTIC_RETAIN"
      | "SAMPLED_OPERATIONAL"
      | "CLIENT_LOW_NOISE";
  }>;
  schema_version: string;
  span_code_rules: Array<{
    retention_class: string;
    sampling_class_ref:
      | "MANDATORY_FORENSIC"
      | "DETERMINISTIC_RETAIN"
      | "SAMPLED_OPERATIONAL";
    span_code: string;
  }>;
};

export type LogRedactionPolicy = {
  client_surface_allowed_fields: string[];
  client_surface_forbidden_keys: string[];
  family_policies: Array<{
    access_tier: StructuredLogRecord["access_tier"];
    allowed_structured_fields: string[];
    hashed_only_fields: string[];
    log_family: StructuredLogRecord["log_family"];
    notes: string[];
  }>;
  forbidden_field_patterns: string[];
  policy_id: "log_redaction_policy";
  redacted_value: string;
  schema_version: string;
};

export type TelemetryPolicyBundle = {
  correlationKeyMatrix: CorrelationKeyMatrix;
  logRedactionPolicy: LogRedactionPolicy;
  samplingClassPolicy: SamplingClassPolicy;
  telemetrySignalCatalog: TelemetrySignalCatalog;
};

export type TraceSpanRecord = {
  artifact_type: "TraceSpan";
  correlation_context: TelemetryResourceCorrelationContext;
  ended_at: string | null;
  manifest_id: string;
  parent_span_id: string | null;
  resource_ref: string;
  retention_class: string;
  sampling_class: "MANDATORY_FORENSIC" | "DETERMINISTIC_RETAIN" | "SAMPLED_OPERATIONAL";
  span_attributes: TelemetryResourceAttributeMap;
  span_code: string;
  span_id: string;
  span_scope_class: "MANIFEST_RUNTIME";
  started_at: string;
  status_code: "UNSET" | "OK" | "ERROR";
  trace_id: string;
};

export type MetricEventRecord = {
  correlation_context: TelemetryResourceCorrelationContext;
  dimensions: TelemetryResourceAttributeMap;
  instrument_kind: ClientSurfaceMetricEvent["instrument_kind"];
  metric_event_id: string;
  metric_family: string;
  observed_at: string;
  resource_ref: string;
  unit: string | null;
  value: number;
};

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, "..", "..", "..");
const configDir = path.join(repoRoot, "config", "telemetry");

let cachedBundle: Promise<TelemetryPolicyBundle> | null = null;

async function readJson<T>(filePath: string) {
  return JSON.parse(await readFile(filePath, "utf8")) as T;
}

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

function validatePolicyBundle(bundle: TelemetryPolicyBundle) {
  const signalRefs = new Set(bundle.telemetrySignalCatalog.signal_rows.map((row) => row.signal_ref));
  assert(
    ["TRACE", "METRIC", "LOG", "HTTP", "QUEUE", "STREAM", "CLIENT"].every((value) =>
      signalRefs.has(value as never),
    ),
    "TELEMETRY_SIGNAL_CATALOG_INCOMPLETE",
  );

  const channelRefs = new Set(bundle.correlationKeyMatrix.channel_rows.map((row) => row.channel_ref));
  assert(channelRefs.has("HTTP_PUBLIC_INGRESS"), "CORRELATION_CHANNEL_HTTP_PUBLIC_MISSING");
  assert(channelRefs.has("HTTP_INTERNAL_PROPAGATION"), "CORRELATION_CHANNEL_HTTP_INTERNAL_MISSING");
  assert(channelRefs.has("QUEUE_MESSAGE"), "CORRELATION_CHANNEL_QUEUE_MISSING");
  assert(channelRefs.has("STREAM_PUBLICATION"), "CORRELATION_CHANNEL_STREAM_MISSING");
  assert(channelRefs.has("UPLOAD_CONTINUATION"), "CORRELATION_CHANNEL_UPLOAD_MISSING");
  assert(channelRefs.has("CLIENT_SURFACE"), "CORRELATION_CHANNEL_CLIENT_MISSING");

  const samplingRefs = new Set(
    bundle.samplingClassPolicy.sampling_class_rows.map((row) => row.sampling_class_ref),
  );
  assert(samplingRefs.has("MANDATORY_FORENSIC"), "SAMPLING_CLASS_MANDATORY_FORENSIC_MISSING");
  assert(samplingRefs.has("DETERMINISTIC_RETAIN"), "SAMPLING_CLASS_DETERMINISTIC_RETAIN_MISSING");
  assert(samplingRefs.has("SAMPLED_OPERATIONAL"), "SAMPLING_CLASS_SAMPLED_OPERATIONAL_MISSING");

  const logFamilies = new Set(
    bundle.logRedactionPolicy.family_policies.map((entry) => entry.log_family),
  );
  assert(logFamilies.has("RUNTIME"), "LOG_REDACTION_RUNTIME_POLICY_MISSING");
  assert(logFamilies.has("SESSION_SECURITY"), "LOG_REDACTION_SESSION_SECURITY_POLICY_MISSING");
  assert(logFamilies.has("ACCESS_CONTROL"), "LOG_REDACTION_ACCESS_CONTROL_POLICY_MISSING");
  assert(logFamilies.has("PRIVACY_RETENTION"), "LOG_REDACTION_PRIVACY_POLICY_MISSING");
  assert(logFamilies.has("AUTHORITY_EDGE"), "LOG_REDACTION_AUTHORITY_EDGE_POLICY_MISSING");
}

export async function loadTelemetryPolicyBundle(options?: { reload?: boolean }) {
  if (!cachedBundle || options?.reload) {
    cachedBundle = (async () => {
      const bundle = {
        correlationKeyMatrix: await readJson<CorrelationKeyMatrix>(
          path.join(configDir, "correlation_key_matrix.json"),
        ),
        logRedactionPolicy: await readJson<LogRedactionPolicy>(
          path.join(configDir, "log_redaction_policy.json"),
        ),
        samplingClassPolicy: await readJson<SamplingClassPolicy>(
          path.join(configDir, "sampling_class_policy.json"),
        ),
        telemetrySignalCatalog: await readJson<TelemetrySignalCatalog>(
          path.join(configDir, "telemetry_signal_catalog.json"),
        ),
      } satisfies TelemetryPolicyBundle;
      validatePolicyBundle(bundle);
      return bundle;
    })();
  }
  return cachedBundle;
}

export function lookupSamplingClassForSpanCode(
  policy: SamplingClassPolicy,
  spanCode: string,
): TraceSpanRecord["sampling_class"] {
  return (
    policy.span_code_rules.find((entry) => entry.span_code === spanCode)?.sampling_class_ref ??
    "SAMPLED_OPERATIONAL"
  );
}

function traceRetentionClass(policy: SamplingClassPolicy, spanCode: string) {
  return (
    policy.span_code_rules.find((entry) => entry.span_code === spanCode)?.retention_class ??
    policy.default_trace_retention_class
  );
}

function metricRule(policy: SamplingClassPolicy, metricFamily: string) {
  return (
    policy.metric_family_rules.find((entry) => entry.metric_family === metricFamily) ?? {
      instrument_kind: "GAUGE",
      metric_family: metricFamily,
      retention_class: policy.default_metric_retention_class,
    }
  );
}

export function createTraceSpanRecord(input: {
  correlationContext: TelemetryResourceCorrelationContext;
  endedAtOrNull?: string | null;
  manifestId: string;
  parentSpanIdOrNull?: string | null;
  policyBundle: TelemetryPolicyBundle;
  resource: TelemetryResource;
  spanAttributes?: TelemetryResourceAttributeMap;
  spanCode: string;
  startedAt: string;
  statusCode: TraceSpanRecord["status_code"];
}) {
  if (!input.correlationContext.trace_id || !input.correlationContext.span_id) {
    throw new Error("TRACE_SPAN_CONTEXT_TRACE_AND_SPAN_REQUIRED");
  }
  if (!input.endedAtOrNull && input.statusCode !== "UNSET") {
    throw new Error("TRACE_SPAN_OPEN_STATUS_MUST_BE_UNSET");
  }
  if (input.endedAtOrNull && input.statusCode === "UNSET") {
    throw new Error("TRACE_SPAN_COMPLETED_STATUS_REQUIRED");
  }
  if (
    input.statusCode === "ERROR" &&
    (!input.correlationContext.error_id ||
      !input.spanAttributes?.failure_class ||
      !input.spanAttributes?.failure_phase)
  ) {
    throw new Error("TRACE_SPAN_ERROR_DETAILS_REQUIRED");
  }
  return {
    artifact_type: "TraceSpan",
    correlation_context: input.correlationContext,
    ended_at: input.endedAtOrNull ? normalizeUtcInstantString(input.endedAtOrNull) : null,
    manifest_id: input.manifestId,
    parent_span_id: input.parentSpanIdOrNull ?? null,
    resource_ref: input.resource.resource_id,
    retention_class: traceRetentionClass(input.policyBundle.samplingClassPolicy, input.spanCode),
    sampling_class: lookupSamplingClassForSpanCode(
      input.policyBundle.samplingClassPolicy,
      input.spanCode,
    ),
    span_attributes: input.spanAttributes ?? {},
    span_code: input.spanCode,
    span_id: input.correlationContext.span_id,
    span_scope_class: "MANIFEST_RUNTIME",
    started_at: normalizeUtcInstantString(input.startedAt),
    status_code: input.statusCode,
    trace_id: input.correlationContext.trace_id,
  } satisfies TraceSpanRecord;
}

export function createMetricEventRecord(input: {
  correlationContext: TelemetryResourceCorrelationContext;
  dimensions?: TelemetryResourceAttributeMap;
  metricFamily: string;
  observedAt: string;
  policyBundle: TelemetryPolicyBundle;
  resource: TelemetryResource;
  unit: string | null;
  value: number;
}) {
  const rule = metricRule(input.policyBundle.samplingClassPolicy, input.metricFamily);
  const observedAt = normalizeUtcInstantString(input.observedAt);
  return {
    correlation_context: input.correlationContext,
    dimensions: input.dimensions ?? {},
    instrument_kind: rule.instrument_kind,
    metric_event_id: `metric.${stableJsonHash({
      correlation_context: input.correlationContext,
      metric_family: input.metricFamily,
      observed_at: observedAt,
      value: input.value,
    })}`,
    metric_family: input.metricFamily,
    observed_at: observedAt,
    resource_ref: input.resource.resource_id,
    unit: input.unit,
    value: input.value,
  } satisfies MetricEventRecord;
}

export async function createTelemetryBootstrap(input: TelemetryResourceInput) {
  const policyBundle = await loadTelemetryPolicyBundle();
  const resource = createTelemetryResource(input);
  const logAdapter = createStructuredLogAdapter({
    policyBundle,
    resource,
  });

  return {
    auditBoundary: policyBundle.telemetrySignalCatalog.audit_join_boundary,
    contractVersion: "TAXAT_OTEL_BOOTSTRAP_V1" as const,
    createClientSurfaceLog: (
      entry: Omit<ClientSurfaceLogInput, "policyBundle" | "resource">,
    ) =>
      createClientSurfaceLogRecord({
        ...entry,
        policyBundle,
        resource,
      }),
    createClientSurfaceMetric: (
      entry: Omit<ClientSurfaceMetricInput, "policyBundle" | "resource">,
    ) =>
      createClientSurfaceMetricEvent({
        ...entry,
        policyBundle,
        resource,
      }),
    createLogRecord: logAdapter.createRecord,
    createMessageEnvelope: (
      entry: Omit<
        Parameters<typeof createMessageContextEnvelope>[0],
        "policyBundle"
      >,
    ): MessagePropagationEnvelope =>
      createMessageContextEnvelope({
        ...entry,
        policyBundle,
      }),
    createMetricEvent: (
      entry: Omit<Parameters<typeof createMetricEventRecord>[0], "policyBundle" | "resource">,
    ) =>
      createMetricEventRecord({
        ...entry,
        policyBundle,
        resource,
      }),
    createTraceSpan: (
      entry: Omit<Parameters<typeof createTraceSpanRecord>[0], "policyBundle" | "resource">,
    ) =>
      createTraceSpanRecord({
        ...entry,
        policyBundle,
        resource,
      }),
    exportMode: "OTLP_PRIMARY_VENDOR_EXPORT_OPTIONAL" as const,
    extractHttpContext: (
      entry: Omit<HttpExtractionInput, "policyBundle" | "resource">,
    ) =>
      extractHttpContext({
        ...entry,
        policyBundle,
        resource,
      }),
    extractMessageContext: (
      entry: Omit<
        Parameters<typeof extractMessageContextEnvelope>[0],
        "policyBundle" | "resource"
      >,
    ) =>
      extractMessageContextEnvelope({
        ...entry,
        policyBundle,
        resource,
      }),
    injectHttpContext: (
      entry: Omit<Parameters<typeof injectHttpContext>[0], "policyBundle">,
    ) =>
      injectHttpContext({
        ...entry,
        policyBundle,
      }),
    lookupSamplingClassForSpanCode: (spanCode: string) =>
      lookupSamplingClassForSpanCode(policyBundle.samplingClassPolicy, spanCode),
    policyBundle,
    propagatorStack: ["w3c-tracecontext", "x-taxat-correlation-v1"] as const,
    resource,
  };
}
