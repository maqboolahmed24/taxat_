import type { UploadTransferAggregate } from "../../../../packages/domain-kernel/src/uploads/upload_transfer_service.ts";
import {
  assertClientUploadSessionContract,
  cloneClientUploadSession,
  type ClientUploadSessionRecord,
} from "../models/client_upload_session.ts";

export type StoredClientUploadSessionRecord = {
  aggregate: UploadTransferAggregate;
  duplicate_suppression_key: string;
  latest_persisted_at: string;
};

export type PersistClientUploadSessionInput = {
  aggregate: UploadTransferAggregate;
  duplicateSuppressionKey: string;
  persistedAt: string;
};

export type ClientUploadSessionRepositoryLike = {
  findByDuplicateSuppressionKey: (
    duplicateSuppressionKey: string,
  ) => Promise<StoredClientUploadSessionRecord | null> | StoredClientUploadSessionRecord | null;
  findByUploadSessionId: (
    uploadSessionId: string,
  ) => Promise<StoredClientUploadSessionRecord | null> | StoredClientUploadSessionRecord | null;
  persistUploadSession: (
    input: PersistClientUploadSessionInput,
  ) => Promise<StoredClientUploadSessionRecord> | StoredClientUploadSessionRecord;
};

function cloneAggregate(aggregate: UploadTransferAggregate): UploadTransferAggregate {
  return JSON.parse(JSON.stringify(aggregate)) as UploadTransferAggregate;
}

function cloneStored(record: StoredClientUploadSessionRecord): StoredClientUploadSessionRecord {
  return {
    aggregate: cloneAggregate(record.aggregate),
    duplicate_suppression_key: record.duplicate_suppression_key,
    latest_persisted_at: record.latest_persisted_at,
  };
}

function sameStableJson(left: unknown, right: unknown) {
  return JSON.stringify(left) === JSON.stringify(right);
}

export class ClientUploadSessionRepository implements ClientUploadSessionRepositoryLike {
  readonly #duplicateKeyByUploadSessionId = new Map<string, string>();
  readonly #sessionIdByDuplicateKey = new Map<string, string>();
  readonly #recordsByUploadSessionId = new Map<string, StoredClientUploadSessionRecord>();

  async persistUploadSession(input: PersistClientUploadSessionInput) {
    assertClientUploadSessionContract(input.aggregate.session);
    const uploadSessionId = input.aggregate.session.upload_session_id;
    const existing = this.#recordsByUploadSessionId.get(uploadSessionId);
    if (existing !== undefined) {
      if (existing.duplicate_suppression_key !== input.duplicateSuppressionKey) {
        throw new Error(`upload session ${uploadSessionId} cannot change duplicate suppression key`);
      }
      const stored = {
        aggregate: cloneAggregate(input.aggregate),
        duplicate_suppression_key: input.duplicateSuppressionKey,
        latest_persisted_at: input.persistedAt,
      } satisfies StoredClientUploadSessionRecord;
      this.#recordsByUploadSessionId.set(uploadSessionId, stored);
      return cloneStored(stored);
    }

    const owner = this.#sessionIdByDuplicateKey.get(input.duplicateSuppressionKey);
    if (owner !== undefined && owner !== uploadSessionId) {
      throw new Error(`duplicate upload session allocation suppressed by ${owner}`);
    }

    const stored = {
      aggregate: cloneAggregate(input.aggregate),
      duplicate_suppression_key: input.duplicateSuppressionKey,
      latest_persisted_at: input.persistedAt,
    } satisfies StoredClientUploadSessionRecord;
    this.#recordsByUploadSessionId.set(uploadSessionId, stored);
    this.#sessionIdByDuplicateKey.set(input.duplicateSuppressionKey, uploadSessionId);
    this.#duplicateKeyByUploadSessionId.set(uploadSessionId, input.duplicateSuppressionKey);
    return cloneStored(stored);
  }

  async findByUploadSessionId(uploadSessionId: string) {
    const stored = this.#recordsByUploadSessionId.get(uploadSessionId);
    return stored === undefined ? null : cloneStored(stored);
  }

  async findByDuplicateSuppressionKey(duplicateSuppressionKey: string) {
    const uploadSessionId = this.#sessionIdByDuplicateKey.get(duplicateSuppressionKey);
    if (uploadSessionId === undefined) {
      return null;
    }
    const stored = this.#recordsByUploadSessionId.get(uploadSessionId);
    return stored === undefined ? null : cloneStored(stored);
  }

  async listUploadSessions() {
    return [...this.#recordsByUploadSessionId.values()].map(cloneStored);
  }

  async getDuplicateSuppressionKey(uploadSessionId: string) {
    return this.#duplicateKeyByUploadSessionId.get(uploadSessionId) ?? null;
  }

  async assertNoDuplicateSessionMutation(record: StoredClientUploadSessionRecord) {
    const current = this.#recordsByUploadSessionId.get(record.aggregate.session.upload_session_id);
    if (current !== undefined && !sameStableJson(current.duplicate_suppression_key, record.duplicate_suppression_key)) {
      throw new Error("upload session duplicate key drifted");
    }
    return true;
  }
}

export function exposedClientUploadSession(
  stored: StoredClientUploadSessionRecord,
): ClientUploadSessionRecord {
  assertClientUploadSessionContract(stored.aggregate.session);
  return cloneClientUploadSession(stored.aggregate.session);
}
