import {
  AUTHORITY_REQUEST_IDENTITY_PROFILE_VERSION,
  NONE_SENTINEL,
  deriveAuthorityDuplicateMeaningKey,
  deriveAuthorityIdempotencyKey,
  deriveAuthorityIdentityNamespaceHash,
  deriveAuthorityRequestHash,
  stableJsonHash,
  stablePath,
  stableQueryString,
} from "../../../domain-kernel/src/primitives/hash.ts";
import {
  type AuthorityLayerBoundaryContract,
  AuthorityModelError,
  assertEnum,
  buildAuthorityLayerBoundaryContract,
  cloneRecord,
  hashObject,
  normalizeAuthorityLayerBoundaryContract,
  normalizeNullableString,
  normalizeSortedStringSet,
  refFromId,
  requireString,
  stableEqual,
} from "./authority_common.ts";
import { type AuthorityOperation, AUTHORITY_OPERATION_FAMILIES } from "./authority_operation.ts";
import {
  type AuthorityRequestIdentityContract,
  normalizeAuthorityRequestIdentityContract,
} from "./submission_record.ts";

export const AUTHORITY_HTTP_METHODS = ["GET", "POST", "PUT", "PATCH", "DELETE"] as const;
export type AuthorityHttpMethod = (typeof AUTHORITY_HTTP_METHODS)[number];

export type AuthorityRequestQueryParams = Record<string, string | string[]>;
export type AuthorityRequestPathParams = Record<string, string>;

export type CanonicalAuthorityRequestMaterial = {
  canonical_path: string;
  canonical_query: string;
  header_profile_refs: string[];
  http_method: AuthorityHttpMethod;
  payload_ref: string | null;
  query_params: AuthorityRequestQueryParams;
  request_body_hash: string;
  resolved_path_params: AuthorityRequestPathParams;
  resource_template: string;
};

export type AuthorityRequestEnvelope = {
  access_binding_hash: string;
  acting_party_ref: string;
  artifact_type: "AuthorityRequestEnvelope";
  attempt_lineage_manifest_id: string;
  authority_binding_ref: string;
  authority_layer_boundary: AuthorityLayerBoundaryContract;
  authority_link_ref: string;
  authority_name: string;
  authority_product_profile: string;
  authority_scope: string;
  basis_type: string | null;
  binding_lineage_ref: string;
  business_partition_refs: string[];
  canonical_path: string;
  canonical_query: string;
  client_id: string;
  delegation_grant_ref: string | null;
  duplicate_meaning_key: string;
  execution_basis_hash: string;
  fraud_header_capture_ref: string | null;
  fraud_header_exemption_reason: string | null;
  fraud_header_profile_ref: string | null;
  fraud_header_validation_ref: string | null;
  header_profile_refs: string[];
  http_method: AuthorityHttpMethod;
  idempotency_key: string;
  identity_namespace_hash: string;
  identity_profile_version: "AUTHORITY_REQUEST_IDENTITY_V2";
  manifest_hash: string;
  manifest_id: string;
  normalized_basis_type: string;
  normalized_obligation_ref: string;
  obligation_ref: string | null;
  operation_family: string;
  operation_id: string;
  operation_profile: string;
  payload_ref: string | null;
  policy_snapshot_hash: string;
  provider_api_version: string;
  provider_environment: string;
  query_params: AuthorityRequestQueryParams;
  request_body_hash: string;
  request_hash: string;
  request_id: string;
  request_identity_contract: AuthorityRequestIdentityContract;
  resolved_path_params: AuthorityRequestPathParams;
  resource_template: string;
  subject_ref: string;
  tenant_id: string;
  token_binding_ref: string;
  transmit_policy_ref: string;
};

export type AuthorityRequestEnvelopeBuildInput = Partial<
  Omit<
    AuthorityRequestEnvelope,
    | "artifact_type"
    | "authority_layer_boundary"
    | "business_partition_refs"
    | "header_profile_refs"
    | "identity_profile_version"
    | "query_params"
    | "request_identity_contract"
    | "resolved_path_params"
  >
> & {
  authority_layer_boundary?: AuthorityLayerBoundaryContract;
  business_partition_refs?: readonly string[];
  header_profile_refs?: readonly string[];
  operation?: AuthorityOperation;
  payload?: unknown;
  query_params?: AuthorityRequestQueryParams;
  request_identity_contract?: AuthorityRequestIdentityContract;
  resolved_path_params?: AuthorityRequestPathParams;
  client_id: string;
  manifest_id: string;
  operation_family: string;
  operation_id: string;
  request_id: string;
  tenant_id: string;
};

