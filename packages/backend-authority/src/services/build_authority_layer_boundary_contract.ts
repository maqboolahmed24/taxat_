import {
  buildAuthorityLayerBoundaryContract as buildAuthorityLayerBoundaryContractModel,
  type AuthorityLayerBoundaryContract,
} from "../models/authority_common.ts";

export type BuildAuthorityLayerBoundaryContractInput = Parameters<
  typeof buildAuthorityLayerBoundaryContractModel
>[0];

export function buildAuthorityLayerBoundaryForArtifact(
  input: BuildAuthorityLayerBoundaryContractInput,
): AuthorityLayerBoundaryContract {
  return buildAuthorityLayerBoundaryContractModel(input);
}
