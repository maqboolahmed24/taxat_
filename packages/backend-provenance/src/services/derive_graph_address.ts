import { stableJsonHash } from "../../../domain-kernel/src/primitives/hash.ts";
import { normalizeNullableString, normalizeSortedStringSet, requireString } from "../models/provenance_common.ts";
import type { ProvenanceNodeFamily } from "../models/provenance_node.ts";

export type GraphAddressInput = {
  manifest_id: string;
  tenant_id: string;
  client_id?: string | null;
  business_partition?: string | null;
  period_scope?: string | null;
  partition_scope_refs?: readonly string[];
  graph_version?: string;
};

function encodeAddressSegment(value: string | null) {
  return encodeURIComponent(value ?? "none").replace(/[!'()*]/g, (character) =>
    `%${character.charCodeAt(0).toString(16).toUpperCase()}`,
  );
}

export function deriveGraphId(input: GraphAddressInput) {
  return `evidence-graph.${stableJsonHash({
    business_partition: normalizeNullableString("business_partition", input.business_partition),
    client_id: normalizeNullableString("client_id", input.client_id),
    graph_version: requireString("graph_version", input.graph_version ?? "PROVENANCE_GRAPH_V1"),
    manifest_id: requireString("manifest_id", input.manifest_id),
    partition_scope_refs: normalizeSortedStringSet("partition_scope_refs", input.partition_scope_refs ?? []),
    period_scope: normalizeNullableString("period_scope", input.period_scope),
    tenant_id: requireString("tenant_id", input.tenant_id),
  })}`;
}

export function deriveGraphAddress(input: GraphAddressInput & { graph_id?: string | null }) {
  const graphId = input.graph_id ?? deriveGraphId(input);
  return [
    "provenance-graph:",
    encodeAddressSegment(input.tenant_id),
    encodeAddressSegment(input.client_id ?? null),
    encodeAddressSegment(input.business_partition ?? null),
    encodeAddressSegment(input.period_scope ?? null),
    encodeAddressSegment(input.manifest_id),
    encodeAddressSegment(graphId),
  ].join("/");
}

export function deriveNodeGraphAddress(
  input: GraphAddressInput & {
    graph_id?: string | null;
    node_family: ProvenanceNodeFamily;
    object_ref: string;
  },
) {
  const graphId = input.graph_id ?? deriveGraphId(input);
  const graphAddress = deriveGraphAddress({ ...input, graph_id: graphId });
  return `${graphAddress}/nodes/${encodeAddressSegment(input.node_family)}/${stableJsonHash({
    node_family: input.node_family,
    object_ref: requireString("object_ref", input.object_ref),
  })}`;
}
