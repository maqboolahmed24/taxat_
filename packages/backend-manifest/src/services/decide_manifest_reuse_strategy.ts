import type { ManifestBranchDecisionContract } from "../../../generated-models/src/generated/typescript/manifest-and-release.ts";
import {
  CANONICAL_BRANCH_ACTION_ORDER,
  normalizeCanonicalRejectionReasonCodes,
  normalizeManifestBranchDecisionContract,
  type BranchCandidateEvaluationRecord,
  type ManifestBranchAction,
  type ManifestBranchReasonCode,
  type ManifestRejectionReasonCode,
} from "../models/manifest_branch_decision_contract.ts";
import type { RunManifestRecord } from "../models/run_manifest.ts";
import type { LoadedPriorManifestContext } from "../types/manifest_prior_context_status.ts";
import type {
  ManifestReuseBlockedReasonCode,
  ManifestReuseStrategy,
} from "../types/manifest_reuse_strategy.ts";
import { continuationAllowed } from "./continuation_allowed.ts";
import { mapBranchActionToContinuationInheritance } from "./continuation_inheritance_mode_mapper.ts";

export type DecideManifestReuseStrategyInput = {
  candidate_manifest_id?: string;
  continuation_requested?: boolean;
  prior_context: LoadedPriorManifestContext;
  recovery_requested?: boolean;
};

const BRANCH_REASON_BY_ACTION = {
  NEW_MANIFEST: "NO_PRIOR_MANIFEST",
  RETURN_EXISTING_BUNDLE: "TERMINAL_IDEMPOTENT_RETRY",
  REUSE_SEALED_MANIFEST: "PRESTART_SEALED_CONTEXT_REUSE",
  REPLAY_CHILD: "REPLAY_REQUESTED_EXACT",
  RECOVERY_CHILD: "STARTED_ATTEMPT_RECOVERY",
  CONTINUATION_CHILD: "POST_TERMINAL_CONTINUATION_REQUIRED",
  NEW_REQUEST_CHILD: "REQUEST_IDENTITY_CHANGED",
} as const satisfies Record<ManifestBranchAction, ManifestBranchReasonCode>;

function terminalState(manifest: RunManifestRecord | null) {
  return manifest?.lifecycle_state ?? null;
}

function manifestHash(context: LoadedPriorManifestContext) {
  return context.prior_manifest_hash;
}

function candidateId(input: DecideManifestReuseStrategyInput, action: ManifestBranchAction) {
  if (action === "RETURN_EXISTING_BUNDLE" || action === "REUSE_SEALED_MANIFEST") {
    return input.prior_context.prior_manifest?.manifest_id ?? null;
  }
  return (
    input.candidate_manifest_id ??
    `manifest.pending.${input.prior_context.request_identity.hash.slice(0, 24)}.${action.toLowerCase()}`
  );
}

function selectedAction(input: DecideManifestReuseStrategyInput): {
  action: ManifestBranchAction | null;
  blocked_reason_codes: ManifestReuseBlockedReasonCode[];
} {
  const context = input.prior_context;
  if (context.status === "ABSENT") {
    return { action: "NEW_MANIFEST", blocked_reason_codes: [] };
  }
  if (context.status === "INVALID") {
    return {
      action: null,
      blocked_reason_codes: ["PRIOR_MANIFEST_CONTEXT_INVALID"],
    };
  }

  const allowed = continuationAllowed({
    prior_context: context,
    recovery_requested: input.recovery_requested,
    continuation_requested: input.continuation_requested,
  });
  if (allowed.active_lease_blocks_recovery) {
    return {
      action: null,
      blocked_reason_codes: ["ACTIVE_LEASE_BLOCKS_RECOVERY"],
    };
  }
  if (allowed.return_existing_bundle_allowed) {
    return { action: "RETURN_EXISTING_BUNDLE", blocked_reason_codes: [] };
  }
  if (allowed.reuse_sealed_manifest_allowed) {
    return { action: "REUSE_SEALED_MANIFEST", blocked_reason_codes: [] };
  }
  if (allowed.replay_child_allowed) {
    return { action: "REPLAY_CHILD", blocked_reason_codes: [] };
  }
  if (allowed.recovery_child_allowed) {
    return { action: "RECOVERY_CHILD", blocked_reason_codes: [] };
  }
  if (allowed.continuation_child_allowed) {
    return { action: "CONTINUATION_CHILD", blocked_reason_codes: [] };
  }
  if (allowed.new_request_child_allowed) {
    return { action: "NEW_REQUEST_CHILD", blocked_reason_codes: [] };
  }
  return {
    action: null,
    blocked_reason_codes: ["NO_BRANCH_ACTION_LEGAL"],
  };
}

