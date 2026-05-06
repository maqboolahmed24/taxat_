import { expect, test } from "@playwright/test";

import { createTelemetryBootstrap } from "../../../packages/telemetry/src/index.ts";

async function createBootstrap() {
  return createTelemetryBootstrap({
    buildArtifactDigest: "sha256:telemetry-integration-075",
    buildRef: "build.telemetry.integration.075",
    deploymentRef: "deploy.telemetry.integration.075",
    environmentRef: "PRODUCTION",
    instanceRef: "instance.telemetry.integration.075",
    releaseCandidateHash: "release-candidate.telemetry.integration.075",
    schemaBundleHash: "schema-bundle.telemetry.integration.075",
    serviceName: "control-plane-api",
    startedAt: "2026-04-23T09:10:00Z",
    workspaceId: "apps/control-plane-api",
  });
}

test("propagates safe correlation across http, queue, stream, and upload continuation boundaries", async () => {
  const bootstrap = await createBootstrap();

  const publicIngress = bootstrap.extractHttpContext({
    authoritativeContext: {
      client_id: "client.integration.075",
      manifest_id: "manifest.integration.075",
      mode: "COMPLIANCE",
      root_manifest_id: "manifest.integration.075",
      run_kind: "INTERACTIVE",
      tenant_id: "tenant.taxat",
      workflow_item_id: "workflow.integration.075",
    },
    headers: {},
    spanSeed: "public-http",
    trustBoundary: "PUBLIC_INGRESS",
  });

  const internalHeaders = bootstrap.injectHttpContext({
    audience: "INTERNAL_SERVICE",
    context: publicIngress.context,
  });
  const internalService = bootstrap.extractHttpContext({
    authoritativeContext: {
      authority_operation_id: "authority.operation.075",
      manifest_id: "manifest.integration.075",
      submission_record_id: "submission.075",
      tenant_id: "tenant.taxat",
      workflow_item_id: "workflow.integration.075",
    },
    headers: internalHeaders,
    spanSeed: "internal-http",
    trustBoundary: "INTERNAL_SERVICE",
  });

  const queueEnvelope = bootstrap.createMessageEnvelope({
    channel: "QUEUE_MESSAGE",
    context: internalService.context,
    safeRefs: {
      queue_family_ref: "worker.dispatch.runtime",
    },
  });
  const queueConsumer = bootstrap.extractMessageContext({
    authoritativeContext: {
      manifest_id: "manifest.integration.075",
      tenant_id: "tenant.taxat",
      workflow_item_id: "workflow.integration.075",
    },
    envelope: queueEnvelope,
    spanSeed: "queue-consume",
  });

  const streamEnvelope = bootstrap.createMessageEnvelope({
    channel: "STREAM_PUBLICATION",
    context: queueConsumer.context,
    opaqueTransportRefOrNull: "resume-token-raw-075",
    safeRefs: {
      stream_scope_class: "MANIFEST_RUNTIME",
    },
  });
  const streamPublisher = bootstrap.extractMessageContext({
    authoritativeContext: {
      manifest_id: "manifest.integration.075",
      tenant_id: "tenant.taxat",
      workflow_item_id: "workflow.integration.075",
    },
    envelope: streamEnvelope,
    spanSeed: "stream-publish",
  });

  const uploadEnvelope = bootstrap.createMessageEnvelope({
    channel: "UPLOAD_CONTINUATION",
    context: queueConsumer.context,
    opaqueTransportRefOrNull: "upload-retry-token-075",
    safeRefs: {
      storage_ref: "storage.ref.075",
      upload_session_id: "upload.session.075",
    },
  });
  const uploadRetry = bootstrap.extractMessageContext({
    authoritativeContext: {
      manifest_id: "manifest.integration.075",
      tenant_id: "tenant.taxat",
      workflow_item_id: "workflow.integration.075",
    },
    envelope: uploadEnvelope,
    spanSeed: "upload-retry",
  });

  expect(publicIngress.context.trace_id).toBeTruthy();
  expect(internalService.context.trace_id).toBe(publicIngress.context.trace_id);
  expect(queueConsumer.context.trace_id).toBe(publicIngress.context.trace_id);
  expect(streamPublisher.context.trace_id).toBe(publicIngress.context.trace_id);
  expect(uploadRetry.context.trace_id).toBe(publicIngress.context.trace_id);

  expect(streamEnvelope.transport_ref_hash_or_null).toBeTruthy();
  expect(streamEnvelope.transport_ref_hash_or_null).not.toBe("resume-token-raw-075");
  expect(uploadEnvelope.transport_ref_hash_or_null).toBeTruthy();
  expect(uploadEnvelope.transport_ref_hash_or_null).not.toBe("upload-retry-token-075");

  expect(queueConsumer.warnings).toEqual([]);
  expect(streamPublisher.warnings).toEqual([]);
  expect(uploadRetry.warnings).toEqual([]);

  const sampledTrace = bootstrap.createTraceSpan({
    correlationContext: queueConsumer.context,
    endedAtOrNull: "2026-04-23T09:12:02Z",
    manifestId: "manifest.integration.075",
    spanAttributes: {
      module_code: "SNAPSHOT_BUILD",
    },
    spanCode: "SNAPSHOT_BUILD",
    startedAt: "2026-04-23T09:12:00Z",
    statusCode: "OK",
  });

  expect(sampledTrace.sampling_class).toBe("SAMPLED_OPERATIONAL");
  expect(bootstrap.auditBoundary).toBe("TELEMETRY_CORRELATES_TO_AUDIT_BUT_DOES_NOT_REPLACE_IT");
});
