import {
  cloneLateDataFindingRecord,
  lateDataFindingRef,
  normalizeLateDataFindingRecord,
  type LateDataFindingRecord,
} from "../models/late_data_finding.ts";

export type StoredLateDataFindingRecord = {
  finding_id: string;
  late_data_finding: LateDataFindingRecord;
  late_data_finding_ref: string;
  late_data_policy_ref: string;
  manifest_id: string;
  persisted_at: string;
  row_version: number;
  source_domain: string;
};

export type LateDataFindingRepositoryErrorCode =
  | "LATE_DATA_FINDING_DUPLICATE"
  | "LATE_DATA_FINDING_NOT_FOUND";

export class LateDataFindingRepositoryError extends Error {
  readonly code: LateDataFindingRepositoryErrorCode;

  constructor(code: LateDataFindingRepositoryErrorCode, detail: string) {
    super(`${code}: ${detail}`);
    this.name = "LateDataFindingRepositoryError";
    this.code = code;
  }
}

function cloneStored(record: StoredLateDataFindingRecord) {
  return structuredClone(record);
}

function pushIndex(index: Map<string, string[]>, key: string, value: string) {
  const current = index.get(key) ?? [];
  if (!current.includes(value)) {
    current.push(value);
    index.set(key, current);
  }
}

export class LateDataFindingRepository {
  private readonly findings = new Map<string, StoredLateDataFindingRecord>();
  private readonly idByRef = new Map<string, string>();
  private readonly idsByManifest = new Map<string, string[]>();
  private readonly idsByPolicy = new Map<string, string[]>();
  private readonly idsBySourceDomain = new Map<string, string[]>();

  private listByIds(ids: string[]) {
    return ids
      .map((id) => this.findings.get(id))
      .filter((record): record is StoredLateDataFindingRecord => record !== undefined)
      .sort((left, right) => left.persisted_at.localeCompare(right.persisted_at))
      .map((record) => cloneStored(record));
  }

  async persistLateDataFinding(input: {
    late_data_finding: LateDataFindingRecord;
    persisted_at: string;
  }) {
    const finding = normalizeLateDataFindingRecord(input.late_data_finding);
    const existing = this.findings.get(finding.finding_id);
    if (existing) {
      if (JSON.stringify(existing.late_data_finding) !== JSON.stringify(finding)) {
        throw new LateDataFindingRepositoryError(
          "LATE_DATA_FINDING_DUPLICATE",
          `late-data finding ${finding.finding_id} already exists with a different payload`,
        );
      }
      return cloneStored(existing);
    }

    const ref = lateDataFindingRef(finding);
    const stored: StoredLateDataFindingRecord = {
      finding_id: finding.finding_id,
      late_data_finding: cloneLateDataFindingRecord(finding),
      late_data_finding_ref: ref,
      late_data_policy_ref: finding.late_data_policy_ref,
      manifest_id: finding.manifest_id,
      persisted_at: input.persisted_at,
      row_version: 1,
      source_domain: finding.source_domain,
    };
    this.findings.set(stored.finding_id, cloneStored(stored));
    this.idByRef.set(stored.late_data_finding_ref, stored.finding_id);
    pushIndex(this.idsByManifest, stored.manifest_id, stored.finding_id);
    pushIndex(this.idsByPolicy, `${stored.manifest_id}::${stored.late_data_policy_ref}`, stored.finding_id);
    pushIndex(this.idsBySourceDomain, `${stored.manifest_id}::${stored.source_domain}`, stored.finding_id);
    return cloneStored(stored);
  }

  async getLateDataFindingById(findingId: string) {
    const stored = this.findings.get(findingId);
    return stored ? cloneStored(stored) : null;
  }

  async getLateDataFindingByRef(ref: string) {
    const id = this.idByRef.get(ref);
    return id ? this.getLateDataFindingById(id) : null;
  }

  async requireLateDataFindingById(findingId: string) {
    const stored = await this.getLateDataFindingById(findingId);
    if (!stored) {
      throw new LateDataFindingRepositoryError(
        "LATE_DATA_FINDING_NOT_FOUND",
        `late-data finding ${findingId} does not exist`,
      );
    }
    return stored;
  }

  async listLateDataFindingsByManifestId(manifestId: string) {
    return this.listByIds(this.idsByManifest.get(manifestId) ?? []);
  }

  async listLateDataFindingsByPolicy(manifestId: string, lateDataPolicyRef: string) {
    return this.listByIds(this.idsByPolicy.get(`${manifestId}::${lateDataPolicyRef}`) ?? []);
  }

  async listLateDataFindingsBySourceDomain(manifestId: string, sourceDomain: string) {
    return this.listByIds(this.idsBySourceDomain.get(`${manifestId}::${sourceDomain}`) ?? []);
  }
}
