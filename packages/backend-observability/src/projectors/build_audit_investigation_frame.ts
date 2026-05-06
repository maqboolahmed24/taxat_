import type {
  AuditInvestigationFrame,
  AuditInvestigationFrameExportPosture,
} from "../../../generated-models/src/generated/typescript/governance-and-policy.ts";
import {
  buildAuditInvestigationFrame as buildGovernanceAuditInvestigationFrame,
  type BuildAuditInvestigationFrameInput as BuildGovernanceAuditInvestigationFrameInput,
} from "../../../backend-governance/src/projectors/build_audit_investigation_frame.ts";
import {
  queryAuditSlice,
  type AuditInvestigationOrderingBasis,
  type AuditInvestigationQueryContractCode,
  type AuditSliceEventInput,
  type QueryAuditSliceInput,
} from "../../../backend-governance/src/queries/query_audit_slice.ts";
import type { StoredBackendAuditEvent } from "../services/emit_audit_event.ts";

export {
  queryAuditSlice,
  type AuditInvestigationOrderingBasis,
  type AuditInvestigationQueryContractCode,
  type AuditSliceEventInput,
  type QueryAuditSliceInput,
};

export type BuildAuditInvestigationFrameInput =
  BuildGovernanceAuditInvestigationFrameInput;

export const OBSERVABILITY_QUERY_CONTRACT_CODES = [
  "AUDIT_TRAIL",
  "RUN_TIMELINE",
  "NIGHTLY_BATCH_TIMELINE",
  "FILING_EVIDENCE_LEDGER",
  "PRIVACY_ACTION_LEDGER",
] as const satisfies readonly AuditInvestigationQueryContractCode[];

export const DEFAULT_FULL_EXPORT_POSTURE = {
  reason_codes: [],
  state: "FULL_ALLOWED",
} as const satisfies AuditInvestigationFrameExportPosture;

const QUERY_ORDERING_BASIS = {
  AUDIT_TRAIL: "AUDIT_STREAM_SEQUENCE",
  FILING_EVIDENCE_LEDGER: "RECORDED_AT_THEN_STREAM_SEQUENCE",
  NIGHTLY_BATCH_TIMELINE: "RECORDED_AT_THEN_STREAM_SEQUENCE",
  PRIVACY_ACTION_LEDGER: "RECORDED_AT_THEN_STREAM_SEQUENCE",
  RUN_TIMELINE: "RECORDED_AT_THEN_STREAM_SEQUENCE",
} as const satisfies Record<
  AuditInvestigationQueryContractCode,
  AuditInvestigationOrderingBasis
>;

function uniqueSorted(values: readonly (string | null | undefined)[]) {
  return [
    ...new Set(
      values
        .filter((value): value is string => typeof value === "string")
        .map((value) => value.trim())
        .filter((value) => value.length > 0),
    ),
  ].sort((left, right) => left.localeCompare(right));
}

function contextCorrelationKeys(
  context: StoredBackendAuditEvent["event"]["correlation_context"],
) {
  return uniqueSorted(
    Object.entries(context)
      .filter(([, value]) => {
        if (Array.isArray(value)) {
          return value.length > 0;
        }
        return value !== null && value !== undefined;
      })
      .map(([key]) => key),
  );
}

function manifestRefsForEvent(entry: StoredBackendAuditEvent) {
  const context = entry.event.correlation_context;
  return uniqueSorted([
    entry.event.manifest_id,
    context.manifest_id,
    context.root_manifest_id,
    context.parent_manifest_id,
    context.continuation_of_manifest_id,
    context.replay_of_manifest_id,
  ]);
}

function supportTraceRefsForEvent(entry: StoredBackendAuditEvent) {
  const context = entry.event.correlation_context;
  return uniqueSorted([
    ...entry.event.object_refs.filter((objectRef) => objectRef.startsWith("trace://")),
    context.trace_id && context.span_id
      ? `trace://${context.trace_id}/spans/${context.span_id}`
      : null,
  ]);
}

