import type { ClientPortalUploadSessionRecord } from "../types.ts";

export type UploadConfidenceInput = Pick<
  ClientPortalUploadSessionRecord,
  | "attachment_state"
  | "byte_count"
  | "bytes_transferred"
  | "expires_at"
  | "integrity_state"
  | "malware_scan_state"
  | "request_binding_state"
  | "resume_attempt_count"
  | "resume_success_count"
  | "resumability_state"
  | "retry_count"
  | "state_changed_at"
  | "transfer_started_at"
  | "transfer_state"
  | "validation_state"
>;

function clamp01(value: number) {
  return Math.max(0, Math.min(1, value));
}

function safeDiv(numerator: number, denominator: number) {
  return denominator <= 0 ? 0 : numerator / denominator;
}

function roundScore(value: number) {
  return Math.max(0, Math.min(100, Math.floor(value + 0.5)));
}

function parseTime(value: string | null | undefined) {
  if (typeof value !== "string" || value.length === 0) {
    return null;
  }
  const time = Date.parse(value);
  return Number.isNaN(time) ? null : time;
}

function ageSeconds(start: string | null | undefined, end: string | null | undefined) {
  const startTime = parseTime(start);
  const endTime = parseTime(end);
  if (startTime === null || endTime === null) {
    return Number.POSITIVE_INFINITY;
  }
  return Math.max(0, (endTime - startTime) / 1000);
}

function remainingSeconds(end: string | null | undefined, asOf: string | null | undefined) {
  const endTime = parseTime(end);
  const asOfTime = parseTime(asOf);
  if (endTime === null || asOfTime === null) {
    return 0;
  }
  return Math.max(0, (endTime - asOfTime) / 1000);
}

function enumFactor<T extends string>(value: T, factors: Record<T, number>) {
  return factors[value] ?? 0;
}

export function deriveUploadConfidenceScore(input: UploadConfidenceInput) {
  const progressRatio = clamp01(safeDiv(input.bytes_transferred, input.byte_count));
  const observedThroughputBps = safeDiv(
    input.bytes_transferred,
    Math.max(1, ageSeconds(input.transfer_started_at, input.state_changed_at)),
  );
  const etaSeconds = safeDiv(
    Math.max(0, input.byte_count - input.bytes_transferred),
    Math.max(1, observedThroughputBps),
  );
  const expiresIn = remainingSeconds(input.expires_at, input.state_changed_at);
  const expiryBuffer =
    input.resumability_state === "CLOSED" && input.transfer_state === "ACCEPTED"
      ? 1
      : clamp01(safeDiv(Math.max(0, expiresIn - etaSeconds), Math.max(60, expiresIn)));
  const bindingFactor = enumFactor(input.request_binding_state, {
    ORIGINAL_CURRENT: 1,
    RECONFIRMED_CURRENT: 0.92,
    RECONFIRMATION_REQUIRED: 0.35,
    SUPERSEDED: 0,
  });
  const resumeSuccessRatio = safeDiv(input.resume_success_count + 1, input.resume_attempt_count + 2);
  const integrityFactor = enumFactor(input.integrity_state, {
    FAILED: 0,
    PENDING: 0.45,
    VERIFIED: 1,
  });
  const scanFactor = enumFactor(input.malware_scan_state, {
    CLEAN: 1,
    PENDING: 0.4,
    QUARANTINED: 0,
  });
  const validationFactor = enumFactor(input.validation_state, {
    ACCEPTED: 1,
    PENDING: 0.55,
    REJECTED: 0,
    REQUIRES_REPLACEMENT: 0.2,
  });
  const retryDecay = Math.exp(-0.25 * input.retry_count);
  let score = roundScore(
    100 *
      clamp01(
        0.18 * Math.sqrt(progressRatio) +
          0.12 * resumeSuccessRatio +
          0.16 * expiryBuffer +
          0.18 * bindingFactor +
          0.16 * integrityFactor +
          0.1 * scanFactor +
          0.1 * validationFactor,
      ) *
      retryDecay,
  );

  if (input.integrity_state === "FAILED" || input.malware_scan_state === "QUARANTINED") {
    score = 0;
  }
  if (input.request_binding_state === "SUPERSEDED") {
    score = Math.min(score, 25);
  }
  if (input.attachment_state === "ATTACHED") {
    score = Math.max(score, 85);
  }
  return score;
}