const BODY_METHODS = new Set<AuthorityHttpMethod>(["POST", "PUT", "PATCH"]);
const BODYLESS_METHODS = new Set<AuthorityHttpMethod>(["GET", "DELETE"]);
const MUTATION_OR_CALCULATION_FAMILIES = new Set([
  "AUTH_CREATE_OR_AMEND_DATA",
  "AUTH_DELETE_DATA",
  "AUTH_TRIGGER_CALCULATION",
  "AUTH_SUBMIT_FINAL_DECLARATION",
  "AUTH_SUBMIT_PERIODIC_UPDATE",
  "AUTH_SUBMIT_POST_FINALISATION_AMENDMENT",
]);

function normalizePathParams(input: AuthorityRequestPathParams | undefined) {
  const normalized: AuthorityRequestPathParams = {};
  for (const [key, value] of Object.entries(input ?? {})) {
    normalized[requireString("resolved_path_params.key", key)] = requireString(
      `resolved_path_params.${key}`,
      value,
    );
  }
  return normalized;
}

function normalizeQueryParams(input: AuthorityRequestQueryParams | undefined) {
  const normalized: AuthorityRequestQueryParams = {};
  for (const [key, value] of Object.entries(input ?? {})) {
    const normalizedKey = requireString("query_params.key", key);
    if (Array.isArray(value)) {
      const values = value.map((entry) => requireString(`query_params.${normalizedKey}`, entry));
      if (values.length === 0) {
        throw new AuthorityModelError(
          "AUTHORITY_FIELD_INVALID",
          `query_params.${normalizedKey} must not be an empty array`,
        );
      }
      normalized[normalizedKey] = values;
    } else {
      normalized[normalizedKey] = requireString(`query_params.${normalizedKey}`, value);
    }
  }
  return normalized;
}

function bodyHash(input: { payload?: unknown; payload_ref: string | null; request_body_hash?: string | null }) {
  if (input.payload_ref === null) {
    return NONE_SENTINEL;
  }
  if (input.request_body_hash !== undefined && input.request_body_hash !== null) {
    return requireString("request_body_hash", input.request_body_hash);
  }
  return stableJsonHash(input.payload ?? { payload_ref: input.payload_ref });
}

export function canonicalizeAuthorityRequestMaterial(input: {
  header_profile_refs?: readonly string[];
  http_method: AuthorityHttpMethod;
  payload?: unknown;
  payload_ref?: string | null;
  query_params?: AuthorityRequestQueryParams;
  request_body_hash?: string | null;
  resolved_path_params?: AuthorityRequestPathParams;
  resource_template: string;
}): CanonicalAuthorityRequestMaterial {
  const resourceTemplate = requireString("resource_template", input.resource_template);
  const resolvedPathParams = normalizePathParams(input.resolved_path_params);
  const queryParams = normalizeQueryParams(input.query_params);
  const canonicalPath = stablePath(resourceTemplate, resolvedPathParams);
  if (canonicalPath === null) {
    throw new AuthorityModelError(
      "AUTHORITY_FIELD_INVALID",
      "canonical_path must equal a fully resolved resource_template",
    );
  }
  const method = assertEnum("http_method", input.http_method, AUTHORITY_HTTP_METHODS);
  const payloadRef = normalizeNullableString("payload_ref", input.payload_ref ?? null);
  const requestBodyHash = bodyHash({
    payload: input.payload,
    payload_ref: payloadRef,
    request_body_hash: input.request_body_hash,
  });
  return {
    canonical_path: canonicalPath,
    canonical_query: stableQueryString(queryParams),
    header_profile_refs: normalizeSortedStringSet("header_profile_refs", input.header_profile_refs ?? []),
    http_method: method,
    payload_ref: payloadRef,
    query_params: queryParams,
    request_body_hash: requestBodyHash,
    resolved_path_params: resolvedPathParams,
    resource_template: resourceTemplate,
  };
}

function normalizeOptionalIdentity(value: string | null) {
  return value ?? NONE_SENTINEL;
}

