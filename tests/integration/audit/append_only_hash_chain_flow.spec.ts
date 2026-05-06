import { expect, test } from "@playwright/test";

import { createAppendOnlyAuditWriter } from "../../../packages/audit/src/index.ts";

test("serializes concurrent writes into a contiguous hash chain and fails closed on broken heads", async () => {
  const writer = await createAppendOnlyAuditWriter();
  const tenantId = "tenant.taxat";
  const manifestId = "manifest.audit.integration.076";
  const workflowId = "workflow.audit.integration.076";

  const appends = await Promise.all([
    writer.append({
      correlationContext: {
        manifest_id: manifestId,
        mode: "COMPLIANCE",
        root_manifest_id: manifestId,
        run_kind: "INTERACTIVE",
        tenant_id: tenantId,
        workflow_item_id: workflowId,
      },
      eventTime: "2026-04-23T14:00:00Z",
      eventType: "ManifestFrozen",
      publicationRef: "integration-append-1",
      serviceRefOrNull: "service.control-plane-api",
      tenantId,
    }),
    writer.append({
      correlationContext: {
        manifest_id: manifestId,
        mode: "COMPLIANCE",
        root_manifest_id: manifestId,
        run_kind: "INTERACTIVE",
        tenant_id: tenantId,
        workflow_item_id: workflowId,
      },
      eventTime: "2026-04-23T14:01:00Z",
      eventType: "ManifestSealed",
      publicationRef: "integration-append-2",
      serviceRefOrNull: "service.control-plane-api",
      tenantId,
    }),
    writer.append({
      correlationContext: {
        manifest_id: manifestId,
        mode: "COMPLIANCE",
        root_manifest_id: manifestId,
        run_kind: "INTERACTIVE",
        tenant_id: tenantId,
        workflow_item_id: workflowId,
      },
      eventTime: "2026-04-23T14:02:00Z",
      eventType: "ManifestCompleted",
      publicationRef: "integration-append-3",
      serviceRefOrNull: "service.control-plane-api",
      tenantId,
    }),
  ]);

  const streamRef = appends[0].storedEvent.event.audit_stream_ref;
  const events = writer.readStream(streamRef);
  expect(events.map((entry) => entry.event.stream_sequence)).toEqual([1, 2, 3]);
  expect(writer.verifyStream(streamRef).status).toBe("VERIFIED");

  const duplicate = await writer.append({
    correlationContext: {
      manifest_id: manifestId,
      mode: "COMPLIANCE",
      root_manifest_id: manifestId,
      run_kind: "INTERACTIVE",
      tenant_id: tenantId,
      workflow_item_id: workflowId,
    },
    eventTime: "2026-04-23T14:02:00Z",
    eventType: "ManifestCompleted",
    publicationRef: "integration-append-3",
    serviceRefOrNull: "service.control-plane-api",
    tenantId,
  });
  expect(duplicate.status).toBe("DUPLICATE_IGNORED");

  const release = await writer.append({
    eventTime: "2026-04-23T14:05:00Z",
    eventType: "BuildAttested",
    objectRefs: ["release.bundle.integration.076"],
    publicationRef: "integration-release-1",
    reasonCodes: ["ATTESTATION_PUBLISHED"],
    serviceRefOrNull: "service.release-engine",
    tenantId,
  });
  writer.markSignatureBatchOutcome({
    failureReasonCodeOrNull: "KMS_BATCH_TIMEOUT",
    signatureRef: release.storedEvent.event.signature_ref,
    state: "FAILED",
  });
  expect(writer.verifyStream(release.storedEvent.event.audit_stream_ref).status).toBe("VERIFIED");

  writer.seedHead({
    audit_stream_ref: "audit.tenant.tenant.taxat.family.FAILURE",
    continuity_state: "BROKEN",
    last_audit_event_id_or_null: "audit.broken",
    last_event_hash_or_null: null,
    last_recorded_at_or_null: "2026-04-23T14:10:00Z",
    stream_sequence: 3,
  });

  await expect(
    writer.append({
      correlationContext: {
        tenant_id: tenantId,
      },
      eventTime: "2026-04-23T14:11:00Z",
      eventType: "ErrorRecorded",
      objectRefs: ["artifact.broken.076"],
      publicationRef: "broken-head",
      reasonCodes: ["HEAD_BROKEN"],
      serviceRefOrNull: "service.failure-engine",
      tenantId,
    }),
  ).rejects.toThrow(/AUDIT_CONTINUITY_BROKEN/);
});
