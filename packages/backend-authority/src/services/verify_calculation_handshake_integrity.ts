import {
  deriveCalculationHandshakeHash,
  type AuthorityCalculationValidationOutcome,
} from "../models/authority_calculation_common.ts";
import {
  authorityCalculationRequestRef,
  type AuthorityCalculationRequestRecord,
} from "../models/authority_calculation_request.ts";
import {
  authorityCalculationRef,
  type AuthorityCalculationResultRecord,
} from "../models/authority_calculation_result.ts";
import {
  calculationBasisRef,
  type CalculationBasisRecord,
} from "../models/calculation_basis.ts";
import {
  calculationUserConfirmationRef,
  type CalculationUserConfirmationRecord,
} from "../models/calculation_user_confirmation.ts";
import {
  authorityCalculationReadinessContextRef,
  type AuthorityCalculationReadinessContextRecord,
} from "../models/authority_calculation_readiness_context.ts";
import { AuthorityModelError } from "../models/authority_common.ts";

export type VerifyCalculationHandshakeIntegrityInput = {
  baseline_hash?: string | null;
  basis: CalculationBasisRecord;
  confirmation: CalculationUserConfirmationRecord;
  expected_handshake_hash?: string | null;
  readiness_context: AuthorityCalculationReadinessContextRecord;
  request: AuthorityCalculationRequestRecord;
  result: AuthorityCalculationResultRecord;
};

export type CalculationHandshakeIntegrityProjection = {
  calculation_basis_ref: string;
  calculation_handshake_hash: string;
  calculation_id: string;
  calculation_readiness_context_ref: string;
  calculation_ref: string;
  calculation_request_ref: string;
  user_confirmation_ref: string;
  validation_outcome: AuthorityCalculationValidationOutcome;
  verified: true;
};

function assertMatches(label: string, left: string | null, right: string | null) {
  if (left !== right) {
    throw new AuthorityModelError(
      "AUTHORITY_CONTRACT_INVALID",
      `calculation handshake mismatch for ${label}`,
    );
  }
}

export function verifyCalculationHandshakeIntegrity(
  input: VerifyCalculationHandshakeIntegrityInput,
): CalculationHandshakeIntegrityProjection {
  const requestRef = authorityCalculationRequestRef(input.request);
  const resultRef = authorityCalculationRef(input.result);
  const basisRef = calculationBasisRef(input.basis);
  const confirmationRef = calculationUserConfirmationRef(input.confirmation);
  const readinessRef = authorityCalculationReadinessContextRef(input.readiness_context);

  if (!input.request.live_authority_call_executed) {
    throw new AuthorityModelError(
      "AUTHORITY_CONTRACT_INVALID",
      "filing-ready calculation handshake requires a live authority calculation request",
    );
  }
  if (
    input.request.request_state !== "RETRIEVED" ||
    input.result.result_state !== "RETRIEVED" ||
    input.basis.basis_status !== "CONFIRMED" ||
    input.confirmation.confirmation_state !== "CONFIRMED" ||
    !["PASS", "PASS_WITH_NOTICE"].includes(input.readiness_context.validation_outcome)
  ) {
    throw new AuthorityModelError(
      "AUTHORITY_CONTRACT_INVALID",
      "calculation handshake tuple is not filing-ready",
    );
  }
  assertMatches("request/result ref", input.result.calculation_request_ref, requestRef);
  assertMatches("basis request ref", input.basis.calculation_request_ref, requestRef);
  assertMatches("basis calculation id", input.basis.calculation_id, input.result.calculation_id);
  assertMatches("confirmation calculation id", input.confirmation.calculation_id, input.result.calculation_id);
  assertMatches("confirmation basis ref", input.confirmation.calculation_basis_ref, basisRef);
  assertMatches("confirmation basis hash", input.confirmation.confirmed_basis_hash, input.basis.basis_hash);
  assertMatches("readiness request ref", input.readiness_context.calculation_request_ref, requestRef);
  assertMatches("readiness calculation id", input.readiness_context.calculation_id, input.result.calculation_id);
  assertMatches("readiness calculation hash", input.readiness_context.calculation_hash, input.result.calculation_hash);
  assertMatches("readiness basis ref", input.readiness_context.calculation_basis_ref, basisRef);
  assertMatches("readiness basis hash", input.readiness_context.basis_hash, input.basis.basis_hash);
  assertMatches("readiness confirmation ref", input.readiness_context.user_confirmation_ref, confirmationRef);

  if (!input.basis.parity_reusable && !input.basis.filing_reusable) {
    throw new AuthorityModelError(
      "AUTHORITY_CONTRACT_INVALID",
      "calculation handshake requires reusable confirmed basis posture",
    );
  }

  const calculationHandshakeHash = deriveCalculationHandshakeHash({
    access_binding_hash: input.request.access_binding_hash,
    authority_scope: input.request.authority_scope,
    baseline_hash: input.baseline_hash ?? null,
    calculation_basis_hash: input.basis.basis_hash,
    calculation_hash: input.result.calculation_hash,
    calculation_id: input.result.calculation_id,
    operation_profile_ref: input.request.operation_profile_ref,
    provider_environment: input.request.provider_environment,
    user_confirmation_ref: confirmationRef,
  });
  if (
    input.expected_handshake_hash !== undefined &&
    input.expected_handshake_hash !== null &&
    input.expected_handshake_hash !== calculationHandshakeHash
  ) {
    throw new AuthorityModelError(
      "AUTHORITY_CONTRACT_INVALID",
      "calculation handshake hash is stale",
    );
  }

  return {
    calculation_basis_ref: basisRef,
    calculation_handshake_hash: calculationHandshakeHash,
    calculation_id: input.result.calculation_id,
    calculation_readiness_context_ref: readinessRef,
    calculation_ref: resultRef,
    calculation_request_ref: requestRef,
    user_confirmation_ref: confirmationRef,
    validation_outcome: input.readiness_context.validation_outcome,
    verified: true,
  };
}
