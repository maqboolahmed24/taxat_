import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import {
  appendEvidenceRecord,
  createEvidenceManifest,
  type EvidenceManifest,
} from "../../../core/evidence_manifest.js";
import {
  assertLiveProviderGate,
  type RunContext,
} from "../../../core/run_context.js";
import {
  createPendingStep,
  transitionStep,
  type StepContract,
} from "../../../core/step_contract.js";
import {
  createFixtureFphValidatorClient,
  createHmrcFphValidatorClient,
  HMRC_FPH_CONNECTION_METHODS,
  HMRC_FPH_VALIDATE_PATH,
  HMRC_FPH_VALIDATION_FEEDBACK_PATH,
  type HmrcFphConnectionMethod,
  type HmrcFphResultCode,
  type HmrcFphValidateResponse,
  type HmrcFphValidationFeedbackResponse,
  type HmrcFphValidatorClient,
} from "../clients/fph_validator_client.js";

export const HMRC_FPH_VALIDATION_FLOW_ID =
  "sandbox-fraud-prevention-validation";

export const HMRC_FPH_VALIDATION_STEP_IDS = {
  loadProfiles: "hmrc.fph.load-profiles",
  validateWebProfile: "hmrc.fph.validate-web-profile",
  validateDesktopProfile: "hmrc.fph.validate-desktop-profile",
  persistArtifacts: "hmrc.fph.persist-artifacts",
} as const;

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

export type FraudHeaderValueKind = (typeof FRAUD_HEADER_VALUE_KINDS)[number];
export type FraudHeaderEncodingStrategy =
  (typeof FRAUD_HEADER_ENCODING_STRATEGIES)[number];

type Primitive = string | number | boolean;
type HeaderScalarInput = Primitive;
type HeaderListInput = Primitive[];
type HeaderKeyValueInput = Record<string, Primitive | null | undefined>;
type HeaderListOfKeyValueInput = HeaderKeyValueInput[];

export type FraudHeaderInput =
  | HeaderScalarInput
  | HeaderListInput
  | HeaderKeyValueInput
  | HeaderListOfKeyValueInput
  | null
  | undefined;

export interface SourceRef {
  source: string;
  rationale: string;
}

export interface FraudHeaderMissingDataPosture {
  allowed_after_hmrc_agreement: boolean;
  serialization_when_missing: "FORBID" | "OMIT" | "EMPTY_STRING";
  evidence_requirement: string;
}

export interface FraudHeaderFieldProfile {
  field_id: string;
  header_name: string;
  value_kind: FraudHeaderValueKind;
  presence: "MANDATORY" | "CONDITIONALLY_UNAVAILABLE";
  encoding_strategy: FraudHeaderEncodingStrategy;
  collection_timing:
    | "DEVICE_BOOT_OR_INSTALL"
    | "INTERACTION_TIME"
    | "PER_REQUEST"
    | "RELEASE_OR_DEPLOY_TIME";
  collected_by: string;
  serialized_by: string;
  stability_expectation:
    | "STABLE_PER_INSTALL"
    | "STABLE_PER_RELEASE"
    | "REFRESH_PER_REQUEST"
    | "REFRESH_PER_INTERACTION";
  sensitive_value_policy:
    | "SUMMARY_ONLY_REPO_SAFE"
    | "SUPPRESS_RAW_VALUE_IN_REPO_ARTIFACTS";
  missing_data_posture: FraudHeaderMissingDataPosture;
  notes: string[];
}

export interface FraudHeaderProfile {
  schema_version: "1.0";
  profile_id: string;
  provider_id: "hmrc-developer-hub";
  provider_display_name: "HMRC Developer Hub";
  fraud_header_profile_ref: string;
  connection_method: HmrcFphConnectionMethod;
  verified_on: string;
  validator_api: {
    base_url: string;
    validate_path: string;
    validation_feedback_path: string;
  };
  capture_boundary: {
    originating_surface: string;
    device_context_capture_owner: string;
    header_serialization_owner: string;
    raw_value_persistence_policy: string;
  };
  fields: FraudHeaderFieldProfile[];
  source_refs: SourceRef[];
  notes: string[];
}

export interface SandboxOAuthProfile {
  schema_version: "1.0";
  profile_id: string;
  provider_environment_target: "sandbox";
  verified_on: string;
  registered_callback_profile_refs: string[];
  scope_set_ref: string;
  scopes: string[];
  typed_gaps: string[];
}

export interface AuthorityProviderProfileCatalog {
  callback_profiles: Array<{
    callback_profile_ref: string;
    connection_method: HmrcFphConnectionMethod;
    environment_refs: string[];
    oauth_redirect_uri_pattern: string | null;
    owning_deployable_id: string;
    provider_ingress_uri_pattern: string | null;
  }>;
  profiles: Array<{
    api_key: string;
    profile_id: string;
    environment_ref: string;
    provider_environment: string;
    callback_profile_ref: string;
    connection_method: HmrcFphConnectionMethod;
    fraud_header_profile_ref: string;
    allowed_operation_family_refs: string[];
    oauth_scopes: string[];
  }>;
  typed_gaps: string[];
}

export interface FraudHeaderCaptureInput {
  capture_id: string;
  provenance: "SYNTHETIC_TEMPLATE" | "LIVE_CAPTURE";
  collected_at: string;
  values: Record<string, FraudHeaderInput>;
  notes: string[];
}

export interface SerializedFraudHeader {
  field_id: string;
  header_name: string;
  value: string | null;
  disposition: "SERIALIZED" | "OMITTED_BY_EXEMPTION" | "EMPTY_STRING";
}

