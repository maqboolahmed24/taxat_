import type {
  RiskFeatureFlagState,
  RiskReportFeatureScoreRecord,
} from "../models/risk_report.ts";

export type RiskFeatureScoreCandidate = {
  blocking_threshold: number;
  feature_code: string;
  feature_resolved: boolean;
  feature_value: number;
  feature_weight: number;
  material_threshold: number;
};

export type DerivedRiskFlags = {
  feature_scores: RiskReportFeatureScoreRecord[];
  flags: string[];
  material_risk_flag_count: number;
  unresolved_blocking_risk_flag: boolean;
  unresolved_material_blocking_risk_flag: boolean;
  blocking_risk_flag_count: number;
};

const FLAG_ORDER = [
  "RISK_WEIGHT_PROFILE_INVALID",
  "BLOCKING_RISK_UNRESOLVED",
  "MATERIAL_RISK_UNRESOLVED",
];

export function orderRiskFlags(flags: readonly string[]) {
  const normalized = [...new Set(flags)].sort();
  const present = new Set(normalized);
  return [
    ...FLAG_ORDER.filter((flag) => present.has(flag)),
    ...normalized.filter((flag) => !FLAG_ORDER.includes(flag)).sort(),
  ];
}

function flagStateForFeature(feature: RiskFeatureScoreCandidate): RiskFeatureFlagState {
  if (feature.feature_resolved) {
    return "NONE";
  }
  if (feature.feature_value >= feature.blocking_threshold) {
    return "BLOCKING_UNRESOLVED";
  }
  if (feature.feature_value >= feature.material_threshold) {
    return "MATERIAL_UNRESOLVED";
  }
  return "NONE";
}

export function deriveRiskFlags(
  candidates: readonly RiskFeatureScoreCandidate[],
): DerivedRiskFlags {
  const featureScores = candidates
    .map((candidate) => ({
      blocking_threshold: candidate.blocking_threshold,
      feature_code: candidate.feature_code,
      feature_resolved: candidate.feature_resolved,
      feature_value: candidate.feature_value,
      feature_weight: candidate.feature_weight,
      flag_state: flagStateForFeature(candidate),
      material_threshold: candidate.material_threshold,
    }))
    .sort((left, right) => left.feature_code.localeCompare(right.feature_code));
  const materialCount = featureScores.filter(
    (feature) =>
      feature.flag_state === "MATERIAL_UNRESOLVED" ||
      feature.flag_state === "BLOCKING_UNRESOLVED",
  ).length;
  const blockingCount = featureScores.filter(
    (feature) => feature.flag_state === "BLOCKING_UNRESOLVED",
  ).length;
  const flags: string[] = [];
  if (blockingCount > 0) {
    flags.push("BLOCKING_RISK_UNRESOLVED");
  }
  if (materialCount > 0) {
    flags.push("MATERIAL_RISK_UNRESOLVED");
  }
  return {
    blocking_risk_flag_count: blockingCount,
    feature_scores: featureScores,
    flags: orderRiskFlags(flags),
    material_risk_flag_count: materialCount,
    unresolved_blocking_risk_flag: blockingCount > 0,
    unresolved_material_blocking_risk_flag: materialCount > 0,
  };
}

export function invalidRiskWeightProfileFlags() {
  return {
    blocking_risk_flag_count: 0,
    feature_scores: [],
    flags: ["RISK_WEIGHT_PROFILE_INVALID"],
    material_risk_flag_count: 0,
    unresolved_blocking_risk_flag: false,
    unresolved_material_blocking_risk_flag: true,
  } satisfies DerivedRiskFlags;
}
