import type {
  TelemetryResource,
  TelemetryResourceAttributeMap,
  TelemetryResourceCorrelationContext,
} from "../../../generated-models/src/generated/typescript/retention-failure-and-observability.ts";
import { stableJsonHash } from "../../../domain-kernel/src/primitives/hash.ts";
import { normalizeUtcInstantString } from "../../../domain-kernel/src/primitives/time.ts";
import {
  ACCESS_TIER_BY_LOG_FAMILY,
  assertLogRecordContract,
  RETENTION_CLASS_BY_LOG_FAMILY,
  sanitizeLogStructuredFields,
  type LogFamily,
  type LogRecord,
  type LogSeverity,
} from "../models/log_record.ts";
import { buildObservabilityCorrelationContext } from "./build_observability_correlation_context.ts";

export type LogRecordSink = {
  logRecords?: LogRecord[];
};

export type RecordLogRecordInput = {
  correlationContext?: TelemetryResourceCorrelationContext;
  eventCode: string;
  logFamily: LogFamily;
  messageTemplate: string;
  resource: TelemetryResource;
  severity: LogSeverity;
  sink?: LogRecordSink;
  structuredFields?: TelemetryResourceAttributeMap;
  timestamp: string;
};

export function recordLogRecord(input: RecordLogRecordInput): LogRecord {
  const correlationContext = buildObservabilityCorrelationContext({
    ...(input.correlationContext ?? {}),
    resource: input.resource,
  });
  const structuredFields = sanitizeLogStructuredFields(
    input.logFamily,
    input.structuredFields,
  );
  const timestamp = normalizeUtcInstantString(input.timestamp);
  const record: LogRecord = {
    access_tier: ACCESS_TIER_BY_LOG_FAMILY[input.logFamily],
    artifact_type: "LogRecord",
    correlation_context: correlationContext,
    environment_ref: input.resource.environment_ref,
    event_code: input.eventCode,
    log_family: input.logFamily,
    log_record_id: `log.${stableJsonHash({
      correlation_context: correlationContext,
      event_code: input.eventCode,
      log_family: input.logFamily,
      message_template: input.messageTemplate,
      resource_ref: input.resource.resource_id,
      severity: input.severity,
      structured_fields: structuredFields,
      timestamp,
    })}`,
    message_template: input.messageTemplate,
    resource_ref: input.resource.resource_id,
    retention_class: RETENTION_CLASS_BY_LOG_FAMILY[input.logFamily],
    service_name: input.resource.service_name,
    severity: input.severity,
    structured_fields: structuredFields,
    timestamp,
  };
  assertLogRecordContract(record);
  input.sink?.logRecords?.push(record);
  return record;
}
