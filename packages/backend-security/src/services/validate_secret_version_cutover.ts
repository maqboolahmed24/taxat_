import { normalizeUtcInstantString } from "../../../domain-kernel/src/primitives/time.ts";
import {
  assertSecretVersion,
  normalizeSecretVersion,
  type SecretVersionRecord,
} from "../models/secret_version.ts";
import type { SecretVersionRepository } from "../repositories/secret_version_repository.ts";

export type SecretVersionCutoverValidation = {
  current_secret_version_id: string;
  cutover_state: "LEGAL_CUTOVER";
  lineage_ref: string;
  policy_profile_ref: string;
  rotation_started_at: string;
  successor_secret_version_id: string;
};

export type ValidateSecretVersionCutoverInput = {
  current: SecretVersionRecord;
  lineage_versions?: readonly SecretVersionRecord[];
  repository?: SecretVersionRepository;
  rotation_started_at: string;
  successor: SecretVersionRecord;
};

function assertSameLineage(current: SecretVersionRecord, successor: SecretVersionRecord) {
  assertSecretVersion(
    current.secret_version_id !== successor.secret_version_id,
    "SECRET_VERSION_LINEAGE_INVALID",
    "a SecretVersion cannot cut over to itself",
  );
  assertSecretVersion(
    current.lineage_ref === successor.lineage_ref,
    "SECRET_VERSION_LINEAGE_INVALID",
    "cutover must remain inside the same subject/client/scope lineage_ref",
  );
  assertSecretVersion(
    current.secret_class === successor.secret_class,
    "SECRET_VERSION_LINEAGE_INVALID",
    "cutover must preserve secret_class",
  );
  assertSecretVersion(
    current.policy_profile_ref === successor.policy_profile_ref,
    "SECRET_VERSION_LINEAGE_INVALID",
    "cutover must preserve policy_profile_ref",
  );
  assertSecretVersion(
    current.store_ref === successor.store_ref,
    "SECRET_VERSION_LINEAGE_INVALID",
    "cutover must preserve the governed store_ref boundary",
  );
}

function assertNoCycle(input: {
  current: SecretVersionRecord;
  lineage_versions: readonly SecretVersionRecord[];
  successor: SecretVersionRecord;
}) {
  const byId = new Map<string, SecretVersionRecord>();
  for (const record of input.lineage_versions) {
    byId.set(record.secret_version_id, normalizeSecretVersion(record));
  }
  byId.set(input.current.secret_version_id, input.current);
  byId.set(input.successor.secret_version_id, input.successor);

  const seen = new Set<string>([input.current.secret_version_id]);
  let nextId: string | null = input.successor.secret_version_id;
  while (nextId !== null) {
    assertSecretVersion(
      !seen.has(nextId),
      "SECRET_VERSION_LINEAGE_INVALID",
      `SecretVersion cutover creates a cyclical lineage at ${nextId}`,
    );
    seen.add(nextId);
    nextId = byId.get(nextId)?.superseded_by_secret_version_id ?? null;
  }
}

export async function validateSecretVersionCutover(
  input: ValidateSecretVersionCutoverInput,
): Promise<SecretVersionCutoverValidation> {
  const current = normalizeSecretVersion(input.current);
  const successor = normalizeSecretVersion(input.successor);
  const rotationStartedAt = normalizeUtcInstantString(input.rotation_started_at);
  assertSameLineage(current, successor);
  assertSecretVersion(
    current.rotation_state === "ACTIVE" || current.rotation_state === "ROTATING",
    "SECRET_VERSION_STATE_INVALID",
    "cutover source must be ACTIVE or ROTATING",
  );
  assertSecretVersion(
    successor.rotation_state === "ATTESTED" || successor.rotation_state === "ACTIVE",
    "SECRET_VERSION_STATE_INVALID",
    "cutover successor must be ATTESTED or ACTIVE",
  );
  assertSecretVersion(
    current.activated_at !== null,
    "SECRET_VERSION_STATE_INVALID",
    "cutover source requires activated_at",
  );
  assertSecretVersion(
    successor.attestation_ref !== null && successor.last_attested_at !== null,
    "SECRET_VERSION_ATTESTATION_INVALID",
    "cutover successor requires known attestation",
  );
  assertSecretVersion(
    Date.parse(rotationStartedAt) >= Date.parse(current.activated_at),
    "SECRET_VERSION_CHRONOLOGY_INVALID",
    "rotation_started_at must not be earlier than current activated_at",
  );
  if (successor.activated_at !== null) {
    assertSecretVersion(
      Date.parse(successor.activated_at) >= Date.parse(rotationStartedAt),
      "SECRET_VERSION_CHRONOLOGY_INVALID",
      "successor activated_at must not be earlier than rotation_started_at",
    );
  }
  const lineageVersions =
    input.lineage_versions ??
    (input.repository
      ? (await input.repository.listSecretVersionsByLineageRef(current.lineage_ref)).map(
          (stored) => stored.record,
        )
      : []);
  assertNoCycle({ current, lineage_versions: lineageVersions, successor });

  return {
    current_secret_version_id: current.secret_version_id,
    cutover_state: "LEGAL_CUTOVER",
    lineage_ref: current.lineage_ref,
    policy_profile_ref: current.policy_profile_ref,
    rotation_started_at: rotationStartedAt,
    successor_secret_version_id: successor.secret_version_id,
  };
}
