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
import {
  buildGovernancePolicySnapshot,
  governancePolicySectionNavOrder,
  governancePolicySurfaceOrder,
} from "../index.ts";

type HazardFixtureInput = {
  accessBindingHash?: string | undefined;
  dependencyTopologyHash?: string | undefined;
  impactRadiusUpperScore?: number | undefined;
  policySnapshotHash: string;
  predictabilityScore?: number | undefined;
  privilegeGainScore?: number | undefined;
  simulationBasisHash?: string | undefined;
  simulationConfidenceScore?: number | undefined;
};

function hazardFixture(input: HazardFixtureInput) {
  const mutation_hazard = normalizeGovernanceMutationHazardContract({
    access_binding_hash: input.accessBindingHash ?? "access-binding.pc0190",
    dependency_topology_hash: input.dependencyTopologyHash ?? "topology.pc0190",
    impact_radius_lower_score: 0,
    impact_radius_upper_score: input.impactRadiusUpperScore ?? 0,
    impacted_authority_operation_count: input.impactRadiusUpperScore ? 1 : 0,
    impacted_client_count: input.impactRadiusUpperScore ? 1 : 0,
    impacted_limitation_count: 0,
    impacted_principal_count: input.impactRadiusUpperScore ? 3 : 0,
    impacted_workflow_count: input.impactRadiusUpperScore ? 2 : 0,
    masking_relaxation_score: 0,
    policy_snapshot_hash: input.policySnapshotHash,
    predictability_score: input.predictabilityScore ?? 90,
    privilege_gain_score: input.privilegeGainScore ?? 0,
    scope_expansion_score: 0,
    simulation_basis_hash: input.simulationBasisHash ?? "simulation.pc0190",
    simulation_confidence_score: input.simulationConfidenceScore ?? 94,
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

function stagedGroup(input: {
  basis: GovernanceMutationBasisContract;
  changeRef: string;
  fieldRef: string;
  hazard: GovernanceMutationHazardContract;
  objectType: string;
}): GovernancePolicySnapshotStagedChangeGroup {
  return {
    mutation_basis_contract: input.basis,
    mutation_hazard: input.hazard,
    object_type: input.objectType,
    staged_changes: [
      {
        approval_required: input.hazard.approval_requirement !== "NOT_REQUIRED",
        audit_event_families: ["TENANT_POLICY_CHANGED"],
        change_ref: input.changeRef,
        current_value_label: "Current tenant policy value",
        effective_scope_label: "Tenant",
        field_ref: input.fieldRef,
        input_commit_mode: "EXPLICIT_STAGE",
        proposed_value_label: "Proposed tenant policy value",
        reason_required: input.hazard.approval_requirement !== "NOT_REQUIRED",
      },
    ],
  };
}

test("builds a schema-valid policy snapshot with fixed workspace order and no route-local chips", async () => {
  const snapshot = await buildGovernancePolicySnapshot({
    activeSectionCode: "SECURITY_POSTURE",
    capturedAt: "2026-05-04T10:00:00.000Z",
    tenantId: "tenant.taxat-sandbox",
  });

  expect(snapshot.object_anchor_ref).toBe(
    "/v1/governance/tenants/tenant.taxat-sandbox/policy-snapshot",
  );
  expect(snapshot.tenant_config_workspace.section_nav_order).toEqual([
    ...governancePolicySectionNavOrder,
  ]);
  expect(snapshot.tenant_config_workspace.surface_order).toEqual([
    ...governancePolicySurfaceOrder,
  ]);
  expect(snapshot.tenant_config_workspace.active_section_code).toBe("SECURITY_POSTURE");
  expect(snapshot.tenant_config_workspace.inline_policy_help.help_mode).toBe("INLINE");
  expect(snapshot.interaction_layer.selected_filter_chip_refs).toEqual([]);
  expect(snapshot.interaction_layer.preserved_context_codes).toEqual([
    "ACTIVE_SECTION",
    "PROMOTED_SUPPORT_SURFACE",
    "STAGED_DIFF",
    "CHANGE_BASKET",
  ]);
  expect(snapshot.change_basket).toMatchObject({
    active_mutation_basis_contract_or_null: null,
    active_mutation_hazard_or_null: null,
    basket_state: "EMPTY",
    simulation_atomicity: "EMPTY",
    submission_enabled: false,
  });
  expect(snapshot.approval_composer.composer_state).toBe("NOT_REQUIRED");
  expect(snapshot.blast_radius_panel.panel_state).toBe("EMPTY");

  await validateContractSchema("governance_policy_snapshot", snapshot);
});

test("enables direct submission only for one bounded-safe atomic basket and matching blast panel", async () => {
  const baseline = await buildGovernancePolicySnapshot({
    capturedAt: "2026-05-04T10:05:00.000Z",
  });
  const { mutation_basis_contract, mutation_hazard } = hazardFixture({
    policySnapshotHash: baseline.policy_snapshot_hash,
  });
  const group = stagedGroup({
    basis: mutation_basis_contract,
    changeRef: "change.pc0190.bounded-safe",
    fieldRef: "security-posture.step-up-rotation",
    hazard: mutation_hazard,
    objectType: "SECURITY_POSTURE",
  });

  const snapshot = await buildGovernancePolicySnapshot({
    activeSectionCode: "SECURITY_POSTURE",
    capturedAt: "2026-05-04T10:06:00.000Z",
    directSubmissionRequested: true,
    readyToSubmit: true,
    stagedChangeGroups: [group],
  });

  expect(snapshot.change_basket.simulation_atomicity).toBe("ATOMIC");
  expect(snapshot.change_basket.submission_enabled).toBe(true);
  expect(snapshot.change_basket.active_mutation_hazard_or_null?.hazard_contract_hash).toBe(
    mutation_hazard.hazard_contract_hash,
  );
  expect(snapshot.change_basket.active_mutation_basis_contract_or_null?.basis_contract_hash).toBe(
    mutation_basis_contract.basis_contract_hash,
  );
  expect(snapshot.blast_radius_panel).toMatchObject({
    panel_state: "ACTIVE",
  });
  expect(snapshot.blast_radius_panel.mutation_hazard_or_null?.hazard_contract_hash).toBe(
    mutation_hazard.hazard_contract_hash,
  );
  expect(snapshot.approval_composer.composer_state).toBe("NOT_REQUIRED");

  await validateContractSchema("governance_policy_snapshot", snapshot);
});

test("blocks mixed and stale baskets while preserving visible review and history anchors", async () => {
  const baseline = await buildGovernancePolicySnapshot({
    capturedAt: "2026-05-04T10:10:00.000Z",
  });
  const first = hazardFixture({
    policySnapshotHash: baseline.policy_snapshot_hash,
    simulationBasisHash: "simulation.pc0190.first",
  });
  const second = hazardFixture({
    dependencyTopologyHash: "topology.pc0190.second",
    impactRadiusUpperScore: 35,
    policySnapshotHash: baseline.policy_snapshot_hash,
    privilegeGainScore: 20,
    simulationBasisHash: "simulation.pc0190.second",
  });
  const groups = [
    stagedGroup({
      basis: first.mutation_basis_contract,
      changeRef: "change.pc0190.first",
      fieldRef: "tenant-profile.default-role",
      hazard: first.mutation_hazard,
      objectType: "TENANT_PROFILE",
    }),
    stagedGroup({
      basis: second.mutation_basis_contract,
      changeRef: "change.pc0190.second",
      fieldRef: "connector-policy.scope",
      hazard: second.mutation_hazard,
      objectType: "CONNECTOR_POLICY",
    }),
  ];

  const mixed = await buildGovernancePolicySnapshot({
    capturedAt: "2026-05-04T10:11:00.000Z",
    directSubmissionRequested: true,
    stagedChangeGroups: groups,
  });
  expect(mixed.change_basket).toMatchObject({
    active_mutation_basis_contract_or_null: null,
    active_mutation_hazard_or_null: null,
    simulation_atomicity: "MIXED_BASIS_BLOCKED",
    submission_enabled: false,
  });
  expect(mixed.blast_radius_panel.panel_state).toBe("ACTIVE");
  await validateContractSchema("governance_policy_snapshot", mixed);

  const stale = await buildGovernancePolicySnapshot({
    capturedAt: "2026-05-04T10:12:00.000Z",
    reviewedPolicySnapshotHash: "policy.snapshot.pc0190.previous",
    selectedHistoryChangeRef: "policy-change.pc0190.previous",
    stagedChangeGroups: [groups[0]!],
    visibleHistoryChangeRefs: [
      baseline.last_material_change_ref,
      "policy-change.pc0190.previous",
    ],
  });
  expect(stale.change_basket.simulation_atomicity).toBe("STALE_BASIS_BLOCKED");
  expect(stale.change_basket.submission_enabled).toBe(false);
  expect(stale.blast_radius_panel.panel_state).toBe("STALE");
  expect(stale.config_history_timeline).toMatchObject({
    selected_change_ref: "policy-change.pc0190.previous",
    timeline_state: "REBASE_REQUIRED",
  });
  expect(stale.config_history_timeline.visible_change_refs).toContain(
    "policy-change.pc0190.previous",
  );
  await validateContractSchema("governance_policy_snapshot", stale);
});
