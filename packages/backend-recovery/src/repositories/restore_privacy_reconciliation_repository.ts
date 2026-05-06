import { cloneRestorePrivacyReconciliationContract } from "../models/restore_privacy_reconciliation_contract.ts";
import {
  normalizeRecoveryCheckpointInstant,
  normalizeRestorePrivacyReconciliationContract,
  type RestorePrivacyAuditChainState,
  type RestorePrivacyLimitationState,
  type RestorePrivacyReconciliationContract,
  type RestorePrivacyReconciliationState,
  type RestorePrivacyReopenAccessState,
  type RestorePrivacyResurrectedPosture,
} from "../models/recovery_checkpoint.ts";

export type StoredRestorePrivacyReconciliationRecord = {
  reconciliation_contract_hash: string;
  checkpoint_ref: string;
  restore_drill_ref: string;
  privacy_reconciliation_outcome_ref: string;
  privacy_reconciliation_state: RestorePrivacyReconciliationState;
  resurrected_data_posture: RestorePrivacyResurrectedPosture;
  audit_chain_continuity_state: RestorePrivacyAuditChainState;
  replay_limitation_state: RestorePrivacyLimitationState;
  enquiry_limitation_state: RestorePrivacyLimitationState;
  reopen_access_state: RestorePrivacyReopenAccessState;
  restore_privacy_reconciliation_row_version: number;
  persisted_at: string;
  updated_at: string;
  reconciliation_contract: RestorePrivacyReconciliationContract;
};

export type RestorePrivacyReconciliationRepositoryErrorCode =
  | "RESTORE_PRIVACY_RECONCILIATION_COMPARE_AND_SWAP_CONFLICT"
  | "RESTORE_PRIVACY_RECONCILIATION_DUPLICATE"
  | "RESTORE_PRIVACY_RECONCILIATION_HASH_COLLISION"
  | "RESTORE_PRIVACY_RECONCILIATION_NOT_FOUND"
  | "RESTORE_PRIVACY_RECONCILIATION_OUTCOME_REF_COLLISION";

export class RestorePrivacyReconciliationRepositoryError extends Error {
  readonly code: RestorePrivacyReconciliationRepositoryErrorCode;

  constructor(code: RestorePrivacyReconciliationRepositoryErrorCode, detail: string) {
    super(`${code}: ${detail}`);
    this.name = "RestorePrivacyReconciliationRepositoryError";
    this.code = code;
  }
}

function cloneStored(record: StoredRestorePrivacyReconciliationRecord) {
  return structuredClone(record);
}

function pushIndex(index: Map<string, string[]>, key: string, outcomeRef: string) {
  const current = index.get(key) ?? [];
  if (!current.includes(outcomeRef)) {
    current.push(outcomeRef);
    index.set(key, current);
  }
}

function sortStored(
  left: StoredRestorePrivacyReconciliationRecord,
  right: StoredRestorePrivacyReconciliationRecord,
) {
  return (
    left.checkpoint_ref.localeCompare(right.checkpoint_ref) ||
    left.restore_drill_ref.localeCompare(right.restore_drill_ref) ||
    left.privacy_reconciliation_outcome_ref.localeCompare(right.privacy_reconciliation_outcome_ref)
  );
}

export class RestorePrivacyReconciliationRepository {
  private readonly currentByOutcomeRef = new Map<string, StoredRestorePrivacyReconciliationRecord>();
  private readonly historyByHash = new Map<string, StoredRestorePrivacyReconciliationRecord>();
  private readonly historyByOutcomeRef = new Map<string, StoredRestorePrivacyReconciliationRecord[]>();
  private readonly outcomeRefsByCheckpointRef = new Map<string, string[]>();
  private readonly outcomeRefsByRestoreDrillRef = new Map<string, string[]>();
  private readonly outcomeRefsByState = new Map<string, string[]>();
  private readonly outcomeRefsByReopenAccessState = new Map<string, string[]>();

