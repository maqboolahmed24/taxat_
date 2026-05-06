import { buildLineageBoundaries, lineageBoundaryIdForEdge } from "./build_lineage_boundaries.ts";
import { type ProvenanceEdgeRecord, isProvenanceLineageEdge } from "../models/provenance_edge.ts";
import { type ProvenanceNodeRecord } from "../models/provenance_node.ts";
import { type ProvenancePartitionContract, normalizeManifestRefSpine } from "../models/provenance_common.ts";
import {
  buildProvenancePathRecord,
  type ProvenancePathAnchorClass,
  type ProvenancePathClass,
  type ProvenancePathRecord,
} from "../models/provenance_path.ts";
import { ProvenancePathRepository } from "../repositories/provenance_path_repository.ts";

export type CandidatePathTarget = {
  target_ref: string;
  target_node_id?: string;
  anchor_refs?: readonly string[];
  path_class?: ProvenancePathClass;
};

export type EnumerateCandidatePathsInput = {
  graph_id: string;
  manifest_id: string;
  manifest_refs?: readonly string[];
  partition_contract: ProvenancePartitionContract;
  nodes: readonly ProvenanceNodeRecord[];
  edges: readonly ProvenanceEdgeRecord[];
  targets: readonly (string | CandidatePathTarget)[];
  anchor_refs: readonly string[];
  anchor_class?: ProvenancePathAnchorClass;
  generated_at?: string;
  max_depth?: number;
  repository?: ProvenancePathRepository;
};

function rankCandidatePath(left: ProvenancePathRecord, right: ProvenancePathRecord) {
  return (
    left.contradiction_refs.length - right.contradiction_refs.length ||
    right.weakest_support_confidence - left.weakest_support_confidence ||
    left.limitation_codes.length - right.limitation_codes.length ||
    left.stale_segment_count - right.stale_segment_count ||
    left.retention_limited_segment_count +
      left.tombstoned_segment_count -
      (right.retention_limited_segment_count + right.tombstoned_segment_count) ||
    left.hop_count - right.hop_count ||
    left.path_id.localeCompare(right.path_id)
  );
}

function anchorClassForNode(node: ProvenanceNodeRecord | undefined, fallback: ProvenancePathAnchorClass) {
  if (!node) {
    return fallback;
  }
  if (node.node_family === "EN_SOURCE_RECORD") return "SOURCE_RECORD";
  if (node.node_family === "EN_AUTHORITY_RESPONSE") return "AUTHORITY_RESPONSE";
  if (node.node_family === "EN_AUDIT_EVENT") return "AUDIT_EVENT";
  if (node.node_family === "EN_CONFIG_FREEZE") return "CONFIG_FREEZE";
  return "EVIDENCE_ITEM";
}

