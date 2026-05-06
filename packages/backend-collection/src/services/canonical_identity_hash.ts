import {
  deriveCollectionControlHash,
  normalizeCollectionString,
  normalizeCollectionStringSet,
} from "../models/collection_control_common.ts";
import type {
  CandidateAdjustmentBindingRecord,
  CandidateFactFamily,
} from "../types/candidate_fact_draft.ts";

export type CanonicalLogicalIdentityInput = {
  adjustment_binding: CandidateAdjustmentBindingRecord | null;
  collection_boundary_ref: string;
  execution_mode: string;
  fact_family: CandidateFactFamily;
  manifest_id: string;
  normalization_context_ref: string;
  partition_scope: string;
  value_payload_ref: string;
};

export type CanonicalIdentityHashInput = CanonicalLogicalIdentityInput & {
  evidence_lineage_hash: string;
  promoted_from_candidate_fact_refs: readonly string[];
  source_record_lineage_hash: string;
};

export function deriveCanonicalDedupeKey(input: CanonicalLogicalIdentityInput) {
  return `canonical-dedupe://${deriveCollectionControlHash({
    artifact_family: "CANONICAL_DEDUPE_KEY",
    payload: {
      adjustment_binding: input.adjustment_binding,
      collection_boundary_ref: normalizeCollectionString(
        "canonical_identity.collection_boundary_ref",
        input.collection_boundary_ref,
      ),
      execution_mode: normalizeCollectionString(
        "canonical_identity.execution_mode",
        input.execution_mode,
      ),
      fact_family: input.fact_family,
      manifest_id: normalizeCollectionString("canonical_identity.manifest_id", input.manifest_id),
      normalization_context_ref: normalizeCollectionString(
        "canonical_identity.normalization_context_ref",
        input.normalization_context_ref,
      ),
      partition_scope: normalizeCollectionString(
        "canonical_identity.partition_scope",
        input.partition_scope,
      ),
      value_payload_ref: normalizeCollectionString(
        "canonical_identity.value_payload_ref",
        input.value_payload_ref,
      ),
    },
  })}`;
}

export function deriveCanonicalIdentityHash(input: CanonicalIdentityHashInput) {
  return `canonical-identity-hash://${deriveCollectionControlHash({
    artifact_family: "CANONICAL_IDENTITY",
    payload: {
      adjustment_binding: input.adjustment_binding,
      collection_boundary_ref: normalizeCollectionString(
        "canonical_identity.collection_boundary_ref",
        input.collection_boundary_ref,
      ),
      evidence_lineage_hash: normalizeCollectionString(
        "canonical_identity.evidence_lineage_hash",
        input.evidence_lineage_hash,
      ),
      execution_mode: normalizeCollectionString(
        "canonical_identity.execution_mode",
        input.execution_mode,
      ),
      fact_family: input.fact_family,
      manifest_id: normalizeCollectionString("canonical_identity.manifest_id", input.manifest_id),
      normalization_context_ref: normalizeCollectionString(
        "canonical_identity.normalization_context_ref",
        input.normalization_context_ref,
      ),
      partition_scope: normalizeCollectionString(
        "canonical_identity.partition_scope",
        input.partition_scope,
      ),
      promoted_from_candidate_fact_refs: normalizeCollectionStringSet(
        "canonical_identity.promoted_from_candidate_fact_refs",
        input.promoted_from_candidate_fact_refs,
        { minItems: 1 },
      ),
      source_record_lineage_hash: normalizeCollectionString(
        "canonical_identity.source_record_lineage_hash",
        input.source_record_lineage_hash,
      ),
      value_payload_ref: normalizeCollectionString(
        "canonical_identity.value_payload_ref",
        input.value_payload_ref,
      ),
    },
  })}`;
}

export function canonicalFactIdFromIdentity(canonicalIdentityHash: string) {
  return `canonical-fact.${deriveCollectionControlHash({
    artifact_family: "CANONICAL_FACT_ID",
    payload: normalizeCollectionString("canonical_identity_hash", canonicalIdentityHash),
  })}`;
}
