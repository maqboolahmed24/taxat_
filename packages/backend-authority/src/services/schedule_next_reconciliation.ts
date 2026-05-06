import { stableJsonHash } from "../../../domain-kernel/src/primitives/hash.ts";
import { AuthorityModelError, normalizeTimestamp } from "../models/authority_common.ts";

export type ReconciliationScheduleDecision = {
  attempts_remaining_count: number;
  delay_seconds: number | null;
  next_reconciliation_at: string | null;
  schedule_state: "ACTIVE" | "EXHAUSTED";
};

function positiveInteger(label: string, value: number) {
  if (!Number.isInteger(value) || value < 1) {
    throw new AuthorityModelError("AUTHORITY_FIELD_INVALID", `${label} must be a positive integer`);
  }
  return value;
}

function nonNegativeInteger(label: string, value: number) {
  if (!Number.isInteger(value) || value < 0) {
    throw new AuthorityModelError("AUTHORITY_FIELD_INVALID", `${label} must be a non-negative integer`);
  }
  return value;
}

function jitterFactor(idempotencyKey: string, attemptNumber: number) {
  const hash = stableJsonHash(`${idempotencyKey}|reconcile|${attemptNumber}`);
  const hex = hash.replace(/[^0-9a-f]/gi, "").slice(0, 12);
  const bucket = Number.parseInt(hex || "0", 16) % 201;
  return 0.9 + bucket / 1000;
}

export function scheduleNextReconciliation(input: {
  as_of: string;
  idempotency_key: string;
  max_auto_reconciliation_attempts: number;
  reconciliation_attempt_count: number;
  reconciliation_cadence_seconds: number;
  reconciliation_deadline_at: string;
}): ReconciliationScheduleDecision {
  const asOf = normalizeTimestamp("as_of", input.as_of);
  const deadline = normalizeTimestamp("reconciliation_deadline_at", input.reconciliation_deadline_at);
  const maxAttempts = nonNegativeInteger(
    "max_auto_reconciliation_attempts",
    input.max_auto_reconciliation_attempts,
  );
  const attemptCount = nonNegativeInteger(
    "reconciliation_attempt_count",
    input.reconciliation_attempt_count,
  );
  const cadence = positiveInteger("reconciliation_cadence_seconds", input.reconciliation_cadence_seconds);
  const nextAttemptNumber = attemptCount + 1;
  const remainingAttempts = Math.max(0, maxAttempts - attemptCount);
  const remainingWindowSeconds = Math.floor((Date.parse(deadline) - Date.parse(asOf)) / 1000);

  if (nextAttemptNumber > maxAttempts || remainingAttempts < 1 || remainingWindowSeconds <= 0) {
    return {
      attempts_remaining_count: 0,
      delay_seconds: null,
      next_reconciliation_at: null,
      schedule_state: "EXHAUSTED",
    };
  }

  const beta = 1.6;
  const rawDelay = cadence * beta ** Math.max(0, nextAttemptNumber - 1);
  const jitteredDelay = rawDelay * jitterFactor(input.idempotency_key, nextAttemptNumber);
  const delaySeconds = Math.floor(Math.min(Math.max(cadence, jitteredDelay), remainingWindowSeconds));
  return {
    attempts_remaining_count: remainingAttempts,
    delay_seconds: delaySeconds,
    next_reconciliation_at: normalizeTimestamp(
      "next_reconciliation_at",
      new Date(Date.parse(asOf) + delaySeconds * 1000).toISOString(),
    ),
    schedule_state: "ACTIVE",
  };
}
