import { expect, test } from "@playwright/test";

import {
  authorityCalculationReadinessContextRef,
  authorityCalculationRef,
  authorityCalculationRequestRef,
  buildAuthorityCalculationReadinessContextRecord,
  buildAuthorityCalculationRequest,
  buildAuthorityCalculationResult,
  buildCalculationBasisRecord,
  buildCalculationUserConfirmation,
  buildFilingCaseRecord,
  buildFilingPacket,
  calculationBasisRef,
  calculationUserConfirmationRef,
  FilingPacketRepository,
  filingPacketRef,
  transitionFilingPacket,
  upsertFilingCase,
} from "../../../packages/backend-authority/src/index.ts";

const at = "2026-04-29T13:00:00Z";

function reviewReadyCase() {
  const request = buildAuthorityCalculationRequest({
    calculation_request_id: "0133",
    calculation_type: "final-declaration",
    client_id: "client-0133",
    manifest_id: "manifest-0133",
    request_state: "RETRIEVED",
    requested_at: at,
    tenant_id: "tenant-0133",
  });
  const result = buildAuthorityCalculationResult({
    calculation_id: "calc-0133",
    calculation_request_ref: authorityCalculationRequestRef(request),
    calculation_type: request.calculation_type,
    manifest_id: request.manifest_id,
    retrieved_at: at,
    retrieved_payload: { total_due: "1200.00" },
  });
  const basis = buildCalculationBasisRecord({
    basis_payload: { total_due: "1200.00" },
    basis_status: "CONFIRMED",
    calculation_basis_id: "0133",
    calculation_id: result.calculation_id,
    calculation_request_ref: authorityCalculationRequestRef(request),
    calculation_type: result.calculation_type,
    captured_at: at,
    confirmed_at: at,
    manifest_id: result.manifest_id,
    user_confirmation_ref: "calculation-user-confirmation://0133",
  });
  const confirmation = buildCalculationUserConfirmation({
    calculation_basis_ref: calculationBasisRef(basis),
    calculation_id: result.calculation_id,
    confirmation_state: "CONFIRMED",
    confirmed_at: at,
    confirmed_basis_hash: basis.basis_hash,
    manifest_id: result.manifest_id,
    user_confirmation_id: "0133",
  });
  const readinessContext = buildAuthorityCalculationReadinessContextRecord({
    basis_hash: basis.basis_hash,
    basis_status: "CONFIRMED",
    calculation_basis_ref: calculationBasisRef(basis),
    calculation_hash: result.calculation_hash,
    calculation_id: result.calculation_id,
    calculation_readiness_context_id: "0133",
    calculation_request_ref: authorityCalculationRequestRef(request),
    calculation_type: request.calculation_type,
    confirmation_state: confirmation.confirmation_state,
    filing_reusable: true,
    live_authority_call_executed: true,
    manifest_id: request.manifest_id,
    owner_artifact_ref: "filing-case://0133",
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
  const filingCase = buildFilingCaseRecord({
    authority_calculation_ref: authorityCalculationRef(result),
    calculation_basis_ref: calculationBasisRef(basis),
    calculation_hash: result.calculation_hash,
    calculation_id: result.calculation_id,
    calculation_request_ref: authorityCalculationRequestRef(request),
    calculation_type: request.calculation_type,
    client_id: request.client_id,
    controlling_proof_bundle_ref: "proof-bundle://0133",
    current_manifest_ref: "manifest-0133",
    current_parity_ref: "parity-result://0133",
    current_trust_ref: "trust-summary://0133",
    filing_case_id: "filing-case-0133",
    last_transition_at: at,
    lifecycle_state: "READY_REVIEW",
    period: "2026-Q1",
    proof_closure_state: "CLOSED",
    readiness_context_ref: authorityCalculationReadinessContextRef(readinessContext),
    tenant_id: "tenant-0133",
    trust_currency_state: "CURRENT",
    user_confirmation_ref: calculationUserConfirmationRef(confirmation),
  });
  return { calculationHandshake, filingCase };
}

test("clears filing lineage for NOT_STARTED cases", () => {
  expect(() =>
    buildFilingCaseRecord({
      client_id: "client-0133",
      current_manifest_ref: "manifest-illegal",
      last_transition_at: at,
      lifecycle_state: "NOT_STARTED",
      period: "2026-Q1",
      tenant_id: "tenant-0133",
    }),
  ).toThrow(/current_manifest_ref must be null/);
});

test("persists PREPARED packets while approval and declaration acknowledgement are pending", async () => {
  const { calculationHandshake, filingCase } = reviewReadyCase();
  const result = await buildFilingPacket({
    calculation_handshake: calculationHandshake,
    declared_basis: "FINAL_DECLARATION",
    disclaimers: ["DECLARATION_BASIS_REQUIRES_ACK"],
    filing_case: filingCase,
    manifest_binding_hash: "hash.manifest-binding.0133",
    notice_step_refs: ["notice-step://basis-ack"],
    payload_hash: "hash.payload.0133",
    payload_ref: "object://filing-payload/0133",
    state_changed_at: at,
  });

  expect(result.packet.lifecycle_state).toBe("PREPARED");
  expect(result.packet.approval_state).toBe("REQUIRED_PENDING");
  expect(result.packet.declared_basis_ack_state).toBe("REQUIRED_PENDING");
});

test("requires gate, closed proof, and resolved notice posture before APPROVED_TO_SUBMIT", async () => {
  const { calculationHandshake, filingCase } = reviewReadyCase();
  await expect(
    buildFilingPacket({
      calculation_handshake: calculationHandshake,
      declared_basis: "FINAL_DECLARATION",
      filing_case: filingCase,
      lifecycle_state: "APPROVED_TO_SUBMIT",
      manifest_binding_hash: "hash.manifest-binding.0133",
      notice_step_refs: ["notice-step://basis-ack"],
      payload_hash: "hash.payload.0133",
      payload_ref: "object://filing-payload/0133",
      state_changed_at: at,
    }),
  ).rejects.toThrow(/filing_gate_ref/);

  const approved = await buildFilingPacket({
    calculation_handshake: calculationHandshake,
    declared_basis: "FINAL_DECLARATION",
    filing_case: filingCase,
    filing_gate_ref: "filing-gate://0133",
    lifecycle_state: "APPROVED_TO_SUBMIT",
    manifest_binding_hash: "hash.manifest-binding.0133",
    notice_resolution_ref: "filing-notice-resolution://0133",
    notice_step_refs: ["notice-step://basis-ack"],
    payload_hash: "hash.payload.0133",
    payload_ref: "object://filing-payload/0133",
    state_changed_at: at,
  });
  expect(approved.packet.lifecycle_state).toBe("APPROVED_TO_SUBMIT");
});

test("blocks in-place packet mutation after SUBMITTED", async () => {
  const repository = new FilingPacketRepository();
  const { calculationHandshake, filingCase } = reviewReadyCase();
  const approved = await buildFilingPacket({
    calculation_handshake: calculationHandshake,
    declared_basis: "FINAL_DECLARATION",
    filing_case: filingCase,
    filing_gate_ref: "filing-gate://0133",
    lifecycle_state: "APPROVED_TO_SUBMIT",
    manifest_binding_hash: "hash.manifest-binding.0133",
    payload_hash: "hash.payload.0133",
    payload_ref: "object://filing-payload/0133",
    repository,
    state_changed_at: at,
  });
  const submitted = await transitionFilingPacket({
    current: approved.packet,
    event: "submit_begin",
    repository,
    state_changed_at: "2026-04-29T13:05:00Z",
  });

  await expect(
    repository.persistFilingPacket({
      packet: { ...submitted.packet, declared_basis: "MUTATED_AFTER_SUBMIT" },
    }),
  ).rejects.toThrow(/cannot mutate in place/);
});

test("upserts READY_TO_SUBMIT case from approved packet lineage", async () => {
  const { calculationHandshake, filingCase } = reviewReadyCase();
  const approved = await buildFilingPacket({
    calculation_handshake: calculationHandshake,
    declared_basis: "FINAL_DECLARATION",
    filing_case: filingCase,
    filing_gate_ref: "filing-gate://0133",
    lifecycle_state: "APPROVED_TO_SUBMIT",
    manifest_binding_hash: "hash.manifest-binding.0133",
    payload_hash: "hash.payload.0133",
    payload_ref: "object://filing-payload/0133",
    state_changed_at: at,
  });
  const ready = await upsertFilingCase({
    ...filingCase,
    current_packet_ref: filingPacketRef(approved.packet),
    last_transition_at: "2026-04-29T13:01:00Z",
    packet_state: approved.packet.lifecycle_state,
  });
  expect(ready.filing_case.lifecycle_state).toBe("READY_TO_SUBMIT");
});
