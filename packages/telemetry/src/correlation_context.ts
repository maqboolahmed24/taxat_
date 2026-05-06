import type {
  TelemetryResource,
  TelemetryResourceCorrelationContext,
} from "../../generated-models/src/generated/typescript/retention-failure-and-observability.ts";
import { stableJsonHash } from "../../domain-kernel/src/primitives/hash.ts";

export type CorrelationBoundaryRef =
  | "SERVER_AUTHORED"
  | "PUBLIC_HTTP"
  | "INTERNAL_HTTP"
  | "QUEUE_MESSAGE"
  | "STREAM_PUBLICATION"
  | "UPLOAD_CONTINUATION"
  | "CLIENT_SURFACE";

export type TransportTrustState =
  | "NEW_ROOT"
  | "REUSED_TRANSPORT_TRACE"
  | "MISSING_INBOUND_CONTEXT"
  | "MALFORMED_INBOUND_CONTEXT"
  | "INTERNAL_CONTEXT_REUSED";

export type CorrelationNormalizationResult = {
  auditJoinBoundary: "TELEMETRY_CORRELATES_TO_AUDIT_BUT_DOES_NOT_REPLACE_IT";
  context: TelemetryResourceCorrelationContext;
  parentSpanIdOrNull: string | null;
  traceStateOrNull: string | null;
  transportTrustState: TransportTrustState;
  warnings: string[];
};

export type CorrelationContextInput = Partial<TelemetryResourceCorrelationContext> & {
  codeBuildIdOrNull?: string | null;
  resource?: TelemetryResource;
  serviceNameOrNull?: string | null;
};

const enumFields = {
  basis_validation_state: new Set([
    "VALID",
    "RETENTION_LIMITED",
    "MISSING_DEPENDENCY",
    "CORRUPT",
    "SCHEMA_INCOMPATIBLE",
    "BUILD_UNAVAILABLE",
  ]),
  comparison_mode: new Set([
    "EXACT_HASH_MATCH",
    "COUNTERFACTUAL_DECLARED",
    "LIMITED_HISTORICAL_COMPARISON",
    "BASIS_INCOMPLETE",
    "BASIS_CORRUPT",
  ]),
  config_inheritance_mode: new Set([
    "FRESH_CHILD_RESOLUTION",
    "REPLAY_EXACT",
    "RECOVERY_EXACT",
    "HISTORICAL_EXPLICIT",
  ]),
  input_inheritance_mode: new Set([
    "FRESH_CHILD_COLLECTION",
    "REPLAY_EXACT",
    "RECOVERY_EXACT",
    "HISTORICAL_EXPLICIT",
  ]),
  mode: new Set(["COMPLIANCE", "ANALYSIS"]),
  replay_class: new Set(["STANDARD_REPLAY", "AUDIT_REPLAY", "COUNTERFACTUAL_ANALYSIS"]),
  run_kind: new Set([
    "INTERACTIVE",
    "NIGHTLY",
    "BACKFILL",
    "REPLAY",
    "REMEDIATION",
    "AMENDMENT",
    "MIGRATION",
  ]),
  selection_disposition: new Set([
    "EXECUTE_NEW_MANIFEST",
    "EXECUTE_CONTINUATION_CHILD",
    "REUSE_EXISTING_TERMINAL_RESULT",
    "DEFER_ACTIVE_ATTEMPT",
    "DEFER_RETRY_WINDOW",
    "ESCALATE_ONLY",
    "SKIP_INELIGIBLE",
  ]),
} as const;

type EnumFieldName = keyof typeof enumFields;

function deriveHexId(seed: string, length: number) {
  const digest = stableJsonHash({
    seed: seed.normalize("NFC"),
  }).slice(0, length);
  return /^0+$/.test(digest) ? `1${digest.slice(1)}` : digest;
}

function normalizeNullableString(value: unknown) {
  if (value === undefined || value === null) {
    return null;
  }
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error("TELEMETRY_CORRELATION_STRING_INVALID");
  }
  return value.trim();
}

