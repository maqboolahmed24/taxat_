import { stableJsonHash } from "../../../domain-kernel/src/primitives/hash.ts";
import {
  type AdmissibilityState,
  assertConfidence,
  cloneRecord,
  normalizeNullableString,
  normalizeSortedStringSet,
  normalizeTimestamp,
  ProvenanceModelError,
  refFromId,
  requireString,
} from "./provenance_common.ts";

export const PROVENANCE_EDGE_TYPES = [
  "ED_USED",
  "ED_GENERATED",
  "ED_DERIVED_FROM",
  "ED_ATTRIBUTED_TO",
  "ED_ASSOCIATED_WITH",
  "ED_ACTED_ON_BEHALF_OF",
  "ED_SUPPORTS",
  "ED_EXTRACTED_FROM",
  "ED_PROMOTED_FROM",
  "ED_AGGREGATES",
  "ED_ADJUSTS",
  "ED_COMPARED_AGAINST",
  "ED_GATED_BY",
  "ED_OVERRIDDEN_BY",
  "ED_ACKNOWLEDGED_BY",
  "ED_RECONCILED_WITH",
  "ED_AUDITED_BY",
  "ED_CAUSED_BY_ERROR",
  "ED_COMPENSATED_BY",
  "ED_CONTINUES",
  "ED_REPLAYS",
  "ED_RECOVERS",
  "ED_SUPERSEDES",
  "ED_BASELINES",
  "ED_LIMITED_BY_RETENTION",
  "ED_ERASED_UNDER",
  "ED_TRIGGERED_WORKFLOW",
  "ED_DEPENDS_ON_CONFIG",
  "ED_REPORTS_AS",
  "ED_CONTRADICTS",
] as const;

export const LINEAGE_EDGE_TYPES = ["ED_CONTINUES", "ED_REPLAYS", "ED_RECOVERS", "ED_SUPERSEDES"] as const;

export type ProvenanceEdgeType = (typeof PROVENANCE_EDGE_TYPES)[number];
export type ProvenanceLineageRelation = (typeof LINEAGE_EDGE_TYPES)[number];
export type ProvenanceSupportType =
  | "DIRECT"
  | "EXTRACTED"
  | "DECLARED"
  | "INFERRED"
  | "AUTHORITY_CONFIRMED"
  | "GOVERNANCE_ONLY";
export type ProvenanceSupportStrengthTier =
  | "TIER_1_AUTHORITY_FINAL"
  | "TIER_2_AUTHORITY_REFERENCE"
  | "TIER_3_STRUCTURED_EXTERNAL"
  | "TIER_4_STRUCTURED_INTERNAL"
  | "TIER_5_DOCUMENT_SUPPORT"
  | "TIER_6_DECLARED_ONLY"
  | "TIER_7_INFERRED"
  | "TIER_8_GOVERNANCE_ONLY";

export type ProvenanceEdgeRecord = {
  edge_id: string;
  graph_id: string;
  manifest_id: string;
  tenant_id: string;
  client_id: string | null;
  business_partition: string | null;
  period_scope: string | null;
  from_node_id: string;
  to_node_id: string;
  edge_type: ProvenanceEdgeType;
  originating_activity_ref: string;
  created_at: string;
  support_type: ProvenanceSupportType;
  support_confidence: number;
  support_strength_tier: ProvenanceSupportStrengthTier;
  limitation_codes: string[];
  from_manifest_id: string | null;
  to_manifest_id: string | null;
  lineage_relation: ProvenanceLineageRelation | null;
  decisive_support: boolean;
  admissibility_state: AdmissibilityState;
  contradicted_by_refs: string[];
  stale_at: string | null;
};

export type ProvenanceEdgeBuildInput = Partial<ProvenanceEdgeRecord> & {
  graph_id: string;
  manifest_id: string;
  tenant_id: string;
  from_node_id: string;
  to_node_id: string;
  edge_type: ProvenanceEdgeType;
  originating_activity_ref: string;
  created_at?: string;
};

