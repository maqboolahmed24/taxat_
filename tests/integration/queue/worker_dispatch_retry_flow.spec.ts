import { expect, test } from "@playwright/test";

import { createEventEnvelope } from "../../../packages/domain-kernel/src/messaging/event_envelope.ts";
import {
  applyInboxDelivery,
  claimInboxRecord,
  recordInboxSideEffect,
} from "../../../packages/domain-kernel/src/messaging/inbox_record.ts";
import {
  createInMemoryWorkerDispatchQueuePort,
} from "../../../packages/domain-kernel/src/queue/queue_port.ts";
import {
  buildQueueOrderDomainParts,
  loadQueuePolicyBundle,
  queueCatalogRow,
} from "../../../packages/domain-kernel/src/queue/order_domain_policy.ts";
import {
  createWorkerDispatchEnvelope,
} from "../../../packages/domain-kernel/src/queue/worker_dispatch_envelope.ts";
import { dispatchClaimFence } from "../../../packages/domain-kernel/src/queue/dispatch_claim.ts";

async function stageDispatchEnvelope(packetId: string) {
  const bundle = await loadQueuePolicyBundle({ reload: true });
  const familyRow = queueCatalogRow(bundle, "STAGE_WORK");
  const eventEnvelope = createEventEnvelope({
    channelRef: "channel.manifest.stage.dispatch",
    durableTruthStatement: "Stage workset and outbox remain durable truth.",
    genericIdentityInput: {
      channelRef: "channel.manifest.stage.dispatch",
      consumerRef: "worker.stage-runner",
      familyRef: "ManifestStageDispatchReceipt",
      payload: {
        manifest_ref: "manifest.case-2026-04-23",
        stage_code: "COMPUTE_OUTCOME",
      },
      producerRef: "orchestrator.stage-dispatch",
      scopeRef: "STAGE_TASK",
      semanticOperationRef: "COMPUTE_OUTCOME",
      semanticTargetRef: "manifest.case-2026-04-23.stage.compute-outcome",
      sourceRecordRef: "dispatch.stage.case-2026-04-23.compute-outcome",
      sourceRecordVersionHash:
        "65f609065d521d10b6c764743f4ec32e8c89c529ed6be897d47f85f629f9eb5f",
      tenantId: "tenant.taxat-sandbox",
    },
    messageFamilyRef: "STAGE_TASK",
    orderDomainParts: buildQueueOrderDomainParts(bundle, {
      manifestRefOrNull: "manifest.case-2026-04-23",
      queueFamilyRef: "STAGE_WORK",
      stageCodeOrNull: "COMPUTE_OUTCOME",
    }),
    packetId,
    payload: {
      manifest_ref: "manifest.case-2026-04-23",
      stage_code: "COMPUTE_OUTCOME",
    },
    payloadRefOrNull: packetId,
    producedAt: "2026-04-23T12:00:00Z",
    producerRef: "orchestrator.stage-dispatch",
    sourceRecordRef: "dispatch.stage.case-2026-04-23.compute-outcome",
    sourceRecordVersionHash:
      "65f609065d521d10b6c764743f4ec32e8c89c529ed6be897d47f85f629f9eb5f",
  });

  return createWorkerDispatchEnvelope({
    dispatchActionRef: "EXECUTE_STAGE_TASK",
    dispatchRef: `dispatch.ref.${packetId}`,
    durableTruthFamilyRef: "OUTBOX_RECORD",
    durableTruthRef: "outbox-record.stage.case-2026-04-23.compute-outcome",
    eventEnvelope,
    manifestRefOrNull: "manifest.case-2026-04-23",
    outboxRecordRef: "outbox-record.stage.case-2026-04-23.compute-outcome",
    payload: {
      workset_ref: "stage.workset.case-2026-04-23.compute-outcome",
    },
    publishedAt: "2026-04-23T12:00:00Z",
    queueFamilyRef: "STAGE_WORK",
    routingKey: familyRow.routing_key,
  });
}

