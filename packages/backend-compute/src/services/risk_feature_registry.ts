import type { ComputeResultRecord } from "../models/compute_result.ts";
import { clamp01, type ResolvedRiskThresholdFeatureProfile } from "./risk_threshold_profile_resolver.ts";

export type FrozenRiskFeatureValue =
  | number
  | {
      feature_resolved?: boolean;
      feature_value?: number;
      resolved?: boolean;
      value?: number;
    };

export type RiskFeatureContext = {
  compute_result?: ComputeResultRecord;
  frozen_feature_values?: Readonly<Record<string, FrozenRiskFeatureValue>>;
  resolved_feature_codes?: readonly string[];
  snapshot_ref?: string;
  unresolved_feature_codes?: readonly string[];
};

export type RiskFeatureExtractionResult = {
  feature_code: string;
  feature_resolved: boolean;
  feature_value: number;
  reason_codes: string[];
  source_refs: string[];
};

export type RiskFeatureExtractor = (input: {
  context: RiskFeatureContext;
  feature: ResolvedRiskThresholdFeatureProfile;
}) => RiskFeatureExtractionResult;

export class RiskFeatureRegistryError extends Error {
  readonly code:
    | "RISK_FEATURE_EXTRACTOR_DUPLICATE"
    | "RISK_FEATURE_EXTRACTOR_NOT_FOUND";

  constructor(code: RiskFeatureRegistryError["code"], detail: string) {
    super(`${code}: ${detail}`);
    this.name = "RiskFeatureRegistryError";
    this.code = code;
  }
}

function featureValueFromFrozenInput(value: FrozenRiskFeatureValue | undefined) {
  if (value === undefined) {
    return { feature_resolved: false, feature_value: 1, reason_code: "RISK_FEATURE_VALUE_MISSING" };
  }
  if (typeof value === "number") {
    return { feature_resolved: true, feature_value: value, reason_code: null };
  }
  const featureValue = value.feature_value ?? value.value;
  if (featureValue === undefined) {
    return { feature_resolved: false, feature_value: 1, reason_code: "RISK_FEATURE_VALUE_MISSING" };
  }
  return {
    feature_resolved: value.feature_resolved ?? value.resolved ?? true,
    feature_value: featureValue,
    reason_code: null,
  };
}

function defaultFrozenFeatureValueExtractor(input: {
  context: RiskFeatureContext;
  feature: ResolvedRiskThresholdFeatureProfile;
}): RiskFeatureExtractionResult {
  const extracted = featureValueFromFrozenInput(
    input.context.frozen_feature_values?.[input.feature.feature_code],
  );
  const resolvedFeatureCodes = new Set(input.context.resolved_feature_codes ?? []);
  const unresolvedFeatureCodes = new Set(input.context.unresolved_feature_codes ?? []);
  const explicitResolved = resolvedFeatureCodes.has(input.feature.feature_code);
  const explicitUnresolved = unresolvedFeatureCodes.has(input.feature.feature_code);
  const featureResolved = explicitUnresolved
    ? false
    : explicitResolved
      ? true
      : extracted.feature_resolved;
  const sourceRefs = [
    input.context.snapshot_ref,
    input.context.compute_result ? `compute-result://${input.context.compute_result.compute_id}` : null,
  ].filter((ref): ref is string => ref !== null && ref !== undefined);
  return {
    feature_code: input.feature.feature_code,
    feature_resolved: featureResolved,
    feature_value: clamp01(extracted.feature_value),
    reason_codes: extracted.reason_code ? [extracted.reason_code] : [],
    source_refs: [...new Set(sourceRefs)].sort(),
  };
}

export class RiskFeatureRegistry {
  private readonly extractors = new Map<string, RiskFeatureExtractor>();

  constructor() {
    this.extractors.set("FROZEN_FEATURE_VALUE", defaultFrozenFeatureValueExtractor);
  }

  registerExtractor(code: string, extractor: RiskFeatureExtractor) {
    if (this.extractors.has(code)) {
      throw new RiskFeatureRegistryError(
        "RISK_FEATURE_EXTRACTOR_DUPLICATE",
        `extractor ${code} already exists`,
      );
    }
    this.extractors.set(code, extractor);
  }

  extract(input: {
    context: RiskFeatureContext;
    feature: ResolvedRiskThresholdFeatureProfile;
  }) {
    const extractor = this.extractors.get(input.feature.extractor_code);
    if (!extractor) {
      throw new RiskFeatureRegistryError(
        "RISK_FEATURE_EXTRACTOR_NOT_FOUND",
        `extractor ${input.feature.extractor_code} is not registered`,
      );
    }
    const result = extractor(input);
    return {
      ...result,
      feature_code: input.feature.feature_code,
      feature_value: clamp01(result.feature_value),
      reason_codes: [...new Set(result.reason_codes)].sort(),
      source_refs: [...new Set(result.source_refs)].sort(),
    };
  }
}
