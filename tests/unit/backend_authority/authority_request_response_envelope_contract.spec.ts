import { expect, test } from "@playwright/test";

import {
  AuthorityResponseEnvelopeRepository,
  buildAuthorityBinding,
  buildAuthorityOperation,
  buildAuthorityRequestEnvelope,
  buildAuthorityResponseEnvelope,
  checkpointAuthorityIngress,
  normalizeAuthorityRequestEnvelope,
  normalizeAuthorityResponseEnvelope,
  normalizeAuthorityResponse,
  validateAuthorityTransportLineage,
} from "../../../packages/backend-authority/src/index.ts";

function operation() {
  return buildAuthorityOperation({
    access_binding_hash: "hash.access.0135",
    acting_party_ref: "client://0135",
    authority_binding_ref: "authority-binding://binding-0135",
    authority_link_ref: "authority-link://0135",
    basis_type: "FINAL_DECLARATION",
    binding_lineage_ref: "authority-binding-lineage://0135",
    business_partitions: ["business-partition://itsa/2026"],
    client_id: "client-0135",
    manifest_id: "manifest-0135",
    operation_family: "AUTH_SUBMIT_FINAL_DECLARATION",
    operation_id: "operation-0135",
    policy_snapshot_hash: "hash.policy.0135",
    requested_scope: ["year_end", "prepare_submission", "submit"],
    runtime_scope: ["year_end", "prepare_submission", "submit"],
    subject_ref: "client://0135",
    tenant_id: "tenant-0135",
    token_binding_ref: "authority-token-binding://0135",
  });
}

function requestEnvelope() {
  const op = operation();
  return buildAuthorityRequestEnvelope({
    operation: op,
    client_id: op.client_id,
    http_method: "POST",
    manifest_id: op.manifest_id,
    operation_family: op.operation_family,
    operation_id: op.operation_id,
    payload: { declaration: "sealed" },
    payload_ref: "payload://0135/final",
    query_params: { z: "last", a: ["first", "second"] },
    request_id: "request-0135",
    resolved_path_params: { clientId: "client-0135" },
    resource_template: "/clients/{clientId}/final-declaration",
    tenant_id: op.tenant_id,
  });
}

async function checkpointedReceiptForRequest(request = requestEnvelope(), suffix = "callback") {
  const checkpoint = await checkpointAuthorityIngress({
    authority_reference: `authority-ref://0135/${suffix}`,
    candidate_lineages: [
      {
        authority_reference: `authority-ref://0135/${suffix}`,
        duplicate_meaning_key: request.duplicate_meaning_key,
        idempotency_key: request.idempotency_key,
        identity_namespace_hash: request.identity_namespace_hash,
        interaction_ref: `authority-interaction://0135/${suffix}`,
        request_hash: request.request_hash,
      },
    ],
    duplicate_meaning_key: request.duplicate_meaning_key,
    idempotency_key: request.idempotency_key,
    identity_namespace_hash: request.identity_namespace_hash,
    ingress_channel_class: suffix === "recovered" ? "GATEWAY_RECOVERED" : "CALLBACK",
    ingress_channel_metadata_hash: `hash.ingress-metadata.0135.${suffix}`,
    ingress_receipt_id: `ingress-0135-${suffix}`,
    provider_delivery_ref: `provider-delivery://0135/${suffix}`,
    provider_environment: request.provider_environment,
    provider_profile_ref: "authority-provider-profile://hmrc/mtd",
    received_at: "2026-04-29T10:04:00Z",
    request_hash: request.request_hash,
    response_body: { accepted: true, suffix },
    response_body_ref: `authority-response-body://0135/${suffix}`,
  });
  return checkpoint.receipt;
}

test("freezes canonical request identity and mirrors it into request_identity_contract", () => {
  const request = requestEnvelope();

  expect(request.canonical_query).toBe("a=first&a=second&z=last");
  expect(request.normalized_obligation_ref).toBe("<NONE>");
  expect(request.request_body_hash).not.toBe("<NONE>");
  expect(request.request_identity_contract.binding_scope_class).toBe("AUTHORITY_REQUEST_ENVELOPE");
  expect(request.request_identity_contract.request_hash).toBe(request.request_hash);
  expect(request.request_identity_contract.duplicate_meaning_key).toBe(
    request.duplicate_meaning_key,
  );
});

test("enforces null-body sentinel and write-method payload posture", () => {
  const request = requestEnvelope();

  expect(() =>
    normalizeAuthorityRequestEnvelope({
      ...request,
      http_method: "GET",
      payload_ref: null,
      request_body_hash: "hash.body.should-not-exist",
    }),
  ).toThrow(/request_body_hash/);

  expect(() =>
    buildAuthorityRequestEnvelope({
      operation: operation(),
      client_id: request.client_id,
      http_method: "GET",
      manifest_id: request.manifest_id,
      operation_family: request.operation_family,
      operation_id: request.operation_id,
      payload: { invalid: true },
      payload_ref: "payload://0135/invalid",
      request_id: "request-0135-invalid",
      resolved_path_params: { clientId: "client-0135" },
      resource_template: "/clients/{clientId}/final-declaration",
      tenant_id: request.tenant_id,
    }),
  ).toThrow(/payload_ref/);
});

