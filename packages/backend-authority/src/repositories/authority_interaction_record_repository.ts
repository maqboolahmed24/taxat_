import { AuthorityModelError, cloneRecord, stableEqual } from "../models/authority_common.ts";
import {
  type AuthorityInteractionRecord,
  authorityInteractionRecordContentFingerprint,
  authorityInteractionRecordRef,
  cloneAuthorityInteractionRecord,
  normalizeAuthorityInteractionRecord,
} from "../models/authority_interaction_record.ts";
import { isAuthorityInteractionTransitionAllowed } from "../services/validate_authority_interaction_transition.ts";

export type StoredAuthorityInteractionRecord = {
  content_fingerprint: string;
  duplicate_meaning_key: string;
  interaction_id: string;
  interaction_ref: string;
  lifecycle_state: AuthorityInteractionRecord["lifecycle_state"];
  manifest_id: string;
  next_reconciliation_at: string | null;
  reconciliation_budget_state: AuthorityInteractionRecord["reconciliation_budget_state"];
  record: AuthorityInteractionRecord;
  request_hash: string;
  row_version: number;
};

function cloneStored(record: StoredAuthorityInteractionRecord) {
  return cloneRecord(record);
}

function pushIndex(index: Map<string, string[]>, key: string, value: string) {
  const current = index.get(key) ?? [];
  if (!current.includes(value)) {
    current.push(value);
    current.sort();
    index.set(key, current);
  }
}

function sortStored(left: StoredAuthorityInteractionRecord, right: StoredAuthorityInteractionRecord) {
  return (
    left.manifest_id.localeCompare(right.manifest_id) ||
    left.record.created_at.localeCompare(right.record.created_at) ||
    left.interaction_id.localeCompare(right.interaction_id)
  );
}

function assertAppendOnlyHistory(input: {
  current: AuthorityInteractionRecord;
  next: AuthorityInteractionRecord;
}) {
  const currentHistory = input.current.response_history_ids;
  const nextHistory = input.next.response_history_ids;
  if (nextHistory.length < currentHistory.length) {
    throw new AuthorityModelError(
      "AUTHORITY_REPOSITORY_INVALID",
      "AuthorityInteractionRecord response_history_ids cannot shrink",
    );
  }
  for (let index = 0; index < currentHistory.length; index += 1) {
    if (currentHistory[index] !== nextHistory[index]) {
      throw new AuthorityModelError(
        "AUTHORITY_REPOSITORY_INVALID",
        "AuthorityInteractionRecord response_history_ids are append-only and ordered",
      );
    }
  }
}

function assertImmutableRequestIdentity(input: {
  current: AuthorityInteractionRecord;
  next: AuthorityInteractionRecord;
}) {
  for (const field of [
    "access_binding_hash",
    "authority_binding_ref",
    "authority_link_ref",
    "binding_lineage_ref",
    "created_at",
    "dispatch_ref",
    "duplicate_meaning_key",
    "idempotency_key",
    "identity_namespace_hash",
    "interaction_id",
    "manifest_id",
    "operation_id",
    "policy_snapshot_hash",
    "request_hash",
    "request_id",
  ] as const) {
    if (input.current[field] !== input.next[field]) {
      throw new AuthorityModelError(
        "AUTHORITY_REPOSITORY_INVALID",
        `AuthorityInteractionRecord ${field} is immutable after registration`,
      );
    }
  }
  if (!stableEqual(input.current.request_identity_contract, input.next.request_identity_contract)) {
    throw new AuthorityModelError(
      "AUTHORITY_REPOSITORY_INVALID",
      "AuthorityInteractionRecord request_identity_contract is immutable after registration",
    );
  }
}

export class AuthorityInteractionRecordRepository {
  private readonly idByRef = new Map<string, string>();
  private readonly idsByBudget = new Map<string, string[]>();
  private readonly idsByDuplicateMeaning = new Map<string, string[]>();
  private readonly idsByLifecycle = new Map<string, string[]>();
  private readonly idsByManifest = new Map<string, string[]>();
  private readonly idsByNextReconciliation = new Map<string, string[]>();
  private readonly idsByRequestHash = new Map<string, string[]>();
  private readonly records = new Map<string, StoredAuthorityInteractionRecord>();

  private rebuildIndexes() {
    this.idByRef.clear();
    this.idsByBudget.clear();
    this.idsByDuplicateMeaning.clear();
    this.idsByLifecycle.clear();
    this.idsByManifest.clear();
    this.idsByNextReconciliation.clear();
    this.idsByRequestHash.clear();
    for (const stored of this.records.values()) {
      this.idByRef.set(stored.interaction_ref, stored.interaction_id);
      pushIndex(this.idsByBudget, stored.reconciliation_budget_state, stored.interaction_id);
      pushIndex(this.idsByDuplicateMeaning, stored.duplicate_meaning_key, stored.interaction_id);
      pushIndex(this.idsByLifecycle, stored.lifecycle_state, stored.interaction_id);
      pushIndex(this.idsByManifest, stored.manifest_id, stored.interaction_id);
      pushIndex(this.idsByRequestHash, stored.request_hash, stored.interaction_id);
      if (stored.next_reconciliation_at !== null) {
        pushIndex(this.idsByNextReconciliation, stored.next_reconciliation_at, stored.interaction_id);
      }
    }
  }

