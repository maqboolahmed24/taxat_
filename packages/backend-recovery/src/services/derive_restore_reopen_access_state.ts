import {
  isRestorePrivacyBlockedLimitedState,
  isRestorePrivacyFinalState,
} from "../models/restore_privacy_reconciliation_contract.ts";
import type {
  RestorePrivacyAuditChainState,
  RestorePrivacyLimitationState,
  RestorePrivacyReconciliationState,
  RestorePrivacyReopenAccessState,
} from "../models/recovery_checkpoint.ts";

export type DeriveRestoreReopenAccessStateInput = {
  privacy_reconciliation_state: RestorePrivacyReconciliationState;
  audit_chain_continuity_state: RestorePrivacyAuditChainState;
  replay_limitation_state: RestorePrivacyLimitationState;
  enquiry_limitation_state: RestorePrivacyLimitationState;
};

export function deriveRestoreReopenAccessState(
  input: DeriveRestoreReopenAccessStateInput,
): RestorePrivacyReopenAccessState {
  if (
    input.audit_chain_continuity_state === "FAILED" ||
    input.replay_limitation_state === "FAILED" ||
    input.enquiry_limitation_state === "FAILED"
  ) {
    return "BLOCKED";
  }

  if (isRestorePrivacyFinalState(input.privacy_reconciliation_state)) {
    return input.replay_limitation_state === "VERIFIED" &&
      input.enquiry_limitation_state === "VERIFIED"
      ? "READY_FOR_REOPEN"
      : "BLOCKED";
  }

  if (isRestorePrivacyBlockedLimitedState(input.privacy_reconciliation_state)) {
    return input.replay_limitation_state === "LIMITED_RECONCILED" &&
      input.enquiry_limitation_state === "LIMITED_RECONCILED"
      ? "LIMITED"
      : "BLOCKED";
  }

  return "BLOCKED";
}