async function authorityTransmitEnvelope() {
  const bundle = await loadQueuePolicyBundle({ reload: true });
  const familyRow = queueCatalogRow(bundle, "AUTHORITY_TRANSMIT");
  const eventEnvelope = createEventEnvelope({
    authorityIdentityOrNull: null,
    channelRef: "channel.authority.transmit",
    durableTruthStatement:
      "Authority interaction and submission records remain durable truth for queued send posture.",
    genericIdentityInput: {
      channelRef: "channel.authority.transmit",
      consumerRef: "worker.authority-gateway",
      familyRef: "AuthorityInteractionRecord",
      payload: {
        authority_interaction_ref: "interaction.authority.case-2026-04-23",
      },
      producerRef: "authority.gateway",
      scopeRef: "AUTHORITY_INGRESS",
      semanticOperationRef: "TRANSMIT_ORIGINAL",
      semanticTargetRef: "submission.case-2026-04-23",
      sourceRecordRef: "submission.case-2026-04-23",
      sourceRecordVersionHash:
        "a60da0a3018155778cb8a490f2b62d6d82b58ebc1035e49c9d1234a6f55d2153",
      tenantId: "tenant.taxat-sandbox",
    },
    messageFamilyRef: "AUTHORITY_REQUEST",
    orderDomainParts: buildQueueOrderDomainParts(bundle, {
      clientIdOrNull: "client.taxpayer.001",
      operationFamilyOrNull: "TRANSMIT_ORIGINAL",
      periodRefOrNull: "period.2026-Q1",
      queueFamilyRef: "AUTHORITY_TRANSMIT",
      runtimeScopeRefs: ["original_submit", "vat"],
      tenantIdOrNull: "tenant.taxat-sandbox",
    }),
    packetId: "packet.authority.case-2026-04-23.01",
    payload: {
      submission_ref: "submission.case-2026-04-23",
    },
    payloadRefOrNull: "packet.authority.case-2026-04-23.01",
    producedAt: "2026-04-23T13:00:00Z",
    producerRef: "authority.gateway",
    sourceRecordRef: "submission.case-2026-04-23",
    sourceRecordVersionHash:
      "a60da0a3018155778cb8a490f2b62d6d82b58ebc1035e49c9d1234a6f55d2153",
  });

  return createWorkerDispatchEnvelope({
    authorityInteractionRefOrNull: "interaction.authority.case-2026-04-23",
    dispatchActionRef: "TRANSMIT_AUTHORITY_MUTATION",
    dispatchRef: "dispatch.ref.authority.case-2026-04-23.01",
    durableTruthFamilyRef: "AUTHORITY_INTERACTION_RECORD",
    durableTruthRef: "interaction.authority.case-2026-04-23",
    eventEnvelope,
    manifestRefOrNull: "manifest.case-2026-04-23",
    outboxRecordRef: "outbox-record.authority.case-2026-04-23",
    payload: {
      interaction_ref: "interaction.authority.case-2026-04-23",
    },
    policyRefs: [familyRow.retry_budget_class],
    publishedAt: "2026-04-23T13:00:00Z",
    queueFamilyRef: "AUTHORITY_TRANSMIT",
    resendLegalityState: "QUEUED_UNASSESSED",
    routingKey: familyRow.routing_key,
  });
}

