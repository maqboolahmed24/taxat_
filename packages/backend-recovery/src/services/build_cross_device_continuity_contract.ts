import type { CrossDeviceContinuityContract as GeneratedCrossDeviceContinuityContract } from "../../../generated-models/src/generated/typescript/surface-and-experience.ts";
import {
  classifyContinuityBasisClass,
  type ContinuityCompatibilityBasisClass,
} from "./classify_continuity_basis_class.ts";
import {
  CROSS_DEVICE_GOVERNANCE_INVALIDATION_REASONS,
  CROSS_DEVICE_LOW_NOISE_INVALIDATION_REASONS,
  CROSS_DEVICE_NATIVE_MANIFEST_INVALIDATION_REASONS,
  CROSS_DEVICE_NATIVE_SECONDARY_MANIFEST_INVALIDATION_REASONS,
  CROSS_DEVICE_NATIVE_SECONDARY_WORKSPACE_INVALIDATION_REASONS,
  CROSS_DEVICE_NATIVE_WORKSPACE_INVALIDATION_REASONS,
  CROSS_DEVICE_PORTAL_INVALIDATION_REASONS,
  CROSS_DEVICE_WORKSPACE_INVALIDATION_REASONS,
  deriveContinuityInvalidationReasons,
  type ContinuityInvalidationReason,
  type ContinuityNativeObjectFamily,
  type ContinuityNotificationVisibilityClass,
} from "./derive_continuity_invalidation_reasons.ts";

export type CrossDeviceContinuityContract = GeneratedCrossDeviceContinuityContract;
export type CanonicalCrossDeviceContinuityContract = CrossDeviceContinuityContract;
export type CrossDeviceContinuityScope = CrossDeviceContinuityContract["continuity_scope"];
export type CrossDeviceShellFamily = CrossDeviceContinuityContract["shell_family"];
export type CrossDeviceEmbodiment = CrossDeviceContinuityContract["allowed_embodiments"][number];
export type CrossDeviceCompatibilityBasis = ContinuityCompatibilityBasisClass;
export type CrossDeviceInvalidationReason = ContinuityInvalidationReason;

export {
  CROSS_DEVICE_GOVERNANCE_INVALIDATION_REASONS,
  CROSS_DEVICE_LOW_NOISE_INVALIDATION_REASONS,
  CROSS_DEVICE_NATIVE_MANIFEST_INVALIDATION_REASONS,
  CROSS_DEVICE_NATIVE_SECONDARY_MANIFEST_INVALIDATION_REASONS,
  CROSS_DEVICE_NATIVE_SECONDARY_WORKSPACE_INVALIDATION_REASONS,
  CROSS_DEVICE_NATIVE_WORKSPACE_INVALIDATION_REASONS,
  CROSS_DEVICE_PORTAL_INVALIDATION_REASONS,
  CROSS_DEVICE_WORKSPACE_INVALIDATION_REASONS,
};

export const CANONICAL_BROWSER_ONLY_EMBODIMENTS = [
  "BROWSER_WIDE",
  "BROWSER_NARROW_STACKED",
] as const satisfies readonly CrossDeviceEmbodiment[];

export const CANONICAL_BROWSER_AND_NATIVE_EMBODIMENTS = [
  "BROWSER_WIDE",
  "BROWSER_NARROW_STACKED",
  "NATIVE_PRIMARY_SCENE",
  "NATIVE_SUPPORT_WINDOW",
] as const satisfies readonly CrossDeviceEmbodiment[];

export const CANONICAL_BROWSER_AND_PRIMARY_SCENE_EMBODIMENTS = [
  "BROWSER_WIDE",
  "BROWSER_NARROW_STACKED",
  "NATIVE_PRIMARY_SCENE",
] as const satisfies readonly CrossDeviceEmbodiment[];

