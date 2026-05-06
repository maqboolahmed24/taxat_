import { expect, test } from "@playwright/test";

import {
  AuthorityRequestIdentityLookupRepository,
  AuthoritySendClaimStore,
  buildAuthorityBinding,
  buildAuthorityOperation,
  buildAuthorityRequestEnvelope,
  normalizeAuthorityRequestIdentityLookupRecord,
  projectRequestIdentityContractScope,
  revalidateAuthorityBindingBeforeSend,
  revalidateAuthorityBindingForReconciliationRead,
} from "../../../packages/backend-authority/src/index.ts";

function authorityTriplet() {
  const operation = buildAuthorityOperation({
    access_binding_hash: "hash.access.0137",
    acting_party_ref: "client://0137",
    authority_binding_ref: "authority-binding://binding-0137",
    authority_link_ref: "authority-link://0137",
    binding_lineage_ref: "authority-binding-lineage://0137",
    business_partitions: ["business-partition://itsa/2026-q1"],
    client_id: "client-0137",
    manifest_id: "manifest-0137",
    operation_family: "AUTH_SUBMIT_PERIODIC_UPDATE",
    operation_id: "operation-0137",
    policy_snapshot_hash: "hash.policy.0137",
    requested_scope: ["quarterly_update", "prepare_submission", "submit"],
    runtime_scope: ["quarterly_update", "prepare_submission", "submit"],
    subject_ref: "client://0137",
    target_obligation_ref: "obligation://itsa/2026-q1",
    tenant_id: "tenant-0137",
    token_binding_ref: "authority-token-binding://0137",
  });
  const binding = buildAuthorityBinding({
    access_binding_hash: operation.access_binding_hash,
    authority_binding_id: "binding-0137",
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
    token_version_ref: "authority-token-version://0137-sealed",
  });
  const request = buildAuthorityRequestEnvelope({
    client_id: operation.client_id,
    http_method: "POST",
    manifest_id: operation.manifest_id,
    operation,
    operation_family: operation.operation_family,
    operation_id: operation.operation_id,
    payload: { period: "2026-Q1" },
    payload_ref: "payload://0137/q1",
    query_params: { period: "2026-Q1" },
    request_id: "request-0137",
    resolved_path_params: { clientId: operation.client_id, period: "2026-Q1" },
    resource_template: "/clients/{clientId}/periods/{period}/updates",
    tenant_id: operation.tenant_id,
  });
  return { binding, operation, request };
}

test("clears transmit only after token, binding, duplicate bucket, and send claim pass", async () => {
  const { binding, request } = authorityTriplet();
  const result = await revalidateAuthorityBindingBeforeSend({
    authority_binding: binding,
    authority_request: request,
    checked_at: "2026-04-29T12:00:00Z",
    claim_owner_ref: "worker://0137/a",
    dispatch_ref: "dispatch://0137/a",
  });

  expect(result.sentinel.decision_state).toBe("CLEAR_TO_PROCEED");
  expect(result.sentinel.exclusive_send_claim_state).toBe("CLAIM_HELD");
  expect(result.projection.send_revalidation_state).toBe("CLEAR_TO_SEND");
  expect(result.projection.send_authorized_token_version_ref).toBe(binding.token_version_ref);
  expect(result.projection.send_revalidation_reason_codes).toEqual(["SEALED_TOKEN_VERSION_REUSED"]);
});

