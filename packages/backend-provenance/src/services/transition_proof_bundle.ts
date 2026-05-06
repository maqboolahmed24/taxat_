import {
  buildProofBundleRecord,
  proofBundleRef,
  type ProofBundleLimitationNote,
  type ProofBundleRecord,
  type ProofBundleRetentionBinding,
} from "../models/proof_bundle.ts";
import { normalizeSortedStringSet } from "../models/provenance_common.ts";
import { buildDefensibleProofClosureContract } from "./build_proof_closure_contract.ts";

export type ProofBundleTransition =
  | {
      kind: "LIMIT";
      retention_binding: ProofBundleRetentionBinding;
      limitation_notes: readonly ProofBundleLimitationNote[];
    }
  | {
      kind: "MARK_STALE";
      stale_reason_codes: readonly string[];
      staleness_dependency_refs: readonly string[];
      temporal_propagation_event_refs: readonly string[];
    }
  | {
      kind: "SUPERSEDE";
      superseded_by_bundle_ref: string;
      limitation_notes?: readonly ProofBundleLimitationNote[];
    };

export function isControllingProofBundle(bundle: Pick<ProofBundleRecord, "lifecycle_state" | "support_state" | "closure_state">) {
  return (
    ["GENERATED", "LIMITED"].includes(bundle.lifecycle_state) &&
    ["SUPPORTED", "PARTIALLY_SUPPORTED"].includes(bundle.support_state) &&
    bundle.closure_state === "CLOSED"
  );
}

export function transitionProofBundle(bundle: ProofBundleRecord, transition: ProofBundleTransition): ProofBundleRecord {
  if (transition.kind === "SUPERSEDE") {
    return buildProofBundleRecord({
      ...bundle,
      lifecycle_state: "SUPERSEDED",
      limitation_notes: [...bundle.limitation_notes, ...(transition.limitation_notes ?? [])],
      superseded_by_bundle_ref: transition.superseded_by_bundle_ref,
    });
  }

  if (transition.kind === "LIMIT") {
    const limitationNotes = [...bundle.limitation_notes, ...transition.limitation_notes];
    const supportState = bundle.support_state === "SUPPORTED" ? "PARTIALLY_SUPPORTED" : bundle.support_state;
    return buildProofBundleRecord({
      ...bundle,
      admissibility_state: bundle.admissibility_state === "ADMISSIBLE" ? "LIMITED" : bundle.admissibility_state,
      lifecycle_state: "LIMITED",
      limitation_notes: limitationNotes,
      render_refs: {
        explanation_status: "LIMITED",
        filing_artifact_ref: null,
        operator_render_ref: `render://proof-bundle/${bundle.proof_bundle_id}/limited/operator`,
        reviewer_render_ref: null,
      },
      retention_binding: transition.retention_binding,
      support_state: supportState,
    });
  }

  const staleReasonCodes = normalizeSortedStringSet("stale_reason_codes", transition.stale_reason_codes, {
    minItems: 1,
  });
  const temporalPropagationEventRefs = normalizeSortedStringSet(
    "temporal_propagation_event_refs",
    transition.temporal_propagation_event_refs,
    { minItems: 1 },
  );
  const stalenessDependencyRefs = normalizeSortedStringSet("staleness_dependency_refs", [
    ...transition.staleness_dependency_refs,
    ...temporalPropagationEventRefs,
  ], { minItems: 1 });
  const closure = buildDefensibleProofClosureContract({
    authority_closed: bundle.proof_closure_contract.authority_closed,
    contradiction_isolated: bundle.contradiction_refs.length === 0,
    current_decisive_anchor_present: Boolean(bundle.primary_path_ref),
    replay_closed: bundle.proof_closure_contract.replay_closed,
    staleness_invalidated: true,
    support_closed: bundle.support_state !== "UNSUPPORTED",
    support_state: "STALE",
  });

  return buildProofBundleRecord({
    ...bundle,
    admissibility_state: "LIMITED",
    closure_state: "OPEN",
    lifecycle_state: "STALE",
    proof_closure_contract: closure.proof_closure_contract,
    stale_reason_codes: staleReasonCodes,
    staleness_dependency_refs: stalenessDependencyRefs,
    support_state: "STALE",
    temporal_propagation_event_refs: temporalPropagationEventRefs,
  });
}

export function supersedingBundleRef(bundle: Pick<ProofBundleRecord, "proof_bundle_id"> | string) {
  return proofBundleRef(bundle);
}