  private listByIds(ids: readonly string[]) {
    return ids
      .map((id) => this.records.get(id))
      .filter((record): record is StoredAuthorityInteractionRecord => record !== undefined)
      .sort(sortStored)
      .map(cloneStored);
  }

  async persistAuthorityInteractionRecord(input: { interaction: AuthorityInteractionRecord }) {
    const interaction = normalizeAuthorityInteractionRecord(input.interaction);
    const existing = this.records.get(interaction.interaction_id);
    const interactionRef = authorityInteractionRecordRef(interaction);
    const refOwner = this.idByRef.get(interactionRef);
    if (refOwner !== undefined && refOwner !== interaction.interaction_id) {
      throw new AuthorityModelError(
        "AUTHORITY_REPOSITORY_INVALID",
        `authority interaction ref ${interactionRef} already belongs to ${refOwner}`,
      );
    }
    if (existing !== undefined) {
      if (stableEqual(existing.record, interaction)) {
        return cloneStored(existing);
      }
      assertImmutableRequestIdentity({
        current: existing.record,
        next: interaction,
      });
      assertAppendOnlyHistory({
        current: existing.record,
        next: interaction,
      });
      if (
        !isAuthorityInteractionTransitionAllowed({
          current_state: existing.record.lifecycle_state,
          next_state: interaction.lifecycle_state,
        })
      ) {
        throw new AuthorityModelError(
          "AUTHORITY_REPOSITORY_INVALID",
          `AuthorityInteractionRecord cannot mutate lifecycle ${existing.record.lifecycle_state} -> ${interaction.lifecycle_state}`,
        );
      }
    }

    const stored: StoredAuthorityInteractionRecord = {
      content_fingerprint: authorityInteractionRecordContentFingerprint(interaction),
      duplicate_meaning_key: interaction.duplicate_meaning_key,
      interaction_id: interaction.interaction_id,
      interaction_ref: interactionRef,
      lifecycle_state: interaction.lifecycle_state,
      manifest_id: interaction.manifest_id,
      next_reconciliation_at: interaction.next_reconciliation_at,
      reconciliation_budget_state: interaction.reconciliation_budget_state,
      record: cloneAuthorityInteractionRecord(interaction),
      request_hash: interaction.request_hash,
      row_version: (existing?.row_version ?? 0) + 1,
    };
    this.records.set(stored.interaction_id, cloneStored(stored));
    this.rebuildIndexes();
    return cloneStored(stored);
  }

  async getAuthorityInteractionRecordById(interactionId: string) {
    const stored = this.records.get(interactionId);
    return stored ? cloneStored(stored) : null;
  }

  async getAuthorityInteractionRecordByRef(interactionRef: string) {
    const id = this.idByRef.get(interactionRef);
    const stored = id === undefined ? undefined : this.records.get(id);
    return stored ? cloneStored(stored) : null;
  }

  async listAuthorityInteractionRecordsByRequestHash(requestHash: string) {
    return this.listByIds(this.idsByRequestHash.get(requestHash) ?? []);
  }

  async listAuthorityInteractionRecordsByDuplicateMeaningKey(duplicateMeaningKey: string) {
    return this.listByIds(this.idsByDuplicateMeaning.get(duplicateMeaningKey) ?? []);
  }

  async listAuthorityInteractionRecordsByManifestId(manifestId: string) {
    return this.listByIds(this.idsByManifest.get(manifestId) ?? []);
  }

  async listAuthorityInteractionRecordsByLifecycleState(
    lifecycleState: AuthorityInteractionRecord["lifecycle_state"],
  ) {
    return this.listByIds(this.idsByLifecycle.get(lifecycleState) ?? []);
  }

  async listAuthorityInteractionRecordsByBudgetState(
    budgetState: AuthorityInteractionRecord["reconciliation_budget_state"],
  ) {
    return this.listByIds(this.idsByBudget.get(budgetState) ?? []);
  }

  async listAuthorityInteractionRecordsDueForReconciliation(asOf: string) {
    return [...this.records.values()]
      .filter(
        (stored) =>
          stored.next_reconciliation_at !== null &&
          stored.next_reconciliation_at <= asOf &&
          stored.reconciliation_budget_state === "ACTIVE",
      )
      .sort(sortStored)
      .map(cloneStored);
  }
}
