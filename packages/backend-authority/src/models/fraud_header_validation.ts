import {
  AuthorityModelError,
  assertEnum,
  cloneRecord,
  hashObject,
  normalizeNullableString,
  normalizeNullableTimestamp,
  normalizeSortedStringSet,
  normalizeTimestamp,
  refFromId,
  requireString,
} from "./authority_common.ts";

export const FRAUD_HEADER_VALIDATION_MODES = [
  "OFFLINE_CONTRACT",
  "HMRC_SANDBOX_VALIDATOR",
  "FIXTURE_SANDBOX_VALIDATOR",
] as const;

export const FRAUD_HEADER_VALIDATION_RESULTS = [
  "VALID",
  "WARNINGS",
  "INVALID",
  "EXEMPTED",
] as const;

export type FraudHeaderValidationMode = (typeof FRAUD_HEADER_VALIDATION_MODES)[number];
export type FraudHeaderValidationResult = (typeof FRAUD_HEADER_VALIDATION_RESULTS)[number];

export type FraudHeaderValidationFinding = {
  code: string;
  header_names: string[];
  message: string;
};

export type FraudHeaderValidation = {
  artifact_type: "FraudHeaderValidation";
  capture_fingerprint: string;
  capture_ref: string;
  client_id: string;
  expires_at: string | null;
  fraud_header_profile_ref: string;
  header_set_hash: string;
  provider_environment: "SANDBOX" | "PRODUCTION";
  result_code: FraudHeaderValidationResult;
  sandbox_validator_response_ref_or_null: string | null;
  subject_ref: string;
  tenant_id: string;
  validation_errors: FraudHeaderValidationFinding[];
  validation_hash: string;
  validation_id: string;
  validation_mode: FraudHeaderValidationMode;
  validation_ref: string;
  validation_reason_codes: string[];
  validation_warnings: FraudHeaderValidationFinding[];
  validated_at: string;
  validator_spec_version_or_null: string | null;
};

export type FraudHeaderValidationBuildInput = Partial<
  Omit<
    FraudHeaderValidation,
    | "artifact_type"
    | "validation_errors"
    | "validation_hash"
    | "validation_ref"
    | "validation_reason_codes"
    | "validation_warnings"
  >
> & {
  validation_id: string;
  validation_ref?: string;
  fraud_header_profile_ref: string;
  capture_ref: string;
  capture_fingerprint: string;
  header_set_hash: string;
  tenant_id: string;
  client_id: string;
  subject_ref: string;
  validation_errors?: readonly FraudHeaderValidationFinding[];
  validation_reason_codes?: readonly string[];
  validation_warnings?: readonly FraudHeaderValidationFinding[];
};

function normalizeFinding(input: FraudHeaderValidationFinding): FraudHeaderValidationFinding {
  return {
    code: requireString("validation_finding.code", input.code),
    header_names: normalizeSortedStringSet("validation_finding.header_names", input.header_names),
    message: requireString("validation_finding.message", input.message),
  };
}

function sortFindings(values: readonly FraudHeaderValidationFinding[]) {
  return [...values].map(normalizeFinding).sort((left, right) =>
    left.code.localeCompare(right.code) ||
    left.header_names.join(",").localeCompare(right.header_names.join(",")) ||
    left.message.localeCompare(right.message),
  );
}

function validationHash(validation: Omit<FraudHeaderValidation, "validation_hash">) {
  return hashObject("FRAUD_HEADER_VALIDATION_V1", validation);
}

