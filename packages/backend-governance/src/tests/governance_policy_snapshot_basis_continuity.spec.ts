import { expect, test } from "@playwright/test";

import {
  normalizeGovernanceMutationBasisContract,
  normalizeGovernanceMutationHazardContract,
} from "../../../backend-access/src/index.ts";
import type {
  GovernanceMutationBasisContract,
  GovernanceMutationHazardContract,
  GovernancePolicySnapshotStagedChangeGroup,
} from "../../../generated-models/src/generated/typescript/governance-and-policy.ts";
import { validateContractSchema } from "../../../../tests/unit/backend_northbound/audit_and_enquiry_fixtures.ts";
import { buildGovernancePolicySnapshot } from "../index.ts";

function reviewedMutation(input: {
  dependencyTopologyHash?: string | undefined;
  impactRadiusUpperScore: number;
  policySnapshotHash: string;
  predictabilityScore?: number | undefined;
  privilegeGainScore: number;
  simulationBasisHash: string;
  simulationConfidenceScore?: number | undefined;
}) {
  const mutation_hazard = normalizeGovernanceMutationHazardContract({
    access_binding_hash: "access-binding.pc0190.continuity",
    dependency_topology_hash: input.dependencyTopologyHash ?? "topology.pc0190.continuity",
    impact_radius_lower_score: 4,
    impact_radius_upper_score: input.impactRadiusUpperScore,
    impacted_authority_operation_count: 1,
    impacted_client_count: 1,
    impacted_limitation_count: 0,
    impacted_principal_count: 4,
    impacted_workflow_count: 2,
    masking_relaxation_score: 0,
    policy_snapshot_hash: input.policySnapshotHash,
    predictability_score: input.predictabilityScore ?? 88,
    privilege_gain_score: input.privilegeGainScore,
    scope_expansion_score: 8,
    simulation_basis_hash: input.simulationBasisHash,
    simulation_confidence_score: input.simulationConfidenceScore ?? 92,
  });
  const mutation_basis_contract = normalizeGovernanceMutationBasisContract({
    access_binding_hash: mutation_hazard.access_binding_hash,
    approval_requirement: mutation_hazard.approval_requirement,
    bounded_safe_mutation: mutation_hazard.bounded_safe_mutation,
    commit_authority_posture: mutation_hazard.commit_authority_posture,
    dependency_topology_hash: mutation_hazard.dependency_topology_hash,
    hazard_contract_hash: mutation_hazard.hazard_contract_hash,
    policy_snapshot_hash: mutation_hazard.policy_snapshot_hash,
    predictability_score: mutation_hazard.predictability_score,
    required_approvals: mutation_hazard.required_approvals,
    simulation_basis_hash: mutation_hazard.simulation_basis_hash,
    simulation_confidence_score: mutation_hazard.simulation_confidence_score,
  });
  return { mutation_basis_contract, mutation_hazard };
}

function group(input: {
  basis: GovernanceMutationBasisContract;
  changeRef: string;
  hazard: GovernanceMutationHazardContract;
}): GovernancePolicySnapshotStagedChangeGroup {
  return {
    mutation_basis_contract: input.basis,
    mutation_hazard: input.hazard,
    object_type: "APPROVAL_POLICY",
    staged_changes: [
      {
        approval_required: input.hazard.approval_requirement !== "NOT_REQUIRED",
        audit_event_families: ["APPROVAL_POLICY_CHANGED"],
        change_ref: input.changeRef,
        current_value_label: "Single approver",
        effective_scope_label: "Tenant-wide approval policy",
        field_ref: "approval-and-change-control.quorum",
        input_commit_mode: "EXPLICIT_STAGE",
        proposed_value_label: "Security review",
        reason_required: true,
      },
    ],
  };
}