  private rebuildIndexes() {
    this.outcomeRefsByCheckpointRef.clear();
    this.outcomeRefsByRestoreDrillRef.clear();
    this.outcomeRefsByState.clear();
    this.outcomeRefsByReopenAccessState.clear();
    for (const stored of this.currentByOutcomeRef.values()) {
      pushIndex(
        this.outcomeRefsByCheckpointRef,
        stored.checkpoint_ref,
        stored.privacy_reconciliation_outcome_ref,
      );
      pushIndex(
        this.outcomeRefsByRestoreDrillRef,
        stored.restore_drill_ref,
        stored.privacy_reconciliation_outcome_ref,
      );
      pushIndex(
        this.outcomeRefsByState,
        stored.privacy_reconciliation_state,
        stored.privacy_reconciliation_outcome_ref,
      );
      pushIndex(
        this.outcomeRefsByReopenAccessState,
        stored.reopen_access_state,
        stored.privacy_reconciliation_outcome_ref,
      );
    }
  }

  private buildStoredRecord(input: {
    contract: RestorePrivacyReconciliationContract;
    row_version: number;
    persisted_at: string;
    previous_persisted_at?: string;
  }): StoredRestorePrivacyReconciliationRecord {
    const contract = normalizeRestorePrivacyReconciliationContract(input.contract);
    const persistedAt = normalizeRecoveryCheckpointInstant(input.persisted_at);
    return {
      reconciliation_contract_hash: contract.reconciliation_contract_hash,
      checkpoint_ref: contract.checkpoint_ref,
      restore_drill_ref: contract.restore_drill_ref,
      privacy_reconciliation_outcome_ref: contract.privacy_reconciliation_outcome_ref,
      privacy_reconciliation_state: contract.privacy_reconciliation_state,
      resurrected_data_posture: contract.resurrected_data_posture,
      audit_chain_continuity_state: contract.audit_chain_continuity_state,
      replay_limitation_state: contract.replay_limitation_state,
      enquiry_limitation_state: contract.enquiry_limitation_state,
      reopen_access_state: contract.reopen_access_state,
      restore_privacy_reconciliation_row_version: input.row_version,
      persisted_at: input.previous_persisted_at ?? persistedAt,
      updated_at: persistedAt,
      reconciliation_contract: cloneRestorePrivacyReconciliationContract(contract),
    };
  }

  private appendHistory(record: StoredRestorePrivacyReconciliationRecord) {
    const current = this.historyByOutcomeRef.get(record.privacy_reconciliation_outcome_ref) ?? [];
    current.push(cloneStored(record));
    current.sort((left, right) =>
      left.restore_privacy_reconciliation_row_version -
      right.restore_privacy_reconciliation_row_version,
    );
    this.historyByOutcomeRef.set(record.privacy_reconciliation_outcome_ref, current);
    this.historyByHash.set(record.reconciliation_contract_hash, cloneStored(record));
  }

  private listByOutcomeRefs(outcomeRefs: readonly string[]) {
    return outcomeRefs
      .map((outcomeRef) => this.currentByOutcomeRef.get(outcomeRef))
      .filter((record): record is StoredRestorePrivacyReconciliationRecord => record !== undefined)
      .sort(sortStored)
      .map((record) => cloneStored(record));
  }

  async persistRestorePrivacyReconciliation(input: {
    contract: RestorePrivacyReconciliationContract;
    persisted_at: string;
  }) {
    const contract = normalizeRestorePrivacyReconciliationContract(input.contract);
    const existingCurrent = this.currentByOutcomeRef.get(contract.privacy_reconciliation_outcome_ref);
    if (existingCurrent) {
      if (existingCurrent.reconciliation_contract_hash !== contract.reconciliation_contract_hash) {
        throw new RestorePrivacyReconciliationRepositoryError(
          "RESTORE_PRIVACY_RECONCILIATION_OUTCOME_REF_COLLISION",
          `privacy outcome ${contract.privacy_reconciliation_outcome_ref} already exists with a different hash`,
        );
      }
      return cloneStored(existingCurrent);
    }
    const existingHash = this.historyByHash.get(contract.reconciliation_contract_hash);
    if (existingHash && existingHash.privacy_reconciliation_outcome_ref !== contract.privacy_reconciliation_outcome_ref) {
      throw new RestorePrivacyReconciliationRepositoryError(
        "RESTORE_PRIVACY_RECONCILIATION_HASH_COLLISION",
        `contract hash ${contract.reconciliation_contract_hash} belongs to another privacy outcome`,
      );
    }
    const stored = this.buildStoredRecord({
      contract,
      row_version: 1,
      persisted_at: input.persisted_at,
    });
    this.currentByOutcomeRef.set(stored.privacy_reconciliation_outcome_ref, cloneStored(stored));
    this.appendHistory(stored);
    this.rebuildIndexes();
    return cloneStored(stored);
  }

