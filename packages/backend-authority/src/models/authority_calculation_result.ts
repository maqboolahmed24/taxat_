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
  type AuthorityCalculationValidationOutcome,
  assertCalculationType,
  assertCalculationValidationOutcome,
  assertRetrievedBeforeSuperseded,
  authorityCalculationRef,
  cloneCalculationRecord,
  defaultCalculationId,
  deriveExactDecimalCalculationHash,
  normalizeCalculationReasonCodes,
  normalizeNullableCalculationTimestamp,
} from "./authority_calculation_common.ts";

export const AUTHORITY_CALCULATION_RESULT_STATES = [
  "MODELED",
  "RETRIEVED",
  "SUPERSEDED",
] as const;

export type AuthorityCalculationResultState =
  (typeof AUTHORITY_CALCULATION_RESULT_STATES)[number];

export type AuthorityCalculationResultRecord = {
  artifact_type: "AuthorityCalculationResult";
  authority_response_ref: string | null;
  calculation_hash: string | null;
  calculation_id: string;
  calculation_request_ref: string;
  calculation_type: AuthorityCalculationType;
  live_authority_call_executed: boolean;
  manifest_id: string;
  reason_codes: string[];
  result_state: AuthorityCalculationResultState;
  retrieved_at: string | null;
  retrieved_payload_ref: string | null;
  superseded_at: string | null;
  validation_outcome: AuthorityCalculationValidationOutcome;
};

export type AuthorityCalculationResultBuildInput = Partial<
  Omit<
    AuthorityCalculationResultRecord,
    | "artifact_type"
    | "calculation_id"
    | "calculation_request_ref"
    | "calculation_type"
    | "manifest_id"
  >
> & {
  calculation_id?: string;
  calculation_request_ref: string;
  calculation_type: AuthorityCalculationType;
  manifest_id: string;
  money_profile?: unknown;
  retrieved_payload?: unknown;
};

function defaultResultId(input: {
  calculation_request_ref: string;
  calculation_type: AuthorityCalculationType;
  manifest_id: string;
}) {
  return defaultCalculationId([
    "authority-calculation",
    input.manifest_id,
    input.calculation_type,
    input.calculation_request_ref.split("://").at(-1) ?? input.calculation_request_ref,
  ]);
}

export function normalizeAuthorityCalculationResult(
  input: AuthorityCalculationResultRecord,
): AuthorityCalculationResultRecord {
  const resultState = assertEnum("result_state", input.result_state, AUTHORITY_CALCULATION_RESULT_STATES);
  const validationOutcome = assertCalculationValidationOutcome(
    "validation_outcome",
    input.validation_outcome,
  );
  const result: AuthorityCalculationResultRecord = {
    artifact_type: "AuthorityCalculationResult",
    authority_response_ref: normalizeNullableString("authority_response_ref", input.authority_response_ref),
    calculation_hash: normalizeNullableString("calculation_hash", input.calculation_hash),
    calculation_id: requireString("calculation_id", input.calculation_id),
    calculation_request_ref: requireString("calculation_request_ref", input.calculation_request_ref),
    calculation_type: assertCalculationType("calculation_type", input.calculation_type),
    live_authority_call_executed: Boolean(input.live_authority_call_executed),
    manifest_id: requireString("manifest_id", input.manifest_id),
    reason_codes: normalizeCalculationReasonCodes("reason_codes", input.reason_codes),
    result_state: resultState,
    retrieved_at: normalizeNullableCalculationTimestamp("retrieved_at", input.retrieved_at),
    retrieved_payload_ref: normalizeNullableString("retrieved_payload_ref", input.retrieved_payload_ref),
    superseded_at: normalizeNullableCalculationTimestamp("superseded_at", input.superseded_at),
    validation_outcome: validationOutcome,
  };

  if (result.result_state === "MODELED") {
    if (result.live_authority_call_executed) {
      throw new AuthorityModelError(
        "AUTHORITY_CONTRACT_INVALID",
        "MODELED calculation results must not mark live_authority_call_executed",
      );
    }
    if (result.validation_outcome === "PASS") {
      throw new AuthorityModelError(
        "AUTHORITY_CONTRACT_INVALID",
        "MODELED calculation results must not serialize validation_outcome=PASS",
      );
    }
    for (const field of [
      "calculation_hash",
      "retrieved_payload_ref",
      "authority_response_ref",
      "retrieved_at",
      "superseded_at",
    ] as const) {
      if (result[field] !== null) {
        throw new AuthorityModelError(
          "AUTHORITY_CONTRACT_INVALID",
          `${field} must be null for MODELED calculation results`,
        );
      }
    }
  }

  if (result.result_state === "RETRIEVED") {
    if (!result.live_authority_call_executed) {
      throw new AuthorityModelError(
        "AUTHORITY_CONTRACT_INVALID",
        "RETRIEVED calculation results require live_authority_call_executed=true",
      );
    }
    requireNonNull("calculation_hash", result.calculation_hash);
    requireNonNull("retrieved_payload_ref", result.retrieved_payload_ref);
    requireNonNull("authority_response_ref", result.authority_response_ref);
    requireNonNull("retrieved_at", result.retrieved_at);
    if (result.superseded_at !== null) {
      throw new AuthorityModelError(
        "AUTHORITY_CONTRACT_INVALID",
        "RETRIEVED calculation results must not carry superseded_at",
      );
    }
  }

  if (result.result_state === "SUPERSEDED") {
    if (!result.live_authority_call_executed) {
      throw new AuthorityModelError(
        "AUTHORITY_CONTRACT_INVALID",
        "SUPERSEDED calculation results require live_authority_call_executed=true",
      );
    }
    requireNonNull("calculation_hash", result.calculation_hash);
    requireNonNull("retrieved_payload_ref", result.retrieved_payload_ref);
    requireNonNull("authority_response_ref", result.authority_response_ref);
    requireNonNull("retrieved_at", result.retrieved_at);
    requireNonNull("superseded_at", result.superseded_at);
  }

  if (result.validation_outcome === "PASS" && result.reason_codes.length > 0) {
    throw new AuthorityModelError(
      "AUTHORITY_CONTRACT_INVALID",
      "PASS calculation results must keep reason_codes empty",
    );
  }
  if (result.validation_outcome !== "PASS" && result.reason_codes.length === 0) {
    throw new AuthorityModelError(
      "AUTHORITY_CONTRACT_INVALID",
      "non-PASS calculation results must retain reason_codes",
    );
  }
  assertRetrievedBeforeSuperseded(result);
  return result;
}

