export type ExactDecimalString = string;

export const EXACT_DECIMAL_PATTERN = /^-?(0|[1-9]\d*)(\.\d+)?$/;

type ExactDecimalErrorInit = {
  code:
    | "DECIMAL_NEGATIVE_ZERO_FORBIDDEN"
    | "DECIMAL_NON_STRING_INPUT"
    | "DECIMAL_NON_CANONICAL_LITERAL"
    | "DECIMAL_SCALE_TRUNCATION";
  detail: string;
};

export class ExactDecimalError extends Error {
  readonly code: ExactDecimalErrorInit["code"];

  constructor(init: ExactDecimalErrorInit) {
    super(`${init.code}: ${init.detail}`);
    this.name = "ExactDecimalError";
    this.code = init.code;
  }
}

function powerOfTen(exponent: number) {
  return 10n ** BigInt(exponent);
}

function parseLiteralParts(value: string) {
  const negative = value.startsWith("-");
  const unsigned = negative ? value.slice(1) : value;
  const [integerPart, fractionalPart = ""] = unsigned.split(".", 2);
  const scale = fractionalPart.length;
  const digits = `${integerPart}${fractionalPart}`;
  const unscaled = BigInt(digits) * (negative ? -1n : 1n);
  return {
    scale,
    unscaled,
  };
}

function formatLiteral(unscaled: bigint, scale: number): ExactDecimalString {
  const negative = unscaled < 0n;
  const absoluteDigits = (negative ? -unscaled : unscaled).toString();
  const paddedDigits = scale > 0 ? absoluteDigits.padStart(scale + 1, "0") : absoluteDigits;
  const wholePart = scale === 0 ? paddedDigits : paddedDigits.slice(0, -scale);
  const fractionPart = scale === 0 ? "" : paddedDigits.slice(-scale);
  const literal =
    scale === 0 ? wholePart : `${wholePart.length > 0 ? wholePart : "0"}.${fractionPart}`;
  return `${negative ? "-" : ""}${literal}`;
}

function normalizeOperand(value: ExactDecimal | ExactDecimalString) {
  return value instanceof ExactDecimal ? value : ExactDecimal.parse(value);
}

export class ExactDecimal {
  readonly unscaled: bigint;
  readonly scale: number;

  private constructor(unscaled: bigint, scale: number) {
    this.unscaled = unscaled;
    this.scale = scale;
  }

  static fromParts(unscaled: bigint, scale: number) {
    if (scale < 0) {
      throw new ExactDecimalError({
        code: "DECIMAL_SCALE_TRUNCATION",
        detail: "scale must be zero or greater",
      });
    }
    if (unscaled === 0n) {
      return new ExactDecimal(0n, scale);
    }
    return new ExactDecimal(unscaled, scale);
  }

  static parse(value: unknown) {
    if (typeof value !== "string") {
      throw new ExactDecimalError({
        code: "DECIMAL_NON_STRING_INPUT",
        detail: "exact decimals are parsed from canonical string literals only",
      });
    }

    if (!EXACT_DECIMAL_PATTERN.test(value)) {
      throw new ExactDecimalError({
        code: "DECIMAL_NON_CANONICAL_LITERAL",
        detail: "exact decimals must use canonical strings with no exponent or locale separators",
      });
    }

    const parsed = parseLiteralParts(value);
    if (value.startsWith("-") && parsed.unscaled === 0n) {
      throw new ExactDecimalError({
        code: "DECIMAL_NEGATIVE_ZERO_FORBIDDEN",
        detail: "negative zero serialization is forbidden",
      });
    }

    return new ExactDecimal(parsed.unscaled, parsed.scale);
  }

  static zero(scale = 0) {
    return new ExactDecimal(0n, scale);
  }

  toCanonicalString(): ExactDecimalString {
    return formatLiteral(this.unscaled, this.scale);
  }

  compare(other: ExactDecimal | ExactDecimalString) {
    const candidate = normalizeOperand(other);
    const resultScale = Math.max(this.scale, candidate.scale);
    const left = this.withScale(resultScale).unscaled;
    const right = candidate.withScale(resultScale).unscaled;

    if (left < right) {
      return -1;
    }
    if (left > right) {
      return 1;
    }
    return 0;
  }

  equalsNumeric(other: ExactDecimal | ExactDecimalString) {
    return this.compare(other) === 0;
  }

  equalsRepresentation(other: ExactDecimal | ExactDecimalString) {
    const candidate = normalizeOperand(other);
    return this.scale === candidate.scale && this.unscaled === candidate.unscaled;
  }

  withScale(scale: number) {
    if (scale === this.scale) {
      return this;
    }
    if (scale > this.scale) {
      return new ExactDecimal(this.unscaled * powerOfTen(scale - this.scale), scale);
    }

    const divisor = powerOfTen(this.scale - scale);
    if (this.unscaled % divisor !== 0n) {
      throw new ExactDecimalError({
        code: "DECIMAL_SCALE_TRUNCATION",
        detail: "rescaling would discard significant fractional digits",
      });
    }
    return new ExactDecimal(this.unscaled / divisor, scale);
  }

  add(other: ExactDecimal | ExactDecimalString, explicitScale?: number) {
    const candidate = normalizeOperand(other);
    const resultScale = explicitScale ?? Math.max(this.scale, candidate.scale);
    return ExactDecimal.fromParts(
      this.withScale(resultScale).unscaled + candidate.withScale(resultScale).unscaled,
      resultScale,
    );
  }

  subtract(other: ExactDecimal | ExactDecimalString, explicitScale?: number) {
    const candidate = normalizeOperand(other);
    const resultScale = explicitScale ?? Math.max(this.scale, candidate.scale);
    return ExactDecimal.fromParts(
      this.withScale(resultScale).unscaled - candidate.withScale(resultScale).unscaled,
      resultScale,
    );
  }

  abs() {
    return new ExactDecimal(this.unscaled < 0n ? -this.unscaled : this.unscaled, this.scale);
  }

  negate() {
    if (this.unscaled === 0n) {
      return this;
    }
    return new ExactDecimal(-this.unscaled, this.scale);
  }

  toJSON() {
    return this.toCanonicalString();
  }
}

export function isCanonicalExactDecimalString(value: unknown): value is ExactDecimalString {
  return (
    typeof value === "string" &&
    EXACT_DECIMAL_PATTERN.test(value) &&
    !/^-(?:0(?:\.0+)?)$/.test(value)
  );
}

export function parseExactDecimal(value: unknown) {
  return ExactDecimal.parse(value);
}

export function compareExactDecimals(
  left: ExactDecimal | ExactDecimalString,
  right: ExactDecimal | ExactDecimalString,
) {
  return normalizeOperand(left).compare(right);
}

export function addExactDecimals(
  left: ExactDecimal | ExactDecimalString,
  right: ExactDecimal | ExactDecimalString,
  explicitScale?: number,
) {
  return normalizeOperand(left).add(right, explicitScale);
}

export function subtractExactDecimals(
  left: ExactDecimal | ExactDecimalString,
  right: ExactDecimal | ExactDecimalString,
  explicitScale?: number,
) {
  return normalizeOperand(left).subtract(right, explicitScale);
}

export function sameDecimalScale(
  left: ExactDecimal | ExactDecimalString,
  right: ExactDecimal | ExactDecimalString,
) {
  return normalizeOperand(left).scale === normalizeOperand(right).scale;
}
