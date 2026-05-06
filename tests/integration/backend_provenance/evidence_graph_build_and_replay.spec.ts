import { execFile } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

import { expect, test } from "@playwright/test";

import {
  buildEvidenceGraph,
  buildProvenanceEdgeRecord,
  buildProvenanceNodeRecord,
  deriveGraphId,
  deriveNodeGraphAddress,
  enumerateCandidatePaths,
  type ProvenanceNodeRecord,
} from "../../../packages/backend-provenance/src/index.ts";

const execFileAsync = promisify(execFile);
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const createdAt = "2026-04-28T12:20:00Z";

async function validateContract(kind: string, payload: unknown) {
  const script = `
import json
import pathlib
import sys

repo = pathlib.Path(sys.argv[1])
sys.path.insert(0, str(repo / "packages" / "contracts-core" / "python"))
from validate_contracts import (  # type: ignore
    Draft202012Validator,
    build_registry,
    load_json,
    validate_evidence_graph,
    validate_provenance_path,
)

kind = sys.argv[2]
payload = json.loads(sys.argv[3])
schema = load_json(repo / "packages" / "contracts-core" / "schemas" / f"{kind}.schema.json")
validator = Draft202012Validator(
    schema,
    registry=build_registry(),
    format_checker=Draft202012Validator.FORMAT_CHECKER,
)
issues = [
    f"{'/'.join(map(str, error.absolute_path)) or '<root>'}: {error.message}"
    for error in sorted(validator.iter_errors(payload), key=lambda error: list(error.absolute_path))
]
if kind == "provenance_path":
    issues.extend(f"{issue.location}: {issue.message}" for issue in validate_provenance_path(payload, "provenance_path"))
if kind == "evidence_graph":
    issues.extend(f"{issue.location}: {issue.message}" for issue in validate_evidence_graph(payload, "evidence_graph"))
if issues:
    raise SystemExit("\\n".join(issues))
`;

  await execFileAsync(path.join(repoRoot, ".venv", "bin", "python3"), [
    "-c",
    script,
    repoRoot,
    kind,
    JSON.stringify(payload),
  ]);
}

function graphFixture() {
  const manifest_id = "manifest-0128-integration";
  const prior_manifest_id = "manifest-0127-integration";
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
  const node = (
    node_family: ProvenanceNodeRecord["node_family"],
    object_ref: string,
    manifest = manifest_id,
  ) =>
    buildProvenanceNodeRecord({
      business_partition,
      client_id,
      created_at: createdAt,
      graph_address: deriveNodeGraphAddress({
        business_partition,
        client_id,
        graph_id,
        manifest_id: manifest,
        node_family,
        object_ref,
        period_scope,
        tenant_id,
      }),
      graph_id,
      manifest_id: manifest,
      node_family,
      object_ref,
      period_scope,
      tenant_id,
    });
  const activity = node("AC_EVALUATE_GATE", "activity://integration/evaluate-gate");
  const gate = node("EN_GATE_DECISION", "gate://integration");
  const evidence = node("EN_EVIDENCE_ITEM", "evidence://integration");
  const currentSource = node("EN_SOURCE_RECORD", "source://integration/current");
  const priorSource = node("EN_SOURCE_RECORD", "source://integration/prior", prior_manifest_id);
  const edge = (
    from: ProvenanceNodeRecord,
    to: ProvenanceNodeRecord,
    edge_type: ReturnType<typeof buildProvenanceEdgeRecord>["edge_type"],
    extra: Partial<ReturnType<typeof buildProvenanceEdgeRecord>> = {},
  ) =>
    buildProvenanceEdgeRecord({
      business_partition,
      client_id,
      created_at: createdAt,
      edge_type,
      from_node_id: from.node_id,
      graph_id,
      manifest_id,
      originating_activity_ref: activity.node_id,
      period_scope,
      tenant_id,
      to_node_id: to.node_id,
      ...extra,
    });
  return {
    anchor: priorSource,
    edges: [
      edge(activity, gate, "ED_GENERATED"),
      edge(gate, evidence, "ED_SUPPORTS", { support_confidence: 0.95 }),
      edge(evidence, currentSource, "ED_EXTRACTED_FROM", { support_confidence: 0.9 }),
      edge(currentSource, priorSource, "ED_CONTINUES", {
        from_manifest_id: manifest_id,
        lineage_relation: "ED_CONTINUES",
        support_confidence: 0.88,
        to_manifest_id: prior_manifest_id,
      }),
    ],
    graph_id,
    manifest_id,
    manifest_refs: [manifest_id, prior_manifest_id],
    nodes: [activity, gate, evidence, currentSource, priorSource],
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

test("builds a schema-valid evidence graph and replays to the same graph hash", async () => {
  const data = graphFixture();
  const paths = await enumerateCandidatePaths({
    anchor_refs: [data.anchor.node_id],
    edges: data.edges,
    generated_at: createdAt,
    graph_id: data.graph_id,
    manifest_id: data.manifest_id,
    manifest_refs: data.manifest_refs,
    nodes: data.nodes,
    partition_contract: data.partition_contract,
    targets: [data.target.node_id],
  });
  const built = await buildEvidenceGraph({
    built_at: createdAt,
    edges: data.edges,
    graph_id: data.graph_id,
    manifest_id: data.manifest_id,
    manifest_refs: data.manifest_refs,
    nodes: data.nodes,
    partition_contract: data.partition_contract,
    paths: paths.paths,
  });
  const replay = await buildEvidenceGraph({
    built_at: createdAt,
    edges: [...data.edges].reverse(),
    graph_id: data.graph_id,
    manifest_id: data.manifest_id,
    manifest_refs: [...data.manifest_refs].reverse(),
    nodes: [...data.nodes].reverse(),
    partition_contract: data.partition_contract,
    paths: [...paths.paths].reverse(),
  });

  for (const node of data.nodes) {
    await validateContract("provenance_node", node);
  }
  for (const edge of data.edges) {
    await validateContract("provenance_edge", edge);
  }
  for (const path of paths.paths) {
    await validateContract("provenance_path", path);
  }
  await validateContract("evidence_graph", built.graph);

  expect(built.graph.graph_hash).toBe(replay.graph.graph_hash);
  expect(built.graph.lineage_boundaries).toHaveLength(1);
  expect(built.graph.primary_path_ref).toBe(
    paths.paths.find((path) => path.path_role === "PRIMARY")?.path_id,
  );
});
