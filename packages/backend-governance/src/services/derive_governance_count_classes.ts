import type {
  GovernanceMutationHazardContract,
  GovernanceMutationHazardContractImpactedCountClass,
} from "../../../generated-models/src/generated/typescript/governance-and-policy.ts";
import { GovernanceMutationModelingError } from "./derive_policy_risk_score.ts";

export const GOVERNANCE_IMPACT_COUNT_CLASS_PROFILE_CODE =
  "GOVERNANCE_IMPACT_COUNT_CLASS_V1" as const;

export type DeriveGovernanceCountClassesInput = Pick<
  GovernanceMutationHazardContract,
  | "impacted_authority_operation_count"
  | "impacted_client_count"
  | "impacted_limitation_count"
  | "impacted_principal_count"
  | "impacted_workflow_count"
>;

function assertGovernanceCount(label: string, value: number) {
  if (!Number.isInteger(value) || value < 0) {
    throw new GovernanceMutationModelingError(
      `${label} must be a non-negative integer`,
    );
  }
  return value;
}

export function deriveGovernanceCountClass(
  count: number,
): GovernanceMutationHazardContractImpactedCountClass {
  const value = assertGovernanceCount("impacted_count", count);
  if (value === 0) {
    return "ZERO";
  }
  if (value === 1) {
    return "ONE";
  }
  if (value <= 5) {
    return "SMALL_BATCH";
  }
  if (value <= 20) {
    return "MEDIUM_BATCH";
  }
  if (value <= 100) {
    return "LARGE_BATCH";
  }
  return "ESTATE_WIDE";
}

export function deriveGovernanceCountClasses(
  input: DeriveGovernanceCountClassesInput,
) {
  assertGovernanceCount(
    "impacted_principal_count",
    input.impacted_principal_count,
  );
  assertGovernanceCount("impacted_client_count", input.impacted_client_count);
  assertGovernanceCount(
    "impacted_authority_operation_count",
    input.impacted_authority_operation_count,
  );
  assertGovernanceCount(
    "impacted_workflow_count",
    input.impacted_workflow_count,
  );
  assertGovernanceCount(
    "impacted_limitation_count",
    input.impacted_limitation_count,
  );

  return {
    count_class_profile_code: GOVERNANCE_IMPACT_COUNT_CLASS_PROFILE_CODE,
    impacted_principal_count_class: deriveGovernanceCountClass(
      input.impacted_principal_count,
    ),
    impacted_client_count_class: deriveGovernanceCountClass(
      input.impacted_client_count,
    ),
    impacted_authority_operation_count_class: deriveGovernanceCountClass(
      input.impacted_authority_operation_count,
    ),
    impacted_workflow_count_class: deriveGovernanceCountClass(
      input.impacted_workflow_count,
    ),
    impacted_limitation_count_class: deriveGovernanceCountClass(
      input.impacted_limitation_count,
    ),
  } satisfies Pick<
    GovernanceMutationHazardContract,
    | "count_class_profile_code"
    | "impacted_authority_operation_count_class"
    | "impacted_client_count_class"
    | "impacted_limitation_count_class"
    | "impacted_principal_count_class"
    | "impacted_workflow_count_class"
  >;
}
