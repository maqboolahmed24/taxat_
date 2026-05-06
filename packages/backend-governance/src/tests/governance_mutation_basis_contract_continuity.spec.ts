import { expect, test } from "@playwright/test";

import type {
  GovernanceMutationBasisContract,
  GovernanceMutationHazardContract,
  GovernancePolicySnapshotStagedChangeGroup,
} from "../../../generated-models/src/generated/typescript/governance-and-policy.ts";
import { validateContractSchema } from "../../../../tests/unit/backend_northbound/audit_and_enquiry_fixtures.ts";
import {
  buildGovernanceChangeBasket,
  buildGovernanceMutationBasisContractForHazard,
  buildGovernanceMutationHazardContract,
  deriveGovernanceMutationBasisContractHash,
  governanceStagedGroupsShareAtomicMutationBasis,
} from "../index.ts";

function reviewedMutation(input: {
  dependencyTopologyHash?: string | undefined;
  policySnapshotHash?: string | undefined;
  simulationBasisHash?: string | undefined;
}) {
  const mutation_hazard = buildGovernanceMutationHazardContract({
    access_binding_hash: "access-binding.pc0196.continuity",
    dependency_topology_hash:
      input.dependencyTopologyHash ?? "topology.pc0196.continuity",
    impact_radius_lower_score: 38,
    impact_radius_upper_score: 62,
    impacted_authority_operation_count: 3,
    impacted_client_count: 6,
    impacted_limitation_count: 4,
    impacted_principal_count: 18,
    impacted_workflow_count: 14,
    masking_relaxation_score: 35,
    policy_snapshot_hash: input.policySnapshotHash ?? "policy.pc0196.continuity",
    predictability_score: 89,
    privilege_gain_score: 75,
    scope_expansion_score: 55,
    simulation_basis_hash:
      input.simulationBasisHash ?? "simulation.pc0196.continuity",
    simulation_confidence_score: 93,
  });
  const mutation_basis_contract = buildGovernanceMutationBasisContractForHazard({
    mutation_hazard,
  });
  return { mutation_basis_contract, mutation_hazard };
}

function stagedGroup(input: {
  basis: GovernanceMutationBasisContract;
  changeRef: string;
  hazard: GovernanceMutationHazardContract;
  objectType?: string | undefined;
}): GovernancePolicySnapshotStagedChangeGroup {
  return {
    mutation_basis_contract: input.basis,
    mutation_hazard: input.hazard,
    object_type: input.objectType ?? "APPROVAL_POLICY",
    staged_changes: [
      {
        approval_required: input.hazard.approval_requirement !== "NOT_REQUIRED",
        audit_event_families: ["APPROVAL_POLICY_CHANGED"],
        change_ref: input.changeRef,
        current_value_label: "Security review",
        effective_scope_label: "Tenant governance policy",
        field_ref: `${input.changeRef}.field`,
        input_commit_mode: "EXPLICIT_STAGE",
        proposed_value_label: "Change advisory quorum",
        reason_required: true,
      },
    ],
  };
}

function mutateReviewed(input: {
  basis: GovernanceMutationBasisContract;
  hazard: GovernanceMutationHazardContract;
  mutation: Partial<
    Pick<
      GovernanceMutationHazardContract,
      "approval_requirement" | "hazard_contract_hash" | "required_approvals"
    >
  > &
    Partial<
      Pick<
        GovernanceMutationBasisContract,
        "approval_requirement" | "basis_contract_hash" | "required_approvals"
      >
    >;
}) {
  const hazard = {
    ...input.hazard,
    approval_requirement:
      input.mutation.approval_requirement ?? input.hazard.approval_requirement,
    hazard_contract_hash:
      input.mutation.hazard_contract_hash ?? input.hazard.hazard_contract_hash,
    required_approvals:
      input.mutation.required_approvals ?? input.hazard.required_approvals,
  } satisfies GovernanceMutationHazardContract;
  const basis = {
    ...input.basis,
    approval_requirement:
      input.mutation.approval_requirement ??
      input.basis.approval_requirement,
    basis_contract_hash:
      input.mutation.basis_contract_hash ?? input.basis.basis_contract_hash,
    required_approvals:
      input.mutation.required_approvals ?? input.basis.required_approvals,
  } satisfies GovernanceMutationBasisContract;
  return { basis, hazard };
}

