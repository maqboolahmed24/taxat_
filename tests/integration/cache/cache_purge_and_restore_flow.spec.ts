import { expect, test } from "@playwright/test";

import { createCacheIsolationContract } from "../../../packages/domain-kernel/src/cache/cache_isolation_key.ts";
import { assessCacheReuseGuard } from "../../../packages/domain-kernel/src/cache/cache_reuse_guard.ts";

test("cache restore downgrades to read-only before live legality and then purges on narrowed visibility drift before reusing refreshed truth", async () => {
  const storedV1 = await createCacheIsolationContract({
    accessBindingHashOrNull: "access-binding.workspace.73.v1",
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

  const sameRequest = await createCacheIsolationContract({
    accessBindingHashOrNull: "access-binding.workspace.73.v1",
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

  const cacheOnlyRestore = await assessCacheReuseGuard({
    liveLegalityState: "CACHE_ONLY",
    requestedContract: sameRequest,
    storedContract: storedV1,
  });
  expect(cacheOnlyRestore.decision).toBe("READ_ONLY_RESTORE");
  expect(cacheOnlyRestore.mutationGate).toBe("BLOCK_MUTATION_PENDING_LIVE_LEGALITY");

  const narrowedRequest = await createCacheIsolationContract({
    accessBindingHashOrNull: "access-binding.workspace.73.v2",
    cacheScopeClass: "WORKSPACE_SNAPSHOT",
    canonicalObjectRef: "artifact.workspace.item-73",
    clientIdOrNull: "client.ops.73",
    maskingDimensionRefsOrNull: ["masking.visibility.staff.narrowed", "masking.route.workspace"],
    principalClass: "STAFF_FULL",
    projectionVersionRef: "projection.workspace.item-73.v4",
    routeIdentityRef: "/work/items/item-73",
    sessionBindingHash: "session-binding.workspace.73",
    shellFamily: "CALM_SHELL",
    shellStabilityRefOrNull: "shell.stability.workspace.73",
    tenantId: "tenant.taxat-sandbox",
    visibilityDimensionRefsOrNull: ["visibility.staff-full.narrowed", "queue.assigned"],
  });

  const narrowedGuard = await assessCacheReuseGuard({
    liveLegalityState: "CURRENT",
    requestedContract: narrowedRequest,
    storedContract: storedV1,
  });
  expect(narrowedGuard.decision).toBe("REJECT_AND_PURGE");
  expect(narrowedGuard.allowed).toBe(false);
  expect(narrowedGuard.purgePlan.triggerCodes).toEqual(
    expect.arrayContaining([
      "ACCESS_BINDING_CHANGE",
      "MASKING_CHANGE",
      "VISIBILITY_PARTITION_CHANGE",
      "DELIVERY_BINDING_DRIFT",
    ]),
  );

  const refreshedReuse = await assessCacheReuseGuard({
    liveLegalityState: "CURRENT",
    requestedContract: narrowedRequest,
    storedContract: narrowedRequest,
  });
  expect(refreshedReuse.decision).toBe("EXACT_REUSE");
  expect(refreshedReuse.allowed).toBe(true);
  expect(refreshedReuse.mutationGate).toBe("ALLOW_MUTATION");
});
