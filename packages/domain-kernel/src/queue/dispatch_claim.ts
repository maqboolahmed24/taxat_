import { asTaxatRef, type TaxatRef } from "../primitives/identifier.ts";
import { stableJsonHash, type HashDigest } from "../primitives/hash.ts";
import { normalizeUtcInstantString, parseUtcInstant } from "../primitives/time.ts";

export type DispatchClaimState = "ACTIVE" | "RELEASED";

export type DispatchClaim = {
  claimEpoch: number;
  claimRef: TaxatRef<"dispatch-claim">;
  claimState: DispatchClaimState;
  claimToken: HashDigest;
  lastExtendedAtOrNull: string | null;
  leasedAt: string;
  leaseExpiresAt: string;
  queuePacketRef: string;
  reclaimedFromClaimRefOrNull: string | null;
  releasedAtOrNull: string | null;
  staleReclaimReasonCodes: string[];
  workerRef: string;
};

export type DispatchClaimFence = Pick<
  DispatchClaim,
  "claimEpoch" | "claimToken" | "queuePacketRef" | "workerRef"
>;

function claimToken(queuePacketRef: string, workerRef: string, claimEpoch: number, leasedAt: string) {
  return stableJsonHash({
    claim_epoch: claimEpoch,
    leased_at: leasedAt,
    queue_packet_ref: queuePacketRef,
    worker_ref: workerRef,
  });
}

export function dispatchClaimFence(claim: DispatchClaim): DispatchClaimFence {
  return {
    claimEpoch: claim.claimEpoch,
    claimToken: claim.claimToken,
    queuePacketRef: claim.queuePacketRef,
    workerRef: claim.workerRef,
  };
}

export function isDispatchClaimActive(claim: DispatchClaim, at: string) {
  return claim.claimState === "ACTIVE" && parseUtcInstant(claim.leaseExpiresAt) > parseUtcInstant(at);
}

function assertFence(claim: DispatchClaim, fence: DispatchClaimFence) {
  if (
    claim.claimEpoch !== fence.claimEpoch ||
    claim.claimToken !== fence.claimToken ||
    claim.queuePacketRef !== fence.queuePacketRef ||
    claim.workerRef !== fence.workerRef
  ) {
    throw new Error("Dispatch claim fence mismatch.");
  }
}

export function createDispatchClaim(input: {
  at: string;
  leaseDurationSeconds: number;
  priorClaimOrNull?: DispatchClaim | null;
  queuePacketRef: string;
  workerRef: string;
}) {
  const leasedAt = normalizeUtcInstantString(input.at);
  if (input.priorClaimOrNull && isDispatchClaimActive(input.priorClaimOrNull, leasedAt)) {
    throw new Error("Active dispatch claims may not be superseded before visibility expiry.");
  }
  const claimEpoch = (input.priorClaimOrNull?.claimEpoch ?? 0) + 1;
  const expiresAt = new Date(
    parseUtcInstant(leasedAt).valueOf() + input.leaseDurationSeconds * 1_000,
  ).toISOString();

  return {
    claimEpoch,
    claimRef: asTaxatRef(
      `dispatch-claim.${stableJsonHash({
        claim_epoch: claimEpoch,
        queue_packet_ref: input.queuePacketRef,
      })}`,
      "dispatch-claim",
    ),
    claimState: "ACTIVE",
    claimToken: claimToken(input.queuePacketRef, input.workerRef, claimEpoch, leasedAt),
    lastExtendedAtOrNull: null,
    leasedAt,
    leaseExpiresAt: expiresAt.endsWith(".000Z") ? expiresAt.replace(".000Z", "Z") : expiresAt,
    queuePacketRef: input.queuePacketRef,
    reclaimedFromClaimRefOrNull: input.priorClaimOrNull?.claimRef ?? null,
    releasedAtOrNull: null,
    staleReclaimReasonCodes:
      input.priorClaimOrNull && !isDispatchClaimActive(input.priorClaimOrNull, leasedAt)
        ? ["VISIBILITY_TIMEOUT_EXPIRED", "STALE_CLAIM_RECLAIMED"]
        : [],
    workerRef: input.workerRef,
  } satisfies DispatchClaim;
}

export function extendDispatchClaim(
  claim: DispatchClaim,
  fence: DispatchClaimFence,
  input: {
    at: string;
    leaseDurationSeconds: number;
  },
) {
  assertFence(claim, fence);
  const extendedAt = normalizeUtcInstantString(input.at);
  if (!isDispatchClaimActive(claim, extendedAt)) {
    throw new Error("Expired claims may not extend visibility.");
  }
  const expiresAt = new Date(
    parseUtcInstant(extendedAt).valueOf() + input.leaseDurationSeconds * 1_000,
  ).toISOString();

  return {
    ...claim,
    lastExtendedAtOrNull: extendedAt,
    leaseExpiresAt: expiresAt.endsWith(".000Z") ? expiresAt.replace(".000Z", "Z") : expiresAt,
  } satisfies DispatchClaim;
}

export function releaseDispatchClaim(
  claim: DispatchClaim,
  fence: DispatchClaimFence,
  releasedAt: string,
) {
  assertFence(claim, fence);
  return {
    ...claim,
    claimState: "RELEASED",
    releasedAtOrNull: normalizeUtcInstantString(releasedAt),
  } satisfies DispatchClaim;
}
