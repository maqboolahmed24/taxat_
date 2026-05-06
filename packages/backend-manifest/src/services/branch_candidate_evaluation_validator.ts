import type { ManifestLineageTraceCandidateEvaluation } from "../../../generated-models/src/generated/typescript/manifest-and-release.ts";

import {
  CANONICAL_BRANCH_ACTION_ORDER,
  CANONICAL_REJECTION_REASON_CODE_ORDER,
  type ManifestBranchAction,
  type ManifestRejectionReasonCode,
} from "../models/manifest_branch_decision_contract.ts";

export type BranchCandidateEvaluationValidationErrorCode =
  | "BRANCH_CANDIDATE_COVERAGE_INCOMPLETE"
  | "BRANCH_CANDIDATE_ORDER_INVALID"
  | "BRANCH_CANDIDATE_REASON_ORDER_INVALID"
  | "BRANCH_CANDIDATE_REJECTION_REASON_MISSING"
  | "BRANCH_CANDIDATE_SELECTED_DISQUALIFIED"
  | "BRANCH_CANDIDATE_SELECTED_MISMATCH"
  | "BRANCH_CANDIDATE_SELECTION_CARDINALITY_INVALID";

export class BranchCandidateEvaluationValidationError extends Error {
  readonly code: BranchCandidateEvaluationValidationErrorCode;

  constructor(code: BranchCandidateEvaluationValidationErrorCode, detail: string) {
    super(`${code}: ${detail}`);
    this.name = "BranchCandidateEvaluationValidationError";
    this.code = code;
  }
}

function assertCandidateEvaluation(
  condition: unknown,
  code: BranchCandidateEvaluationValidationErrorCode,
  detail: string,
): asserts condition {
  if (!condition) {
    throw new BranchCandidateEvaluationValidationError(code, detail);
  }
}

function expectedReasonOrder(reasonCodes: readonly ManifestRejectionReasonCode[]) {
  const seen = new Set(reasonCodes);
  return CANONICAL_REJECTION_REASON_CODE_ORDER.filter((reasonCode) => seen.has(reasonCode));
}

export function validateBranchCandidateEvaluations(input: {
  candidate_evaluations: readonly ManifestLineageTraceCandidateEvaluation[];
  selected_branch_action: ManifestBranchAction;
}): ManifestLineageTraceCandidateEvaluation[] {
  const evaluations = structuredClone(
    input.candidate_evaluations,
  ) as ManifestLineageTraceCandidateEvaluation[];
  assertCandidateEvaluation(
    evaluations.length === CANONICAL_BRANCH_ACTION_ORDER.length,
    "BRANCH_CANDIDATE_COVERAGE_INCOMPLETE",
    "candidate_evaluations must cover every canonical branch action exactly once",
  );

  evaluations.forEach((evaluation, index) => {
    const expectedAction = CANONICAL_BRANCH_ACTION_ORDER[index];
    assertCandidateEvaluation(
      evaluation.candidate_action === expectedAction,
      "BRANCH_CANDIDATE_ORDER_INVALID",
      `candidate_evaluations[${index}] must be ${expectedAction}`,
    );

    const uniqueReasons = new Set(evaluation.disqualifier_reason_codes);
    assertCandidateEvaluation(
      uniqueReasons.size === evaluation.disqualifier_reason_codes.length,
      "BRANCH_CANDIDATE_REASON_ORDER_INVALID",
      `${evaluation.candidate_action} carries duplicate disqualifier reason codes`,
    );
    assertCandidateEvaluation(
      JSON.stringify(evaluation.disqualifier_reason_codes) ===
        JSON.stringify(expectedReasonOrder(evaluation.disqualifier_reason_codes)),
      "BRANCH_CANDIDATE_REASON_ORDER_INVALID",
      `${evaluation.candidate_action} disqualifier reasons must follow canonical order`,
    );

    if (evaluation.evaluation_state === "REJECTED") {
      assertCandidateEvaluation(
        evaluation.disqualifier_reason_codes.length > 0,
        "BRANCH_CANDIDATE_REJECTION_REASON_MISSING",
        `${evaluation.candidate_action} is rejected without a typed disqualifier`,
      );
    } else {
      assertCandidateEvaluation(
        evaluation.disqualifier_reason_codes.length === 0,
        "BRANCH_CANDIDATE_SELECTED_DISQUALIFIED",
        `${evaluation.candidate_action} is selected but still carries disqualifiers`,
      );
    }
  });

  const selectedCandidates = evaluations.filter(
    (evaluation) => evaluation.evaluation_state === "SELECTED",
  );
  assertCandidateEvaluation(
    selectedCandidates.length === 1,
    "BRANCH_CANDIDATE_SELECTION_CARDINALITY_INVALID",
    "candidate_evaluations must contain exactly one SELECTED candidate",
  );
  assertCandidateEvaluation(
    selectedCandidates[0]?.candidate_action === input.selected_branch_action,
    "BRANCH_CANDIDATE_SELECTED_MISMATCH",
    "selected candidate must match selected_branch_action",
  );

  return evaluations;
}
