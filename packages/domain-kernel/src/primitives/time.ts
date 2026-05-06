export type ISO8601DateTimeString = string;
export type BusinessDateString = string;
export type BusinessPeriodLabel = string;

export type BusinessPeriodFamily = "CALENDAR_MONTH" | "CALENDAR_QUARTER" | "TAX_YEAR";

const INSTANT_PATTERN =
  /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.(\d{1,3}))?(Z|[+-]\d{2}:\d{2})$/;
const BUSINESS_DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;
const CALENDAR_MONTH_PATTERN = /^\d{4}-(0[1-9]|1[0-2])$/;
const CALENDAR_QUARTER_PATTERN = /^\d{4}-Q[1-4]$/;
const TAX_YEAR_PATTERN = /^(\d{4})-(\d{4})$/;

type TimeErrorInit = {
  code:
    | "TIME_INVALID_BUSINESS_DATE"
    | "TIME_INVALID_INSTANT"
    | "TIME_INVALID_PERIOD_LABEL"
    | "TIME_STRING_REQUIRED";
  detail: string;
};

export class TimeError extends Error {
  readonly code: TimeErrorInit["code"];

  constructor(init: TimeErrorInit) {
    super(`${init.code}: ${init.detail}`);
    this.name = "TimeError";
    this.code = init.code;
  }
}

function assertStringValue(value: unknown, detail: string) {
  if (typeof value !== "string") {
    throw new TimeError({
      code: "TIME_STRING_REQUIRED",
      detail,
    });
  }
  return value;
}

function validateBusinessDateParts(year: number, month: number, day: number) {
  const candidate = new Date(Date.UTC(year, month - 1, day));
  return (
    candidate.getUTCFullYear() === year &&
    candidate.getUTCMonth() === month - 1 &&
    candidate.getUTCDate() === day
  );
}

export function normalizeUtcInstantString(value: unknown): ISO8601DateTimeString {
  const literal = assertStringValue(value, "instants must be provided as ISO-8601 strings");
  if (!INSTANT_PATTERN.test(literal)) {
    throw new TimeError({
      code: "TIME_INVALID_INSTANT",
      detail:
        "instants must include a timezone and use seconds with optional millisecond precision",
    });
  }

  const candidate = new Date(literal);
  if (Number.isNaN(candidate.valueOf())) {
    throw new TimeError({
      code: "TIME_INVALID_INSTANT",
      detail: "instant could not be parsed into a valid UTC-normalized timestamp",
    });
  }

  const iso = candidate.toISOString();
  return iso.endsWith(".000Z") ? iso.replace(".000Z", "Z") : iso;
}

export function parseUtcInstant(value: unknown) {
  return new Date(normalizeUtcInstantString(value));
}

export function normalizeBusinessDateString(value: unknown): BusinessDateString {
  const literal = assertStringValue(value, "business dates must be provided as YYYY-MM-DD strings");
  const match = BUSINESS_DATE_PATTERN.exec(literal);
  if (!match) {
    throw new TimeError({
      code: "TIME_INVALID_BUSINESS_DATE",
      detail: "business dates must use the calendar-safe YYYY-MM-DD shape",
    });
  }

  const year = Number.parseInt(match[1], 10);
  const month = Number.parseInt(match[2], 10);
  const day = Number.parseInt(match[3], 10);
  if (!validateBusinessDateParts(year, month, day)) {
    throw new TimeError({
      code: "TIME_INVALID_BUSINESS_DATE",
      detail: "business date components do not form a valid calendar date",
    });
  }

  return literal;
}

export function normalizeBusinessPeriodLabel(
  value: unknown,
  family: BusinessPeriodFamily,
): BusinessPeriodLabel {
  const literal = assertStringValue(value, "business period labels must be strings");

  switch (family) {
    case "CALENDAR_MONTH":
      if (!CALENDAR_MONTH_PATTERN.test(literal)) {
        throw new TimeError({
          code: "TIME_INVALID_PERIOD_LABEL",
          detail: "calendar month labels must use YYYY-MM",
        });
      }
      return literal;
    case "CALENDAR_QUARTER":
      if (!CALENDAR_QUARTER_PATTERN.test(literal)) {
        throw new TimeError({
          code: "TIME_INVALID_PERIOD_LABEL",
          detail: "calendar quarter labels must use YYYY-Q1 through YYYY-Q4",
        });
      }
      return literal;
    case "TAX_YEAR": {
      const match = TAX_YEAR_PATTERN.exec(literal);
      if (!match) {
        throw new TimeError({
          code: "TIME_INVALID_PERIOD_LABEL",
          detail: "tax year labels must use YYYY-YYYY",
        });
      }
      const startYear = Number.parseInt(match[1], 10);
      const endYear = Number.parseInt(match[2], 10);
      if (endYear !== startYear + 1) {
        throw new TimeError({
          code: "TIME_INVALID_PERIOD_LABEL",
          detail: "tax year labels must advance by one year",
        });
      }
      return literal;
    }
  }
}

export function formatInstantForDisplay(
  value: ISO8601DateTimeString,
  options: Intl.DateTimeFormatOptions & {
    locale: string;
    timeZone: string;
  },
) {
  const { locale, timeZone, ...formatOptions } = options;
  const formatter = new Intl.DateTimeFormat(locale, {
    dateStyle: "medium",
    timeStyle: "short",
    ...formatOptions,
    timeZone,
  });
  return formatter.format(parseUtcInstant(value));
}

export function hoursBetweenInstants(start: unknown, end: unknown) {
  return (parseUtcInstant(end).valueOf() - parseUtcInstant(start).valueOf()) / 3_600_000;
}