export type BuildCrossDeviceContinuityContractInput = {
  access_scope_hash_or_null?: string | null | undefined;
  allowed_embodiments?: readonly CrossDeviceEmbodiment[] | undefined;
  canonical_object_ref: string;
  compatibility_basis_class?: CrossDeviceCompatibilityBasis | undefined;
  continuity_scope: CrossDeviceContinuityScope;
  dominant_action_state_or_null?: "ACTION_AVAILABLE" | "NO_SAFE_ACTION" | null | undefined;
  focus_anchor_ref_or_null?: string | null | undefined;
  masking_scope_fingerprint_or_null?: string | null | undefined;
  native_object_family?: ContinuityNativeObjectFamily | undefined;
  narrow_layout_policy?: "STACK_WITHIN_SAME_SHELL" | "NOT_APPLICABLE" | undefined;
  notification_visibility_class?: ContinuityNotificationVisibilityClass | undefined;
  parent_context_ref_or_null?: string | null | undefined;
  return_focus_anchor_ref_or_null?: string | null | undefined;
  route_identity_ref: string;
  secondary_window_policy?: "NOT_APPLICABLE" | "SUPPORT_ONLY_PARENT_BOUND" | undefined;
  session_scope_ref_or_null?: string | null | undefined;
  shell_family: CrossDeviceShellFamily;
  stability_guard_hash_or_null?: string | null | undefined;
  supported_invalidation_reason_codes?: readonly CrossDeviceInvalidationReason[] | undefined;
  visibility_cache_partition_key_or_null?: string | null | undefined;
};

export class CrossDeviceContinuityContractBuildError extends Error {
  readonly code:
    | "CONTINUITY_BASIS_INVALID"
    | "CONTINUITY_EMBODIMENT_INVALID"
    | "CONTINUITY_FIELD_REQUIRED"
    | "CONTINUITY_INVALIDATION_REASONS_INVALID"
    | "CONTINUITY_SCOPE_POLICY_INVALID";
  readonly trace: string;

  constructor(input: {
    code: CrossDeviceContinuityContractBuildError["code"];
    detail: string;
    payload: unknown;
  }) {
    const trace = crossDeviceContinuityContractSerializedPayloadTrace(input.payload);
    super(`${input.code}: ${input.detail}; ${trace}`);
    this.name = "CrossDeviceContinuityContractBuildError";
    this.code = input.code;
    this.trace = trace;
  }
}

function fail(
  code: CrossDeviceContinuityContractBuildError["code"],
  detail: string,
  payload: unknown,
): never {
  throw new CrossDeviceContinuityContractBuildError({ code, detail, payload });
}

export function crossDeviceContinuityContractSerializedPayloadTrace(payload: unknown) {
  return `trace=${JSON.stringify(payload, null, 2)}`;
}

function requiredString(field: string, value: string | null | undefined, payload: unknown) {
  if (typeof value !== "string" || value.trim().length === 0) {
    fail("CONTINUITY_FIELD_REQUIRED", `${field} must be a non-empty string`, payload);
  }
  return value.trim();
}

function optionalString(field: string, value: string | null | undefined, payload: unknown) {
  if (value === null || value === undefined) {
    return null;
  }
  return requiredString(field, value, payload);
}

function uniqueArray<T extends string>(field: string, values: readonly T[], payload: unknown) {
  const seen = new Set<T>();
  for (const value of values) {
    if (seen.has(value)) {
      fail("CONTINUITY_FIELD_REQUIRED", `${field} must not contain duplicate values`, payload);
    }
    seen.add(value);
  }
  return [...values];
}

function arrayEquals<T extends string>(left: readonly T[], right: readonly T[]) {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}

function expectedSecondaryWindowPolicy(input: {
  continuity_scope: CrossDeviceContinuityScope;
  notification_visibility_class?: ContinuityNotificationVisibilityClass | undefined;
  shell_family: CrossDeviceShellFamily;
}) {
  if (
    input.continuity_scope === "MANIFEST_ROUTE" ||
    input.continuity_scope === "NATIVE_PRIMARY_SCENE" ||
    input.continuity_scope === "NATIVE_SECONDARY_WINDOW"
  ) {
    return "SUPPORT_ONLY_PARENT_BOUND" as const;
  }
  if (input.continuity_scope === "WORKSPACE_ROUTE") {
    return input.shell_family === "CALM_SHELL"
      ? ("SUPPORT_ONLY_PARENT_BOUND" as const)
      : ("NOT_APPLICABLE" as const);
  }
  if (input.continuity_scope === "WORK_ITEM_NOTIFICATION") {
    return input.notification_visibility_class === "INTERNAL_ONLY" ||
      input.shell_family === "CALM_SHELL"
      ? ("SUPPORT_ONLY_PARENT_BOUND" as const)
      : ("NOT_APPLICABLE" as const);
  }
  return "NOT_APPLICABLE" as const;
}