export function buildAuthorityCalculationResult(
  input: AuthorityCalculationResultBuildInput,
): AuthorityCalculationResultRecord {
  const calculationType = assertCalculationType("calculation_type", input.calculation_type);
  const resultState = input.result_state ?? (input.live_authority_call_executed === false ? "MODELED" : "RETRIEVED");
  const liveAuthorityCallExecuted = input.live_authority_call_executed ?? resultState !== "MODELED";
  const calculationHash =
    input.calculation_hash ??
    (resultState === "MODELED"
      ? null
      : deriveExactDecimalCalculationHash({
          money_profile: input.money_profile ?? { profile: "GBP_2DP_EXACT_STRING" },
          payload: input.retrieved_payload ?? {},
        }));

  return normalizeAuthorityCalculationResult({
    artifact_type: "AuthorityCalculationResult",
    authority_response_ref:
      resultState === "MODELED"
        ? null
        : input.authority_response_ref ?? `authority-response://${input.calculation_id ?? "calculation"}`,
    calculation_hash: calculationHash,
    calculation_id:
      input.calculation_id ??
      defaultResultId({
        calculation_request_ref: input.calculation_request_ref,
        calculation_type: calculationType,
        manifest_id: input.manifest_id,
      }),
    calculation_request_ref: input.calculation_request_ref,
    calculation_type: calculationType,
    live_authority_call_executed: liveAuthorityCallExecuted,
    manifest_id: input.manifest_id,
    reason_codes:
      input.reason_codes ??
      (resultState === "MODELED"
        ? ["AUTHORITY_CALCULATION_MODELED"]
        : input.validation_outcome === "PASS" || input.validation_outcome === undefined
          ? []
          : ["AUTHORITY_CALCULATION_REVIEW_REQUIRED"]),
    result_state: resultState,
    retrieved_at: resultState === "MODELED" ? null : input.retrieved_at ?? "2026-04-29T12:00:00Z",
    retrieved_payload_ref:
      resultState === "MODELED"
        ? null
        : input.retrieved_payload_ref ?? `authority-calculation-payload://${input.calculation_id ?? "calculation"}`,
    superseded_at: input.superseded_at ?? null,
    validation_outcome: input.validation_outcome ?? (resultState === "MODELED" ? "HARD_BLOCK" : "PASS"),
  });
}

export function deriveAuthorityCalculationResultHash(input: {
  money_profile: unknown;
  payload: unknown;
}) {
  return deriveExactDecimalCalculationHash(input);
}

export { authorityCalculationRef };

export function cloneAuthorityCalculationResult(record: AuthorityCalculationResultRecord) {
  return cloneCalculationRecord(record);
}

export function authorityCalculationResultContentFingerprint(record: AuthorityCalculationResultRecord) {
  return hashObject("AUTHORITY_CALCULATION_RESULT_MODEL_V1", normalizeAuthorityCalculationResult(record));
}
