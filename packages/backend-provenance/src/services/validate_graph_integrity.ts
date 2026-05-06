import type { EvidenceGraphRecord } from "../models/evidence_graph.ts";
import { isProvenanceLineageEdge, type ProvenanceEdgeRecord } from "../models/provenance_edge.ts";
import type { ProvenanceNodeRecord } from "../models/provenance_node.ts";
import type { ProvenancePathRecord } from "../models/provenance_path.ts";
import { lineageBoundaryIdForEdge } from "./build_lineage_boundaries.ts";

export type GraphIntegrityIssue = {
  code: string;
  detail: string;
  ref?: string;
};

export type GraphIntegrityResult = {
  valid: boolean;
  issues: GraphIntegrityIssue[];
  integrity_summary: {
    unsupported_critical_target_count: number;
    contradicted_critical_target_count: number;
    stale_critical_target_count: number;
    open_critical_target_count: number;
    replay_failure_target_count: number;
    missing_proof_bundle_target_count: number;
    explanation_failure_count: number;
    rebuild_required: boolean;
  };
};

const GENERATED_ACTIVITY_REQUIRED_FAMILIES = new Set([
  "EN_COMPUTE_RESULT",
  "EN_PARITY_RESULT",
  "EN_GATE_DECISION",
  "EN_TRUST_SUMMARY",
  "EN_EVIDENCE_GRAPH",
  "EN_TWIN_VIEW",
  "EN_FILING_PACKET",
  "EN_FILING_FIELD",
  "EN_SUBMISSION_RECORD",
  "EN_PROOF_BUNDLE",
  "EN_DRIFT_RECORD",
  "EN_ERROR_RECORD",
  "EN_COMPENSATION_RECORD",
  "EN_RETENTION_ACTION",
  "EN_AUTHORITY_RESPONSE",
]);

function issue(code: string, detail: string, ref?: string): GraphIntegrityIssue {
  return ref === undefined ? { code, detail } : { code, detail, ref };
}

function deriveTargetIntegritySummary(graph: EvidenceGraphRecord | undefined, rebuildRequired: boolean) {
  const filingCritical = (graph?.target_assessments ?? []).filter((assessment) => assessment.filing_critical);
  return {
    contradicted_critical_target_count: filingCritical.filter((assessment) => assessment.support_state === "CONTRADICTED").length,
    explanation_failure_count: filingCritical.filter((assessment) => assessment.explanation_status === "FAILED").length,
    missing_proof_bundle_target_count: filingCritical.filter(
      (assessment) => assessment.support_state !== "UNSUPPORTED" && assessment.proof_bundle_ref === null,
    ).length,
    open_critical_target_count: filingCritical.filter((assessment) => assessment.closure_state === "OPEN").length,
    rebuild_required: rebuildRequired,
    replay_failure_target_count: filingCritical.filter((assessment) => !assessment.replayable).length,
    stale_critical_target_count: filingCritical.filter((assessment) => assessment.support_state === "STALE").length,
    unsupported_critical_target_count: filingCritical.filter((assessment) => assessment.support_state === "UNSUPPORTED").length,
  };
}