export async function enumerateCandidatePaths(input: EnumerateCandidatePathsInput) {
  const repository = input.repository ?? new ProvenancePathRepository();
  const manifestRefs = normalizeManifestRefSpine(input.manifest_id, input.manifest_refs ?? [input.manifest_id]);
  const maxDepth = input.max_depth ?? 8;
  const nodeById = new Map(input.nodes.map((node) => [node.node_id, node] as const));
  const edgesByFrom = new Map<string, ProvenanceEdgeRecord[]>();
  for (const edge of [...input.edges].sort((left, right) => left.edge_id.localeCompare(right.edge_id))) {
    const current = edgesByFrom.get(edge.from_node_id) ?? [];
    current.push(edge);
    edgesByFrom.set(edge.from_node_id, current);
  }
  const allAnchorRefs = new Set(input.anchor_refs);
  const pathsByTarget = new Map<string, ProvenancePathRecord[]>();

  for (const rawTarget of input.targets) {
    const target =
      typeof rawTarget === "string"
        ? { target_ref: rawTarget, target_node_id: rawTarget }
        : { ...rawTarget, target_node_id: rawTarget.target_node_id ?? rawTarget.target_ref };
    const targetAnchors = new Set([...(target.anchor_refs ?? []), ...allAnchorRefs]);
    const discovered: ProvenancePathRecord[] = [];

    const visit = (
      nodeId: string,
      nodeRefs: string[],
      edgeRefs: string[],
      visitedNodeIds: Set<string>,
      traversedEdges: ProvenanceEdgeRecord[],
    ) => {
      if (targetAnchors.has(nodeId) && edgeRefs.length > 0) {
        const anchorNode = nodeById.get(nodeId);
        const fallbackDecisiveEdgeRef = edgeRefs[edgeRefs.length - 1];
        if (!fallbackDecisiveEdgeRef) {
          return;
        }
        const decisiveEdgeRefs = traversedEdges.filter((edge) => edge.decisive_support).map((edge) => edge.edge_id);
        const lineageBoundaryRefs = traversedEdges
          .filter(isProvenanceLineageEdge)
          .map((edge) => lineageBoundaryIdForEdge(edge))
          .sort();
        const limitationCodes = [
          ...traversedEdges.flatMap((edge) => edge.limitation_codes),
          ...nodeRefs.flatMap((ref) => nodeById.get(ref)?.limitation_codes ?? []),
        ];
        discovered.push(
          buildProvenancePathRecord({
            anchor_class: anchorClassForNode(anchorNode, input.anchor_class ?? "EVIDENCE_ITEM"),
            anchor_ref: nodeId,
            contradiction_refs: traversedEdges
              .filter((edge) => edge.edge_type === "ED_CONTRADICTS")
              .map((edge) => edge.edge_id),
            decisive_edge_refs: decisiveEdgeRefs.length > 0 ? decisiveEdgeRefs : [fallbackDecisiveEdgeRef],
            decisive_lineage_boundary_refs: lineageBoundaryRefs.filter((boundaryRef) =>
              traversedEdges
                .filter((edge) => edge.decisive_support && isProvenanceLineageEdge(edge))
                .some((edge) => lineageBoundaryIdForEdge(edge) === boundaryRef),
            ),
            edge_refs: edgeRefs,
            generated_at: input.generated_at ?? "2026-04-28T00:00:00Z",
            graph_id: input.graph_id,
            inferred_decisive_segment_present: traversedEdges.some(
              (edge) => edge.decisive_support && edge.support_type === "INFERRED",
            ),
            lineage_boundary_refs: lineageBoundaryRefs,
            limitation_codes: limitationCodes,
            manifest_id: input.manifest_id,
            manifest_refs: manifestRefs,
            node_refs: nodeRefs,
            partition_contract: input.partition_contract,
            path_class: target.path_class ?? "PATH_EVIDENCE_SUPPORT",
            retention_limited_segment_count: traversedEdges.filter((edge) =>
              edge.limitation_codes.includes("RETENTION_LIMITED_SUPPORT"),
            ).length,
            stale_segment_count: traversedEdges.filter((edge) => edge.stale_at !== null).length,
            target_ref: target.target_ref,
            tombstoned_segment_count: nodeRefs.filter((ref) => {
              const node = nodeById.get(ref);
              return node?.tombstone_state === "ERASED_PLACEHOLDER" || node?.tombstone_state === "EXPIRED_PLACEHOLDER";
            }).length,
            weakest_support_confidence: Math.min(...traversedEdges.map((edge) => edge.support_confidence)),
          }),
        );
      }
      if (edgeRefs.length >= maxDepth) {
        return;
      }
      for (const edge of edgesByFrom.get(nodeId) ?? []) {
        if (visitedNodeIds.has(edge.to_node_id)) {
          continue;
        }
        visit(
          edge.to_node_id,
          [...nodeRefs, edge.to_node_id],
          [...edgeRefs, edge.edge_id],
          new Set([...visitedNodeIds, edge.to_node_id]),
          [...traversedEdges, edge],
        );
      }
    };

    visit(target.target_node_id, [target.target_node_id], [], new Set([target.target_node_id]), []);
    const sorted = discovered.sort(rankCandidatePath).map((path, index) =>
      buildProvenancePathRecord({
        ...path,
        path_role: index === 0 ? "PRIMARY" : "ALTERNATIVE",
      }),
    );
    pathsByTarget.set(target.target_ref, sorted);
    for (const path of sorted) {
      await repository.persistProvenancePath({ path });
    }
  }

  const paths = [...pathsByTarget.values()].flat().sort((left, right) => left.path_id.localeCompare(right.path_id));
  if (manifestRefs.length > 1) {
    buildLineageBoundaries({
      edges: input.edges,
      manifest_id: input.manifest_id,
      manifest_refs: manifestRefs,
      partition_contract: input.partition_contract,
      paths,
    });
  }
  return {
    paths,
    paths_by_target: pathsByTarget,
    repository,
  };
}
