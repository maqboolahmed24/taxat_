import { expect, test } from "@playwright/test";

import {
  buildCacheIsolationKey,
  createCacheIsolationContract,
  isCanonicalCacheIsolationContract,
} from "../../../packages/domain-kernel/src/cache/cache_isolation_key.ts";
import { buildCachePurgePlan } from "../../../packages/domain-kernel/src/cache/cache_purge_plan.ts";
import { assessCacheReuseGuard } from "../../../packages/domain-kernel/src/cache/cache_reuse_guard.ts";
import { computeMaskingPostureFingerprint } from "../../../packages/domain-kernel/src/cache/masking_posture_fingerprint.ts";
import { assessPreviewExportReuse } from "../../../packages/domain-kernel/src/cache/preview_export_binding.ts";
import { deriveVisibilityPartitionKey } from "../../../packages/domain-kernel/src/cache/visibility_partition_key.ts";

test("workspace and portal contracts derive canonical masking and visibility bindings", async () => {
  const maskingFingerprint = computeMaskingPostureFingerprint({
    accessBindingHashOrNull: "access-binding.workspace.73",
    customerSafeProjection: true,
    maskingDimensionRefsOrNull: ["masking.portal.customer-safe", "masking.portal.history"],
    principalClass: "CUSTOMER_VISIBLE",
  });
  const sameMaskingFingerprint = computeMaskingPostureFingerprint({
    accessBindingHashOrNull: "access-binding.workspace.73",
    customerSafeProjection: true,
    maskingDimensionRefsOrNull: ["masking.portal.history", "masking.portal.customer-safe"],
    principalClass: "CUSTOMER_VISIBLE",
  });
  expect(maskingFingerprint).toBe(sameMaskingFingerprint);

  const visibilityKey = deriveVisibilityPartitionKey({
    cacheScopeClass: "CLIENT_PORTAL_WORKSPACE",
    canonicalDimensionFields: [
      "tenant_id",
      "client_id_or_null",
      "principal_class",
      "access_binding_hash_or_null",
      "masking_posture_fingerprint_or_null",
      "customer_safe_projection",
      "shell_family",
    ],
    fieldValues: {
      access_binding_hash_or_null: "access-binding.workspace.73",
      client_id_or_null: "client.portal.73",
      customer_safe_projection: true,
      masking_posture_fingerprint_or_null: maskingFingerprint,
      principal_class: "CUSTOMER_VISIBLE",
      shell_family: "CLIENT_PORTAL_SHELL",
      tenant_id: "tenant.taxat-sandbox",
    },
    visibilityDimensionRefsOrNull: ["audience.customer", "visibility.portal.request-73"],
  });

  const contract = await createCacheIsolationContract({
    accessBindingHashOrNull: "access-binding.workspace.73",
    cacheScopeClass: "CLIENT_PORTAL_WORKSPACE",
    canonicalObjectRef: "artifact.portal.request-73",
    clientIdOrNull: "client.portal.73",
    customerSafeProjection: true,
    maskingPostureFingerprintOrNull: maskingFingerprint,
    principalClass: "CUSTOMER_VISIBLE",
    projectionVersionRef: "projection.portal.request-73.v9",
    routeIdentityRef: "/portal/requests/request-73",
    sessionBindingHash: "session-binding.portal.73",
    shellFamily: "CLIENT_PORTAL_SHELL",
    tenantId: "tenant.taxat-sandbox",
    visibilityCachePartitionKeyOrNull: visibilityKey,
  });

  expect(contract.visibility_cache_partition_key_or_null).toBe(visibilityKey);
  expect(contract.cache_partition_ref).toBe(visibilityKey);
  expect(isCanonicalCacheIsolationContract(contract)).toBe(true);

  const cacheKey = await buildCacheIsolationKey(contract);
  expect(cacheKey).toContain(contract.delivery_binding_hash);
  expect(cacheKey).toContain(visibilityKey);
});

