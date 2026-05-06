import { expect, test } from "@playwright/test";

import {
  buildAuthorityRequestEnvelope,
  buildRequestIdentityContract,
  deriveAuthorityRequestHashes,
  normalizeAuthorityRequestIdentityInputs,
} from "../../../packages/backend-authority/src/index.ts";

function baseIdentityInput() {
  return {
    access_binding_hash: "hash.access.0136",
    acting_party_ref: "client://0136",
    authority_binding_ref: "authority-binding://binding-0136",
    authority_link_ref: "authority-link://0136",
    authority_name: "HMRC",
    authority_product_profile: "HMRC_ITSA",
    authority_scope: "HMRC_ITSA",
    binding_lineage_ref: "authority-binding-lineage://0136",
    business_partition_refs: [
      "business-partition://itsa/2026-q2",
      "business-partition://itsa/2026-q1",
    ],
    canonical_payload_bytes: '{"amount":"10.00","period":"2026-Q1"}',
    client_id: "client-0136",
    execution_basis_hash: "hash.execution.0136",
    header_profile_refs: ["fraud-header-profile://b", "fraud-header-profile://a"],
    http_method: "POST" as const,
    manifest_hash: "hash.manifest.0136",
    manifest_id: "manifest-child-0136",
    obligation_ref: "obligation://itsa/2026-q1",
    operation_family: "AUTH_SUBMIT_PERIODIC_UPDATE" as const,
    operation_id: "operation-0136",
    operation_profile: "authority-operation-profile://periodic-update",
    payload_ref: "payload://0136/periodic-update",
    policy_snapshot_hash: "hash.policy.0136",
    provider_api_version: "v1",
    provider_environment: "SANDBOX",
    query_params: { z: "last", a: ["first", "second"] },
    request_id: "request-0136",
    resolved_path_params: { clientId: "client-0136", period: "2026-Q1" },
    resource_template: "/clients/{clientId}/periods/{period}/updates",
    root_manifest_id: "manifest-root-0136",
    subject_ref: "client://0136",
    tenant_id: "tenant-0136",
    token_binding_ref: "authority-token-binding://0136",
  };
}

test("normalizes every hash input before deriving the authority request identity chain", () => {
  const hashes = deriveAuthorityRequestHashes(baseIdentityInput());
  const normalized = hashes.normalized_inputs;
  const contract = buildRequestIdentityContract({
    binding_scope_class: "AUTHORITY_REQUEST_ENVELOPE",
    hashes,
  });

  expect(normalized.attempt_lineage_manifest_id).toBe("manifest-root-0136");
  expect(normalized.header_profile_refs).toEqual([
    "fraud-header-profile://a",
    "fraud-header-profile://b",
  ]);
  expect(normalized.business_partition_refs).toEqual([
    "business-partition://itsa/2026-q1",
    "business-partition://itsa/2026-q2",
  ]);
  expect(normalized.canonical_query).toBe("a=first&a=second&z=last");
  expect(contract.request_hash).toBe(hashes.request_hash);
  expect(contract.duplicate_meaning_key).toBe(hashes.duplicate_meaning_key);
  expect(contract.idempotency_key).toBe(hashes.idempotency_key);
});

test("matches the sealed AuthorityRequestEnvelope formulas", () => {
  const input = baseIdentityInput();
  const hashes = deriveAuthorityRequestHashes(input);
  const envelope = buildAuthorityRequestEnvelope({
    access_binding_hash: input.access_binding_hash,
    acting_party_ref: input.acting_party_ref,
    attempt_lineage_manifest_id: input.root_manifest_id,
    authority_binding_ref: input.authority_binding_ref,
    authority_link_ref: input.authority_link_ref,
    authority_name: input.authority_name,
    authority_product_profile: input.authority_product_profile,
    authority_scope: input.authority_scope,
    binding_lineage_ref: input.binding_lineage_ref,
    business_partition_refs: input.business_partition_refs,
    client_id: input.client_id,
    execution_basis_hash: input.execution_basis_hash,
    header_profile_refs: input.header_profile_refs,
    http_method: input.http_method,
    manifest_hash: input.manifest_hash,
    manifest_id: input.manifest_id,
    obligation_ref: input.obligation_ref,
    operation_family: input.operation_family,
    operation_id: input.operation_id,
    operation_profile: input.operation_profile,
    payload_ref: input.payload_ref,
    policy_snapshot_hash: input.policy_snapshot_hash,
    provider_api_version: input.provider_api_version,
    provider_environment: input.provider_environment,
    query_params: input.query_params,
    request_body_hash: hashes.request_body_hash,
    request_id: input.request_id,
    resolved_path_params: input.resolved_path_params,
    resource_template: input.resource_template,
    subject_ref: input.subject_ref,
    tenant_id: input.tenant_id,
    token_binding_ref: input.token_binding_ref,
  });

  expect(envelope.identity_namespace_hash).toBe(hashes.identity_namespace_hash);
  expect(envelope.duplicate_meaning_key).toBe(hashes.duplicate_meaning_key);
  expect(envelope.request_hash).toBe(hashes.request_hash);
  expect(envelope.idempotency_key).toBe(hashes.idempotency_key);
});

test("keeps caller-local set ordering from changing duplicate or request identity", () => {
  const first = deriveAuthorityRequestHashes(baseIdentityInput());
  const second = deriveAuthorityRequestHashes({
    ...baseIdentityInput(),
    business_partition_refs: [...baseIdentityInput().business_partition_refs].reverse(),
    header_profile_refs: [...baseIdentityInput().header_profile_refs].reverse(),
    query_params: { a: ["first", "second"], z: "last" },
  });

  expect(second.duplicate_meaning_key).toBe(first.duplicate_meaning_key);
  expect(second.request_hash).toBe(first.request_hash);

  const differentRepeatedValueOrder = deriveAuthorityRequestHashes({
    ...baseIdentityInput(),
    query_params: { a: ["second", "first"], z: "last" },
  });
  expect(differentRepeatedValueOrder.normalized_inputs.canonical_query).not.toBe(
    first.normalized_inputs.canonical_query,
  );
  expect(differentRepeatedValueOrder.duplicate_meaning_key).not.toBe(first.duplicate_meaning_key);
});

test("applies explicit sentinels and rejects illegal empty partition or body posture", () => {
  const read = normalizeAuthorityRequestIdentityInputs({
    ...baseIdentityInput(),
    business_partition_refs: [],
    canonical_payload_bytes: undefined,
    http_method: "GET",
    obligation_ref: null,
    operation_family: "AUTH_READ_OBLIGATIONS",
    payload_ref: null,
    request_body_hash: null,
  });

  expect(read.request_body_hash).toBe("<NONE>");
  expect(read.normalized_business_partition_refs).toEqual(["<NONE>"]);
  expect(read.normalized_obligation_ref).toBe("<NONE>");

  expect(() =>
    normalizeAuthorityRequestIdentityInputs({
      ...baseIdentityInput(),
      business_partition_refs: [],
    }),
  ).toThrow(/empty business_partition_refs/);

  expect(() =>
    normalizeAuthorityRequestIdentityInputs({
      ...baseIdentityInput(),
      canonical_payload_bytes: undefined,
      payload: undefined,
      payload_ref: null,
    }),
  ).toThrow(/payload_ref null requires GET or DELETE/);
});
