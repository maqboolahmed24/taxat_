import { expect, test } from "@playwright/test";

import { createInMemoryGovernedObjectStore } from "../../../packages/domain-kernel/src/storage/object_store.ts";

function deliveryContext(
  objectRef: string,
  routeIdentityRef = "/documents/{request_id}?focus=current",
) {
  return {
    accessBindingHashOrNull: "access.hash.portal.current",
    affordance: "DOWNLOAD" as const,
    canonicalObjectRef: objectRef,
    customerSafeProjectionRefOrNull: `projection.customer-safe.${objectRef}`,
    maskingPostureHashOrNull: "masking.hash.portal.current",
    previewSubjectRefOrNull: objectRef,
    principalScopeRef: "scope.customer.portal",
    routeIdentityRef,
    sessionBindingHash: "session.binding.portal.current",
    targetRef: `target.download.${objectRef}`,
    tenantId: "tenant.taxat-sandbox",
    visibilityPartitionRefOrNull: "visibility.customer-safe.portal",
  };
}

test("cross-device resume preserves the same storage ref for the upload session", async () => {
  const store = await createInMemoryGovernedObjectStore({ reload: true });
  const staged = store.stageObject({
    at: "2026-04-23T09:00:00Z",
    objectClassRef: "UPLOAD_SESSION_SOURCE",
    objectRef: "artifact.upload-session.001",
    requestVersionRefOrNull: "request.version.001",
    storageRef: "storage.upload-staging.upload-session-2026-04-23-001",
    tenantId: "tenant.taxat-sandbox",
    uploadSessionIdOrNull: "upload.session.001",
  });

  const resumed = store.resumeObject({
    nextRequestVersionRef: "request.version.002",
    objectRef: staged.objectRef,
    previousRequestVersionRef: "request.version.001",
  });

  expect(resumed.storageRef).toBe(staged.storageRef);
  expect(resumed.requestVersionRefOrNull).toBe("request.version.002");
});

test("late quarantine revokes delivery handles that were previously lawful", async () => {
  const store = await createInMemoryGovernedObjectStore();
  const source = store.stageObject({
    at: "2026-04-23T09:10:00Z",
    objectClassRef: "UPLOAD_SESSION_SOURCE",
    objectRef: "artifact.upload-session.002",
    requestVersionRefOrNull: "request.version.010",
    storageRef: "storage.upload-staging.upload-session-2026-04-23-002",
    tenantId: "tenant.taxat-sandbox",
    uploadSessionIdOrNull: "upload.session.002",
  });
  store.startScan({ at: "2026-04-23T09:11:00Z", objectRef: source.objectRef });
  store.completeScan({
    at: "2026-04-23T09:12:00Z",
    clean: true,
    objectRef: source.objectRef,
  });
  const derivative = store.publishCustomerSafeDerivative({
    at: "2026-04-23T09:13:00Z",
    derivativeObjectRef: "artifact.customer-safe.002",
    sourceObjectRef: source.objectRef,
    storageRef: "storage.derived-preview.artifact-customer-safe-002",
  });
  const deliverable = store.bindDelivery({
    affordance: "DOWNLOAD",
    at: "2026-04-23T09:14:00Z",
    context: deliveryContext(derivative.objectRef),
    downloadRefOrNull: "download.customer-safe.002",
    objectRef: derivative.objectRef,
    previewTargetRefOrNull: "target.preview.customer-safe.002",
    targetRef: "target.download.customer-safe.002",
  });

  expect(deliverable.deliveryBindingHashOrNull).toBeTruthy();

  const quarantined = store.quarantineObject({
    at: "2026-04-23T09:15:00Z",
    objectRef: derivative.objectRef,
    reasonCodes: ["LATE_RESCAN_QUARANTINE"],
    triggerRef: "POST_PUBLICATION_RESCAN_QUARANTINE",
  });

  expect(quarantined.lifecycleState).toBe("QUARANTINED");
  expect(quarantined.deliveryBindingHashOrNull).toBeNull();
  expect(quarantined.downloadRefOrNull).toBeNull();
});

