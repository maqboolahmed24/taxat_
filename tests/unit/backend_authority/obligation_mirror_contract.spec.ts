import { expect, test } from "@playwright/test";

import {
  buildAuthenticatedIngressProofContract,
  buildObligationMirrorRecord,
  transitionObligationMirror,
} from "../../../packages/backend-authority/src/index.ts";

const at = "2026-04-29T12:00:00Z";
const due = "2026-07-31T23:00:00Z";

function proof(statusRef: string) {
  return buildAuthenticatedIngressProofContract({
    authority_reference: "authority-ref://hmrc/obligation/0133",
    bound_interaction_ref: "authority-interaction://0133",
    canonical_ingress_receipt_ref: "authority-ingress-receipt://0133",
    delivery_dedupe_key: "delivery-dedupe://0133",
    duplicate_meaning_key: "duplicate-meaning://0133",
    idempotency_key: "idempotency-key://0133",
    identity_namespace_hash: "hash.identity-namespace.0133",
    ingress_channel_metadata_hash: "hash.ingress-metadata.0133",
    normalized_response_ref: statusRef,
    provider_delivery_ref: "provider-delivery://0133",
    request_hash: "hash.request.0133",
    request_lineage_proof_hash: "hash.request-lineage.0133",
    response_body_hash: "hash.response-body.0133",
  });
}

function baseMirror(overrides = {}) {
  return buildObligationMirrorRecord({
    authority_refs: ["authority-obligation://hmrc/itsa/0133"],
    client_id: "client-0133",
    due_at: due,
    income_source_partition: "income-source://business/sole-trader",
    last_authority_sync_at: at,
    obligation_mirror_id: "obligation-mirror-0133",
    period: "2026-Q1",
    tenant_id: "tenant-0133",
    ...overrides,
  });
}

test("keeps ready, pending, and confirmed obligation anchors separate", async () => {
  const ready = baseMirror({
    authority_truth_state: "NOT_REQUESTED",
    lifecycle_state: "READY_TO_FILE",
    ready_manifest_ref: "manifest-0133",
  });
  expect(ready.ready_manifest_ref).toBe("manifest-0133");
  expect(ready.current_submission_ref).toBeNull();
  expect(ready.last_confirmed_submission_ref).toBeNull();

  const pending = await transitionObligationMirror({
    current: ready,
    current_submission_ref: "submission-record://0133",
    event: "submission_started",
    transitioned_at: "2026-04-29T12:05:00Z",
  });
  expect(pending.mirror.lifecycle_state).toBe("SUBMITTED_PENDING");
  expect(pending.mirror.current_submission_ref).toBe("submission-record://0133");
  expect(pending.mirror.ready_manifest_ref).toBeNull();

  const confirmedStatusRef = "authority-status://hmrc/obligation/0133/confirmed";
  const confirmed = await transitionObligationMirror({
    authority_ingress_proof_contract: proof(confirmedStatusRef),
    authority_status_ref: confirmedStatusRef,
    current: pending.mirror,
    event: "authority_confirms",
    last_confirmed_submission_ref: "submission-record://0133",
    transitioned_at: "2026-04-29T12:10:00Z",
  });
  expect(confirmed.mirror.lifecycle_state).toBe("MET_CONFIRMED");
  expect(confirmed.mirror.current_submission_ref).toBeNull();
  expect(confirmed.mirror.last_confirmed_submission_ref).toBe("submission-record://0133");
});

test("rejects refs outside their legal obligation mirror states", () => {
  expect(() =>
    baseMirror({
      current_submission_ref: "submission-record://illegal",
      lifecycle_state: "OPEN",
    }),
  ).toThrow(/current_submission_ref is legal only/);

  expect(() =>
    baseMirror({
      authority_truth_state: "CONFIRMED",
      last_confirmed_submission_ref: "submission-record://confirmed",
      lifecycle_state: "MET_CONFIRMED",
    }),
  ).toThrow(/authority_status_ref/);
});

test("requires open reconciliation control for pending authority truth", () => {
  const pending = baseMirror({
    authority_truth_state: "PENDING_ACK",
    current_submission_ref: "submission-record://pending",
    lifecycle_state: "SUBMITTED_PENDING",
  });
  expect(pending.reconciliation_control_contract_or_null?.reconciliation_budget_state).toBe(
    "ACTIVE",
  );
});
