import { SourceRecordSchemaLineage } from "../../../generated-models/src/generated/typescript/provenance-and-evidence.ts";
import type { SchemaBundleArtifactContract } from "../../../generated-models/src/generated/typescript/manifest-and-release.ts";
import { normalizeUtcInstantString } from "../../../domain-kernel/src/primitives/time.ts";
import {
  buildCollectionArtifactContract,
  deriveCollectionControlHash,
  normalizeCollectionSourceClass,
  normalizeCollectionString,
  type CollectionSourceClass,
} from "./collection_control_common.ts";

export type SourceStrengthTier =
  | "TIER_1_AUTHORITY_FINAL"
  | "TIER_2_AUTHORITY_REFERENCE"
  | "TIER_3_STRUCTURED_EXTERNAL"
  | "TIER_4_STRUCTURED_INTERNAL"
  | "TIER_5_DOCUMENT_SUPPORT"
  | "TIER_6_DECLARED_ONLY"
  | "TIER_7_INFERRED"
  | "TIER_8_GOVERNANCE_ONLY";

export type SourceFreshnessState = "CURRENT" | "STALE" | "EXPIRED" | "UNKNOWN" | "SUPERSEDED";
export type CollectionErasureState =
  | "ACTIVE"
  | "LIMITED"
  | "LEGAL_HOLD"
  | "ERASURE_PENDING"
  | "PSEUDONYMISED"
  | "ERASED";

export const SOURCE_RECORD_CAPTURE_METHODS = [
  "CONTROLLED_GATEWAY_FETCH",
  "MANUAL_UPLOAD",
  "OPERATOR_DECLARATION",
  "SYSTEM_DERIVATION",
  "QUARANTINED_GATEWAY_CAPTURE",
] as const;

export type SourceRecordCaptureMethod = (typeof SOURCE_RECORD_CAPTURE_METHODS)[number];

export type CollectionRetentionTag = {
  artifact_type: "RetentionTag";
  anchor_event: string;
  anchor_timestamp: string;
  authority_ambiguity_ref: string | null;
  effective_expiry_at: string;
  erasure_decided_at: string;
  erasure_eligibility:
    | "ELIGIBLE"
    | "BLOCKED_LEGAL_HOLD"
    | "BLOCKED_STATUTORY_MINIMUM"
    | "BLOCKED_PROOF_PRESERVATION"
    | "BLOCKED_AUTHORITY_AMBIGUITY";
  erasure_reason_codes: string[];
  legal_hold_changed_at: string | null;
  legal_hold_ref: string | null;
  legal_hold_state: "NONE" | "ACTIVE" | "RELEASE_ELIGIBLE" | "RELEASED";
  limitation_behavior:
    | "NONE"
    | "SURVIVE_WITH_LIMITATION_NOTES"
    | "EXPIRED_PLACEHOLDER_ONLY"
    | "PSEUDONYMISED_SURVIVAL";
  limitation_reason_codes: string[];
  minimum_expiry_at: string;
  policy_expiry_at: string;
  proof_preservation_basis_ref: string | null;
  pseudonymisation_mode: string;
  retention_basis_ref: string;
  retention_class:
    | "regulated_record"
    | "derived_artifact"
    | "operational_log"
    | "analytics_projection"
    | "policy_governed_other";
  retention_tag_id: string;
};

export type SourceRecordRecord = {
  artifact_type: "SourceRecord";
  business_partition: string;
  capture_method: SourceRecordCaptureMethod;
  captured_at: string;
  client_id: string;
  collection_boundary_ref: string;
  contract: SchemaBundleArtifactContract;
  effective_period: string;
  erasure_state: CollectionErasureState;
  freshness_state: SourceFreshnessState;
  ingestion_run_ref: string;
  manifest_id: string;
  provider: string;
  provider_account_ref: string;
  raw_hash: string;
  raw_payload_ref: string;
  retention_tag: CollectionRetentionTag;
  source_class: CollectionSourceClass;
  source_record_id: string;
  source_strength_tier: SourceStrengthTier;
  tenant_id: string;
};