function expectedAllowedEmbodiments(input: {
  secondary_window_policy: "NOT_APPLICABLE" | "SUPPORT_ONLY_PARENT_BOUND";
}) {
  return input.secondary_window_policy === "SUPPORT_ONLY_PARENT_BOUND"
    ? [...CANONICAL_BROWSER_AND_NATIVE_EMBODIMENTS]
    : [...CANONICAL_BROWSER_ONLY_EMBODIMENTS];
}

function expectedNarrowLayoutPolicy(input: {
  continuity_scope: CrossDeviceContinuityScope;
  parent_context_ref_or_null: string | null;
}) {
  if (
    input.continuity_scope === "WORK_ITEM_NOTIFICATION" ||
    input.continuity_scope === "NATIVE_PRIMARY_SCENE" ||
    input.continuity_scope === "NATIVE_SECONDARY_WINDOW"
  ) {
    return "NOT_APPLICABLE" as const;
  }
  if (input.continuity_scope === "CLIENT_PORTAL_ROUTE") {
    return input.parent_context_ref_or_null === null
      ? ("NOT_APPLICABLE" as const)
      : ("STACK_WITHIN_SAME_SHELL" as const);
  }
  return "STACK_WITHIN_SAME_SHELL" as const;
}

function validateCompatibilityBasis(contract: CrossDeviceContinuityContract) {
  const requireString = (field: keyof CrossDeviceContinuityContract) => {
    if (typeof contract[field] !== "string" || contract[field].length === 0) {
      fail("CONTINUITY_BASIS_INVALID", `${field} must be a non-empty string`, contract);
    }
  };
  const requireNull = (field: keyof CrossDeviceContinuityContract) => {
    if (contract[field] !== null) {
      fail("CONTINUITY_BASIS_INVALID", `${field} must clear for basis`, contract);
    }
  };

  switch (contract.compatibility_basis_class) {
    case "ROUTE_GUARD_ONLY":
      requireString("stability_guard_hash_or_null");
      requireNull("access_scope_hash_or_null");
      requireNull("masking_scope_fingerprint_or_null");
      requireNull("session_scope_ref_or_null");
      requireNull("visibility_cache_partition_key_or_null");
      break;
    case "ROUTE_GUARD_AND_VISIBILITY":
      requireString("stability_guard_hash_or_null");
      requireString("access_scope_hash_or_null");
      requireString("masking_scope_fingerprint_or_null");
      requireNull("session_scope_ref_or_null");
      requireString("visibility_cache_partition_key_or_null");
      break;
    case "VISIBILITY_ONLY":
      requireNull("stability_guard_hash_or_null");
      requireString("access_scope_hash_or_null");
      requireString("masking_scope_fingerprint_or_null");
      requireNull("session_scope_ref_or_null");
      requireString("visibility_cache_partition_key_or_null");
      break;
    case "SESSION_MASKING_AND_ROUTE_GUARD":
    case "SESSION_MASKING_AND_PARENT_SCENE":
      requireString("stability_guard_hash_or_null");
      requireString("masking_scope_fingerprint_or_null");
      requireString("session_scope_ref_or_null");
      requireNull("visibility_cache_partition_key_or_null");
      if (
        contract.access_scope_hash_or_null !== null &&
        contract.access_scope_hash_or_null.length === 0
      ) {
        fail(
          "CONTINUITY_BASIS_INVALID",
          "access_scope_hash_or_null must be null or non-empty",
          contract,
        );
      }
      break;
  }
}

