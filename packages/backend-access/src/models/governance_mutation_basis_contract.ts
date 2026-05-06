import type { GovernanceMutationBasisContract as SchemaGovernanceMutationBasisContract } from "../../../generated-models/src/generated/typescript/governance-and-policy.ts";
import {
  asTaxatHash,
  unwrapIdentifier,
} from "../../../domain-kernel/src/primitives/identifier.ts";

import {
  expectedGovernanceCommitAuthorityPosture,
  governanceRequiredApprovalsForRequirement,
  type GovernanceMutationApprovalRequirement,
  type GovernanceMutationCommitAuthorityPosture,
} from "./governance_mutation_hazard_contract.ts";
import {
  normalizeStringSet,
  requireTrimmedString,
} from "../services/principal_context_normalizer.ts";
import { deriveGovernanceMutationBasisContractHash } from "../hash/basis_contract_hash.ts";

export type GovernanceMutationBasisContractRecord =
  SchemaGovernanceMutationBasisContract;

export const GOVERNANCE_MUTATION_BASIS_CONTRACT_VERSION =
  "GOVERNANCE_MUTATION_BASIS_CONTRACT_V1" as const;

export type CreateGovernanceMutationBasisContractInput = Omit<
  GovernanceMutationBasisContractRecord,
  | "basis_contract_hash"
  | "contract_version"
  | "approval_requirement"
  | "required_approvals"
  | "commit_authority_posture"
> & {
  approval_requirement?: GovernanceMutationBasisContractRecord["approval_requirement"];
  basis_contract_hash?: string;
  commit_authority_posture?: GovernanceMutationBasisContractRecord["commit_authority_posture"];
  contract_version?: typeof GOVERNANCE_MUTATION_BASIS_CONTRACT_VERSION;
  required_approvals?: string[];
};

type GovernanceMutationBasisContractModelErrorCode =
  | "GOVERNANCE_MUTATION_BASIS_CONTRACT_FIELD_REQUIRED"
  | "GOVERNANCE_MUTATION_BASIS_CONTRACT_HASH_MISMATCH"
  | "GOVERNANCE_MUTATION_BASIS_CONTRACT_INVALID";

export class GovernanceMutationBasisContractModelError extends Error {
  readonly code: GovernanceMutationBasisContractModelErrorCode;

  constructor(
    code: GovernanceMutationBasisContractModelErrorCode,
    detail: string,
  ) {
    super(`${code}: ${detail}`);
    this.name = "GovernanceMutationBasisContractModelError";
    this.code = code;
  }
}

function assertCondition(
  condition: unknown,
  code: GovernanceMutationBasisContractModelErrorCode,
  detail: string,
): asserts condition {
  if (!condition) {
    throw new GovernanceMutationBasisContractModelError(code, detail);
  }
}

function normalizeHash(label: string, value: unknown, family: string) {
  return unwrapIdentifier(asTaxatHash(requireTrimmedString(label, value), family));
}

function normalizeScore(label: string, value: unknown) {
  assertCondition(
    typeof value === "number" &&
      Number.isInteger(value) &&
      value >= 0 &&
      value <= 100,
    "GOVERNANCE_MUTATION_BASIS_CONTRACT_FIELD_REQUIRED",
    `${label} must be an integer in [0,100]`,
  );
  return value;
}

function normalizeBinary(label: string, value: unknown) {
  assertCondition(
    value === 0 || value === 1,
    "GOVERNANCE_MUTATION_BASIS_CONTRACT_FIELD_REQUIRED",
    `${label} must be 0 or 1`,
  );
  return value;
}

function arraysEqual(left: readonly string[], right: readonly string[]) {
  return (
    left.length === right.length &&
    left.every((value, index) => value === right[index])
  );
}

