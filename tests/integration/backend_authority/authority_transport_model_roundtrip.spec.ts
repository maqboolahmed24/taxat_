import { expect, test } from "@playwright/test";

import {
  AuthorityBindingRepository,
  AuthorityOperationRepository,
  AuthorityRequestEnvelopeRepository,
  AuthorityResponseEnvelopeRepository,
  buildAuthorityBinding,
  buildAuthorityOperation,
  materializeAuthorityRequestEnvelope,
  materializeAuthorityResponseEnvelope,
  validateAuthorityTransportLineage,
} from "../../../packages/backend-authority/src/index.ts";

test("round-trips operation, binding, request, and async response through sealed repositories", async () => {
  const operationRepository = new AuthorityOperationRepository();
  const bindingRepository = new AuthorityBindingRepository();
  const requestRepository = new AuthorityRequestEnvelopeRepository();
  const responseRepository = new AuthorityResponseEnvelopeRepository();

  const operation = buildAuthorityOperation({
    access_binding_hash: "hash.access.roundtrip.0135",
    acting_party_ref: "client://roundtrip-0135",
    authority_binding_ref: "authority-binding://binding-roundtrip-0135",
    authority_link_ref: "authority-link://roundtrip-0135",
    binding_lineage_ref: "authority-binding-lineage://roundtrip-0135",
    business_partitions: ["business-partition://roundtrip/2026-q1"],
    client_id: "client-roundtrip-0135",
    manifest_id: "manifest-roundtrip-0135",
    operation_family: "AUTH_SUBMIT_PERIODIC_UPDATE",
    operation_id: "operation-roundtrip-0135",
    policy_snapshot_hash: "hash.policy.roundtrip.0135",
    requested_scope: ["quarterly_update", "prepare_submission", "submit"],
    runtime_scope: ["quarterly_update", "prepare_submission", "submit"],
    subject_ref: "client://roundtrip-0135",
    target_obligation_ref: "obligation://roundtrip/2026-q1",
    tenant_id: "tenant-roundtrip-0135",
    token_binding_ref: "authority-token-binding://roundtrip-0135",
  });
  await operationRepository.persistAuthorityOperation({ operation });

  const binding = buildAuthorityBinding({
    access_binding_hash: operation.access_binding_hash,
    authority_binding_id: "binding-roundtrip-0135",
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
    token_version_ref: "authority-token-version://roundtrip-preflight",
  });
  await bindingRepository.persistAuthorityBinding({ binding });

  validateAuthorityTransportLineage({ binding, operation });

  const { envelope: request } = await materializeAuthorityRequestEnvelope({
    client_id: operation.client_id,
    http_method: "POST",
    manifest_id: operation.manifest_id,
    operation,
    operation_family: operation.operation_family,
    operation_id: operation.operation_id,
    payload: { period: "2026-Q1", values: [1, 2, 3] },
    payload_ref: "payload://roundtrip/2026-q1",
    query_params: { period: "2026-Q1" },
    repository: requestRepository,
    request_id: "request-roundtrip-0135",
    resolved_path_params: { clientId: operation.client_id, period: "2026-Q1" },
    resource_template: "/clients/{clientId}/periods/{period}/updates",
    tenant_id: operation.tenant_id,
  });

  validateAuthorityTransportLineage({ binding, operation, request_envelope: request });
  expect(request.token_binding_ref).toBe(operation.token_binding_ref);
  expect(request.request_identity_contract.binding_lineage_ref).toBe(operation.binding_lineage_ref);

  const { response } = await materializeAuthorityResponseEnvelope({
    authority_reference: "authority-ref://roundtrip/accepted",
    provider_delivery_ref: "provider-delivery://roundtrip/accepted",
    received_at: "2026-04-29T12:00:00Z",
    repository: responseRepository,
    request,
    request_id: request.request_id,
    response_body: { status: "accepted" },
    response_body_ref: "authority-response-body://roundtrip/accepted",
    response_id: "response-roundtrip-0135",
    response_source: "CALLBACK",
  });

  validateAuthorityTransportLineage({ request_envelope: request, response_envelope: response });
  const byHash = await requestRepository.getAuthorityRequestEnvelopeByRequestHash(
    request.request_hash,
  );
  expect(byHash?.request_id).toBe(request.request_id);
  const history = await responseRepository.listAuthorityResponseEnvelopesByRequestId(
    request.request_id,
  );
  expect(history).toHaveLength(1);
  expect(history[0].record.authority_ingress_proof_contract?.request_hash_or_null).toBe(
    request.request_hash,
  );
});