function rejectedReasonsForAction(input: {
  action: ManifestBranchAction;
  selected_action: ManifestBranchAction | null;
  strategy_input: DecideManifestReuseStrategyInput;
}): ManifestRejectionReasonCode[] {
  if (input.action === input.selected_action) {
    return [];
  }
  const context = input.strategy_input.prior_context;
  const prior = context.prior_manifest;
  if (context.status === "ABSENT") {
    return input.action === "NEW_MANIFEST" ? [] : ["NO_PRIOR_MANIFEST"];
  }
  if (context.status === "INVALID") {
    return normalizeCanonicalRejectionReasonCodes([
      ...(context.compatibility?.branch_disqualifier_reason_codes ?? []),
      "CONTINUATION_NOT_LEGAL",
    ]);
  }

  const allowed = continuationAllowed({
    prior_context: context,
    recovery_requested: input.strategy_input.recovery_requested,
    continuation_requested: input.strategy_input.continuation_requested,
  });
  switch (input.action) {
    case "NEW_MANIFEST":
      return ["CHILD_ALLOCATION_NOT_REQUIRED"];
    case "RETURN_EXISTING_BUNDLE":
      if (!allowed.return_existing_bundle_allowed) {
        return normalizeCanonicalRejectionReasonCodes([
          ...(context.compatibility?.request_identity_matches_prior
            ? ["RETURNED_BUNDLE_NOT_AVAILABLE"]
            : ["REQUEST_IDENTITY_HASH_MISMATCH"]),
          ...(prior !== null && !["COMPLETED", "REPLAY_ONLY", "SUPERSEDED", "RETIRED"].includes(prior.lifecycle_state)
            ? ["PRIOR_MANIFEST_NOT_TERMINAL"]
            : []),
        ]);
      }
      return [];
    case "REUSE_SEALED_MANIFEST":
      return normalizeCanonicalRejectionReasonCodes(
        allowed.reuse_sealed_manifest_allowed
          ? []
          : [
              ...(context.compatibility?.request_identity_matches_prior
                ? []
                : ["REQUEST_IDENTITY_HASH_MISMATCH"]),
              ...(allowed.reason_codes.includes("PRIOR_MANIFEST_NOT_SEALED")
                ? ["PRIOR_MANIFEST_NOT_SEALED"]
                : []),
              ...(allowed.reason_codes.includes("PRIOR_MANIFEST_ALREADY_STARTED")
                ? ["PRIOR_MANIFEST_ALREADY_STARTED"]
                : []),
            ],
      );
    case "REPLAY_CHILD":
      return normalizeCanonicalRejectionReasonCodes(
        allowed.replay_child_allowed
          ? []
          : [
              ...(allowed.return_existing_bundle_allowed
                ? ["CHILD_ALLOCATION_NOT_REQUIRED"]
                : []),
              ...(context.request.run_kind === "REPLAY" ? [] : ["REPLAY_NOT_REQUESTED"]),
              ...(prior !== null && !["COMPLETED", "REPLAY_ONLY", "SUPERSEDED", "RETIRED", "FAILED", "BLOCKED"].includes(prior.lifecycle_state)
                ? ["PRIOR_MANIFEST_NOT_TERMINAL"]
                : []),
            ],
      );
    case "RECOVERY_CHILD":
      return normalizeCanonicalRejectionReasonCodes(
        allowed.recovery_child_allowed
          ? []
          : [
              ...(input.strategy_input.recovery_requested ? [] : ["RECOVERY_NOT_REQUIRED"]),
              ...(allowed.active_lease_blocks_recovery ? ["CONTINUATION_NOT_LEGAL"] : []),
            ],
      );
    case "CONTINUATION_CHILD":
      return allowed.continuation_child_allowed ? [] : ["CONTINUATION_NOT_LEGAL"];
    case "NEW_REQUEST_CHILD":
      return allowed.new_request_child_allowed
        ? []
        : ["REQUEST_IDENTITY_CONTINUATION_NOT_REQUIRED"];
  }
}

