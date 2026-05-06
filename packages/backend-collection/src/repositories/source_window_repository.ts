import {
  cloneSourceWindowRecord,
  normalizeSourceWindowRecord,
  sourceWindowRef,
  type SourceWindowRecord,
} from "../models/source_window.ts";

export type StoredSourceWindowRecord = {
  manifest_id: string;
  persisted_at: string;
  source_plan_ref: string;
  source_window: SourceWindowRecord;
  source_window_hash: string;
  source_window_id: string;
  source_window_ref: string;
  source_window_row_version: number;
};

export type SourceWindowRepositoryErrorCode =
  | "SOURCE_WINDOW_DUPLICATE"
  | "SOURCE_WINDOW_NOT_FOUND";

export class SourceWindowRepositoryError extends Error {
  readonly code: SourceWindowRepositoryErrorCode;

  constructor(code: SourceWindowRepositoryErrorCode, detail: string) {
    super(`${code}: ${detail}`);
    this.name = "SourceWindowRepositoryError";
    this.code = code;
  }
}

function cloneStored(record: StoredSourceWindowRecord) {
  return structuredClone(record);
}

function pushIndex(index: Map<string, string[]>, key: string, value: string) {
  const current = index.get(key) ?? [];
  if (!current.includes(value)) {
    current.push(value);
    index.set(key, current);
  }
}

export class SourceWindowRepository {
  private readonly idByRef = new Map<string, string>();
  private readonly idsByManifest = new Map<string, string[]>();
  private readonly idsBySourcePlanRef = new Map<string, string[]>();
  private readonly windows = new Map<string, StoredSourceWindowRecord>();

  private listByIds(ids: string[]) {
    return ids
      .map((id) => this.windows.get(id))
      .filter((record): record is StoredSourceWindowRecord => record !== undefined)
      .sort((left, right) => left.persisted_at.localeCompare(right.persisted_at))
      .map((record) => cloneStored(record));
  }

  async persistSourceWindow(input: { persisted_at: string; source_window: SourceWindowRecord }) {
    const sourceWindow = normalizeSourceWindowRecord(input.source_window);
    const existing = this.windows.get(sourceWindow.source_window_id);
    if (existing) {
      if (JSON.stringify(existing.source_window) !== JSON.stringify(sourceWindow)) {
        throw new SourceWindowRepositoryError(
          "SOURCE_WINDOW_DUPLICATE",
          `source window ${sourceWindow.source_window_id} already exists with a different payload`,
        );
      }
      return cloneStored(existing);
    }

    const ref = sourceWindowRef(sourceWindow);
    const stored: StoredSourceWindowRecord = {
      manifest_id: sourceWindow.manifest_id,
      persisted_at: input.persisted_at,
      source_plan_ref: sourceWindow.source_plan_ref,
      source_window: cloneSourceWindowRecord(sourceWindow),
      source_window_hash: sourceWindow.source_window_hash,
      source_window_id: sourceWindow.source_window_id,
      source_window_ref: ref,
      source_window_row_version: 1,
    };
    this.windows.set(stored.source_window_id, cloneStored(stored));
    this.idByRef.set(stored.source_window_ref, stored.source_window_id);
    pushIndex(this.idsByManifest, stored.manifest_id, stored.source_window_id);
    pushIndex(this.idsBySourcePlanRef, stored.source_plan_ref, stored.source_window_id);
    return cloneStored(stored);
  }

  async getSourceWindowById(sourceWindowId: string) {
    const stored = this.windows.get(sourceWindowId);
    return stored ? cloneStored(stored) : null;
  }

  async getSourceWindowByRef(sourceWindowRefValue: string) {
    const id = this.idByRef.get(sourceWindowRefValue);
    return id ? this.getSourceWindowById(id) : null;
  }

  async requireSourceWindowById(sourceWindowId: string) {
    const stored = await this.getSourceWindowById(sourceWindowId);
    if (!stored) {
      throw new SourceWindowRepositoryError(
        "SOURCE_WINDOW_NOT_FOUND",
        `source window ${sourceWindowId} does not exist`,
      );
    }
    return stored;
  }

  async listSourceWindowsByManifestId(manifestId: string) {
    return this.listByIds(this.idsByManifest.get(manifestId) ?? []);
  }

  async listSourceWindowsBySourcePlanRef(sourcePlanRef: string) {
    return this.listByIds(this.idsBySourcePlanRef.get(sourcePlanRef) ?? []);
  }
}
