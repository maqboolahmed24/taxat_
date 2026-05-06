import { NONE_SENTINEL, asTaxatHash, stableJsonHash, type TaxatHash } from "../primitives/index.ts";
import { asReferenceRouteToken } from "./route_token.ts";
import { assertReferenceFamily, assertReferenceKeyLiteral } from "./reference_key.ts";

export type DeliveryAffordance = "DOWNLOAD" | "EXTERNALIZATION" | "PREVIEW" | "PRINT";
export type DeliveryBindingHash = TaxatHash<"delivery-binding">;

export type DeliveryBindingContext = {
  accessBindingHashOrNull?: string | null;
  affordance: DeliveryAffordance;
  canonicalObjectRef: string;
  customerSafeProjectionRefOrNull?: string | null;
  maskingPostureHashOrNull?: string | null;
  previewSubjectRefOrNull?: string | null;
  principalScopeRef: string;
  routeIdentityRef: string;
  sessionBindingHash: string;
  targetRef: string;
  tenantId: string;
  visibilityPartitionRefOrNull?: string | null;
};

export type CustomerDeliveryHandle = {
  deliveryBindingHash: DeliveryBindingHash;
  downloadRef: string;
};

type DeliveryBindingErrorCode =
  | "DELIVERY_BINDING_SIGNED_URL_FORBIDDEN"
  | "DELIVERY_BINDING_STORAGE_PATH_FORBIDDEN";

type DeliveryBindingErrorInit = {
  code: DeliveryBindingErrorCode;
  detail: string;
};

const DELIVERY_SECRET_PATTERN =
  /(?:https?:\/\/|s3:\/\/|gs:\/\/|azure:\/\/|[?&](?:sig|signature|token|expires|x-amz-[^=]+|x-goog-[^=]+|x-ms-[^=]+)=)/i;

export class DeliveryBindingError extends Error {
  readonly code: DeliveryBindingErrorCode;

  constructor(init: DeliveryBindingErrorInit) {
    super(`${init.code}: ${init.detail}`);
    this.name = "DeliveryBindingError";
    this.code = init.code;
  }
}

function assertNoSignedDeliveryValue(value: string, fieldName: string) {
  if (!DELIVERY_SECRET_PATTERN.test(value)) {
    return;
  }

  throw new DeliveryBindingError({
    code: "DELIVERY_BINDING_SIGNED_URL_FORBIDDEN",
    detail: `${fieldName} must be an opaque ref or hash, not a signed URL or bearer-bearing string`,
  });
}

function assertNoStoragePathLeak(value: string, fieldName: string) {
  if (!value.startsWith("storage.")) {
    return;
  }

  throw new DeliveryBindingError({
    code: "DELIVERY_BINDING_STORAGE_PATH_FORBIDDEN",
    detail: `${fieldName} cannot reuse a storage namespace handle as customer delivery truth`,
  });
}

function normalizeOptional(value: string | null | undefined) {
  return value ?? NONE_SENTINEL;
}

function canonicalizeContext(context: DeliveryBindingContext) {
  assertReferenceKeyLiteral("tenant_id", context.tenantId);
  assertReferenceKeyLiteral("principal_scope_ref", context.principalScopeRef);
  assertReferenceKeyLiteral("session_binding_hash", context.sessionBindingHash);
  assertReferenceKeyLiteral("route_identity_ref", context.routeIdentityRef);
  assertReferenceKeyLiteral("canonical_object_ref", context.canonicalObjectRef);
  assertReferenceKeyLiteral("target_ref", context.targetRef);

  if (context.accessBindingHashOrNull !== undefined && context.accessBindingHashOrNull !== null) {
    assertReferenceKeyLiteral("access_binding_hash_or_null", context.accessBindingHashOrNull);
  }

  if (context.maskingPostureHashOrNull !== undefined && context.maskingPostureHashOrNull !== null) {
    assertReferenceKeyLiteral("masking_posture_hash_or_null", context.maskingPostureHashOrNull);
  }

  if (
    context.visibilityPartitionRefOrNull !== undefined &&
    context.visibilityPartitionRefOrNull !== null
  ) {
    assertReferenceKeyLiteral(
      "visibility_partition_ref_or_null",
      context.visibilityPartitionRefOrNull,
    );
  }

  if (context.previewSubjectRefOrNull !== undefined && context.previewSubjectRefOrNull !== null) {
    assertReferenceKeyLiteral("preview_subject_ref_or_null", context.previewSubjectRefOrNull);
  }

  if (
    context.customerSafeProjectionRefOrNull !== undefined &&
    context.customerSafeProjectionRefOrNull !== null
  ) {
    assertReferenceKeyLiteral(
      "customer_safe_projection_ref_or_null",
      context.customerSafeProjectionRefOrNull,
    );
  }

  asReferenceRouteToken(context.routeIdentityRef, "route");

  return {
    access_binding_hash_or_null: normalizeOptional(context.accessBindingHashOrNull),
    affordance: context.affordance,
    canonical_object_ref: context.canonicalObjectRef,
    customer_safe_projection_ref_or_null: normalizeOptional(
      context.customerSafeProjectionRefOrNull,
    ),
    masking_posture_hash_or_null: normalizeOptional(context.maskingPostureHashOrNull),
    preview_subject_ref_or_null: normalizeOptional(context.previewSubjectRefOrNull),
    principal_scope_ref: context.principalScopeRef,
    route_identity_ref: context.routeIdentityRef,
    session_binding_hash: context.sessionBindingHash,
    target_ref: context.targetRef,
    tenant_id: context.tenantId,
    visibility_partition_ref_or_null: normalizeOptional(context.visibilityPartitionRefOrNull),
  };
}

export function computeDeliveryBindingHash(context: DeliveryBindingContext): DeliveryBindingHash {
  const canonicalContext = canonicalizeContext(context);
  return asTaxatHash(
    stableJsonHash({
      binding_profile: "DELIVERY_BINDING_V1",
      ...canonicalContext,
    }),
    "delivery-binding",
  );
}

export function verifyDeliveryBindingHash(expectedHash: string, context: DeliveryBindingContext) {
  return computeDeliveryBindingHash(context) === expectedHash;
}

export function assertCustomerDeliveryHandle(
  downloadRef: string,
  deliveryBindingHash: string,
): CustomerDeliveryHandle {
  assertReferenceFamily("download_ref", "DELIVERY_BINDING", downloadRef);
  assertReferenceFamily("delivery_binding_hash", "DELIVERY_BINDING", deliveryBindingHash);
  assertNoSignedDeliveryValue(downloadRef, "download_ref");
  assertNoStoragePathLeak(downloadRef, "download_ref");

  return {
    deliveryBindingHash: assertReferenceKeyLiteral(
      "delivery_binding_hash",
      deliveryBindingHash,
    ) as DeliveryBindingHash,
    downloadRef,
  };
}
