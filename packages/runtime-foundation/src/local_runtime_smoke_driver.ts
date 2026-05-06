import { buildApiCommandReceipt, createCommandRequestTruthBoundaryContract, loadNorthboundPolicyBundle, parseCommandEnvelope } from "../../../apps/control-plane-api/src/index.ts";
import { createAppendOnlyAuditWriter } from "../../audit/src/index.ts";
import { createCacheIsolationContract, assessCacheReuseGuard } from "../../domain-kernel/src/cache/index.ts";
import { createEventEnvelope } from "../../domain-kernel/src/messaging/event_envelope.ts";
import { dispatchClaimFence } from "../../domain-kernel/src/queue/dispatch_claim.ts";
import { buildQueueOrderDomainParts, loadQueuePolicyBundle, queueCatalogRow } from "../../domain-kernel/src/queue/order_domain_policy.ts";
import { createInMemoryWorkerDispatchQueuePort } from "../../domain-kernel/src/queue/queue_port.ts";
import { createWorkerDispatchEnvelope } from "../../domain-kernel/src/queue/worker_dispatch_envelope.ts";
import { createInMemoryGovernedObjectStore } from "../../domain-kernel/src/storage/object_store.ts";

function buildSmokeCommandEnvelope(mutationPreconditionBinding: unknown) {
  return {
    artifact_type: "CommandEnvelope",
    command_id: "command.local-runtime.001",
    command_type: "AMEND_RETURN",
    idempotency_key: "idem.local-runtime.001",
    actor_session_ref: "session.operator.local.001",
    target_scope_class: "MANIFEST",
    tenant_id: "tenant.taxat-local",
    client_id: "client.taxpayer.local-001",
    manifest_id: "manifest.local-runtime.001",
    work_item_id: null,
    governance_target_ref: null,
    period: "2025-26",
    requested_scope: ["income-tax"],
    if_match_decision_bundle_hash: "bundle.hash.local-runtime",
    if_match_shell_stability_token: "shell.local-runtime.7",
    if_match_frame_epoch: 7,
    if_match_work_item_version: null,
    if_match_internal_head_sequence: null,
    if_match_customer_head_sequence: null,
    if_match_request_state_version: null,
    if_match_approval_pack_hash: null,
    if_match_client_portal_workspace_version: null,
    if_match_policy_snapshot_hash: null,
    if_match_dependency_topology_hash: null,
    simulation_basis_hash: null,
    mutation_basis_contract: null,
    truth_boundary_contract: createCommandRequestTruthBoundaryContract(),
    mutation_precondition_binding: mutationPreconditionBinding,
    payload: {
      amendment_kind: "VOLUNTARY",
    },
    requested_at: "2026-04-23T18:00:00.000Z",
  };
}

async function smokeCommandPath() {
  const bundle = await loadNorthboundPolicyBundle({ reload: true });
  const family = bundle.commandFamiliesByType.get("AMEND_RETURN");
  if (!family) {
    throw new Error("AMEND_RETURN command family missing from northbound bundle");
  }

  const parsed = await parseCommandEnvelope(
    buildSmokeCommandEnvelope(family.mutation_precondition_binding),
    {
      tenant_id: "tenant.taxat-local",
      principal_ref: "principal.operator.local.001",
      session_ref: "session.operator.local.001",
      client_id_or_null: "client.taxpayer.local-001",
    },
    { policyBundle: bundle },
  );

  return buildApiCommandReceipt({
    parsed,
    acceptedAt: "2026-04-23T18:00:05.000Z",
    acceptanceState: "ACCEPTED",
    expiresAt: "2026-04-23T19:00:05.000Z",
    projectionRefOrNull: "decision.bundle.local-runtime",
    projectionSequenceOrNull: 7,
    requestHash: "request.hash.local-runtime.001",
    resultRefOrNull: "result.local-runtime.001",
  });
}

