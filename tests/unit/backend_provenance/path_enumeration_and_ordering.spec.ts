import { expect, test } from "@playwright/test";

import {
  buildProvenanceEdgeRecord,
  buildProvenanceNodeRecord,
  deriveGraphId,
  deriveNodeGraphAddress,
  enumerateCandidatePaths,
  type ProvenanceNodeRecord,
} from "../../../packages/backend-provenance/src/index.ts";

const createdAt = "2026-04-28T12:10:00Z";

function pathFixture() {
  const manifest_id = "manifest-0128-path";
  const tenant_id = "tenant-0128";
  const client_id = "client-0128";
  const business_partition = "vat";
  const period_scope = "2026-Q1";
  const graph_id = deriveGraphId({
    business_partition,
    client_id,
    manifest_id,
    period_scope,
    tenant_id,
  });
  const node = (node_family: ProvenanceNodeRecord["node_family"], object_ref: string) =>
    buildProvenanceNodeRecord({
      business_partition,
      client_id,
      created_at: createdAt,
      graph_address: deriveNodeGraphAddress({
        business_partition,
        client_id,
        graph_id,
        manifest_id,
        node_family,
        object_ref,
        period_scope,
        tenant_id,
      }),
      graph_id,
      manifest_id,
      node_family,
      object_ref,
      period_scope,
      tenant_id,
    });
  const activity = node("AC_EVALUATE_GATE", "activity://path");
  const gate = node("EN_GATE_DECISION", "gate://path");
  const evidenceA = node("EN_EVIDENCE_ITEM", "evidence://a");
  const evidenceB = node("EN_EVIDENCE_ITEM", "evidence://b");
  const source = node("EN_SOURCE_RECORD", "source://path");
  const edge = (from: ProvenanceNodeRecord, to: ProvenanceNodeRecord, confidence: number) =>
    buildProvenanceEdgeRecord({
      business_partition,
      client_id,
      created_at: createdAt,
      edge_type: "ED_SUPPORTS",
      from_node_id: from.node_id,
      graph_id,
      manifest_id,
      originating_activity_ref: activity.node_id,
      period_scope,
      support_confidence: confidence,
      tenant_id,
      to_node_id: to.node_id,
    });
  return {
    anchor: source,
    edges: [
      buildProvenanceEdgeRecord({
        business_partition,
        client_id,
        created_at: createdAt,
        edge_type: "ED_GENERATED",
        from_node_id: activity.node_id,
        graph_id,
        manifest_id,
        originating_activity_ref: activity.node_id,
        period_scope,
        tenant_id,
        to_node_id: gate.node_id,
      }),
      edge(gate, evidenceA, 0.9),
      edge(evidenceA, source, 0.9),
      edge(gate, evidenceB, 0.8),
      edge(evidenceB, source, 0.8),
    ],
    graph_id,
    manifest_id,
    nodes: [activity, gate, evidenceA, evidenceB, source],
    partition_contract: {
      client_id,
      contract_version: "PROVENANCE_PARTITION_V1" as const,
      cross_manifest_traversal_policy: "EXPLICIT_BOUNDARY_EDGES_ONLY" as const,
      partition_scope_refs: [business_partition],
      period_scope_ref_or_null: period_scope,
      scope_widening_policy: "NO_TENANT_CLIENT_OR_SCOPE_WIDENING" as const,
      tenant_id,
    },
    target: gate,
  };
}

test("enumerates deterministic candidate paths and promotes the strongest primary path", async () => {
  const data = pathFixture();
  const forward = await enumerateCandidatePaths({
    anchor_refs: [data.anchor.node_id],
    edges: data.edges,
    generated_at: createdAt,
    graph_id: data.graph_id,
    manifest_id: data.manifest_id,
    nodes: data.nodes,
    partition_contract: data.partition_contract,
    targets: [data.target.node_id],
  });
  const reversed = await enumerateCandidatePaths({
    anchor_refs: [data.anchor.node_id],
    edges: [...data.edges].reverse(),
    generated_at: createdAt,
    graph_id: data.graph_id,
    manifest_id: data.manifest_id,
    nodes: [...data.nodes].reverse(),
    partition_contract: data.partition_contract,
    targets: [data.target.node_id],
  });

  expect(forward.paths.map((path) => path.path_id).sort()).toEqual(
    reversed.paths.map((path) => path.path_id).sort(),
  );
  const primary = forward.paths.find((path) => path.path_role === "PRIMARY");
  expect(primary?.weakest_support_confidence).toBe(0.9);
  expect(primary?.ranking_basis.map((basis) => basis.rank_order)).toEqual([1, 2, 3, 4, 5, 6, 7]);
});
