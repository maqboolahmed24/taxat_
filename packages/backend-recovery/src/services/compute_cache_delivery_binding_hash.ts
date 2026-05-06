import type { CacheIsolationContract } from "../../../generated-models/src/generated/typescript/domain-workflow-and-filing.ts";
import { stableJsonHash } from "../../../domain-kernel/src/primitives/hash.ts";

export type CacheDeliveryBindingHashInput = Pick<
  CacheIsolationContract,
  | "access_binding_hash_or_null"
  | "cache_partition_ref"
  | "cache_scope_class"
  | "canonical_object_ref"
  | "client_id_or_null"
  | "customer_safe_projection"
  | "masking_posture_fingerprint_or_null"
  | "preview_subject_ref_or_null"
  | "principal_class"
  | "projection_version_ref"
  | "route_identity_ref"
  | "session_binding_hash"
  | "shell_family"
  | "shell_stability_ref_or_null"
  | "tenant_id"
  | "visibility_cache_partition_key_or_null"
>;

export function cacheDeliveryBindingHashPayload(contract: CacheDeliveryBindingHashInput) {
  return {
    cache_scope_class: contract.cache_scope_class,
    tenant_id: contract.tenant_id,
    client_id_or_null: contract.client_id_or_null,
    principal_class: contract.principal_class,
    session_binding_hash: contract.session_binding_hash,
    access_binding_hash_or_null: contract.access_binding_hash_or_null,
    masking_posture_fingerprint_or_null: contract.masking_posture_fingerprint_or_null,
    shell_stability_ref_or_null: contract.shell_stability_ref_or_null,
    route_identity_ref: contract.route_identity_ref,
    canonical_object_ref: contract.canonical_object_ref,
    shell_family: contract.shell_family,
    projection_version_ref: contract.projection_version_ref,
    cache_partition_ref: contract.cache_partition_ref,
    visibility_cache_partition_key_or_null: contract.visibility_cache_partition_key_or_null,
    customer_safe_projection: contract.customer_safe_projection,
    preview_subject_ref_or_null: contract.preview_subject_ref_or_null,
  };
}

export function computeCacheDeliveryBindingHash(contract: CacheDeliveryBindingHashInput) {
  return stableJsonHash(cacheDeliveryBindingHashPayload(contract));
}

export function verifyCacheDeliveryBindingHash(contract: CacheIsolationContract) {
  return contract.delivery_binding_hash === computeCacheDeliveryBindingHash(contract);
}

export function cacheIsolationContractSerializedPayloadTrace(payload: unknown) {
  return `trace=${JSON.stringify(payload, null, 2)}`;
}
