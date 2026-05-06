import { stableJsonHash } from "../../../domain-kernel/src/primitives/hash.ts";
import { normalizeUtcInstantString } from "../../../domain-kernel/src/primitives/time.ts";

import {
  assertDelegationGrantIdentityStable,
  deriveDelegationGrantLifecycleState,
  normalizeDelegationGrantRecord,
  type CreateDelegationGrantInput,
  type DelegationGrantLifecycleState,
  type DelegationGrantRecord,
} from "../models/delegation_grant.ts";
import type { TenantRepository } from "./tenant_repository.ts";

export type DelegationGrantSnapshotRecord = {
  delegation_grant_id: string;
  lineage_key: string;
  record: DelegationGrantRecord;
  snapshot_ref: string;
  tenant_id: string;
};

export type DelegationGrantTransitionRecord = {
  from_lifecycle_state: DelegationGrantLifecycleState | null;
  reason_code: string;
  snapshot_ref: string;
  source_ref: string | null;
  tenant_id: string;
  to_lifecycle_state: DelegationGrantLifecycleState;
  transition_at: string;
  transition_id: string;
  delegation_grant_id: string;
};

type DelegationGrantRepositoryErrorCode =
  | "DELEGATION_GRANT_DUPLICATE"
  | "DELEGATION_GRANT_ILLEGAL_REVIVAL"
  | "DELEGATION_GRANT_NOT_FOUND"
  | "DELEGATION_GRANT_SNAPSHOT_NOT_FOUND";

export class DelegationGrantRepositoryError extends Error {
  readonly code: DelegationGrantRepositoryErrorCode;

  constructor(code: DelegationGrantRepositoryErrorCode, detail: string) {
    super(`${code}: ${detail}`);
    this.name = "DelegationGrantRepositoryError";
    this.code = code;
  }
}

function cloneRecord(record: DelegationGrantRecord) {
  return structuredClone(record);
}

function cloneSnapshot(snapshot: DelegationGrantSnapshotRecord) {
  return structuredClone(snapshot);
}

function cloneTransition(transition: DelegationGrantTransitionRecord) {
  return structuredClone(transition);
}

function compositeKey(...parts: string[]) {
  return parts.join("::");
}

export function buildDelegationGrantLineageKey(record: DelegationGrantRecord) {
  return stableJsonHash({
    tenant_id: record.tenant_id,
    reporting_subject_ref: record.reporting_subject_ref,
    delegate_ref: record.delegate_ref,
    delegate_class: record.delegate_class,
    authority_scope_refs: record.authority_scope_refs,
    partition_scope_refs: record.partition_scope_refs,
    basis_type: record.basis_type,
    basis_evidence_refs: record.basis_evidence_refs,
    effective_from: record.effective_from,
  });
}

export function buildDelegationGrantSnapshotRef(record: DelegationGrantRecord) {
  return `delegation-grant-snapshot.${stableJsonHash(record)}`;
}

export class DelegationGrantRepository {
  private readonly current = new Map<string, DelegationGrantRecord>();
  private readonly snapshots = new Map<string, DelegationGrantSnapshotRecord>();
  private readonly snapshotsByLineage = new Map<string, string[]>();
  private readonly currentByReportingSubject = new Map<string, string[]>();
  private readonly currentByDelegate = new Map<string, string[]>();
  private readonly currentByLineage = new Map<string, string[]>();
  private readonly transitions = new Map<string, DelegationGrantTransitionRecord[]>();

  constructor(private readonly dependencies: { tenantRepository: TenantRepository }) {}

  private pushIndex(index: Map<string, string[]>, key: string, value: string) {
    const currentValues = index.get(key) ?? [];
    if (!currentValues.includes(value)) {
      currentValues.push(value);
      index.set(key, currentValues);
    }
  }