export function validateCrossDeviceContinuityContract(
  contract: CrossDeviceContinuityContract,
): CrossDeviceContinuityContract {
  if (contract.contract_version !== "CROSS_DEVICE_CONTINUITY_V1") {
    fail("CONTINUITY_FIELD_REQUIRED", "contract_version drifted", contract);
  }
  if (
    contract.parent_context_ref_or_null === null &&
    contract.return_focus_anchor_ref_or_null !== null
  ) {
    fail(
      "CONTINUITY_SCOPE_POLICY_INVALID",
      "return_focus_anchor_ref_or_null must clear without parent context",
      contract,
    );
  }
  if (
    contract.parent_context_ref_or_null !== null &&
    contract.return_focus_anchor_ref_or_null === null
  ) {
    fail(
      "CONTINUITY_SCOPE_POLICY_INVALID",
      "return_focus_anchor_ref_or_null is required with parent context",
      contract,
    );
  }
  if (!arrayEquals(contract.allowed_embodiments.slice(0, 2), CANONICAL_BROWSER_ONLY_EMBODIMENTS)) {
    fail(
      "CONTINUITY_EMBODIMENT_INVALID",
      "allowed_embodiments must start BROWSER_WIDE -> BROWSER_NARROW_STACKED",
      contract,
    );
  }
  if (
    contract.secondary_window_policy === "SUPPORT_ONLY_PARENT_BOUND" &&
    !contract.allowed_embodiments.includes("NATIVE_SUPPORT_WINDOW")
  ) {
    fail(
      "CONTINUITY_EMBODIMENT_INVALID",
      "SUPPORT_ONLY_PARENT_BOUND requires NATIVE_SUPPORT_WINDOW",
      contract,
    );
  }
  if (
    contract.secondary_window_policy === "NOT_APPLICABLE" &&
    contract.allowed_embodiments.includes("NATIVE_SUPPORT_WINDOW")
  ) {
    fail(
      "CONTINUITY_EMBODIMENT_INVALID",
      "NOT_APPLICABLE must not advertise NATIVE_SUPPORT_WINDOW",
      contract,
    );
  }
  if (
    contract.continuity_scope === "WORK_ITEM_NOTIFICATION" &&
    (contract.dominant_action_state_or_null !== null ||
      contract.narrow_layout_policy !== "NOT_APPLICABLE")
  ) {
    fail(
      "CONTINUITY_SCOPE_POLICY_INVALID",
      "WORK_ITEM_NOTIFICATION must clear action posture and layout restacking",
      contract,
    );
  }
  if (
    (contract.continuity_scope === "NATIVE_PRIMARY_SCENE" ||
      contract.continuity_scope === "NATIVE_SECONDARY_WINDOW") &&
    contract.narrow_layout_policy !== "NOT_APPLICABLE"
  ) {
    fail("CONTINUITY_SCOPE_POLICY_INVALID", "native scopes must disable narrow layout", contract);
  }
  if (
    contract.continuity_scope === "NATIVE_SECONDARY_WINDOW" &&
    (contract.secondary_window_policy !== "SUPPORT_ONLY_PARENT_BOUND" ||
      contract.dominant_action_state_or_null !== null)
  ) {
    fail(
      "CONTINUITY_SCOPE_POLICY_INVALID",
      "secondary native windows must remain support-only and non-dominant",
      contract,
    );
  }
  if (
    (contract.continuity_scope === "MANIFEST_ROUTE" ||
      contract.continuity_scope === "GOVERNANCE_ROUTE") &&
    contract.compatibility_basis_class !== "ROUTE_GUARD_ONLY"
  ) {
    fail(
      "CONTINUITY_BASIS_INVALID",
      "manifest and governance routes must use ROUTE_GUARD_ONLY",
      contract,
    );
  }
  validateCompatibilityBasis(contract);
  return contract;
}

