import type { StoredAuditEvent } from "../../../audit/src/index.ts";
import type {
  AuditInvestigationFrame,
  AuditInvestigationFrameExportPosture,
} from "../../../../packages/generated-models/src/generated/typescript/governance-and-policy.ts";
import { buildAuditInvestigationFrame } from "../services/build_audit_query_contract.ts";
import {
  AuditQueryMappingError,
  mapAuditQueryFiltersAndCursor,
  type MappedAuditQuery,
} from "../services/map_audit_query_filters_and_cursor.ts";
import type { AuditEventSource } from "./load_manifest_audit_investigation_frame.ts";

export type LoadGovernanceAuditInvestigationFrameInput = {
  auditEventSource: AuditEventSource;
  exportPosture: AuditInvestigationFrameExportPosture;
  includeStaffOnlySupportingRefs: boolean;
  path?: string;
  tenantId: string;
};

export type LoadedGovernanceAuditInvestigationFrame = {
  frame: AuditInvestigationFrame;
  mappedQuery: MappedAuditQuery;
};

function includesAny(values: readonly string[], filters: readonly string[]) {
  return filters.length === 0 || filters.some((filter) => values.includes(filter));
}

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

function queryAnchorRefForGovernance(input: { path?: string; tenantId: string }) {
  const url = new URL(input.path ?? "/", "http://taxat.local");
  const queryContract = (
    url.searchParams.get("query_contract") ??
    url.searchParams.get("query_contract_code") ??
    "AUDIT_TRAIL"
  )
    .trim()
    .toUpperCase()
    .replaceAll("-", "_");
  if (["RUN", "RUN_TIMELINE", "TIMELINE"].includes(queryContract)) {
    const manifestRef =
      url.searchParams.get("manifest") ??
      url.searchParams.get("manifest_ref") ??
      url.searchParams.get("manifest_refs");
    const firstManifestRef = manifestRef?.split(",")[0]?.trim();
    if (!firstManifestRef) {
      throw new AuditQueryMappingError(
        "AUDIT_ROUTE_FILTER_CONFLICT",
        "RUN_TIMELINE audit investigations require a manifest filter as query anchor",
      );
    }
    return firstManifestRef;
  }
  return input.tenantId;
}

export async function loadGovernanceAuditInvestigationFrame(
  input: LoadGovernanceAuditInvestigationFrameInput,
): Promise<LoadedGovernanceAuditInvestigationFrame | null> {
  const mappedQuery = mapAuditQueryFiltersAndCursor({
    path: input.path,
    queryAnchorRef: queryAnchorRefForGovernance({
      path: input.path,
      tenantId: input.tenantId,
    }),
    routeFamily: "GOVERNANCE_AUDIT_INVESTIGATIONS",
  });
  const filtered = input.auditEventSource
    .listMergedView()
    .filter((entry) => entry.event.tenant_id === input.tenantId)
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
      objectAnchorRef: `tenant://${input.tenantId}/governance/audit-investigations`,
      tenantId: input.tenantId,
    }),
    mappedQuery,
  };
}
