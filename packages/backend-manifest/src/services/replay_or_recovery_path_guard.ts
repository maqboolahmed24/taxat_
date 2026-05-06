import type { ManifestBranchAction } from "../models/manifest_branch_decision_contract.ts";
import type { RunManifestRecord } from "../models/run_manifest.ts";
import type { LoadedPriorManifestContext } from "../types/manifest_prior_context_status.ts";
import { continuationAllowed } from "./continuation_allowed.ts";

export type ReplayOrRecoveryGuardPath = "REPLAY_CHILD" | "RECOVERY_CHILD";

export type ReplayOrRecoveryGuardReasonCode =
  | "ACTIVE_LEASE_BLOCKS_RECOVERY"
  | "GUARD_NOT_APPLICABLE"
  | "PRIOR_CONTEXT_INVALID"
  | "PRIOR_MANIFEST_MISSING"
  | "RECOVERY_NOT_REQUESTED"
  | "RECOVERY_SOURCE_NOT_STALE_RECLAIMABLE"
  | "REPLAY_NOT_REQUESTED"
  | "REPLAY_SOURCE_NOT_TERMINAL_OR_REPLAYABLE";

export type ReplayOrRecoveryPathGuardResult = {
  attempt_lineage_ref_or_null: string | null;
  guard_state: "ALLOWED" | "BLOCKED" | "NOT_APPLICABLE";
  path: ReplayOrRecoveryGuardPath | null;
  reason_codes: ReplayOrRecoveryGuardReasonCode[];
  source_manifest_id_or_null: string | null;
};

function isReplayableBasis(manifest: RunManifestRecord) {
  return ["COMPLETED", "REPLAY_ONLY", "SUPERSEDED", "RETIRED", "FAILED", "BLOCKED"].includes(
    manifest.lifecycle_state,
  );
}

function requestedGuardPath(input: {
  prior_context: LoadedPriorManifestContext;
  recovery_requested?: boolean;
  selected_branch_action: ManifestBranchAction | null;
}): ReplayOrRecoveryGuardPath | null {
  if (
    input.selected_branch_action === "REPLAY_CHILD" ||
    input.selected_branch_action === "RECOVERY_CHILD"
  ) {
    return input.selected_branch_action;
  }
  if (input.selected_branch_action !== null) {
    return null;
  }
  if (input.recovery_requested === true) {
    return "RECOVERY_CHILD";
  }
  if (input.prior_context.request.run_kind === "REPLAY") {
    return "REPLAY_CHILD";
  }
  return null;
}

export function guardReplayOrRecoveryPath(input: {
  continuation_requested?: boolean;
  prior_context: LoadedPriorManifestContext;
  recovery_requested?: boolean;
  selected_branch_action: ManifestBranchAction | null;
}): ReplayOrRecoveryPathGuardResult {
  const path = requestedGuardPath(input);
  if (path === null) {
    return {
      attempt_lineage_ref_or_null: null,
      guard_state: "NOT_APPLICABLE",
      path: null,
      reason_codes: ["GUARD_NOT_APPLICABLE"],
      source_manifest_id_or_null: input.prior_context.prior_manifest?.manifest_id ?? null,
    };
  }

  const prior = input.prior_context.prior_manifest;
  if (input.prior_context.status !== "VALID") {
    return {
      attempt_lineage_ref_or_null: null,
      guard_state: "BLOCKED",
      path,
      reason_codes: ["PRIOR_CONTEXT_INVALID"],
      source_manifest_id_or_null: prior?.manifest_id ?? null,
    };
  }
  if (prior === null) {
    return {
      attempt_lineage_ref_or_null: null,
      guard_state: "BLOCKED",
      path,
      reason_codes: ["PRIOR_MANIFEST_MISSING"],
      source_manifest_id_or_null: null,
    };
  }

  const allowed = continuationAllowed({
    continuation_requested: input.continuation_requested,
    prior_context: input.prior_context,
    recovery_requested: input.recovery_requested,
  });

  if (path === "REPLAY_CHILD") {
    const reasonCodes: ReplayOrRecoveryGuardReasonCode[] = [];
    if (input.prior_context.request.run_kind !== "REPLAY") {
      reasonCodes.push("REPLAY_NOT_REQUESTED");
    }
    if (!isReplayableBasis(prior) || !allowed.replay_child_allowed) {
      reasonCodes.push("REPLAY_SOURCE_NOT_TERMINAL_OR_REPLAYABLE");
    }
    return {
      attempt_lineage_ref_or_null: null,
      guard_state: reasonCodes.length === 0 ? "ALLOWED" : "BLOCKED",
      path,
      reason_codes: reasonCodes,
      source_manifest_id_or_null: prior.manifest_id,
    };
  }

  const reasonCodes: ReplayOrRecoveryGuardReasonCode[] = [];
  if (input.recovery_requested !== true) {
    reasonCodes.push("RECOVERY_NOT_REQUESTED");
  }
  if (allowed.active_lease_blocks_recovery) {
    reasonCodes.push("ACTIVE_LEASE_BLOCKS_RECOVERY");
  }
  if (!allowed.recovery_child_allowed) {
    reasonCodes.push("RECOVERY_SOURCE_NOT_STALE_RECLAIMABLE");
  }

  return {
    attempt_lineage_ref_or_null: prior.manifest_start_claim?.attempt_lineage_ref ?? null,
    guard_state: reasonCodes.length === 0 ? "ALLOWED" : "BLOCKED",
    path,
    reason_codes: reasonCodes,
    source_manifest_id_or_null: prior.manifest_id,
  };
}