  async compareAndSwapRestorePrivacyReconciliation(input: {
    privacy_reconciliation_outcome_ref: string;
    expected_restore_privacy_reconciliation_row_version: number;
    contract: RestorePrivacyReconciliationContract;
    persisted_at: string;
  }) {
    const existing = this.currentByOutcomeRef.get(input.privacy_reconciliation_outcome_ref);
    if (!existing) {
      throw new RestorePrivacyReconciliationRepositoryError(
        "RESTORE_PRIVACY_RECONCILIATION_NOT_FOUND",
        `privacy outcome ${input.privacy_reconciliation_outcome_ref} does not exist`,
      );
    }
    if (
      existing.restore_privacy_reconciliation_row_version !==
      input.expected_restore_privacy_reconciliation_row_version
    ) {
      throw new RestorePrivacyReconciliationRepositoryError(
        "RESTORE_PRIVACY_RECONCILIATION_COMPARE_AND_SWAP_CONFLICT",
        `expected row version ${input.expected_restore_privacy_reconciliation_row_version} but found ${existing.restore_privacy_reconciliation_row_version}`,
      );
    }
    const contract = normalizeRestorePrivacyReconciliationContract(input.contract, {
      checkpoint_ref: existing.checkpoint_ref,
      restore_drill_ref: existing.restore_drill_ref,
      privacy_reconciliation_outcome_ref: existing.privacy_reconciliation_outcome_ref,
    });
    if (contract.reconciliation_contract_hash === existing.reconciliation_contract_hash) {
      return cloneStored(existing);
    }
    const existingHash = this.historyByHash.get(contract.reconciliation_contract_hash);
    if (existingHash) {
      throw new RestorePrivacyReconciliationRepositoryError(
        "RESTORE_PRIVACY_RECONCILIATION_DUPLICATE",
        `contract hash ${contract.reconciliation_contract_hash} has already been persisted`,
      );
    }
    const next = this.buildStoredRecord({
      contract,
      row_version: existing.restore_privacy_reconciliation_row_version + 1,
      persisted_at: input.persisted_at,
      previous_persisted_at: existing.persisted_at,
    });
    this.currentByOutcomeRef.set(next.privacy_reconciliation_outcome_ref, cloneStored(next));
    this.appendHistory(next);
    this.rebuildIndexes();
    return cloneStored(next);
  }

  async getRestorePrivacyReconciliationByOutcomeRef(outcomeRef: string) {
    const stored = this.currentByOutcomeRef.get(outcomeRef);
    return stored ? cloneStored(stored) : null;
  }

  async requireRestorePrivacyReconciliationByOutcomeRef(outcomeRef: string) {
    const stored = await this.getRestorePrivacyReconciliationByOutcomeRef(outcomeRef);
    if (!stored) {
      throw new RestorePrivacyReconciliationRepositoryError(
        "RESTORE_PRIVACY_RECONCILIATION_NOT_FOUND",
        `privacy outcome ${outcomeRef} does not exist`,
      );
    }
    return stored;
  }

  async getRestorePrivacyReconciliationByHash(hash: string) {
    const stored = this.historyByHash.get(hash);
    return stored ? cloneStored(stored) : null;
  }

  async listRestorePrivacyReconciliationHistory(outcomeRef: string) {
    return (this.historyByOutcomeRef.get(outcomeRef) ?? []).map((record) => cloneStored(record));
  }

  async listRestorePrivacyReconciliationsByCheckpointRef(checkpointRef: string) {
    return this.listByOutcomeRefs(this.outcomeRefsByCheckpointRef.get(checkpointRef) ?? []);
  }

  async listRestorePrivacyReconciliationsByRestoreDrillRef(restoreDrillRef: string) {
    return this.listByOutcomeRefs(this.outcomeRefsByRestoreDrillRef.get(restoreDrillRef) ?? []);
  }

  async listRestorePrivacyReconciliationsByState(state: RestorePrivacyReconciliationState) {
    return this.listByOutcomeRefs(this.outcomeRefsByState.get(state) ?? []);
  }

  async listRestorePrivacyReconciliationsByReopenAccessState(
    reopenAccessState: RestorePrivacyReopenAccessState,
  ) {
    return this.listByOutcomeRefs(this.outcomeRefsByReopenAccessState.get(reopenAccessState) ?? []);
  }
}
