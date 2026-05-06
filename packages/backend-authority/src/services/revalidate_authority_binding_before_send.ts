import type { AuthorityBinding } from "../models/authority_binding.ts";
import type { AuthorityRequestEnvelope } from "../models/authority_request_envelope.ts";
import {
  acquireExclusiveAuthoritySendClaim,
  AuthoritySendClaimStore,
  type AcquireExclusiveAuthoritySendClaimResult,
} from "./acquire_exclusive_authority_send_claim.ts";
import type { HmrcOauthTokenClientBindingContext } from "./assert_binding_lineage_continuity.ts";
import {
  buildBindingDriftSentinelContract,
  type AuthorityBindingDriftSentinelContract,
  type BindingDriftSentinelBlockReason,
} from "./build_binding_drift_sentinel_contract.ts";
import { classifySendRevalidationOutcome, type SendRevalidationProjection } from "./classify_send_revalidation_outcome.ts";
import {
  persistSendRevalidationProjection,
  type AuthoritySendRevalidationProjectionRepository,
  type AuthorityInteractionSendRevalidationProjection,
} from "./persist_send_revalidation_projection.ts";
import {
  resolveAuthorityDuplicateBucket,
  type AuthorityDuplicateBucketResolution,
} from "./resolve_authority_duplicate_bucket.ts";
import { resolveHmrcOauthTokenClientBinding } from "./resolve_hmrc_oauth_token_client_binding.ts";
import type {
  AuthorityRequestIdentityLookupRecord,
  AuthorityRequestIdentityLookupRepository,
} from "../repositories/authority_request_identity_lookup_repository.ts";

export type RevalidateAuthorityBindingBeforeSendResult = {
  claim: AcquireExclusiveAuthoritySendClaimResult;
  duplicate_bucket_resolution: AuthorityDuplicateBucketResolution | null;
  projection: SendRevalidationProjection;
  persisted_projection: AuthorityInteractionSendRevalidationProjection | null;
  sentinel: AuthorityBindingDriftSentinelContract;
};

function latestRefsFromResolution(resolution: AuthorityDuplicateBucketResolution | null) {
  const firstConflictId =
    resolution?.duplicate_conflict.conflicting_lookup_ids[0] ??
    resolution?.request_collision.conflicting_lookup_ids[0] ??
    null;
  const record = firstConflictId
    ? resolution?.existing_records.find((entry) => entry.lookup_id === firstConflictId)
    : undefined;
  if (record === undefined) {
    return {};
  }
  if (record.source_record_type === "SUBMISSION_RECORD" || record.source_record_type === "EXTERNAL_STRONGER_TRUTH") {
    return { latest_submission_record_ref_or_null: record.source_record_ref };
  }
  return { latest_ingress_receipt_ref_or_null: record.source_record_ref };
}

function duplicateBlockReasons(
  resolution: AuthorityDuplicateBucketResolution | null,
): BindingDriftSentinelBlockReason[] {
  if (resolution === null || resolution.resolution_state === "EMPTY_BUCKET" || resolution.resolution_state === "EXACT_REPLAY_REUSE") {
    return [];
  }
  if (resolution.duplicate_conflict.code === "STALE_DUPLICATE_BUCKET_STRONGER_TRUTH") {
    return ["STRONGER_EXTERNAL_TRUTH_PRESENT"];
  }
  if (resolution.duplicate_conflict.code === "BODY_COLLISION" || resolution.request_collision.code === "EXACT_REQUEST_COLLISION") {
    return ["BODY_COLLISION_PRESENT"];
  }
  if (
    resolution.duplicate_conflict.code === "CONFLICTING_ACCESS_BINDING_HASH" ||
    resolution.request_collision.code === "CONFLICTING_ACCESS_BINDING_HASH"
  ) {
    return ["ACCESS_BINDING_HASH_DRIFT"];
  }
  if (
    resolution.duplicate_conflict.code === "IDENTITY_NAMESPACE_COLLISION" ||
    resolution.request_collision.code === "IDENTITY_NAMESPACE_COLLISION"
  ) {
    return ["BINDING_LINEAGE_DRIFT"];
  }
  return ["DUPLICATE_BUCKET_CHANGED"];
}

function uniqueBlockReasons(reasons: readonly BindingDriftSentinelBlockReason[]) {
  return [...new Set(reasons)].sort();
}

