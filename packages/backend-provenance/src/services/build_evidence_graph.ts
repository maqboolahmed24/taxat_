import { stableJsonHash } from "../../../domain-kernel/src/primitives/hash.ts";
import {
  buildEvidenceGraphRecord,
  buildEvidenceGraphTargetAssessment,
  type EvidenceGraphLineageBoundary,
  type EvidenceGraphRecord,
} from "../models/evidence_graph.ts";
import type { ProvenanceEdgeRecord } from "../models/provenance_edge.ts";
import type { ProvenanceNodeRecord } from "../models/provenance_node.ts";
import { type ProvenancePartitionContract, normalizeManifestRefSpine } from "../models/provenance_common.ts";
import { type ProvenancePathRecord } from "../models/provenance_path.ts";
import { EvidenceGraphRepository } from "../repositories/evidence_graph_repository.ts";
import { buildLineageBoundaries } from "./build_lineage_boundaries.ts";
import { deriveGraphId } from "./derive_graph_address.ts";
import { validateGraphIntegrity } from "./validate_graph_integrity.ts";

export type BuildEvidenceGraphInput = {
  manifest_id: string;
  manifest_refs?: readonly string[];
  partition_contract: ProvenancePartitionContract;
  nodes: readonly ProvenanceNodeRecord[];
  edges: readonly ProvenanceEdgeRecord[];
  paths: readonly ProvenancePathRecord[];
  graph_id?: string;
  built_at?: string;
  lineage_boundaries?: readonly EvidenceGraphLineageBoundary[];
  repository?: EvidenceGraphRepository;
};

function artifactSetRef(prefix: string, values: readonly unknown[]) {
  return `${prefix}://${stableJsonHash(values)}`;
}

function rankGraphPath(left: ProvenancePathRecord, right: ProvenancePathRecord) {
  return (
    (left.path_role === "PRIMARY" ? 0 : 1) - (right.path_role === "PRIMARY" ? 0 : 1) ||
    left.contradiction_refs.length - right.contradiction_refs.length ||
    right.weakest_support_confidence - left.weakest_support_confidence ||
    left.limitation_codes.length - right.limitation_codes.length ||
    left.hop_count - right.hop_count ||
    left.path_id.localeCompare(right.path_id)
  );
}

export async function buildEvidenceGraph(input: BuildEvidenceGraphInput) {
  const repository = input.repository ?? new EvidenceGraphRepository();
  const manifestRefs = normalizeManifestRefSpine(input.manifest_id, input.manifest_refs ?? [input.manifest_id]);
  const graphId =
    input.graph_id ??
    deriveGraphId({
      client_id: input.partition_contract.client_id,
      manifest_id: input.manifest_id,
      partition_scope_refs: input.partition_contract.partition_scope_refs,
      period_scope: input.partition_contract.period_scope_ref_or_null,
      tenant_id: input.partition_contract.tenant_id,
    });
  const sortedNodes = [...input.nodes].sort((left, right) => left.node_id.localeCompare(right.node_id));
  const sortedEdges = [...input.edges].sort((left, right) => left.edge_id.localeCompare(right.edge_id));
  const sortedPaths = [...input.paths].sort(rankGraphPath);
  if (sortedPaths.length === 0) {
    throw new Error("evidence graph requires at least one provenance path");
  }
  const primaryPath = sortedPaths.find((path) => path.path_role === "PRIMARY") ?? sortedPaths[0];
  if (!primaryPath) {
    throw new Error("evidence graph requires a primary provenance path");
  }
  const lineageBoundaries =
    input.lineage_boundaries ??
    (manifestRefs.length > 1
      ? buildLineageBoundaries({
          edges: sortedEdges,
          manifest_id: input.manifest_id,
          manifest_refs: manifestRefs,
          partition_contract: input.partition_contract,
          paths: sortedPaths,
        })
      : []);
  const pathsByTarget = new Map<string, ProvenancePathRecord[]>();
  for (const path of sortedPaths) {
    const current = pathsByTarget.get(path.target_ref) ?? [];
    current.push(path);
    pathsByTarget.set(path.target_ref, current.sort(rankGraphPath));
  }
  const targetAssessments = [...pathsByTarget.entries()].map(([targetRef, targetPaths]) => {
    const primary = targetPaths.find((path) => path.path_role === "PRIMARY") ?? targetPaths[0];
    if (!primary) {
      throw new Error(`target ${targetRef} has no candidate provenance path`);
    }
    return buildEvidenceGraphTargetAssessment({
      admissibility_state: primary.admissibility_state,
      explanation_status: primary.admissibility_state === "ADMISSIBLE" ? "AVAILABLE" : "LIMITED",
      primary_path_ref: primary.path_id,
      rejected_path_refs: targetPaths.filter((path) => path.path_id !== primary.path_id).map((path) => path.path_id),
      replayable: primary.replayable,
      support_state: primary.admissibility_state === "ADMISSIBLE" ? "SUPPORTED" : "PARTIALLY_SUPPORTED",
      target_ref: targetRef,
    });
  });
  const confidenceValues = sortedPaths.map((path) => path.weakest_support_confidence);
  const graph = buildEvidenceGraphRecord({
    built_at: input.built_at ?? "2026-04-28T00:00:00Z",
    confidence_summary: {
      admissible_critical_path_count: sortedPaths.filter((path) => path.admissibility_state === "ADMISSIBLE").length,
      limited_critical_path_count: sortedPaths.filter((path) => path.admissibility_state !== "ADMISSIBLE").length,
      primary_path_weakest_support_confidence: primaryPath.weakest_support_confidence,
      weighted_path_confidence:
        confidenceValues.reduce((total, value) => total + value, 0) / confidenceValues.length,
    },
    critical_paths_ref: artifactSetRef(
      "provenance-path-set",
      sortedPaths.map((path) => path.path_hash),
    ),
    edges_ref: artifactSetRef(
      "provenance-edge-set",
      sortedEdges.map((edge) => edge.edge_id),
    ),
    graph_id: graphId,
    lineage_boundaries: [...lineageBoundaries],
    manifest_id: input.manifest_id,
    manifest_refs: manifestRefs,
    nodes_ref: artifactSetRef(
      "provenance-node-set",
      sortedNodes.map((node) => node.node_id),
    ),
    partition_contract: input.partition_contract,
    path_ranking_basis: primaryPath.ranking_basis,
    primary_path_ref: primaryPath.path_id,
    target_assessments: targetAssessments,
  });
  const integrity = validateGraphIntegrity({
    edges: sortedEdges,
    graph,
    nodes: sortedNodes,
    paths: sortedPaths,
  });
  if (!integrity.valid) {
    throw new Error(integrity.issues.map((entry) => `${entry.code}: ${entry.detail}`).join("\n"));
  }
  const stored = await repository.persistEvidenceGraph({ graph });
  return {
    graph: stored.record as EvidenceGraphRecord,
    repository,
    stored,
  };
}
