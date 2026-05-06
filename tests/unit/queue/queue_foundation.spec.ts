import { expect, test } from "@playwright/test";

import { createEventEnvelope } from "../../../packages/domain-kernel/src/messaging/event_envelope.ts";
import {
  createDispatchClaim,
  dispatchClaimFence,
  extendDispatchClaim,
} from "../../../packages/domain-kernel/src/queue/dispatch_claim.ts";
import {
  classifyDeadLetterResolution,
  loadDeadLetterPolicyBundle,
} from "../../../packages/domain-kernel/src/queue/dead_letter_classifier.ts";
import {
  buildQueueOrderDomainParts,
  deriveQueueOrderDomainKey,
  loadQueuePolicyBundle,
  queueCatalogRow,
} from "../../../packages/domain-kernel/src/queue/order_domain_policy.ts";
import {
  loadQueueRetryPolicyBundle,
  scheduleQueueRetry,
} from "../../../packages/domain-kernel/src/queue/retry_scheduler.ts";
import {
  assessAuthorityDispatchLegality,
  createWorkerDispatchEnvelope,
} from "../../../packages/domain-kernel/src/queue/worker_dispatch_envelope.ts";

test("derives order-domain keys and queue packets from manifest-bound stage dispatch law", async () => {
  const bundle = await loadQueuePolicyBundle({ reload: true });
  const familyRow = queueCatalogRow(bundle, "STAGE_WORK");
  const orderDomainParts = buildQueueOrderDomainParts(bundle, {
    manifestRefOrNull: "manifest.case-2026-04-23",
    queueFamilyRef: "STAGE_WORK",
    stageCodeOrNull: "BUILD_EVIDENCE_GRAPH",
  });

  const eventEnvelope = createEventEnvelope({
    channelRef: "channel.manifest.stage.dispatch",
    durableTruthStatement:
      "Stage work definition and persisted outbox remain the durable truth anchor.",
    genericIdentityInput: {
      channelRef: "channel.manifest.stage.dispatch",
      consumerRef: "worker.stage-runner",
      familyRef: "ManifestStageDispatchReceipt",
      payload: {
        manifest_ref: "manifest.case-2026-04-23",
        stage_code: "BUILD_EVIDENCE_GRAPH",
      },
      producerRef: "orchestrator.stage-dispatch",
      scopeRef: "STAGE_TASK",
      semanticOperationRef: "BUILD_EVIDENCE_GRAPH",
      semanticTargetRef: "manifest.case-2026-04-23.stage.build-evidence-graph",
      sourceRecordRef: "dispatch.stage.case-2026-04-23.build-evidence-graph",
      sourceRecordVersionHash:
        "96ebf4a4f2751226e6e90c741da6ee0e0f53a2c2139942451f8b88bdad9ac82c",
      tenantId: "tenant.taxat-sandbox",
    },
    messageFamilyRef: "STAGE_TASK",
    notes: ["opaque refs only"],
    orderDomainParts,
    packetId: "packet.stage.case-2026-04-23.01",
    payload: {
      manifest_ref: "manifest.case-2026-04-23",
      stage_code: "BUILD_EVIDENCE_GRAPH",
    },
    payloadRefOrNull: "packet.stage.case-2026-04-23.01",
    producedAt: "2026-04-23T11:00:00Z",
    producerRef: "orchestrator.stage-dispatch",
    sourceRecordRef: "dispatch.stage.case-2026-04-23.build-evidence-graph",
    sourceRecordVersionHash:
      "96ebf4a4f2751226e6e90c741da6ee0e0f53a2c2139942451f8b88bdad9ac82c",
  });

  const dispatchEnvelope = createWorkerDispatchEnvelope({
    dispatchActionRef: "EXECUTE_STAGE_TASK",
    dispatchRef: "dispatch.ref.stage.case-2026-04-23.01",
    durableTruthFamilyRef: "OUTBOX_RECORD",
    durableTruthRef: "outbox-record.stage.case-2026-04-23.01",
    eventEnvelope,
    manifestRefOrNull: "manifest.case-2026-04-23",
    notes: ["packet references only"],
    outboxRecordRef: "outbox-record.stage.case-2026-04-23.01",
    payload: {
      manifest_ref: "manifest.case-2026-04-23",
      workset_ref: "stage.workset.case-2026-04-23.01",
    },
    policyRefs: [familyRow.retry_budget_class, familyRow.dead_letter_queue_ref],
    publishedAt: "2026-04-23T11:00:01Z",
    queueFamilyRef: "STAGE_WORK",
    routingKey: familyRow.routing_key,
  });

  expect(dispatchEnvelope.orderDomainKey).toBe(
    deriveQueueOrderDomainKey(bundle, {
      manifestRefOrNull: "manifest.case-2026-04-23",
      queueFamilyRef: "STAGE_WORK",
      stageCodeOrNull: "BUILD_EVIDENCE_GRAPH",
    }),
  );
  expect(dispatchEnvelope.routingKey).toBe("worker.stage.execute");
  expect(dispatchEnvelope.payloadPosture).toBe("OPAQUE_REFS_HASHES_POLICY_ONLY");
  expect(dispatchEnvelope.queuePacketRef).toContain("queue-packet.");
});