test("blocks subject drift and send-claim contention before transmit", async () => {
  const { binding, request } = authorityTriplet();
  const store = new AuthoritySendClaimStore();
  await revalidateAuthorityBindingBeforeSend({
    authority_binding: binding,
    authority_request: request,
    checked_at: "2026-04-29T12:05:00Z",
    claim_owner_ref: "worker://0137/a",
    dispatch_ref: "dispatch://0137/conflict",
    send_claim_store: store,
  });

  const result = await revalidateAuthorityBindingBeforeSend({
    authority_binding: binding,
    authority_request: request,
    checked_at: "2026-04-29T12:06:00Z",
    checked_token_binding: {
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
      subject_ref: "client://wrong-subject",
      tenant_id: binding.tenant_id,
      token_binding_ref: binding.token_binding_ref,
      token_client_binding_state: "BOUND",
      token_status: "USABLE",
      token_version_ref: binding.token_version_ref,
    },
    claim_owner_ref: "worker://0137/b",
    dispatch_ref: "dispatch://0137/conflict",
    send_claim_store: store,
    step_up_evidence_current: false,
  });

  expect(result.sentinel.decision_state).toBe("BLOCKED");
  expect(result.sentinel.checked_token_version_ref_or_null).toBeNull();
  expect(result.sentinel.block_reason_codes).toEqual([
    "CLIENT_SUBJECT_SCOPE_DRIFT",
    "SEND_CLAIM_CONFLICT",
  ]);
  expect(result.projection.send_revalidation_state).toBe("BLOCKED");
  expect(result.projection.send_authorized_token_version_ref).toBeNull();
});

test("blocks provider, access-binding, and policy drift before transmit", async () => {
  const { binding, request } = authorityTriplet();
  const result = await revalidateAuthorityBindingBeforeSend({
    authority_binding: binding,
    authority_request: request,
    checked_at: "2026-04-29T12:07:00Z",
    checked_token_binding: {
      access_binding_hash: "hash.access.drifted",
      acting_party_ref: binding.acting_party_ref,
      authority_link_ref: binding.authority_link_ref,
      authority_scope: binding.authority_scope,
      binding_lineage_ref: binding.binding_lineage_ref,
      client_id: binding.client_id,
      delegation_grant_ref: binding.delegation_grant_ref,
      policy_snapshot_hash: "hash.policy.drifted",
      provider_api_version: "v2",
      provider_environment: "PRODUCTION",
      subject_ref: binding.subject_ref,
      tenant_id: binding.tenant_id,
      token_binding_ref: binding.token_binding_ref,
      token_client_binding_state: "BOUND",
      token_status: "USABLE",
      token_version_ref: binding.token_version_ref,
    },
    claim_owner_ref: "worker://0137/provider-drift",
    dispatch_ref: "dispatch://0137/provider-drift",
  });

  expect(result.sentinel.decision_state).toBe("BLOCKED");
  expect(result.sentinel.block_reason_codes).toEqual([
    "ACCESS_BINDING_HASH_DRIFT",
    "POLICY_SNAPSHOT_HASH_DRIFT",
    "PROVIDER_CONTRACT_DRIFT",
  ]);
  expect(result.projection.send_authorized_token_version_ref).toBeNull();
});

test("fails closed when required step-up or approval evidence is missing at send time", async () => {
  const { binding: baseBinding, request } = authorityTriplet();
  const binding = buildAuthorityBinding({
    access_binding_hash: baseBinding.access_binding_hash,
    acting_party_ref: baseBinding.acting_party_ref,
    approval_ref: "approval://0137",
    approval_state: "SATISFIED",
    authority_binding_id: baseBinding.authority_binding_id,
    authority_link_ref: baseBinding.authority_link_ref,
    authority_scope: baseBinding.authority_scope,
    binding_lineage_ref: baseBinding.binding_lineage_ref,
    client_id: baseBinding.client_id,
    manifest_id: baseBinding.manifest_id,
    partition_scope_refs: baseBinding.partition_scope_refs,
    policy_snapshot_hash: baseBinding.policy_snapshot_hash,
    provider_api_version: baseBinding.provider_api_version,
    provider_environment: baseBinding.provider_environment,
    step_up_evidence_ref: "step-up://0137",
    step_up_state: "SATISFIED",
    subject_ref: baseBinding.subject_ref,
    tenant_id: baseBinding.tenant_id,
    token_binding_ref: baseBinding.token_binding_ref,
    token_version_ref: baseBinding.token_version_ref,
  });

  const blocked = await revalidateAuthorityBindingBeforeSend({
    authority_binding: binding,
    authority_request: request,
    checked_at: "2026-04-29T12:08:00Z",
    claim_owner_ref: "worker://0137/human-gate-block",
    dispatch_ref: "dispatch://0137/human-gate-block",
  });
  expect(blocked.sentinel.decision_state).toBe("BLOCKED");
  expect(blocked.sentinel.block_reason_codes).toEqual(["STEP_UP_OR_APPROVAL_DRIFT"]);

  const clear = await revalidateAuthorityBindingBeforeSend({
    approval_evidence_current: true,
    authority_binding: binding,
    authority_request: request,
    checked_at: "2026-04-29T12:09:00Z",
    claim_owner_ref: "worker://0137/human-gate-clear",
    dispatch_ref: "dispatch://0137/human-gate-clear",
    step_up_evidence_current: true,
  });
  expect(clear.sentinel.decision_state).toBe("CLEAR_TO_PROCEED");
  expect(clear.projection.send_revalidation_state).toBe("CLEAR_TO_SEND");
});

