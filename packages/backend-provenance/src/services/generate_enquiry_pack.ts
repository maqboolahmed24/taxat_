import { evidenceGraphRef, type EvidenceGraphLineageBoundary, type EvidenceGraphRecord } from "../models/evidence_graph.ts";
import {
  buildEnquiryPackRecord,
  deriveEnquiryPackId,
  type EnquiryPackExplanationStatus,
  type EnquiryPackRecord,
  type EnquiryPackTargetClass,
} from "../models/enquiry_pack.ts";
import {
  proofBundleRef,
  type ProofBundleLimitationNote,
  type ProofBundleRecord,
  type ProofBundleRetentionBinding,
} from "../models/proof_bundle.ts";
import { normalizeManifestRefSpine, normalizeSortedStringSet, ProvenanceModelError } from "../models/provenance_common.ts";
import type { ProvenancePathRecord } from "../models/provenance_path.ts";
import { EnquiryPackRepository } from "../repositories/enquiry_pack_repository.ts";
import { buildExternalizationGovernance } from "./build_externalization_governance.ts";
import { buildMaskingPosture } from "./build_masking_posture.ts";
import { buildOmissionEntries } from "./build_omission_entries.ts";
import { buildRenderContract } from "./build_render_contract.ts";

export type GenerateEnquiryPackInput = {
  graph: EvidenceGraphRecord;
  proof_bundle: ProofBundleRecord;
  paths?: readonly ProvenancePathRecord[];
  target_class?: EnquiryPackTargetClass;
  explanation_status?: EnquiryPackExplanationStatus;
  critical_path_refs?: readonly string[];
  supporting_evidence_refs?: readonly string[];
  transformation_step_refs?: readonly string[];
  config_refs?: readonly string[];
  override_refs?: readonly string[];
  authority_refs?: readonly string[];
  audit_refs?: readonly string[];
  limitation_notes?: readonly ProofBundleLimitationNote[];
  retention_binding?: ProofBundleRetentionBinding;
  generated_at?: string;
  repository?: EnquiryPackRepository;
};

export type GeneratedEnquiryPack = {
  pack: EnquiryPackRecord;
  repository: EnquiryPackRepository;
  stored: Awaited<ReturnType<EnquiryPackRepository["persistEnquiryPack"]>>;
};

function limitationNote(input: {
  note_id: string;
  limitation_code: string;
  note_class: ProofBundleLimitationNote["note_class"];
  affected_refs: readonly string[];
}): ProofBundleLimitationNote {
  return {
    affected_refs: normalizeSortedStringSet("limitation_notes.affected_refs", input.affected_refs, {
      minItems: 1,
    }),
    limitation_code: input.limitation_code,
    note_class: input.note_class,
    note_id: input.note_id,
  };
}

function criticalPathRefs(input: GenerateEnquiryPackInput) {
  const primaryPathRef = input.proof_bundle.primary_path_ref;
  if (!primaryPathRef) {
    throw new ProvenanceModelError(
      "PROVENANCE_CONTRACT_INVALID",
      "EnquiryPack generation requires a proof bundle primary_path_ref",
    );
  }
  const refs = input.critical_path_refs?.length
    ? [...input.critical_path_refs]
    : [primaryPathRef, ...input.proof_bundle.rejected_path_refs];
  return [
    primaryPathRef,
    ...normalizeSortedStringSet("critical_path_refs", refs.filter((ref) => ref !== primaryPathRef)),
  ];
}

function pathDerivedTransformationRefs(paths: readonly ProvenancePathRecord[] | undefined, criticalRefs: readonly string[]) {
  if (!paths) {
    return [];
  }
  const criticalSet = new Set(criticalRefs);
  return normalizeSortedStringSet(
    "transformation_step_refs",
    paths.filter((path) => criticalSet.has(path.path_id)).flatMap((path) => path.edge_refs),
  );
}

