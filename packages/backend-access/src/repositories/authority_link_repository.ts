import { stableJsonHash } from "../../../domain-kernel/src/primitives/hash.ts";
import { normalizeUtcInstantString } from "../../../domain-kernel/src/primitives/time.ts";

import {
  assertAuthorityLinkIdentityStable,
  deriveAuthorityLinkLifecycleState,
  normalizeAuthorityLinkRecord,
  type AuthorityLinkLifecycleState,
  type AuthorityLinkRecord,
  type CreateAuthorityLinkInput,
} from "../models/authority_link.ts";
import { AuthorityLinkBindingHealthService } from "../services/authority_link_binding_health_service.ts";
import type { DelegationGrantRepository } from "./delegation_grant_repository.ts";
import type { TenantRepository } from "./tenant_repository.ts";

export type AuthorityLinkSnapshotRecord = {
  authority_link_id: string;
  lineage_key: string;
  record: AuthorityLinkRecord;
  snapshot_ref: string;
  tenant_id: string;
};

export type AuthorityLinkTransitionRecord = {
  authority_link_id: string;
  from_lifecycle_state: AuthorityLinkLifecycleState | null;
  reason_code: string;
  snapshot_ref: string;
  source_ref: string | null;
  tenant_id: string;
  to_lifecycle_state: AuthorityLinkLifecycleState;
  transition_at: string;
  transition_id: string;
};

type AuthorityLinkRepositoryErrorCode =
  | "AUTHORITY_LINK_DELEGATION_GRANT_NOT_FOUND"
  | "AUTHORITY_LINK_DUPLICATE"
  | "AUTHORITY_LINK_ILLEGAL_REVIVAL"
  | "AUTHORITY_LINK_NOT_FOUND"
  | "AUTHORITY_LINK_SNAPSHOT_NOT_FOUND";

export class AuthorityLinkRepositoryError extends Error {
  readonly code: AuthorityLinkRepositoryErrorCode;

  constructor(code: AuthorityLinkRepositoryErrorCode, detail: string) {
    super(`${code}: ${detail}`);
    this.name = "AuthorityLinkRepositoryError";
    this.code = code;
  }
}

function cloneRecord(record: AuthorityLinkRecord) {
  return structuredClone(record);
}

function cloneSnapshot(snapshot: AuthorityLinkSnapshotRecord) {
  return structuredClone(snapshot);
}

function cloneTransition(transition: AuthorityLinkTransitionRecord) {
  return structuredClone(transition);
}

function compositeKey(...parts: string[]) {
  return parts.join("::");
}

export function buildAuthorityLinkLineageKey(record: AuthorityLinkRecord) {
  return stableJsonHash({
    tenant_id: record.tenant_id,
    client_id: record.client_id,
    reporting_subject_ref: record.reporting_subject_ref,
    authority_name: record.authority_name,
    authority_scope: record.authority_scope,
    provider_environment: record.provider_environment,
    provider_api_version: record.provider_api_version,
    authorised_party_ref: record.authorised_party_ref,
    delegation_grant_ref: record.delegation_grant_ref,
    partition_scope_refs: record.partition_scope_refs,
  });
}

export function buildAuthorityLinkSnapshotRef(record: AuthorityLinkRecord) {
  return `authority-link-snapshot.${stableJsonHash(record)}`;
}

export class AuthorityLinkRepository {
  private readonly current = new Map<string, AuthorityLinkRecord>();
  private readonly snapshots = new Map<string, AuthorityLinkSnapshotRecord>();
  private readonly snapshotsByLineage = new Map<string, string[]>();
  private readonly currentByClient = new Map<string, string[]>();
  private readonly currentByReportingSubject = new Map<string, string[]>();
  private readonly currentByAuthorisedParty = new Map<string, string[]>();
  private readonly currentByDelegationGrant = new Map<string, string[]>();
  private readonly currentByTokenBindingProfile = new Map<string, string[]>();
  private readonly transitions = new Map<string, AuthorityLinkTransitionRecord[]>();
  private readonly bindingHealthService: AuthorityLinkBindingHealthService;

  constructor(
    private readonly dependencies: {
      delegationGrantRepository: DelegationGrantRepository;
      tenantRepository: TenantRepository;
      bindingHealthService?: AuthorityLinkBindingHealthService;
    },
  ) {
    this.bindingHealthService =
      dependencies.bindingHealthService ?? new AuthorityLinkBindingHealthService();
  }

