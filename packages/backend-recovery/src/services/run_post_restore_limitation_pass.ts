import {
  RecoveryCheckpointModelError,
  requireTrimmedString,
  type RestorePrivacyAuditChainState,
  type RestorePrivacyLimitationState,
  type RestorePrivacyReconciliationState,
} from "../models/recovery_checkpoint.ts";
import { isRestorePrivacyBlockedLimitedState } from "../models/restore_privacy_reconciliation_contract.ts";
import { deriveRestoreReopenAccessState } from "./derive_restore_reopen_access_state.ts";

export type PostRestoreLimitationRailEvidence = {
  verification_ref_or_null: string | null;
  limited_reconciliation_ref_or_null: string | null;
  failure_ref_or_null: string | null;
};

export type PostRestoreLimitationPass = {
  replay_limitation_state: RestorePrivacyLimitationState;
  enquiry_limitation_state: RestorePrivacyLimitationState;
  reopen_access_state: ReturnType<typeof deriveRestoreReopenAccessState>;
  replay_limitation_ref_or_null: string | null;
  enquiry_limitation_ref_or_null: string | null;
  limitation_failure_refs: readonly string[];
};

export type RunPostRestoreLimitationPassInput = {
  privacy_reconciliation_state: RestorePrivacyReconciliationState;
  audit_chain_continuity_state: RestorePrivacyAuditChainState;
  replay: PostRestoreLimitationRailEvidence;
  enquiry: PostRestoreLimitationRailEvidence;
};

function normalizeNullableRef(label: string, value: string | null) {
  return value === null ? null : requireTrimmedString(label, value);
}

function railState(input: {
  label: "replay" | "enquiry";
  privacy_reconciliation_state: RestorePrivacyReconciliationState;
  evidence: PostRestoreLimitationRailEvidence;
}): {
  state: RestorePrivacyLimitationState;
  ref_or_null: string | null;
  failure_ref_or_null: string | null;
} {
  const verificationRef = normalizeNullableRef(
    `post_restore_limitation.${input.label}.verification_ref_or_null`,
    input.evidence.verification_ref_or_null,
  );
  const limitedRef = normalizeNullableRef(
    `post_restore_limitation.${input.label}.limited_reconciliation_ref_or_null`,
    input.evidence.limited_reconciliation_ref_or_null,
  );
  const failureRef = normalizeNullableRef(
    `post_restore_limitation.${input.label}.failure_ref_or_null`,
    input.evidence.failure_ref_or_null,
  );
  const populatedRefs = [verificationRef, limitedRef, failureRef].filter(
    (ref): ref is string => ref !== null,
  );
  if (populatedRefs.length > 1) {
    throw new RecoveryCheckpointModelError(
      "RECOVERY_CHECKPOINT_PRIVACY_INVALID",
      `${input.label} limitation rail must publish exactly one terminal evidence ref`,
    );
  }
  if (failureRef !== null) {
    return { state: "FAILED", ref_or_null: failureRef, failure_ref_or_null: failureRef };
  }
  if (input.privacy_reconciliation_state === "PENDING_RECONCILIATION") {
    return { state: "FAILED", ref_or_null: null, failure_ref_or_null: null };
  }
  if (isRestorePrivacyBlockedLimitedState(input.privacy_reconciliation_state)) {
    if (limitedRef === null) {
      return { state: "FAILED", ref_or_null: null, failure_ref_or_null: null };
    }
    return { state: "LIMITED_RECONCILED", ref_or_null: limitedRef, failure_ref_or_null: null };
  }
  if (verificationRef !== null) {
    return { state: "VERIFIED", ref_or_null: verificationRef, failure_ref_or_null: null };
  }
  return { state: "FAILED", ref_or_null: null, failure_ref_or_null: null };
}

export function runPostRestoreLimitationPass(
  input: RunPostRestoreLimitationPassInput,
): PostRestoreLimitationPass {
  const replay = railState({
    label: "replay",
    privacy_reconciliation_state: input.privacy_reconciliation_state,
    evidence: input.replay,
  });
  const enquiry = railState({
    label: "enquiry",
    privacy_reconciliation_state: input.privacy_reconciliation_state,
    evidence: input.enquiry,
  });
  return {
    replay_limitation_state: replay.state,
    enquiry_limitation_state: enquiry.state,
    reopen_access_state: deriveRestoreReopenAccessState({
      privacy_reconciliation_state: input.privacy_reconciliation_state,
      audit_chain_continuity_state: input.audit_chain_continuity_state,
      replay_limitation_state: replay.state,
      enquiry_limitation_state: enquiry.state,
    }),
    replay_limitation_ref_or_null: replay.ref_or_null,
    enquiry_limitation_ref_or_null: enquiry.ref_or_null,
    limitation_failure_refs: [replay.failure_ref_or_null, enquiry.failure_ref_or_null].filter(
      (ref): ref is string => ref !== null,
    ),
  };
}
