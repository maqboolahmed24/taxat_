import { AuthorityModelError, cloneRecord, stableEqual } from "../models/authority_common.ts";
import {
  cloneTemporalPropagationEventRecord,
  normalizeTemporalPropagationEventRecord,
  type TemporalPropagationEventClass,
  type TemporalPropagationEventRecord,
  temporalPropagationEventContentFingerprint,
  temporalPropagationEventRef,
} from "../models/temporal_propagation_event.ts";

export type StoredTemporalPropagationEvent = {
  active_exact_scope_key: string;
  affected_scope_refs: string[];
  affected_submission_refs: string[];
  content_fingerprint: string;
  emitted_at: string;
  event_class: TemporalPropagationEventClass;
  event_hash: string;
  manifest_id: string;
  record: TemporalPropagationEventRecord;
  row_version: number;
  temporal_event_id: string;
  temporal_event_ref: string;
};

function cloneStored(stored: StoredTemporalPropagationEvent) {
  return cloneRecord(stored);
}

function pushIndex(index: Map<string, string[]>, key: string, value: string) {
  const current = index.get(key) ?? [];
  if (!current.includes(value)) {
    current.push(value);
    index.set(key, current);
  }
}

function sortStored(left: StoredTemporalPropagationEvent, right: StoredTemporalPropagationEvent) {
  return (
    left.emitted_at.localeCompare(right.emitted_at) ||
    left.manifest_id.localeCompare(right.manifest_id) ||
    left.active_exact_scope_key.localeCompare(right.active_exact_scope_key) ||
    left.temporal_event_id.localeCompare(right.temporal_event_id)
  );
}

export class TemporalPropagationEventRepository {
  private readonly idByEventHash = new Map<string, string>();
  private readonly idByRef = new Map<string, string>();
  private readonly idsByClass = new Map<string, string[]>();
  private readonly idsByExactScope = new Map<string, string[]>();
  private readonly idsByManifest = new Map<string, string[]>();
  private readonly idsByManifestAndClass = new Map<string, string[]>();
  private readonly idsBySubmissionRef = new Map<string, string[]>();
  private readonly records = new Map<string, StoredTemporalPropagationEvent>();

  private rebuildIndexes() {
    this.idByEventHash.clear();
    this.idByRef.clear();
    this.idsByClass.clear();
    this.idsByExactScope.clear();
    this.idsByManifest.clear();
    this.idsByManifestAndClass.clear();
    this.idsBySubmissionRef.clear();
    for (const stored of this.records.values()) {
      this.idByEventHash.set(stored.event_hash, stored.temporal_event_id);
      this.idByRef.set(stored.temporal_event_ref, stored.temporal_event_id);
      pushIndex(this.idsByClass, stored.event_class, stored.temporal_event_id);
      pushIndex(this.idsByExactScope, stored.active_exact_scope_key, stored.temporal_event_id);
      pushIndex(this.idsByManifest, stored.manifest_id, stored.temporal_event_id);
      pushIndex(
        this.idsByManifestAndClass,
        `${stored.manifest_id}:${stored.event_class}`,
        stored.temporal_event_id,
      );
      for (const submissionRef of stored.affected_submission_refs) {
        pushIndex(this.idsBySubmissionRef, submissionRef, stored.temporal_event_id);
      }
    }
  }

  private listByIds(ids: readonly string[]) {
    return ids
      .map((id) => this.records.get(id))
      .filter((stored): stored is StoredTemporalPropagationEvent => stored !== undefined)
      .sort(sortStored)
      .map(cloneStored);
  }

  async persistTemporalPropagationEvent(input: { event: TemporalPropagationEventRecord }) {
    const event = normalizeTemporalPropagationEventRecord(input.event);
    const existingByHashId = this.idByEventHash.get(event.event_hash);
    if (existingByHashId !== undefined) {
      const existing = this.records.get(existingByHashId);
      if (existing === undefined) {
        throw new AuthorityModelError(
          "AUTHORITY_REPOSITORY_INVALID",
          `temporal event hash index points to missing id ${existingByHashId}`,
        );
      }
      if (!stableEqual(existing.record, event)) {
        throw new AuthorityModelError(
          "AUTHORITY_REPOSITORY_INVALID",
          `temporal event hash ${event.event_hash} already belongs to different event material`,
        );
      }
      return cloneStored(existing);
    }

    const existing = this.records.get(event.temporal_event_id);
    const ref = temporalPropagationEventRef(event);
    const refOwner = this.idByRef.get(ref);
    if (refOwner !== undefined && refOwner !== event.temporal_event_id) {
      throw new AuthorityModelError(
        "AUTHORITY_REPOSITORY_INVALID",
        `temporal event ref ${ref} already belongs to ${refOwner}`,
      );
    }
    if (existing && !stableEqual(existing.record, event)) {
      throw new AuthorityModelError(
        "AUTHORITY_REPOSITORY_INVALID",
        `temporal event ${event.temporal_event_id} cannot mutate in place`,
      );
    }
    if (existing) {
      return cloneStored(existing);
    }

    const stored: StoredTemporalPropagationEvent = {
      active_exact_scope_key: event.active_exact_scope_key,
      affected_scope_refs: [...event.affected_scope_refs],
      affected_submission_refs: [...event.affected_submission_refs],
      content_fingerprint: temporalPropagationEventContentFingerprint(event),
      emitted_at: event.emitted_at,
      event_class: event.event_class,
      event_hash: event.event_hash,
      manifest_id: event.manifest_id,
      record: cloneTemporalPropagationEventRecord(event),
      row_version: 1,
      temporal_event_id: event.temporal_event_id,
      temporal_event_ref: ref,
    };
    this.records.set(stored.temporal_event_id, cloneStored(stored));
    this.rebuildIndexes();
    return cloneStored(stored);
  }

  async getTemporalPropagationEventById(temporalEventId: string) {
    const stored = this.records.get(temporalEventId);
    return stored ? cloneStored(stored) : null;
  }

  async getTemporalPropagationEventByRef(ref: string) {
    const id = this.idByRef.get(ref);
    const stored = id ? this.records.get(id) : undefined;
    return stored ? cloneStored(stored) : null;
  }

  async getTemporalPropagationEventByHash(eventHash: string) {
    const id = this.idByEventHash.get(eventHash);
    const stored = id ? this.records.get(id) : undefined;
    return stored ? cloneStored(stored) : null;
  }

  async listTemporalPropagationEventsByManifest(manifestId: string) {
    return this.listByIds(this.idsByManifest.get(manifestId) ?? []);
  }

  async listTemporalPropagationEventsByEventClass(eventClass: TemporalPropagationEventClass) {
    return this.listByIds(this.idsByClass.get(eventClass) ?? []);
  }

  async listTemporalPropagationEventsByManifestAndClass(input: {
    event_class: TemporalPropagationEventClass;
    manifest_id: string;
  }) {
    return this.listByIds(
      this.idsByManifestAndClass.get(`${input.manifest_id}:${input.event_class}`) ?? [],
    );
  }

  async listTemporalPropagationEventsByExactScope(activeExactScopeKey: string) {
    return this.listByIds(this.idsByExactScope.get(activeExactScopeKey) ?? []);
  }

  async listTemporalPropagationEventsByAffectedSubmission(submissionRef: string) {
    return this.listByIds(this.idsBySubmissionRef.get(submissionRef) ?? []);
  }
}
