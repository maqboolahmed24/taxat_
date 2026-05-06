import { stableJsonHash } from "../../../domain-kernel/src/primitives/hash.ts";
import {
  AuthorityModelError,
  assertEnum,
  normalizeNullableString,
  normalizeNullableTimestamp,
  normalizeSortedStringSet,
  normalizeTimestamp,
  requireString,
} from "../models/authority_common.ts";
import type { AuthorityBinding } from "../models/authority_binding.ts";
import type { AuthorityRequestEnvelope } from "../models/authority_request_envelope.ts";

export const AUTHORITY_BINDING_DRIFT_SENTINEL_ACTIONS = [
  "NOT_YET_ATTEMPTED",
  "TRANSMIT_MUTATION",
  "RECONCILIATION_POLL",
  "RECOVERY_READ",
] as const;

export const AUTHORITY_BINDING_DRIFT_SENTINEL_DECISIONS = [
  "NOT_EVALUATED",
  "CLEAR_TO_PROCEED",
  "BLOCKED",
] as const;

export const AUTHORITY_BINDING_DRIFT_SENTINEL_PASS_REASONS = [
  "SEALED_TOKEN_VERSION_REUSED",
  "TOKEN_ROTATED_WITHIN_LINEAGE",
] as const;

export const AUTHORITY_BINDING_DRIFT_SENTINEL_BLOCK_REASONS = [
  "SEND_CLAIM_CONFLICT",
  "TOKEN_VERSION_NOT_USABLE",
  "BINDING_LINEAGE_DRIFT",
  "AUTHORITY_LINK_NOT_ACTIVE",
  "CLIENT_SUBJECT_SCOPE_DRIFT",
  "PROVIDER_CONTRACT_DRIFT",
  "ACCESS_BINDING_HASH_DRIFT",
  "POLICY_SNAPSHOT_HASH_DRIFT",
  "STEP_UP_OR_APPROVAL_DRIFT",
  "DUPLICATE_BUCKET_CHANGED",
  "STRONGER_EXTERNAL_TRUTH_PRESENT",
  "BODY_COLLISION_PRESENT",
] as const;

export type BindingDriftSentinelAction = (typeof AUTHORITY_BINDING_DRIFT_SENTINEL_ACTIONS)[number];
export type BindingDriftSentinelDecision = (typeof AUTHORITY_BINDING_DRIFT_SENTINEL_DECISIONS)[number];
export type BindingDriftSentinelPassReason =
  (typeof AUTHORITY_BINDING_DRIFT_SENTINEL_PASS_REASONS)[number];
export type BindingDriftSentinelBlockReason =
  (typeof AUTHORITY_BINDING_DRIFT_SENTINEL_BLOCK_REASONS)[number];
export type DuplicateTruthInputsState =
  | "NOT_CHECKED"
  | "RECHECKED_NO_CONFLICT"
  | "NEWER_TRUTH_OR_DUPLICATE_PRESENT";
export type ExclusiveSendClaimState = "NOT_APPLICABLE" | "CLAIM_HELD" | "CLAIM_CONFLICT";

export type AuthorityBindingDriftSentinelContract = {
  access_binding_hash: string;
  acting_party_ref: string;
  authority_binding_ref: string;
  authority_link_ref: string;
  authority_scope: string;
  binding_lineage_ref: string;
  binding_scope_class: "AUTHORITY_INTERACTION_RECORD";
  binding_verification_policy: "RECHECK_BOUND_IDENTITY_AND_LIVE_AUTHORITY_CONTEXT_BEFORE_NETWORK_ACTION";
  block_reason_codes: BindingDriftSentinelBlockReason[];
  checked_action_class: BindingDriftSentinelAction;
  checked_at: string | null;
  checked_token_version_ref_or_null: string | null;
  client_id: string;
  contract_version: "AUTHORITY_BINDING_DRIFT_SENTINEL_V1";
  decision_state: BindingDriftSentinelDecision;
  delegation_grant_ref_or_null: string | null;
  duplicate_meaning_key: string;
  duplicate_truth_inputs_state: DuplicateTruthInputsState;
  duplicate_truth_policy: "LATEST_DUPLICATE_AND_STRONGER_TRUTH_MUST_BLOCK_OR_RECONCILE";
  exclusive_send_claim_state: ExclusiveSendClaimState;
  latest_ingress_receipt_ref_or_null: string | null;
  latest_obligation_mirror_ref_or_null: string | null;
  latest_submission_record_ref_or_null: string | null;
  lineage_reuse_policy: "SEALED_REQUEST_LINEAGE_ONLY_NO_SILENT_REBIND";
  pass_reason_code_or_null: BindingDriftSentinelPassReason | null;
  policy_snapshot_hash: string;
  provider_api_version: string;
  provider_environment: string;
  sealed_token_version_ref: string;
  sentinel_contract_hash: string;
  subject_ref: string;
  tenant_id: string;
};