function normalizeEnum(field: EnumFieldName, value: unknown) {
  const normalized = normalizeNullableString(value);
  if (normalized === null) {
    return null;
  }
  if (!enumFields[field].has(normalized)) {
    throw new Error(`TELEMETRY_CORRELATION_ENUM_INVALID:${field}`);
  }
  return normalized as TelemetryResourceCorrelationContext[EnumFieldName];
}

function addIfPresent(
  target: TelemetryResourceCorrelationContext,
  field: keyof TelemetryResourceCorrelationContext,
  value: unknown,
) {
  if (value === undefined) {
    return;
  }
  if (field in enumFields) {
    const normalized = normalizeEnum(field as EnumFieldName, value);
    if (normalized !== null) {
      target[field] = normalized as never;
    }
    return;
  }
  if (field === "manifest_branch_decision" || field === "manifest_start_claim") {
    if (value !== null) {
      target[field] = value as never;
    }
    return;
  }
  const normalized = normalizeNullableString(value);
  if (normalized !== null) {
    target[field] = normalized as never;
  }
}

export function deriveTraceId(seed: string) {
  return deriveHexId(seed, 32);
}

export function deriveSpanId(seed: string) {
  return deriveHexId(seed, 16);
}

export function createCorrelationContext(
  input: CorrelationContextInput,
): TelemetryResourceCorrelationContext {
  const context: TelemetryResourceCorrelationContext = {};
  const withResourceDefaults: CorrelationContextInput = {
    ...input,
    codeBuildIdOrNull: input.codeBuildIdOrNull ?? input.resource?.build_ref ?? null,
    environment_ref: input.environment_ref ?? input.resource?.environment_ref ?? null,
    serviceNameOrNull: input.serviceNameOrNull ?? input.resource?.service_name ?? null,
  };

  const serviceName = normalizeNullableString(withResourceDefaults.serviceNameOrNull);
  if (serviceName !== null) {
    context.service_name = serviceName;
  }

  addIfPresent(context, "environment_ref", withResourceDefaults.environment_ref);
  addIfPresent(context, "code_build_id", withResourceDefaults.codeBuildIdOrNull);
  addIfPresent(context, "tenant_id", withResourceDefaults.tenant_id);
  addIfPresent(context, "client_id", withResourceDefaults.client_id);
  addIfPresent(context, "manifest_id", withResourceDefaults.manifest_id);
  addIfPresent(context, "root_manifest_id", withResourceDefaults.root_manifest_id);
  addIfPresent(context, "parent_manifest_id", withResourceDefaults.parent_manifest_id);
  addIfPresent(
    context,
    "continuation_of_manifest_id",
    withResourceDefaults.continuation_of_manifest_id,
  );
  addIfPresent(context, "replay_of_manifest_id", withResourceDefaults.replay_of_manifest_id);
  addIfPresent(context, "nightly_batch_run_ref", withResourceDefaults.nightly_batch_run_ref);
  addIfPresent(context, "nightly_window_key", withResourceDefaults.nightly_window_key);
  addIfPresent(
    context,
    "selection_disposition",
    withResourceDefaults.selection_disposition,
  );
  addIfPresent(context, "trace_id", withResourceDefaults.trace_id);
  addIfPresent(context, "span_id", withResourceDefaults.span_id);
  addIfPresent(context, "run_kind", withResourceDefaults.run_kind);
  addIfPresent(context, "mode", withResourceDefaults.mode);
  addIfPresent(context, "replay_class", withResourceDefaults.replay_class);
  addIfPresent(context, "comparison_mode", withResourceDefaults.comparison_mode);
  addIfPresent(
    context,
    "basis_validation_state",
    withResourceDefaults.basis_validation_state,
  );
  addIfPresent(context, "idempotency_key", withResourceDefaults.idempotency_key);
  addIfPresent(context, "access_binding_hash", withResourceDefaults.access_binding_hash);
  addIfPresent(context, "continuation_basis", withResourceDefaults.continuation_basis);
  addIfPresent(
    context,
    "input_inheritance_mode",
    withResourceDefaults.input_inheritance_mode,
  );
  addIfPresent(
    context,
    "config_inheritance_mode",
    withResourceDefaults.config_inheritance_mode,
  );
  addIfPresent(context, "gate_code", withResourceDefaults.gate_code);
  addIfPresent(context, "workflow_item_id", withResourceDefaults.workflow_item_id);
  addIfPresent(context, "task_id", withResourceDefaults.task_id);
  addIfPresent(context, "investigation_id", withResourceDefaults.investigation_id);
  addIfPresent(context, "compensation_id", withResourceDefaults.compensation_id);
  addIfPresent(
    context,
    "accepted_risk_approval_id",
    withResourceDefaults.accepted_risk_approval_id,
  );
  addIfPresent(context, "submission_record_id", withResourceDefaults.submission_record_id);
  addIfPresent(context, "authority_operation_id", withResourceDefaults.authority_operation_id);
  addIfPresent(context, "error_id", withResourceDefaults.error_id);
  addIfPresent(context, "retention_class", withResourceDefaults.retention_class);
  addIfPresent(
    context,
    "expected_execution_basis_hash",
    withResourceDefaults.expected_execution_basis_hash,
  );
  addIfPresent(
    context,
    "actual_execution_basis_hash",
    withResourceDefaults.actual_execution_basis_hash,
  );
  addIfPresent(
    context,
    "expected_deterministic_outcome_hash",
    withResourceDefaults.expected_deterministic_outcome_hash,
  );
  addIfPresent(
    context,
    "actual_deterministic_outcome_hash",
    withResourceDefaults.actual_deterministic_outcome_hash,
  );
  addIfPresent(
    context,
    "manifest_lineage_trace_ref",
    withResourceDefaults.manifest_lineage_trace_ref,
  );

  return context;
}

