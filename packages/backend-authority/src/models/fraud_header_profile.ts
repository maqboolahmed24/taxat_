import {
  AuthorityModelError,
  assertEnum,
  assertPositiveInteger,
  cloneRecord,
  hashObject,
  normalizeSortedStringSet,
  normalizeTimestamp,
  refFromId,
  requireString,
} from "./authority_common.ts";

export const HMRC_FRAUD_HEADER_CONNECTION_METHODS = [
  "BATCH_PROCESS_DIRECT",
  "DESKTOP_APP_DIRECT",
  "DESKTOP_APP_VIA_SERVER",
  "MOBILE_APP_DIRECT",
  "MOBILE_APP_VIA_SERVER",
  "OTHER_DIRECT",
  "OTHER_VIA_SERVER",
  "WEB_APP_VIA_SERVER",
] as const;

export const FRAUD_HEADER_VALUE_KINDS = [
  "SCALAR",
  "LIST",
  "KEY_VALUE_PAIRS",
  "LIST_OF_KEY_VALUE_PAIRS",
] as const;

export const FRAUD_HEADER_ENCODING_STRATEGIES = [
  "RAW",
  "PERCENT_ENCODE_VALUE",
  "PERCENT_ENCODE_LIST_ITEMS",
  "PERCENT_ENCODE_KV_COMPONENTS",
  "PERCENT_ENCODE_LIST_OF_KV_COMPONENTS",
] as const;

export const FRAUD_HEADER_SENSITIVE_VALUE_POLICIES = [
  "SUMMARY_ONLY_REPO_SAFE",
  "SUPPRESS_RAW_VALUE_IN_REPO_ARTIFACTS",
] as const;

export const FRAUD_HEADER_EXEMPTION_POLICIES = [
  "NOT_ALLOWED",
  "HMRC_AGREED_MISSING_FIELDS_ONLY",
] as const;

export type HmrcFraudHeaderConnectionMethod =
  (typeof HMRC_FRAUD_HEADER_CONNECTION_METHODS)[number];
export type FraudHeaderValueKind = (typeof FRAUD_HEADER_VALUE_KINDS)[number];
export type FraudHeaderEncodingStrategy = (typeof FRAUD_HEADER_ENCODING_STRATEGIES)[number];
export type FraudHeaderSensitiveValuePolicy =
  (typeof FRAUD_HEADER_SENSITIVE_VALUE_POLICIES)[number];
export type FraudHeaderExemptionPolicy = (typeof FRAUD_HEADER_EXEMPTION_POLICIES)[number];

export type FraudHeaderMissingDataPosture = {
  allowed_after_hmrc_agreement: boolean;
  evidence_requirement: string;
  serialization_when_missing: "FORBID" | "OMIT" | "EMPTY_STRING";
};

export type FraudHeaderFieldProfile = {
  collected_by: string;
  collection_timing:
    | "DEVICE_BOOT_OR_INSTALL"
    | "INTERACTION_TIME"
    | "PER_REQUEST"
    | "RELEASE_OR_DEPLOY_TIME";
  encoding_strategy: FraudHeaderEncodingStrategy;
  field_id: string;
  header_name: string;
  missing_data_posture: FraudHeaderMissingDataPosture;
  notes: string[];
  presence: "MANDATORY" | "CONDITIONALLY_UNAVAILABLE" | "OPTIONAL";
  sensitive_value_policy: FraudHeaderSensitiveValuePolicy;
  serialized_by: string;
  stability_expectation:
    | "STABLE_PER_INSTALL"
    | "STABLE_PER_RELEASE"
    | "REFRESH_PER_REQUEST"
    | "REFRESH_PER_INTERACTION";
  value_kind: FraudHeaderValueKind;
};

