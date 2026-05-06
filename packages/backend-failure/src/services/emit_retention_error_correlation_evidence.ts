import type { TelemetryResource } from "../../../generated-models/src/generated/typescript/retention-failure-and-observability.ts";
import {
  BackendObservabilityAuditEventStore,
  emitAuditEvent,
  recordLogRecord,
  recordTraceSpan,
  type LogRecord,
  type LogRecordSink,
  type StoredBackendAuditEvent,
  type TraceSpan,
  type TraceSpanSink,
} from "../../../backend-observability/src/index.ts";
import type {
  ArtifactRetentionRecord,
  RetentionTagRecord,
} from "../../../backend-retention/src/index.ts";
import {
  assertRetentionAnchorLinkage,
  RetentionFailureBindingError,
} from "./assert_retention_anchor_linkage.ts";
import {
  RETENTION_PRIVACY_ERROR_CONDITION_MAP,
  retentionErrorAuditPublicationRef,
  type OpenRetentionOrPrivacyErrorResult,
  type RetentionPrivacyErrorRecord,
} from "./open_retention_or_privacy_error.ts";

export type RetentionErrorEvidenceSink = LogRecordSink & TraceSpanSink;

export type EmitRetentionErrorCorrelationEvidenceInput = {
  artifact_retention: ArtifactRetentionRecord;
  client_id?: string | null;
  event_time: string;
  gate_code?: string | null;
  opened_error: OpenRetentionOrPrivacyErrorResult;
  resource: TelemetryResource;
  retention_tag: RetentionTagRecord;
  sink?: RetentionErrorEvidenceSink;
  store?: BackendObservabilityAuditEventStore;
  tenant_id: string;
};

export type RetentionErrorCorrelationEvidence = {
  audit_events: {
    error_recorded: StoredBackendAuditEvent;
    gate_evaluated: StoredBackendAuditEvent;
    retention_event: StoredBackendAuditEvent;
  };
  log_record: LogRecord;
  trace_spans: TraceSpan[];
};

function bindingError(detail: string): never {
  throw new RetentionFailureBindingError("RETENTION_FAILURE_BINDING_INVALID", detail);
}

function objectRefs(input: {
  artifact_retention: ArtifactRetentionRecord;
  error_record: RetentionPrivacyErrorRecord;
  retained_basis_ref: string;
  retention_tag: RetentionTagRecord;
}) {
  return [
    input.error_record.error_id,
    input.artifact_retention.retention_id,
    input.artifact_retention.artifact_ref,
    input.retention_tag.retention_tag_id,
    input.retained_basis_ref,
    ...input.error_record.affected_object_refs,
  ].filter((value, index, values) => values.indexOf(value) === index);
}

function correlationContext(input: EmitRetentionErrorCorrelationEvidenceInput) {
  const errorRecord = input.opened_error.error_record;
  return {
    authority_operation_id: errorRecord.authority_operation_ref,
    client_id: input.client_id ?? null,
    compensation_id: errorRecord.compensation_record_ref,
    error_id: errorRecord.error_id,
    gate_code: input.gate_code ?? "RETENTION_EVIDENCE_GATE",
    investigation_id: errorRecord.failure_investigation_ref,
    manifest_id: errorRecord.manifest_id,
    mode: "COMPLIANCE" as const,
    retention_class: errorRecord.retention_class,
    root_manifest_id: errorRecord.root_manifest_id,
    run_kind: "REMEDIATION" as const,
    task_id: errorRecord.remediation_task_ref,
    tenant_id: input.tenant_id,
    workflow_item_id: errorRecord.workflow_item_id,
  };
}

async function appendAuditEvent(input: {
  event_type: string;
  event_time: string;
  object_refs: string[];
  opened_error: OpenRetentionOrPrivacyErrorResult;
  publication_ref: string;
  reason_codes: string[];
  resource: TelemetryResource;
  store: BackendObservabilityAuditEventStore;
  tenant_id: string;
  context: ReturnType<typeof correlationContext>;
}) {
  const appended = await emitAuditEvent({
    clientIdOrNull: input.context.client_id,
    correlationContext: input.context,
    eventTime: input.event_time,
    eventType: input.event_type,
    lineageRefs: input.opened_error.error_record.provenance_refs,
    manifestIdOrNull: input.opened_error.error_record.manifest_id,
    objectRefs: input.object_refs,
    publicationRef: input.publication_ref,
    reasonCodes: input.reason_codes,
    resource: input.resource,
    store: input.store,
    tenantId: input.tenant_id,
    visibilityClassOrNull: "INTERNAL_ONLY",
  });
  const appendStatus = String(appended.status);
  if (appendStatus !== "APPENDED" && appendStatus !== "DUPLICATE_IGNORED") {
    bindingError(`unexpected audit append status ${appendStatus}`);
  }
  return appended.storedEvent;
}

