import type { CollectionFetchRequestEnvelope } from "../types/fetch_request_envelope.ts";
import type { FetchGapCode } from "../types/fetch_dispatch_result.ts";

export type ControlledGatewayPageStatus =
  | "SUCCESS"
  | "EMPTY"
  | "RATE_LIMITED"
  | "TIMEOUT"
  | "PARSE_FAILURE"
  | "SCHEMA_DRIFT"
  | "PAGINATION_TRUNCATED"
  | "REVISION_DRIFT";

export type ControlledGatewayFetchPage = {
  cursor_token_or_null?: string | null;
  observed_provider_schema_version?: string | null;
  page_index: number;
  raw_payload_ref_or_null?: string | null;
  revision_marker_or_null?: string | null;
  status: ControlledGatewayPageStatus;
};

export type ControlledGatewayFetchResponse = {
  gateway_exchange_ref: string;
  observed_provider_schema_version: string;
  pages: ControlledGatewayFetchPage[];
  received_at: string;
  response_status: "SUCCESS" | "EMPTY" | "PARTIAL" | "FAILURE";
};

export type ControlledGatewayErrorCode =
  | "AUTH_TOKEN_PROBLEM"
  | "CLIENT_BINDING_MISMATCH"
  | "RATE_LIMITED"
  | "TIMEOUT"
  | "UNKNOWN_GATEWAY_FAILURE";

export class ControlledGatewayError extends Error {
  readonly code: ControlledGatewayErrorCode;
  readonly fetch_gap_code: FetchGapCode;

  constructor(code: ControlledGatewayErrorCode, detail: string) {
    super(`${code}: ${detail}`);
    this.name = "ControlledGatewayError";
    this.code = code;
    this.fetch_gap_code = code;
  }
}

export interface ControlledGatewayClient {
  sendCollectionFetch(
    request: CollectionFetchRequestEnvelope,
  ): Promise<ControlledGatewayFetchResponse>;
}

export class ScriptedControlledGatewayClient implements ControlledGatewayClient {
  private readonly responses = new Map<
    string,
    ControlledGatewayFetchResponse | ControlledGatewayError
  >();

  constructor(
    responses: ReadonlyArray<{
      request_hash: string;
      response: ControlledGatewayFetchResponse | ControlledGatewayError;
    }>,
  ) {
    for (const response of responses) {
      this.responses.set(response.request_hash, response.response);
    }
  }

  async sendCollectionFetch(request: CollectionFetchRequestEnvelope) {
    const response = this.responses.get(request.request_hash);
    if (!response) {
      throw new ControlledGatewayError(
        "UNKNOWN_GATEWAY_FAILURE",
        `no scripted gateway response for ${request.request_hash}`,
      );
    }
    if (response instanceof ControlledGatewayError) {
      throw response;
    }
    return structuredClone(response);
  }
}
