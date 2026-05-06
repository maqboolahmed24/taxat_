import {
  authorityCalculationRequestRef,
  type AuthorityCalculationRequestRecord,
} from "../models/authority_calculation_request.ts";
import type { AuthorityCalculationResultRecord } from "../models/authority_calculation_result.ts";
import {
  buildCalculationBasisRecord,
  type CalculationBasisRecord,
} from "../models/calculation_basis.ts";
import { AuthorityModelError } from "../models/authority_common.ts";
import { CalculationBasisRepository } from "../repositories/calculation_basis_repository.ts";

export type BuildCalculationBasisInput = {
  basis_payload?: unknown;
  basis_payload_ref?: string;
  basis_status?: CalculationBasisRecord["basis_status"];
  basis_type?: string;
  captured_at: string;
  money_profile?: unknown;
  reason_codes?: readonly string[];
  repository?: CalculationBasisRepository;
  request: AuthorityCalculationRequestRecord;
  result: AuthorityCalculationResultRecord;
};

export async function buildCalculationBasis(input: BuildCalculationBasisInput): Promise<{
  basis: CalculationBasisRecord;
  repository: CalculationBasisRepository;
  stored: Awaited<ReturnType<CalculationBasisRepository["persistCalculationBasis"]>>;
}> {
  const repository = input.repository ?? new CalculationBasisRepository();
  const requestRef = authorityCalculationRequestRef(input.request);
  if (input.result.calculation_request_ref !== requestRef) {
    throw new AuthorityModelError(
      "AUTHORITY_CONTRACT_INVALID",
      "calculation basis request/result tuple mismatch",
    );
  }
  if (input.result.result_state === "MODELED" || input.result.result_state === "SUPERSEDED") {
    throw new AuthorityModelError(
      "AUTHORITY_CONTRACT_INVALID",
      "calculation basis requires a current retrieved authority calculation result",
    );
  }

  const basisStatus =
    input.basis_status ??
    (["PASS", "PASS_WITH_NOTICE"].includes(input.result.validation_outcome)
      ? "PROVISIONAL"
      : "REJECTED");
  const basis = buildCalculationBasisRecord({
    basis_payload: input.basis_payload ?? {
      calculation_hash: input.result.calculation_hash,
      validation_outcome: input.result.validation_outcome,
    },
    basis_payload_ref: input.basis_payload_ref,
    basis_status: basisStatus,
    basis_type: input.basis_type ?? "FINAL_DECLARATION_BASIS",
    calculation_id: input.result.calculation_id,
    calculation_request_ref: requestRef,
    calculation_type: input.result.calculation_type,
    captured_at: input.captured_at,
    manifest_id: input.result.manifest_id,
    money_profile: input.money_profile,
    reason_codes: [
      ...(input.reason_codes ??
        (basisStatus === "REJECTED" ? input.result.reason_codes : [])),
    ],
  });
  const stored = await repository.persistCalculationBasis({ basis });
  return { basis, repository, stored };
}
