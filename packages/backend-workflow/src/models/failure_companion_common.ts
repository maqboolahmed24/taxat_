import {
  normalizeStringSet,
  requireTrimmedString,
} from "../../../backend-access/src/services/principal_context_normalizer.ts";
import { stableJsonHash } from "../../../domain-kernel/src/primitives/hash.ts";
import { normalizeUtcInstantString } from "../../../domain-kernel/src/primitives/time.ts";
import { WorkflowModelError } from "./workflow_item.ts";

export type FailureResolutionLifecycleRole =
  | "ERROR_RECORD"
  | "REMEDIATION_TASK"
  | "COMPENSATION_RECORD"
  | "FAILURE_INVESTIGATION"
  | "ACCEPTED_RISK_APPROVAL";

export type FailureResolutionRoleSpecificBindingPolicy =
  | "ERROR_RETAINS_OWNER_NEXT_ACTION_AND_CHILD_LINKS"
  | "TASK_CLOSURE_DECLARES_EFFECT_ON_ERROR"
  | "COMPENSATION_RETAINS_OWNER_VERIFICATION_AND_CLOSURE"
  | "INVESTIGATION_CLOSURE_RETAINS_OUTCOME_AND_EVIDENCE"
  | "APPROVAL_RETAINS_SCOPE_EXPIRY_AND_AUTHORIZATION_BASIS";

export type FailureResolutionContract = {
  accepted_risk_policy: "ACCEPTED_RISK_REQUIRES_APPROVAL_EXPIRY_AND_BOUNDED_SCOPE";
  closure_policy: "TERMINAL_OR_COMPLETED_STATES_REQUIRE_BASIS_EVIDENCE_AND_AUDIT";
  contract_version: "FAILURE_RESOLUTION_V1";
  lifecycle_role: FailureResolutionLifecycleRole;
  linkage_policy: "ERROR_TASK_COMPENSATION_INVESTIGATION_APPROVAL_LINKS_MUST_STAY_COHERENT";
  material_failure_policy: "NO_MATERIAL_FAILURE_WITHOUT_DURABLE_OBJECT";
  next_action_policy: "OPEN_FAILURES_REQUIRE_ONE_LAWFUL_NEXT_PATH";
  ownership_policy: "OWNER_TYPE_AND_REF_OR_EXPLICIT_SYSTEM_OWNER_REQUIRED";
  retry_policy: "RETRY_CLASS_BUDGET_AND_PRECONDITIONS_BIND_EXECUTION";
  role_specific_binding_policy: FailureResolutionRoleSpecificBindingPolicy;
};

export type FailureCompanionOwnerType =
  | "SYSTEM"
  | "SERVICE_OPERATOR"
  | "REVIEWER"
  | "APPROVER"
  | "CLIENT"
  | "TENANT_ADMIN"
  | "SECURITY_OPERATOR";

export type FailureCompensationOwnerType = Exclude<FailureCompanionOwnerType, "CLIENT">;
export type FailureRetentionClass =
  | "regulated_record"
  | "derived_artifact"
  | "operational_log"
  | "analytics_projection"
  | "policy_governed_other";

export const FAILURE_RETENTION_CLASSES = [
  "regulated_record",
  "derived_artifact",
  "operational_log",
  "analytics_projection",
  "policy_governed_other",
] as const satisfies readonly FailureRetentionClass[];

const FAILURE_RESOLUTION_FIXED_POLICIES = {
  accepted_risk_policy: "ACCEPTED_RISK_REQUIRES_APPROVAL_EXPIRY_AND_BOUNDED_SCOPE",
  closure_policy: "TERMINAL_OR_COMPLETED_STATES_REQUIRE_BASIS_EVIDENCE_AND_AUDIT",
  contract_version: "FAILURE_RESOLUTION_V1",
  linkage_policy: "ERROR_TASK_COMPENSATION_INVESTIGATION_APPROVAL_LINKS_MUST_STAY_COHERENT",
  material_failure_policy: "NO_MATERIAL_FAILURE_WITHOUT_DURABLE_OBJECT",
  next_action_policy: "OPEN_FAILURES_REQUIRE_ONE_LAWFUL_NEXT_PATH",
  ownership_policy: "OWNER_TYPE_AND_REF_OR_EXPLICIT_SYSTEM_OWNER_REQUIRED",
  retry_policy: "RETRY_CLASS_BUDGET_AND_PRECONDITIONS_BIND_EXECUTION",
} as const;

