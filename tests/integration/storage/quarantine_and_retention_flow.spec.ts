import { expect, test } from "@playwright/test";

import { createInMemoryGovernedObjectStore } from "../../../packages/domain-kernel/src/storage/object_store.ts";

function deliveryContext(objectRef: string) {
  return {
    accessBindingHashOrNull: "access.hash.integration.current",
    affordance: "DOWNLOAD" as const,
    canonicalObjectRef: objectRef,
    customerSafeProjectionRefOrNull: `projection.customer-safe.${objectRef}`,
    maskingPostureHashOrNull: "masking.hash.integration.current",
    previewSubjectRefOrNull: objectRef,
    principalScopeRef: "scope.customer.portal",
    routeIdentityRef: "/documents/{request_id}?focus=current",
    sessionBindingHash: "session.binding.integration.current",
    targetRef: `target.download.${objectRef}`,
    tenantId: "tenant.taxat-sandbox",
    visibilityPartitionRefOrNull: "visibility.customer-safe.portal",
  };
}

test("staged upload can settle cleanly into a customer-safe derivative with governed delivery", async () => {
  const store = await createInMemoryGovernedObjectStore({ reload: true });
  const source = store.stageObject({
    at: "2026-04-23T10:00:00Z",
    objectClassRef: "UPLOAD_SESSION_SOURCE",
    objectRef: "artifact.upload-session.integration.001",
    requestVersionRefOrNull: "request.version.integration.001",
    storageRef: "storage.upload-staging.upload-session-2026-04-23-integration-001",
    tenantId: "tenant.taxat-sandbox",
    uploadSessionIdOrNull: "upload.session.integration.001",
  });
  expect(source.retentionTagOrNull?.anchor_event).toBe("OBJECT_STAGE_WRITE");

  const scanning = store.startScan({
    at: "2026-04-23T10:01:00Z",
    objectRef: source.objectRef,
  });
  expect(scanning.lifecycleState).toBe("SCANNING");

  const publishedSource = store.completeScan({
    at: "2026-04-23T10:02:00Z",
    clean: true,
    objectRef: source.objectRef,
  });
  expect(publishedSource.lifecycleState).toBe("PUBLISHED");
  expect(publishedSource.publicationState).toBe("INTERNAL_ONLY");
  expect(publishedSource.retentionTagOrNull?.anchor_event).toBe("OBJECT_PUBLISHED");

  const derivative = store.publishCustomerSafeDerivative({
    at: "2026-04-23T10:03:00Z",
    derivativeObjectRef: "artifact.customer-safe.integration.001",
    sourceObjectRef: publishedSource.objectRef,
    storageRef: "storage.derived-preview.artifact-customer-safe-integration-001",
  });
  const deliverable = store.bindDelivery({
    affordance: "DOWNLOAD",
    at: "2026-04-23T10:04:00Z",
    context: deliveryContext(derivative.objectRef),
    downloadRefOrNull: "download.customer-safe.integration.001",
    objectRef: derivative.objectRef,
    previewTargetRefOrNull: "target.preview.customer-safe.integration.001",
    targetRef: "target.download.customer-safe.integration.001",
  });

  expect(deliverable.lifecycleState).toBe("DELIVERABLE");
  expect(deliverable.deliveryBindingHashOrNull).toBeTruthy();
  expect(deliverable.artifactRetentionOrNull?.retention_class).toBe("derived_artifact");
});

test("late quarantine revokes delivery and erasure stays limited while current views still reference the object", async () => {
  const store = await createInMemoryGovernedObjectStore();
  const source = store.stageObject({
    at: "2026-04-23T10:10:00Z",
    objectClassRef: "UPLOAD_SESSION_SOURCE",
    objectRef: "artifact.upload-session.integration.002",
    requestVersionRefOrNull: "request.version.integration.002",
    storageRef: "storage.upload-staging.upload-session-2026-04-23-integration-002",
    tenantId: "tenant.taxat-sandbox",
    uploadSessionIdOrNull: "upload.session.integration.002",
  });
  store.startScan({
    at: "2026-04-23T10:11:00Z",
    objectRef: source.objectRef,
  });
  const publishedSource = store.completeScan({
    at: "2026-04-23T10:12:00Z",
    clean: true,
    objectRef: source.objectRef,
  });
  const derivative = store.publishCustomerSafeDerivative({
    at: "2026-04-23T10:13:00Z",
    derivativeObjectRef: "artifact.customer-safe.integration.002",
    sourceObjectRef: publishedSource.objectRef,
    storageRef: "storage.derived-preview.artifact-customer-safe-integration-002",
  });
  const deliverable = store.bindDelivery({
    affordance: "DOWNLOAD",
    at: "2026-04-23T10:14:00Z",
    context: deliveryContext(derivative.objectRef),
    downloadRefOrNull: "download.customer-safe.integration.002",
    objectRef: derivative.objectRef,
    previewTargetRefOrNull: "target.preview.customer-safe.integration.002",
    targetRef: "target.download.customer-safe.integration.002",
  });
  expect(deliverable.lifecycleState).toBe("DELIVERABLE");

  const quarantined = store.quarantineObject({
    at: "2026-04-23T10:15:00Z",
    objectRef: derivative.objectRef,
    reasonCodes: ["LATE_RESCAN_QUARANTINE"],
    triggerRef: "POST_PUBLICATION_RESCAN_QUARANTINE",
  });
  expect(quarantined.lifecycleState).toBe("QUARANTINED");
  expect(quarantined.downloadRefOrNull).toBeNull();
  expect(quarantined.retentionTagOrNull?.proof_preservation_basis_ref).toBe(
    "proof.preservation.quarantine-lineage",
  );

  const limited = store.requestErasure({
    at: "2026-04-23T10:16:00Z",
    currentArtifactRefs: ["artifact.current.visible.integration.002"],
    objectRef: derivative.objectRef,
  });

  expect(limited.lifecycleState).toBe("RETAINED");
  expect(limited.artifactRetentionOrNull?.lifecycle_state).toBe("LIMITED");
  expect(limited.artifactRetentionOrNull?.limitation_reason_codes).toContain(
    "CURRENT_ARTIFACT_VIEW_REFERENCE_BLOCKS_ERASURE",
  );
});
