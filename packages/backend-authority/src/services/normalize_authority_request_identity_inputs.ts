import {
  AUTHORITY_REQUEST_IDENTITY_PROFILE_VERSION,
  NONE_SENTINEL,
  sha256HexUtf8,
  stableJsonHash,
  stablePath,
  stableQueryString,
} from "../../../domain-kernel/src/primitives/hash.ts";
import {
  AuthorityModelError,
  assertEnum,
  normalizeNullableString,
  normalizeSortedStringSet,
  requireString,
} from "../models/authority_common.ts";
import {
  AUTHORITY_OPERATION_FAMILIES,
  type AuthorityOperationFamily,
} from "../models/authority_operation.ts";
import {
  AUTHORITY_HTTP_METHODS,
  type AuthorityHttpMethod,
  type AuthorityRequestPathParams,
  type AuthorityRequestQueryParams,
} from "../models/authority_request_envelope.ts";

export const AUTHORITY_GLOBAL_READ_OPERATION_FAMILIES = [
  "AUTH_READ_REFERENCE",
  "AUTH_READ_OBLIGATIONS",
  "AUTH_READ_CALCULATION",
  "AUTH_RECONCILE_STATUS",
] as const satisfies readonly AuthorityOperationFamily[];

const BODY_METHODS = new Set<AuthorityHttpMethod>(["POST", "PUT", "PATCH"]);
const BODYLESS_METHODS = new Set<AuthorityHttpMethod>(["GET", "DELETE"]);
const GLOBAL_READ_OPERATION_FAMILY_SET = new Set<string>(AUTHORITY_GLOBAL_READ_OPERATION_FAMILIES);

export type NormalizeAuthorityRequestIdentityInputsInput = {
  access_binding_hash: string;
  acting_party_ref: string;
  attempt_lineage_manifest_id?: string | null;
  authority_binding_ref: string;
  authority_link_ref: string;
  authority_name: string;
  authority_product_profile: string;
  authority_scope: string;
  basis_type?: string | null;
  binding_lineage_ref: string;
  business_partition_refs?: readonly string[];
  canonical_payload_bytes?: string;
  client_id: string;
  delegation_grant_ref?: string | null;
  execution_basis_hash: string;
  header_profile_refs?: readonly string[];
  http_method: AuthorityHttpMethod;
  manifest_hash: string;
  manifest_id: string;
  obligation_ref?: string | null;
  operation_family: AuthorityOperationFamily;
  operation_id: string;
  operation_profile: string;
  payload?: unknown;
  payload_ref?: string | null;
  policy_snapshot_hash: string;
  provider_api_version: string;
  provider_environment: string;
  query_params?: AuthorityRequestQueryParams;
  request_body_hash?: string | null;
  request_id: string;
  resolved_path_params?: AuthorityRequestPathParams;
  resource_template: string;
  root_manifest_id?: string | null;
  subject_ref: string;
  tenant_id: string;
  token_binding_ref: string;
};

export type NormalizedAuthorityRequestIdentityInputs = {
  access_binding_hash: string;
  acting_party_ref: string;
  attempt_lineage_manifest_id: string;
  authority_binding_ref: string;
  authority_link_ref: string;
  authority_name: string;
  authority_product_profile: string;
  authority_scope: string;
  basis_type_or_null: string | null;
  binding_lineage_ref: string;
  business_partition_refs: string[];
  canonical_path: string;
  canonical_query: string;
  client_id: string;
  delegation_grant_ref: string | null;
  delegation_grant_ref_or_none: string;
  execution_basis_hash: string;
  header_profile_refs: string[];
  http_method: AuthorityHttpMethod;
  identity_profile_version: typeof AUTHORITY_REQUEST_IDENTITY_PROFILE_VERSION;
  manifest_hash: string;
  manifest_id: string;
  normalized_basis_type: string;
  normalized_business_partition_refs: string[];
  normalized_obligation_ref: string;
  obligation_ref_or_null: string | null;
  operation_family: AuthorityOperationFamily;
  operation_id: string;
  operation_profile: string;
  payload_ref: string | null;
  policy_snapshot_hash: string;
  provider_api_version: string;
  provider_environment: string;
  query_params: AuthorityRequestQueryParams;
  request_body_hash: string;
  request_id: string;
  resolved_path_params: AuthorityRequestPathParams;
  resource_template: string;
  subject_ref: string;
  tenant_id: string;
  token_binding_ref: string;
};

