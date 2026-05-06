import type {
  GovernanceMutationHazardContract,
  GovernanceMutationHazardContractApprovalTriggerCode,
  GovernanceMutationHazardContractBoundedSafetyBlockerCode,
  GovernanceMutationHazardContractConfidenceLimiterCode,
  GovernanceMutationHazardContractRiskDriverCode,
} from "../../../generated-models/src/generated/typescript/governance-and-policy.ts";
import { deriveApprovalNecessityScore } from "./derive_approval_necessity_score.ts";
import { assertGovernanceScore } from "./derive_policy_risk_score.ts";

export type GovernanceMutationApprovalRequirement =
  GovernanceMutationHazardContract["approval_requirement"];
export type GovernanceMutationCommitAuthorityPosture =
  GovernanceMutationHazardContract["commit_authority_posture"];

export const GOVERNANCE_MUTATION_RISK_DRIVER_CODES = [
  "PRIVILEGE_GAIN",
  "SCOPE_EXPANSION",
  "MASKING_RELAXATION",
  "BROAD_BLAST_RADIUS",
] as const satisfies readonly GovernanceMutationHazardContractRiskDriverCode[];

export const GOVERNANCE_MUTATION_APPROVAL_TRIGGER_CODES = [
  "SINGLE_APPROVER_REQUIRED",
  "DUAL_APPROVER_REQUIRED",
  "SECURITY_REVIEW_REQUIRED",
  "CHANGE_ADVISORY_QUORUM_REQUIRED",
] as const satisfies readonly GovernanceMutationHazardContractApprovalTriggerCode[];

export const GOVERNANCE_MUTATION_CONFIDENCE_LIMITER_CODES = [
  "LOW_SIMULATION_CONFIDENCE",
  "LOW_PREDICTABILITY",
] as const satisfies readonly GovernanceMutationHazardContractConfidenceLimiterCode[];

export const GOVERNANCE_MUTATION_BOUNDED_SAFETY_BLOCKER_CODES = [
  "PRIVILEGE_GAIN_PRESENT",
  "SCOPE_EXPANSION_PRESENT",
  "MASKING_RELAXATION_PRESENT",
  "IMPACT_RADIUS_TOO_LARGE",
  "POLICY_RISK_TOO_HIGH",
  "CONFIDENCE_TOO_LOW",
  "PREDICTABILITY_TOO_LOW",
] as const satisfies readonly GovernanceMutationHazardContractBoundedSafetyBlockerCode[];

export type DeriveCommitAuthorityPostureInput = {
  approval_necessity_score?: number | undefined;
  impact_radius_lower_score: number;
  impact_radius_upper_score: number;
  masking_relaxation_score: number;
  policy_risk_score: number;
  predictability_score: number;
  privilege_gain_score: number;
  scope_expansion_score: number;
  simulation_confidence_score: number;
};

function sortLexicographic(values: readonly string[]) {
  return [...new Set(values.map((value) => value.normalize("NFC")))].sort(
    (left, right) => (left < right ? -1 : left > right ? 1 : 0),
  );
}

export function deriveGovernanceBoundedSafeMutation(
  input: DeriveCommitAuthorityPostureInput,
) {
  for (const [label, value] of [
    ["impact_radius_upper_score", input.impact_radius_upper_score],
    ["masking_relaxation_score", input.masking_relaxation_score],
    ["predictability_score", input.predictability_score],
    ["privilege_gain_score", input.privilege_gain_score],
    ["scope_expansion_score", input.scope_expansion_score],
    ["simulation_confidence_score", input.simulation_confidence_score],
  ] as const) {
    assertGovernanceScore(label, value);
  }
  const policyRiskScore = assertGovernanceScore(
    "policy_risk_score",
    input.policy_risk_score,
  );
  return input.privilege_gain_score === 0 &&
    input.scope_expansion_score === 0 &&
    input.masking_relaxation_score === 0 &&
    input.impact_radius_upper_score < 5 &&
    policyRiskScore < 15 &&
    input.simulation_confidence_score >= 90 &&
    input.predictability_score >= 85
    ? 1
    : 0;
}

