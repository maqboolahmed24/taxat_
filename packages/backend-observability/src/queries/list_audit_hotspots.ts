import {
  buildAuditHotspotAnalytics,
  type AuditHotspotAnalytics,
  type AuditHotspotAnalyticsRow,
  type AuditHotspotAnalyticsSource,
  type AuditHotspotSourceArtifactType,
} from "../services/build_audit_hotspot_analytics.ts";

export type ListAuditHotspotsInput = {
  affected_object_ref?: string | undefined;
  cursor_offset?: number | undefined;
  generated_at: string;
  limit?: number | undefined;
  source_artifact_type?: AuditHotspotSourceArtifactType | undefined;
  sources: readonly AuditHotspotAnalyticsSource[];
  tenant_id: string;
  worklist_ref: string;
};

export type ListAuditHotspotsResult = {
  analytics: AuditHotspotAnalytics;
  cache_key: string;
  filters: {
    affected_object_ref: string | null;
    source_artifact_type: AuditHotspotSourceArtifactType | null;
    tenant_id: string;
    worklist_ref: string;
  };
  hotspots: AuditHotspotAnalyticsRow[];
  page: {
    cursor_offset: number;
    limit: number;
    next_cursor_offset_or_null: number | null;
    total_count: number;
  };
};

function normalizeNonNegativeInteger(label: string, value: number | undefined, fallback: number) {
  if (value === undefined) {
    return fallback;
  }
  if (!Number.isInteger(value) || value < 0) {
    throw new Error(`${label} must be a non-negative integer`);
  }
  return value;
}

function normalizeLimit(value: number | undefined) {
  const limit = normalizeNonNegativeInteger("limit", value, 50);
  if (limit < 1 || limit > 250) {
    throw new Error("limit must be in [1, 250]");
  }
  return limit;
}

export function listAuditHotspots(input: ListAuditHotspotsInput): ListAuditHotspotsResult {
  const analytics = buildAuditHotspotAnalytics({
    generated_at: input.generated_at,
    sources: input.sources,
    tenant_id: input.tenant_id,
    worklist_ref: input.worklist_ref,
  });
  const filtered = analytics.hotspots
    .filter(
      (row) =>
        input.source_artifact_type === undefined ||
        row.source_artifact_type === input.source_artifact_type,
    )
    .filter(
      (row) =>
        input.affected_object_ref === undefined ||
        row.affected_object_refs.includes(input.affected_object_ref),
    );
  const cursorOffset = normalizeNonNegativeInteger("cursor_offset", input.cursor_offset, 0);
  const limit = normalizeLimit(input.limit);
  const hotspots = filtered.slice(cursorOffset, cursorOffset + limit);
  return {
    analytics,
    cache_key: [
      "audit_hotspots",
      input.tenant_id,
      input.worklist_ref,
      input.source_artifact_type ?? "*",
      input.affected_object_ref ?? "*",
      cursorOffset,
      limit,
    ].join(":"),
    filters: {
      affected_object_ref: input.affected_object_ref ?? null,
      source_artifact_type: input.source_artifact_type ?? null,
      tenant_id: input.tenant_id,
      worklist_ref: input.worklist_ref,
    },
    hotspots,
    page: {
      cursor_offset: cursorOffset,
      limit,
      next_cursor_offset_or_null:
        cursorOffset + limit < filtered.length ? cursorOffset + limit : null,
      total_count: filtered.length,
    },
  };
}