export function validateGraphIntegrity(input: {
  nodes: readonly ProvenanceNodeRecord[];
  edges: readonly ProvenanceEdgeRecord[];
  paths: readonly ProvenancePathRecord[];
  graph?: EvidenceGraphRecord;
}): GraphIntegrityResult {
  const issues: GraphIntegrityIssue[] = [];
  const nodeById = new Map(input.nodes.map((node) => [node.node_id, node] as const));
  const edgeById = new Map(input.edges.map((edge) => [edge.edge_id, edge] as const));

  for (const edge of input.edges) {
    const from = nodeById.get(edge.from_node_id);
    const to = nodeById.get(edge.to_node_id);
    if (!from) {
      issues.push(issue("EDGE_FROM_NODE_MISSING", `edge ${edge.edge_id} references missing from_node_id`, edge.edge_id));
    }
    if (!to) {
      issues.push(issue("EDGE_TO_NODE_MISSING", `edge ${edge.edge_id} references missing to_node_id`, edge.edge_id));
    }
    if (from && to) {
      for (const field of ["graph_id", "tenant_id", "client_id", "business_partition", "period_scope"] as const) {
        if (edge[field] !== from[field] || edge[field] !== to[field]) {
          issues.push(issue("EDGE_PARTITION_MISMATCH", `edge ${edge.edge_id} does not stay within node ${field} partition`, edge.edge_id));
        }
      }
      if (isProvenanceLineageEdge(edge)) {
        if (from.manifest_id !== edge.from_manifest_id || to.manifest_id !== edge.to_manifest_id) {
          issues.push(issue("LINEAGE_EDGE_ENDPOINT_INVALID", `lineage edge ${edge.edge_id} endpoints must mirror from/to manifest ids`, edge.edge_id));
        }
      } else if (edge.manifest_id !== from.manifest_id || edge.manifest_id !== to.manifest_id) {
        issues.push(issue("EDGE_PARTITION_MISMATCH", `edge ${edge.edge_id} does not stay within node manifest partition`, edge.edge_id));
      }
    }
    if (edge.edge_type === "ED_CONTRADICTS" && edge.contradicted_by_refs.length === 0) {
      issues.push(issue("CONTRADICTION_COLLAPSED", `contradiction edge ${edge.edge_id} lost contradicted_by_refs`, edge.edge_id));
    }
  }

  for (const node of input.nodes) {
    if (!GENERATED_ACTIVITY_REQUIRED_FAMILIES.has(node.node_family)) {
      continue;
    }
    const incomingGenerated = input.edges.filter(
      (edge) => edge.to_node_id === node.node_id && edge.edge_type === "ED_GENERATED",
    );
    if (incomingGenerated.length === 0) {
      issues.push(issue("GENERATING_ACTIVITY_MISSING", `${node.node_family} node ${node.node_id} has no inbound ED_GENERATED edge`, node.node_id));
      continue;
    }
    if (node.node_family === "EN_GATE_DECISION") {
      const gateActivityFound = incomingGenerated.some((edge) => nodeById.get(edge.from_node_id)?.node_family === "AC_EVALUATE_GATE");
      if (!gateActivityFound) {
        issues.push(issue("GATE_ACTIVITY_MISSING", `gate decision node ${node.node_id} must be generated by AC_EVALUATE_GATE`, node.node_id));
      }
    }
  }

  for (const path of input.paths) {
    if (path.node_refs.length !== path.edge_refs.length + 1) {
      issues.push(issue("PATH_SHAPE_INVALID", `path ${path.path_id} node/edge cardinality is invalid`, path.path_id));
      continue;
    }
    const supportConfidences: number[] = [];
    for (let index = 0; index < path.edge_refs.length; index += 1) {
      const edgeId = path.edge_refs[index];
      if (edgeId === undefined) {
        issues.push(issue("PATH_EDGE_MISSING", `path ${path.path_id} has an undefined edge ref`, path.path_id));
        continue;
      }
      const edge = edgeById.get(edgeId);
      if (!edge) {
        issues.push(issue("PATH_EDGE_MISSING", `path ${path.path_id} references missing edge ${edgeId}`, path.path_id));
        continue;
      }
      supportConfidences.push(edge.support_confidence);
      if (edge.from_node_id !== path.node_refs[index] || edge.to_node_id !== path.node_refs[index + 1]) {
        issues.push(issue("PATH_EDGE_ORDER_INVALID", `path ${path.path_id} edge ${edgeId} does not connect adjacent node_refs`, path.path_id));
      }
      if (isProvenanceLineageEdge(edge)) {
        const boundaryId = lineageBoundaryIdForEdge(edge);
        if (!path.lineage_boundary_refs.includes(boundaryId)) {
          issues.push(issue("PATH_LINEAGE_BOUNDARY_MISSING", `path ${path.path_id} omits lineage boundary ${boundaryId}`, path.path_id));
        }
      }
    }
    const expectedWeakest = supportConfidences.length ? Math.min(...supportConfidences) : 1;
    if (Math.abs(path.weakest_support_confidence - expectedWeakest) > 1e-9) {
      issues.push(issue("PATH_CONFIDENCE_INVALID", `path ${path.path_id} weakest support confidence must equal edge minimum`, path.path_id));
    }
    for (const nodeId of path.node_refs) {
      if (!nodeById.has(nodeId)) {
        issues.push(issue("PATH_NODE_MISSING", `path ${path.path_id} references missing node ${nodeId}`, path.path_id));
      }
    }
  }

  if (input.graph) {
    const rootPrimaryPath = input.paths.find((path) => path.path_id === input.graph?.primary_path_ref);
    if (!rootPrimaryPath) {
      issues.push(issue("GRAPH_PRIMARY_PATH_MISSING", `graph ${input.graph.graph_id} primary_path_ref does not resolve`, input.graph.graph_id));
    }
    const expectedProofRefs = [
      ...new Set(
        input.graph.target_assessments
          .map((assessment) => assessment.proof_bundle_ref)
          .filter((ref): ref is string => typeof ref === "string"),
      ),
    ].sort();
    if (JSON.stringify(expectedProofRefs) !== JSON.stringify([...input.graph.proof_bundle_refs].sort())) {
      issues.push(issue("GRAPH_PROOF_REF_MISMATCH", `graph ${input.graph.graph_id} proof_bundle_refs do not mirror target assessments`, input.graph.graph_id));
    }
  }

  const rebuildRequired = issues.length > 0 || input.graph?.integrity_summary.rebuild_required === true;
  const integritySummary = deriveTargetIntegritySummary(input.graph, rebuildRequired);
  return {
    integrity_summary: integritySummary,
    issues,
    valid: issues.length === 0,
  };
}

export function assertGraphIntegrity(input: Parameters<typeof validateGraphIntegrity>[0]) {
  const result = validateGraphIntegrity(input);
  if (!result.valid) {
    throw new Error(result.issues.map((entry) => `${entry.code}: ${entry.detail}`).join("\n"));
  }
  return result;
}