export function deriveGovernanceApprovalRequirement(input: {
  approval_necessity_score: number;
  bounded_safe_mutation: 0 | 1;
}): GovernanceMutationApprovalRequirement {
  const approvalNecessityScore = assertGovernanceScore(
    "approval_necessity_score",
    input.approval_necessity_score,
  );
  if (input.bounded_safe_mutation === 1) {
    return "NOT_REQUIRED";
  }
  if (approvalNecessityScore >= 80) {
    return "CHANGE_ADVISORY_QUORUM";
  }
  if (approvalNecessityScore >= 55) {
    return "SECURITY_REVIEW";
  }
  if (approvalNecessityScore >= 30) {
    return "DUAL_APPROVER";
  }
  return "SINGLE_APPROVER";
}

export function deriveGovernanceRequiredApprovals(
  approvalRequirement: GovernanceMutationApprovalRequirement,
) {
  const mapping: Record<GovernanceMutationApprovalRequirement, string[]> = {
    NOT_REQUIRED: [],
    SINGLE_APPROVER: ["TENANT_ADMIN"],
    DUAL_APPROVER: ["SECURITY_TEAM", "TENANT_ADMIN"],
    SECURITY_REVIEW: ["SECURITY_TEAM"],
    CHANGE_ADVISORY_QUORUM: ["CHANGE_BOARD", "SECURITY_TEAM", "TENANT_ADMIN"],
  };
  return sortLexicographic(mapping[approvalRequirement]);
}

export function deriveGovernanceRiskDriverCodes(input: {
  impact_radius_upper_score: number;
  masking_relaxation_score: number;
  privilege_gain_score: number;
  scope_expansion_score: number;
}) {
  const codes: GovernanceMutationHazardContractRiskDriverCode[] = [];
  if (input.privilege_gain_score > 0) {
    codes.push("PRIVILEGE_GAIN");
  }
  if (input.scope_expansion_score > 0) {
    codes.push("SCOPE_EXPANSION");
  }
  if (input.masking_relaxation_score > 0) {
    codes.push("MASKING_RELAXATION");
  }
  if (input.impact_radius_upper_score >= 25) {
    codes.push("BROAD_BLAST_RADIUS");
  }
  return codes;
}

export function deriveGovernanceApprovalTriggerCodes(
  approvalRequirement: GovernanceMutationApprovalRequirement,
) {
  const codeByRequirement: Partial<
    Record<
      GovernanceMutationApprovalRequirement,
      GovernanceMutationHazardContractApprovalTriggerCode
    >
  > = {
    SINGLE_APPROVER: "SINGLE_APPROVER_REQUIRED",
    DUAL_APPROVER: "DUAL_APPROVER_REQUIRED",
    SECURITY_REVIEW: "SECURITY_REVIEW_REQUIRED",
    CHANGE_ADVISORY_QUORUM: "CHANGE_ADVISORY_QUORUM_REQUIRED",
  };
  const code = codeByRequirement[approvalRequirement];
  return code === undefined ? [] : [code];
}

export function deriveGovernanceConfidenceLimiterCodes(input: {
  predictability_score: number;
  simulation_confidence_score: number;
}) {
  const codes: GovernanceMutationHazardContractConfidenceLimiterCode[] = [];
  if (input.simulation_confidence_score < 80) {
    codes.push("LOW_SIMULATION_CONFIDENCE");
  }
  if (input.predictability_score < 75) {
    codes.push("LOW_PREDICTABILITY");
  }
  return codes;
}

export function deriveGovernanceBoundedSafetyBlockerCodes(
  input: DeriveCommitAuthorityPostureInput,
) {
  const codes: GovernanceMutationHazardContractBoundedSafetyBlockerCode[] = [];
  if (input.privilege_gain_score > 0) {
    codes.push("PRIVILEGE_GAIN_PRESENT");
  }
  if (input.scope_expansion_score > 0) {
    codes.push("SCOPE_EXPANSION_PRESENT");
  }
  if (input.masking_relaxation_score > 0) {
    codes.push("MASKING_RELAXATION_PRESENT");
  }
  if (input.impact_radius_upper_score >= 5) {
    codes.push("IMPACT_RADIUS_TOO_LARGE");
  }
  if (input.policy_risk_score >= 15) {
    codes.push("POLICY_RISK_TOO_HIGH");
  }
  if (input.simulation_confidence_score < 90) {
    codes.push("CONFIDENCE_TOO_LOW");
  }
  if (input.predictability_score < 85) {
    codes.push("PREDICTABILITY_TOO_LOW");
  }
  return codes;
}

