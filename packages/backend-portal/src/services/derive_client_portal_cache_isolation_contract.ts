import { buildCacheIsolationContract } from "../../../backend-recovery/src/services/build_cache_isolation_contract.ts";
import type { ClientPortalRouteCode, ClientPortalRouteContext } from "../types.ts";

export function deriveClientPortalCacheIsolationContract(input: {
  accessBindingHash: string;
  canonicalObjectRef: string;
  clientId: string;
  maskingPostureFingerprint: string;
  principalClass: string;
  route: ClientPortalRouteCode;
  routeContext: ClientPortalRouteContext;
  sessionBindingHash: string;
  tenantId: string;
  visibilityCachePartitionKey: string;
  workspaceVersion: number;
}) {
  const routeIdentityRef =
    input.routeContext.context_route === "NONE" ? input.route : input.routeContext.context_route;
  return buildCacheIsolationContract({
    access_binding_hash_or_null: input.accessBindingHash,
    cache_partition_ref: input.visibilityCachePartitionKey,
    cache_scope_class: "CLIENT_PORTAL_WORKSPACE",
    canonical_object_ref: input.canonicalObjectRef,
    client_id_or_null: input.clientId,
    customer_safe_projection: true,
    masking_posture_fingerprint_or_null: input.maskingPostureFingerprint,
    principal_class: input.principalClass,
    projection_version_ref: String(input.workspaceVersion),
    route_identity_ref: routeIdentityRef,
    session_binding_hash: input.sessionBindingHash,
    shell_family: "CLIENT_PORTAL_SHELL",
    shell_stability_ref_or_null: null,
    tenant_id: input.tenantId,
    visibility_cache_partition_key_or_null: input.visibilityCachePartitionKey,
  });
}
