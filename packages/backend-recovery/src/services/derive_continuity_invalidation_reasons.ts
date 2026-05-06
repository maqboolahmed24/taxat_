import type { CrossDeviceContinuityContract } from "../../../generated-models/src/generated/typescript/surface-and-experience.ts";

export type ContinuityInvalidationReason =
  CrossDeviceContinuityContract["supported_invalidation_reason_codes"][number];
export type ContinuityScope = CrossDeviceContinuityContract["continuity_scope"];
export type ContinuityShellFamily = CrossDeviceContinuityContract["shell_family"];
export type ContinuityNotificationVisibilityClass = "CUSTOMER_VISIBLE" | "INTERNAL_ONLY";
export type ContinuityNativeObjectFamily = "MANIFEST" | "WORK_ITEM";
export type ContinuityNativeBackingReadModelType = "LowNoiseExperienceFrame" | "WorkspaceSnapshot";

export const CROSS_DEVICE_LOW_NOISE_INVALIDATION_REASONS = [
  "SESSION_REVOKED",
  "SCHEMA_INCOMPATIBLE",
  "OBJECT_GONE",
] as const satisfies readonly ContinuityInvalidationReason[];

export const CROSS_DEVICE_WORKSPACE_INVALIDATION_REASONS = [
  "TENANT_SWITCH",
  "PRIVILEGE_DOWNGRADE",
  "ACCESS_BINDING_CHANGE",
  "MASKING_CHANGE",
  "SESSION_REVOKED",
  "SCHEMA_INCOMPATIBLE",
  "OBJECT_GONE",
] as const satisfies readonly ContinuityInvalidationReason[];

export const CROSS_DEVICE_PORTAL_INVALIDATION_REASONS = [
  "ACCESS_BINDING_CHANGE",
  "MASKING_CHANGE",
  "VIEW_GUARD_CHANGE",
  "OBJECT_GONE",
] as const satisfies readonly ContinuityInvalidationReason[];

export const CROSS_DEVICE_NATIVE_MANIFEST_INVALIDATION_REASONS = [
  "TENANT_SWITCH",
  "PRIVILEGE_DOWNGRADE",
  "MASKING_CHANGE",
  "SESSION_REVOKED",
  "SCHEMA_INCOMPATIBLE",
  "OBJECT_GONE",
] as const satisfies readonly ContinuityInvalidationReason[];

export const CROSS_DEVICE_NATIVE_WORKSPACE_INVALIDATION_REASONS = [
  ...CROSS_DEVICE_WORKSPACE_INVALIDATION_REASONS,
] as const satisfies readonly ContinuityInvalidationReason[];

export const CROSS_DEVICE_NATIVE_SECONDARY_MANIFEST_INVALIDATION_REASONS = [
  ...CROSS_DEVICE_NATIVE_MANIFEST_INVALIDATION_REASONS,
  "PARENT_WINDOW_CLOSED",
] as const satisfies readonly ContinuityInvalidationReason[];

export const CROSS_DEVICE_NATIVE_SECONDARY_WORKSPACE_INVALIDATION_REASONS = [
  ...CROSS_DEVICE_NATIVE_WORKSPACE_INVALIDATION_REASONS,
  "PARENT_WINDOW_CLOSED",
] as const satisfies readonly ContinuityInvalidationReason[];

export const CROSS_DEVICE_GOVERNANCE_INVALIDATION_REASONS = [
  "TENANT_SWITCH",
  "PRIVILEGE_DOWNGRADE",
  "SESSION_REVOKED",
  "SCHEMA_INCOMPATIBLE",
  "OBJECT_GONE",
  "POLICY_SNAPSHOT_CHANGE",
] as const satisfies readonly ContinuityInvalidationReason[];

export class ContinuityInvalidationReasonDerivationError extends Error {
  constructor(detail: string) {
    super(`CONTINUITY_INVALIDATION_REASONS_INVALID: ${detail}`);
    this.name = "ContinuityInvalidationReasonDerivationError";
  }
}

function nativeObjectFamilyFor(input: {
  native_backing_read_model_type?: ContinuityNativeBackingReadModelType | undefined;
  native_object_family?: ContinuityNativeObjectFamily | undefined;
}) {
  if (input.native_object_family !== undefined) {
    return input.native_object_family;
  }
  if (input.native_backing_read_model_type === "LowNoiseExperienceFrame") {
    return "MANIFEST" as const;
  }
  if (input.native_backing_read_model_type === "WorkspaceSnapshot") {
    return "WORK_ITEM" as const;
  }
  throw new ContinuityInvalidationReasonDerivationError(
    "native continuity requires native_object_family or native_backing_read_model_type",
  );
}

export function deriveContinuityInvalidationReasons(input: {
  continuity_scope: ContinuityScope;
  native_backing_read_model_type?: ContinuityNativeBackingReadModelType | undefined;
  native_object_family?: ContinuityNativeObjectFamily | undefined;
  notification_visibility_class?: ContinuityNotificationVisibilityClass | undefined;
  shell_family?: ContinuityShellFamily | undefined;
}): ContinuityInvalidationReason[] {
  switch (input.continuity_scope) {
    case "MANIFEST_ROUTE":
      return [...CROSS_DEVICE_LOW_NOISE_INVALIDATION_REASONS];
    case "WORKSPACE_ROUTE":
      return [...CROSS_DEVICE_WORKSPACE_INVALIDATION_REASONS];
    case "CLIENT_PORTAL_ROUTE":
      return [...CROSS_DEVICE_PORTAL_INVALIDATION_REASONS];
    case "WORK_ITEM_NOTIFICATION":
      if (
        input.notification_visibility_class === "CUSTOMER_VISIBLE" ||
        input.shell_family === "CLIENT_PORTAL_SHELL"
      ) {
        return [...CROSS_DEVICE_PORTAL_INVALIDATION_REASONS];
      }
      return [...CROSS_DEVICE_WORKSPACE_INVALIDATION_REASONS];
    case "NATIVE_PRIMARY_SCENE":
      return nativeObjectFamilyFor(input) === "MANIFEST"
        ? [...CROSS_DEVICE_NATIVE_MANIFEST_INVALIDATION_REASONS]
        : [...CROSS_DEVICE_NATIVE_WORKSPACE_INVALIDATION_REASONS];
    case "NATIVE_SECONDARY_WINDOW":
      return nativeObjectFamilyFor(input) === "MANIFEST"
        ? [...CROSS_DEVICE_NATIVE_SECONDARY_MANIFEST_INVALIDATION_REASONS]
        : [...CROSS_DEVICE_NATIVE_SECONDARY_WORKSPACE_INVALIDATION_REASONS];
    case "GOVERNANCE_ROUTE":
      return [...CROSS_DEVICE_GOVERNANCE_INVALIDATION_REASONS];
    default:
      throw new ContinuityInvalidationReasonDerivationError(
        "continuity_scope must stay inside the governed invalidation vocabulary",
      );
  }
}
