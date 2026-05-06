import { ReleaseCandidateIdentityContractSchemaLineage } from "../../../generated-models/src/generated/typescript/manifest-and-release.ts";
import {
  RELEASE_CANDIDATE_IDENTITY_CONTRACT_VERSION,
  RELEASE_CANDIDATE_IDENTITY_HASH_INPUT_FIELDS,
  RELEASE_CANDIDATE_IDENTITY_SCHEMA_ID,
} from "../models/release_candidate_identity_contract.ts";

export const RELEASE_CANDIDATE_HASH_PROFILE = {
  profile_version: "RELEASE_CANDIDATE_IDENTITY_HASH_V1",
  contract_version: RELEASE_CANDIDATE_IDENTITY_CONTRACT_VERSION,
  schema_id: RELEASE_CANDIDATE_IDENTITY_SCHEMA_ID,
  schema_source_hash: ReleaseCandidateIdentityContractSchemaLineage.sourceHash,
  hash_algorithm: "sha256",
  canonical_serializer: "TAXAT_STABLE_JSON_V1",
  hash_input_policy: "EXACT_RELEASE_CANDIDATE_TUPLE_FIELDS_ONLY",
  array_policy: "SORT_PROVIDER_PROFILE_REFS_AND_REJECT_DUPLICATES",
  null_policy: "EXPLICIT_NULL_IS_MATERIAL_AND_DISTINCT_FROM_PRESENT_REF",
  excluded_field_policy:
    "EXCLUDE_CANDIDATE_HASH_POLICY_FIELDS_PERSISTENCE_IDS_AND_WRITE_TIMESTAMPS",
  hash_input_fields: RELEASE_CANDIDATE_IDENTITY_HASH_INPUT_FIELDS,
  source_contract_refs: [
    "Algorithm/release_candidate_identity_and_promotion_evidence_contract.md#1-governing-candidate-identity-model",
    "Algorithm/verification_and_release_gates.md#1-required-test-families",
    "Algorithm/manifest_and_config_freeze_contract.md",
    "Algorithm/data_model.md#manifest-and-release-models",
  ],
} as const;

export type ReleaseCandidateHashProfile = typeof RELEASE_CANDIDATE_HASH_PROFILE;
