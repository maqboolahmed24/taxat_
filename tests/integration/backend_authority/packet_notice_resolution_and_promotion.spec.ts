import { expect, test } from "@playwright/test";

import {
  applyNoticeResolutionToFilingPacket,
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
  derivePacketNoticeSteps,
  FilingNoticeResolutionRepository,
  FilingNoticeStepRepository,
  FilingPacketRepository,
  filingNoticeResolutionRef,
  projectPacketNoticeResolutionViewModel,
  resolveFilingNotices,
} from "../../../packages/backend-authority/src/index.ts";

const at = "2026-04-29T14:20:00Z";

function reviewReadyCase() {
  const request = buildAuthorityCalculationRequest({
    calculation_request_id: "0143",
    calculation_type: "final-declaration",
    client_id: "client-0143",
    manifest_id: "manifest-0143-integration",
    request_state: "RETRIEVED",
    requested_at: at,
    tenant_id: "tenant-0143",
  });
  const result = buildAuthorityCalculationResult({
    calculation_id: "calc-0143",
    calculation_request_ref: authorityCalculationRequestRef(request),
    calculation_type: request.calculation_type,
    manifest_id: request.manifest_id,
    retrieved_at: at,
    retrieved_payload: { total_due: "1450.00" },
  });
  const basis = buildCalculationBasisRecord({
    basis_payload: { total_due: "1450.00" },
    basis_status: "CONFIRMED",
    calculation_basis_id: "0143",
    calculation_id: result.calculation_id,
    calculation_request_ref: authorityCalculationRequestRef(request),
    calculation_type: result.calculation_type,
    captured_at: at,
    confirmed_at: at,
    manifest_id: result.manifest_id,
    user_confirmation_ref: "calculation-user-confirmation://0143",
  });
  const confirmation = buildCalculationUserConfirmation({
    calculation_basis_ref: calculationBasisRef(basis),
    calculation_id: result.calculation_id,
    confirmation_state: "CONFIRMED",
    confirmed_at: at,
    confirmed_basis_hash: basis.basis_hash,
    manifest_id: result.manifest_id,
    user_confirmation_id: "0143",
  });
  const readinessContext = buildAuthorityCalculationReadinessContextRecord({
    basis_hash: basis.basis_hash,
    basis_status: "CONFIRMED",
    calculation_basis_ref: calculationBasisRef(basis),
    calculation_hash: result.calculation_hash,
    calculation_id: result.calculation_id,
    calculation_readiness_context_id: "0143",
    calculation_request_ref: authorityCalculationRequestRef(request),
    calculation_type: request.calculation_type,
    confirmation_state: confirmation.confirmation_state,
    filing_reusable: true,
    live_authority_call_executed: true,
    manifest_id: request.manifest_id,
    owner_artifact_ref: "filing-case://case-0143",
    persisted_at: at,
    request_state: "RETRIEVED",
    result_state: "RETRIEVED",
    user_confirmation_ref: calculationUserConfirmationRef(confirmation),
    validation_outcome: "PASS",
  });
  const filingCase = buildFilingCaseRecord({
    authority_calculation_ref: authorityCalculationRef(result),
    calculation_basis_ref: calculationBasisRef(basis),
    calculation_hash: result.calculation_hash,
    calculation_id: result.calculation_id,
    calculation_request_ref: authorityCalculationRequestRef(request),
    calculation_type: request.calculation_type,
    client_id: request.client_id,
    controlling_proof_bundle_ref: "proof-bundle://0143",
    current_manifest_ref: request.manifest_id,
    current_parity_ref: "parity-result://0143",
    current_trust_ref: "trust-summary://0143",
    filing_case_id: "case-0143",
    last_transition_at: at,
    lifecycle_state: "READY_REVIEW",
    period: "2025-2026",
    proof_closure_state: "CLOSED",
    readiness_context_ref: authorityCalculationReadinessContextRef(readinessContext),
    tenant_id: request.tenant_id,
    trust_currency_state: "CURRENT",
    user_confirmation_ref: calculationUserConfirmationRef(confirmation),
  });
  return {
    calculationHandshake: {
      basis,
      confirmation,
      readiness_context: readinessContext,
      request,
      result,
    },
    filingCase,
  };
}