export async function revalidateAuthorityBindingBeforeSend(input: {
  authority_binding: AuthorityBinding;
  authority_request: AuthorityRequestEnvelope;
  checked_at: string;
  checked_token_binding?: HmrcOauthTokenClientBindingContext;
  claim_owner_ref: string;
  dispatch_ref: string;
  duplicate_lookup_candidate?: AuthorityRequestIdentityLookupRecord;
  duplicate_lookup_repository?: AuthorityRequestIdentityLookupRepository;
  latest_ingress_receipt_ref_or_null?: string | null;
  latest_obligation_mirror_ref_or_null?: string | null;
  latest_submission_record_ref_or_null?: string | null;
  projection_interaction_id?: string;
  projection_repository?: AuthoritySendRevalidationProjectionRepository;
  send_claim_store?: AuthoritySendClaimStore;
  step_up_evidence_current?: boolean;
  approval_evidence_current?: boolean;
}): Promise<RevalidateAuthorityBindingBeforeSendResult> {
  const claimStore = input.send_claim_store ?? new AuthoritySendClaimStore();
  const claim = acquireExclusiveAuthoritySendClaim({
    claim_owner_ref: input.claim_owner_ref,
    claimed_at: input.checked_at,
    dispatch_ref: input.dispatch_ref,
    duplicate_meaning_key: input.authority_request.duplicate_meaning_key,
    lifecycle_state: "DISPATCH_READY",
    request_hash: input.authority_request.request_hash,
    store: claimStore,
  });

  const tokenResolution = resolveHmrcOauthTokenClientBinding({
    approval_evidence_current: input.approval_evidence_current,
    authority_binding: input.authority_binding,
    authority_request: input.authority_request,
    checked_token_binding: input.checked_token_binding,
    step_up_evidence_current: input.step_up_evidence_current,
  });
  const duplicateBucketResolution =
    input.duplicate_lookup_candidate !== undefined && input.duplicate_lookup_repository !== undefined
      ? await resolveAuthorityDuplicateBucket({
          candidate: input.duplicate_lookup_candidate,
          repository: input.duplicate_lookup_repository,
        })
      : null;
  const duplicateReasons = duplicateBlockReasons(duplicateBucketResolution);
  const blockReasonCodes = uniqueBlockReasons([
    ...tokenResolution.block_reason_codes,
    ...duplicateReasons,
    ...(claim.exclusive_send_claim_state === "CLAIM_CONFLICT" ? ["SEND_CLAIM_CONFLICT" as const] : []),
  ]);
  const latestRefs = latestRefsFromResolution(duplicateBucketResolution);
  const decisionState = blockReasonCodes.length > 0 ? "BLOCKED" : "CLEAR_TO_PROCEED";
  const sentinel = buildBindingDriftSentinelContract({
    authority_binding: input.authority_binding,
    authority_request: input.authority_request,
    block_reason_codes: blockReasonCodes,
    checked_action_class: "TRANSMIT_MUTATION",
    checked_at: input.checked_at,
    checked_token_version_ref_or_null:
      decisionState === "CLEAR_TO_PROCEED" ? tokenResolution.checked_token_version_ref_or_null : null,
    decision_state: decisionState,
    duplicate_truth_inputs_state: duplicateReasons.length > 0
      ? "NEWER_TRUTH_OR_DUPLICATE_PRESENT"
      : "RECHECKED_NO_CONFLICT",
    exclusive_send_claim_state: claim.exclusive_send_claim_state,
    latest_ingress_receipt_ref_or_null: input.latest_ingress_receipt_ref_or_null ?? latestRefs.latest_ingress_receipt_ref_or_null ?? null,
    latest_obligation_mirror_ref_or_null: input.latest_obligation_mirror_ref_or_null ?? null,
    latest_submission_record_ref_or_null: input.latest_submission_record_ref_or_null ?? latestRefs.latest_submission_record_ref_or_null ?? null,
    pass_reason_code_or_null:
      decisionState === "CLEAR_TO_PROCEED" ? tokenResolution.pass_reason_code_or_null : null,
  });
  const projection = classifySendRevalidationOutcome(sentinel);
  const persistedProjection =
    input.projection_repository !== undefined && input.projection_interaction_id !== undefined
      ? await persistSendRevalidationProjection({
          dispatch_ref: input.dispatch_ref,
          interaction_id: input.projection_interaction_id,
          repository: input.projection_repository,
          request_hash: input.authority_request.request_hash,
          sentinel,
        })
      : null;

  return {
    claim,
    duplicate_bucket_resolution: duplicateBucketResolution,
    persisted_projection: persistedProjection,
    projection,
    sentinel,
  };
}
