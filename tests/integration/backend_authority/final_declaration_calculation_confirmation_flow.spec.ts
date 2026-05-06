import { expect, test } from "@playwright/test";

import {
  AuthorityCalculationRequestRepository,
  buildAuthorityCalculationReadinessContext,
  buildAuthorityOperation,
  buildCalculationBasis,
  buildFilingCaseRecord,
  buildFilingPacket,
  calculationBasisRef,
  calculationUserConfirmationRef,
  authorityCalculationReadinessContextRef,
  authorityCalculationRef,
  authorityCalculationRequestRef,
  recordCalculationUserConfirmation,
  retrieveAuthorityCalculationResult,
  triggerAuthorityCalculation,
  verifyCalculationHandshakeIntegrity,
} from "../../../packages/backend-authority/src/index.ts";

test("final declaration trigger, retrieve, confirm, readiness, and packet handoff stay bound", async () => {
  const requestRepository = new AuthorityCalculationRequestRepository();
  const operation = buildAuthorityOperation({
    access_binding_hash: "hash.access.0141.integration",
    authority_binding_ref: "authority-binding://0141",
    authority_link_ref: "authority-link://0141",
    basis_type: "FINAL_DECLARATION_BASIS",
    binding_lineage_ref: "authority-binding-lineage://0141",
    business_partitions: ["business-partition://itsa/2025-2026/year-end"],
    client_id: "client-0141-integration",
    manifest_id: "manifest-0141-integration",
    operation_family: "AUTH_TRIGGER_CALCULATION",
    operation_id: "operation-0141-trigger",
    operation_profile_ref: "authority-operation-profile://hmrc-final-declaration-calculation",
    period: "2025-2026",
    policy_snapshot_hash: "hash.policy.0141.integration",
    provider_environment: "HMRC_SANDBOX",
    requested_scope: ["year_end", "prepare_submission"],
    runtime_scope: ["year_end", "prepare_submission"],
    tenant_id: "tenant-0141-integration",
  });

  const triggered = await triggerAuthorityCalculation({
    authority_interaction_ref: "authority-interaction://0141-trigger",
    authority_operation: operation,
    calculation_request_id: "calculation-request-0141",
    calculation_type: "final-declaration",
    client_id: operation.client_id,
    manifest_id: operation.manifest_id,
    requested_at: "2026-04-29T12:00:00Z",
    request_envelope_ref: "authority-request-envelope://0141-trigger",
    repository: requestRepository,
    tenant_id: operation.tenant_id,
  });
  expect(triggered.request.runtime_scope).toEqual(["year_end", "prepare_submission"]);

  const retrieved = await retrieveAuthorityCalculationResult({
    authority_response_ref: "authority-response://0141-calculation",
    calculation_id: "calc-0141-final-declaration",
    money_profile: { currency: "GBP", decimal_places: "2" },
    request: triggered.request,
    request_repository: requestRepository,
    retrieved_at: "2026-04-29T12:01:00Z",
    retrieved_payload: {
      total_income: "125000.00",
      total_tax_due: "32250.14",
    },
    retrieved_payload_ref: "authority-calculation-payload://0141",
  });

  const builtBasis = await buildCalculationBasis({
    basis_payload: {
      calculation_hash: retrieved.result.calculation_hash,
      total_tax_due: "32250.14",
    },
    captured_at: "2026-04-29T12:02:00Z",
    request: retrieved.request,
    result: retrieved.result,
  });
  const recorded = await recordCalculationUserConfirmation({
    actor_ref: "client://0141-signatory",
    basis: builtBasis.basis,
    confirmation_state: "CONFIRMED",
    confirmed_at: "2026-04-29T12:03:00Z",
    presentation_ref: "calculation-presentation://0141-final-declaration",
  });
  const readiness = await buildAuthorityCalculationReadinessContext({
    basis: recorded.basis,
    confirmation: recorded.confirmation,
    owner_artifact_ref: "filing-case://case-0141",
    persisted_at: "2026-04-29T12:04:00Z",
    request: retrieved.request,
    result: retrieved.result,
  });
  expect(readiness.context.validation_outcome).toBe("PASS");

  const handshake = verifyCalculationHandshakeIntegrity({
    basis: recorded.basis,
    confirmation: recorded.confirmation,
    readiness_context: readiness.context,
    request: retrieved.request,
    result: retrieved.result,
  });
  const filingCase = buildFilingCaseRecord({
    authority_calculation_ref: authorityCalculationRef(retrieved.result),
    calculation_basis_ref: calculationBasisRef(recorded.basis),
    calculation_hash: retrieved.result.calculation_hash,
    calculation_id: retrieved.result.calculation_id,
    calculation_request_ref: authorityCalculationRequestRef(retrieved.request),
    calculation_type: retrieved.request.calculation_type,
    client_id: operation.client_id,
    current_manifest_ref: operation.manifest_id,
    filing_case_id: "case-0141",
    last_transition_at: "2026-04-29T12:05:00Z",
    lifecycle_state: "READY_REVIEW",
    period: operation.period,
    readiness_context_ref: authorityCalculationReadinessContextRef(readiness.context),
    tenant_id: operation.tenant_id,
    user_confirmation_ref: calculationUserConfirmationRef(recorded.confirmation),
  });
  const packet = await buildFilingPacket({
    calculation_handshake: {
      basis: recorded.basis,
      confirmation: recorded.confirmation,
      expected_handshake_hash: handshake.calculation_handshake_hash,
      readiness_context: readiness.context,
      request: retrieved.request,
      result: retrieved.result,
    },
    declared_basis: "AUTHORITY_CALCULATION",
    filing_case: filingCase,
    manifest_binding_hash: "hash.manifest-binding.0141",
    payload_hash: "hash.payload.0141",
    payload_ref: "filing-payload://0141",
    state_changed_at: "2026-04-29T12:06:00Z",
  });

  expect(packet.packet.readiness_context_ref).toBe(
    authorityCalculationReadinessContextRef(readiness.context),
  );
  expect(packet.packet.authority_calculation_ref).toBe(authorityCalculationRef(retrieved.result));
  expect(packet.packet.calculation_basis_ref).toBe(calculationBasisRef(recorded.basis));
  expect(packet.packet.user_confirmation_ref).toBe(
    calculationUserConfirmationRef(recorded.confirmation),
  );
});
