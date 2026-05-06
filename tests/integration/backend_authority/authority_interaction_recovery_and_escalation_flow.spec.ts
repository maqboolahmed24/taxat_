import { expect, test } from "@playwright/test";

import {
  AuthorityInteractionRecordRepository,
  buildAuthorityBinding,
  buildAuthorityOperation,
  buildAuthorityRequestEnvelope,
  buildAuthorityResponseEnvelope,
  materializeAuthorityInteractionDispatch,
  recordAuthorityInteraction,
  revalidateAuthorityBindingBeforeSend,
  applyAuthorityInteractionSendRevalidation,
  appendAuthorityInteractionResponseObservation,
  reconcileAuthorityState,
  emitAuthorityReconciliationAnalyticsSeed,
} from "../../../packages/backend-authority/src/index.ts";

function triplet() {
  const operation = buildAuthorityOperation({
    access_binding_hash: "hash.access.0140.integration",
    acting_party_ref: "client://0140-integration",
    authority_binding_ref: "authority-binding://binding-0140-integration",
    authority_link_ref: "authority-link://0140-integration",
    basis_type: "PERIODIC_UPDATE",
    binding_lineage_ref: "authority-binding-lineage://0140-integration",
    business_partitions: ["business-partition://itsa/2026-q1"],
    client_id: "client-0140-integration",
    manifest_id: "manifest-0140-integration",
    operation_family: "AUTH_SUBMIT_PERIODIC_UPDATE",
    operation_id: "operation-0140-integration",
    policy_snapshot_hash: "hash.policy.0140.integration",
    requested_scope: ["quarterly_update", "prepare_submission", "submit"],
    runtime_scope: ["quarterly_update", "prepare_submission", "submit"],
    subject_ref: "client://0140-integration",
    target_obligation_ref: "obligation://0140-integration/q1",
    tenant_id: "tenant-0140-integration",
    token_binding_ref: "authority-token-binding://0140-integration",
  });
  const binding = buildAuthorityBinding({
    access_binding_hash: operation.access_binding_hash,
    authority_binding_id: "binding-0140-integration",
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
    token_version_ref: "authority-token-version://0140-integration-sealed",
  });
  const request = buildAuthorityRequestEnvelope({
    client_id: operation.client_id,
    http_method: "POST",
    manifest_id: operation.manifest_id,
    operation,
    operation_family: operation.operation_family,
    operation_id: operation.operation_id,
    payload: { period: "2026-Q1" },
    payload_ref: "payload://0140-integration/q1",
    query_params: { period: "2026-Q1" },
    request_id: "request-0140-integration",
    resolved_path_params: { clientId: operation.client_id, period: "2026-Q1" },
    resource_template: "/clients/{clientId}/periods/{period}/updates",
    tenant_id: operation.tenant_id,
  });
  return { binding, request };
}

