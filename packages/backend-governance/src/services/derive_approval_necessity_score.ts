import {
  assertGovernanceScore,
  roundGovernanceScore,
} from "./derive_policy_risk_score.ts";

export type DeriveApprovalNecessityScoreInput = {
  impact_radius_upper_score: number;
  policy_risk_score: number;
};

export function deriveApprovalNecessityScore(
  input: DeriveApprovalNecessityScoreInput,
) {
  const policyRiskScore =
    assertGovernanceScore("policy_risk_score", input.policy_risk_score) / 100;
  const impactRadiusUpperScore =
    assertGovernanceScore(
      "impact_radius_upper_score",
      input.impact_radius_upper_score,
    ) / 100;
  const approvalNecessityRaw =
    1 -
    (1 - policyRiskScore) ** 0.7 *
      (1 - impactRadiusUpperScore) ** 0.3;

  return roundGovernanceScore(100 * approvalNecessityRaw);
}
