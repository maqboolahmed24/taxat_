import { expect, test } from "@playwright/test";

import {
  buildProvenancePathRecord,
  type ProvenancePathRecord,
  selectPrimaryProofPath,
} from "../../../packages/backend-provenance/src/index.ts";

const generated_at = "2026-04-28T12:30:00Z";
const partition_contract = {
  client_id: "client-0129",
  contract_version: "PROVENANCE_PARTITION_V1" as const,
  cross_manifest_traversal_policy: "EXPLICIT_BOUNDARY_EDGES_ONLY" as const,
  partition_scope_refs: ["vat"],
  period_scope_ref_or_null: "2026-Q1",
  scope_widening_policy: "NO_TENANT_CLIENT_OR_SCOPE_WIDENING" as const,
  tenant_id: "tenant-0129",
};

function path(
  path_id: string,
  extra: Partial<ProvenancePathRecord> & {
    edge_refs?: string[];
    node_refs?: string[];
  } = {},
) {
  const edgeRefs = extra.edge_refs ?? [`edge://${path_id}/1`];
  const nodeRefs = extra.node_refs ?? [`node://${path_id}/target`, `node://${path_id}/anchor`];
  return buildProvenancePathRecord({
    anchor_class: extra.anchor_class ?? "SOURCE_RECORD",
    anchor_ref: extra.anchor_ref ?? nodeRefs[nodeRefs.length - 1],
    decisive_edge_refs: extra.decisive_edge_refs ?? [edgeRefs[0]],
    edge_refs: edgeRefs,
    generated_at,
    graph_id: "graph-0129-selector",
    manifest_id: "manifest-0129",
    manifest_refs: ["manifest-0129"],
    node_refs: nodeRefs,
    partition_contract,
    path_id,
    target_ref: "target://vat-box-1",
    weakest_support_confidence: extra.weakest_support_confidence ?? 1,
    ...extra,
  });
}

test("selects primary path using the proof contract ranking ladder", () => {
  const limitedHighConfidence = path("path-b-limited-high-confidence", {
    edge_refs: ["edge://limited/1"],
    limitation_codes: ["INFERRED_DECISIVE_SEGMENT"],
    node_refs: ["node://limited/target", "node://limited/anchor"],
    weakest_support_confidence: 1,
  });
  const admissibleLowerConfidence = path("path-a-admissible-lower-confidence", {
    edge_refs: ["edge://admissible/1"],
    node_refs: ["node://admissible/target", "node://admissible/anchor"],
    weakest_support_confidence: 0.88,
  });
  const contradicted = path("path-c-contradicted", {
    admissibility_state: "LIMITED",
    contradiction_refs: ["contradiction://explicit"],
    edge_refs: ["edge://contradicted/1"],
    node_refs: ["node://contradicted/target", "node://contradicted/anchor"],
    weakest_support_confidence: 0.99,
  });

  const forward = selectPrimaryProofPath({
    paths: [limitedHighConfidence, admissibleLowerConfidence, contradicted],
    target_ref: "target://vat-box-1",
  });
  const reversed = selectPrimaryProofPath({
    paths: [contradicted, admissibleLowerConfidence, limitedHighConfidence],
    target_ref: "target://vat-box-1",
  });

  expect(forward.primary_path?.path_id).toBe(admissibleLowerConfidence.path_id);
  expect(reversed.primary_path?.path_id).toBe(forward.primary_path?.path_id);
  expect(forward.rejected_path_entries.map((entry) => entry.path_ref)).toEqual(
    forward.rejected_paths.map((candidate) => candidate.path_id),
  );
  expect(forward.rejected_path_entries.map((entry) => entry.path_rank)).toEqual([2, 3]);
  expect(forward.rejected_path_entries[1]).toMatchObject({
    path_ref: contradicted.path_id,
    rejection_class: "CONTRADICTS_PRIMARY",
  });
});

test("removes material duplicates but preserves distinct rejected paths", () => {
  const primary = path("path-a-primary", {
    edge_refs: ["edge://primary/1"],
    node_refs: ["node://primary/target", "node://primary/anchor"],
    weakest_support_confidence: 0.97,
  });
  const duplicate = path("path-z-duplicate", {
    anchor_ref: "node://primary/anchor",
    edge_refs: ["edge://primary/1"],
    node_refs: ["node://primary/target", "node://primary/anchor"],
    weakest_support_confidence: 0.97,
  });
  const distinct = path("path-b-distinct", {
    edge_refs: ["edge://distinct/1"],
    node_refs: ["node://distinct/target", "node://distinct/anchor"],
    weakest_support_confidence: 0.96,
  });

  const selection = selectPrimaryProofPath({
    paths: [duplicate, distinct, primary],
    target_ref: "target://vat-box-1",
  });

  expect(selection.ordered_paths.map((candidate) => candidate.path_id)).toEqual([
    primary.path_id,
    distinct.path_id,
  ]);
  expect(selection.rejected_path_entries).toEqual([
    {
      path_rank: 2,
      path_ref: distinct.path_id,
      rejection_class: "WEAKER_SUPPORT",
      rejection_reason_codes: ["LOWER_RANKED_BY_PROOF_PATH_SELECTION_V1"],
    },
  ]);
});
