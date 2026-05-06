import { expect, test } from "@playwright/test";

import {
  AuthorityModelError,
  authorityCalculationReadinessContextRef,
  authorityCalculationRef,
  authorityCalculationRequestRef,
  buildAuthorityCalculationReadinessContextRecord,
  buildAuthorityCalculationRequest,
  buildAuthorityCalculationResult,
  buildCalculationBasisRecord,
  buildCalculationUserConfirmation,
  calculationBasisRef,
  calculationUserConfirmationRef,
  deriveAuthorityCalculationResultHash,
  deriveCalculationBasisHash,
  verifyCalculationHandshakeIntegrity,
} from "../../../packages/backend-authority/src/index.ts";

const requestedAt = "2026-04-29T12:00:00Z";

test("modeled requests clear live authority lineage and cannot pass", () => {
  const request = buildAuthorityCalculationRequest({
    authority_interaction_ref: "authority-interaction://must-clear",
    authority_operation_ref: "authority-operation://must-clear",
    calculation_type: "final-declaration",
    client_id: "client-0141",
    live_authority_call_executed: false,
    manifest_id: "manifest-0141",
    reason_codes: ["AUTHORITY_LIVE_CALL_FORBIDDEN_IN_ANALYSIS"],
    request_envelope_ref: "authority-request-envelope://must-clear",
    requested_at: requestedAt,
    tenant_id: "tenant-0141",
  });
  const result = buildAuthorityCalculationResult({
    calculation_request_ref: authorityCalculationRequestRef(request),
    calculation_type: request.calculation_type,
    live_authority_call_executed: false,
    manifest_id: request.manifest_id,
    reason_codes: request.reason_codes,
  });

  expect(request.authority_operation_ref).toBeNull();
  expect(request.request_envelope_ref).toBeNull();
  expect(request.authority_interaction_ref).toBeNull();
  expect(result.result_state).toBe("MODELED");
  expect(result.validation_outcome).toBe("HARD_BLOCK");
  expect(() =>
    buildAuthorityCalculationResult({
      calculation_request_ref: authorityCalculationRequestRef(request),
      calculation_type: request.calculation_type,
      live_authority_call_executed: false,
      manifest_id: request.manifest_id,
      result_state: "MODELED",
      validation_outcome: "PASS",
    }),
  ).toThrow(AuthorityModelError);
});

test("calculation runtime scope forbids submit tokens and separates amendment intent", () => {
  expect(() =>
    buildAuthorityCalculationRequest({
      calculation_type: "final-declaration",
      client_id: "client-0141",
      manifest_id: "manifest-0141",
      requested_at: requestedAt,
      runtime_scope: ["year_end", "prepare_submission", "submit"],
      tenant_id: "tenant-0141",
    }),
  ).toThrow(AuthorityModelError);

  expect(() =>
    buildAuthorityCalculationRequest({
      calculation_type: "intent-to-amend",
      client_id: "client-0141",
      manifest_id: "manifest-0141",
      requested_at: requestedAt,
      runtime_scope: ["year_end", "prepare_submission"],
      tenant_id: "tenant-0141",
    }),
  ).toThrow(AuthorityModelError);
});

test("exact decimal calculation hashing is stable and rejects JSON numbers", () => {
  const payload = {
    total_income: "125000.00",
    total_due: "32250.14",
  };
  const moneyProfile = { currency: "GBP", decimal_places: "2" };

  expect(deriveAuthorityCalculationResultHash({ money_profile: moneyProfile, payload })).toBe(
    deriveAuthorityCalculationResultHash({ money_profile: moneyProfile, payload }),
  );
  expect(deriveCalculationBasisHash({ money_profile: moneyProfile, payload })).toBe(
    deriveCalculationBasisHash({ money_profile: moneyProfile, payload }),
  );
  expect(() =>
    deriveAuthorityCalculationResultHash({
      money_profile: moneyProfile,
      payload: { total_due: 32250.14 },
    }),
  ).toThrow(AuthorityModelError);
});

