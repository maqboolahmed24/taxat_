import { evidenceGraphRef, type EvidenceGraphRecord } from "../models/evidence_graph.ts";
import {
  buildProofBundleRecord,
  type ProofBundleLimitationNote,
  type ProofBundlePurpose,
  type ProofBundleRecord,
  type ProofBundleRenderRefs,
  type ProofBundleRetentionBinding,
  type ProofBundleTargetClass,
} from "../models/proof_bundle.ts";
import { normalizeManifestRefSpine, normalizeSortedStringSet } from "../models/provenance_common.ts";
import type { ProvenancePathRecord } from "../models/provenance_path.ts";
import { ProofBundleRepository } from "../repositories/proof_bundle_repository.ts";
import { buildTargetAssessment, type ProofTargetAssessment } from "./build_target_assessments.ts";

export type BuildProofBundleInput = {
  graph: EvidenceGraphRecord;
  target_ref: string;
  paths: readonly ProvenancePathRecord[];
  target_class?: ProofBundleTargetClass;
  bundle_purpose?: ProofBundlePurpose;
  authority_required?: boolean;
  authority_closed?: boolean;
  authority_basis_refs?: readonly string[];
  authority_satisfied_path_refs?: readonly string[];
  config_basis_refs?: readonly string[];
  decisive_evidence_refs?: readonly string[];
  contradiction_refs?: readonly string[];
  stale_reason_codes?: readonly string[];
  staleness_dependency_refs?: readonly string[];
  temporal_propagation_event_refs?: readonly string[];
  silent_limitation_ambiguity_present?: boolean;
  limitation_notes?: readonly ProofBundleLimitationNote[];
  retention_binding?: ProofBundleRetentionBinding;
  render_refs?: ProofBundleRenderRefs;
  generated_at?: string;
  repository?: ProofBundleRepository;
};

export type BuiltProofBundle = {
  bundle: ProofBundleRecord;
  assessment: ProofTargetAssessment;
  repository: ProofBundleRepository;
  stored: Awaited<ReturnType<ProofBundleRepository["persistProofBundle"]>>;
};

function lineageBoundaryRefsForAssessment(graph: EvidenceGraphRecord, assessment: ProofTargetAssessment) {
  const pathBoundaryRefs = [
    ...(assessment.primary_path?.lineage_boundary_refs ?? []),
    ...assessment.rejected_paths.flatMap((path) => path.lineage_boundary_refs),
  ];
  const graphBoundaryRefs = graph.lineage_boundaries.map((boundary) => boundary.boundary_id);
  return normalizeSortedStringSet("lineage_boundary_refs", [...pathBoundaryRefs, ...graphBoundaryRefs]);
}

function decisiveLineageBoundaryRefsForAssessment(assessment: ProofTargetAssessment) {
  const primary = assessment.primary_path;
  if (!primary) {
    return [];
  }
  return normalizeSortedStringSet("decisive_lineage_boundary_refs", [
    ...primary.decisive_lineage_boundary_refs,
    ...(primary.decisive_lineage_boundary_refs.length === 0 ? primary.lineage_boundary_refs : []),
  ]);
}

function renderRefsForAssessment(input: {
  render_refs?: ProofBundleRenderRefs;
  retention_binding?: ProofBundleRetentionBinding;
  limitation_notes: readonly ProofBundleLimitationNote[];
}) {
  if (input.render_refs) {
    return input.render_refs;
  }
  const retentionLimited =
    input.retention_binding &&
    ["LIMITED", "TOMBSTONED", "PSEUDONYMISED"].includes(input.retention_binding.limitation_behavior);
  if (retentionLimited) {
    return {
      explanation_status: "LIMITED" as const,
      filing_artifact_ref: null,
      operator_render_ref: "render://proof-bundle/limited/operator",
      reviewer_render_ref: null,
    };
  }
  if (input.limitation_notes.some((note) => note.limitation_code === "SILENT_LIMITATION_AMBIGUITY")) {
    return {
      explanation_status: "LIMITED" as const,
      filing_artifact_ref: null,
      operator_render_ref: "render://proof-bundle/limited/operator",
      reviewer_render_ref: null,
    };
  }
  return undefined;
}

