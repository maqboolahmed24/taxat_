import { expect, test } from "@playwright/test";

import { validateContractSchema } from "../../../../tests/unit/backend_northbound/audit_and_enquiry_fixtures.ts";
import {
  attestAndActivateSecretVersion,
  buildIssuedSecretVersion,
  normalizeSecretVersion,
  resolveHistoricalSecretVersion,
  revokeSecretVersion,
  retireRotatedSecretVersion,
  SecretVersionRepository,
  startSecretVersionRotation,
  type SecretVersionRecord,
} from "../index.ts";

function issuedSecretVersion(
  overrides: Partial<Parameters<typeof buildIssuedSecretVersion>[0]> = {},
) {
  return buildIssuedSecretVersion({
    expires_at: "2026-06-05T09:00:00Z",
    issued_at: "2026-05-05T09:00:00Z",
    key_version_ref: "kms-key-version://pc0211/v1",
    lineage_ref: "secret-lineage://tenant-a/client-a/vat-submit",
    policy_profile_ref: "secret-policy://authority-token/send",
    secret_class: "AUTHORITY_TOKEN",
    secret_version_id: "secret-version://pc0211/v1",
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
    attestation_authority_ref: "kms-attestor://pc0211/release",
    attestation_evidence_refs: ["kms-proof://pc0211/key-bound", "vault-proof://pc0211/store-bound"],
    attestation_scope: "RUNTIME_ACTIVATION",
    attested_at: attestedAt,
    secret_version: version,
  });
}