export type FraudHeaderProfile = {
  artifact_type: "FraudHeaderProfile";
  authority_name: string;
  authority_product_profiles: string[];
  capture_boundary: {
    device_context_capture_owner: string;
    header_serialization_owner: string;
    originating_surface: string;
    raw_value_persistence_policy: "REDACT_HIGH_RISK_VALUES_HASH_LOW_TRUST_STORAGE";
  };
  connection_method: HmrcFraudHeaderConnectionMethod;
  created_at: string;
  exemption_policy: FraudHeaderExemptionPolicy;
  fields: FraudHeaderFieldProfile[];
  fraud_header_profile_ref: string;
  operation_families: string[];
  operation_profile_refs: string[];
  profile_hash: string;
  profile_id: string;
  profile_version: "HMRC_FRAUD_HEADER_PROFILE_V1";
  provider_environments: ("SANDBOX" | "PRODUCTION")[];
  provider_id: "HMRC";
  required_for_operation: boolean;
  source_refs: string[];
  validation_required: boolean;
  validation_ttl_seconds: number;
};

export type FraudHeaderProfileBuildInput = Partial<
  Omit<
    FraudHeaderProfile,
    | "artifact_type"
    | "authority_product_profiles"
    | "fields"
    | "operation_families"
    | "operation_profile_refs"
    | "profile_hash"
    | "profile_version"
    | "provider_environments"
    | "provider_id"
    | "source_refs"
  >
> & {
  fields?: readonly Partial<FraudHeaderFieldProfile>[];
  profile_id: string;
  authority_product_profiles?: readonly string[];
  operation_families?: readonly string[];
  operation_profile_refs?: readonly string[];
  provider_environments?: readonly ("SANDBOX" | "PRODUCTION")[];
  source_refs?: readonly string[];
};

function normalizeHeaderName(value: unknown) {
  const headerName = requireString("header_name", value);
  if (!/^Gov-[A-Za-z0-9-]+$/.test(headerName)) {
    throw new AuthorityModelError(
      "AUTHORITY_FIELD_INVALID",
      "HMRC fraud-prevention header names must use the Gov-* header namespace",
    );
  }
  return headerName;
}

function normalizeMissingDataPosture(
  input: FraudHeaderMissingDataPosture | undefined,
): FraudHeaderMissingDataPosture {
  return {
    allowed_after_hmrc_agreement: input?.allowed_after_hmrc_agreement ?? false,
    evidence_requirement: requireString(
      "missing_data_posture.evidence_requirement",
      input?.evidence_requirement ?? "HMRC agreement required before omission",
    ),
    serialization_when_missing: assertEnum(
      "missing_data_posture.serialization_when_missing",
      input?.serialization_when_missing ?? "FORBID",
      ["FORBID", "OMIT", "EMPTY_STRING"] as const,
    ),
  };
}

function normalizeField(input: Partial<FraudHeaderFieldProfile>): FraudHeaderFieldProfile {
  return {
    collected_by: requireString("field.collected_by", input.collected_by ?? "taxat-runtime"),
    collection_timing: assertEnum(
      "field.collection_timing",
      input.collection_timing ?? "PER_REQUEST",
      [
        "DEVICE_BOOT_OR_INSTALL",
        "INTERACTION_TIME",
        "PER_REQUEST",
        "RELEASE_OR_DEPLOY_TIME",
      ] as const,
    ),
    encoding_strategy: assertEnum(
      "field.encoding_strategy",
      input.encoding_strategy ?? "RAW",
      FRAUD_HEADER_ENCODING_STRATEGIES,
    ),
    field_id: requireString("field.field_id", input.field_id ?? input.header_name),
    header_name: normalizeHeaderName(input.header_name),
    missing_data_posture: normalizeMissingDataPosture(input.missing_data_posture),
    notes: normalizeSortedStringSet("field.notes", input.notes ?? []),
    presence: assertEnum(
      "field.presence",
      input.presence ?? "MANDATORY",
      ["MANDATORY", "CONDITIONALLY_UNAVAILABLE", "OPTIONAL"] as const,
    ),
    sensitive_value_policy: assertEnum(
      "field.sensitive_value_policy",
      input.sensitive_value_policy ?? "SUPPRESS_RAW_VALUE_IN_REPO_ARTIFACTS",
      FRAUD_HEADER_SENSITIVE_VALUE_POLICIES,
    ),
    serialized_by: requireString("field.serialized_by", input.serialized_by ?? "backend-authority"),
    stability_expectation: assertEnum(
      "field.stability_expectation",
      input.stability_expectation ?? "REFRESH_PER_REQUEST",
      [
        "STABLE_PER_INSTALL",
        "STABLE_PER_RELEASE",
        "REFRESH_PER_REQUEST",
        "REFRESH_PER_INTERACTION",
      ] as const,
    ),
    value_kind: assertEnum("field.value_kind", input.value_kind ?? "SCALAR", FRAUD_HEADER_VALUE_KINDS),
  };
}

