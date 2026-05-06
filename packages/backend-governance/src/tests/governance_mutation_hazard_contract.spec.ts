import { expect, test } from "@playwright/test";

import { validateContractSchema } from "../../../../tests/unit/backend_northbound/audit_and_enquiry_fixtures.ts";
import {
  buildGovernanceMutationBasisContractForHazard,
  buildGovernanceMutationHazardContract,
  deriveApprovalNecessityScore,
  deriveCommitAuthorityPosture,
  deriveGovernanceCountClass,
  deriveGovernanceCountClasses,
  deriveGovernanceMutationHazardContractHash,
  derivePolicyRiskScore,
} from "../index.ts";

test("derives TV-65 hazard formula outputs and canonical reason codes", async () => {
  const policyRiskScore = derivePolicyRiskScore({
    impact_radius_upper_score: 62,
    masking_relaxation_score: 35,
    privilege_gain_score: 75,
    scope_expansion_score: 55,
  });
  const approvalNecessityScore = deriveApprovalNecessityScore({
    impact_radius_upper_score: 62,
    policy_risk_score: policyRiskScore,
  });

  expect(policyRiskScore).toBe(63);
  expect(approvalNecessityScore).toBe(63);

  const hazard = buildGovernanceMutationHazardContract({
    access_binding_hash: "binding-hash-tenant-security-1",
    dependency_topology_hash: "topology-tenant-security-1",
    impact_radius_lower_score: 38,
    impact_radius_upper_score: 62,
    impacted_authority_operation_count: 3,
    impacted_client_count: 6,
    impacted_limitation_count: 4,
    impacted_principal_count: 18,
    impacted_workflow_count: 14,
    masking_relaxation_score: 35,
    policy_snapshot_hash: "policy-hash-tenant-security-1",
    predictability_score: 89,
    privilege_gain_score: 75,
    scope_expansion_score: 55,
    simulation_basis_hash: "sim-basis-tenant-security-1",
    simulation_confidence_score: 93,
  });
  const basis = buildGovernanceMutationBasisContractForHazard({
    mutation_hazard: hazard,
  });

  expect(hazard.policy_risk_score).toBe(policyRiskScore);
  expect(hazard.approval_necessity_score).toBe(approvalNecessityScore);
  expect(hazard.hazard_contract_hash).toBe(
    deriveGovernanceMutationHazardContractHash(hazard),
  );
  expect(hazard.approval_requirement).toBe("SECURITY_REVIEW");
  expect(hazard.commit_authority_posture).toBe("APPROVAL_GATED");
  expect(hazard.risk_driver_codes).toEqual([
    "PRIVILEGE_GAIN",
    "SCOPE_EXPANSION",
    "MASKING_RELAXATION",
    "BROAD_BLAST_RADIUS",
  ]);
  expect(hazard.approval_trigger_codes).toEqual([
    "SECURITY_REVIEW_REQUIRED",
  ]);
  expect(hazard.confidence_limiter_codes).toEqual([]);
  expect(hazard.bounded_safety_blocker_codes).toEqual([
    "PRIVILEGE_GAIN_PRESENT",
    "SCOPE_EXPANSION_PRESENT",
    "MASKING_RELAXATION_PRESENT",
    "IMPACT_RADIUS_TOO_LARGE",
    "POLICY_RISK_TOO_HIGH",
  ]);
  expect(hazard.reason_codes).toEqual([
    "BROAD_BLAST_RADIUS",
    "IMPACT_RADIUS_TOO_LARGE",
    "MASKING_RELAXATION",
    "MASKING_RELAXATION_PRESENT",
    "POLICY_RISK_TOO_HIGH",
    "PRIVILEGE_GAIN",
    "PRIVILEGE_GAIN_PRESENT",
    "SCOPE_EXPANSION",
    "SCOPE_EXPANSION_PRESENT",
    "SECURITY_REVIEW_REQUIRED",
    "UNCERTAIN_BLAST_RADIUS",
  ]);
  expect(basis.hazard_contract_hash).toBe(hazard.hazard_contract_hash);

  await validateContractSchema("governance_mutation_hazard_contract", hazard);
  await validateContractSchema("governance_mutation_basis_contract", basis);
});

