import type { ExperienceStreamEvent } from "../../../../packages/generated-models/src/generated/typescript/surface-and-experience.ts";
import {
  advanceSequenceWindow,
  openSequenceWindow,
} from "../../../domain-kernel/src/streaming/sequence_window.ts";
import type { ExperienceCursorRecord } from "../models/experience_cursor.ts";
import { validateExperienceStreamEvent } from "../streams/serialize_experience_stream_event.ts";

export type StoredExperienceStreamEventRecord = {
  event: ExperienceStreamEvent;
  experience_sequence: number;
  frame_epoch: number;
  manifest_id: string;
};

export type PersistExperienceStreamEventInput = {
  event: ExperienceStreamEvent;
};

export type ExperienceStreamEventRepositoryLike = {
  listEventsByManifestFrame: (
    manifestId: string,
    frameEpoch: number,
  ) => Promise<StoredExperienceStreamEventRecord[]> | StoredExperienceStreamEventRecord[];
  persistEvent?: (
    input: PersistExperienceStreamEventInput,
  ) => Promise<StoredExperienceStreamEventRecord> | StoredExperienceStreamEventRecord;
};

export class ManifestCatchUpEventsError extends Error {
  readonly reasonCodes: string[];

  constructor(message: string, reasonCodes: string[]) {
    super(message);
    this.name = "ManifestCatchUpEventsError";
    this.reasonCodes = reasonCodes;
  }
}

function fail(message: string, reasonCodes: string[]): never {
  throw new ManifestCatchUpEventsError(message, reasonCodes);
}

function eventSort(
  left: StoredExperienceStreamEventRecord,
  right: StoredExperienceStreamEventRecord,
) {
  if (left.experience_sequence !== right.experience_sequence) {
    return left.experience_sequence - right.experience_sequence;
  }
  return Date.parse(left.event.occurred_at) - Date.parse(right.event.occurred_at);
}

export class ExperienceStreamEventRepository implements ExperienceStreamEventRepositoryLike {
  readonly #eventsByManifestId = new Map<string, StoredExperienceStreamEventRecord[]>();

  persistEvent(input: PersistExperienceStreamEventInput) {
    const event = validateExperienceStreamEvent(input.event);
    const stored = {
      event,
      experience_sequence: event.experience_sequence,
      frame_epoch: event.frame_epoch,
      manifest_id: event.manifest_id,
    } satisfies StoredExperienceStreamEventRecord;
    const existing = this.#eventsByManifestId.get(event.manifest_id) ?? [];
    this.#eventsByManifestId.set(event.manifest_id, [...existing, stored]);
    return stored;
  }

  listEventsByManifestFrame(manifestId: string, frameEpoch: number) {
    return (this.#eventsByManifestId.get(manifestId) ?? []).filter(
      (event) => event.frame_epoch === frameEpoch,
    );
  }
}

export async function loadManifestCatchUpEvents(input: {
  cursor: ExperienceCursorRecord;
  eventRepository: ExperienceStreamEventRepositoryLike;
}) {
  if (input.cursor.last_ack_sequence > input.cursor.last_published_sequence) {
    fail("cursor acknowledged beyond the published stream frontier", [
      "EXPERIENCE_CURSOR_ACK_EXCEEDS_FRONTIER",
    ]);
  }
  const compactionFloor =
    input.cursor.stream_recovery_contract.compaction_floor_sequence_or_null;
  if (compactionFloor !== null && input.cursor.last_ack_sequence < compactionFloor) {
    fail("cursor fell below the compaction floor", ["HISTORY_COMPACTED"]);
  }

  const allEvents = await input.eventRepository.listEventsByManifestFrame(
    input.cursor.manifest_id,
    input.cursor.frame_epoch,
  );
  const candidates = allEvents
    .filter(
      (record) =>
        record.experience_sequence > input.cursor.last_ack_sequence &&
        record.experience_sequence <= input.cursor.last_published_sequence,
    )
    .sort(eventSort);
  let window = openSequenceWindow({
    initial_last_applied_sequence: input.cursor.last_ack_sequence,
    stream_recovery_contract: input.cursor.stream_recovery_contract,
  });
  const events: ExperienceStreamEvent[] = [];
  const skippedDuplicates: ExperienceStreamEvent[] = [];

  for (const record of candidates) {
    const event = validateExperienceStreamEvent(record.event);
    if (event.manifest_id !== input.cursor.manifest_id) {
      fail("catch-up event manifest drifted", ["EXPERIENCE_STREAM_EVENT_SUBJECT_DRIFT"]);
    }
    if (event.frame_epoch !== input.cursor.frame_epoch) {
      fail("catch-up event crossed frame epoch", ["FRAME_EPOCH_ADVANCED"]);
    }
    const advanced = advanceSequenceWindow(window, event);
    if (advanced.decision.code === "APPLY") {
      events.push(event);
      window = advanced.next_state;
      continue;
    }
    if (advanced.decision.code === "ACK_DUPLICATE") {
      skippedDuplicates.push(event);
      window = advanced.next_state;
      continue;
    }
    if (advanced.decision.code === "REBASE_REQUIRED") {
      fail(advanced.decision.summary, advanced.decision.reason_codes);
    }
    if (advanced.decision.code === "BLOCK_GAP") {
      fail(advanced.decision.summary, advanced.decision.reason_codes);
    }
  }

  if (window.last_applied_sequence < input.cursor.last_published_sequence) {
    fail("catch-up stream is missing one or more required event sequences", [
      "SEQUENCE_GAP_DETECTED",
    ]);
  }

  return {
    catchUpComplete: true,
    events,
    nextLastAckSequence: window.last_applied_sequence,
    skippedDuplicates,
  };
}
