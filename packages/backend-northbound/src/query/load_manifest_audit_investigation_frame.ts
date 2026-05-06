import type { StoredAuditEvent } from "../../../audit/src/index.ts";
import type {
  AuditInvestigationFrame,
  AuditInvestigationFrameExportPosture,
} from "../../../../packages/generated-models/src/generated/typescript/governance-and-policy.ts";
import {
  buildAuditInvestigationFrame,
  type AuditInvestigationFrameValidationError,
} from "../services/build_audit_query_contract.ts";
import {
  mapAuditQueryFiltersAndCursor,
  type MappedAuditQuery,
} from "../services/map_audit_query_filters_and_cursor.ts";

export type AuditEventSource = {
  listMergedView: () => StoredAuditEvent[];
};

export type LoadManifestAuditInvestigationFrameInput = {
  auditEventSource: AuditEventSource;
  exportPosture: AuditInvestigationFrameExportPosture;
  includeStaffOnlySupportingRefs: boolean;
  manifestId: string;
  path?: string;
};

export type LoadedAuditInvestigationFrame = {
  frame: AuditInvestigationFrame;
  mappedQuery: MappedAuditQuery;
};

function eventManifestRefs(entry: StoredAuditEvent) {
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

function matchesManifest(entry: StoredAuditEvent, manifestId: string) {
  return (
    eventManifestRefs(entry).includes(manifestId) ||
    entry.event.object_refs.includes(manifestId) ||
    entry.event.object_refs.includes(`manifest://${manifestId}`)
  );
}

function includesAny(values: readonly string[], filters: readonly string[]) {
  return filters.length === 0 || filters.some((filter) => values.includes(filter));
}

function matchesFilters(entry: StoredAuditEvent, query: MappedAuditQuery) {
  const event = entry.event;
  const context = event.correlation_context;
  const filters = query.activeFilters;
  if (!includesAny([event.actor_ref, event.service_ref].filter(Boolean) as string[], filters.actor_refs)) {
    return false;
  }
  if (!includesAny([entry.event_family_ref, event.event_type], filters.event_families)) {
    return false;
  }
  if (!includesAny([event.client_id, context.client_id].filter(Boolean) as string[], filters.client_refs)) {
    return false;
  }
  if (!includesAny(eventManifestRefs(entry), filters.manifest_refs)) {
    return false;
  }
  if (
    !includesAny(
      [context.authority_operation_id].filter(Boolean) as string[],
      filters.authority_operation_refs,
    )
  ) {
    return false;
  }
  if (!includesAny(event.object_refs, filters.object_refs)) {
    return false;
  }
  if (filters.window_from !== null && event.recorded_at < filters.window_from) {
    return false;
  }
  if (filters.window_to !== null && event.recorded_at > filters.window_to) {
    return false;
  }
  return true;
}

function sortEvents(query: MappedAuditQuery) {
  return (left: StoredAuditEvent, right: StoredAuditEvent) => {
    if (query.orderingBasis === "AUDIT_STREAM_SEQUENCE") {
      return (
        left.event.audit_stream_ref.localeCompare(right.event.audit_stream_ref) ||
        left.event.stream_sequence - right.event.stream_sequence ||
        left.event.recorded_at.localeCompare(right.event.recorded_at) ||
        left.event.audit_event_id.localeCompare(right.event.audit_event_id)
      );
    }
    return (
      left.event.recorded_at.localeCompare(right.event.recorded_at) ||
      left.event.audit_stream_ref.localeCompare(right.event.audit_stream_ref) ||
      left.event.stream_sequence - right.event.stream_sequence ||
      left.event.audit_event_id.localeCompare(right.event.audit_event_id)
    );
  };
}

export async function loadManifestAuditInvestigationFrame(
  input: LoadManifestAuditInvestigationFrameInput,
): Promise<LoadedAuditInvestigationFrame | null> {
  const mappedQuery = mapAuditQueryFiltersAndCursor({
    forcedManifestRef: input.manifestId,
    path: input.path,
    queryAnchorRef: input.manifestId,
    routeFamily: "MANIFEST_AUDIT_TRAIL",
  });
  const filtered = input.auditEventSource
    .listMergedView()
    .filter((entry) => matchesManifest(entry, input.manifestId))
    .filter((entry) => matchesFilters(entry, mappedQuery))
    .sort(sortEvents(mappedQuery));
  if (filtered.length === 0) {
    return null;
  }
  const page = filtered.slice(
    mappedQuery.cursorOffset,
    mappedQuery.cursorOffset + mappedQuery.limit,
  );
  if (page.length === 0) {
    return null;
  }
  return {
    frame: buildAuditInvestigationFrame({
      events: page,
      exportPosture: input.exportPosture,
      includeStaffOnlySupportingRefs: input.includeStaffOnlySupportingRefs,
      mappedQuery: {
        ...mappedQuery,
        limit:
          filtered.length > mappedQuery.cursorOffset + mappedQuery.limit
            ? mappedQuery.limit
            : page.length + 1,
      },
      objectAnchorRef: `manifest://${input.manifestId}`,
      tenantId: page[0].event.tenant_id,
    }),
    mappedQuery,
  };
}

export function auditFrameErrorReasonCodes(error: unknown) {
  return (error as AuditInvestigationFrameValidationError | undefined)?.reasonCodes ?? [
    "AUDIT_FRAME_CONTRACT_INVALID",
  ];
}
