import { AuthorityModelError, cloneRecord, normalizeTimestamp, requireString } from "../models/authority_common.ts";

export type AuthoritySendClaimLifecycleState = "DISPATCH_READY" | "TRANSMIT_IN_FLIGHT";
export type AuthoritySendClaimState = "CLAIM_HELD" | "CLAIM_CONFLICT";

export type AuthoritySendClaimRecord = {
  claim_owner_ref: string;
  claim_state: "ACTIVE" | "RELEASED" | "CLOSED";
  claimed_at: string;
  closed_at: string | null;
  dispatch_ref: string;
  duplicate_meaning_key: string;
  lifecycle_state: AuthoritySendClaimLifecycleState;
  release_reason_code: string | null;
  request_hash: string;
};

export type AcquireExclusiveAuthoritySendClaimResult = {
  claim_record: AuthoritySendClaimRecord | null;
  exclusive_send_claim_state: AuthoritySendClaimState;
  reason_codes: ("SEND_CLAIM_ACQUIRED" | "SEND_CLAIM_REENTERED" | "SEND_CLAIM_CONFLICT")[];
};

export class AuthoritySendClaimStore {
  private readonly records = new Map<string, AuthoritySendClaimRecord>();

  private key(input: Pick<AuthoritySendClaimRecord, "dispatch_ref" | "duplicate_meaning_key" | "request_hash">) {
    return `${input.dispatch_ref}:${input.request_hash}:${input.duplicate_meaning_key}`;
  }

  get(input: Pick<AuthoritySendClaimRecord, "dispatch_ref" | "duplicate_meaning_key" | "request_hash">) {
    const record = this.records.get(this.key(input));
    return record ? cloneRecord(record) : null;
  }

  put(record: AuthoritySendClaimRecord) {
    this.records.set(this.key(record), cloneRecord(record));
    return cloneRecord(record);
  }
}

export function acquireExclusiveAuthoritySendClaim(input: {
  claim_owner_ref: string;
  claimed_at: string;
  dispatch_ref: string;
  duplicate_meaning_key: string;
  lifecycle_state: AuthoritySendClaimLifecycleState;
  request_hash: string;
  store: AuthoritySendClaimStore;
}): AcquireExclusiveAuthoritySendClaimResult {
  const keyInput = {
    dispatch_ref: requireString("dispatch_ref", input.dispatch_ref),
    duplicate_meaning_key: requireString("duplicate_meaning_key", input.duplicate_meaning_key),
    request_hash: requireString("request_hash", input.request_hash),
  };
  if (input.lifecycle_state !== "DISPATCH_READY") {
    throw new AuthorityModelError(
      "AUTHORITY_CONTRACT_INVALID",
      "exclusive authority send claims may be acquired only from DISPATCH_READY",
    );
  }
  const existing = input.store.get(keyInput);
  const owner = requireString("claim_owner_ref", input.claim_owner_ref);
  if (existing !== null && existing.claim_state === "ACTIVE") {
    if (existing.claim_owner_ref === owner) {
      return {
        claim_record: existing,
        exclusive_send_claim_state: "CLAIM_HELD",
        reason_codes: ["SEND_CLAIM_REENTERED"],
      };
    }
    return {
      claim_record: existing,
      exclusive_send_claim_state: "CLAIM_CONFLICT",
      reason_codes: ["SEND_CLAIM_CONFLICT"],
    };
  }

  const record = input.store.put({
    claim_owner_ref: owner,
    claim_state: "ACTIVE",
    claimed_at: normalizeTimestamp("claimed_at", input.claimed_at),
    closed_at: null,
    dispatch_ref: keyInput.dispatch_ref,
    duplicate_meaning_key: keyInput.duplicate_meaning_key,
    lifecycle_state: input.lifecycle_state,
    release_reason_code: null,
    request_hash: keyInput.request_hash,
  });
  return {
    claim_record: record,
    exclusive_send_claim_state: "CLAIM_HELD",
    reason_codes: ["SEND_CLAIM_ACQUIRED"],
  };
}