function assertRequestMethodAndBody(envelope: AuthorityRequestEnvelope) {
  if (envelope.payload_ref === null) {
    if (!BODYLESS_METHODS.has(envelope.http_method)) {
      throw new AuthorityModelError(
        "AUTHORITY_CONTRACT_INVALID",
        "payload_ref null requires GET or DELETE http_method",
      );
    }
    if (envelope.request_body_hash !== NONE_SENTINEL) {
      throw new AuthorityModelError(
        "AUTHORITY_CONTRACT_INVALID",
        "request_body_hash must be <NONE> when payload_ref is null",
      );
    }
  } else {
    if (!BODY_METHODS.has(envelope.http_method)) {
      throw new AuthorityModelError(
        "AUTHORITY_CONTRACT_INVALID",
        "non-null payload_ref requires POST, PUT, or PATCH",
      );
    }
    if (envelope.request_body_hash === NONE_SENTINEL) {
      throw new AuthorityModelError(
        "AUTHORITY_CONTRACT_INVALID",
        "request_body_hash must not be <NONE> when payload_ref is present",
      );
    }
  }
}

function assertRequestFamilyRules(envelope: AuthorityRequestEnvelope) {
  if (MUTATION_OR_CALCULATION_FAMILIES.has(envelope.operation_family) && envelope.business_partition_refs.length === 0) {
    throw new AuthorityModelError(
      "AUTHORITY_CONTRACT_INVALID",
      "mutation-capable, calculation, and submit request envelopes require business_partition_refs",
    );
  }
  if (envelope.operation_family === "AUTH_SUBMIT_PERIODIC_UPDATE" && envelope.obligation_ref === null) {
    throw new AuthorityModelError(
      "AUTHORITY_CONTRACT_INVALID",
      "AUTH_SUBMIT_PERIODIC_UPDATE request envelopes require obligation_ref",
    );
  }
  if (
    [
      "AUTH_TRIGGER_CALCULATION",
      "AUTH_SUBMIT_FINAL_DECLARATION",
      "AUTH_SUBMIT_POST_FINALISATION_AMENDMENT",
    ].includes(envelope.operation_family) &&
    envelope.basis_type === null
  ) {
    throw new AuthorityModelError(
      "AUTHORITY_CONTRACT_INVALID",
      "calculation, final declaration, and amendment submit request envelopes require basis_type",
    );
  }
}

function assertRequestFraudHeaderRules(envelope: AuthorityRequestEnvelope) {
  if (envelope.fraud_header_profile_ref === null) {
    if (
      envelope.fraud_header_capture_ref !== null ||
      envelope.fraud_header_validation_ref !== null ||
      envelope.fraud_header_exemption_reason !== null
    ) {
      throw new AuthorityModelError(
        "AUTHORITY_CONTRACT_INVALID",
        "fraud header capture, validation, and exemption refs must clear when fraud_header_profile_ref is null",
      );
    }
  } else if (envelope.fraud_header_validation_ref === null && envelope.fraud_header_exemption_reason === null) {
    throw new AuthorityModelError(
      "AUTHORITY_CONTRACT_INVALID",
      "fraud_header_profile_ref requires either capture+validation refs or an explicit exemption reason",
    );
  }
  if (envelope.fraud_header_validation_ref !== null) {
    if (envelope.fraud_header_profile_ref === null || envelope.fraud_header_capture_ref === null) {
      throw new AuthorityModelError(
        "AUTHORITY_CONTRACT_INVALID",
        "fraud_header_validation_ref requires profile and capture refs",
      );
    }
    if (envelope.fraud_header_exemption_reason !== null) {
      throw new AuthorityModelError(
        "AUTHORITY_CONTRACT_INVALID",
        "fraud_header_validation_ref cannot coexist with fraud_header_exemption_reason",
      );
    }
  }
  if (envelope.fraud_header_exemption_reason !== null) {
    if (envelope.fraud_header_profile_ref === null) {
      throw new AuthorityModelError(
        "AUTHORITY_CONTRACT_INVALID",
        "fraud_header_exemption_reason requires fraud_header_profile_ref",
      );
    }
    if (envelope.fraud_header_capture_ref !== null || envelope.fraud_header_validation_ref !== null) {
      throw new AuthorityModelError(
        "AUTHORITY_CONTRACT_INVALID",
        "fraud_header_exemption_reason must clear fraud capture and validation refs",
      );
    }
  }
}

