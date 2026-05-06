import {
  cloneLateDataMonitorResultRecord,
  lateDataMonitorResultRef,
  normalizeLateDataMonitorResultRecord,
  type LateDataMonitorResultRecord,
} from "../models/late_data_monitor_result.ts";

export type StoredLateDataMonitorResultRecord = {
  late_data_monitor_id: string;
  late_data_monitor_ref: string;
  late_data_monitor_result: LateDataMonitorResultRecord;
  late_data_status: string;
  manifest_id: string;
  persisted_at: string;
  row_version: number;
};

export type LateDataMonitorResultRepositoryErrorCode =
  | "LATE_DATA_MONITOR_RESULT_DUPLICATE"
  | "LATE_DATA_MONITOR_RESULT_NOT_FOUND";

export class LateDataMonitorResultRepositoryError extends Error {
  readonly code: LateDataMonitorResultRepositoryErrorCode;

  constructor(code: LateDataMonitorResultRepositoryErrorCode, detail: string) {
    super(`${code}: ${detail}`);
    this.name = "LateDataMonitorResultRepositoryError";
    this.code = code;
  }
}

function cloneStored(record: StoredLateDataMonitorResultRecord) {
  return structuredClone(record);
}

function pushIndex(index: Map<string, string[]>, key: string, value: string) {
  const current = index.get(key) ?? [];
  if (!current.includes(value)) {
    current.push(value);
    index.set(key, current);
  }
}

export class LateDataMonitorResultRepository {
  private readonly idByRef = new Map<string, string>();
  private readonly idsByManifest = new Map<string, string[]>();
  private readonly idsByStatus = new Map<string, string[]>();
  private readonly monitorResults = new Map<string, StoredLateDataMonitorResultRecord>();

  private listByIds(ids: string[]) {
    return ids
      .map((id) => this.monitorResults.get(id))
      .filter((record): record is StoredLateDataMonitorResultRecord => record !== undefined)
      .sort((left, right) => left.persisted_at.localeCompare(right.persisted_at))
      .map((record) => cloneStored(record));
  }

  async persistLateDataMonitorResult(input: {
    late_data_monitor_result: LateDataMonitorResultRecord;
    persisted_at: string;
  }) {
    const monitorResult = normalizeLateDataMonitorResultRecord(input.late_data_monitor_result);
    const existing = this.monitorResults.get(monitorResult.late_data_monitor_id);
    if (existing) {
      if (JSON.stringify(existing.late_data_monitor_result) !== JSON.stringify(monitorResult)) {
        throw new LateDataMonitorResultRepositoryError(
          "LATE_DATA_MONITOR_RESULT_DUPLICATE",
          `late-data monitor result ${monitorResult.late_data_monitor_id} already exists with a different payload`,
        );
      }
      return cloneStored(existing);
    }

    const ref = lateDataMonitorResultRef(monitorResult);
    const stored: StoredLateDataMonitorResultRecord = {
      late_data_monitor_id: monitorResult.late_data_monitor_id,
      late_data_monitor_ref: ref,
      late_data_monitor_result: cloneLateDataMonitorResultRecord(monitorResult),
      late_data_status: monitorResult.late_data_status,
      manifest_id: monitorResult.manifest_id,
      persisted_at: input.persisted_at,
      row_version: 1,
    };
    this.monitorResults.set(stored.late_data_monitor_id, cloneStored(stored));
    this.idByRef.set(stored.late_data_monitor_ref, stored.late_data_monitor_id);
    pushIndex(this.idsByManifest, stored.manifest_id, stored.late_data_monitor_id);
    pushIndex(this.idsByStatus, `${stored.manifest_id}::${stored.late_data_status}`, stored.late_data_monitor_id);
    return cloneStored(stored);
  }

  async getLateDataMonitorResultById(lateDataMonitorId: string) {
    const stored = this.monitorResults.get(lateDataMonitorId);
    return stored ? cloneStored(stored) : null;
  }

  async getLateDataMonitorResultByRef(ref: string) {
    const id = this.idByRef.get(ref);
    return id ? this.getLateDataMonitorResultById(id) : null;
  }

  async requireLateDataMonitorResultById(lateDataMonitorId: string) {
    const stored = await this.getLateDataMonitorResultById(lateDataMonitorId);
    if (!stored) {
      throw new LateDataMonitorResultRepositoryError(
        "LATE_DATA_MONITOR_RESULT_NOT_FOUND",
        `late-data monitor result ${lateDataMonitorId} does not exist`,
      );
    }
    return stored;
  }

  async listLateDataMonitorResultsByManifestId(manifestId: string) {
    return this.listByIds(this.idsByManifest.get(manifestId) ?? []);
  }

  async listLateDataMonitorResultsByStatus(manifestId: string, lateDataStatus: string) {
    return this.listByIds(this.idsByStatus.get(`${manifestId}::${lateDataStatus}`) ?? []);
  }
}