const LINEAGE_EDGE_TYPE_SET = new Set<string>(LINEAGE_EDGE_TYPES);
const SUPPORT_TIER_BY_TYPE: Record<ProvenanceSupportType, ProvenanceSupportStrengthTier> = {
  AUTHORITY_CONFIRMED: "TIER_1_AUTHORITY_FINAL",
  DECLARED: "TIER_6_DECLARED_ONLY",
  DIRECT: "TIER_4_STRUCTURED_INTERNAL",
  EXTRACTED: "TIER_5_DOCUMENT_SUPPORT",
  GOVERNANCE_ONLY: "TIER_8_GOVERNANCE_ONLY",
  INFERRED: "TIER_7_INFERRED",
};
const SUPPORT_CONFIDENCE_BY_TYPE: Record<ProvenanceSupportType, number> = {
  AUTHORITY_CONFIRMED: 1,
  DECLARED: 0.7,
  DIRECT: 0.95,
  EXTRACTED: 0.85,
  GOVERNANCE_ONLY: 0.5,
  INFERRED: 0.4,
};

function isLineageEdge(edgeType: ProvenanceEdgeType): edgeType is ProvenanceLineageRelation {
  return LINEAGE_EDGE_TYPE_SET.has(edgeType);
}

export function provenanceEdgeRef(edge: Pick<ProvenanceEdgeRecord, "edge_id"> | string) {
  return refFromId("provenance-edge", typeof edge === "string" ? edge : edge.edge_id);
}

export function deriveProvenanceEdgeId(input: {
  graph_id: string;
  manifest_id: string;
  from_node_id: string;
  to_node_id: string;
  edge_type: ProvenanceEdgeType;
  originating_activity_ref: string;
  from_manifest_id?: string | null;
  to_manifest_id?: string | null;
}) {
  return `provenance-edge.${stableJsonHash({
    graph_id: requireString("graph_id", input.graph_id),
    manifest_id: requireString("manifest_id", input.manifest_id),
    from_node_id: requireString("from_node_id", input.from_node_id),
    to_node_id: requireString("to_node_id", input.to_node_id),
    edge_type: input.edge_type,
    originating_activity_ref: requireString("originating_activity_ref", input.originating_activity_ref),
    from_manifest_id: normalizeNullableString("from_manifest_id", input.from_manifest_id),
    to_manifest_id: normalizeNullableString("to_manifest_id", input.to_manifest_id),
  })}`;
}

function inferSupportType(edgeType: ProvenanceEdgeType): ProvenanceSupportType {
  if (edgeType === "ED_AUDITED_BY" || edgeType === "ED_LIMITED_BY_RETENTION" || edgeType === "ED_ERASED_UNDER") {
    return "GOVERNANCE_ONLY";
  }
  if (edgeType === "ED_EXTRACTED_FROM") {
    return "EXTRACTED";
  }
  if (edgeType === "ED_CONTRADICTS") {
    return "GOVERNANCE_ONLY";
  }
  return "DIRECT";
}

function inferAdmissibility(input: {
  edge_type: ProvenanceEdgeType;
  support_type: ProvenanceSupportType;
  limitation_codes: readonly string[];
  contradicted_by_refs: readonly string[];
  stale_at: string | null;
}) {
  if (
    input.support_type === "INFERRED" ||
    input.edge_type === "ED_CONTRADICTS" ||
    input.edge_type === "ED_LIMITED_BY_RETENTION" ||
    input.edge_type === "ED_ERASED_UNDER" ||
    input.limitation_codes.length > 0 ||
    input.contradicted_by_refs.length > 0 ||
    input.stale_at !== null
  ) {
    return "LIMITED" as const;
  }
  return "ADMISSIBLE" as const;
}

function normalizeEdgeLimitations(input: ProvenanceEdgeBuildInput | ProvenanceEdgeRecord) {
  const limitationCodes = new Set(normalizeSortedStringSet("limitation_codes", input.limitation_codes ?? []));
  if (input.support_type === "INFERRED") {
    limitationCodes.add("INFERRED_SUPPORT_LIMITATION");
  }
  if (input.edge_type === "ED_CONTRADICTS") {
    limitationCodes.add("EXPLICIT_CONTRADICTION");
  }
  if (input.edge_type === "ED_LIMITED_BY_RETENTION") {
    limitationCodes.add("RETENTION_LIMITED_SUPPORT");
  }
  if (input.edge_type === "ED_ERASED_UNDER") {
    limitationCodes.add("ERASURE_PLACEHOLDER_SUPPORT");
  }
  return normalizeSortedStringSet("limitation_codes", [...limitationCodes]);
}

