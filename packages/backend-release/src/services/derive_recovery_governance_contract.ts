import {
  buildDeploymentReleaseRecoveryGovernanceContract,
  buildRecoveryGovernanceContract,
  type BuildRecoveryGovernanceContractInput,
  type ProtectedWorkloadClass,
  RecoveryGovernanceContractModelError,
  type RecoveryGovernanceBoundaryScope,
} from "../models/recovery_governance_contract.ts";

export type DeriveRecoveryGovernanceContractInput =
  BuildRecoveryGovernanceContractInput;

export function deriveRecoveryGovernanceContract(
  input: DeriveRecoveryGovernanceContractInput,
) {
  return buildRecoveryGovernanceContract(input);
}

export function deriveCheckpointRecoveryGovernanceContract(input: {
  protected_workload_class: ProtectedWorkloadClass;
  attempted_recovery_tier_class?: BuildRecoveryGovernanceContractInput["attempted_recovery_tier_class"];
  attempted_rpo_class?: BuildRecoveryGovernanceContractInput["attempted_rpo_class"];
  attempted_rto_class?: BuildRecoveryGovernanceContractInput["attempted_rto_class"];
}) {
  return buildRecoveryGovernanceContract({
    boundary_scope: "RECOVERY_CHECKPOINT",
    protected_workload_class: input.protected_workload_class,
    ...(input.attempted_recovery_tier_class === undefined
      ? {}
      : { attempted_recovery_tier_class: input.attempted_recovery_tier_class }),
    ...(input.attempted_rpo_class === undefined
      ? {}
      : { attempted_rpo_class: input.attempted_rpo_class }),
    ...(input.attempted_rto_class === undefined
      ? {}
      : { attempted_rto_class: input.attempted_rto_class }),
  });
}

export function deriveDeploymentReleaseRecoveryGovernanceContract(input: {
  boundary_scope?: RecoveryGovernanceBoundaryScope;
  protected_workload_class?: ProtectedWorkloadClass;
} = {}) {
  if (
    input.boundary_scope !== undefined &&
    input.boundary_scope !== "DEPLOYMENT_RELEASE"
  ) {
    throw new RecoveryGovernanceContractModelError(
      "RECOVERY_GOVERNANCE_BOUNDARY_INVALID",
      "deployment release recovery governance must use DEPLOYMENT_RELEASE boundary scope",
    );
  }
  if (
    input.protected_workload_class !== undefined &&
    input.protected_workload_class !== "CONTROL_PLANE_LEGAL_TRUTH"
  ) {
    throw new RecoveryGovernanceContractModelError(
      "RECOVERY_GOVERNANCE_TIER_INVALID",
      "deployment release recovery governance must protect control-plane legal truth",
    );
  }
  return buildDeploymentReleaseRecoveryGovernanceContract();
}
