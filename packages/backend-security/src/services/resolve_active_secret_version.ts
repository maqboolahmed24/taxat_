import { normalizeUtcInstantString } from "../../../domain-kernel/src/primitives/time.ts";
import {
  assertSecretVersion,
  normalizeSecretVersion,
  type SecretVersionRecord,
  SecretVersionModelError,
} from "../models/secret_version.ts";
import type { SecretVersionRepository } from "../repositories/secret_version_repository.ts";

export type ResolveActiveSecretVersionInput = {
  at: string;
  lineage_ref: string;
  policy_profile_ref: string;
  repository: SecretVersionRepository;
  required_attestation_ref?: string;
  secret_class?: string;
};

export type ResolveHistoricalSecretVersionInput = {
  at: string;
  lineage_ref: string;
  policy_profile_ref: string;
  repository: SecretVersionRepository;
  secret_class?: string;
  secret_version_id?: string;
};

export type QueuedSecretVersionSendBinding = {
  explicit_rotation_successor_secret_version_id?: string | null;
  expected_attestation_ref?: string;
  expected_key_version_ref?: string;
  lineage_ref: string;
  policy_profile_ref: string;
  queued_secret_version_id: string;
  secret_class?: string;
};

export type QueuedSecretVersionSendRevalidationResult = {
  binding_lineage_ref: string;
  checked_at: string;
  policy_profile_ref: string;
  queued_secret_version_id: string;
  reason_code: "ACTIVE_VERSION_MATCH" | "EXPLICIT_ROTATION_SUCCESSOR_ACCEPTED";
  resolved_secret_version_id: string;
  send_revalidation_state: "CLEAR_TO_SEND";
};

function assertAttestedForUse(record: SecretVersionRecord, purpose: string) {
  assertSecretVersion(
    record.attestation_ref !== null && record.last_attested_at !== null,
    "SECRET_VERSION_ATTESTATION_INVALID",
    `${purpose} requires known attestation_ref and last_attested_at`,
  );
}

function assertNotExpiredForLiveUse(record: SecretVersionRecord, at: string) {
  assertSecretVersion(
    record.expires_at === null || Date.parse(at) < Date.parse(record.expires_at),
    "SECRET_VERSION_RESOLUTION_INVALID",
    `SecretVersion ${record.secret_version_id} is expired for live use`,
  );
}

function policyMatches(
  record: SecretVersionRecord,
  input: { policy_profile_ref: string; secret_class?: string },
) {
  return (
    record.policy_profile_ref === input.policy_profile_ref &&
    (input.secret_class === undefined || record.secret_class === input.secret_class)
  );
}

export async function resolveActiveSecretVersion(
  input: ResolveActiveSecretVersionInput,
): Promise<SecretVersionRecord> {
  const at = normalizeUtcInstantString(input.at);
  const candidates = (await input.repository.listSecretVersionsByLineageRef(input.lineage_ref))
    .map((stored) => normalizeSecretVersion(stored.record))
    .filter((record) => record.rotation_state === "ACTIVE" && policyMatches(record, input));
  if (candidates.length === 0) {
    throw new SecretVersionModelError(
      "SECRET_VERSION_RESOLUTION_INVALID",
      `no live ACTIVE SecretVersion found for lineage ${input.lineage_ref}`,
    );
  }
  if (candidates.length > 1) {
    throw new SecretVersionModelError(
      "SECRET_VERSION_RESOLUTION_INVALID",
      `ambiguous ACTIVE SecretVersion found for lineage ${input.lineage_ref}`,
    );
  }
  const active = candidates[0];
  assertAttestedForUse(active, "live active resolution");
  assertNotExpiredForLiveUse(active, at);
  if (input.required_attestation_ref !== undefined) {
    assertSecretVersion(
      active.attestation_ref === input.required_attestation_ref,
      "SECRET_VERSION_ATTESTATION_INVALID",
      "active SecretVersion attestation_ref does not match the required binding",
    );
  }
  return active;
}