export function buildCrossDeviceContinuityContract(
  input: BuildCrossDeviceContinuityContractInput,
): CrossDeviceContinuityContract {
  const parentContextRefOrNull = optionalString(
    "parent_context_ref_or_null",
    input.parent_context_ref_or_null,
    input,
  );
  const classifiedBasis = classifyContinuityBasisClass({
    continuity_scope: input.continuity_scope,
  });
  if (
    input.compatibility_basis_class !== undefined &&
    input.compatibility_basis_class !== classifiedBasis
  ) {
    fail(
      "CONTINUITY_BASIS_INVALID",
      `compatibility_basis_class must be ${classifiedBasis} for ${input.continuity_scope}`,
      input,
    );
  }

  const secondaryWindowPolicy =
    input.secondary_window_policy ??
    expectedSecondaryWindowPolicy({
      continuity_scope: input.continuity_scope,
      notification_visibility_class: input.notification_visibility_class,
      shell_family: input.shell_family,
    });
  const expectedSecondary = expectedSecondaryWindowPolicy({
    continuity_scope: input.continuity_scope,
    notification_visibility_class: input.notification_visibility_class,
    shell_family: input.shell_family,
  });
  if (secondaryWindowPolicy !== expectedSecondary) {
    fail(
      "CONTINUITY_SCOPE_POLICY_INVALID",
      `secondary_window_policy must be ${expectedSecondary} for ${input.continuity_scope}`,
      input,
    );
  }

  const allowedEmbodiments = uniqueArray(
    "allowed_embodiments",
    input.allowed_embodiments ??
      expectedAllowedEmbodiments({
        secondary_window_policy: secondaryWindowPolicy,
      }),
    input,
  );
  const expectedEmbodiments = expectedAllowedEmbodiments({
    secondary_window_policy: secondaryWindowPolicy,
  });
  if (!arrayEquals(allowedEmbodiments, expectedEmbodiments)) {
    fail(
      "CONTINUITY_EMBODIMENT_INVALID",
      `allowed_embodiments must stay ${expectedEmbodiments.join(" -> ")}`,
      input,
    );
  }

  let derivedInvalidationReasons: CrossDeviceInvalidationReason[];
  try {
    derivedInvalidationReasons = deriveContinuityInvalidationReasons({
      continuity_scope: input.continuity_scope,
      native_object_family: input.native_object_family,
      notification_visibility_class: input.notification_visibility_class,
      shell_family: input.shell_family,
    });
  } catch (error) {
    fail(
      "CONTINUITY_INVALIDATION_REASONS_INVALID",
      error instanceof Error ? error.message : "invalid invalidation reason derivation",
      input,
    );
  }
  const supportedInvalidationReasonCodes = uniqueArray(
    "supported_invalidation_reason_codes",
    input.supported_invalidation_reason_codes ?? derivedInvalidationReasons,
    input,
  );
  if (!arrayEquals(supportedInvalidationReasonCodes, derivedInvalidationReasons)) {
    fail(
      "CONTINUITY_INVALIDATION_REASONS_INVALID",
      `supported_invalidation_reason_codes must stay ${derivedInvalidationReasons.join(",")}`,
      input,
    );
  }

  const narrowLayoutPolicy =
    input.narrow_layout_policy ??
    expectedNarrowLayoutPolicy({
      continuity_scope: input.continuity_scope,
      parent_context_ref_or_null: parentContextRefOrNull,
    });
  const expectedNarrow = expectedNarrowLayoutPolicy({
    continuity_scope: input.continuity_scope,
    parent_context_ref_or_null: parentContextRefOrNull,
  });
  if (narrowLayoutPolicy !== expectedNarrow) {
    fail(
      "CONTINUITY_SCOPE_POLICY_INVALID",
      `narrow_layout_policy must be ${expectedNarrow} for ${input.continuity_scope}`,
      input,
    );
  }

  return validateCrossDeviceContinuityContract({
    access_scope_hash_or_null: optionalString(
      "access_scope_hash_or_null",
      input.access_scope_hash_or_null,
      input,
    ),
    action_posture_policy: "DOMINANCE_AND_SETTLEMENT_SERVER_AUTHORED_ONLY",
    allowed_embodiments: allowedEmbodiments,
    canonical_object_ref: requiredString("canonical_object_ref", input.canonical_object_ref, input),
    compatibility_basis_class: classifiedBasis,
    continuity_scope: input.continuity_scope,
    contract_version: "CROSS_DEVICE_CONTINUITY_V1",
    deep_link_return_policy: "EXPLICIT_PARENT_CONTEXT_AND_FOCUS",
    dominant_action_state_or_null: input.dominant_action_state_or_null ?? null,
    focus_anchor_ref_or_null: optionalString(
      "focus_anchor_ref_or_null",
      input.focus_anchor_ref_or_null,
      input,
    ),
    hydration_compatibility_policy: "TENANT_ACCESS_MASKING_AND_SESSION_BOUND",
    masking_scope_fingerprint_or_null: optionalString(
      "masking_scope_fingerprint_or_null",
      input.masking_scope_fingerprint_or_null,
      input,
    ),
    narrow_layout_policy: narrowLayoutPolicy,
    parent_context_ref_or_null: parentContextRefOrNull,
    restoration_mode_policy: "EXPLICIT_CARRY_FORWARD_OR_REBASE_ONLY",
    return_focus_anchor_ref_or_null: optionalString(
      "return_focus_anchor_ref_or_null",
      input.return_focus_anchor_ref_or_null,
      input,
    ),
    route_identity_ref: requiredString("route_identity_ref", input.route_identity_ref, input),
    same_object_policy: "PRESERVE_EXACT_OBJECT_OR_EXPLICIT_LAWFUL_FALLBACK",
    same_shell_policy: "PRESERVE_SAME_SHELL_FAMILY",
    secondary_window_policy: secondaryWindowPolicy,
    session_scope_ref_or_null: optionalString(
      "session_scope_ref_or_null",
      input.session_scope_ref_or_null,
      input,
    ),
    shell_family: input.shell_family,
    stability_guard_hash_or_null: optionalString(
      "stability_guard_hash_or_null",
      input.stability_guard_hash_or_null,
      input,
    ),
    supported_invalidation_reason_codes: supportedInvalidationReasonCodes,
    visibility_cache_partition_key_or_null: optionalString(
      "visibility_cache_partition_key_or_null",
      input.visibility_cache_partition_key_or_null,
      input,
    ),
  });
}

