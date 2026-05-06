import {
  buildProvenanceNodeRecord,
  normalizeProvenanceNodeRecord,
  type ProvenanceNodeBuildInput,
  type ProvenanceNodeRecord,
} from "../models/provenance_node.ts";
import { ProvenanceNodeRepository } from "../repositories/provenance_node_repository.ts";

export type RegisterProvenanceNodesInput = {
  nodes: readonly (ProvenanceNodeRecord | ProvenanceNodeBuildInput)[];
  repository?: ProvenanceNodeRepository;
};

export async function registerProvenanceNodes(input: RegisterProvenanceNodesInput) {
  const repository = input.repository ?? new ProvenanceNodeRepository();
  const stored = [];
  for (const nodeInput of input.nodes) {
    const node =
      "node_id" in nodeInput && nodeInput.node_id
        ? normalizeProvenanceNodeRecord(nodeInput as ProvenanceNodeRecord)
        : buildProvenanceNodeRecord(nodeInput as ProvenanceNodeBuildInput);
    stored.push(await repository.persistProvenanceNode({ node }));
  }
  return {
    nodes: stored.map((entry) => entry.record),
    repository,
    stored,
  };
}