test("builds a basis contract that mirrors the reviewed hazard hash and posture", async () => {
  const reviewed = reviewedMutation({});
  const basis = reviewed.mutation_basis_contract;

  expect(basis.basis_contract_hash).toBe(
    deriveGovernanceMutationBasisContractHash(basis),
  );
  expect(basis.hazard_contract_hash).toBe(
    reviewed.mutation_hazard.hazard_contract_hash,
  );
  expect(basis.approval_requirement).toBe(
    reviewed.mutation_hazard.approval_requirement,
  );
  expect(basis.required_approvals).toEqual(
    reviewed.mutation_hazard.required_approvals,
  );
  expect(basis.commit_authority_posture).toBe(
    reviewed.mutation_hazard.commit_authority_posture,
  );

  await validateContractSchema(
    "governance_mutation_hazard_contract",
    reviewed.mutation_hazard,
  );
  await validateContractSchema("governance_mutation_basis_contract", basis);
});

test("keeps atomic basket reuse blocked when any reviewed hazard or basis family differs", () => {
  const base = reviewedMutation({});
  const baseGroup = stagedGroup({
    basis: base.mutation_basis_contract,
    changeRef: "change.pc0196.base",
    hazard: base.mutation_hazard,
  });
  const hashDrift = reviewedMutation({
    simulationBasisHash: "simulation.pc0196.hash-drift",
  });
  const basisHashDrift = mutateReviewed({
    basis: base.mutation_basis_contract,
    hazard: base.mutation_hazard,
    mutation: {
      basis_contract_hash: "basis.pc0196.drifted",
    },
  });
  const approvalRequirementDrift = mutateReviewed({
    basis: base.mutation_basis_contract,
    hazard: base.mutation_hazard,
    mutation: {
      approval_requirement: "CHANGE_ADVISORY_QUORUM",
    },
  });
  const requiredApprovalDrift = mutateReviewed({
    basis: base.mutation_basis_contract,
    hazard: base.mutation_hazard,
    mutation: {
      required_approvals: ["SECURITY_TEAM", "TENANT_ADMIN"],
    },
  });

  const cases = [
    stagedGroup({
      basis: hashDrift.mutation_basis_contract,
      changeRef: "change.pc0196.hash-drift",
      hazard: hashDrift.mutation_hazard,
      objectType: "CONNECTOR_POLICY",
    }),
    stagedGroup({
      basis: basisHashDrift.basis,
      changeRef: "change.pc0196.basis-hash-drift",
      hazard: basisHashDrift.hazard,
      objectType: "CONNECTOR_POLICY",
    }),
    stagedGroup({
      basis: approvalRequirementDrift.basis,
      changeRef: "change.pc0196.approval-drift",
      hazard: approvalRequirementDrift.hazard,
      objectType: "CONNECTOR_POLICY",
    }),
    stagedGroup({
      basis: requiredApprovalDrift.basis,
      changeRef: "change.pc0196.required-approval-drift",
      hazard: requiredApprovalDrift.hazard,
      objectType: "CONNECTOR_POLICY",
    }),
  ];

  for (const driftedGroup of cases) {
    expect(
      governanceStagedGroupsShareAtomicMutationBasis([
        baseGroup,
        driftedGroup,
      ]),
    ).toBe(false);

    const basket = buildGovernanceChangeBasket({
      directSubmissionRequested: true,
      stagedChangeGroups: [baseGroup, driftedGroup],
    });

    expect(basket.simulation_atomicity).toBe("MIXED_BASIS_BLOCKED");
    expect(basket.active_mutation_hazard_or_null).toBeNull();
    expect(basket.active_mutation_basis_contract_or_null).toBeNull();
    expect(basket.submission_enabled).toBe(false);
  }
});
