import { parseUtcInstant, normalizeUtcInstantString } from "../../../domain-kernel/src/primitives/time.ts";
import type { SourcePlanPlannedSourceRecord } from "../models/source_plan.ts";
import {
  deriveCollectionControlHash,
  normalizeCollectionString,
  normalizeCollectionStringSet,
} from "../models/collection_control_common.ts";
import type {
  CollectionFetchReadModelContract,
  CollectionFetchRequestEnvelope,
  ConnectorBindingRecord,
} from "../types/fetch_request_envelope.ts";

export type CollectionFetchRequestErrorCode = "COLLECTION_FETCH_REQUEST_READ_CUTOFF_EXCEEDED";

export class CollectionFetchRequestError extends Error {
  readonly code: CollectionFetchRequestErrorCode;

  constructor(code: CollectionFetchRequestErrorCode, detail: string) {
    super(`${code}: ${detail}`);
    this.name = "CollectionFetchRequestError";
    this.code = code;
  }
}

function readModelContract(input: {
  planned_source: SourcePlanPlannedSourceRecord;
  read_cutoff_at: string;
}): CollectionFetchReadModelContract {
  switch (input.planned_source.read_model) {
    case "AS_OF":
      return {
        as_of_at: input.read_cutoff_at,
        mode: "AS_OF",
        read_cutoff_at: input.read_cutoff_at,
      };
    case "WINDOWED":
      return {
        mode: "WINDOWED",
        read_cutoff_at: input.read_cutoff_at,
        window_basis_ref: input.planned_source.query_basis_ref,
        window_closed_at: input.read_cutoff_at,
      };
    case "POINT_IN_TIME":
      return {
        mode: "POINT_IN_TIME",
        point_in_time_at: input.read_cutoff_at,
        read_cutoff_at: input.read_cutoff_at,
      };
    case "LATEST_ALLOWED":
      return {
        latest_allowed_at: input.read_cutoff_at,
        mode: "LATEST_ALLOWED",
        read_cutoff_at: input.read_cutoff_at,
      };
  }
}

function connectorBindingRef(binding: Pick<ConnectorBindingRecord, "binding_id">) {
  return `connector-binding://${binding.binding_id}`;
}

function buildRequestHashBase(input: Omit<CollectionFetchRequestEnvelope, "request_hash">) {
  return {
    binding_lineage_ref: input.binding_lineage_ref,
    client_id: input.client_id,
    collection_run_id: input.collection_run_id,
    connector_binding_id: input.connector_binding_id,
    cursor_strategy_ref: input.cursor_strategy_ref,
    late_data_policy_ref: input.late_data_policy_ref,
    manifest_id: input.manifest_id,
    partition_scope_refs: input.partition_scope_refs,
    provider: input.provider,
    provider_api_version: input.provider_api_version,
    provider_environment_ref: input.provider_environment_ref,
    query_basis_ref: input.query_basis_ref,
    read_model_contract: input.read_model_contract,
    required_schema_refs: input.required_schema_refs,
    source_class: input.source_class,
    source_domain: input.source_domain,
    source_window_ref: input.source_window_ref,
    subject_ref: input.subject_ref,
    tenant_id: input.tenant_id,
    token_version_ref: input.token_version_ref,
  };
}

