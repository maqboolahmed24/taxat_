import { AuthorityModelError, cloneRecord, stableEqual } from "../models/authority_common.ts";
import {
  cloneFilingNoticeResolutionRecord,
  filingNoticeResolutionContentFingerprint,
  filingNoticeResolutionRef,
  normalizeFilingNoticeResolutionRecord,
  type FilingNoticeResolutionRecord,
} from "../models/filing_notice_resolution.ts";

export type StoredFilingNoticeResolution = {
  content_fingerprint: string;
  manifest_id: string;
  notice_resolution_id: string;
  notice_resolution_ref: string;
  notice_requirements_satisfied: boolean;
  packet_id: string;
  record: FilingNoticeResolutionRecord;
  resolved_at: string;
  row_version: number;
};

function cloneStored(stored: StoredFilingNoticeResolution) {
  return cloneRecord(stored);
}

function pushIndex(index: Map<string, string[]>, key: string, value: string) {
  const current = index.get(key) ?? [];
  if (!current.includes(value)) {
    current.push(value);
    index.set(key, current);
  }
}

function sortStored(left: StoredFilingNoticeResolution, right: StoredFilingNoticeResolution) {
  return (
    left.manifest_id.localeCompare(right.manifest_id) ||
    left.packet_id.localeCompare(right.packet_id) ||
    left.resolved_at.localeCompare(right.resolved_at) ||
    left.notice_resolution_id.localeCompare(right.notice_resolution_id)
  );
}

export class FilingNoticeResolutionRepository {
  private readonly idByRef = new Map<string, string>();
  private readonly idsByManifest = new Map<string, string[]>();
  private readonly idsByPacket = new Map<string, string[]>();
  private readonly records = new Map<string, StoredFilingNoticeResolution>();

  private rebuildIndexes() {
    this.idByRef.clear();
    this.idsByManifest.clear();
    this.idsByPacket.clear();
    for (const stored of this.records.values()) {
      this.idByRef.set(stored.notice_resolution_ref, stored.notice_resolution_id);
      pushIndex(this.idsByManifest, stored.manifest_id, stored.notice_resolution_id);
      pushIndex(this.idsByPacket, stored.packet_id, stored.notice_resolution_id);
    }
  }

  private listByIds(ids: readonly string[]) {
    return ids
      .map((id) => this.records.get(id))
      .filter((stored): stored is StoredFilingNoticeResolution => stored !== undefined)
      .sort(sortStored)
      .map(cloneStored);
  }

  async persistFilingNoticeResolution(input: { resolution: FilingNoticeResolutionRecord }) {
    const resolution = normalizeFilingNoticeResolutionRecord(input.resolution);
    const existing = this.records.get(resolution.notice_resolution_id);
    const ref = filingNoticeResolutionRef(resolution);
    const refOwner = this.idByRef.get(ref);
    if (refOwner !== undefined && refOwner !== resolution.notice_resolution_id) {
      throw new AuthorityModelError(
        "AUTHORITY_REPOSITORY_INVALID",
        `filing notice resolution ref ${ref} already belongs to ${refOwner}`,
      );
    }
    if (existing && !stableEqual(existing.record, resolution)) {
      throw new AuthorityModelError(
        "AUTHORITY_REPOSITORY_INVALID",
        `filing notice resolution ${resolution.notice_resolution_id} cannot mutate in place`,
      );
    }
    if (existing) {
      return cloneStored(existing);
    }
    const stored: StoredFilingNoticeResolution = {
      content_fingerprint: filingNoticeResolutionContentFingerprint(resolution),
      manifest_id: resolution.manifest_id,
      notice_resolution_id: resolution.notice_resolution_id,
      notice_resolution_ref: ref,
      notice_requirements_satisfied: resolution.notice_requirements_satisfied,
      packet_id: resolution.packet_id,
      record: cloneFilingNoticeResolutionRecord(resolution),
      resolved_at: resolution.resolved_at,
      row_version: 1,
    };
    this.records.set(stored.notice_resolution_id, cloneStored(stored));
    this.rebuildIndexes();
    return cloneStored(stored);
  }

  async getFilingNoticeResolutionById(noticeResolutionId: string) {
    const stored = this.records.get(noticeResolutionId);
    return stored ? cloneStored(stored) : null;
  }

  async getFilingNoticeResolutionByRef(ref: string) {
    const id = this.idByRef.get(ref);
    const stored = id ? this.records.get(id) : undefined;
    return stored ? cloneStored(stored) : null;
  }

  async listFilingNoticeResolutionsByManifest(manifestId: string) {
    return this.listByIds(this.idsByManifest.get(manifestId) ?? []);
  }

  async listFilingNoticeResolutionsByPacket(packetId: string) {
    return this.listByIds(this.idsByPacket.get(packetId) ?? []);
  }
}