test("basis reusability and confirmation hash exposure are fail-closed", () => {
  const basis = buildCalculationBasisRecord({
    basis_payload: { total_due: "32250.14" },
    calculation_id: "calc-0141",
    calculation_request_ref: "authority-calculation-request://req-0141",
    calculation_type: "final-declaration",
    captured_at: requestedAt,
    manifest_id: "manifest-0141",
  });

  expect(basis.basis_status).toBe("PROVISIONAL");
  expect(basis.parity_reusable).toBe(false);
  expect(basis.filing_reusable).toBe(false);
  expect(() =>
    buildCalculationBasisRecord({
      ...basis,
      basis_status: "REJECTED",
      filing_reusable: true,
    }),
  ).toThrow(AuthorityModelError);

  expect(() =>
    buildCalculationUserConfirmation({
      calculation_basis_ref: calculationBasisRef(basis),
      calculation_id: basis.calculation_id,
      confirmation_state: "DECLINED",
      confirmed_basis_hash: basis.basis_hash,
      declined_at: "2026-04-29T12:05:00Z",
      manifest_id: basis.manifest_id,
      reason_codes: ["CLIENT_DISAGREES_WITH_CALCULATION"],
    }),
  ).toThrow(AuthorityModelError);
});

test("readiness PASS requires live result, confirmed basis, confirmation, and reusable posture", () => {
  const request = buildAuthorityCalculationRequest({
    calculation_type: "final-declaration",
    client_id: "client-0141",
    manifest_id: "manifest-0141",
    request_state: "RETRIEVED",
    requested_at: requestedAt,
    tenant_id: "tenant-0141",
  });
  const result = buildAuthorityCalculationResult({
    calculation_id: "calc-0141",
    calculation_request_ref: authorityCalculationRequestRef(request),
    calculation_type: request.calculation_type,
    manifest_id: request.manifest_id,
    retrieved_payload: { total_due: "32250.14" },
  });
  const basis = buildCalculationBasisRecord({
    basis_payload: { total_due: "32250.14" },
    calculation_id: result.calculation_id,
    calculation_request_ref: authorityCalculationRequestRef(request),
    calculation_type: result.calculation_type,
    captured_at: "2026-04-29T12:02:00Z",
    confirmed_at: "2026-04-29T12:03:00Z",
    manifest_id: result.manifest_id,
    user_confirmation_ref: "calculation-user-confirmation://conf-0141",
    basis_status: "CONFIRMED",
  });
  const confirmation = buildCalculationUserConfirmation({
    calculation_basis_ref: calculationBasisRef(basis),
    calculation_id: result.calculation_id,
    confirmation_state: "CONFIRMED",
    confirmed_at: "2026-04-29T12:03:00Z",
    confirmed_basis_hash: basis.basis_hash,
    manifest_id: result.manifest_id,
    user_confirmation_id: "conf-0141",
  });
  const context = buildAuthorityCalculationReadinessContextRecord({
    basis_hash: basis.basis_hash,
    basis_status: "CONFIRMED",
    calculation_basis_ref: calculationBasisRef(basis),
    calculation_hash: result.calculation_hash,
    calculation_id: result.calculation_id,
    calculation_request_ref: authorityCalculationRequestRef(request),
    calculation_type: request.calculation_type,
    confirmation_state: confirmation.confirmation_state,
    filing_reusable: true,
    live_authority_call_executed: true,
    manifest_id: request.manifest_id,
    owner_artifact_ref: "filing-case://case-0141",
    persisted_at: "2026-04-29T12:04:00Z",
    request_state: "RETRIEVED",
    result_state: "RETRIEVED",
    user_confirmation_ref: calculationUserConfirmationRef(confirmation),
    validation_outcome: "PASS",
  });

  expect(context.validation_outcome).toBe("PASS");
  expect(authorityCalculationReadinessContextRef(context)).toContain(
    "authority-calculation-readiness-context://",
  );

  const verified = verifyCalculationHandshakeIntegrity({
    basis,
    confirmation,
    readiness_context: context,
    request,
    result,
  });
  expect(verified.calculation_ref).toBe(authorityCalculationRef(result));
  expect(() =>
    verifyCalculationHandshakeIntegrity({
      basis,
      confirmation,
      expected_handshake_hash: "stale-hash",
      readiness_context: context,
      request,
      result,
    }),
  ).toThrow(AuthorityModelError);
});
