import { normalizeUtcInstantString } from "../../../domain-kernel/src/primitives/time.ts";
import {
  deriveCollectionControlHash,
  normalizeCollectionString,
} from "../models/collection_control_common.ts";
import type { CollectionFetchRequestEnvelope } from "../types/fetch_request_envelope.ts";
import type { FetchGapCode } from "../types/fetch_dispatch_result.ts";

export type FetchAuditEventCode =
  | "FETCH_REQUEST_DISPATCHED"
  | "FETCH_PAGE_RECEIVED"
  | "FETCH_PAGE_GAP"
  | "FETCH_EMPTY_CONFIRMED"
  | "FETCH_GATEWAY_ABORTED";

export type FetchAuditRecord = {
  audit_ref: string;
  event_code: FetchAuditEventCode;
  fetch_gap_code_or_null: FetchGapCode | null;
  gateway_exchange_ref: string;
  observed_at: string;
  page_index_or_null: number | null;
  raw_payload_ref_or_null: string | null;
  request_hash: string;
  source_domain: string;
};

export function buildFetchAuditRecord(input: {
  event_code: FetchAuditEventCode;
  fetch_gap_code_or_null?: FetchGapCode | null;
  gateway_exchange_ref: string;
  observed_at: string;
  page_index_or_null?: number | null;
  raw_payload_ref_or_null?: string | null;
  request: CollectionFetchRequestEnvelope;
}): FetchAuditRecord {
  const pageIndexOrNull = input.page_index_or_null ?? null;
  const rawPayloadRefOrNull = input.raw_payload_ref_or_null ?? null;
  const observedAt = normalizeUtcInstantString(input.observed_at);
  const gatewayExchangeRef = normalizeCollectionString(
    "fetch_audit.gateway_exchange_ref",
    input.gateway_exchange_ref,
  );
  const auditHash = deriveCollectionControlHash({
    artifact_family: "COLLECTION_FETCH_AUDIT_RECORD",
    payload: {
      event_code: input.event_code,
      fetch_gap_code_or_null: input.fetch_gap_code_or_null ?? null,
      gateway_exchange_ref: gatewayExchangeRef,
      observed_at: observedAt,
      page_index_or_null: pageIndexOrNull,
      raw_payload_ref_or_null: rawPayloadRefOrNull,
      request_hash: input.request.request_hash,
      source_domain: input.request.source_domain,
    },
  });
  return {
    audit_ref: `fetch-audit://${auditHash}`,
    event_code: input.event_code,
    fetch_gap_code_or_null: input.fetch_gap_code_or_null ?? null,
    gateway_exchange_ref: gatewayExchangeRef,
    observed_at: observedAt,
    page_index_or_null: pageIndexOrNull,
    raw_payload_ref_or_null: rawPayloadRefOrNull,
    request_hash: input.request.request_hash,
    source_domain: input.request.source_domain,
  };
}
