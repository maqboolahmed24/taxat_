import {
  RESTORE_PRIVACY_RECONCILIATION_BLOCKED_LIMITED_STATES,
  RESTORE_PRIVACY_RECONCILIATION_CONTRACT_VERSION,
  RESTORE_PRIVACY_RECONCILIATION_FINAL_STATES,
  RESTORE_PRIVACY_RECONCILIATION_SCOPE_POLICY,
  RecoveryCheckpointModelError,
  deriveRestorePrivacyReconciliationContractHash,
  normalizeRestorePrivacyReconciliationContract,
  requireTrimmedString,
  type RestorePrivacyReconciliationContract,
  type RestorePrivacyReconciliationState,
} from "./recovery_checkpoint.ts";

export const RESTORE_PRIVACY_RECONCILIATION_SCHEMA_ID =
  "https://taxat.dev/schemas/restore_privacy_reconciliation_contract.schema.json";

export type UnsignedRestorePrivacyReconciliationContract = Omit<
  RestorePrivacyReconciliationContract,
  "reconciliation_contract_hash"
>;

export function cloneRestorePrivacyReconciliationContract(
  contract: RestorePrivacyReconciliationContract,
) {
  return structuredClone(contract);
}

export function isRestorePrivacyFinalState(state: RestorePrivacyReconciliationState) {
  return RESTORE_PRIVACY_RECONCILIATION_FINAL_STATES.includes(
    state as (typeof RESTORE_PRIVACY_RECONCILIATION_FINAL_STATES)[number],
  );
}

export function isRestorePrivacyBlockedLimitedState(state: RestorePrivacyReconciliationState) {
  return RESTORE_PRIVACY_RECONCILIATION_BLOCKED_LIMITED_STATES.includes(
    state as (typeof RESTORE_PRIVACY_RECONCILIATION_BLOCKED_LIMITED_STATES)[number],
  );
}

export function restorePrivacyRequiredBlockerField(state: RestorePrivacyReconciliationState):
  | "legal_hold_ref_or_null"
  | "proof_preservation_basis_ref_or_null"
  | "authority_ambiguity_ref_or_null"
  | null {
  switch (state) {
    case "BLOCKED_LEGAL_HOLD":
      return "legal_hold_ref_or_null";
    case "BLOCKED_PROOF_PRESERVATION":
      return "proof_preservation_basis_ref_or_null";
    case "BLOCKED_AUTHORITY_AMBIGUITY":
      return "authority_ambiguity_ref_or_null";
    default:
      return null;
  }
}

export function buildRestorePrivacyContractHashPreimage(
  contract: RestorePrivacyReconciliationContract,
) {
  return {
    audit_chain_continuity_ref: contract.audit_chain_continuity_ref,
    audit_chain_continuity_state: contract.audit_chain_continuity_state,
    authority_ambiguity_ref_or_null: contract.authority_ambiguity_ref_or_null,
    checkpoint_ref: contract.checkpoint_ref,
    compensating_re_erasure_audit_ref_or_null:
      contract.compensating_re_erasure_audit_ref_or_null,
    compensating_re_erasure_state: contract.compensating_re_erasure_state,
    compensating_re_erasure_workflow_ref_or_null:
      contract.compensating_re_erasure_workflow_ref_or_null,
    contract_version: contract.contract_version,
    enquiry_limitation_state: contract.enquiry_limitation_state,
    legal_hold_ref_or_null: contract.legal_hold_ref_or_null,
    privacy_reconciliation_outcome_ref: contract.privacy_reconciliation_outcome_ref,
    privacy_reconciliation_state: contract.privacy_reconciliation_state,
    proof_preservation_basis_ref_or_null: contract.proof_preservation_basis_ref_or_null,
    re_erasure_completed_at_or_null: contract.re_erasure_completed_at_or_null,
    reconciliation_decided_at_or_null: contract.reconciliation_decided_at_or_null,
    reconciliation_scope_policy: contract.reconciliation_scope_policy,
    replay_limitation_state: contract.replay_limitation_state,
    reopen_access_state: contract.reopen_access_state,
    resurrected_data_posture: contract.resurrected_data_posture,
    resurrected_subject_count_or_null: contract.resurrected_subject_count_or_null,
    restore_drill_ref: contract.restore_drill_ref,
  } as const;
}

export function signRestorePrivacyReconciliationContract(
  contract: UnsignedRestorePrivacyReconciliationContract,
  expected?: {
    checkpoint_ref?: string;
    restore_drill_ref?: string;
    privacy_reconciliation_outcome_ref?: string;
  },
): RestorePrivacyReconciliationContract {
  const payload: RestorePrivacyReconciliationContract = {
    ...contract,
    contract_version: RESTORE_PRIVACY_RECONCILIATION_CONTRACT_VERSION,
    reconciliation_scope_policy: RESTORE_PRIVACY_RECONCILIATION_SCOPE_POLICY,
    checkpoint_ref: requireTrimmedString("restore_privacy.checkpoint_ref", contract.checkpoint_ref),
    restore_drill_ref: requireTrimmedString(
      "restore_privacy.restore_drill_ref",
      contract.restore_drill_ref,
    ),
    privacy_reconciliation_outcome_ref: requireTrimmedString(
      "restore_privacy.privacy_reconciliation_outcome_ref",
      contract.privacy_reconciliation_outcome_ref,
    ),
    reconciliation_contract_hash: "pending",
  };
  const hash = deriveRestorePrivacyReconciliationContractHash(payload);
  if (hash === null) {
    throw new RecoveryCheckpointModelError(
      "RECOVERY_CHECKPOINT_PRIVACY_INVALID",
      "restore privacy reconciliation contract hash preimage is incomplete",
    );
  }
  return normalizeRestorePrivacyReconciliationContract(
    {
      ...payload,
      reconciliation_contract_hash: hash,
    },
    expected,
  );
}
