import { deriveCollectionControlHash } from "../models/collection_control_common.ts";
import type {
  ControlledGatewayFetchPage,
  ControlledGatewayFetchResponse,
} from "../adapters/controlled_gateway_client.ts";
import type { CollectionFetchRequestEnvelope } from "../types/fetch_request_envelope.ts";

function cursorMaterial(page: ControlledGatewayFetchPage) {
  return {
    cursor_token_or_null: page.cursor_token_or_null ?? null,
    page_index: page.page_index,
    status: page.status,
  };
}

export function extractCursorCheckpoint(input: {
  request: CollectionFetchRequestEnvelope;
  response: ControlledGatewayFetchResponse;
}) {
  const hash = deriveCollectionControlHash({
    artifact_family: "COLLECTION_FETCH_CURSOR_CHECKPOINT",
    payload: {
      cursor_strategy_ref: input.request.cursor_strategy_ref,
      gateway_exchange_ref: input.response.gateway_exchange_ref,
      pages: input.response.pages.map((page) => cursorMaterial(page)),
      request_hash: input.request.request_hash,
      source_domain: input.request.source_domain,
    },
  });
  return `cursor-checkpoint://${hash}`;
}
