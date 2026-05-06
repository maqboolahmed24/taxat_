import { parseUtcInstant } from "../../../domain-kernel/src/primitives/time.ts";
import type { SourcePlanPlannedSourceRecord } from "../models/source_plan.ts";
import {
  normalizeCollectionString,
  normalizeCollectionStringSet,
} from "../models/collection_control_common.ts";
import type { ConnectorBindingRecord } from "../types/fetch_request_envelope.ts";
import type { FetchGapCode } from "../types/fetch_dispatch_result.ts";

export type ConnectorBindingResolutionErrorCode =
  | "CONNECTOR_BINDING_AMBIGUOUS"
  | "CONNECTOR_BINDING_CLIENT_MISMATCH"
  | "CONNECTOR_BINDING_DELEGATION_GAP"
  | "CONNECTOR_BINDING_ENVIRONMENT_MISMATCH"
  | "CONNECTOR_BINDING_EXPIRED"
  | "CONNECTOR_BINDING_NOT_ACTIVE"
  | "CONNECTOR_BINDING_NOT_FOUND"
  | "CONNECTOR_BINDING_PARTITION_MISMATCH"
  | "CONNECTOR_BINDING_PROVIDER_API_VERSION_MISMATCH"
  | "CONNECTOR_BINDING_PROVIDER_MISMATCH"
  | "CONNECTOR_BINDING_REVOKED"
  | "CONNECTOR_BINDING_SCOPE_LIMITED"
  | "CONNECTOR_BINDING_SUPERSEDED"
  | "CONNECTOR_BINDING_TOKEN_INVALID";

export class ConnectorBindingResolutionError extends Error {
  readonly code: ConnectorBindingResolutionErrorCode;
  readonly fetch_gap_code: FetchGapCode;

  constructor(
    code: ConnectorBindingResolutionErrorCode,
    fetchGapCode: FetchGapCode,
    detail: string,
  ) {
    super(`${code}: ${detail}`);
    this.name = "ConnectorBindingResolutionError";
    this.code = code;
    this.fetch_gap_code = fetchGapCode;
  }
}

export type ConnectorBindingResolution = {
  binding_ref: string;
  precedence_key: string[];
  resolved_binding: ConnectorBindingRecord;
  resolution_basis: "EXACT_PROVIDER_BINDING_REF";
};

function connectorBindingRef(binding: Pick<ConnectorBindingRecord, "binding_id">) {
  return `connector-binding://${binding.binding_id}`;
}

function normalizeBinding(binding: ConnectorBindingRecord): ConnectorBindingRecord {
  if (binding.artifact_type !== "ConnectorBinding") {
    throw new ConnectorBindingResolutionError(
      "CONNECTOR_BINDING_NOT_FOUND",
      "CONNECTOR_BINDING_MISSING",
      "connector binding artifact_type must be ConnectorBinding",
    );
  }
  return {
    artifact_type: "ConnectorBinding",
    binding_id: normalizeCollectionString("connector_binding.binding_id", binding.binding_id),
    tenant_id: normalizeCollectionString("connector_binding.tenant_id", binding.tenant_id),
    client_id: normalizeCollectionString("connector_binding.client_id", binding.client_id),
    provider: normalizeCollectionString("connector_binding.provider", binding.provider),
    provider_environment: normalizeCollectionString(
      "connector_binding.provider_environment",
      binding.provider_environment,
    ),
    provider_api_version: normalizeCollectionString(
      "connector_binding.provider_api_version",
      binding.provider_api_version,
    ),
    subject_ref: normalizeCollectionString("connector_binding.subject_ref", binding.subject_ref),
    scopes: normalizeCollectionStringSet("connector_binding.scopes", binding.scopes, {
      minItems: 1,
    }),
    partition_scope_refs: normalizeCollectionStringSet(
      "connector_binding.partition_scope_refs",
      binding.partition_scope_refs,
    ),
    token_ref: normalizeCollectionString("connector_binding.token_ref", binding.token_ref),
    token_version_ref: normalizeCollectionString(
      "connector_binding.token_version_ref",
      binding.token_version_ref,
    ),
    binding_lineage_ref: normalizeCollectionString(
      "connector_binding.binding_lineage_ref",
      binding.binding_lineage_ref,
    ),
    lifecycle_state: binding.lifecycle_state,
    health_state: binding.health_state,
    delegation_state: binding.delegation_state,
    client_binding_state: binding.client_binding_state,
    last_validated_at:
      binding.last_validated_at === null ? null : parseUtcInstant(binding.last_validated_at).toISOString(),
    expires_at: binding.expires_at === null ? null : parseUtcInstant(binding.expires_at).toISOString(),
    revoked_at: binding.revoked_at === null ? null : parseUtcInstant(binding.revoked_at).toISOString(),
    superseded_by_binding_id:
      binding.superseded_by_binding_id === null
        ? null
        : normalizeCollectionString(
            "connector_binding.superseded_by_binding_id",
            binding.superseded_by_binding_id,
          ),
    blocked_reason_codes: normalizeCollectionStringSet(
      "connector_binding.blocked_reason_codes",
      binding.blocked_reason_codes,
    ),
    source_evidence_refs: normalizeCollectionStringSet(
      "connector_binding.source_evidence_refs",
      binding.source_evidence_refs,
      { minItems: 1 },
    ),
  };
}