export interface FraudHeaderValidationRecord {
  fraud_header_profile_ref: string;
  connection_method: HmrcFphConnectionMethod;
  execution_mode: "FIXTURE" | "LIVE_SANDBOX";
  capture_provenance: FraudHeaderCaptureInput["provenance"];
  validated_at: string;
  validator_validate_code: HmrcFphResultCode;
  validator_message: string;
  error_count: number;
  warning_count: number;
  validation_feedback_status:
    | "NOT_REQUESTED"
    | "RETRIEVED"
    | "DEFERRED_UNTIL_SANDBOX_TRAFFIC";
  validation_feedback_api_or_null: string | null;
  binding_row_refs: string[];
  header_name_refs: string[];
  serialized_header_count: number;
  omitted_header_names: string[];
  validator_evidence_refs: string[];
  typed_gaps: string[];
  notes: string[];
}

export interface FraudHeaderBindingRow {
  row_id: string;
  environment_ref: string;
  callback_profile_ref: string;
  connection_method: HmrcFphConnectionMethod;
  fraud_header_profile_ref: string;
  profile_config_ref_or_null: string | null;
  provider_profile_ids: string[];
  api_keys: string[];
  operation_family_refs: string[];
  oauth_scopes: string[];
  capture_owner: string;
  serialization_owner: string;
  callback_redirect_uri_pattern: string | null;
  provider_ingress_uri_pattern: string | null;
}

export interface HmrcFraudPreventionProfileMatrix {
  schema_version: "1.0";
  matrix_id: string;
  provider_id: "hmrc-developer-hub";
  provider_display_name: "HMRC Developer Hub";
  run_id: string;
  workspace_id: string;
  flow_id: typeof HMRC_FPH_VALIDATION_FLOW_ID;
  provider_environment_target: "sandbox";
  oauth_profile_ref: string;
  profile_refs: string[];
  registered_callback_profile_refs: string[];
  binding_rows: FraudHeaderBindingRow[];
  typed_gaps: string[];
  notes: string[];
  last_verified_at: string;
}

export interface HmrcSandboxProfileBindingEvidence {
  schema_version: "1.0";
  evidence_contract_id: string;
  provider_id: "hmrc-developer-hub";
  provider_display_name: "HMRC Developer Hub";
  run_id: string;
  workspace_id: string;
  flow_id: typeof HMRC_FPH_VALIDATION_FLOW_ID;
  provider_environment_target: "sandbox";
  oauth_profile_ref: string;
  validator_validate_path: string;
  validator_feedback_path: string;
  profile_validations: FraudHeaderValidationRecord[];
  typed_gaps: string[];
  notes: string[];
  last_verified_at: string;
}

export interface AuthoritySandboxSeedRow {
  seed_row_id: string;
  environment_ref: string;
  callback_profile_ref: string;
  connection_method: HmrcFphConnectionMethod;
  fraud_header_profile_ref: string;
  provider_profile_ids: string[];
  exercised_operation_family_refs: string[];
  validator_evidence_refs: string[];
  validated_now_edge_cases: string[];
  required_later_edge_cases: string[];
  readiness_posture:
    | "SEEDED_WITH_FRAUD_VALIDATION"
    | "DEFERRED_FOR_LATER_CARDS";
  notes: string[];
}

export interface HmrcAuthoritySandboxSeedMatrix {
  schema_version: "1.0";
  seed_matrix_id: string;
  provider_id: "hmrc-developer-hub";
  provider_display_name: "HMRC Developer Hub";
  run_id: string;
  workspace_id: string;
  flow_id: typeof HMRC_FPH_VALIDATION_FLOW_ID;
  provider_environment_target: "sandbox";
  enabled_provider_profile_refs: string[];
  exercised_operation_family_refs: string[];
  validated_now_edge_cases: string[];
  deferred_controlled_edge_cases: string[];
  rows: AuthoritySandboxSeedRow[];
  typed_gaps: string[];
  notes: string[];
  last_verified_at: string;
}

export interface ValidateFraudPreventionHeadersOptions {
  runContext: RunContext;
  profileMatrixPath: string;
  bindingEvidencePath: string;
  authoritySandboxSeedMatrixPath: string;
  oauthProfilePath?: string;
  authorityProviderProfileCatalogPath?: string;
  webProfilePath?: string;
  desktopProfilePath?: string;
  validatorClient?: HmrcFphValidatorClient;
  validatorAuthorizationToken?: string;
  feedbackApiIdentifier?: string | null;
  captureInputsByProfileRef?: Record<string, FraudHeaderCaptureInput>;
}

export interface ValidateFraudPreventionHeadersResult {
  outcome: "FRAUD_HEADERS_READY" | "FRAUD_HEADERS_HAVE_ERRORS";
  steps: StepContract[];
  evidenceManifest: EvidenceManifest;
  evidenceManifestPath: string;
  profileMatrix: HmrcFraudPreventionProfileMatrix;
  profileMatrixPath: string;
  bindingEvidence: HmrcSandboxProfileBindingEvidence;
  bindingEvidencePath: string;
  authoritySandboxSeedMatrix: HmrcAuthoritySandboxSeedMatrix;
  authoritySandboxSeedMatrixPath: string;
  notes: string[];
}

const REPO_RELATIVE_WEB_PROFILE =
  "config/authority/hmrc/fraud_profiles/hmrc_web_app_via_server.json";
const REPO_RELATIVE_DESKTOP_PROFILE =
  "config/authority/hmrc/fraud_profiles/hmrc_desktop_app_via_server.json";
const DEFAULT_CAPTURED_AT = "2026-04-18T12:00:00.000Z";
const CONTROLLED_EDGE_CASES = [
  "TOKEN_ROTATION",
  "BINDING_LINEAGE_INVALIDATION",
  "AMBIGUOUS_INGRESS_QUARANTINE",
  "DUPLICATE_BUCKET_CHANGE",
  "FRAUD_HEADER_VALIDATION",
  "RECONCILIATION_BUDGET_EXHAUSTION",
] as const;

