import { expect, test } from "@playwright/test";

import {
  AuthorityIngressReceiptRepository,
  AuthorityResponseEnvelopeRepository,
  checkpointAuthorityIngress,
  classifyIngressMutationGate,
  mergeAuthorityResponseObservation,
  normalizeAuthorityResponse,
  projectAuthorityIngressInvestigation,
  resolveAuthorityResponseObservationConflict,
} from "../../../packages/backend-authority/src/index.ts";

const at = "2026-04-29T14:00:00Z";

function candidate() {
  return {
    authority_reference: "authority-ref://hmrc/itsa/integration-0139",
    duplicate_meaning_key: "duplicate-meaning://integration-0139",
    idempotency_key: "idempotency-key://integration-0139",
    identity_namespace_hash: "hash.identity.integration.0139",
    interaction_ref: "authority-interaction://integration-0139",
    latest_submission_record_ref: "submission-record://integration-0139",
    request_hash: "hash.request.integration.0139",
  };
}

async function checkpoint(input: {
  body: unknown;
  delivery_ref: string;
  id: string;
  metadata_hash: string;
  repository: AuthorityIngressReceiptRepository;
  received_at?: string;
}) {
  return checkpointAuthorityIngress({
    authority_reference: "authority-ref://hmrc/itsa/integration-0139",
    candidate_lineages: [candidate()],
    duplicate_meaning_key: "duplicate-meaning://integration-0139",
    idempotency_key: "idempotency-key://integration-0139",
    identity_namespace_hash: "hash.identity.integration.0139",
    ingress_channel_class: "CALLBACK",
    ingress_channel_metadata_hash: input.metadata_hash,
    ingress_receipt_id: input.id,
    provider_delivery_ref: input.delivery_ref,
    provider_environment: "HMRC_SANDBOX",
    provider_profile_ref: "authority-provider-profile://hmrc/mtd",
    received_at: input.received_at ?? at,
    repository: input.repository,
    request_hash: "hash.request.integration.0139",
    response_body: input.body,
    response_body_ref: `object://authority-body/${input.id}`,
  });
}

test("runs callback, conflicting poll, duplicate callback, and explicit reconciliation", async () => {
  const ingressRepository = new AuthorityIngressReceiptRepository();
  const responseRepository = new AuthorityResponseEnvelopeRepository();

  const callbackReceipt = await checkpoint({
    body: { status: "accepted" },
    delivery_ref: "provider-delivery://integration/callback",
    id: "ingress-integration-callback",
    metadata_hash: "hash.metadata.integration.callback",
    repository: ingressRepository,
  });
  const callbackResponse = await normalizeAuthorityResponse({
    ingress_receipt: callbackReceipt.receipt,
    request_id: "request-integration-0139",
    response_id: "response-integration-callback",
    response_source: "CALLBACK",
  });
  const callbackMerge = await mergeAuthorityResponseObservation({
    observation: callbackResponse.response,
    persist: true,
    repository: responseRepository,
  });

  const pollReceipt = await checkpoint({
    body: { status: "rejected", reason: "CONFLICTING_POLL_STATE" },
    delivery_ref: "provider-delivery://integration/poll",
    id: "ingress-integration-poll",
    metadata_hash: "hash.metadata.integration.poll",
    received_at: "2026-04-29T14:05:00Z",
    repository: ingressRepository,
  });
  const pollResponse = await normalizeAuthorityResponse({
    http_status: 200,
    ingress_receipt: pollReceipt.receipt,
    request_id: "request-integration-0139",
    response_id: "response-integration-poll",
    response_source: "POLL",
  });
  const pollMerge = await mergeAuthorityResponseObservation({
    history: callbackMerge.history,
    observation: pollResponse.response,
    persist: true,
    prior_responses: [callbackMerge.response],
    repository: responseRepository,
  });

  expect(pollMerge.response.derivation_posture).toBe("CONFLICTING_OBSERVATION");
  expect(pollMerge.response.conflicting_response_ids).toEqual(["response-integration-callback"]);
  expect(pollMerge.history.response_history_ids).toEqual([
    "response-integration-callback",
    "response-integration-poll",
  ]);
  expect(pollMerge.history.active_response_id).toBe("response-integration-callback");
  expect(pollMerge.history.meaning_resolution_state).toBe("RECONCILIATION_REQUIRED");

  const duplicateCallback = await checkpoint({
    body: { status: "accepted" },
    delivery_ref: "provider-delivery://integration/callback",
    id: "ingress-integration-callback-duplicate",
    metadata_hash: "hash.metadata.integration.callback",
    received_at: "2026-04-29T14:06:00Z",
    repository: ingressRepository,
  });
  expect(duplicateCallback.receipt.receipt_state).toBe("DUPLICATE_SUPPRESSED");
  await expect(
    normalizeAuthorityResponse({
      ingress_receipt: duplicateCallback.receipt,
      request_id: "request-integration-0139",
      response_id: "response-integration-duplicate",
      response_source: "CALLBACK",
    }),
  ).rejects.toThrow(/cannot normalize response/);

  const investigation = await projectAuthorityIngressInvestigation({
    receipt: duplicateCallback.receipt,
  });
  expect(investigation.snapshot.delivery_lineage.canonical_ingress_receipt_ref_or_self).toBe(
    "authority-ingress-receipt://ingress-integration-callback",
  );

  const gate = classifyIngressMutationGate({
    receipt: duplicateCallback.receipt,
    requested_effect: "LEGAL_STATE_MUTATION",
  });
  expect(gate.can_mutate_legal_state).toBe(false);

  const resolved = resolveAuthorityResponseObservationConflict({
    history: pollMerge.history,
    resolution_basis_ref: "authority-reconciliation://integration-0139/manual-resolution",
    selected_active_response_id: "response-integration-callback",
  });
  expect(resolved.meaning_resolution_state).toBe("RECONCILIATION_RESOLVED");
  expect(resolved.active_response_id).toBe("response-integration-callback");
});
