import { parseUtcInstant, normalizeUtcInstantString } from "../../../domain-kernel/src/primitives/time.ts";
import {
  deriveCollectionControlHash,
  normalizeCollectionStringSet,
} from "../models/collection_control_common.ts";
import {
  ControlledGatewayError,
  type ControlledGatewayClient,
} from "../adapters/controlled_gateway_client.ts";
import type { CollectionFetchRequestEnvelope } from "../types/fetch_request_envelope.ts";
import type { FetchDispatchResult, FetchGapCode } from "../types/fetch_dispatch_result.ts";
import { buildFetchAuditRecord } from "./build_fetch_audit_records.ts";
import { classifyFetchGap } from "./classify_fetch_gap.ts";
import { normalizeFetchResponse } from "./normalize_fetch_response.ts";

function readCutoffAt(request: CollectionFetchRequestEnvelope) {
  return request.read_model_contract.read_cutoff_at;
}

function failedDispatchResult(input: {
  fetch_gap_code: FetchGapCode;
  gateway_exchange_ref: string;
  observed_at: string;
  request: CollectionFetchRequestEnvelope;
}): FetchDispatchResult {
  const audit = buildFetchAuditRecord({
    event_code: "FETCH_GATEWAY_ABORTED",
    fetch_gap_code_or_null: input.fetch_gap_code,
    gateway_exchange_ref: input.gateway_exchange_ref,
    observed_at: input.observed_at,
    request: input.request,
  });
  const classification = classifyFetchGap(input.fetch_gap_code);
  const requestAuditRefs = normalizeCollectionStringSet("fetch_result.request_audit_refs", [
    audit.audit_ref,
  ]);
  const cursorHash = deriveCollectionControlHash({
    artifact_family: "COLLECTION_FETCH_ABORTED_CURSOR",
    payload: {
      fetch_gap_code: input.fetch_gap_code,
      request_hash: input.request.request_hash,
    },
  });
  const revisionHash = deriveCollectionControlHash({
    artifact_family: "COLLECTION_FETCH_ABORTED_REVISION",
    payload: {
      fetch_gap_code: input.fetch_gap_code,
      provider_api_version: input.request.provider_api_version,
      request_hash: input.request.request_hash,
    },
  });
  return {
    cursor_checkpoint_ref: `cursor-checkpoint://${cursorHash}`,
    empty_response_confirmed: false,
    failure_reason_code_or_null: "DISPATCH_FATAL_FAILURE",
    fetch_audit_refs: requestAuditRefs,
    fetch_gap_code_or_null: input.fetch_gap_code,
    fetch_posture: "FATAL_FAILURE",
    observed_provider_schema_version: input.request.provider_api_version,
    outcome_code: "SOURCE_FATAL_FAILURE",
    page_audit_refs: [],
    partial_gap_code_or_null: classification.partial_gap_code,
    partial_gap_refs: [],
    provider_api_version: input.request.provider_api_version,
    provider_environment_ref: input.request.provider_environment_ref,
    raw_payload_refs: [],
    request_audit_refs: requestAuditRefs,
    revision_ref: `revision://${revisionHash}`,
    source_domain: input.request.source_domain,
  };
}

export async function dispatchCollectionFetch(input: {
  gateway: ControlledGatewayClient;
  now: string;
  request: CollectionFetchRequestEnvelope;
}): Promise<FetchDispatchResult> {
  const now = normalizeUtcInstantString(input.now);
  if (parseUtcInstant(now).valueOf() > parseUtcInstant(readCutoffAt(input.request)).valueOf()) {
    return failedDispatchResult({
      fetch_gap_code: "READ_CUTOFF_EXCEEDED",
      gateway_exchange_ref: `gateway-exchange://blocked/${input.request.request_id}`,
      observed_at: now,
      request: input.request,
    });
  }

  try {
    const response = await input.gateway.sendCollectionFetch(input.request);
    return normalizeFetchResponse({ request: input.request, response });
  } catch (error) {
    const fetchGapCode =
      error instanceof ControlledGatewayError
        ? error.fetch_gap_code
        : ("UNKNOWN_GATEWAY_FAILURE" as const);
    return failedDispatchResult({
      fetch_gap_code: fetchGapCode,
      gateway_exchange_ref: `gateway-exchange://failed/${input.request.request_id}`,
      observed_at: now,
      request: input.request,
    });
  }
}