function assertRequestActingParty(envelope: AuthorityRequestEnvelope) {
  if (envelope.acting_party_ref !== envelope.subject_ref && envelope.delegation_grant_ref === null) {
    throw new AuthorityModelError(
      "AUTHORITY_CONTRACT_INVALID",
      "delegation_grant_ref must be populated when acting_party_ref differs from subject_ref",
    );
  }
  if (envelope.acting_party_ref === envelope.subject_ref && envelope.delegation_grant_ref !== null) {
    throw new AuthorityModelError(
      "AUTHORITY_CONTRACT_INVALID",
      "self-acting authority request envelopes must not retain delegation_grant_ref",
    );
  }
  if (
    envelope.acting_party_ref !== envelope.subject_ref &&
    !["SATISFIED", "LIMITED"].includes(envelope.authority_layer_boundary.client_delegation_state)
  ) {
    throw new AuthorityModelError(
      "AUTHORITY_CONTRACT_INVALID",
      "delegated authority request envelopes require live-usable delegation posture",
    );
  }
  if (
    envelope.acting_party_ref === envelope.subject_ref &&
    envelope.authority_layer_boundary.client_delegation_state !== "NOT_REQUIRED"
  ) {
    throw new AuthorityModelError(
      "AUTHORITY_CONTRACT_INVALID",
      "self-acting authority request envelopes require client_delegation_state NOT_REQUIRED",
    );
  }
}

export function buildAuthorityRequestIdentityContract(
  envelope: Omit<AuthorityRequestEnvelope, "request_identity_contract">,
): AuthorityRequestIdentityContract {
  return normalizeAuthorityRequestIdentityContract(
    {
      access_binding_hash: envelope.access_binding_hash,
      acting_party_ref: envelope.acting_party_ref,
      attempt_lineage_manifest_id: envelope.attempt_lineage_manifest_id,
      authority_binding_ref: envelope.authority_binding_ref,
      authority_link_ref: envelope.authority_link_ref,
      authority_name: envelope.authority_name,
      authority_product_profile: envelope.authority_product_profile,
      authority_scope: envelope.authority_scope,
      basis_type_or_null: envelope.basis_type,
      binding_lineage_ref: envelope.binding_lineage_ref,
      binding_scope_class: "AUTHORITY_REQUEST_ENVELOPE",
      business_partition_refs: envelope.business_partition_refs,
      canonical_path: envelope.canonical_path,
      canonical_query: envelope.canonical_query,
      client_id: envelope.client_id,
      contract_version: "AUTHORITY_REQUEST_IDENTITY_CONTRACT_V1",
      delegation_grant_ref_or_null: envelope.delegation_grant_ref,
      duplicate_meaning_key: envelope.duplicate_meaning_key,
      execution_basis_hash: envelope.execution_basis_hash,
      header_profile_refs: envelope.header_profile_refs,
      http_method: envelope.http_method,
      identity_namespace_hash: envelope.identity_namespace_hash,
      identity_profile_version: AUTHORITY_REQUEST_IDENTITY_PROFILE_VERSION,
      idempotency_key: envelope.idempotency_key,
      manifest_hash: envelope.manifest_hash,
      manifest_id: envelope.manifest_id,
      normalized_basis_type: envelope.normalized_basis_type,
      normalized_obligation_ref: envelope.normalized_obligation_ref,
      obligation_ref_or_null: envelope.obligation_ref,
      operation_family: envelope.operation_family,
      operation_id: envelope.operation_id,
      operation_profile: envelope.operation_profile,
      policy_snapshot_hash: envelope.policy_snapshot_hash,
      provider_api_version: envelope.provider_api_version,
      provider_environment: envelope.provider_environment,
      request_body_hash: envelope.request_body_hash,
      request_hash: envelope.request_hash,
      request_id: envelope.request_id,
      subject_ref: envelope.subject_ref,
      tenant_id: envelope.tenant_id,
      token_binding_ref: envelope.token_binding_ref,
    },
    "AUTHORITY_REQUEST_ENVELOPE",
  );
}

