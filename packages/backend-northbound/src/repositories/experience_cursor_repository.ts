import {
  acknowledgeStreamCursor,
  expireStreamCursorIfNeeded,
  touchStreamCursor,
  transitionStreamCursor,
  type ExperienceCursorRecord,
} from "../../../domain-kernel/src/streaming/cursor_store.ts";
import {
  validateExperienceCursorRecord,
  type CursorInvalidationReasonCode,
  type StreamCursorState,
} from "../models/experience_cursor.ts";

export type PersistExperienceCursorInput = {
  cursor: ExperienceCursorRecord;
};

export type ExperienceCursorRepositoryLike = {
  acknowledgeCursor: (
    cursorId: string,
    input: {
      at: string;
      lastPublishedSequenceOrNull?: number | null;
      sequence: number;
    },
  ) => Promise<ExperienceCursorRecord> | ExperienceCursorRecord;
  expireCursorIfNeeded: (
    cursorId: string,
    at: string,
  ) => Promise<ExperienceCursorRecord> | ExperienceCursorRecord;
  findLatestCursorByResumeTokenHash: (
    resumeTokenHash: string,
  ) => Promise<ExperienceCursorRecord | null> | ExperienceCursorRecord | null;
  getCursorById: (
    cursorId: string,
  ) => Promise<ExperienceCursorRecord | null> | ExperienceCursorRecord | null;
  listCursors: () => Promise<ExperienceCursorRecord[]> | ExperienceCursorRecord[];
  saveCursor: (
    input: PersistExperienceCursorInput,
  ) => Promise<ExperienceCursorRecord> | ExperienceCursorRecord;
  touchCursor: (
    cursorId: string,
    at: string,
  ) => Promise<ExperienceCursorRecord> | ExperienceCursorRecord;
  transitionCursor: (
    cursorId: string,
    input: {
      at: string;
      nextState: Exclude<StreamCursorState, "LIVE">;
      reasonCode: Exclude<CursorInvalidationReasonCode, null>;
      replacementSnapshotRef?: string | null;
      replacementStabilityContractOrNull?: Record<string, unknown> | null;
    },
  ) => Promise<ExperienceCursorRecord> | ExperienceCursorRecord;
};

function cursorSortTime(cursor: ExperienceCursorRecord) {
  const lastSeen = Date.parse(cursor.last_seen_at);
  return Number.isFinite(lastSeen) ? lastSeen : 0;
}

function assertExperienceCursor(cursor: ExperienceCursorRecord) {
  return validateExperienceCursorRecord(cursor);
}

export class ExperienceCursorRepository implements ExperienceCursorRepositoryLike {
  readonly #cursorsById = new Map<string, ExperienceCursorRecord>();

  acknowledgeCursor(
    cursorId: string,
    input: {
      at: string;
      lastPublishedSequenceOrNull?: number | null;
      sequence: number;
    },
  ) {
    const existing = this.#cursorsById.get(cursorId) ?? null;
    if (existing === null) {
      throw new Error(`missing experience cursor ${cursorId}`);
    }
    const cursor = acknowledgeStreamCursor(existing, {
      at: input.at,
      last_published_sequence_or_null: input.lastPublishedSequenceOrNull ?? null,
      sequence: input.sequence,
    }) as ExperienceCursorRecord;
    this.#cursorsById.set(cursor.cursor_id, assertExperienceCursor(cursor));
    return cursor;
  }

  expireCursorIfNeeded(cursorId: string, at: string) {
    const existing = this.#cursorsById.get(cursorId) ?? null;
    if (existing === null) {
      throw new Error(`missing experience cursor ${cursorId}`);
    }
    const cursor = expireStreamCursorIfNeeded(existing, at) as ExperienceCursorRecord;
    this.#cursorsById.set(cursor.cursor_id, assertExperienceCursor(cursor));
    return cursor;
  }

  findLatestCursorByResumeTokenHash(resumeTokenHash: string) {
    const matching = [...this.#cursorsById.values()].filter(
      (cursor) => cursor.resume_token_hash === resumeTokenHash,
    );
    return matching.sort((left, right) => cursorSortTime(left) - cursorSortTime(right)).at(-1) ?? null;
  }

  getCursorById(cursorId: string) {
    return this.#cursorsById.get(cursorId) ?? null;
  }

  listCursors() {
    return [...this.#cursorsById.values()];
  }

  saveCursor(input: PersistExperienceCursorInput) {
    const cursor = assertExperienceCursor(input.cursor);
    this.#cursorsById.set(cursor.cursor_id, cursor);
    return cursor;
  }

  touchCursor(cursorId: string, at: string) {
    const existing = this.#cursorsById.get(cursorId) ?? null;
    if (existing === null) {
      throw new Error(`missing experience cursor ${cursorId}`);
    }
    const cursor = touchStreamCursor(existing, at) as ExperienceCursorRecord;
    this.#cursorsById.set(cursor.cursor_id, assertExperienceCursor(cursor));
    return cursor;
  }

  transitionCursor(
    cursorId: string,
    input: {
      at: string;
      nextState: Exclude<StreamCursorState, "LIVE">;
      reasonCode: Exclude<CursorInvalidationReasonCode, null>;
      replacementSnapshotRef?: string | null;
      replacementStabilityContractOrNull?: Record<string, unknown> | null;
    },
  ) {
    const existing = this.#cursorsById.get(cursorId) ?? null;
    if (existing === null) {
      throw new Error(`missing experience cursor ${cursorId}`);
    }
    const cursor = transitionStreamCursor(existing, {
      at: input.at,
      next_state: input.nextState,
      reason_code: input.reasonCode,
      replacement_snapshot_ref: input.replacementSnapshotRef ?? null,
      replacement_stability_contract_or_null:
        input.replacementStabilityContractOrNull ?? null,
    }) as ExperienceCursorRecord;
    this.#cursorsById.set(cursor.cursor_id, assertExperienceCursor(cursor));
    return cursor;
  }
}
