import { expect, test } from "@playwright/test";

import {
  beginSubmissionRecord,
  buildAuthenticatedIngressProofContract,
  buildAuthorityReconciliationControlContract,
  buildSubmissionRecord,
  buildSubmissionRequestIdentityContract,
  SubmissionRecordRepository,
} from "../../../packages/backend-authority/src/index.ts";

const at = "2026-04-29T15:00:00Z";
const manifestId = "manifest-0134";
const clientId = "client-0134";
const requestHash = "hash.request.0134";
const idempotencyKey = "idempotency-key://0134";
const identityNamespaceHash = "hash.identity-namespace.0134";
const duplicateMeaningKey = "duplicate-meaning://0134";
const obligationRef = "obligation://hmrc/itsa/0134";

function requestIdentity() {
  return buildSubmissionRequestIdentityContract({
    attempt_lineage_manifest_id: "manifest-root-0134",
    authority_scope: "HMRC_ITSA_FINAL_DECLARATION",
    basis_type_or_null: "FINAL_DECLARATION",
    business_partition_refs: ["business-partition://itsa/2026"],
    client_id: clientId,
    duplicate_meaning_key: duplicateMeaningKey,
    identity_namespace_hash: identityNamespaceHash,
    idempotency_key: idempotencyKey,
    manifest_id: manifestId,
    obligation_ref_or_null: obligationRef,
    operation_family: "FINAL_DECLARATION_SUBMISSION",
    provider_environment: "HMRC_PRODUCTION",
    request_hash: requestHash,
    tenant_id: "tenant-0134",
  });
}

function baseSubmission(overrides = {}) {
  return {
    attempt_lineage_manifest_id: "manifest-root-0134",
    authority_scope: "HMRC_ITSA_FINAL_DECLARATION",
    basis_type: "FINAL_DECLARATION",
    client_id: clientId,
    duplicate_meaning_key: duplicateMeaningKey,
    idempotency_key: idempotencyKey,
    identity_namespace_hash: identityNamespaceHash,
    manifest_id: manifestId,
    obligation_ref: obligationRef,
    operation_family: "FINAL_DECLARATION_SUBMISSION",
    packet_ref: "filing-packet://0134",
    proof_bundle_hash: "hash.proof-bundle.0134",
    proof_bundle_ref: "proof-bundle://0134",
    provider_environment: "HMRC_PRODUCTION",
    request_envelope_ref: "authority-request-envelope://0134",
    request_hash: requestHash,
    request_identity_contract: requestIdentity(),
    state_changed_at: at,
    submission_id: "submission-0134",
    ...overrides,
  };
}

function submissionProof(responseRef: string) {
  return buildAuthenticatedIngressProofContract({
    authority_reference: "authority-ref://hmrc/0134",
    binding_scope_class: "SUBMISSION_RECORD",
    bound_interaction_ref: "authority-interaction://0134",
    canonical_ingress_receipt_ref: "authority-ingress-receipt://0134",
    delivery_dedupe_key: "delivery-dedupe://0134",
    duplicate_meaning_key: duplicateMeaningKey,
    idempotency_key: idempotencyKey,
    identity_namespace_hash: identityNamespaceHash,
    ingress_channel_metadata_hash: "hash.ingress-metadata.0134",
    normalized_response_ref: responseRef,
    provider_delivery_ref: "provider-delivery://0134",
    request_hash: requestHash,
    request_lineage_proof_hash: "hash.request-lineage.0134",
    response_body_hash: "hash.response-body.0134",
  });
}

test("freezes request identity and proof lineage in INTENT_RECORDED", async () => {
  const repository = new SubmissionRecordRepository();
  const result = await beginSubmissionRecord({
    ...baseSubmission(),
    repository,
  });

  expect(result.submission.lifecycle_state).toBe("INTENT_RECORDED");
  expect(result.submission.packet_ref).toBe("filing-packet://0134");
  expect(result.submission.request_identity_contract?.duplicate_meaning_key).toBe(
    duplicateMeaningKey,
  );
  expect(result.submission.response_ref).toBeNull();

  await expect(
    beginSubmissionRecord({
      ...baseSubmission({ submission_id: "submission-0134-duplicate" }),
      repository,
    }),
  ).rejects.toThrow(/already has active submission/);
});

test("rejects request-backed pending settlement without persisted ingress proof", () => {
  const responseRef = "authority-response://0134/pending";
  const control = buildAuthorityReconciliationControlContract({
    authority_truth_state: "PENDING_ACK",
    binding_scope_class: "SUBMISSION_RECORD",
    duplicate_meaning_key_or_null: duplicateMeaningKey,
    last_budget_event_at: at,
    operation_family_or_null: "FINAL_DECLARATION_SUBMISSION",
    provider_environment_or_null: "HMRC_PRODUCTION",
    submission_lifecycle_state_or_null: "PENDING_ACK",
  });

  expect(() =>
    buildSubmissionRecord({
      ...baseSubmission({
        lifecycle_state: "PENDING_ACK",
        reconciliation_control_contract_or_null: control,
        reconciliation_deadline_at: control.reconciliation_deadline_at_or_null,
        response_ref: responseRef,
      }),
    }),
  ).toThrow(/authority_ingress_proof_contract/);
});

test("requires confirmed settlement to carry authority evidence and temporal propagation", () => {
  const responseRef = "authority-response://0134/confirmed";
  const proof = submissionProof(responseRef);
  const control = buildAuthorityReconciliationControlContract({
    authority_truth_state: "CONFIRMED",
    binding_scope_class: "SUBMISSION_RECORD",
    duplicate_meaning_key_or_null: duplicateMeaningKey,
    interaction_ref_or_null: proof.bound_interaction_ref_or_null,
    last_budget_event_at: at,
    operation_family_or_null: "FINAL_DECLARATION_SUBMISSION",
    provider_environment_or_null: "HMRC_PRODUCTION",
    reconciliation_budget_state: "CLOSED",
    reconciliation_deadline_at_or_null: null,
    submission_lifecycle_state_or_null: "CONFIRMED",
  });

  expect(() =>
    buildSubmissionRecord({
      ...baseSubmission({
        authority_ingress_proof_contract: proof,
        authority_reference: proof.authority_reference_or_null,
        baseline_type: "FILED",
        correlation_refs: [proof.canonical_ingress_receipt_ref_or_null],
        lifecycle_state: "CONFIRMED",
        reconciliation_control_contract_or_null: control,
        response_ref: responseRef,
      }),
    }),
  ).toThrow(/authority_evidence_ref/);

  const confirmed = buildSubmissionRecord({
    ...baseSubmission({
      authority_evidence_ref: "authority-evidence://0134/confirmed",
      authority_ingress_proof_contract: proof,
      authority_reference: proof.authority_reference_or_null,
      baseline_type: "FILED",
      correlation_refs: [proof.canonical_ingress_receipt_ref_or_null],
      lifecycle_state: "CONFIRMED",
      reconciliation_control_contract_or_null: control,
      response_ref: responseRef,
      temporal_propagation_event_refs: ["temporal-propagation-event://0134/confirmed"],
    }),
  });
  expect(confirmed.lifecycle_state).toBe("CONFIRMED");
});