test("internal-only source requires a customer-safe derivative before delivery can be bound", async () => {
  const store = await createInMemoryGovernedObjectStore();
  const source = store.stageObject({
    at: "2026-04-23T09:20:00Z",
    objectClassRef: "UPLOAD_SESSION_SOURCE",
    objectRef: "artifact.upload-session.003",
    requestVersionRefOrNull: "request.version.020",
    storageRef: "storage.upload-staging.upload-session-2026-04-23-003",
    tenantId: "tenant.taxat-sandbox",
    uploadSessionIdOrNull: "upload.session.003",
  });
  store.startScan({ at: "2026-04-23T09:21:00Z", objectRef: source.objectRef });
  const publishedSource = store.completeScan({
    at: "2026-04-23T09:22:00Z",
    clean: true,
    objectRef: source.objectRef,
  });

  expect(() =>
    store.bindDelivery({
      affordance: "DOWNLOAD",
      at: "2026-04-23T09:23:00Z",
      context: deliveryContext(publishedSource.objectRef),
      downloadRefOrNull: "download.source.003",
      objectRef: publishedSource.objectRef,
      previewTargetRefOrNull: null,
      targetRef: "target.download.source.003",
    }),
  ).toThrow(/requires a customer-safe derivative|no delivery row/i);

  const derivative = store.publishCustomerSafeDerivative({
    at: "2026-04-23T09:24:00Z",
    derivativeObjectRef: "artifact.customer-safe.003",
    sourceObjectRef: publishedSource.objectRef,
    storageRef: "storage.derived-preview.artifact-customer-safe-003",
  });
  const deliverable = store.bindDelivery({
    affordance: "DOWNLOAD",
    at: "2026-04-23T09:25:00Z",
    context: deliveryContext(derivative.objectRef),
    downloadRefOrNull: "download.customer-safe.003",
    objectRef: derivative.objectRef,
    previewTargetRefOrNull: "target.preview.customer-safe.003",
    targetRef: "target.download.customer-safe.003",
  });

  expect(deliverable.lifecycleState).toBe("DELIVERABLE");
  expect(deliverable.derivativeSourceObjectRefOrNull).toBe(publishedSource.objectRef);
});

test("delivery binding drift invalidates a previously minted download handle", async () => {
  const store = await createInMemoryGovernedObjectStore();
  const derivative = store.publishCustomerSafeDerivative({
    at: "2026-04-23T09:30:00Z",
    derivativeObjectRef: "artifact.customer-safe.004",
    sourceObjectRef: store.stageObject({
      at: "2026-04-23T09:29:00Z",
      objectClassRef: "UPLOAD_SESSION_SOURCE",
      objectRef: "artifact.upload-session.004",
      requestVersionRefOrNull: "request.version.030",
      storageRef: "storage.upload-staging.upload-session-2026-04-23-004",
      tenantId: "tenant.taxat-sandbox",
      uploadSessionIdOrNull: "upload.session.004",
    }).objectRef,
    storageRef: "storage.derived-preview.artifact-customer-safe-004",
  });
  const deliverable = store.bindDelivery({
    affordance: "DOWNLOAD",
    at: "2026-04-23T09:31:00Z",
    context: deliveryContext(derivative.objectRef),
    downloadRefOrNull: "download.customer-safe.004",
    objectRef: derivative.objectRef,
    previewTargetRefOrNull: "target.preview.customer-safe.004",
    targetRef: "target.download.customer-safe.004",
  });

  expect(() =>
    store.assertDeliveryCurrent({
      bindingHash: deliverable.deliveryBindingHashOrNull!,
      context: deliveryContext(derivative.objectRef, "/documents/{request_id}?focus=history"),
      objectRef: derivative.objectRef,
    }),
  ).toThrow(/delivery binding drift/i);
});

test("erasure request downgrades to limited posture while current artifact refs still point at the object", async () => {
  const store = await createInMemoryGovernedObjectStore();
  const derivative = store.publishCustomerSafeDerivative({
    at: "2026-04-23T09:40:00Z",
    derivativeObjectRef: "artifact.customer-safe.005",
    sourceObjectRef: store.stageObject({
      at: "2026-04-23T09:39:00Z",
      objectClassRef: "UPLOAD_SESSION_SOURCE",
      objectRef: "artifact.upload-session.005",
      requestVersionRefOrNull: "request.version.040",
      storageRef: "storage.upload-staging.upload-session-2026-04-23-005",
      tenantId: "tenant.taxat-sandbox",
      uploadSessionIdOrNull: "upload.session.005",
    }).objectRef,
    storageRef: "storage.derived-preview.artifact-customer-safe-005",
  });

  const limited = store.requestErasure({
    at: "2026-04-23T09:41:00Z",
    currentArtifactRefs: ["artifact.current.visible.005"],
    objectRef: derivative.objectRef,
  });

  expect(limited.lifecycleState).toBe("RETAINED");
  expect(limited.artifactRetentionOrNull?.lifecycle_state).toBe("LIMITED");
  expect(limited.artifactRetentionOrNull?.limitation_reason_codes).toContain(
    "CURRENT_ARTIFACT_VIEW_REFERENCE_BLOCKS_ERASURE",
  );
});