test("authority retry and dead-letter posture fail closed when send-time legality drifts", async () => {
  const [retryBundle, deadLetterBundle] = await Promise.all([
    loadQueueRetryPolicyBundle({ reload: true }),
    loadDeadLetterPolicyBundle({ reload: true }),
  ]);

  const scheduled = scheduleQueueRetry(retryBundle, {
    attemptCost: 0.12,
    errorCode: "AUTH_TIMEOUT",
    now: "2026-04-23T11:10:00Z",
    openedAt: "2026-04-23T11:00:00Z",
    preconditionsMet: true,
    progressValue: 5,
    retryAttemptCount: 1,
    retryBudgetClass: "AUTHORITY_TRANSMIT_IDEMPOTENT_RECOVERY",
    retryIdempotencyScopeRef: "scope.authority.case-2026-04-23",
    sendLegalityOrNull: {
      externalTruthAmbiguity: 0.05,
      idempotencyCollision: false,
      openSendClaimConflict: false,
      resendLegalityState: "QUEUED_UNASSESSED",
      sendRevalidationState: "NOT_PERFORMED",
      unchangedBindingLineage: true,
    },
  });
  expect(scheduled.allowed).toBe(true);
  expect(scheduled.nextRetryAtOrNull).toBeTruthy();

  const blocked = scheduleQueueRetry(retryBundle, {
    attemptCost: 0.12,
    errorCode: "AUTH_TIMEOUT",
    now: "2026-04-23T11:15:00Z",
    openedAt: "2026-04-23T11:00:00Z",
    preconditionsMet: true,
    progressValue: 5,
    retryAttemptCount: 1,
    retryBudgetClass: "AUTHORITY_TRANSMIT_IDEMPOTENT_RECOVERY",
    retryIdempotencyScopeRef: "scope.authority.case-2026-04-23",
    sendLegalityOrNull: {
      externalTruthAmbiguity: 0.34,
      idempotencyCollision: false,
      openSendClaimConflict: false,
      resendLegalityState: "BLOCKED_BY_RECONCILIATION",
      sendRevalidationState: "BLOCKED",
      unchangedBindingLineage: false,
    },
  });

  expect(blocked.allowed).toBe(false);
  expect(blocked.budgetState).toBe("BLOCKED_BY_EXTERNAL_LEGALITY");
  expect(blocked.reasonCodes).toContain("BINDING_LINEAGE_DRIFT");
  expect(blocked.reasonCodes).toContain("SEND_TIME_REVALIDATION_BLOCKED");

  const deadLetter = classifyDeadLetterResolution(deadLetterBundle, {
    budgetState: blocked.budgetState,
    queueFamilyRef: "AUTHORITY_TRANSMIT",
    reasonCodes: blocked.reasonCodes,
    resendLegalityStateOrNull: "BLOCKED_BY_RECONCILIATION",
    retryClass: blocked.retryClass,
    sendRevalidationStateOrNull: "BLOCKED",
  });

  expect(deadLetter.resolutionClass).toBe("RECONCILE_THEN_RETRY");
  expect(deadLetter.deadLetterQueueRef).toBe("dlq.authority-transmit");
});

