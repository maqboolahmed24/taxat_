import type { CacheIsolationContract } from "../../../generated-models/src/generated/typescript/domain-workflow-and-filing.ts";
import { stableJsonHash } from "../../../domain-kernel/src/primitives/hash.ts";
import {
  classifyCacheScopeRequirements,
  type CacheScopeClass,
  resolveCustomerSafeProjection,
} from "./classify_cache_scope_requirements.ts";
import {
  cacheIsolationContractSerializedPayloadTrace,
  computeCacheDeliveryBindingHash,
  verifyCacheDeliveryBindingHash,
} from "./compute_cache_delivery_binding_hash.ts";

export type BuildCacheIsolationContractInput = {
  access_binding_hash_or_null?: string | null | undefined;
  cache_partition_ref?: string | null | undefined;
  cache_scope_class: CacheScopeClass;
  canonical_object_ref: string;
  client_id_or_null?: string | null | undefined;
  customer_safe_projection?: boolean | undefined;
  masking_posture_fingerprint_or_null?: string | null | undefined;
  preview_subject_ref_or_null?: string | null | undefined;
  principal_class: string;
  projection_version_ref: string;
  route_identity_ref: string;
  session_binding_hash: string;
  shell_family: string;
  shell_stability_ref_or_null?: string | null | undefined;
  tenant_id: string;
  visibility_cache_partition_key_or_null?: string | null | undefined;
};

export class CacheIsolationContractBuildError extends Error {
  readonly code:
    | "CACHE_DELIVERY_BINDING_HASH_DRIFT"
    | "CACHE_FIELD_REQUIRED"
    | "CACHE_SCOPE_FIELD_POSTURE_INVALID";
  readonly trace: string;

  constructor(input: {
    code:
      | "CACHE_DELIVERY_BINDING_HASH_DRIFT"
      | "CACHE_FIELD_REQUIRED"
      | "CACHE_SCOPE_FIELD_POSTURE_INVALID";
    detail: string;
    payload: unknown;
  }) {
    const trace = cacheIsolationContractSerializedPayloadTrace(input.payload);
    super(`${input.code}: ${input.detail}; ${trace}`);
    this.name = "CacheIsolationContractBuildError";
    this.code = input.code;
    this.trace = trace;
  }
}

function fail(
  code: CacheIsolationContractBuildError["code"],
  detail: string,
  payload: unknown,
): never {
  throw new CacheIsolationContractBuildError({ code, detail, payload });
}

function requiredString(field: string, value: string | null | undefined, payload: unknown) {
  if (typeof value !== "string" || value.length === 0) {
    fail("CACHE_FIELD_REQUIRED", `${field} must be a non-empty string`, payload);
  }
  return value;
}

function optionalString(field: string, value: string | null | undefined, payload: unknown) {
  if (value === null || value === undefined) {
    return null;
  }
  if (typeof value !== "string" || value.length === 0) {
    fail("CACHE_FIELD_REQUIRED", `${field} must be null or a non-empty string`, payload);
  }
  return value;
}

function derivedCachePartitionRef(input: {
  access_binding_hash_or_null: string | null;
  cache_scope_class: CacheScopeClass;
  canonical_object_ref: string;
  client_id_or_null: string | null;
  customer_safe_projection: boolean;
  masking_posture_fingerprint_or_null: string | null;
  preview_subject_ref_or_null: string | null;
  principal_class: string;
  projection_version_ref: string;
  route_identity_ref: string;
  session_binding_hash: string;
  shell_family: string;
  shell_stability_ref_or_null: string | null;
  tenant_id: string;
}) {
  return stableJsonHash({
    access_binding_hash_or_null: input.access_binding_hash_or_null,
    cache_scope_class: input.cache_scope_class,
    canonical_object_ref: input.canonical_object_ref,
    client_id_or_null: input.client_id_or_null,
    contract_version: "CACHE_PARTITION_REF_V1",
    customer_safe_projection: input.customer_safe_projection,
    masking_posture_fingerprint_or_null: input.masking_posture_fingerprint_or_null,
    preview_subject_ref_or_null: input.preview_subject_ref_or_null,
    principal_class: input.principal_class,
    projection_version_ref: input.projection_version_ref,
    route_identity_ref: input.route_identity_ref,
    session_binding_hash: input.session_binding_hash,
    shell_family: input.shell_family,
    shell_stability_ref_or_null: input.shell_stability_ref_or_null,
    tenant_id: input.tenant_id,
  });
}