function nowIso(): string {
  return new Date().toISOString();
}

async function readJsonFile<T>(filePath: string): Promise<T> {
  return JSON.parse(await readFile(filePath, "utf8")) as T;
}

async function readJsonUrl<T>(url: URL): Promise<T> {
  return JSON.parse(await readFile(url, "utf8")) as T;
}

async function persistJson(filePath: string, value: unknown): Promise<void> {
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function uniqueSorted(values: Iterable<unknown>): string[] {
  return [...new Set(values)]
    .filter((value): value is string | number | boolean => value != null)
    .map((value) => String(value))
    .sort((left, right) => left.localeCompare(right));
}

function repoDefaultUrl(relativePath: string): URL {
  return new URL(`../../../../../../${relativePath}`, import.meta.url);
}

function isConnectionMethod(value: string): value is HmrcFphConnectionMethod {
  return HMRC_FPH_CONNECTION_METHODS.includes(value as HmrcFphConnectionMethod);
}

function hasMeaningfulValue(value: FraudHeaderInput): boolean {
  if (value == null) {
    return false;
  }
  if (typeof value === "string") {
    return value.trim().length > 0;
  }
  if (typeof value === "number" || typeof value === "boolean") {
    return true;
  }
  if (Array.isArray(value)) {
    return value.length > 0;
  }
  return Object.values(value).some(
    (candidate) =>
      candidate != null &&
      (typeof candidate !== "string" || candidate.trim().length > 0),
  );
}

export function percentEncodeFraudHeaderComponent(value: Primitive): string {
  return encodeURIComponent(String(value));
}

function assertScalarValue(
  field: FraudHeaderFieldProfile,
  input: FraudHeaderInput,
): Primitive {
  if (
    typeof input === "string" ||
    typeof input === "number" ||
    typeof input === "boolean"
  ) {
    return input;
  }
  throw new Error(
    `Field ${field.field_id} expects a scalar value but received ${typeof input}.`,
  );
}

function assertListValue(
  field: FraudHeaderFieldProfile,
  input: FraudHeaderInput,
): Primitive[] {
  if (!Array.isArray(input)) {
    throw new Error(
      `Field ${field.field_id} expects a list value but received ${typeof input}.`,
    );
  }
  return input.map((item) => {
    if (
      typeof item === "string" ||
      typeof item === "number" ||
      typeof item === "boolean"
    ) {
      return item;
    }
    throw new Error(
      `Field ${field.field_id} expects primitive list items for HMRC serialization.`,
    );
  });
}

function assertKeyValueValue(
  field: FraudHeaderFieldProfile,
  input: FraudHeaderInput,
): HeaderKeyValueInput {
  if (!input || Array.isArray(input) || typeof input !== "object") {
    throw new Error(
      `Field ${field.field_id} expects key/value input but received ${typeof input}.`,
    );
  }
  return input;
}

function assertListOfKeyValueValue(
  field: FraudHeaderFieldProfile,
  input: FraudHeaderInput,
): HeaderListOfKeyValueInput {
  if (!Array.isArray(input)) {
    throw new Error(
      `Field ${field.field_id} expects a list of key/value inputs.`,
    );
  }
  return input.map((item) => assertKeyValueValue(field, item));
}

function serializeKeyValuePairs(
  input: HeaderKeyValueInput,
  encodeComponents: boolean,
): string {
  return Object.entries(input)
    .filter(([, value]) => value != null && String(value).length > 0)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, value]) => {
      const normalizedKey = encodeComponents
        ? percentEncodeFraudHeaderComponent(key)
        : key;
      const normalizedValue = encodeComponents
        ? percentEncodeFraudHeaderComponent(value as Primitive)
        : String(value);
      return `${normalizedKey}=${normalizedValue}`;
    })
    .join("&");
}

export function serializeFraudHeaderValue(
  field: FraudHeaderFieldProfile,
  input: FraudHeaderInput,
): string {
  switch (field.value_kind) {
    case "SCALAR": {
      const scalar = String(assertScalarValue(field, input));
      return field.encoding_strategy === "PERCENT_ENCODE_VALUE"
        ? percentEncodeFraudHeaderComponent(scalar)
        : scalar;
    }

    case "LIST": {
      const values = assertListValue(field, input);
      return values
        .map((value) =>
          field.encoding_strategy === "PERCENT_ENCODE_LIST_ITEMS"
            ? percentEncodeFraudHeaderComponent(value)
            : String(value),
        )
        .join(",");
    }

    case "KEY_VALUE_PAIRS":
      return serializeKeyValuePairs(
        assertKeyValueValue(field, input),
        field.encoding_strategy === "PERCENT_ENCODE_KV_COMPONENTS",
      );

    case "LIST_OF_KEY_VALUE_PAIRS":
      return assertListOfKeyValueValue(field, input)
        .map((entry) =>
          serializeKeyValuePairs(
            entry,
            field.encoding_strategy === "PERCENT_ENCODE_LIST_OF_KV_COMPONENTS",
          ),
        )
        .join(",");
  }
}

export function serializeMissingFraudHeader(
  field: FraudHeaderFieldProfile,
): SerializedFraudHeader | null {
  switch (field.missing_data_posture.serialization_when_missing) {
    case "FORBID":
      throw new Error(
        `Required HMRC fraud header ${field.header_name} (${field.field_id}) is missing.`,
      );
    case "OMIT":
      return null;
    case "EMPTY_STRING":
      return {
        field_id: field.field_id,
        header_name: field.header_name,
        value: "",
        disposition: "EMPTY_STRING",
      };
  }
}

