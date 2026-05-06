import { stableJsonHash } from "../../../domain-kernel/src/primitives/hash.ts";
import { normalizeUtcInstantString } from "../../../domain-kernel/src/primitives/time.ts";

export const SECRET_VERSION_ROTATION_STATES = [
  "ISSUED",
  "ATTESTED",
  "ACTIVE",
  "ROTATING",
  "RETIRED",
  "REVOKED",
] as const;

export type SecretVersionRotationState = (typeof SECRET_VERSION_ROTATION_STATES)[number];

export type SecretVersionRecord = {
  artifact_type: "SecretVersion";
  secret_version_id: string;
  secret_class: string;
  store_ref: string;
  key_version_ref: string;
  policy_profile_ref: string;
  lineage_ref: string;
  issued_at: string;
  expires_at: string | null;
  rotation_state: SecretVersionRotationState;
  last_attested_at: string | null;
  attestation_ref: string | null;
  activated_at: string | null;
  rotation_started_at: string | null;
  retired_at: string | null;
  revoked_at: string | null;
  revocation_reason_code: string | null;
  historical_read_window_until: string | null;
  superseded_by_secret_version_id: string | null;
};

export type SecretVersionInput = SecretVersionRecord;

export type BuildIssuedSecretVersionInput = {
  expires_at?: string | null;
  issued_at: string;
  key_version_ref: string;
  lineage_ref: string;
  policy_profile_ref: string;
  secret_class: string;
  secret_version_id: string;
  store_ref: string;
};

export type SecretVersionModelErrorCode =
  | "SECRET_VERSION_ATTESTATION_INVALID"
  | "SECRET_VERSION_CHRONOLOGY_INVALID"
  | "SECRET_VERSION_FIELD_INVALID"
  | "SECRET_VERSION_LINEAGE_INVALID"
  | "SECRET_VERSION_REPOSITORY_INVALID"
  | "SECRET_VERSION_RESOLUTION_INVALID"
  | "SECRET_VERSION_STATE_INVALID";

export class SecretVersionModelError extends Error {
  readonly code: SecretVersionModelErrorCode;

  constructor(code: SecretVersionModelErrorCode, detail: string) {
    super(`${code}: ${detail}`);
    this.name = "SecretVersionModelError";
    this.code = code;
  }
}

export function assertSecretVersion(
  condition: unknown,
  code: SecretVersionModelErrorCode,
  detail: string,
): asserts condition {
  if (!condition) {
    throw new SecretVersionModelError(code, detail);
  }
}

export function assertNonEmptySecretString(label: string, value: unknown) {
  assertSecretVersion(
    typeof value === "string" && value.length > 0,
    "SECRET_VERSION_FIELD_INVALID",
    `${label} must be a non-empty string`,
  );
  return value;
}

export function normalizeNullableSecretString(label: string, value: unknown) {
  if (value === null) {
    return null;
  }
  return assertNonEmptySecretString(label, value);
}

export function normalizeNullableSecretInstant(label: string, value: unknown) {
  if (value === null) {
    return null;
  }
  try {
    return normalizeUtcInstantString(value);
  } catch (error) {
    throw new SecretVersionModelError(
      "SECRET_VERSION_FIELD_INVALID",
      `${label} must be a valid timezone-qualified instant: ${String(error)}`,
    );
  }
}

export function uniqueSortedSecretStrings(
  label: string,
  values: readonly string[],
  options: { allow_empty: boolean } = { allow_empty: true },
) {
  assertSecretVersion(
    Array.isArray(values) && values.every((value) => typeof value === "string" && value.length > 0),
    "SECRET_VERSION_FIELD_INVALID",
    `${label} must contain only non-empty strings`,
  );
  const sorted = [...new Set(values)].sort((left, right) => left.localeCompare(right));
  assertSecretVersion(
    sorted.length === values.length,
    "SECRET_VERSION_FIELD_INVALID",
    `${label} must not contain duplicate values`,
  );
  assertSecretVersion(
    options.allow_empty || sorted.length > 0,
    "SECRET_VERSION_FIELD_INVALID",
    `${label} must not be empty`,
  );
  return sorted;
}

function normalizeRotationState(value: unknown) {
  assertSecretVersion(
    typeof value === "string" &&
      SECRET_VERSION_ROTATION_STATES.includes(value as SecretVersionRotationState),
    "SECRET_VERSION_FIELD_INVALID",
    `rotation_state must be one of ${SECRET_VERSION_ROTATION_STATES.join(", ")}`,
  );
  return value as SecretVersionRotationState;
}

