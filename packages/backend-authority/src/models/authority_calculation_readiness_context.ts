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
  authorityCalculationReadinessContextRef,
  cloneCalculationRecord,
  defaultCalculationId,
  normalizeCalculationReasonCodes,
  normalizeCalculationTimestamp,
} from "./authority_calculation_common.ts";
import { CALCULATION_CONFIRMATION_STATES } from "./calculation_user_confirmation.ts";

export const AUTHORITY_CALCULATION_CONTEXT_SCOPES = [
  "FILING_PREPARATION",
  "AMENDMENT_INTENT",
] as const;

export type AuthorityCalculationContextScope =
  (typeof AUTHORITY_CALCULATION_CONTEXT_SCOPES)[number];

export type AuthorityCalculationReadinessContextRecord = {
  artifact_type: "AuthorityCalculationReadinessContext";
  basis_hash: string | null;
  basis_status: "PROVISIONAL" | "CONFIRMED" | "REJECTED" | null;
  calculation_basis_ref: string | null;
  calculation_hash: string | null;
  calculation_id: string;
  calculation_readiness_context_id: string;
  calculation_request_ref: string;
  calculation_type: AuthorityCalculationType;
  confirmation_state: "PENDING" | "CONFIRMED" | "DECLINED" | null;
  context_scope: AuthorityCalculationContextScope;
  filing_reusable: boolean;
  live_authority_call_executed: boolean;
  manifest_id: string;
  owner_artifact_ref: string;
  owner_artifact_type: "FilingCase" | "AmendmentCase";
  parity_reusable: boolean;
  persisted_at: string;
  reason_codes: string[];
  request_state: "MODELED_ONLY" | "TRIGGERED" | "RETRIEVE_PENDING" | "RETRIEVED";
  result_state: "MODELED" | "RETRIEVED";
  user_confirmation_ref: string | null;
  validation_outcome: AuthorityCalculationValidationOutcome;
};

export type AuthorityCalculationReadinessContextBuildInput = Partial<
  Omit<
    AuthorityCalculationReadinessContextRecord,
    | "artifact_type"
    | "calculation_id"
    | "calculation_readiness_context_id"
    | "calculation_request_ref"
    | "calculation_type"
    | "context_scope"
    | "manifest_id"
    | "owner_artifact_ref"
    | "owner_artifact_type"
    | "persisted_at"
  >
> & {
  calculation_id: string;
  calculation_readiness_context_id?: string;
  calculation_request_ref: string;
  calculation_type: AuthorityCalculationType;
  context_scope?: AuthorityCalculationContextScope;
  manifest_id: string;
  owner_artifact_ref: string;
  owner_artifact_type?: "FilingCase" | "AmendmentCase";
  persisted_at: string;
};

function defaultReadinessContextId(input: {
  calculation_id: string;
  manifest_id: string;
  owner_artifact_ref: string;
}) {
  return defaultCalculationId([
    "authority-calculation-readiness-context",
    input.manifest_id,
    input.calculation_id,
    input.owner_artifact_ref.split("://").at(-1) ?? input.owner_artifact_ref,
  ]);
}

function expectedScope(calculationType: AuthorityCalculationType): AuthorityCalculationContextScope {
  return calculationType === "intent-to-amend" ? "AMENDMENT_INTENT" : "FILING_PREPARATION";
}

function expectedOwner(contextScope: AuthorityCalculationContextScope) {
  return contextScope === "AMENDMENT_INTENT" ? "AmendmentCase" : "FilingCase";
}

