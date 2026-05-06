import { AuthorityModelError } from "../models/authority_common.ts";
import { authorityBindingRef, type AuthorityBinding } from "../models/authority_binding.ts";
import type { AuthorityOperation } from "../models/authority_operation.ts";
import type { AuthorityRequestEnvelope } from "../models/authority_request_envelope.ts";
import type { AuthorityResponseEnvelope } from "../models/authority_response_envelope.ts";

export type ValidateAuthorityTransportLineageInput = {
  binding?: AuthorityBinding;
  operation?: AuthorityOperation;
  request_envelope?: AuthorityRequestEnvelope;
  response_envelope?: AuthorityResponseEnvelope;
};

function assertSame(label: string, left: unknown, right: unknown) {
  if (left !== right) {
    throw new AuthorityModelError(
      "AUTHORITY_IDENTITY_INVALID",
      `${label} must remain lineage-stable (${String(left)} !== ${String(right)})`,
    );
  }
}

export function validateAuthorityTransportLineage(input: ValidateAuthorityTransportLineageInput) {
  const { binding, operation, request_envelope: request, response_envelope: response } = input;

  if (operation !== undefined && binding !== undefined) {
    assertSame("operation.tenant_id/binding.tenant_id", operation.tenant_id, binding.tenant_id);
    assertSame("operation.client_id/binding.client_id", operation.client_id, binding.client_id);
    assertSame("operation.manifest_id/binding.manifest_id", operation.manifest_id, binding.manifest_id);
    assertSame("operation.authority_scope/binding.authority_scope", operation.authority_scope, binding.authority_scope);
    assertSame(
      "operation.provider_environment/binding.provider_environment",
      operation.provider_environment,
      binding.provider_environment,
    );
    assertSame(
      "operation.provider_api_version/binding.provider_api_version",
      operation.provider_api_version,
      binding.provider_api_version,
    );
    assertSame("operation.access_binding_hash/binding.access_binding_hash", operation.access_binding_hash, binding.access_binding_hash);
    assertSame("operation.policy_snapshot_hash/binding.policy_snapshot_hash", operation.policy_snapshot_hash, binding.policy_snapshot_hash);
    assertSame("operation.authority_link_ref/binding.authority_link_ref", operation.authority_link_ref, binding.authority_link_ref);
    assertSame(
      "operation.delegation_grant_ref/binding.delegation_grant_ref",
      operation.delegation_grant_ref,
      binding.delegation_grant_ref,
    );
    assertSame("operation.binding_lineage_ref/binding.binding_lineage_ref", operation.binding_lineage_ref, binding.binding_lineage_ref);
    assertSame("operation.token_binding_ref/binding.token_binding_ref", operation.token_binding_ref, binding.token_binding_ref);
    assertSame("operation.subject_ref/binding.subject_ref", operation.subject_ref, binding.subject_ref);
    assertSame("operation.acting_party_ref/binding.acting_party_ref", operation.acting_party_ref, binding.acting_party_ref);
    const ref = authorityBindingRef(binding);
    if (operation.authority_binding_ref !== ref && operation.authority_binding_ref !== binding.authority_binding_id) {
      throw new AuthorityModelError(
        "AUTHORITY_IDENTITY_INVALID",
        "operation.authority_binding_ref must identify the sealed AuthorityBinding",
      );
    }
  }

  if (operation !== undefined && request !== undefined) {
    assertSame("request.tenant_id/operation.tenant_id", request.tenant_id, operation.tenant_id);
    assertSame("request.client_id/operation.client_id", request.client_id, operation.client_id);
    assertSame("request.manifest_id/operation.manifest_id", request.manifest_id, operation.manifest_id);
    assertSame("request.manifest_hash/operation.manifest_hash", request.manifest_hash, operation.manifest_hash);
    assertSame(
      "request.execution_basis_hash/operation.execution_basis_hash",
      request.execution_basis_hash,
      operation.execution_basis_hash,
    );
    assertSame(
      "request.attempt_lineage_manifest_id/operation.attempt_lineage_manifest_id",
      request.attempt_lineage_manifest_id,
      operation.attempt_lineage_manifest_id,
    );
    assertSame("request.operation_id/operation.operation_id", request.operation_id, operation.operation_id);
    assertSame("request.operation_family/operation.operation_family", request.operation_family, operation.operation_family);
    assertSame("request.operation_profile/operation.operation_profile_ref", request.operation_profile, operation.operation_profile_ref);
    assertSame("request.authority_name/operation.authority_name", request.authority_name, operation.authority_name);
    assertSame(
      "request.authority_product_profile/operation.authority_product_profile",
      request.authority_product_profile,
      operation.authority_product_profile,
    );
    assertSame("request.provider_environment/operation.provider_environment", request.provider_environment, operation.provider_environment);
    assertSame("request.provider_api_version/operation.provider_api_version", request.provider_api_version, operation.provider_api_version);
    assertSame("request.authority_scope/operation.authority_scope", request.authority_scope, operation.authority_scope);
    assertSame("request.access_binding_hash/operation.access_binding_hash", request.access_binding_hash, operation.access_binding_hash);
    assertSame("request.policy_snapshot_hash/operation.policy_snapshot_hash", request.policy_snapshot_hash, operation.policy_snapshot_hash);
    assertSame("request.authority_binding_ref/operation.authority_binding_ref", request.authority_binding_ref, operation.authority_binding_ref);
    assertSame("request.authority_link_ref/operation.authority_link_ref", request.authority_link_ref, operation.authority_link_ref);
    assertSame(
      "request.delegation_grant_ref/operation.delegation_grant_ref",
      request.delegation_grant_ref,
      operation.delegation_grant_ref,
    );
    assertSame("request.subject_ref/operation.subject_ref", request.subject_ref, operation.subject_ref);
    assertSame("request.acting_party_ref/operation.acting_party_ref", request.acting_party_ref, operation.acting_party_ref);
    assertSame("request.token_binding_ref/operation.token_binding_ref", request.token_binding_ref, operation.token_binding_ref);
    assertSame("request.binding_lineage_ref/operation.binding_lineage_ref", request.binding_lineage_ref, operation.binding_lineage_ref);
    assertSame("request.obligation_ref/operation.target_obligation_ref", request.obligation_ref, operation.target_obligation_ref);
    assertSame("request.basis_type/operation.basis_type", request.basis_type, operation.basis_type);
    if (JSON.stringify(request.business_partition_refs) !== JSON.stringify(operation.business_partitions)) {
      throw new AuthorityModelError(
        "AUTHORITY_IDENTITY_INVALID",
        "request.business_partition_refs must mirror operation.business_partitions",
      );
    }
  }

  if (binding !== undefined && request !== undefined) {
    assertSame("request.tenant_id/binding.tenant_id", request.tenant_id, binding.tenant_id);
    assertSame("request.client_id/binding.client_id", request.client_id, binding.client_id);
    assertSame("request.authority_scope/binding.authority_scope", request.authority_scope, binding.authority_scope);
    assertSame("request.provider_environment/binding.provider_environment", request.provider_environment, binding.provider_environment);
    assertSame("request.provider_api_version/binding.provider_api_version", request.provider_api_version, binding.provider_api_version);
    assertSame("request.access_binding_hash/binding.access_binding_hash", request.access_binding_hash, binding.access_binding_hash);
    assertSame("request.policy_snapshot_hash/binding.policy_snapshot_hash", request.policy_snapshot_hash, binding.policy_snapshot_hash);
    assertSame("request.authority_link_ref/binding.authority_link_ref", request.authority_link_ref, binding.authority_link_ref);
    assertSame("request.delegation_grant_ref/binding.delegation_grant_ref", request.delegation_grant_ref, binding.delegation_grant_ref);
    assertSame("request.binding_lineage_ref/binding.binding_lineage_ref", request.binding_lineage_ref, binding.binding_lineage_ref);
    assertSame("request.token_binding_ref/binding.token_binding_ref", request.token_binding_ref, binding.token_binding_ref);
    assertSame("request.subject_ref/binding.subject_ref", request.subject_ref, binding.subject_ref);
    assertSame("request.acting_party_ref/binding.acting_party_ref", request.acting_party_ref, binding.acting_party_ref);
    const ref = authorityBindingRef(binding);
    if (request.authority_binding_ref !== ref && request.authority_binding_ref !== binding.authority_binding_id) {
      throw new AuthorityModelError(
        "AUTHORITY_IDENTITY_INVALID",
        "request.authority_binding_ref must identify the sealed AuthorityBinding",
      );
    }
  }

  if (request !== undefined && response !== undefined) {
    assertSame("response.request_id/request.request_id", response.request_id, request.request_id);
    if (response.authority_ingress_proof_contract !== null) {
      assertSame(
        "response.proof.request_hash_or_null/request.request_hash",
        response.authority_ingress_proof_contract.request_hash_or_null,
        request.request_hash,
      );
      assertSame(
        "response.proof.idempotency_key_or_null/request.idempotency_key",
        response.authority_ingress_proof_contract.idempotency_key_or_null,
        request.idempotency_key,
      );
      assertSame(
        "response.proof.identity_namespace_hash_or_null/request.identity_namespace_hash",
        response.authority_ingress_proof_contract.identity_namespace_hash_or_null,
        request.identity_namespace_hash,
      );
      assertSame(
        "response.proof.duplicate_meaning_key_or_null/request.duplicate_meaning_key",
        response.authority_ingress_proof_contract.duplicate_meaning_key_or_null,
        request.duplicate_meaning_key,
      );
    }
  }

  return true;
}
