import { normalizeUtcInstantString } from "../../../domain-kernel/src/primitives/time.ts";
import {
  assertNonEmptySecretString,
  assertSecretVersion,
  normalizeSecretVersion,
  type SecretVersionRecord,
} from "../models/secret_version.ts";
import type { SecretVersionRepository } from "../repositories/secret_version_repository.ts";
import {
  attestAndActivateSecretVersion,
  type SecretVersionAttestationScope,
} from "./attest_secret_version.ts";
import { validateSecretVersionCutover } from "./validate_secret_version_cutover.ts";

export type StartSecretVersionRotationInput = {
  attestation_authority_ref: string;
  attestation_evidence_refs: readonly string[];
  attestation_scope?: SecretVersionAttestationScope;
  current: SecretVersionRecord;
  repository?: SecretVersionRepository;
  rotation_started_at: string;
  successor: SecretVersionRecord;
  successor_activated_at?: string;
  successor_attested_at: string;
};

export type RetireRotatedSecretVersionInput = {
  historical_read_window_until: string;
  repository?: SecretVersionRepository;
  retired_at: string;
  rotating: SecretVersionRecord;
  successor: SecretVersionRecord;
};

export type RevokeSecretVersionInput = {
  repository?: SecretVersionRepository;
  revoked_at: string;
  revocation_reason_code: string;
  secret_version: SecretVersionRecord;
};

function latestLifecycleFloor(record: SecretVersionRecord) {
  return [
    record.issued_at,
    record.last_attested_at,
    record.activated_at,
    record.rotation_started_at,
    record.retired_at,
  ]
    .filter((value): value is string => value !== null)
    .sort((left, right) => Date.parse(right) - Date.parse(left))[0];
}

export async function startSecretVersionRotation(input: StartSecretVersionRotationInput) {
  const current = normalizeSecretVersion(input.current);
  const rotationStartedAt = normalizeUtcInstantString(input.rotation_started_at);
  assertSecretVersion(
    current.rotation_state === "ACTIVE",
    "SECRET_VERSION_STATE_INVALID",
    "secret rotation must start from ACTIVE current version",
  );
  const activeSuccessor = attestAndActivateSecretVersion({
    activated_at: input.successor_activated_at ?? rotationStartedAt,
    attestation_authority_ref: input.attestation_authority_ref,
    attestation_evidence_refs: input.attestation_evidence_refs,
    attestation_scope: input.attestation_scope ?? "ROTATION_CANDIDATE",
    attested_at: input.successor_attested_at,
    secret_version: input.successor,
  });
  const cutover = await validateSecretVersionCutover({
    current,
    repository: input.repository,
    rotation_started_at: rotationStartedAt,
    successor: activeSuccessor,
  });
  const rotating = normalizeSecretVersion({
    ...current,
    rotation_state: "ROTATING",
    rotation_started_at: rotationStartedAt,
  });
  if (input.repository) {
    await input.repository.persistSecretVersion({ secret_version: rotating });
    await input.repository.persistSecretVersion({ secret_version: activeSuccessor });
  }
  return {
    active_successor: activeSuccessor,
    cutover,
    rotating,
  };
}

export async function retireRotatedSecretVersion(input: RetireRotatedSecretVersionInput) {
  const rotating = normalizeSecretVersion(input.rotating);
  const successor = normalizeSecretVersion(input.successor);
  const retiredAt = normalizeUtcInstantString(input.retired_at);
  const historicalReadWindowUntil = normalizeUtcInstantString(
    input.historical_read_window_until,
  );
  assertSecretVersion(
    rotating.rotation_state === "ROTATING",
    "SECRET_VERSION_STATE_INVALID",
    "only ROTATING versions may be retired after cutover",
  );
  assertSecretVersion(
    successor.rotation_state === "ACTIVE",
    "SECRET_VERSION_STATE_INVALID",
    "retirement requires the successor to be ACTIVE",
  );
  assertSecretVersion(
    Date.parse(historicalReadWindowUntil) >= Date.parse(retiredAt),
    "SECRET_VERSION_CHRONOLOGY_INVALID",
    "historical_read_window_until must not be earlier than retired_at",
  );
  await validateSecretVersionCutover({
    current: rotating,
    repository: input.repository,
    rotation_started_at: rotating.rotation_started_at ?? retiredAt,
    successor,
  });
  const retired = normalizeSecretVersion({
    ...rotating,
    rotation_state: "RETIRED",
    retired_at: retiredAt,
    historical_read_window_until: historicalReadWindowUntil,
    superseded_by_secret_version_id: successor.secret_version_id,
  });
  if (input.repository) {
    await input.repository.persistSecretVersion({ secret_version: retired });
  }
  return retired;
}

export async function revokeSecretVersion(input: RevokeSecretVersionInput) {
  const secretVersion = normalizeSecretVersion(input.secret_version);
  const revokedAt = normalizeUtcInstantString(input.revoked_at);
  const reasonCode = assertNonEmptySecretString(
    "revocation_reason_code",
    input.revocation_reason_code,
  );
  const lifecycleFloor = latestLifecycleFloor(secretVersion);
  assertSecretVersion(
    Date.parse(revokedAt) >= Date.parse(lifecycleFloor),
    "SECRET_VERSION_CHRONOLOGY_INVALID",
    "revoked_at must not be earlier than the latest established lifecycle timestamp",
  );
  const revoked = normalizeSecretVersion({
    ...secretVersion,
    rotation_state: "REVOKED",
    activated_at: null,
    rotation_started_at: null,
    retired_at: null,
    revoked_at: revokedAt,
    revocation_reason_code: reasonCode,
    historical_read_window_until: null,
    superseded_by_secret_version_id: null,
  });
  if (input.repository) {
    await input.repository.persistSecretVersion({ secret_version: revoked });
  }
  return revoked;
}