test("claim fencing rejects stale-owner visibility updates after reclaim", () => {
  const firstClaim = createDispatchClaim({
    at: "2026-04-23T11:20:00Z",
    leaseDurationSeconds: 20,
    queuePacketRef: "queue-packet.stage.case-2026-04-23.01",
    workerRef: "worker.stage.001",
  });
  const secondClaim = createDispatchClaim({
    at: "2026-04-23T11:20:25Z",
    leaseDurationSeconds: 20,
    priorClaimOrNull: firstClaim,
    queuePacketRef: "queue-packet.stage.case-2026-04-23.01",
    workerRef: "worker.stage.002",
  });

  expect(secondClaim.claimEpoch).toBe(2);
  expect(secondClaim.staleReclaimReasonCodes).toContain("STALE_CLAIM_RECLAIMED");

  expect(() =>
    extendDispatchClaim(secondClaim, dispatchClaimFence(firstClaim), {
      at: "2026-04-23T11:20:30Z",
      leaseDurationSeconds: 20,
    }),
  ).toThrow(/fence mismatch/i);
});

test("authority dispatch legality distinguishes fresh send, idempotent recovery, and blocked resend", () => {
  const assessment = assessAuthorityDispatchLegality({
    authorityInteractionRefOrNull: "interaction.authority.case-2026-04-23",
    attemptLineageRefOrNull: null,
    correlation: {
      causationRefOrNull: null,
      duplicateMeaningKey:
        "0e5d6404d9469c7123b131f9f8f79cc68376da6871dac36accd84c352d6cef13",
      idempotencyKey:
        "96bcf35a0411aa7dfab3c67a16edb7567d58a2dd75f5f2d7f43be5e50499d3f0",
      manifestRefOrNull: null,
      observedAt: "2026-04-23T11:30:00Z",
      orderDomainKey:
        "dca2d18a21349d2a1b4cc82ef5a4b62be4225db427a2f8f10b061c160053daf0",
      requestHash:
        "8a3c7f0a72f2360a77d22e24baa78e3a1f8c592e8a45d6a01f628e4dbf0c23ad",
      sourceRecordRef: "submission.case-2026-04-23",
      traceRef: "trace.authority.case-2026-04-23" as never,
    },
    dispatchActionRef: "RECOVER_AUTHORITY_IDEMPOTENT_ATTEMPT",
    dispatchRef: "dispatch.ref.authority.case-2026-04-23.01",
    durableTruthFamilyRef: "AUTHORITY_INTERACTION_RECORD",
    durableTruthRef: "interaction.authority.case-2026-04-23",
    manifestRefOrNull: "manifest.case-2026-04-23",
    notes: [],
    orderDomainKey:
      "dca2d18a21349d2a1b4cc82ef5a4b62be4225db427a2f8f10b061c160053daf0" as never,
    outboxRecordRef: "outbox-record.authority.case-2026-04-23.01",
    payloadHash:
      "5df0d761e3be2245f32a4088dcd535f05bd34dc23d4dcde38c8a5ce7d07212a4" as never,
    payloadPosture: "OPAQUE_REFS_HASHES_POLICY_ONLY",
    payloadRefOrNull: "packet.authority.case-2026-04-23.01",
    policyRefs: [],
    publishedAt: "2026-04-23T11:30:00Z",
    queueFamilyRef: "AUTHORITY_TRANSMIT",
    queuePacketRef: "queue-packet.authority.case-2026-04-23.01" as never,
    requestHash:
      "8a3c7f0a72f2360a77d22e24baa78e3a1f8c592e8a45d6a01f628e4dbf0c23ad" as never,
    resendLegalityState: "IDEMPOTENT_RECOVERY_ONLY",
    routingKey: "authority.transmit",
    sendRevalidationReasonCodes: [],
    sendRevalidationState: "NOT_PERFORMED",
    sourceRecordRef: "submission.case-2026-04-23",
    sourceRecordVersionHash:
      "5fca721394088d2b67964af8d4a2ce590cf65b1d67600b3ca65f953cc8d8b570",
  });

  expect(assessment.allowed).toBe(true);
  expect(assessment.postureStatement).toContain("Crash recovery");
});