export const FAILURE_RESOLUTION_BINDING_POLICY_BY_ROLE = {
  ACCEPTED_RISK_APPROVAL: "APPROVAL_RETAINS_SCOPE_EXPIRY_AND_AUTHORIZATION_BASIS",
  COMPENSATION_RECORD: "COMPENSATION_RETAINS_OWNER_VERIFICATION_AND_CLOSURE",
  ERROR_RECORD: "ERROR_RETAINS_OWNER_NEXT_ACTION_AND_CHILD_LINKS",
  FAILURE_INVESTIGATION: "INVESTIGATION_CLOSURE_RETAINS_OUTCOME_AND_EVIDENCE",
  REMEDIATION_TASK: "TASK_CLOSURE_DECLARES_EFFECT_ON_ERROR",
} as const satisfies Record<FailureResolutionLifecycleRole, FailureResolutionRoleSpecificBindingPolicy>;

export function failureCompanionError(message: string): never {
  throw new WorkflowModelError("WORKFLOW_CONTRACT_INVALID", message);
}

export function failureCompanionFieldError(message: string): never {
  throw new WorkflowModelError("WORKFLOW_FIELD_INVALID", message);
}

export function requireFailureString(label: string, value: unknown) {
  try {
    return requireTrimmedString(label, value);
  } catch (error) {
    failureCompanionFieldError(
      error instanceof Error ? error.message : `${label} must be a non-empty string`,
    );
  }
}

export function normalizeNullableFailureString(label: string, value: unknown) {
  if (value == null) {
    return null;
  }
  return requireFailureString(label, value);
}

export function normalizeFailureTimestamp(label: string, value: unknown) {
  try {
    return normalizeUtcInstantString(value);
  } catch (error) {
    failureCompanionFieldError(
      error instanceof Error ? error.message : `${label} must be an ISO-8601 instant`,
    );
  }
}

export function normalizeNullableFailureTimestamp(label: string, value: unknown) {
  if (value == null) {
    return null;
  }
  return normalizeFailureTimestamp(label, value);
}

export function normalizeFailureStringSet(
  label: string,
  values: readonly string[] | null | undefined,
  options: { minItems?: number } = {},
) {
  try {
    return normalizeStringSet(label, values ?? [], options);
  } catch (error) {
    failureCompanionFieldError(
      error instanceof Error ? error.message : `${label} must be a valid unique string set`,
    );
  }
}

export function appendFailureRefs(
  existing: readonly string[],
  additions: readonly string[] | undefined,
  label: string,
  options: { minItems?: number } = {},
) {
  return normalizeFailureStringSet(label, [...existing, ...(additions ?? [])], options);
}

export function assertFailureEnum<T extends string>(
  label: string,
  value: unknown,
  allowed: readonly T[],
) {
  if (typeof value !== "string" || !allowed.includes(value as T)) {
    failureCompanionFieldError(`${label} must be one of ${allowed.join(", ")}`);
  }
  return value as T;
}

export function assertNullableFailureEnum<T extends string>(
  label: string,
  value: unknown,
  allowed: readonly T[],
) {
  if (value == null) {
    return null;
  }
  return assertFailureEnum(label, value, allowed);
}

export function cloneFailureCompanionRecord<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

export function failureCompanionContentFingerprint(value: unknown) {
  return stableJsonHash(value);
}

export function failureCompanionStableEqual(left: unknown, right: unknown) {
  return failureCompanionContentFingerprint(left) === failureCompanionContentFingerprint(right);
}