export async function buildProofBundle(input: BuildProofBundleInput): Promise<BuiltProofBundle> {
  const repository = input.repository ?? new ProofBundleRepository();
  const graphRef = evidenceGraphRef(input.graph);
  const manifestRefs = normalizeManifestRefSpine(input.graph.manifest_id, input.graph.manifest_refs);
  const assessment = buildTargetAssessment({
    authority_basis_refs: input.authority_basis_refs,
    authority_closed: input.authority_closed,
    authority_required: input.authority_required,
    authority_satisfied_path_refs: input.authority_satisfied_path_refs,
    bundle_purpose: input.bundle_purpose,
    config_basis_refs: input.config_basis_refs,
    contradiction_refs: input.contradiction_refs,
    decisive_evidence_refs: input.decisive_evidence_refs,
    limitation_notes: input.limitation_notes,
    paths: input.paths,
    render_refs: input.render_refs,
    retention_binding: input.retention_binding,
    silent_limitation_ambiguity_present: input.silent_limitation_ambiguity_present,
    stale_reason_codes: input.stale_reason_codes,
    staleness_dependency_refs: input.staleness_dependency_refs,
    target_class: input.target_class,
    target_ref: input.target_ref,
    temporal_propagation_event_refs: input.temporal_propagation_event_refs,
  });
  const lineageBoundaryRefs =
    manifestRefs.length > 1 ? lineageBoundaryRefsForAssessment(input.graph, assessment) : [];
  const decisiveLineageBoundaryRefs =
    manifestRefs.length > 1 ? decisiveLineageBoundaryRefsForAssessment(assessment) : [];
  const retentionBinding = assessment.retention_binding ?? {
    limitation_behavior: "FULL" as const,
    minimum_available_until: null,
    retention_tag_ref: "retention-tag://proof-bundle/full",
  };
  const limitationNotes = assessment.limitation_notes;
  const bundle = buildProofBundleRecord({
    admissibility_state: assessment.admissibility_state,
    authority_basis_refs: assessment.authority_basis_refs,
    bundle_purpose: assessment.bundle_purpose,
    closure_state: assessment.closure_state,
    config_basis_refs: assessment.config_basis_refs,
    contradiction_refs: assessment.contradiction_refs,
    decisive_evidence_refs: assessment.decisive_evidence_refs,
    decisive_lineage_boundary_refs: decisiveLineageBoundaryRefs,
    decisive_path_refs: assessment.decisive_path_refs,
    generated_at: input.generated_at ?? input.graph.built_at ?? "2026-04-28T00:00:00Z",
    graph_ref: graphRef,
    lifecycle_state: "GENERATED",
    limitation_notes: limitationNotes,
    lineage_boundary_refs: lineageBoundaryRefs,
    manifest_id: input.graph.manifest_id,
    manifest_refs: manifestRefs,
    partition_contract: input.graph.partition_contract,
    primary_path_ref: assessment.primary_path_ref,
    proof_closure_contract: assessment.proof_closure_contract,
    rejected_path_entries: assessment.rejected_path_entries,
    rejected_path_refs: assessment.rejected_path_refs,
    render_refs: renderRefsForAssessment({
      limitation_notes: limitationNotes,
      render_refs: assessment.render_refs,
      retention_binding: retentionBinding,
    }),
    replay_recipe: {
      deterministic_order_basis: ["PROOF_CLOSURE_V1", "PROOF_PATH_SELECTION_V1"],
      lineage_boundary_refs: lineageBoundaryRefs,
      manifest_refs: manifestRefs,
      path_ref_order: [
        ...(assessment.primary_path_ref ? [assessment.primary_path_ref] : []),
        ...assessment.rejected_path_refs,
      ],
      replayable: assessment.replayable,
      required_artifact_refs: normalizeSortedStringSet("replay_recipe.required_artifact_refs", [
        graphRef,
        ...assessment.decisive_path_refs,
        ...assessment.rejected_path_refs,
        ...assessment.decisive_evidence_refs,
        ...assessment.authority_basis_refs,
        ...assessment.config_basis_refs,
        ...assessment.staleness_dependency_refs,
        ...assessment.temporal_propagation_event_refs,
      ], { minItems: 1 }),
    },
    retention_binding: retentionBinding,
    stale_reason_codes: assessment.stale_reason_codes,
    staleness_dependency_refs: assessment.staleness_dependency_refs,
    support_state: assessment.support_state,
    target_class: assessment.target_class,
    target_ref: assessment.target_ref,
    temporal_propagation_event_refs: assessment.temporal_propagation_event_refs,
  });
  const stored = await repository.persistProofBundle({ bundle });
  return {
    assessment,
    bundle: stored.record,
    repository,
    stored,
  };
}