export type SourceRecordModelErrorCode =
  | "SOURCE_RECORD_ARTIFACT_TYPE_INVALID"
  | "SOURCE_RECORD_CAPTURE_METHOD_INVALID"
  | "SOURCE_RECORD_CONSTANT_INVALID"
  | "SOURCE_RECORD_HASH_REQUIRED";

export class SourceRecordModelError extends Error {
  readonly code: SourceRecordModelErrorCode;

  constructor(code: SourceRecordModelErrorCode, detail: string) {
    super(`${code}: ${detail}`);
    this.name = "SourceRecordModelError";
    this.code = code;
  }
}

const SOURCE_STRENGTH_TIERS = new Set<SourceStrengthTier>([
  "TIER_1_AUTHORITY_FINAL",
  "TIER_2_AUTHORITY_REFERENCE",
  "TIER_3_STRUCTURED_EXTERNAL",
  "TIER_4_STRUCTURED_INTERNAL",
  "TIER_5_DOCUMENT_SUPPORT",
  "TIER_6_DECLARED_ONLY",
  "TIER_7_INFERRED",
  "TIER_8_GOVERNANCE_ONLY",
]);
const FRESHNESS_STATES = new Set<SourceFreshnessState>([
  "CURRENT",
  "STALE",
  "EXPIRED",
  "UNKNOWN",
  "SUPERSEDED",
]);
const ERASURE_STATES = new Set<CollectionErasureState>([
  "ACTIVE",
  "LIMITED",
  "LEGAL_HOLD",
  "ERASURE_PENDING",
  "PSEUDONYMISED",
  "ERASED",
]);

function normalizeCaptureMethod(value: unknown): SourceRecordCaptureMethod {
  const normalized = normalizeCollectionString("source_record.capture_method", value);
  if (!SOURCE_RECORD_CAPTURE_METHODS.includes(normalized as SourceRecordCaptureMethod)) {
    throw new SourceRecordModelError(
      "SOURCE_RECORD_CAPTURE_METHOD_INVALID",
      "capture_method must be from the internal materialization vocabulary",
    );
  }
  return normalized as SourceRecordCaptureMethod;
}

export function normalizeCollectionRetentionTag(tag: CollectionRetentionTag): CollectionRetentionTag {
  return {
    artifact_type: "RetentionTag",
    anchor_event: normalizeCollectionString("retention_tag.anchor_event", tag.anchor_event),
    anchor_timestamp: normalizeUtcInstantString(tag.anchor_timestamp),
    authority_ambiguity_ref:
      tag.authority_ambiguity_ref === null
        ? null
        : normalizeCollectionString(
            "retention_tag.authority_ambiguity_ref",
            tag.authority_ambiguity_ref,
          ),
    effective_expiry_at: normalizeUtcInstantString(tag.effective_expiry_at),
    erasure_decided_at: normalizeUtcInstantString(tag.erasure_decided_at),
    erasure_eligibility: tag.erasure_eligibility,
    erasure_reason_codes: [...new Set(tag.erasure_reason_codes)].sort(),
    legal_hold_changed_at:
      tag.legal_hold_changed_at === null ? null : normalizeUtcInstantString(tag.legal_hold_changed_at),
    legal_hold_ref:
      tag.legal_hold_ref === null
        ? null
        : normalizeCollectionString("retention_tag.legal_hold_ref", tag.legal_hold_ref),
    legal_hold_state: tag.legal_hold_state,
    limitation_behavior: tag.limitation_behavior,
    limitation_reason_codes: [...new Set(tag.limitation_reason_codes)].sort(),
    minimum_expiry_at: normalizeUtcInstantString(tag.minimum_expiry_at),
    policy_expiry_at: normalizeUtcInstantString(tag.policy_expiry_at),
    proof_preservation_basis_ref:
      tag.proof_preservation_basis_ref === null
        ? null
        : normalizeCollectionString(
            "retention_tag.proof_preservation_basis_ref",
            tag.proof_preservation_basis_ref,
          ),
    pseudonymisation_mode: normalizeCollectionString(
      "retention_tag.pseudonymisation_mode",
      tag.pseudonymisation_mode,
    ),
    retention_basis_ref: normalizeCollectionString(
      "retention_tag.retention_basis_ref",
      tag.retention_basis_ref,
    ),
    retention_class: tag.retention_class,
    retention_tag_id: normalizeCollectionString("retention_tag.retention_tag_id", tag.retention_tag_id),
  };
}

