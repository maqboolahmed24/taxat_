import { AuthorityModelError } from "../models/authority_common.ts";
import type { AuthorityBinding } from "../models/authority_binding.ts";
import type { HmrcOauthTokenClientBindingContext } from "./assert_binding_lineage_continuity.ts";

export type HmrcOauthRefreshLineageResult = {
  checked_token_binding: HmrcOauthTokenClientBindingContext;
  checked_token_version_ref: string;
  pass_reason_code: "SEALED_TOKEN_VERSION_REUSED" | "TOKEN_ROTATED_WITHIN_LINEAGE";
};

export function refreshHmrcAccessTokenWithLineageGuard(input: {
  authority_binding: AuthorityBinding;
  refreshed_token_binding: HmrcOauthTokenClientBindingContext;
}): HmrcOauthRefreshLineageResult {
  const token = input.refreshed_token_binding;
  const binding = input.authority_binding;
  const drift = [
    token.binding_lineage_ref !== binding.binding_lineage_ref,
    token.token_binding_ref !== binding.token_binding_ref,
    token.authority_link_ref !== binding.authority_link_ref,
    token.tenant_id !== binding.tenant_id,
    token.client_id !== binding.client_id,
    token.subject_ref !== binding.subject_ref,
    token.acting_party_ref !== binding.acting_party_ref,
    token.delegation_grant_ref !== binding.delegation_grant_ref,
    token.authority_scope !== binding.authority_scope,
    token.provider_environment !== binding.provider_environment,
    token.provider_api_version !== binding.provider_api_version,
    token.access_binding_hash !== binding.access_binding_hash,
    token.policy_snapshot_hash !== binding.policy_snapshot_hash,
  ].some(Boolean);

  if (drift) {
    throw new AuthorityModelError(
      "AUTHORITY_IDENTITY_INVALID",
      "HMRC access-token refresh may advance token_version_ref only inside the same lineage without client or subject drift",
    );
  }
  if (token.token_client_binding_state !== "BOUND" || token.token_status !== "USABLE") {
    throw new AuthorityModelError(
      "AUTHORITY_CONTRACT_INVALID",
      "refreshed HMRC access token must be usable and client-bound before send-time revalidation",
    );
  }
  return {
    checked_token_binding: token,
    checked_token_version_ref: token.token_version_ref,
    pass_reason_code:
      token.token_version_ref === binding.token_version_ref
        ? "SEALED_TOKEN_VERSION_REUSED"
        : "TOKEN_ROTATED_WITHIN_LINEAGE",
  };
}
