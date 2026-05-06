import { AuthorityModelError, cloneRecord, requireString, stableEqual } from "../models/authority_common.ts";
import type { AuthorityBindingDriftSentinelContract } from "./build_binding_drift_sentinel_contract.ts";
import { classifySendRevalidationOutcome, type SendRevalidationProjection } from "./classify_send_revalidation_outcome.ts";

export type AuthorityInteractionSendRevalidationProjection = SendRevalidationProjection & {
  binding_drift_sentinel_contract: AuthorityBindingDriftSentinelContract;
  dispatch_ref: string;
  interaction_id: string;
  request_hash: string;
  row_version: number;
};

export class AuthoritySendRevalidationProjectionRepository {
  private readonly records = new Map<string, AuthorityInteractionSendRevalidationProjection>();

  async persistSendRevalidationProjection(input: AuthorityInteractionSendRevalidationProjection) {
    const existing = this.records.get(input.interaction_id);
    if (existing !== undefined && !stableEqual(existing, input)) {
      throw new AuthorityModelError(
        "AUTHORITY_REPOSITORY_INVALID",
        `send revalidation projection ${input.interaction_id} is immutable once persisted`,
      );
    }
    if (existing !== undefined) {
      return cloneRecord(existing);
    }
    this.records.set(input.interaction_id, cloneRecord(input));
    return cloneRecord(input);
  }

  async getSendRevalidationProjection(interactionId: string) {
    const stored = this.records.get(interactionId);
    return stored ? cloneRecord(stored) : null;
  }
}

export async function persistSendRevalidationProjection(input: {
  dispatch_ref: string;
  interaction_id: string;
  repository: AuthoritySendRevalidationProjectionRepository;
  request_hash: string;
  sentinel: AuthorityBindingDriftSentinelContract;
}) {
  const projection = classifySendRevalidationOutcome(input.sentinel);
  return input.repository.persistSendRevalidationProjection({
    ...projection,
    binding_drift_sentinel_contract: input.sentinel,
    dispatch_ref: requireString("dispatch_ref", input.dispatch_ref),
    interaction_id: requireString("interaction_id", input.interaction_id),
    request_hash: requireString("request_hash", input.request_hash),
    row_version: 1,
  });
}
