import {
  canonicalizeAuthorityRequestMaterial,
  type CanonicalAuthorityRequestMaterial,
  type AuthorityHttpMethod,
  type AuthorityRequestPathParams,
  type AuthorityRequestQueryParams,
} from "../models/authority_request_envelope.ts";

export type CanonicalizeAuthorityRequestInput = {
  header_profile_refs?: readonly string[];
  http_method: AuthorityHttpMethod;
  payload?: unknown;
  payload_ref?: string | null;
  query_params?: AuthorityRequestQueryParams;
  request_body_hash?: string | null;
  resolved_path_params?: AuthorityRequestPathParams;
  resource_template: string;
};

export function canonicalizeAuthorityRequest(
  input: CanonicalizeAuthorityRequestInput,
): CanonicalAuthorityRequestMaterial {
  return canonicalizeAuthorityRequestMaterial(input);
}