export type BuildBindingDriftSentinelContractInput = {
  authority_binding?: AuthorityBinding;
  authority_request?: AuthorityRequestEnvelope;
  checked_action_class: BindingDriftSentinelAction;
  checked_at?: string | null;
  checked_token_version_ref_or_null?: string | null;
  decision_state: BindingDriftSentinelDecision;
  duplicate_meaning_key?: string;
  duplicate_truth_inputs_state?: DuplicateTruthInputsState;
  exclusive_send_claim_state?: ExclusiveSendClaimState;
  latest_ingress_receipt_ref_or_null?: string | null;
  latest_obligation_mirror_ref_or_null?: string | null;
  latest_submission_record_ref_or_null?: string | null;
  pass_reason_code_or_null?: BindingDriftSentinelPassReason | null;
  block_reason_codes?: readonly BindingDriftSentinelBlockReason[];
  sealed_binding_identity?: Pick<
    AuthorityBindingDriftSentinelContract,
    | "access_binding_hash"
    | "acting_party_ref"
    | "authority_binding_ref"
    | "authority_link_ref"
    | "authority_scope"
    | "binding_lineage_ref"
    | "client_id"
    | "delegation_grant_ref_or_null"
    | "policy_snapshot_hash"
    | "provider_api_version"
    | "provider_environment"
    | "sealed_token_version_ref"
    | "subject_ref"
    | "tenant_id"
  >;
};

const DUPLICATE_TRUTH_BLOCK_REASONS = new Set<BindingDriftSentinelBlockReason>([
  "DUPLICATE_BUCKET_CHANGED",
  "STRONGER_EXTERNAL_TRUTH_PRESENT",
]);

function deriveAuthorityBindingRef(binding: AuthorityBinding) {
  return binding.authority_binding_id.startsWith("authority-binding://")
    ? binding.authority_binding_id
    : `authority-binding://${binding.authority_binding_id}`;
}

function sealedIdentity(input: BuildBindingDriftSentinelContractInput) {
  if (input.sealed_binding_identity !== undefined) {
    return input.sealed_binding_identity;
  }
  if (input.authority_binding === undefined) {
    throw new AuthorityModelError(
      "AUTHORITY_FIELD_REQUIRED",
      "authority_binding or sealed_binding_identity is required to build binding drift sentinel",
    );
  }
  const binding = input.authority_binding;
  return {
    access_binding_hash: binding.access_binding_hash,
    acting_party_ref: binding.acting_party_ref,
    authority_binding_ref: deriveAuthorityBindingRef(binding),
    authority_link_ref: binding.authority_link_ref,
    authority_scope: binding.authority_scope,
    binding_lineage_ref: binding.binding_lineage_ref,
    client_id: binding.client_id,
    delegation_grant_ref_or_null: binding.delegation_grant_ref,
    policy_snapshot_hash: binding.policy_snapshot_hash,
    provider_api_version: binding.provider_api_version,
    provider_environment: binding.provider_environment,
    sealed_token_version_ref: binding.token_version_ref,
    subject_ref: binding.subject_ref,
    tenant_id: binding.tenant_id,
  };
}

