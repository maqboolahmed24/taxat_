import { expect, test } from "@playwright/test";

import { createEventEnvelope } from "../../../packages/domain-kernel/src/messaging/event_envelope.ts";
import {
  acknowledgeInboxRecord,
  applyInboxDelivery,
  claimInboxRecord,
  recordInboxSideEffect,
  registerInboxFailure,
} from "../../../packages/domain-kernel/src/messaging/inbox_record.ts";
import {
  acknowledgeOutboxRecord,
  createOutboxRecordFromEnvelope,
  markOutboxPublished,
} from "../../../packages/domain-kernel/src/messaging/outbox_record.ts";

function stageEnvelope(packetId: string) {
  const genericIdentityInput = {
    channelRef: "channel.manifest.stage.dispatch",
    consumerRef: "worker.stage-runner",
    familyRef: "ManifestStageDispatchReceipt",
    payload: {
      manifest_ref: "manifest.case-2026-04-23",
      precondition_hash:
        "3d297f287271a6c71e75645d704d2218dd188098caec1b2bc774d3b307277a88",
      stage_code: "COMPUTE_OBLIGATIONS",
    },
    producerRef: "orchestrator.stage-dispatch",
    scopeRef: "STAGE_TASK" as const,
    semanticOperationRef: "COMPUTE_OBLIGATIONS",
    semanticTargetRef: "manifest.case-2026-04-23.stage.compute-obligations",
    sourceRecordRef: "dispatch.stage.case-2026-04-23.compute-obligations",
    sourceRecordVersionHash:
      "009ed2e6777f1f3f550dd7afd7d9c285679364e037ef0ef3874f6dfebeaa5c60",
    tenantId: "tenant.taxat-sandbox",
  };

  return createEventEnvelope({
    channelRef: genericIdentityInput.channelRef,
    durableTruthStatement:
      "Manifest stage dispatch receipts and execution claims remain durable truth.",
    genericIdentityInput,
    messageFamilyRef: "STAGE_TASK",
    packetId,
    payload: genericIdentityInput.payload,
    payloadRefOrNull: packetId,
    producedAt: "2026-04-23T09:05:00.000Z",
    producerRef: genericIdentityInput.producerRef,
    sourceRecordRef: genericIdentityInput.sourceRecordRef,
    sourceRecordVersionHash: genericIdentityInput.sourceRecordVersionHash,
  });
}

test("reuses durable outbox and inbox truth for duplicate packet replay and semantic resend", () => {
  const firstEnvelope = stageEnvelope("packet.stage.case-2026-04-23.01");

  let outbox = createOutboxRecordFromEnvelope(
    firstEnvelope,
    "2026-04-23T09:05:00.000Z",
    "DEAD_LETTER_QUEUE_REQUIRED",
  );
  outbox = markOutboxPublished(outbox, firstEnvelope, "2026-04-23T09:05:05.000Z");
  outbox = acknowledgeOutboxRecord(outbox, "2026-04-23T09:05:06.000Z");

  expect(outbox.lifecycleState).toBe("ACKNOWLEDGED");
  expect(outbox.publishedPacketIds).toEqual(["packet.stage.case-2026-04-23.01"]);

  const firstDelivery = applyInboxDelivery(
    null,
    firstEnvelope,
    "2026-04-23T09:05:08.000Z",
    "CURRENT",
  );
  expect(firstDelivery.decision.code).toBe("ACCEPT_FOR_PROCESSING");

  let inbox = claimInboxRecord(firstDelivery.record, "2026-04-23T09:05:10.000Z");
  inbox = recordInboxSideEffect(
    inbox,
    "effect.stage.case-2026-04-23.compute-obligations",
    "2026-04-23T09:05:12.000Z",
  );

  const replayedPacket = applyInboxDelivery(
    inbox,
    firstEnvelope,
    "2026-04-23T09:05:20.000Z",
    "CURRENT",
  );
  expect(replayedPacket.decision.code).toBe("ACK_FROM_PERSISTED_EFFECT");
  expect(replayedPacket.decision.ackImmediately).toBe(true);

  const semanticResend = applyInboxDelivery(
    replayedPacket.record,
    stageEnvelope("packet.stage.case-2026-04-23.02"),
    "2026-04-23T09:05:30.000Z",
    "CURRENT",
  );
  expect(semanticResend.decision.code).toBe("ACK_FROM_PERSISTED_EFFECT");
  expect(semanticResend.record.semanticReplayCount).toBe(1);
  expect(semanticResend.record.packetIds).toEqual([
    "packet.stage.case-2026-04-23.01",
    "packet.stage.case-2026-04-23.02",
  ]);

  const acknowledged = acknowledgeInboxRecord(
    semanticResend.record,
    "2026-04-23T09:05:31.000Z",
  );
  expect(acknowledged.lifecycleState).toBe("ACKNOWLEDGED");
});

test("dead-letters after repeated safe retries and quarantines missing or stale source-record continuity", () => {
  const envelope = stageEnvelope("packet.stage.case-2026-04-23.03");
  const accepted = applyInboxDelivery(
    null,
    envelope,
    "2026-04-23T09:06:00.000Z",
    "CURRENT",
  );
  const record = claimInboxRecord(accepted.record, "2026-04-23T09:06:05.000Z");

  const retryPolicy = {
    deadLetterMode: "DEAD_LETTER_QUEUE_REQUIRED" as const,
    maxDeliveryAttempts: 3,
  };

  const firstRetry = registerInboxFailure(
    record,
    retryPolicy,
    "2026-04-23T09:06:10.000Z",
    "WORKER_TIMEOUT",
  );
  expect(firstRetry.decision.code).toBe("RETRY_SCHEDULED");

  const secondRetry = registerInboxFailure(
    firstRetry.record,
    retryPolicy,
    "2026-04-23T09:06:20.000Z",
    "WORKER_TIMEOUT",
  );
  expect(secondRetry.decision.code).toBe("RETRY_SCHEDULED");

  const deadLetter = registerInboxFailure(
    secondRetry.record,
    retryPolicy,
    "2026-04-23T09:06:30.000Z",
    "WORKER_TIMEOUT",
  );
  expect(deadLetter.decision.code).toBe("DEAD_LETTER");
  expect(deadLetter.record.lifecycleState).toBe("DEAD_LETTERED");
  expect(deadLetter.record.deadLetterReasonCodes).toContain("MAX_ATTEMPTS_EXHAUSTED");

  const missingSource = applyInboxDelivery(
    null,
    envelope,
    "2026-04-23T09:07:00.000Z",
    "MISSING",
  );
  expect(missingSource.decision.code).toBe("QUARANTINE_SOURCE_RECORD_MISSING");
  expect(missingSource.record.lifecycleState).toBe("QUARANTINED");

  const staleSource = applyInboxDelivery(
    null,
    envelope,
    "2026-04-23T09:07:10.000Z",
    "STALE",
  );
  expect(staleSource.decision.code).toBe("QUARANTINE_SOURCE_RECORD_STALE");
  expect(staleSource.record.lifecycleState).toBe("QUARANTINED");
});
