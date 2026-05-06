import { expect, test } from "@playwright/test";

import {
  AuthorityInteractionRecordRepository,
  buildAuthorityBinding,
  buildAuthorityOperation,
  buildAuthorityRequestEnvelope,
  buildAuthorityResponseEnvelope,
  materializeAuthorityInteractionDispatch,
  normalizeAuthorityInteractionRecord,
  recordAuthorityInteraction,
  revalidateAuthorityBindingBeforeSend,
  applyAuthorityInteractionSendRevalidation,
  appendAuthorityInteractionResponseObservation,
  reconcileAuthorityState,
  validateAuthorityInteractionTransition,
} from "../../../packages/backend-authority/src/index.ts";

function authorityTriplet() {
  const operation = buildAuthorityOperation({
    access_binding_hash: "hash.access.0140.contract",
    acting_party_ref: "client://0140-contract",
    authority_binding_ref: "authority-binding://binding-0140-contract",
    authority_link_ref: "authority-link://0140-contract",
    basis_type: "FINAL_DECLARATION",
    binding_lineage_ref: "authority-binding-lineage://0140-contract",
    business_partitions: ["business-partition://itsa/2026"],
    client_id: "client-0140-contract",
    manifest_id: "manifest-0140-contract",
    operation_family: "AUTH_SUBMIT_FINAL_DECLARATION",
    operation_id: "operation-0140-contract",
    policy_snapshot_hash: "hash.policy.0140.contract",
    requested_scope: ["year_end", "prepare_submission", "submit"],
    runtime_scope: ["year_end", "prepare_submission", "submit"],
    subject_ref: "client://0140-contract",
    tenant_id: "tenant-0140-contract",
    token_binding_ref: "authority-token-binding://0140-contract",
  });
  const binding = buildAuthorityBinding({
    access_binding_hash: operation.access_binding_hash,
    authority_binding_id: "binding-0140-contract",
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
    token_version_ref: "authority-token-version://0140-contract-sealed",
  });
  const request = buildAuthorityRequestEnvelope({
    client_id: operation.client_id,
    http_method: "POST",
    manifest_id: operation.manifest_id,
    operation,
    operation_family: operation.operation_family,
    operation_id: operation.operation_id,
    payload: { declaration: "sealed" },
    payload_ref: "payload://0140-contract/final",
    request_id: "request-0140-contract",
    resolved_path_params: { clientId: operation.client_id },
    resource_template: "/clients/{clientId}/final-declaration",
    tenant_id: operation.tenant_id,
  });
  return { binding, operation, request };
}

async function inFlightInteraction() {
  const { binding, request } = authorityTriplet();
  const repository = new AuthorityInteractionRecordRepository();
  const registered = await recordAuthorityInteraction({
    authority_binding: binding,
    authority_request: request,
    created_at: "2026-04-29T10:00:00Z",
    dispatch_ref: "dispatch://0140-contract",
    interaction_id: "interaction-0140-contract",
    repository,
  });
  const dispatchReady = await materializeAuthorityInteractionDispatch({
    current: registered.interaction,
    repository,
    transition_at: "2026-04-29T10:01:00Z",
  });
  const revalidation = await revalidateAuthorityBindingBeforeSend({
    authority_binding: binding,
    authority_request: request,
    checked_at: "2026-04-29T10:02:00Z",
    claim_owner_ref: "worker://0140-contract",
    dispatch_ref: "dispatch://0140-contract",
  });
  const inFlight = await applyAuthorityInteractionSendRevalidation({
    current: dispatchReady.interaction,
    projection: revalidation.projection,
    repository,
    sentinel: revalidation.sentinel,
  });
  return { binding, inFlight: inFlight.interaction, repository, request };
}