export function createRootCorrelationContext(
  input: Omit<CorrelationContextInput, "trace_id" | "span_id"> & {
    spanSeed: string;
    traceSeed: string;
  },
) {
  return createCorrelationContext({
    ...input,
    trace_id: deriveTraceId(input.traceSeed),
    span_id: deriveSpanId(input.spanSeed),
  });
}

export function createChildCorrelationContext(input: {
  overrides?: CorrelationContextInput;
  parent: TelemetryResourceCorrelationContext;
  resource?: TelemetryResource;
  spanSeed: string;
}) {
  return createCorrelationContext({
    ...input.parent,
    ...(input.overrides ?? {}),
    resource: input.resource,
    trace_id: normalizeNullableString(input.parent.trace_id) ?? deriveTraceId(input.spanSeed),
    span_id: deriveSpanId(
      `${input.parent.trace_id ?? "root"}:${input.parent.span_id ?? "parent"}:${input.spanSeed}`,
    ),
  });
}

export function pickCorrelationKeys(
  context: TelemetryResourceCorrelationContext,
  keys: readonly string[],
) {
  const picked: Partial<TelemetryResourceCorrelationContext> = {};
  for (const key of keys) {
    const value = context[key as keyof TelemetryResourceCorrelationContext];
    if (value !== undefined && value !== null) {
      picked[key as keyof TelemetryResourceCorrelationContext] = value as never;
    }
  }
  return picked;
}

export function summarizeCorrelationContext(context: TelemetryResourceCorrelationContext) {
  return [
    context.tenant_id ? `tenant=${context.tenant_id}` : null,
    context.manifest_id ? `manifest=${context.manifest_id}` : null,
    context.workflow_item_id ? `workflow=${context.workflow_item_id}` : null,
    context.submission_record_id ? `submission=${context.submission_record_id}` : null,
    context.authority_operation_id ? `authority=${context.authority_operation_id}` : null,
    context.trace_id ? `trace=${context.trace_id}` : null,
    context.span_id ? `span=${context.span_id}` : null,
  ].filter((entry): entry is string => entry !== null);
}
