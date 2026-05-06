import { expect, test } from "@playwright/test";

import {
  buildAuthorityBinding,
  buildAuthorityOperation,
  buildAuthorityRequestEnvelope,
  type HmrcOauthTokenClientBindingContext,
  refreshHmrcAccessTokenWithLineageGuard,
  revalidateAuthorityBindingBeforeSend,
} from "../../../packages/backend-authority/src/index.ts";

function setup() {
  const operation = buildAuthorityOperation({
    access_binding_hash: "hash.access.rotation.0137",
    acting_party_ref: "client://rotation-0137",
    authority_binding_ref: "authority-binding://binding-rotation-0137",
    authority_link_ref: "authority-link://rotation-0137",
    binding_lineage_ref: "authority-binding-lineage://rotation-0137",
    business_partitions: ["business-partition://rotation/2026"],
    client_id: "client-rotation-0137",
    manifest_id: "manifest-rotation-0137",
    operation_family: "AUTH_SUBMIT_PERIODIC_UPDATE",
    operation_id: "operation-rotation-0137",
    policy_snapshot_hash: "hash.policy.rotation.0137",
    requested_scope: ["quarterly_update", "prepare_submission", "submit"],
    runtime_scope: ["quarterly_update", "prepare_submission", "submit"],
    subject_ref: "client://rotation-0137",
    target_obligation_ref: "obligation://rotation/2026",
    tenant_id: "tenant-rotation-0137",
    token_binding_ref: "authority-token-binding://rotation-0137",
  });
  const binding = buildAuthorityBinding({
    access_binding_hash: operation.access_binding_hash,
    authority_binding_id: "binding-rotation-0137",
    authority_link_ref: operation.authority_link_ref,
    authority_scope: operation.authority_scope,
    binding_lineage_ref: operation.binding_lineage_ref,
    client_id: operation.client_id,
    manifest_id: operation.manifest_id,
    partition_scope_refs: operation.business_partitions,
    policy_snapshot_hash: operation.policy_snapshot_hash,
    provider_api_version: operation.provider_api_version,
    provider_environment: operation.provider_environment,
    subject_ref: operation.subject_ref,
    acting_party_ref: operation.acting_party_ref,
    tenant_id: operation.tenant_id,
    token_binding_ref: operation.token_binding_ref,
    token_version_ref: "authority-token-version://rotation-sealed",
  });
  const request = buildAuthorityRequestEnvelope({
    client_id: operation.client_id,
    http_method: "POST",
    manifest_id: operation.manifest_id,
    operation,
    operation_family: operation.operation_family,
    operation_id: operation.operation_id,
    payload: { rotation: true },
    payload_ref: "payload://rotation/0137",
    request_id: "request-rotation-0137",
    resolved_path_params: { clientId: operation.client_id },
    resource_template: "/clients/{clientId}/rotation",
    tenant_id: operation.tenant_id,
  });
  const token: HmrcOauthTokenClientBindingContext = {
    access_binding_hash: binding.access_binding_hash,
    acting_party_ref: binding.acting_party_ref,
    authority_link_ref: binding.authority_link_ref,
    authority_scope: binding.authority_scope,
    binding_lineage_ref: binding.binding_lineage_ref,
    client_id: binding.client_id,
    delegation_grant_ref: binding.delegation_grant_ref,
    policy_snapshot_hash: binding.policy_snapshot_hash,
    provider_api_version: binding.provider_api_version,
    provider_environment: binding.provider_environment,
    subject_ref: binding.subject_ref,
    tenant_id: binding.tenant_id,
    token_binding_ref: binding.token_binding_ref,
    token_client_binding_state: "BOUND",
    token_status: "USABLE",
    token_version_ref: "authority-token-version://rotation-send",
  };
  return { binding, request, token };
}

test("allows token-version advancement only inside the sealed binding lineage", async () => {
  const { binding, request, token } = setup();
  const refresh = refreshHmrcAccessTokenWithLineageGuard({
    authority_binding: binding,
    refreshed_token_binding: token,
  });
  expect(refresh.pass_reason_code).toBe("TOKEN_ROTATED_WITHIN_LINEAGE");

  const revalidation = await revalidateAuthorityBindingBeforeSend({
    authority_binding: binding,
    authority_request: request,
    checked_at: "2026-04-29T13:00:00Z",
    checked_token_binding: refresh.checked_token_binding,
    claim_owner_ref: "worker://rotation",
    dispatch_ref: "dispatch://rotation",
  });

  expect(revalidation.sentinel.pass_reason_code_or_null).toBe("TOKEN_ROTATED_WITHIN_LINEAGE");
  expect(revalidation.projection.send_authorized_token_version_ref).toBe(token.token_version_ref);
});

test("rejects token refresh that drifts to a different client or subject context", () => {
  const { binding, token } = setup();
  expect(() =>
    refreshHmrcAccessTokenWithLineageGuard({
      authority_binding: binding,
      refreshed_token_binding: {
        ...token,
        client_id: "client://other",
      },
    }),
  ).toThrow(/same lineage/);
});
