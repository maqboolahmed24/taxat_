import { AuthorityModelError, cloneRecord, stableEqual } from "../models/authority_common.ts";
import {
  cloneSubmissionRecord,
  normalizeSubmissionRecord,
  type SubmissionRecord,
  submissionRecordContentFingerprint,
  submissionRecordRef,
} from "../models/submission_record.ts";

export type StoredSubmissionRecord = {
  client_id: string;
  content_fingerprint: string;
  duplicate_meaning_key: string;
  lifecycle_state: string;
  manifest_id: string;
  obligation_ref: string;
  record: SubmissionRecord;
  row_version: number;
  submission_id: string;
  submission_record_ref: string;
};

function cloneStored(record: StoredSubmissionRecord) {
  return cloneRecord(record);
}

function pushIndex(index: Map<string, string[]>, key: string, value: string) {
  const current = index.get(key) ?? [];
  if (!current.includes(value)) {
    current.push(value);
    index.set(key, current);
  }
}

function sortStored(left: StoredSubmissionRecord, right: StoredSubmissionRecord) {
  return (
    left.client_id.localeCompare(right.client_id) ||
    left.duplicate_meaning_key.localeCompare(right.duplicate_meaning_key) ||
    left.record.state_changed_at.localeCompare(right.record.state_changed_at) ||
    left.submission_id.localeCompare(right.submission_id)
  );
}

export class SubmissionRecordRepository {
  private readonly idByRef = new Map<string, string>();
  private readonly idsByClient = new Map<string, string[]>();
  private readonly idsByDuplicateMeaning = new Map<string, string[]>();
  private readonly idsByManifest = new Map<string, string[]>();
  private readonly idsByObligation = new Map<string, string[]>();
  private readonly records = new Map<string, StoredSubmissionRecord>();

  private rebuildIndexes() {
    this.idByRef.clear();
    this.idsByClient.clear();
    this.idsByDuplicateMeaning.clear();
    this.idsByManifest.clear();
    this.idsByObligation.clear();
    for (const stored of this.records.values()) {
      this.idByRef.set(stored.submission_record_ref, stored.submission_id);
      pushIndex(this.idsByClient, stored.client_id, stored.submission_id);
      pushIndex(this.idsByDuplicateMeaning, stored.duplicate_meaning_key, stored.submission_id);
      pushIndex(this.idsByManifest, stored.manifest_id, stored.submission_id);
      pushIndex(
        this.idsByObligation,
        `${stored.client_id}:${stored.obligation_ref}:${stored.record.operation_family}`,
        stored.submission_id,
      );
    }
  }

  private listByIds(ids: readonly string[]) {
    return ids
      .map((id) => this.records.get(id))
      .filter((record): record is StoredSubmissionRecord => record !== undefined)
      .sort(sortStored)
      .map(cloneStored);
  }

  private assertDuplicateMeaningOwner(record: SubmissionRecord) {
    if (record.lifecycle_state === "SUPERSEDED") {
      return;
    }
    for (const stored of this.records.values()) {
      if (
        stored.submission_id !== record.submission_id &&
        stored.duplicate_meaning_key === record.duplicate_meaning_key &&
        stored.record.lifecycle_state !== "SUPERSEDED"
      ) {
        throw new AuthorityModelError(
          "AUTHORITY_REPOSITORY_INVALID",
          `duplicate meaning key ${record.duplicate_meaning_key} already has active submission ${stored.submission_id}`,
        );
      }
    }
  }

  async persistSubmissionRecord(input: { submission: SubmissionRecord }) {
    const submission = normalizeSubmissionRecord(input.submission);
    const existing = this.records.get(submission.submission_id);
    const ref = submissionRecordRef(submission);
    const refOwner = this.idByRef.get(ref);
    if (refOwner !== undefined && refOwner !== submission.submission_id) {
      throw new AuthorityModelError(
        "AUTHORITY_REPOSITORY_INVALID",
        `submission record ref ${ref} already belongs to ${refOwner}`,
      );
    }
    if (existing?.record.lifecycle_state === "SUPERSEDED" && !stableEqual(existing.record, submission)) {
      throw new AuthorityModelError(
        "AUTHORITY_REPOSITORY_INVALID",
        `superseded submission record ${submission.submission_id} cannot mutate in place`,
      );
    }
    this.assertDuplicateMeaningOwner(submission);
    if (existing && stableEqual(existing.record, submission)) {
      return cloneStored(existing);
    }
    const stored: StoredSubmissionRecord = {
      client_id: submission.client_id,
      content_fingerprint: submissionRecordContentFingerprint(submission),
      duplicate_meaning_key: submission.duplicate_meaning_key,
      lifecycle_state: submission.lifecycle_state,
      manifest_id: submission.manifest_id,
      obligation_ref: submission.obligation_ref,
      record: cloneSubmissionRecord(submission),
      row_version: (existing?.row_version ?? 0) + 1,
      submission_id: submission.submission_id,
      submission_record_ref: ref,
    };
    this.records.set(stored.submission_id, cloneStored(stored));
    this.rebuildIndexes();
    return cloneStored(stored);
  }

  async getSubmissionRecordById(submissionId: string) {
    const stored = this.records.get(submissionId);
    return stored ? cloneStored(stored) : null;
  }

  async getSubmissionRecordByRef(ref: string) {
    const id = this.idByRef.get(ref);
    const stored = id ? this.records.get(id) : undefined;
    return stored ? cloneStored(stored) : null;
  }

  async findActiveSubmissionByDuplicateMeaningKey(duplicateMeaningKey: string) {
    const records = this.listByIds(this.idsByDuplicateMeaning.get(duplicateMeaningKey) ?? []);
    return records.find((stored) => stored.record.lifecycle_state !== "SUPERSEDED") ?? null;
  }

  async listSubmissionRecordsByClient(clientId: string) {
    return this.listByIds(this.idsByClient.get(clientId) ?? []);
  }

  async listSubmissionRecordsByDuplicateMeaningKey(duplicateMeaningKey: string) {
    return this.listByIds(this.idsByDuplicateMeaning.get(duplicateMeaningKey) ?? []);
  }

  async listSubmissionRecordsByManifestId(manifestId: string) {
    return this.listByIds(this.idsByManifest.get(manifestId) ?? []);
  }

  async listSubmissionRecordsByObligation(input: {
    client_id: string;
    obligation_ref: string;
    operation_family: string;
  }) {
    return this.listByIds(
      this.idsByObligation.get(`${input.client_id}:${input.obligation_ref}:${input.operation_family}`) ?? [],
    );
  }
}
