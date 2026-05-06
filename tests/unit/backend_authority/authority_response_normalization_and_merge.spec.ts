import { expect, test } from "@playwright/test";

import {
  AuthorityResponseEnvelopeRepository,
  buildAuthorityResponseEnvelope,
  checkpointAuthorityIngress,
  classifyIngressMutationGate,
  mergeAuthorityResponseObservation,
  normalizeAuthorityResponse,
  recoverAuthorityObservation,
} from "../../../packages/backend-authority/src/index.ts";

const at = "2026-04-29T13:00:00Z";

function candidate(suffix = "primary") {
  return {
    authority_reference: "authority-ref://hmrc/itsa/response-0139",
    duplicate_meaning_key: "duplicate-meaning://response-0139",
    idempotency_key: "idempotency-key://response-0139",
    identity_namespace_hash: "hash.identity.response.0139",
    interaction_ref: `authority-interaction://${suffix}`,
    request_hash: "hash.request.response.0139",
  };
}

async function boundReceipt(id: string, delivery: string, body: unknown = { accepted: true }) {
  const checkpoint = await checkpointAuthorityIngress({
    authority_reference: "authority-ref://hmrc/itsa/response-0139",
    candidate_lineages: [candidate()],
    duplicate_meaning_key: "duplicate-meaning://response-0139",
    idempotency_key: "idempotency-key://response-0139",
    identity_namespace_hash: "hash.identity.response.0139",
    ingress_channel_class: "CALLBACK",
    ingress_channel_metadata_hash: `hash.metadata.${id}`,
    ingress_receipt_id: id,
    provider_delivery_ref: delivery,
    provider_environment: "HMRC_SANDBOX",
    provider_profile_ref: "authority-provider-profile://hmrc/mtd",
    received_at: at,
    request_hash: "hash.request.response.0139",
    response_body: body,
    response_body_ref: `object://authority-body/${id}`,
  });
  return checkpoint.receipt;
}

test("normalizes async responses with canonical ingress proof and keeps inline timeout proof null", async () => {
  const receipt = await boundReceipt("ingress-response-0139", "provider-delivery://response-0139");
  const { response } = await normalizeAuthorityResponse({
    ingress_receipt: receipt,
    request_id: "request-response-0139",
    response_id: "response-0139-callback",
    response_source: "CALLBACK",
  });

  expect(response.ingress_receipt_ref).toBe("authority-ingress-receipt://ingress-response-0139");
  expect(response.authority_ingress_proof_contract).not.toBeNull();
  expect(response.authority_ingress_proof_contract?.delivery_dedupe_key_or_null).toBe(
    receipt.delivery_dedupe_key,
  );

  const inline = await normalizeAuthorityResponse({
    request_id: "request-response-0139",
    response_body_ref: null,
    response_id: "response-0139-inline",
    response_source: "INLINE_HTTP",
  });
  expect(inline.response.authority_ingress_proof_contract).toBeNull();

  const timeout = await normalizeAuthorityResponse({
    request_id: "request-response-0139",
    response_id: "response-0139-timeout",
    response_source: "TRANSPORT_TIMEOUT",
  });
  expect(timeout.response.authority_ingress_proof_contract).toBeNull();
  expect(timeout.response.response_body_hash).toBe("<NONE>");
});

