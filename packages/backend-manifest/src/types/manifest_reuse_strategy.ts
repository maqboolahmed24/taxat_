import type { ManifestBranchDecisionContract } from "../../../generated-models/src/generated/typescript/manifest-and-release.ts";
import type {
  BranchCandidateEvaluationRecord,
  ManifestBranchAction,
  ManifestBranchReasonCode,
} from "../models/manifest_branch_decision_contract.ts";
import type { RunManifestContinuationBasis } from "../models/run_manifest.ts";
import type { LoadedPriorManifestContext } from "./manifest_prior_context_status.ts";

export type ManifestReuseDecisionState = "BLOCKED" | "SELECTED";

export type ManifestReuseBlockedReasonCode =
  | "ACTIVE_LEASE_BLOCKS_RECOVERY"
  | "NO_BRANCH_ACTION_LEGAL"
  | "PRIOR_MANIFEST_CONTEXT_INVALID";

export type ManifestReuseStrategy = {
  branch_decision_contract: ManifestBranchDecisionContract | null;
  candidate_evaluations: BranchCandidateEvaluationRecord[];
  decision_state: ManifestReuseDecisionState;
  blocked_reason_codes: ManifestReuseBlockedReasonCode[];
  prior_context: LoadedPriorManifestContext;
  selected_branch_action: ManifestBranchAction | null;
  selected_branch_reason_code: ManifestBranchReasonCode | null;
  selected_manifest_continuation_basis: RunManifestContinuationBasis | null;
};
