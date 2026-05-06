import { AuthorityModelError, cloneRecord, stableEqual } from "../models/authority_common.ts";
import {
  cloneFilingNoticeStepRecord,
  compareFilingNoticeSteps,
  filingNoticeStepContentFingerprint,
  filingNoticeStepRef,
  normalizeFilingNoticeStepRecord,
  type FilingNoticeStepCode,
  type FilingNoticeStepLifecycleState,
  type FilingNoticeStepRecord,
} from "../models/filing_notice_step.ts";

export type StoredFilingNoticeStep = {
  content_fingerprint: string;
  created_at: string;
  lifecycle_state: FilingNoticeStepLifecycleState;
  manifest_id: string;
  notice_step_id: string;
  notice_step_ref: string;
  packet_id: string;
  record: FilingNoticeStepRecord;
  row_version: number;
  step_code: FilingNoticeStepCode;
};

function cloneStored(stored: StoredFilingNoticeStep) {
  return cloneRecord(stored);
}

function pushIndex(index: Map<string, string[]>, key: string, value: string) {
  const current = index.get(key) ?? [];
  if (!current.includes(value)) {
    current.push(value);
    index.set(key, current);
  }
}

function sortStored(left: StoredFilingNoticeStep, right: StoredFilingNoticeStep) {
  return (
    left.manifest_id.localeCompare(right.manifest_id) ||
    left.packet_id.localeCompare(right.packet_id) ||
    compareFilingNoticeSteps(left.record, right.record) ||
    left.created_at.localeCompare(right.created_at)
  );
}

export class FilingNoticeStepRepository {
  private readonly idByRef = new Map<string, string>();
  private readonly idsByManifest = new Map<string, string[]>();
  private readonly idsByPacket = new Map<string, string[]>();
  private readonly idsByPacketAndCode = new Map<string, string[]>();
  private readonly records = new Map<string, StoredFilingNoticeStep>();

  private rebuildIndexes() {
    this.idByRef.clear();
    this.idsByManifest.clear();
    this.idsByPacket.clear();
    this.idsByPacketAndCode.clear();
    for (const stored of this.records.values()) {
      this.idByRef.set(stored.notice_step_ref, stored.notice_step_id);
      pushIndex(this.idsByManifest, stored.manifest_id, stored.notice_step_id);
      pushIndex(this.idsByPacket, stored.packet_id, stored.notice_step_id);
      pushIndex(
        this.idsByPacketAndCode,
        `${stored.packet_id}:${stored.step_code}`,
        stored.notice_step_id,
      );
    }
  }

  private listByIds(ids: readonly string[]) {
    return ids
      .map((id) => this.records.get(id))
      .filter((stored): stored is StoredFilingNoticeStep => stored !== undefined)
      .sort(sortStored)
      .map(cloneStored);
  }

  async persistFilingNoticeStep(input: { step: FilingNoticeStepRecord }) {
    const step = normalizeFilingNoticeStepRecord(input.step);
    const existing = this.records.get(step.notice_step_id);
    const ref = filingNoticeStepRef(step);
    const refOwner = this.idByRef.get(ref);
    if (refOwner !== undefined && refOwner !== step.notice_step_id) {
      throw new AuthorityModelError(
        "AUTHORITY_REPOSITORY_INVALID",
        `filing notice step ref ${ref} already belongs to ${refOwner}`,
      );
    }
    if (
      existing &&
      existing.record.lifecycle_state !== "PENDING" &&
      !stableEqual(existing.record, step)
    ) {
      throw new AuthorityModelError(
        "AUTHORITY_REPOSITORY_INVALID",
        `resolved filing notice step ${step.notice_step_id} cannot mutate in place`,
      );
    }
    if (existing && stableEqual(existing.record, step)) {
      return cloneStored(existing);
    }
    const stored: StoredFilingNoticeStep = {
      content_fingerprint: filingNoticeStepContentFingerprint(step),
      created_at: step.created_at,
      lifecycle_state: step.lifecycle_state,
      manifest_id: step.manifest_id,
      notice_step_id: step.notice_step_id,
      notice_step_ref: ref,
      packet_id: step.packet_id,
      record: cloneFilingNoticeStepRecord(step),
      row_version: (existing?.row_version ?? 0) + 1,
      step_code: step.step_code,
    };
    this.records.set(stored.notice_step_id, cloneStored(stored));
    this.rebuildIndexes();
    return cloneStored(stored);
  }

  async getFilingNoticeStepById(noticeStepId: string) {
    const stored = this.records.get(noticeStepId);
    return stored ? cloneStored(stored) : null;
  }

  async getFilingNoticeStepByRef(ref: string) {
    const id = this.idByRef.get(ref);
    const stored = id ? this.records.get(id) : undefined;
    return stored ? cloneStored(stored) : null;
  }

  async listFilingNoticeStepsByManifest(manifestId: string) {
    return this.listByIds(this.idsByManifest.get(manifestId) ?? []);
  }

  async listFilingNoticeStepsByPacket(packetId: string) {
    return this.listByIds(this.idsByPacket.get(packetId) ?? []);
  }

  async listFilingNoticeStepsByPacketAndCode(input: {
    packet_id: string;
    step_code: FilingNoticeStepCode;
  }) {
    return this.listByIds(
      this.idsByPacketAndCode.get(`${input.packet_id}:${input.step_code}`) ?? [],
    );
  }
}