export function sourceRecordRef(record: Pick<SourceRecordRecord, "source_record_id">) {
  return `source-record://${record.source_record_id}`;
}

export function deriveSourceRecordContentHash(record: Omit<SourceRecordRecord, "contract">) {
  return `source-record-hash://${deriveCollectionControlHash({
    artifact_family: "SOURCE_RECORD",
    payload: record,
  })}`;
}

export function buildSourceRecordContract(input: {
  source_record_content_hash: string;
  source_record_id: string;
}) {
  return buildCollectionArtifactContract({
    artifact_content_hash: input.source_record_content_hash,
    artifact_id: sourceRecordRef({ source_record_id: input.source_record_id }),
    artifact_type: "SourceRecord",
    schema_id: SourceRecordSchemaLineage.schemaId,
    schema_source_hash: SourceRecordSchemaLineage.sourceHash,
    writer_build_id: "build.taxat.collection.0112",
  });
}

export function normalizeSourceRecordRecord(input: SourceRecordRecord): SourceRecordRecord {
  if (input.artifact_type !== "SourceRecord") {
    throw new SourceRecordModelError(
      "SOURCE_RECORD_ARTIFACT_TYPE_INVALID",
      "source records must carry artifact_type SourceRecord",
    );
  }
  if (input.raw_hash.trim().length === 0 || input.raw_payload_ref.trim().length === 0) {
    throw new SourceRecordModelError(
      "SOURCE_RECORD_HASH_REQUIRED",
      "source records require raw_hash and raw_payload_ref",
    );
  }
  if (!SOURCE_STRENGTH_TIERS.has(input.source_strength_tier)) {
    throw new SourceRecordModelError(
      "SOURCE_RECORD_CONSTANT_INVALID",
      "source_strength_tier must be canonical",
    );
  }
  if (!FRESHNESS_STATES.has(input.freshness_state) || !ERASURE_STATES.has(input.erasure_state)) {
    throw new SourceRecordModelError(
      "SOURCE_RECORD_CONSTANT_INVALID",
      "freshness_state and erasure_state must be canonical",
    );
  }

  return {
    artifact_type: "SourceRecord",
    business_partition: normalizeCollectionString(
      "source_record.business_partition",
      input.business_partition,
    ),
    capture_method: normalizeCaptureMethod(input.capture_method),
    captured_at: normalizeUtcInstantString(input.captured_at),
    client_id: normalizeCollectionString("source_record.client_id", input.client_id),
    collection_boundary_ref: normalizeCollectionString(
      "source_record.collection_boundary_ref",
      input.collection_boundary_ref,
    ),
    contract: structuredClone(input.contract),
    effective_period: normalizeCollectionString("source_record.effective_period", input.effective_period),
    erasure_state: input.erasure_state,
    freshness_state: input.freshness_state,
    ingestion_run_ref: normalizeCollectionString(
      "source_record.ingestion_run_ref",
      input.ingestion_run_ref,
    ),
    manifest_id: normalizeCollectionString("source_record.manifest_id", input.manifest_id),
    provider: normalizeCollectionString("source_record.provider", input.provider),
    provider_account_ref: normalizeCollectionString(
      "source_record.provider_account_ref",
      input.provider_account_ref,
    ),
    raw_hash: normalizeCollectionString("source_record.raw_hash", input.raw_hash),
    raw_payload_ref: normalizeCollectionString("source_record.raw_payload_ref", input.raw_payload_ref),
    retention_tag: normalizeCollectionRetentionTag(input.retention_tag),
    source_class: normalizeCollectionSourceClass("source_record.source_class", input.source_class),
    source_record_id: normalizeCollectionString(
      "source_record.source_record_id",
      input.source_record_id,
    ),
    source_strength_tier: input.source_strength_tier,
    tenant_id: normalizeCollectionString("source_record.tenant_id", input.tenant_id),
  };
}

export function cloneSourceRecordRecord(record: SourceRecordRecord) {
  return structuredClone(record);
}