function sortFields(fields: readonly FraudHeaderFieldProfile[]) {
  return [...fields].sort((left, right) => left.header_name.localeCompare(right.header_name));
}

function profileHash(profile: Omit<FraudHeaderProfile, "profile_hash">) {
  return hashObject("FRAUD_HEADER_PROFILE_V1", profile);
}

export function normalizeFraudHeaderProfile(input: FraudHeaderProfile): FraudHeaderProfile {
  const withoutHash: Omit<FraudHeaderProfile, "profile_hash"> = {
    artifact_type: "FraudHeaderProfile",
    authority_name: requireString("authority_name", input.authority_name),
    authority_product_profiles: normalizeSortedStringSet(
      "authority_product_profiles",
      input.authority_product_profiles,
      { minItems: 1 },
    ),
    capture_boundary: {
      device_context_capture_owner: requireString(
        "capture_boundary.device_context_capture_owner",
        input.capture_boundary.device_context_capture_owner,
      ),
      header_serialization_owner: requireString(
        "capture_boundary.header_serialization_owner",
        input.capture_boundary.header_serialization_owner,
      ),
      originating_surface: requireString(
        "capture_boundary.originating_surface",
        input.capture_boundary.originating_surface,
      ),
      raw_value_persistence_policy: "REDACT_HIGH_RISK_VALUES_HASH_LOW_TRUST_STORAGE",
    },
    connection_method: assertEnum(
      "connection_method",
      input.connection_method,
      HMRC_FRAUD_HEADER_CONNECTION_METHODS,
    ),
    created_at: normalizeTimestamp("created_at", input.created_at),
    exemption_policy: assertEnum(
      "exemption_policy",
      input.exemption_policy,
      FRAUD_HEADER_EXEMPTION_POLICIES,
    ),
    fields: sortFields(input.fields.map(normalizeField)),
    fraud_header_profile_ref: requireString("fraud_header_profile_ref", input.fraud_header_profile_ref),
    operation_families: normalizeSortedStringSet("operation_families", input.operation_families, {
      minItems: 1,
    }),
    operation_profile_refs: normalizeSortedStringSet(
      "operation_profile_refs",
      input.operation_profile_refs,
    ),
    profile_id: requireString("profile_id", input.profile_id),
    profile_version: "HMRC_FRAUD_HEADER_PROFILE_V1",
    provider_environments: normalizeSortedStringSet(
      "provider_environments",
      input.provider_environments,
      { minItems: 1 },
    ).map((entry) => assertEnum("provider_environments", entry, ["SANDBOX", "PRODUCTION"] as const)),
    provider_id: "HMRC",
    required_for_operation: input.required_for_operation,
    source_refs: normalizeSortedStringSet("source_refs", input.source_refs, { minItems: 1 }),
    validation_required: input.validation_required,
    validation_ttl_seconds: assertPositiveInteger(
      "validation_ttl_seconds",
      input.validation_ttl_seconds,
    ),
  };
  const expectedHash = profileHash(withoutHash);
  if (input.profile_hash !== expectedHash) {
    throw new AuthorityModelError(
      "AUTHORITY_IDENTITY_INVALID",
      "fraud header profile_hash must match normalized profile content",
    );
  }
  return {
    ...withoutHash,
    profile_hash: expectedHash,
  };
}

