import {
  compareExactDecimals,
  ExactDecimal,
  parseExactDecimal,
  type ExactDecimalString,
} from "../../../domain-kernel/src/primitives/decimal.ts";

export type ComputeRoundingMode = "HALF_UP" | "HALF_EVEN" | "DOWN" | "UP";

export type ComputeMoneyProfile = {
  aggregation_boundary: "DECLARED_AGGREGATION_BOUNDARY_ONLY";
  currency_code: string;
  rounding_mode: ComputeRoundingMode;
  scale: number;
  serialization_profile: "CANONICAL_DECIMAL_STRING_V1";
};

export type ComputeMoneyValue = ExactDecimalString;

export type ExactDecimalComputeErrorCode =
  | "COMPUTE_DECIMAL_INVALID_MONEY_PROFILE"
  | "COMPUTE_DECIMAL_INVALID_VALUE";

export class ExactDecimalComputeError extends Error {
  readonly code: ExactDecimalComputeErrorCode;

  constructor(code: ExactDecimalComputeErrorCode, detail: string) {
    super(`${code}: ${detail}`);
    this.name = "ExactDecimalComputeError";
    this.code = code;
  }
}

function powerOfTen(exponent: number) {
  return 10n ** BigInt(exponent);
}

function normalizeScale(value: unknown) {
  if (!Number.isInteger(value) || typeof value !== "number" || value < 0 || value > 9) {
    throw new ExactDecimalComputeError(
      "COMPUTE_DECIMAL_INVALID_MONEY_PROFILE",
      "money_profile.scale must be an integer between 0 and 9",
    );
  }
  return value;
}

export function normalizeMoneyProfile(input: ComputeMoneyProfile): ComputeMoneyProfile {
  if (!/^[A-Z]{3}$/.test(input.currency_code)) {
    throw new ExactDecimalComputeError(
      "COMPUTE_DECIMAL_INVALID_MONEY_PROFILE",
      "money_profile.currency_code must be a three-letter uppercase ISO code",
    );
  }
  if (
    input.rounding_mode !== "HALF_UP" &&
    input.rounding_mode !== "HALF_EVEN" &&
    input.rounding_mode !== "DOWN" &&
    input.rounding_mode !== "UP"
  ) {
    throw new ExactDecimalComputeError(
      "COMPUTE_DECIMAL_INVALID_MONEY_PROFILE",
      "money_profile.rounding_mode is unsupported",
    );
  }
  if (input.aggregation_boundary !== "DECLARED_AGGREGATION_BOUNDARY_ONLY") {
    throw new ExactDecimalComputeError(
      "COMPUTE_DECIMAL_INVALID_MONEY_PROFILE",
      "money_profile.aggregation_boundary must stay declared-boundary-only",
    );
  }
  if (input.serialization_profile !== "CANONICAL_DECIMAL_STRING_V1") {
    throw new ExactDecimalComputeError(
      "COMPUTE_DECIMAL_INVALID_MONEY_PROFILE",
      "money_profile.serialization_profile must be CANONICAL_DECIMAL_STRING_V1",
    );
  }
  return {
    aggregation_boundary: "DECLARED_AGGREGATION_BOUNDARY_ONLY",
    currency_code: input.currency_code,
    rounding_mode: input.rounding_mode,
    scale: normalizeScale(input.scale),
    serialization_profile: "CANONICAL_DECIMAL_STRING_V1",
  };
}

function incrementAwayFromZero(unscaled: bigint) {
  if (unscaled < 0n) {
    return unscaled - 1n;
  }
  return unscaled + 1n;
}

export function roundExactDecimalToScale(input: {
  money_profile: ComputeMoneyProfile;
  value: ExactDecimal | ComputeMoneyValue;
}) {
  const moneyProfile = normalizeMoneyProfile(input.money_profile);
  const decimal = input.value instanceof ExactDecimal ? input.value : parseExactDecimal(input.value);
  if (decimal.scale <= moneyProfile.scale) {
    return decimal.withScale(moneyProfile.scale);
  }

  const divisor = powerOfTen(decimal.scale - moneyProfile.scale);
  const quotient = decimal.unscaled / divisor;
  const remainder = decimal.unscaled < 0n ? -(decimal.unscaled % divisor) : decimal.unscaled % divisor;
  let rounded = quotient;

  switch (moneyProfile.rounding_mode) {
    case "DOWN":
      break;
    case "UP":
      if (remainder !== 0n) {
        rounded = incrementAwayFromZero(quotient);
      }
      break;
    case "HALF_UP":
      if (remainder * 2n >= divisor) {
        rounded = incrementAwayFromZero(quotient);
      }
      break;
    case "HALF_EVEN": {
      const doubled = remainder * 2n;
      if (doubled > divisor || (doubled === divisor && (quotient < 0n ? -quotient : quotient) % 2n === 1n)) {
        rounded = incrementAwayFromZero(quotient);
      }
      break;
    }
  }

  return ExactDecimal.fromParts(rounded, moneyProfile.scale);
}

