import { expect, test } from "@playwright/test";

import { validateContractSchema } from "../../../../tests/unit/backend_northbound/audit_and_enquiry_fixtures.ts";
import {
  AuthorityIngressReceiptRepository,
  buildAuthorityResponseEnvelope,
  checkpointAuthorityIngress,
  classifyIngressMutationGate,
  normalizeAuthorityResponse,
  projectAuthorityIngressInvestigation,
} from "../index.ts";

const at = "2026-05-05T09:00:00Z";

function candidate(suffix = "bound") {
  return {
    authority_reference: "authority-ref://hmrc/pc0213/receipt",
    duplicate_meaning_key: "duplicate-meaning://pc0213/receipt",
    idempotency_key: "idempotency-key://pc0213/receipt",
    identity_namespace_hash: "hash.identity.pc0213.receipt",
    interaction_ref: `authority-interaction://pc0213/${suffix}`,
    request_hash: "hash.request.pc0213.receipt",
  };
}

async function boundCheckpoint(
  repository = new AuthorityIngressReceiptRepository(),
  overrides: Partial<Parameters<typeof checkpointAuthorityIngress>[0]> = {},
) {
  return checkpointAuthorityIngress({
    authority_reference: "authority-ref://hmrc/pc0213/receipt",
    candidate_lineages: [candidate()],
    duplicate_meaning_key: "duplicate-meaning://pc0213/receipt",
    idempotency_key: "idempotency-key://pc0213/receipt",
    identity_namespace_hash: "hash.identity.pc0213.receipt",
    ingress_channel_class: "CALLBACK",
    ingress_channel_metadata_hash: "hash.ingress-metadata.pc0213.receipt",
    ingress_receipt_id: "ingress-pc0213-bound",
    provider_delivery_ref: "provider-delivery://pc0213/receipt",
    provider_environment: "HMRC_SANDBOX",
    provider_profile_ref: "authority-provider-profile://hmrc/mtd",
    received_at: at,
    repository,
    request_hash: "hash.request.pc0213.receipt",
    response_body: { accepted: true },
    response_body_ref: "object://authority-body/pc0213/receipt",
    ...overrides,
  });
}

test("persists checkpoint-only proof before normalization and schema-valid normalized proof after", async () => {
  const repository = new AuthorityIngressReceiptRepository();
  const checkpoint = await boundCheckpoint(repository);
  expect(checkpoint.receipt.receipt_state).toBe("PERSISTED");
  expect(checkpoint.receipt.authority_ingress_proof_contract.mutation_gate_state).toBe("CHECKPOINT_ONLY");
  await validateContractSchema("authority_ingress_receipt", checkpoint.receipt);

  const normalized = await normalizeAuthorityResponse({
    ingress_receipt: checkpoint.receipt,
    ingress_receipt_repository: repository,
    mark_ingress_normalized: true,
    request_id: "request-pc0213-normalized",
    response_id: "response-pc0213-normalized",
    response_source: "CALLBACK",
  });
  expect(normalized.response.authority_ingress_proof_contract?.mutation_gate_state).toBe(
    "NORMALIZATION_ALLOWED_FROM_PERSISTED_RECEIPT",
  );
  await validateContractSchema("authority_response_envelope", normalized.response);

  const stored = await repository.getAuthorityIngressReceiptById("ingress-pc0213-bound");
  expect(stored?.record.receipt_state).toBe("NORMALIZED");
  expect(stored?.record.normalized_response_ref).toBe("response-pc0213-normalized");
  await validateContractSchema("authority_ingress_receipt", stored?.record);
});

test("blocks direct async response construction without durable ingress proof", () => {
  expect(() =>
    buildAuthorityResponseEnvelope({
      authority_reference: "authority-ref://hmrc/pc0213/direct",
      request_id: "request-pc0213-direct",
      response_body_ref: "object://authority-body/pc0213/direct",
      response_id: "response-pc0213-direct",
      response_source: "CALLBACK",
    }),
  ).toThrow(/provider_delivery_ref|authority_ingress_proof_contract/);
});

