import type { FraudHeaderCapture } from "../models/fraud_header_capture.ts";
import { buildFraudHeaderValidation, type FraudHeaderValidation } from "../models/fraud_header_validation.ts";
import type { FraudHeaderProfile } from "../models/fraud_header_profile.ts";
import type { HmrcFraudHeaderValidatorAdapter } from "./call_hmrc_test_fraud_headers_api.ts";
import { normalizeHmrcFraudHeaders } from "./normalize_hmrc_fraud_headers.ts";

export type HmrcFraudHeaderValidationMode = "OFFLINE_CONTRACT" | "HMRC_SANDBOX_VALIDATOR" | "FIXTURE_SANDBOX_VALIDATOR";

function validationIdFromHash(headerSetHash: string, captureRef: string, validatedAt: string) {
  return `hmrc-fph-validation-${headerSetHash.slice(0, 16)}-${captureRef.split("://").pop() ?? "capture"}-${validatedAt.replace(/[^0-9]/g, "").slice(0, 14)}`;
}

function expiresAt(validatedAt: string, ttlSeconds: number) {
  return new Date(Date.parse(validatedAt) + ttlSeconds * 1000).toISOString();
}

function finding(code: string, headerNames: readonly string[], message: string) {
  return {
    code,
    header_names: [...headerNames].sort(),
    message,
  };
}

export async function validateHmrcFraudHeaders(input: {
  adapter?: HmrcFraudHeaderValidatorAdapter;
  capture: FraudHeaderCapture;
  mode?: HmrcFraudHeaderValidationMode;
  profile: FraudHeaderProfile;
  raw_headers: Record<string, string | number | boolean | null | undefined>;
  sandbox_validator_response_ref_or_null?: string | null;
  validated_at: string;
}): Promise<FraudHeaderValidation> {
  const normalized = normalizeHmrcFraudHeaders({
    profile: input.profile,
    raw_headers: input.raw_headers,
  });
  const errors = normalized.missing_mandatory_header_names.map((headerName) =>
    finding("MISSING_MANDATORY_HEADER", [headerName], `${headerName} is required by the HMRC fraud-header profile.`),
  );
  if (normalized.invalid_reason_codes.includes("NON_ASCII_HEADER_VALUE")) {
    errors.push(
      finding(
        "NON_ASCII_HEADER_VALUE",
        normalized.ordered_header_names,
        "HMRC fraud-prevention header values must be US-ASCII or percent encoded.",
      ),
    );
  }
  if (normalized.header_set_hash !== input.capture.header_set_hash) {
    errors.push(
      finding(
        "CAPTURE_HEADER_SET_HASH_MISMATCH",
        normalized.ordered_header_names,
        "validation headers do not match the captured fraud-header set.",
      ),
    );
  }

  const mode = input.mode ?? "OFFLINE_CONTRACT";
  const warnings = [];
  let validatorSpecVersion: string | null = null;
  if (input.adapter !== undefined && errors.length === 0) {
    const response = await input.adapter.validateHeaders(normalized.normalized_headers);
    validatorSpecVersion = response.specVersion;
    for (const entry of response.errors) {
      errors.push(finding(entry.code, entry.headers, entry.message));
    }
    for (const entry of response.warnings) {
      warnings.push(finding(entry.code, entry.headers, entry.message));
    }
  }

  return buildFraudHeaderValidation({
    capture_fingerprint: input.capture.capture_fingerprint,
    capture_ref: input.capture.capture_ref,
    client_id: input.capture.client_id,
    expires_at: expiresAt(input.validated_at, input.profile.validation_ttl_seconds),
    fraud_header_profile_ref: input.profile.fraud_header_profile_ref,
    header_set_hash: normalized.header_set_hash,
    provider_environment: input.capture.provider_environment,
    sandbox_validator_response_ref_or_null: input.sandbox_validator_response_ref_or_null ?? null,
    subject_ref: input.capture.subject_ref,
    tenant_id: input.capture.tenant_id,
    validation_errors: errors,
    validation_id: validationIdFromHash(
      normalized.header_set_hash,
      input.capture.capture_ref,
      input.validated_at,
    ),
    validation_mode: mode,
    validation_reason_codes:
      errors.length > 0
        ? ["VALIDATION_FAILED"]
        : warnings.length > 0
          ? ["VALIDATED_WITH_WARNINGS"]
          : ["VALIDATED"],
    validation_warnings: warnings,
    validated_at: input.validated_at,
    validator_spec_version_or_null: validatorSpecVersion,
  });
}
