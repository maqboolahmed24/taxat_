import type { ReleaseCandidateIdentityContract } from "../../../generated-models/src/generated/typescript/manifest-and-release.ts";

export type ReleaseCandidateIdentityContractRecord = ReleaseCandidateIdentityContract;

export const RELEASE_CANDIDATE_IDENTITY_SCHEMA_ID =
  "https://taxat.dev/schemas/release_candidate_identity_contract.schema.json" as const;

export const RELEASE_CANDIDATE_IDENTITY_CONTRACT_VERSION =
  "RELEASE_CANDIDATE_IDENTITY_V1" as const;
export const RELEASE_CANDIDATE_ARRAY_CANONICALIZATION_POLICY =
  "SORTED_UNIQUE_ARRAY_COMPONENTS_ONLY" as const;
export const RELEASE_CANDIDATE_SUITE_CONTEXT_POLICY =
  "SUITE_SPECIFIC_DIMENSIONS_MUST_BE_DECLARED_OR_EXPLICITLY_NULL" as const;
export const RELEASE_CANDIDATE_ADMISSIBILITY_BINDING_POLICY =
  "GREEN_GATES_REQUIRE_EXACT_CANDIDATE_BINDING" as const;

export const RELEASE_CANDIDATE_IDENTITY_HASH_INPUT_FIELDS = [
  "candidate_environment_ref",
  "build_artifact_ref",
  "artifact_digest",
  "schema_bundle_hash",
  "config_bundle_hash",
  "migration_plan_ref_or_null",
  "enabled_provider_profile_refs",
  "supported_client_window_ref_or_null",
] as const;

export const RELEASE_CANDIDATE_IDENTITY_POLICY_FIELDS = [
  "contract_version",
  "array_canonicalization_policy",
  "suite_context_policy",
  "admissibility_binding_policy",
] as const;

export const RELEASE_CANDIDATE_IDENTITY_ALLOWED_FIELDS = [
  "contract_version",
  "candidate_identity_hash",
  ...RELEASE_CANDIDATE_IDENTITY_HASH_INPUT_FIELDS,
  "array_canonicalization_policy",
  "suite_context_policy",
  "admissibility_binding_policy",
] as const;

export type ReleaseCandidateIdentityHashInputField =
  (typeof RELEASE_CANDIDATE_IDENTITY_HASH_INPUT_FIELDS)[number];

export type ReleaseCandidateIdentityHashTuple = Pick<
  ReleaseCandidateIdentityContractRecord,
  ReleaseCandidateIdentityHashInputField
>;

export type ReleaseCandidateIdentityExpectedMirrors = Partial<
  Pick<ReleaseCandidateIdentityContractRecord, "candidate_identity_hash"> &
    ReleaseCandidateIdentityHashTuple
>;
