import {
  authorityCalculationRequestRef,
  type AuthorityCalculationRequestRecord,
} from "../models/authority_calculation_request.ts";
import type { AuthorityCalculationResultRecord } from "../models/authority_calculation_result.ts";
import {
  calculationBasisRef,
  type CalculationBasisRecord,
} from "../models/calculation_basis.ts";
import {
  calculationUserConfirmationRef,
  type CalculationUserConfirmationRecord,
} from "../models/calculation_user_confirmation.ts";
import {
  buildAuthorityCalculationReadinessContextRecord,
  type AuthorityCalculationContextScope,
  type AuthorityCalculationReadinessContextRecord,
} from "../models/authority_calculation_readiness_context.ts";
import { AuthorityModelError } from "../models/authority_common.ts";
import { AuthorityCalculationReadinessContextRepository } from "../repositories/authority_calculation_readiness_context_repository.ts";

export type BuildAuthorityCalculationReadinessContextInput = {
  basis?: CalculationBasisRecord | null;
  calculation_readiness_context_id?: string;
  confirmation?: CalculationUserConfirmationRecord | null;
  context_scope?: AuthorityCalculationContextScope;
  owner_artifact_ref: string;
  owner_artifact_type?: "FilingCase" | "AmendmentCase";
  persisted_at: string;
  repository?: AuthorityCalculationReadinessContextRepository;
  request: AuthorityCalculationRequestRecord;
  result: AuthorityCalculationResultRecord;
};

function reasonCodes(input: {
  basis?: CalculationBasisRecord | null;
  confirmation?: CalculationUserConfirmationRecord | null;
  request: AuthorityCalculationRequestRecord;
  result: AuthorityCalculationResultRecord;
}) {
  const codes = new Set<string>([...input.request.reason_codes, ...input.result.reason_codes]);
  if (!input.request.live_authority_call_executed) {
    codes.add("AUTHORITY_CALCULATION_MODELED");
  }
  if (input.result.result_state !== "RETRIEVED") {
    codes.add("AUTHORITY_CALCULATION_NOT_RETRIEVED");
  }
  if (input.basis === null || input.basis === undefined) {
    codes.add("CALCULATION_BASIS_MISSING");
  } else if (input.basis.basis_status !== "CONFIRMED") {
    codes.add(`CALCULATION_BASIS_${input.basis.basis_status}`);
  }
  if (input.confirmation === null || input.confirmation === undefined) {
    codes.add("CALCULATION_CONFIRMATION_MISSING");
  } else if (input.confirmation.confirmation_state !== "CONFIRMED") {
    codes.add(`CALCULATION_CONFIRMATION_${input.confirmation.confirmation_state}`);
  }
  return [...codes].sort();
}

function deriveOutcome(input: {
  basis?: CalculationBasisRecord | null;
  confirmation?: CalculationUserConfirmationRecord | null;
  request: AuthorityCalculationRequestRecord;
  result: AuthorityCalculationResultRecord;
}): AuthorityCalculationReadinessContextRecord["validation_outcome"] {
  if (!input.request.live_authority_call_executed || input.result.result_state === "MODELED") {
    return "HARD_BLOCK";
  }
  if (
    input.result.result_state === "RETRIEVED" &&
    (input.result.validation_outcome === "PASS" || input.result.validation_outcome === "PASS_WITH_NOTICE") &&
    input.basis?.basis_status === "CONFIRMED" &&
    input.confirmation?.confirmation_state === "CONFIRMED" &&
    (input.basis.parity_reusable || input.basis.filing_reusable)
  ) {
    return input.result.validation_outcome;
  }
  if (input.result.validation_outcome === "HARD_BLOCK") {
    return "HARD_BLOCK";
  }
  if (input.confirmation?.confirmation_state === "DECLINED" || input.basis?.basis_status === "REJECTED") {
    return "HARD_BLOCK";
  }
  return "MANUAL_REVIEW";
}

export async function buildAuthorityCalculationReadinessContext(
  input: BuildAuthorityCalculationReadinessContextInput,
): Promise<{
  context: AuthorityCalculationReadinessContextRecord;
  repository: AuthorityCalculationReadinessContextRepository;
  stored: Awaited<
    ReturnType<AuthorityCalculationReadinessContextRepository["persistAuthorityCalculationReadinessContext"]>
  >;
}> {
  const repository = input.repository ?? new AuthorityCalculationReadinessContextRepository();
  const requestRef = authorityCalculationRequestRef(input.request);
  if (input.result.calculation_request_ref !== requestRef) {
    throw new AuthorityModelError(
      "AUTHORITY_CONTRACT_INVALID",
      "readiness context request/result tuple mismatch",
    );
  }
  if (
    input.request.request_state === "SUPERSEDED" ||
    input.result.result_state === "SUPERSEDED" ||
    input.basis?.basis_status === "SUPERSEDED"
  ) {
    throw new AuthorityModelError(
      "AUTHORITY_CONTRACT_INVALID",
      "active readiness contexts must not point at superseded request, result, or basis posture",
    );
  }
  if (input.basis && input.basis.calculation_id !== input.result.calculation_id) {
    throw new AuthorityModelError(
      "AUTHORITY_CONTRACT_INVALID",
      "readiness context result/basis calculation tuple mismatch",
    );
  }
  if (
    input.confirmation &&
    input.basis &&
    input.confirmation.calculation_basis_ref !== calculationBasisRef(input.basis)
  ) {
    throw new AuthorityModelError(
      "AUTHORITY_CONTRACT_INVALID",
      "readiness context basis/confirmation tuple mismatch",
    );
  }

  const outcome = deriveOutcome(input);
  const codes = outcome === "PASS" ? [] : reasonCodes(input);
  const context = buildAuthorityCalculationReadinessContextRecord({
    basis_hash: input.basis?.basis_hash ?? null,
    basis_status: input.basis?.basis_status ?? null,
    calculation_basis_ref: input.basis ? calculationBasisRef(input.basis) : null,
    calculation_hash: input.result.calculation_hash,
    calculation_id: input.result.calculation_id,
    calculation_readiness_context_id: input.calculation_readiness_context_id,
    calculation_request_ref: requestRef,
    calculation_type: input.request.calculation_type,
    confirmation_state: input.confirmation?.confirmation_state ?? null,
    context_scope: input.context_scope,
    filing_reusable: input.basis?.filing_reusable ?? false,
    live_authority_call_executed: input.request.live_authority_call_executed,
    manifest_id: input.request.manifest_id,
    owner_artifact_ref: input.owner_artifact_ref,
    owner_artifact_type: input.owner_artifact_type,
    parity_reusable: input.basis?.parity_reusable ?? false,
    persisted_at: input.persisted_at,
    reason_codes: codes,
    request_state: input.request.request_state,
    result_state: input.result.result_state,
    user_confirmation_ref: input.confirmation ? calculationUserConfirmationRef(input.confirmation) : null,
    validation_outcome: outcome,
  });
  const stored = await repository.persistAuthorityCalculationReadinessContext({ context });
  return { context, repository, stored };
}
