import {
  calculationBasisRef,
  normalizeCalculationBasis,
  type CalculationBasisRecord,
} from "../models/calculation_basis.ts";
import {
  buildCalculationUserConfirmation,
  calculationUserConfirmationRef,
  type CalculationConfirmationActorRole,
  type CalculationConfirmationState,
  type CalculationUserConfirmationRecord,
} from "../models/calculation_user_confirmation.ts";
import { AuthorityModelError } from "../models/authority_common.ts";
import { CalculationBasisRepository } from "../repositories/calculation_basis_repository.ts";
import { CalculationUserConfirmationRepository } from "../repositories/calculation_user_confirmation_repository.ts";

export type RecordCalculationUserConfirmationInput = {
  actor_ref: string;
  actor_role?: CalculationConfirmationActorRole;
  basis: CalculationBasisRecord;
  confirmation_state: CalculationConfirmationState;
  confirmed_at?: string | null;
  declined_at?: string | null;
  presentation_ref: string;
  reason_codes?: readonly string[];
  basis_repository?: CalculationBasisRepository;
  confirmation_repository?: CalculationUserConfirmationRepository;
  user_confirmation_id?: string;
};

export async function recordCalculationUserConfirmation(
  input: RecordCalculationUserConfirmationInput,
): Promise<{
  basis: CalculationBasisRecord;
  basis_repository: CalculationBasisRepository;
  basis_stored: Awaited<ReturnType<CalculationBasisRepository["persistCalculationBasis"]>>;
  confirmation: CalculationUserConfirmationRecord;
  confirmation_repository: CalculationUserConfirmationRepository;
  confirmation_stored: Awaited<
    ReturnType<CalculationUserConfirmationRepository["persistCalculationUserConfirmation"]>
  >;
}> {
  const basisRepository = input.basis_repository ?? new CalculationBasisRepository();
  const confirmationRepository =
    input.confirmation_repository ?? new CalculationUserConfirmationRepository();
  const basis = normalizeCalculationBasis(input.basis);
  if (basis.basis_status === "SUPERSEDED" || basis.basis_status === "REJECTED") {
    throw new AuthorityModelError(
      "AUTHORITY_CONTRACT_INVALID",
      "user confirmation cannot be recorded against rejected or superseded calculation basis",
    );
  }

  const confirmed = input.confirmation_state === "CONFIRMED";
  const declined = input.confirmation_state === "DECLINED";
  const confirmation = buildCalculationUserConfirmation({
    actor_ref: input.actor_ref,
    actor_role: input.actor_role ?? "CLIENT_SIGNATORY",
    calculation_basis_ref: calculationBasisRef(basis),
    calculation_id: basis.calculation_id,
    confirmation_state: input.confirmation_state,
    confirmed_at: confirmed ? input.confirmed_at ?? "2026-04-29T12:10:00Z" : null,
    confirmed_basis_hash: confirmed ? basis.basis_hash : null,
    declined_at: declined ? input.declined_at ?? "2026-04-29T12:10:00Z" : null,
    manifest_id: basis.manifest_id,
    presentation_ref: input.presentation_ref,
    reason_codes: [
      ...(input.reason_codes ?? (declined ? ["CALCULATION_BASIS_NOT_ACCEPTED"] : [])),
    ],
    user_confirmation_id: input.user_confirmation_id,
  });
  const confirmationStored = await confirmationRepository.persistCalculationUserConfirmation({
    confirmation,
  });

  const updatedBasis =
    confirmation.confirmation_state === "CONFIRMED"
      ? normalizeCalculationBasis({
          ...basis,
          basis_status: "CONFIRMED",
          confirmed_at: confirmation.confirmed_at,
          filing_reusable: true,
          parity_reusable: true,
          user_confirmation_ref: calculationUserConfirmationRef(confirmation),
        })
      : basis;

  const basisStored = await basisRepository.persistCalculationBasis({ basis: updatedBasis });
  return {
    basis: updatedBasis,
    basis_repository: basisRepository,
    basis_stored: basisStored,
    confirmation,
    confirmation_repository: confirmationRepository,
    confirmation_stored: confirmationStored,
  };
}
