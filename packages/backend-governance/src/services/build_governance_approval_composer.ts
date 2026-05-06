import type {
  GovernanceMutationBasisContract,
  GovernancePolicySnapshotApprovalComposer,
  GovernancePolicySnapshotChangeBasket,
} from "../../../generated-models/src/generated/typescript/governance-and-policy.ts";

export type BuildGovernanceApprovalComposerInput = {
  approvalSubmitted?: boolean | undefined;
  changeBasket: GovernancePolicySnapshotChangeBasket;
  expiresAt?: string | null | undefined;
  rationaleRef?: string | null | undefined;
  rationaleRequired?: boolean | undefined;
  relatedObjectRefs?: readonly string[] | undefined;
  requestedApproverScope?: readonly string[] | undefined;
};

export class GovernanceApprovalComposerProjectionError extends Error {
  constructor(detail: string) {
    super(`GOVERNANCE_APPROVAL_COMPOSER_INVALID: ${detail}`);
    this.name = "GovernanceApprovalComposerProjectionError";
  }
}

function uniqueSorted(values: readonly string[]) {
  return [...new Set(values)].sort((left, right) => left.localeCompare(right));
}

function stagedRelatedRefs(basket: GovernancePolicySnapshotChangeBasket) {
  return uniqueSorted(
    basket.staged_change_groups.flatMap((group) =>
      group.staged_changes.map((change) => change.change_ref),
    ),
  );
}

function nullComposer(): GovernancePolicySnapshotApprovalComposer {
  return {
    composer_state: "NOT_REQUIRED",
    expires_at: null,
    mutation_basis_contract_or_null: null,
    rationale_ref: null,
    rationale_required: false,
    related_object_refs: [],
    requested_approver_scope: [],
  };
}

function requiresApproval(basket: GovernancePolicySnapshotChangeBasket) {
  return (
    basket.simulation_atomicity === "ATOMIC" &&
    basket.approval_requirement !== null &&
    basket.approval_requirement !== "NOT_REQUIRED"
  );
}

function canBeReady(input: {
  basis: GovernanceMutationBasisContract;
  rationaleRef: string | null;
  rationaleRequired: boolean;
  relatedObjectRefs: readonly string[];
  requestedApproverScope: readonly string[];
}) {
  if (input.basis.commit_authority_posture === "PREVIEW_ONLY") {
    return false;
  }
  if (input.requestedApproverScope.length === 0 || input.relatedObjectRefs.length === 0) {
    return false;
  }
  return !input.rationaleRequired || input.rationaleRef !== null;
}

export function buildGovernanceApprovalComposer(
  input: BuildGovernanceApprovalComposerInput,
): GovernancePolicySnapshotApprovalComposer {
  const basket = input.changeBasket;
  if (!requiresApproval(basket)) {
    if (
      basket.simulation_atomicity === "ATOMIC" &&
      basket.active_mutation_basis_contract_or_null !== null
    ) {
      return {
        ...nullComposer(),
        mutation_basis_contract_or_null: structuredClone(
          basket.active_mutation_basis_contract_or_null,
        ) as GovernanceMutationBasisContract,
      };
    }
    return nullComposer();
  }
  if (basket.active_mutation_basis_contract_or_null === null) {
    throw new GovernanceApprovalComposerProjectionError(
      "approval-required atomic basket is missing its active mutation basis contract",
    );
  }

  const mutationBasis = structuredClone(
    basket.active_mutation_basis_contract_or_null,
  ) as GovernanceMutationBasisContract;
  const requested_approver_scope = uniqueSorted(
    input.requestedApproverScope ?? basket.required_approvals,
  );
  const related_object_refs = uniqueSorted(
    input.relatedObjectRefs ?? stagedRelatedRefs(basket),
  );
  const rationale_required = input.rationaleRequired ?? true;
  const rationale_ref = input.rationaleRef ?? null;
  const ready = canBeReady({
    basis: mutationBasis,
    rationaleRef: rationale_ref,
    rationaleRequired: rationale_required,
    relatedObjectRefs: related_object_refs,
    requestedApproverScope: requested_approver_scope,
  });

  return {
    composer_state: input.approvalSubmitted ? "SUBMITTED" : ready ? "READY" : "DRAFT",
    expires_at: input.expiresAt ?? null,
    mutation_basis_contract_or_null: mutationBasis,
    rationale_ref,
    rationale_required,
    related_object_refs,
    requested_approver_scope,
  };
}