export function normalizeFailureResolutionContract(
  input: FailureResolutionContract,
  expectedLifecycleRole: FailureResolutionLifecycleRole,
) {
  if (input == null || typeof input !== "object") {
    failureCompanionError("failure_resolution_contract must be an object");
  }
  const expectedBindingPolicy = FAILURE_RESOLUTION_BINDING_POLICY_BY_ROLE[expectedLifecycleRole];
  const contract: FailureResolutionContract = {
    ...FAILURE_RESOLUTION_FIXED_POLICIES,
    lifecycle_role: assertFailureEnum("failure_resolution_contract.lifecycle_role", input.lifecycle_role, [
      "ERROR_RECORD",
      "REMEDIATION_TASK",
      "COMPENSATION_RECORD",
      "FAILURE_INVESTIGATION",
      "ACCEPTED_RISK_APPROVAL",
    ] as const),
    role_specific_binding_policy: assertFailureEnum(
      "failure_resolution_contract.role_specific_binding_policy",
      input.role_specific_binding_policy,
      [
        "ERROR_RETAINS_OWNER_NEXT_ACTION_AND_CHILD_LINKS",
        "TASK_CLOSURE_DECLARES_EFFECT_ON_ERROR",
        "COMPENSATION_RETAINS_OWNER_VERIFICATION_AND_CLOSURE",
        "INVESTIGATION_CLOSURE_RETAINS_OUTCOME_AND_EVIDENCE",
        "APPROVAL_RETAINS_SCOPE_EXPIRY_AND_AUTHORIZATION_BASIS",
      ] as const,
    ),
  };

  if (contract.lifecycle_role !== expectedLifecycleRole) {
    failureCompanionError(
      `failure_resolution_contract.lifecycle_role must be ${expectedLifecycleRole}`,
    );
  }
  if (contract.role_specific_binding_policy !== expectedBindingPolicy) {
    failureCompanionError(
      `failure_resolution_contract.role_specific_binding_policy must be ${expectedBindingPolicy}`,
    );
  }

  for (const [key, expected] of Object.entries(FAILURE_RESOLUTION_FIXED_POLICIES)) {
    if (input[key as keyof FailureResolutionContract] !== expected) {
      failureCompanionError(`failure_resolution_contract.${key} must stay ${expected}`);
    }
  }
  return contract;
}

export function assertOwnerReference(input: {
  label: string;
  owner_ref: string | null;
  owner_type: string;
}) {
  if (input.owner_type === "SYSTEM") {
    if (input.owner_ref !== null) {
      failureCompanionError(`${input.label} owner_type=SYSTEM must keep owner_ref null`);
    }
    return;
  }
  if (input.owner_ref === null) {
    failureCompanionError(`${input.label} non-system owners must retain owner_ref`);
  }
}

export function assertRetentionLinkage(input: {
  artifact_retention_ref: string | null;
  label: string;
  retention_class: FailureRetentionClass | null;
}) {
  if (input.retention_class !== null && input.artifact_retention_ref === null) {
    failureCompanionError(`${input.label} retention_class requires artifact_retention_ref`);
  }
  if (input.artifact_retention_ref !== null && input.retention_class === null) {
    failureCompanionError(`${input.label} artifact_retention_ref requires retention_class`);
  }
}

export function assertNotBefore(input: {
  earlier_label: string;
  earlier_value: string | null;
  later_label: string;
  later_value: string | null;
}) {
  if (
    input.earlier_value !== null &&
    input.later_value !== null &&
    input.later_value < input.earlier_value
  ) {
    failureCompanionError(`${input.later_label} must not be earlier than ${input.earlier_label}`);
  }
}

export function assertAfter(input: {
  earlier_label: string;
  earlier_value: string;
  later_label: string;
  later_value: string;
}) {
  if (input.later_value <= input.earlier_value) {
    failureCompanionError(`${input.later_label} must be later than ${input.earlier_label}`);
  }
}

export function assertNoSelfReference(input: {
  id: string;
  id_label: string;
  reference: string | null;
  reference_label: string;
}) {
  if (input.reference !== null && input.reference === input.id) {
    failureCompanionError(`${input.reference_label} must not self-reference ${input.id_label}`);
  }
}