test("reuses one reviewed mutation basis across basket, approval composer, and blast panel", async () => {
  const baseline = await buildGovernancePolicySnapshot({
    capturedAt: "2026-05-04T10:20:00.000Z",
  });
  const reviewed = reviewedMutation({
    impactRadiusUpperScore: 42,
    policySnapshotHash: baseline.policy_snapshot_hash,
    privilegeGainScore: 18,
    simulationBasisHash: "simulation.pc0190.approval",
  });

  const snapshot = await buildGovernancePolicySnapshot({
    activeSectionCode: "APPROVAL_AND_CHANGE_CONTROL",
    capturedAt: "2026-05-04T10:21:00.000Z",
    rationaleRef: "rationale.pc0190.security-review",
    relatedObjectRefs: ["change.pc0190.approval"],
    requestedApproverScope: reviewed.mutation_hazard.required_approvals,
    stagedChangeGroups: [
      group({
        basis: reviewed.mutation_basis_contract,
        changeRef: "change.pc0190.approval",
        hazard: reviewed.mutation_hazard,
      }),
    ],
  });

  expect(snapshot.change_basket.simulation_atomicity).toBe("ATOMIC");
  expect(snapshot.change_basket.submission_enabled).toBe(false);
  expect(snapshot.change_basket.active_mutation_hazard_or_null?.hazard_contract_hash).toBe(
    reviewed.mutation_hazard.hazard_contract_hash,
  );
  expect(snapshot.change_basket.active_mutation_basis_contract_or_null?.basis_contract_hash).toBe(
    reviewed.mutation_basis_contract.basis_contract_hash,
  );
  expect(snapshot.approval_composer.composer_state).toBe("READY");
  expect(snapshot.approval_composer.mutation_basis_contract_or_null?.basis_contract_hash).toBe(
    reviewed.mutation_basis_contract.basis_contract_hash,
  );
  expect(snapshot.blast_radius_panel.mutation_hazard_or_null?.hazard_contract_hash).toBe(
    reviewed.mutation_hazard.hazard_contract_hash,
  );
  expect(snapshot.blast_radius_panel.mutation_basis_contract_or_null?.basis_contract_hash).toBe(
    reviewed.mutation_basis_contract.basis_contract_hash,
  );

  await validateContractSchema("governance_policy_snapshot", snapshot);
});

test("keeps preview-only reviewed hazards advisory and blocks approval readiness", async () => {
  const baseline = await buildGovernancePolicySnapshot({
    capturedAt: "2026-05-04T10:25:00.000Z",
  });
  const previewOnly = reviewedMutation({
    impactRadiusUpperScore: 8,
    policySnapshotHash: baseline.policy_snapshot_hash,
    privilegeGainScore: 0,
    simulationBasisHash: "simulation.pc0190.preview-only",
    simulationConfidenceScore: 70,
  });

  const snapshot = await buildGovernancePolicySnapshot({
    capturedAt: "2026-05-04T10:26:00.000Z",
    directSubmissionRequested: true,
    rationaleRef: "rationale.pc0190.preview-only",
    relatedObjectRefs: ["change.pc0190.preview-only"],
    requestedApproverScope: previewOnly.mutation_hazard.required_approvals,
    stagedChangeGroups: [
      group({
        basis: previewOnly.mutation_basis_contract,
        changeRef: "change.pc0190.preview-only",
        hazard: previewOnly.mutation_hazard,
      }),
    ],
  });

  expect(previewOnly.mutation_hazard.commit_authority_posture).toBe("PREVIEW_ONLY");
  expect(snapshot.change_basket.simulation_atomicity).toBe("ATOMIC");
  expect(snapshot.change_basket.submission_enabled).toBe(false);
  expect(snapshot.approval_composer.composer_state).toBe("DRAFT");
  expect(snapshot.approval_composer.mutation_basis_contract_or_null?.commit_authority_posture).toBe(
    "PREVIEW_ONLY",
  );
  expect(snapshot.blast_radius_panel.mutation_hazard_or_null?.confidence_limiter_codes).toContain(
    "LOW_SIMULATION_CONFIDENCE",
  );

  await validateContractSchema("governance_policy_snapshot", snapshot);
});
