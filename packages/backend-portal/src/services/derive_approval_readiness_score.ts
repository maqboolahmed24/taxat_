import type { ClientApprovalPackStaleProtectionState } from "../types.ts";

export type DeriveApprovalReadinessScoreInput = {
  acknowledgedAt: string | null;
  changeDigestAcknowledgedAt: string | null;
  declarationAcknowledgedAt: string | null;
  requiresStepUp: boolean;
  staleProtectionState: ClientApprovalPackStaleProtectionState;
  stateChangedAt: string;
  stepUpExpiresAt: string | null;
  stepUpVerifiedAt: string | null;
  viewedAt: string | null;
};

function clamp01(value: number) {
  return Math.max(0, Math.min(1, value));
}

function roundScore(value: number) {
  return Math.max(0, Math.min(100, Math.floor(value + 0.5)));
}

function remainingSeconds(end: string | null, asOf: string) {
  if (end === null) {
    return 0;
  }
  const endEpoch = Date.parse(end);
  const asOfEpoch = Date.parse(asOf);
  if (Number.isNaN(endEpoch) || Number.isNaN(asOfEpoch)) {
    return 0;
  }
  return Math.max(0, (endEpoch - asOfEpoch) / 1000);
}

export function deriveApprovalReadinessScore(
  input: DeriveApprovalReadinessScoreInput,
): number {
  const staleFactor = {
    CURRENT: 1,
    EXPIRED: 0,
    REBASE_REQUIRED: 0.3,
    SUPERSEDED: 0,
  } satisfies Record<ClientApprovalPackStaleProtectionState, number>;
  const viewFactor = input.viewedAt === null ? 0 : 1;
  const digestFactor = input.changeDigestAcknowledgedAt === null ? 0 : 1;
  const declarationFactor = input.declarationAcknowledgedAt === null ? 0 : 1;
  const ackFactor = input.acknowledgedAt === null ? 0 : 1;
  const stepUpFactor =
    input.requiresStepUp === false
      ? 1
      : clamp01(
          Number(
            input.stepUpVerifiedAt !== null &&
              input.stepUpExpiresAt !== null &&
              remainingSeconds(input.stepUpExpiresAt, input.stateChangedAt) > 0,
          ),
        );
  const readinessRaw = clamp01(
    0.15 * viewFactor +
      0.2 * digestFactor +
      0.2 * declarationFactor +
      0.15 * ackFactor +
      0.3 * Math.min(staleFactor[input.staleProtectionState], stepUpFactor),
  );
  let score = roundScore(100 * readinessRaw);

  if (input.staleProtectionState === "SUPERSEDED" || input.staleProtectionState === "EXPIRED") {
    score = 0;
  }
  if (
    input.requiresStepUp &&
    input.stepUpExpiresAt !== null &&
    remainingSeconds(input.stepUpExpiresAt, input.stateChangedAt) <= 0
  ) {
    score = Math.min(score, 40);
  }
  return score;
}

