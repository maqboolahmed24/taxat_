import { stableJsonHash } from "../../../domain-kernel/src/primitives/hash.ts";
import type { ParityCriticalityClass } from "../models/parity_result.ts";
import {
  canonicalMoneyString,
  compareMoneyValues,
  type ComputeMoneyProfile,
  type ComputeMoneyValue,
} from "./exact_decimal.ts";
import type { ParityFieldComparisonInput } from "./build_field_delta.ts";

export type ParityThresholdProfile = {
  blocking_ratio_cap?: number;
  fields: readonly ParityFieldComparisonInput[];
  minimum_rel_floor: ComputeMoneyValue;
  parity_threshold_profile_ref: string;
};

export type ComparisonSetBuildResult =
  | {
      blocking_ratio_cap: number;
      comparison_set_state: "VALID";
      fields: ParityFieldComparisonInput[];
      minimum_rel_floor: ComputeMoneyValue;
      parity_threshold_profile_ref: string;
      reason_codes: [];
    }
  | {
      blocking_ratio_cap: number;
      comparison_set_state: "INVALID";
      fields: [];
      minimum_rel_floor: ComputeMoneyValue;
      parity_threshold_profile_ref: string;
      reason_codes: string[];
    };

export class ComparisonSetBuilderError extends Error {
  readonly code: "PARITY_COMPARISON_SET_INVALID";

  constructor(code: ComparisonSetBuilderError["code"], detail: string) {
    super(`${code}: ${detail}`);
    this.name = "ComparisonSetBuilderError";
    this.code = code;
  }
}

function requireString(label: string, value: unknown) {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new ComparisonSetBuilderError(
      "PARITY_COMPARISON_SET_INVALID",
      `${label} must be a non-empty string`,
    );
  }
  return value.trim().normalize("NFC");
}

function criticalityRank(value: ParityCriticalityClass) {
  switch (value) {
    case "CRITICAL":
      return 3;
    case "HIGH":
      return 2;
    case "NORMAL":
      return 1;
  }
}

function normalizeCriticality(value: unknown): ParityCriticalityClass {
  if (value === "CRITICAL" || value === "HIGH" || value === "NORMAL") {
    return value;
  }
  throw new ComparisonSetBuilderError(
    "PARITY_COMPARISON_SET_INVALID",
    "criticality_class must be CRITICAL, HIGH, or NORMAL",
  );
}

function canonicalProfileRef(profile: ParityThresholdProfile) {
  if (
    typeof profile.parity_threshold_profile_ref === "string" &&
    profile.parity_threshold_profile_ref.trim().length > 0
  ) {
    return profile.parity_threshold_profile_ref.trim().normalize("NFC");
  }
  return `parity-threshold-profile://invalid/${stableJsonHash(profile)}`;
}

function isNegativeMoney(value: ComputeMoneyValue) {
  return compareMoneyValues(value, "0") < 0;
}

function isNonPositiveMoney(value: ComputeMoneyValue) {
  return compareMoneyValues(value, "0") <= 0;
}

function invalidResult(input: {
  blocking_ratio_cap: number;
  minimum_rel_floor: ComputeMoneyValue;
  parity_threshold_profile_ref: string;
  reason_codes: readonly string[];
}): ComparisonSetBuildResult {
  return {
    blocking_ratio_cap: input.blocking_ratio_cap,
    comparison_set_state: "INVALID",
    fields: [],
    minimum_rel_floor: input.minimum_rel_floor,
    parity_threshold_profile_ref: input.parity_threshold_profile_ref,
    reason_codes: [...new Set(["PARITY_COMPARISON_SET_INVALID", ...input.reason_codes])].sort(),
  };
}

