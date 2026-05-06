import {
  stableJsonHash,
  type HashDigest,
} from "../../../domain-kernel/src/primitives/hash.ts";
import { requireTrimmedString } from "../../../backend-access/src/services/principal_context_normalizer.ts";
import type {
  ReleaseCandidateIdentityContractRecord,
  ReleaseCandidateIdentityHashTuple,
} from "../models/release_candidate_identity_contract.ts";
import { normalizeCandidateIdentityStringSet } from "../services/normalize_candidate_identity_arrays.ts";
import { RELEASE_CANDIDATE_HASH_PROFILE } from "../services/release_candidate_hash_profile.ts";

export type ReleaseCandidateIdentityHashInput = {
  candidate_environment_ref: unknown;
  build_artifact_ref: unknown;
  artifact_digest: unknown;
  schema_bundle_hash: unknown;
  config_bundle_hash: unknown;
  migration_plan_ref_or_null: unknown;
  enabled_provider_profile_refs: unknown;
  supported_client_window_ref_or_null: unknown;
};

export type ReleaseCandidateIdentityHashResult = {
  candidate_identity_hash: HashDigest;
  hash_profile_version: typeof RELEASE_CANDIDATE_HASH_PROFILE.profile_version;
  hash_tuple: ReleaseCandidateIdentityHashTuple;
};

function normalizeRequiredIdentityRef(label: string, value: unknown) {
  return requireTrimmedString(`release_candidate_identity.${label}`, value);
}

function normalizeExplicitNullableIdentityRef(label: string, value: unknown) {
  if (value === null) {
    return null;
  }
  if (typeof value === "undefined") {
    throw new Error(`release_candidate_identity.${label} must be explicitly null or a string`);
  }
  return normalizeRequiredIdentityRef(label, value);
}

export function createReleaseCandidateIdentityHashTuple(
  input: ReleaseCandidateIdentityHashInput,
): ReleaseCandidateIdentityHashTuple {
  return {
    candidate_environment_ref: normalizeRequiredIdentityRef(
      "candidate_environment_ref",
      input.candidate_environment_ref,
    ),
    build_artifact_ref: normalizeRequiredIdentityRef(
      "build_artifact_ref",
      input.build_artifact_ref,
    ),
    artifact_digest: normalizeRequiredIdentityRef("artifact_digest", input.artifact_digest),
    schema_bundle_hash: normalizeRequiredIdentityRef(
      "schema_bundle_hash",
      input.schema_bundle_hash,
    ),
    config_bundle_hash: normalizeRequiredIdentityRef(
      "config_bundle_hash",
      input.config_bundle_hash,
    ),
    migration_plan_ref_or_null: normalizeExplicitNullableIdentityRef(
      "migration_plan_ref_or_null",
      input.migration_plan_ref_or_null,
    ),
    enabled_provider_profile_refs: normalizeCandidateIdentityStringSet(
      "release_candidate_identity.enabled_provider_profile_refs",
      input.enabled_provider_profile_refs,
    ),
    supported_client_window_ref_or_null: normalizeExplicitNullableIdentityRef(
      "supported_client_window_ref_or_null",
      input.supported_client_window_ref_or_null,
    ),
  };
}

export function computeReleaseCandidateIdentityHash(
  input: ReleaseCandidateIdentityHashInput,
): HashDigest {
  return stableJsonHash(createReleaseCandidateIdentityHashTuple(input));
}

export function buildReleaseCandidateIdentityHashResult(
  input: ReleaseCandidateIdentityHashInput,
): ReleaseCandidateIdentityHashResult {
  const hashTuple = createReleaseCandidateIdentityHashTuple(input);
  return {
    candidate_identity_hash: stableJsonHash(hashTuple),
    hash_profile_version: RELEASE_CANDIDATE_HASH_PROFILE.profile_version,
    hash_tuple: hashTuple,
  };
}

export function releaseCandidateIdentityHashMatches(
  contract: ReleaseCandidateIdentityContractRecord,
) {
  return contract.candidate_identity_hash === computeReleaseCandidateIdentityHash(contract);
}