function normalizeSecretClass(value: unknown) {
  const secretClass = assertNonEmptySecretString("secret_class", value);
  assertSecretVersion(
    /^[A-Z][A-Z0-9_]*$/.test(secretClass),
    "SECRET_VERSION_FIELD_INVALID",
    "secret_class must match ^[A-Z][A-Z0-9_]*$",
  );
  return secretClass;
}

function normalizeRequiredInstant(label: string, value: unknown) {
  try {
    return normalizeUtcInstantString(value);
  } catch (error) {
    throw new SecretVersionModelError(
      "SECRET_VERSION_FIELD_INVALID",
      `${label} must be a valid timezone-qualified instant: ${String(error)}`,
    );
  }
}

function assertNoRawSecretMaterial(input: SecretVersionInput) {
  const forbiddenKeys = new Set([
    "access_token",
    "bearer_token",
    "plaintext",
    "private_key",
    "raw_secret",
    "refresh_token",
    "secret_material",
  ]);
  for (const key of Object.keys(input as Record<string, unknown>)) {
    assertSecretVersion(
      !forbiddenKeys.has(key),
      "SECRET_VERSION_FIELD_INVALID",
      `${key} must never be persisted on SecretVersion`,
    );
  }
}

export function normalizeSecretVersion(input: SecretVersionInput): SecretVersionRecord {
  assertNoRawSecretMaterial(input);
  assertSecretVersion(
    input.artifact_type === "SecretVersion",
    "SECRET_VERSION_FIELD_INVALID",
    "artifact_type must be SecretVersion",
  );

  const record: SecretVersionRecord = {
    artifact_type: "SecretVersion",
    secret_version_id: assertNonEmptySecretString(
      "secret_version_id",
      input.secret_version_id,
    ),
    secret_class: normalizeSecretClass(input.secret_class),
    store_ref: assertNonEmptySecretString("store_ref", input.store_ref),
    key_version_ref: assertNonEmptySecretString("key_version_ref", input.key_version_ref),
    policy_profile_ref: assertNonEmptySecretString(
      "policy_profile_ref",
      input.policy_profile_ref,
    ),
    lineage_ref: assertNonEmptySecretString("lineage_ref", input.lineage_ref),
    issued_at: normalizeRequiredInstant("issued_at", input.issued_at),
    expires_at: normalizeNullableSecretInstant("expires_at", input.expires_at),
    rotation_state: normalizeRotationState(input.rotation_state),
    last_attested_at: normalizeNullableSecretInstant(
      "last_attested_at",
      input.last_attested_at,
    ),
    attestation_ref: normalizeNullableSecretString(
      "attestation_ref",
      input.attestation_ref,
    ),
    activated_at: normalizeNullableSecretInstant("activated_at", input.activated_at),
    rotation_started_at: normalizeNullableSecretInstant(
      "rotation_started_at",
      input.rotation_started_at,
    ),
    retired_at: normalizeNullableSecretInstant("retired_at", input.retired_at),
    revoked_at: normalizeNullableSecretInstant("revoked_at", input.revoked_at),
    revocation_reason_code: normalizeNullableSecretString(
      "revocation_reason_code",
      input.revocation_reason_code,
    ),
    historical_read_window_until: normalizeNullableSecretInstant(
      "historical_read_window_until",
      input.historical_read_window_until,
    ),
    superseded_by_secret_version_id: normalizeNullableSecretString(
      "superseded_by_secret_version_id",
      input.superseded_by_secret_version_id,
    ),
  };

  assertSecretVersionInvariants(record);
  return record;
}

export function buildIssuedSecretVersion(
  input: BuildIssuedSecretVersionInput,
): SecretVersionRecord {
  return normalizeSecretVersion({
    artifact_type: "SecretVersion",
    secret_version_id: input.secret_version_id,
    secret_class: input.secret_class,
    store_ref: input.store_ref,
    key_version_ref: input.key_version_ref,
    policy_profile_ref: input.policy_profile_ref,
    lineage_ref: input.lineage_ref,
    issued_at: input.issued_at,
    expires_at: input.expires_at ?? null,
    rotation_state: "ISSUED",
    last_attested_at: null,
    attestation_ref: null,
    activated_at: null,
    rotation_started_at: null,
    retired_at: null,
    revoked_at: null,
    revocation_reason_code: null,
    historical_read_window_until: null,
    superseded_by_secret_version_id: null,
  });
}

