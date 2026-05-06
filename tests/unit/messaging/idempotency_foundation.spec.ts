import { expect, test } from "@playwright/test";

import { createEventEnvelope } from "../../../packages/domain-kernel/src/messaging/event_envelope.ts";
import {
  buildAuthorityRequestIdentity,
  buildMessageIdempotencyIdentity,
  classifyIdempotencyCollision,
} from "../../../packages/domain-kernel/src/messaging/idempotency.ts";

test("same semantic request with a different packet id reuses durable meaning while transport evidence changes", () => {
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

  const packetOne = createEventEnvelope({
    channelRef: genericIdentityInput.channelRef,
    durableTruthStatement: "Manifest stage receipt remains durable truth.",
    genericIdentityInput,
    messageFamilyRef: "STAGE_TASK",
    packetId: "packet.stage.case-2026-04-23.01",
    payload: genericIdentityInput.payload,
    payloadRefOrNull: "packet.stage.case-2026-04-23.01",
    producedAt: "2026-04-23T09:05:00.000Z",
    producerRef: genericIdentityInput.producerRef,
    sourceRecordRef: genericIdentityInput.sourceRecordRef,
    sourceRecordVersionHash: genericIdentityInput.sourceRecordVersionHash,
  });
  const packetTwo = createEventEnvelope({
    channelRef: genericIdentityInput.channelRef,
    durableTruthStatement: "Manifest stage receipt remains durable truth.",
    genericIdentityInput,
    messageFamilyRef: "STAGE_TASK",
    packetId: "packet.stage.case-2026-04-23.02",
    payload: genericIdentityInput.payload,
    payloadRefOrNull: "packet.stage.case-2026-04-23.02",
    producedAt: "2026-04-23T09:06:00.000Z",
    producerRef: genericIdentityInput.producerRef,
    sourceRecordRef: genericIdentityInput.sourceRecordRef,
    sourceRecordVersionHash: genericIdentityInput.sourceRecordVersionHash,
  });

  expect(packetOne.identity.duplicateMeaningKey).toBe(packetTwo.identity.duplicateMeaningKey);
  expect(packetOne.identity.idempotencyKey).toBe(packetTwo.identity.idempotencyKey);
  expect(packetOne.identity.requestHash).toBe(packetTwo.identity.requestHash);
  expect(packetOne.deliveryDedupeKey).not.toBe(packetTwo.deliveryDedupeKey);
  expect(packetOne.envelopeRef).not.toBe(packetTwo.envelopeRef);
});

