import { expect, test } from "@playwright/test";

import {
  BASE_RELEASE_CANDIDATE_IDENTITY_VECTOR,
  buildReleaseCandidateIdentityContract,
  CandidateIdentityArrayNormalizationError,
  computeReleaseCandidateIdentityHash,
  DUPLICATE_PROVIDER_PROFILE_RELEASE_CANDIDATE_INPUT,
  RELEASE_CANDIDATE_IDENTITY_BASE_INPUT,
  RELEASE_CANDIDATE_IDENTITY_VECTORS,
  validateCandidateIdentityContract,
} from "../../../packages/backend-manifest/src/index.ts";

test("release candidate hash is stable for reordered provider profile sets", () => {
  const base = BASE_RELEASE_CANDIDATE_IDENTITY_VECTOR;
  const reordered = RELEASE_CANDIDATE_IDENTITY_VECTORS.find(
    (vector) => vector.vector_name === "same_logical_reordered_provider_profiles",
  )!;

  expect(base.candidate_identity_hash).toBe(reordered.candidate_identity_hash);
  expect(base.contract.enabled_provider_profile_refs).toEqual(["provider-a", "provider-b"]);
  expect(reordered.contract.enabled_provider_profile_refs).toEqual(["provider-a", "provider-b"]);
});

test("release candidate hash matches the imported sample tuple", () => {
  const sampleEquivalent = buildReleaseCandidateIdentityContract({
    candidate_environment_ref: "candidate-env-1",
    build_artifact_ref: "build-1",
    artifact_digest: "artifact-digest-1",
    schema_bundle_hash: "schema-hash-1",
    config_bundle_hash: "config-hash-1",
    migration_plan_ref_or_null: null,
    enabled_provider_profile_refs: ["provider-a"],
    supported_client_window_ref_or_null: "client-window-1",
  });

  expect(sampleEquivalent.candidate_identity_hash).toBe(
    "64d88b39d20eda04a6762286bfb9a87051d0f8da7274cc6a2ed4ca3ad087877c",
  );
});

test("duplicate provider profile refs fail closed instead of silently deduping", () => {
  expect(() =>
    buildReleaseCandidateIdentityContract(DUPLICATE_PROVIDER_PROFILE_RELEASE_CANDIDATE_INPUT),
  ).toThrow(CandidateIdentityArrayNormalizationError);
});

test("null and present optional identity refs are material", () => {
  const base = BASE_RELEASE_CANDIDATE_IDENTITY_VECTOR;
  const changedMigration = RELEASE_CANDIDATE_IDENTITY_VECTORS.find(
    (vector) => vector.vector_name === "changed_migration_plan",
  )!;
  const changedClientWindow = RELEASE_CANDIDATE_IDENTITY_VECTORS.find(
    (vector) => vector.vector_name === "changed_supported_client_window",
  )!;

  expect(changedMigration.contract.migration_plan_ref_or_null).toBe("migration-plan-1");
  expect(changedMigration.candidate_identity_hash).not.toBe(base.candidate_identity_hash);
  expect(changedClientWindow.contract.supported_client_window_ref_or_null).toBeNull();
  expect(changedClientWindow.candidate_identity_hash).not.toBe(base.candidate_identity_hash);
});

test("all material candidate tuple changes alter the hash", () => {
  const baseHash = BASE_RELEASE_CANDIDATE_IDENTITY_VECTOR.candidate_identity_hash;
  const materialChanges = RELEASE_CANDIDATE_IDENTITY_VECTORS.filter(
    (vector) =>
      vector.vector_name !== "base" &&
      vector.vector_name !== "same_logical_reordered_provider_profiles",
  );

  expect(materialChanges.map((vector) => vector.vector_name)).toEqual([
    "changed_config_bundle",
    "changed_schema_bundle",
    "changed_provider_profile_set",
    "changed_migration_plan",
    "changed_supported_client_window",
    "changed_build_artifact_digest",
    "changed_environment",
  ]);
  for (const vector of materialChanges) {
    expect(vector.candidate_identity_hash).not.toBe(baseHash);
  }
});

test("validation rejects stale hashes, mirror drift, and non-canonical stored arrays", () => {
  const contract = BASE_RELEASE_CANDIDATE_IDENTITY_VECTOR.contract;

  expect(validateCandidateIdentityContract(contract).valid).toBe(true);
  expect(
    validateCandidateIdentityContract(contract, {
      candidate_identity_hash: contract.candidate_identity_hash,
    }).valid,
  ).toBe(true);

  const staleHash = validateCandidateIdentityContract({
    ...contract,
    candidate_identity_hash: "stale-candidate-hash",
  });
  expect(staleHash.valid).toBe(false);
  expect(staleHash.issues.map((issue) => issue.code)).toContain(
    "RELEASE_CANDIDATE_CONTRACT_HASH_MISMATCH",
  );

  const mirrorDrift = validateCandidateIdentityContract(contract, {
    candidate_identity_hash: "other-candidate-hash",
  });
  expect(mirrorDrift.valid).toBe(false);
  expect(mirrorDrift.issues.map((issue) => issue.code)).toContain(
    "RELEASE_CANDIDATE_CONTRACT_EXPECTED_FIELD_MISMATCH",
  );

  const arrayDrift = validateCandidateIdentityContract({
    ...contract,
    enabled_provider_profile_refs: ["provider-b", "provider-a"],
  });
  expect(arrayDrift.valid).toBe(false);
  expect(arrayDrift.issues.map((issue) => issue.code)).toContain(
    "RELEASE_CANDIDATE_CONTRACT_CANONICAL_ARRAY_MISMATCH",
  );
});

test("persistence-only ids and write-time noise do not influence the hash but are invalid contract fields", () => {
  const contract = BASE_RELEASE_CANDIDATE_IDENTITY_VECTOR.contract;
  const noisyContract = {
    ...contract,
    database_row_id: "row-1",
    persisted_at: "2026-04-27T12:00:00Z",
  };

  expect(computeReleaseCandidateIdentityHash(noisyContract)).toBe(contract.candidate_identity_hash);

  const validation = validateCandidateIdentityContract(noisyContract);
  expect(validation.valid).toBe(false);
  expect(validation.issues.map((issue) => issue.code)).toContain(
    "RELEASE_CANDIDATE_CONTRACT_UNKNOWN_FIELD",
  );
});

test("empty optional provider arrays serialize stably", () => {
  const contract = buildReleaseCandidateIdentityContract({
    ...RELEASE_CANDIDATE_IDENTITY_BASE_INPUT,
    enabled_provider_profile_refs: [],
  });

  expect(contract.enabled_provider_profile_refs).toEqual([]);
  expect(validateCandidateIdentityContract(contract).valid).toBe(true);
  expect(computeReleaseCandidateIdentityHash(contract)).toBe(contract.candidate_identity_hash);
});
