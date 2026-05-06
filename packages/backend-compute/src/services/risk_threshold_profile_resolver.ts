import { stableJsonHash } from "../../../domain-kernel/src/primitives/hash.ts";

export type RiskFeatureExtractorCode = "FROZEN_FEATURE_VALUE" | string;

export type RiskThresholdFeatureProfile = {
  active?: boolean;
  blocking_threshold: number;
  extractor_code?: RiskFeatureExtractorCode;
  feature_code: string;
  feature_weight: number;
  material_threshold: number;
};

export type RiskThresholdProfile = {
  features: readonly RiskThresholdFeatureProfile[];
  risk_threshold_profile_ref: string;
};

export type ResolvedRiskThresholdFeatureProfile = {
  blocking_threshold: number;
  extractor_code: RiskFeatureExtractorCode;
  feature_code: string;
  feature_weight: number;
  material_threshold: number;
};

export type ResolvedRiskThresholdProfile = {
  features: ResolvedRiskThresholdFeatureProfile[];
  risk_threshold_profile_ref: string;
  total_active_weight: number;
};

export class RiskThresholdProfileResolverError extends Error {
  readonly code: "RISK_WEIGHT_PROFILE_INVALID";

  constructor(detail: string) {
    super(`RISK_WEIGHT_PROFILE_INVALID: ${detail}`);
    this.name = "RiskThresholdProfileResolverError";
    this.code = "RISK_WEIGHT_PROFILE_INVALID";
  }
}

function requireProfileString(label: string, value: unknown) {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new RiskThresholdProfileResolverError(`${label} must be a non-empty string`);
  }
  return value.trim().normalize("NFC");
}

function requireFiniteUnitInterval(
  label: string,
  value: number,
  options?: { exclusiveMinimum?: boolean },
) {
  const lowerOk = options?.exclusiveMinimum === true ? value > 0 : value >= 0;
  if (!Number.isFinite(value) || !lowerOk || value > 1) {
    throw new RiskThresholdProfileResolverError(
      `${label} must be finite and inside the profile interval`,
    );
  }
  return value;
}

export function clamp01(value: number) {
  if (!Number.isFinite(value)) {
    return 1;
  }
  return Math.min(1, Math.max(0, value));
}

export function roundScore(value: number) {
  return Math.floor(Math.min(100, Math.max(0, value)) + 0.5);
}

export function canonicalRiskThresholdProfileHash(profile: RiskThresholdProfile) {
  return `risk-threshold-profile-hash://${stableJsonHash({
    artifact_family: "RISK_THRESHOLD_PROFILE",
    payload: profile,
  })}`;
}

export function resolveRiskThresholdProfile(
  profile: RiskThresholdProfile,
): ResolvedRiskThresholdProfile {
  const riskThresholdProfileRef = requireProfileString(
    "risk_threshold_profile.risk_threshold_profile_ref",
    profile.risk_threshold_profile_ref,
  );
  const seen = new Set<string>();
  const features: ResolvedRiskThresholdFeatureProfile[] = [];
  for (const feature of profile.features) {
    if (feature.active === false) {
      continue;
    }
    const featureCode = requireProfileString("risk_threshold_profile.feature_code", feature.feature_code);
    if (seen.has(featureCode)) {
      throw new RiskThresholdProfileResolverError(`duplicate feature_code ${featureCode}`);
    }
    seen.add(featureCode);
    if (!Number.isFinite(feature.feature_weight) || feature.feature_weight <= 0) {
      throw new RiskThresholdProfileResolverError(
        `feature_weight must be positive for ${featureCode}`,
      );
    }
    const materialThreshold = requireFiniteUnitInterval(
      `material_threshold for ${featureCode}`,
      feature.material_threshold,
      { exclusiveMinimum: true },
    );
    const blockingThreshold = requireFiniteUnitInterval(
      `blocking_threshold for ${featureCode}`,
      feature.blocking_threshold,
      { exclusiveMinimum: true },
    );
    if (blockingThreshold < materialThreshold) {
      throw new RiskThresholdProfileResolverError(
        `blocking_threshold must be >= material_threshold for ${featureCode}`,
      );
    }
    features.push({
      blocking_threshold: blockingThreshold,
      extractor_code: feature.extractor_code ?? "FROZEN_FEATURE_VALUE",
      feature_code: featureCode,
      feature_weight: feature.feature_weight,
      material_threshold: materialThreshold,
    });
  }
  features.sort((left, right) => left.feature_code.localeCompare(right.feature_code));
  const totalActiveWeight = compensatedSum(features.map((feature) => feature.feature_weight));
  if (features.length === 0 || totalActiveWeight <= 0) {
    throw new RiskThresholdProfileResolverError(
      "risk profile must contain at least one active positive-weight feature",
    );
  }
  return {
    features,
    risk_threshold_profile_ref: riskThresholdProfileRef,
    total_active_weight: totalActiveWeight,
  };
}

export function compensatedSum(values: readonly number[]) {
  let sum = 0;
  let compensation = 0;
  for (const value of values) {
    const adjusted = value - compensation;
    const next = sum + adjusted;
    compensation = (next - sum) - adjusted;
    sum = next;
  }
  return sum;
}