function epoch(value: string) {
  return Date.parse(value);
}

function assertAtOrAfter(label: string, candidate: string, floorLabel: string, floor: string) {
  assertSecretVersion(
    epoch(candidate) >= epoch(floor),
    "SECRET_VERSION_CHRONOLOGY_INVALID",
    `${label} must not be earlier than ${floorLabel}`,
  );
}

function assertLaterThan(label: string, candidate: string, floorLabel: string, floor: string) {
  assertSecretVersion(
    epoch(candidate) > epoch(floor),
    "SECRET_VERSION_CHRONOLOGY_INVALID",
    `${label} must be later than ${floorLabel}`,
  );
}

function assertNullField(
  record: SecretVersionRecord,
  field: keyof SecretVersionRecord,
  state: SecretVersionRotationState,
) {
  assertSecretVersion(
    record[field] === null,
    "SECRET_VERSION_STATE_INVALID",
    `${String(field)} must be null while rotation_state=${state}`,
  );
}

function assertStringField(
  record: SecretVersionRecord,
  field: keyof SecretVersionRecord,
  state: SecretVersionRotationState,
) {
  assertSecretVersion(
    typeof record[field] === "string" && String(record[field]).length > 0,
    "SECRET_VERSION_STATE_INVALID",
    `${String(field)} must be populated while rotation_state=${state}`,
  );
}

function assertAttestationPair(record: SecretVersionRecord) {
  assertSecretVersion(
    (record.last_attested_at === null) === (record.attestation_ref === null),
    "SECRET_VERSION_ATTESTATION_INVALID",
    "last_attested_at and attestation_ref must be populated or cleared together",
  );
}

function assertStatePosture(record: SecretVersionRecord) {
  const state = record.rotation_state;
  if (state === "ISSUED") {
    for (const field of [
      "last_attested_at",
      "attestation_ref",
      "activated_at",
      "rotation_started_at",
      "retired_at",
      "revoked_at",
      "revocation_reason_code",
      "historical_read_window_until",
      "superseded_by_secret_version_id",
    ] as const) {
      assertNullField(record, field, state);
    }
    return;
  }

  if (state === "ATTESTED") {
    assertStringField(record, "last_attested_at", state);
    assertStringField(record, "attestation_ref", state);
    for (const field of [
      "activated_at",
      "rotation_started_at",
      "retired_at",
      "revoked_at",
      "revocation_reason_code",
      "historical_read_window_until",
      "superseded_by_secret_version_id",
    ] as const) {
      assertNullField(record, field, state);
    }
    return;
  }

  if (state === "ACTIVE") {
    assertStringField(record, "last_attested_at", state);
    assertStringField(record, "attestation_ref", state);
    assertStringField(record, "activated_at", state);
    for (const field of [
      "rotation_started_at",
      "retired_at",
      "revoked_at",
      "revocation_reason_code",
      "historical_read_window_until",
      "superseded_by_secret_version_id",
    ] as const) {
      assertNullField(record, field, state);
    }
    return;
  }

  if (state === "ROTATING") {
    assertStringField(record, "last_attested_at", state);
    assertStringField(record, "attestation_ref", state);
    assertStringField(record, "activated_at", state);
    assertStringField(record, "rotation_started_at", state);
    for (const field of [
      "retired_at",
      "revoked_at",
      "revocation_reason_code",
      "historical_read_window_until",
      "superseded_by_secret_version_id",
    ] as const) {
      assertNullField(record, field, state);
    }
    return;
  }

  if (state === "RETIRED") {
    assertStringField(record, "last_attested_at", state);
    assertStringField(record, "attestation_ref", state);
    assertStringField(record, "activated_at", state);
    assertStringField(record, "rotation_started_at", state);
    assertStringField(record, "retired_at", state);
    assertStringField(record, "historical_read_window_until", state);
    assertStringField(record, "superseded_by_secret_version_id", state);
    assertNullField(record, "revoked_at", state);
    assertNullField(record, "revocation_reason_code", state);
    return;
  }

  assertStringField(record, "revoked_at", state);
  assertStringField(record, "revocation_reason_code", state);
  for (const field of [
    "activated_at",
    "rotation_started_at",
    "retired_at",
    "historical_read_window_until",
    "superseded_by_secret_version_id",
  ] as const) {
    assertNullField(record, field, state);
  }
}

