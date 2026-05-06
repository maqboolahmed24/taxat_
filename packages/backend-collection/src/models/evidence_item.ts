import { EvidenceItemSchemaLineage } from "../../../generated-models/src/generated/typescript/provenance-and-evidence.ts";
import type { SchemaBundleArtifactContract } from "../../../generated-models/src/generated/typescript/manifest-and-release.ts";
import {
  buildCollectionArtifactContract,
  deriveCollectionControlHash,
  normalizeCollectionString,
  normalizeCollectionStringSet,
} from "./collection_control_common.ts";
import {
  normalizeSourceRecordRecord,
  sourceRecordRef,
  normalizeCollectionRetentionTag,
  type CollectionErasureState,
  type CollectionRetentionTag,
  type SourceFreshnessState,
  type SourceRecordRecord,
  type SourceStrengthTier,
} from "./source_record.ts";

export const EVIDENCE_ITEM_KINDS = [
  "STRUCTURED_PROVIDER_PAYLOAD",
  "DOCUMENTARY_RAW_PAYLOAD",
  "DECLARED_ASSERTION_TEXT",
  "GOVERNANCE_CONTROL_RECORD",
  "EXTRACTION_REVIEW_REQUIRED",
  "QUARANTINED_CONTENT",
] as const;

export const EVIDENCE_EXTRACTION_METHODS = [
  "STRUCTURED_PAYLOAD_DIRECT",
  "OCR_TEXT_EXTRACTION",
  "MANUAL_REVIEW_REQUIRED",
  "DECLARED_TEXT_DIRECT",
  "NO_TEXT_EXTRACTION_RETAINED",
  "QUARANTINE_BLOCKED_EXTRACTION",
] as const;

export type EvidenceItemKind = (typeof EVIDENCE_ITEM_KINDS)[number];
export type EvidenceExtractionMethod = (typeof EVIDENCE_EXTRACTION_METHODS)[number];

export type EvidenceItemRecord = {
  artifact_type: "EvidenceItem";
  business_partition: string;
  content_ref: string;
  contract: SchemaBundleArtifactContract;
  erasure_state: CollectionErasureState;
  evidence_item_id: string;
  evidence_kind: EvidenceItemKind;
  extraction_confidence: number;
  extraction_method: EvidenceExtractionMethod;
  freshness_state: SourceFreshnessState;
  lineage_refs: string[];
  manifest_id: string;
  period_partition: string;
  retention_tag: CollectionRetentionTag;
  source_record_id: string;
  source_strength_tier: SourceStrengthTier;
};

export type EvidenceItemModelErrorCode =
  | "EVIDENCE_ITEM_ARTIFACT_TYPE_INVALID"
  | "EVIDENCE_ITEM_CONFIDENCE_INVALID"
  | "EVIDENCE_ITEM_CONSTANT_INVALID"
  | "EVIDENCE_ITEM_LINEAGE_REQUIRED";

export class EvidenceItemModelError extends Error {
  readonly code: EvidenceItemModelErrorCode;

  constructor(code: EvidenceItemModelErrorCode, detail: string) {
    super(`${code}: ${detail}`);
    this.name = "EvidenceItemModelError";
    this.code = code;
  }
}

function normalizeEvidenceKind(value: unknown): EvidenceItemKind {
  const normalized = normalizeCollectionString("evidence_item.evidence_kind", value);
  if (!EVIDENCE_ITEM_KINDS.includes(normalized as EvidenceItemKind)) {
    throw new EvidenceItemModelError(
      "EVIDENCE_ITEM_CONSTANT_INVALID",
      "evidence_kind must be from the internal materialization vocabulary",
    );
  }
  return normalized as EvidenceItemKind;
}

