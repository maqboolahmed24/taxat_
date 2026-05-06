import { expect, test } from "@playwright/test";

import {
  ExactDecimalError,
  addExactDecimals,
  asTaxatId,
  canonicalJsonStringify,
  compareExactDecimals,
  normalizeBusinessDateString,
  normalizeBusinessPeriodLabel,
  normalizeUtcInstantString,
  parseExactDecimal,
  stableJsonHash,
  stablePath,
  stableQueryString,
  subtractExactDecimals,
  TimeError,
} from "../../../packages/domain-kernel/src/primitives/index.ts";

test("identifier helpers preserve lawful punctuation instead of inventing regex narrowing", () => {
  expect(asTaxatId("tenant.shared-sandbox/2026-04", "tenant")).toBe(
    "tenant.shared-sandbox/2026-04",
  );
});

test("canonical hash helpers normalize Unicode, sort object keys, preserve array order, and encode query/path deterministically", () => {
  const payload = {
    beta: "Cafe\u0301",
    alpha: ["late", "amendment"],
    explicit: null,
  };

  expect(canonicalJsonStringify(payload)).toBe(
    '{"alpha":["late","amendment"],"beta":"Caf\\u00e9","explicit":null}',
  );
  expect(stableJsonHash(payload)).toBe(
    "e7e7594681f9641e3055256de1102963a47c2cd68eb93179c52f5d761c13bab8",
  );
  expect(
    stableJsonHash({
      ...payload,
      alpha: ["amendment", "late"],
    }),
  ).not.toBe("e7e7594681f9641e3055256de1102963a47c2cd68eb93179c52f5d761c13bab8");

  expect(
    stableQueryString({
      obligation_ref: "obl-2026-q2",
      tags: ["late", "amendment"],
      view: "summary",
    }),
  ).toBe("obligation_ref=obl-2026-q2&tags=late&tags=amendment&view=summary");
  expect(
    stablePath("/organisations/{org_id}/obligations/{obligation_id}", {
      org_id: "org 42",
      obligation_id: "obl/2026-Q2",
    }),
  ).toBe("/organisations/org%2042/obligations/obl%2F2026-Q2");
});

test("exact decimals preserve scale and reject negative zero, exponent notation, and lossy number inputs", () => {
  expect(parseExactDecimal("120.3400").toCanonicalString()).toBe("120.3400");
  expect(addExactDecimals("1.20", "0.003").toCanonicalString()).toBe("1.203");
  expect(addExactDecimals("1.20", "0.30", 2).toCanonicalString()).toBe("1.50");
  expect(subtractExactDecimals("5.50", "1.25").toCanonicalString()).toBe("4.25");
  expect(compareExactDecimals("1.20", "1.2")).toBe(0);

  expect(() => parseExactDecimal("-0.00")).toThrowError(ExactDecimalError);
  expect(() => parseExactDecimal("1e3")).toThrowError(ExactDecimalError);
  expect(() => parseExactDecimal("1,23")).toThrowError(ExactDecimalError);
  expect(() => parseExactDecimal(1.23)).toThrowError(ExactDecimalError);
});

test("time helpers normalize UTC instants and reject timezone-free or malformed business labels", () => {
  expect(normalizeUtcInstantString("2026-04-23T10:15:00+01:00")).toBe("2026-04-23T09:15:00Z");
  expect(normalizeUtcInstantString("2026-04-23T09:15:00.120+00:00")).toBe(
    "2026-04-23T09:15:00.120Z",
  );
  expect(normalizeBusinessDateString("2026-04-23")).toBe("2026-04-23");
  expect(normalizeBusinessPeriodLabel("2026-04", "CALENDAR_MONTH")).toBe("2026-04");
  expect(normalizeBusinessPeriodLabel("2026-Q2", "CALENDAR_QUARTER")).toBe("2026-Q2");
  expect(normalizeBusinessPeriodLabel("2026-2027", "TAX_YEAR")).toBe("2026-2027");

  expect(() => normalizeUtcInstantString("2026-04-23T09:15:00")).toThrowError(TimeError);
  expect(() => normalizeBusinessDateString("2026-02-30")).toThrowError(TimeError);
  expect(() => normalizeBusinessPeriodLabel("2026-2028", "TAX_YEAR")).toThrowError(TimeError);
});
