import { stableJsonHash } from "../../../domain-kernel/src/primitives/hash.ts";
import { normalizeUtcInstantString } from "../../../domain-kernel/src/primitives/time.ts";

import {
  activateExceptionalAuthorityGrant,
  assertExceptionalAuthorityIdentityStable,
  consumeExceptionalAuthorityGrantUse,
  deriveExceptionalAuthorityLifecycleState,
  normalizeExceptionalAuthorityGrantRecord,
  revokeExceptionalAuthorityGrant,
  type CreateExceptionalAuthorityGrantInput,
  type ExceptionalAuthorityGrantLifecycleState,
  type ExceptionalAuthorityGrantRecord,
} from "../models/exceptional_authority_grant.ts";
import { ExceptionalAuthorityBudgetService } from "../services/exceptional_authority_budget_service.ts";
import type { TenantRepository } from "./tenant_repository.ts";

export type ExceptionalAuthorityGrantSnapshotRecord = {
  exceptional_grant_id: string;
  lineage_key: string;
  record: ExceptionalAuthorityGrantRecord;
  snapshot_ref: string;
  tenant_id: string;
};

export type ExceptionalAuthorityGrantTransitionRecord = {
  exceptional_grant_id: string;
  from_lifecycle_state: ExceptionalAuthorityGrantLifecycleState | null;
  reason_code: string;
  snapshot_ref: string;
  source_ref: string | null;
  tenant_id: string;
  to_lifecycle_state: ExceptionalAuthorityGrantLifecycleState;
  transition_at: string;
  transition_id: string;
};

export type ExceptionalAuthorityUsageLedgerRecord = {
  exceptional_grant_id: string;
  ledger_entry_id: string;
  remaining_uses_after: number;
  remaining_uses_before: number;
  tenant_id: string;
  used_at: string;
};

type ExceptionalAuthorityGrantRepositoryErrorCode =
  | "EXCEPTIONAL_AUTHORITY_CAS_MISMATCH"
  | "EXCEPTIONAL_AUTHORITY_DUPLICATE"
  | "EXCEPTIONAL_AUTHORITY_ILLEGAL_REVIVAL"
  | "EXCEPTIONAL_AUTHORITY_NOT_FOUND"
  | "EXCEPTIONAL_AUTHORITY_SNAPSHOT_NOT_FOUND"
  | "EXCEPTIONAL_AUTHORITY_UNDERFLOW";

export class ExceptionalAuthorityGrantRepositoryError extends Error {
  readonly code: ExceptionalAuthorityGrantRepositoryErrorCode;

  constructor(code: ExceptionalAuthorityGrantRepositoryErrorCode, detail: string) {
    super(`${code}: ${detail}`);
    this.name = "ExceptionalAuthorityGrantRepositoryError";
    this.code = code;
  }
}

function cloneRecord(record: ExceptionalAuthorityGrantRecord) {
  return structuredClone(record);
}

function cloneSnapshot(snapshot: ExceptionalAuthorityGrantSnapshotRecord) {
  return structuredClone(snapshot);
}

function cloneTransition(transition: ExceptionalAuthorityGrantTransitionRecord) {
  return structuredClone(transition);
}

function cloneUsageLedgerEntry(entry: ExceptionalAuthorityUsageLedgerRecord) {
  return structuredClone(entry);
}

function compositeKey(...parts: string[]) {
  return parts.join("::");
}

export function buildExceptionalAuthorityGrantLineageKey(
  record: ExceptionalAuthorityGrantRecord,
) {
  return stableJsonHash({
    incident_ref: record.incident_ref,
    target_action_family: record.target_action_family,
    tenant_id: record.tenant_id,
    client_id: record.client_id,
    partition_scope_refs: record.partition_scope_refs,
    requesting_principal_ref: record.requesting_principal_ref,
    approving_principal_ref: record.approving_principal_ref,
  });
}