function assertSubset(input: {
  code: ConnectorBindingResolutionErrorCode;
  detail: string;
  fetch_gap_code: FetchGapCode;
  subset: readonly string[];
  superset: readonly string[];
}) {
  const superset = new Set(input.superset);
  if (!input.subset.every((value) => superset.has(value))) {
    throw new ConnectorBindingResolutionError(input.code, input.fetch_gap_code, input.detail);
  }
}

function failForBindingPosture(binding: ConnectorBindingRecord, resolvedAt: string) {
  if (binding.revoked_at !== null || binding.lifecycle_state === "REVOKED") {
    throw new ConnectorBindingResolutionError(
      "CONNECTOR_BINDING_REVOKED",
      "CONNECTOR_BINDING_REVOKED",
      `connector binding ${binding.binding_id} is revoked`,
    );
  }
  if (binding.superseded_by_binding_id !== null || binding.lifecycle_state === "SUPERSEDED") {
    throw new ConnectorBindingResolutionError(
      "CONNECTOR_BINDING_SUPERSEDED",
      "CONNECTOR_BINDING_SUPERSEDED",
      `connector binding ${binding.binding_id} is superseded`,
    );
  }
  if (
    binding.lifecycle_state === "EXPIRED" ||
    (binding.expires_at !== null &&
      parseUtcInstant(binding.expires_at).valueOf() <= parseUtcInstant(resolvedAt).valueOf())
  ) {
    throw new ConnectorBindingResolutionError(
      "CONNECTOR_BINDING_EXPIRED",
      "CONNECTOR_BINDING_EXPIRED",
      `connector binding ${binding.binding_id} is expired`,
    );
  }
  if (binding.lifecycle_state === "TOKEN_INVALID" || binding.health_state === "TOKEN_INVALID") {
    throw new ConnectorBindingResolutionError(
      "CONNECTOR_BINDING_TOKEN_INVALID",
      "AUTH_TOKEN_PROBLEM",
      `connector binding ${binding.binding_id} has invalid token posture`,
    );
  }
  if (binding.client_binding_state !== "BOUND") {
    throw new ConnectorBindingResolutionError(
      "CONNECTOR_BINDING_CLIENT_MISMATCH",
      "CLIENT_BINDING_MISMATCH",
      `connector binding ${binding.binding_id} is not bound to the requested client`,
    );
  }
  if (!["NOT_REQUIRED", "SATISFIED"].includes(binding.delegation_state)) {
    throw new ConnectorBindingResolutionError(
      "CONNECTOR_BINDING_DELEGATION_GAP",
      "DELEGATION_GAP",
      `connector binding ${binding.binding_id} has unsatisfied delegation posture`,
    );
  }
  if (
    binding.lifecycle_state !== "ACTIVE" ||
    !["HEALTHY", "EXPIRING_SOON"].includes(binding.health_state)
  ) {
    throw new ConnectorBindingResolutionError(
      "CONNECTOR_BINDING_NOT_ACTIVE",
      "UNKNOWN_GATEWAY_FAILURE",
      `connector binding ${binding.binding_id} is not active and healthy`,
    );
  }
}

