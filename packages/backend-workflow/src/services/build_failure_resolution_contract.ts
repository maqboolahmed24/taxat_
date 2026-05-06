import {
  FAILURE_RESOLUTION_BINDING_POLICY_BY_ROLE,
  normalizeFailureResolutionContract,
  type FailureResolutionContract,
  type FailureResolutionLifecycleRole,
} from "../models/failure_companion_common.ts";

export function buildFailureResolutionContract(input: {
  lifecycle_role: FailureResolutionLifecycleRole;
}): FailureResolutionContract {
  return normalizeFailureResolutionContract(
    {
      accepted_risk_policy: "ACCEPTED_RISK_REQUIRES_APPROVAL_EXPIRY_AND_BOUNDED_SCOPE",
      closure_policy: "TERMINAL_OR_COMPLETED_STATES_REQUIRE_BASIS_EVIDENCE_AND_AUDIT",
      contract_version: "FAILURE_RESOLUTION_V1",
      lifecycle_role: input.lifecycle_role,
      linkage_policy: "ERROR_TASK_COMPENSATION_INVESTIGATION_APPROVAL_LINKS_MUST_STAY_COHERENT",
      material_failure_policy: "NO_MATERIAL_FAILURE_WITHOUT_DURABLE_OBJECT",
      next_action_policy: "OPEN_FAILURES_REQUIRE_ONE_LAWFUL_NEXT_PATH",
      ownership_policy: "OWNER_TYPE_AND_REF_OR_EXPLICIT_SYSTEM_OWNER_REQUIRED",
      retry_policy: "RETRY_CLASS_BUDGET_AND_PRECONDITIONS_BIND_EXECUTION",
      role_specific_binding_policy: FAILURE_RESOLUTION_BINDING_POLICY_BY_ROLE[input.lifecycle_role],
    },
    input.lifecycle_role,
  );
}

export function assertFailureResolutionContractRole(input: {
  contract: FailureResolutionContract;
  lifecycle_role: FailureResolutionLifecycleRole;
}) {
  return normalizeFailureResolutionContract(input.contract, input.lifecycle_role);
}
