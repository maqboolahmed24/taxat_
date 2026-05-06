import { expect, test } from "@playwright/test";

import {
  AuthorityIngressReceiptRepository,
  buildAuthorityIngressCorrelationContract,
  checkpointAuthorityIngress,
  classifyIngressMutationGate,
  deriveAuthorityIngressDeliveryDedupeKey,
  projectAuthorityIngressInvestigation,
} from "../../../packages/backend-authority/src/index.ts";

const at = "2026-04-29T12:00:00Z";

function candidate(suffix = "primary") {
  return {
    authority_reference: "authority-ref://hmrc/itsa/receipt-0139",
    duplicate_meaning_key: "duplicate-meaning://0139",
    idempotency_key: "idempotency-key://0139",
    identity_namespace_hash: "hash.identity.0139",
    interaction_ref: `authority-interaction://${suffix}`,
    latest_obligation_mirror_ref: `obligation-mirror://${suffix}`,
    latest_submission_record_ref: `submission-record://${suffix}`,
    request_hash: "hash.request.0139",
  };
}

test("checkpoints bound ingress with canonical dedupe spine and proof", async () => {
  const repository = new AuthorityIngressReceiptRepository();
  const checkpoint = await checkpointAuthorityIngress({
    authority_reference: "authority-ref://hmrc/itsa/receipt-0139",
    candidate_lineages: [candidate()],
    duplicate_meaning_key: "duplicate-meaning://0139",
    idempotency_key: "idempotency-key://0139",
    identity_namespace_hash: "hash.identity.0139",
    ingress_channel_class: "CALLBACK",
    ingress_channel_metadata_hash: "hash.ingress-metadata.0139",
    ingress_receipt_id: "ingress-0139-bound",
    provider_delivery_ref: "provider-delivery://0139/bound",
    provider_environment: "HMRC_SANDBOX",
    provider_profile_ref: "authority-provider-profile://hmrc/mtd",
    received_at: at,
    repository,
    request_hash: "hash.request.0139",
    response_body: { accepted: true },
    response_body_ref: "object://authority-body/0139/bound",
  });

  const expectedDedupeKey = deriveAuthorityIngressDeliveryDedupeKey({
    ingress_channel_metadata_hash: "hash.ingress-metadata.0139",
    provider_delivery_ref: "provider-delivery://0139/bound",
    response_body_hash: checkpoint.receipt.response_body_hash,
  });
  expect(checkpoint.receipt.delivery_dedupe_key).toBe(expectedDedupeKey);
  expect(checkpoint.receipt.receipt_state).toBe("PERSISTED");
  expect(checkpoint.receipt.correlation_status).toBe("BOUND");
  expect(
    checkpoint.receipt.authority_ingress_proof_contract.canonical_ingress_receipt_ref_or_null,
  ).toBe("ingress-0139-bound");
  expect(checkpoint.receipt.authority_ingress_correlation_contract.lineage_binding_basis).toBe(
    "REQUEST_HASH_AND_TUPLE_EXACT",
  );
});

test("classifies missing provider keys and multi-match ambiguity distinctly", () => {
  const missing = buildAuthorityIngressCorrelationContract({
    extracted_identity_claims: {},
  });
  expect(missing.comparison_set_state).toBe("MISSING_PROVIDER_KEYS");
  expect(missing.resolution_state).toBe("UNBOUND_MISSING_IDENTITY_CLAIMS");
  expect(missing.candidate_lineages).toEqual([]);

  const ambiguous = buildAuthorityIngressCorrelationContract({
    candidates: [candidate("one"), candidate("two")],
    extracted_identity_claims: {
      request_hash: "hash.request.0139",
    },
  });
  expect(ambiguous.correlation_status).toBe("AMBIGUOUS");
  expect(ambiguous.comparison_set_state).toBe("MULTI_MATCH");
  expect(ambiguous.candidate_lineages.map((lineage) => lineage.interaction_ref)).toEqual([
    "authority-interaction://one",
    "authority-interaction://two",
  ]);
});

