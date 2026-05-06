import {
  buildAuthorityOperation,
  type AuthorityOperation,
  type AuthorityOperationBuildInput,
} from "../models/authority_operation.ts";
import { AuthorityOperationRepository } from "../repositories/authority_operation_repository.ts";

export type ResolveAuthorityOperationInput = AuthorityOperationBuildInput & {
  repository?: AuthorityOperationRepository;
};

export async function resolveAuthorityOperation(input: ResolveAuthorityOperationInput): Promise<{
  operation: AuthorityOperation;
  repository: AuthorityOperationRepository;
  stored: Awaited<ReturnType<AuthorityOperationRepository["persistAuthorityOperation"]>>;
}> {
  const repository = input.repository ?? new AuthorityOperationRepository();
  const operation = buildAuthorityOperation(input);
  const stored = await repository.persistAuthorityOperation({ operation });
  return { operation, repository, stored };
}