export function assertSecretVersionInvariants(record: SecretVersionRecord) {
  assertAttestationPair(record);
  assertStatePosture(record);

  if (record.expires_at !== null) {
    assertLaterThan("expires_at", record.expires_at, "issued_at", record.issued_at);
  }
  if (record.last_attested_at !== null) {
    assertAtOrAfter(
      "last_attested_at",
      record.last_attested_at,
      "issued_at",
      record.issued_at,
    );
  }
  if (record.activated_at !== null) {
    assertSecretVersion(
      ["ACTIVE", "ROTATING", "RETIRED"].includes(record.rotation_state),
      "SECRET_VERSION_STATE_INVALID",
      "non-null activated_at must stay limited to ACTIVE, ROTATING, or RETIRED states",
    );
    assertAtOrAfter(
      "activated_at",
      record.activated_at,
      record.last_attested_at === null ? "issued_at" : "last_attested_at",
      record.last_attested_at ?? record.issued_at,
    );
  }
  if (record.rotation_started_at !== null) {
    assertSecretVersion(
      ["ROTATING", "RETIRED"].includes(record.rotation_state),
      "SECRET_VERSION_STATE_INVALID",
      "non-null rotation_started_at must stay limited to ROTATING or RETIRED states",
    );
    assertAtOrAfter(
      "rotation_started_at",
      record.rotation_started_at,
      "activated/attested/issued lifecycle floor",
      record.activated_at ?? record.last_attested_at ?? record.issued_at,
    );
  }
  if (record.retired_at !== null) {
    assertSecretVersion(
      record.rotation_state === "RETIRED",
      "SECRET_VERSION_STATE_INVALID",
      "non-null retired_at must force rotation_state=RETIRED",
    );
    assertAtOrAfter(
      "retired_at",
      record.retired_at,
      "rotating/active lifecycle floor",
      record.rotation_started_at ?? record.activated_at ?? record.last_attested_at ?? record.issued_at,
    );
  }
  if (record.revoked_at !== null) {
    assertSecretVersion(
      record.rotation_state === "REVOKED",
      "SECRET_VERSION_STATE_INVALID",
      "non-null revoked_at must force rotation_state=REVOKED",
    );
    assertAtOrAfter(
      "revoked_at",
      record.revoked_at,
      "latest established lifecycle timestamp",
      record.rotation_started_at ?? record.activated_at ?? record.last_attested_at ?? record.issued_at,
    );
  }
  if (record.revocation_reason_code !== null) {
    assertSecretVersion(
      record.rotation_state === "REVOKED",
      "SECRET_VERSION_STATE_INVALID",
      "non-null revocation_reason_code must force rotation_state=REVOKED",
    );
  }
  if (record.historical_read_window_until !== null) {
    assertSecretVersion(
      record.rotation_state === "RETIRED",
      "SECRET_VERSION_STATE_INVALID",
      "non-null historical_read_window_until must force rotation_state=RETIRED",
    );
    assertSecretVersion(
      record.retired_at !== null,
      "SECRET_VERSION_STATE_INVALID",
      "historical_read_window_until requires retired_at",
    );
    assertAtOrAfter(
      "historical_read_window_until",
      record.historical_read_window_until,
      "retired_at",
      record.retired_at,
    );
  }
  if (record.superseded_by_secret_version_id !== null) {
    assertSecretVersion(
      record.rotation_state === "RETIRED",
      "SECRET_VERSION_STATE_INVALID",
      "non-null superseded_by_secret_version_id must force rotation_state=RETIRED",
    );
    assertSecretVersion(
      record.superseded_by_secret_version_id !== record.secret_version_id,
      "SECRET_VERSION_LINEAGE_INVALID",
      "superseded_by_secret_version_id must not point back to secret_version_id",
    );
  }
}

export function cloneSecretVersion(record: SecretVersionRecord): SecretVersionRecord {
  return { ...record };
}

export function secretVersionContentHash(record: SecretVersionRecord) {
  return stableJsonHash(normalizeSecretVersion(record));
}

export function secretVersionCanonicalRef(record: SecretVersionRecord) {
  return `secret-version://${record.secret_version_id}`;
}