function assertRequestIdentityMirrorsEnvelope(envelope: AuthorityRequestEnvelope) {
  const contract = envelope.request_identity_contract;
  for (const field of [
    "request_id",
    "tenant_id",
    "client_id",
    "manifest_id",
    "manifest_hash",
    "execution_basis_hash",
    "attempt_lineage_manifest_id",
    "operation_id",
    "authority_name",
    "authority_product_profile",
    "provider_environment",
    "authority_scope",
    "operation_family",
    "operation_profile",
    "provider_api_version",
    "http_method",
    "canonical_path",
    "canonical_query",
    "identity_namespace_hash",
    "normalized_obligation_ref",
    "normalized_basis_type",
    "request_body_hash",
    "duplicate_meaning_key",
    "request_hash",
    "idempotency_key",
    "access_binding_hash",
    "policy_snapshot_hash",
    "authority_binding_ref",
    "authority_link_ref",
    "subject_ref",
    "acting_party_ref",
    "token_binding_ref",
    "binding_lineage_ref",
  ] as const) {
    if (contract[field] !== envelope[field]) {
      throw new AuthorityModelError(
        "AUTHORITY_CONTRACT_INVALID",
        `request_identity_contract.${field} must mirror ${field}`,
      );
    }
  }
  if (!stableEqual(contract.header_profile_refs, envelope.header_profile_refs)) {
    throw new AuthorityModelError(
      "AUTHORITY_CONTRACT_INVALID",
      "request_identity_contract.header_profile_refs must mirror header_profile_refs",
    );
  }
  if (!stableEqual(contract.business_partition_refs, envelope.business_partition_refs)) {
    throw new AuthorityModelError(
      "AUTHORITY_CONTRACT_INVALID",
      "request_identity_contract.business_partition_refs must mirror business_partition_refs",
    );
  }
  if (contract.delegation_grant_ref_or_null !== envelope.delegation_grant_ref) {
    throw new AuthorityModelError(
      "AUTHORITY_CONTRACT_INVALID",
      "request_identity_contract.delegation_grant_ref_or_null must mirror delegation_grant_ref",
    );
  }
  if (contract.obligation_ref_or_null !== envelope.obligation_ref) {
    throw new AuthorityModelError(
      "AUTHORITY_CONTRACT_INVALID",
      "request_identity_contract.obligation_ref_or_null must mirror obligation_ref",
    );
  }
  if (contract.basis_type_or_null !== envelope.basis_type) {
    throw new AuthorityModelError(
      "AUTHORITY_CONTRACT_INVALID",
      "request_identity_contract.basis_type_or_null must mirror basis_type",
    );
  }
}