test("packet build derives notices, resolves them, and promotes only with persisted resolution", async () => {
  const packetRepository = new FilingPacketRepository();
  const stepRepository = new FilingNoticeStepRepository();
  const resolutionRepository = new FilingNoticeResolutionRepository();
  const { calculationHandshake, filingCase } = reviewReadyCase();
  const built = await buildFilingPacket({
    calculation_handshake: calculationHandshake,
    declared_basis: "FINAL_DECLARATION",
    disclaimers: ["FINAL_DECLARATION_LEGAL_TEXT"],
    filing_case: filingCase,
    manifest_binding_hash: "hash.manifest-binding.0143",
    payload_hash: "hash.payload.0143",
    payload_ref: "payload://0143",
    repository: packetRepository,
    state_changed_at: at,
  });
  const derived = await derivePacketNoticeSteps({
    actor_ref: "client-signatory://0143",
    created_at: "2026-04-29T14:21:00Z",
    packet: built.packet,
    repository: stepRepository,
    runtime_scope: ["year_end", "prepare_submission"],
  });
  const unresolved = await resolveFilingNotices({
    acknowledged_step_codes: ["DECLARED_BASIS_ACK_REQUIRED"],
    packet: built.packet,
    resolution_repository: resolutionRepository,
    resolved_at: "2026-04-29T14:22:00Z",
    step_repository: stepRepository,
    steps: derived.steps,
  });
  expect(unresolved.resolution.notice_requirements_satisfied).toBe(false);
  await expect(
    applyNoticeResolutionToFilingPacket({
      filing_gate_ref: "filing-gate://0143",
      packet: built.packet,
      packet_repository: packetRepository,
      resolution: unresolved.resolution,
      state_changed_at: "2026-04-29T14:23:00Z",
      steps: unresolved.steps,
    }),
  ).rejects.toThrow(/unsatisfied/);

  const resolved = await resolveFilingNotices({
    acknowledged_step_codes: [
      "DECLARED_BASIS_ACK_REQUIRED",
      "DISCLAIMER_ACK_REQUIRED",
      "PACKET_APPROVAL_REQUIRED",
    ],
    packet: built.packet,
    resolution_repository: resolutionRepository,
    resolved_at: "2026-04-29T14:24:00Z",
    step_repository: stepRepository,
    steps: unresolved.steps,
  });
  const promoted = await applyNoticeResolutionToFilingPacket({
    filing_gate_ref: "filing-gate://0143",
    notice_resolution_repository: resolutionRepository,
    packet: built.packet,
    packet_repository: packetRepository,
    resolution: resolved.resolution,
    state_changed_at: "2026-04-29T14:25:00Z",
    step_repository: stepRepository,
    steps: resolved.steps,
  });

  expect(promoted.packet.lifecycle_state).toBe("APPROVED_TO_SUBMIT");
  expect(promoted.packet.notice_step_refs).toEqual(resolved.resolution.notice_step_refs);
  expect(promoted.packet.notice_resolution_ref).toBe(
    filingNoticeResolutionRef(resolved.resolution),
  );
  const viewModel = projectPacketNoticeResolutionViewModel({
    packet: promoted.packet,
    resolution: resolved.resolution,
    steps: resolved.steps,
  });
  expect(viewModel.state).toBe("SATISFIED");
  expect(viewModel.approval_submit_blocked).toBe(false);
});

test("notice-free packet renders satisfied posture without a resolution artifact", async () => {
  const { calculationHandshake, filingCase } = reviewReadyCase();
  const built = await buildFilingPacket({
    approval_state: "NOT_REQUIRED",
    calculation_handshake: calculationHandshake,
    declared_basis: "FINAL_DECLARATION",
    declared_basis_ack_state: "NOT_APPLICABLE",
    filing_case: filingCase,
    manifest_binding_hash: "hash.manifest-binding.0143.no-notices",
    payload_hash: "hash.payload.0143.no-notices",
    payload_ref: "payload://0143/no-notices",
    state_changed_at: at,
  });
  const derived = await derivePacketNoticeSteps({
    actor_ref: "client-signatory://0143",
    created_at: "2026-04-29T14:21:00Z",
    packet: built.packet,
    runtime_scope: ["year_end", "prepare_submission"],
  });
  expect(derived.steps).toEqual([]);
  const viewModel = projectPacketNoticeResolutionViewModel({
    packet: built.packet,
    steps: derived.steps,
  });
  expect(viewModel.state).toBe("NO_NOTICES");
  expect(viewModel.approval_submit_blocked).toBe(false);
});
