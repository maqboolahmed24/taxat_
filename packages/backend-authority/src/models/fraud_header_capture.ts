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
import type { HmrcFraudHeaderConnectionMethod } from "./fraud_header_profile.ts";

export const FRAUD_HEADER_CAPTURE_STATES = [
  "COMPLETE",
  "INCOMPLETE",
  "EXEMPTION_DECLARED",
] as const;

export const FRAUD_HEADER_VALUE_STORAGE_POLICIES = [
  "RAW_RETAINED_REPO_SAFE",
  "HASH_ONLY_HIGH_RISK",
  "SECURE_REF_ONLY",
] as const;

export type FraudHeaderCaptureState = (typeof FRAUD_HEADER_CAPTURE_STATES)[number];
export type FraudHeaderValueStoragePolicy =
  (typeof FRAUD_HEADER_VALUE_STORAGE_POLICIES)[number];

export type FraudHeaderStoredValue = {
  header_name: string;
  raw_value_or_null: string | null;
  redacted_value: string;
  storage_policy: FraudHeaderValueStoragePolicy;
  value_hash_or_null: string | null;
  value_present: boolean;
};

export type FraudHeaderCapture = {
  acting_party_ref: string;
  artifact_type: "FraudHeaderCapture";
  authority_name: string;
  authority_product_profile: string;
  capture_fingerprint: string;
  capture_id: string;
  capture_ref: string;
  capture_state: FraudHeaderCaptureState;
  captured_at: string;
  client_id: string;
  connection_method: HmrcFraudHeaderConnectionMethod;
  expires_at: string | null;
  fraud_header_profile_ref: string;
  header_set_hash: string;
  manifest_id: string;
  missing_header_names: string[];
  normalized_header_names: string[];
  operation_family: string;
  operation_profile: string;
  provider_environment: "SANDBOX" | "PRODUCTION";
  redacted_header_values: FraudHeaderStoredValue[];
  secure_payload_ref_or_null: string | null;
  subject_ref: string;
  tenant_id: string;
};

export type FraudHeaderCaptureBuildInput = Partial<
  Omit<
    FraudHeaderCapture,
    | "artifact_type"
    | "capture_fingerprint"
    | "capture_ref"
    | "missing_header_names"
    | "normalized_header_names"
    | "redacted_header_values"
  >
> & {
  capture_id: string;
  capture_ref?: string;
  fraud_header_profile_ref: string;
  header_set_hash: string;
  missing_header_names?: readonly string[];
  normalized_header_names?: readonly string[];
  redacted_header_values?: readonly FraudHeaderStoredValue[];
  tenant_id: string;
  client_id: string;
  subject_ref: string;
};

function normalizeStoredValue(input: FraudHeaderStoredValue): FraudHeaderStoredValue {
  const storagePolicy = assertEnum(
    "redacted_header_values.storage_policy",
    input.storage_policy,
    FRAUD_HEADER_VALUE_STORAGE_POLICIES,
  );
  const rawValue = normalizeNullableString(
    "redacted_header_values.raw_value_or_null",
    input.raw_value_or_null,
  );
  const valueHash = normalizeNullableString(
    "redacted_header_values.value_hash_or_null",
    input.value_hash_or_null,
  );
  if (storagePolicy !== "RAW_RETAINED_REPO_SAFE" && rawValue !== null) {
    throw new AuthorityModelError(
      "AUTHORITY_CONTRACT_INVALID",
      "high-risk fraud-header values must not retain raw_value_or_null in repository-safe capture records",
    );
  }
  if (input.value_present && valueHash === null) {
    throw new AuthorityModelError(
      "AUTHORITY_CONTRACT_INVALID",
      "present fraud-header values must retain a value hash even when raw storage is suppressed",
    );
  }
  return {
    header_name: requireString("redacted_header_values.header_name", input.header_name),
    raw_value_or_null: rawValue,
    redacted_value: requireString("redacted_header_values.redacted_value", input.redacted_value),
    storage_policy: storagePolicy,
    value_hash_or_null: valueHash,
    value_present: Boolean(input.value_present),
  };
}

function sortStoredValues(values: readonly FraudHeaderStoredValue[]) {
  return [...values].map(normalizeStoredValue).sort((left, right) =>
    left.header_name.localeCompare(right.header_name),
  );
}

function captureFingerprint(capture: Omit<FraudHeaderCapture, "capture_fingerprint">) {
  return hashObject("FRAUD_HEADER_CAPTURE_V1", capture);
}

