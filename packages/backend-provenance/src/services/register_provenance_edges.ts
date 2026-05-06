import {
  buildProvenanceEdgeRecord,
  normalizeProvenanceEdgeRecord,
  type ProvenanceEdgeBuildInput,
  type ProvenanceEdgeRecord,
} from "../models/provenance_edge.ts";
import { ProvenanceEdgeRepository } from "../repositories/provenance_edge_repository.ts";

export type RegisterProvenanceEdgesInput = {
  edges: readonly (ProvenanceEdgeRecord | ProvenanceEdgeBuildInput)[];
  repository?: ProvenanceEdgeRepository;
};

export async function registerProvenanceEdges(input: RegisterProvenanceEdgesInput) {
  const repository = input.repository ?? new ProvenanceEdgeRepository();
  const stored = [];
  for (const edgeInput of input.edges) {
    const edge =
      "edge_id" in edgeInput && edgeInput.edge_id
        ? normalizeProvenanceEdgeRecord(edgeInput as ProvenanceEdgeRecord)
        : buildProvenanceEdgeRecord(edgeInput as ProvenanceEdgeBuildInput);
    stored.push(await repository.persistProvenanceEdge({ edge }));
  }
  return {
    edges: stored.map((entry) => entry.record),
    repository,
    stored,
  };
}