export function resolveConnectorBinding(input: {
  bindings: readonly ConnectorBindingRecord[];
  client_id: string;
  planned_source: SourcePlanPlannedSourceRecord;
  provider: string;
  provider_api_version: string;
  provider_environment: string;
  required_scope_refs?: readonly string[];
  resolved_at: string;
  subject_ref: string;
  tenant_id: string;
}): ConnectorBindingResolution {
  const plannedSource = input.planned_source;
  const providerBindingRef = normalizeCollectionString(
    "planned_source.provider_binding_ref",
    plannedSource.provider_binding_ref,
  );
  const normalizedBindings = input.bindings.map((binding) => normalizeBinding(binding));
  const exactMatches = normalizedBindings.filter(
    (binding) =>
      binding.binding_id === providerBindingRef ||
      connectorBindingRef(binding) === providerBindingRef ||
      binding.binding_lineage_ref === providerBindingRef,
  );

  if (exactMatches.length === 0) {
    throw new ConnectorBindingResolutionError(
      "CONNECTOR_BINDING_NOT_FOUND",
      "CONNECTOR_BINDING_MISSING",
      `no connector binding matched ${providerBindingRef}`,
    );
  }
  if (exactMatches.length > 1) {
    throw new ConnectorBindingResolutionError(
      "CONNECTOR_BINDING_AMBIGUOUS",
      "CONNECTOR_BINDING_AMBIGUOUS",
      `multiple connector bindings matched ${providerBindingRef}`,
    );
  }

  const binding = exactMatches[0]!;
  const expectedTenantId = normalizeCollectionString("connector_resolution.tenant_id", input.tenant_id);
  const expectedClientId = normalizeCollectionString("connector_resolution.client_id", input.client_id);
  const expectedSubjectRef = normalizeCollectionString(
    "connector_resolution.subject_ref",
    input.subject_ref,
  );
  const expectedProvider = normalizeCollectionString("connector_resolution.provider", input.provider);
  const expectedEnvironment = normalizeCollectionString(
    "connector_resolution.provider_environment",
    input.provider_environment,
  );
  const expectedApiVersion = normalizeCollectionString(
    "connector_resolution.provider_api_version",
    input.provider_api_version,
  );

  if (
    binding.tenant_id !== expectedTenantId ||
    binding.client_id !== expectedClientId ||
    binding.subject_ref !== expectedSubjectRef
  ) {
    throw new ConnectorBindingResolutionError(
      "CONNECTOR_BINDING_CLIENT_MISMATCH",
      "CLIENT_BINDING_MISMATCH",
      `connector binding ${binding.binding_id} does not match requested tenant/client/subject`,
    );
  }
  if (binding.provider !== expectedProvider) {
    throw new ConnectorBindingResolutionError(
      "CONNECTOR_BINDING_PROVIDER_MISMATCH",
      "UNKNOWN_GATEWAY_FAILURE",
      `connector binding ${binding.binding_id} provider does not match plan`,
    );
  }
  if (binding.provider_environment !== expectedEnvironment) {
    throw new ConnectorBindingResolutionError(
      "CONNECTOR_BINDING_ENVIRONMENT_MISMATCH",
      "PROVIDER_ENVIRONMENT_MISMATCH",
      `connector binding ${binding.binding_id} provider environment does not match plan`,
    );
  }
  if (binding.provider_api_version !== expectedApiVersion) {
    throw new ConnectorBindingResolutionError(
      "CONNECTOR_BINDING_PROVIDER_API_VERSION_MISMATCH",
      "PROVIDER_API_VERSION_MISMATCH",
      `connector binding ${binding.binding_id} provider API version does not match plan`,
    );
  }

  failForBindingPosture(binding, input.resolved_at);

  if (binding.partition_scope_refs.length > 0) {
    assertSubset({
      code: "CONNECTOR_BINDING_PARTITION_MISMATCH",
      detail: `planned source partitions exceed connector binding ${binding.binding_id}`,
      fetch_gap_code: "CONNECTOR_BINDING_SCOPE_LIMITED",
      subset: plannedSource.partition_scope_refs,
      superset: binding.partition_scope_refs,
    });
  }
  assertSubset({
    code: "CONNECTOR_BINDING_SCOPE_LIMITED",
    detail: `required connector scopes exceed binding ${binding.binding_id}`,
    fetch_gap_code: "CONNECTOR_BINDING_SCOPE_LIMITED",
    subset: normalizeCollectionStringSet(
      "connector_resolution.required_scope_refs",
      input.required_scope_refs ?? [plannedSource.source_domain],
      { minItems: 1 },
    ),
    superset: binding.scopes,
  });

  return {
    binding_ref: connectorBindingRef(binding),
    precedence_key: [
      providerBindingRef,
      expectedProvider,
      expectedEnvironment,
      expectedApiVersion,
      expectedClientId,
      expectedSubjectRef,
      ...plannedSource.partition_scope_refs,
    ],
    resolved_binding: binding,
    resolution_basis: "EXACT_PROVIDER_BINDING_REF",
  };
}
