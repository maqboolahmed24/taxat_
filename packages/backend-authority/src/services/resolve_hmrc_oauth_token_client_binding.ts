import type { AuthorityBinding } from "../models/authority_binding.ts";
import type { AuthorityRequestEnvelope } from "../models/authority_request_envelope.ts";
import {
  collectBindingLineageContinuityBlockReasons,
  type HmrcOauthTokenClientBindingContext,
} from "./assert_binding_lineage_continuity.ts";
import type {
  BindingDriftSentinelBlockReason,
  BindingDriftSentinelPassReason,
} from "./build_binding_drift_sentinel_contract.ts";

export type HmrcOauthTokenClientBindingResolution = {
  block_reason_codes: BindingDriftSentinelBlockReason[];
  checked_token_binding: HmrcOauthTokenClientBindingContext;
  checked_token_version_ref_or_null: string | null;
  pass_reason_code_or_null: BindingDriftSentinelPassReason | null;
};

export function resolveHmrcOauthTokenClientBinding(input: {
  authority_binding: AuthorityBinding;
  authority_request: AuthorityRequestEnvelope;
  checked_token_binding?: HmrcOauthTokenClientBindingContext;
  approval_evidence_current?: boolean;
  step_up_evidence_current?: boolean;
}): HmrcOauthTokenClientBindingResolution {
  const checkedTokenBinding = input.checked_token_binding ?? {
    access_binding_hash: input.authority_binding.access_binding_hash,
    acting_party_ref: input.authority_binding.acting_party_ref,
    authority_link_ref: input.authority_binding.authority_link_ref,
    authority_scope: input.authority_binding.authority_scope,
    binding_lineage_ref: input.authority_binding.binding_lineage_ref,
    client_id: input.authority_binding.client_id,
    delegation_grant_ref: input.authority_binding.delegation_grant_ref,
    policy_snapshot_hash: input.authority_binding.policy_snapshot_hash,
    provider_api_version: input.authority_binding.provider_api_version,
    provider_environment: input.authority_binding.provider_environment,
    subject_ref: input.authority_binding.subject_ref,
    tenant_id: input.authority_binding.tenant_id,
    token_binding_ref: input.authority_binding.token_binding_ref,
    token_client_binding_state: input.authority_binding.token_client_binding_state,
    token_status: input.authority_binding.binding_health === "TOKEN_INVALID" ? "REVOKED" : "USABLE",
    token_version_ref: input.authority_binding.token_version_ref,
  } satisfies HmrcOauthTokenClientBindingContext;
  const blockReasonCodes = collectBindingLineageContinuityBlockReasons({
    approval_evidence_current: input.approval_evidence_current,
    authority_binding: input.authority_binding,
    authority_request: input.authority_request,
    checked_token_binding: checkedTokenBinding,
    step_up_evidence_current: input.step_up_evidence_current,
  });

  if (blockReasonCodes.length > 0) {
    return {
      block_reason_codes: blockReasonCodes,
      checked_token_binding: checkedTokenBinding,
      checked_token_version_ref_or_null: null,
      pass_reason_code_or_null: null,
    };
  }

  return {
    block_reason_codes: [],
    checked_token_binding: checkedTokenBinding,
    checked_token_version_ref_or_null: checkedTokenBinding.token_version_ref,
    pass_reason_code_or_null:
      checkedTokenBinding.token_version_ref === input.authority_binding.token_version_ref
        ? "SEALED_TOKEN_VERSION_REUSED"
        : "TOKEN_ROTATED_WITHIN_LINEAGE",
  };
}