export async function emitRetentionErrorCorrelationEvidence(
  input: EmitRetentionErrorCorrelationEvidenceInput,
): Promise<RetentionErrorCorrelationEvidence> {
  const anchor = assertRetentionAnchorLinkage({
    artifact_retention: input.artifact_retention,
    companions: [
      {
        artifact_retention_ref: input.opened_error.error_record.artifact_retention_ref,
        label: "ErrorRecord",
        retention_class: input.opened_error.error_record.retention_class,
      },
    ],
    retained_basis_ref: input.opened_error.retained_basis_ref,
    retention_tag: input.retention_tag,
  });
  const errorRecord = input.opened_error.error_record;
  const mapping = RETENTION_PRIVACY_ERROR_CONDITION_MAP[input.opened_error.condition];
  const store = input.store ?? (await BackendObservabilityAuditEventStore.create());
  const refs = objectRefs({
    artifact_retention: anchor.artifact_retention,
    error_record: errorRecord,
    retained_basis_ref: anchor.retained_basis_ref,
    retention_tag: anchor.retention_tag,
  });
  const context = correlationContext(input);

  const gateEvaluated = await appendAuditEvent({
    context,
    event_time: input.event_time,
    event_type: "GateEvaluated",
    object_refs: refs,
    opened_error: input.opened_error,
    publication_ref: retentionErrorAuditPublicationRef({
      error_id: errorRecord.error_id,
      event_type: "GateEvaluated",
    }),
    reason_codes: errorRecord.reason_codes,
    resource: input.resource,
    store,
    tenant_id: input.tenant_id,
  });
  const errorRecorded = await appendAuditEvent({
    context,
    event_time: input.event_time,
    event_type: "ErrorRecorded",
    object_refs: refs,
    opened_error: input.opened_error,
    publication_ref: retentionErrorAuditPublicationRef({
      error_id: errorRecord.error_id,
      event_type: "ErrorRecorded",
    }),
    reason_codes: errorRecord.reason_codes,
    resource: input.resource,
    store,
    tenant_id: input.tenant_id,
  });
  const retentionEvent = await appendAuditEvent({
    context,
    event_time: input.event_time,
    event_type: mapping.audit_event_type,
    object_refs: refs,
    opened_error: input.opened_error,
    publication_ref: retentionErrorAuditPublicationRef({
      error_id: errorRecord.error_id,
      event_type: mapping.audit_event_type,
    }),
    reason_codes: errorRecord.reason_codes,
    resource: input.resource,
    store,
    tenant_id: input.tenant_id,
  });

  const traceSpans = input.sink?.traceSpans ?? [];
  const rootSpan = recordTraceSpan({
    correlationContext: context,
    endedAtOrNull: input.event_time,
    manifestId: errorRecord.manifest_id,
    resource: input.resource,
    sink: { traceSpans },
    spanCode: "RUN_ROOT",
    spanSeed: `${errorRecord.error_id}:root`,
    startedAt: errorRecord.opened_at,
    statusCode: "OK",
    traceSeed: errorRecord.error_id,
  });
  recordTraceSpan({
    correlationContext: {
      ...context,
      span_id: rootSpan.span_id,
      trace_id: rootSpan.trace_id,
    },
    endedAtOrNull: input.event_time,
    manifestId: errorRecord.manifest_id,
    parentSpanIdOrNull: rootSpan.span_id,
    resource: input.resource,
    sink: { traceSpans },
    spanAttributes: {
      artifact_retention_ref: anchor.artifact_retention.retention_id,
      failure_class: "RETENTION_PRIVACY",
      failure_phase: "RETENTION_ERROR_BINDING",
      reason_code: errorRecord.reason_codes[0] ?? mapping.default_reason_code,
    },
    spanCode:
      input.opened_error.condition === "ERASURE_PENDING_CHECKPOINT"
        ? "ERASURE_EXECUTE"
        : "RETENTION_APPLY",
    spanSeed: `${errorRecord.error_id}:retention-error`,
    startedAt: errorRecord.opened_at,
    statusCode: "ERROR",
  });
  if (input.sink && input.sink.traceSpans !== traceSpans) {
    input.sink.traceSpans = traceSpans;
  }

  const logRecords = input.sink?.logRecords ?? [];
  const logRecord = recordLogRecord({
    correlationContext: context,
    eventCode: "RETENTION_PRIVACY_ERROR_BOUND",
    logFamily: "PRIVACY_RETENTION",
    messageTemplate: "Retention/privacy failure bound to typed follow-up objects",
    resource: input.resource,
    severity: errorRecord.severity === "WARNING" ? "WARN" : "ERROR",
    sink: { logRecords },
    structuredFields: {
      artifact_retention_ref: anchor.artifact_retention.retention_id,
      limitation_reason_code:
        anchor.artifact_retention.limitation_reason_codes[0] ??
        anchor.retention_tag.limitation_reason_codes[0] ??
        null,
      opaque_object_ref: anchor.artifact_retention.artifact_ref,
      reason_code: errorRecord.reason_codes[0] ?? mapping.default_reason_code,
      retention_class: errorRecord.retention_class,
    },
    timestamp: input.event_time,
  });
  if (input.sink && input.sink.logRecords !== logRecords) {
    input.sink.logRecords = logRecords;
  }

  return {
    audit_events: {
      error_recorded: errorRecorded,
      gate_evaluated: gateEvaluated,
      retention_event: retentionEvent,
    },
    log_record: logRecord,
    trace_spans: traceSpans,
  };
}
