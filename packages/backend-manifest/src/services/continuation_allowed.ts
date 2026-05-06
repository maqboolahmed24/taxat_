import type { ManifestRejectionReasonCode } from "../models/manifest_branch_decision_contract.ts";
import type { RunManifestRecord } from "../models/run_manifest.ts";
import type { LoadedPriorManifestContext } from "../types/manifest_prior_context_status.ts";
import { validateReuseSealedContext } from "./validate_reuse_sealed_context.ts";

export type ContinuationAllowedInput = {
  continuation_requested?: boolean;
  prior_context: LoadedPriorManifestContext;
  recovery_requested?: boolean;
};

export type ContinuationAllowedResult = {
  active_lease_blocks_recovery: boolean;
  continuation_child_allowed: boolean;
  new_request_child_allowed: boolean;
  reason_codes: ManifestRejectionReasonCode[];
  recovery_child_allowed: boolean;
  replay_child_allowed: boolean;
  reuse_sealed_manifest_allowed: boolean;
  return_existing_bundle_allowed: boolean;
};

const TERMINAL_BUNDLE_STATES = new Set<RunManifestRecord["lifecycle_state"]>([
  "COMPLETED",
  "REPLAY_ONLY",
  "SUPERSEDED",
  "RETIRED",
]);

function hasTerminalBundle(manifest: RunManifestRecord) {
  return (
    TERMINAL_BUNDLE_STATES.has(manifest.lifecycle_state) &&
    manifest.decision_bundle_hash !== null
  );
}

function hasTerminalOrReplayableBasis(manifest: RunManifestRecord) {
  return (
    TERMINAL_BUNDLE_STATES.has(manifest.lifecycle_state) ||
    manifest.lifecycle_state === "FAILED" ||
    manifest.lifecycle_state === "BLOCKED"
  );
}

function sameRequest(context: LoadedPriorManifestContext) {
  return context.compatibility?.request_identity_matches_prior === true;
}

function requestIdentityDriftIsCompatible(context: LoadedPriorManifestContext) {
  const drift = context.compatibility?.identity_drift_reason_codes ?? [];
  return drift.every((reason) =>
    [
      "EFFECTIVE_SCOPE_MISMATCH",
      "NIGHTLY_WINDOW_MISMATCH",
      "REQUESTED_SCOPE_MISMATCH",
      "REQUEST_IDENTITY_HASH_MISMATCH",
    ].includes(reason),
  );
}

export function continuationAllowed(
  input: ContinuationAllowedInput,
): ContinuationAllowedResult {
  const reasonCodes: ManifestRejectionReasonCode[] = [];
  const context = input.prior_context;
  const prior = context.prior_manifest;
  if (context.status !== "VALID" || prior === null) {
    return {
      return_existing_bundle_allowed: false,
      reuse_sealed_manifest_allowed: false,
      replay_child_allowed: false,
      recovery_child_allowed: false,
      continuation_child_allowed: false,
      new_request_child_allowed: false,
      active_lease_blocks_recovery: false,
      reason_codes: context.status === "ABSENT" ? ["NO_PRIOR_MANIFEST"] : ["CONTINUATION_NOT_LEGAL"],
    };
  }

  const isSameRequest = sameRequest(context);
  const sealedValidation = validateReuseSealedContext(prior);
  const activeLeaseBlocksRecovery =
    input.recovery_requested === true &&
    prior.manifest_start_claim?.claim_state === "ACTIVE_LEASED";
  const recoveryChildAllowed =
    input.recovery_requested === true &&
    !activeLeaseBlocksRecovery &&
    (prior.lifecycle_state === "IN_PROGRESS" || prior.lifecycle_state === "FAILED") &&
    prior.manifest_start_claim?.claim_state === "STALE_RECLAIM_REQUIRED";
  const returnExistingBundleAllowed = isSameRequest && hasTerminalBundle(prior);
  const reuseSealedManifestAllowed = isSameRequest && sealedValidation.reusable;
  const replayChildAllowed =
    context.request.run_kind === "REPLAY" &&
    hasTerminalOrReplayableBasis(prior) &&
    !returnExistingBundleAllowed;
  const nightlyWindowAdvanced =
    context.request.run_kind === "NIGHTLY" &&
    (prior.nightly_window_key ?? null) !== (context.request.nightly_window_key_or_null ?? null);
  const continuationChildAllowed =
    !returnExistingBundleAllowed &&
    !reuseSealedManifestAllowed &&
    !replayChildAllowed &&
    !recoveryChildAllowed &&
    hasTerminalOrReplayableBasis(prior) &&
    (input.continuation_requested === true || nightlyWindowAdvanced);
  const newRequestChildAllowed =
    !returnExistingBundleAllowed &&
    !reuseSealedManifestAllowed &&
    !replayChildAllowed &&
    !recoveryChildAllowed &&
    !continuationChildAllowed &&
    hasTerminalOrReplayableBasis(prior) &&
    !isSameRequest &&
    requestIdentityDriftIsCompatible(context);

  if (!returnExistingBundleAllowed) {
    reasonCodes.push(
      isSameRequest ? "RETURNED_BUNDLE_NOT_AVAILABLE" : "REQUEST_IDENTITY_HASH_MISMATCH",
    );
  }
  if (!reuseSealedManifestAllowed) {
    reasonCodes.push(...sealedValidation.reason_codes);
  }
  if (!replayChildAllowed && context.request.run_kind !== "REPLAY") {
    reasonCodes.push("REPLAY_NOT_REQUESTED");
  }
  if (!recoveryChildAllowed && input.recovery_requested !== true) {
    reasonCodes.push("RECOVERY_NOT_REQUIRED");
  }
  if (activeLeaseBlocksRecovery || (!continuationChildAllowed && !newRequestChildAllowed)) {
    reasonCodes.push("CONTINUATION_NOT_LEGAL");
  }

  return {
    return_existing_bundle_allowed: returnExistingBundleAllowed,
    reuse_sealed_manifest_allowed: reuseSealedManifestAllowed,
    replay_child_allowed: replayChildAllowed,
    recovery_child_allowed: recoveryChildAllowed,
    continuation_child_allowed: continuationChildAllowed,
    new_request_child_allowed: newRequestChildAllowed,
    active_lease_blocks_recovery: activeLeaseBlocksRecovery,
    reason_codes: [...new Set(reasonCodes)],
  };
}