test("duplicate delivery and stale-claim reclaim stay safe because inbox effect proof remains durable", async () => {
  const queue = await createInMemoryWorkerDispatchQueuePort({ reload: true });
  const dispatchEnvelope = await stageDispatchEnvelope("packet.stage.case-2026-04-23.01");
  queue.publish({ envelope: dispatchEnvelope });

  const firstClaim = queue.claimNext({
    at: "2026-04-23T12:00:05Z",
    leaseDurationSeconds: 20,
    queueFamilyRef: "STAGE_WORK",
    workerRef: "worker.stage.001",
  });
  expect(firstClaim?.deliveryCount).toBe(1);

  const accepted = applyInboxDelivery(
    null,
    createEventEnvelope({
      channelRef: "channel.manifest.stage.dispatch",
      durableTruthStatement: "Stage workset and outbox remain durable truth.",
      genericIdentityInput: {
        channelRef: "channel.manifest.stage.dispatch",
        consumerRef: "worker.stage-runner",
        familyRef: "ManifestStageDispatchReceipt",
        payload: {
          manifest_ref: "manifest.case-2026-04-23",
          stage_code: "COMPUTE_OUTCOME",
        },
        producerRef: "orchestrator.stage-dispatch",
        scopeRef: "STAGE_TASK",
        semanticOperationRef: "COMPUTE_OUTCOME",
        semanticTargetRef: "manifest.case-2026-04-23.stage.compute-outcome",
        sourceRecordRef: "dispatch.stage.case-2026-04-23.compute-outcome",
        sourceRecordVersionHash:
          "65f609065d521d10b6c764743f4ec32e8c89c529ed6be897d47f85f629f9eb5f",
        tenantId: "tenant.taxat-sandbox",
      },
      orderDomainParts: ["manifest.case-2026-04-23", "POST_SEAL_STAGE", "COMPUTE_OUTCOME"],
      messageFamilyRef: "STAGE_TASK",
      packetId: "packet.stage.case-2026-04-23.01",
      payload: {
        manifest_ref: "manifest.case-2026-04-23",
        stage_code: "COMPUTE_OUTCOME",
      },
      payloadRefOrNull: "packet.stage.case-2026-04-23.01",
      producedAt: "2026-04-23T12:00:00Z",
      producerRef: "orchestrator.stage-dispatch",
      sourceRecordRef: "dispatch.stage.case-2026-04-23.compute-outcome",
      sourceRecordVersionHash:
        "65f609065d521d10b6c764743f4ec32e8c89c529ed6be897d47f85f629f9eb5f",
    }),
    "2026-04-23T12:00:06Z",
    "CURRENT",
  );
  let inbox = claimInboxRecord(accepted.record, "2026-04-23T12:00:07Z");
  inbox = recordInboxSideEffect(
    inbox,
    "effect.stage.case-2026-04-23.compute-outcome",
    "2026-04-23T12:00:08Z",
  );

  const reclaimed = queue.claimNext({
    at: "2026-04-23T12:00:30Z",
    leaseDurationSeconds: 20,
    queueFamilyRef: "STAGE_WORK",
    workerRef: "worker.stage.002",
  });
  expect(reclaimed?.claimOrNull?.claimEpoch).toBe(2);

  const replay = applyInboxDelivery(
    inbox,
    createEventEnvelope({
      channelRef: "channel.manifest.stage.dispatch",
      durableTruthStatement: "Stage workset and outbox remain durable truth.",
      genericIdentityInput: {
        channelRef: "channel.manifest.stage.dispatch",
        consumerRef: "worker.stage-runner",
        familyRef: "ManifestStageDispatchReceipt",
        payload: {
          manifest_ref: "manifest.case-2026-04-23",
          stage_code: "COMPUTE_OUTCOME",
        },
        producerRef: "orchestrator.stage-dispatch",
        scopeRef: "STAGE_TASK",
        semanticOperationRef: "COMPUTE_OUTCOME",
        semanticTargetRef: "manifest.case-2026-04-23.stage.compute-outcome",
        sourceRecordRef: "dispatch.stage.case-2026-04-23.compute-outcome",
        sourceRecordVersionHash:
          "65f609065d521d10b6c764743f4ec32e8c89c529ed6be897d47f85f629f9eb5f",
        tenantId: "tenant.taxat-sandbox",
      },
      orderDomainParts: ["manifest.case-2026-04-23", "POST_SEAL_STAGE", "COMPUTE_OUTCOME"],
      messageFamilyRef: "STAGE_TASK",
      packetId: "packet.stage.case-2026-04-23.01",
      payload: {
        manifest_ref: "manifest.case-2026-04-23",
        stage_code: "COMPUTE_OUTCOME",
      },
      payloadRefOrNull: "packet.stage.case-2026-04-23.01",
      producedAt: "2026-04-23T12:00:00Z",
      producerRef: "orchestrator.stage-dispatch",
      sourceRecordRef: "dispatch.stage.case-2026-04-23.compute-outcome",
      sourceRecordVersionHash:
        "65f609065d521d10b6c764743f4ec32e8c89c529ed6be897d47f85f629f9eb5f",
    }),
    "2026-04-23T12:00:31Z",
    "CURRENT",
  );

  expect(replay.decision.code).toBe("ACK_FROM_PERSISTED_EFFECT");
  const acked = queue.acknowledge({
    acknowledgedAt: "2026-04-23T12:00:32Z",
    fence: dispatchClaimFence(reclaimed.claimOrNull),
    queuePacketRef: reclaimed.envelope.queuePacketRef,
  });
  expect(acked.state).toBe("ACKNOWLEDGED");
});