export function buildSerializedFraudHeaders(
  profile: FraudHeaderProfile,
  capture: FraudHeaderCaptureInput,
): {
  headers: Record<string, string>;
  serializedFields: SerializedFraudHeader[];
  omittedHeaderNames: string[];
} {
  const serializedFields: SerializedFraudHeader[] = [];
  const omittedHeaderNames: string[] = [];

  for (const field of profile.fields) {
    const rawValue = capture.values[field.field_id];
    if (!hasMeaningfulValue(rawValue)) {
      const missing = serializeMissingFraudHeader(field);
      if (!missing) {
        omittedHeaderNames.push(field.header_name);
        continue;
      }
      serializedFields.push(missing);
      continue;
    }

    serializedFields.push({
      field_id: field.field_id,
      header_name: field.header_name,
      value: serializeFraudHeaderValue(field, rawValue),
      disposition: "SERIALIZED",
    });
  }

  return {
    headers: Object.fromEntries(
      serializedFields
        .filter((field) => field.value !== null)
        .map((field) => [field.header_name, field.value ?? ""]),
    ),
    serializedFields,
    omittedHeaderNames: uniqueSorted(omittedHeaderNames),
  };
}

function assertFraudHeaderProfile(profile: FraudHeaderProfile): void {
  if (!isConnectionMethod(profile.connection_method)) {
    throw new Error(
      `Unknown HMRC connection method ${profile.connection_method} in ${profile.profile_id}.`,
    );
  }

  const requiredHeaderNames = new Set(profile.fields.map((field) => field.header_name));
  if (!requiredHeaderNames.has("Gov-Client-Connection-Method")) {
    throw new Error(
      `Profile ${profile.profile_id} must include Gov-Client-Connection-Method.`,
    );
  }

  if (
    profile.connection_method === "WEB_APP_VIA_SERVER" &&
    !requiredHeaderNames.has("Gov-Client-Browser-JS-User-Agent")
  ) {
    throw new Error(
      `Web profile ${profile.profile_id} must include Gov-Client-Browser-JS-User-Agent.`,
    );
  }

  if (
    profile.connection_method === "DESKTOP_APP_VIA_SERVER" &&
    !requiredHeaderNames.has("Gov-Client-User-Agent")
  ) {
    throw new Error(
      `Desktop profile ${profile.profile_id} must include Gov-Client-User-Agent.`,
    );
  }
}

function buildSyntheticCaptureForProfile(
  profile: FraudHeaderProfile,
): FraudHeaderCaptureInput {
  const baseCommonValues: Record<string, FraudHeaderInput> = {
    gov_client_connection_method: profile.connection_method,
    gov_client_device_id:
      profile.connection_method === "WEB_APP_VIA_SERVER"
        ? "66fb6f1f-f1bb-4eef-a3b0-3cf013bfed1d"
        : "b0b2e0fd-f83b-4d3f-8d21-345db9cf53b4",
    gov_client_multi_factor: [
      {
        type: "TOTP",
        timestamp: "2026-04-18T11:58Z",
        "unique-reference":
          profile.connection_method === "WEB_APP_VIA_SERVER"
            ? "web-profile-totp-01"
            : "desktop-profile-totp-01",
      },
    ],
    gov_client_public_ip:
      profile.connection_method === "WEB_APP_VIA_SERVER"
        ? "198.51.100.23"
        : "198.51.100.41",
    gov_client_public_ip_timestamp: DEFAULT_CAPTURED_AT,
    gov_client_public_port:
      profile.connection_method === "WEB_APP_VIA_SERVER" ? "51000" : "51040",
    gov_client_screens: [
      {
        width: 2880,
        height: 1864,
        "scaling-factor": 2,
        "colour-depth": 24,
      },
    ],
    gov_client_timezone: "UTC+00:00",
    gov_client_user_ids:
      profile.connection_method === "WEB_APP_VIA_SERVER"
        ? {
            "taxat-operator": "ops.hmrc.fixture",
            session: "sandbox-web",
          }
        : {
            os: "fixture-user",
            session: "sandbox-desktop",
          },
    gov_client_window_size: { width: 1440, height: 1024 },
    gov_vendor_forwarded: [
      {
        by:
          profile.connection_method === "WEB_APP_VIA_SERVER"
            ? "203.0.113.10"
            : "203.0.113.20",
        for:
          profile.connection_method === "WEB_APP_VIA_SERVER"
            ? "198.51.100.23"
            : "198.51.100.41",
      },
    ],
    gov_vendor_license_ids:
      profile.connection_method === "WEB_APP_VIA_SERVER"
        ? {
            "taxat-operator-web":
              "b7a3c6309cf7d3d9c2763ef3f4eb9d7b7af6c7f35f2d0a15bb3e46c7ac6d9101",
          }
        : {
            "taxat-macos-operator":
              "61b24bb1f49be50fbc6c47bc30d9d1e0d41f8d782775ba56c824c60881fd80f4",
          },
    gov_vendor_product_name:
      profile.connection_method === "WEB_APP_VIA_SERVER"
        ? "Taxat Operator Web"
        : "Taxat Operator macOS",
    gov_vendor_public_ip:
      profile.connection_method === "WEB_APP_VIA_SERVER"
        ? "203.0.113.10"
        : "203.0.113.20",
    gov_vendor_version:
      profile.connection_method === "WEB_APP_VIA_SERVER"
        ? {
            "taxat-operator-web": "0.1.0-fixture",
            "taxat-authority-gateway": "0.1.0-fixture",
          }
        : {
            "taxat-macos-operator": "0.1.0-fixture",
            "taxat-authority-gateway": "0.1.0-fixture",
          },
  };

  if (profile.connection_method === "WEB_APP_VIA_SERVER") {
    baseCommonValues.gov_client_browser_js_user_agent =
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_4) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Safari/605.1.15";
  }

  if (profile.connection_method === "DESKTOP_APP_VIA_SERVER") {
    baseCommonValues.gov_client_local_ips = ["10.1.2.3", "10.3.4.2"];
    baseCommonValues.gov_client_local_ips_timestamp = DEFAULT_CAPTURED_AT;
    baseCommonValues.gov_client_mac_addresses = [
      "01:23:45:67:89:ab",
      "ab:89:67:45:23:01",
    ];
    baseCommonValues.gov_client_user_agent = {
      "os-family": "macOS",
      "os-version": "14.4",
      "device-manufacturer": "Apple",
      "device-model": "Mac14,15",
    };
  }

  return {
    capture_id: `${profile.fraud_header_profile_ref}.synthetic-capture`,
    provenance: "SYNTHETIC_TEMPLATE",
    collected_at: DEFAULT_CAPTURED_AT,
    values: baseCommonValues,
    notes: [
      "Synthetic capture for fixture-only structure and binding validation.",
      "Raw values are intentionally documentation-safe placeholders and must not be treated as live sandbox truth.",
    ],
  };
}