export function buildCacheIsolationContract(
  input: BuildCacheIsolationContractInput,
): CacheIsolationContract {
  let requirements: ReturnType<typeof classifyCacheScopeRequirements>;
  let customerSafeProjection: boolean;
  try {
    requirements = classifyCacheScopeRequirements(input.cache_scope_class);
    customerSafeProjection = resolveCustomerSafeProjection({
      requested_customer_safe_projection: input.customer_safe_projection,
      requirements,
    });
  } catch (error) {
    fail(
      "CACHE_SCOPE_FIELD_POSTURE_INVALID",
      error instanceof Error ? error.message : "cache scope requirements failed",
      input,
    );
  }
  const tenantId = requiredString("tenant_id", input.tenant_id, input);
  const principalClass = requiredString("principal_class", input.principal_class, input);
  const sessionBindingHash = requiredString(
    "session_binding_hash",
    input.session_binding_hash,
    input,
  );
  const routeIdentityRef = requiredString("route_identity_ref", input.route_identity_ref, input);
  const canonicalObjectRef = requiredString(
    "canonical_object_ref",
    input.canonical_object_ref,
    input,
  );
  const shellFamily = requiredString("shell_family", input.shell_family, input);
  const projectionVersionRef = requiredString(
    "projection_version_ref",
    input.projection_version_ref,
    input,
  );
  const clientIdOrNull = optionalString("client_id_or_null", input.client_id_or_null, input);
  const shellStabilityRefOrNull = optionalString(
    "shell_stability_ref_or_null",
    input.shell_stability_ref_or_null,
    input,
  );

  let accessBindingHashOrNull = optionalString(
    "access_binding_hash_or_null",
    input.access_binding_hash_or_null,
    input,
  );
  let maskingPostureFingerprintOrNull = optionalString(
    "masking_posture_fingerprint_or_null",
    input.masking_posture_fingerprint_or_null,
    input,
  );
  let visibilityCachePartitionKeyOrNull = optionalString(
    "visibility_cache_partition_key_or_null",
    input.visibility_cache_partition_key_or_null,
    input,
  );
  let previewSubjectRefOrNull = optionalString(
    "preview_subject_ref_or_null",
    input.preview_subject_ref_or_null,
    input,
  );

  if (requirements.governance_only) {
    if (
      accessBindingHashOrNull !== null ||
      maskingPostureFingerprintOrNull !== null ||
      visibilityCachePartitionKeyOrNull !== null
    ) {
      fail(
        "CACHE_SCOPE_FIELD_POSTURE_INVALID",
        `${input.cache_scope_class} must clear access, masking, and visibility bindings`,
        input,
      );
    }
    accessBindingHashOrNull = null;
    maskingPostureFingerprintOrNull = null;
    visibilityCachePartitionKeyOrNull = null;
  } else if (requirements.requires_access_and_masking || customerSafeProjection) {
    if (accessBindingHashOrNull === null || maskingPostureFingerprintOrNull === null) {
      fail(
        "CACHE_SCOPE_FIELD_POSTURE_INVALID",
        `${input.cache_scope_class} requires access and masking bindings`,
        input,
      );
    }
  }

  if (requirements.requires_visibility_partition || customerSafeProjection) {
    if (visibilityCachePartitionKeyOrNull === null) {
      fail(
        "CACHE_SCOPE_FIELD_POSTURE_INVALID",
        `${input.cache_scope_class} requires a visibility cache partition`,
        input,
      );
    }
  } else if (visibilityCachePartitionKeyOrNull !== null) {
    fail(
      "CACHE_SCOPE_FIELD_POSTURE_INVALID",
      `${input.cache_scope_class} must clear visibility cache partition`,
      input,
    );
  }

  if (requirements.requires_preview_subject) {
    if (previewSubjectRefOrNull === null) {
      fail(
        "CACHE_SCOPE_FIELD_POSTURE_INVALID",
        `${input.cache_scope_class} requires a preview subject binding`,
        input,
      );
    }
  } else if (previewSubjectRefOrNull !== null) {
    fail(
      "CACHE_SCOPE_FIELD_POSTURE_INVALID",
      `${input.cache_scope_class} must clear preview subject binding`,
      input,
    );
  }

  const requestedCachePartitionRef = optionalString(
    "cache_partition_ref",
    input.cache_partition_ref,
    input,
  );
  const cachePartitionRef =
    visibilityCachePartitionKeyOrNull ??
    requestedCachePartitionRef ??
    derivedCachePartitionRef({
      access_binding_hash_or_null: accessBindingHashOrNull,
      cache_scope_class: input.cache_scope_class,
      canonical_object_ref: canonicalObjectRef,
      client_id_or_null: clientIdOrNull,
      customer_safe_projection: customerSafeProjection,
      masking_posture_fingerprint_or_null: maskingPostureFingerprintOrNull,
      preview_subject_ref_or_null: previewSubjectRefOrNull,
      principal_class: principalClass,
      projection_version_ref: projectionVersionRef,
      route_identity_ref: routeIdentityRef,
      session_binding_hash: sessionBindingHash,
      shell_family: shellFamily,
      shell_stability_ref_or_null: shellStabilityRefOrNull,
      tenant_id: tenantId,
    });

  if (
    visibilityCachePartitionKeyOrNull !== null &&
    requestedCachePartitionRef !== null &&
    requestedCachePartitionRef !== visibilityCachePartitionKeyOrNull
  ) {
    fail(
      "CACHE_SCOPE_FIELD_POSTURE_INVALID",
      "cache_partition_ref must mirror visibility_cache_partition_key_or_null",
      input,
    );
  }

  const contract = {
    access_binding_hash_or_null: accessBindingHashOrNull,
    cache_partition_ref: requiredString("cache_partition_ref", cachePartitionRef, input),
    cache_scope_class: input.cache_scope_class,
    canonical_object_ref: canonicalObjectRef,
    client_id_or_null: clientIdOrNull,
    contract_version: "CACHE_ISOLATION_V1",
    customer_safe_projection: customerSafeProjection,
    delivery_binding_hash: "",
    delivery_revalidation_policy: "PREVIEW_EXPORT_AND_DOWNLOAD_REQUIRE_EXACT_BINDING",
    hydration_guard_policy: "REJECT_ON_CONTEXT_ROUTE_VERSION_OR_PREVIEW_MISMATCH",
    local_storage_reuse_policy: "PURGE_ON_TENANT_PRINCIPAL_SESSION_ACCESS_MASKING_OR_ROUTE_DRIFT",
    masking_posture_fingerprint_or_null: maskingPostureFingerprintOrNull,
    preview_export_reuse_policy: "ROUTE_AND_SELECTION_BOUND_CURRENT_ONLY",
    preview_subject_ref_or_null: previewSubjectRefOrNull,
    principal_class: principalClass,
    projection_version_ref: projectionVersionRef,
    route_identity_ref: routeIdentityRef,
    scope_narrowing_invalidation_policy: "PURGE_BROADER_VARIANTS_ON_ACCESS_OR_MASKING_NARROWING",
    session_binding_hash: sessionBindingHash,
    shared_cache_reuse_policy: "EXACT_SECURITY_CONTEXT_ONLY",
    shared_layer_cache_policy: "NO_CDN_OR_PROXY_REUSE_WITHOUT_IDENTICAL_CONTEXT",
    shell_family: shellFamily,
    shell_stability_ref_or_null: shellStabilityRefOrNull,
    temporary_artifact_policy: "TEMP_FILES_AND_NATIVE_PREVIEW_PURGED_ON_BINDING_DRIFT",
    tenant_id: tenantId,
    visibility_cache_partition_key_or_null: visibilityCachePartitionKeyOrNull,
  } satisfies CacheIsolationContract;

  contract.delivery_binding_hash = computeCacheDeliveryBindingHash(contract);
  if (!verifyCacheDeliveryBindingHash(contract)) {
    fail(
      "CACHE_DELIVERY_BINDING_HASH_DRIFT",
      "delivery_binding_hash must equal the canonical cache delivery binding hash",
      contract,
    );
  }
  return contract;
}