function buildCandidateEvaluations(input: {
  selected_action: ManifestBranchAction | null;
  strategy_input: DecideManifestReuseStrategyInput;
}): BranchCandidateEvaluationRecord[] {
  const context = input.strategy_input.prior_context;
  return CANONICAL_BRANCH_ACTION_ORDER.map((action) => ({
    candidate_action: action,
    evaluation_state: action === input.selected_action ? "SELECTED" : "REJECTED",
    compared_manifest_id_or_null: context.prior_manifest?.manifest_id ?? null,
    compared_manifest_hash_or_null: manifestHash(context),
    compared_manifest_lifecycle_state_or_null: terminalState(context.prior_manifest),
    disqualifier_reason_codes: rejectedReasonsForAction({
      action,
      selected_action: input.selected_action,
      strategy_input: input.strategy_input,
    }),
  }));
}

function branchReason(input: {
  action: ManifestBranchAction;
  context: LoadedPriorManifestContext;
}): ManifestBranchReasonCode {
  if (
    input.action === "CONTINUATION_CHILD" &&
    input.context.request.run_kind === "NIGHTLY" &&
    input.context.prior_manifest?.nightly_window_key !==
      input.context.request.nightly_window_key_or_null
  ) {
    return "NIGHTLY_WINDOW_ADVANCED";
  }
  return BRANCH_REASON_BY_ACTION[input.action];
}