test("registers immutable request identity and enforces the interaction transition matrix", async () => {
  const { binding, request } = authorityTriplet();
  const registered = await recordAuthorityInteraction({
    authority_binding: binding,
    authority_request: request,
    created_at: "2026-04-29T10:00:00Z",
    dispatch_ref: "dispatch://0140-contract",
    interaction_id: "interaction-0140-contract",
  });

  expect(registered.interaction.request_identity_contract.binding_scope_class).toBe(
    "AUTHORITY_INTERACTION_RECORD",
  );
  expect(registered.interaction.reconciliation_control_contract.reconciliation_budget_state).toBe(
    "NOT_OPENED",
  );
  expect(
    validateAuthorityInteractionTransition({
      current: registered.interaction,
      event: "dispatch_materialized",
    }).to_state,
  ).toBe("DISPATCH_READY");
  expect(() =>
    validateAuthorityInteractionTransition({
      current: registered.interaction,
      event: "provider_response_captured",
    }),
  ).toThrow(/cannot transition/);
});

test("persists send revalidation and keeps in-flight resend as idempotent recovery only", async () => {
  const { inFlight } = await inFlightInteraction();

  expect(inFlight.lifecycle_state).toBe("TRANSMIT_IN_FLIGHT");
  expect(inFlight.send_revalidation_state).toBe("CLEAR_TO_SEND");
  expect(inFlight.send_authorized_token_version_ref).toBe(
    "authority-token-version://0140-contract-sealed",
  );
  expect(inFlight.resend_legality_state).toBe("IDEMPOTENT_RECOVERY_ONLY");
  expect(inFlight.resend_control_reason_codes).toEqual([
    "IN_FLIGHT_REQUEST_LINEAGE_EXISTS",
    "QUEUE_REBUILD_REQUIRES_IDEMPOTENT_RECOVERY",
  ]);
});

test("captures timeout meaning without premature resolution basis", async () => {
  const { inFlight, request } = await inFlightInteraction();
  const timeout = buildAuthorityResponseEnvelope({
    received_at: "2026-04-29T10:05:00Z",
    request_id: request.request_id,
    response_id: "response-0140-timeout",
    response_source: "TRANSPORT_TIMEOUT",
  });
  const captured = await appendAuthorityInteractionResponseObservation({
    current: inFlight,
    reconciliation_deadline_at: "2026-04-30T10:05:00Z",
    response: timeout,
  });

  expect(captured.interaction.lifecycle_state).toBe("RESPONSE_CAPTURED");
  expect(captured.interaction.active_response_id).toBe("response-0140-timeout");
  expect(captured.interaction.meaning_resolution_state).toBe("PROVISIONAL_TIMEOUT");
  expect(captured.interaction.resolution_basis).toBeNull();
  expect(captured.interaction.reconciliation_budget_state).toBe("ACTIVE");
  expect(captured.interaction.next_reconciliation_at).not.toBeNull();

  expect(() =>
    normalizeAuthorityInteractionRecord({
      ...captured.interaction,
      resolution_basis: "TERMINAL_RESPONSE",
    }),
  ).toThrow(/resolution/);
});

test("resolves only through explicit terminal lifecycle and selected active response", async () => {
  const { inFlight, request, repository } = await inFlightInteraction();
  const terminal = buildAuthorityResponseEnvelope({
    received_at: "2026-04-29T10:05:00Z",
    request,
    request_id: request.request_id,
    response_body_ref: "authority-response-body://0140-contract/success",
    response_id: "response-0140-success",
    response_source: "INLINE_HTTP",
  });
  const captured = await appendAuthorityInteractionResponseObservation({
    current: inFlight,
    repository,
    response: terminal,
  });
  const resolved = await reconcileAuthorityState({
    current: captured.interaction,
    observed_at: "2026-04-29T10:06:00Z",
    outcome: "RESOLVE",
    repository,
  });

  expect(resolved.interaction.lifecycle_state).toBe("RESOLVED");
  expect(resolved.interaction.resolution_basis).toBe("TERMINAL_RESPONSE");
  expect(resolved.interaction.reconciliation_budget_state).toBe("CLOSED");
  expect(resolved.interaction.response_history_ids).toEqual(["response-0140-success"]);
});