export function normalizeGovernanceMutationBasisContract(
  input: CreateGovernanceMutationBasisContractInput,
): GovernanceMutationBasisContractRecord {
  try {
    const contract_version =
      input.contract_version ?? GOVERNANCE_MUTATION_BASIS_CONTRACT_VERSION;
    const policy_snapshot_hash = normalizeHash(
      "policy_snapshot_hash",
      input.policy_snapshot_hash,
      "policy_snapshot",
    );
    const access_binding_hash = normalizeHash(
      "access_binding_hash",
      input.access_binding_hash,
      "access_binding",
    );
    const dependency_topology_hash = normalizeHash(
      "dependency_topology_hash",
      input.dependency_topology_hash,
      "dependency_topology",
    );
    const simulation_basis_hash = normalizeHash(
      "simulation_basis_hash",
      input.simulation_basis_hash,
      "simulation_basis",
    );
    const hazard_contract_hash = normalizeHash(
      "hazard_contract_hash",
      input.hazard_contract_hash,
      "hazard_contract",
    );
    const bounded_safe_mutation = normalizeBinary(
      "bounded_safe_mutation",
      input.bounded_safe_mutation,
    );
    const simulation_confidence_score = normalizeScore(
      "simulation_confidence_score",
      input.simulation_confidence_score,
    );
    const predictability_score = normalizeScore(
      "predictability_score",
      input.predictability_score,
    );
    const approval_requirement =
      input.approval_requirement ??
      ((bounded_safe_mutation === 1
        ? "NOT_REQUIRED"
        : "SECURITY_REVIEW") satisfies GovernanceMutationApprovalRequirement);
    const required_approvals =
      input.required_approvals === undefined
        ? governanceRequiredApprovalsForRequirement(approval_requirement)
        : normalizeStringSet("required_approvals", input.required_approvals);
    const commit_authority_posture =
      input.commit_authority_posture ??
      expectedGovernanceCommitAuthorityPosture({
        simulation_confidence_score,
        predictability_score,
        bounded_safe_mutation,
      });

    assertCondition(
      contract_version === GOVERNANCE_MUTATION_BASIS_CONTRACT_VERSION,
      "GOVERNANCE_MUTATION_BASIS_CONTRACT_INVALID",
      `contract_version must remain ${GOVERNANCE_MUTATION_BASIS_CONTRACT_VERSION}`,
    );

    assertCondition(
      approval_requirement === "NOT_REQUIRED" ||
        approval_requirement === "SINGLE_APPROVER" ||
        approval_requirement === "DUAL_APPROVER" ||
        approval_requirement === "SECURITY_REVIEW" ||
        approval_requirement === "CHANGE_ADVISORY_QUORUM",
      "GOVERNANCE_MUTATION_BASIS_CONTRACT_INVALID",
      "approval_requirement must remain a governed governance approval posture",
    );

    assertCondition(
      commit_authority_posture === "PREVIEW_ONLY" ||
        commit_authority_posture === "APPROVAL_GATED" ||
        commit_authority_posture === "BOUNDED_SAFE",
      "GOVERNANCE_MUTATION_BASIS_CONTRACT_INVALID",
      "commit_authority_posture must remain inside the governed preview/commit posture vocabulary",
    );

    if (bounded_safe_mutation === 1) {
      assertCondition(
        approval_requirement === "NOT_REQUIRED",
        "GOVERNANCE_MUTATION_BASIS_CONTRACT_INVALID",
        "bounded_safe_mutation = 1 requires approval_requirement = NOT_REQUIRED",
      );
      assertCondition(
        required_approvals.length === 0,
        "GOVERNANCE_MUTATION_BASIS_CONTRACT_INVALID",
        "bounded_safe_mutation = 1 requires required_approvals to clear",
      );
    } else {
      assertCondition(
        approval_requirement !== "NOT_REQUIRED",
        "GOVERNANCE_MUTATION_BASIS_CONTRACT_INVALID",
        "bounded_safe_mutation = 0 requires an explicit approval requirement",
      );
      assertCondition(
        required_approvals.length > 0,
        "GOVERNANCE_MUTATION_BASIS_CONTRACT_INVALID",
        "bounded_safe_mutation = 0 requires non-empty required_approvals",
      );
    }

    const expectedRequiredApprovals =
      governanceRequiredApprovalsForRequirement(approval_requirement);
    assertCondition(
      arraysEqual(required_approvals, expectedRequiredApprovals),
      "GOVERNANCE_MUTATION_BASIS_CONTRACT_INVALID",
      "required_approvals must equal the canonical approval scope for approval_requirement",
    );

    const expectedCommitAuthorityPosture =
      expectedGovernanceCommitAuthorityPosture({
        simulation_confidence_score,
        predictability_score,
        bounded_safe_mutation,
      });
    assertCondition(
      commit_authority_posture === expectedCommitAuthorityPosture,
      "GOVERNANCE_MUTATION_BASIS_CONTRACT_INVALID",
      "commit_authority_posture must equal the deterministic preview/commit posture",
    );

    const canonicalRecord = {
      contract_version,
      policy_snapshot_hash,
      access_binding_hash,
      dependency_topology_hash,
      simulation_basis_hash,
      hazard_contract_hash,
      commit_authority_posture,
      approval_requirement,
      bounded_safe_mutation,
      required_approvals,
      simulation_confidence_score,
      predictability_score,
    } satisfies Omit<
      GovernanceMutationBasisContractRecord,
      "basis_contract_hash"
    >;

    const expectedBasisContractHash =
      deriveGovernanceMutationBasisContractHash(canonicalRecord);
    const basis_contract_hash =
      input.basis_contract_hash === undefined
        ? expectedBasisContractHash
        : normalizeHash(
            "basis_contract_hash",
            input.basis_contract_hash,
            "basis_contract",
          );

    if (input.basis_contract_hash !== undefined) {
      assertCondition(
        basis_contract_hash === expectedBasisContractHash,
        "GOVERNANCE_MUTATION_BASIS_CONTRACT_HASH_MISMATCH",
        "basis_contract_hash does not match the canonical governance mutation basis payload",
      );
    }

    return {
      ...canonicalRecord,
      basis_contract_hash,
    };
  } catch (error) {
    if (error instanceof GovernanceMutationBasisContractModelError) {
      throw error;
    }
    throw new GovernanceMutationBasisContractModelError(
      "GOVERNANCE_MUTATION_BASIS_CONTRACT_FIELD_REQUIRED",
      error instanceof Error
        ? error.message
        : "governance mutation basis contract normalization failed",
    );
  }
}