test("keeps weak and duplicate ingress non-mutating with investigation explainability", async () => {
  const weak = await checkpointAuthorityIngress({
    authority_reference: "authority-ref://hmrc/pc0213/weak",
    candidate_lineages: [
      {
        authority_reference: "authority-ref://hmrc/pc0213/weak",
        interaction_ref: "authority-interaction://pc0213/weak",
      },
    ],
    ingress_channel_class: "GATEWAY_RECOVERED",
    ingress_channel_metadata_hash: "hash.ingress-metadata.pc0213.weak",
    ingress_receipt_id: "ingress-pc0213-weak",
    provider_delivery_ref: "provider-delivery://pc0213/weak",
    provider_environment: "HMRC_SANDBOX",
    provider_profile_ref: "authority-provider-profile://hmrc/mtd",
    received_at: at,
    response_body_ref: "object://authority-body/pc0213/weak",
  });
  expect(weak.receipt.correlation_status).toBe("BOUND_WITH_AUTHORITY_REFERENCE_ONLY");
  expect(weak.receipt.receipt_state).toBe("QUARANTINED");
  expect(weak.receipt.reconciliation_owner_ref).not.toBeNull();
  await validateContractSchema("authority_ingress_receipt", weak.receipt);

  const weakSnapshot = await projectAuthorityIngressInvestigation({ receipt: weak.receipt });
  expect(weakSnapshot.snapshot.safe_next_action_codes).toContain("OPEN_RECONCILIATION_WORKFLOW");
  expect(weakSnapshot.snapshot.quarantine_explainability.blocked_mutation_reason_codes).toContain(
    "DIRECT_LEGAL_STATE_MUTATION_FORBIDDEN",
  );
  await validateContractSchema("authority_ingress_investigation_snapshot", weakSnapshot.snapshot);

  const repository = new AuthorityIngressReceiptRepository();
  const first = await boundCheckpoint(repository, {
    ingress_channel_metadata_hash: "hash.ingress-metadata.pc0213.duplicate",
    ingress_receipt_id: "ingress-pc0213-canonical",
    provider_delivery_ref: "provider-delivery://pc0213/duplicate",
    response_body_ref: "object://authority-body/pc0213/duplicate",
  });
  const duplicate = await boundCheckpoint(repository, {
    ingress_channel_metadata_hash: "hash.ingress-metadata.pc0213.duplicate",
    ingress_receipt_id: "ingress-pc0213-duplicate",
    persisted_at: "2026-05-05T09:01:00Z",
    provider_delivery_ref: "provider-delivery://pc0213/duplicate",
    received_at: "2026-05-05T09:01:00Z",
    response_body_ref: "object://authority-body/pc0213/duplicate",
  });
  expect(first.receipt.delivery_dedupe_key).toBe(duplicate.receipt.delivery_dedupe_key);
  expect(duplicate.receipt.receipt_state).toBe("DUPLICATE_SUPPRESSED");
  expect(duplicate.receipt.canonical_ingress_receipt_ref).toBe(
    "authority-ingress-receipt://ingress-pc0213-canonical",
  );
  expect(duplicate.receipt.normalized_response_ref).toBeNull();
  await validateContractSchema("authority_ingress_receipt", duplicate.receipt);

  const duplicateGate = classifyIngressMutationGate({
    receipt: duplicate.receipt,
    requested_effect: "LEGAL_STATE_MUTATION",
  });
  expect(duplicateGate.can_mutate_legal_state).toBe(false);
  expect(duplicateGate.can_normalize_response).toBe(false);

  const duplicateSnapshot = await projectAuthorityIngressInvestigation({
    receipt: duplicate.receipt,
    related_duplicate_receipt_refs: ["authority-ingress-receipt://ingress-pc0213-duplicate"],
  });
  expect(duplicateSnapshot.snapshot.delivery_lineage.related_duplicate_receipt_refs).toEqual([]);
  expect(duplicateSnapshot.snapshot.safe_next_action_codes).toContain("REVIEW_CANONICAL_RECEIPT");
  await validateContractSchema("authority_ingress_investigation_snapshot", duplicateSnapshot.snapshot);
});
