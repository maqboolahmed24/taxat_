import { expect, test } from "@playwright/test";

import {
  deriveGovernanceMutationBasisContractHash,
  deriveGovernanceMutationHazardContractHash,
} from "../../../backend-access/src/index.ts";
import { validateContractSchema } from "../../../../tests/unit/backend_northbound/audit_and_enquiry_fixtures.ts";
import {
  buildGovernanceMutationBasisContract,
  buildGovernanceMutationBasisContractForHazard,
  buildGovernanceMutationHazard,
  deriveGovernanceSimulatorPosture,
} from "../index.ts";

test("builds canonical hazard and basis hashes from one reviewed access binding", async () => {
  const hazard = buildGovernanceMutationHazard({
    access_binding_hash: "access-binding.pc0191.hash",
    dependency_topology_hash: "topology.pc0191.hash",
    impact_radius_lower_score: 7,
    impact_radius_upper_score: 30,
    impacted_authority_operation_count: 6,
    impacted_client_count: 21,
    impacted_limitation_count: 1,
    impacted_principal_count: 101,
    impacted_workflow_count: 2,
    masking_relaxation_score: 10,
    policy_snapshot_hash: "policy.pc0191.hash",
    predictability_score: 90,
    privilege_gain_score: 20,
    scope_expansion_score: 0,
    simulation_basis_hash: "simulation.pc0191.hash",
    simulation_confidence_score: 95,
  });
  const basis = buildGovernanceMutationBasisContractForHazard({
    mutation_hazard: hazard,
  });

  expect(deriveGovernanceMutationHazardContractHash(hazard)).toBe(
    hazard.hazard_contract_hash,
  );
  expect(deriveGovernanceMutationBasisContractHash(basis)).toBe(
    basis.basis_contract_hash,
  );
  expect(basis.access_binding_hash).toBe(hazard.access_binding_hash);
  expect(basis.hazard_contract_hash).toBe(hazard.hazard_contract_hash);
  expect(hazard.impacted_principal_count_class).toBe("ESTATE_WIDE");
  expect(hazard.impacted_client_count_class).toBe("LARGE_BATCH");
  expect(hazard.impacted_authority_operation_count_class).toBe("MEDIUM_BATCH");
  expect(hazard.impacted_workflow_count_class).toBe("SMALL_BATCH");
  expect(hazard.impacted_limitation_count_class).toBe("ONE");
  expect(hazard.risk_driver_codes).toEqual([
    "PRIVILEGE_GAIN",
    "MASKING_RELAXATION",
    "BROAD_BLAST_RADIUS",
  ]);
  expect(hazard.approval_trigger_codes).toHaveLength(1);
  expect(deriveGovernanceSimulatorPosture({ mutation_hazard: hazard })).toBe(
    "APPROVAL_GATED",
  );

  await validateContractSchema("governance_mutation_hazard_contract", hazard);
  await validateContractSchema("governance_mutation_basis_contract", basis);
});

