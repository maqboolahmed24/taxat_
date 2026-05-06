import { AuthorityModelError, normalizeTimestamp, requireString } from "../models/authority_common.ts";
import { AuthoritySendClaimStore, type AuthoritySendClaimRecord } from "./acquire_exclusive_authority_send_claim.ts";

export type ReleaseOrCloseAuthoritySendClaimResult = {
  claim_record: AuthoritySendClaimRecord;
};

export function releaseOrCloseAuthoritySendClaim(input: {
  claim_owner_ref: string;
  closed_at: string;
  dispatch_ref: string;
  duplicate_meaning_key: string;
  release_reason_code: "SEND_ABORTED_BEFORE_TRANSMIT" | "SEND_TRANSMITTED" | "WORKER_RECOVERY_RELEASE";
  request_hash: string;
  store: AuthoritySendClaimStore;
}): ReleaseOrCloseAuthoritySendClaimResult {
  const existing = input.store.get({
    dispatch_ref: input.dispatch_ref,
    duplicate_meaning_key: input.duplicate_meaning_key,
    request_hash: input.request_hash,
  });
  if (existing === null) {
    throw new AuthorityModelError("AUTHORITY_REPOSITORY_INVALID", "authority send claim does not exist");
  }
  const owner = requireString("claim_owner_ref", input.claim_owner_ref);
  if (existing.claim_owner_ref !== owner) {
    throw new AuthorityModelError(
      "AUTHORITY_REPOSITORY_INVALID",
      "only the active authority send claim owner may release or close the claim",
    );
  }
  const closed = input.store.put({
    ...existing,
    claim_state: input.release_reason_code === "SEND_TRANSMITTED" ? "CLOSED" : "RELEASED",
    closed_at: normalizeTimestamp("closed_at", input.closed_at),
    release_reason_code: input.release_reason_code,
  });
  return { claim_record: closed };
}
