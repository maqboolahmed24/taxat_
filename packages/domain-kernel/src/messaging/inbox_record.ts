import { asTaxatRef, type TaxatRef } from "../primitives/identifier.ts";
import { normalizeUtcInstantString } from "../primitives/time.ts";
import { stableJsonHash } from "../primitives/hash.ts";
import { type CorrelationContract } from "./correlation.ts";
import { type EventEnvelope, type MessageFamilyRef } from "./event_envelope.ts";
import { type RetryBudgetPolicy } from "./outbox_record.ts";

export type SourceRecordContinuityState = "CURRENT" | "MISSING" | "STALE";

export type InboxLifecycleState =
  | "RECEIVED"
  | "CLAIMED"
  | "SIDE_EFFECT_APPLIED"
  | "ACKNOWLEDGED"
  | "QUARANTINED"
  | "DEAD_LETTERED";

export type InboxDecisionCode =
  | "ACCEPT_FOR_PROCESSING"
  | "DUPLICATE_PACKET_REDELIVERY"
  | "DUPLICATE_MEANING_REUSED"
  | "ACK_FROM_PERSISTED_EFFECT"
  | "ACK_FROM_COMPLETED_EFFECT"
  | "QUARANTINE_SOURCE_RECORD_MISSING"
  | "QUARANTINE_SOURCE_RECORD_STALE"
  | "RETRY_SCHEDULED"
  | "DEAD_LETTER";

export type InboxDecision = {
  ackImmediately: boolean;
  code: InboxDecisionCode;
  reasonCodes: string[];
  safeToApplyMutation: boolean;
};

export type InboxRecord = {
  ackedAtOrNull: string | null;
  channelRef: string;
  correlation: CorrelationContract;
  createdAt: string;
  deadLetterReasonCodes: string[];
  deliveryDedupeKeys: string[];
  duplicateMeaningKey: string;
  duplicatePacketCount: number;
  idempotencyKey: string;
  inboxRecordRef: TaxatRef<"inbox-record">;
  lifecycleState: InboxLifecycleState;
  messageFamilyRef: MessageFamilyRef;
  mutationEffectRefOrNull: string | null;
  packetIds: string[];
  quarantineReasonCodes: string[];
  receiveCount: number;
  requestHash: string;
  safeRetryCount: number;
  semanticReplayCount: number;
  sideEffectAppliedAtOrNull: string | null;
  sourceRecordContinuityState: SourceRecordContinuityState;
  sourceRecordRef: string;
  sourceRecordVersionHash: string;
  updatedAt: string;
};

export type ApplyInboxDeliveryResult = {
  decision: InboxDecision;
  record: InboxRecord;
};

export type RegisterInboxFailureResult = {
  decision: InboxDecision;
  record: InboxRecord;
};

function createInboxRecord(
  envelope: EventEnvelope,
  receivedAt: string,
  sourceRecordContinuityState: SourceRecordContinuityState,
): InboxRecord {
  const timestamp = normalizeUtcInstantString(receivedAt);

  return {
    ackedAtOrNull: null,
    channelRef: envelope.channelRef,
    correlation: envelope.correlation,
    createdAt: timestamp,
    deadLetterReasonCodes: [],
    deliveryDedupeKeys: [envelope.deliveryDedupeKey],
    duplicateMeaningKey: envelope.identity.duplicateMeaningKey,
    duplicatePacketCount: 0,
    idempotencyKey: envelope.identity.idempotencyKey,
    inboxRecordRef: asTaxatRef(
      `inbox-record.${stableJsonHash({
        duplicate_meaning_key: envelope.identity.duplicateMeaningKey,
        source_record_ref: envelope.sourceRecordRef,
      })}`,
      "inbox-record",
    ),
    lifecycleState:
      sourceRecordContinuityState === "CURRENT" ? "RECEIVED" : "QUARANTINED",
    messageFamilyRef: envelope.messageFamilyRef,
    mutationEffectRefOrNull: null,
    packetIds: [envelope.packetId],
    quarantineReasonCodes:
      sourceRecordContinuityState === "MISSING"
        ? ["SOURCE_RECORD_REF_MISSING"]
        : sourceRecordContinuityState === "STALE"
          ? ["SOURCE_RECORD_REF_STALE"]
          : [],
    receiveCount: 1,
    requestHash: envelope.identity.requestHash,
    safeRetryCount: 0,
    semanticReplayCount: 0,
    sideEffectAppliedAtOrNull: null,
    sourceRecordContinuityState,
    sourceRecordRef: envelope.sourceRecordRef,
    sourceRecordVersionHash: envelope.sourceRecordVersionHash,
    updatedAt: timestamp,
  };
}

function decisionForQuarantine(
  continuityState: SourceRecordContinuityState,
  reasonCodes: string[],
): InboxDecision {
  return {
    ackImmediately: false,
    code:
      continuityState === "MISSING"
        ? "QUARANTINE_SOURCE_RECORD_MISSING"
        : "QUARANTINE_SOURCE_RECORD_STALE",
    reasonCodes,
    safeToApplyMutation: false,
  };
}

function sameSemanticIdentity(record: InboxRecord, envelope: EventEnvelope) {
  return (
    record.duplicateMeaningKey === envelope.identity.duplicateMeaningKey &&
    record.idempotencyKey === envelope.identity.idempotencyKey &&
    record.requestHash === envelope.identity.requestHash &&
    record.sourceRecordRef === envelope.sourceRecordRef
  );
}