export function deriveGovernanceCommitAuthorityPosture(input: {
  bounded_safe_mutation: 0 | 1;
  predictability_score: number;
  simulation_confidence_score: number;
}): GovernanceMutationCommitAuthorityPosture {
  if (
    input.simulation_confidence_score < 80 ||
    input.predictability_score < 75
  ) {
    return "PREVIEW_ONLY";
  }
  return input.bounded_safe_mutation === 1 ? "BOUNDED_SAFE" : "APPROVAL_GATED";
}

export function deriveCommitAuthorityPosture(
  input: DeriveCommitAuthorityPostureInput,
) {
  for (const [label, value] of [
    ["impact_radius_lower_score", input.impact_radius_lower_score],
    ["impact_radius_upper_score", input.impact_radius_upper_score],
    ["masking_relaxation_score", input.masking_relaxation_score],
    ["policy_risk_score", input.policy_risk_score],
    ["predictability_score", input.predictability_score],
    ["privilege_gain_score", input.privilege_gain_score],
    ["scope_expansion_score", input.scope_expansion_score],
    ["simulation_confidence_score", input.simulation_confidence_score],
  ] as const) {
    assertGovernanceScore(label, value);
  }

  const approval_necessity_score =
    input.approval_necessity_score ??
    deriveApprovalNecessityScore({
      impact_radius_upper_score: input.impact_radius_upper_score,
      policy_risk_score: input.policy_risk_score,
    });
  const bounded_safe_mutation = deriveGovernanceBoundedSafeMutation(input);
  const approval_requirement = deriveGovernanceApprovalRequirement({
    approval_necessity_score,
    bounded_safe_mutation,
  });
  const required_approvals =
    deriveGovernanceRequiredApprovals(approval_requirement);
  const commit_authority_posture = deriveGovernanceCommitAuthorityPosture({
    bounded_safe_mutation,
    predictability_score: input.predictability_score,
    simulation_confidence_score: input.simulation_confidence_score,
  });
  const risk_driver_codes = deriveGovernanceRiskDriverCodes(input);
  const approval_trigger_codes =
    deriveGovernanceApprovalTriggerCodes(approval_requirement);
  const confidence_limiter_codes = deriveGovernanceConfidenceLimiterCodes(input);
  const bounded_safety_blocker_codes =
    deriveGovernanceBoundedSafetyBlockerCodes(input);
  const reason_codes = sortLexicographic([
    ...risk_driver_codes,
    ...approval_trigger_codes,
    ...confidence_limiter_codes,
    ...bounded_safety_blocker_codes,
    ...(bounded_safe_mutation === 1 ? ["BOUNDED_SAFE_MUTATION"] : []),
    ...(input.impact_radius_lower_score < input.impact_radius_upper_score
      ? ["UNCERTAIN_BLAST_RADIUS"]
      : []),
  ]);

  return {
    approval_necessity_score,
    approval_requirement,
    approval_trigger_codes,
    bounded_safe_mutation,
    bounded_safety_blocker_codes,
    commit_authority_posture,
    confidence_limiter_codes,
    reason_codes,
    required_approvals,
    risk_driver_codes,
  } satisfies Pick<
    GovernanceMutationHazardContract,
    | "approval_necessity_score"
    | "approval_requirement"
    | "approval_trigger_codes"
    | "bounded_safe_mutation"
    | "bounded_safety_blocker_codes"
    | "commit_authority_posture"
    | "confidence_limiter_codes"
    | "reason_codes"
    | "required_approvals"
    | "risk_driver_codes"
  >;
}
