import {
  deriveCollectionControlHash,
  normalizeCollectionString,
} from "../models/collection_control_common.ts";
import type { CollectionRetentionTag } from "../models/source_record.ts";
import { normalizeUtcInstantString } from "../../../domain-kernel/src/primitives/time.ts";

function addYearsToInstant(value: string, years: number) {
  const date = new Date(value);
  date.setUTCFullYear(date.getUTCFullYear() + years);
  const iso = date.toISOString();
  return iso.endsWith(".000Z") ? iso.replace(".000Z", "Z") : iso;
}

export function allocateRawPayloadHash(rawPayloadRef: string) {
  return `raw-hash://${deriveCollectionControlHash({
    artifact_family: "RAW_PAYLOAD_REF",
    payload: normalizeCollectionString("raw_payload_ref", rawPayloadRef),
  })}`;
}

export function allocateEvidenceContentRef(input: {
  content_basis_ref: string;
  evidence_kind: string;
  source_record_id: string;
}) {
  return `content-ref://${deriveCollectionControlHash({
    artifact_family: "EVIDENCE_CONTENT_REF",
    payload: {
      content_basis_ref: normalizeCollectionString("content_basis_ref", input.content_basis_ref),
      evidence_kind: normalizeCollectionString("evidence_kind", input.evidence_kind),
      source_record_id: normalizeCollectionString("source_record_id", input.source_record_id),
    },
  })}`;
}

export function allocateRetentionTag(input: {
  anchor_timestamp: string;
  artifact_ref_seed: string;
  basis_ref?: string;
  limited_reason_code?: string;
  retention_class?: CollectionRetentionTag["retention_class"];
}): CollectionRetentionTag {
  const anchorTimestamp = normalizeUtcInstantString(input.anchor_timestamp);
  const retentionTagId = `retention-tag.${deriveCollectionControlHash({
    artifact_family: "RETENTION_TAG",
    payload: {
      anchor_timestamp: anchorTimestamp,
      artifact_ref_seed: input.artifact_ref_seed,
      limited_reason_code: input.limited_reason_code ?? null,
    },
  })}`;
  const expiry = addYearsToInstant(anchorTimestamp, 7);
  const limited = input.limited_reason_code !== undefined;

  return {
    artifact_type: "RetentionTag",
    anchor_event: "COLLECTION_MATERIALIZED",
    anchor_timestamp: anchorTimestamp,
    authority_ambiguity_ref: null,
    effective_expiry_at: expiry,
    erasure_decided_at: anchorTimestamp,
    erasure_eligibility: limited
      ? "BLOCKED_PROOF_PRESERVATION"
      : "BLOCKED_STATUTORY_MINIMUM",
    erasure_reason_codes: limited
      ? ["PROOF_PRESERVATION_REQUIRED"]
      : ["STATUTORY_RETENTION_ACTIVE"],
    legal_hold_changed_at: null,
    legal_hold_ref: null,
    legal_hold_state: "NONE",
    limitation_behavior: limited ? "SURVIVE_WITH_LIMITATION_NOTES" : "NONE",
    limitation_reason_codes: limited ? [input.limited_reason_code!] : [],
    minimum_expiry_at: expiry,
    policy_expiry_at: expiry,
    proof_preservation_basis_ref: limited ? input.basis_ref ?? "proof-preservation://collection" : null,
    pseudonymisation_mode: "NONE",
    retention_basis_ref: input.basis_ref ?? "retention-basis://collection/default",
    retention_class: input.retention_class ?? "regulated_record",
    retention_tag_id: retentionTagId,
  };
}