function buildBranchDecision(input: {
  action: ManifestBranchAction;
  strategy_input: DecideManifestReuseStrategyInput;
}): ManifestBranchDecisionContract {
  const context = input.strategy_input.prior_context;
  const prior = context.prior_manifest;
  const request = context.request_identity.vector;
  const selectedManifestId = candidateId(input.strategy_input, input.action)!;
  const inheritance = mapBranchActionToContinuationInheritance(input.action);
  const selectedBasis =
    input.action === "RETURN_EXISTING_BUNDLE" || input.action === "REUSE_SEALED_MANIFEST"
      ? prior!.continuation_basis
      : inheritance.selected_manifest_continuation_basis!;
  const rootManifestId =
    input.action === "NEW_MANIFEST"
      ? selectedManifestId
      : input.action === "RETURN_EXISTING_BUNDLE" || input.action === "REUSE_SEALED_MANIFEST"
        ? prior!.root_manifest_id ?? prior!.manifest_id
        : prior!.root_manifest_id ?? prior!.manifest_id;
  const selectedGeneration =
    input.action === "NEW_MANIFEST"
      ? 0
      : input.action === "RETURN_EXISTING_BUNDLE" || input.action === "REUSE_SEALED_MANIFEST"
        ? prior!.manifest_generation
        : prior!.manifest_generation + 1;

  return normalizeManifestBranchDecisionContract({
    branch_action: input.action,
    branch_reason_code: branchReason({ action: input.action, context }),
    idempotency_key: request.idempotency_key,
    request_identity_hash: context.request_identity.hash,
    access_binding_hash: request.access_binding_hash,
    requested_scope: request.requested_scope,
    effective_scope: request.effective_scope,
    mode: request.mode,
    run_kind: request.run_kind,
    replay_class_or_null: request.replay_class_or_null,
    nightly_window_key_or_null: request.nightly_window_key_or_null,
    prior_manifest_id_or_null: prior?.manifest_id ?? null,
    prior_manifest_hash_at_decision_or_null: context.prior_manifest_hash,
    prior_manifest_lifecycle_state_or_null: prior?.lifecycle_state ?? null,
    selected_manifest_id: selectedManifestId,
    selected_manifest_continuation_basis: selectedBasis,
    root_manifest_id: rootManifestId,
    parent_manifest_id_or_null:
      input.action === "NEW_MANIFEST" ||
      input.action === "RETURN_EXISTING_BUNDLE" ||
      input.action === "REUSE_SEALED_MANIFEST"
        ? prior?.parent_manifest_id ?? null
        : prior!.manifest_id,
    continuation_of_manifest_id_or_null:
      input.action === "RECOVERY_CHILD" ||
      input.action === "CONTINUATION_CHILD" ||
      input.action === "NEW_REQUEST_CHILD"
        ? prior!.manifest_id
        : input.action === "RETURN_EXISTING_BUNDLE" || input.action === "REUSE_SEALED_MANIFEST"
          ? prior!.continuation_of_manifest_id
          : null,
    replay_of_manifest_id_or_null:
      input.action === "REPLAY_CHILD"
        ? prior!.manifest_id
        : input.action === "RETURN_EXISTING_BUNDLE" || input.action === "REUSE_SEALED_MANIFEST"
          ? prior!.replay_of_manifest_id
          : null,
    supersedes_manifest_id_or_null:
      input.action === "NEW_REQUEST_CHILD"
        ? prior!.manifest_id
        : input.action === "RETURN_EXISTING_BUNDLE" || input.action === "REUSE_SEALED_MANIFEST"
          ? prior!.supersedes_manifest_id
          : null,
    selected_manifest_generation: selectedGeneration,
    config_inheritance_mode_or_null:
      input.action === "RETURN_EXISTING_BUNDLE" || input.action === "REUSE_SEALED_MANIFEST"
        ? prior!.continuation_set.config_inheritance_mode
        : inheritance.config_inheritance_mode_or_null,
    input_inheritance_mode_or_null:
      input.action === "RETURN_EXISTING_BUNDLE" || input.action === "REUSE_SEALED_MANIFEST"
        ? prior!.continuation_set.input_inheritance_mode
        : inheritance.input_inheritance_mode_or_null,
    returned_decision_bundle_hash_or_null:
      input.action === "RETURN_EXISTING_BUNDLE" ? prior!.decision_bundle_hash : null,
  });
}

export function decideManifestReuseStrategy(
  input: DecideManifestReuseStrategyInput,
): ManifestReuseStrategy {
  const selection = selectedAction(input);
  const candidateEvaluations = buildCandidateEvaluations({
    selected_action: selection.action,
    strategy_input: input,
  });

  if (selection.action === null) {
    return {
      decision_state: "BLOCKED",
      blocked_reason_codes: selection.blocked_reason_codes,
      selected_branch_action: null,
      selected_branch_reason_code: null,
      selected_manifest_continuation_basis: null,
      branch_decision_contract: null,
      candidate_evaluations: candidateEvaluations,
      prior_context: input.prior_context,
    };
  }

  const branchDecision = buildBranchDecision({
    action: selection.action,
    strategy_input: input,
  });
  return {
    decision_state: "SELECTED",
    blocked_reason_codes: [],
    selected_branch_action: selection.action,
    selected_branch_reason_code: branchDecision.branch_reason_code,
    selected_manifest_continuation_basis: branchDecision.selected_manifest_continuation_basis,
    branch_decision_contract: branchDecision,
    candidate_evaluations: candidateEvaluations,
    prior_context: input.prior_context,
  };
}
