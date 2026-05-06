import { parseExactDecimal } from "../../../domain-kernel/src/primitives/decimal.ts";
import {
  type ParityComparisonRequirement,
  type ParityCriticalityClass,
  type ParityFieldClass,
  type ParityFieldDeltaRecord,
} from "../models/parity_result.ts";
import {
  canonicalMoneyString,
  compareMoneyValues,
  type ComputeMoneyProfile,
  type ComputeMoneyValue,
} from "./exact_decimal.ts";
import { calculateBreachRatio, divideMoneyValues, maxMoneyValue } from "./calculate_breach_ratio.ts";

export type ParityFieldComparisonInput = {
  abs_floor: ComputeMoneyValue;
  abs_threshold: ComputeMoneyValue;
  authority_value?: ComputeMoneyValue | null;
  criticality_class: ParityCriticalityClass;
  criticality_weight: number;
  field_code: string;
  internal_value?: ComputeMoneyValue | null;
  rel_threshold: number;
};

export type BuildFieldDeltaInput = {
  blocking_ratio_cap?: number;
  comparison_requirement: ParityComparisonRequirement;
  field: ParityFieldComparisonInput;
  minimum_rel_floor: ComputeMoneyValue;
  money_profile: ComputeMoneyProfile;
};

export class BuildFieldDeltaError extends Error {
  readonly code: "PARITY_FIELD_DELTA_INVALID_INPUT";

  constructor(code: BuildFieldDeltaError["code"], detail: string) {
    super(`${code}: ${detail}`);
    this.name = "BuildFieldDeltaError";
    this.code = code;
  }
}

function requireString(label: string, value: unknown) {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new BuildFieldDeltaError(
      "PARITY_FIELD_DELTA_INVALID_INPUT",
      `${label} must be a non-empty string`,
    );
  }
  return value.trim().normalize("NFC");
}

function tryCanonicalMoney(
  moneyProfile: ComputeMoneyProfile,
  value: ComputeMoneyValue | null | undefined,
) {
  if (value === null || value === undefined) {
    return null;
  }
  try {
    return canonicalMoneyString({ money_profile: moneyProfile, value });
  } catch {
    return null;
  }
}

function mustCanonicalMoney(
  label: string,
  moneyProfile: ComputeMoneyProfile,
  value: ComputeMoneyValue,
) {
  try {
    return canonicalMoneyString({ money_profile: moneyProfile, value });
  } catch (error) {
    throw new BuildFieldDeltaError(
      "PARITY_FIELD_DELTA_INVALID_INPUT",
      `${label} is not a valid money value: ${error instanceof Error ? error.message : "unknown"}`,
    );
  }
}

function classifyField(breachRatio: number): ParityFieldClass {
  if (breachRatio < 0.25) {
    return "MATCH";
  }
  if (breachRatio < 1) {
    return "MINOR_DIFFERENCE";
  }
  if (breachRatio < 2.5) {
    return "MATERIAL_DIFFERENCE";
  }
  return "BLOCKING_DIFFERENCE";
}

function reasonForFieldClass(fieldClass: ParityFieldClass) {
  switch (fieldClass) {
    case "MATCH":
      return "PARITY_FIELD_MATCH";
    case "MINOR_DIFFERENCE":
      return "PARITY_FIELD_MINOR_DIFFERENCE";
    case "MATERIAL_DIFFERENCE":
      return "PARITY_FIELD_MATERIAL_DIFFERENCE";
    case "BLOCKING_DIFFERENCE":
      return "PARITY_FIELD_BLOCKING_DIFFERENCE";
    case "NOT_COMPARABLE":
      return "PARITY_FIELD_NOT_COMPARABLE";
  }
}

function absMoney(moneyProfile: ComputeMoneyProfile, value: ComputeMoneyValue) {
  return canonicalMoneyString({
    money_profile: moneyProfile,
    value: parseExactDecimal(value).abs(),
  });
}

function isNegativeMoney(value: ComputeMoneyValue) {
  return compareMoneyValues(value, "0") < 0;
}

function isNonPositiveMoney(value: ComputeMoneyValue) {
  return compareMoneyValues(value, "0") <= 0;
}

function roundRatio(value: number) {
  return Number(value.toFixed(12));
}