test("distinguishes inline, timeout, and async response proof posture", async () => {
  const request = requestEnvelope();
  const inline = buildAuthorityResponseEnvelope({
    request,
    request_id: request.request_id,
    response_body_ref: null,
    response_id: "response-0135-inline",
    response_source: "INLINE_HTTP",
  });
  expect(inline.authority_ingress_proof_contract).toBeNull();
  expect(inline.response_body_hash).toBe("<NONE>");

  const timeout = buildAuthorityResponseEnvelope({
    request_id: request.request_id,
    response_id: "response-0135-timeout",
    response_source: "TRANSPORT_TIMEOUT",
  });
  expect(timeout.authority_ingress_proof_contract).toBeNull();
  expect(timeout.legal_effect_posture).toBe("PROVISIONAL_STATE_MUTATION");

  expect(() =>
    buildAuthorityResponseEnvelope({
      authority_reference: "authority-ref://0135/callback",
      request,
      request_id: request.request_id,
      response_body: { accepted: true },
      response_body_ref: "authority-response-body://0135/callback",
      response_id: "response-0135-callback-without-receipt",
      response_source: "CALLBACK",
    }),
  ).toThrow(/provider_delivery_ref|authority_ingress_proof_contract/);

  const receipt = await checkpointedReceiptForRequest(request, "callback");
  const { response: callback } = await normalizeAuthorityResponse({
    ingress_receipt: receipt,
    request,
    request_id: request.request_id,
    response_id: "response-0135-callback",
    response_source: "CALLBACK",
  });
  expect(callback.ingress_receipt_ref).not.toBeNull();
  expect(callback.authority_ingress_proof_contract?.binding_scope_class).toBe(
    "AUTHORITY_RESPONSE_ENVELOPE",
  );
  validateAuthorityTransportLineage({ request_envelope: request, response_envelope: callback });

  expect(() =>
    normalizeAuthorityResponseEnvelope({
      ...callback,
      authority_ingress_proof_contract: null,
    }),
  ).toThrow(/authority_ingress_proof_contract/);
});

test("keeps response chronology append-only across timeout supersession", async () => {
  const request = requestEnvelope();
  const repository = new AuthorityResponseEnvelopeRepository();
  const timeout = buildAuthorityResponseEnvelope({
    received_at: "2026-04-29T10:00:00Z",
    request_id: request.request_id,
    response_id: "response-0135-timeout-history",
    response_source: "TRANSPORT_TIMEOUT",
  });
  await repository.persistAuthorityResponseEnvelope({ response: timeout });

  const receipt = await checkpointedReceiptForRequest(request, "recovered");
  const { response: recovery } = await normalizeAuthorityResponse({
    ingress_receipt: receipt,
    recovery_basis_response_id: timeout.response_id,
    request,
    request_id: request.request_id,
    received_at: "2026-04-29T10:05:00Z",
    response_id: "response-0135-recovered",
    response_source: "RECOVERY_READ",
    supersedes_response_id: timeout.response_id,
  });
  await repository.persistAuthorityResponseEnvelope({ response: recovery });

  const history = await repository.listAuthorityResponseEnvelopesByRequestId(request.request_id);
  expect(history.map((entry) => entry.response_id)).toEqual([
    "response-0135-timeout-history",
    "response-0135-recovered",
  ]);
  expect(history[0].record.derivation_posture).toBe("TIMEOUT_PLACEHOLDER");
  expect(history[1].record.derivation_posture).toBe("SUPERSEDES_TIMEOUT_PLACEHOLDER");
});

test("validates operation, binding, and request transport lineage", () => {
  const op = operation();
  const binding = buildAuthorityBinding({
    access_binding_hash: op.access_binding_hash,
    authority_binding_id: "binding-0135",
    authority_link_ref: op.authority_link_ref,
    authority_scope: op.authority_scope,
    binding_lineage_ref: op.binding_lineage_ref,
    client_id: op.client_id,
    manifest_id: op.manifest_id,
    partition_scope_refs: op.business_partitions,
    policy_snapshot_hash: op.policy_snapshot_hash,
    provider_api_version: op.provider_api_version,
    provider_environment: op.provider_environment,
    subject_ref: op.subject_ref,
    acting_party_ref: op.acting_party_ref,
    tenant_id: op.tenant_id,
    token_binding_ref: op.token_binding_ref,
  });
  const request = requestEnvelope();

  expect(
    validateAuthorityTransportLineage({ binding, operation: op, request_envelope: request }),
  ).toBe(true);
});