function sortedBlockReasons(values: readonly BindingDriftSentinelBlockReason[] | undefined) {
  const normalized = normalizeSortedStringSet("block_reason_codes", values ?? []).map((code) =>
    assertEnum("block_reason_codes", code, AUTHORITY_BINDING_DRIFT_SENTINEL_BLOCK_REASONS),
  );
  return normalized;
}

function normalizeSentinelWithoutHash(
  input: BuildBindingDriftSentinelContractInput,
): Omit<AuthorityBindingDriftSentinelContract, "sentinel_contract_hash"> {
  const identity = sealedIdentity(input);
  const checkedAction = assertEnum(
    "checked_action_class",
    input.checked_action_class,
    AUTHORITY_BINDING_DRIFT_SENTINEL_ACTIONS,
  );
  const decisionState = assertEnum(
    "decision_state",
    input.decision_state,
    AUTHORITY_BINDING_DRIFT_SENTINEL_DECISIONS,
  );
  const blockReasons = sortedBlockReasons(input.block_reason_codes);
  const passReason = input.pass_reason_code_or_null == null
    ? null
    : assertEnum(
        "pass_reason_code_or_null",
        input.pass_reason_code_or_null,
        AUTHORITY_BINDING_DRIFT_SENTINEL_PASS_REASONS,
      );
  return {
    access_binding_hash: requireString("access_binding_hash", identity.access_binding_hash),
    acting_party_ref: requireString("acting_party_ref", identity.acting_party_ref),
    authority_binding_ref: requireString("authority_binding_ref", identity.authority_binding_ref),
    authority_link_ref: requireString("authority_link_ref", identity.authority_link_ref),
    authority_scope: requireString("authority_scope", identity.authority_scope),
    binding_lineage_ref: requireString("binding_lineage_ref", identity.binding_lineage_ref),
    binding_scope_class: "AUTHORITY_INTERACTION_RECORD",
    binding_verification_policy: "RECHECK_BOUND_IDENTITY_AND_LIVE_AUTHORITY_CONTEXT_BEFORE_NETWORK_ACTION",
    block_reason_codes: blockReasons,
    checked_action_class: checkedAction,
    checked_at: input.checked_at == null ? null : normalizeTimestamp("checked_at", input.checked_at),
    checked_token_version_ref_or_null: normalizeNullableString(
      "checked_token_version_ref_or_null",
      input.checked_token_version_ref_or_null ?? null,
    ),
    client_id: requireString("client_id", identity.client_id),
    contract_version: "AUTHORITY_BINDING_DRIFT_SENTINEL_V1",
    decision_state: decisionState,
    delegation_grant_ref_or_null: normalizeNullableString(
      "delegation_grant_ref_or_null",
      identity.delegation_grant_ref_or_null,
    ),
    duplicate_meaning_key: requireString(
      "duplicate_meaning_key",
      input.duplicate_meaning_key ?? input.authority_request?.duplicate_meaning_key,
    ),
    duplicate_truth_inputs_state: input.duplicate_truth_inputs_state ?? "NOT_CHECKED",
    duplicate_truth_policy: "LATEST_DUPLICATE_AND_STRONGER_TRUTH_MUST_BLOCK_OR_RECONCILE",
    exclusive_send_claim_state: input.exclusive_send_claim_state ?? "NOT_APPLICABLE",
    latest_ingress_receipt_ref_or_null: normalizeNullableString(
      "latest_ingress_receipt_ref_or_null",
      input.latest_ingress_receipt_ref_or_null ?? null,
    ),
    latest_obligation_mirror_ref_or_null: normalizeNullableString(
      "latest_obligation_mirror_ref_or_null",
      input.latest_obligation_mirror_ref_or_null ?? null,
    ),
    latest_submission_record_ref_or_null: normalizeNullableString(
      "latest_submission_record_ref_or_null",
      input.latest_submission_record_ref_or_null ?? null,
    ),
    lineage_reuse_policy: "SEALED_REQUEST_LINEAGE_ONLY_NO_SILENT_REBIND",
    pass_reason_code_or_null: passReason,
    policy_snapshot_hash: requireString("policy_snapshot_hash", identity.policy_snapshot_hash),
    provider_api_version: requireString("provider_api_version", identity.provider_api_version),
    provider_environment: requireString("provider_environment", identity.provider_environment),
    sealed_token_version_ref: requireString("sealed_token_version_ref", identity.sealed_token_version_ref),
    subject_ref: requireString("subject_ref", identity.subject_ref),
    tenant_id: requireString("tenant_id", identity.tenant_id),
  };
}