test("blocks duplicate and quarantined ingress from response normalization", async () => {
  const weak = await checkpointAuthorityIngress({
    authority_reference: "authority-ref://hmrc/itsa/weak-response",
    candidate_lineages: [
      {
        authority_reference: "authority-ref://hmrc/itsa/weak-response",
        interaction_ref: "authority-interaction://weak-response",
      },
    ],
    ingress_channel_class: "GATEWAY_RECOVERED",
    ingress_channel_metadata_hash: "hash.metadata.weak-response",
    ingress_receipt_id: "ingress-weak-response",
    provider_delivery_ref: "provider-delivery://weak-response",
    provider_environment: "HMRC_SANDBOX",
    provider_profile_ref: "authority-provider-profile://hmrc/mtd",
    received_at: at,
    response_body_ref: "object://authority-body/weak-response",
  });
  await expect(
    normalizeAuthorityResponse({
      ingress_receipt: weak.receipt,
      request_id: "request-weak-response",
      response_id: "response-weak-response",
      response_source: "RECOVERY_READ",
    }),
  ).rejects.toThrow(/cannot normalize response/);

  const repository = weak.repository;
  const first = await boundReceipt(
    "ingress-duplicate-first",
    "provider-delivery://duplicate-response",
    { accepted: true },
  );
  await repository.persistAuthorityIngressReceipt({ receipt: first });
  const duplicate = await checkpointAuthorityIngress({
    authority_reference: "authority-ref://hmrc/itsa/response-0139",
    candidate_lineages: [candidate()],
    duplicate_meaning_key: "duplicate-meaning://response-0139",
    idempotency_key: "idempotency-key://response-0139",
    identity_namespace_hash: "hash.identity.response.0139",
    ingress_channel_class: "CALLBACK",
    ingress_channel_metadata_hash: "hash.metadata.ingress-duplicate-first",
    ingress_receipt_id: "ingress-duplicate-second",
    provider_delivery_ref: "provider-delivery://duplicate-response",
    provider_environment: "HMRC_SANDBOX",
    provider_profile_ref: "authority-provider-profile://hmrc/mtd",
    received_at: "2026-04-29T13:01:00Z",
    repository,
    request_hash: "hash.request.response.0139",
    response_body: { accepted: true },
    response_body_ref: "object://authority-body/ingress-duplicate-first",
  });
  const gate = classifyIngressMutationGate({
    receipt: duplicate.receipt,
    requested_effect: "LEGAL_STATE_MUTATION",
  });
  expect(gate.can_mutate_legal_state).toBe(false);
  await expect(
    normalizeAuthorityResponse({
      ingress_receipt: duplicate.receipt,
      request_id: "request-duplicate-response",
      response_id: "response-duplicate-response",
      response_source: "CALLBACK",
    }),
  ).rejects.toThrow(/cannot normalize response/);
});

test("preserves recovery basis and append-only merge semantics", async () => {
  const repository = new AuthorityResponseEnvelopeRepository();
  const timeout = buildAuthorityResponseEnvelope({
    received_at: "2026-04-29T13:00:00Z",
    request_id: "request-merge-0139",
    response_id: "response-merge-timeout",
    response_source: "TRANSPORT_TIMEOUT",
  });
  const firstMerge = await mergeAuthorityResponseObservation({
    observation: timeout,
    persist: true,
    repository,
  });
  expect(firstMerge.history.active_response_id).toBe("response-merge-timeout");
  expect(firstMerge.history.meaning_resolution_state).toBe("PROVISIONAL_TIMEOUT");

  const receipt = await boundReceipt("ingress-recovery-0139", "provider-delivery://recovery-0139");
  const recovered = await recoverAuthorityObservation({
    ingress_receipt: receipt,
    recovery_basis_response_id: timeout.response_id,
    request_id: "request-merge-0139",
    response_id: "response-merge-recovery",
  });
  expect(recovered.response.recovery_basis_response_id).toBe(timeout.response_id);

  const secondMerge = await mergeAuthorityResponseObservation({
    history: firstMerge.history,
    observation: recovered.response,
    persist: true,
    prior_responses: [timeout],
    repository,
  });
  expect(secondMerge.response.derivation_posture).toBe("SUPERSEDES_TIMEOUT_PLACEHOLDER");
  expect(secondMerge.response.supersedes_response_id).toBe(timeout.response_id);
  expect(secondMerge.history.response_history_ids).toEqual([
    "response-merge-timeout",
    "response-merge-recovery",
  ]);
  expect(secondMerge.history.active_response_id).toBe("response-merge-timeout");
  expect(secondMerge.reconciliation_opened).toBe(true);
});