export function buildExceptionalAuthorityGrantSnapshotRef(
  record: ExceptionalAuthorityGrantRecord,
) {
  return `exceptional-authority-snapshot.${stableJsonHash(record)}`;
}

export class ExceptionalAuthorityGrantRepository {
  private readonly current = new Map<string, ExceptionalAuthorityGrantRecord>();
  private readonly snapshots = new Map<string, ExceptionalAuthorityGrantSnapshotRecord>();
  private readonly snapshotsByLineage = new Map<string, string[]>();
  private readonly currentByClientAction = new Map<string, string[]>();
  private readonly currentByIncident = new Map<string, string[]>();
  private readonly transitions = new Map<string, ExceptionalAuthorityGrantTransitionRecord[]>();
  private readonly usageLedger = new Map<string, ExceptionalAuthorityUsageLedgerRecord[]>();
  private readonly budgetService: ExceptionalAuthorityBudgetService;

  constructor(
    private readonly dependencies: {
      budgetService?: ExceptionalAuthorityBudgetService;
      tenantRepository: TenantRepository;
    },
  ) {
    this.budgetService =
      dependencies.budgetService ?? new ExceptionalAuthorityBudgetService();
  }

  private pushIndex(index: Map<string, string[]>, key: string, value: string) {
    const currentValues = index.get(key) ?? [];
    if (!currentValues.includes(value)) {
      currentValues.push(value);
      index.set(key, currentValues);
    }
  }

  private captureSnapshot(record: ExceptionalAuthorityGrantRecord) {
    const snapshot_ref = buildExceptionalAuthorityGrantSnapshotRef(record);
    const snapshot: ExceptionalAuthorityGrantSnapshotRecord = {
      snapshot_ref,
      lineage_key: buildExceptionalAuthorityGrantLineageKey(record),
      exceptional_grant_id: record.exceptional_grant_id,
      tenant_id: record.tenant_id,
      record: cloneRecord(record),
    };
    if (!this.snapshots.has(snapshot_ref)) {
      this.snapshots.set(snapshot_ref, cloneSnapshot(snapshot));
      this.pushIndex(
        this.snapshotsByLineage,
        compositeKey(record.tenant_id, snapshot.lineage_key),
        snapshot_ref,
      );
    }
    return snapshot;
  }

  private recordTransition(
    record: ExceptionalAuthorityGrantRecord,
    input: {
      from_lifecycle_state: ExceptionalAuthorityGrantLifecycleState | null;
      reason_code: string;
      snapshot_ref: string;
      source_ref?: string | null;
      transition_at: string;
      to_lifecycle_state: ExceptionalAuthorityGrantLifecycleState;
    },
  ) {
    const transition: ExceptionalAuthorityGrantTransitionRecord = {
      transition_id: stableJsonHash({
        exceptional_grant_id: record.exceptional_grant_id,
        from_lifecycle_state: input.from_lifecycle_state,
        to_lifecycle_state: input.to_lifecycle_state,
        reason_code: input.reason_code,
        transition_at: input.transition_at,
        snapshot_ref: input.snapshot_ref,
      }),
      exceptional_grant_id: record.exceptional_grant_id,
      tenant_id: record.tenant_id,
      from_lifecycle_state: input.from_lifecycle_state,
      to_lifecycle_state: input.to_lifecycle_state,
      reason_code: input.reason_code,
      source_ref: input.source_ref ?? null,
      transition_at: input.transition_at,
      snapshot_ref: input.snapshot_ref,
    };
    const currentTransitions = this.transitions.get(record.exceptional_grant_id) ?? [];
    currentTransitions.push(transition);
    currentTransitions.sort((left, right) => left.transition_at.localeCompare(right.transition_at));
    this.transitions.set(record.exceptional_grant_id, currentTransitions);
    return transition;
  }