export function normalizeAuthorityCalculationReadinessContext(
  input: AuthorityCalculationReadinessContextRecord,
): AuthorityCalculationReadinessContextRecord {
  const calculationType = assertCalculationType("calculation_type", input.calculation_type);
  const contextScope = assertEnum(
    "context_scope",
    input.context_scope,
    AUTHORITY_CALCULATION_CONTEXT_SCOPES,
  );
  const context: AuthorityCalculationReadinessContextRecord = {
    artifact_type: "AuthorityCalculationReadinessContext",
    basis_hash: normalizeNullableString("basis_hash", input.basis_hash),
    basis_status:
      input.basis_status == null
        ? null
        : assertEnum("basis_status", input.basis_status, [
            "PROVISIONAL",
            "CONFIRMED",
            "REJECTED",
          ] as const),
    calculation_basis_ref: normalizeNullableString(
      "calculation_basis_ref",
      input.calculation_basis_ref,
    ),
    calculation_hash: normalizeNullableString("calculation_hash", input.calculation_hash),
    calculation_id: requireString("calculation_id", input.calculation_id),
    calculation_readiness_context_id: requireString(
      "calculation_readiness_context_id",
      input.calculation_readiness_context_id,
    ),
    calculation_request_ref: requireString("calculation_request_ref", input.calculation_request_ref),
    calculation_type: calculationType,
    confirmation_state:
      input.confirmation_state == null
        ? null
        : assertEnum("confirmation_state", input.confirmation_state, CALCULATION_CONFIRMATION_STATES),
    context_scope: contextScope,
    filing_reusable: Boolean(input.filing_reusable),
    live_authority_call_executed: Boolean(input.live_authority_call_executed),
    manifest_id: requireString("manifest_id", input.manifest_id),
    owner_artifact_ref: requireString("owner_artifact_ref", input.owner_artifact_ref),
    owner_artifact_type: assertEnum("owner_artifact_type", input.owner_artifact_type, [
      "FilingCase",
      "AmendmentCase",
    ] as const),
    parity_reusable: Boolean(input.parity_reusable),
    persisted_at: normalizeCalculationTimestamp("persisted_at", input.persisted_at),
    reason_codes: normalizeCalculationReasonCodes("reason_codes", input.reason_codes),
    request_state: assertEnum("request_state", input.request_state, [
      "MODELED_ONLY",
      "TRIGGERED",
      "RETRIEVE_PENDING",
      "RETRIEVED",
    ] as const),
    result_state: assertEnum("result_state", input.result_state, ["MODELED", "RETRIEVED"] as const),
    user_confirmation_ref: normalizeNullableString("user_confirmation_ref", input.user_confirmation_ref),
    validation_outcome: assertCalculationValidationOutcome(
      "validation_outcome",
      input.validation_outcome,
    ),
  };

  if (context.context_scope !== expectedScope(context.calculation_type)) {
    throw new AuthorityModelError(
      "AUTHORITY_CONTRACT_INVALID",
      "readiness context scope must match calculation_type",
    );
  }
  if (context.owner_artifact_type !== expectedOwner(context.context_scope)) {
    throw new AuthorityModelError(
      "AUTHORITY_CONTRACT_INVALID",
      "readiness context owner artifact type must match context_scope",
    );
  }
  if (!context.live_authority_call_executed) {
    if (
      context.request_state !== "MODELED_ONLY" ||
      context.result_state !== "MODELED" ||
      context.calculation_hash !== null ||
      context.calculation_basis_ref !== null ||
      context.basis_status !== null ||
      context.basis_hash !== null ||
      context.user_confirmation_ref !== null ||
      context.confirmation_state !== null ||
      context.parity_reusable ||
      context.filing_reusable ||
      context.validation_outcome === "PASS"
    ) {
      throw new AuthorityModelError(
        "AUTHORITY_CONTRACT_INVALID",
        "modeled readiness contexts must clear live hashes, confirmation, and reusable posture",
      );
    }
  }

  if (["PASS", "PASS_WITH_NOTICE"].includes(context.validation_outcome)) {
    if (
      context.request_state !== "RETRIEVED" ||
      context.result_state !== "RETRIEVED" ||
      !context.live_authority_call_executed ||
      context.basis_status !== "CONFIRMED" ||
      context.confirmation_state !== "CONFIRMED" ||
      (!context.parity_reusable && !context.filing_reusable)
    ) {
      throw new AuthorityModelError(
        "AUTHORITY_CONTRACT_INVALID",
        "PASS/PASS_WITH_NOTICE readiness requires live retrieved calculation, confirmed basis, confirmed user confirmation, and reusable posture",
      );
    }
    requireNonNull("calculation_hash", context.calculation_hash);
    requireNonNull("calculation_basis_ref", context.calculation_basis_ref);
    requireNonNull("basis_hash", context.basis_hash);
    requireNonNull("user_confirmation_ref", context.user_confirmation_ref);
  }

  if (context.validation_outcome === "PASS" && context.reason_codes.length > 0) {
    throw new AuthorityModelError(
      "AUTHORITY_CONTRACT_INVALID",
      "PASS readiness contexts must keep reason_codes empty",
    );
  }
  if (context.validation_outcome !== "PASS" && context.reason_codes.length === 0) {
    throw new AuthorityModelError(
      "AUTHORITY_CONTRACT_INVALID",
      "non-PASS readiness contexts must retain reason_codes",
    );
  }
  if ((context.parity_reusable || context.filing_reusable) && context.basis_status !== "CONFIRMED") {
    throw new AuthorityModelError(
      "AUTHORITY_CONTRACT_INVALID",
      "readiness reusable posture requires CONFIRMED basis_status",
    );
  }
  if (context.user_confirmation_ref !== null) {
    requireNonNull("calculation_basis_ref", context.calculation_basis_ref);
    requireNonNull("basis_hash", context.basis_hash);
    requireNonNull("confirmation_state", context.confirmation_state);
  }
  return context;
}