function normalizeExtractionMethod(value: unknown): EvidenceExtractionMethod {
  const normalized = normalizeCollectionString("evidence_item.extraction_method", value);
  if (!EVIDENCE_EXTRACTION_METHODS.includes(normalized as EvidenceExtractionMethod)) {
    throw new EvidenceItemModelError(
      "EVIDENCE_ITEM_CONSTANT_INVALID",
      "extraction_method must be from the internal materialization vocabulary",
    );
  }
  return normalized as EvidenceExtractionMethod;
}

export function evidenceItemRef(item: Pick<EvidenceItemRecord, "evidence_item_id">) {
  return `evidence-item://${item.evidence_item_id}`;
}

export function deriveEvidenceItemContentHash(record: Omit<EvidenceItemRecord, "contract">) {
  return `evidence-item-hash://${deriveCollectionControlHash({
    artifact_family: "EVIDENCE_ITEM",
    payload: record,
  })}`;
}

export function buildEvidenceItemContract(input: {
  evidence_item_content_hash: string;
  evidence_item_id: string;
}) {
  return buildCollectionArtifactContract({
    artifact_content_hash: input.evidence_item_content_hash,
    artifact_id: evidenceItemRef({ evidence_item_id: input.evidence_item_id }),
    artifact_type: "EvidenceItem",
    schema_id: EvidenceItemSchemaLineage.schemaId,
    schema_source_hash: EvidenceItemSchemaLineage.sourceHash,
    writer_build_id: "build.taxat.collection.0112",
  });
}

export function normalizeEvidenceItemRecord(input: EvidenceItemRecord): EvidenceItemRecord {
  if (input.artifact_type !== "EvidenceItem") {
    throw new EvidenceItemModelError(
      "EVIDENCE_ITEM_ARTIFACT_TYPE_INVALID",
      "evidence items must carry artifact_type EvidenceItem",
    );
  }
  if (input.extraction_confidence < 0 || input.extraction_confidence > 1) {
    throw new EvidenceItemModelError(
      "EVIDENCE_ITEM_CONFIDENCE_INVALID",
      "extraction_confidence must be between 0 and 1",
    );
  }

  const lineageRefs = normalizeCollectionStringSet(
    "evidence_item.lineage_refs",
    input.lineage_refs,
    { minItems: 1 },
  );
  if (lineageRefs.length === 0) {
    throw new EvidenceItemModelError(
      "EVIDENCE_ITEM_LINEAGE_REQUIRED",
      "evidence items require at least one lineage ref",
    );
  }

  return {
    artifact_type: "EvidenceItem",
    business_partition: normalizeCollectionString(
      "evidence_item.business_partition",
      input.business_partition,
    ),
    content_ref: normalizeCollectionString("evidence_item.content_ref", input.content_ref),
    contract: structuredClone(input.contract),
    erasure_state: input.erasure_state,
    evidence_item_id: normalizeCollectionString(
      "evidence_item.evidence_item_id",
      input.evidence_item_id,
    ),
    evidence_kind: normalizeEvidenceKind(input.evidence_kind),
    extraction_confidence: input.extraction_confidence,
    extraction_method: normalizeExtractionMethod(input.extraction_method),
    freshness_state: input.freshness_state,
    lineage_refs: lineageRefs,
    manifest_id: normalizeCollectionString("evidence_item.manifest_id", input.manifest_id),
    period_partition: normalizeCollectionString(
      "evidence_item.period_partition",
      input.period_partition,
    ),
    retention_tag: normalizeCollectionRetentionTag(input.retention_tag),
    source_record_id: normalizeCollectionString(
      "evidence_item.source_record_id",
      input.source_record_id,
    ),
    source_strength_tier: input.source_strength_tier,
  };
}

export function buildEvidenceLineageFromSourceRecord(sourceRecord: SourceRecordRecord) {
  const normalized = normalizeSourceRecordRecord(sourceRecord);
  return [sourceRecordRef(normalized), normalized.raw_payload_ref, normalized.ingestion_run_ref];
}

export function cloneEvidenceItemRecord(record: EvidenceItemRecord) {
  return structuredClone(record);
}