export function normalizeAuthorityRequestEnvelope(input: AuthorityRequestEnvelope): AuthorityRequestEnvelope {
  const pathParams = normalizePathParams(input.resolved_path_params);
  const queryParams = normalizeQueryParams(input.query_params);
  const canonicalPath = stablePath(input.resource_template, pathParams);
  if (canonicalPath === null) {
    throw new AuthorityModelError("AUTHORITY_FIELD_INVALID", "resource_template must resolve canonical_path");
  }
  const envelopeWithoutIdentity: Omit<AuthorityRequestEnvelope, "request_identity_contract"> = {
    access_binding_hash: requireString("access_binding_hash", input.access_binding_hash),
    acting_party_ref: requireString("acting_party_ref", input.acting_party_ref),
    artifact_type: "AuthorityRequestEnvelope",
    attempt_lineage_manifest_id: requireString("attempt_lineage_manifest_id", input.attempt_lineage_manifest_id),
    authority_binding_ref: requireString("authority_binding_ref", input.authority_binding_ref),
    authority_layer_boundary: normalizeAuthorityLayerBoundaryContract(input.authority_layer_boundary, {
      expected_binding_scope_class: "AUTHORITY_REQUEST_ENVELOPE",
      expected_integration_capability: "AUTHORITY_INTEGRATED",
    }),
    authority_link_ref: requireString("authority_link_ref", input.authority_link_ref),
    authority_name: requireString("authority_name", input.authority_name),
    authority_product_profile: requireString("authority_product_profile", input.authority_product_profile),
    authority_scope: requireString("authority_scope", input.authority_scope),
    basis_type: normalizeNullableString("basis_type", input.basis_type),
    binding_lineage_ref: requireString("binding_lineage_ref", input.binding_lineage_ref),
    business_partition_refs: normalizeSortedStringSet("business_partition_refs", input.business_partition_refs),
    canonical_path: requireString("canonical_path", input.canonical_path),
    canonical_query: typeof input.canonical_query === "string"
      ? input.canonical_query
      : requireString("canonical_query", input.canonical_query),
    client_id: requireString("client_id", input.client_id),
    delegation_grant_ref: normalizeNullableString("delegation_grant_ref", input.delegation_grant_ref),
    duplicate_meaning_key: requireString("duplicate_meaning_key", input.duplicate_meaning_key),
    execution_basis_hash: requireString("execution_basis_hash", input.execution_basis_hash),
    fraud_header_capture_ref: normalizeNullableString("fraud_header_capture_ref", input.fraud_header_capture_ref),
    fraud_header_exemption_reason: normalizeNullableString(
      "fraud_header_exemption_reason",
      input.fraud_header_exemption_reason,
    ),
    fraud_header_profile_ref: normalizeNullableString("fraud_header_profile_ref", input.fraud_header_profile_ref),
    fraud_header_validation_ref: normalizeNullableString(
      "fraud_header_validation_ref",
      input.fraud_header_validation_ref,
    ),
    header_profile_refs: normalizeSortedStringSet("header_profile_refs", input.header_profile_refs),
    http_method: assertEnum("http_method", input.http_method, AUTHORITY_HTTP_METHODS),
    idempotency_key: requireString("idempotency_key", input.idempotency_key),
    identity_namespace_hash: requireString("identity_namespace_hash", input.identity_namespace_hash),
    identity_profile_version: AUTHORITY_REQUEST_IDENTITY_PROFILE_VERSION,
    manifest_hash: requireString("manifest_hash", input.manifest_hash),
    manifest_id: requireString("manifest_id", input.manifest_id),
    normalized_basis_type: requireString("normalized_basis_type", input.normalized_basis_type),
    normalized_obligation_ref: requireString("normalized_obligation_ref", input.normalized_obligation_ref),
    obligation_ref: normalizeNullableString("obligation_ref", input.obligation_ref),
    operation_family: requireString("operation_family", input.operation_family),
    operation_id: requireString("operation_id", input.operation_id),
    operation_profile: requireString("operation_profile", input.operation_profile),
    payload_ref: normalizeNullableString("payload_ref", input.payload_ref),
    policy_snapshot_hash: requireString("policy_snapshot_hash", input.policy_snapshot_hash),
    provider_api_version: requireString("provider_api_version", input.provider_api_version),
    provider_environment: requireString("provider_environment", input.provider_environment),
    query_params: queryParams,
    request_body_hash: requireString("request_body_hash", input.request_body_hash),
    request_hash: requireString("request_hash", input.request_hash),
    request_id: requireString("request_id", input.request_id),
    resolved_path_params: pathParams,
    resource_template: requireString("resource_template", input.resource_template),
    subject_ref: requireString("subject_ref", input.subject_ref),
    tenant_id: requireString("tenant_id", input.tenant_id),
    token_binding_ref: requireString("token_binding_ref", input.token_binding_ref),
    transmit_policy_ref: requireString("transmit_policy_ref", input.transmit_policy_ref),
  };
  const envelope: AuthorityRequestEnvelope = {
    ...envelopeWithoutIdentity,
    request_identity_contract: normalizeAuthorityRequestIdentityContract(
      input.request_identity_contract,
      "AUTHORITY_REQUEST_ENVELOPE",
    ),
  };
  if (envelope.canonical_path !== canonicalPath) {
    throw new AuthorityModelError(
      "AUTHORITY_CONTRACT_INVALID",
      "canonical_path must equal stable resource_template rendering",
    );
  }
  const canonicalQuery = stableQueryString(envelope.query_params);
  if (envelope.canonical_query !== canonicalQuery) {
    throw new AuthorityModelError(
      "AUTHORITY_CONTRACT_INVALID",
      "canonical_query must equal stable query_params serialization",
    );
  }
  if (envelope.normalized_obligation_ref !== normalizeOptionalIdentity(envelope.obligation_ref)) {
    throw new AuthorityModelError(
      "AUTHORITY_CONTRACT_INVALID",
      "normalized_obligation_ref must mirror obligation_ref or <NONE>",
    );
  }
  if (envelope.normalized_basis_type !== normalizeOptionalIdentity(envelope.basis_type)) {
    throw new AuthorityModelError(
      "AUTHORITY_CONTRACT_INVALID",
      "normalized_basis_type must mirror basis_type or <NONE>",
    );
  }
  assertRequestMethodAndBody(envelope);
  assertRequestFamilyRules(envelope);
  assertRequestFraudHeaderRules(envelope);
  assertRequestActingParty(envelope);
  const expectedNamespaceHash = deriveAuthorityIdentityNamespaceHash(envelope);
  if (envelope.identity_namespace_hash !== expectedNamespaceHash) {
    throw new AuthorityModelError(
      "AUTHORITY_IDENTITY_INVALID",
      "identity_namespace_hash must match authority request identity namespace",
    );
  }
  const expectedDuplicateMeaningKey = deriveAuthorityDuplicateMeaningKey(
    envelope,
    envelope.canonical_path,
    envelope.canonical_query,
    envelope.normalized_obligation_ref,
    envelope.normalized_basis_type,
  );
  if (envelope.duplicate_meaning_key !== expectedDuplicateMeaningKey) {
    throw new AuthorityModelError(
      "AUTHORITY_IDENTITY_INVALID",
      "duplicate_meaning_key must match stable duplicate-suppression identity",
    );
  }
  const expectedRequestHash = deriveAuthorityRequestHash(envelope, expectedDuplicateMeaningKey);
  if (envelope.request_hash !== expectedRequestHash) {
    throw new AuthorityModelError("AUTHORITY_IDENTITY_INVALID", "request_hash must match sealed authority request");
  }
  const expectedIdempotencyKey = deriveAuthorityIdempotencyKey(expectedDuplicateMeaningKey);
  if (envelope.idempotency_key !== expectedIdempotencyKey) {
    throw new AuthorityModelError(
      "AUTHORITY_IDENTITY_INVALID",
      "idempotency_key must match duplicate_meaning_key",
    );
  }
  assertRequestIdentityMirrorsEnvelope(envelope);
  return envelope;
}