export function buildFraudHeaderProfile(input: FraudHeaderProfileBuildInput): FraudHeaderProfile {
  const fields = input.fields?.length
    ? input.fields.map(normalizeField)
    : [
        normalizeField({
          field_id: "connection-method",
          header_name: "Gov-Client-Connection-Method",
          sensitive_value_policy: "SUMMARY_ONLY_REPO_SAFE",
          stability_expectation: "STABLE_PER_RELEASE",
        }),
        normalizeField({
          field_id: "public-ip",
          header_name: "Gov-Client-Public-IP",
        }),
        normalizeField({
          field_id: "public-port",
          header_name: "Gov-Client-Public-Port",
        }),
        normalizeField({
          field_id: "device-id",
          header_name: "Gov-Client-Device-ID",
          stability_expectation: "STABLE_PER_INSTALL",
        }),
      ];
  const withoutHash: Omit<FraudHeaderProfile, "profile_hash"> = {
    artifact_type: "FraudHeaderProfile",
    authority_name: input.authority_name ?? "HMRC",
    authority_product_profiles: normalizeSortedStringSet(
      "authority_product_profiles",
      input.authority_product_profiles ?? ["HMRC_ITSA", "HMRC_VAT"],
      { minItems: 1 },
    ),
    capture_boundary: input.capture_boundary ?? {
      device_context_capture_owner: "authorized-runtime",
      header_serialization_owner: "backend-authority",
      originating_surface: "taxat-authority-runtime",
      raw_value_persistence_policy: "REDACT_HIGH_RISK_VALUES_HASH_LOW_TRUST_STORAGE",
    },
    connection_method: assertEnum(
      "connection_method",
      input.connection_method ?? "WEB_APP_VIA_SERVER",
      HMRC_FRAUD_HEADER_CONNECTION_METHODS,
    ),
    created_at: normalizeTimestamp("created_at", input.created_at ?? new Date(0).toISOString()),
    exemption_policy: input.exemption_policy ?? "HMRC_AGREED_MISSING_FIELDS_ONLY",
    fields: sortFields(fields),
    fraud_header_profile_ref:
      input.fraud_header_profile_ref ?? fraudHeaderProfileRef(input.profile_id),
    operation_families: normalizeSortedStringSet(
      "operation_families",
      input.operation_families ?? [
        "AUTH_CREATE_OR_AMEND_DATA",
        "AUTH_DELETE_DATA",
        "AUTH_SUBMIT_FINAL_DECLARATION",
        "AUTH_SUBMIT_PERIODIC_UPDATE",
        "AUTH_SUBMIT_POST_FINALISATION_AMENDMENT",
      ],
      { minItems: 1 },
    ),
    operation_profile_refs: normalizeSortedStringSet(
      "operation_profile_refs",
      input.operation_profile_refs ?? [],
    ),
    profile_id: input.profile_id,
    profile_version: "HMRC_FRAUD_HEADER_PROFILE_V1",
    provider_environments: normalizeSortedStringSet(
      "provider_environments",
      input.provider_environments ?? ["SANDBOX", "PRODUCTION"],
      { minItems: 1 },
    ).map((entry) => assertEnum("provider_environments", entry, ["SANDBOX", "PRODUCTION"] as const)),
    provider_id: "HMRC",
    required_for_operation: input.required_for_operation ?? true,
    source_refs: normalizeSortedStringSet(
      "source_refs",
      input.source_refs ?? [
        "https://developer.service.hmrc.gov.uk/guides/fraud-prevention/",
        "https://developer.service.hmrc.gov.uk/api-documentation/docs/api/service/txm-fph-validator-api/1.0",
      ],
      { minItems: 1 },
    ),
    validation_required: input.validation_required ?? true,
    validation_ttl_seconds: assertPositiveInteger(
      "validation_ttl_seconds",
      input.validation_ttl_seconds ?? 15 * 60,
    ),
  };
  return {
    ...withoutHash,
    profile_hash: profileHash(withoutHash),
  };
}

export function fraudHeaderProfileRef(profile: Pick<FraudHeaderProfile, "profile_id"> | string) {
  return refFromId("fraud-header-profile", typeof profile === "string" ? profile : profile.profile_id);
}

export function cloneFraudHeaderProfile(profile: FraudHeaderProfile) {
  return cloneRecord(profile);
}

export function fraudHeaderProfileContentFingerprint(profile: FraudHeaderProfile) {
  return hashObject("FRAUD_HEADER_PROFILE_MODEL_V1", normalizeFraudHeaderProfile(profile));
}

export function fraudHeaderProfileMandatoryHeaders(profile: FraudHeaderProfile) {
  return profile.fields
    .filter((field) => field.presence === "MANDATORY")
    .map((field) => field.header_name)
    .sort();
}
