import { stableJsonHash } from "../../../domain-kernel/src/primitives/hash.ts";
import {
  type AdmissibilityState,
  type ProvenancePartitionContract,
  assertConfidence,
  assertNonNegativeInteger,
  buildProvenancePartitionContract,
  cloneRecord,
  normalizeManifestRefSpine,
  normalizeOrderedStringSet,
  normalizeSortedStringSet,
  normalizeTimestamp,
  ProvenanceModelError,
  refFromId,
  requireString,
} from "./provenance_common.ts";

export type ProvenancePathClass =
  | "PATH_DERIVATION"
  | "PATH_EVIDENCE_SUPPORT"
  | "PATH_AUDIT_PROOF"
  | "PATH_AUTHORITY_STATE"
  | "PATH_PARITY_EXPLANATION"
  | "PATH_TRUST_EXPLANATION"
  | "PATH_DRIFT_BASELINE"
  | "PATH_AMENDMENT_JUSTIFICATION"
  | "PATH_REMEDIATION_CHAIN"
  | "PATH_CONTINUATION_LINEAGE"
  | "PATH_RETENTION_LIMITATION"
  | "PATH_FILING_PROOF";
export type ProvenancePathRole = "PRIMARY" | "ALTERNATIVE";
export type ProvenancePathClosureState = "CLOSED" | "OPEN";
export type ProvenancePathAnchorClass =
  | "EVIDENCE_ITEM"
  | "SOURCE_RECORD"
  | "AUTHORITY_RESPONSE"
  | "AUDIT_EVENT"
  | "CONFIG_FREEZE";
export type ProvenancePathRankingCriterion =
  | "CONTRADICTION_FREE"
  | "LEGAL_STATE_PREREQUISITES"
  | "WEAKEST_SEGMENT_CONFIDENCE"
  | "UNRESOLVED_LIMITATION_COUNT"
  | "STALE_SEGMENT_COUNT"
  | "RETENTION_TOMBSTONE_COUNT"
  | "HOP_COUNT"
  | "LEXICAL_PATH_ID";

export type ProvenancePathRankingBasisItem = {
  criterion: ProvenancePathRankingCriterion;
  rank_order: number;
  basis_value: string;
};

export type ProvenancePathRecord = {
  path_id: string;
  graph_id: string;
  manifest_id: string;
  manifest_refs: string[];
  partition_contract: ProvenancePartitionContract;
  target_ref: string;
  path_class: ProvenancePathClass;
  path_role: ProvenancePathRole;
  admissibility_state: AdmissibilityState;
  node_refs: string[];
  edge_refs: string[];
  weakest_support_confidence: number;
  inferred_decisive_segment_present: boolean;
  retention_limited_segment_count: number;
  tombstoned_segment_count: number;
  limitation_codes: string[];
  ranking_basis: ProvenancePathRankingBasisItem[];
  lineage_boundary_refs: string[];
  decisive_lineage_boundary_refs: string[];
  hop_count: number;
  generated_at: string;
  closure_state: ProvenancePathClosureState;
  replayable: boolean;
  path_hash: string;
  anchor_ref: string;
  anchor_class: ProvenancePathAnchorClass;
  decisive_edge_refs: string[];
  contradiction_refs: string[];
  stale_segment_count: number;
};

export type ProvenancePathBuildInput = Partial<ProvenancePathRecord> & {
  graph_id: string;
  manifest_id: string;
  partition_contract: ProvenancePartitionContract;
  target_ref: string;
  node_refs: readonly string[];
  edge_refs: readonly string[];
  anchor_ref: string;
  anchor_class: ProvenancePathAnchorClass;
  decisive_edge_refs: readonly string[];
  generated_at?: string;
};

export function provenancePathRef(path: Pick<ProvenancePathRecord, "path_id"> | string) {
  return refFromId("provenance-path", typeof path === "string" ? path : path.path_id);
}

