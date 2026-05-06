import type { CanonicalJsonValue } from "../../../domain-kernel/src/primitives/hash.ts";

import {
  normalizeStringSet,
  requireTrimmedString,
} from "../services/principal_context_normalizer.ts";
import { canonicalHashDigest } from "./canonical_hash_serializer.ts";

export type DependencyTopologyHashNodeInput = {
  node_ref: string;
  version_ref?: string | null;
};

export type DependencyTopologyHashEdgeInput = {
  edge_ref?: string;
  edge_type: string;
  from_node_ref: string;
  to_node_ref: string;
  version_ref?: string | null;
};

export type DependencyTopologyHashVector = {
  edge_list: Array<{
    edge_ref: string;
    edge_type: string;
    from_node_ref: string;
    to_node_ref: string;
    version_ref: string | null;
  }>;
  edge_weight_profile_ref: string;
  impacted_node_ids: string[];
  node_weight_profile_ref: string;
  referenced_object_version_refs: string[];
};

export type DependencyTopologyHashMaterialization = {
  dependency_topology_hash: string;
  referenced_object_version_refs: string[];
  vector: DependencyTopologyHashVector;
};

function edgeOrderingKey(edge: {
  edge_ref: string;
  edge_type: string;
  from_node_ref: string;
  to_node_ref: string;
  version_ref: string | null;
}) {
  return [
    edge.from_node_ref,
    edge.to_node_ref,
    edge.edge_type,
    edge.version_ref ?? "",
    edge.edge_ref,
  ].join("::");
}

export function buildDependencyTopologyHashVector(input: {
  edge_weight_profile_ref: string;
  edges: readonly DependencyTopologyHashEdgeInput[];
  node_weight_profile_ref: string;
  nodes: readonly DependencyTopologyHashNodeInput[];
}): DependencyTopologyHashVector {
  const nodes = [...input.nodes]
    .map((node) => ({
      node_ref: requireTrimmedString("dependency_topology.nodes[].node_ref", node.node_ref),
      version_ref:
        node.version_ref === undefined || node.version_ref === null
          ? null
          : requireTrimmedString(
              `dependency_topology.nodes[${node.node_ref}].version_ref`,
              node.version_ref,
            ),
    }))
    .sort((left, right) => left.node_ref.localeCompare(right.node_ref));

  const edges = [...input.edges]
    .map((edge, index) => {
      const from_node_ref = requireTrimmedString(
        "dependency_topology.edges[].from_node_ref",
        edge.from_node_ref,
      );
      const to_node_ref = requireTrimmedString(
        "dependency_topology.edges[].to_node_ref",
        edge.to_node_ref,
      );
      const edge_type = requireTrimmedString(
        "dependency_topology.edges[].edge_type",
        edge.edge_type,
      );
      return {
        from_node_ref,
        to_node_ref,
        edge_type,
        edge_ref:
          edge.edge_ref === undefined
            ? `${from_node_ref}->${to_node_ref}:${edge_type}`
            : requireTrimmedString("dependency_topology.edges[].edge_ref", edge.edge_ref),
        version_ref:
          edge.version_ref === undefined || edge.version_ref === null
            ? null
            : requireTrimmedString(
                `dependency_topology.edges[${index}].version_ref`,
                edge.version_ref,
              ),
      };
    })
    .sort((left, right) => edgeOrderingKey(left).localeCompare(edgeOrderingKey(right)));

  return {
    impacted_node_ids: nodes.map((node) => node.node_ref),
    edge_list: edges.map((edge) => ({
      from_node_ref: edge.from_node_ref,
      to_node_ref: edge.to_node_ref,
      edge_type: edge.edge_type,
      edge_ref: edge.edge_ref,
      version_ref: edge.version_ref,
    })),
    node_weight_profile_ref: requireTrimmedString(
      "node_weight_profile_ref",
      input.node_weight_profile_ref,
    ),
    edge_weight_profile_ref: requireTrimmedString(
      "edge_weight_profile_ref",
      input.edge_weight_profile_ref,
    ),
    referenced_object_version_refs: normalizeStringSet(
      "referenced_object_version_refs",
      [
        ...nodes.flatMap((node) => (node.version_ref === null ? [] : [node.version_ref])),
        ...edges.flatMap((edge) => (edge.version_ref === null ? [] : [edge.version_ref])),
      ],
    ),
  } satisfies CanonicalJsonValue as DependencyTopologyHashVector;
}

export function materializeDependencyTopologyHash(input: {
  edge_weight_profile_ref: string;
  edges: readonly DependencyTopologyHashEdgeInput[];
  node_weight_profile_ref: string;
  nodes: readonly DependencyTopologyHashNodeInput[];
}): DependencyTopologyHashMaterialization {
  const vector = buildDependencyTopologyHashVector(input);
  return {
    vector,
    dependency_topology_hash: canonicalHashDigest(vector),
    referenced_object_version_refs: [...vector.referenced_object_version_refs],
  };
}

export function buildDependencyTopologyHash(input: {
  edge_weight_profile_ref: string;
  edges: readonly DependencyTopologyHashEdgeInput[];
  node_weight_profile_ref: string;
  nodes: readonly DependencyTopologyHashNodeInput[];
}) {
  return materializeDependencyTopologyHash(input).dependency_topology_hash;
}