export function buildCollectionFetchRequest(input: {
  binding: ConnectorBindingRecord;
  collection_run_id: string;
  created_at: string;
  manifest_id: string;
  planned_source: SourcePlanPlannedSourceRecord;
  read_cutoff_at: string;
  source_window_ref: string;
  tenant_id: string;
}) {
  const createdAt = normalizeUtcInstantString(input.created_at);
  const readCutoffAt = normalizeUtcInstantString(input.read_cutoff_at);
  if (parseUtcInstant(createdAt).valueOf() > parseUtcInstant(readCutoffAt).valueOf()) {
    throw new CollectionFetchRequestError(
      "COLLECTION_FETCH_REQUEST_READ_CUTOFF_EXCEEDED",
      "collection fetch requests cannot be built after the active read cutoff",
    );
  }

  const plannedSource = {
    ...input.planned_source,
    partition_scope_refs: normalizeCollectionStringSet(
      "fetch_request.partition_scope_refs",
      input.planned_source.partition_scope_refs,
      { minItems: 1 },
    ),
    required_schema_refs: normalizeCollectionStringSet(
      "fetch_request.required_schema_refs",
      input.planned_source.required_schema_refs,
      { minItems: 1 },
    ),
    required_source_class_refs: normalizeCollectionStringSet(
      "fetch_request.required_source_class_refs",
      input.planned_source.required_source_class_refs ?? [],
    ),
  };
  const requestHashSeed = {
    binding_id: input.binding.binding_id,
    collection_run_id: input.collection_run_id,
    manifest_id: input.manifest_id,
    planned_source: plannedSource,
    read_cutoff_at: readCutoffAt,
    source_window_ref: input.source_window_ref,
    token_version_ref: input.binding.token_version_ref,
  };
  const requestId = `collection-fetch-request.${deriveCollectionControlHash({
    artifact_family: "COLLECTION_FETCH_REQUEST_ID",
    payload: requestHashSeed,
  })}`;

  const envelopeWithoutHash: Omit<CollectionFetchRequestEnvelope, "request_hash"> = {
    artifact_type: "CollectionFetchRequestEnvelope",
    binding_lineage_ref: normalizeCollectionString(
      "fetch_request.binding_lineage_ref",
      input.binding.binding_lineage_ref,
    ),
    client_id: normalizeCollectionString("fetch_request.client_id", input.binding.client_id),
    collection_run_id: normalizeCollectionString(
      "fetch_request.collection_run_id",
      input.collection_run_id,
    ),
    connector_binding_id: normalizeCollectionString(
      "fetch_request.connector_binding_id",
      input.binding.binding_id,
    ),
    connector_binding_ref: connectorBindingRef(input.binding),
    created_at: createdAt,
    cursor_strategy_ref: normalizeCollectionString(
      "fetch_request.cursor_strategy_ref",
      plannedSource.cursor_strategy_ref,
    ),
    gateway_policy: {
      credential_material_policy: "GATEWAY_ISSUED_FROM_TOKEN_REF_ONLY",
      direct_provider_call_policy: "APPLICATION_CODE_FORBIDDEN",
      raw_payload_logging_policy: "FORBIDDEN",
    },
    idempotency_key: `collection-fetch-idempotency.${deriveCollectionControlHash({
      artifact_family: "COLLECTION_FETCH_IDEMPOTENCY",
      payload: requestHashSeed,
    })}`,
    late_data_policy_ref: plannedSource.late_data_policy_ref,
    manifest_id: normalizeCollectionString("fetch_request.manifest_id", input.manifest_id),
    observed_binding_health_state: input.binding.health_state,
    partition_scope_refs: plannedSource.partition_scope_refs,
    planned_source: plannedSource,
    provider: normalizeCollectionString("fetch_request.provider", input.binding.provider),
    provider_api_version: normalizeCollectionString(
      "fetch_request.provider_api_version",
      input.binding.provider_api_version,
    ),
    provider_binding_ref: normalizeCollectionString(
      "fetch_request.provider_binding_ref",
      plannedSource.provider_binding_ref,
    ),
    provider_environment_ref: normalizeCollectionString(
      "fetch_request.provider_environment_ref",
      input.binding.provider_environment,
    ),
    query_basis_ref: normalizeCollectionString(
      "fetch_request.query_basis_ref",
      plannedSource.query_basis_ref,
    ),
    read_model_contract: readModelContract({
      planned_source: plannedSource,
      read_cutoff_at: readCutoffAt,
    }),
    request_id: requestId,
    required_schema_refs: plannedSource.required_schema_refs,
    source_class: plannedSource.source_class,
    source_domain: normalizeCollectionString(
      "fetch_request.source_domain",
      plannedSource.source_domain,
    ),
    source_window_ref: normalizeCollectionString(
      "fetch_request.source_window_ref",
      input.source_window_ref,
    ),
    subject_ref: normalizeCollectionString("fetch_request.subject_ref", input.binding.subject_ref),
    tenant_id: normalizeCollectionString("fetch_request.tenant_id", input.tenant_id),
    token_ref: normalizeCollectionString("fetch_request.token_ref", input.binding.token_ref),
    token_version_ref: normalizeCollectionString(
      "fetch_request.token_version_ref",
      input.binding.token_version_ref,
    ),
  };

  return {
    ...envelopeWithoutHash,
    request_hash: `collection-fetch-request-hash://${deriveCollectionControlHash({
      artifact_family: "COLLECTION_FETCH_REQUEST",
      payload: buildRequestHashBase(envelopeWithoutHash),
    })}`,
  };
}
