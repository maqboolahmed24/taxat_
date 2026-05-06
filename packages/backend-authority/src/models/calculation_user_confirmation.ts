import {
  AuthorityModelError,
  assertEnum,
  hashObject,
  normalizeNullableString,
  requireNonNull,
  requireString,
} from "./authority_common.ts";
import {
  calculationUserConfirmationRef,
  cloneCalculationRecord,
  defaultCalculationId,
  normalizeCalculationReasonCodes,
  normalizeNullableCalculationTimestamp,
} from "./authority_calculation_common.ts";

export const CALCULATION_CONFIRMATION_STATES = ["PENDING", "CONFIRMED", "DECLINED"] as const;
export const CALCULATION_CONFIRMATION_ACTOR_ROLES = [
  "PREPARER",
  "REVIEWER",
  "APPROVER",
  "CLIENT_SIGNATORY",
  "SUBJECT_SELF",
  "SUBJECT_REPRESENTATIVE",
] as const;

export type CalculationConfirmationState = (typeof CALCULATION_CONFIRMATION_STATES)[number];
export type CalculationConfirmationActorRole =
  (typeof CALCULATION_CONFIRMATION_ACTOR_ROLES)[number];

export type CalculationUserConfirmationRecord = {
  actor_ref: string;
  actor_role: CalculationConfirmationActorRole;
  artifact_type: "CalculationUserConfirmation";
  calculation_basis_ref: string;
  calculation_id: string;
  confirmation_state: CalculationConfirmationState;
  confirmed_at: string | null;
  confirmed_basis_hash: string | null;
  declined_at: string | null;
  manifest_id: string;
  presentation_ref: string;
  reason_codes: string[];
  user_confirmation_id: string;
};

export type CalculationUserConfirmationBuildInput = Partial<
  Omit<
    CalculationUserConfirmationRecord,
    | "artifact_type"
    | "calculation_basis_ref"
    | "calculation_id"
    | "manifest_id"
    | "user_confirmation_id"
  >
> & {
  calculation_basis_ref: string;
  calculation_id: string;
  manifest_id: string;
  user_confirmation_id?: string;
};

function defaultConfirmationId(input: {
  actor_ref: string;
  calculation_basis_ref: string;
  calculation_id: string;
  manifest_id: string;
}) {
  return defaultCalculationId([
    "calculation-user-confirmation",
    input.manifest_id,
    input.calculation_id,
    input.calculation_basis_ref.split("://").at(-1) ?? input.calculation_basis_ref,
    input.actor_ref,
  ]);
}

export function normalizeCalculationUserConfirmation(
  input: CalculationUserConfirmationRecord,
): CalculationUserConfirmationRecord {
  const confirmationState = assertEnum(
    "confirmation_state",
    input.confirmation_state,
    CALCULATION_CONFIRMATION_STATES,
  );
  const confirmation: CalculationUserConfirmationRecord = {
    actor_ref: requireString("actor_ref", input.actor_ref),
    actor_role: assertEnum("actor_role", input.actor_role, CALCULATION_CONFIRMATION_ACTOR_ROLES),
    artifact_type: "CalculationUserConfirmation",
    calculation_basis_ref: requireString("calculation_basis_ref", input.calculation_basis_ref),
    calculation_id: requireString("calculation_id", input.calculation_id),
    confirmation_state: confirmationState,
    confirmed_at: normalizeNullableCalculationTimestamp("confirmed_at", input.confirmed_at),
    confirmed_basis_hash: normalizeNullableString("confirmed_basis_hash", input.confirmed_basis_hash),
    declined_at: normalizeNullableCalculationTimestamp("declined_at", input.declined_at),
    manifest_id: requireString("manifest_id", input.manifest_id),
    presentation_ref: requireString("presentation_ref", input.presentation_ref),
    reason_codes: normalizeCalculationReasonCodes("reason_codes", input.reason_codes),
    user_confirmation_id: requireString("user_confirmation_id", input.user_confirmation_id),
  };

  if (confirmation.confirmation_state === "PENDING") {
    if (
      confirmation.confirmed_basis_hash !== null ||
      confirmation.confirmed_at !== null ||
      confirmation.declined_at !== null ||
      confirmation.reason_codes.length > 0
    ) {
      throw new AuthorityModelError(
        "AUTHORITY_CONTRACT_INVALID",
        "PENDING calculation confirmations must not expose confirmed hash, timestamps, or reason_codes",
      );
    }
  }

  if (confirmation.confirmation_state === "CONFIRMED") {
    requireNonNull("confirmed_basis_hash", confirmation.confirmed_basis_hash);
    requireNonNull("confirmed_at", confirmation.confirmed_at);
    if (confirmation.declined_at !== null || confirmation.reason_codes.length > 0) {
      throw new AuthorityModelError(
        "AUTHORITY_CONTRACT_INVALID",
        "CONFIRMED calculation confirmations require empty reason_codes and null declined_at",
      );
    }
  }

  if (confirmation.confirmation_state === "DECLINED") {
    if (confirmation.confirmed_basis_hash !== null || confirmation.confirmed_at !== null) {
      throw new AuthorityModelError(
        "AUTHORITY_CONTRACT_INVALID",
        "DECLINED calculation confirmations must never expose confirmed_basis_hash",
      );
    }
    requireNonNull("declined_at", confirmation.declined_at);
    if (confirmation.reason_codes.length === 0) {
      throw new AuthorityModelError(
        "AUTHORITY_CONTRACT_INVALID",
        "DECLINED calculation confirmations must retain reason_codes",
      );
    }
  }

  if (confirmation.reason_codes.length > 0 && confirmation.confirmation_state !== "DECLINED") {
    throw new AuthorityModelError(
      "AUTHORITY_CONTRACT_INVALID",
      "non-empty confirmation reason_codes imply DECLINED",
    );
  }
  return confirmation;
}

export function buildCalculationUserConfirmation(
  input: CalculationUserConfirmationBuildInput,
): CalculationUserConfirmationRecord {
  const actorRef = input.actor_ref ?? "client://subject";
  const confirmationState = input.confirmation_state ?? "PENDING";
  return normalizeCalculationUserConfirmation({
    actor_ref: actorRef,
    actor_role: input.actor_role ?? "CLIENT_SIGNATORY",
    artifact_type: "CalculationUserConfirmation",
    calculation_basis_ref: input.calculation_basis_ref,
    calculation_id: input.calculation_id,
    confirmation_state: confirmationState,
    confirmed_at: input.confirmed_at ?? null,
    confirmed_basis_hash: input.confirmed_basis_hash ?? null,
    declined_at: input.declined_at ?? null,
    manifest_id: input.manifest_id,
    presentation_ref: input.presentation_ref ?? `calculation-presentation://${input.calculation_id}`,
    reason_codes:
      input.reason_codes ??
      (confirmationState === "DECLINED" ? ["CALCULATION_BASIS_NOT_ACCEPTED"] : []),
    user_confirmation_id:
      input.user_confirmation_id ??
      defaultConfirmationId({
        actor_ref: actorRef,
        calculation_basis_ref: input.calculation_basis_ref,
        calculation_id: input.calculation_id,
        manifest_id: input.manifest_id,
      }),
  });
}

export { calculationUserConfirmationRef };

export function cloneCalculationUserConfirmation(record: CalculationUserConfirmationRecord) {
  return cloneCalculationRecord(record);
}

export function calculationUserConfirmationContentFingerprint(
  record: CalculationUserConfirmationRecord,
) {
  return hashObject(
    "CALCULATION_USER_CONFIRMATION_MODEL_V1",
    normalizeCalculationUserConfirmation(record),
  );
}
