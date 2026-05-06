import type { VerificationSuiteResultRecord } from "../models/verification_suite_result.ts";
import type { VerificationSuiteResultRepository } from "../repositories/verification_suite_result_repository.ts";

export type PersistVerificationSuiteResultInput = {
  verification_suite_result: VerificationSuiteResultRecord;
  persisted_at: string;
  repository: VerificationSuiteResultRepository;
};

export function persistVerificationSuiteResult(
  input: PersistVerificationSuiteResultInput,
) {
  return input.repository.persistVerificationSuiteResult({
    persisted_at: input.persisted_at,
    verification_suite_result: input.verification_suite_result,
  });
}
