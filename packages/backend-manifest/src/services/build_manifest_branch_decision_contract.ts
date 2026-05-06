import { validateBranchCandidateEvaluations } from "./branch_candidate_evaluation_validator.ts";
import type { ManifestReuseStrategy } from "../types/manifest_reuse_strategy.ts";

export class ManifestDecisionBranchDecisionBuildError extends Error {
  constructor(detail: string) {
    super(`MANIFEST_DECISION_BRANCH_DECISION_BUILD_FAILED: ${detail}`);
    this.name = "ManifestDecisionBranchDecisionBuildError";
  }
}

export function buildManifestDecisionBranchDecisionContract(input: {
  strategy: ManifestReuseStrategy;
}) {
  const branchDecision = input.strategy.branch_decision_contract;
  if (input.strategy.decision_state === "BLOCKED" || branchDecision === null) {
    return null;
  }

  validateBranchCandidateEvaluations({
    candidate_evaluations: input.strategy.candidate_evaluations,
    selected_branch_action: branchDecision.branch_action,
  });

  return structuredClone(branchDecision);
}