  private recordUsage(entry: ExceptionalAuthorityUsageLedgerRecord) {
    const currentEntries = this.usageLedger.get(entry.exceptional_grant_id) ?? [];
    currentEntries.push(entry);
    currentEntries.sort((left, right) => left.used_at.localeCompare(right.used_at));
    this.usageLedger.set(entry.exceptional_grant_id, currentEntries);
    return cloneUsageLedgerEntry(entry);
  }

  private indexCurrent(record: ExceptionalAuthorityGrantRecord) {
    this.pushIndex(
      this.currentByClientAction,
      compositeKey(record.tenant_id, record.client_id, record.target_action_family),
      record.exceptional_grant_id,
    );
    this.pushIndex(
      this.currentByIncident,
      compositeKey(record.tenant_id, record.incident_ref),
      record.exceptional_grant_id,
    );
  }

  async create(
    input: CreateExceptionalAuthorityGrantInput,
    options?: { reason_code?: string; source_ref?: string | null },
  ) {
    const record = normalizeExceptionalAuthorityGrantRecord(input);
    await this.dependencies.tenantRepository.requireById(record.tenant_id);

    const existing = this.current.get(record.exceptional_grant_id);
    if (existing) {
      if (JSON.stringify(existing) !== JSON.stringify(record)) {
        throw new ExceptionalAuthorityGrantRepositoryError(
          "EXCEPTIONAL_AUTHORITY_DUPLICATE",
          `exceptional authority grant ${record.exceptional_grant_id} already exists with a different payload`,
        );
      }
      const snapshot = this.captureSnapshot(existing);
      return { record: cloneRecord(existing), snapshot_ref: snapshot.snapshot_ref };
    }

    this.current.set(record.exceptional_grant_id, cloneRecord(record));
    this.indexCurrent(record);
    const snapshot = this.captureSnapshot(record);
    this.recordTransition(record, {
      from_lifecycle_state: null,
      to_lifecycle_state: record.lifecycle_state,
      reason_code: options?.reason_code ?? "EXCEPTIONAL_AUTHORITY_CREATED",
      source_ref: options?.source_ref ?? null,
      transition_at: record.activated_at ?? record.expires_at,
      snapshot_ref: snapshot.snapshot_ref,
    });
    return { record: cloneRecord(record), snapshot_ref: snapshot.snapshot_ref };
  }

  async getByExceptionalGrantId(tenantId: string, exceptionalGrantId: string) {
    const record = this.current.get(exceptionalGrantId);
    if (!record || record.tenant_id !== tenantId) {
      return null;
    }
    return cloneRecord(record);
  }

  async requireByExceptionalGrantId(tenantId: string, exceptionalGrantId: string) {
    const record = await this.getByExceptionalGrantId(tenantId, exceptionalGrantId);
    if (!record) {
      throw new ExceptionalAuthorityGrantRepositoryError(
        "EXCEPTIONAL_AUTHORITY_NOT_FOUND",
        `exceptional authority grant ${exceptionalGrantId} does not exist in tenant ${tenantId}`,
      );
    }
    return record;
  }

  async getSnapshotByRef(snapshotRef: string) {
    const snapshot = this.snapshots.get(snapshotRef);
    return snapshot ? cloneSnapshot(snapshot) : null;
  }

  async requireSnapshotByRef(snapshotRef: string) {
    const snapshot = await this.getSnapshotByRef(snapshotRef);
    if (!snapshot) {
      throw new ExceptionalAuthorityGrantRepositoryError(
        "EXCEPTIONAL_AUTHORITY_SNAPSHOT_NOT_FOUND",
        `exceptional authority snapshot ${snapshotRef} does not exist`,
      );
    }
    return snapshot;
  }

  async listSnapshotsByLineageKey(tenantId: string, lineageKey: string) {
    return (this.snapshotsByLineage.get(compositeKey(tenantId, lineageKey)) ?? [])
      .map((snapshotRef) => this.snapshots.get(snapshotRef))
      .filter(
        (snapshot): snapshot is ExceptionalAuthorityGrantSnapshotRecord =>
          snapshot !== undefined,
      )
      .sort((left, right) =>
        (left.record.activated_at ?? left.record.expires_at).localeCompare(
          right.record.activated_at ?? right.record.expires_at,
        ),
      )
      .map((snapshot) => cloneSnapshot(snapshot));
  }