export function canonicalMoneyString(input: {
  money_profile: ComputeMoneyProfile;
  value: ExactDecimal | ComputeMoneyValue;
}): ComputeMoneyValue {
  try {
    return roundExactDecimalToScale(input).toCanonicalString();
  } catch (error) {
    throw new ExactDecimalComputeError(
      "COMPUTE_DECIMAL_INVALID_VALUE",
      error instanceof Error ? error.message : "invalid decimal value",
    );
  }
}

export function zeroMoney(moneyProfile: ComputeMoneyProfile): ComputeMoneyValue {
  const normalized = normalizeMoneyProfile(moneyProfile);
  return ExactDecimal.zero(normalized.scale).toCanonicalString();
}

export function sumExactDecimals(values: readonly (ExactDecimal | ComputeMoneyValue)[]) {
  return values.reduce<ExactDecimal>((total, value) => total.add(value), ExactDecimal.zero(0));
}

export function sumMoney(input: {
  money_profile: ComputeMoneyProfile;
  values: readonly (ExactDecimal | ComputeMoneyValue)[];
}): ComputeMoneyValue {
  return canonicalMoneyString({
    money_profile: input.money_profile,
    value: sumExactDecimals(input.values),
  });
}

export function divideMoneyByPositiveInteger(input: {
  divisor: number;
  intermediate_precision?: number;
  value: ComputeMoneyValue;
}) {
  if (!Number.isInteger(input.divisor) || input.divisor <= 0) {
    throw new ExactDecimalComputeError(
      "COMPUTE_DECIMAL_INVALID_VALUE",
      "money divisor must be a positive integer",
    );
  }
  const precision = input.intermediate_precision ?? 12;
  const value = parseExactDecimal(input.value);
  return ExactDecimal.fromParts(
    (value.unscaled * powerOfTen(precision)) / BigInt(input.divisor),
    value.scale + precision,
  );
}

export function multiplyDecimalValues(input: {
  left: ExactDecimal | ComputeMoneyValue;
  right: ExactDecimal | ComputeMoneyValue;
}) {
  const left = input.left instanceof ExactDecimal ? input.left : parseExactDecimal(input.left);
  const right = input.right instanceof ExactDecimal ? input.right : parseExactDecimal(input.right);
  return ExactDecimal.fromParts(left.unscaled * right.unscaled, left.scale + right.scale);
}

export function canonicalDecimalFactor(value: number) {
  if (!Number.isFinite(value)) {
    throw new ExactDecimalComputeError(
      "COMPUTE_DECIMAL_INVALID_VALUE",
      "decimal factor must be finite",
    );
  }
  const fixed = value.toFixed(12);
  return fixed
    .replace(/(\.\d*?[1-9])0+$/, "$1")
    .replace(/\.0+$/, ".0")
    .replace(/^-0\.0$/, "0.0");
}

export function multiplyMoneyByFactor(input: {
  factor: number;
  money_profile: ComputeMoneyProfile;
  value: ExactDecimal | ComputeMoneyValue;
}) {
  const factor = parseExactDecimal(canonicalDecimalFactor(input.factor));
  const value = input.value instanceof ExactDecimal ? input.value : parseExactDecimal(input.value);
  return canonicalMoneyString({
    money_profile: input.money_profile,
    value: multiplyDecimalValues({ left: value, right: factor }),
  });
}

export function multiplyExactDecimalByFactor(input: {
  factor: number;
  value: ExactDecimal | ComputeMoneyValue;
}) {
  const factor = parseExactDecimal(canonicalDecimalFactor(input.factor));
  const value = input.value instanceof ExactDecimal ? input.value : parseExactDecimal(input.value);
  return multiplyDecimalValues({ left: value, right: factor });
}

export function compareMoneyValues(left: ComputeMoneyValue, right: ComputeMoneyValue) {
  return compareExactDecimals(left, right);
}
