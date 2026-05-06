import type { FetchGapClassification, FetchGapCode } from "../types/fetch_dispatch_result.ts";

export function classifyFetchGap(fetchGapCode: FetchGapCode): FetchGapClassification {
  switch (fetchGapCode) {
    case "RATE_LIMITED":
    case "PAGINATION_TRUNCATED":
    case "PARSE_FAILURE":
    case "REVISION_DRIFT":
    case "SCHEMA_DRIFT":
    case "TIMEOUT":
      return {
        fetch_gap_code: fetchGapCode,
        partial_gap_code:
          fetchGapCode === "SCHEMA_DRIFT" || fetchGapCode === "REVISION_DRIFT"
            ? "STALE_AT_CUTOFF"
            : "PARTIAL_PROVIDER_RESPONSE",
        terminality: "PARTIAL",
      };
    case "AUTH_TOKEN_PROBLEM":
    case "CLIENT_BINDING_MISMATCH":
    case "CONNECTOR_BINDING_AMBIGUOUS":
    case "CONNECTOR_BINDING_EXPIRED":
    case "CONNECTOR_BINDING_MISSING":
    case "CONNECTOR_BINDING_REVOKED":
    case "CONNECTOR_BINDING_SCOPE_LIMITED":
    case "CONNECTOR_BINDING_SUPERSEDED":
    case "DELEGATION_GAP":
    case "ENVIRONMENT_DRIFT":
    case "PROVIDER_API_VERSION_MISMATCH":
    case "PROVIDER_ENVIRONMENT_MISMATCH":
    case "READ_CUTOFF_EXCEEDED":
    case "UNKNOWN_GATEWAY_FAILURE":
      return {
        fetch_gap_code: fetchGapCode,
        partial_gap_code: "MANUAL_CHECKPOINT_REQUIRED",
        terminality: "FATAL",
      };
  }
}
