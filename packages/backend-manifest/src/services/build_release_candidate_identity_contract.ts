import type { ReleaseCandidateIdentityHashInput } from "../hash/release_candidate_identity_hash.ts";
import {
  buildReleaseCandidateIdentityHashResult,
  createReleaseCandidateIdentityHashTuple,
} from "../hash/release_candidate_identity_hash.ts";
import {
  RELEASE_CANDIDATE_ADMISSIBILITY_BINDING_POLICY,
  RELEASE_CANDIDATE_ARRAY_CANONICALIZATION_POLICY,
  RELEASE_CANDIDATE_IDENTITY_CONTRACT_VERSION,
  RELEASE_CANDIDATE_SUITE_CONTEXT_POLICY,
  type ReleaseCandidateIdentityContractRecord,
  type ReleaseCandidateIdentityHashTuple,
} from "../models/release_candidate_identity_contract.ts";
import {
  RELEASE_CANDIDATE_HASH_PROFILE,
  type ReleaseCandidateHashProfile,
} from "./release_candidate_hash_profile.ts";

export type ReleaseCandidateIdentitySourceLineage = {
  source_file: string;
  source_heading_or_logical_block: string;
  source_hash_or_version?: string;
  artifact_refs?: readonly string[];
};

export type BuildReleaseCandidateIdentityContractInput = ReleaseCandidateIdentityHashInput & {
  source_lineage?: ReleaseCandidateIdentitySourceLineage;
};

export type BuildReleaseCandidateIdentityContractResult = {
  candidate_identity_hash: string;
  contract: ReleaseCandidateIdentityContractRecord;
  hash_profile: ReleaseCandidateHashProfile;
  hash_tuple: ReleaseCandidateIdentityHashTuple;
  source_lineage: ReleaseCandidateIdentitySourceLineage | null;
};

export function buildReleaseCandidateIdentityContract(
  input: BuildReleaseCandidateIdentityContractInput,
): ReleaseCandidateIdentityContractRecord {
  const hashTuple = createReleaseCandidateIdentityHashTuple(input);
  const hashResult = buildReleaseCandidateIdentityHashResult(hashTuple);

  return {
    contract_version: RELEASE_CANDIDATE_IDENTITY_CONTRACT_VERSION,
    candidate_identity_hash: hashResult.candidate_identity_hash,
    ...hashTuple,
    array_canonicalization_policy: RELEASE_CANDIDATE_ARRAY_CANONICALIZATION_POLICY,
    suite_context_policy: RELEASE_CANDIDATE_SUITE_CONTEXT_POLICY,
    admissibility_binding_policy: RELEASE_CANDIDATE_ADMISSIBILITY_BINDING_POLICY,
  };
}

export function buildReleaseCandidateIdentityContractResult(
  input: BuildReleaseCandidateIdentityContractInput,
): BuildReleaseCandidateIdentityContractResult {
  const contract = buildReleaseCandidateIdentityContract(input);
  return {
    candidate_identity_hash: contract.candidate_identity_hash,
    contract,
    hash_profile: RELEASE_CANDIDATE_HASH_PROFILE,
    hash_tuple: createReleaseCandidateIdentityHashTuple(contract),
    source_lineage: input.source_lineage ?? null,
  };
}
