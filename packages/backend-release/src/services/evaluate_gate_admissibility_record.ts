import {
  buildGateAdmissibilityRecordFromSuiteResult,
  type GateAdmissibilityRecordRecord,
  type GateAdmissibilityState,
} from "../models/gate_admissibility_record.ts";
import type { VerificationSuiteResultRecord } from "../models/verification_suite_result.ts";
import type { GateAdmissibilityQuarantineState } from "./canonicalize_verification_suite_scope.ts";

export type EvaluateGateAdmissibilityRecordInput = {
  admissibility_id: string;
  suite_result: VerificationSuiteResultRecord;
  evaluated_at: string;
  candidate_identity_match?: boolean;
  freshness_verified?: boolean;
  contract_window_consistent?: boolean;
  rerun_scope_preserved?: boolean;
  quarantine_state?: GateAdmissibilityQuarantineState;
  reason_codes?: string[];
};

const failedDimensionReasonCode = {
  candidate_identity_match: "CANDIDATE_IDENTITY_MISMATCH",
  freshness_verified: "STALE_EVIDENCE",
  contract_window_consistent: "CONTRACT_WINDOW_DRIFT",
  rerun_scope_preserved: "RERUN_SCOPE_NOT_PRESERVED",
} as const;

export function evaluateGateAdmissibilityRecord(
  input: EvaluateGateAdmissibilityRecordInput,
): GateAdmissibilityRecordRecord {
  const candidateIdentityMatch = input.candidate_identity_match ?? true;
  const freshnessVerified = input.freshness_verified ?? true;
  const contractWindowConsistent = input.contract_window_consistent ?? true;
  const rerunScopePreserved = input.rerun_scope_preserved ?? true;
  const quarantineState = input.quarantine_state ?? "NONE";
  const reasonCodes = new Set(input.reason_codes ?? []);

  if (input.suite_result.result_state !== "PASSED") {
    reasonCodes.add("SUITE_RESULT_NOT_PASSED");
  }
  if (!candidateIdentityMatch) {
    reasonCodes.add(failedDimensionReasonCode.candidate_identity_match);
  }
  if (!freshnessVerified) {
    reasonCodes.add(failedDimensionReasonCode.freshness_verified);
  }
  if (!contractWindowConsistent) {
    reasonCodes.add(failedDimensionReasonCode.contract_window_consistent);
  }
  if (!rerunScopePreserved) {
    reasonCodes.add(failedDimensionReasonCode.rerun_scope_preserved);
  }
  if (quarantineState !== "NONE") {
    reasonCodes.add(quarantineState);
  }

  const admissibilityState: GateAdmissibilityState =
    input.suite_result.result_state === "PASSED" &&
    candidateIdentityMatch &&
    freshnessVerified &&
    contractWindowConsistent &&
    rerunScopePreserved &&
    quarantineState === "NONE" &&
    reasonCodes.size === 0
      ? "ADMISSIBLE"
      : "INADMISSIBLE";

  return buildGateAdmissibilityRecordFromSuiteResult({
    admissibility_id: input.admissibility_id,
    admissibility_state: admissibilityState,
    candidate_identity_match: candidateIdentityMatch,
    contract_window_consistent: contractWindowConsistent,
    evaluated_at: input.evaluated_at,
    freshness_verified: freshnessVerified,
    quarantine_state: quarantineState,
    reason_codes: [...reasonCodes].sort(),
    rerun_scope_preserved: rerunScopePreserved,
    suite_result: input.suite_result,
  });
}
