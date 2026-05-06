import type { CacheIsolationContract } from "../../../generated-models/src/generated/typescript/domain-workflow-and-filing.ts";

export type CacheScopeClass = CacheIsolationContract["cache_scope_class"];

export type CacheScopeRequirements = {
  cache_scope_class: CacheScopeClass;
  customer_safe_projection_requirement: "CALLER_SELECTED" | "MUST_BE_FALSE" | "MUST_BE_TRUE";
  governance_only: boolean;
  requires_access_and_masking: boolean;
  requires_preview_subject: boolean;
  requires_visibility_partition: boolean;
  restore_posture: "LIVE_ONLY" | "READ_ONLY_UNTIL_LIVE_LEGALITY";
};

const cacheScopeRequirements = {
  LOW_NOISE_FRAME: {
    cache_scope_class: "LOW_NOISE_FRAME",
    customer_safe_projection_requirement: "MUST_BE_FALSE",
    governance_only: false,
    requires_access_and_masking: true,
    requires_preview_subject: false,
    requires_visibility_partition: false,
    restore_posture: "LIVE_ONLY",
  },
  WORKSPACE_SNAPSHOT: {
    cache_scope_class: "WORKSPACE_SNAPSHOT",
    customer_safe_projection_requirement: "CALLER_SELECTED",
    governance_only: false,
    requires_access_and_masking: true,
    requires_preview_subject: false,
    requires_visibility_partition: true,
    restore_posture: "READ_ONLY_UNTIL_LIVE_LEGALITY",
  },
  WORK_INBOX_SNAPSHOT: {
    cache_scope_class: "WORK_INBOX_SNAPSHOT",
    customer_safe_projection_requirement: "MUST_BE_FALSE",
    governance_only: false,
    requires_access_and_masking: true,
    requires_preview_subject: false,
    requires_visibility_partition: true,
    restore_posture: "READ_ONLY_UNTIL_LIVE_LEGALITY",
  },
  CLIENT_PORTAL_WORKSPACE: {
    cache_scope_class: "CLIENT_PORTAL_WORKSPACE",
    customer_safe_projection_requirement: "MUST_BE_TRUE",
    governance_only: false,
    requires_access_and_masking: true,
    requires_preview_subject: false,
    requires_visibility_partition: true,
    restore_posture: "READ_ONLY_UNTIL_LIVE_LEGALITY",
  },
  CUSTOMER_REQUEST_LIST: {
    cache_scope_class: "CUSTOMER_REQUEST_LIST",
    customer_safe_projection_requirement: "MUST_BE_TRUE",
    governance_only: false,
    requires_access_and_masking: true,
    requires_preview_subject: false,
    requires_visibility_partition: true,
    restore_posture: "READ_ONLY_UNTIL_LIVE_LEGALITY",
  },
  TENANT_GOVERNANCE_SNAPSHOT: {
    cache_scope_class: "TENANT_GOVERNANCE_SNAPSHOT",
    customer_safe_projection_requirement: "MUST_BE_FALSE",
    governance_only: true,
    requires_access_and_masking: false,
    requires_preview_subject: false,
    requires_visibility_partition: false,
    restore_posture: "READ_ONLY_UNTIL_LIVE_LEGALITY",
  },
  GOVERNANCE_POLICY_SNAPSHOT: {
    cache_scope_class: "GOVERNANCE_POLICY_SNAPSHOT",
    customer_safe_projection_requirement: "MUST_BE_FALSE",
    governance_only: true,
    requires_access_and_masking: false,
    requires_preview_subject: false,
    requires_visibility_partition: false,
    restore_posture: "READ_ONLY_UNTIL_LIVE_LEGALITY",
  },
  PRINCIPAL_ACCESS_VIEW: {
    cache_scope_class: "PRINCIPAL_ACCESS_VIEW",
    customer_safe_projection_requirement: "MUST_BE_FALSE",
    governance_only: true,
    requires_access_and_masking: false,
    requires_preview_subject: false,
    requires_visibility_partition: false,
    restore_posture: "READ_ONLY_UNTIL_LIVE_LEGALITY",
  },
  ROLE_TEMPLATE_MATRIX: {
    cache_scope_class: "ROLE_TEMPLATE_MATRIX",
    customer_safe_projection_requirement: "MUST_BE_FALSE",
    governance_only: true,
    requires_access_and_masking: false,
    requires_preview_subject: false,
    requires_visibility_partition: false,
    restore_posture: "READ_ONLY_UNTIL_LIVE_LEGALITY",
  },
  NATIVE_OPERATOR_WORKSPACE_SCENE: {
    cache_scope_class: "NATIVE_OPERATOR_WORKSPACE_SCENE",
    customer_safe_projection_requirement: "MUST_BE_FALSE",
    governance_only: false,
    requires_access_and_masking: true,
    requires_preview_subject: false,
    requires_visibility_partition: false,
    restore_posture: "READ_ONLY_UNTIL_LIVE_LEGALITY",
  },
  NATIVE_OPERATOR_SECONDARY_WINDOW_SCENE: {
    cache_scope_class: "NATIVE_OPERATOR_SECONDARY_WINDOW_SCENE",
    customer_safe_projection_requirement: "MUST_BE_FALSE",
    governance_only: false,
    requires_access_and_masking: true,
    requires_preview_subject: true,
    requires_visibility_partition: false,
    restore_posture: "READ_ONLY_UNTIL_LIVE_LEGALITY",
  },
} as const satisfies Record<CacheScopeClass, CacheScopeRequirements>;

export const cacheScopeClasses = Object.keys(cacheScopeRequirements) as CacheScopeClass[];

export class CacheScopeRequirementsError extends Error {
  readonly code = "CACHE_SCOPE_REQUIREMENTS_INVALID";

  constructor(detail: string) {
    super(`${detail}`);
    this.name = "CacheScopeRequirementsError";
  }
}

export function classifyCacheScopeRequirements(
  cache_scope_class: CacheScopeClass,
): CacheScopeRequirements {
  const requirements = cacheScopeRequirements[cache_scope_class];
  if (!requirements) {
    throw new CacheScopeRequirementsError(`unknown cache scope class ${cache_scope_class}`);
  }
  return requirements;
}

export function resolveCustomerSafeProjection(input: {
  requested_customer_safe_projection?: boolean | undefined;
  requirements: CacheScopeRequirements;
}) {
  const requested = input.requested_customer_safe_projection;
  if (input.requirements.customer_safe_projection_requirement === "MUST_BE_TRUE") {
    if (requested === false) {
      throw new CacheScopeRequirementsError(
        `${input.requirements.cache_scope_class} must keep customer_safe_projection=true`,
      );
    }
    return true;
  }
  if (input.requirements.customer_safe_projection_requirement === "MUST_BE_FALSE") {
    if (requested === true) {
      throw new CacheScopeRequirementsError(
        `${input.requirements.cache_scope_class} must keep customer_safe_projection=false`,
      );
    }
    return false;
  }
  return requested ?? false;
}