export function normalizeFraudHeaderCapture(input: FraudHeaderCapture): FraudHeaderCapture {
  const captureState = assertEnum(
    "capture_state",
    input.capture_state,
    FRAUD_HEADER_CAPTURE_STATES,
  );
  const missingHeaderNames = normalizeSortedStringSet(
    "missing_header_names",
    input.missing_header_names,
  );
  if (captureState === "COMPLETE" && missingHeaderNames.length > 0) {
    throw new AuthorityModelError(
      "AUTHORITY_CONTRACT_INVALID",
      "complete fraud-header captures must not retain missing_header_names",
    );
  }
  if (captureState !== "COMPLETE" && missingHeaderNames.length === 0) {
    throw new AuthorityModelError(
      "AUTHORITY_CONTRACT_INVALID",
      "incomplete or exempted fraud-header captures must retain missing_header_names",
    );
  }

  const withoutFingerprint: Omit<FraudHeaderCapture, "capture_fingerprint"> = {
    acting_party_ref: requireString("acting_party_ref", input.acting_party_ref),
    artifact_type: "FraudHeaderCapture",
    authority_name: requireString("authority_name", input.authority_name),
    authority_product_profile: requireString(
      "authority_product_profile",
      input.authority_product_profile,
    ),
    capture_id: requireString("capture_id", input.capture_id),
    capture_ref: requireString("capture_ref", input.capture_ref),
    capture_state: captureState,
    captured_at: normalizeTimestamp("captured_at", input.captured_at),
    client_id: requireString("client_id", input.client_id),
    connection_method: requireString(
      "connection_method",
      input.connection_method,
    ) as HmrcFraudHeaderConnectionMethod,
    expires_at: normalizeNullableTimestamp("expires_at", input.expires_at),
    fraud_header_profile_ref: requireString(
      "fraud_header_profile_ref",
      input.fraud_header_profile_ref,
    ),
    header_set_hash: requireString("header_set_hash", input.header_set_hash),
    manifest_id: requireString("manifest_id", input.manifest_id),
    missing_header_names: missingHeaderNames,
    normalized_header_names: normalizeSortedStringSet(
      "normalized_header_names",
      input.normalized_header_names,
    ),
    operation_family: requireString("operation_family", input.operation_family),
    operation_profile: requireString("operation_profile", input.operation_profile),
    provider_environment: assertEnum(
      "provider_environment",
      input.provider_environment,
      ["SANDBOX", "PRODUCTION"] as const,
    ),
    redacted_header_values: sortStoredValues(input.redacted_header_values),
    secure_payload_ref_or_null: normalizeNullableString(
      "secure_payload_ref_or_null",
      input.secure_payload_ref_or_null,
    ),
    subject_ref: requireString("subject_ref", input.subject_ref),
    tenant_id: requireString("tenant_id", input.tenant_id),
  };
  const expectedFingerprint = captureFingerprint(withoutFingerprint);
  if (input.capture_fingerprint !== expectedFingerprint) {
    throw new AuthorityModelError(
      "AUTHORITY_IDENTITY_INVALID",
      "fraud header capture_fingerprint must match normalized capture content",
    );
  }
  return {
    ...withoutFingerprint,
    capture_fingerprint: expectedFingerprint,
  };
}

export function buildFraudHeaderCapture(input: FraudHeaderCaptureBuildInput): FraudHeaderCapture {
  const missingHeaderNames = normalizeSortedStringSet(
    "missing_header_names",
    input.missing_header_names ?? [],
  );
  const withoutFingerprint: Omit<FraudHeaderCapture, "capture_fingerprint"> = {
    acting_party_ref: input.acting_party_ref ?? input.subject_ref,
    artifact_type: "FraudHeaderCapture",
    authority_name: input.authority_name ?? "HMRC",
    authority_product_profile: input.authority_product_profile ?? "HMRC_ITSA",
    capture_id: input.capture_id,
    capture_ref: input.capture_ref ?? fraudHeaderCaptureRef(input.capture_id),
    capture_state:
      input.capture_state ?? (missingHeaderNames.length > 0 ? "INCOMPLETE" : "COMPLETE"),
    captured_at: normalizeTimestamp("captured_at", input.captured_at ?? new Date(0).toISOString()),
    client_id: input.client_id,
    connection_method: input.connection_method ?? "WEB_APP_VIA_SERVER",
    expires_at: input.expires_at ?? null,
    fraud_header_profile_ref: input.fraud_header_profile_ref,
    header_set_hash: input.header_set_hash,
    manifest_id: input.manifest_id ?? "manifest://fraud-header-capture",
    missing_header_names: missingHeaderNames,
    normalized_header_names: normalizeSortedStringSet(
      "normalized_header_names",
      input.normalized_header_names ?? [],
    ),
    operation_family: input.operation_family ?? "AUTH_SUBMIT_PERIODIC_UPDATE",
    operation_profile:
      input.operation_profile ?? `authority-operation-profile://${input.operation_family ?? "AUTH_SUBMIT_PERIODIC_UPDATE"}`,
    provider_environment: input.provider_environment ?? "SANDBOX",
    redacted_header_values: sortStoredValues(input.redacted_header_values ?? []),
    secure_payload_ref_or_null: input.secure_payload_ref_or_null ?? null,
    subject_ref: input.subject_ref,
    tenant_id: input.tenant_id,
  };
  return {
    ...withoutFingerprint,
    capture_fingerprint: captureFingerprint(withoutFingerprint),
  };
}

export function fraudHeaderCaptureRef(capture: Pick<FraudHeaderCapture, "capture_id"> | string) {
  return refFromId("fraud-header-capture", typeof capture === "string" ? capture : capture.capture_id);
}

export function cloneFraudHeaderCapture(capture: FraudHeaderCapture) {
  return cloneRecord(capture);
}

export function fraudHeaderCaptureContentFingerprint(capture: FraudHeaderCapture) {
  return hashObject("FRAUD_HEADER_CAPTURE_MODEL_V1", normalizeFraudHeaderCapture(capture));
}