export async function resolveHistoricalSecretVersion(
  input: ResolveHistoricalSecretVersionInput,
): Promise<SecretVersionRecord> {
  const at = normalizeUtcInstantString(input.at);
  const candidates = (await input.repository.listSecretVersionsByLineageRef(input.lineage_ref))
    .map((stored) => normalizeSecretVersion(stored.record))
    .filter(
      (record) =>
        record.rotation_state === "RETIRED" &&
        policyMatches(record, input) &&
        (input.secret_version_id === undefined ||
          record.secret_version_id === input.secret_version_id),
    )
    .filter(
      (record) =>
        record.retired_at !== null &&
        record.historical_read_window_until !== null &&
        Date.parse(at) >= Date.parse(record.retired_at) &&
        Date.parse(at) <= Date.parse(record.historical_read_window_until),
    );
  if (candidates.length === 0) {
    throw new SecretVersionModelError(
      "SECRET_VERSION_RESOLUTION_INVALID",
      "no retired SecretVersion is available inside an explicit historical-read window",
    );
  }
  if (candidates.length > 1) {
    throw new SecretVersionModelError(
      "SECRET_VERSION_RESOLUTION_INVALID",
      "historical SecretVersion read is ambiguous without an exact secret_version_id",
    );
  }
  const retired = candidates[0];
  assertAttestedForUse(retired, "historical read");
  return retired;
}

export async function validateQueuedAuthoritySecretVersionForSend(input: {
  binding: QueuedSecretVersionSendBinding;
  checked_at: string;
  repository: SecretVersionRepository;
}): Promise<QueuedSecretVersionSendRevalidationResult> {
  const checkedAt = normalizeUtcInstantString(input.checked_at);
  const queued = await input.repository.getSecretVersionById(
    input.binding.queued_secret_version_id,
  );
  if (queued === null) {
    throw new SecretVersionModelError(
      "SECRET_VERSION_RESOLUTION_INVALID",
      `queued SecretVersion ${input.binding.queued_secret_version_id} was not found`,
    );
  }
  const queuedRecord = normalizeSecretVersion(queued.record);
  assertSecretVersion(
    queuedRecord.lineage_ref === input.binding.lineage_ref &&
      queuedRecord.policy_profile_ref === input.binding.policy_profile_ref &&
      (input.binding.secret_class === undefined ||
        queuedRecord.secret_class === input.binding.secret_class),
    "SECRET_VERSION_LINEAGE_INVALID",
    "queued SecretVersion binding drifted from the persisted subject/client/scope lineage",
  );
  if (input.binding.expected_key_version_ref !== undefined) {
    assertSecretVersion(
      queuedRecord.key_version_ref === input.binding.expected_key_version_ref,
      "SECRET_VERSION_LINEAGE_INVALID",
      "queued SecretVersion key_version_ref drifted from the persisted send binding",
    );
  }
  if (input.binding.expected_attestation_ref !== undefined) {
    assertSecretVersion(
      queuedRecord.attestation_ref === input.binding.expected_attestation_ref,
      "SECRET_VERSION_ATTESTATION_INVALID",
      "queued SecretVersion attestation_ref drifted from the persisted send binding",
    );
  }

  const active = await resolveActiveSecretVersion({
    at: checkedAt,
    lineage_ref: input.binding.lineage_ref,
    policy_profile_ref: input.binding.policy_profile_ref,
    repository: input.repository,
    secret_class: input.binding.secret_class,
  });
  if (active.secret_version_id === queuedRecord.secret_version_id) {
    return {
      binding_lineage_ref: active.lineage_ref,
      checked_at: checkedAt,
      policy_profile_ref: active.policy_profile_ref,
      queued_secret_version_id: queuedRecord.secret_version_id,
      reason_code: "ACTIVE_VERSION_MATCH",
      resolved_secret_version_id: active.secret_version_id,
      send_revalidation_state: "CLEAR_TO_SEND",
    };
  }

  assertSecretVersion(
    queuedRecord.rotation_state === "RETIRED" &&
      queuedRecord.superseded_by_secret_version_id === active.secret_version_id,
    "SECRET_VERSION_RESOLUTION_INVALID",
    "queued send cannot rebind to a different SecretVersion unless it retired to the active successor",
  );
  assertSecretVersion(
    input.binding.explicit_rotation_successor_secret_version_id === active.secret_version_id,
    "SECRET_VERSION_RESOLUTION_INVALID",
    "queued send requires an explicit rotation successor before rebinding to the active version",
  );
  return {
    binding_lineage_ref: active.lineage_ref,
    checked_at: checkedAt,
    policy_profile_ref: active.policy_profile_ref,
    queued_secret_version_id: queuedRecord.secret_version_id,
    reason_code: "EXPLICIT_ROTATION_SUCCESSOR_ACCEPTED",
    resolved_secret_version_id: active.secret_version_id,
    send_revalidation_state: "CLEAR_TO_SEND",
  };
}
