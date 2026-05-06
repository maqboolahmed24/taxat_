import type { AuthorizationDecisionRecord } from "../models/authorization_decision.ts";
import type { GovernanceMutationCommitAuthorityPosture } from "../models/governance_mutation_hazard_contract.ts";

export type AuthorizationGovernanceBasisInput = {
  approval_requirement: Exclude<
    AuthorizationDecisionRecord["approval_requirement"],
    null
  >;
  bounded_safe_mutation: Exclude<
    AuthorizationDecisionRecord["bounded_safe_mutation"],
    null
  >;
  commit_authority_posture: GovernanceMutationCommitAuthorityPosture;
  dependency_topology_hash: string;
  required_approvals: string[];
  simulation_basis_hash: string;
};