export function buildFieldDelta(input: BuildFieldDeltaInput): ParityFieldDeltaRecord {
  const fieldCode = requireString("parity.field_code", input.field.field_code);
  const absThreshold = mustCanonicalMoney(
    "parity.abs_threshold",
    input.money_profile,
    input.field.abs_threshold,
  );
  const absFloor = mustCanonicalMoney("parity.abs_floor", input.money_profile, input.field.abs_floor);
  const minimumRelFloor = mustCanonicalMoney(
    "parity.minimum_rel_floor",
    input.money_profile,
    input.minimum_rel_floor,
  );
  if (
    isNegativeMoney(absThreshold) ||
    isNonPositiveMoney(absFloor) ||
    isNonPositiveMoney(minimumRelFloor)
  ) {
    throw new BuildFieldDeltaError(
      "PARITY_FIELD_DELTA_INVALID_INPUT",
      "abs_threshold must be non-negative and floors must be positive",
    );
  }
  const effectiveAbsFloor = maxMoneyValue(input.money_profile, [absFloor, minimumRelFloor]);
  const internalValue = tryCanonicalMoney(input.money_profile, input.field.internal_value);
  const authorityValue = tryCanonicalMoney(input.money_profile, input.field.authority_value);

  if (!Number.isFinite(input.field.criticality_weight) || input.field.criticality_weight <= 0) {
    throw new BuildFieldDeltaError(
      "PARITY_FIELD_DELTA_INVALID_INPUT",
      "criticality_weight must be positive",
    );
  }
  if (!Number.isFinite(input.field.rel_threshold) || input.field.rel_threshold < 0) {
    throw new BuildFieldDeltaError(
      "PARITY_FIELD_DELTA_INVALID_INPUT",
      "rel_threshold must be finite and non-negative",
    );
  }

  if (internalValue === null) {
    return {
      abs_floor: absFloor,
      abs_threshold: absThreshold,
      authority_value: authorityValue,
      breach_ratio: null,
      comparison_input_state: "INVALID_INPUT",
      criticality_class: input.field.criticality_class,
      criticality_weight: input.field.criticality_weight,
      delta_abs: null,
      delta_rel: null,
      delta_signed: null,
      effective_abs_floor: effectiveAbsFloor,
      field_class: "NOT_COMPARABLE",
      field_code: fieldCode,
      internal_value: null,
      reason_codes: ["PARITY_FIELD_INVALID_INPUT"],
      rel_threshold: input.field.rel_threshold,
    };
  }

  if (authorityValue === null && input.comparison_requirement !== "NOT_REQUIRED") {
    return {
      abs_floor: absFloor,
      abs_threshold: absThreshold,
      authority_value: null,
      breach_ratio: null,
      comparison_input_state: "AUTHORITY_MISSING",
      criticality_class: input.field.criticality_class,
      criticality_weight: input.field.criticality_weight,
      delta_abs: null,
      delta_rel: null,
      delta_signed: null,
      effective_abs_floor: effectiveAbsFloor,
      field_class: "NOT_COMPARABLE",
      field_code: fieldCode,
      internal_value: internalValue,
      reason_codes: ["PARITY_AUTHORITY_VALUE_MISSING"],
      rel_threshold: input.field.rel_threshold,
    };
  }

  if (authorityValue === null) {
    return {
      abs_floor: absFloor,
      abs_threshold: absThreshold,
      authority_value: null,
      breach_ratio: null,
      comparison_input_state: "AUTHORITY_MISSING",
      criticality_class: input.field.criticality_class,
      criticality_weight: input.field.criticality_weight,
      delta_abs: null,
      delta_rel: null,
      delta_signed: null,
      effective_abs_floor: effectiveAbsFloor,
      field_class: "NOT_COMPARABLE",
      field_code: fieldCode,
      internal_value: internalValue,
      reason_codes: ["PARITY_AUTHORITY_VALUE_MISSING"],
      rel_threshold: input.field.rel_threshold,
    };
  }

  const deltaSignedDecimal = parseExactDecimal(internalValue).subtract(authorityValue);
  const deltaSigned = canonicalMoneyString({
    money_profile: input.money_profile,
    value: deltaSignedDecimal,
  });
  const deltaAbs = canonicalMoneyString({
    money_profile: input.money_profile,
    value: deltaSignedDecimal.abs(),
  });
  const relativeDenominator = maxMoneyValue(input.money_profile, [
    absMoney(input.money_profile, authorityValue),
    absMoney(input.money_profile, internalValue),
    effectiveAbsFloor,
  ]);
  const deltaRel = divideMoneyValues({
    denominator: relativeDenominator,
    numerator: deltaAbs,
  });
  const breach = calculateBreachRatio({
    abs_threshold: absThreshold,
    ...(input.blocking_ratio_cap === undefined
      ? {}
      : { blocking_ratio_cap: input.blocking_ratio_cap }),
    delta_abs: deltaAbs,
    delta_rel: deltaRel,
    rel_threshold: input.field.rel_threshold,
  });
  const fieldClass = classifyField(breach.breach_ratio);
  return {
    abs_floor: absFloor,
    abs_threshold: absThreshold,
    authority_value: authorityValue,
    breach_ratio: roundRatio(breach.breach_ratio),
    comparison_input_state: "COMPARABLE",
    criticality_class: input.field.criticality_class,
    criticality_weight: input.field.criticality_weight,
    delta_abs: deltaAbs,
    delta_rel: roundRatio(deltaRel),
    delta_signed: deltaSigned,
    effective_abs_floor: effectiveAbsFloor,
    field_class: fieldClass,
    field_code: fieldCode,
    internal_value: internalValue,
    reason_codes: [reasonForFieldClass(fieldClass)],
    rel_threshold: input.field.rel_threshold,
  };
}