function supportLogRefsForEvent(entry: StoredBackendAuditEvent) {
  return uniqueSorted(
    entry.event.object_refs.filter((objectRef) => objectRef.startsWith("log://")),
  );
}

function objectRefsForEvent(entry: StoredBackendAuditEvent) {
  const context = entry.event.correlation_context;
  return uniqueSorted([
    ...entry.event.object_refs,
    context.nightly_batch_run_ref,
    context.submission_record_id,
  ]);
}

export function auditSliceEventFromStoredBackendAuditEvent(
  entry: StoredBackendAuditEvent,
): AuditSliceEventInput {
  const context = entry.event.correlation_context;
  const objectRefs = objectRefsForEvent(entry);
  return {
    actorOrServiceRefOrNull: entry.event.actor_ref ?? entry.event.service_ref,
    auditStreamRef: entry.event.audit_stream_ref,
    authorityOperationRefOrNull: context.authority_operation_id ?? null,
    changedFieldRefs: uniqueSorted(entry.event.reason_codes.map((code) => `reason:${code}`)),
    clientRefOrNull: entry.event.client_id ?? context.client_id ?? null,
    correlationKeys: contextCorrelationKeys(context),
    diffAvailable:
      entry.event.object_refs.length > 0 || entry.event.reason_codes.length > 0,
    eventRef: entry.event.audit_event_id,
    eventTime: entry.event.event_time,
    familyRef: entry.event_family_ref || entry.event.event_type,
    logRecordRefs: supportLogRefsForEvent(entry),
    manifestRefOrNull: entry.event.manifest_id ?? context.manifest_id ?? null,
    manifestRefs: manifestRefsForEvent(entry),
    objectRefs,
    primaryObjectRefOrNull:
      objectRefs[0] ?? entry.event.manifest_id ?? entry.event.audit_stream_ref,
    recordedAt: entry.event.recorded_at,
    streamSequence: entry.event.stream_sequence,
    summaryRefOrNull: `audit-summary://${entry.event.audit_event_id}`,
    tenantId: entry.event.tenant_id,
    traceSpanRefs: supportTraceRefsForEvent(entry),
  };
}

export class ObservabilityAuditInvestigationFrameError extends Error {
  readonly code:
    | "OBSERVABILITY_QUERY_ANCHOR_INVALID"
    | "OBSERVABILITY_QUERY_CONTRACT_INVALID"
    | "OBSERVABILITY_QUERY_EVIDENCE_INVALID"
    | "OBSERVABILITY_QUERY_EXPORT_INVALID"
    | "OBSERVABILITY_QUERY_ORDERING_INVALID"
    | "OBSERVABILITY_QUERY_SELECTION_INVALID"
    | "OBSERVABILITY_QUERY_SUPPORTING_SIGNAL_INVALID";

  constructor(code: ObservabilityAuditInvestigationFrameError["code"], detail: string) {
    super(`${code}: ${detail}`);
    this.name = "ObservabilityAuditInvestigationFrameError";
    this.code = code;
  }
}

function assertNonEmptyList(field: string, values: readonly string[]) {
  if (values.some((value) => value.trim().length === 0)) {
    throw new ObservabilityAuditInvestigationFrameError(
      "OBSERVABILITY_QUERY_EVIDENCE_INVALID",
      `${field} must not contain empty tokens`,
    );
  }
}

