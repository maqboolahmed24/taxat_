import type {
  TelemetryResource,
  TelemetryResourceAttributeMap,
  TelemetryResourceCorrelationContext,
} from "../../generated-models/src/generated/typescript/retention-failure-and-observability.ts";
import { stableJsonHash } from "../../domain-kernel/src/primitives/hash.ts";
import { normalizeUtcInstantString } from "../../domain-kernel/src/primitives/time.ts";

export type StructuredLogRecord = {
  access_tier: "STANDARD_OPERATIONS" | "SECURITY_RESTRICTED" | "PRIVACY_RESTRICTED";
  artifact_type: "LogRecord";
  correlation_context: TelemetryResourceCorrelationContext;
  environment_ref: string;
  event_code: string;
  log_family:
    | "RUNTIME"
    | "SESSION_SECURITY"
    | "ACCESS_CONTROL"
    | "PRIVACY_RETENTION"
    | "AUTHORITY_EDGE";
  log_record_id: string;
  message_template: string;
  resource_ref: string;
  retention_class: string;
  service_name: string;
  severity: "TRACE" | "DEBUG" | "INFO" | "WARN" | "ERROR" | "FATAL";
  structured_fields: TelemetryResourceAttributeMap;
  timestamp: string;
};

type LogFamilyPolicy = {
  access_tier: StructuredLogRecord["access_tier"];
  allowed_structured_fields: string[];
  hashed_only_fields: string[];
  log_family: StructuredLogRecord["log_family"];
};

type PolicyBundleShape = {
  logRedactionPolicy: {
    client_surface_allowed_fields: string[];
    client_surface_forbidden_keys: string[];
    family_policies: LogFamilyPolicy[];
    forbidden_field_patterns: string[];
  };
  samplingClassPolicy: {
    log_family_rules: Array<{
      access_tier: StructuredLogRecord["access_tier"];
      log_family: StructuredLogRecord["log_family"];
      retention_class: string;
    }>;
  };
};

export type StructuredLogInput = {
  correlationContext: TelemetryResourceCorrelationContext;
  eventCode: string;
  logFamily: StructuredLogRecord["log_family"];
  messageTemplate: string;
  policyBundle: PolicyBundleShape;
  resource: TelemetryResource;
  severity: StructuredLogRecord["severity"];
  structuredFields?: TelemetryResourceAttributeMap;
  timestamp: string;
};

function familyPolicy(
  bundle: PolicyBundleShape,
  logFamily: StructuredLogRecord["log_family"],
): LogFamilyPolicy {
  const policy = bundle.logRedactionPolicy.family_policies.find(
    (entry) => entry.log_family === logFamily,
  );
  if (!policy) {
    throw new Error(`STRUCTURED_LOG_POLICY_MISSING:${logFamily}`);
  }
  return policy;
}

function retentionRule(
  bundle: PolicyBundleShape,
  logFamily: StructuredLogRecord["log_family"],
) {
  const rule = bundle.samplingClassPolicy.log_family_rules.find(
    (entry) => entry.log_family === logFamily,
  );
  if (!rule) {
    throw new Error(`STRUCTURED_LOG_RETENTION_RULE_MISSING:${logFamily}`);
  }
  return rule;
}

function assertMessageTemplate(value: string) {
  if (typeof value !== "string" || value.length === 0 || value.length > 240 || /[\r\n]/.test(value)) {
    throw new Error("STRUCTURED_LOG_MESSAGE_TEMPLATE_INVALID");
  }
  return value;
}

function assertEventCode(value: string) {
  if (!/^[A-Z][A-Z0-9_]*$/.test(value)) {
    throw new Error("STRUCTURED_LOG_EVENT_CODE_INVALID");
  }
  return value;
}

function normalizeAttributeValue(value: unknown) {
  if (
    value === null ||
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  ) {
    return value;
  }
  throw new Error("STRUCTURED_LOG_FIELD_VALUE_INVALID");
}

function sanitizeStructuredFields(
  input: StructuredLogInput,
  policy: LogFamilyPolicy,
): TelemetryResourceAttributeMap {
  const fields = input.structuredFields ?? {};
  const sanitized: TelemetryResourceAttributeMap = {};
  const allowed = new Set(policy.allowed_structured_fields);
  const hashedOnly = new Set(policy.hashed_only_fields);
  const forbiddenPatterns = input.policyBundle.logRedactionPolicy.forbidden_field_patterns.map(
    (pattern) => new RegExp(pattern, "i"),
  );

  for (const [key, rawValue] of Object.entries(fields)) {
    if (forbiddenPatterns.some((pattern) => pattern.test(key))) {
      throw new Error(`STRUCTURED_LOG_FIELD_FORBIDDEN:${key}`);
    }
    if (!allowed.has(key) && !hashedOnly.has(key)) {
      throw new Error(`STRUCTURED_LOG_FIELD_NOT_ALLOWED:${key}`);
    }
    const value = normalizeAttributeValue(rawValue);
    sanitized[key] = hashedOnly.has(key)
      ? stableJsonHash({
          field: key,
          value,
        })
      : value;
  }

  return sanitized;
}

export function createStructuredLogRecord(input: StructuredLogInput): StructuredLogRecord {
  const policy = familyPolicy(input.policyBundle, input.logFamily);
  const retention = retentionRule(input.policyBundle, input.logFamily);
  const structuredFields = sanitizeStructuredFields(input, policy);
  const timestamp = normalizeUtcInstantString(input.timestamp);
  const eventCode = assertEventCode(input.eventCode);
  const messageTemplate = assertMessageTemplate(input.messageTemplate);

  if (
    (input.severity === "ERROR" || input.severity === "FATAL") &&
    !input.correlationContext.error_id
  ) {
    throw new Error("STRUCTURED_LOG_ERROR_ID_REQUIRED");
  }

  if (
    (input.severity === "WARN" || input.severity === "ERROR" || input.severity === "FATAL") &&
    Object.keys(structuredFields).length === 0
  ) {
    throw new Error("STRUCTURED_LOG_CONTEXT_REQUIRED_FOR_WARNING_OR_HIGHER");
  }

  return {
    access_tier: retention.access_tier,
    artifact_type: "LogRecord",
    correlation_context: input.correlationContext,
    environment_ref: input.resource.environment_ref,
    event_code: eventCode,
    log_family: input.logFamily,
    log_record_id: `log.${stableJsonHash({
      correlation_context: input.correlationContext,
      event_code: eventCode,
      message_template: messageTemplate,
      severity: input.severity,
      timestamp,
    })}`,
    message_template: messageTemplate,
    resource_ref: input.resource.resource_id,
    retention_class: retention.retention_class,
    service_name: input.resource.service_name,
    severity: input.severity,
    structured_fields: structuredFields,
    timestamp,
  };
}

export function createStructuredLogAdapter(input: {
  policyBundle: PolicyBundleShape;
  resource: TelemetryResource;
}) {
  return {
    createRecord: (
      entry: Omit<StructuredLogInput, "policyBundle" | "resource">,
    ): StructuredLogRecord =>
      createStructuredLogRecord({
        ...entry,
        policyBundle: input.policyBundle,
        resource: input.resource,
      }),
  };
}
