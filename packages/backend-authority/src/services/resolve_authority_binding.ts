import {
  buildAuthorityBinding,
  type AuthorityBinding,
  type AuthorityBindingBuildInput,
} from "../models/authority_binding.ts";
import { AuthorityBindingRepository } from "../repositories/authority_binding_repository.ts";

export type ResolveAuthorityBindingInput = AuthorityBindingBuildInput & {
  repository?: AuthorityBindingRepository;
};

export async function resolveAuthorityBinding(input: ResolveAuthorityBindingInput): Promise<{
  binding: AuthorityBinding;
  repository: AuthorityBindingRepository;
  stored: Awaited<ReturnType<AuthorityBindingRepository["persistAuthorityBinding"]>>;
}> {
  const repository = input.repository ?? new AuthorityBindingRepository();
  const binding = buildAuthorityBinding(input);
  const stored = await repository.persistAuthorityBinding({ binding });
  return { binding, repository, stored };
}