export function normalizeProvenanceEdgeRecord(input: ProvenanceEdgeRecord): ProvenanceEdgeRecord {
  const edgeType = requireString("edge_type", input.edge_type) as ProvenanceEdgeType;
  if (!PROVENANCE_EDGE_TYPES.includes(edgeType)) {
    throw new ProvenanceModelError("PROVENANCE_FIELD_INVALID", `unsupported edge_type ${edgeType}`);
  }

  const supportType = (input.support_type ?? inferSupportType(edgeType)) as ProvenanceSupportType;
  const supportStrengthTier = (input.support_strength_tier ??
    SUPPORT_TIER_BY_TYPE[supportType]) as ProvenanceSupportStrengthTier;
  if (supportStrengthTier !== SUPPORT_TIER_BY_TYPE[supportType] && supportType === "INFERRED") {
    throw new ProvenanceModelError(
      "PROVENANCE_CONTRACT_INVALID",
      "INFERRED support must use TIER_7_INFERRED",
    );
  }
  if (supportStrengthTier !== "TIER_8_GOVERNANCE_ONLY" && supportType === "GOVERNANCE_ONLY") {
    throw new ProvenanceModelError(
      "PROVENANCE_CONTRACT_INVALID",
      "GOVERNANCE_ONLY support must use TIER_8_GOVERNANCE_ONLY",
    );
  }

  const staleAt = normalizeNullableString("stale_at", input.stale_at);
  const normalizedStaleAt = staleAt ? normalizeTimestamp("stale_at", staleAt) : null;
  const limitationCodes = normalizeEdgeLimitations({ ...input, support_type: supportType, edge_type: edgeType });
  const contradictedByRefs =
    edgeType === "ED_CONTRADICTS" && (input.contradicted_by_refs ?? []).length === 0
      ? normalizeSortedStringSet("contradicted_by_refs", [input.to_node_id])
      : normalizeSortedStringSet("contradicted_by_refs", input.contradicted_by_refs ?? []);

  const fromManifestId = normalizeNullableString("from_manifest_id", input.from_manifest_id);
  const toManifestId = normalizeNullableString("to_manifest_id", input.to_manifest_id);
  const lineageRelation = normalizeNullableString("lineage_relation", input.lineage_relation) as
    | ProvenanceLineageRelation
    | null;
  if (isLineageEdge(edgeType)) {
    if (!fromManifestId || !toManifestId || lineageRelation !== edgeType) {
      throw new ProvenanceModelError(
        "PROVENANCE_CONTRACT_INVALID",
        "lineage edges must carry from_manifest_id, to_manifest_id, and matching lineage_relation",
      );
    }
  } else if (fromManifestId !== null || toManifestId !== null || lineageRelation !== null) {
    throw new ProvenanceModelError(
      "PROVENANCE_CONTRACT_INVALID",
      "non-lineage edges must keep lineage fields null",
    );
  }

  const admissibilityState =
    input.admissibility_state ??
    inferAdmissibility({
      edge_type: edgeType,
      support_type: supportType,
      limitation_codes: limitationCodes,
      contradicted_by_refs: contradictedByRefs,
      stale_at: normalizedStaleAt,
    });
  const record: ProvenanceEdgeRecord = {
    edge_id: requireString("edge_id", input.edge_id),
    graph_id: requireString("graph_id", input.graph_id),
    manifest_id: requireString("manifest_id", input.manifest_id),
    tenant_id: requireString("tenant_id", input.tenant_id),
    client_id: normalizeNullableString("client_id", input.client_id),
    business_partition: normalizeNullableString("business_partition", input.business_partition),
    period_scope: normalizeNullableString("period_scope", input.period_scope),
    from_node_id: requireString("from_node_id", input.from_node_id),
    to_node_id: requireString("to_node_id", input.to_node_id),
    edge_type: edgeType,
    originating_activity_ref: requireString("originating_activity_ref", input.originating_activity_ref),
    created_at: normalizeTimestamp("created_at", input.created_at),
    support_type: supportType,
    support_confidence: assertConfidence(
      "support_confidence",
      input.support_confidence ?? SUPPORT_CONFIDENCE_BY_TYPE[supportType],
    ),
    support_strength_tier: supportStrengthTier,
    limitation_codes: limitationCodes,
    from_manifest_id: fromManifestId,
    to_manifest_id: toManifestId,
    lineage_relation: lineageRelation,
    decisive_support: Boolean(input.decisive_support ?? true),
    admissibility_state: admissibilityState,
    contradicted_by_refs: contradictedByRefs,
    stale_at: normalizedStaleAt,
  };

  if (record.admissibility_state === "ADMISSIBLE") {
    if (record.limitation_codes.length > 0 || record.contradicted_by_refs.length > 0 || record.stale_at !== null) {
      throw new ProvenanceModelError(
        "PROVENANCE_CONTRACT_INVALID",
        "ADMISSIBLE edges must not carry limitations, contradiction refs, or stale_at",
      );
    }
  }
  if (record.edge_type === "ED_CONTRADICTS" && record.contradicted_by_refs.length === 0) {
    throw new ProvenanceModelError(
      "PROVENANCE_CONTRACT_INVALID",
      "ED_CONTRADICTS edges must retain contradicted_by_refs",
    );
  }
  return record;
}