  private captureSnapshot(record: DelegationGrantRecord) {
    const snapshot_ref = buildDelegationGrantSnapshotRef(record);
    const lineage_key = buildDelegationGrantLineageKey(record);
    const snapshot: DelegationGrantSnapshotRecord = {
      snapshot_ref,
      lineage_key,
      delegation_grant_id: record.delegation_grant_id,
      tenant_id: record.tenant_id,
      record: cloneRecord(record),
    };
    if (!this.snapshots.has(snapshot_ref)) {
      this.snapshots.set(snapshot_ref, cloneSnapshot(snapshot));
      this.pushIndex(
        this.snapshotsByLineage,
        compositeKey(record.tenant_id, lineage_key),
        snapshot_ref,
      );
    }
    return snapshot;
  }

  private recordTransition(
    record: DelegationGrantRecord,
    input: {
      from_lifecycle_state: DelegationGrantLifecycleState | null;
      reason_code: string;
      snapshot_ref: string;
      source_ref?: string | null;
      transition_at: string;
      to_lifecycle_state: DelegationGrantLifecycleState;
    },
  ) {
    const transition: DelegationGrantTransitionRecord = {
      transition_id: stableJsonHash({
        delegation_grant_id: record.delegation_grant_id,
        from_lifecycle_state: input.from_lifecycle_state,
        to_lifecycle_state: input.to_lifecycle_state,
        reason_code: input.reason_code,
        transition_at: input.transition_at,
        snapshot_ref: input.snapshot_ref,
      }),
      delegation_grant_id: record.delegation_grant_id,
      tenant_id: record.tenant_id,
      from_lifecycle_state: input.from_lifecycle_state,
      to_lifecycle_state: input.to_lifecycle_state,
      reason_code: input.reason_code,
      source_ref: input.source_ref ?? null,
      transition_at: input.transition_at,
      snapshot_ref: input.snapshot_ref,
    };
    const currentTransitions = this.transitions.get(record.delegation_grant_id) ?? [];
    currentTransitions.push(transition);
    currentTransitions.sort((left, right) => left.transition_at.localeCompare(right.transition_at));
    this.transitions.set(record.delegation_grant_id, currentTransitions);
    return transition;
  }

  private indexCurrent(record: DelegationGrantRecord) {
    this.pushIndex(
      this.currentByReportingSubject,
      compositeKey(record.tenant_id, record.reporting_subject_ref),
      record.delegation_grant_id,
    );
    this.pushIndex(
      this.currentByDelegate,
      compositeKey(record.tenant_id, record.delegate_ref ?? record.delegate_class ?? "UNBOUND"),
      record.delegation_grant_id,
    );
    this.pushIndex(
      this.currentByLineage,
      compositeKey(record.tenant_id, buildDelegationGrantLineageKey(record)),
      record.delegation_grant_id,
    );
  }

  async create(
    input: CreateDelegationGrantInput,
    options?: { reason_code?: string; source_ref?: string | null },
  ) {
    const record = normalizeDelegationGrantRecord(input);
    await this.dependencies.tenantRepository.requireById(record.tenant_id);

    const existing = this.current.get(record.delegation_grant_id);
    if (existing) {
      if (JSON.stringify(existing) !== JSON.stringify(record)) {
        throw new DelegationGrantRepositoryError(
          "DELEGATION_GRANT_DUPLICATE",
          `delegation grant ${record.delegation_grant_id} already exists with a different payload`,
        );
      }
      const snapshot = this.captureSnapshot(existing);
      return { record: cloneRecord(existing), snapshot_ref: snapshot.snapshot_ref };
    }

    this.current.set(record.delegation_grant_id, cloneRecord(record));
    this.indexCurrent(record);
    const snapshot = this.captureSnapshot(record);
    this.recordTransition(record, {
      from_lifecycle_state: null,
      to_lifecycle_state: record.lifecycle_state,
      reason_code: options?.reason_code ?? "DELEGATION_GRANT_CREATED",
      source_ref: options?.source_ref ?? null,
      transition_at: record.effective_from,
      snapshot_ref: snapshot.snapshot_ref,
    });
    return { record: cloneRecord(record), snapshot_ref: snapshot.snapshot_ref };
  }

  async getByDelegationGrantId(tenantId: string, delegationGrantId: string) {
    const record = this.current.get(delegationGrantId);
    if (!record || record.tenant_id !== tenantId) {
      return null;
    }
    return cloneRecord(record);
  }