export function normalizeFraudHeaderValidation(input: FraudHeaderValidation): FraudHeaderValidation {
  const resultCode = assertEnum(
    "result_code",
    input.result_code,
    FRAUD_HEADER_VALIDATION_RESULTS,
  );
  const errors = sortFindings(input.validation_errors);
  const warnings = sortFindings(input.validation_warnings);
  if (resultCode === "VALID" && errors.length > 0) {
    throw new AuthorityModelError(
      "AUTHORITY_CONTRACT_INVALID",
      "valid fraud-header validations must not retain validation_errors",
    );
  }
  if (resultCode === "INVALID" && errors.length === 0) {
    throw new AuthorityModelError(
      "AUTHORITY_CONTRACT_INVALID",
      "invalid fraud-header validations must retain validation_errors",
    );
  }
  if (resultCode === "WARNINGS" && warnings.length === 0) {
    throw new AuthorityModelError(
      "AUTHORITY_CONTRACT_INVALID",
      "warning fraud-header validations must retain validation_warnings",
    );
  }

  const withoutHash: Omit<FraudHeaderValidation, "validation_hash"> = {
    artifact_type: "FraudHeaderValidation",
    capture_fingerprint: requireString("capture_fingerprint", input.capture_fingerprint),
    capture_ref: requireString("capture_ref", input.capture_ref),
    client_id: requireString("client_id", input.client_id),
    expires_at: normalizeNullableTimestamp("expires_at", input.expires_at),
    fraud_header_profile_ref: requireString(
      "fraud_header_profile_ref",
      input.fraud_header_profile_ref,
    ),
    header_set_hash: requireString("header_set_hash", input.header_set_hash),
    provider_environment: assertEnum(
      "provider_environment",
      input.provider_environment,
      ["SANDBOX", "PRODUCTION"] as const,
    ),
    result_code: resultCode,
    sandbox_validator_response_ref_or_null: normalizeNullableString(
      "sandbox_validator_response_ref_or_null",
      input.sandbox_validator_response_ref_or_null,
    ),
    subject_ref: requireString("subject_ref", input.subject_ref),
    tenant_id: requireString("tenant_id", input.tenant_id),
    validation_errors: errors,
    validation_id: requireString("validation_id", input.validation_id),
    validation_mode: assertEnum(
      "validation_mode",
      input.validation_mode,
      FRAUD_HEADER_VALIDATION_MODES,
    ),
    validation_ref: requireString("validation_ref", input.validation_ref),
    validation_reason_codes: normalizeSortedStringSet(
      "validation_reason_codes",
      input.validation_reason_codes,
    ),
    validation_warnings: warnings,
    validated_at: normalizeTimestamp("validated_at", input.validated_at),
    validator_spec_version_or_null: normalizeNullableString(
      "validator_spec_version_or_null",
      input.validator_spec_version_or_null,
    ),
  };
  const expectedHash = validationHash(withoutHash);
  if (input.validation_hash !== expectedHash) {
    throw new AuthorityModelError(
      "AUTHORITY_IDENTITY_INVALID",
      "fraud header validation_hash must match normalized validation content",
    );
  }
  return {
    ...withoutHash,
    validation_hash: expectedHash,
  };
}

export function buildFraudHeaderValidation(
  input: FraudHeaderValidationBuildInput,
): FraudHeaderValidation {
  const errors = sortFindings(input.validation_errors ?? []);
  const warnings = sortFindings(input.validation_warnings ?? []);
  const resultCode =
    input.result_code ?? (errors.length > 0 ? "INVALID" : warnings.length > 0 ? "WARNINGS" : "VALID");
  const validatedAt = normalizeTimestamp("validated_at", input.validated_at ?? new Date(0).toISOString());
  const withoutHash: Omit<FraudHeaderValidation, "validation_hash"> = {
    artifact_type: "FraudHeaderValidation",
    capture_fingerprint: input.capture_fingerprint,
    capture_ref: input.capture_ref,
    client_id: input.client_id,
    expires_at: normalizeNullableTimestamp("expires_at", input.expires_at ?? null),
    fraud_header_profile_ref: input.fraud_header_profile_ref,
    header_set_hash: input.header_set_hash,
    provider_environment: assertEnum(
      "provider_environment",
      input.provider_environment ?? "SANDBOX",
      ["SANDBOX", "PRODUCTION"] as const,
    ),
    result_code: resultCode,
    sandbox_validator_response_ref_or_null: input.sandbox_validator_response_ref_or_null ?? null,
    subject_ref: input.subject_ref,
    tenant_id: input.tenant_id,
    validation_errors: errors,
    validation_id: input.validation_id,
    validation_mode: input.validation_mode ?? "OFFLINE_CONTRACT",
    validation_ref: input.validation_ref ?? fraudHeaderValidationRef(input.validation_id),
    validation_reason_codes: normalizeSortedStringSet(
      "validation_reason_codes",
      input.validation_reason_codes ??
        (resultCode === "VALID"
          ? ["VALIDATED"]
          : resultCode === "WARNINGS"
            ? ["VALIDATED_WITH_WARNINGS"]
            : resultCode === "EXEMPTED"
              ? ["EXEMPTION_DECLARED"]
              : ["VALIDATION_FAILED"]),
    ),
    validation_warnings: warnings,
    validated_at: validatedAt,
    validator_spec_version_or_null: input.validator_spec_version_or_null ?? null,
  };
  return {
    ...withoutHash,
    validation_hash: validationHash(withoutHash),
  };
}

export function fraudHeaderValidationRef(
  validation: Pick<FraudHeaderValidation, "validation_id"> | string,
) {
  return refFromId(
    "fraud-header-validation",
    typeof validation === "string" ? validation : validation.validation_id,
  );
}

export function cloneFraudHeaderValidation(validation: FraudHeaderValidation) {
  return cloneRecord(validation);
}

export function fraudHeaderValidationContentFingerprint(validation: FraudHeaderValidation) {
  return hashObject("FRAUD_HEADER_VALIDATION_MODEL_V1", normalizeFraudHeaderValidation(validation));
}
