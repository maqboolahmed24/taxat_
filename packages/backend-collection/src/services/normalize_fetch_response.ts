import type {
  ControlledGatewayFetchPage,
  ControlledGatewayFetchResponse,
  ControlledGatewayPageStatus,
} from "../adapters/controlled_gateway_client.ts";
import {
  normalizeCollectionStringSet,
  deriveCollectionControlHash,
} from "../models/collection_control_common.ts";
import type { CollectionFetchRequestEnvelope } from "../types/fetch_request_envelope.ts";
import type { FetchDispatchResult, FetchGapCode } from "../types/fetch_dispatch_result.ts";
import { buildFetchAuditRecord } from "./build_fetch_audit_records.ts";
import { classifyFetchGap } from "./classify_fetch_gap.ts";
import { extractCursorCheckpoint } from "./extract_cursor_checkpoint.ts";
import { extractRevisionMarker } from "./extract_revision_marker.ts";

function statusGapCode(status: ControlledGatewayPageStatus): FetchGapCode | null {
  switch (status) {
    case "SUCCESS":
    case "EMPTY":
      return null;
    case "RATE_LIMITED":
      return "RATE_LIMITED";
    case "TIMEOUT":
      return "TIMEOUT";
    case "PARSE_FAILURE":
      return "PARSE_FAILURE";
    case "SCHEMA_DRIFT":
      return "SCHEMA_DRIFT";
    case "PAGINATION_TRUNCATED":
      return "PAGINATION_TRUNCATED";
    case "REVISION_DRIFT":
      return "REVISION_DRIFT";
  }
}

function partialGapRef(input: {
  fetch_gap_code: FetchGapCode;
  page: ControlledGatewayFetchPage;
  request: CollectionFetchRequestEnvelope;
}) {
  const hash = deriveCollectionControlHash({
    artifact_family: "COLLECTION_FETCH_PARTIAL_GAP",
    payload: {
      fetch_gap_code: input.fetch_gap_code,
      page_index: input.page.page_index,
      request_hash: input.request.request_hash,
      source_domain: input.request.source_domain,
    },
  });
  return `partial-gap://${input.request.source_domain}/${input.fetch_gap_code}/${hash}`;
}