  async listCurrentByIncidentRef(tenantId: string, incidentRef: string) {
    return (this.currentByIncident.get(compositeKey(tenantId, incidentRef)) ?? [])
      .map((exceptionalGrantId) => this.current.get(exceptionalGrantId))
      .filter((record): record is ExceptionalAuthorityGrantRecord => record !== undefined)
      .sort((left, right) => (left.activated_at ?? "").localeCompare(right.activated_at ?? ""))
      .map((record) => cloneRecord(record));
  }

  async listCurrentByClientAction(
    tenantId: string,
    clientId: string,
    actionFamily: string,
  ) {
    return (this.currentByClientAction.get(compositeKey(tenantId, clientId, actionFamily)) ?? [])
      .map((exceptionalGrantId) => this.current.get(exceptionalGrantId))
      .filter((record): record is ExceptionalAuthorityGrantRecord => record !== undefined)
      .sort((left, right) => (left.activated_at ?? "").localeCompare(right.activated_at ?? ""))
      .map((record) => cloneRecord(record));
  }

  async activateGrant(
    tenantId: string,
    exceptionalGrantId: string,
    input: {
      activated_at: string;
      reason_code: string;
      source_ref?: string | null;
    },
  ) {
    const currentRecord = await this.requireByExceptionalGrantId(tenantId, exceptionalGrantId);
    const activatedAt = normalizeUtcInstantString(input.activated_at);
    const currentState = deriveExceptionalAuthorityLifecycleState(
      currentRecord,
      activatedAt,
    );
    if (["REVOKED", "EXPIRED"].includes(currentState)) {
      throw new ExceptionalAuthorityGrantRepositoryError(
        "EXCEPTIONAL_AUTHORITY_ILLEGAL_REVIVAL",
        `exceptional authority grant ${exceptionalGrantId} cannot be revived from ${currentState}`,
      );
    }
    const next = activateExceptionalAuthorityGrant(currentRecord, activatedAt);
    assertExceptionalAuthorityIdentityStable(currentRecord, next);
    this.current.set(exceptionalGrantId, cloneRecord(next));
    const snapshot = this.captureSnapshot(next);
    this.recordTransition(next, {
      from_lifecycle_state: currentRecord.lifecycle_state,
      to_lifecycle_state: next.lifecycle_state,
      reason_code: input.reason_code,
      source_ref: input.source_ref ?? null,
      transition_at: activatedAt,
      snapshot_ref: snapshot.snapshot_ref,
    });
    return { record: cloneRecord(next), snapshot_ref: snapshot.snapshot_ref };
  }

