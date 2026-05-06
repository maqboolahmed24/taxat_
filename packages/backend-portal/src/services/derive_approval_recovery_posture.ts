import type {
  ClientApprovalPackLifecycleState,
  ClientApprovalPackRecoveryPosture,
  ClientApprovalPackStaleProtectionState,
} from "../types.ts";

export type ApprovalRecoveryPostureDerivation = {
  dominantHazardCode: string | null;
  recoveryPosture: ClientApprovalPackRecoveryPosture;
};

export type DeriveApprovalRecoveryPostureInput = {
  lifecycleState: ClientApprovalPackLifecycleState;
  requiresStepUp: boolean;
  staleProtectionState: ClientApprovalPackStaleProtectionState;
  stateChangedAt: string;
  stepUpExpiresAt: string | null;
  stepUpVerifiedAt: string | null;
};

function isExpired(expiresAt: string | null, stateChangedAt: string) {
  if (expiresAt === null) {
    return true;
  }
  const expiresEpoch = Date.parse(expiresAt);
  const stateEpoch = Date.parse(stateChangedAt);
  if (Number.isNaN(expiresEpoch) || Number.isNaN(stateEpoch)) {
    return true;
  }
  return expiresEpoch <= stateEpoch;
}

export function deriveApprovalRecoveryPosture(
  input: DeriveApprovalRecoveryPostureInput,
): ApprovalRecoveryPostureDerivation {
  if (input.lifecycleState === "SIGNED" || input.lifecycleState === "COUNTERSIGNED") {
    return { dominantHazardCode: null, recoveryPosture: "NONE" };
  }
  if (input.lifecycleState === "CANCELLED") {
    return {
      dominantHazardCode: "APPROVAL_PACK_CANCELLED",
      recoveryPosture: "HARD_RESET_REQUIRED",
    };
  }
  if (input.staleProtectionState === "SUPERSEDED") {
    return {
      dominantHazardCode: "APPROVAL_PACK_SUPERSEDED",
      recoveryPosture: "STALE_REVIEW_REQUIRED",
    };
  }
  if (input.staleProtectionState === "EXPIRED") {
    return {
      dominantHazardCode: "APPROVAL_PACK_EXPIRED",
      recoveryPosture: "STALE_REVIEW_REQUIRED",
    };
  }
  if (input.staleProtectionState === "REBASE_REQUIRED") {
    return {
      dominantHazardCode: "APPROVAL_PACK_REBASE_REQUIRED",
      recoveryPosture: "RECONFIRM_INLINE",
    };
  }
  if (
    input.requiresStepUp &&
    (input.stepUpVerifiedAt === null ||
      input.stepUpExpiresAt === null ||
      isExpired(input.stepUpExpiresAt, input.stateChangedAt))
  ) {
    return {
      dominantHazardCode:
        input.stepUpVerifiedAt === null ? "APPROVAL_STEP_UP_REQUIRED" : "APPROVAL_STEP_UP_EXPIRED",
      recoveryPosture: "STEP_UP_RETRY",
    };
  }
  return { dominantHazardCode: null, recoveryPosture: "NONE" };
}

