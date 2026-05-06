import type { TelemetryResourceAttributeMap } from "../../../generated-models/src/generated/typescript/retention-failure-and-observability.ts";
import type { ObservabilityCorrelationContext } from "./observability_correlation_context.ts";
import {
  normalizeAttributeMap,
  ObservabilityContractError,
} from "./observability_correlation_context.ts";

export const LOG_FAMILIES = [
  "RUNTIME",
  "SESSION_SECURITY",
  "ACCESS_CONTROL",
  "PRIVACY_RETENTION",
  "AUTHORITY_EDGE",
] as const;

export const LOG_SEVERITIES = ["TRACE", "DEBUG", "INFO", "WARN", "ERROR", "FATAL"] as const;

export type LogFamily = (typeof LOG_FAMILIES)[number];
export type LogSeverity = (typeof LOG_SEVERITIES)[number];
export type LogAccessTier =
  | "STANDARD_OPERATIONS"
  | "SECURITY_RESTRICTED"
  | "PRIVACY_RESTRICTED";

export type LogRecord = {
  access_tier: LogAccessTier;
  artifact_type: "LogRecord";
  correlation_context: ObservabilityCorrelationContext;
  environment_ref: string;
  event_code: string;
  log_family: LogFamily;
  log_record_id: string;
  message_template: string;
  resource_ref: string;
  retention_class: string;
  service_name: string;
  severity: LogSeverity;
  structured_fields: TelemetryResourceAttributeMap;
  timestamp: string;
};

export const ACCESS_TIER_BY_LOG_FAMILY = {
  ACCESS_CONTROL: "SECURITY_RESTRICTED",
  AUTHORITY_EDGE: "SECURITY_RESTRICTED",
  PRIVACY_RETENTION: "PRIVACY_RESTRICTED",
  RUNTIME: "STANDARD_OPERATIONS",
  SESSION_SECURITY: "SECURITY_RESTRICTED",
} as const satisfies Record<LogFamily, LogAccessTier>;

export const RETENTION_CLASS_BY_LOG_FAMILY = {
  ACCESS_CONTROL: "retention.telemetry.security_30d",
  AUTHORITY_EDGE: "retention.telemetry.security_30d",
  PRIVACY_RETENTION: "retention.telemetry.privacy_30d",
  RUNTIME: "retention.telemetry.logs_hot_30d",
  SESSION_SECURITY: "retention.telemetry.security_30d",
} as const satisfies Record<LogFamily, string>;

export const LOG_STRUCTURED_FIELD_POLICY = {
  ACCESS_CONTROL: [
    "access_binding_hash",
    "policy_snapshot_hash",
    "reason_code",
  ],
  AUTHORITY_EDGE: [
    "access_binding_hash",
    "authority_binding_ref",
    "authority_operation_ref",
    "reason_code",
    "submission_record_id",
  ],
  PRIVACY_RETENTION: [
    "artifact_retention_ref",
    "limitation_reason_code",
    "opaque_object_ref",
    "reason_code",
    "retention_class",
  ],
  RUNTIME: [
    "action_code",
    "accessibility_pref",
    "error_code",
    "failure_class",
    "failure_phase",
    "latency_bucket_ms",
    "module_code",
    "opaque_object_ref",
    "performance_bucket_ms",
    "posture_code",
    "queue_family_ref",
    "recovery_outcome",
    "reason_code",
    "route_family",
    "sampling_class",
    "shell_family",
    "stream_scope_class",
    "upload_session_id",
  ],
  SESSION_SECURITY: ["reason_code", "session_ref", "step_up_posture"],
} as const satisfies Record<LogFamily, readonly string[]>;

const FORBIDDEN_LOG_KEY_PATTERN =
  /([Pp][Aa][Ss][Ss](word|wd)?|[Ss][Ee][Cc][Rr][Ee][Tt]|[Tt][Oo][Kk][Ee][Nn]|[Aa][Uu][Tt][Hh](orization)?|[Cc][Oo][Oo][Kk][Ii][Ee]|[Rr][Ee][Ff][Rr][Ee][Ss][Hh][-_]?[Tt][Oo][Kk][Ee][Nn]|[Aa][Cc][Cc][Ee][Ss][Ss][-_]?[Tt][Oo][Kk][Ee][Nn]|[Aa][Pp][Ii][-_]?[Kk][Ee][Yy]|[Ss][Ee][Tt][-_]?[Cc][Oo][Oo][Kk][Ii][Ee]|[Bb][Ee][Aa][Rr][Ee][Rr])/;