export function buildProvenanceEdgeRecord(input: ProvenanceEdgeBuildInput): ProvenanceEdgeRecord {
  const edgeType = requireString("edge_type", input.edge_type) as ProvenanceEdgeType;
  const supportType = (input.support_type ?? inferSupportType(edgeType)) as ProvenanceSupportType;
  const draft = {
    ...input,
    edge_id:
      input.edge_id ??
      deriveProvenanceEdgeId({
        graph_id: input.graph_id,
        manifest_id: input.manifest_id,
        from_node_id: input.from_node_id,
        to_node_id: input.to_node_id,
        edge_type: edgeType,
        originating_activity_ref: input.originating_activity_ref,
        from_manifest_id: input.from_manifest_id ?? null,
        to_manifest_id: input.to_manifest_id ?? null,
      }),
    edge_type: edgeType,
    created_at: input.created_at ?? "2026-04-28T00:00:00Z",
    support_type: supportType,
    support_confidence: input.support_confidence ?? SUPPORT_CONFIDENCE_BY_TYPE[supportType],
    support_strength_tier: input.support_strength_tier ?? SUPPORT_TIER_BY_TYPE[supportType],
    limitation_codes: input.limitation_codes ?? [],
    from_manifest_id: input.from_manifest_id ?? null,
    to_manifest_id: input.to_manifest_id ?? null,
    lineage_relation: input.lineage_relation ?? (isLineageEdge(edgeType) ? edgeType : null),
    decisive_support: input.decisive_support ?? true,
    admissibility_state: input.admissibility_state ?? undefined,
    contradicted_by_refs: input.contradicted_by_refs ?? [],
    stale_at: input.stale_at ?? null,
    client_id: input.client_id ?? null,
    business_partition: input.business_partition ?? null,
    period_scope: input.period_scope ?? null,
  } as ProvenanceEdgeRecord;
  return normalizeProvenanceEdgeRecord(draft);
}

export function deriveProvenanceEdgeContentHash(record: ProvenanceEdgeRecord) {
  return stableJsonHash(normalizeProvenanceEdgeRecord(record));
}

export function cloneProvenanceEdgeRecord(record: ProvenanceEdgeRecord) {
  return cloneRecord(normalizeProvenanceEdgeRecord(record));
}

export function isProvenanceLineageEdge(edge: Pick<ProvenanceEdgeRecord, "edge_type">) {
  return isLineageEdge(edge.edge_type);
}