test("applies count buckets, bounded-safe gates, and preview-only confidence rails", async () => {
  expect([0, 1, 5, 6, 21, 101].map(deriveGovernanceCountClass)).toEqual([
    "ZERO",
    "ONE",
    "SMALL_BATCH",
    "MEDIUM_BATCH",
    "LARGE_BATCH",
    "ESTATE_WIDE",
  ]);
  expect(
    deriveGovernanceCountClasses({
      impacted_authority_operation_count: 6,
      impacted_client_count: 21,
      impacted_limitation_count: 1,
      impacted_principal_count: 101,
      impacted_workflow_count: 0,
    }),
  ).toMatchObject({
    count_class_profile_code: "GOVERNANCE_IMPACT_COUNT_CLASS_V1",
    impacted_authority_operation_count_class: "MEDIUM_BATCH",
    impacted_client_count_class: "LARGE_BATCH",
    impacted_limitation_count_class: "ONE",
    impacted_principal_count_class: "ESTATE_WIDE",
    impacted_workflow_count_class: "ZERO",
  });

  const boundedSafe = buildGovernanceMutationHazardContract({
    access_binding_hash: "access-binding.pc0196.bounded",
    dependency_topology_hash: "topology.pc0196.bounded",
    impact_radius_lower_score: 0,
    impact_radius_upper_score: 4,
    impacted_authority_operation_count: 0,
    impacted_client_count: 0,
    impacted_limitation_count: 0,
    impacted_principal_count: 0,
    impacted_workflow_count: 0,
    masking_relaxation_score: 0,
    policy_snapshot_hash: "policy.pc0196.bounded",
    predictability_score: 85,
    privilege_gain_score: 0,
    scope_expansion_score: 0,
    simulation_basis_hash: "simulation.pc0196.bounded",
    simulation_confidence_score: 90,
  });
  const previewOnly = buildGovernanceMutationHazardContract({
    access_binding_hash: "access-binding.pc0196.preview",
    dependency_topology_hash: "topology.pc0196.preview",
    impact_radius_lower_score: 0,
    impact_radius_upper_score: 4,
    impacted_authority_operation_count: 0,
    impacted_client_count: 0,
    impacted_limitation_count: 0,
    impacted_principal_count: 1,
    impacted_workflow_count: 0,
    masking_relaxation_score: 0,
    policy_snapshot_hash: "policy.pc0196.preview",
    predictability_score: 74,
    privilege_gain_score: 0,
    scope_expansion_score: 0,
    simulation_basis_hash: "simulation.pc0196.preview",
    simulation_confidence_score: 79,
  });

  expect(boundedSafe.bounded_safe_mutation).toBe(1);
  expect(boundedSafe.approval_requirement).toBe("NOT_REQUIRED");
  expect(boundedSafe.commit_authority_posture).toBe("BOUNDED_SAFE");
  expect(boundedSafe.required_approvals).toEqual([]);
  expect(boundedSafe.bounded_safety_blocker_codes).toEqual([]);
  expect(previewOnly.bounded_safe_mutation).toBe(0);
  expect(previewOnly.commit_authority_posture).toBe("PREVIEW_ONLY");
  expect(previewOnly.approval_requirement).toBe("SINGLE_APPROVER");
  expect(previewOnly.confidence_limiter_codes).toEqual([
    "LOW_SIMULATION_CONFIDENCE",
    "LOW_PREDICTABILITY",
  ]);
  expect(previewOnly.bounded_safety_blocker_codes).toEqual([
    "CONFIDENCE_TOO_LOW",
    "PREDICTABILITY_TOO_LOW",
  ]);
  expect(
    deriveCommitAuthorityPosture({
      approval_necessity_score: previewOnly.approval_necessity_score,
      impact_radius_lower_score: previewOnly.impact_radius_lower_score,
      impact_radius_upper_score: previewOnly.impact_radius_upper_score,
      masking_relaxation_score: previewOnly.masking_relaxation_score,
      policy_risk_score: previewOnly.policy_risk_score,
      predictability_score: previewOnly.predictability_score,
      privilege_gain_score: previewOnly.privilege_gain_score,
      scope_expansion_score: previewOnly.scope_expansion_score,
      simulation_confidence_score: previewOnly.simulation_confidence_score,
    }).confidence_limiter_codes,
  ).toEqual(previewOnly.confidence_limiter_codes);

  await validateContractSchema(
    "governance_mutation_hazard_contract",
    boundedSafe,
  );
  await validateContractSchema(
    "governance_mutation_hazard_contract",
    previewOnly,
  );
});

test("rejects caller-authored scores and reason families that drift from frozen inputs", () => {
  expect(() =>
    buildGovernanceMutationHazardContract({
      access_binding_hash: "access-binding.pc0196.bad-risk",
      dependency_topology_hash: "topology.pc0196.bad-risk",
      impact_radius_lower_score: 0,
      impact_radius_upper_score: 24,
      impacted_authority_operation_count: 0,
      impacted_client_count: 0,
      impacted_limitation_count: 0,
      impacted_principal_count: 1,
      impacted_workflow_count: 0,
      masking_relaxation_score: 0,
      policy_risk_score: 99,
      policy_snapshot_hash: "policy.pc0196.bad-risk",
      predictability_score: 90,
      privilege_gain_score: 0,
      risk_driver_codes: ["BROAD_BLAST_RADIUS"],
      scope_expansion_score: 10,
      simulation_basis_hash: "simulation.pc0196.bad-risk",
      simulation_confidence_score: 95,
    }),
  ).toThrow(/policy_risk_score/);

  const scoped = buildGovernanceMutationHazardContract({
    access_binding_hash: "access-binding.pc0196.scoped",
    dependency_topology_hash: "topology.pc0196.scoped",
    impact_radius_lower_score: 0,
    impact_radius_upper_score: 24,
    impacted_authority_operation_count: 0,
    impacted_client_count: 0,
    impacted_limitation_count: 0,
    impacted_principal_count: 1,
    impacted_workflow_count: 0,
    masking_relaxation_score: 0,
    policy_snapshot_hash: "policy.pc0196.scoped",
    predictability_score: 90,
    privilege_gain_score: 0,
    scope_expansion_score: 10,
    simulation_basis_hash: "simulation.pc0196.scoped",
    simulation_confidence_score: 95,
  });

  expect(scoped.risk_driver_codes).toEqual(["SCOPE_EXPANSION"]);
  expect(scoped.risk_driver_codes).not.toContain("BROAD_BLAST_RADIUS");
});
