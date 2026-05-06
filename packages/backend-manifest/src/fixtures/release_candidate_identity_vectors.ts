import type { BuildReleaseCandidateIdentityContractInput } from "../services/build_release_candidate_identity_contract.ts";
import { buildReleaseCandidateIdentityContract } from "../services/build_release_candidate_identity_contract.ts";
import type {
  ReleaseCandidateIdentityContractRecord,
  ReleaseCandidateIdentityHashTuple,
} from "../models/release_candidate_identity_contract.ts";
import { createReleaseCandidateIdentityHashTuple } from "../hash/release_candidate_identity_hash.ts";

export type ReleaseCandidateIdentityFixtureVector = {
  candidate_identity_hash: string;
  contract: ReleaseCandidateIdentityContractRecord;
  hash_tuple: ReleaseCandidateIdentityHashTuple;
  input: BuildReleaseCandidateIdentityContractInput;
  vector_name:
    | "base"
    | "same_logical_reordered_provider_profiles"
    | "changed_config_bundle"
    | "changed_schema_bundle"
    | "changed_provider_profile_set"
    | "changed_migration_plan"
    | "changed_supported_client_window"
    | "changed_build_artifact_digest"
    | "changed_environment";
};

export const RELEASE_CANDIDATE_IDENTITY_BASE_INPUT = {
  candidate_environment_ref: "candidate-env-1",
  build_artifact_ref: "build-1",
  artifact_digest: "artifact-digest-1",
  schema_bundle_hash: "schema-hash-1",
  config_bundle_hash: "config-hash-1",
  migration_plan_ref_or_null: null,
  enabled_provider_profile_refs: ["provider-b", "provider-a"],
  supported_client_window_ref_or_null: "client-window-1",
  source_lineage: {
    source_file: "Algorithm/release_candidate_identity_and_promotion_evidence_contract.md",
    source_heading_or_logical_block: "1. Governing candidate identity model",
    source_hash_or_version: "RELEASE_CANDIDATE_IDENTITY_HASH_V1",
    artifact_refs: [
      "build-1",
      "schema-hash-1",
      "config-hash-1",
      "candidate-env-1",
    ],
  },
} as const satisfies BuildReleaseCandidateIdentityContractInput;

function buildVector(
  vectorName: ReleaseCandidateIdentityFixtureVector["vector_name"],
  input: BuildReleaseCandidateIdentityContractInput,
): ReleaseCandidateIdentityFixtureVector {
  const contract = buildReleaseCandidateIdentityContract(input);
  return {
    vector_name: vectorName,
    input,
    contract,
    candidate_identity_hash: contract.candidate_identity_hash,
    hash_tuple: createReleaseCandidateIdentityHashTuple(contract),
  };
}

export const RELEASE_CANDIDATE_IDENTITY_VECTORS = [
  buildVector("base", RELEASE_CANDIDATE_IDENTITY_BASE_INPUT),
  buildVector("same_logical_reordered_provider_profiles", {
    ...RELEASE_CANDIDATE_IDENTITY_BASE_INPUT,
    enabled_provider_profile_refs: ["provider-a", "provider-b"],
  }),
  buildVector("changed_config_bundle", {
    ...RELEASE_CANDIDATE_IDENTITY_BASE_INPUT,
    config_bundle_hash: "config-hash-2",
  }),
  buildVector("changed_schema_bundle", {
    ...RELEASE_CANDIDATE_IDENTITY_BASE_INPUT,
    schema_bundle_hash: "schema-hash-2",
  }),
  buildVector("changed_provider_profile_set", {
    ...RELEASE_CANDIDATE_IDENTITY_BASE_INPUT,
    enabled_provider_profile_refs: ["provider-a", "provider-c"],
  }),
  buildVector("changed_migration_plan", {
    ...RELEASE_CANDIDATE_IDENTITY_BASE_INPUT,
    migration_plan_ref_or_null: "migration-plan-1",
  }),
  buildVector("changed_supported_client_window", {
    ...RELEASE_CANDIDATE_IDENTITY_BASE_INPUT,
    supported_client_window_ref_or_null: null,
  }),
  buildVector("changed_build_artifact_digest", {
    ...RELEASE_CANDIDATE_IDENTITY_BASE_INPUT,
    artifact_digest: "artifact-digest-2",
  }),
  buildVector("changed_environment", {
    ...RELEASE_CANDIDATE_IDENTITY_BASE_INPUT,
    candidate_environment_ref: "candidate-env-2",
  }),
] as const satisfies readonly ReleaseCandidateIdentityFixtureVector[];

export const BASE_RELEASE_CANDIDATE_IDENTITY_VECTOR =
  RELEASE_CANDIDATE_IDENTITY_VECTORS[0]!;

export const DUPLICATE_PROVIDER_PROFILE_RELEASE_CANDIDATE_INPUT = {
  ...RELEASE_CANDIDATE_IDENTITY_BASE_INPUT,
  enabled_provider_profile_refs: ["provider-a", "provider-a"],
} as const satisfies BuildReleaseCandidateIdentityContractInput;
