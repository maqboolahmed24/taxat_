import {
  cloneInputFreezeRecord,
  inputFreezeRef,
  normalizeInputFreezeRecord,
  type InputFreezeRecord,
} from "../models/input_freeze.ts";

export type StoredInputFreezeRecord = {
  input_freeze: InputFreezeRecord;
  input_freeze_id: string;
  input_freeze_ref: string;
  input_set_hash: string;
  manifest_id: string;
  persisted_at: string;
  row_version: number;
};

export type InputFreezeRepositoryErrorCode =
  | "INPUT_FREEZE_DUPLICATE"
  | "INPUT_FREEZE_HASH_COLLISION"
  | "INPUT_FREEZE_NOT_FOUND";

export class InputFreezeRepositoryError extends Error {
  readonly code: InputFreezeRepositoryErrorCode;

  constructor(code: InputFreezeRepositoryErrorCode, detail: string) {
    super(`${code}: ${detail}`);
    this.name = "InputFreezeRepositoryError";
    this.code = code;
  }
}

function cloneStored(record: StoredInputFreezeRecord) {
  return structuredClone(record);
}

function pushIndex(index: Map<string, string[]>, key: string, value: string) {
  const current = index.get(key) ?? [];
  if (!current.includes(value)) {
    current.push(value);
    index.set(key, current);
  }
}

export class InputFreezeRepository {
  private readonly freezes = new Map<string, StoredInputFreezeRecord>();
  private readonly idByInputSetHash = new Map<string, string>();
  private readonly idByRef = new Map<string, string>();
  private readonly idsByManifest = new Map<string, string[]>();

  private listByIds(ids: string[]) {
    return ids
      .map((id) => this.freezes.get(id))
      .filter((record): record is StoredInputFreezeRecord => record !== undefined)
      .sort((left, right) => left.persisted_at.localeCompare(right.persisted_at))
      .map((record) => cloneStored(record));
  }

  async persistInputFreeze(input: {
    input_freeze: InputFreezeRecord;
    persisted_at: string;
  }) {
    const inputFreeze = normalizeInputFreezeRecord(input.input_freeze);
    const existing = this.freezes.get(inputFreeze.input_freeze_id);
    if (existing) {
      if (JSON.stringify(existing.input_freeze) !== JSON.stringify(inputFreeze)) {
        throw new InputFreezeRepositoryError(
          "INPUT_FREEZE_DUPLICATE",
          `input freeze ${inputFreeze.input_freeze_id} already exists with a different payload`,
        );
      }
      return cloneStored(existing);
    }

    const hashOwner = this.idByInputSetHash.get(inputFreeze.input_set_hash);
    if (hashOwner !== undefined) {
      throw new InputFreezeRepositoryError(
        "INPUT_FREEZE_HASH_COLLISION",
        `input_set_hash already belongs to ${hashOwner}`,
      );
    }

    const ref = inputFreezeRef(inputFreeze);
    const stored: StoredInputFreezeRecord = {
      input_freeze: cloneInputFreezeRecord(inputFreeze),
      input_freeze_id: inputFreeze.input_freeze_id,
      input_freeze_ref: ref,
      input_set_hash: inputFreeze.input_set_hash,
      manifest_id: inputFreeze.manifest_id,
      persisted_at: input.persisted_at,
      row_version: 1,
    };
    this.freezes.set(stored.input_freeze_id, cloneStored(stored));
    this.idByInputSetHash.set(stored.input_set_hash, stored.input_freeze_id);
    this.idByRef.set(stored.input_freeze_ref, stored.input_freeze_id);
    pushIndex(this.idsByManifest, stored.manifest_id, stored.input_freeze_id);
    return cloneStored(stored);
  }

  async getInputFreezeById(inputFreezeId: string) {
    const stored = this.freezes.get(inputFreezeId);
    return stored ? cloneStored(stored) : null;
  }

  async getInputFreezeByRef(ref: string) {
    const id = this.idByRef.get(ref);
    return id ? this.getInputFreezeById(id) : null;
  }

  async getInputFreezeByInputSetHash(inputSetHash: string) {
    const id = this.idByInputSetHash.get(inputSetHash);
    return id ? this.getInputFreezeById(id) : null;
  }

  async requireInputFreezeById(inputFreezeId: string) {
    const stored = await this.getInputFreezeById(inputFreezeId);
    if (!stored) {
      throw new InputFreezeRepositoryError(
        "INPUT_FREEZE_NOT_FOUND",
        `input freeze ${inputFreezeId} does not exist`,
      );
    }
    return stored;
  }

  async listInputFreezesByManifestId(manifestId: string) {
    return this.listByIds(this.idsByManifest.get(manifestId) ?? []);
  }
}