export function buildAuthorityRequestEnvelope(input: AuthorityRequestEnvelopeBuildInput): AuthorityRequestEnvelope {
  const operation = input.operation;
  const method = assertEnum("http_method", input.http_method ?? "GET", AUTHORITY_HTTP_METHODS);
  const material = canonicalizeAuthorityRequestMaterial({
    header_profile_refs: input.header_profile_refs,
    http_method: method,
    payload: input.payload,
    payload_ref: input.payload_ref ?? null,
    query_params: input.query_params,
    request_body_hash: input.request_body_hash,
    resolved_path_params: input.resolved_path_params,
    resource_template: input.resource_template ?? "/authority/{clientId}",
  });
  const subjectRef = input.subject_ref ?? operation?.subject_ref ?? `client://${input.client_id}`;
  const actingPartyRef = input.acting_party_ref ?? operation?.acting_party_ref ?? subjectRef;
  const delegated = actingPartyRef !== subjectRef;
  const normalizedObligationRef = normalizeOptionalIdentity(input.obligation_ref ?? operation?.target_obligation_ref ?? null);
  const normalizedBasisType = normalizeOptionalIdentity(input.basis_type ?? operation?.basis_type ?? null);
  const seed: Omit<AuthorityRequestEnvelope, "request_identity_contract"> = {
    access_binding_hash: input.access_binding_hash ?? operation?.access_binding_hash ?? "hash.access-binding.request",
    acting_party_ref: actingPartyRef,
    artifact_type: "AuthorityRequestEnvelope",
    attempt_lineage_manifest_id: input.attempt_lineage_manifest_id ?? operation?.attempt_lineage_manifest_id ?? input.manifest_id,
    authority_binding_ref: input.authority_binding_ref ?? operation?.authority_binding_ref ?? `authority-binding://${input.operation_id}`,
    authority_layer_boundary:
      input.authority_layer_boundary ??
      buildAuthorityLayerBoundaryContract({
        binding_scope_class: "AUTHORITY_REQUEST_ENVELOPE",
        client_delegation_state: delegated ? "SATISFIED" : "NOT_REQUIRED",
      }),
    authority_link_ref: input.authority_link_ref ?? operation?.authority_link_ref ?? `authority-link://${input.client_id}`,
    authority_name: input.authority_name ?? operation?.authority_name ?? "HMRC",
    authority_product_profile: input.authority_product_profile ?? operation?.authority_product_profile ?? "HMRC_ITSA",
    authority_scope: input.authority_scope ?? operation?.authority_scope ?? "HMRC_ITSA",
    basis_type: input.basis_type ?? operation?.basis_type ?? null,
    binding_lineage_ref: input.binding_lineage_ref ?? operation?.binding_lineage_ref ?? `authority-binding-lineage://${input.client_id}`,
    business_partition_refs: normalizeSortedStringSet(
      "business_partition_refs",
      input.business_partition_refs ?? operation?.business_partitions ?? [],
    ),
    canonical_path: material.canonical_path,
    canonical_query: material.canonical_query,
    client_id: input.client_id,
    delegation_grant_ref: input.delegation_grant_ref ?? operation?.delegation_grant_ref ?? null,
    duplicate_meaning_key: input.duplicate_meaning_key ?? "",
    execution_basis_hash: input.execution_basis_hash ?? operation?.execution_basis_hash ?? "hash.execution-basis.request",
    fraud_header_capture_ref: input.fraud_header_capture_ref ?? null,
    fraud_header_exemption_reason: input.fraud_header_exemption_reason ?? null,
    fraud_header_profile_ref: input.fraud_header_profile_ref ?? null,
    fraud_header_validation_ref: input.fraud_header_validation_ref ?? null,
    header_profile_refs: material.header_profile_refs,
    http_method: material.http_method,
    idempotency_key: input.idempotency_key ?? "",
    identity_namespace_hash: input.identity_namespace_hash ?? "",
    identity_profile_version: AUTHORITY_REQUEST_IDENTITY_PROFILE_VERSION,
    manifest_hash: input.manifest_hash ?? operation?.manifest_hash ?? "hash.manifest.request",
    manifest_id: input.manifest_id,
    normalized_basis_type: normalizedBasisType,
    normalized_obligation_ref: normalizedObligationRef,
    obligation_ref: input.obligation_ref ?? operation?.target_obligation_ref ?? null,
    operation_family: input.operation_family,
    operation_id: input.operation_id,
    operation_profile: input.operation_profile ?? operation?.operation_profile_ref ?? `authority-operation-profile://${input.operation_family}`,
    payload_ref: material.payload_ref,
    policy_snapshot_hash: input.policy_snapshot_hash ?? operation?.policy_snapshot_hash ?? "hash.policy-snapshot.request",
    provider_api_version: input.provider_api_version ?? operation?.provider_api_version ?? "v1",
    provider_environment: input.provider_environment ?? operation?.provider_environment ?? "SANDBOX",
    query_params: material.query_params,
    request_body_hash: material.request_body_hash,
    request_hash: input.request_hash ?? "",
    request_id: input.request_id,
    resolved_path_params: material.resolved_path_params,
    resource_template: material.resource_template,
    subject_ref: subjectRef,
    tenant_id: input.tenant_id,
    token_binding_ref: input.token_binding_ref ?? operation?.token_binding_ref ?? `authority-token-binding://${input.client_id}`,
    transmit_policy_ref: input.transmit_policy_ref ?? "transmit-policy://authority/default",
  };
  const identityNamespaceHash = input.identity_namespace_hash ?? deriveAuthorityIdentityNamespaceHash(seed);
  const seedWithNamespace = { ...seed, identity_namespace_hash: identityNamespaceHash };
  const duplicateMeaningKey =
    input.duplicate_meaning_key ??
    deriveAuthorityDuplicateMeaningKey(
      seedWithNamespace,
      seedWithNamespace.canonical_path,
      seedWithNamespace.canonical_query,
      seedWithNamespace.normalized_obligation_ref,
      seedWithNamespace.normalized_basis_type,
    );
  const requestHash = input.request_hash ?? deriveAuthorityRequestHash(seedWithNamespace, duplicateMeaningKey);
  const idempotencyKey = input.idempotency_key ?? deriveAuthorityIdempotencyKey(duplicateMeaningKey);
  const withoutIdentity = {
    ...seedWithNamespace,
    duplicate_meaning_key: duplicateMeaningKey,
    idempotency_key: idempotencyKey,
    request_hash: requestHash,
  };
  return normalizeAuthorityRequestEnvelope({
    ...withoutIdentity,
    request_identity_contract:
      input.request_identity_contract ?? buildAuthorityRequestIdentityContract(withoutIdentity),
  });
}

export function authorityRequestEnvelopeRef(envelope: Pick<AuthorityRequestEnvelope, "request_id"> | string) {
  return refFromId(
    "authority-request-envelope",
    typeof envelope === "string" ? envelope : envelope.request_id,
  );
}

export function cloneAuthorityRequestEnvelope(envelope: AuthorityRequestEnvelope) {
  return cloneRecord(envelope);
}

export function authorityRequestEnvelopeContentFingerprint(envelope: AuthorityRequestEnvelope) {
  return hashObject("AUTHORITY_REQUEST_ENVELOPE_MODEL_V1", normalizeAuthorityRequestEnvelope(envelope));
}

export function authorityRequestBodyHashFromPayload(payload: unknown) {
  return stableJsonHash(payload);
}

export function isAuthorityOperationFamily(value: string): value is (typeof AUTHORITY_OPERATION_FAMILIES)[number] {
  return (AUTHORITY_OPERATION_FAMILIES as readonly string[]).includes(value);
}
