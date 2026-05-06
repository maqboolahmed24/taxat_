import { expect, test } from "@playwright/test";

import {
  AuthorityRequestEnvelopeRepository,
  AuthorityRequestIdentityLookupRepository,
  assertAuthorityRequestIdentityStability,
  buildAuthorityOperation,
  materializeAuthorityRequestEnvelope,
  projectRequestIdentityContractScope,
  resolveAuthorityDuplicateBucket,
} from "../../../packages/backend-authority/src/index.ts";

function operation() {
  return buildAuthorityOperation({
    access_binding_hash: "hash.access.replay.0136",
    acting_party_ref: "client://replay-0136",
    authority_binding_ref: "authority-binding://replay-0136",
    authority_link_ref: "authority-link://replay-0136",
    binding_lineage_ref: "authority-binding-lineage://replay-0136",
    business_partitions: ["business-partition://replay/2026-q1"],
    client_id: "client-replay-0136",
    manifest_id: "manifest-replay-0136",
    operation_family: "AUTH_SUBMIT_PERIODIC_UPDATE",
    operation_id: "operation-replay-0136",
    policy_snapshot_hash: "hash.policy.replay.0136",
    requested_scope: ["quarterly_update", "prepare_submission", "submit"],
    runtime_scope: ["quarterly_update", "prepare_submission", "submit"],
    subject_ref: "client://replay-0136",
    target_obligation_ref: "obligation://replay/2026-q1",
    tenant_id: "tenant-replay-0136",
    token_binding_ref: "authority-token-binding://replay-0136",
  });
}

async function requestEnvelope(
  requestId: string,
  headerProfileRefs = ["fraud-header-profile://replay"],
) {
  const op = operation();
  return materializeAuthorityRequestEnvelope({
    client_id: op.client_id,
    header_profile_refs: headerProfileRefs,
    http_method: "POST",
    manifest_id: op.manifest_id,
    operation: op,
    operation_family: op.operation_family,
    operation_id: op.operation_id,
    payload: { period: "2026-Q1", values: [1, 2, 3] },
    payload_ref: "payload://replay/2026-q1",
    query_params: { period: "2026-Q1" },
    repository: new AuthorityRequestEnvelopeRepository(),
    request_id: requestId,
    resolved_path_params: { clientId: op.client_id, period: "2026-Q1" },
    resource_template: "/clients/{clientId}/periods/{period}/updates",
    tenant_id: op.tenant_id,
  });
}

test("resolves replay, projected grouped identity, duplicate conflict, and stronger-truth block", async () => {
  const lookupRepository = new AuthorityRequestIdentityLookupRepository();
  const first = await requestEnvelope("request-replay-0136");
  const stored = await lookupRepository.upsertRequestEnvelopeIdentity({
    envelope: first.envelope,
    inserted_at: "2026-04-29T10:00:00Z",
  });

  const interactionContract = projectRequestIdentityContractScope(
    first.envelope.request_identity_contract,
    "AUTHORITY_INTERACTION_RECORD",
  );
  expect(
    assertAuthorityRequestIdentityStability({
      actual: interactionContract,
      expected: first.envelope.request_identity_contract,
    }),
  ).toBe(true);

  const replay = await lookupRepository.upsertRequestIdentityLookup({
    inserted_at: "2026-04-29T10:01:00Z",
    request_identity_contract: interactionContract,
    source_record_ref: "authority-interaction-record://request-replay-0136",
    source_record_type: "AUTHORITY_INTERACTION_RECORD",
  });
  const replayResolution = await resolveAuthorityDuplicateBucket({
    candidate: replay,
    repository: lookupRepository,
  });
  expect(replayResolution.resolution_state).toBe("EXACT_REPLAY_REUSE");
  expect(replayResolution.reusable_lookup_id).toBe(stored.lookup_id);

  const changedHeader = await requestEnvelope("request-replay-0136-header", [
    "fraud-header-profile://rotated",
  ]);
  const changedHeaderLookup = await lookupRepository.upsertRequestIdentityLookup({
    inserted_at: "2026-04-29T10:02:00Z",
    request_identity_contract: changedHeader.envelope.request_identity_contract,
    source_record_ref: "authority-request-envelope://request-replay-0136-header",
    source_record_type: "AUTHORITY_REQUEST_ENVELOPE",
  });
  const changedHeaderResolution = await resolveAuthorityDuplicateBucket({
    candidate: changedHeaderLookup,
    repository: lookupRepository,
  });
  expect(changedHeaderResolution.resolution_state).toBe("DUPLICATE_BUCKET_OCCUPIED_RECONCILE");
  expect(changedHeaderResolution.duplicate_conflict.code).toBe("DUPLICATE_MEANING_COLLISION");

  const reloadRepository = new AuthorityRequestIdentityLookupRepository();
  await reloadRepository.upsertRequestIdentityLookup(stored);
  const recoveredReplayResolution = await resolveAuthorityDuplicateBucket({
    candidate: replay,
    repository: reloadRepository,
  });
  expect(recoveredReplayResolution.resolution_state).toBe("EXACT_REPLAY_REUSE");

  await reloadRepository.upsertRequestIdentityLookup({
    authority_truth_state: "CONFIRMED",
    inserted_at: "2026-04-29T10:03:00Z",
    request_identity_contract: projectRequestIdentityContractScope(
      first.envelope.request_identity_contract,
      "SUBMISSION_RECORD",
    ),
    source_record_ref: "submission-record://confirmed-replay-0136",
    source_record_type: "SUBMISSION_RECORD",
    stronger_truth_ref: "authority-truth://confirmed-replay-0136",
  });
  const staleResolution = await resolveAuthorityDuplicateBucket({
    candidate: replay,
    repository: reloadRepository,
  });
  expect(staleResolution.resolution_state).toBe("DUPLICATE_BUCKET_OCCUPIED_RECONCILE");
  expect(staleResolution.duplicate_conflict.code).toBe("STALE_DUPLICATE_BUCKET_STRONGER_TRUTH");
});
