import type { AuthorityRequestEnvelope } from "../models/authority_request_envelope.ts";
import {
  normalizeAuthorityRequestIdentityContract,
  type AuthorityRequestIdentityContract,
} from "../models/submission_record.ts";
import type { DerivedAuthorityRequestHashes } from "./derive_authority_request_hashes.ts";
import type { NormalizedAuthorityRequestIdentityInputs } from "./normalize_authority_request_identity_inputs.ts";

export type AuthorityRequestIdentityScopeClass = AuthorityRequestIdentityContract["binding_scope_class"];

export type BuildRequestIdentityContractInput = {
  binding_scope_class: AuthorityRequestIdentityScopeClass;
  hashes: DerivedAuthorityRequestHashes;
  normalized_inputs?: NormalizedAuthorityRequestIdentityInputs;
};

export function buildRequestIdentityContract(
  input: BuildRequestIdentityContractInput,
): AuthorityRequestIdentityContract {
  const normalized = input.normalized_inputs ?? input.hashes.normalized_inputs;
  return normalizeAuthorityRequestIdentityContract(
    {
      access_binding_hash: normalized.access_binding_hash,
      acting_party_ref: normalized.acting_party_ref,
      attempt_lineage_manifest_id: input.hashes.attempt_lineage_manifest_id,
      authority_binding_ref: normalized.authority_binding_ref,
      authority_link_ref: normalized.authority_link_ref,
      authority_name: normalized.authority_name,
      authority_product_profile: normalized.authority_product_profile,
      authority_scope: normalized.authority_scope,
      basis_type_or_null: normalized.basis_type_or_null,
      binding_lineage_ref: normalized.binding_lineage_ref,
      binding_scope_class: input.binding_scope_class,
      business_partition_refs: normalized.business_partition_refs,
      canonical_path: normalized.canonical_path,
      canonical_query: normalized.canonical_query,
      client_id: normalized.client_id,
      contract_version: "AUTHORITY_REQUEST_IDENTITY_CONTRACT_V1",
      delegation_grant_ref_or_null: normalized.delegation_grant_ref,
      duplicate_meaning_key: input.hashes.duplicate_meaning_key,
      execution_basis_hash: normalized.execution_basis_hash,
      header_profile_refs: normalized.header_profile_refs,
      http_method: normalized.http_method,
      identity_namespace_hash: input.hashes.identity_namespace_hash,
      identity_profile_version: input.hashes.identity_profile_version,
      idempotency_key: input.hashes.idempotency_key,
      manifest_hash: normalized.manifest_hash,
      manifest_id: normalized.manifest_id,
      normalized_basis_type: normalized.normalized_basis_type,
      normalized_obligation_ref: normalized.normalized_obligation_ref,
      obligation_ref_or_null: normalized.obligation_ref_or_null,
      operation_family: normalized.operation_family,
      operation_id: normalized.operation_id,
      operation_profile: normalized.operation_profile,
      policy_snapshot_hash: normalized.policy_snapshot_hash,
      provider_api_version: normalized.provider_api_version,
      provider_environment: normalized.provider_environment,
      request_body_hash: input.hashes.request_body_hash,
      request_hash: input.hashes.request_hash,
      request_id: normalized.request_id,
      subject_ref: normalized.subject_ref,
      tenant_id: normalized.tenant_id,
      token_binding_ref: normalized.token_binding_ref,
    },
    input.binding_scope_class,
  );
}

export function projectRequestIdentityContractScope(
  contract: AuthorityRequestIdentityContract,
  bindingScopeClass: AuthorityRequestIdentityScopeClass,
): AuthorityRequestIdentityContract {
  return normalizeAuthorityRequestIdentityContract(
    {
      ...contract,
      binding_scope_class: bindingScopeClass,
    },
    bindingScopeClass,
  );
}

export function buildRequestIdentityContractFromEnvelope(
  envelope: AuthorityRequestEnvelope,
  bindingScopeClass: AuthorityRequestIdentityScopeClass = "AUTHORITY_REQUEST_ENVELOPE",
): AuthorityRequestIdentityContract {
  return projectRequestIdentityContractScope(envelope.request_identity_contract, bindingScopeClass);
}
