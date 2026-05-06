import type {
  RunManifestLifecycleState,
  RunManifestRecord,
  RunManifestTransitionEventCode,
} from "../models/run_manifest.ts";
import { cloneRunManifestRecord, normalizeRunManifestRecord } from "../models/run_manifest.ts";
import { synchronizeManifestOutcomeProjectionMirrors } from "../services/output_ref_projection_normalizer.ts";
import { validateRunManifestMirrorConsistency } from "../services/manifest_mirror_consistency_validator.ts";

export type StoredRunManifestRecord = {
  access_binding_hash: string;
  idempotency_key: string;
  lifecycle_state: RunManifestLifecycleState;
  manifest: RunManifestRecord;
  manifest_id: string;
  manifest_row_version: number;
  parent_manifest_id: string | null;
  persisted_at: string;
  root_manifest_id: string | null;
  tenant_id: string;
  updated_at: string;
};

export type RunManifestTransitionLogRecord = {
  event_code: RunManifestTransitionEventCode;
  from_lifecycle_state: RunManifestLifecycleState | null;
  manifest_id: string;
  manifest_row_version: number;
  tenant_id: string;
  to_lifecycle_state: RunManifestLifecycleState;
  transition_audit_ref: string;
  transition_id: string;
  transition_reason_code: string;
  transitioned_at: string;
};

type RunManifestRepositoryErrorCode =
  | "RUN_MANIFEST_COMPARE_AND_SWAP_CONFLICT"
  | "RUN_MANIFEST_DUPLICATE"
  | "RUN_MANIFEST_IDEMPOTENCY_KEY_COLLISION"
  | "RUN_MANIFEST_NOT_FOUND";

export class RunManifestRepositoryError extends Error {
  readonly code: RunManifestRepositoryErrorCode;

  constructor(code: RunManifestRepositoryErrorCode, detail: string) {
    super(`${code}: ${detail}`);
    this.name = "RunManifestRepositoryError";
    this.code = code;
  }
}

function cloneStored(record: StoredRunManifestRecord) {
  return structuredClone(record);
}

function cloneTransitionRecord(record: RunManifestTransitionLogRecord) {
  return structuredClone(record);
}

function compositeKey(...parts: Array<string | null>) {
  return parts.map((part) => part ?? "<null>").join("::");
}

function ensureRecordIsValid(record: RunManifestRecord) {
  const normalized = normalizeRunManifestRecord(record);
  const mirrored = synchronizeManifestOutcomeProjectionMirrors(normalized);
  validateRunManifestMirrorConsistency(mirrored);
  return mirrored;
}

export class RunManifestRepository {
  private readonly manifests = new Map<string, StoredRunManifestRecord>();
  private readonly idsByAccessBindingHash = new Map<string, string[]>();
  private readonly idsByIdempotencyKey = new Map<string, string[]>();
  private readonly idsByRootManifest = new Map<string, string[]>();
  private readonly idsByParentManifest = new Map<string, string[]>();
  private readonly transitions = new Map<string, RunManifestTransitionLogRecord[]>();

  private pushIndex(index: Map<string, string[]>, key: string, value: string) {
    const current = index.get(key) ?? [];
    if (!current.includes(value)) {
      current.push(value);
      index.set(key, current);
    }
  }

  private replaceIndexes(previous: StoredRunManifestRecord | null, next: StoredRunManifestRecord) {
    if (!previous) {
      this.pushIndex(
        this.idsByAccessBindingHash,
        compositeKey(next.tenant_id, next.access_binding_hash),
        next.manifest_id,
      );
      this.pushIndex(
        this.idsByIdempotencyKey,
        compositeKey(next.tenant_id, next.idempotency_key),
        next.manifest_id,
      );
      this.pushIndex(
        this.idsByRootManifest,
        compositeKey(next.tenant_id, next.root_manifest_id),
        next.manifest_id,
      );
      this.pushIndex(
        this.idsByParentManifest,
        compositeKey(next.tenant_id, next.parent_manifest_id),
        next.manifest_id,
      );
      return;
    }
    if (
      previous.access_binding_hash !== next.access_binding_hash ||
      previous.idempotency_key !== next.idempotency_key ||
      previous.root_manifest_id !== next.root_manifest_id ||
      previous.parent_manifest_id !== next.parent_manifest_id
    ) {
      throw new RunManifestRepositoryError(
        "RUN_MANIFEST_COMPARE_AND_SWAP_CONFLICT",
        "indexed manifest identity fields are immutable after creation",
      );
    }
  }

