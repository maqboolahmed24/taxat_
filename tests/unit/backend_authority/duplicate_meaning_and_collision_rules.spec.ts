import { expect, test } from "@playwright/test";

import {
  type AuthorityRequestIdentityContract,
  AuthorityRequestIdentityLookupRepository,
  buildRequestIdentityContract,
  deriveAuthorityRequestHashes,
  detectDuplicateMeaningConflict,
  detectRequestIdentityCollision,
  normalizeAuthorityRequestIdentityLookupRecord,
  resolveAuthorityDuplicateBucket,
} from "../../../packages/backend-authority/src/index.ts";

function identityInput(overrides: Record<string, unknown> = {}) {
  return {
    access_binding_hash: "hash.access.duplicate.0136",
    acting_party_ref: "client://duplicate-0136",
    authority_binding_ref: "authority-binding://duplicate-0136",
    authority_link_ref: "authority-link://duplicate-0136",
    authority_name: "HMRC",
    authority_product_profile: "HMRC_ITSA",
    authority_scope: "HMRC_ITSA",
    binding_lineage_ref: "authority-binding-lineage://duplicate-0136",
    business_partition_refs: ["business-partition://duplicate/2026"],
    canonical_payload_bytes: '{"duplicate":"same"}',
    client_id: "client-duplicate-0136",
    execution_basis_hash: "hash.execution.duplicate.0136",
    header_profile_refs: ["fraud-header-profile://stable"],
    http_method: "POST" as const,
    manifest_hash: "hash.manifest.duplicate.0136",
    manifest_id: "manifest-duplicate-0136",
    obligation_ref: "obligation://duplicate/2026",
    operation_family: "AUTH_SUBMIT_PERIODIC_UPDATE" as const,
    operation_id: "operation-duplicate-0136",
    operation_profile: "authority-operation-profile://duplicate",
    payload_ref: "payload://duplicate/0136",
    policy_snapshot_hash: "hash.policy.duplicate.0136",
    provider_api_version: "v1",
    provider_environment: "SANDBOX",
    query_params: { period: "2026" },
    request_id: "request-duplicate-0136",
    resolved_path_params: { clientId: "client-duplicate-0136" },
    resource_template: "/clients/{clientId}/duplicate",
    subject_ref: "client://duplicate-0136",
    tenant_id: "tenant-duplicate-0136",
    token_binding_ref: "authority-token-binding://duplicate-0136",
    ...overrides,
  };
}

function contract(overrides: Record<string, unknown> = {}) {
  const hashes = deriveAuthorityRequestHashes(identityInput(overrides));
  return buildRequestIdentityContract({
    binding_scope_class: "AUTHORITY_REQUEST_ENVELOPE",
    hashes,
  });
}

function lookup(
  requestIdentityContract: AuthorityRequestIdentityContract,
  overrides: Record<string, unknown> = {},
) {
  return normalizeAuthorityRequestIdentityLookupRecord({
    request_identity_contract: requestIdentityContract,
    source_record_ref: `authority-request-envelope://${requestIdentityContract.request_id}`,
    source_record_type: "AUTHORITY_REQUEST_ENVELOPE",
    ...overrides,
  });
}

test("classifies exact replay without treating the request-level key as manifest idempotency", async () => {
  const repository = new AuthorityRequestIdentityLookupRepository();
  const original = lookup(contract());
  await repository.upsertRequestIdentityLookup(original);

  const replay = lookup(contract(), {
    source_record_ref: "authority-interaction-record://replay",
    source_record_type: "AUTHORITY_INTERACTION_RECORD",
  });
  const resolution = await resolveAuthorityDuplicateBucket({ candidate: replay, repository });

  expect(resolution.resolution_state).toBe("EXACT_REPLAY_REUSE");
  expect(resolution.reusable_lookup_id).toBe(original.lookup_id);
  expect(original.idempotency_key).not.toBe(original.request_identity_contract.manifest_id);
});

test("separates duplicate meaning occupancy from exact request identity", async () => {
  const repository = new AuthorityRequestIdentityLookupRepository();
  await repository.upsertRequestIdentityLookup(lookup(contract()));

  const sameMeaningDifferentHeader = lookup(
    contract({
      header_profile_refs: ["fraud-header-profile://rotated"],
      request_id: "request-duplicate-0136-header-rotation",
    }),
  );
  const resolution = await resolveAuthorityDuplicateBucket({
    candidate: sameMeaningDifferentHeader,
    repository,
  });

  expect(resolution.resolution_state).toBe("DUPLICATE_BUCKET_OCCUPIED_RECONCILE");
  expect(resolution.duplicate_conflict.code).toBe("DUPLICATE_MEANING_COLLISION");
});

test("hard-blocks body, namespace, access-binding, and idempotency collisions", () => {
  const original = lookup(contract());
  const bodyCollision = lookup({
    ...original.request_identity_contract,
    request_body_hash: "hash.body.changed",
    request_hash: "hash.request.body-collision",
    request_id: "request-body-collision",
  });
  expect(
    detectDuplicateMeaningConflict({
      candidate: bodyCollision,
      existing_records: [original],
    }).code,
  ).toBe("BODY_COLLISION");

  const requestHashSubjectCollision = lookup({
    ...original.request_identity_contract,
    request_id: "request-subject-collision",
    subject_ref: "client://different-subject",
  });
  expect(
    detectRequestIdentityCollision({
      candidate: requestHashSubjectCollision,
      existing_records: [original],
    }).code,
  ).toBe("EXACT_REQUEST_COLLISION");

  const idempotencyCollision = lookup({
    ...original.request_identity_contract,
    duplicate_meaning_key: "hash.duplicate.different",
    request_hash: "hash.request.different",
    request_id: "request-idempotency-collision",
  });
  expect(
    detectRequestIdentityCollision({
      candidate: idempotencyCollision,
      existing_records: [original],
    }).code,
  ).toBe("IDEMPOTENCY_KEY_COLLISION");
});

test("blocks stale duplicate buckets when stronger authority truth is present", () => {
  const original = lookup(contract(), {
    authority_truth_state: "CONFIRMED",
    source_record_ref: "submission-record://confirmed",
    source_record_type: "SUBMISSION_RECORD",
    stronger_truth_ref: "authority-truth://confirmed",
  });
  const replay = lookup(contract({ request_id: "request-after-confirmed" }));

  const conflict = detectDuplicateMeaningConflict({
    candidate: replay,
    existing_records: [original],
  });

  expect(conflict.code).toBe("STALE_DUPLICATE_BUCKET_STRONGER_TRUTH");
  expect(conflict.blocking).toBe(true);
});
