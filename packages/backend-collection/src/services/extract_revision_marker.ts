import { deriveCollectionControlHash } from "../models/collection_control_common.ts";
import type { ControlledGatewayFetchResponse } from "../adapters/controlled_gateway_client.ts";
import type { CollectionFetchRequestEnvelope } from "../types/fetch_request_envelope.ts";

export function extractRevisionMarker(input: {
  request: CollectionFetchRequestEnvelope;
  response: ControlledGatewayFetchResponse;
}) {
  const hash = deriveCollectionControlHash({
    artifact_family: "COLLECTION_FETCH_REVISION_MARKER",
    payload: {
      observed_provider_schema_version: input.response.observed_provider_schema_version,
      page_revision_markers: input.response.pages.map((page) => ({
        page_index: page.page_index,
        revision_marker_or_null: page.revision_marker_or_null ?? null,
      })),
      provider: input.request.provider,
      provider_api_version: input.request.provider_api_version,
      request_hash: input.request.request_hash,
      source_domain: input.request.source_domain,
    },
  });
  return `revision://${hash}`;
}