test("quarantines weak authority-reference-only ingress and blocks legal mutation", async () => {
  const checkpoint = await checkpointAuthorityIngress({
    authority_reference: "authority-ref://hmrc/itsa/receipt-0139",
    candidate_lineages: [
      {
        authority_reference: "authority-ref://hmrc/itsa/receipt-0139",
        interaction_ref: "authority-interaction://weak",
      },
    ],
    ingress_channel_class: "GATEWAY_RECOVERED",
    ingress_channel_metadata_hash: "hash.ingress-metadata.0139.weak",
    ingress_receipt_id: "ingress-0139-weak",
    provider_delivery_ref: "provider-delivery://0139/weak",
    provider_environment: "HMRC_SANDBOX",
    provider_profile_ref: "authority-provider-profile://hmrc/mtd",
    received_at: at,
    response_body_ref: "object://authority-body/0139/weak",
  });

  expect(checkpoint.receipt.correlation_status).toBe("BOUND_WITH_AUTHORITY_REFERENCE_ONLY");
  expect(checkpoint.receipt.receipt_state).toBe("QUARANTINED");
  expect(checkpoint.receipt.reconciliation_owner_ref).not.toBeNull();

  const gate = classifyIngressMutationGate({
    receipt: checkpoint.receipt,
    requested_effect: "LEGAL_STATE_MUTATION",
  });
  expect(gate.can_mutate_legal_state).toBe(false);
  expect(gate.mutation_gate_state).toBe("QUARANTINE_ONLY");
});

test("suppresses duplicate deliveries and projects canonical duplicate review", async () => {
  const repository = new AuthorityIngressReceiptRepository();
  const first = await checkpointAuthorityIngress({
    authority_reference: "authority-ref://hmrc/itsa/receipt-0139",
    candidate_lineages: [candidate()],
    duplicate_meaning_key: "duplicate-meaning://0139",
    idempotency_key: "idempotency-key://0139",
    identity_namespace_hash: "hash.identity.0139",
    ingress_channel_class: "CALLBACK",
    ingress_channel_metadata_hash: "hash.ingress-metadata.0139.dup",
    ingress_receipt_id: "ingress-0139-canonical",
    provider_delivery_ref: "provider-delivery://0139/dup",
    provider_environment: "HMRC_SANDBOX",
    provider_profile_ref: "authority-provider-profile://hmrc/mtd",
    received_at: at,
    repository,
    request_hash: "hash.request.0139",
    response_body: { accepted: true },
    response_body_ref: "object://authority-body/0139/dup",
  });
  const duplicate = await checkpointAuthorityIngress({
    authority_reference: "authority-ref://hmrc/itsa/receipt-0139",
    candidate_lineages: [candidate()],
    duplicate_meaning_key: "duplicate-meaning://0139",
    idempotency_key: "idempotency-key://0139",
    identity_namespace_hash: "hash.identity.0139",
    ingress_channel_class: "CALLBACK",
    ingress_channel_metadata_hash: "hash.ingress-metadata.0139.dup",
    ingress_receipt_id: "ingress-0139-duplicate",
    provider_delivery_ref: "provider-delivery://0139/dup",
    provider_environment: "HMRC_SANDBOX",
    provider_profile_ref: "authority-provider-profile://hmrc/mtd",
    received_at: "2026-04-29T12:01:00Z",
    repository,
    request_hash: "hash.request.0139",
    response_body: { accepted: true },
    response_body_ref: "object://authority-body/0139/dup",
  });

  expect(duplicate.duplicate_suppressed).toBe(true);
  expect(duplicate.receipt.receipt_state).toBe("DUPLICATE_SUPPRESSED");
  expect(duplicate.receipt.canonical_ingress_receipt_ref).toBe(
    "authority-ingress-receipt://ingress-0139-canonical",
  );
  expect(duplicate.receipt.normalized_response_ref).toBeNull();
  expect(first.receipt.delivery_dedupe_key).toBe(duplicate.receipt.delivery_dedupe_key);

  const investigation = await projectAuthorityIngressInvestigation({
    receipt: duplicate.receipt,
    related_duplicate_receipt_refs: ["authority-ingress-receipt://ingress-0139-duplicate"],
  });
  expect(investigation.snapshot.delivery_lineage.canonical_ingress_receipt_ref_or_self).toBe(
    "authority-ingress-receipt://ingress-0139-canonical",
  );
  expect(investigation.snapshot.safe_next_action_codes).toContain("REVIEW_CANONICAL_RECEIPT");
});