export function assertAuditInvestigationFrameContract(frame: AuditInvestigationFrame) {
  if (!OBSERVABILITY_QUERY_CONTRACT_CODES.includes(frame.query_contract_code)) {
    throw new ObservabilityAuditInvestigationFrameError(
      "OBSERVABILITY_QUERY_CONTRACT_INVALID",
      "query_contract_code is outside the observability query vocabulary",
    );
  }
  if (frame.object_anchor_ref !== frame.query_anchor_ref) {
    throw new ObservabilityAuditInvestigationFrameError(
      "OBSERVABILITY_QUERY_ANCHOR_INVALID",
      "object_anchor_ref must mirror query_anchor_ref",
    );
  }
  const expectedOrderingBasis = QUERY_ORDERING_BASIS[frame.query_contract_code];
  if (frame.ordering_basis !== expectedOrderingBasis) {
    throw new ObservabilityAuditInvestigationFrameError(
      "OBSERVABILITY_QUERY_ORDERING_INVALID",
      `${frame.query_contract_code} requires ordering_basis=${expectedOrderingBasis}`,
    );
  }
  if (frame.ordered_event_refs.length === 0) {
    throw new ObservabilityAuditInvestigationFrameError(
      "OBSERVABILITY_QUERY_EVIDENCE_INVALID",
      "observability query frames require ordered audit evidence",
    );
  }
  assertNonEmptyList("ordered_event_refs", frame.ordered_event_refs);
  assertNonEmptyList("supporting_trace_span_refs", frame.supporting_trace_span_refs);
  assertNonEmptyList("supporting_log_record_refs", frame.supporting_log_record_refs);
  assertNonEmptyList("correlation_keys", frame.correlation_keys);
  const tapeRefs = frame.audit_tape.rows.map((row) => row.event_ref);
  if (JSON.stringify(tapeRefs) !== JSON.stringify(frame.ordered_event_refs)) {
    throw new ObservabilityAuditInvestigationFrameError(
      "OBSERVABILITY_QUERY_ORDERING_INVALID",
      "audit_tape.rows must preserve ordered_event_refs order",
    );
  }
  if (frame.focus_anchor_ref !== frame.audit_workspace.selected_event_ref) {
    throw new ObservabilityAuditInvestigationFrameError(
      "OBSERVABILITY_QUERY_SELECTION_INVALID",
      "focus_anchor_ref must mirror selected_event_ref",
    );
  }
  if (
    (frame.query_contract_code === "RUN_TIMELINE" ||
      frame.query_contract_code === "NIGHTLY_BATCH_TIMELINE") &&
    frame.supporting_trace_span_refs.length === 0
  ) {
    throw new ObservabilityAuditInvestigationFrameError(
      "OBSERVABILITY_QUERY_SUPPORTING_SIGNAL_INVALID",
      `${frame.query_contract_code} requires supporting trace span refs`,
    );
  }
  if (
    frame.query_contract_code === "NIGHTLY_BATCH_TIMELINE" &&
    !frame.correlation_keys.includes("nightly_batch_run_ref")
  ) {
    throw new ObservabilityAuditInvestigationFrameError(
      "OBSERVABILITY_QUERY_ANCHOR_INVALID",
      "nightly batch timelines must expose nightly_batch_run_ref",
    );
  }
  if (
    frame.query_contract_code === "FILING_EVIDENCE_LEDGER" &&
    !frame.correlation_keys.includes("submission_record_id")
  ) {
    throw new ObservabilityAuditInvestigationFrameError(
      "OBSERVABILITY_QUERY_ANCHOR_INVALID",
      "filing evidence ledgers must expose submission_record_id",
    );
  }
  if (
    frame.query_contract_code === "PRIVACY_ACTION_LEDGER" &&
    !frame.active_filters.client_refs.includes(frame.query_anchor_ref)
  ) {
    throw new ObservabilityAuditInvestigationFrameError(
      "OBSERVABILITY_QUERY_ANCHOR_INVALID",
      "privacy action ledgers must bind query_anchor_ref into client filters",
    );
  }
  if (
    frame.export_eligibility_panel.active_slice_scope_ref !== frame.query_anchor_ref ||
    frame.export_eligibility_panel.invocation_posture !== "ACTIVE_FILTERED_SLICE"
  ) {
    throw new ObservabilityAuditInvestigationFrameError(
      "OBSERVABILITY_QUERY_EXPORT_INVALID",
      "export posture must remain bound to the active filtered slice",
    );
  }
}

export async function buildAuditInvestigationFrame(
  input: BuildAuditInvestigationFrameInput,
): Promise<AuditInvestigationFrame> {
  const frame = await buildGovernanceAuditInvestigationFrame(input);
  assertAuditInvestigationFrameContract(frame);
  return frame;
}