export function deriveProvenancePathHash(input: Omit<ProvenancePathRecord, "path_hash" | "path_id">) {
  return stableJsonHash({
    graph_id: input.graph_id,
    manifest_id: input.manifest_id,
    manifest_refs: input.manifest_refs,
    partition_contract: input.partition_contract,
    target_ref: input.target_ref,
    path_class: input.path_class,
    admissibility_state: input.admissibility_state,
    node_refs: input.node_refs,
    edge_refs: input.edge_refs,
    weakest_support_confidence: input.weakest_support_confidence,
    inferred_decisive_segment_present: input.inferred_decisive_segment_present,
    retention_limited_segment_count: input.retention_limited_segment_count,
    tombstoned_segment_count: input.tombstoned_segment_count,
    limitation_codes: input.limitation_codes,
    lineage_boundary_refs: input.lineage_boundary_refs,
    decisive_lineage_boundary_refs: input.decisive_lineage_boundary_refs,
    anchor_ref: input.anchor_ref,
    anchor_class: input.anchor_class,
    decisive_edge_refs: input.decisive_edge_refs,
    contradiction_refs: input.contradiction_refs,
    stale_segment_count: input.stale_segment_count,
  });
}

export function deriveProvenancePathId(pathHash: string) {
  return `provenance-path.${requireString("path_hash", pathHash)}`;
}

export function buildPathRankingBasis(input: {
  contradiction_refs: readonly string[];
  weakest_support_confidence: number;
  limitation_codes: readonly string[];
  stale_segment_count: number;
  retention_limited_segment_count: number;
  tombstoned_segment_count: number;
  hop_count: number;
  path_id?: string | null;
}): ProvenancePathRankingBasisItem[] {
  const retentionAndTombstoneCount = input.retention_limited_segment_count + input.tombstoned_segment_count;
  return [
    {
      criterion: "CONTRADICTION_FREE",
      rank_order: 1,
      basis_value: input.contradiction_refs.length === 0 ? "true" : "false",
    },
    {
      criterion: "LEGAL_STATE_PREREQUISITES",
      rank_order: 2,
      basis_value: "declared_current_authority_state_required_for_authority_paths",
    },
    {
      criterion: "WEAKEST_SEGMENT_CONFIDENCE",
      rank_order: 3,
      basis_value: input.weakest_support_confidence.toFixed(6),
    },
    {
      criterion: "UNRESOLVED_LIMITATION_COUNT",
      rank_order: 4,
      basis_value: String(input.limitation_codes.length),
    },
    {
      criterion: "STALE_SEGMENT_COUNT",
      rank_order: 5,
      basis_value: `stale=${input.stale_segment_count};retention_or_tombstone=${retentionAndTombstoneCount}`,
    },
    {
      criterion: "HOP_COUNT",
      rank_order: 6,
      basis_value: String(input.hop_count),
    },
    {
      criterion: "LEXICAL_PATH_ID",
      rank_order: 7,
      basis_value: input.path_id ?? "pending",
    },
  ];
}

function normalizeRankingBasis(
  basis: readonly ProvenancePathRankingBasisItem[] | undefined,
  fallback: ProvenancePathRankingBasisItem[],
) {
  const normalized = (basis?.length ? basis : fallback).map((item) => ({
    criterion: requireString("ranking_basis.criterion", item.criterion) as ProvenancePathRankingCriterion,
    rank_order: Number(item.rank_order),
    basis_value: requireString("ranking_basis.basis_value", item.basis_value),
  }));
  const seenCriteria = new Set<string>();
  const seenRanks = new Set<number>();
  for (const item of normalized) {
    if (!Number.isInteger(item.rank_order) || item.rank_order < 1 || item.rank_order > 7) {
      throw new ProvenanceModelError(
        "PROVENANCE_FIELD_INVALID",
        "ranking_basis.rank_order must be an integer from 1 to 7",
      );
    }
    if (seenCriteria.has(item.criterion) || seenRanks.has(item.rank_order)) {
      throw new ProvenanceModelError(
        "PROVENANCE_CONTRACT_INVALID",
        "ranking basis criteria and ranks must be unique",
      );
    }
    seenCriteria.add(item.criterion);
    seenRanks.add(item.rank_order);
  }
  const sorted = normalized.sort((left, right) => left.rank_order - right.rank_order);
  if (!sorted.every((item, index) => item.rank_order === index + 1)) {
    throw new ProvenanceModelError(
      "PROVENANCE_CONTRACT_INVALID",
      "ranking basis ranks must form a contiguous sequence starting at 1",
    );
  }
  return sorted;
}