function normalizePathParams(input: AuthorityRequestPathParams | undefined) {
  const normalized: AuthorityRequestPathParams = {};
  const seen = new Set<string>();
  for (const [rawKey, rawValue] of Object.entries(input ?? {})) {
    const key = requireString("resolved_path_params.key", rawKey);
    if (seen.has(key)) {
      throw new AuthorityModelError(
        "AUTHORITY_FIELD_INVALID",
        `resolved_path_params contains duplicate normalized key ${key}`,
      );
    }
    seen.add(key);
    normalized[key] = requireString(`resolved_path_params.${key}`, rawValue);
  }
  return normalized;
}

function normalizeQueryParams(input: AuthorityRequestQueryParams | undefined) {
  const normalized: AuthorityRequestQueryParams = {};
  const seen = new Set<string>();
  for (const [rawKey, rawValue] of Object.entries(input ?? {})) {
    const key = requireString("query_params.key", rawKey);
    if (seen.has(key)) {
      throw new AuthorityModelError(
        "AUTHORITY_FIELD_INVALID",
        `query_params contains duplicate normalized key ${key}`,
      );
    }
    seen.add(key);
    if (Array.isArray(rawValue)) {
      if (rawValue.length === 0) {
        throw new AuthorityModelError(
          "AUTHORITY_FIELD_INVALID",
          `query_params.${key} must not be an empty repeated-value array`,
        );
      }
      normalized[key] = rawValue.map((value) => requireString(`query_params.${key}`, value));
      continue;
    }
    normalized[key] = requireString(`query_params.${key}`, rawValue);
  }
  return normalized;
}

function normalizeOptionalIdentity(label: string, value: unknown) {
  const normalized = normalizeNullableString(label, value);
  return {
    normalized,
    sentinel: normalized ?? NONE_SENTINEL,
  };
}

function hasOwnPayload(input: NormalizeAuthorityRequestIdentityInputsInput) {
  return Object.prototype.hasOwnProperty.call(input, "payload");
}

function normalizeRequestBodyHash(input: NormalizeAuthorityRequestIdentityInputsInput, method: AuthorityHttpMethod) {
  const payloadRef = normalizeNullableString("payload_ref", input.payload_ref ?? null);
  const explicitHash = normalizeNullableString("request_body_hash", input.request_body_hash ?? null);

  if (payloadRef === null) {
    if (!BODYLESS_METHODS.has(method)) {
      throw new AuthorityModelError(
        "AUTHORITY_CONTRACT_INVALID",
        "payload_ref null requires GET or DELETE http_method",
      );
    }
    if (explicitHash !== null && explicitHash !== NONE_SENTINEL) {
      throw new AuthorityModelError(
        "AUTHORITY_CONTRACT_INVALID",
        "request_body_hash must be <NONE> when payload_ref is null",
      );
    }
    if (hasOwnPayload(input) || input.canonical_payload_bytes !== undefined) {
      throw new AuthorityModelError(
        "AUTHORITY_CONTRACT_INVALID",
        "null-body authority requests must not carry payload material",
      );
    }
    return {
      payload_ref: payloadRef,
      request_body_hash: NONE_SENTINEL,
    };
  }

  if (!BODY_METHODS.has(method)) {
    throw new AuthorityModelError(
      "AUTHORITY_CONTRACT_INVALID",
      "non-null payload_ref requires POST, PUT, or PATCH http_method",
    );
  }
  if (explicitHash !== null) {
    if (explicitHash === NONE_SENTINEL) {
      throw new AuthorityModelError(
        "AUTHORITY_CONTRACT_INVALID",
        "request_body_hash must not be <NONE> when payload_ref is present",
      );
    }
    return {
      payload_ref: payloadRef,
      request_body_hash: explicitHash,
    };
  }
  if (input.canonical_payload_bytes !== undefined) {
    return {
      payload_ref: payloadRef,
      request_body_hash: sha256HexUtf8(input.canonical_payload_bytes),
    };
  }
  if (hasOwnPayload(input)) {
    return {
      payload_ref: payloadRef,
      request_body_hash: stableJsonHash(input.payload),
    };
  }
  throw new AuthorityModelError(
    "AUTHORITY_FIELD_REQUIRED",
    "payload_ref is present, so request_body_hash, canonical_payload_bytes, or payload must be supplied",
  );
}

function normalizeBusinessPartitionRefs(input: NormalizeAuthorityRequestIdentityInputsInput) {
  const refs = normalizeSortedStringSet("business_partition_refs", input.business_partition_refs ?? []);
  if (refs.length === 0 && !GLOBAL_READ_OPERATION_FAMILY_SET.has(input.operation_family)) {
    throw new AuthorityModelError(
      "AUTHORITY_CONTRACT_INVALID",
      "empty business_partition_refs is only lawful for global/account-level read posture",
    );
  }
  return {
    business_partition_refs: refs,
    normalized_business_partition_refs: refs.length > 0 ? refs : [NONE_SENTINEL],
  };
}