async function smokeQueuePath() {
  const queue = await createInMemoryWorkerDispatchQueuePort({ reload: true });
  const queueBundle = await loadQueuePolicyBundle({ reload: true });
  const familyRow = queueCatalogRow(queueBundle, "STAGE_WORK");
  const eventEnvelope = createEventEnvelope({
    channelRef: "channel.manifest.stage.dispatch",
    durableTruthStatement: "Stage workset and outbox remain durable truth.",
    genericIdentityInput: {
      channelRef: "channel.manifest.stage.dispatch",
      consumerRef: "worker.stage-runner",
      familyRef: "ManifestStageDispatchReceipt",
      payload: {
        manifest_ref: "manifest.local-runtime.001",
        stage_code: "COMPUTE_OUTCOME",
      },
      producerRef: "orchestrator.stage-dispatch",
      scopeRef: "STAGE_TASK",
      semanticOperationRef: "COMPUTE_OUTCOME",
      semanticTargetRef: "manifest.local-runtime.001.stage.compute-outcome",
      sourceRecordRef: "dispatch.stage.local-runtime.001.compute-outcome",
      sourceRecordVersionHash:
        "65f609065d521d10b6c764743f4ec32e8c89c529ed6be897d47f85f629f9eb5f",
      tenantId: "tenant.taxat-local",
    },
    messageFamilyRef: "STAGE_TASK",
    orderDomainParts: buildQueueOrderDomainParts(queueBundle, {
      manifestRefOrNull: "manifest.local-runtime.001",
      queueFamilyRef: "STAGE_WORK",
      stageCodeOrNull: "COMPUTE_OUTCOME",
    }),
    packetId: "packet.local-runtime.stage.001",
    payload: {
      manifest_ref: "manifest.local-runtime.001",
      stage_code: "COMPUTE_OUTCOME",
    },
    payloadRefOrNull: "packet.local-runtime.stage.001",
    producedAt: "2026-04-23T18:01:00Z",
    producerRef: "orchestrator.stage-dispatch",
    sourceRecordRef: "dispatch.stage.local-runtime.001.compute-outcome",
    sourceRecordVersionHash:
      "65f609065d521d10b6c764743f4ec32e8c89c529ed6be897d47f85f629f9eb5f",
  });
  const dispatchEnvelope = createWorkerDispatchEnvelope({
    dispatchActionRef: "EXECUTE_STAGE_TASK",
    dispatchRef: "dispatch.ref.local-runtime.001",
    durableTruthFamilyRef: "OUTBOX_RECORD",
    durableTruthRef: "outbox-record.local-runtime.001",
    eventEnvelope,
    manifestRefOrNull: "manifest.local-runtime.001",
    outboxRecordRef: "outbox-record.local-runtime.001",
    payload: {
      workset_ref: "stage.workset.local-runtime.001",
    },
    publishedAt: "2026-04-23T18:01:00Z",
    queueFamilyRef: "STAGE_WORK",
    routingKey: familyRow.routing_key,
  });

  queue.publish({ envelope: dispatchEnvelope });
  const claim = queue.claimNext({
    at: "2026-04-23T18:01:03Z",
    leaseDurationSeconds: 30,
    queueFamilyRef: "STAGE_WORK",
    workerRef: "worker.stage.local.001",
  });
  if (!claim?.claimOrNull) {
    throw new Error("queue smoke failed to acquire dispatch claim");
  }
  const acknowledged = queue.acknowledge({
    acknowledgedAt: "2026-04-23T18:01:04Z",
    fence: dispatchClaimFence(claim.claimOrNull),
    queuePacketRef: claim.envelope.queuePacketRef,
  });

  return {
    delivery_count: acknowledged.deliveryCount,
    queue_packet_ref: acknowledged.envelope.queuePacketRef,
    queue_state: acknowledged.state,
  };
}

async function smokeObjectStorePath() {
  const store = await createInMemoryGovernedObjectStore({ reload: true });
  const staged = store.stageObject({
    at: "2026-04-23T18:02:00Z",
    objectClassRef: "UPLOAD_SESSION_SOURCE",
    objectRef: "object.local-runtime.upload.001",
    requestVersionRefOrNull: "request.version.local-runtime.001",
    storageRef: "storage.upload-staging.local-runtime-001",
    tenantId: "tenant.taxat-local",
    uploadSessionIdOrNull: "upload.session.local-runtime.001",
  });
  store.startScan({
    at: "2026-04-23T18:02:05Z",
    objectRef: staged.objectRef,
  });
  const published = store.completeScan({
    at: "2026-04-23T18:02:10Z",
    clean: true,
    objectRef: staged.objectRef,
    reasonCodes: ["SMOKE_PUBLISH"],
  });

  return {
    lifecycle_state: published.lifecycleState,
    object_ref: published.objectRef,
    publication_state: published.publicationState,
    storage_ref: published.storageRef,
  };
}