test("activates an attested SecretVersion with schema-shaped null lifecycle posture", async () => {
  const active = activeSecretVersion();

  expect(active.rotation_state).toBe("ACTIVE");
  expect(active.attestation_ref).toMatch(/^secret-attestation:\/\/sha256\//);
  expect(active.activated_at).toBe("2026-05-05T09:02:00Z");
  expect(active.rotation_started_at).toBeNull();
  expect(active.retired_at).toBeNull();
  await validateContractSchema("secret_version", active);
});

test("rotates, retires, and keeps historical reads inside the explicit window only", async () => {
  const repository = new SecretVersionRepository();
  const current = activeSecretVersion();
  await repository.persistSecretVersion({ secret_version: current });

  const successor = issuedSecretVersion({
    issued_at: "2026-05-05T09:05:00Z",
    key_version_ref: "kms-key-version://pc0211/v2",
    secret_version_id: "secret-version://pc0211/v2",
  });
  const rotation = await startSecretVersionRotation({
    attestation_authority_ref: "kms-attestor://pc0211/rotation",
    attestation_evidence_refs: ["kms-proof://pc0211/v2-key-bound"],
    current,
    repository,
    rotation_started_at: "2026-05-05T09:10:00Z",
    successor,
    successor_activated_at: "2026-05-05T09:10:00Z",
    successor_attested_at: "2026-05-05T09:09:00Z",
  });

  expect(rotation.rotating.rotation_state).toBe("ROTATING");
  expect(rotation.active_successor.rotation_state).toBe("ACTIVE");
  expect(rotation.cutover.cutover_state).toBe("LEGAL_CUTOVER");
  await validateContractSchema("secret_version", rotation.rotating);
  await validateContractSchema("secret_version", rotation.active_successor);

  const retired = await retireRotatedSecretVersion({
    historical_read_window_until: "2026-05-05T10:15:00Z",
    repository,
    retired_at: "2026-05-05T09:15:00Z",
    rotating: rotation.rotating,
    successor: rotation.active_successor,
  });

  expect(retired.rotation_state).toBe("RETIRED");
  expect(retired.rotation_started_at).toBe("2026-05-05T09:10:00Z");
  expect(retired.superseded_by_secret_version_id).toBe(
    rotation.active_successor.secret_version_id,
  );
  await validateContractSchema("secret_version", retired);

  const historical = await resolveHistoricalSecretVersion({
    at: "2026-05-05T10:00:00Z",
    lineage_ref: current.lineage_ref,
    policy_profile_ref: current.policy_profile_ref,
    repository,
    secret_version_id: current.secret_version_id,
  });
  expect(historical.secret_version_id).toBe(current.secret_version_id);
  await expect(
    resolveHistoricalSecretVersion({
      at: "2026-05-05T10:16:00Z",
      lineage_ref: current.lineage_ref,
      policy_profile_ref: current.policy_profile_ref,
      repository,
      secret_version_id: current.secret_version_id,
    }),
  ).rejects.toThrow(/historical-read window/i);
});

test("revocation removes send and historical-read capability instead of acting like retirement", async () => {
  const repository = new SecretVersionRepository();
  const current = activeSecretVersion();
  await repository.persistSecretVersion({ secret_version: current });

  const revoked = await revokeSecretVersion({
    repository,
    revoked_at: "2026-05-05T09:20:00Z",
    revocation_reason_code: "KEY_COMPROMISE",
    secret_version: current,
  });

  expect(revoked.rotation_state).toBe("REVOKED");
  expect(revoked.activated_at).toBeNull();
  expect(revoked.revocation_reason_code).toBe("KEY_COMPROMISE");
  await validateContractSchema("secret_version", revoked);

  await expect(
    resolveHistoricalSecretVersion({
      at: "2026-05-05T09:25:00Z",
      lineage_ref: current.lineage_ref,
      policy_profile_ref: current.policy_profile_ref,
      repository,
      secret_version_id: current.secret_version_id,
    }),
  ).rejects.toThrow(/historical-read window/i);
});

test("rejects self-supersession, cross-lineage cutover, and cyclical lineage", async () => {
  const active = activeSecretVersion();
  expect(() =>
    normalizeSecretVersion({
      ...active,
      rotation_state: "RETIRED",
      rotation_started_at: "2026-05-05T09:10:00Z",
      retired_at: "2026-05-05T09:15:00Z",
      historical_read_window_until: "2026-05-05T10:15:00Z",
      superseded_by_secret_version_id: active.secret_version_id,
    }),
  ).toThrow(/must not point back/i);

  const repository = new SecretVersionRepository();
  const activeB = activeSecretVersion(
    issuedSecretVersion({
      key_version_ref: "kms-key-version://pc0211/v-cycle-b",
      secret_version_id: "secret-version://pc0211/v-cycle-b",
    }),
  );
  await repository.persistSecretVersion({ secret_version: activeB });

  const retiredA: SecretVersionRecord = normalizeSecretVersion({
    ...active,
    rotation_state: "RETIRED",
    rotation_started_at: "2026-05-05T09:11:00Z",
    retired_at: "2026-05-05T09:12:00Z",
    historical_read_window_until: "2026-05-05T10:12:00Z",
    superseded_by_secret_version_id: activeB.secret_version_id,
  });
  await repository.persistSecretVersion({ secret_version: retiredA });
  const rotatingB = normalizeSecretVersion({
    ...activeB,
    rotation_state: "ROTATING",
    rotation_started_at: "2026-05-05T09:13:00Z",
  });
  await repository.persistSecretVersion({ secret_version: rotatingB });
  const cyclicB = normalizeSecretVersion({
    ...rotatingB,
    rotation_state: "RETIRED",
    retired_at: "2026-05-05T09:14:00Z",
    historical_read_window_until: "2026-05-05T10:14:00Z",
    superseded_by_secret_version_id: retiredA.secret_version_id,
  });

  await expect(repository.persistSecretVersion({ secret_version: cyclicB })).rejects.toThrow(
    /cycle/i,
  );

  const crossLineageSuccessor = issuedSecretVersion({
    key_version_ref: "kms-key-version://pc0211/v-cross",
    lineage_ref: "secret-lineage://tenant-b/client-b/vat-submit",
    secret_version_id: "secret-version://pc0211/v-cross",
  });
  await expect(
    startSecretVersionRotation({
      attestation_authority_ref: "kms-attestor://pc0211/rotation",
      attestation_evidence_refs: ["kms-proof://pc0211/cross"],
      current: active,
      rotation_started_at: "2026-05-05T09:20:00Z",
      successor: crossLineageSuccessor,
      successor_attested_at: "2026-05-05T09:19:00Z",
    }),
  ).rejects.toThrow(/same subject\/client\/scope lineage_ref/i);
});
