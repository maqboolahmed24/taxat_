import type {
  SourceCollectionFetchOutcome,
  SourceCollectionPartialGapCode,
} from "./source_collection_outcome.ts";

export type FetchGapCode =
  | "AUTH_TOKEN_PROBLEM"
  | "CLIENT_BINDING_MISMATCH"
  | "CONNECTOR_BINDING_AMBIGUOUS"
  | "CONNECTOR_BINDING_EXPIRED"
  | "CONNECTOR_BINDING_MISSING"
  | "CONNECTOR_BINDING_REVOKED"
  | "CONNECTOR_BINDING_SCOPE_LIMITED"
  | "CONNECTOR_BINDING_SUPERSEDED"
  | "DELEGATION_GAP"
  | "ENVIRONMENT_DRIFT"
  | "PAGINATION_TRUNCATED"
  | "PARSE_FAILURE"
  | "PROVIDER_API_VERSION_MISMATCH"
  | "PROVIDER_ENVIRONMENT_MISMATCH"
  | "RATE_LIMITED"
  | "READ_CUTOFF_EXCEEDED"
  | "REVISION_DRIFT"
  | "SCHEMA_DRIFT"
  | "TIMEOUT"
  | "UNKNOWN_GATEWAY_FAILURE";

export type FetchDispatchPosture =
  | "FETCHED"
  | "EMPTY_CONFIRMED"
  | "PARTIAL_GAP"
  | "FATAL_FAILURE";

export type FetchDispatchRawPayloadRef = {
  page_index: number;
  raw_payload_ref: string;
};

export type FetchDispatchResult = SourceCollectionFetchOutcome & {
  cursor_checkpoint_ref: string;
  empty_response_confirmed: boolean;
  fetch_gap_code_or_null: FetchGapCode | null;
  fetch_posture: FetchDispatchPosture;
  observed_provider_schema_version: string;
  provider_api_version: string;
  provider_environment_ref: string;
  raw_payload_refs: FetchDispatchRawPayloadRef[];
  request_audit_refs: string[];
  revision_ref: string;
};

export type FetchGapClassification = {
  fetch_gap_code: FetchGapCode;
  partial_gap_code: SourceCollectionPartialGapCode;
  terminality: "PARTIAL" | "FATAL";
};