function inferPathAdmissibility(input: {
  inferred_decisive_segment_present: boolean;
  retention_limited_segment_count: number;
  tombstoned_segment_count: number;
  stale_segment_count: number;
  limitation_codes: readonly string[];
  replayable: boolean;
}) {
  if (
    input.inferred_decisive_segment_present ||
    input.retention_limited_segment_count > 0 ||
    input.tombstoned_segment_count > 0 ||
    input.stale_segment_count > 0 ||
    input.limitation_codes.length > 0 ||
    !input.replayable
  ) {
    return "LIMITED" as const;
  }
  return "ADMISSIBLE" as const;
}

export function normalizeProvenancePathRecord(input: ProvenancePathRecord): ProvenancePathRecord {
  const manifestId = requireString("manifest_id", input.manifest_id);
  const manifestRefs = normalizeManifestRefSpine(manifestId, input.manifest_refs);
  const nodeRefs = normalizeOrderedStringSet("node_refs", input.node_refs, { minItems: 2 });
  const edgeRefs = normalizeOrderedStringSet("edge_refs", input.edge_refs, { minItems: 1 });
  const decisiveEdgeRefs = normalizeSortedStringSet("decisive_edge_refs", input.decisive_edge_refs, {
    minItems: 1,
  });
  const limitationCodes = normalizeSortedStringSet("limitation_codes", input.limitation_codes ?? []);
  const lineageBoundaryRefs = normalizeSortedStringSet("lineage_boundary_refs", input.lineage_boundary_refs ?? []);
  const decisiveLineageBoundaryRefs = normalizeSortedStringSet(
    "decisive_lineage_boundary_refs",
    input.decisive_lineage_boundary_refs ?? [],
  );
  const contradictionRefs = normalizeSortedStringSet("contradiction_refs", input.contradiction_refs ?? []);
  const retentionLimitedSegmentCount = assertNonNegativeInteger(
    "retention_limited_segment_count",
    input.retention_limited_segment_count ?? 0,
  );
  const tombstonedSegmentCount = assertNonNegativeInteger(
    "tombstoned_segment_count",
    input.tombstoned_segment_count ?? 0,
  );
  const staleSegmentCount = assertNonNegativeInteger("stale_segment_count", input.stale_segment_count ?? 0);
  const hopCount = assertNonNegativeInteger("hop_count", input.hop_count ?? edgeRefs.length);
  if (hopCount !== edgeRefs.length) {
    throw new ProvenanceModelError(
      "PROVENANCE_CONTRACT_INVALID",
      `hop_count must equal edge_refs length ${edgeRefs.length}`,
    );
  }
  if (nodeRefs.length !== edgeRefs.length + 1) {
    throw new ProvenanceModelError(
      "PROVENANCE_CONTRACT_INVALID",
      "node_refs must contain exactly one more entry than edge_refs",
    );
  }
  const missingDecisiveEdges = decisiveEdgeRefs.filter((edgeRef) => !edgeRefs.includes(edgeRef));
  if (missingDecisiveEdges.length > 0) {
    throw new ProvenanceModelError(
      "PROVENANCE_CONTRACT_INVALID",
      `decisive_edge_refs must be a subset of edge_refs: ${missingDecisiveEdges.join(", ")}`,
    );
  }
  const missingDecisiveLineage = decisiveLineageBoundaryRefs.filter(
    (boundaryRef) => !lineageBoundaryRefs.includes(boundaryRef),
  );
  if (missingDecisiveLineage.length > 0) {
    throw new ProvenanceModelError(
      "PROVENANCE_CONTRACT_INVALID",
      "decisive_lineage_boundary_refs must be a subset of lineage_boundary_refs",
    );
  }
  if (manifestRefs.length > 1 && lineageBoundaryRefs.length === 0) {
    throw new ProvenanceModelError(
      "PROVENANCE_CONTRACT_INVALID",
      "cross-manifest paths must retain lineage_boundary_refs",
    );
  }
  if (manifestRefs.length === 1 && lineageBoundaryRefs.length > 0) {
    throw new ProvenanceModelError(
      "PROVENANCE_CONTRACT_INVALID",
      "single-manifest paths must not retain lineage_boundary_refs",
    );
  }

  const anchorRef = requireString("anchor_ref", input.anchor_ref);
  if (!nodeRefs.includes(anchorRef)) {
    throw new ProvenanceModelError(
      "PROVENANCE_CONTRACT_INVALID",
      "anchor_ref must appear in node_refs",
    );
  }

  const replayable = Boolean(input.replayable ?? true);
  const inferredDecisiveSegmentPresent = Boolean(input.inferred_decisive_segment_present ?? false);
  const admissibilityState =
    input.admissibility_state ??
    inferPathAdmissibility({
      inferred_decisive_segment_present: inferredDecisiveSegmentPresent,
      retention_limited_segment_count: retentionLimitedSegmentCount,
      tombstoned_segment_count: tombstonedSegmentCount,
      stale_segment_count: staleSegmentCount,
      limitation_codes: limitationCodes,
      replayable,
    });
  if (admissibilityState === "ADMISSIBLE") {
    if (
      inferredDecisiveSegmentPresent ||
      retentionLimitedSegmentCount > 0 ||
      tombstonedSegmentCount > 0 ||
      staleSegmentCount > 0 ||
      limitationCodes.length > 0 ||
      !replayable
    ) {
      throw new ProvenanceModelError(
        "PROVENANCE_CONTRACT_INVALID",
        "ADMISSIBLE paths cannot carry limitations, stale/tombstoned segments, inferred decisive segments, or replay failure",
      );
    }
  }

  const withoutHash: Omit<ProvenancePathRecord, "path_hash" | "path_id"> = {
    graph_id: requireString("graph_id", input.graph_id),
    manifest_id: manifestId,
    manifest_refs: manifestRefs,
    partition_contract: buildProvenancePartitionContract(input.partition_contract),
    target_ref: requireString("target_ref", input.target_ref),
    path_class: (input.path_class ?? "PATH_EVIDENCE_SUPPORT") as ProvenancePathClass,
    path_role: (input.path_role ?? "ALTERNATIVE") as ProvenancePathRole,
    admissibility_state: admissibilityState,
    node_refs: nodeRefs,
    edge_refs: edgeRefs,
    weakest_support_confidence: assertConfidence(
      "weakest_support_confidence",
      input.weakest_support_confidence ?? 1,
    ),
    inferred_decisive_segment_present: inferredDecisiveSegmentPresent,
    retention_limited_segment_count: retentionLimitedSegmentCount,
    tombstoned_segment_count: tombstonedSegmentCount,
    limitation_codes: limitationCodes,
    ranking_basis: [],
    lineage_boundary_refs: lineageBoundaryRefs,
    decisive_lineage_boundary_refs: decisiveLineageBoundaryRefs,
    hop_count: hopCount,
    generated_at: normalizeTimestamp("generated_at", input.generated_at),
    closure_state: (input.closure_state ?? "CLOSED") as ProvenancePathClosureState,
    replayable,
    anchor_ref: anchorRef,
    anchor_class: requireString("anchor_class", input.anchor_class) as ProvenancePathAnchorClass,
    decisive_edge_refs: decisiveEdgeRefs,
    contradiction_refs: contradictionRefs,
    stale_segment_count: staleSegmentCount,
  };
  const pathHash = input.path_hash ?? deriveProvenancePathHash(withoutHash);
  const pathId = input.path_id ?? deriveProvenancePathId(pathHash);
  const rankingBasis = normalizeRankingBasis(
    input.ranking_basis,
    buildPathRankingBasis({
      contradiction_refs: contradictionRefs,
      weakest_support_confidence: withoutHash.weakest_support_confidence,
      limitation_codes: limitationCodes,
      stale_segment_count: staleSegmentCount,
      retention_limited_segment_count: retentionLimitedSegmentCount,
      tombstoned_segment_count: tombstonedSegmentCount,
      hop_count: hopCount,
      path_id: pathId,
    }),
  );
  return {
    ...withoutHash,
    path_id: pathId,
    ranking_basis: rankingBasis,
    path_hash: pathHash,
  };
}