  private pushIndex(index: Map<string, string[]>, key: string, value: string) {
    const currentValues = index.get(key) ?? [];
    if (!currentValues.includes(value)) {
      currentValues.push(value);
      index.set(key, currentValues);
    }
  }

  private captureSnapshot(record: AuthorityLinkRecord) {
    const snapshot_ref = buildAuthorityLinkSnapshotRef(record);
    const lineage_key = buildAuthorityLinkLineageKey(record);
    const snapshot: AuthorityLinkSnapshotRecord = {
      snapshot_ref,
      lineage_key,
      authority_link_id: record.authority_link_id,
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
    record: AuthorityLinkRecord,
    input: {
      from_lifecycle_state: AuthorityLinkLifecycleState | null;
      reason_code: string;
      snapshot_ref: string;
      source_ref?: string | null;
      transition_at: string;
      to_lifecycle_state: AuthorityLinkLifecycleState;
    },
  ) {
    const transition: AuthorityLinkTransitionRecord = {
      transition_id: stableJsonHash({
        authority_link_id: record.authority_link_id,
        from_lifecycle_state: input.from_lifecycle_state,
        to_lifecycle_state: input.to_lifecycle_state,
        reason_code: input.reason_code,
        transition_at: input.transition_at,
        snapshot_ref: input.snapshot_ref,
      }),
      authority_link_id: record.authority_link_id,
      tenant_id: record.tenant_id,
      from_lifecycle_state: input.from_lifecycle_state,
      to_lifecycle_state: input.to_lifecycle_state,
      reason_code: input.reason_code,
      source_ref: input.source_ref ?? null,
      transition_at: input.transition_at,
      snapshot_ref: input.snapshot_ref,
    };
    const currentTransitions = this.transitions.get(record.authority_link_id) ?? [];
    currentTransitions.push(transition);
    currentTransitions.sort((left, right) => left.transition_at.localeCompare(right.transition_at));
    this.transitions.set(record.authority_link_id, currentTransitions);
    return transition;
  }

  private indexCurrent(record: AuthorityLinkRecord) {
    this.pushIndex(
      this.currentByClient,
      compositeKey(record.tenant_id, record.client_id),
      record.authority_link_id,
    );
    this.pushIndex(
      this.currentByReportingSubject,
      compositeKey(record.tenant_id, record.reporting_subject_ref),
      record.authority_link_id,
    );
    this.pushIndex(
      this.currentByAuthorisedParty,
      compositeKey(record.tenant_id, record.authorised_party_ref),
      record.authority_link_id,
    );
    if (record.delegation_grant_ref !== null) {
      this.pushIndex(
        this.currentByDelegationGrant,
        compositeKey(record.tenant_id, record.delegation_grant_ref),
        record.authority_link_id,
      );
    }
    if (record.token_binding_profile_ref !== null) {
      this.pushIndex(
        this.currentByTokenBindingProfile,
        compositeKey(record.tenant_id, record.token_binding_profile_ref),
        record.authority_link_id,
      );
    }
  }

  async create(
    input: CreateAuthorityLinkInput,
    options?: {
      reason_code?: string;
      source_ref?: string | null;
      transition_at?: string;
    },
  ) {
    const record = normalizeAuthorityLinkRecord(input);
    await this.dependencies.tenantRepository.requireById(record.tenant_id);
    if (record.delegation_grant_ref !== null) {
      const delegationGrant =
        await this.dependencies.delegationGrantRepository.getByDelegationGrantId(
          record.tenant_id,
          record.delegation_grant_ref,
        );
      if (!delegationGrant) {
        throw new AuthorityLinkRepositoryError(
          "AUTHORITY_LINK_DELEGATION_GRANT_NOT_FOUND",
          `delegation grant ${record.delegation_grant_ref} does not exist for authority link ${record.authority_link_id}`,
        );
      }
    }

    const existing = this.current.get(record.authority_link_id);
    if (existing) {
      if (JSON.stringify(existing) !== JSON.stringify(record)) {
        throw new AuthorityLinkRepositoryError(
          "AUTHORITY_LINK_DUPLICATE",
          `authority link ${record.authority_link_id} already exists with a different payload`,
        );
      }
      const snapshot = this.captureSnapshot(existing);
      return { record: cloneRecord(existing), snapshot_ref: snapshot.snapshot_ref };
    }

    this.current.set(record.authority_link_id, cloneRecord(record));
    this.indexCurrent(record);
    const snapshot = this.captureSnapshot(record);
    this.recordTransition(record, {
      from_lifecycle_state: null,
      to_lifecycle_state: record.lifecycle_state,
      reason_code: options?.reason_code ?? "AUTHORITY_LINK_CREATED",
      source_ref: options?.source_ref ?? null,
      transition_at:
        options?.transition_at ??
        record.validated_at ??
        record.last_binding_check_at ??
        record.expires_at ??
        record.revoked_at ??
        "1970-01-01T00:00:00Z",
      snapshot_ref: snapshot.snapshot_ref,
    });
    return { record: cloneRecord(record), snapshot_ref: snapshot.snapshot_ref };
  }

  async getByAuthorityLinkId(tenantId: string, authorityLinkId: string) {
    const record = this.current.get(authorityLinkId);
    if (!record || record.tenant_id !== tenantId) {
      return null;
    }
    return cloneRecord(record);
  }

  async requireByAuthorityLinkId(tenantId: string, authorityLinkId: string) {
    const record = await this.getByAuthorityLinkId(tenantId, authorityLinkId);
    if (!record) {
      throw new AuthorityLinkRepositoryError(
        "AUTHORITY_LINK_NOT_FOUND",
        `authority link ${authorityLinkId} does not exist in tenant ${tenantId}`,
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
      throw new AuthorityLinkRepositoryError(
        "AUTHORITY_LINK_SNAPSHOT_NOT_FOUND",
        `authority link snapshot ${snapshotRef} does not exist`,
      );
    }
    return snapshot;
  }

  async listSnapshotsByLineageKey(tenantId: string, lineageKey: string) {
    return (this.snapshotsByLineage.get(compositeKey(tenantId, lineageKey)) ?? [])
      .map((snapshotRef) => this.snapshots.get(snapshotRef))
      .filter((snapshot): snapshot is AuthorityLinkSnapshotRecord => snapshot !== undefined)
      .sort((left, right) =>
        (left.record.last_binding_check_at ?? left.record.validated_at ?? "").localeCompare(
          right.record.last_binding_check_at ?? right.record.validated_at ?? "",
        ),
      )
      .map((snapshot) => cloneSnapshot(snapshot));
  }

  async listCurrentByClientId(tenantId: string, clientId: string) {
    return (this.currentByClient.get(compositeKey(tenantId, clientId)) ?? [])
      .map((authorityLinkId) => this.current.get(authorityLinkId))
      .filter((record): record is AuthorityLinkRecord => record !== undefined)
      .sort((left, right) =>
        (left.last_binding_check_at ?? left.validated_at ?? "")
          .localeCompare(right.last_binding_check_at ?? right.validated_at ?? ""),
      )
      .map((record) => cloneRecord(record));
  }

  async listCurrentByReportingSubjectRef(tenantId: string, reportingSubjectRef: string) {
    return (this.currentByReportingSubject.get(compositeKey(tenantId, reportingSubjectRef)) ?? [])
      .map((authorityLinkId) => this.current.get(authorityLinkId))
      .filter((record): record is AuthorityLinkRecord => record !== undefined)
      .sort((left, right) =>
        (left.last_binding_check_at ?? left.validated_at ?? "").localeCompare(
          right.last_binding_check_at ?? right.validated_at ?? "",
        ),
      )
      .map((record) => cloneRecord(record));
  }

  async listCurrentByAuthorisedPartyRef(tenantId: string, authorisedPartyRef: string) {
    return (this.currentByAuthorisedParty.get(compositeKey(tenantId, authorisedPartyRef)) ?? [])
      .map((authorityLinkId) => this.current.get(authorityLinkId))
      .filter((record): record is AuthorityLinkRecord => record !== undefined)
      .sort((left, right) =>
        (left.last_binding_check_at ?? left.validated_at ?? "").localeCompare(
          right.last_binding_check_at ?? right.validated_at ?? "",
        ),
      )
      .map((record) => cloneRecord(record));
  }

  async listCurrentByDelegationGrantRef(tenantId: string, delegationGrantRef: string) {
    return (this.currentByDelegationGrant.get(compositeKey(tenantId, delegationGrantRef)) ?? [])
      .map((authorityLinkId) => this.current.get(authorityLinkId))
      .filter((record): record is AuthorityLinkRecord => record !== undefined)
      .sort((left, right) =>
        (left.last_binding_check_at ?? left.validated_at ?? "").localeCompare(
          right.last_binding_check_at ?? right.validated_at ?? "",
        ),
      )
      .map((record) => cloneRecord(record));
  }

  async listCurrentByTokenBindingProfileRef(tenantId: string, tokenBindingProfileRef: string) {
    return (
      this.currentByTokenBindingProfile.get(compositeKey(tenantId, tokenBindingProfileRef)) ?? []
    )
      .map((authorityLinkId) => this.current.get(authorityLinkId))
      .filter((record): record is AuthorityLinkRecord => record !== undefined)
      .sort((left, right) =>
        (left.last_binding_check_at ?? left.validated_at ?? "").localeCompare(
          right.last_binding_check_at ?? right.validated_at ?? "",
        ),
      )
      .map((record) => cloneRecord(record));
  }

  async listTransitions(tenantId: string, authorityLinkId: string) {
    const currentRecord = await this.getByAuthorityLinkId(tenantId, authorityLinkId);
    if (!currentRecord) {
      return [];
    }
    return (this.transitions.get(authorityLinkId) ?? []).map((transition) =>
      cloneTransition(transition),
    );
  }

  async recordBindingCheck(
    tenantId: string,
    authorityLinkId: string,
    input: {
      checked_at: string;
      blocked_reason_codes?: string[];
      delegation_state: AuthorityLinkRecord["delegation_state"];
      expires_at: string | null;
      reason_code: string;
      source_evidence_refs?: string[];
      source_ref?: string | null;
      token_binding_profile_ref: string | null;
      token_client_binding_state: AuthorityLinkRecord["token_client_binding_state"];
    },
  ) {
    const currentRecord = await this.requireByAuthorityLinkId(tenantId, authorityLinkId);
    const checkedAt = normalizeUtcInstantString(input.checked_at);
    const currentState = deriveAuthorityLinkLifecycleState(currentRecord, checkedAt);
    if (["REVOKED", "EXPIRED", "SUPERSEDED"].includes(currentState)) {
      throw new AuthorityLinkRepositoryError(
        "AUTHORITY_LINK_ILLEGAL_REVIVAL",
        `authority link ${authorityLinkId} cannot be revived from ${currentState}`,
      );
    }

    const provisional = normalizeAuthorityLinkRecord({
      ...currentRecord,
      token_binding_profile_ref: input.token_binding_profile_ref,
      validated_at: currentRecord.validated_at ?? checkedAt,
      expires_at: input.expires_at,
      delegation_state: input.delegation_state,
      token_client_binding_state: input.token_client_binding_state,
      source_evidence_refs: input.source_evidence_refs ?? currentRecord.source_evidence_refs,
      blocked_reason_codes: input.blocked_reason_codes ?? currentRecord.blocked_reason_codes,
      last_binding_check_at: checkedAt,
      lifecycle_state:
        currentRecord.lifecycle_state === "LINK_INITIATED"
          ? "AUTHORISED_ACTIVE"
          : currentRecord.lifecycle_state,
      binding_health:
        currentRecord.lifecycle_state === "LINK_INITIATED"
          ? "HEALTHY"
          : currentRecord.binding_health,
    });

    const healthResolution = this.bindingHealthService.resolve(provisional, checkedAt);
    const next = normalizeAuthorityLinkRecord({
      ...provisional,
      lifecycle_state: healthResolution.lifecycle_state,
      binding_health: healthResolution.binding_health,
      blocked_reason_codes: healthResolution.blocked_reason_codes,
    });
    assertAuthorityLinkIdentityStable(currentRecord, next);
    this.current.set(authorityLinkId, cloneRecord(next));
    const snapshot = this.captureSnapshot(next);
    this.recordTransition(next, {
      from_lifecycle_state: currentRecord.lifecycle_state,
      to_lifecycle_state: next.lifecycle_state,
      reason_code: input.reason_code,
      source_ref: input.source_ref ?? null,
      transition_at: checkedAt,
      snapshot_ref: snapshot.snapshot_ref,
    });
    return { record: cloneRecord(next), snapshot_ref: snapshot.snapshot_ref };
  }

  async revokeLink(
    tenantId: string,
    authorityLinkId: string,
    input: {
      blocked_reason_codes?: string[];
      reason_code: string;
      revoked_at: string;
      source_ref?: string | null;
    },
  ) {
    const currentRecord = await this.requireByAuthorityLinkId(tenantId, authorityLinkId);
    const revokedAt = normalizeUtcInstantString(input.revoked_at);
    const next = normalizeAuthorityLinkRecord({
      ...currentRecord,
      revoked_at: revokedAt,
      lifecycle_state: "REVOKED",
      binding_health: "REVOKED",
      blocked_reason_codes: input.blocked_reason_codes ?? ["AUTHORITY_LINK_REVOKED"],
    });
    assertAuthorityLinkIdentityStable(currentRecord, next);
    this.current.set(authorityLinkId, cloneRecord(next));
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

  async supersedeLink(
    tenantId: string,
    authorityLinkId: string,
    successor: CreateAuthorityLinkInput,
    options?: { reason_code?: string; source_ref?: string | null },
  ) {
    const currentRecord = await this.requireByAuthorityLinkId(tenantId, authorityLinkId);
    const successorRecord = normalizeAuthorityLinkRecord(successor);
    const next = normalizeAuthorityLinkRecord({
      ...currentRecord,
      superseded_by_link_id: successorRecord.authority_link_id,
      lifecycle_state: "SUPERSEDED",
      binding_health: "UNKNOWN",
      blocked_reason_codes:
        currentRecord.blocked_reason_codes.length > 0
          ? [...currentRecord.blocked_reason_codes]
          : ["AUTHORITY_LINK_SUPERSEDED"],
    });
    assertAuthorityLinkIdentityStable(currentRecord, next);
    this.current.set(authorityLinkId, cloneRecord(next));
    const snapshot = this.captureSnapshot(next);
    this.recordTransition(next, {
      from_lifecycle_state: currentRecord.lifecycle_state,
      to_lifecycle_state: next.lifecycle_state,
      reason_code: options?.reason_code ?? "AUTHORITY_LINK_SUPERSEDED",
      source_ref: options?.source_ref ?? null,
      transition_at:
        successorRecord.validated_at ??
        successorRecord.last_binding_check_at ??
        new Date().toISOString(),
      snapshot_ref: snapshot.snapshot_ref,
    });
    const createdSuccessor = await this.create(successorRecord, {
      reason_code: options?.reason_code ?? "AUTHORITY_LINK_SUCCESSOR_CREATED",
      source_ref: options?.source_ref ?? null,
    });
    return {
      predecessor: { record: cloneRecord(next), snapshot_ref: snapshot.snapshot_ref },
      successor: createdSuccessor,
    };
  }

  async findBestCurrentLink(input: {
    authority_name: string;
    authority_scope: string;
    authorised_party_ref: string;
    client_id: string;
    partition_scope_refs?: string[];
    provider_api_version: string;
    provider_environment: string;
    reporting_subject_ref: string;
    tenant_id: string;
  }) {
    const candidates = await this.listCurrentByClientId(input.tenant_id, input.client_id);
    return candidates
      .filter((record) => {
        if (record.reporting_subject_ref !== input.reporting_subject_ref) {
          return false;
        }
        if (record.authorised_party_ref !== input.authorised_party_ref) {
          return false;
        }
        if (record.authority_name !== input.authority_name) {
          return false;
        }
        if (record.authority_scope !== input.authority_scope) {
          return false;
        }
        if (record.provider_environment !== input.provider_environment) {
          return false;
        }
        if (record.provider_api_version !== input.provider_api_version) {
          return false;
        }
        if ((input.partition_scope_refs ?? []).length === 0 || record.partition_scope_refs.length === 0) {
          return true;
        }
        return (input.partition_scope_refs ?? []).every((partitionRef) =>
          record.partition_scope_refs.includes(partitionRef),
        );
      })
      .sort((left, right) =>
        (right.last_binding_check_at ?? right.validated_at ?? "").localeCompare(
          left.last_binding_check_at ?? left.validated_at ?? "",
        ),
      )
      .map((record) => ({
        record,
        snapshot_ref: buildAuthorityLinkSnapshotRef(record),
      }))
      .at(0) ?? null;
  }
}
