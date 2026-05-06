import { expect, test } from "@playwright/test";

import {
  authorityCalculationReadinessContextRef,
  authorityCalculationRef,
  authorityCalculationRequestRef,
  buildAuthenticatedIngressProofContract,
  buildAuthorityCalculationReadinessContextRecord,
  buildAuthorityCalculationRequest,
  buildAuthorityCalculationResult,
  buildCalculationBasisRecord,
  buildCalculationUserConfirmation,
  buildFilingCaseRecord,
  buildFilingPacket,
  buildObligationMirrorRecord,
  calculationBasisRef,
  calculationUserConfirmationRef,
  filingPacketRef,
  transitionFilingCase,
  transitionFilingPacket,
  transitionObligationMirror,
  validateAuthorityDomainRefs,
} from "../../../packages/backend-authority/src/index.ts";

const at = "2026-04-29T14:00:00Z";

function proof(statusRef: string) {
  return buildAuthenticatedIngressProofContract({
    authority_reference: "authority-ref://hmrc/obligation/flow-0133",
    bound_interaction_ref: "authority-interaction://flow-0133",
    canonical_ingress_receipt_ref: "authority-ingress-receipt://flow-0133",
    delivery_dedupe_key: "delivery-dedupe://flow-0133",
    duplicate_meaning_key: "duplicate-meaning://flow-0133",
    idempotency_key: "idempotency-key://flow-0133",
    identity_namespace_hash: "hash.identity-namespace.flow-0133",
    ingress_channel_metadata_hash: "hash.ingress-metadata.flow-0133",
    normalized_response_ref: statusRef,
    provider_delivery_ref: "provider-delivery://flow-0133",
    request_hash: "hash.request.flow-0133",
    request_lineage_proof_hash: "hash.request-lineage.flow-0133",
    response_body_hash: "hash.response-body.flow-0133",
  });
}