export function authorityBindingDriftSentinelContractHash(
  contract: Omit<AuthorityBindingDriftSentinelContract, "sentinel_contract_hash">,
) {
  return stableJsonHash({
    access_binding_hash: contract.access_binding_hash,
    acting_party_ref: contract.acting_party_ref,
    authority_binding_ref: contract.authority_binding_ref,
    authority_link_ref: contract.authority_link_ref,
    authority_scope: contract.authority_scope,
    binding_lineage_ref: contract.binding_lineage_ref,
    binding_scope_class: contract.binding_scope_class,
    binding_verification_policy: contract.binding_verification_policy,
    block_reason_codes: [...contract.block_reason_codes].sort(),
    checked_action_class: contract.checked_action_class,
    checked_at: contract.checked_at,
    checked_token_version_ref_or_null: contract.checked_token_version_ref_or_null,
    client_id: contract.client_id,
    contract_version: contract.contract_version,
    decision_state: contract.decision_state,
    delegation_grant_ref_or_null: contract.delegation_grant_ref_or_null,
    duplicate_meaning_key: contract.duplicate_meaning_key,
    duplicate_truth_inputs_state: contract.duplicate_truth_inputs_state,
    duplicate_truth_policy: contract.duplicate_truth_policy,
    exclusive_send_claim_state: contract.exclusive_send_claim_state,
    latest_ingress_receipt_ref_or_null: contract.latest_ingress_receipt_ref_or_null,
    latest_obligation_mirror_ref_or_null: contract.latest_obligation_mirror_ref_or_null,
    latest_submission_record_ref_or_null: contract.latest_submission_record_ref_or_null,
    lineage_reuse_policy: contract.lineage_reuse_policy,
    pass_reason_code_or_null: contract.pass_reason_code_or_null,
    policy_snapshot_hash: contract.policy_snapshot_hash,
    provider_api_version: contract.provider_api_version,
    provider_environment: contract.provider_environment,
    sealed_token_version_ref: contract.sealed_token_version_ref,
    subject_ref: contract.subject_ref,
    tenant_id: contract.tenant_id,
  });
}

