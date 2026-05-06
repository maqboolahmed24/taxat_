import type { ManifestBranchDecisionContract } from "../../../generated-models/src/generated/typescript/manifest-and-release.ts";
import type {
  BranchCandidateEvaluationRecord,
  ManifestBranchAction,
  ManifestBranchReasonCode,
} from "../models/manifest_branch_decision_contract.ts";
import type {
  RunManifestContinuationBasis,
  RunManifestRecord,
} from "../models/run_manifest.ts";
import type { LoadedPriorManifestContext } from "./manifest_prior_context_status.ts";
import type { ManifestReuseBlockedReasonCode } from "./manifest_reuse_strategy.ts";
import type { ReplayOrRecoveryPathGuardResult } from "../services/replay_or_recovery_path_guard.ts";
import type { SupersessionDecisionGuardResult } from "../services/supersession_decision_guard.ts";

export type ManifestDecisionServiceState = "BLOCKED" | "SELECTED";

export type ManifestChildAllocationPreparation = {
  config_inheritance_mode_or_null:
    | "FRESH_CHILD_RESOLUTION"
    | "HISTORICAL_EXPLICIT"
    | "RECOVERY_EXACT"
    | "REPLAY_EXACT"
    | null;
  continuation_basis: RunManifestContinuationBasis;
  continuation_of_manifest_id_or_null: string | null;
  input_inheritance_mode_or_null:
    | "FRESH_CHILD_COLLECTION"
    | "HISTORICAL_EXPLICIT"
    | "RECOVERY_EXACT"
    | "REPLAY_EXACT"
    | null;
  parent_manifest_id_or_null: string | null;
  replay_of_manifest_id_or_null: string | null;
  root_manifest_id: string;
  selected_manifest_generation: number;
  selected_manifest_id: string;
  supersedes_manifest_id_or_null: string | null;
};

export type ManifestDecisionServiceResult = {
  blocked_reason_codes: ManifestReuseBlockedReasonCode[];
  branch_decision_contract: ManifestBranchDecisionContract | null;
  candidate_evaluations: BranchCandidateEvaluationRecord[];
  child_allocation: ManifestChildAllocationPreparation | null;
  decision_state: ManifestDecisionServiceState;
  lineage_trace_ready: boolean;
  prior_context: LoadedPriorManifestContext;
  replay_or_recovery_guard: ReplayOrRecoveryPathGuardResult;
  request_identity_hash: string;
  selected_branch_action: ManifestBranchAction | null;
  selected_branch_reason_code: ManifestBranchReasonCode | null;
  selected_manifest_continuation_basis: RunManifestContinuationBasis | null;
  selected_manifest_id_or_null: string | null;
  selected_manifest_snapshot: RunManifestRecord | null;
  supersession_guard: SupersessionDecisionGuardResult;
};