export function applyInboxDelivery(
  current: InboxRecord | null,
  envelope: EventEnvelope,
  receivedAt: string,
  sourceRecordContinuityState: SourceRecordContinuityState,
): ApplyInboxDeliveryResult {
  if (!current) {
    const record = createInboxRecord(envelope, receivedAt, sourceRecordContinuityState);
    if (sourceRecordContinuityState !== "CURRENT") {
      return {
        decision: decisionForQuarantine(
          sourceRecordContinuityState,
          record.quarantineReasonCodes,
        ),
        record,
      };
    }

    return {
      decision: {
        ackImmediately: false,
        code: "ACCEPT_FOR_PROCESSING",
        reasonCodes: [],
        safeToApplyMutation: true,
      },
      record,
    };
  }

  if (!sameSemanticIdentity(current, envelope)) {
    throw new Error("Inbox records may only absorb deliveries for the same persisted semantic tuple.");
  }

  const timestamp = normalizeUtcInstantString(receivedAt);
  const packetSeen = current.packetIds.includes(envelope.packetId);
  const nextRecord: InboxRecord = {
    ...current,
    correlation: envelope.correlation,
    deliveryDedupeKeys: [...new Set([...current.deliveryDedupeKeys, envelope.deliveryDedupeKey])],
    duplicatePacketCount: current.duplicatePacketCount + (packetSeen ? 1 : 0),
    packetIds: [...new Set([...current.packetIds, envelope.packetId])],
    receiveCount: current.receiveCount + 1,
    semanticReplayCount: current.semanticReplayCount + (packetSeen ? 0 : 1),
    sourceRecordContinuityState,
    updatedAt: timestamp,
  };

  if (sourceRecordContinuityState !== "CURRENT") {
    const quarantineReasonCodes =
      sourceRecordContinuityState === "MISSING"
        ? ["SOURCE_RECORD_REF_MISSING"]
        : ["SOURCE_RECORD_REF_STALE"];

    return {
      decision: decisionForQuarantine(sourceRecordContinuityState, quarantineReasonCodes),
      record: {
        ...nextRecord,
        lifecycleState: "QUARANTINED",
        quarantineReasonCodes,
      },
    };
  }

  if (nextRecord.lifecycleState === "SIDE_EFFECT_APPLIED") {
    return {
      decision: {
        ackImmediately: true,
        code: "ACK_FROM_PERSISTED_EFFECT",
        reasonCodes: ["SIDE_EFFECT_ALREADY_PERSISTED"],
        safeToApplyMutation: false,
      },
      record: nextRecord,
    };
  }

  if (nextRecord.lifecycleState === "ACKNOWLEDGED") {
    return {
      decision: {
        ackImmediately: true,
        code: "ACK_FROM_COMPLETED_EFFECT",
        reasonCodes: ["INBOX_ALREADY_ACKNOWLEDGED"],
        safeToApplyMutation: false,
      },
      record: nextRecord,
    };
  }

  if (packetSeen) {
    return {
      decision: {
        ackImmediately: false,
        code: "DUPLICATE_PACKET_REDELIVERY",
        reasonCodes: ["PACKET_ID_ALREADY_SEEN"],
        safeToApplyMutation: false,
      },
      record: nextRecord,
    };
  }

  return {
    decision: {
      ackImmediately: false,
      code: "DUPLICATE_MEANING_REUSED",
      reasonCodes: ["DUPLICATE_MEANING_ALREADY_CLAIMED"],
      safeToApplyMutation: false,
    },
    record: nextRecord,
  };
}

export function claimInboxRecord(record: InboxRecord, claimedAt: string): InboxRecord {
  return {
    ...record,
    lifecycleState: "CLAIMED",
    updatedAt: normalizeUtcInstantString(claimedAt),
  };
}

export function recordInboxSideEffect(
  record: InboxRecord,
  effectRef: string,
  appliedAt: string,
): InboxRecord {
  const timestamp = normalizeUtcInstantString(appliedAt);

  return {
    ...record,
    lifecycleState: "SIDE_EFFECT_APPLIED",
    mutationEffectRefOrNull: effectRef,
    sideEffectAppliedAtOrNull: timestamp,
    updatedAt: timestamp,
  };
}

export function acknowledgeInboxRecord(record: InboxRecord, acknowledgedAt: string): InboxRecord {
  const timestamp = normalizeUtcInstantString(acknowledgedAt);

  return {
    ...record,
    ackedAtOrNull: timestamp,
    lifecycleState: "ACKNOWLEDGED",
    updatedAt: timestamp,
  };
}

export function registerInboxFailure(
  record: InboxRecord,
  policy: RetryBudgetPolicy,
  failedAt: string,
  reasonCode: string,
): RegisterInboxFailureResult {
  const timestamp = normalizeUtcInstantString(failedAt);
  const nextSafeRetryCount = record.safeRetryCount + 1;
  const exhausted = nextSafeRetryCount >= policy.maxDeliveryAttempts;
  const nextRecord: InboxRecord = {
    ...record,
    deadLetterReasonCodes: exhausted
      ? [...new Set([...record.deadLetterReasonCodes, reasonCode, "MAX_ATTEMPTS_EXHAUSTED"])]
      : record.deadLetterReasonCodes,
    lifecycleState: exhausted ? "DEAD_LETTERED" : "RECEIVED",
    safeRetryCount: nextSafeRetryCount,
    updatedAt: timestamp,
  };

  return {
    decision: {
      ackImmediately: exhausted,
      code: exhausted ? "DEAD_LETTER" : "RETRY_SCHEDULED",
      reasonCodes: exhausted
        ? nextRecord.deadLetterReasonCodes
        : [reasonCode, policy.deadLetterMode],
      safeToApplyMutation: false,
    },
    record: nextRecord,
  };
}
