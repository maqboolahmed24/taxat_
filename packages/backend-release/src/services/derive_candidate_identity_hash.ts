import {
  buildReleaseCandidateIdentityContract,
  buildReleaseCandidateIdentityContractResult,
  computeReleaseCandidateIdentityHash,
  createReleaseCandidateIdentityHashTuple,
  type BuildReleaseCandidateIdentityContractInput,
  type ReleaseCandidateIdentityHashInput,
} from "../../../backend-manifest/src/index.ts";

export {
  buildReleaseCandidateIdentityContract,
  buildReleaseCandidateIdentityContractResult,
  computeReleaseCandidateIdentityHash,
  createReleaseCandidateIdentityHashTuple,
};

export function deriveCandidateIdentityHash(input: ReleaseCandidateIdentityHashInput) {
  return computeReleaseCandidateIdentityHash(input);
}

export function deriveCandidateIdentityContract(
  input: BuildReleaseCandidateIdentityContractInput,
) {
  return buildReleaseCandidateIdentityContract(input);
}
