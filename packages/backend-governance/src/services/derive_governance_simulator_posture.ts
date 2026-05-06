import type { GovernanceMutationHazardContractRecord } from "../../../backend-access/src/models/governance_mutation_hazard_contract.ts";
import type { GovernanceAccessSimulationSimulatorPosture } from "../../../generated-models/src/generated/typescript/governance-and-policy.ts";
import { deriveGovernanceCommitAuthorityPosture } from "./derive_commit_authority_posture.ts";

export function deriveGovernanceSimulatorPosture(input: {
  mutation_hazard: GovernanceMutationHazardContractRecord | null;
}): GovernanceAccessSimulationSimulatorPosture {
  if (input.mutation_hazard === null) {
    return "READ_ONLY_DECISION";
  }

  const commitAuthorityPosture = deriveGovernanceCommitAuthorityPosture({
    bounded_safe_mutation: input.mutation_hazard.bounded_safe_mutation,
    predictability_score: input.mutation_hazard.predictability_score,
    simulation_confidence_score:
      input.mutation_hazard.simulation_confidence_score,
  });
  if (commitAuthorityPosture === "PREVIEW_ONLY") {
    return "ADVISORY_ONLY";
  }
  if (commitAuthorityPosture === "BOUNDED_SAFE") {
    return "BOUNDED_SAFE";
  }
  return "APPROVAL_GATED";
}
