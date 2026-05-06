import type { AuditInvestigationFrame } from "../../../generated-models/src/generated/typescript/governance-and-policy.ts";
import type {
  GovernanceFamilyCode,
  GovernanceFamilyScoreSource,
} from "../../../backend-governance/src/index.ts";

export type AuditHotspotSourceArtifactType =
  | "AUDIT_INVESTIGATION_FRAME"
  | "FAILURE_LIFECYCLE_DASHBOARD"
  | "TENANT_GOVERNANCE_SNAPSHOT"
  | "AUTHORITY_RECONCILIATION_ANALYTICS_SNAPSHOT";

export type AuditHotspotAnalyticsSource = {
  affected_object_refs: readonly string[];
  audit_event_refs?: readonly string[] | undefined;
  critical_open_count?: number | undefined;
  first_observed_at: string;
  hotspot_ref: string;
  last_observed_at: string;
  non_material_churn_suppressed?: boolean | undefined;
  open_count: number;
  reason_codes: readonly string[];
  requires_operator_action?: boolean | undefined;
  source_artifact_type: AuditHotspotSourceArtifactType;
  source_ref: string;
  tenant_id: string;
  worklist_ref: string;
};

export type AuditHotspotAnalyticsRow = {
  affected_object_refs: string[];
  audit_event_refs: string[];
  critical_open_count: number;
  first_observed_at: string;
  hotspot_ref: string;
  last_observed_at: string;
  non_material_churn_suppressed: boolean;
  open_count: number;
  rank: number;
  rank_score: number;
  ranking_explanation: string;
  reason_codes: string[];
  requires_operator_action: boolean;
  source_artifact_type: AuditHotspotSourceArtifactType;
  source_ref: string;
  tenant_id: string;
  worklist_ref: string;
};

export type AuditHotspotAnalytics = {
  generated_at: string;
  governance_family_source: GovernanceFamilyScoreSource & {
    affectedScopeLabel: string | null;
    family: Extract<GovernanceFamilyCode, "AUDIT_HOTSPOT">;
    nextActionLabel: string | null;
    objectRefs: string[];
    worklistRef: string;
  };
  hotspot_refs_in_rank_order: string[];
  hotspots: AuditHotspotAnalyticsRow[];
  ranking_basis: "GOVERNANCE_AUDIT_HOTSPOT_SCORE_V1";
  tenant_id: string;
  worklist_ref: string;
};

export class AuditHotspotAnalyticsError extends Error {
  constructor(detail: string) {
    super(`AUDIT_HOTSPOT_ANALYTICS_INVALID: ${detail}`);
    this.name = "AuditHotspotAnalyticsError";
  }
}

function requireString(label: string, value: string | null | undefined) {
  const normalized = (value ?? "").trim();
  if (normalized.length === 0) {
    throw new AuditHotspotAnalyticsError(`${label} must be a non-empty string`);
  }
  return normalized;
}

function uniqueSorted(label: string, values: readonly string[]) {
  const normalized = values.map((value) => requireString(`${label}[]`, value));
  return [...new Set(normalized)].sort((left, right) => left.localeCompare(right));
}

function nonNegativeInteger(label: string, value: number) {
  if (!Number.isInteger(value) || value < 0) {
    throw new AuditHotspotAnalyticsError(`${label} must be a non-negative integer`);
  }
  return value;
}

function nonNegativeFinite(label: string, value: number) {
  if (!Number.isFinite(value) || value < 0) {
    throw new AuditHotspotAnalyticsError(`${label} must be a non-negative finite number`);
  }
  return value;
}

function hoursBetween(earlier: string, later: string) {
  const earlierMs = Date.parse(earlier);
  const laterMs = Date.parse(later);
  if (Number.isNaN(earlierMs) || Number.isNaN(laterMs) || laterMs < earlierMs) {
    throw new AuditHotspotAnalyticsError("hotspot timestamps must be parseable and monotonic");
  }
  return (laterMs - earlierMs) / 3_600_000;
}

function oldestAgeBucket(oldestOpenAgeHours: number) {
  return Math.min(Math.floor(nonNegativeFinite("oldestOpenAgeHours", oldestOpenAgeHours) / 8), 6);
}

function scoreFor(input: {
  critical_open_count: number;
  non_material_churn_suppressed: boolean;
  oldest_open_age_hours: number;
  open_count: number;
  requires_operator_action: boolean;
}) {
  return (
    300 +
    25 * input.critical_open_count +
    6 * Math.min(input.open_count, 9) +
    4 * oldestAgeBucket(input.oldest_open_age_hours) +
    (input.requires_operator_action ? 10 : 0) -
    (input.non_material_churn_suppressed ? 8 : 0)
  );
}