  private buildStoredRecord(input: {
    manifest: RunManifestRecord;
    manifest_row_version: number;
    persisted_at: string;
  }): StoredRunManifestRecord {
    return {
      tenant_id: input.manifest.tenant_id,
      manifest_id: input.manifest.manifest_id,
      access_binding_hash: input.manifest.access_binding_hash,
      idempotency_key: input.manifest.idempotency_key,
      root_manifest_id: input.manifest.root_manifest_id,
      parent_manifest_id: input.manifest.parent_manifest_id,
      lifecycle_state: input.manifest.lifecycle_state,
      manifest_row_version: input.manifest_row_version,
      persisted_at: input.persisted_at,
      updated_at: input.persisted_at,
      manifest: cloneRunManifestRecord(input.manifest),
    };
  }

  async createManifest(input: { manifest: RunManifestRecord; persisted_at: string }) {
    const manifest = ensureRecordIsValid(input.manifest);
    const existing = this.manifests.get(manifest.manifest_id);
    if (existing) {
      if (JSON.stringify(existing.manifest) !== JSON.stringify(manifest)) {
        throw new RunManifestRepositoryError(
          "RUN_MANIFEST_DUPLICATE",
          `manifest ${manifest.manifest_id} already exists with a different payload`,
        );
      }
      return cloneStored(existing);
    }

    const idempotentMatch = (
      this.idsByIdempotencyKey.get(
        compositeKey(manifest.tenant_id, manifest.idempotency_key),
      ) ?? []
    )
      .map((id) => this.manifests.get(id))
      .find(
        (stored): stored is StoredRunManifestRecord =>
          stored !== undefined &&
          stored.manifest.access_binding_hash === manifest.access_binding_hash,
      );
    if (idempotentMatch) {
      throw new RunManifestRepositoryError(
        "RUN_MANIFEST_IDEMPOTENCY_KEY_COLLISION",
        `tenant ${manifest.tenant_id} already has manifest ${idempotentMatch.manifest_id} for idempotency key ${manifest.idempotency_key}`,
      );
    }

    const stored = this.buildStoredRecord({
      manifest,
      manifest_row_version: 1,
      persisted_at: input.persisted_at,
    });
    this.manifests.set(stored.manifest_id, cloneStored(stored));
    this.replaceIndexes(null, stored);
    return cloneStored(stored);
  }

  async getManifestById(tenantId: string, manifestId: string) {
    const stored = this.manifests.get(manifestId);
    if (!stored || stored.tenant_id !== tenantId) {
      return null;
    }
    const validatedManifest = ensureRecordIsValid(stored.manifest);
    return cloneStored({
      ...stored,
      lifecycle_state: validatedManifest.lifecycle_state,
      manifest: validatedManifest,
    });
  }

  async requireManifestById(tenantId: string, manifestId: string) {
    const stored = await this.getManifestById(tenantId, manifestId);
    if (!stored) {
      throw new RunManifestRepositoryError(
        "RUN_MANIFEST_NOT_FOUND",
        `manifest ${manifestId} does not exist in tenant ${tenantId}`,
      );
    }
    return stored;
  }

  private listByIds(ids: string[]) {
    return ids
      .map((id) => this.manifests.get(id))
      .filter((record): record is StoredRunManifestRecord => record !== undefined)
      .sort((left, right) => left.persisted_at.localeCompare(right.persisted_at))
      .map((record) => cloneStored(record));
  }

  async getLatestManifestByAccessBindingHash(tenantId: string, accessBindingHash: string) {
    const records = this.listByIds(
      this.idsByAccessBindingHash.get(compositeKey(tenantId, accessBindingHash)) ?? [],
    );
    return records.at(-1) ?? null;
  }

  async getManifestByIdempotencyKey(tenantId: string, idempotencyKey: string) {
    const records = this.listByIds(
      this.idsByIdempotencyKey.get(compositeKey(tenantId, idempotencyKey)) ?? [],
    );
    return records.at(-1) ?? null;
  }

