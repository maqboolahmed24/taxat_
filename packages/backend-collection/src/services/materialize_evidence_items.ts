import {
  deriveCollectionControlHash,
  normalizeCollectionStringSet,
} from "../models/collection_control_common.ts";
import {
  buildEvidenceItemContract,
  deriveEvidenceItemContentHash,
  normalizeEvidenceItemRecord,
  type EvidenceItemRecord,
} from "../models/evidence_item.ts";
import { normalizeSourceRecordRecord, type SourceRecordRecord } from "../models/source_record.ts";
import { allocateEvidenceContentRef, allocateRetentionTag } from "./content_ref_allocator.ts";
import { buildEvidenceLineageRefs } from "./evidence_lineage_ref_builder.ts";
import { classifyEvidenceKind } from "./evidence_kind_classifier.ts";

export type MaterializeEvidenceItemsErrorCode = "EVIDENCE_ITEM_PARTITION_SCOPE_MISMATCH";

export class MaterializeEvidenceItemsError extends Error {
  readonly code: MaterializeEvidenceItemsErrorCode;

  constructor(code: MaterializeEvidenceItemsErrorCode, detail: string) {
    super(`${code}: ${detail}`);
    this.name = "MaterializeEvidenceItemsError";
    this.code = code;
  }
}

function evidenceItemId(input: {
  content_ref: string;
  evidence_kind: string;
  manifest_id: string;
  source_record_id: string;
}) {
  return `evidence-item.${deriveCollectionControlHash({
    artifact_family: "EVIDENCE_ITEM_ID",
    payload: input,
  })}`;
}

function assertPartition(input: {
  expected_partition_scope_refs?: readonly string[];
  source_record: SourceRecordRecord;
}) {
  if (input.expected_partition_scope_refs === undefined) {
    return;
  }
  const expected = normalizeCollectionStringSet(
    "evidence_item.expected_partition_scope_refs",
    input.expected_partition_scope_refs,
    { minItems: 1 },
  );
  if (!expected.includes(input.source_record.business_partition)) {
    throw new MaterializeEvidenceItemsError(
      "EVIDENCE_ITEM_PARTITION_SCOPE_MISMATCH",
      "evidence item partition must exactly match the frozen source partition scope",
    );
  }
}

export function materializeEvidenceItems(input: {
  additional_lineage_refs?: readonly string[];
  evidence_extraction_available?: boolean;
  expected_partition_scope_refs?: readonly string[];
  extraction_confidence?: number;
  source_records: readonly SourceRecordRecord[];
}): EvidenceItemRecord[] {
  return input.source_records.map((record) => {
    const sourceRecord = normalizeSourceRecordRecord(record);
    assertPartition(
      input.expected_partition_scope_refs === undefined
        ? { source_record: sourceRecord }
        : {
            expected_partition_scope_refs: input.expected_partition_scope_refs,
            source_record: sourceRecord,
          },
    );
    const quarantined =
      sourceRecord.capture_method === "QUARANTINED_GATEWAY_CAPTURE" ||
      sourceRecord.erasure_state === "LIMITED";
    const classification = classifyEvidenceKind({
      extraction_available: input.evidence_extraction_available ?? false,
      quarantined,
      source_class: sourceRecord.source_class,
    });
    const contentRef = allocateEvidenceContentRef({
      content_basis_ref: sourceRecord.raw_payload_ref,
      evidence_kind: classification.evidence_kind,
      source_record_id: sourceRecord.source_record_id,
    });
    const id = evidenceItemId({
      content_ref: contentRef,
      evidence_kind: classification.evidence_kind,
      manifest_id: sourceRecord.manifest_id,
      source_record_id: sourceRecord.source_record_id,
    });
    const draft: Omit<EvidenceItemRecord, "contract"> = {
      artifact_type: "EvidenceItem",
      business_partition: sourceRecord.business_partition,
      content_ref: contentRef,
      erasure_state: sourceRecord.erasure_state,
      evidence_item_id: id,
      evidence_kind: classification.evidence_kind,
      extraction_confidence:
        input.extraction_confidence ?? classification.default_extraction_confidence,
      extraction_method: classification.extraction_method,
      freshness_state: sourceRecord.freshness_state,
      lineage_refs: buildEvidenceLineageRefs(
        input.additional_lineage_refs === undefined
          ? { source_record: sourceRecord }
          : {
              additional_lineage_refs: input.additional_lineage_refs,
              source_record: sourceRecord,
            },
      ),
      manifest_id: sourceRecord.manifest_id,
      period_partition: sourceRecord.effective_period,
      retention_tag: allocateRetentionTag({
        anchor_timestamp: sourceRecord.captured_at,
        artifact_ref_seed: id,
        basis_ref: sourceRecord.retention_tag.retention_basis_ref,
        ...(quarantined ? { limited_reason_code: "QUARANTINED_CONTENT" } : {}),
        retention_class: "derived_artifact",
      }),
      source_record_id: sourceRecord.source_record_id,
      source_strength_tier: sourceRecord.source_strength_tier,
    };
    const evidenceItemContentHash = deriveEvidenceItemContentHash(draft);
    return normalizeEvidenceItemRecord({
      ...draft,
      contract: buildEvidenceItemContract({
        evidence_item_content_hash: evidenceItemContentHash,
        evidence_item_id: id,
      }),
    });
  });
}