test("collision classification blocks body drift and namespace drift under one durable identity", () => {
  const baseline = buildMessageIdempotencyIdentity({
    channelRef: "channel.api.command.accepted",
    consumerRef: "api.command-handler",
    familyRef: "ApiCommandReceipt",
    payload: {
      command_ref: "command.receipt.case-2026-04-23",
      request: "SUBMIT_RETURN",
    },
    producerRef: "api.command.acceptor",
    scopeRef: "NORTHBOUND_COMMAND",
    semanticOperationRef: "SUBMIT_RETURN",
    semanticTargetRef: "command.receipt.case-2026-04-23",
    sourceRecordRef: "command.receipt.case-2026-04-23",
    sourceRecordVersionHash:
      "f87f7e99d78201c59c6d38caaa8ad6ef6b9cac56b5123f6072a3b6d0a78598e8",
    tenantId: "tenant.taxat-sandbox",
  });
  const changedBody = buildMessageIdempotencyIdentity({
    channelRef: "channel.api.command.accepted",
    consumerRef: "api.command-handler",
    familyRef: "ApiCommandReceipt",
    payload: {
      command_ref: "command.receipt.case-2026-04-23",
      request: "SUBMIT_RETURN",
      tax_year: "2026-27",
    },
    producerRef: "api.command.acceptor",
    scopeRef: "NORTHBOUND_COMMAND",
    semanticOperationRef: "SUBMIT_RETURN",
    semanticTargetRef: "command.receipt.case-2026-04-23",
    sourceRecordRef: "command.receipt.case-2026-04-23",
    sourceRecordVersionHash:
      "f87f7e99d78201c59c6d38caaa8ad6ef6b9cac56b5123f6072a3b6d0a78598e8",
    tenantId: "tenant.taxat-sandbox",
  });
  const namespaceDrift = buildMessageIdempotencyIdentity({
    channelRef: "channel.api.command.replayed",
    consumerRef: "api.command-handler",
    familyRef: "ApiCommandReceipt",
    payload: {
      command_ref: "command.receipt.case-2026-04-23",
      request: "SUBMIT_RETURN",
    },
    producerRef: "api.command.acceptor",
    scopeRef: "NORTHBOUND_COMMAND",
    semanticOperationRef: "SUBMIT_RETURN",
    semanticTargetRef: "command.receipt.case-2026-04-23",
    sourceRecordRef: "command.receipt.case-2026-04-23",
    sourceRecordVersionHash:
      "f87f7e99d78201c59c6d38caaa8ad6ef6b9cac56b5123f6072a3b6d0a78598e8",
    tenantId: "tenant.taxat-sandbox",
  });

  expect(
    classifyIdempotencyCollision(baseline, {
      ...changedBody,
      idempotencyKey: baseline.idempotencyKey,
    }),
  ).toBe("BODY_COLLISION");

  expect(
    classifyIdempotencyCollision(baseline, {
      ...namespaceDrift,
      idempotencyKey: baseline.idempotencyKey,
    }),
  ).toBe("IDENTITY_NAMESPACE_COLLISION");
});

test("authority request identity preserves duplicate meaning across token rotation but re-seals exact request hash", () => {
  const seed = {
    accessBindingHash:
      "ce0b340730dbe4c4c352f335f445f7e9597eec56e4ff9c37d32eb662f1abec8d",
    actingPartyRef: "party.operator.caseworker-17",
    attemptLineageManifestId: "manifest.case-2026-04-23",
    authorityBindingRef: "authority.binding.hmrc.sa-sandbox",
    authorityLinkRef: "authority.link.hmrc.sa-sandbox",
    authorityName: "HMRC",
    authorityProductProfile: "MTD_ITSA",
    authorityScope: "income-tax",
    bindingLineageRef: "binding.lineage.hmrc.sa.operator-17",
    body: {
      taxable_profit: "120000.55",
      tax_year: "2025-26",
    },
    businessPartitionRefs: ["period.2025-26"],
    clientId: "client.taxpayer-2001",
    headerProfileRefs: ["hmrc.fraud-prevention.v1", "hmrc.itsa.core.v1"],
    httpMethod: "POST",
    obligationRefOrNull: "obligation.hmrc.itsa.2025-26",
    operationFamily: "SUBMIT_RETURN",
    operationProfile: "ITSA_FINAL_DECLARATION",
    pathParams: {
      nino: "AB123456C",
    },
    policySnapshotHash:
      "3489c2f6f18ff4d1e0f84f8db92ab6688f7820b4c5da498cc6d1977d48f8e672",
    providerApiVersion: "2026-01",
    providerEnvironment: "sandbox",
    queryParams: {
      taxYear: "2025-26",
    },
    resourceTemplate: "/income-tax/income-tax-view-change/{nino}/self-employment",
    subjectRef: "subject.taxpayer-2001",
    tenantId: "tenant.taxat-sandbox",
  };

  const first = buildAuthorityRequestIdentity({
    ...seed,
    tokenBindingRef: "token.binding.hmrc.operator-17.v5",
  });
  const rotated = buildAuthorityRequestIdentity({
    ...seed,
    tokenBindingRef: "token.binding.hmrc.operator-17.v6",
  });

  expect(first.duplicateMeaningKey).toBe(rotated.duplicateMeaningKey);
  expect(first.idempotencyKey).toBe(rotated.idempotencyKey);
  expect(first.requestHash).not.toBe(rotated.requestHash);
  expect(first.canonicalPath).toBe(rotated.canonicalPath);
});
