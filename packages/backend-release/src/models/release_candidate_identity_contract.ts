import {
  assertValidCandidateIdentityContract,
  buildReleaseCandidateIdentityContract,
  computeReleaseCandidateIdentityHash,
  createReleaseCandidateIdentityHashTuple,
  RELEASE_CANDIDATE_ADMISSIBILITY_BINDING_POLICY,
  RELEASE_CANDIDATE_ARRAY_CANONICALIZATION_POLICY,
  RELEASE_CANDIDATE_HASH_PROFILE,
  RELEASE_CANDIDATE_IDENTITY_ALLOWED_FIELDS,
  RELEASE_CANDIDATE_IDENTITY_CONTRACT_VERSION,
  RELEASE_CANDIDATE_IDENTITY_HASH_INPUT_FIELDS,
  RELEASE_CANDIDATE_IDENTITY_POLICY_FIELDS,
  RELEASE_CANDIDATE_IDENTITY_SCHEMA_ID,
  RELEASE_CANDIDATE_SUITE_CONTEXT_POLICY,
  validateCandidateIdentityContract,
  type BuildReleaseCandidateIdentityContractInput,
  type BuildReleaseCandidateIdentityContractResult,
  type CandidateIdentityContractValidationIssue,
  type CandidateIdentityContractValidationResult,
  type ReleaseCandidateIdentityContractRecord,
  type ReleaseCandidateIdentityExpectedMirrors,
  type ReleaseCandidateIdentityHashInput,
  type ReleaseCandidateIdentityHashInputField,
  type ReleaseCandidateIdentityHashTuple,
  type ReleaseCandidateIdentitySourceLineage,
} from "../../../backend-manifest/src/index.ts";

export {
  assertValidCandidateIdentityContract,
  buildReleaseCandidateIdentityContract,
  computeReleaseCandidateIdentityHash,
  createReleaseCandidateIdentityHashTuple,
  RELEASE_CANDIDATE_ADMISSIBILITY_BINDING_POLICY,
  RELEASE_CANDIDATE_ARRAY_CANONICALIZATION_POLICY,
  RELEASE_CANDIDATE_HASH_PROFILE,
  RELEASE_CANDIDATE_IDENTITY_ALLOWED_FIELDS,
  RELEASE_CANDIDATE_IDENTITY_CONTRACT_VERSION,
  RELEASE_CANDIDATE_IDENTITY_HASH_INPUT_FIELDS,
  RELEASE_CANDIDATE_IDENTITY_POLICY_FIELDS,
  RELEASE_CANDIDATE_IDENTITY_SCHEMA_ID,
  RELEASE_CANDIDATE_SUITE_CONTEXT_POLICY,
  validateCandidateIdentityContract,
  type BuildReleaseCandidateIdentityContractInput,
  type BuildReleaseCandidateIdentityContractResult,
  type CandidateIdentityContractValidationIssue,
  type CandidateIdentityContractValidationResult,
  type ReleaseCandidateIdentityContractRecord,
  type ReleaseCandidateIdentityExpectedMirrors,
  type ReleaseCandidateIdentityHashInput,
  type ReleaseCandidateIdentityHashInputField,
  type ReleaseCandidateIdentityHashTuple,
  type ReleaseCandidateIdentitySourceLineage,
};

export function releaseCandidateIdentityContractRef(
  contract: Pick<ReleaseCandidateIdentityContractRecord, "candidate_identity_hash">,
) {
  return `release-candidate-identity://${contract.candidate_identity_hash}`;
}

export function assertReleaseCandidateIdentityContract(
  contract: unknown,
  expectedMirrors: ReleaseCandidateIdentityExpectedMirrors = {},
) {
  return assertValidCandidateIdentityContract(contract, expectedMirrors);
}

export function cloneReleaseCandidateIdentityContract(
  contract: ReleaseCandidateIdentityContractRecord,
) {
  return structuredClone(contract);
}
