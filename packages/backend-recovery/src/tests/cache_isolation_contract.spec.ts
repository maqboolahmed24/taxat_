import { expect, test } from "@playwright/test";

import { validateContractSchema } from "../../../../tests/unit/backend_northbound/audit_and_enquiry_fixtures.ts";
import {
  buildCacheIsolationContract,
  cacheDeliveryBindingHashPayload,
  cacheIsolationContractSerializedPayloadTrace,
  classifyCacheScopeRequirements,
  computeCacheDeliveryBindingHash,
  verifyCacheDeliveryBindingHash,
} from "../index.ts";

function staffScopeBase() {
  return {
    access_binding_hash_or_null: "access-binding-hash-1",
    canonical_object_ref: "item-1",
    client_id_or_null: "client-1",
    masking_posture_fingerprint_or_null: "masking-fingerprint-1",
    principal_class: "STAFF_FULL",
    projection_version_ref: "42",
    route_identity_ref: "/work/items/item-1",
    session_binding_hash: "session-binding-hash-1",
    shell_family: "CALM_SHELL",
    shell_stability_ref_or_null: "shell-token-1",
    tenant_id: "tenant-1",
  } as const;
}

test("builds portal and request-list cache contracts as customer-safe visibility-partitioned envelopes", async () => {
  for (const cache_scope_class of ["CLIENT_PORTAL_WORKSPACE", "CUSTOMER_REQUEST_LIST"] as const) {
    const contract = buildCacheIsolationContract({
      ...staffScopeBase(),
      cache_scope_class,
      customer_safe_projection: true,
      principal_class: "CUSTOMER_VISIBLE",
      route_identity_ref:
        cache_scope_class === "CLIENT_PORTAL_WORKSPACE"
          ? "/portal/client-1/workspace"
          : "/portal/client-1/requests",
      shell_family: "CLIENT_PORTAL_SHELL",
      visibility_cache_partition_key_or_null: "visibility-partition-client-1",
    });

    await validateContractSchema("cache_isolation_contract", contract);
    expect(contract.customer_safe_projection).toBe(true);
    expect(contract.visibility_cache_partition_key_or_null).toBe("visibility-partition-client-1");
    expect(contract.cache_partition_ref).toBe(contract.visibility_cache_partition_key_or_null);
    expect(contract.delivery_binding_hash).toBe(computeCacheDeliveryBindingHash(contract));
    expect(verifyCacheDeliveryBindingHash(contract)).toBe(true);
  }
});

test("fails closed when visibility partition and cache partition drift", () => {
  expect(() =>
    buildCacheIsolationContract({
      ...staffScopeBase(),
      cache_partition_ref: "other-partition",
      cache_scope_class: "WORKSPACE_SNAPSHOT",
      visibility_cache_partition_key_or_null: "visibility-partition-1",
    }),
  ).toThrow(/cache_partition_ref must mirror visibility_cache_partition_key_or_null/);
});

test("clears governance access, masking, visibility, and preview fields without weakening route identity", async () => {
  const contract = buildCacheIsolationContract({
    cache_scope_class: "TENANT_GOVERNANCE_SNAPSHOT",
    canonical_object_ref: "tenant-governance-1",
    principal_class: "STAFF_FULL",
    projection_version_ref: "gov-projection-1",
    route_identity_ref: "/governance/tenant",
    session_binding_hash: "session-binding-hash-1",
    shell_family: "GOVERNANCE_SHELL",
    tenant_id: "tenant-1",
  });

  await validateContractSchema("cache_isolation_contract", contract);
  expect(contract.access_binding_hash_or_null).toBeNull();
  expect(contract.masking_posture_fingerprint_or_null).toBeNull();
  expect(contract.visibility_cache_partition_key_or_null).toBeNull();
  expect(contract.preview_subject_ref_or_null).toBeNull();
  expect(contract.route_identity_ref).toBe("/governance/tenant");
  expect(classifyCacheScopeRequirements("TENANT_GOVERNANCE_SNAPSHOT").governance_only).toBe(true);
});

test("requires native secondary-window preview binding and clears preview outside secondary scopes", async () => {
  const secondary = buildCacheIsolationContract({
    ...staffScopeBase(),
    cache_scope_class: "NATIVE_OPERATOR_SECONDARY_WINDOW_SCENE",
    canonical_object_ref: "preview-artifact-1",
    preview_subject_ref_or_null: "preview-artifact-1",
    projection_version_ref: "guard-vector-hash-1",
    route_identity_ref: "scene:native-secondary-1",
  });

  await validateContractSchema("cache_isolation_contract", secondary);
  expect(secondary.preview_subject_ref_or_null).toBe("preview-artifact-1");

  expect(() =>
    buildCacheIsolationContract({
      ...staffScopeBase(),
      cache_scope_class: "NATIVE_OPERATOR_WORKSPACE_SCENE",
      preview_subject_ref_or_null: "preview-artifact-1",
      projection_version_ref: "guard-vector-hash-1",
      route_identity_ref: "scene:native-primary-1",
    }),
  ).toThrow(/must clear preview subject binding/);
});

test("keeps delivery-binding hash stable and detects material drift with serialized traces", () => {
  const contract = buildCacheIsolationContract({
    ...staffScopeBase(),
    cache_scope_class: "WORKSPACE_SNAPSHOT",
    visibility_cache_partition_key_or_null: "visibility-partition-1",
  });
  const rebuilt = buildCacheIsolationContract({
    ...staffScopeBase(),
    cache_scope_class: "WORKSPACE_SNAPSHOT",
    visibility_cache_partition_key_or_null: "visibility-partition-1",
  });
  expect(contract.delivery_binding_hash).toBe(rebuilt.delivery_binding_hash);
  expect(cacheDeliveryBindingHashPayload(contract)).toMatchObject({
    route_identity_ref: "/work/items/item-1",
    visibility_cache_partition_key_or_null: "visibility-partition-1",
  });

  const drifted = { ...contract, route_identity_ref: "/work/items/item-2" };
  expect(verifyCacheDeliveryBindingHash(drifted)).toBe(false);
  expect(cacheIsolationContractSerializedPayloadTrace(drifted)).toContain(
    "delivery_binding_hash",
  );
});