test("authority send-time drift dead-letters for reconcile-before-retry and broker rebuild skips blocked resend", async () => {
  const queue = await createInMemoryWorkerDispatchQueuePort({ reload: true });
  const authorityEnvelope = await authorityTransmitEnvelope();
  queue.publish({ envelope: authorityEnvelope });

  const claimed = queue.claimNext({
    at: "2026-04-23T13:10:00Z",
    leaseDurationSeconds: 20,
    queueFamilyRef: "AUTHORITY_TRANSMIT",
    workerRef: "worker.authority.001",
  });
  expect(claimed).not.toBeNull();

  const blockedSchedule = queue.scheduleRetry({
    attemptCost: 0.4,
    errorCode: "AUTH_DELAYED_SEND",
    now: "2026-04-23T13:10:10Z",
    openedAt: "2026-04-23T13:00:00Z",
    preconditionsMet: true,
    progressValue: 6,
    retryAttemptCount: 1,
    retryBudgetClass: "AUTHORITY_TRANSMIT_IDEMPOTENT_RECOVERY",
    retryIdempotencyScopeRef: "scope.authority.case-2026-04-23",
    sendLegalityOrNull: {
      externalTruthAmbiguity: 0.42,
      idempotencyCollision: false,
      openSendClaimConflict: false,
      resendLegalityState: "BLOCKED_BY_RECONCILIATION",
      sendRevalidationState: "BLOCKED",
      unchangedBindingLineage: false,
    },
  });
  expect(blockedSchedule.budgetState).toBe("BLOCKED_BY_EXTERNAL_LEGALITY");

  const classification = queue.classifyDeadLetter({
    budgetState: blockedSchedule.budgetState,
    queueFamilyRef: "AUTHORITY_TRANSMIT",
    reasonCodes: blockedSchedule.reasonCodes,
    resendLegalityStateOrNull: "BLOCKED_BY_RECONCILIATION",
    retryClass: blockedSchedule.retryClass,
    sendRevalidationStateOrNull: "BLOCKED",
  });
  const deadLettered = queue.deadLetter({
    classification,
    deadLetteredAt: "2026-04-23T13:10:11Z",
    fence: dispatchClaimFence(claimed.claimOrNull),
    queuePacketRef: claimed.envelope.queuePacketRef,
    reasonCodes: blockedSchedule.reasonCodes,
  });

  expect(deadLettered.deadLetterOrNull?.resolutionClass).toBe("RECONCILE_THEN_RETRY");

  const rebuildQueue = await createInMemoryWorkerDispatchQueuePort({ reload: true });
  const stageEnvelope = await stageDispatchEnvelope("packet.stage.case-2026-04-23.02");
  const rebuiltStage = rebuildQueue.rebuildFromDurableTruth({
    at: "2026-04-23T13:20:00Z",
    queueFamilyRef: "STAGE_WORK",
    sources: [
      {
        durableDisposition: "PENDING",
        envelope: stageEnvelope,
        rebuildReasonCodes: ["BROKER_STATE_LOST"],
      },
    ],
  });
  const rebuiltAuthority = rebuildQueue.rebuildFromDurableTruth({
    at: "2026-04-23T13:20:00Z",
    queueFamilyRef: "AUTHORITY_TRANSMIT",
    sources: [
      {
        durableDisposition: "PENDING",
        envelope: {
          ...authorityEnvelope,
          resendLegalityState: "BLOCKED_BY_RECONCILIATION",
          sendRevalidationReasonCodes: ["BINDING_LINEAGE_DRIFT"],
          sendRevalidationState: "BLOCKED",
        },
        rebuildReasonCodes: ["BROKER_STATE_LOST"],
      },
    ],
  });

  expect(rebuiltStage).toHaveLength(1);
  expect(rebuiltAuthority).toHaveLength(0);
});
