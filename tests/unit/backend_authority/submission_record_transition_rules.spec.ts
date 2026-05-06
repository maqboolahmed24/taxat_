import { expect, test } from "@playwright/test";

import {
  beginSubmissionRecord,
  buildAuthenticatedIngressProofContract,
  buildSubmissionRequestIdentityContract,
  classifySubmissionTruthMutationGate,
  SubmissionRecordRepository,
  transitionSubmissionRecord,
  validateSubmissionRecordTransition,
} from "../../../packages/backend-authority/src/index.ts";

const at = "2026-04-29T16:00:00Z";
const duplicateMeaningKey = "duplicate-meaning://0134-transition";
const identityNamespaceHash = "hash.identity-namespace.0134-transition";
const requestHash = "hash.request.0134-transition";
const idempotencyKey = "idempotency-key://0134-transition";

function requestIdentity() {
  return buildSubmissionRequestIdentityContract({
    attempt_lineage_manifest_id: "manifest-root-0134-transition",
    authority_scope: "HMRC_ITSA_FINAL_DECLARATION",
    basis_type_or_null: "FINAL_DECLARATION",
    business_partition_refs: ["business-partition://itsa/2026"],
    client_id: "client-0134-transition",
    duplicate_meaning_key: duplicateMeaningKey,
    identity_namespace_hash: identityNamespaceHash,
    idempotency_key: idempotencyKey,
    manifest_id: "manifest-0134-transition",
    obligation_ref_or_null: "obligation://hmrc/itsa/0134-transition",
    operation_family: "FINAL_DECLARATION_SUBMISSION",
    provider_environment: "HMRC_PRODUCTION",
    request_hash: requestHash,
    tenant_id: "tenant-0134",
  });
}

async function intent(repository = new SubmissionRecordRepository()) {
  return beginSubmissionRecord({
    attempt_lineage_manifest_id: "manifest-root-0134-transition",
    authority_scope: "HMRC_ITSA_FINAL_DECLARATION",
    basis_type: "FINAL_DECLARATION",
    client_id: "client-0134-transition",
    duplicate_meaning_key: duplicateMeaningKey,
    idempotency_key: idempotencyKey,
    identity_namespace_hash: identityNamespaceHash,
    manifest_id: "manifest-0134-transition",
    obligation_ref: "obligation://hmrc/itsa/0134-transition",
    operation_family: "FINAL_DECLARATION_SUBMISSION",
    packet_ref: "filing-packet://0134-transition",
    proof_bundle_hash: "hash.proof-bundle.0134-transition",
    proof_bundle_ref: "proof-bundle://0134-transition",
    provider_environment: "HMRC_PRODUCTION",
    repository,
    request_envelope_ref: "authority-request-envelope://0134-transition",
    request_hash: requestHash,
    request_identity_contract: requestIdentity(),
    state_changed_at: at,
    submission_id: "submission-0134-transition",
  });
}

function proof(responseRef: string, overrides = {}) {
  return buildAuthenticatedIngressProofContract({
    authority_reference: "authority-ref://hmrc/0134-transition",
    binding_scope_class: "SUBMISSION_RECORD",
    bound_interaction_ref: "authority-interaction://0134-transition",
    canonical_ingress_receipt_ref: "authority-ingress-receipt://0134-transition",
    delivery_dedupe_key: "delivery-dedupe://0134-transition",
    duplicate_meaning_key: duplicateMeaningKey,
    idempotency_key: idempotencyKey,
    identity_namespace_hash: identityNamespaceHash,
    ingress_channel_metadata_hash: "hash.ingress-metadata.0134-transition",
    normalized_response_ref: responseRef,
    provider_delivery_ref: "provider-delivery://0134-transition",
    request_hash: requestHash,
    request_lineage_proof_hash: "hash.request-lineage.0134-transition",
    response_body_hash: "hash.response-body.0134-transition",
    ...overrides,
  });
}

test("enforces the named SubmissionRecord transition matrix", async () => {
  const { submission } = await intent();
  expect(() =>
    validateSubmissionRecordTransition({
      current: submission,
      event: "authority_confirms",
    }),
  ).toThrow(/cannot transition/);

  expect(
    validateSubmissionRecordTransition({
      current: submission,
      event: "send_queued",
    }).to_state,
  ).toBe("TRANSMIT_PENDING");
});

test("transitions through pending and unknown with open reconciliation control", async () => {
  const repository = new SubmissionRecordRepository();
  const started = await intent(repository);
  const queued = await transitionSubmissionRecord({
    current: started.submission,
    event: "send_queued",
    repository,
    state_changed_at: "2026-04-29T16:01:00Z",
  });
  const transmitted = await transitionSubmissionRecord({
    current: queued.submission,
    event: "request_sent",
    repository,
    state_changed_at: "2026-04-29T16:02:00Z",
  });
  const responseRef = "authority-response://0134-transition/pending";
  const pendingProof = proof(responseRef);
  const pending = await transitionSubmissionRecord({
    authority_ingress_proof_contract: pendingProof,
    correlation_refs: [pendingProof.canonical_ingress_receipt_ref_or_null],
    current: transmitted.submission,
    event: "awaiting_authority_confirmation",
    repository,
    response_ref: responseRef,
    state_changed_at: "2026-04-29T16:03:00Z",
  });
  expect(pending.submission.lifecycle_state).toBe("PENDING_ACK");
  expect(
    pending.submission.reconciliation_control_contract_or_null?.reconciliation_budget_state,
  ).toBe("ACTIVE");

  const unknown = await transitionSubmissionRecord({
    current: pending.submission,
    event: "authority_not_resolved",
    repository,
    state_changed_at: "2026-04-29T17:03:00Z",
  });
  expect(unknown.submission.lifecycle_state).toBe("UNKNOWN");
  expect(
    unknown.submission.reconciliation_control_contract_or_null?.reconciliation_budget_state,
  ).toBe("ACTIVE");
});

test("blocks weak or unbound ingress proof from settlement mutation", () => {
  const responseRef = "authority-response://0134-transition/rejected";
  const weakProof = {
    ...proof(responseRef),
    correlation_status_or_null: "AMBIGUOUS" as const,
    mutation_gate_state: "QUARANTINE_ONLY" as const,
  };
  const decision = classifySubmissionTruthMutationGate({
    authority_ingress_proof_contract: weakProof,
    lifecycle_state: "REJECTED",
    response_ref: responseRef,
  });

  expect(decision.decision).toBe("QUARANTINE_ONLY");
});

test("out-of-band settlement clears packet-origin lineage only through named event", async () => {
  const repository = new SubmissionRecordRepository();
  const started = await intent(repository);
  const outOfBand = await transitionSubmissionRecord({
    authority_evidence_ref: "authority-evidence://0134-transition/out-of-band",
    current: started.submission,
    event: "external_filing_detected",
    repository,
    state_changed_at: "2026-04-29T16:05:00Z",
    temporal_propagation_event_refs: ["temporal-propagation-event://0134-transition/out-of-band"],
  });

  expect(outOfBand.submission.lifecycle_state).toBe("OUT_OF_BAND");
  expect(outOfBand.submission.packet_ref).toBeNull();
  expect(outOfBand.submission.request_identity_contract).toBeNull();
  expect(
    outOfBand.submission.reconciliation_control_contract_or_null?.reconciliation_budget_state,
  ).toBe("CLOSED");
});
