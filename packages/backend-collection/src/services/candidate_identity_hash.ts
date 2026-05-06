import {
  deriveCollectionControlHash,
  normalizeCollectionString,
} from "../models/collection_control_common.ts";
import type { CandidateAdjustmentBindingRecord, CandidateFactFamily } from "../types/candidate_fact_draft.ts";

export type CandidateLogicalIdentityInput = {
  adjustment_binding: CandidateAdjustmentBindingRecord | null;
  collection_boundary_ref: string;
  execution_mode: string;
  fact_family: CandidateFactFamily;
  manifest_id: string;
  normalization_context_ref: string;
  partition_scope: string;
  value_payload_ref: string;
};

export type CandidateIdentityHashInput = CandidateLogicalIdentityInput & {
  evidence_lineage_hash: string;
  source_record_lineage_hash: string;
};

export function allocateCandidateValuePayloadRef(input: {
  evidence_content_ref: string;
  fact_family: CandidateFactFamily;
  normalization_context_hash: string;
}) {
  return `candidate-value://${deriveCollectionControlHash({
    artifact_family: "CANDIDATE_VALUE_PAYLOAD_REF",
    payload: {
      evidence_content_ref: normalizeCollectionString(
        "candidate_identity.evidence_content_ref",
        input.evidence_content_ref,
      ),
      fact_family: input.fact_family,
      normalization_context_hash: normalizeCollectionString(
        "candidate_identity.normalization_context_hash",
        input.normalization_context_hash,
      ),
    },
  })}`;
}

export function deriveCandidateDedupeKey(input: CandidateLogicalIdentityInput) {
  return `candidate-dedupe://${deriveCollectionControlHash({
    artifact_family: "CANDIDATE_DEDUPE_KEY",
    payload: {
      adjustment_binding: input.adjustment_binding,
      collection_boundary_ref: normalizeCollectionString(
        "candidate_identity.collection_boundary_ref",
        input.collection_boundary_ref,
      ),
      execution_mode: normalizeCollectionString("candidate_identity.execution_mode", input.execution_mode),
      fact_family: input.fact_family,
      manifest_id: normalizeCollectionString("candidate_identity.manifest_id", input.manifest_id),
      normalization_context_ref: normalizeCollectionString(
        "candidate_identity.normalization_context_ref",
        input.normalization_context_ref,
      ),
      partition_scope: normalizeCollectionString(
        "candidate_identity.partition_scope",
        input.partition_scope,
      ),
      value_payload_ref: normalizeCollectionString(
        "candidate_identity.value_payload_ref",
        input.value_payload_ref,
      ),
    },
  })}`;
}

export function deriveCandidateIdentityHash(input: CandidateIdentityHashInput) {
  return `candidate-identity-hash://${deriveCollectionControlHash({
    artifact_family: "CANDIDATE_IDENTITY",
    payload: {
      ...input,
      collection_boundary_ref: normalizeCollectionString(
        "candidate_identity.collection_boundary_ref",
        input.collection_boundary_ref,
      ),
      evidence_lineage_hash: normalizeCollectionString(
        "candidate_identity.evidence_lineage_hash",
        input.evidence_lineage_hash,
      ),
      source_record_lineage_hash: normalizeCollectionString(
        "candidate_identity.source_record_lineage_hash",
        input.source_record_lineage_hash,
      ),
    },
  })}`;
}

export function candidateFactIdFromIdentity(candidateIdentityHash: string) {
  return `candidate-fact.${deriveCollectionControlHash({
    artifact_family: "CANDIDATE_FACT_ID",
    payload: normalizeCollectionString("candidate_identity_hash", candidateIdentityHash),
  })}`;
}