function getProfileConfigRef(profileRef: string): string | null {
  if (profileRef === "fph_web_app_via_server") {
    return REPO_RELATIVE_WEB_PROFILE;
  }
  if (profileRef === "fph_desktop_app_via_server") {
    return REPO_RELATIVE_DESKTOP_PROFILE;
  }
  return null;
}

function buildBindingRows(
  authorityCatalog: AuthorityProviderProfileCatalog,
  profileMap: Map<string, FraudHeaderProfile>,
): FraudHeaderBindingRow[] {
  const callbackProfileMap = new Map(
    authorityCatalog.callback_profiles.map((entry) => [
      entry.callback_profile_ref,
      entry,
    ]),
  );

  const relevantEnvironments = new Set([
    "env_shared_sandbox_integration",
    "env_preproduction_verification",
  ]);
  const groups = new Map<string, FraudHeaderBindingRow>();

  for (const profile of authorityCatalog.profiles) {
    if (!relevantEnvironments.has(profile.environment_ref)) {
      continue;
    }

    const callback = callbackProfileMap.get(profile.callback_profile_ref);
    const config = profileMap.get(profile.fraud_header_profile_ref);
    const key = [
      profile.environment_ref,
      profile.callback_profile_ref,
      profile.connection_method,
      profile.fraud_header_profile_ref,
    ].join("::");

    const existing = groups.get(key);
    if (existing) {
      existing.provider_profile_ids.push(profile.profile_id);
      existing.api_keys.push(profile.api_key);
      existing.operation_family_refs.push(...profile.allowed_operation_family_refs);
      existing.oauth_scopes.push(...profile.oauth_scopes);
      continue;
    }

    groups.set(key, {
      row_id: `binding.${profile.environment_ref}.${profile.connection_method.toLowerCase()}.${profile.fraud_header_profile_ref}`,
      environment_ref: profile.environment_ref,
      callback_profile_ref: profile.callback_profile_ref,
      connection_method: profile.connection_method,
      fraud_header_profile_ref: profile.fraud_header_profile_ref,
      profile_config_ref_or_null: getProfileConfigRef(profile.fraud_header_profile_ref),
      provider_profile_ids: [profile.profile_id],
      api_keys: [profile.api_key],
      operation_family_refs: [...profile.allowed_operation_family_refs],
      oauth_scopes: [...profile.oauth_scopes],
      capture_owner:
        config?.capture_boundary.device_context_capture_owner ??
        "DEFERRED_TO_LATER_PROFILE",
      serialization_owner:
        config?.capture_boundary.header_serialization_owner ??
        "CONTROLLED_AUTHORITY_GATEWAY",
      callback_redirect_uri_pattern: callback?.oauth_redirect_uri_pattern ?? null,
      provider_ingress_uri_pattern: callback?.provider_ingress_uri_pattern ?? null,
    });
  }

  return [...groups.values()]
    .map((row) => ({
      ...row,
      provider_profile_ids: uniqueSorted(row.provider_profile_ids),
      api_keys: uniqueSorted(row.api_keys),
      operation_family_refs: uniqueSorted(row.operation_family_refs),
      oauth_scopes: uniqueSorted(row.oauth_scopes),
    }))
    .sort((left, right) => left.row_id.localeCompare(right.row_id));
}

function buildProfileMatrix(
  runContext: RunContext,
  oauthProfile: SandboxOAuthProfile,
  bindingRows: FraudHeaderBindingRow[],
  authorityCatalog: AuthorityProviderProfileCatalog,
): HmrcFraudPreventionProfileMatrix {
  return {
    schema_version: "1.0",
    matrix_id: `hmrc-fph-profile-matrix-${runContext.workspaceId}`,
    provider_id: "hmrc-developer-hub",
    provider_display_name: "HMRC Developer Hub",
    run_id: runContext.runId,
    workspace_id: runContext.workspaceId,
    flow_id: HMRC_FPH_VALIDATION_FLOW_ID,
    provider_environment_target: "sandbox",
    oauth_profile_ref: "config/authority/hmrc/oauth/hmrc_sandbox_oauth_profile.json",
    profile_refs: uniqueSorted(
      bindingRows.map((row) => row.fraud_header_profile_ref),
    ),
    registered_callback_profile_refs: uniqueSorted(
      oauthProfile.registered_callback_profile_refs,
    ),
    binding_rows: bindingRows,
    typed_gaps: uniqueSorted([
      ...authorityCatalog.typed_gaps,
      "Batch-process-direct HMRC profiles remain mapped but are deferred to later sandbox authority-gate work in this card.",
    ]),
    notes: [
      "Interactive web and desktop server-mediated profiles are executable in this card.",
      "The matrix intentionally covers exact environment, callback-profile, and operation-family breadth for later TV-91/TV-91A carry-forward.",
    ],
    last_verified_at: nowIso(),
  };
}

