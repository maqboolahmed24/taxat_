import { AuthorityModelError, normalizeNullableString, requireString } from "../models/authority_common.ts";
import type { AuthorityBinding } from "../models/authority_binding.ts";
import type { AuthorityRequestEnvelope } from "../models/authority_request_envelope.ts";
import type { BindingDriftSentinelBlockReason } from "./build_binding_drift_sentinel_contract.ts";

export type HmrcOauthTokenClientBindingContext = {
  access_binding_hash: string;
  acting_party_ref: string;
  authority_link_ref: string;
  authority_scope: string;
  binding_lineage_ref: string;
  client_id: string;
  delegation_grant_ref: string | null;
  policy_snapshot_hash: string;
  provider_api_version: string;
  provider_environment: string;
  subject_ref: string;
  tenant_id: string;
  token_binding_ref: string;
  token_client_binding_state: "BOUND" | "MISMATCH" | "UNVERIFIED";
  token_status: "USABLE" | "EXPIRED" | "REVOKED" | "MISSING" | "UNKNOWN";
  token_version_ref: string;
};

export type BindingLineageContinuityCheckInput = {
  authority_binding: AuthorityBinding;
  authority_request: AuthorityRequestEnvelope;
  checked_token_binding?: HmrcOauthTokenClientBindingContext;
  approval_evidence_current?: boolean;
  step_up_evidence_current?: boolean;
};

function tokenContextFromBinding(binding: AuthorityBinding): HmrcOauthTokenClientBindingContext {
  return {
    access_binding_hash: binding.access_binding_hash,
    acting_party_ref: binding.acting_party_ref,
    authority_link_ref: binding.authority_link_ref,
    authority_scope: binding.authority_scope,
    binding_lineage_ref: binding.binding_lineage_ref,
    client_id: binding.client_id,
    delegation_grant_ref: binding.delegation_grant_ref,
    policy_snapshot_hash: binding.policy_snapshot_hash,
    provider_api_version: binding.provider_api_version,
    provider_environment: binding.provider_environment,
    subject_ref: binding.subject_ref,
    tenant_id: binding.tenant_id,
    token_binding_ref: binding.token_binding_ref,
    token_client_binding_state: binding.token_client_binding_state,
    token_status: binding.binding_health === "TOKEN_INVALID" ? "REVOKED" : "USABLE",
    token_version_ref: binding.token_version_ref,
  };
}

function normalizeTokenContext(input: HmrcOauthTokenClientBindingContext): HmrcOauthTokenClientBindingContext {
  return {
    access_binding_hash: requireString("checked_token_binding.access_binding_hash", input.access_binding_hash),
    acting_party_ref: requireString("checked_token_binding.acting_party_ref", input.acting_party_ref),
    authority_link_ref: requireString("checked_token_binding.authority_link_ref", input.authority_link_ref),
    authority_scope: requireString("checked_token_binding.authority_scope", input.authority_scope),
    binding_lineage_ref: requireString("checked_token_binding.binding_lineage_ref", input.binding_lineage_ref),
    client_id: requireString("checked_token_binding.client_id", input.client_id),
    delegation_grant_ref: normalizeNullableString(
      "checked_token_binding.delegation_grant_ref",
      input.delegation_grant_ref,
    ),
    policy_snapshot_hash: requireString(
      "checked_token_binding.policy_snapshot_hash",
      input.policy_snapshot_hash,
    ),
    provider_api_version: requireString("checked_token_binding.provider_api_version", input.provider_api_version),
    provider_environment: requireString("checked_token_binding.provider_environment", input.provider_environment),
    subject_ref: requireString("checked_token_binding.subject_ref", input.subject_ref),
    tenant_id: requireString("checked_token_binding.tenant_id", input.tenant_id),
    token_binding_ref: requireString("checked_token_binding.token_binding_ref", input.token_binding_ref),
    token_client_binding_state: input.token_client_binding_state,
    token_status: input.token_status,
    token_version_ref: requireString("checked_token_binding.token_version_ref", input.token_version_ref),
  };
}

function push(reasonCodes: Set<BindingDriftSentinelBlockReason>, condition: boolean, reason: BindingDriftSentinelBlockReason) {
  if (condition) {
    reasonCodes.add(reason);
  }
}

