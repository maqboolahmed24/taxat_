import type { RunManifestRepository } from "../repositories/run_manifest_repository.ts";
import type { ManifestBranchAction } from "../models/manifest_branch_decision_contract.ts";
import type { RunManifestRecord } from "../models/run_manifest.ts";
import type { ManifestDecisionServiceResult } from "../types/manifest_decision_service_result.ts";
import {
  decideManifestReuseStrategy,
  type DecideManifestReuseStrategyInput,
} from "./decide_manifest_reuse_strategy.ts";
import {
  loadAndValidatePriorManifestContext,
  type LoadAndValidatePriorManifestContextInput,
} from "./load_and_validate_prior_manifest_context.ts";
import type { ManifestRequestIdentityInput } from "./compute_request_identity_hash.ts";
import { buildManifestDecisionBranchDecisionContract } from "./build_manifest_branch_decision_contract.ts";
import { guardReplayOrRecoveryPath } from "./replay_or_recovery_path_guard.ts";
import { guardSupersessionDecision } from "./supersession_decision_guard.ts";

export type ManifestDecisionOrchestratorInput = {
  candidate_manifest_id?: string;
  continuation_requested?: boolean;
  prior_manifest?: RunManifestRecord | null;
  prior_manifest_id?: string | null;
  recovery_requested?: boolean;
  request: ManifestRequestIdentityInput;
  run_manifest_repository?: RunManifestRepository;
  tenant_id?: string;
};

function selectedManifestSnapshot(input: {
  prior_manifest: RunManifestRecord | null;
  selected_branch_action: ManifestBranchAction | null;
}) {
  if (
    input.selected_branch_action === "RETURN_EXISTING_BUNDLE" ||
    input.selected_branch_action === "REUSE_SEALED_MANIFEST"
  ) {
    return input.prior_manifest;
  }
  return null;
}

function childAllocation(input: {
  branch_decision_contract: NonNullable<
    ManifestDecisionServiceResult["branch_decision_contract"]
  > | null;
}): ManifestDecisionServiceResult["child_allocation"] {
  const branchDecision = input.branch_decision_contract;
  if (branchDecision === null) {
    return null;
  }
  if (
    branchDecision.branch_action === "RETURN_EXISTING_BUNDLE" ||
    branchDecision.branch_action === "REUSE_SEALED_MANIFEST"
  ) {
    return null;
  }

  return {
    config_inheritance_mode_or_null: branchDecision.config_inheritance_mode_or_null,
    continuation_basis: branchDecision.selected_manifest_continuation_basis,
    continuation_of_manifest_id_or_null: branchDecision.continuation_of_manifest_id_or_null,
    input_inheritance_mode_or_null: branchDecision.input_inheritance_mode_or_null,
    parent_manifest_id_or_null: branchDecision.parent_manifest_id_or_null,
    replay_of_manifest_id_or_null: branchDecision.replay_of_manifest_id_or_null,
    root_manifest_id: branchDecision.root_manifest_id,
    selected_manifest_generation: branchDecision.selected_manifest_generation,
    selected_manifest_id: branchDecision.selected_manifest_id,
    supersedes_manifest_id_or_null: branchDecision.supersedes_manifest_id_or_null,
  };
}

export async function decideManifestOrchestration(
  input: ManifestDecisionOrchestratorInput,
): Promise<ManifestDecisionServiceResult> {
  const priorContext = await loadAndValidatePriorManifestContext({
    prior_manifest: input.prior_manifest,
    prior_manifest_id: input.prior_manifest_id,
    request: input.request,
    run_manifest_repository: input.run_manifest_repository,
    tenant_id: input.tenant_id,
  } satisfies LoadAndValidatePriorManifestContextInput);
  const strategyInput = {
    candidate_manifest_id: input.candidate_manifest_id,
    continuation_requested: input.continuation_requested,
    prior_context: priorContext,
    recovery_requested: input.recovery_requested,
  } satisfies DecideManifestReuseStrategyInput;
  const strategy = decideManifestReuseStrategy(strategyInput);
  const branchDecision = buildManifestDecisionBranchDecisionContract({ strategy });
  const replayOrRecoveryGuard = guardReplayOrRecoveryPath({
    continuation_requested: input.continuation_requested,
    prior_context: priorContext,
    recovery_requested: input.recovery_requested,
    selected_branch_action: strategy.selected_branch_action,
  });
  const supersessionGuard = guardSupersessionDecision({
    prior_context: priorContext,
    selected_branch_action: strategy.selected_branch_action,
  });
  const selectedSnapshot = selectedManifestSnapshot({
    prior_manifest: priorContext.prior_manifest,
    selected_branch_action: strategy.selected_branch_action,
  });

  return {
    blocked_reason_codes: strategy.blocked_reason_codes,
    branch_decision_contract: branchDecision,
    candidate_evaluations: strategy.candidate_evaluations,
    child_allocation: childAllocation({ branch_decision_contract: branchDecision }),
    decision_state: strategy.decision_state,
    lineage_trace_ready: selectedSnapshot !== null && branchDecision !== null,
    prior_context: priorContext,
    replay_or_recovery_guard: replayOrRecoveryGuard,
    request_identity_hash: priorContext.request_identity.hash,
    selected_branch_action: strategy.selected_branch_action,
    selected_branch_reason_code: strategy.selected_branch_reason_code,
    selected_manifest_continuation_basis: strategy.selected_manifest_continuation_basis,
    selected_manifest_id_or_null: branchDecision?.selected_manifest_id ?? null,
    selected_manifest_snapshot: selectedSnapshot,
    supersession_guard: supersessionGuard,
  };
}
