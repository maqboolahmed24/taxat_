import {
  normalizeCollectionBoundaryRecord,
  type CollectionBoundaryRecord,
} from "../models/collection_boundary.ts";
import { normalizeCandidateFactRecord, type CandidateFactRecord } from "../models/candidate_fact.ts";
import { normalizeCanonicalFactRecord, type CanonicalFactRecord } from "../models/canonical_fact.ts";
import { normalizeConflictRecordRecord, type ConflictRecordRecord } from "../models/conflict_record.ts";
import { normalizeEvidenceItemRecord, type EvidenceItemRecord } from "../models/evidence_item.ts";
import { normalizeInputFreezeSourceDomainPosture, type InputFreezeSourceDomainPostureRecord } from "../models/input_freeze.ts";
import { normalizeSourceRecordRecord, type SourceRecordRecord } from "../models/source_record.ts";
import {
  deriveCollectionControlHash,
  normalizeCollectionString,
  normalizeCollectionStringSet,
} from "../models/collection_control_common.ts";

export type InputSetHashPreimage = {
  artifact_contract_hash: string;
  artifact_contract_refs: string[];
  candidate_fact_ids: string[];
  canonical_fact_ids: string[];
  collection_boundary_hash: string;
  conflict_ids: string[];
  evidence_item_ids: string[];
  exclusion_flags: string[];
  missing_source_flags: string[];
  no_data_confirmed_flags: string[];
  normalization_context_hash: string;
  read_cutoff_at: string;
  source_boundaries: Array<{
    boundary_disposition: string;
    completeness_expectation_ref: string;
    cursor_checkpoint_ref: string;
    late_data_policy_ref: string;
    provider_api_version: string;
    provider_environment_ref: string;
    provider_schema_version: string;
    request_audit_refs_hash: string;
    revision_ref: string;
    source_domain: string;
  }>;
  source_plan_hash: string;
  source_record_identity: Array<{
    raw_hash: string;
    source_record_id: string;
  }>;
  source_window_hash: string;
  source_window_ref: string;
  stale_source_flags: string[];
};

export function buildInputSetHashPreimage(input: {
  artifact_contract_hash: string;
  artifact_contract_refs: readonly string[];
  candidate_facts: readonly CandidateFactRecord[];
  canonical_facts: readonly CanonicalFactRecord[];
  collection_boundary: CollectionBoundaryRecord;
  conflict_records: readonly ConflictRecordRecord[];
  evidence_items: readonly EvidenceItemRecord[];
  normalization_context_hash: string;
  source_domain_postures: readonly InputFreezeSourceDomainPostureRecord[];
  source_plan_hash: string;
  source_records: readonly SourceRecordRecord[];
  source_window_hash: string;
  source_window_ref: string;
}): InputSetHashPreimage {
  const boundary = normalizeCollectionBoundaryRecord(input.collection_boundary);
  const postures = input.source_domain_postures.map((posture) =>
    normalizeInputFreezeSourceDomainPosture(posture),
  );
  return {
    artifact_contract_hash: normalizeCollectionString(
      "input_set_hash.artifact_contract_hash",
      input.artifact_contract_hash,
    ),
    artifact_contract_refs: normalizeCollectionStringSet(
      "input_set_hash.artifact_contract_refs",
      input.artifact_contract_refs,
      { minItems: 10 },
    ),
    candidate_fact_ids: normalizeCollectionStringSet(
      "input_set_hash.candidate_fact_ids",
      input.candidate_facts.map((fact) => normalizeCandidateFactRecord(fact).candidate_fact_id),
    ),
    canonical_fact_ids: normalizeCollectionStringSet(
      "input_set_hash.canonical_fact_ids",
      input.canonical_facts.map((fact) => normalizeCanonicalFactRecord(fact).canonical_fact_id),
    ),
    collection_boundary_hash: boundary.collection_boundary_hash,
    conflict_ids: normalizeCollectionStringSet(
      "input_set_hash.conflict_ids",
      input.conflict_records.map((record) => normalizeConflictRecordRecord(record).conflict_id),
    ),
    evidence_item_ids: normalizeCollectionStringSet(
      "input_set_hash.evidence_item_ids",
      input.evidence_items.map((item) => normalizeEvidenceItemRecord(item).evidence_item_id),
    ),
    exclusion_flags: postures
      .filter((posture) => posture.boundary_disposition === "EXCLUDED_BY_POLICY")
      .map((posture) => posture.source_domain)
      .sort(),
    missing_source_flags: postures
      .filter((posture) => posture.boundary_disposition === "MISSING_AT_CUTOFF")
      .map((posture) => posture.source_domain)
      .sort(),
    no_data_confirmed_flags: postures
      .filter((posture) => posture.boundary_disposition === "NO_DATA_CONFIRMED_AT_CUTOFF")
      .map((posture) => posture.source_domain)
      .sort(),
    normalization_context_hash: normalizeCollectionString(
      "input_set_hash.normalization_context_hash",
      input.normalization_context_hash,
    ),
    read_cutoff_at: boundary.read_cutoff_at,
    source_boundaries: boundary.source_boundaries
      .map((sourceBoundary) => ({
        boundary_disposition: sourceBoundary.boundary_disposition,
        completeness_expectation_ref: sourceBoundary.completeness_expectation_ref,
        cursor_checkpoint_ref: sourceBoundary.cursor_checkpoint_ref,
        late_data_policy_ref: sourceBoundary.late_data_policy_ref,
        provider_api_version: sourceBoundary.provider_api_version,
        provider_environment_ref: sourceBoundary.provider_environment_ref,
        provider_schema_version: sourceBoundary.provider_schema_version,
        request_audit_refs_hash: `request-audit-refs-hash://${deriveCollectionControlHash({
          artifact_family: "INPUT_SET_REQUEST_AUDIT_REFS",
          payload: normalizeCollectionStringSet("input_set_hash.request_audit_refs", [
            ...sourceBoundary.request_audit_refs,
            ...sourceBoundary.page_request_audit_refs,
          ]),
        })}`,
        revision_ref: sourceBoundary.revision_ref,
        source_domain: sourceBoundary.source_domain,
      }))
      .sort(
        (left, right) =>
          left.source_domain.localeCompare(right.source_domain) ||
          left.cursor_checkpoint_ref.localeCompare(right.cursor_checkpoint_ref),
      ),
    source_plan_hash: normalizeCollectionString(
      "input_set_hash.source_plan_hash",
      input.source_plan_hash,
    ),
    source_record_identity: input.source_records
      .map((record) => {
        const sourceRecord = normalizeSourceRecordRecord(record);
        return {
          raw_hash: sourceRecord.raw_hash,
          source_record_id: sourceRecord.source_record_id,
        };
      })
      .sort((left, right) => left.source_record_id.localeCompare(right.source_record_id)),
    source_window_hash: normalizeCollectionString(
      "input_set_hash.source_window_hash",
      input.source_window_hash,
    ),
    source_window_ref: normalizeCollectionString(
      "input_set_hash.source_window_ref",
      input.source_window_ref,
    ),
    stale_source_flags: postures
      .filter((posture) => posture.boundary_disposition === "STALE_AT_CUTOFF")
      .map((posture) => posture.source_domain)
      .sort(),
  };
}

export function deriveInputSetHash(preimage: InputSetHashPreimage) {
  return `input-set-hash://${deriveCollectionControlHash({
    artifact_family: "INPUT_SET_HASH",
    payload: preimage,
  })}`;
}
