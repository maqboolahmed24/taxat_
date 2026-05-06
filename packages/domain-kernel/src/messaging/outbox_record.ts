import { asTaxatRef, type TaxatRef } from "../primitives/identifier.ts";
import { normalizeUtcInstantString } from "../primitives/time.ts";
import { stableJsonHash } from "../primitives/hash.ts";
import { type EventEnvelope, type MessageFamilyRef } from "./event_envelope.ts";

export type RetryBudgetPolicy = {
  deadLetterMode: "DEAD_LETTER_QUEUE_REQUIRED" | "QUARANTINE_INBOX_REQUIRED";
  maxDeliveryAttempts: number;
};

export type OutboxLifecycleState =
  | "PENDING_PUBLICATION"
  | "PUBLISHED"
  | "ACKNOWLEDGED"
  | "DEAD_LETTERED";

export type OutboxPublishAttempt = {
  attemptNumber: number;
  deadLetterMode: RetryBudgetPolicy["deadLetterMode"];
  packetId: string;
  recordedAt: string;
  reasonCodes: string[];
  result: "PUBLISHED" | "RETRY_SCHEDULED" | "DEAD_LETTERED";
};

export type OutboxRecord = {
  channelRef: string;
  createdAt: string;
  deadLetterMode: RetryBudgetPolicy["deadLetterMode"];
  duplicateMeaningKey: string;
  idempotencyKey: string;
  lifecycleState: OutboxLifecycleState;
  messageFamilyRef: MessageFamilyRef;
  orderDomainKey: string;
  outboxRecordRef: TaxatRef<"outbox-record">;
  publishAttempts: OutboxPublishAttempt[];
  publishedPacketIds: string[];
  requestHash: string;
  sourceRecordRef: string;
  sourceRecordVersionHash: string;
  updatedAt: string;
};

export function createOutboxRecordFromEnvelope(
  envelope: EventEnvelope,
  createdAt: string,
  deadLetterMode: RetryBudgetPolicy["deadLetterMode"] = "DEAD_LETTER_QUEUE_REQUIRED",
): OutboxRecord {
  const timestamp = normalizeUtcInstantString(createdAt);

  return {
    channelRef: envelope.channelRef,
    createdAt: timestamp,
    deadLetterMode,
    duplicateMeaningKey: envelope.identity.duplicateMeaningKey,
    idempotencyKey: envelope.identity.idempotencyKey,
    lifecycleState: "PENDING_PUBLICATION",
    messageFamilyRef: envelope.messageFamilyRef,
    orderDomainKey: envelope.orderDomainKey,
    outboxRecordRef: asTaxatRef(
      `outbox-record.${stableJsonHash({
        duplicate_meaning_key: envelope.identity.duplicateMeaningKey,
        source_record_ref: envelope.sourceRecordRef,
      })}`,
      "outbox-record",
    ),
    publishAttempts: [],
    publishedPacketIds: [],
    requestHash: envelope.identity.requestHash,
    sourceRecordRef: envelope.sourceRecordRef,
    sourceRecordVersionHash: envelope.sourceRecordVersionHash,
    updatedAt: timestamp,
  };
}

function assertEnvelopeMatchesRecord(record: OutboxRecord, envelope: EventEnvelope) {
  if (
    record.duplicateMeaningKey !== envelope.identity.duplicateMeaningKey ||
    record.idempotencyKey !== envelope.identity.idempotencyKey ||
    record.requestHash !== envelope.identity.requestHash ||
    record.sourceRecordRef !== envelope.sourceRecordRef
  ) {
    throw new Error("Outbox retry envelopes must reuse the persisted semantic identity.");
  }
}

export function markOutboxPublished(
  record: OutboxRecord,
  envelope: EventEnvelope,
  publishedAt: string,
): OutboxRecord {
  assertEnvelopeMatchesRecord(record, envelope);
  const timestamp = normalizeUtcInstantString(publishedAt);

  return {
    ...record,
    lifecycleState: "PUBLISHED",
    publishAttempts: [
      ...record.publishAttempts,
      {
        attemptNumber: record.publishAttempts.length + 1,
        deadLetterMode: record.deadLetterMode,
        packetId: envelope.packetId,
        reasonCodes: [],
        recordedAt: timestamp,
        result: "PUBLISHED",
      },
    ],
    publishedPacketIds: [...new Set([...record.publishedPacketIds, envelope.packetId])],
    updatedAt: timestamp,
  };
}

export function registerOutboxFailure(
  record: OutboxRecord,
  envelope: EventEnvelope,
  policy: RetryBudgetPolicy,
  failedAt: string,
  reasonCode: string,
): OutboxRecord {
  assertEnvelopeMatchesRecord(record, envelope);
  const timestamp = normalizeUtcInstantString(failedAt);
  const nextAttemptNumber = record.publishAttempts.length + 1;
  const exhausted = nextAttemptNumber >= policy.maxDeliveryAttempts;

  return {
    ...record,
    deadLetterMode: policy.deadLetterMode,
    lifecycleState: exhausted ? "DEAD_LETTERED" : "PENDING_PUBLICATION",
    publishAttempts: [
      ...record.publishAttempts,
      {
        attemptNumber: nextAttemptNumber,
        deadLetterMode: policy.deadLetterMode,
        packetId: envelope.packetId,
        reasonCodes: [reasonCode],
        recordedAt: timestamp,
        result: exhausted ? "DEAD_LETTERED" : "RETRY_SCHEDULED",
      },
    ],
    publishedPacketIds: [...new Set([...record.publishedPacketIds, envelope.packetId])],
    updatedAt: timestamp,
  };
}

export function acknowledgeOutboxRecord(record: OutboxRecord, acknowledgedAt: string): OutboxRecord {
  return {
    ...record,
    lifecycleState: "ACKNOWLEDGED",
    updatedAt: normalizeUtcInstantString(acknowledgedAt),
  };
}