function assertSentinelInvariants(contract: Omit<AuthorityBindingDriftSentinelContract, "sentinel_contract_hash">) {
  const duplicateTruthBlocked = contract.block_reason_codes.some((code) =>
    DUPLICATE_TRUTH_BLOCK_REASONS.has(code),
  );
  const hasLatestTruthRef =
    contract.latest_submission_record_ref_or_null !== null ||
    contract.latest_obligation_mirror_ref_or_null !== null ||
    contract.latest_ingress_receipt_ref_or_null !== null;

  if (contract.decision_state === "NOT_EVALUATED") {
    if (
      contract.checked_action_class !== "NOT_YET_ATTEMPTED" ||
      contract.checked_at !== null ||
      contract.checked_token_version_ref_or_null !== null ||
      contract.duplicate_truth_inputs_state !== "NOT_CHECKED" ||
      contract.exclusive_send_claim_state !== "NOT_APPLICABLE" ||
      contract.pass_reason_code_or_null !== null ||
      contract.block_reason_codes.length > 0
    ) {
      throw new AuthorityModelError(
        "AUTHORITY_CONTRACT_INVALID",
        "unevaluated binding drift sentinels must not retain checked token, claim, pass, or block evidence",
      );
    }
    return;
  }

  normalizeNullableTimestamp("checked_at", contract.checked_at);
  if (contract.checked_action_class === "NOT_YET_ATTEMPTED") {
    throw new AuthorityModelError(
      "AUTHORITY_CONTRACT_INVALID",
      "evaluated binding drift sentinels must name a live action",
    );
  }
  if (contract.duplicate_truth_inputs_state === "NOT_CHECKED") {
    throw new AuthorityModelError(
      "AUTHORITY_CONTRACT_INVALID",
      "evaluated binding drift sentinels must retain duplicate-truth consultation posture",
    );
  }

  if (contract.decision_state === "CLEAR_TO_PROCEED") {
    if (
      contract.checked_token_version_ref_or_null === null ||
      contract.pass_reason_code_or_null === null ||
      contract.block_reason_codes.length > 0 ||
      contract.duplicate_truth_inputs_state !== "RECHECKED_NO_CONFLICT"
    ) {
      throw new AuthorityModelError(
        "AUTHORITY_CONTRACT_INVALID",
        "clear binding drift sentinels require checked token, one pass reason, no blocks, and no duplicate conflict",
      );
    }
    if (
      contract.pass_reason_code_or_null === "SEALED_TOKEN_VERSION_REUSED" &&
      contract.checked_token_version_ref_or_null !== contract.sealed_token_version_ref
    ) {
      throw new AuthorityModelError(
        "AUTHORITY_CONTRACT_INVALID",
        "SEALED_TOKEN_VERSION_REUSED requires checked token version to equal sealed token version",
      );
    }
    if (
      contract.pass_reason_code_or_null === "TOKEN_ROTATED_WITHIN_LINEAGE" &&
      contract.checked_token_version_ref_or_null === contract.sealed_token_version_ref
    ) {
      throw new AuthorityModelError(
        "AUTHORITY_CONTRACT_INVALID",
        "TOKEN_ROTATED_WITHIN_LINEAGE requires checked token version to differ from sealed token version",
      );
    }
  }

  if (contract.decision_state === "BLOCKED") {
    if (
      contract.checked_token_version_ref_or_null !== null ||
      contract.pass_reason_code_or_null !== null ||
      contract.block_reason_codes.length === 0
    ) {
      throw new AuthorityModelError(
        "AUTHORITY_CONTRACT_INVALID",
        "blocked binding drift sentinels must clear checked token/pass evidence and retain block reasons",
      );
    }
    if (duplicateTruthBlocked) {
      if (contract.duplicate_truth_inputs_state !== "NEWER_TRUTH_OR_DUPLICATE_PRESENT" || !hasLatestTruthRef) {
        throw new AuthorityModelError(
          "AUTHORITY_CONTRACT_INVALID",
          "duplicate or stronger-truth blocks require NEWER_TRUTH_OR_DUPLICATE_PRESENT and a latest-truth ref",
        );
      }
    } else if (contract.duplicate_truth_inputs_state !== "RECHECKED_NO_CONFLICT") {
      throw new AuthorityModelError(
        "AUTHORITY_CONTRACT_INVALID",
        "binding-only blocks must keep duplicate truth state RECHECKED_NO_CONFLICT",
      );
    }
  }

  if (contract.checked_action_class === "TRANSMIT_MUTATION") {
    const expectedClaim =
      contract.decision_state === "BLOCKED" && contract.block_reason_codes.includes("SEND_CLAIM_CONFLICT")
        ? "CLAIM_CONFLICT"
        : "CLAIM_HELD";
    if (contract.exclusive_send_claim_state !== expectedClaim) {
      throw new AuthorityModelError(
        "AUTHORITY_CONTRACT_INVALID",
        `transmit sentinel requires exclusive_send_claim_state ${expectedClaim}`,
      );
    }
  } else if (contract.exclusive_send_claim_state !== "NOT_APPLICABLE") {
    throw new AuthorityModelError(
      "AUTHORITY_CONTRACT_INVALID",
      "reconciliation and recovery sentinels must not retain transmit claim state",
    );
  }
}

export function buildBindingDriftSentinelContract(
  input: BuildBindingDriftSentinelContractInput,
): AuthorityBindingDriftSentinelContract {
  const withoutHash = normalizeSentinelWithoutHash(input);
  assertSentinelInvariants(withoutHash);
  return {
    ...withoutHash,
    sentinel_contract_hash: authorityBindingDriftSentinelContractHash(withoutHash),
  };
}
