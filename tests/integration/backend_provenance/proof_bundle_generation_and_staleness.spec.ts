import { execFile } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

import { expect, test } from "@playwright/test";

import {
  buildEvidenceGraph,
  buildProofBundle,
  buildProvenanceEdgeRecord,
  buildProvenanceNodeRecord,
  deriveGraphId,
  deriveNodeGraphAddress,
  enumerateCandidatePaths,
  isControllingProofBundle,
  type ProvenanceNodeRecord,
  reconstructProofBundleForReplay,
  supersedingBundleRef,
  transitionProofBundle,
} from "../../../packages/backend-provenance/src/index.ts";

const execFileAsync = promisify(execFile);
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const createdAt = "2026-04-28T12:45:00Z";

async function validateProofBundleContract(payload: unknown) {
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
    validate_proof_bundle,
)

payload = json.loads(sys.argv[2])
schema = load_json(repo / "packages" / "contracts-core" / "schemas" / "proof_bundle.schema.json")
validator = Draft202012Validator(
    schema,
    registry=build_registry(),
    format_checker=Draft202012Validator.FORMAT_CHECKER,
)
issues = [
    f"{'/'.join(map(str, error.absolute_path)) or '<root>'}: {error.message}"
    for error in sorted(validator.iter_errors(payload), key=lambda error: list(error.absolute_path))
]
issues.extend(f"{issue.location}: {issue.message}" for issue in validate_proof_bundle(payload, "proof_bundle"))
if issues:
    raise SystemExit("\\n".join(issues))
`;

  await execFileAsync(path.join(repoRoot, ".venv", "bin", "python3"), [
    "-c",
    script,
    repoRoot,
    JSON.stringify(payload),
  ]);
}

function graphFixture() {
  const manifest_id = "manifest-0129-integration";
  const prior_manifest_id = "manifest-0128-integration";
  const tenant_id = "tenant-0129";
  const client_id = "client-0129";
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
  const activity = node("AC_EVALUATE_GATE", "activity://0129/evaluate-gate");
  const gate = node("EN_GATE_DECISION", "gate://0129");
  const evidence = node("EN_EVIDENCE_ITEM", "evidence://0129");
  const currentSource = node("EN_SOURCE_RECORD", "source://0129/current");
  const priorSource = node("EN_SOURCE_RECORD", "source://0129/prior", prior_manifest_id);
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
      edge(gate, evidence, "ED_SUPPORTS", { support_confidence: 0.98 }),
      edge(evidence, currentSource, "ED_EXTRACTED_FROM", { support_confidence: 0.94 }),
      edge(currentSource, priorSource, "ED_CONTINUES", {
        from_manifest_id: manifest_id,
        lineage_relation: "ED_CONTINUES",
        support_confidence: 0.91,
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

test("generates a schema-valid proof bundle and preserves stale/superseded history", async () => {
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
  const builtGraph = await buildEvidenceGraph({
    built_at: createdAt,
    edges: data.edges,
    graph_id: data.graph_id,
    manifest_id: data.manifest_id,
    manifest_refs: data.manifest_refs,
    nodes: data.nodes,
    partition_contract: data.partition_contract,
    paths: paths.paths,
  });
  const proof = await buildProofBundle({
    generated_at: createdAt,
    graph: builtGraph.graph,
    paths: paths.paths,
    target_ref: data.target.node_id,
  });

  await validateProofBundleContract(proof.bundle);
  expect(proof.bundle.support_state).toBe("SUPPORTED");
  expect(proof.bundle.primary_path_ref).toBe(
    paths.paths.find((candidate) => candidate.path_role === "PRIMARY")?.path_id,
  );
  expect(isControllingProofBundle(proof.bundle)).toBe(true);

  const stale = transitionProofBundle(proof.bundle, {
    kind: "MARK_STALE",
    stale_reason_codes: ["LATE_DATA_INVALIDATED_DECISIVE_SUPPORT"],
    staleness_dependency_refs: ["source://0129/late-data"],
    temporal_propagation_event_refs: ["temporal-event://0129/late-data"],
  });
  await validateProofBundleContract(stale);

  const replay = reconstructProofBundleForReplay({
    bundle: stale,
    graph: builtGraph.graph,
    paths: paths.paths,
  });
  expect(replay).toMatchObject({
    bundle_hash_verified: true,
    graph_ref_verified: true,
    missing_artifact_refs: [],
    replayable: true,
    unresolved_path_refs: [],
  });
  expect(isControllingProofBundle(stale)).toBe(false);

  const replacement = await buildProofBundle({
    generated_at: "2026-04-28T13:00:00Z",
    graph: builtGraph.graph,
    paths: paths.paths,
    target_ref: data.target.node_id,
  });
  const superseded = transitionProofBundle(proof.bundle, {
    kind: "SUPERSEDE",
    superseded_by_bundle_ref: supersedingBundleRef(replacement.bundle),
  });
  await validateProofBundleContract(superseded);
  expect(superseded.lifecycle_state).toBe("SUPERSEDED");
  expect(isControllingProofBundle(superseded)).toBe(false);
});
