import { normalizeUtcInstantString } from "../../../domain-kernel/src/primitives/time.ts";
import {
  deriveCollectionControlHash,
  normalizeCollectionSourceClass,
  normalizeCollectionString,
  normalizeCollectionStringSet,
  type CollectionSourceClass,
} from "../models/collection_control_common.ts";
import {
  buildSourceRecordContract,
  deriveSourceRecordContentHash,
  normalizeSourceRecordRecord,
  type CollectionErasureState,
  type SourceRecordCaptureMethod,
  type SourceRecordRecord,
} from "../models/source_record.ts";
import type { FetchDispatchResult } from "../types/fetch_dispatch_result.ts";
import { allocateRawPayloadHash, allocateRetentionTag } from "./content_ref_allocator.ts";
import { resolveDefaultFreshnessState, resolveSourceStrengthTier } from "./source_strength_tier_resolver.ts";

export type MaterializeSourceRecordsErrorCode =
  | "SOURCE_RECORD_PARTITION_SCOPE_AMBIGUOUS"
  | "SOURCE_RECORD_PARTITION_SCOPE_MISMATCH";

export class MaterializeSourceRecordsError extends Error {
  readonly code: MaterializeSourceRecordsErrorCode;

  constructor(code: MaterializeSourceRecordsErrorCode, detail: string) {
    super(`${code}: ${detail}`);
    this.name = "MaterializeSourceRecordsError";
    this.code = code;
  }
}

function deriveBusinessPartition(input: {
  business_partition?: string;
  planned_partition_scope_refs: readonly string[];
}) {
  const plannedPartitions = normalizeCollectionStringSet(
    "source_record.planned_partition_scope_refs",
    input.planned_partition_scope_refs,
    { minItems: 1 },
  );
  if (input.business_partition !== undefined) {
    const businessPartition = normalizeCollectionString(
      "source_record.business_partition",
      input.business_partition,
    );
    if (!plannedPartitions.includes(businessPartition)) {
      throw new MaterializeSourceRecordsError(
        "SOURCE_RECORD_PARTITION_SCOPE_MISMATCH",
        "business_partition must exactly match the frozen planned partition scope",
      );
    }
    return businessPartition;
  }
  if (plannedPartitions.length !== 1) {
    throw new MaterializeSourceRecordsError(
      "SOURCE_RECORD_PARTITION_SCOPE_AMBIGUOUS",
      "business_partition must be supplied when planned source has multiple partitions",
    );
  }
  return plannedPartitions[0]!;
}

function rawPayloadRefs(fetchResult: FetchDispatchResult) {
  if (fetchResult.raw_payload_refs.length > 0) {
    return fetchResult.raw_payload_refs;
  }
  if (fetchResult.empty_response_confirmed) {
    const emptyRef = `raw://empty-confirmed/${deriveCollectionControlHash({
      artifact_family: "EMPTY_CONFIRMED_RAW_PLACEHOLDER",
      payload: {
        cursor_checkpoint_ref: fetchResult.cursor_checkpoint_ref,
        request_audit_refs: fetchResult.request_audit_refs,
        source_domain: fetchResult.source_domain,
      },
    })}`;
    return [{ page_index: 0, raw_payload_ref: emptyRef }];
  }
  return [];
}

function sourceRecordId(input: {
  business_partition: string;
  collection_boundary_ref: string;
  manifest_id: string;
  provider: string;
  provider_account_ref: string;
  raw_hash: string;
  raw_payload_ref: string;
  source_class: CollectionSourceClass;
}) {
  return `source-record.${deriveCollectionControlHash({
    artifact_family: "SOURCE_RECORD_ID",
    payload: input,
  })}`;
}

export function materializeSourceRecords(input: {
  business_partition?: string;
  captured_at: string;
  client_id: string;
  collection_boundary_ref: string;
  effective_period: string;
  fetch_result: FetchDispatchResult;
  ingestion_run_ref: string;
  manifest_id: string;
  planned_partition_scope_refs: readonly string[];
  provider: string;
  provider_account_ref: string;
  quarantined?: boolean;
  retention_basis_ref?: string;
  source_class: CollectionSourceClass;
  tenant_id: string;
}): SourceRecordRecord[] {
  const capturedAt = normalizeUtcInstantString(input.captured_at);
  const sourceClass = normalizeCollectionSourceClass("source_record.source_class", input.source_class);
  const businessPartition = deriveBusinessPartition(input);
  const captureMethod: SourceRecordCaptureMethod = input.quarantined
    ? "QUARANTINED_GATEWAY_CAPTURE"
    : "CONTROLLED_GATEWAY_FETCH";
  const erasureState: CollectionErasureState = input.quarantined ? "LIMITED" : "ACTIVE";

  return rawPayloadRefs(input.fetch_result).map((rawPayload) => {
    const rawPayloadRef = normalizeCollectionString(
      "source_record.raw_payload_ref",
      rawPayload.raw_payload_ref,
    );
    const rawHash = allocateRawPayloadHash(rawPayloadRef);
    const id = sourceRecordId({
      business_partition: businessPartition,
      collection_boundary_ref: input.collection_boundary_ref,
      manifest_id: input.manifest_id,
      provider: input.provider,
      provider_account_ref: input.provider_account_ref,
      raw_hash: rawHash,
      raw_payload_ref: rawPayloadRef,
      source_class: sourceClass,
    });
    const draft: Omit<SourceRecordRecord, "contract"> = {
      artifact_type: "SourceRecord",
      business_partition: businessPartition,
      capture_method: captureMethod,
      captured_at: capturedAt,
      client_id: normalizeCollectionString("source_record.client_id", input.client_id),
      collection_boundary_ref: normalizeCollectionString(
        "source_record.collection_boundary_ref",
        input.collection_boundary_ref,
      ),
      effective_period: normalizeCollectionString(
        "source_record.effective_period",
        input.effective_period,
      ),
      erasure_state: erasureState,
      freshness_state: resolveDefaultFreshnessState({
        fetch_result: input.fetch_result,
        source_class: sourceClass,
      }),
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
      raw_hash: rawHash,
      raw_payload_ref: rawPayloadRef,
      retention_tag: allocateRetentionTag({
        anchor_timestamp: capturedAt,
        artifact_ref_seed: id,
        ...(input.retention_basis_ref === undefined ? {} : { basis_ref: input.retention_basis_ref }),
        ...(input.quarantined ? { limited_reason_code: "QUARANTINED_CONTENT" } : {}),
      }),
      source_class: sourceClass,
      source_record_id: id,
      source_strength_tier: resolveSourceStrengthTier(sourceClass),
      tenant_id: normalizeCollectionString("source_record.tenant_id", input.tenant_id),
    };
    const sourceRecordContentHash = deriveSourceRecordContentHash(draft);
    return normalizeSourceRecordRecord({
      ...draft,
      contract: buildSourceRecordContract({
        source_record_content_hash: sourceRecordContentHash,
        source_record_id: id,
      }),
    });
  });
}