export function collectBindingLineageContinuityBlockReasons(
  input: BindingLineageContinuityCheckInput,
): BindingDriftSentinelBlockReason[] {
  const binding = input.authority_binding;
  const request = input.authority_request;
  const token = normalizeTokenContext(input.checked_token_binding ?? tokenContextFromBinding(binding));
  const reasons = new Set<BindingDriftSentinelBlockReason>();

  push(reasons, binding.binding_lineage_ref !== request.binding_lineage_ref, "BINDING_LINEAGE_DRIFT");
  push(reasons, token.binding_lineage_ref !== binding.binding_lineage_ref, "BINDING_LINEAGE_DRIFT");
  push(reasons, token.token_binding_ref !== binding.token_binding_ref, "BINDING_LINEAGE_DRIFT");

  push(reasons, binding.authority_link_state !== "AUTHORISED_ACTIVE", "AUTHORITY_LINK_NOT_ACTIVE");
  push(reasons, binding.authority_link_ref !== request.authority_link_ref, "AUTHORITY_LINK_NOT_ACTIVE");
  push(reasons, token.authority_link_ref !== binding.authority_link_ref, "AUTHORITY_LINK_NOT_ACTIVE");

  push(reasons, binding.tenant_id !== request.tenant_id, "CLIENT_SUBJECT_SCOPE_DRIFT");
  push(reasons, binding.client_id !== request.client_id, "CLIENT_SUBJECT_SCOPE_DRIFT");
  push(reasons, binding.subject_ref !== request.subject_ref, "CLIENT_SUBJECT_SCOPE_DRIFT");
  push(reasons, binding.acting_party_ref !== request.acting_party_ref, "CLIENT_SUBJECT_SCOPE_DRIFT");
  push(reasons, binding.authority_scope !== request.authority_scope, "CLIENT_SUBJECT_SCOPE_DRIFT");
  push(reasons, token.tenant_id !== request.tenant_id, "CLIENT_SUBJECT_SCOPE_DRIFT");
  push(reasons, token.client_id !== request.client_id, "CLIENT_SUBJECT_SCOPE_DRIFT");
  push(reasons, token.subject_ref !== request.subject_ref, "CLIENT_SUBJECT_SCOPE_DRIFT");
  push(reasons, token.acting_party_ref !== request.acting_party_ref, "CLIENT_SUBJECT_SCOPE_DRIFT");
  push(reasons, token.authority_scope !== request.authority_scope, "CLIENT_SUBJECT_SCOPE_DRIFT");
  push(reasons, token.delegation_grant_ref !== request.delegation_grant_ref, "CLIENT_SUBJECT_SCOPE_DRIFT");

  push(reasons, binding.provider_environment !== request.provider_environment, "PROVIDER_CONTRACT_DRIFT");
  push(reasons, binding.provider_api_version !== request.provider_api_version, "PROVIDER_CONTRACT_DRIFT");
  push(reasons, token.provider_environment !== request.provider_environment, "PROVIDER_CONTRACT_DRIFT");
  push(reasons, token.provider_api_version !== request.provider_api_version, "PROVIDER_CONTRACT_DRIFT");

  push(reasons, binding.access_binding_hash !== request.access_binding_hash, "ACCESS_BINDING_HASH_DRIFT");
  push(reasons, token.access_binding_hash !== request.access_binding_hash, "ACCESS_BINDING_HASH_DRIFT");
  push(reasons, binding.policy_snapshot_hash !== request.policy_snapshot_hash, "POLICY_SNAPSHOT_HASH_DRIFT");
  push(reasons, token.policy_snapshot_hash !== request.policy_snapshot_hash, "POLICY_SNAPSHOT_HASH_DRIFT");

  push(
    reasons,
    binding.token_client_binding_state !== "BOUND" || token.token_client_binding_state !== "BOUND" || token.token_status !== "USABLE",
    "TOKEN_VERSION_NOT_USABLE",
  );
  push(
    reasons,
    binding.step_up_state === "SATISFIED" && input.step_up_evidence_current !== true,
    "STEP_UP_OR_APPROVAL_DRIFT",
  );
  push(
    reasons,
    binding.approval_state === "SATISFIED" && input.approval_evidence_current !== true,
    "STEP_UP_OR_APPROVAL_DRIFT",
  );

  return [...reasons].sort();
}

export function assertBindingLineageContinuity(input: BindingLineageContinuityCheckInput) {
  const reasons = collectBindingLineageContinuityBlockReasons(input);
  if (reasons.length > 0) {
    throw new AuthorityModelError(
      "AUTHORITY_IDENTITY_INVALID",
      `authority binding lineage drift detected: ${reasons.join(",")}`,
    );
  }
  return true;
}
