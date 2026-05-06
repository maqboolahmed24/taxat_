import { expect, test } from "@playwright/test";

import {
  AuthorityRequestIdentityLookupRepository,
  AuthoritySendClaimStore,
  AuthoritySendRevalidationProjectionRepository,
  buildAuthorityBinding,
  buildAuthorityOperation,
  type HmrcOauthTokenClientBindingContext,
  materializeAuthorityRequestEnvelope,
  normalizeAuthorityRequestIdentityLookupRecord,
  projectRequestIdentityContractScope,
  revalidateAuthorityBindingBeforeSend,
} from "../../../packages/backend-authority/src/index.ts";

test("revalidates delayed send, persists projection, resumes claim, and blocks stale duplicate truth", async () => {
  const operation = buildAuthorityOperation({
    access_binding_hash: "hash.access.queue.0137",
    acting_party_ref: "client://queue-0137",
    authority_binding_ref: "authority-binding://binding-queue-0137",
    authority_link_ref: "authority-link://queue-0137",
    binding_lineage_ref: "authority-binding-lineage://queue-0137",
    business_partitions: ["business-partition://queue/2026-q1"],
    client_id: "client-queue-0137",
    manifest_id: "manifest-queue-0137",
    operation_family: "AUTH_SUBMIT_PERIODIC_UPDATE",
    operation_id: "operation-queue-0137",
    policy_snapshot_hash: "hash.policy.queue.0137",
    requested_scope: ["quarterly_update", "prepare_submission", "submit"],
    runtime_scope: ["quarterly_update", "prepare_submission", "submit"],
    subject_ref: "client://queue-0137",
    target_obligation_ref: "obligation://queue/2026-q1",
    tenant_id: "tenant-queue-0137",
    token_binding_ref: "authority-token-binding://queue-0137",
  });
  const binding = buildAuthorityBinding({
    access_binding_hash: operation.access_binding_hash,
    authority_binding_id: "binding-queue-0137",
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
    token_version_ref: "authority-token-version://queue-sealed",
  });
  const { envelope: request } = await materializeAuthorityRequestEnvelope({
    client_id: operation.client_id,
    http_method: "POST",
    manifest_id: operation.manifest_id,
    operation,
    operation_family: operation.operation_family,
    operation_id: operation.operation_id,
    payload: { period: "2026-Q1" },
    payload_ref: "payload://queue/q1",
    query_params: { period: "2026-Q1" },
    request_id: "request-queue-0137",
    resolved_path_params: { clientId: operation.client_id, period: "2026-Q1" },
    resource_template: "/clients/{clientId}/periods/{period}/updates",
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
    token_version_ref: "authority-token-version://queue-rotated",
  };
  const claimStore = new AuthoritySendClaimStore();
  const projectionRepository = new AuthoritySendRevalidationProjectionRepository();

  const clear = await revalidateAuthorityBindingBeforeSend({
    authority_binding: binding,
    authority_request: request,
    checked_at: "2026-04-29T14:00:00Z",
    checked_token_binding: token,
    claim_owner_ref: "worker://queue",
    dispatch_ref: "dispatch://queue",
    projection_interaction_id: "interaction-queue-0137",
    projection_repository: projectionRepository,
    send_claim_store: claimStore,
  });
  expect(clear.projection.send_revalidation_state).toBe("CLEAR_TO_SEND");
  expect(clear.projection.send_revalidation_reason_codes).toEqual(["TOKEN_ROTATED_WITHIN_LINEAGE"]);
  expect(
    (await projectionRepository.getSendRevalidationProjection("interaction-queue-0137"))
      ?.send_authorized_token_version_ref,
  ).toBe(token.token_version_ref);

  const resumed = await revalidateAuthorityBindingBeforeSend({
    authority_binding: binding,
    authority_request: request,
    checked_at: "2026-04-29T14:00:00Z",
    checked_token_binding: token,
    claim_owner_ref: "worker://queue",
    dispatch_ref: "dispatch://queue",
    send_claim_store: claimStore,
  });
  expect(resumed.claim.reason_codes).toEqual(["SEND_CLAIM_REENTERED"]);

  const duplicateRepository = new AuthorityRequestIdentityLookupRepository();
  await duplicateRepository.upsertRequestIdentityLookup({
    authority_truth_state: "CONFIRMED",
    request_identity_contract: projectRequestIdentityContractScope(
      request.request_identity_contract,
      "SUBMISSION_RECORD",
    ),
    source_record_ref: "submission-record://queue-confirmed",
    source_record_type: "SUBMISSION_RECORD",
    stronger_truth_ref: "authority-truth://queue-confirmed",
  });
  const candidate = normalizeAuthorityRequestIdentityLookupRecord({
    request_identity_contract: request.request_identity_contract,
    source_record_ref: "authority-request-envelope://request-queue-0137",
    source_record_type: "AUTHORITY_REQUEST_ENVELOPE",
  });
  const blocked = await revalidateAuthorityBindingBeforeSend({
    authority_binding: binding,
    authority_request: request,
    checked_at: "2026-04-29T14:05:00Z",
    claim_owner_ref: "worker://queue-blocked",
    dispatch_ref: "dispatch://queue-blocked",
    duplicate_lookup_candidate: candidate,
    duplicate_lookup_repository: duplicateRepository,
  });
  expect(blocked.projection.send_revalidation_state).toBe("BLOCKED");
  expect(blocked.sentinel.block_reason_codes).toEqual(["STRONGER_EXTERNAL_TRUTH_PRESENT"]);
});