test("recovers unresolved interaction, preserves budget packet, blocks contradiction, escalates, and resolves", async () => {
  const { binding, request } = triplet();
  const repository = new AuthorityInteractionRecordRepository();
  const registered = await recordAuthorityInteraction({
    authority_binding: binding,
    authority_request: request,
    created_at: "2026-04-29T12:00:00Z",
    dispatch_ref: "dispatch://0140-integration",
    interaction_id: "interaction-0140-integration",
    repository,
  });
  const ready = await materializeAuthorityInteractionDispatch({
    current: registered.interaction,
    repository,
    transition_at: "2026-04-29T12:01:00Z",
  });
  const revalidation = await revalidateAuthorityBindingBeforeSend({
    authority_binding: binding,
    authority_request: request,
    checked_at: "2026-04-29T12:02:00Z",
    claim_owner_ref: "worker://0140-integration",
    dispatch_ref: "dispatch://0140-integration",
  });
  const inFlight = await applyAuthorityInteractionSendRevalidation({
    current: ready.interaction,
    projection: revalidation.projection,
    repository,
    sentinel: revalidation.sentinel,
  });
  const timeout = buildAuthorityResponseEnvelope({
    received_at: "2026-04-29T12:05:00Z",
    request_id: request.request_id,
    response_id: "response-0140-integration-timeout",
    response_source: "TRANSPORT_TIMEOUT",
  });
  const capturedTimeout = await appendAuthorityInteractionResponseObservation({
    current: inFlight.interaction,
    reconciliation_cadence_seconds: 300,
    reconciliation_deadline_at: "2026-04-29T12:20:00Z",
    repository,
    response: timeout,
  });
  const capturedHash =
    capturedTimeout.interaction.reconciliation_control_contract.control_contract_hash;
  const restored = await repository.getAuthorityInteractionRecordById(
    "interaction-0140-integration",
  );

  expect(restored?.record.reconciliation_control_contract.control_contract_hash).toBe(capturedHash);
  expect(restored?.record.reconciliation_attempt_count).toBe(0);
  expect(restored?.record.resend_legality_state).toBe("FOLLOW_UP_READ_ONLY");

  const recovery = buildAuthorityResponseEnvelope({
    authority_reference: "authority-ref://0140-integration/recovered",
    provider_delivery_ref: "provider-delivery://0140-integration/recovered",
    received_at: "2026-04-29T12:06:00Z",
    recovery_basis_response_id: timeout.response_id,
    request,
    request_id: request.request_id,
    response_body_ref: "authority-response-body://0140-integration/recovered",
    response_id: "response-0140-integration-recovered",
    response_source: "RECOVERY_READ",
    supersedes_response_id: timeout.response_id,
  });
  const capturedRecovery = await appendAuthorityInteractionResponseObservation({
    current: capturedTimeout.interaction,
    repository,
    response: recovery,
  });
  expect(capturedRecovery.interaction.response_history_ids).toEqual([
    "response-0140-integration-timeout",
    "response-0140-integration-recovered",
  ]);
  expect(capturedRecovery.interaction.meaning_resolution_state).toBe("RECONCILIATION_REQUIRED");

  const attempted = await reconcileAuthorityState({
    current: capturedRecovery.interaction,
    observed_at: "2026-04-29T12:10:00Z",
    outcome: "FOLLOW_UP_PENDING",
    repository,
  });
  expect(attempted.interaction.reconciliation_attempt_count).toBe(1);
  expect(attempted.interaction.reconciliation_control_contract.control_contract_hash).not.toBe(
    capturedHash,
  );

  const contradicted = await reconcileAuthorityState({
    current: attempted.interaction,
    observed_at: "2026-04-29T12:12:00Z",
    outcome: "CONTRADICTORY_EVIDENCE",
    repository,
  });
  expect(contradicted.interaction.reconciliation_budget_state).toBe("EXHAUSTED");
  expect(contradicted.interaction.resend_legality_state).toBe("BLOCKED_BY_RECONCILIATION");
  expect(contradicted.interaction.next_reconciliation_at).toBeNull();

  const escalated = await reconcileAuthorityState({
    current: contradicted.interaction,
    escalation_due_at: "2026-04-29T13:00:00Z",
    escalation_evidence_refs: ["authority-evidence://0140-integration/contradiction"],
    escalation_owner_ref: "operator://authority-ops",
    escalation_workflow_item_ref: "workflow-item://0140-integration/escalation",
    observed_at: "2026-04-29T12:15:00Z",
    outcome: "ESCALATE",
    repository,
  });
  expect(escalated.interaction.reconciliation_budget_state).toBe("ESCALATED");
  expect(escalated.interaction.resend_legality_state).toBe("BLOCKED_BY_ESCALATION");
  expect(escalated.interaction.reconciliation_workflow_item_ref).toBe(
    "workflow-item://0140-integration/escalation",
  );

  const resolved = await reconcileAuthorityState({
    authority_truth_state: "CONFIRMED",
    current: escalated.interaction,
    observed_at: "2026-04-29T12:30:00Z",
    outcome: "RESOLVE",
    repository,
    selected_active_response_id: "response-0140-integration-recovered",
  });
  expect(resolved.interaction.lifecycle_state).toBe("RESOLVED");
  expect(resolved.interaction.resolution_basis).toBe("RECONCILIATION_RESULT");
  expect(resolved.interaction.active_response_id).toBe("response-0140-integration-recovered");
  expect(resolved.interaction.response_history_ids).toEqual([
    "response-0140-integration-timeout",
    "response-0140-integration-recovered",
  ]);

  const seed = emitAuthorityReconciliationAnalyticsSeed({
    interactions: [resolved.interaction],
  });
  expect(seed.generated_from).toBe("PERSISTED_RECONCILIATION_CONTROL_CONTRACTS_ONLY");
  expect(seed.outcome_class_counts.CONFIRMED).toBe(1);
});
