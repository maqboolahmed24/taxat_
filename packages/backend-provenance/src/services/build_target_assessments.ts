import {
  type ProofClosureContract,
} from "../models/evidence_graph.ts";
import {
  type ProofBundleClosureState,
  type ProofBundleLimitationNote,
  type ProofBundleRejectedPathEntry,
  type ProofBundleRenderRefs,
  type ProofBundleRetentionBinding,
  type ProofBundleSupportState,
  type ProofBundleTargetClass,
  type ProofBundlePurpose,
} from "../models/proof_bundle.ts";
import { normalizeSortedStringSet } from "../models/provenance_common.ts";
import type { ProvenancePathRecord } from "../models/provenance_path.ts";
import { buildDefensibleProofClosureContract } from "./build_proof_closure_contract.ts";
import { selectPrimaryProofPath } from "./select_primary_proof_path.ts";

export type ProofTargetAssessmentInput = {
  target_ref: string;
  target_class?: ProofBundleTargetClass;
  bundle_purpose?: ProofBundlePurpose;
  paths: readonly ProvenancePathRecord[];
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
  replay_closed?: boolean;
};

export type ProofTargetAssessment = {
  target_ref: string;
  target_class: ProofBundleTargetClass;
  bundle_purpose: ProofBundlePurpose;
  support_state: ProofBundleSupportState;
  admissibility_state: "ADMISSIBLE" | "LIMITED" | "INADMISSIBLE";
  closure_state: ProofBundleClosureState;
  proof_closure_contract: ProofClosureContract;
  primary_path: ProvenancePathRecord | null;
  rejected_paths: ProvenancePathRecord[];
  ordered_paths: ProvenancePathRecord[];
  primary_path_ref: string | null;
  decisive_path_refs: string[];
  rejected_path_refs: string[];
  rejected_path_entries: ProofBundleRejectedPathEntry[];
  decisive_evidence_refs: string[];
  authority_basis_refs: string[];
  config_basis_refs: string[];
  contradiction_refs: string[];
  stale_reason_codes: string[];
  staleness_dependency_refs: string[];
  temporal_propagation_event_refs: string[];
  limitation_notes: ProofBundleLimitationNote[];
  retention_binding?: ProofBundleRetentionBinding;
  render_refs?: ProofBundleRenderRefs;
  replayable: boolean;
  authority_closed: boolean;
  replay_closed: boolean;
  controlling: boolean;
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

export function buildTargetAssessment(input: ProofTargetAssessmentInput): ProofTargetAssessment {
  const selection = selectPrimaryProofPath({
    authority_satisfied_path_refs: input.authority_satisfied_path_refs,
    paths: input.paths,
    target_ref: input.target_ref,
  });
  const primary = selection.primary_path;
  const authorityBasisRefs = normalizeSortedStringSet("authority_basis_refs", input.authority_basis_refs ?? []);
  const authorityClosed = input.authority_closed ?? (!input.authority_required || authorityBasisRefs.length > 0);
  const silentLimitation = Boolean(input.silent_limitation_ambiguity_present);
  const contradictionRefs = normalizeSortedStringSet("contradiction_refs", [
    ...(input.contradiction_refs ?? []),
    ...(primary?.contradiction_refs ?? []),
  ]);
  const staleReasonCodes = normalizeSortedStringSet("stale_reason_codes", input.stale_reason_codes ?? []);
  const stalenessDependencyRefs = normalizeSortedStringSet(
    "staleness_dependency_refs",
    input.staleness_dependency_refs ?? [],
  );
  const temporalPropagationEventRefs = normalizeSortedStringSet(
    "temporal_propagation_event_refs",
    input.temporal_propagation_event_refs ?? [],
  );
  const replayClosed = input.replay_closed ?? Boolean(primary?.replayable ?? false);

  let supportState: ProofBundleSupportState;
  if (!primary || silentLimitation || !authorityClosed || !replayClosed) {
    supportState = "UNSUPPORTED";
  } else if (staleReasonCodes.length > 0) {
    supportState = "STALE";
  } else if (contradictionRefs.length > 0) {
    supportState = "CONTRADICTED";
  } else if (primary.admissibility_state === "ADMISSIBLE") {
    supportState = "SUPPORTED";
  } else {
    supportState = "PARTIALLY_SUPPORTED";
  }

  const pathless = supportState === "UNSUPPORTED";
  const primaryPathRef = pathless ? null : primary?.path_id ?? null;
  const rejectedPaths = pathless ? [] : selection.rejected_paths;
  const rejectedPathEntries = pathless ? [] : selection.rejected_path_entries;
  const decisivePathRefs = primaryPathRef ? [primaryPathRef] : [];
  const generatedNotes = [...(input.limitation_notes ?? [])];
  if (!primary) {
    generatedNotes.push(
      limitationNote({
        affected_refs: [input.target_ref],
        limitation_code: "NO_DECISIVE_SUPPORT_PATH",
        note_class: "MISSING_SUPPORT",
        note_id: `limitation.${input.target_ref}.missing-support`,
      }),
    );
  }
  if (silentLimitation) {
    generatedNotes.push(
      limitationNote({
        affected_refs: [input.target_ref, ...(primary ? [primary.path_id] : [])],
        limitation_code: "SILENT_LIMITATION_AMBIGUITY",
        note_class: "MISSING_SUPPORT",
        note_id: `limitation.${input.target_ref}.silent-ambiguity`,
      }),
    );
  }
  if (!authorityClosed) {
    generatedNotes.push(
      limitationNote({
        affected_refs: [input.target_ref, ...(primary ? [primary.path_id] : [])],
        limitation_code: "AUTHORITY_CLOSURE_FAILURE",
        note_class: "AUTHORITY_LIMIT",
        note_id: `limitation.${input.target_ref}.authority-open`,
      }),
    );
  }
  if (primary && !replayClosed) {
    generatedNotes.push(
      limitationNote({
        affected_refs: [input.target_ref, primary.path_id],
        limitation_code: "REPLAY_CLOSURE_FAILURE",
        note_class: "MISSING_SUPPORT",
        note_id: `limitation.${input.target_ref}.replay-open`,
      }),
    );
  }

  const proofClosure = buildDefensibleProofClosureContract({
    authority_closed: authorityClosed,
    contradiction_isolated: contradictionRefs.length === 0,
    current_decisive_anchor_present: Boolean(primaryPathRef),
    replay_closed: replayClosed,
    silent_limitation_ambiguity_present: silentLimitation,
    staleness_invalidated: staleReasonCodes.length > 0,
    support_closed: supportState !== "UNSUPPORTED",
    support_state: supportState,
  });

  return {
    admissibility_state:
      supportState === "SUPPORTED" ? "ADMISSIBLE" : supportState === "UNSUPPORTED" ? "INADMISSIBLE" : "LIMITED",
    authority_basis_refs: authorityBasisRefs,
    authority_closed: authorityClosed,
    bundle_purpose: input.bundle_purpose ?? "FILING_DEFENCE",
    closure_state: proofClosure.closure_state,
    config_basis_refs: normalizeSortedStringSet("config_basis_refs", input.config_basis_refs ?? []),
    contradiction_refs: contradictionRefs,
    controlling: ["SUPPORTED", "PARTIALLY_SUPPORTED"].includes(supportState),
    decisive_evidence_refs: normalizeSortedStringSet("decisive_evidence_refs", input.decisive_evidence_refs ?? []),
    decisive_path_refs: decisivePathRefs,
    limitation_notes: generatedNotes,
    ordered_paths: selection.ordered_paths,
    primary_path: pathless ? null : primary,
    primary_path_ref: primaryPathRef,
    proof_closure_contract: proofClosure.proof_closure_contract,
    rejected_path_entries: rejectedPathEntries,
    rejected_path_refs: rejectedPaths.map((path) => path.path_id),
    rejected_paths: rejectedPaths,
    render_refs: input.render_refs,
    replay_closed: replayClosed,
    replayable: proofClosure.proof_closure_contract.replay_closed,
    retention_binding: input.retention_binding,
    stale_reason_codes: staleReasonCodes,
    staleness_dependency_refs: stalenessDependencyRefs,
    support_state: supportState,
    target_class: input.target_class ?? "FIGURE",
    target_ref: input.target_ref,
    temporal_propagation_event_refs: temporalPropagationEventRefs,
  };
}

export function buildTargetAssessments(inputs: readonly ProofTargetAssessmentInput[]) {
  return [...inputs].map((input) => buildTargetAssessment(input)).sort((left, right) => left.target_ref.localeCompare(right.target_ref));
}
