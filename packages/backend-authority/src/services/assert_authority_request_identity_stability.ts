import { stableJsonHash } from "../../../domain-kernel/src/primitives/hash.ts";
import { AuthorityModelError, stableEqual } from "../models/authority_common.ts";
import {
  normalizeAuthorityRequestIdentityContract,
  type AuthorityRequestIdentityContract,
} from "../models/submission_record.ts";

export type AssertAuthorityRequestIdentityStabilityInput = {
  actual: AuthorityRequestIdentityContract;
  allow_binding_scope_projection?: boolean;
  expected: AuthorityRequestIdentityContract;
};

function normalizeUsingOwnScope(contract: AuthorityRequestIdentityContract) {
  return normalizeAuthorityRequestIdentityContract(contract, contract.binding_scope_class);
}

function comparableContract(contract: AuthorityRequestIdentityContract, allowBindingScopeProjection: boolean) {
  const normalized = normalizeUsingOwnScope(contract);
  if (!allowBindingScopeProjection) {
    return normalized;
  }
  const { binding_scope_class: _bindingScopeClass, ...rest } = normalized;
  return rest;
}

export function authorityRequestIdentityStableHash(
  contract: AuthorityRequestIdentityContract,
  options: { allow_binding_scope_projection?: boolean } = {},
) {
  return stableJsonHash(comparableContract(contract, options.allow_binding_scope_projection ?? true));
}

export function assertAuthorityRequestIdentityStability(
  input: AssertAuthorityRequestIdentityStabilityInput,
) {
  const allowBindingScopeProjection = input.allow_binding_scope_projection ?? true;
  const expected = comparableContract(input.expected, allowBindingScopeProjection);
  const actual = comparableContract(input.actual, allowBindingScopeProjection);
  if (!stableEqual(expected, actual)) {
    throw new AuthorityModelError(
      "AUTHORITY_IDENTITY_INVALID",
      "request_identity_contract drifted; downstream records must reuse the persisted grouped identity spine",
    );
  }
  return true;
}