export function buildProvenancePathRecord(input: ProvenancePathBuildInput): ProvenancePathRecord {
  const limitationCodes = new Set(input.limitation_codes ?? []);
  if (input.inferred_decisive_segment_present) {
    limitationCodes.add("INFERRED_DECISIVE_SEGMENT");
  }
  if ((input.retention_limited_segment_count ?? 0) > 0) {
    limitationCodes.add("RETENTION_LIMITED_SEGMENT");
  }
  if ((input.tombstoned_segment_count ?? 0) > 0) {
    limitationCodes.add("TOMBSTONED_SEGMENT");
  }
  if ((input.stale_segment_count ?? 0) > 0) {
    limitationCodes.add("STALE_SEGMENT");
  }
  if (input.replayable === false) {
    limitationCodes.add("NON_REPLAYABLE_PATH");
  }
  const draft = {
    ...input,
    manifest_refs: input.manifest_refs ?? [input.manifest_id],
    path_class: input.path_class ?? "PATH_EVIDENCE_SUPPORT",
    path_role: input.path_role ?? "ALTERNATIVE",
    admissibility_state: input.admissibility_state ?? undefined,
    weakest_support_confidence: input.weakest_support_confidence ?? 1,
    inferred_decisive_segment_present: input.inferred_decisive_segment_present ?? false,
    retention_limited_segment_count: input.retention_limited_segment_count ?? 0,
    tombstoned_segment_count: input.tombstoned_segment_count ?? 0,
    limitation_codes: [...limitationCodes],
    ranking_basis: input.ranking_basis ?? [],
    lineage_boundary_refs: input.lineage_boundary_refs ?? [],
    decisive_lineage_boundary_refs: input.decisive_lineage_boundary_refs ?? [],
    hop_count: input.hop_count ?? input.edge_refs.length,
    generated_at: input.generated_at ?? "2026-04-28T00:00:00Z",
    closure_state: input.closure_state ?? "CLOSED",
    replayable: input.replayable ?? true,
    contradiction_refs: input.contradiction_refs ?? [],
    stale_segment_count: input.stale_segment_count ?? 0,
    path_id: input.path_id ?? "",
    path_hash: input.path_hash ?? "",
  } as ProvenancePathRecord;
  delete (draft as Partial<ProvenancePathRecord>).path_id;
  delete (draft as Partial<ProvenancePathRecord>).path_hash;
  return normalizeProvenancePathRecord(draft as ProvenancePathRecord);
}

export function deriveProvenancePathContentHash(record: ProvenancePathRecord) {
  return stableJsonHash(normalizeProvenancePathRecord(record));
}

export function cloneProvenancePathRecord(record: ProvenancePathRecord) {
  return cloneRecord(normalizeProvenancePathRecord(record));
}