  async consumeUse(
    tenantId: string,
    exceptionalGrantId: string,
    input: {
      expected_remaining_uses?: number;
      reason_code: string;
      source_ref?: string | null;
      used_at: string;
    },
  ) {
    const currentRecord = await this.requireByExceptionalGrantId(tenantId, exceptionalGrantId);
    const usedAt = normalizeUtcInstantString(input.used_at);
    if (
      input.expected_remaining_uses !== undefined &&
      input.expected_remaining_uses !== currentRecord.remaining_uses
    ) {
      throw new ExceptionalAuthorityGrantRepositoryError(
        "EXCEPTIONAL_AUTHORITY_CAS_MISMATCH",
        `exceptional authority grant ${exceptionalGrantId} no longer has expected remaining_uses`,
      );
    }

    const budgetResolution = await this.budgetService.resolve(currentRecord, {
      action_family: currentRecord.target_action_family,
      evaluated_at: usedAt,
    });
    if (!budgetResolution.usable) {
      throw new ExceptionalAuthorityGrantRepositoryError(
        "EXCEPTIONAL_AUTHORITY_UNDERFLOW",
        `exceptional authority grant ${exceptionalGrantId} is not usable for consumption`,
      );
    }

    const next = consumeExceptionalAuthorityGrantUse(currentRecord);
    assertExceptionalAuthorityIdentityStable(currentRecord, next);
    this.current.set(exceptionalGrantId, cloneRecord(next));
    const snapshot = this.captureSnapshot(next);
    this.recordTransition(next, {
      from_lifecycle_state: currentRecord.lifecycle_state,
      to_lifecycle_state: next.lifecycle_state,
      reason_code: input.reason_code,
      source_ref: input.source_ref ?? null,
      transition_at: usedAt,
      snapshot_ref: snapshot.snapshot_ref,
    });
    const usageLedgerEntry = this.recordUsage({
      ledger_entry_id: stableJsonHash({
        exceptional_grant_id: exceptionalGrantId,
        used_at: usedAt,
        remaining_uses_before: currentRecord.remaining_uses,
        remaining_uses_after: next.remaining_uses,
      }),
      exceptional_grant_id: exceptionalGrantId,
      tenant_id: tenantId,
      used_at: usedAt,
      remaining_uses_before: currentRecord.remaining_uses,
      remaining_uses_after: next.remaining_uses,
    });
    return {
      record: cloneRecord(next),
      snapshot_ref: snapshot.snapshot_ref,
      usage_ledger_entry: usageLedgerEntry,
    };
  }

  async revokeGrant(
    tenantId: string,
    exceptionalGrantId: string,
    input: {
      reason_code: string;
      revoked_at: string;
      source_ref?: string | null;
    },
  ) {
    const currentRecord = await this.requireByExceptionalGrantId(tenantId, exceptionalGrantId);
    const revokedAt = normalizeUtcInstantString(input.revoked_at);
    const next = revokeExceptionalAuthorityGrant(currentRecord, revokedAt);
    assertExceptionalAuthorityIdentityStable(currentRecord, next);
    this.current.set(exceptionalGrantId, cloneRecord(next));
    const snapshot = this.captureSnapshot(next);
    this.recordTransition(next, {
      from_lifecycle_state: currentRecord.lifecycle_state,
      to_lifecycle_state: next.lifecycle_state,
      reason_code: input.reason_code,
      source_ref: input.source_ref ?? null,
      transition_at: revokedAt,
      snapshot_ref: snapshot.snapshot_ref,
    });
    return { record: cloneRecord(next), snapshot_ref: snapshot.snapshot_ref };
  }

  async listUsageLedger(tenantId: string, exceptionalGrantId: string) {
    const currentRecord = await this.getByExceptionalGrantId(tenantId, exceptionalGrantId);
    if (!currentRecord) {
      return [];
    }
    return (this.usageLedger.get(exceptionalGrantId) ?? []).map((entry) =>
      cloneUsageLedgerEntry(entry),
    );
  }

  async findBestCurrentGrant(input: {
    action_family: string;
    client_id: string;
    partition_scope_refs?: string[];
    tenant_id: string;
  }) {
    return (this.currentByClientAction.get(
      compositeKey(input.tenant_id, input.client_id, input.action_family),
    ) ?? [])
      .map((exceptionalGrantId) => this.current.get(exceptionalGrantId))
      .filter((record): record is ExceptionalAuthorityGrantRecord => record !== undefined)
      .filter((record) => {
        if ((input.partition_scope_refs ?? []).length === 0 || record.partition_scope_refs.length === 0) {
          return true;
        }
        return (input.partition_scope_refs ?? []).every((partitionRef) =>
          record.partition_scope_refs.includes(partitionRef),
        );
      })
      .sort((left, right) => (right.activated_at ?? "").localeCompare(left.activated_at ?? ""))
      .map((record) => ({
        record,
        snapshot_ref: buildExceptionalAuthorityGrantSnapshotRef(record),
      }))
      .at(0) ?? null;
  }
}
