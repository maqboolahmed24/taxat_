import { expect, test } from "@playwright/test";

import {
  asReferenceRouteToken,
  computeArtifactPresentationTargets,
  computeDeliveryBindingHash,
  classifyReferenceField,
  materializeCustomerDeliveryAffordance,
  DeliveryBindingError,
  RouteTokenError,
} from "../../../packages/domain-kernel/src/references/index.ts";

test("classifies exact and suffix-based reference families without collapsing them into generic refs", () => {
  expect(classifyReferenceField("manifest_id").family_ref).toBe("IDENTITY");
  expect(classifyReferenceField("artifact_ref").family_ref).toBe("REFERENCE");
  expect(classifyReferenceField("request_binding_hash").family_ref).toBe("HASH");
  expect(classifyReferenceField("preview_target_ref").family_ref).toBe("TARGET_REF");
  expect(classifyReferenceField("storage_ref").family_ref).toBe("STORAGE_REF");
  expect(classifyReferenceField("download_ref").family_ref).toBe("DELIVERY_BINDING");
  expect(classifyReferenceField("route_identity_ref").family_ref).toBe("ROUTE_TOKEN");
  expect(classifyReferenceField("default_download_target_ref_or_null").family_ref).toBe(
    "TARGET_REF",
  );
});

test("route tokens reject absolute URLs, signed query strings, and tenant hints", () => {
  expect(asReferenceRouteToken("/manifests/{manifest_id}?focus=workflow:{item_id}", "route")).toBe(
    "/manifests/{manifest_id}?focus=workflow:{item_id}",
  );

  expect(() => asReferenceRouteToken("https://cdn.taxat.example/file.pdf", "route")).toThrowError(
    RouteTokenError,
  );
  expect(() =>
    asReferenceRouteToken("/portal/documents?tenant_id=tenant-a&focus=preview", "route"),
  ).toThrowError(RouteTokenError);
  expect(() => asReferenceRouteToken("/download?signature=opaque-secret", "route")).toThrowError(
    RouteTokenError,
  );
});

test("delivery binding hash stays deterministic and changes when route context changes", () => {
  const context = {
    accessBindingHashOrNull: "5ef1450d289ee6f042ef37003dd46f96f26f95ece6f088be6c3081df41ff57d6",
    affordance: "DOWNLOAD" as const,
    canonicalObjectRef: "artifact.manifest-2026-q2.current",
    customerSafeProjectionRefOrNull: "projection.customer-safe.manifest-2026-q2.current",
    maskingPostureHashOrNull: "69c974270fa4f8727b5bcf8f4fbb5dfa136b29f8e7b0a8e5afefaaed8e1c5367",
    previewSubjectRefOrNull: "artifact.manifest-2026-q2.current.page-1",
    principalScopeRef: "scope.operator.caseworker",
    routeIdentityRef: "/manifests/{manifest_id}?focus=workflow:{item_id}",
    sessionBindingHash: "f80a7163b8f9dcb7a7f7dc91fe4421bdf538713ff4fc29fd7aaac912ad6d4630",
    targetRef: "target.download.manifest-2026-q2.current",
    tenantId: "tenant.taxat-sandbox",
    visibilityPartitionRefOrNull: "visibility.customer-safe.operator-review",
  };

  expect(computeDeliveryBindingHash(context)).toBe(computeDeliveryBindingHash(context));
  expect(
    computeDeliveryBindingHash({
      ...context,
      routeIdentityRef: "/portal/requests/{item_id}",
    }),
  ).not.toBe(computeDeliveryBindingHash(context));
});

test("storage refs never backfill current customer targets implicitly", () => {
  const selection = computeArtifactPresentationTargets({
    currentArtifactOrNull: {
      artifactRef: "artifact.operator-only.manifest-2026-q2.current",
      downloadRefOrNull: null,
      exposurePosture: "INTERNAL_ONLY",
      lineageRole: "CURRENT",
      previewTargetRefOrNull: null,
      printTargetRefOrNull: null,
      storageRefOrNull: "storage.upload-staging.upload-session-2026-04-23",
    },
    historicalArtifacts: [],
  });

  expect(selection.defaultPreviewTargetRefOrNull).toBeNull();
  expect(selection.defaultDownloadRefOrNull).toBeNull();
  expect(selection.warnings).toContain("STORAGE_REF_NEVER_IMPLIES_CUSTOMER_TARGET");
});

test("customer delivery affordances reject raw storage refs as download truth", () => {
  expect(() =>
    materializeCustomerDeliveryAffordance({
      artifactRef: "artifact.manifest-2026-q2.current",
      deliveryBindingHash: "8f9e2c41f1c4f9684a6bbdfe58f40a3e67ccd44bead0cedd6d69246b2fa13b21",
      downloadRef: "storage.retained-evidence.manifest-2026-q2.current",
      sourceStorageRefOrNull: "storage.retained-evidence.manifest-2026-q2.current",
      targetRef: "target.download.manifest-2026-q2.current",
    }),
  ).toThrowError(DeliveryBindingError);
});
