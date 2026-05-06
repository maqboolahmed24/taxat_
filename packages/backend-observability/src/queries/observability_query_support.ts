import type {
  AuditInvestigationFrame,
  AuditInvestigationFrameActiveFilters,
  AuditInvestigationFrameExportPosture,
} from "../../../generated-models/src/generated/typescript/governance-and-policy.ts";
import {
  auditSliceEventFromStoredBackendAuditEvent,
  buildAuditInvestigationFrame,
  DEFAULT_FULL_EXPORT_POSTURE,
  type AuditInvestigationQueryContractCode,
} from "../projectors/build_audit_investigation_frame.ts";
import type { StoredBackendAuditEvent } from "../services/emit_audit_event.ts";

export type ObservabilityAuditEventSource = {
  listMergedView: () => readonly StoredBackendAuditEvent[];
};

export type ObservabilityQueryBaseInput = {
  activeFilters?: Partial<AuditInvestigationFrameActiveFilters> | undefined;
  auditEventSource: ObservabilityAuditEventSource;
  cursorOffset?: number | undefined;
  exportPosture?: AuditInvestigationFrameExportPosture | undefined;
  focusEventRef?: string | null | undefined;
  includeStaffOnlySupportingRefs?: boolean | undefined;
  limit?: number | undefined;
  selectedObjectRef?: string | null | undefined;
  tenantId?: string | undefined;
  updatedAt?: string | undefined;
};

type MaterializeObservabilityFrameInput = ObservabilityQueryBaseInput & {
  eventPredicate: (entry: StoredBackendAuditEvent) => boolean;
  queryAnchorRef: string;
  queryContractCode: AuditInvestigationQueryContractCode;
};

export class ObservabilityQueryError extends Error {
  readonly code:
    | "OBSERVABILITY_QUERY_ANCHOR_EMPTY"
    | "OBSERVABILITY_QUERY_EMPTY";

  constructor(code: ObservabilityQueryError["code"], detail: string) {
    super(`${code}: ${detail}`);
    this.name = "ObservabilityQueryError";
    this.code = code;
  }
}

export function normalizeQueryAnchor(fieldName: string, value: string) {
  const normalized = value.trim();
  if (normalized.length === 0) {
    throw new ObservabilityQueryError(
      "OBSERVABILITY_QUERY_ANCHOR_EMPTY",
      `${fieldName} must be a non-empty query anchor`,
    );
  }
  return normalized;
}

function defaultExportPosture(
  queryContractCode: AuditInvestigationQueryContractCode,
): AuditInvestigationFrameExportPosture {
  if (queryContractCode === "PRIVACY_ACTION_LEDGER") {
    return {
      reason_codes: ["PRIVACY_LEDGER_MASKED_PREVIEW_REQUIRED"],
      state: "MASKED_ONLY",
    };
  }
  return DEFAULT_FULL_EXPORT_POSTURE;
}

export async function materializeObservabilityFrame(
  input: MaterializeObservabilityFrameInput,
): Promise<AuditInvestigationFrame> {
  const queryAnchorRef = normalizeQueryAnchor("queryAnchorRef", input.queryAnchorRef);
  const events = input.auditEventSource
    .listMergedView()
    .filter(input.eventPredicate)
    .filter((entry) => input.tenantId === undefined || entry.event.tenant_id === input.tenantId)
    .map(auditSliceEventFromStoredBackendAuditEvent);
  if (events.length === 0) {
    throw new ObservabilityQueryError(
      "OBSERVABILITY_QUERY_EMPTY",
      `${input.queryContractCode} produced no durable audit evidence for ${queryAnchorRef}`,
    );
  }
  return buildAuditInvestigationFrame({
    activeFilters: input.activeFilters,
    cursorOffset: input.cursorOffset,
    events,
    exportPosture: input.exportPosture ?? defaultExportPosture(input.queryContractCode),
    focusEventRef: input.focusEventRef,
    includeStaffOnlySupportingRefs: input.includeStaffOnlySupportingRefs ?? false,
    limit: input.limit,
    queryAnchorRef,
    queryContractCode: input.queryContractCode,
    selectedObjectRef: input.selectedObjectRef,
    tenantId: input.tenantId,
    updatedAt: input.updatedAt,
  });
}

export function eventManifestRefs(entry: StoredBackendAuditEvent) {
  const context = entry.event.correlation_context;
  return [
    entry.event.manifest_id,
    context.manifest_id,
    context.root_manifest_id,
    context.parent_manifest_id,
    context.continuation_of_manifest_id,
    context.replay_of_manifest_id,
  ].filter((value): value is string => typeof value === "string" && value.length > 0);
}

export function eventClientRefs(entry: StoredBackendAuditEvent) {
  const context = entry.event.correlation_context;
  return [entry.event.client_id, context.client_id].filter(
    (value): value is string => typeof value === "string" && value.length > 0,
  );
}

export function objectOrContextRefs(entry: StoredBackendAuditEvent) {
  const context = entry.event.correlation_context;
  return [
    ...entry.event.object_refs,
    entry.event.audit_stream_ref,
    entry.event.manifest_id,
    context.manifest_id,
    context.root_manifest_id,
    context.nightly_batch_run_ref,
    context.submission_record_id,
    context.client_id,
  ].filter((value): value is string => typeof value === "string" && value.length > 0);
}