function buildValidationRecord(
  validation: {
    profile: FraudHeaderProfile;
    validateResponse: HmrcFphValidateResponse;
    feedbackResponse: HmrcFphValidationFeedbackResponse | null;
    capture: FraudHeaderCaptureInput;
    serializedHeaderCount: number;
    omittedHeaderNames: string[];
    bindingRows: FraudHeaderBindingRow[];
    evidenceRefs: string[];
  },
): FraudHeaderValidationRecord {
  return {
    fraud_header_profile_ref: validation.profile.fraud_header_profile_ref,
    connection_method: validation.profile.connection_method,
    execution_mode:
      validation.capture.provenance === "LIVE_CAPTURE" ? "LIVE_SANDBOX" : "FIXTURE",
    capture_provenance: validation.capture.provenance,
    validated_at: nowIso(),
    validator_validate_code: validation.validateResponse.code,
    validator_message: validation.validateResponse.message,
    error_count: validation.validateResponse.errors.length,
    warning_count: validation.validateResponse.warnings.length,
    validation_feedback_status: validation.feedbackResponse
      ? "RETRIEVED"
      : "DEFERRED_UNTIL_SANDBOX_TRAFFIC",
    validation_feedback_api_or_null: validation.feedbackResponse
      ? "requested-during-run"
      : null,
    binding_row_refs: validation.bindingRows.map((row) => row.row_id),
    header_name_refs: validation.profile.fields.map((field) => field.header_name),
    serialized_header_count: validation.serializedHeaderCount,
    omitted_header_names: validation.omittedHeaderNames,
    validator_evidence_refs: validation.evidenceRefs,
    typed_gaps: validation.feedbackResponse
      ? []
      : [
          "Validation-feedback retrieval remains deferred until later cards exercise real sandbox API traffic with the same enabled provider-profile set.",
        ],
    notes: [
      "Raw HMRC fraud-header values are intentionally omitted from repo-tracked evidence.",
      validation.capture.provenance === "LIVE_CAPTURE"
        ? "Validation used live captured values."
        : "Validation used a fixture-only synthetic capture to prove profile law, encoding, and binding shape without overclaiming full sandbox readiness.",
    ],
  };
}

function buildBindingEvidence(
  runContext: RunContext,
  validations: FraudHeaderValidationRecord[],
): HmrcSandboxProfileBindingEvidence {
  return {
    schema_version: "1.0",
    evidence_contract_id: `hmrc-sandbox-profile-binding-evidence-${runContext.workspaceId}`,
    provider_id: "hmrc-developer-hub",
    provider_display_name: "HMRC Developer Hub",
    run_id: runContext.runId,
    workspace_id: runContext.workspaceId,
    flow_id: HMRC_FPH_VALIDATION_FLOW_ID,
    provider_environment_target: "sandbox",
    oauth_profile_ref: "config/authority/hmrc/oauth/hmrc_sandbox_oauth_profile.json",
    validator_validate_path: HMRC_FPH_VALIDATE_PATH,
    validator_feedback_path: HMRC_FPH_VALIDATION_FEEDBACK_PATH,
    profile_validations: validations,
    typed_gaps: uniqueSorted(
      validations.flatMap((validation) => validation.typed_gaps),
    ),
    notes: [
      "This evidence contract is a seed for later authority-sandbox coverage, not a claim that TV-91 or TV-91A is complete.",
      "Only the fraud-header validation controlled edge is exercised now.",
    ],
    last_verified_at: nowIso(),
  };
}

function buildSeedMatrix(
  runContext: RunContext,
  bindingRows: FraudHeaderBindingRow[],
  validations: FraudHeaderValidationRecord[],
): HmrcAuthoritySandboxSeedMatrix {
  const validationByProfileRef = new Map(
    validations.map((validation) => [
      validation.fraud_header_profile_ref,
      validation,
    ]),
  );

  const rows: AuthoritySandboxSeedRow[] = bindingRows.map((row) => {
    const validation = validationByProfileRef.get(row.fraud_header_profile_ref);
    const validatedNow =
      validation?.validator_validate_code === "VALID_HEADERS" &&
      row.profile_config_ref_or_null !== null;

    return {
      seed_row_id: `authority-sandbox-seed.${row.row_id}`,
      environment_ref: row.environment_ref,
      callback_profile_ref: row.callback_profile_ref,
      connection_method: row.connection_method,
      fraud_header_profile_ref: row.fraud_header_profile_ref,
      provider_profile_ids: row.provider_profile_ids,
      exercised_operation_family_refs: row.operation_family_refs,
      validator_evidence_refs: validation?.validator_evidence_refs ?? [],
      validated_now_edge_cases: validatedNow ? ["FRAUD_HEADER_VALIDATION"] : [],
      required_later_edge_cases: CONTROLLED_EDGE_CASES.filter(
        (edgeCase) => edgeCase !== "FRAUD_HEADER_VALIDATION" || !validatedNow,
      ),
      readiness_posture: validatedNow
        ? "SEEDED_WITH_FRAUD_VALIDATION"
        : "DEFERRED_FOR_LATER_CARDS",
      notes:
        row.profile_config_ref_or_null === null
          ? [
              "This provider profile stays mapped in the sandbox seed matrix, but executable profile config is deferred because this card only locks the active interactive web and desktop paths.",
            ]
          : [
              "Exact provider-profile and operation-family breadth is preserved for later authority-sandbox coverage assembly.",
            ],
    };
  });

  return {
    schema_version: "1.0",
    seed_matrix_id: `hmrc-authority-sandbox-seed-${runContext.workspaceId}`,
    provider_id: "hmrc-developer-hub",
    provider_display_name: "HMRC Developer Hub",
    run_id: runContext.runId,
    workspace_id: runContext.workspaceId,
    flow_id: HMRC_FPH_VALIDATION_FLOW_ID,
    provider_environment_target: "sandbox",
    enabled_provider_profile_refs: uniqueSorted(
      rows.flatMap((row) => row.provider_profile_ids),
    ),
    exercised_operation_family_refs: uniqueSorted(
      rows.flatMap((row) => row.exercised_operation_family_refs),
    ),
    validated_now_edge_cases: ["FRAUD_HEADER_VALIDATION"],
    deferred_controlled_edge_cases: CONTROLLED_EDGE_CASES.filter(
      (edgeCase) => edgeCase !== "FRAUD_HEADER_VALIDATION",
    ),
    rows,
    typed_gaps: [
      "Authority sandbox seed remains partial until later cards exercise token rotation, binding-lineage invalidation, ambiguous ingress quarantine, duplicate-bucket change, and reconciliation-budget exhaustion.",
    ],
    notes: [
      "The seed matrix preserves exact breadth for later candidate-bound authority_sandbox_coverage_contract assembly.",
      "Batch-process-direct profiles remain mapped but deferred.",
    ],
    last_verified_at: nowIso(),
  };
}