export function normalizeFetchResponse(input: {
  request: CollectionFetchRequestEnvelope;
  response: ControlledGatewayFetchResponse;
}): FetchDispatchResult {
  const requestAudit = buildFetchAuditRecord({
    event_code:
      input.response.response_status === "EMPTY"
        ? "FETCH_EMPTY_CONFIRMED"
        : "FETCH_REQUEST_DISPATCHED",
    gateway_exchange_ref: input.response.gateway_exchange_ref,
    observed_at: input.response.received_at,
    request: input.request,
  });

  const pageAudits = input.response.pages.map((page) => {
    const gapCode = statusGapCode(page.status);
    return buildFetchAuditRecord({
      event_code: gapCode === null ? "FETCH_PAGE_RECEIVED" : "FETCH_PAGE_GAP",
      fetch_gap_code_or_null: gapCode,
      gateway_exchange_ref: input.response.gateway_exchange_ref,
      observed_at: input.response.received_at,
      page_index_or_null: page.page_index,
      raw_payload_ref_or_null: page.raw_payload_ref_or_null ?? null,
      request: input.request,
    });
  });

  const gapPages = input.response.pages
    .map((page) => ({ gap_code: statusGapCode(page.status), page }))
    .filter((entry): entry is { gap_code: FetchGapCode; page: ControlledGatewayFetchPage } =>
      entry.gap_code !== null,
    );
  const rawPayloadRefs = input.response.pages
    .filter((page) => page.raw_payload_ref_or_null !== null && page.raw_payload_ref_or_null !== undefined)
    .map((page) => ({
      page_index: page.page_index,
      raw_payload_ref: page.raw_payload_ref_or_null!,
    }))
    .sort((left, right) => left.page_index - right.page_index);
  const requestAuditRefs = normalizeCollectionStringSet("fetch_result.request_audit_refs", [
    requestAudit.audit_ref,
  ]);
  const pageAuditRefs = normalizeCollectionStringSet(
    "fetch_result.page_request_audit_refs",
    pageAudits.map((audit) => audit.audit_ref),
  );
  const cursorCheckpointRef = extractCursorCheckpoint(input);
  const revisionRef = extractRevisionMarker(input);
  const emptyConfirmed =
    input.response.response_status === "EMPTY" ||
    (input.response.pages.length > 0 &&
      input.response.pages.every((page) => page.status === "EMPTY"));

  if (gapPages.length === 0) {
    return {
      cursor_checkpoint_ref: cursorCheckpointRef,
      empty_response_confirmed: emptyConfirmed,
      fetch_audit_refs: requestAuditRefs,
      fetch_gap_code_or_null: null,
      fetch_posture: emptyConfirmed ? "EMPTY_CONFIRMED" : "FETCHED",
      observed_provider_schema_version: input.response.observed_provider_schema_version,
      outcome_code: emptyConfirmed ? "SOURCE_EMPTY_CONFIRMED" : "SOURCE_FETCHED",
      page_audit_refs: pageAuditRefs,
      partial_gap_code_or_null: null,
      partial_gap_refs: [],
      provider_api_version: input.request.provider_api_version,
      provider_environment_ref: input.request.provider_environment_ref,
      raw_payload_refs: rawPayloadRefs,
      request_audit_refs: requestAuditRefs,
      revision_ref: revisionRef,
      source_domain: input.request.source_domain,
    };
  }

  const firstFatalGap = gapPages
    .map((entry) => classifyFetchGap(entry.gap_code))
    .find((classification) => classification.terminality === "FATAL");
  if (firstFatalGap) {
    return {
      cursor_checkpoint_ref: cursorCheckpointRef,
      empty_response_confirmed: false,
      failure_reason_code_or_null: "DISPATCH_FATAL_FAILURE",
      fetch_audit_refs: requestAuditRefs,
      fetch_gap_code_or_null: firstFatalGap.fetch_gap_code,
      fetch_posture: "FATAL_FAILURE",
      observed_provider_schema_version: input.response.observed_provider_schema_version,
      outcome_code: "SOURCE_FATAL_FAILURE",
      page_audit_refs: pageAuditRefs,
      partial_gap_code_or_null: firstFatalGap.partial_gap_code,
      partial_gap_refs: [],
      provider_api_version: input.request.provider_api_version,
      provider_environment_ref: input.request.provider_environment_ref,
      raw_payload_refs: rawPayloadRefs,
      request_audit_refs: requestAuditRefs,
      revision_ref: revisionRef,
      source_domain: input.request.source_domain,
    };
  }

  const firstGap = classifyFetchGap(gapPages[0]!.gap_code);
  return {
    cursor_checkpoint_ref: cursorCheckpointRef,
    empty_response_confirmed: false,
    fetch_audit_refs: requestAuditRefs,
    fetch_gap_code_or_null: firstGap.fetch_gap_code,
    fetch_posture: "PARTIAL_GAP",
    observed_provider_schema_version: input.response.observed_provider_schema_version,
    outcome_code: "SOURCE_PARTIAL_GAP",
    page_audit_refs: pageAuditRefs,
    partial_gap_code_or_null: firstGap.partial_gap_code,
    partial_gap_refs: normalizeCollectionStringSet(
      "fetch_result.partial_gap_refs",
      gapPages.map((entry) =>
        partialGapRef({
          fetch_gap_code: entry.gap_code,
          page: entry.page,
          request: input.request,
        }),
      ),
      { minItems: 1 },
    ),
    provider_api_version: input.request.provider_api_version,
    provider_environment_ref: input.request.provider_environment_ref,
    raw_payload_refs: rawPayloadRefs,
    request_audit_refs: requestAuditRefs,
    revision_ref: revisionRef,
    source_domain: input.request.source_domain,
  };
}