  async listManifestsByRootManifestId(tenantId: string, rootManifestId: string | null) {
    return this.listByIds(
      this.idsByRootManifest.get(compositeKey(tenantId, rootManifestId)) ?? [],
    );
  }

  async listManifestsByParentManifestId(tenantId: string, parentManifestId: string | null) {
    return this.listByIds(
      this.idsByParentManifest.get(compositeKey(tenantId, parentManifestId)) ?? [],
    );
  }

  async compareAndSwapManifest(input: {
    expected_manifest_row_version: number;
    next_manifest: RunManifestRecord;
    persisted_at: string;
    transition?: {
      event_code: RunManifestTransitionEventCode;
      from_lifecycle_state: RunManifestLifecycleState | null;
      to_lifecycle_state: RunManifestLifecycleState;
      transition_audit_ref: string;
      transition_reason_code: string;
      transitioned_at: string;
    };
  }) {
    const existing = this.manifests.get(input.next_manifest.manifest_id);
    if (!existing) {
      throw new RunManifestRepositoryError(
        "RUN_MANIFEST_NOT_FOUND",
        `manifest ${input.next_manifest.manifest_id} does not exist`,
      );
    }
    if (existing.manifest_row_version !== input.expected_manifest_row_version) {
      throw new RunManifestRepositoryError(
        "RUN_MANIFEST_COMPARE_AND_SWAP_CONFLICT",
        `expected row version ${input.expected_manifest_row_version} but found ${existing.manifest_row_version}`,
      );
    }

    const validatedManifest = ensureRecordIsValid(input.next_manifest);
    const next = this.buildStoredRecord({
      manifest: validatedManifest,
      manifest_row_version: existing.manifest_row_version + 1,
      persisted_at: input.persisted_at,
    });
    this.replaceIndexes(existing, next);
    this.manifests.set(next.manifest_id, cloneStored(next));

    if (input.transition) {
      const transition: RunManifestTransitionLogRecord = {
        transition_id: stableTransitionId(
          next.tenant_id,
          next.manifest_id,
          next.manifest_row_version,
          input.transition.event_code,
          input.transition.transitioned_at,
        ),
        manifest_id: next.manifest_id,
        tenant_id: next.tenant_id,
        from_lifecycle_state: input.transition.from_lifecycle_state,
        to_lifecycle_state: input.transition.to_lifecycle_state,
        event_code: input.transition.event_code,
        transition_audit_ref: input.transition.transition_audit_ref,
        transition_reason_code: input.transition.transition_reason_code,
        transitioned_at: input.transition.transitioned_at,
        manifest_row_version: next.manifest_row_version,
      };
      const current = this.transitions.get(next.manifest_id) ?? [];
      current.push(transition);
      current.sort((left, right) => left.transitioned_at.localeCompare(right.transitioned_at));
      this.transitions.set(next.manifest_id, current);
    }

    return cloneStored(next);
  }

  async listTransitions(tenantId: string, manifestId: string) {
    const stored = this.manifests.get(manifestId);
    if (!stored || stored.tenant_id !== tenantId) {
      return [];
    }
    return (this.transitions.get(manifestId) ?? []).map((record) =>
      cloneTransitionRecord(record),
    );
  }

  async unsafeCorruptManifestForTesting(input: {
    manifest_id: string;
    mutate: (manifest: RunManifestRecord) => RunManifestRecord;
  }) {
    const existing = this.manifests.get(input.manifest_id);
    if (!existing) {
      throw new RunManifestRepositoryError(
        "RUN_MANIFEST_NOT_FOUND",
        `manifest ${input.manifest_id} does not exist`,
      );
    }
    const corrupted = input.mutate(cloneRunManifestRecord(existing.manifest));
    this.manifests.set(
      input.manifest_id,
      cloneStored({
        ...existing,
        manifest: corrupted,
      }),
    );
  }
}

function stableTransitionId(
  tenantId: string,
  manifestId: string,
  manifestRowVersion: number,
  eventCode: RunManifestTransitionEventCode,
  transitionedAt: string,
) {
  return `${tenantId}.${manifestId}.${manifestRowVersion}.${eventCode}.${transitionedAt}`;
}
