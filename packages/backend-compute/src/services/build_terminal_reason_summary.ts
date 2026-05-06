import type { GateDecisionRecord } from "../models/gate_decision_record.ts";

export type TerminalDecisionStatus = "COMPLETED" | "BLOCKED" | "REVIEW_REQUIRED";
export type TerminalOutcomeClass =
  | "FINAL_SUCCESS"
  | "FINAL_BLOCKED"
  | "HUMAN_REVIEW"
  | "APPROVAL_PENDING"
  | "AUTHORITY_PENDING"
  | "AUTHORITY_UNKNOWN"
  | "LATE_DATA_PENDING"
  | "OUT_OF_BAND_REVIEW";

export type TerminalReasonSummaryInput = {
  decision_status?: TerminalDecisionStatus;
  gate_records?: readonly GateDecisionRecord[];
  outcome_class?: TerminalOutcomeClass;
  plain_reason?: string;
  reason_codes?: readonly string[];
};

export type TerminalReasonSummary = {
  decision_reason_codes: string[];
  dominant_reason_code: string;
  plain_reason: string;
  reason_codes: string[];
};

const TERMINAL_REASON_PRIORITY = [
  "AUTHORITY_REJECTED",
  "AUTHORITY_OUT_OF_BAND",
  "AUTHORITY_UNKNOWN",
  "SUBMISSION_PENDING_EXTERNAL_CONFIRMATION",
  "AUTHORITY_PENDING",
  "TERMINAL_BLOCKED",
  "GATE_HARD_BLOCK",
  "GATE_OVERRIDABLE_BLOCK",
  "TRUST_UPSTREAM_GATE_BLOCK",
  "HUMAN_REVIEW_REQUIRED",
  "APPROVAL_PENDING",
  "LATE_DATA_PENDING",
  "NON_LIVE_EXECUTION_BOUNDARY",
  "FINAL_SUCCESS",
  "GATE_PASS_WITH_NOTICE",
  "GATE_PASS",
] as const;

const TERMINAL_REASON_RANK = new Map<string, number>(
  TERMINAL_REASON_PRIORITY.map((code, index) => [code, index]),
);

function requireReasonCode(code: string) {
  const trimmed = code.trim();
  if (trimmed.length === 0) {
    throw new Error("terminal reason codes must be non-empty strings");
  }
  return trimmed;
}

function defaultReasonForOutcome(input: {
  decision_status?: TerminalDecisionStatus;
  outcome_class?: TerminalOutcomeClass;
}) {
  switch (input.outcome_class) {
    case "FINAL_SUCCESS":
      return "FINAL_SUCCESS";
    case "FINAL_BLOCKED":
      return "TERMINAL_BLOCKED";
    case "HUMAN_REVIEW":
      return "HUMAN_REVIEW_REQUIRED";
    case "APPROVAL_PENDING":
      return "APPROVAL_PENDING";
    case "AUTHORITY_PENDING":
      return "SUBMISSION_PENDING_EXTERNAL_CONFIRMATION";
    case "AUTHORITY_UNKNOWN":
      return "AUTHORITY_UNKNOWN";
    case "LATE_DATA_PENDING":
      return "LATE_DATA_PENDING";
    case "OUT_OF_BAND_REVIEW":
      return "AUTHORITY_OUT_OF_BAND";
    default:
      return input.decision_status === "BLOCKED" ? "TERMINAL_BLOCKED" : "FINAL_SUCCESS";
  }
}

export function orderTerminalReasonCodes(reasonCodes: readonly string[]) {
  const seen = new Set<string>();
  return reasonCodes
    .map(requireReasonCode)
    .filter((code) => {
      if (seen.has(code)) {
        return false;
      }
      seen.add(code);
      return true;
    })
    .sort((left, right) => {
      const leftRank = TERMINAL_REASON_RANK.get(left) ?? Number.MAX_SAFE_INTEGER;
      const rightRank = TERMINAL_REASON_RANK.get(right) ?? Number.MAX_SAFE_INTEGER;
      if (leftRank !== rightRank) {
        return leftRank - rightRank;
      }
      return left.localeCompare(right);
    })
    .slice(0, 8);
}

function plainReasonForDominantReason(code: string) {
  switch (code) {
    case "FINAL_SUCCESS":
      return "The run completed with a persisted terminal outcome.";
    case "TERMINAL_BLOCKED":
    case "GATE_HARD_BLOCK":
    case "GATE_OVERRIDABLE_BLOCK":
    case "TRUST_UPSTREAM_GATE_BLOCK":
      return "The run is terminally blocked and no safe continuation action is available.";
    case "HUMAN_REVIEW_REQUIRED":
      return "The run requires human review before further progression.";
    case "APPROVAL_PENDING":
      return "The run is waiting for approval before further progression.";
    case "SUBMISSION_PENDING_EXTERNAL_CONFIRMATION":
    case "AUTHORITY_PENDING":
      return "Submission was transmitted and is awaiting authority-backed confirmation.";
    case "AUTHORITY_UNKNOWN":
      return "The authority outcome is unknown and requires reconciliation.";
    case "AUTHORITY_OUT_OF_BAND":
      return "The authority outcome is out of band and requires review.";
    case "AUTHORITY_REJECTED":
      return "The authority rejected the submission and the run is terminally blocked.";
    case "LATE_DATA_PENDING":
      return "Late data may affect the outcome and must be checked before progression.";
    case "NON_LIVE_EXECUTION_BOUNDARY":
      return "The run is non-live and cannot create live compliance effects.";
    default:
      return "The run reached a persisted terminal decision bundle posture.";
  }
}

export function buildTerminalReasonSummary(
  input: TerminalReasonSummaryInput,
): TerminalReasonSummary {
  const gateReasonCodes = (input.gate_records ?? []).flatMap((gate) => gate.reason_codes);
  const orderedReasons = orderTerminalReasonCodes([
    ...(input.reason_codes ?? []),
    ...gateReasonCodes,
    defaultReasonForOutcome(input),
  ]);
  if (orderedReasons.length === 0) {
    throw new Error("terminal reason summary requires at least one reason code");
  }
  const decisionReasons = orderedReasons.slice(0, 3);
  const dominantReason = orderedReasons[0]!;
  return {
    decision_reason_codes: decisionReasons,
    dominant_reason_code: dominantReason,
    plain_reason: (input.plain_reason ?? plainReasonForDominantReason(dominantReason))
      .trim()
      .slice(0, 200),
    reason_codes: orderedReasons,
  };
}