  async requireByDelegationGrantId(tenantId: string, delegationGrantId: string) {
    const record = await this.getByDelegationGrantId(tenantId, delegationGrantId);
    if (!record) {
      throw new DelegationGrantRepositoryError(
        "DELEGATION_GRANT_NOT_FOUND",
        `delegation grant ${delegationGrantId} does not exist in tenant ${tenantId}`,
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
      throw new DelegationGrantRepositoryError(
        "DELEGATION_GRANT_SNAPSHOT_NOT_FOUND",
        `delegation grant snapshot ${snapshotRef} does not exist`,
      );
    }
    return snapshot;
  }

  async listSnapshotsByLineageKey(tenantId: string, lineageKey: string) {
    return (this.snapshotsByLineage.get(compositeKey(tenantId, lineageKey)) ?? [])
      .map((snapshotRef) => this.snapshots.get(snapshotRef))
      .filter((snapshot): snapshot is DelegationGrantSnapshotRecord => snapshot !== undefined)
      .sort((left, right) =>
        left.record.effective_from.localeCompare(right.record.effective_from),
      )
      .map((snapshot) => cloneSnapshot(snapshot));
  }

  async listCurrentByReportingSubjectRef(tenantId: string, reportingSubjectRef: string) {
    return (this.currentByReportingSubject.get(compositeKey(tenantId, reportingSubjectRef)) ?? [])
      .map((delegationGrantId) => this.current.get(delegationGrantId))
      .filter((record): record is DelegationGrantRecord => record !== undefined)
      .sort((left, right) => left.effective_from.localeCompare(right.effective_from))
      .map((record) => cloneRecord(record));
  }

  async listCurrentByDelegateRef(tenantId: string, delegateRefOrClass: string) {
    return (this.currentByDelegate.get(compositeKey(tenantId, delegateRefOrClass)) ?? [])
      .map((delegationGrantId) => this.current.get(delegationGrantId))
      .filter((record): record is DelegationGrantRecord => record !== undefined)
      .sort((left, right) => left.effective_from.localeCompare(right.effective_from))
      .map((record) => cloneRecord(record));
  }

  async listCurrentByLineageKey(tenantId: string, lineageKey: string) {
    return (this.currentByLineage.get(compositeKey(tenantId, lineageKey)) ?? [])
      .map((delegationGrantId) => this.current.get(delegationGrantId))
      .filter((record): record is DelegationGrantRecord => record !== undefined)
      .sort((left, right) => left.effective_from.localeCompare(right.effective_from))
      .map((record) => cloneRecord(record));
  }

  async listTransitions(tenantId: string, delegationGrantId: string) {
    const currentRecord = await this.getByDelegationGrantId(tenantId, delegationGrantId);
    if (!currentRecord) {
      return [];
    }
    return (this.transitions.get(delegationGrantId) ?? []).map((transition) =>
      cloneTransition(transition),
    );
  }

  async revalidateGrant(
    tenantId: string,
    delegationGrantId: string,
    input: {
      imported_evidence_fresh_until?: string | null;
      last_validated_at: string;
      limitation_reason_codes?: string[];
      reason_code: string;
      source_ref?: string | null;
    },
  ) {
    const currentRecord = await this.requireByDelegationGrantId(tenantId, delegationGrantId);
    const normalizedValidatedAt = normalizeUtcInstantString(input.last_validated_at);
    const currentState = deriveDelegationGrantLifecycleState(
      currentRecord,
      normalizedValidatedAt,
    );
    if (["REVOKED", "EXPIRED", "SUPERSEDED"].includes(currentState)) {
      throw new DelegationGrantRepositoryError(
        "DELEGATION_GRANT_ILLEGAL_REVIVAL",
        `delegation grant ${delegationGrantId} cannot be revived from ${currentState}`,
      );
    }

    const next = normalizeDelegationGrantRecord({
      ...currentRecord,
      last_validated_at: normalizedValidatedAt,
      imported_evidence_fresh_until:
        input.imported_evidence_fresh_until ?? currentRecord.imported_evidence_fresh_until,
      limitation_reason_codes: input.limitation_reason_codes ?? [],
      lifecycle_state:
        (input.limitation_reason_codes ?? []).length > 0 ? "LIMITED_SCOPE" : "ACTIVE",
    });
    assertDelegationGrantIdentityStable(currentRecord, next);
    this.current.set(delegationGrantId, cloneRecord(next));
    const snapshot = this.captureSnapshot(next);
    this.recordTransition(next, {
      from_lifecycle_state: currentRecord.lifecycle_state,
      to_lifecycle_state: next.lifecycle_state,
      reason_code: input.reason_code,
      source_ref: input.source_ref ?? null,
      transition_at: normalizedValidatedAt,
      snapshot_ref: snapshot.snapshot_ref,
    });
    return { record: cloneRecord(next), snapshot_ref: snapshot.snapshot_ref };
  }

  async revokeGrant(
    tenantId: string,
    delegationGrantId: string,
    input: {
      reason_code: string;
      revoked_at: string;
      source_ref?: string | null;
    },
  ) {
    const currentRecord = await this.requireByDelegationGrantId(tenantId, delegationGrantId);
    const revokedAt = normalizeUtcInstantString(input.revoked_at);
    const next = normalizeDelegationGrantRecord({
      ...currentRecord,
      revoked_at: revokedAt,
      lifecycle_state: "REVOKED",
    });
    assertDelegationGrantIdentityStable(currentRecord, next);
    this.current.set(delegationGrantId, cloneRecord(next));
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

  async supersedeGrant(
    tenantId: string,
    delegationGrantId: string,
    successor: CreateDelegationGrantInput,
    options?: { reason_code?: string; source_ref?: string | null },
  ) {
    const currentRecord = await this.requireByDelegationGrantId(tenantId, delegationGrantId);
    const successorRecord = normalizeDelegationGrantRecord(successor);
    const next = normalizeDelegationGrantRecord({
      ...currentRecord,
      superseded_by_grant_id: successorRecord.delegation_grant_id,
      lifecycle_state: "SUPERSEDED",
    });
    assertDelegationGrantIdentityStable(currentRecord, next);
    this.current.set(delegationGrantId, cloneRecord(next));
    const snapshot = this.captureSnapshot(next);
    this.recordTransition(next, {
      from_lifecycle_state: currentRecord.lifecycle_state,
      to_lifecycle_state: next.lifecycle_state,
      reason_code: options?.reason_code ?? "DELEGATION_GRANT_SUPERSEDED",
      source_ref: options?.source_ref ?? null,
      transition_at: successorRecord.effective_from,
      snapshot_ref: snapshot.snapshot_ref,
    });
    const createdSuccessor = await this.create(successorRecord, {
      reason_code: options?.reason_code ?? "DELEGATION_GRANT_SUCCESSOR_CREATED",
      source_ref: options?.source_ref ?? null,
    });
    return {
      predecessor: { record: cloneRecord(next), snapshot_ref: snapshot.snapshot_ref },
      successor: createdSuccessor,
    };
  }

  async findBestCurrentGrant(input: {
    authority_scope_ref: string;
    delegate_ref?: string | null;
    partition_scope_refs?: string[];
    reporting_subject_ref: string;
    tenant_id: string;
  }) {
    const candidates = await this.listCurrentByReportingSubjectRef(
      input.tenant_id,
      input.reporting_subject_ref,
    );
    return candidates
      .filter((record) => {
        if (input.delegate_ref && record.delegate_ref !== input.delegate_ref) {
          return false;
        }
        if (!record.authority_scope_refs.includes(input.authority_scope_ref)) {
          return false;
        }
        if ((input.partition_scope_refs ?? []).length === 0 || record.partition_scope_refs.length === 0) {
          return true;
        }
        return (input.partition_scope_refs ?? []).every((partitionRef) =>
          record.partition_scope_refs.includes(partitionRef),
        );
      })
      .sort((left, right) => right.effective_from.localeCompare(left.effective_from))
      .map((record) => ({
        record,
        snapshot_ref: buildDelegationGrantSnapshotRef(record),
      }))
      .at(0) ?? null;
  }
}