async function validateOneProfile(
  client: HmrcFphValidatorClient,
  profile: FraudHeaderProfile,
  capture: FraudHeaderCaptureInput,
  feedbackApiIdentifier: string | null,
): Promise<{
  validateResponse: HmrcFphValidateResponse;
  feedbackResponse: HmrcFphValidationFeedbackResponse | null;
  serializedHeaderCount: number;
  omittedHeaderNames: string[];
}> {
  const serialized = buildSerializedFraudHeaders(profile, capture);
  const validateResponse = await client.validateHeaders(serialized.headers);
  const feedbackResponse =
    feedbackApiIdentifier && capture.provenance === "LIVE_CAPTURE"
      ? await client.getValidationFeedback(feedbackApiIdentifier, {
          connectionMethod: profile.connection_method,
        })
      : null;

  return {
    validateResponse,
    feedbackResponse,
    serializedHeaderCount: serialized.serializedFields.length,
    omittedHeaderNames: serialized.omittedHeaderNames,
  };
}

export async function validateFraudPreventionHeaders(
  options: ValidateFraudPreventionHeadersOptions,
): Promise<ValidateFraudPreventionHeadersResult> {
  if (options.runContext.flowId !== HMRC_FPH_VALIDATION_FLOW_ID) {
    throw new Error(
      `RunContext flowId must be ${HMRC_FPH_VALIDATION_FLOW_ID} for HMRC fraud-prevention validation.`,
    );
  }

  if (options.runContext.executionMode !== "fixture") {
    assertLiveProviderGate(options.runContext);
  }

  const authorityCatalog =
    options.authorityProviderProfileCatalogPath == null
      ? await readJsonUrl<AuthorityProviderProfileCatalog>(
          repoDefaultUrl("data/analysis/authority_provider_profile_catalog.json"),
        )
      : await readJsonFile<AuthorityProviderProfileCatalog>(
          options.authorityProviderProfileCatalogPath,
        );
  const oauthProfile =
    options.oauthProfilePath == null
      ? await readJsonUrl<SandboxOAuthProfile>(
          repoDefaultUrl("config/authority/hmrc/oauth/hmrc_sandbox_oauth_profile.json"),
        )
      : await readJsonFile<SandboxOAuthProfile>(options.oauthProfilePath);
  const webProfile =
    options.webProfilePath == null
      ? await readJsonUrl<FraudHeaderProfile>(
          repoDefaultUrl(REPO_RELATIVE_WEB_PROFILE),
        )
      : await readJsonFile<FraudHeaderProfile>(options.webProfilePath);
  const desktopProfile =
    options.desktopProfilePath == null
      ? await readJsonUrl<FraudHeaderProfile>(
          repoDefaultUrl(REPO_RELATIVE_DESKTOP_PROFILE),
        )
      : await readJsonFile<FraudHeaderProfile>(options.desktopProfilePath);

  assertFraudHeaderProfile(webProfile);
  assertFraudHeaderProfile(desktopProfile);

  const profileMap = new Map<string, FraudHeaderProfile>([
    [webProfile.fraud_header_profile_ref, webProfile],
    [desktopProfile.fraud_header_profile_ref, desktopProfile],
  ]);
  const bindingRows = buildBindingRows(authorityCatalog, profileMap);
  const profileMatrix = buildProfileMatrix(
    options.runContext,
    oauthProfile,
    bindingRows,
    authorityCatalog,
  );

  const validatorClient =
    options.validatorClient ??
    (options.runContext.executionMode === "fixture"
      ? createFixtureFphValidatorClient()
      : createHmrcFphValidatorClient({
          authorizationToken:
            options.validatorAuthorizationToken ??
            process.env.HMRC_FPH_VALIDATOR_TOKEN ??
            (() => {
              throw new Error(
                "Live HMRC fraud-prevention validation requires validatorAuthorizationToken or HMRC_FPH_VALIDATOR_TOKEN.",
              );
            })(),
        }));

  const steps: StepContract[] = [];
  let evidenceManifest = createEvidenceManifest(options.runContext);

  let loadProfilesStep = transitionStep(
    createPendingStep({
      stepId: HMRC_FPH_VALIDATION_STEP_IDS.loadProfiles,
      title: "Load HMRC fraud-header profiles and current authority bindings",
      selectorRefs: ["fph_web_app_via_server", "fph_desktop_app_via_server"],
    }),
    "RUNNING",
    "Loading executable fraud-header profiles, sandbox OAuth posture, and current provider-profile bindings.",
  );
  steps.push(loadProfilesStep);

  loadProfilesStep = transitionStep(
    loadProfilesStep,
    "SUCCEEDED",
    "Fraud-header profiles, OAuth profile, and authority profile bindings loaded successfully.",
  );
  steps[0] = loadProfilesStep;
  evidenceManifest = appendEvidenceRecord(evidenceManifest, {
    evidenceId: `${loadProfilesStep.stepId}.note.1`,
    stepId: loadProfilesStep.stepId,
    kind: "NOTE",
    relativePath: null,
    captureMode: "REDACTED",
    summary:
      "Loaded the executable HMRC web-via-server and desktop-via-server fraud-header profiles and reconciled them against the sandbox OAuth profile plus active provider-profile bindings.",
    locatorRefs: loadProfilesStep.selectorRefs,
  });

  const profileValidations: FraudHeaderValidationRecord[] = [];
  let overallOutcome: ValidateFraudPreventionHeadersResult["outcome"] =
    "FRAUD_HEADERS_READY";

  for (const [stepId, profile] of [
    [HMRC_FPH_VALIDATION_STEP_IDS.validateWebProfile, webProfile],
    [HMRC_FPH_VALIDATION_STEP_IDS.validateDesktopProfile, desktopProfile],
  ] as const) {
    let step = transitionStep(
      createPendingStep({
        stepId,
        title: `Validate ${profile.connection_method} fraud-header profile`,
        selectorRefs: [profile.fraud_header_profile_ref, profile.connection_method],
      }),
      "RUNNING",
      `Serializing ${profile.connection_method} HMRC fraud headers and validating them against the configured validator transport.`,
    );
    steps.push(step);

    const capture =
      options.captureInputsByProfileRef?.[profile.fraud_header_profile_ref] ??
      buildSyntheticCaptureForProfile(profile);
    const validationResult = await validateOneProfile(
      validatorClient,
      profile,
      capture,
      options.feedbackApiIdentifier ?? null,
    );
    const rowMatches = bindingRows.filter(
      (row) => row.fraud_header_profile_ref === profile.fraud_header_profile_ref,
    );

    const evidenceSummary =
      `${profile.connection_method} validation returned ${validationResult.validateResponse.code}; ` +
      `serialized=${validationResult.serializedHeaderCount}, errors=${validationResult.validateResponse.errors.length}, ` +
      `warnings=${validationResult.validateResponse.warnings.length}, omitted=${validationResult.omittedHeaderNames.length}. Raw header values were suppressed.`;
    const evidenceId = `${step.stepId}.note.1`;
    evidenceManifest = appendEvidenceRecord(evidenceManifest, {
      evidenceId,
      stepId: step.stepId,
      kind: "NOTE",
      relativePath: null,
      captureMode: "REDACTED",
      summary: evidenceSummary,
      locatorRefs: step.selectorRefs,
    });

    const validationRecord = buildValidationRecord({
      profile,
      validateResponse: validationResult.validateResponse,
      feedbackResponse: validationResult.feedbackResponse,
      capture,
      serializedHeaderCount: validationResult.serializedHeaderCount,
      omittedHeaderNames: validationResult.omittedHeaderNames,
      bindingRows: rowMatches,
      evidenceRefs: [`evidence://${options.runContext.runId}/${evidenceId}`],
    });
    profileValidations.push(validationRecord);

    if (validationResult.validateResponse.code === "INVALID_HEADERS") {
      step = transitionStep(
        step,
        "FAILED",
        `${profile.connection_method} fraud-header validation returned INVALID_HEADERS.`,
      );
      overallOutcome = "FRAUD_HEADERS_HAVE_ERRORS";
    } else {
      step = transitionStep(
        step,
        "SUCCEEDED",
        `${profile.connection_method} fraud-header validation completed with ${validationResult.validateResponse.code}.`,
      );
    }
    steps[steps.length - 1] = step;
  }

  let persistArtifactsStep = transitionStep(
    createPendingStep({
      stepId: HMRC_FPH_VALIDATION_STEP_IDS.persistArtifacts,
      title: "Persist sanitized fraud-header matrix, evidence, and authority-sandbox seed records",
    }),
    "RUNNING",
    "Writing the machine-readable fraud-header matrix, binding evidence, authority sandbox seed matrix, and evidence manifest.",
  );
  steps.push(persistArtifactsStep);

  const bindingEvidence = buildBindingEvidence(
    options.runContext,
    profileValidations,
  );
  const authoritySandboxSeedMatrix = buildSeedMatrix(
    options.runContext,
    bindingRows,
    profileValidations,
  );
  const evidenceManifestPath = options.bindingEvidencePath.replace(
    /\.json$/i,
    ".evidence_manifest.json",
  );

  await persistJson(options.profileMatrixPath, profileMatrix);
  await persistJson(options.bindingEvidencePath, bindingEvidence);
  await persistJson(
    options.authoritySandboxSeedMatrixPath,
    authoritySandboxSeedMatrix,
  );
  await persistJson(evidenceManifestPath, evidenceManifest);

  persistArtifactsStep = transitionStep(
    persistArtifactsStep,
    "SUCCEEDED",
    "Sanitized fraud-header artifacts and evidence manifest written successfully.",
  );
  steps[steps.length - 1] = persistArtifactsStep;

  return {
    outcome: overallOutcome,
    steps,
    evidenceManifest,
    evidenceManifestPath,
    profileMatrix,
    profileMatrixPath: options.profileMatrixPath,
    bindingEvidence,
    bindingEvidencePath: options.bindingEvidencePath,
    authoritySandboxSeedMatrix,
    authoritySandboxSeedMatrixPath: options.authoritySandboxSeedMatrixPath,
    notes: [
      "Interactive fraud-header profile law is now executable and machine-readable for HMRC sandbox bindings.",
      "Authority-sandbox seed evidence remains partial and intentionally defers the non-fraud controlled-edge cases to later cards.",
    ],
  };
}
