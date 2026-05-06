import {
  buildCrossDeviceContinuityContract as buildSharedCrossDeviceContinuityContract,
  buildNotificationOpenContinuityContract as buildSharedNotificationOpenContinuityContract,
  buildRequestListContinuityContract as buildSharedRequestListContinuityContract,
  buildWorkspaceRouteContinuityContract as buildSharedWorkspaceRouteContinuityContract,
  CANONICAL_BROWSER_AND_NATIVE_EMBODIMENTS,
  CANONICAL_BROWSER_AND_PRIMARY_SCENE_EMBODIMENTS,
  CANONICAL_BROWSER_ONLY_EMBODIMENTS,
  CROSS_DEVICE_PORTAL_INVALIDATION_REASONS,
  CROSS_DEVICE_WORKSPACE_INVALIDATION_REASONS,
  CrossDeviceContinuityContractBuildError,
  validateCrossDeviceContinuityContract as validateSharedCrossDeviceContinuityContract,
  type BuildCrossDeviceContinuityContractInput as SharedBuildCrossDeviceContinuityContractInput,
  type CanonicalCrossDeviceContinuityContract as SharedCanonicalCrossDeviceContinuityContract,
  type CrossDeviceCompatibilityBasis,
  type CrossDeviceContinuityScope,
  type CrossDeviceEmbodiment,
  type CrossDeviceInvalidationReason,
  type CrossDeviceShellFamily,
} from "../../../backend-recovery/src/services/build_cross_device_continuity_contract.ts";
import type { CollaborationVisibilityClass } from "../models/collaboration_thread.ts";
import { WorkflowModelError } from "../models/workflow_item.ts";

export type CanonicalCrossDeviceContinuityContract =
  SharedCanonicalCrossDeviceContinuityContract;
export type {
  CrossDeviceCompatibilityBasis,
  CrossDeviceContinuityScope,
  CrossDeviceEmbodiment,
  CrossDeviceInvalidationReason,
  CrossDeviceShellFamily,
};

export {
  CANONICAL_BROWSER_AND_NATIVE_EMBODIMENTS,
  CANONICAL_BROWSER_AND_PRIMARY_SCENE_EMBODIMENTS,
  CANONICAL_BROWSER_ONLY_EMBODIMENTS,
};

export const WORKFLOW_CONTINUITY_INVALIDATION_REASONS =
  CROSS_DEVICE_WORKSPACE_INVALIDATION_REASONS;
export const PORTAL_CONTINUITY_INVALIDATION_REASONS =
  CROSS_DEVICE_PORTAL_INVALIDATION_REASONS;

export type BuildCanonicalCrossDeviceContinuityContractInput = Omit<
  SharedBuildCrossDeviceContinuityContractInput,
  "native_object_family" | "notification_visibility_class"
> & {
  compatibility_basis_class: CrossDeviceCompatibilityBasis;
};

function runSharedContinuity<T>(factory: () => T): T {
  try {
    return factory();
  } catch (error) {
    if (error instanceof CrossDeviceContinuityContractBuildError) {
      throw new WorkflowModelError("WORKFLOW_CONTRACT_INVALID", error.message);
    }
    throw error;
  }
}

export function validateCrossDeviceContinuityContract(
  contract: CanonicalCrossDeviceContinuityContract,
): CanonicalCrossDeviceContinuityContract {
  return runSharedContinuity(() => validateSharedCrossDeviceContinuityContract(contract));
}

export function buildCanonicalCrossDeviceContinuityContract(
  input: BuildCanonicalCrossDeviceContinuityContractInput,
): CanonicalCrossDeviceContinuityContract {
  return runSharedContinuity(() => buildSharedCrossDeviceContinuityContract(input));
}

export function buildWorkspaceRouteContinuityContract(input: {
  access_scope_hash_or_null: string;
  canonical_object_ref: string;
  dominant_action_state_or_null: "ACTION_AVAILABLE" | "NO_SAFE_ACTION";
  focus_anchor_ref_or_null: string | null;
  masking_scope_fingerprint_or_null: string;
  parent_context_ref_or_null: string;
  return_focus_anchor_ref_or_null: string;
  route_identity_ref: string;
  shell_family: "CALM_SHELL" | "CLIENT_PORTAL_SHELL";
  stability_guard_hash_or_null: string;
  visibility_cache_partition_key_or_null: string;
}): CanonicalCrossDeviceContinuityContract {
  return runSharedContinuity(() => buildSharedWorkspaceRouteContinuityContract(input));
}

export function buildRequestListContinuityContract(input: {
  access_scope_hash_or_null: string;
  canonical_object_ref: string;
  focus_anchor_ref_or_null: string | null;
  masking_scope_fingerprint_or_null: string;
  route_identity_ref: "/portal/requests";
  stability_guard_hash_or_null: string;
  visibility_cache_partition_key_or_null: string;
}): CanonicalCrossDeviceContinuityContract {
  return runSharedContinuity(() => buildSharedRequestListContinuityContract(input));
}

export function buildNotificationOpenContinuityContract(input: {
  access_scope_hash_or_null: string;
  canonical_object_ref: string;
  focus_anchor_ref_or_null: string | null;
  masking_scope_fingerprint_or_null: string;
  parent_context_ref_or_null: string;
  return_focus_anchor_ref_or_null: string;
  route_identity_ref: string;
  shell_family: "CALM_SHELL" | "CLIENT_PORTAL_SHELL";
  visibility_cache_partition_key_or_null: string;
  visibility_class: CollaborationVisibilityClass;
}): CanonicalCrossDeviceContinuityContract {
  return runSharedContinuity(() => buildSharedNotificationOpenContinuityContract(input));
}