test("derives bounded-safe, approval-gated, and advisory-only simulator postures lawfully", async () => {
  const boundedSafeHazard = buildGovernanceMutationHazard({
    access_binding_hash: "access-binding.pc0191.bounded",
    dependency_topology_hash: "topology.pc0191.bounded",
    impact_radius_lower_score: 0,
    impact_radius_upper_score: 0,
    impacted_authority_operation_count: 0,
    impacted_client_count: 0,
    impacted_limitation_count: 0,
    impacted_principal_count: 0,
    impacted_workflow_count: 0,
    masking_relaxation_score: 0,
    policy_snapshot_hash: "policy.pc0191.bounded",
    predictability_score: 90,
    privilege_gain_score: 0,
    scope_expansion_score: 0,
    simulation_basis_hash: "simulation.pc0191.bounded",
    simulation_confidence_score: 95,
  });
  const approvalGatedHazard = buildGovernanceMutationHazard({
    access_binding_hash: "access-binding.pc0191.approval",
    dependency_topology_hash: "topology.pc0191.approval",
    impact_radius_lower_score: 4,
    impact_radius_upper_score: 8,
    impacted_authority_operation_count: 0,
    impacted_client_count: 1,
    impacted_limitation_count: 0,
    impacted_principal_count: 2,
    impacted_workflow_count: 1,
    masking_relaxation_score: 0,
    policy_snapshot_hash: "policy.pc0191.approval",
    predictability_score: 88,
    privilege_gain_score: 0,
    scope_expansion_score: 0,
    simulation_basis_hash: "simulation.pc0191.approval",
    simulation_confidence_score: 92,
  });
  const advisoryHazard = buildGovernanceMutationHazard({
    access_binding_hash: "access-binding.pc0191.advisory",
    dependency_topology_hash: "topology.pc0191.advisory",
    impact_radius_lower_score: 0,
    impact_radius_upper_score: 4,
    impacted_authority_operation_count: 0,
    impacted_client_count: 0,
    impacted_limitation_count: 0,
    impacted_principal_count: 1,
    impacted_workflow_count: 0,
    masking_relaxation_score: 0,
    policy_snapshot_hash: "policy.pc0191.advisory",
    predictability_score: 70,
    privilege_gain_score: 0,
    scope_expansion_score: 0,
    simulation_basis_hash: "simulation.pc0191.advisory",
    simulation_confidence_score: 95,
  });

  expect(boundedSafeHazard.bounded_safe_mutation).toBe(1);
  expect(boundedSafeHazard.approval_requirement).toBe("NOT_REQUIRED");
  expect(boundedSafeHazard.required_approvals).toEqual([]);
  expect(boundedSafeHazard.bounded_safety_blocker_codes).toEqual([]);
  expect(deriveGovernanceSimulatorPosture({ mutation_hazard: boundedSafeHazard })).toBe(
    "BOUNDED_SAFE",
  );
  expect(approvalGatedHazard.bounded_safe_mutation).toBe(0);
  expect(approvalGatedHazard.approval_requirement).not.toBe("NOT_REQUIRED");
  expect(deriveGovernanceSimulatorPosture({ mutation_hazard: approvalGatedHazard })).toBe(
    "APPROVAL_GATED",
  );
  expect(advisoryHazard.commit_authority_posture).toBe("PREVIEW_ONLY");
  expect(advisoryHazard.confidence_limiter_codes).toContain("LOW_PREDICTABILITY");
  expect(deriveGovernanceSimulatorPosture({ mutation_hazard: advisoryHazard })).toBe(
    "ADVISORY_ONLY",
  );
  expect(deriveGovernanceSimulatorPosture({ mutation_hazard: null })).toBe(
    "READ_ONLY_DECISION",
  );

  await validateContractSchema(
    "governance_mutation_hazard_contract",
    boundedSafeHazard,
  );
  await validateContractSchema(
    "governance_mutation_hazard_contract",
    approvalGatedHazard,
  );
  await validateContractSchema(
    "governance_mutation_hazard_contract",
    advisoryHazard,
  );
});

test("rejects drifted basis inputs instead of allowing approval posture recomputation", () => {
  const hazard = buildGovernanceMutationHazard({
    access_binding_hash: "access-binding.pc0191.drift",
    dependency_topology_hash: "topology.pc0191.drift",
    impact_radius_lower_score: 10,
    impact_radius_upper_score: 20,
    impacted_authority_operation_count: 0,
    impacted_client_count: 2,
    impacted_limitation_count: 0,
    impacted_principal_count: 3,
    impacted_workflow_count: 1,
    masking_relaxation_score: 0,
    policy_snapshot_hash: "policy.pc0191.drift",
    predictability_score: 90,
    privilege_gain_score: 15,
    scope_expansion_score: 0,
    simulation_basis_hash: "simulation.pc0191.drift",
    simulation_confidence_score: 92,
  });

  expect(() =>
    buildGovernanceMutationBasisContract({
      access_binding_hash: hazard.access_binding_hash,
      approval_requirement: "NOT_REQUIRED",
      bounded_safe_mutation: hazard.bounded_safe_mutation,
      commit_authority_posture: hazard.commit_authority_posture,
      dependency_topology_hash: hazard.dependency_topology_hash,
      hazard_contract_hash: hazard.hazard_contract_hash,
      policy_snapshot_hash: hazard.policy_snapshot_hash,
      predictability_score: hazard.predictability_score,
      required_approvals: [],
      simulation_basis_hash: hazard.simulation_basis_hash,
      simulation_confidence_score: hazard.simulation_confidence_score,
    }),
  ).toThrow(/bounded_safe_mutation = 0 requires an explicit approval requirement/);
});