function lineageBoundariesForPack(
  graph: EvidenceGraphRecord,
  criticalRefs: readonly string[],
): EvidenceGraphLineageBoundary[] {
  if (graph.manifest_refs.length <= 1) {
    return [];
  }
  const criticalSet = new Set(criticalRefs);
  return graph.lineage_boundaries
    .map((boundary) => {
      const exposed = boundary.exposed_in_path_refs.filter((pathRef) => criticalSet.has(pathRef));
      if (exposed.length === 0) {
        return null;
      }
      const decisive = boundary.decisive_in_path_refs.filter((pathRef) => exposed.includes(pathRef));
      return {
        ...boundary,
        decisive_in_path_refs: decisive,
        exposed_in_path_refs: exposed,
      };
    })
    .filter((boundary): boundary is EvidenceGraphLineageBoundary => boundary !== null)
    .sort((left, right) => left.boundary_id.localeCompare(right.boundary_id));
}

function explanationStatusForProof(
  proof: ProofBundleRecord,
  retentionBinding: ProofBundleRetentionBinding,
  requested?: EnquiryPackExplanationStatus,
) {
  if (requested) {
    return requested;
  }
  if (proof.render_refs.explanation_status === "FAILED") {
    return "FAILED";
  }
  if (
    proof.render_refs.explanation_status === "LIMITED" ||
    ["LIMITED", "TOMBSTONED", "PSEUDONYMISED"].includes(retentionBinding.limitation_behavior)
  ) {
    return "LIMITED";
  }
  return "AVAILABLE";
}

function limitationNotesForPack(input: {
  proof: ProofBundleRecord;
  explicit?: readonly ProofBundleLimitationNote[];
  critical_refs: readonly string[];
  proof_bundle_ref: string;
  explanation_status: EnquiryPackExplanationStatus;
  retention_binding: ProofBundleRetentionBinding;
}) {
  const notes = [...input.proof.limitation_notes, ...(input.explicit ?? [])];
  const retentionLimited = ["LIMITED", "TOMBSTONED", "PSEUDONYMISED"].includes(
    input.retention_binding.limitation_behavior,
  );
  const criticalRefs = [...input.critical_refs, input.proof_bundle_ref];
  const hasRetentionNote = notes.some(
    (note) =>
      (note.note_class === "RETENTION" || note.note_class === "PRIVACY") &&
      note.affected_refs.some((ref) => criticalRefs.includes(ref)),
  );
  if (retentionLimited && !hasRetentionNote) {
    notes.push(
      limitationNote({
        affected_refs: criticalRefs,
        limitation_code: "RETENTION_LIMITED_EXPLANATION_MATERIAL",
        note_class: "RETENTION",
        note_id: `limitation.${input.proof.proof_bundle_id}.retention-limited-enquiry`,
      }),
    );
  }
  if (input.explanation_status === "FAILED" && notes.length === 0) {
    notes.push(
      limitationNote({
        affected_refs: criticalRefs,
        limitation_code: "RENDER_FAILED_EXPLANATION_MATERIAL_UNAVAILABLE",
        note_class: "MISSING_SUPPORT",
        note_id: `limitation.${input.proof.proof_bundle_id}.render-failed`,
      }),
    );
  }
  if (input.explanation_status === "LIMITED" && notes.length === 0) {
    notes.push(
      limitationNote({
        affected_refs: criticalRefs,
        limitation_code: "LIMITED_EXPLANATION_MATERIAL",
        note_class: "MISSING_SUPPORT",
        note_id: `limitation.${input.proof.proof_bundle_id}.limited-explanation`,
      }),
    );
  }
  return notes.sort((left, right) => left.note_id.localeCompare(right.note_id));
}