test("governance scopes clear access, masking, visibility, and preview bindings", async () => {
  const contract = await createCacheIsolationContract({
    cacheScopeClass: "GOVERNANCE_POLICY_SNAPSHOT",
    canonicalObjectRef: "artifact.governance.policy.73",
    principalClass: "STAFF_FULL",
    projectionVersionRef: "projection.governance.policy.73.v5",
    routeIdentityRef: "/governance/policies/73",
    sessionBindingHash: "session-binding.governance.73",
    shellFamily: "GOVERNANCE_DENSITY_SHELL",
    tenantId: "tenant.taxat-sandbox",
  });

  expect(contract.access_binding_hash_or_null).toBeNull();
  expect(contract.masking_posture_fingerprint_or_null).toBeNull();
  expect(contract.visibility_cache_partition_key_or_null).toBeNull();
  expect(contract.preview_subject_ref_or_null).toBeNull();
  expect(contract.customer_safe_projection).toBe(false);
});

test("native secondary window contracts require preview subject binding", async () => {
  await expect(
    createCacheIsolationContract({
      accessBindingHashOrNull: "access-binding.native.73",
      cacheScopeClass: "NATIVE_OPERATOR_SECONDARY_WINDOW_SCENE",
      canonicalObjectRef: "artifact.packet.73",
      principalClass: "STAFF_FULL",
      projectionVersionRef: "projection.packet.73.v3",
      routeIdentityRef: "/native/secondary/packet-73",
      sessionBindingHash: "session-binding.native.73",
      shellFamily: "CALM_SHELL",
      tenantId: "tenant.taxat-sandbox",
    }),
  ).rejects.toThrow(/requires a preview subject binding/);
});

test("reuse guard permits read-only restore while live legality remains pending", async () => {
  const stored = await createCacheIsolationContract({
    accessBindingHashOrNull: "access-binding.workspace.73",
    cacheScopeClass: "WORKSPACE_SNAPSHOT",
    canonicalObjectRef: "artifact.workspace.item-73",
    clientIdOrNull: "client.ops.73",
    maskingDimensionRefsOrNull: ["masking.visibility.staff", "masking.route.workspace"],
    principalClass: "STAFF_FULL",
    projectionVersionRef: "projection.workspace.item-73.v4",
    routeIdentityRef: "/work/items/item-73",
    sessionBindingHash: "session-binding.workspace.73",
    shellFamily: "CALM_SHELL",
    shellStabilityRefOrNull: "shell.stability.workspace.73",
    tenantId: "tenant.taxat-sandbox",
    visibilityDimensionRefsOrNull: ["visibility.staff-full", "queue.assigned"],
  });
  const requested = await createCacheIsolationContract({
    accessBindingHashOrNull: "access-binding.workspace.73",
    cacheScopeClass: "WORKSPACE_SNAPSHOT",
    canonicalObjectRef: "artifact.workspace.item-73",
    clientIdOrNull: "client.ops.73",
    maskingDimensionRefsOrNull: ["masking.visibility.staff", "masking.route.workspace"],
    principalClass: "STAFF_FULL",
    projectionVersionRef: "projection.workspace.item-73.v4",
    routeIdentityRef: "/work/items/item-73",
    sessionBindingHash: "session-binding.workspace.73",
    shellFamily: "CALM_SHELL",
    shellStabilityRefOrNull: "shell.stability.workspace.73",
    tenantId: "tenant.taxat-sandbox",
    visibilityDimensionRefsOrNull: ["visibility.staff-full", "queue.assigned"],
  });

  const result = await assessCacheReuseGuard({
    liveLegalityState: "CACHE_ONLY",
    requestedContract: requested,
    storedContract: stored,
  });

  expect(result.decision).toBe("READ_ONLY_RESTORE");
  expect(result.allowed).toBe(true);
  expect(result.hydrationAllowed).toBe(true);
  expect(result.mutationGate).toBe("BLOCK_MUTATION_PENDING_LIVE_LEGALITY");
  expect(result.purgePlan.triggerCodes).toEqual([]);
});