function rowFromSource(input: {
  generated_at: string;
  source: AuditHotspotAnalyticsSource;
}) {
  const source = input.source;
  const openCount = nonNegativeInteger("open_count", source.open_count);
  const criticalOpenCount = nonNegativeInteger(
    "critical_open_count",
    source.critical_open_count ?? 0,
  );
  if (criticalOpenCount > openCount) {
    throw new AuditHotspotAnalyticsError("critical_open_count must not exceed open_count");
  }
  const affectedObjectRefs = uniqueSorted("affected_object_refs", source.affected_object_refs);
  if (affectedObjectRefs.length === 0) {
    throw new AuditHotspotAnalyticsError(
      "audit hotspots must retain at least one affected object ref",
    );
  }
  const worklistRef = requireString("worklist_ref", source.worklist_ref);
  const oldestOpenAgeHours = hoursBetween(source.first_observed_at, input.generated_at);
  const requiresOperatorAction = source.requires_operator_action ?? openCount > 0;
  const nonMaterialChurnSuppressed = source.non_material_churn_suppressed ?? false;
  return {
    affected_object_refs: affectedObjectRefs,
    audit_event_refs: uniqueSorted("audit_event_refs", source.audit_event_refs ?? []),
    critical_open_count: criticalOpenCount,
    first_observed_at: requireString("first_observed_at", source.first_observed_at),
    hotspot_ref: requireString("hotspot_ref", source.hotspot_ref),
    last_observed_at: requireString("last_observed_at", source.last_observed_at),
    non_material_churn_suppressed: nonMaterialChurnSuppressed,
    open_count: openCount,
    rank: 0,
    rank_score: scoreFor({
      critical_open_count: criticalOpenCount,
      non_material_churn_suppressed: nonMaterialChurnSuppressed,
      oldest_open_age_hours: oldestOpenAgeHours,
      open_count: openCount,
      requires_operator_action: requiresOperatorAction,
    }),
    ranking_explanation:
      "GOVERNANCE_AUDIT_HOTSPOT_SCORE_V1 uses audit-hotspot family base, critical count, open count, age bucket, action requirement, and non-material churn suppression.",
    reason_codes: uniqueSorted("reason_codes", source.reason_codes),
    requires_operator_action: requiresOperatorAction,
    source_artifact_type: source.source_artifact_type,
    source_ref: requireString("source_ref", source.source_ref),
    tenant_id: requireString("tenant_id", source.tenant_id),
    worklist_ref: worklistRef,
  } satisfies AuditHotspotAnalyticsRow;
}

function sortRows(left: AuditHotspotAnalyticsRow, right: AuditHotspotAnalyticsRow) {
  return (
    right.rank_score - left.rank_score ||
    right.critical_open_count - left.critical_open_count ||
    right.open_count - left.open_count ||
    left.last_observed_at.localeCompare(right.last_observed_at) ||
    left.hotspot_ref.localeCompare(right.hotspot_ref)
  );
}

export function auditHotspotSourcesFromFrames(input: {
  frames: readonly AuditInvestigationFrame[];
  generated_at: string;
  tenant_id: string;
  worklist_ref: string;
}) {
  const generatedAtMs = Date.parse(input.generated_at);
  const frameTimeOrGeneratedAt = (value: string) =>
    !Number.isNaN(Date.parse(value)) && Date.parse(value) <= generatedAtMs
      ? value
      : input.generated_at;
  return input.frames.map((frame) => ({
    affected_object_refs:
      frame.object_neighborhood_refs.length > 0
        ? frame.object_neighborhood_refs
        : [frame.query_anchor_ref],
    audit_event_refs: frame.ordered_event_refs,
    critical_open_count: frame.export_posture.state === "DENIED" ? 1 : 0,
    first_observed_at: frameTimeOrGeneratedAt(frame.active_filters.window_from),
    hotspot_ref: `audit-hotspot://${frame.query_contract_code}/${frame.query_anchor_ref}`,
    last_observed_at: frameTimeOrGeneratedAt(frame.active_filters.window_to),
    open_count: frame.ordered_event_refs.length,
    reason_codes: [`${frame.query_contract_code}_HOTSPOT`],
    requires_operator_action: frame.ordered_event_refs.length > 0,
    source_artifact_type: "AUDIT_INVESTIGATION_FRAME",
    source_ref: frame.query_anchor_ref,
    tenant_id: input.tenant_id,
    worklist_ref: input.worklist_ref,
  } satisfies AuditHotspotAnalyticsSource));
}

export function buildAuditHotspotAnalytics(input: {
  generated_at: string;
  sources: readonly AuditHotspotAnalyticsSource[];
  tenant_id: string;
  worklist_ref: string;
}): AuditHotspotAnalytics {
  const tenantId = requireString("tenant_id", input.tenant_id);
  const worklistRef = requireString("worklist_ref", input.worklist_ref);
  const rows = input.sources
    .map((source) => rowFromSource({ generated_at: input.generated_at, source }))
    .filter((row) => row.tenant_id === tenantId)
    .filter((row) => row.worklist_ref === worklistRef)
    .sort(sortRows)
    .map((row, index) => ({
      ...row,
      rank: index + 1,
    }));
  const objectRefs = uniqueSorted(
    "governance_family_source.objectRefs",
    rows.map((row) => row.hotspot_ref),
  );
  const criticalOpenCount = rows.reduce(
    (total, row) => total + (row.critical_open_count > 0 ? 1 : 0),
    0,
  );
  const openCount = rows.length;
  const oldestOpenAgeHours =
    rows.length === 0
      ? 0
      : Math.max(
          ...rows.map((row) => hoursBetween(row.first_observed_at, input.generated_at)),
        );
  return {
    generated_at: requireString("generated_at", input.generated_at),
    governance_family_source: {
      affectedScopeLabel: rows.length === 0 ? null : `${rows.length} audit hotspots`,
      criticalOpenCount,
      family: "AUDIT_HOTSPOT",
      nextActionLabel: rows.length === 0 ? null : "Open audit hotspot tape",
      objectRefs,
      oldestOpenAgeHours,
      openCount,
      requiresOperatorAction: rows.some((row) => row.requires_operator_action),
      worklistRef,
    },
    hotspot_refs_in_rank_order: rows.map((row) => row.hotspot_ref),
    hotspots: rows,
    ranking_basis: "GOVERNANCE_AUDIT_HOTSPOT_SCORE_V1",
    tenant_id: tenantId,
    worklist_ref: worklistRef,
  };
}