export function buildManifestRouteContinuityContract(input: {
  canonical_object_ref: string;
  dominant_action_state_or_null: "ACTION_AVAILABLE" | "NO_SAFE_ACTION";
  focus_anchor_ref_or_null?: string | null | undefined;
  route_identity_ref: string;
  stability_guard_hash_or_null: string;
}) {
  return buildCrossDeviceContinuityContract({
    ...input,
    continuity_scope: "MANIFEST_ROUTE",
    shell_family: "CALM_SHELL",
  });
}

export function buildWorkspaceRouteContinuityContract(input: {
  access_scope_hash_or_null: string;
  canonical_object_ref: string;
  dominant_action_state_or_null: "ACTION_AVAILABLE" | "NO_SAFE_ACTION";
  focus_anchor_ref_or_null?: string | null | undefined;
  masking_scope_fingerprint_or_null: string;
  parent_context_ref_or_null: string;
  return_focus_anchor_ref_or_null: string;
  route_identity_ref: string;
  shell_family: "CALM_SHELL" | "CLIENT_PORTAL_SHELL";
  stability_guard_hash_or_null: string;
  visibility_cache_partition_key_or_null: string;
}) {
  return buildCrossDeviceContinuityContract({
    ...input,
    continuity_scope: "WORKSPACE_ROUTE",
  });
}

export function buildClientPortalRouteContinuityContract(input: {
  access_scope_hash_or_null: string;
  canonical_object_ref: string;
  dominant_action_state_or_null: "ACTION_AVAILABLE" | "NO_SAFE_ACTION";
  focus_anchor_ref_or_null?: string | null | undefined;
  masking_scope_fingerprint_or_null: string;
  parent_context_ref_or_null?: string | null | undefined;
  return_focus_anchor_ref_or_null?: string | null | undefined;
  route_identity_ref: string;
  stability_guard_hash_or_null: string;
  visibility_cache_partition_key_or_null: string;
}) {
  return buildCrossDeviceContinuityContract({
    ...input,
    continuity_scope: "CLIENT_PORTAL_ROUTE",
    shell_family: "CLIENT_PORTAL_SHELL",
  });
}

