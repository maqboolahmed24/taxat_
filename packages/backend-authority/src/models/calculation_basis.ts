import {
  AuthorityModelError,
  assertEnum,
  hashObject,
  normalizeNullableString,
  requireNonNull,
  requireString,
} from "./authority_common.ts";
import {
  type AuthorityCalculationType,
  assertBasisChronology,
  assertCalculationType,
  calculationBasisRef,
  cloneCalculationRecord,
  defaultCalculationId,
  deriveExactDecimalCalculationHash,
  normalizeCalculationReasonCodes,
  normalizeCalculationTimestamp,
  normalizeNullableCalculationTimestamp,
} from "./authority_calculation_common.ts";

export const CALCULATION_BASIS_STATUSES = [
  "PROVISIONAL",
  "CONFIRMED",
  "REJECTED",
  "SUPERSEDED",
] as const;

export type CalculationBasisStatus = (typeof CALCULATION_BASIS_STATUSES)[number];

export type CalculationBasisRecord = {
  artifact_type: "CalculationBasis";
  basis_hash: string;
  basis_payload_ref: string;
  basis_status: CalculationBasisStatus;
  basis_type: string;
  calculation_basis_id: string;
  calculation_id: string;
  calculation_request_ref: string;
  calculation_type: AuthorityCalculationType;
  captured_at: string;
  confirmed_at: string | null;
  filing_reusable: boolean;
  manifest_id: string;
  parity_reusable: boolean;
  reason_codes: string[];
  superseded_at: string | null;
  user_confirmation_ref: string | null;
};

export type CalculationBasisBuildInput = Partial<
  Omit<
    CalculationBasisRecord,
    | "artifact_type"
    | "calculation_basis_id"
    | "calculation_id"
    | "calculation_request_ref"
    | "calculation_type"
    | "captured_at"
    | "manifest_id"
  >
> & {
  basis_payload?: unknown;
  calculation_basis_id?: string;
  calculation_id: string;
  calculation_request_ref: string;
  calculation_type: AuthorityCalculationType;
  captured_at: string;
  manifest_id: string;
  money_profile?: unknown;
};

function defaultBasisId(input: {
  calculation_id: string;
  calculation_type: AuthorityCalculationType;
  manifest_id: string;
}) {
  return defaultCalculationId([
    "calculation-basis",
    input.manifest_id,
    input.calculation_type,
    input.calculation_id,
  ]);
}

export function normalizeCalculationBasis(input: CalculationBasisRecord): CalculationBasisRecord {
  const basisStatus = assertEnum("basis_status", input.basis_status, CALCULATION_BASIS_STATUSES);
  const capturedAt = normalizeCalculationTimestamp("captured_at", input.captured_at);
  const basis: CalculationBasisRecord = {
    artifact_type: "CalculationBasis",
    basis_hash: requireString("basis_hash", input.basis_hash),
    basis_payload_ref: requireString("basis_payload_ref", input.basis_payload_ref),
    basis_status: basisStatus,
    basis_type: requireString("basis_type", input.basis_type),
    calculation_basis_id: requireString("calculation_basis_id", input.calculation_basis_id),
    calculation_id: requireString("calculation_id", input.calculation_id),
    calculation_request_ref: requireString("calculation_request_ref", input.calculation_request_ref),
    calculation_type: assertCalculationType("calculation_type", input.calculation_type),
    captured_at: capturedAt,
    confirmed_at: normalizeNullableCalculationTimestamp("confirmed_at", input.confirmed_at),
    filing_reusable: Boolean(input.filing_reusable),
    manifest_id: requireString("manifest_id", input.manifest_id),
    parity_reusable: Boolean(input.parity_reusable),
    reason_codes: normalizeCalculationReasonCodes("reason_codes", input.reason_codes),
    superseded_at: normalizeNullableCalculationTimestamp("superseded_at", input.superseded_at),
    user_confirmation_ref: normalizeNullableString("user_confirmation_ref", input.user_confirmation_ref),
  };

  if (basis.basis_status !== "CONFIRMED") {
    if (basis.parity_reusable || basis.filing_reusable) {
      throw new AuthorityModelError(
        "AUTHORITY_CONTRACT_INVALID",
        "CalculationBasis reusable posture is legal only for basis_status=CONFIRMED",
      );
    }
  }

  if (basis.basis_status === "PROVISIONAL") {
    if (basis.user_confirmation_ref !== null || basis.confirmed_at !== null || basis.superseded_at !== null) {
      throw new AuthorityModelError(
        "AUTHORITY_CONTRACT_INVALID",
        "PROVISIONAL bases must not carry confirmation or supersession lineage",
      );
    }
  }

  if (basis.basis_status === "CONFIRMED") {
    requireNonNull("user_confirmation_ref", basis.user_confirmation_ref);
    requireNonNull("confirmed_at", basis.confirmed_at);
    if (!basis.parity_reusable && !basis.filing_reusable) {
      throw new AuthorityModelError(
        "AUTHORITY_CONTRACT_INVALID",
        "CONFIRMED bases must be reusable for parity or filing",
      );
    }
    if (basis.superseded_at !== null) {
      throw new AuthorityModelError(
        "AUTHORITY_CONTRACT_INVALID",
        "CONFIRMED bases must not carry superseded_at",
      );
    }
  }

  if (basis.basis_status === "REJECTED") {
    if (basis.user_confirmation_ref !== null || basis.confirmed_at !== null) {
      throw new AuthorityModelError(
        "AUTHORITY_CONTRACT_INVALID",
        "REJECTED bases must not carry confirmation lineage",
      );
    }
    if (basis.reason_codes.length === 0) {
      throw new AuthorityModelError(
        "AUTHORITY_CONTRACT_INVALID",
        "REJECTED bases must retain reason_codes",
      );
    }
  }

  if (basis.basis_status === "SUPERSEDED") {
    requireNonNull("superseded_at", basis.superseded_at);
  } else if (basis.superseded_at !== null) {
    throw new AuthorityModelError(
      "AUTHORITY_CONTRACT_INVALID",
      "superseded_at is legal only for SUPERSEDED bases",
    );
  }

  assertBasisChronology(basis);
  return basis;
}

