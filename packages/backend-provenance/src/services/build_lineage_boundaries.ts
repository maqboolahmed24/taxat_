import { stableJsonHash } from "../../../domain-kernel/src/primitives/hash.ts";
import {
  type EvidenceGraphLineageBoundary,
} from "../models/evidence_graph.ts";
import { isProvenanceLineageEdge, type ProvenanceEdgeRecord } from "../models/provenance_edge.ts";
import { normalizeManifestRefSpine, type ProvenancePartitionContract, requireString } from "../models/provenance_common.ts";
import type { ProvenancePathRecord } from "../models/provenance_path.ts";

export type BuildLineageBoundariesInput = {
  edges: readonly ProvenanceEdgeRecord[];
  paths: readonly ProvenancePathRecord[];
  manifest_id: string;
  manifest_refs: readonly string[];
  partition_contract: ProvenancePartitionContract;
};

export function lineageBoundaryIdForEdge(edge: Pick<ProvenanceEdgeRecord, "edge_id">) {
  return `lineage-boundary.${stableJsonHash({ edge_id: requireString("edge_id", edge.edge_id) })}`;
}

export function buildLineageBoundaries(input: BuildLineageBoundariesInput): EvidenceGraphLineageBoundary[] {
  const manifestRefs = normalizeManifestRefSpine(input.manifest_id, input.manifest_refs);
  const manifestRefSet = new Set(manifestRefs);
  const pathRefsByLineageEdge = new Map<string, string[]>();
  const decisivePathRefsByLineageEdge = new Map<string, string[]>();

  for (const path of input.paths) {
    for (const edgeId of path.edge_refs) {
      const edge = input.edges.find((candidate) => candidate.edge_id === edgeId);
      if (!edge || !isProvenanceLineageEdge(edge)) {
        continue;
      }
      const current = pathRefsByLineageEdge.get(edge.edge_id) ?? [];
      current.push(path.path_id);
      pathRefsByLineageEdge.set(edge.edge_id, [...new Set(current)].sort());
      if (path.decisive_edge_refs.includes(edge.edge_id)) {
        const decisive = decisivePathRefsByLineageEdge.get(edge.edge_id) ?? [];
        decisive.push(path.path_id);
        decisivePathRefsByLineageEdge.set(edge.edge_id, [...new Set(decisive)].sort());
      }
    }
  }

  return input.edges
    .filter(isProvenanceLineageEdge)
    .map((edge) => {
      if (!edge.from_manifest_id || !edge.to_manifest_id || !edge.lineage_relation) {
        throw new Error(`lineage edge ${edge.edge_id} is missing explicit manifest boundary fields`);
      }
      if (!manifestRefSet.has(edge.from_manifest_id) || !manifestRefSet.has(edge.to_manifest_id)) {
        throw new Error(`lineage edge ${edge.edge_id} references manifests outside manifest_refs`);
      }
      const exposedPathRefs = pathRefsByLineageEdge.get(edge.edge_id) ?? [];
      if (exposedPathRefs.length === 0) {
        throw new Error(`lineage edge ${edge.edge_id} is not exposed by any serialized path`);
      }
      return {
        boundary_edge_ref: edge.edge_id,
        boundary_id: lineageBoundaryIdForEdge(edge),
        client_id: input.partition_contract.client_id,
        decisive_in_path_refs: decisivePathRefsByLineageEdge.get(edge.edge_id) ?? [],
        exposed_in_path_refs: exposedPathRefs,
        from_manifest_id: edge.from_manifest_id,
        partition_scope_refs: input.partition_contract.partition_scope_refs,
        period_scope_ref_or_null: input.partition_contract.period_scope_ref_or_null,
        relation: edge.lineage_relation,
        tenant_id: input.partition_contract.tenant_id,
        to_manifest_id: edge.to_manifest_id,
      };
    })
    .sort((left, right) => left.boundary_id.localeCompare(right.boundary_id));
}
