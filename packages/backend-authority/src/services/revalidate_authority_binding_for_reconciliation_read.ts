import type { AuthorityBinding } from "../models/authority_binding.ts";
import type { AuthorityRequestEnvelope } from "../models/authority_request_envelope.ts";
import type {
  AuthorityRequestIdentityLookupRecord,
  AuthorityRequestIdentityLookupRepository,
} from "../repositories/authority_request_identity_lookup_repository.ts";
import type { HmrcOauthTokenClientBindingContext } from "./assert_binding_lineage_continuity.ts";
import {
  buildBindingDriftSentinelContract,
  type AuthorityBindingDriftSentinelContract,
  type BindingDriftSentinelAction,
  type BindingDriftSentinelBlockReason,
} from "./build_binding_drift_sentinel_contract.ts";
import {
  resolveAuthorityDuplicateBucket,
  type AuthorityDuplicateBucketResolution,
} from "./resolve_authority_duplicate_bucket.ts";
import { resolveHmrcOauthTokenClientBinding } from "./resolve_hmrc_oauth_token_client_binding.ts";

export type RevalidateAuthorityBindingForReconciliationReadResult = {
  duplicate_bucket_resolution: AuthorityDuplicateBucketResolution | null;
  sentinel: AuthorityBindingDriftSentinelContract;
};

function duplicateReasons(resolution: AuthorityDuplicateBucketResolution | null): BindingDriftSentinelBlockReason[] {
  if (resolution === null || ["EMPTY_BUCKET", "EXACT_REPLAY_REUSE"].includes(resolution.resolution_state)) {
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

export async function revalidateAuthorityBindingForReconciliationRead(input: {
  authority_binding: AuthorityBinding;
  authority_request: AuthorityRequestEnvelope;
  checked_action_class: Extract<BindingDriftSentinelAction, "RECONCILIATION_POLL" | "RECOVERY_READ">;
  checked_at: string;
  checked_token_binding?: HmrcOauthTokenClientBindingContext;
  duplicate_lookup_candidate?: AuthorityRequestIdentityLookupRecord;
  duplicate_lookup_repository?: AuthorityRequestIdentityLookupRepository;
  latest_ingress_receipt_ref_or_null?: string | null;
  latest_obligation_mirror_ref_or_null?: string | null;
  latest_submission_record_ref_or_null?: string | null;
}): Promise<RevalidateAuthorityBindingForReconciliationReadResult> {
  const tokenResolution = resolveHmrcOauthTokenClientBinding({
    authority_binding: input.authority_binding,
    authority_request: input.authority_request,
    checked_token_binding: input.checked_token_binding,
  });
  const duplicateBucketResolution =
    input.duplicate_lookup_candidate !== undefined && input.duplicate_lookup_repository !== undefined
      ? await resolveAuthorityDuplicateBucket({
          candidate: input.duplicate_lookup_candidate,
          repository: input.duplicate_lookup_repository,
        })
      : null;
  const duplicateBlockReasons = duplicateReasons(duplicateBucketResolution);
  const blockReasonCodes = [...new Set([...tokenResolution.block_reason_codes, ...duplicateBlockReasons])].sort();
  const decisionState = blockReasonCodes.length > 0 ? "BLOCKED" : "CLEAR_TO_PROCEED";
  const latestRefs = latestRefsFromResolution(duplicateBucketResolution);

  return {
    duplicate_bucket_resolution: duplicateBucketResolution,
    sentinel: buildBindingDriftSentinelContract({
      authority_binding: input.authority_binding,
      authority_request: input.authority_request,
      block_reason_codes: blockReasonCodes,
      checked_action_class: input.checked_action_class,
      checked_at: input.checked_at,
      checked_token_version_ref_or_null:
        decisionState === "CLEAR_TO_PROCEED" ? tokenResolution.checked_token_version_ref_or_null : null,
      decision_state: decisionState,
      duplicate_truth_inputs_state: duplicateBlockReasons.length > 0
        ? "NEWER_TRUTH_OR_DUPLICATE_PRESENT"
        : "RECHECKED_NO_CONFLICT",
      exclusive_send_claim_state: "NOT_APPLICABLE",
      latest_ingress_receipt_ref_or_null: input.latest_ingress_receipt_ref_or_null ?? latestRefs.latest_ingress_receipt_ref_or_null ?? null,
      latest_obligation_mirror_ref_or_null: input.latest_obligation_mirror_ref_or_null ?? null,
      latest_submission_record_ref_or_null: input.latest_submission_record_ref_or_null ?? latestRefs.latest_submission_record_ref_or_null ?? null,
      pass_reason_code_or_null:
        decisionState === "CLEAR_TO_PROCEED" ? tokenResolution.pass_reason_code_or_null : null,
    }),
  };
}
