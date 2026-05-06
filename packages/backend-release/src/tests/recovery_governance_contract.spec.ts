import { expect, test } from "@playwright/test";

import { validateContractSchema } from "../../../../tests/unit/backend_northbound/audit_and_enquiry_fixtures.ts";
import {
  RecoveryGovernanceContractModelError,
  deriveCheckpointRecoveryGovernanceContract,
  deriveDeploymentReleaseRecoveryGovernanceContract,
  deriveRecoveryGovernanceContract,
  normalizeRecoveryGovernanceContract,
} from "../index.ts";

test("derives schema-valid recovery governance contracts for every protected workload tier", async () => {
  const controlPlane = deriveRecoveryGovernanceContract({
    boundary_scope: "RECOVERY_CHECKPOINT",
    protected_workload_class: "CONTROL_PLANE_LEGAL_TRUTH",
  });
  const rebuildable = deriveCheckpointRecoveryGovernanceContract({
    protected_workload_class: "REBUILDABLE_PROJECTION",
  });
  const disposable = deriveCheckpointRecoveryGovernanceContract({
    protected_workload_class: "DISPOSABLE_RUNTIME_CACHE",
  });

  expect(controlPlane).toMatchObject({
    recovery_tier_class: "TIER_0_CONTROL_PLANE",
    rpo_class: "RPO_15M",
    rto_class: "RTO_60M",
  });
  expect(rebuildable).toMatchObject({
    recovery_tier_class: "TIER_1_REBUILDABLE",
    rpo_class: "RPO_4H",
    rto_class: "RTO_4H",
  });
  expect(disposable).toMatchObject({
    recovery_tier_class: "TIER_2_DISPOSABLE",
    rpo_class: "RPO_BEST_EFFORT",
    rto_class: "RTO_24H",
  });

  for (const contract of [controlPlane, rebuildable, disposable]) {
    await validateContractSchema("recovery_governance_contract", contract);
  }
});

test("keeps checkpoint and deployment release boundary policies distinct", async () => {
  const checkpoint = deriveCheckpointRecoveryGovernanceContract({
    protected_workload_class: "CONTROL_PLANE_LEGAL_TRUTH",
  });
  const deployment = deriveDeploymentReleaseRecoveryGovernanceContract();

  expect(checkpoint.boundary_scope).toBe("RECOVERY_CHECKPOINT");
  expect(checkpoint.boundary_specific_binding_policy).toBe(
    "CHECKPOINT_RETAINS_INVENTORY_RESTORE_EVIDENCE_AND_REOPEN_GATES",
  );
  expect(deployment.boundary_scope).toBe("DEPLOYMENT_RELEASE");
  expect(deployment.boundary_specific_binding_policy).toBe(
    "RELEASE_RETAINS_ROLLBACK_BOUNDARY_AND_FAIL_FORWARD_GOVERNANCE",
  );
  await validateContractSchema("recovery_governance_contract", deployment);
});

test("fails closed when deployment release governance requests checkpoint or non-control-plane posture", () => {
  expect(() =>
    deriveDeploymentReleaseRecoveryGovernanceContract({
      boundary_scope: "RECOVERY_CHECKPOINT",
    }),
  ).toThrow(RecoveryGovernanceContractModelError);

  expect(() =>
    deriveDeploymentReleaseRecoveryGovernanceContract({
      protected_workload_class: "REBUILDABLE_PROJECTION",
    }),
  ).toThrow(/control-plane legal truth/);
});

test("fails closed when control-plane recovery governance serializes a weaker tier", async () => {
  const valid = deriveCheckpointRecoveryGovernanceContract({
    protected_workload_class: "CONTROL_PLANE_LEGAL_TRUTH",
  });

  expect(() =>
    deriveCheckpointRecoveryGovernanceContract({
      attempted_recovery_tier_class: "TIER_1_REBUILDABLE",
      protected_workload_class: "CONTROL_PLANE_LEGAL_TRUTH",
    }),
  ).toThrow(RecoveryGovernanceContractModelError);

  expect(() =>
    normalizeRecoveryGovernanceContract({
      ...valid,
      recovery_tier_class: "TIER_1_REBUILDABLE",
    }),
  ).toThrow(/weaker or mismatched/);

  await expect(
    validateContractSchema("recovery_governance_contract", {
      ...valid,
      rpo_class: "RPO_4H",
    }),
  ).rejects.toThrow(/rpo_class/);
});
