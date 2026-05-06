import { AuthorityModelError, cloneRecord, stableEqual } from "../models/authority_common.ts";
import {
  cloneFilingPacketRecord,
  filingPacketContentFingerprint,
  filingPacketRef,
  normalizeFilingPacketRecord,
  type FilingPacketRecord,
} from "../models/filing_packet.ts";

export type StoredFilingPacketRecord = {
  content_fingerprint: string;
  lifecycle_state: string;
  manifest_id: string;
  packet_id: string;
  packet_ref: string;
  record: FilingPacketRecord;
  row_version: number;
};

function cloneStored(record: StoredFilingPacketRecord) {
  return cloneRecord(record);
}

function pushIndex(index: Map<string, string[]>, key: string, value: string) {
  const current = index.get(key) ?? [];
  if (!current.includes(value)) {
    current.push(value);
    index.set(key, current);
  }
}

function sortStored(left: StoredFilingPacketRecord, right: StoredFilingPacketRecord) {
  return (
    left.manifest_id.localeCompare(right.manifest_id) ||
    left.record.created_at.localeCompare(right.record.created_at) ||
    left.packet_id.localeCompare(right.packet_id)
  );
}

export class FilingPacketRepository {
  private readonly idByRef = new Map<string, string>();
  private readonly idsByManifest = new Map<string, string[]>();
  private readonly records = new Map<string, StoredFilingPacketRecord>();

  private rebuildIndexes() {
    this.idByRef.clear();
    this.idsByManifest.clear();
    for (const stored of this.records.values()) {
      this.idByRef.set(stored.packet_ref, stored.packet_id);
      pushIndex(this.idsByManifest, stored.manifest_id, stored.packet_id);
    }
  }

  private listByIds(ids: readonly string[]) {
    return ids
      .map((id) => this.records.get(id))
      .filter((record): record is StoredFilingPacketRecord => record !== undefined)
      .sort(sortStored)
      .map(cloneStored);
  }

  async persistFilingPacket(input: { packet: FilingPacketRecord }) {
    const packet = normalizeFilingPacketRecord(input.packet);
    const existing = this.records.get(packet.packet_id);
    const ref = filingPacketRef(packet);
    const refOwner = this.idByRef.get(ref);
    if (refOwner !== undefined && refOwner !== packet.packet_id) {
      throw new AuthorityModelError(
        "AUTHORITY_REPOSITORY_INVALID",
        `filing packet ref ${ref} already belongs to ${refOwner}`,
      );
    }
    if (existing?.record.lifecycle_state === "SUBMITTED" && !stableEqual(existing.record, packet)) {
      throw new AuthorityModelError(
        "AUTHORITY_REPOSITORY_INVALID",
        `submitted filing packet ${packet.packet_id} cannot mutate in place`,
      );
    }
    if (existing && stableEqual(existing.record, packet)) {
      return cloneStored(existing);
    }
    const stored: StoredFilingPacketRecord = {
      content_fingerprint: filingPacketContentFingerprint(packet),
      lifecycle_state: packet.lifecycle_state,
      manifest_id: packet.manifest_id,
      packet_id: packet.packet_id,
      packet_ref: ref,
      record: cloneFilingPacketRecord(packet),
      row_version: (existing?.row_version ?? 0) + 1,
    };
    this.records.set(stored.packet_id, cloneStored(stored));
    this.rebuildIndexes();
    return cloneStored(stored);
  }

  async getFilingPacketById(packetId: string) {
    const stored = this.records.get(packetId);
    return stored ? cloneStored(stored) : null;
  }

  async getFilingPacketByRef(ref: string) {
    const id = this.idByRef.get(ref);
    const stored = id ? this.records.get(id) : undefined;
    return stored ? cloneStored(stored) : null;
  }

  async listFilingPacketsByManifestId(manifestId: string) {
    return this.listByIds(this.idsByManifest.get(manifestId) ?? []);
  }
}