export function buildAuthorityCalculationReadinessContextRecord(
  input: AuthorityCalculationReadinessContextBuildInput,
): AuthorityCalculationReadinessContextRecord {
  const calculationType = assertCalculationType("calculation_type", input.calculation_type);
  const contextScope = input.context_scope ?? expectedScope(calculationType);
  const ownerArtifactType = input.owner_artifact_type ?? expectedOwner(contextScope);
  return normalizeAuthorityCalculationReadinessContext({
    artifact_type: "AuthorityCalculationReadinessContext",
    basis_hash: input.basis_hash ?? null,
    basis_status: input.basis_status ?? null,
    calculation_basis_ref: input.calculation_basis_ref ?? null,
    calculation_hash: input.calculation_hash ?? null,
    calculation_id: input.calculation_id,
    calculation_readiness_context_id:
      input.calculation_readiness_context_id ??
      defaultReadinessContextId({
        calculation_id: input.calculation_id,
        manifest_id: input.manifest_id,
        owner_artifact_ref: input.owner_artifact_ref,
      }),
    calculation_request_ref: input.calculation_request_ref,
    calculation_type: calculationType,
    confirmation_state: input.confirmation_state ?? null,
    context_scope: contextScope,
    filing_reusable: input.filing_reusable ?? false,
    live_authority_call_executed: input.live_authority_call_executed ?? false,
    manifest_id: input.manifest_id,
    owner_artifact_ref: input.owner_artifact_ref,
    owner_artifact_type: ownerArtifactType,
    parity_reusable: input.parity_reusable ?? false,
    persisted_at: input.persisted_at,
    reason_codes:
      input.reason_codes ??
      (input.validation_outcome === "PASS" ? [] : ["AUTHORITY_CALCULATION_NOT_READY"]),
    request_state: input.request_state ?? "MODELED_ONLY",
    result_state: input.result_state ?? "MODELED",
    user_confirmation_ref: input.user_confirmation_ref ?? null,
    validation_outcome: input.validation_outcome ?? "HARD_BLOCK",
  });
}

export { authorityCalculationReadinessContextRef };

export function cloneAuthorityCalculationReadinessContext(
  record: AuthorityCalculationReadinessContextRecord,
) {
  return cloneCalculationRecord(record);
}

export function authorityCalculationReadinessContextContentFingerprint(
  record: AuthorityCalculationReadinessContextRecord,
) {
  return hashObject(
    "AUTHORITY_CALCULATION_READINESS_CONTEXT_MODEL_V1",
    normalizeAuthorityCalculationReadinessContext(record),
  );
}
