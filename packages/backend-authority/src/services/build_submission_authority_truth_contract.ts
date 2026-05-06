import {
  buildSubmissionRecordAuthorityTruthContract,
  normalizeSubmissionRecordAuthorityTruthContract,
  type AuthorityTruthContract,
} from "../models/authority_common.ts";

export function buildSubmissionAuthorityTruthContract() {
  return buildSubmissionRecordAuthorityTruthContract();
}

export function validateSubmissionAuthorityTruthContract(contract: AuthorityTruthContract) {
  return normalizeSubmissionRecordAuthorityTruthContract(contract);
}