export function buildRequestListContinuityContract(input: {
  access_scope_hash_or_null: string;
  canonical_object_ref: string;
  focus_anchor_ref_or_null?: string | null | undefined;
  masking_scope_fingerprint_or_null: string;
  route_identity_ref: string;
  stability_guard_hash_or_null: string;
  visibility_cache_partition_key_or_null: string;
}) {
  return buildClientPortalRouteContinuityContract({
    ...input,
    dominant_action_state_or_null: "NO_SAFE_ACTION",
    parent_context_ref_or_null: null,
    return_focus_anchor_ref_or_null: null,
  });
}

export function buildNotificationOpenContinuityContract(input: {
  access_scope_hash_or_null: string;
  canonical_object_ref: string;
  focus_anchor_ref_or_null?: string | null | undefined;
  masking_scope_fingerprint_or_null: string;
  parent_context_ref_or_null: string;
  return_focus_anchor_ref_or_null: string;
  route_identity_ref: string;
  shell_family: "CALM_SHELL" | "CLIENT_PORTAL_SHELL";
  visibility_cache_partition_key_or_null: string;
  visibility_class: ContinuityNotificationVisibilityClass;
}) {
  return buildCrossDeviceContinuityContract({
    access_scope_hash_or_null: input.access_scope_hash_or_null,
    canonical_object_ref: input.canonical_object_ref,
    continuity_scope: "WORK_ITEM_NOTIFICATION",
    focus_anchor_ref_or_null: input.focus_anchor_ref_or_null,
    masking_scope_fingerprint_or_null: input.masking_scope_fingerprint_or_null,
    notification_visibility_class: input.visibility_class,
    parent_context_ref_or_null: input.parent_context_ref_or_null,
    return_focus_anchor_ref_or_null: input.return_focus_anchor_ref_or_null,
    route_identity_ref: input.route_identity_ref,
    shell_family: input.shell_family,
    visibility_cache_partition_key_or_null: input.visibility_cache_partition_key_or_null,
  });
}

export function buildGovernanceRouteContinuityContract(input: {
  canonical_object_ref: string;
  dominant_action_state_or_null: "ACTION_AVAILABLE" | "NO_SAFE_ACTION";
  focus_anchor_ref_or_null?: string | null | undefined;
  route_identity_ref: string;
  stability_guard_hash_or_null: string;
}) {
  return buildCrossDeviceContinuityContract({
    ...input,
    continuity_scope: "GOVERNANCE_ROUTE",
    shell_family: "GOVERNANCE_DENSITY_SHELL",
  });
}

export function buildNativePrimarySceneContinuityContract(input: {
  access_scope_hash_or_null?: string | null | undefined;
  canonical_object_ref: string;
  dominant_action_state_or_null: "ACTION_AVAILABLE" | "NO_SAFE_ACTION";
  focus_anchor_ref_or_null?: string | null | undefined;
  masking_scope_fingerprint_or_null: string;
  native_object_family: ContinuityNativeObjectFamily;
  route_identity_ref: string;
  session_scope_ref_or_null: string;
  stability_guard_hash_or_null: string;
}) {
  return buildCrossDeviceContinuityContract({
    ...input,
    continuity_scope: "NATIVE_PRIMARY_SCENE",
    shell_family: "CALM_SHELL",
  });
}

export function buildNativeSecondaryWindowContinuityContract(input: {
  access_scope_hash_or_null?: string | null | undefined;
  canonical_object_ref: string;
  focus_anchor_ref_or_null?: string | null | undefined;
  masking_scope_fingerprint_or_null: string;
  native_object_family: ContinuityNativeObjectFamily;
  parent_context_ref_or_null: string;
  return_focus_anchor_ref_or_null: string;
  route_identity_ref: string;
  session_scope_ref_or_null: string;
  stability_guard_hash_or_null: string;
}) {
  return buildCrossDeviceContinuityContract({
    ...input,
    continuity_scope: "NATIVE_SECONDARY_WINDOW",
    dominant_action_state_or_null: null,
    shell_family: "CALM_SHELL",
  });
}
