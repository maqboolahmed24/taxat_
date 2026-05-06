import { expect, test } from "@playwright/test";

import { validateContractSchema } from "../../../../tests/unit/backend_northbound/audit_and_enquiry_fixtures.ts";
import {
  attestAndActivateSecretVersion,
  attestSecretVersion,
  buildIssuedSecretVersion,
  normalizeSecretVersion,
  resolveActiveSecretVersion,
  retireRotatedSecretVersion,
  SecretVersionRepository,
  startSecretVersionRotation,
  validateQueuedAuthoritySecretVersionForSend,
} from "../index.ts";

function issuedSecretVersion(
  overrides: Partial<Parameters<typeof buildIssuedSecretVersion>[0]> = {},
) {
  return buildIssuedSecretVersion({
    expires_at: "2026-06-05T09:00:00Z",
    issued_at: "2026-05-05T09:00:00Z",
    key_version_ref: "kms-key-version://pc0211/send-v1",
    lineage_ref: "secret-lineage://tenant-a/client-a/subject-a/vat-submit",
    policy_profile_ref: "secret-policy://authority-token/send",
    secret_class: "AUTHORITY_TOKEN",
    secret_version_id: "secret-version://pc0211/send-v1",
    store_ref: "secret-store://vault/main",
    ...overrides,
  });
}

function activeSecretVersion(
  version = issuedSecretVersion(),
  attestedAt = "2026-05-05T09:01:00Z",
  activatedAt = "2026-05-05T09:02:00Z",
) {
  return attestAndActivateSecretVersion({
    activated_at: activatedAt,
    attestation_authority_ref: "kms-attestor://pc0211/runtime",
    attestation_evidence_refs: ["kms-proof://pc0211/send-key-bound"],
    attestation_scope: "RUNTIME_ACTIVATION",
    attested_at: attestedAt,
    secret_version: version,
  });
}

test("fails closed when attestation is missing or unknown for live use", async () => {
  const issued = issuedSecretVersion();
  expect(() =>
    normalizeSecretVersion({
      ...issued,
      rotation_state: "ACTIVE",
      activated_at: "2026-05-05T09:02:00Z",
    }),
  ).toThrow(/last_attested_at/i);
  expect(() =>
    attestSecretVersion({
      attestation_authority_ref: "kms-attestor://pc0211/runtime",
      attestation_evidence_refs: [],
      attestation_scope: "RUNTIME_ACTIVATION",
      attested_at: "2026-05-05T09:01:00Z",
      secret_version: issued,
    }),
  ).toThrow(/attestation_evidence_refs/i);

  const repository = new SecretVersionRepository();
  const active = activeSecretVersion();
  await repository.persistSecretVersion({ secret_version: active });
  await validateContractSchema("secret_version", active);

  await expect(
    resolveActiveSecretVersion({
      at: "2026-05-05T09:03:00Z",
      lineage_ref: active.lineage_ref,
      policy_profile_ref: active.policy_profile_ref,
      repository,
      required_attestation_ref: "secret-attestation://sha256/unknown",
    }),
  ).rejects.toThrow(/attestation_ref/i);
});

test("send-time revalidation accepts exact active binding and blocks silent rotation rebinding", async () => {
  const repository = new SecretVersionRepository();
  const current = activeSecretVersion();
  await repository.persistSecretVersion({ secret_version: current });

  const exact = await validateQueuedAuthoritySecretVersionForSend({
    binding: {
      expected_attestation_ref: current.attestation_ref ?? undefined,
      expected_key_version_ref: current.key_version_ref,
      lineage_ref: current.lineage_ref,
      policy_profile_ref: current.policy_profile_ref,
      queued_secret_version_id: current.secret_version_id,
      secret_class: current.secret_class,
    },
    checked_at: "2026-05-05T09:04:00Z",
    repository,
  });
  expect(exact.reason_code).toBe("ACTIVE_VERSION_MATCH");

  const successor = issuedSecretVersion({
    issued_at: "2026-05-05T09:05:00Z",
    key_version_ref: "kms-key-version://pc0211/send-v2",
    secret_version_id: "secret-version://pc0211/send-v2",
  });
  const rotation = await startSecretVersionRotation({
    attestation_authority_ref: "kms-attestor://pc0211/rotation",
    attestation_evidence_refs: ["kms-proof://pc0211/send-v2-key-bound"],
    current,
    repository,
    rotation_started_at: "2026-05-05T09:10:00Z",
    successor,
    successor_activated_at: "2026-05-05T09:10:00Z",
    successor_attested_at: "2026-05-05T09:09:00Z",
  });
  const retired = await retireRotatedSecretVersion({
    historical_read_window_until: "2026-05-05T10:15:00Z",
    repository,
    retired_at: "2026-05-05T09:15:00Z",
    rotating: rotation.rotating,
    successor: rotation.active_successor,
  });

  await expect(
    validateQueuedAuthoritySecretVersionForSend({
      binding: {
        lineage_ref: current.lineage_ref,
        policy_profile_ref: current.policy_profile_ref,
        queued_secret_version_id: retired.secret_version_id,
        secret_class: current.secret_class,
      },
      checked_at: "2026-05-05T09:16:00Z",
      repository,
    }),
  ).rejects.toThrow(/explicit rotation successor/i);

  const rebound = await validateQueuedAuthoritySecretVersionForSend({
    binding: {
      explicit_rotation_successor_secret_version_id:
        rotation.active_successor.secret_version_id,
      lineage_ref: current.lineage_ref,
      policy_profile_ref: current.policy_profile_ref,
      queued_secret_version_id: retired.secret_version_id,
      secret_class: current.secret_class,
    },
    checked_at: "2026-05-05T09:16:00Z",
    repository,
  });
  expect(rebound.reason_code).toBe("EXPLICIT_ROTATION_SUCCESSOR_ACCEPTED");
  expect(rebound.resolved_secret_version_id).toBe(rotation.active_successor.secret_version_id);
});

test("send-time revalidation rejects lineage drift and never persists raw secret material", async () => {
  const repository = new SecretVersionRepository();
  const active = activeSecretVersion();
  await repository.persistSecretVersion({ secret_version: active });

  await expect(
    validateQueuedAuthoritySecretVersionForSend({
      binding: {
        lineage_ref: "secret-lineage://tenant-b/client-b/subject-b/vat-submit",
        policy_profile_ref: active.policy_profile_ref,
        queued_secret_version_id: active.secret_version_id,
        secret_class: active.secret_class,
      },
      checked_at: "2026-05-05T09:04:00Z",
      repository,
    }),
  ).rejects.toThrow(/binding drifted/i);

  expect(() =>
    normalizeSecretVersion({
      ...issuedSecretVersion(),
      raw_secret: "not-for-storage",
    } as Parameters<typeof normalizeSecretVersion>[0]),
  ).toThrow(/raw_secret/i);
});