test("builds mirror, case, packet, and submit-ready flow without creating SubmissionRecord", async () => {
  const readyMirror = buildObligationMirrorRecord({
    authority_refs: ["authority-obligation://hmrc/itsa/flow-0133"],
    authority_truth_state: "NOT_REQUESTED",
    client_id: "client-0133",
    due_at: "2026-07-31T23:00:00Z",
    income_source_partition: "income-source://business/sole-trader",
    last_authority_sync_at: at,
    lifecycle_state: "READY_TO_FILE",
    obligation_mirror_id: "obligation-mirror-flow-0133",
    period: "2026-Q1",
    ready_manifest_ref: "manifest-flow-0133",
    tenant_id: "tenant-0133",
  });
  const request = buildAuthorityCalculationRequest({
    calculation_request_id: "flow-0133",
    calculation_type: "final-declaration",
    client_id: "client-0133",
    manifest_id: "manifest-flow-0133",
    request_state: "RETRIEVED",
    requested_at: at,
    tenant_id: "tenant-0133",
  });
  const result = buildAuthorityCalculationResult({
    calculation_id: "calc-flow-0133",
    calculation_request_ref: authorityCalculationRequestRef(request),
    calculation_type: request.calculation_type,
    manifest_id: request.manifest_id,
    retrieved_at: at,
    retrieved_payload: { total_due: "1200.00" },
  });
  const basis = buildCalculationBasisRecord({
    basis_payload: { total_due: "1200.00" },
    basis_status: "CONFIRMED",
    calculation_basis_id: "flow-0133",
    calculation_id: result.calculation_id,
    calculation_request_ref: authorityCalculationRequestRef(request),
    calculation_type: result.calculation_type,
    captured_at: at,
    confirmed_at: at,
    manifest_id: result.manifest_id,
    user_confirmation_ref: "calculation-user-confirmation://flow-0133",
  });
  const confirmation = buildCalculationUserConfirmation({
    calculation_basis_ref: calculationBasisRef(basis),
    calculation_id: result.calculation_id,
    confirmation_state: "CONFIRMED",
    confirmed_at: at,
    confirmed_basis_hash: basis.basis_hash,
    manifest_id: result.manifest_id,
    user_confirmation_id: "flow-0133",
  });
  const readinessContext = buildAuthorityCalculationReadinessContextRecord({
    basis_hash: basis.basis_hash,
    basis_status: "CONFIRMED",
    calculation_basis_ref: calculationBasisRef(basis),
    calculation_hash: result.calculation_hash,
    calculation_id: result.calculation_id,
    calculation_readiness_context_id: "flow-0133",
    calculation_request_ref: authorityCalculationRequestRef(request),
    calculation_type: request.calculation_type,
    confirmation_state: confirmation.confirmation_state,
    filing_reusable: true,
    live_authority_call_executed: true,
    manifest_id: request.manifest_id,
    owner_artifact_ref: "filing-case://flow-0133",
    persisted_at: at,
    request_state: "RETRIEVED",
    result_state: "RETRIEVED",
    user_confirmation_ref: calculationUserConfirmationRef(confirmation),
    validation_outcome: "PASS",
  });
  const calculationHandshake = {
    basis,
    confirmation,
    readiness_context: readinessContext,
    request,
    result,
  };
  const reviewCase = buildFilingCaseRecord({
    authority_calculation_ref: authorityCalculationRef(result),
    calculation_basis_ref: calculationBasisRef(basis),
    calculation_hash: result.calculation_hash,
    calculation_id: result.calculation_id,
    calculation_request_ref: authorityCalculationRequestRef(request),
    calculation_type: request.calculation_type,
    client_id: request.client_id,
    controlling_proof_bundle_ref: "proof-bundle://flow-0133",
    current_manifest_ref: "manifest-flow-0133",
    current_parity_ref: "parity-result://flow-0133",
    current_trust_ref: "trust-summary://flow-0133",
    filing_case_id: "filing-case-flow-0133",
    last_transition_at: at,
    lifecycle_state: "READY_REVIEW",
    period: "2026-Q1",
    proof_closure_state: "CLOSED",
    readiness_context_ref: authorityCalculationReadinessContextRef(readinessContext),
    tenant_id: "tenant-0133",
    trust_currency_state: "CURRENT",
    user_confirmation_ref: calculationUserConfirmationRef(confirmation),
  });
  const approvedPacket = await buildFilingPacket({
    calculation_handshake: calculationHandshake,
    declared_basis: "FINAL_DECLARATION",
    filing_case: reviewCase,
    filing_gate_ref: "filing-gate://flow-0133",
    lifecycle_state: "APPROVED_TO_SUBMIT",
    manifest_binding_hash: "hash.manifest-binding.flow-0133",
    payload_hash: "hash.payload.flow-0133",
    payload_ref: "object://filing-payload/flow-0133",
    state_changed_at: at,
  });
  const readyCase = await transitionFilingCase({
    current: reviewCase,
    current_packet_ref: filingPacketRef(approvedPacket.packet),
    event: "approval_complete",
    transitioned_at: "2026-04-29T14:01:00Z",
  });
  const submittedPacket = await transitionFilingPacket({
    current: approvedPacket.packet,
    event: "submit_begin",
    state_changed_at: "2026-04-29T14:02:00Z",
  });
  const submittedCase = await transitionFilingCase({
    current: readyCase.filing_case,
    current_submission_ref: "submission-record://flow-0133",
    event: "submission_started",
    transitioned_at: "2026-04-29T14:03:00Z",
  });
  const pendingMirror = await transitionObligationMirror({
    current: readyMirror,
    current_submission_ref: "submission-record://flow-0133",
    event: "submission_started",
    transitioned_at: "2026-04-29T14:04:00Z",
  });
  const refs = validateAuthorityDomainRefs({
    filing_case: submittedCase.filing_case,
    filing_packet: submittedPacket.packet,
    obligation_mirror: pendingMirror.mirror,
  });
  expect(refs.submission_record_created).toBe(false);

  const statusRef = "authority-status://hmrc/obligation/flow-0133/confirmed";
  const confirmedMirror = await transitionObligationMirror({
    authority_ingress_proof_contract: proof(statusRef),
    authority_status_ref: statusRef,
    current: pendingMirror.mirror,
    event: "authority_confirms",
    last_confirmed_submission_ref: "submission-record://flow-0133",
    transitioned_at: "2026-04-29T14:10:00Z",
  });
  expect(confirmedMirror.mirror.last_confirmed_submission_ref).toBe(
    "submission-record://flow-0133",
  );
  expect(confirmedMirror.mirror.current_submission_ref).toBeNull();
});