export function buildCalculationBasisRecord(input: CalculationBasisBuildInput): CalculationBasisRecord {
  const calculationType = assertCalculationType("calculation_type", input.calculation_type);
  const basisStatus = input.basis_status ?? "PROVISIONAL";
  const basisHash =
    input.basis_hash ??
    deriveExactDecimalCalculationHash({
      money_profile: input.money_profile ?? { profile: "GBP_2DP_EXACT_STRING" },
      payload: input.basis_payload ?? {},
      profile: "CALCULATION_BASIS_EXACT_DECIMAL_V1",
    });

  return normalizeCalculationBasis({
    artifact_type: "CalculationBasis",
    basis_hash: basisHash,
    basis_payload_ref:
      input.basis_payload_ref ?? `calculation-basis-payload://${input.calculation_id}`,
    basis_status: basisStatus,
    basis_type: input.basis_type ?? "FINAL_DECLARATION_BASIS",
    calculation_basis_id:
      input.calculation_basis_id ??
      defaultBasisId({
        calculation_id: input.calculation_id,
        calculation_type: calculationType,
        manifest_id: input.manifest_id,
      }),
    calculation_id: input.calculation_id,
    calculation_request_ref: input.calculation_request_ref,
    calculation_type: calculationType,
    captured_at: input.captured_at,
    confirmed_at: input.confirmed_at ?? null,
    filing_reusable: input.filing_reusable ?? basisStatus === "CONFIRMED",
    manifest_id: input.manifest_id,
    parity_reusable: input.parity_reusable ?? basisStatus === "CONFIRMED",
    reason_codes:
      input.reason_codes ?? (basisStatus === "REJECTED" ? ["CALCULATION_BASIS_REJECTED"] : []),
    superseded_at: input.superseded_at ?? null,
    user_confirmation_ref: input.user_confirmation_ref ?? null,
  });
}

export function deriveCalculationBasisHash(input: {
  money_profile: unknown;
  payload: unknown;
}) {
  return deriveExactDecimalCalculationHash({
    ...input,
    profile: "CALCULATION_BASIS_EXACT_DECIMAL_V1",
  });
}

export { calculationBasisRef };

export function cloneCalculationBasis(record: CalculationBasisRecord) {
  return cloneCalculationRecord(record);
}

export function calculationBasisContentFingerprint(record: CalculationBasisRecord) {
  return hashObject("CALCULATION_BASIS_MODEL_V1", normalizeCalculationBasis(record));
}