test("purge plan expands on access, masking, and visibility drift", async () => {
  const stored = await createCacheIsolationContract({
    accessBindingHashOrNull: "access-binding.portal.73.v1",
    cacheScopeClass: "CLIENT_PORTAL_WORKSPACE",
    canonicalObjectRef: "artifact.portal.request-73",
    clientIdOrNull: "client.portal.73",
    maskingDimensionRefsOrNull: ["masking.portal.customer-safe", "masking.portal.history"],
    principalClass: "CUSTOMER_VISIBLE",
    projectionVersionRef: "projection.portal.request-73.v9",
    routeIdentityRef: "/portal/requests/request-73",
    sessionBindingHash: "session-binding.portal.73",
    shellFamily: "CLIENT_PORTAL_SHELL",
    tenantId: "tenant.taxat-sandbox",
    visibilityDimensionRefsOrNull: ["audience.customer", "visibility.portal.request-73"],
  });
  const requested = await createCacheIsolationContract({
    accessBindingHashOrNull: "access-binding.portal.73.v2",
    cacheScopeClass: "CLIENT_PORTAL_WORKSPACE",
    canonicalObjectRef: "artifact.portal.request-73",
    clientIdOrNull: "client.portal.73",
    maskingDimensionRefsOrNull: ["masking.portal.customer-safe", "masking.portal.redacted"],
    principalClass: "CUSTOMER_VISIBLE",
    projectionVersionRef: "projection.portal.request-73.v9",
    routeIdentityRef: "/portal/requests/request-73",
    sessionBindingHash: "session-binding.portal.73",
    shellFamily: "CLIENT_PORTAL_SHELL",
    tenantId: "tenant.taxat-sandbox",
    visibilityDimensionRefsOrNull: ["audience.customer.narrowed", "visibility.portal.request-73"],
  });

  const plan = await buildCachePurgePlan({
    requestedContract: requested,
    storedContract: stored,
  });

  expect(plan.triggerCodes).toEqual(
    expect.arrayContaining([
      "ACCESS_BINDING_CHANGE",
      "MASKING_CHANGE",
      "VISIBILITY_PARTITION_CHANGE",
      "DELIVERY_BINDING_DRIFT",
    ]),
  );
  expect(plan.purgeArtifactClasses).toEqual(
    expect.arrayContaining(["PREVIEW_CACHE", "TEMP_EXPORT_FILE"]),
  );
  expect(plan.scopeVariantPurgeRequired).toBe(true);
});

test("preview and export reuse stay route- and selection-bound", async () => {
  const stored = await createCacheIsolationContract({
    accessBindingHashOrNull: "access-binding.native.73",
    cacheScopeClass: "NATIVE_OPERATOR_SECONDARY_WINDOW_SCENE",
    canonicalObjectRef: "artifact.packet.73",
    maskingDimensionRefsOrNull: ["masking.native.secondary", "masking.packet.preview"],
    previewSubjectRefOrNull: "artifact.preview.packet-73",
    principalClass: "STAFF_FULL",
    projectionVersionRef: "projection.packet.73.v3",
    routeIdentityRef: "/native/secondary/packet-73",
    sessionBindingHash: "session-binding.native.73",
    shellFamily: "CALM_SHELL",
    shellStabilityRefOrNull: "scene.shell.secondary.73",
    tenantId: "tenant.taxat-sandbox",
  });

  const denied = await assessPreviewExportReuse({
    cacheContract: stored,
    currentOnly: true,
    liveLegalityState: "CURRENT",
    routeIdentityRef: "/native/secondary/packet-73",
    selectedSubjectRefOrNull: "artifact.preview.packet-74",
  });
  expect(denied.decisionCode).toBe("SELECTION_MISMATCH");
  expect(denied.purgeArtifactClasses).toEqual(
    expect.arrayContaining(["TEMP_EXPORT_FILE", "NSUSERACTIVITY"]),
  );

  const allowed = await assessPreviewExportReuse({
    cacheContract: stored,
    currentOnly: true,
    liveLegalityState: "CURRENT",
    routeIdentityRef: "/native/secondary/packet-73",
    selectedSubjectRefOrNull: "artifact.preview.packet-73",
  });
  expect(allowed.decisionCode).toBe("ALLOWED");
  expect(allowed.allowed).toBe(true);
});