async function smokeCachePath() {
  const stored = await createCacheIsolationContract({
    accessBindingHashOrNull: "access-binding.local-runtime.001",
    cacheScopeClass: "WORKSPACE_SNAPSHOT",
    canonicalObjectRef: "artifact.local-runtime.workspace.001",
    clientIdOrNull: "client.taxpayer.local-001",
    maskingDimensionRefsOrNull: ["masking.staff.full", "masking.workspace.route"],
    principalClass: "STAFF_FULL",
    projectionVersionRef: "projection.local-runtime.workspace.001.v1",
    routeIdentityRef: "/work/items/local-runtime-001",
    sessionBindingHash: "session-binding.local-runtime.001",
    shellFamily: "CALM_SHELL",
    shellStabilityRefOrNull: "shell.stability.local-runtime.001",
    tenantId: "tenant.taxat-local",
    visibilityDimensionRefsOrNull: ["visibility.staff-full", "queue.assigned"],
  });
  const requested = await createCacheIsolationContract({
    accessBindingHashOrNull: "access-binding.local-runtime.001",
    cacheScopeClass: "WORKSPACE_SNAPSHOT",
    canonicalObjectRef: "artifact.local-runtime.workspace.001",
    clientIdOrNull: "client.taxpayer.local-001",
    maskingDimensionRefsOrNull: ["masking.staff.full", "masking.workspace.route"],
    principalClass: "STAFF_FULL",
    projectionVersionRef: "projection.local-runtime.workspace.001.v1",
    routeIdentityRef: "/work/items/local-runtime-001",
    sessionBindingHash: "session-binding.local-runtime.001",
    shellFamily: "CALM_SHELL",
    shellStabilityRefOrNull: "shell.stability.local-runtime.001",
    tenantId: "tenant.taxat-local",
    visibilityDimensionRefsOrNull: ["visibility.staff-full", "queue.assigned"],
  });

  return assessCacheReuseGuard({
    liveLegalityState: "CURRENT",
    requestedContract: requested,
    storedContract: stored,
  });
}

async function smokeAuditPath() {
  const writer = await createAppendOnlyAuditWriter();
  const append = await writer.append({
    correlationContext: {
      manifest_id: "manifest.local-runtime.001",
      mode: "COMPLIANCE",
      root_manifest_id: "manifest.local-runtime.001",
      run_kind: "INTERACTIVE",
      tenant_id: "tenant.taxat-local",
      workflow_item_id: "workflow.local-runtime.001",
    },
    eventTime: "2026-04-23T18:03:00Z",
    eventType: "ManifestSealed",
    publicationRef: "publication.local-runtime.audit.001",
    serviceRefOrNull: "service.control-plane-api",
    tenantId: "tenant.taxat-local",
  });
  const streamRef = append.storedEvent.event.audit_stream_ref;
  const verification = writer.verifyStream(streamRef);

  return {
    stream_ref: streamRef,
    stream_sequence: append.storedEvent.event.stream_sequence,
    verification_status: verification.status,
  };
}

export async function runLocalRuntimeSmoke() {
  const [commandReceipt, queuePath, objectStorePath, cachePath, auditPath] = await Promise.all([
    smokeCommandPath(),
    smokeQueuePath(),
    smokeObjectStorePath(),
    smokeCachePath(),
    smokeAuditPath(),
  ]);

  return {
    audit_path: auditPath,
    cache_path: {
      cache_key: cachePath.cacheKey,
      decision: cachePath.decision,
      mutation_gate: cachePath.mutationGate,
    },
    command_path: {
      acceptance_state: commandReceipt.acceptance_state,
      projection_stream_class: commandReceipt.projection_stream_class,
      receipt_id: commandReceipt.receipt_id,
    },
    object_store_path: objectStorePath,
    queue_path: queuePath,
  };
}

if (import.meta.main) {
  const result = await runLocalRuntimeSmoke();
  console.log(`${JSON.stringify(result, null, 2)}\n`);
}