function hasImpactCorrelation(context: ObservabilityCorrelationContext) {
  return Boolean(
    context.manifest_id ||
      context.submission_record_id ||
      context.authority_operation_id ||
      context.workflow_item_id,
  );
}

export function sanitizeLogStructuredFields(
  logFamily: LogFamily,
  fields: TelemetryResourceAttributeMap | undefined,
) {
  const normalized = normalizeAttributeMap("LogRecord.structured_fields", fields);
  const allowed: ReadonlySet<string> = new Set(LOG_STRUCTURED_FIELD_POLICY[logFamily]);
  for (const key of Object.keys(normalized)) {
    if (FORBIDDEN_LOG_KEY_PATTERN.test(key)) {
      throw new ObservabilityContractError(
        "OBSERVABILITY_ATTRIBUTE_INVALID",
        `structured log field ${key} is secret-like and forbidden`,
      );
    }
    if (!allowed.has(key)) {
      throw new ObservabilityContractError(
        "OBSERVABILITY_ATTRIBUTE_INVALID",
        `structured log field ${key} is not allowed for ${logFamily}`,
      );
    }
    const value = normalized[key];
    if (typeof value === "string" && /bearer\s+|token=|secret=/i.test(value)) {
      throw new ObservabilityContractError(
        "OBSERVABILITY_ATTRIBUTE_INVALID",
        `structured log field ${key} contains secret-like text`,
      );
    }
  }
  return normalized;
}

export function assertLogRecordContract(record: LogRecord) {
  if (!LOG_FAMILIES.includes(record.log_family)) {
    throw new ObservabilityContractError(
      "OBSERVABILITY_CONTEXT_FIELD_INVALID",
      "log_family is outside the frozen LogRecord vocabulary",
    );
  }
  if (!LOG_SEVERITIES.includes(record.severity)) {
    throw new ObservabilityContractError(
      "OBSERVABILITY_CONTEXT_FIELD_INVALID",
      "severity is outside the frozen LogRecord vocabulary",
    );
  }
  if (!/^[A-Z][A-Z0-9_]*$/.test(record.event_code)) {
    throw new ObservabilityContractError(
      "OBSERVABILITY_CONTEXT_FIELD_INVALID",
      "event_code must be an upper-case structured code",
    );
  }
  if (
    record.message_template.length === 0 ||
    record.message_template.length > 240 ||
    /[\r\n]/.test(record.message_template)
  ) {
    throw new ObservabilityContractError(
      "OBSERVABILITY_ATTRIBUTE_INVALID",
      "message_template must be one structured line of at most 240 characters",
    );
  }
  if (record.access_tier !== ACCESS_TIER_BY_LOG_FAMILY[record.log_family]) {
    throw new ObservabilityContractError(
      "OBSERVABILITY_CONTEXT_FIELD_INVALID",
      "LogRecord.access_tier must mirror log_family policy",
    );
  }
  if (record.correlation_context.service_name !== record.service_name) {
    throw new ObservabilityContractError(
      "OBSERVABILITY_CONTEXT_FIELD_INVALID",
      "LogRecord.service_name must mirror correlation_context.service_name",
    );
  }
  if (record.correlation_context.environment_ref !== record.environment_ref) {
    throw new ObservabilityContractError(
      "OBSERVABILITY_CONTEXT_FIELD_INVALID",
      "LogRecord.environment_ref must mirror correlation_context.environment_ref",
    );
  }
  if (
    ["WARN", "ERROR", "FATAL"].includes(record.severity) &&
    (Object.keys(record.structured_fields).length === 0 ||
      !hasImpactCorrelation(record.correlation_context))
  ) {
    throw new ObservabilityContractError(
      "OBSERVABILITY_CONTEXT_FIELD_INVALID",
      "warning-or-higher logs require structured fields and impact correlation",
    );
  }
  if (["ERROR", "FATAL"].includes(record.severity) && !record.correlation_context.error_id) {
    throw new ObservabilityContractError(
      "OBSERVABILITY_CONTEXT_FIELD_INVALID",
      "error and fatal logs require correlation_context.error_id",
    );
  }
  if (
    (/REPLAY|RECOVERY/.test(record.event_code) ||
      record.structured_fields.recovery_outcome !== undefined) &&
    !record.correlation_context.replay_class &&
    !record.correlation_context.replay_of_manifest_id &&
    !record.correlation_context.manifest_lineage_trace_ref
  ) {
    throw new ObservabilityContractError(
      "OBSERVABILITY_CONTEXT_REPLAY_DRIFT",
      "replay or recovery logs require replay-safe lineage keys",
    );
  }
  sanitizeLogStructuredFields(record.log_family, record.structured_fields);
}
