import { parseExactDecimal } from "../../../domain-kernel/src/primitives/decimal.ts";
import {
  canonicalMoneyString,
  compareMoneyValues,
  type ComputeMoneyProfile,
  type ComputeMoneyValue,
} from "./exact_decimal.ts";

export type BreachRatioComponents = {
  breach_abs: number;
  breach_rel: number;
  breach_ratio: number;
};

export type BreachRatioInput = {
  abs_threshold: ComputeMoneyValue;
  blocking_ratio_cap?: number;
  delta_abs: ComputeMoneyValue;
  delta_rel: number;
  rel_threshold: number;
};

export class BreachRatioError extends Error {
  readonly code:
    | "PARITY_BREACH_RATIO_INVALID_THRESHOLD"
    | "PARITY_BREACH_RATIO_INVALID_VALUE";

  constructor(code: BreachRatioError["code"], detail: string) {
    super(`${code}: ${detail}`);
    this.name = "BreachRatioError";
    this.code = code;
  }
}

function decimalToNumber(value: ComputeMoneyValue) {
  const parsed = parseExactDecimal(value);
  const numeric = Number(parsed.toCanonicalString());
  if (!Number.isFinite(numeric)) {
    throw new BreachRatioError(
      "PARITY_BREACH_RATIO_INVALID_VALUE",
      "money value cannot be represented as a finite ratio input",
    );
  }
  return numeric;
}

export function isZeroMoney(value: ComputeMoneyValue) {
  return parseExactDecimal(value).unscaled === 0n;
}

export function maxMoneyValue(
  moneyProfile: ComputeMoneyProfile,
  values: readonly ComputeMoneyValue[],
): ComputeMoneyValue {
  if (values.length === 0) {
    throw new BreachRatioError(
      "PARITY_BREACH_RATIO_INVALID_VALUE",
      "maxMoneyValue requires at least one value",
    );
  }
  return values.reduce((current, value) =>
    compareMoneyValues(value, current) > 0
      ? canonicalMoneyString({ money_profile: moneyProfile, value })
      : current,
  canonicalMoneyString({ money_profile: moneyProfile, value: values[0] }));
}

export function divideMoneyValues(input: {
  denominator: ComputeMoneyValue;
  numerator: ComputeMoneyValue;
}) {
  if (isZeroMoney(input.denominator)) {
    throw new BreachRatioError(
      "PARITY_BREACH_RATIO_INVALID_THRESHOLD",
      "money ratio denominator must be non-zero",
    );
  }
  return decimalToNumber(input.numerator) / decimalToNumber(input.denominator);
}

export function calculateBreachRatio(input: BreachRatioInput): BreachRatioComponents {
  const blockingRatioCap = input.blocking_ratio_cap ?? 3;
  if (!Number.isFinite(blockingRatioCap) || blockingRatioCap < 2.5) {
    throw new BreachRatioError(
      "PARITY_BREACH_RATIO_INVALID_THRESHOLD",
      "blocking_ratio_cap must be finite and at least 2.5",
    );
  }
  if (!Number.isFinite(input.delta_rel) || input.delta_rel < 0) {
    throw new BreachRatioError(
      "PARITY_BREACH_RATIO_INVALID_VALUE",
      "delta_rel must be finite and non-negative",
    );
  }
  if (!Number.isFinite(input.rel_threshold) || input.rel_threshold < 0) {
    throw new BreachRatioError(
      "PARITY_BREACH_RATIO_INVALID_THRESHOLD",
      "rel_threshold must be finite and non-negative",
    );
  }
  const deltaAbsIsZero = isZeroMoney(input.delta_abs);
  const absThresholdIsZero = isZeroMoney(input.abs_threshold);
  const breachAbs = absThresholdIsZero
    ? deltaAbsIsZero
      ? 0
      : blockingRatioCap
    : divideMoneyValues({
        denominator: input.abs_threshold,
        numerator: input.delta_abs,
      });
  const breachRel =
    input.rel_threshold === 0
      ? input.delta_rel === 0
        ? 0
        : blockingRatioCap
      : input.delta_rel / input.rel_threshold;
  const breachRatio = Math.max(breachAbs, breachRel);
  if (!Number.isFinite(breachRatio) || breachRatio < 0) {
    throw new BreachRatioError(
      "PARITY_BREACH_RATIO_INVALID_VALUE",
      "breach_ratio must be finite and non-negative",
    );
  }
  return {
    breach_abs: breachAbs,
    breach_rel: breachRel,
    breach_ratio: breachRatio,
  };
}