export async function generateEnquiryPack(input: GenerateEnquiryPackInput): Promise<GeneratedEnquiryPack> {
  const repository = input.repository ?? new EnquiryPackRepository();
  const proof = input.proof_bundle;
  const primaryPathRef = proof.primary_path_ref;
  if (!primaryPathRef) {
    throw new ProvenanceModelError(
      "PROVENANCE_CONTRACT_INVALID",
      "proof bundle must retain primary_path_ref before enquiry pack generation",
    );
  }
  const graphRef = evidenceGraphRef(input.graph);
  const proofRef = proofBundleRef(proof);
  const manifestRefs = normalizeManifestRefSpine(input.graph.manifest_id, input.graph.manifest_refs);
  const criticalRefs = criticalPathRefs(input);
  const retentionBinding = input.retention_binding ?? proof.retention_binding;
  const explanationStatus = explanationStatusForProof(proof, retentionBinding, input.explanation_status);
  const generatedAt = input.generated_at ?? input.graph.built_at ?? proof.generated_at;
  const enquiryPackId = deriveEnquiryPackId({
    critical_path_refs: criticalRefs,
    explanation_status: explanationStatus,
    generated_at: generatedAt,
    graph_ref: graphRef,
    manifest_id: input.graph.manifest_id,
    primary_path_ref: primaryPathRef,
    proof_bundle_ref: proofRef,
    target_ref: proof.target_ref,
  });
  const humanReadableRef = `render://enquiry-pack/${enquiryPackId}/human`;
  const machineReadableRef = `render://enquiry-pack/${enquiryPackId}/machine`;
  const limitationNotes = limitationNotesForPack({
    critical_refs: criticalRefs,
    explicit: input.limitation_notes,
    explanation_status: explanationStatus,
    proof,
    proof_bundle_ref: proofRef,
    retention_binding: retentionBinding,
  });
  const maskingPosture = buildMaskingPosture({
    explanation_status: explanationStatus,
    limitation_notes: limitationNotes,
    retention_binding: retentionBinding,
  });
  const omissionEntries = buildOmissionEntries({
    critical_path_refs: criticalRefs,
    explanation_status: explanationStatus,
    limitation_notes: limitationNotes,
    masking_posture: maskingPosture,
    primary_path_ref: primaryPathRef,
    proof_bundle_ref: proofRef,
    retention_binding: retentionBinding,
  });
  const renderContract = buildRenderContract({
    enquiry_pack_id: enquiryPackId,
    explanation_status: explanationStatus,
  });
  const pack = buildEnquiryPackRecord({
    audit_refs: normalizeSortedStringSet("audit_refs", [
      ...(input.audit_refs ?? []),
      `audit://proof-bundle/${proof.proof_bundle_id}`,
      `audit://evidence-graph/${input.graph.graph_id}`,
    ], { minItems: 1 }),
    authority_refs: normalizeSortedStringSet("authority_refs", [
      ...proof.authority_basis_refs,
      ...(input.authority_refs ?? []),
    ]),
    config_refs: normalizeSortedStringSet("config_refs", [
      ...proof.config_basis_refs,
      ...(input.config_refs ?? []),
    ]),
    critical_path_refs: criticalRefs,
    enquiry_pack_id: enquiryPackId,
    explanation_status: explanationStatus,
    externalization_governance_contract: buildExternalizationGovernance({
      explanation_status: explanationStatus,
      human_readable_ref: humanReadableRef,
      limitation_notes: limitationNotes,
      machine_readable_ref: machineReadableRef,
      masking_posture: maskingPosture,
      omission_entries: omissionEntries,
      retention_binding: retentionBinding,
      target_ref: proof.target_ref,
      tenant_id: input.graph.partition_contract.tenant_id,
    }),
    generated_at: generatedAt,
    graph_ref: graphRef,
    human_readable_ref: humanReadableRef,
    limitation_notes: limitationNotes,
    lineage_boundaries: lineageBoundariesForPack(input.graph, criticalRefs),
    machine_readable_ref: machineReadableRef,
    manifest_id: input.graph.manifest_id,
    manifest_refs: manifestRefs,
    masking_posture: maskingPosture,
    omission_entries: omissionEntries,
    override_refs: normalizeSortedStringSet("override_refs", input.override_refs ?? []),
    partition_contract: input.graph.partition_contract,
    primary_path_ref: primaryPathRef,
    proof_bundle_ref: proofRef,
    render_contract: renderContract,
    retention_binding: retentionBinding,
    supporting_evidence_refs: normalizeSortedStringSet("supporting_evidence_refs", [
      ...proof.decisive_evidence_refs,
      ...(input.supporting_evidence_refs ?? []),
    ]),
    target_class: input.target_class ?? proof.target_class,
    target_ref: proof.target_ref,
    transformation_step_refs: normalizeSortedStringSet("transformation_step_refs", [
      ...pathDerivedTransformationRefs(input.paths, criticalRefs),
      ...(input.transformation_step_refs ?? []),
    ]),
  });
  const stored = await repository.persistEnquiryPack({ pack });
  return {
    pack: stored.record,
    repository,
    stored,
  };
}
