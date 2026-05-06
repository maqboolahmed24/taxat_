export type GovernanceScoreInput = {
  impact_radius_upper_score: number;
  masking_relaxation_score: number;
  privilege_gain_score: number;
  scope_expansion_score: number;
};

export class GovernanceMutationModelingError extends Error {
  constructor(detail: string) {
    super(`GOVERNANCE_MUTATION_MODELING_INVALID: ${detail}`);
    this.name = "GovernanceMutationModelingError";
  }
}

export function assertGovernanceScore(label: string, value: number) {
  if (!Number.isInteger(value) || value < 0 || value > 100) {
    throw new GovernanceMutationModelingError(
      `${label} must be an integer in [0,100]`,
    );
  }
  return value;
}

export function roundGovernanceScore(value: number) {
  if (!Number.isFinite(value)) {
    throw new GovernanceMutationModelingError("score input must be finite");
  }
  return Math.max(0, Math.min(100, Math.floor(value + 0.5)));
}

function governanceScoreRatio(label: string, value: number) {
  return assertGovernanceScore(label, value) / 100;
}

export function derivePolicyRiskScore(input: GovernanceScoreInput) {
  const dPriv = governanceScoreRatio(
    "privilege_gain_score",
    input.privilege_gain_score,
  );
  const dScope = governanceScoreRatio(
    "scope_expansion_score",
    input.scope_expansion_score,
  );
  const dMask = governanceScoreRatio(
    "masking_relaxation_score",
    input.masking_relaxation_score,
  );
  const dTail = governanceScoreRatio(
    "impact_radius_upper_score",
    input.impact_radius_upper_score,
  );
  const policyRiskRaw =
    1 -
    (1 - dPriv) ** 0.4 *
      (1 - dScope) ** 0.25 *
      (1 - dMask) ** 0.2 *
      (1 - dTail) ** 0.15;

  return roundGovernanceScore(100 * policyRiskRaw);
}