export function normalizeAuthorityRequestIdentityInputs(
  input: NormalizeAuthorityRequestIdentityInputsInput,
): NormalizedAuthorityRequestIdentityInputs {
  const method = assertEnum("http_method", input.http_method, AUTHORITY_HTTP_METHODS);
  const operationFamily = assertEnum("operation_family", input.operation_family, AUTHORITY_OPERATION_FAMILIES);
  const pathParams = normalizePathParams(input.resolved_path_params);
  const queryParams = normalizeQueryParams(input.query_params);
  const resourceTemplate = requireString("resource_template", input.resource_template);
  const canonicalPath = stablePath(resourceTemplate, pathParams);
  if (canonicalPath === null) {
    throw new AuthorityModelError(
      "AUTHORITY_FIELD_INVALID",
      "canonical_path must equal a fully resolved resource_template",
    );
  }
  const obligation = normalizeOptionalIdentity("obligation_ref", input.obligation_ref ?? null);
  const basis = normalizeOptionalIdentity("basis_type", input.basis_type ?? null);
  const delegation = normalizeOptionalIdentity("delegation_grant_ref", input.delegation_grant_ref ?? null);
  const body = normalizeRequestBodyHash(input, method);
  const partitions = normalizeBusinessPartitionRefs({ ...input, operation_family: operationFamily });
  const rootManifestId = normalizeNullableString("root_manifest_id", input.root_manifest_id ?? null);
  const attemptLineageManifestId =
    rootManifestId ??
    normalizeNullableString("attempt_lineage_manifest_id", input.attempt_lineage_manifest_id ?? null) ??
    requireString("manifest_id", input.manifest_id);

  return {
    access_binding_hash: requireString("access_binding_hash", input.access_binding_hash),
    acting_party_ref: requireString("acting_party_ref", input.acting_party_ref),
    attempt_lineage_manifest_id: attemptLineageManifestId,
    authority_binding_ref: requireString("authority_binding_ref", input.authority_binding_ref),
    authority_link_ref: requireString("authority_link_ref", input.authority_link_ref),
    authority_name: requireString("authority_name", input.authority_name),
    authority_product_profile: requireString("authority_product_profile", input.authority_product_profile),
    authority_scope: requireString("authority_scope", input.authority_scope),
    basis_type_or_null: basis.normalized,
    binding_lineage_ref: requireString("binding_lineage_ref", input.binding_lineage_ref),
    business_partition_refs: partitions.business_partition_refs,
    canonical_path: canonicalPath,
    canonical_query: stableQueryString(queryParams),
    client_id: requireString("client_id", input.client_id),
    delegation_grant_ref: delegation.normalized,
    delegation_grant_ref_or_none: delegation.sentinel,
    execution_basis_hash: requireString("execution_basis_hash", input.execution_basis_hash),
    header_profile_refs: normalizeSortedStringSet("header_profile_refs", input.header_profile_refs ?? []),
    http_method: method,
    identity_profile_version: AUTHORITY_REQUEST_IDENTITY_PROFILE_VERSION,
    manifest_hash: requireString("manifest_hash", input.manifest_hash),
    manifest_id: requireString("manifest_id", input.manifest_id),
    normalized_basis_type: basis.sentinel,
    normalized_business_partition_refs: partitions.normalized_business_partition_refs,
    normalized_obligation_ref: obligation.sentinel,
    obligation_ref_or_null: obligation.normalized,
    operation_family: operationFamily,
    operation_id: requireString("operation_id", input.operation_id),
    operation_profile: requireString("operation_profile", input.operation_profile),
    payload_ref: body.payload_ref,
    policy_snapshot_hash: requireString("policy_snapshot_hash", input.policy_snapshot_hash),
    provider_api_version: requireString("provider_api_version", input.provider_api_version),
    provider_environment: requireString("provider_environment", input.provider_environment),
    query_params: queryParams,
    request_body_hash: body.request_body_hash,
    request_id: requireString("request_id", input.request_id),
    resolved_path_params: pathParams,
    resource_template: resourceTemplate,
    subject_ref: requireString("subject_ref", input.subject_ref),
    tenant_id: requireString("tenant_id", input.tenant_id),
    token_binding_ref: requireString("token_binding_ref", input.token_binding_ref),
  };
}
