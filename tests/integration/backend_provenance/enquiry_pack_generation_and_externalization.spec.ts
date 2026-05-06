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
  generateEnquiryPack,
  type ProvenanceNodeRecord,
} from "../../../packages/backend-provenance/src/index.ts";

const execFileAsync = promisify(execFile);
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const createdAt = "2026-04-28T14:15:00Z";

async function validateEnquiryPackContract(payload: unknown) {
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
    validate_enquiry_pack,
)

payload = json.loads(sys.argv[2])
schema = load_json(repo / "packages" / "contracts-core" / "schemas" / "enquiry_pack.schema.json")
validator = Draft202012Validator(
    schema,
    registry=build_registry(),
    format_checker=Draft202012Validator.FORMAT_CHECKER,
)
issues = [
    f"{'/'.join(map(str, error.absolute_path)) or '<root>'}: {error.message}"
    for error in sorted(validator.iter_errors(payload), key=lambda error: list(error.absolute_path))
]
issues.extend(f"{issue.location}: {issue.message}" for issue in validate_enquiry_pack(payload, "enquiry_pack"))
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
  const manifest_id = "manifest-0130-integration";
  const prior_manifest_id = "manifest-0129-integration";
  const tenant_id = "tenant-0130";
  const client_id = "client-0130";
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
  const activity = node("AC_EVALUATE_GATE", "activity://0130/evaluate-gate");
  const gate = node("EN_GATE_DECISION", "gate://0130");
  const evidence = node("EN_EVIDENCE_ITEM", "evidence://0130");
  const currentSource = node("EN_SOURCE_RECORD", "source://0130/current");
  const priorSource = node("EN_SOURCE_RECORD", "source://0130/prior", prior_manifest_id);
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

async function proofFixture() {
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
  const graph = await buildEvidenceGraph({
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
    graph: graph.graph,
    paths: paths.paths,
    target_ref: data.target.node_id,
  });
  return {
    graph: graph.graph,
    paths: paths.paths,
    proof: proof.bundle,
  };
}

test("generates available, limited, and failed schema-valid enquiry packs", async () => {
  const fixture = await proofFixture();
  const available = await generateEnquiryPack({
    generated_at: createdAt,
    graph: fixture.graph,
    paths: fixture.paths,
    proof_bundle: fixture.proof,
  });

  await validateEnquiryPackContract(available.pack);
  expect(available.pack.explanation_status).toBe("AVAILABLE");
  expect(available.pack.primary_path_ref).toBe(fixture.proof.primary_path_ref);
  expect(available.pack.critical_path_refs).toContain(available.pack.primary_path_ref);
  expect(available.pack.externalization_governance_contract.eligibility_state).toBe("READY");

  const limited = await generateEnquiryPack({
    explanation_status: "LIMITED",
    generated_at: "2026-04-28T14:16:00Z",
    graph: fixture.graph,
    paths: fixture.paths,
    proof_bundle: fixture.proof,
    retention_binding: {
      limitation_behavior: "LIMITED",
      minimum_available_until: "2026-12-31T00:00:00Z",
      retention_tag_ref: "retention-tag://limited",
    },
  });

  await validateEnquiryPackContract(limited.pack);
  expect(limited.pack.masking_posture).toBe("LIMITED_EXPORT");
  expect(limited.pack.omission_entries.some((entry) => entry.omission_class === "RETENTION")).toBe(
    true,
  );
  expect(limited.pack.externalization_governance_contract.eligibility_state).toBe("LIMITED_READY");

  const failed = await generateEnquiryPack({
    explanation_status: "FAILED",
    generated_at: "2026-04-28T14:17:00Z",
    graph: fixture.graph,
    paths: fixture.paths,
    proof_bundle: fixture.proof,
  });

  await validateEnquiryPackContract(failed.pack);
  expect(failed.pack.render_contract).toEqual({
    filing_artifact_ref: null,
    operator_render_ref: null,
    reviewer_render_ref: null,
  });
  expect(failed.pack.externalization_governance_contract).toMatchObject({
    download_target_ref_or_null: null,
    eligibility_state: "BLOCKED",
    preview_target_ref_or_null: null,
  });
});