export function buildComparisonSet(input: {
  money_profile: ComputeMoneyProfile;
  threshold_profile: ParityThresholdProfile;
}): ComparisonSetBuildResult {
  const profileRef = canonicalProfileRef(input.threshold_profile);
  const blockingRatioCap = input.threshold_profile.blocking_ratio_cap ?? 3;
  let minimumRelFloor: ComputeMoneyValue;
  try {
    minimumRelFloor = canonicalMoneyString({
      money_profile: input.money_profile,
      value: input.threshold_profile.minimum_rel_floor,
    });
    if (isNonPositiveMoney(minimumRelFloor)) {
      throw new ComparisonSetBuilderError(
        "PARITY_COMPARISON_SET_INVALID",
        "minimum_rel_floor must be positive",
      );
    }
  } catch {
    minimumRelFloor = "0";
    return invalidResult({
      blocking_ratio_cap: Number.isFinite(blockingRatioCap) ? blockingRatioCap : 3,
      minimum_rel_floor: minimumRelFloor,
      parity_threshold_profile_ref: profileRef,
      reason_codes: ["PARITY_MINIMUM_REL_FLOOR_INVALID"],
    });
  }
  if (!Number.isFinite(blockingRatioCap) || blockingRatioCap < 2.5) {
    return invalidResult({
      blocking_ratio_cap: 3,
      minimum_rel_floor: minimumRelFloor,
      parity_threshold_profile_ref: profileRef,
      reason_codes: ["PARITY_BLOCKING_RATIO_CAP_INVALID"],
    });
  }
  if (input.threshold_profile.fields.length === 0) {
    return invalidResult({
      blocking_ratio_cap: blockingRatioCap,
      minimum_rel_floor: minimumRelFloor,
      parity_threshold_profile_ref: profileRef,
      reason_codes: ["PARITY_COMPARISON_SET_EMPTY"],
    });
  }

  const seen = new Set<string>();
  const normalizedFields: ParityFieldComparisonInput[] = [];
  for (const field of input.threshold_profile.fields) {
    try {
      const fieldCode = requireString("parity.field_code", field.field_code);
      if (seen.has(fieldCode)) {
        return invalidResult({
          blocking_ratio_cap: blockingRatioCap,
          minimum_rel_floor: minimumRelFloor,
          parity_threshold_profile_ref: profileRef,
          reason_codes: ["PARITY_COMPARISON_FIELD_DUPLICATE"],
        });
      }
      seen.add(fieldCode);
      if (!Number.isFinite(field.criticality_weight) || field.criticality_weight <= 0) {
        throw new ComparisonSetBuilderError(
          "PARITY_COMPARISON_SET_INVALID",
          "criticality_weight must be positive",
        );
      }
      if (!Number.isFinite(field.rel_threshold) || field.rel_threshold < 0) {
        throw new ComparisonSetBuilderError(
          "PARITY_COMPARISON_SET_INVALID",
          "rel_threshold must be non-negative",
        );
      }
      const absFloor = canonicalMoneyString({
        money_profile: input.money_profile,
        value: field.abs_floor,
      });
      const absThreshold = canonicalMoneyString({
        money_profile: input.money_profile,
        value: field.abs_threshold,
      });
      if (isNonPositiveMoney(absFloor) || isNegativeMoney(absThreshold)) {
        throw new ComparisonSetBuilderError(
          "PARITY_COMPARISON_SET_INVALID",
          "abs_floor must be positive and abs_threshold must be non-negative",
        );
      }
      normalizedFields.push({
        ...field,
        abs_floor: absFloor,
        abs_threshold: absThreshold,
        criticality_class: normalizeCriticality(field.criticality_class),
        field_code: fieldCode,
      });
    } catch {
      return invalidResult({
        blocking_ratio_cap: blockingRatioCap,
        minimum_rel_floor: minimumRelFloor,
        parity_threshold_profile_ref: profileRef,
        reason_codes: ["PARITY_COMPARISON_FIELD_INVALID"],
      });
    }
  }

  return {
    blocking_ratio_cap: blockingRatioCap,
    comparison_set_state: "VALID",
    fields: normalizedFields.sort((left, right) => {
      const rankDelta =
        criticalityRank(right.criticality_class) - criticalityRank(left.criticality_class);
      return rankDelta === 0 ? left.field_code.localeCompare(right.field_code) : rankDelta;
    }),
    minimum_rel_floor: minimumRelFloor,
    parity_threshold_profile_ref: profileRef,
    reason_codes: [],
  };
}