test("reuses sentinel vocabulary for reconciliation reads without transmit claim state", async () => {
  const { binding, request } = authorityTriplet();
  const result = await revalidateAuthorityBindingForReconciliationRead({
    authority_binding: binding,
    authority_request: request,
    checked_action_class: "RECOVERY_READ",
    checked_at: "2026-04-29T12:10:00Z",
  });

  expect(result.sentinel.checked_action_class).toBe("RECOVERY_READ");
  expect(result.sentinel.decision_state).toBe("CLEAR_TO_PROCEED");
  expect(result.sentinel.exclusive_send_claim_state).toBe("NOT_APPLICABLE");
});

test("blocks stale stronger truth in the duplicate bucket before send", async () => {
  const { request, binding } = authorityTriplet();
  const repository = new AuthorityRequestIdentityLookupRepository();
  await repository.upsertRequestIdentityLookup({
    authority_truth_state: "CONFIRMED",
    request_identity_contract: projectRequestIdentityContractScope(
      request.request_identity_contract,
      "SUBMISSION_RECORD",
    ),
    source_record_ref: "submission-record://confirmed-0137",
    source_record_type: "SUBMISSION_RECORD",
    stronger_truth_ref: "authority-truth://confirmed-0137",
  });
  const candidate = normalizeAuthorityRequestIdentityLookupRecord({
    request_identity_contract: request.request_identity_contract,
    source_record_ref: "authority-request-envelope://request-0137",
    source_record_type: "AUTHORITY_REQUEST_ENVELOPE",
  });

  const result = await revalidateAuthorityBindingBeforeSend({
    authority_binding: binding,
    authority_request: request,
    checked_at: "2026-04-29T12:15:00Z",
    claim_owner_ref: "worker://0137/stale",
    dispatch_ref: "dispatch://0137/stale",
    duplicate_lookup_candidate: candidate,
    duplicate_lookup_repository: repository,
  });

  expect(result.sentinel.decision_state).toBe("BLOCKED");
  expect(result.sentinel.duplicate_truth_inputs_state).toBe("NEWER_TRUTH_OR_DUPLICATE_PRESENT");
  expect(result.sentinel.block_reason_codes).toEqual(["STRONGER_EXTERNAL_TRUTH_PRESENT"]);
  expect(result.sentinel.latest_submission_record_ref_or_null).toBe(
    "submission-record://confirmed-0137",
  );

  const reconciliationRead = await revalidateAuthorityBindingForReconciliationRead({
    authority_binding: binding,
    authority_request: request,
    checked_action_class: "RECONCILIATION_POLL",
    checked_at: "2026-04-29T12:16:00Z",
    duplicate_lookup_candidate: candidate,
    duplicate_lookup_repository: repository,
  });
  expect(reconciliationRead.sentinel.decision_state).toBe("BLOCKED");
  expect(reconciliationRead.sentinel.block_reason_codes).toEqual([
    "STRONGER_EXTERNAL_TRUTH_PRESENT",
  ]);
  expect(reconciliationRead.sentinel.latest_submission_record_ref_or_null).toBe(
    "submission-record://confirmed-0137",
  );
});
