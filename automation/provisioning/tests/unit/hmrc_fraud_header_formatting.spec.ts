import { readFile } from "node:fs/promises";

import { expect, test } from "@playwright/test";

import {
  HMRC_FPH_CONNECTION_METHODS,
} from "../../src/providers/hmrc/clients/fph_validator_client.js";
import {
  serializeFraudHeaderValue,
  serializeMissingFraudHeader,
  type FraudHeaderFieldProfile,
  type FraudHeaderProfile,
} from "../../src/providers/hmrc/flows/validate_fraud_prevention_headers.js";

async function loadProfile(relativePath: string): Promise<FraudHeaderProfile> {
  return JSON.parse(
    await readFile(new URL(relativePath, import.meta.url), "utf8"),
  ) as FraudHeaderProfile;
}

function field(overrides: Partial<FraudHeaderFieldProfile>): FraudHeaderFieldProfile {
  return {
    field_id: "test_field",
    header_name: "Gov-Test-Field",
    value_kind: "SCALAR",
    presence: "MANDATORY",
    encoding_strategy: "RAW",
    collection_timing: "PER_REQUEST",
    collected_by: "TEST",
    serialized_by: "TEST",
    stability_expectation: "REFRESH_PER_REQUEST",
    sensitive_value_policy: "SUMMARY_ONLY_REPO_SAFE",
    missing_data_posture: {
      allowed_after_hmrc_agreement: false,
      serialization_when_missing: "FORBID",
      evidence_requirement: "Test fixture",
    },
    notes: [],
    ...overrides,
  };
}

test("checked-in HMRC profiles expose the expected interactive connection methods and required headers", async () => {
  const webProfile = await loadProfile(
    "../../../../config/authority/hmrc/fraud_profiles/hmrc_web_app_via_server.json",
  );
  const desktopProfile = await loadProfile(
    "../../../../config/authority/hmrc/fraud_profiles/hmrc_desktop_app_via_server.json",
  );

  expect(HMRC_FPH_CONNECTION_METHODS).toEqual(
    expect.arrayContaining(["WEB_APP_VIA_SERVER", "DESKTOP_APP_VIA_SERVER"]),
  );
  expect(webProfile.connection_method).toBe("WEB_APP_VIA_SERVER");
  expect(desktopProfile.connection_method).toBe("DESKTOP_APP_VIA_SERVER");
  expect(webProfile.fields.map((entry) => entry.header_name)).toEqual(
    expect.arrayContaining([
      "Gov-Client-Connection-Method",
      "Gov-Client-Browser-JS-User-Agent",
      "Gov-Vendor-Version",
    ]),
  );
  expect(desktopProfile.fields.map((entry) => entry.header_name)).toEqual(
    expect.arrayContaining([
      "Gov-Client-Connection-Method",
      "Gov-Client-Local-IPs",
      "Gov-Client-MAC-Addresses",
      "Gov-Client-User-Agent",
      "Gov-Vendor-Version",
    ]),
  );
});

test("serializes percent-encoded HMRC fraud-header payloads deterministically", () => {
  expect(
    serializeFraudHeaderValue(
      field({
        value_kind: "KEY_VALUE_PAIRS",
        encoding_strategy: "PERCENT_ENCODE_KV_COMPONENTS",
      }),
      {
        "taxat operator": "alpha/beta 1",
        session: "desktop",
      },
    ),
  ).toBe("session=desktop&taxat%20operator=alpha%2Fbeta%201");

  expect(
    serializeFraudHeaderValue(
      field({
        value_kind: "LIST",
        encoding_strategy: "PERCENT_ENCODE_LIST_ITEMS",
      }),
      ["10.1.2.3", "fe80::1"],
    ),
  ).toBe("10.1.2.3,fe80%3A%3A1");

  expect(
    serializeFraudHeaderValue(
      field({
        value_kind: "LIST_OF_KEY_VALUE_PAIRS",
        encoding_strategy: "PERCENT_ENCODE_LIST_OF_KV_COMPONENTS",
      }),
      [
        {
          type: "TOTP",
          timestamp: "2026-04-18T11:58Z",
          "unique-reference": "abc 123",
        },
      ],
    ),
  ).toBe(
    "timestamp=2026-04-18T11%3A58Z&type=TOTP&unique-reference=abc%20123",
  );
});

test("serializes missing-data posture as omission or empty string instead of placeholders", () => {
  expect(
    serializeMissingFraudHeader(
      field({
        presence: "CONDITIONALLY_UNAVAILABLE",
        missing_data_posture: {
          allowed_after_hmrc_agreement: true,
          serialization_when_missing: "OMIT",
          evidence_requirement: "Gap remains explicit",
        },
      }),
    ),
  ).toBeNull();

  expect(
    serializeMissingFraudHeader(
      field({
        presence: "CONDITIONALLY_UNAVAILABLE",
        missing_data_posture: {
          allowed_after_hmrc_agreement: true,
          serialization_when_missing: "EMPTY_STRING",
          evidence_requirement: "Gap remains explicit",
        },
      }),
    ),
  ).toMatchObject({
    header_name: "Gov-Test-Field",
    value: "",
    disposition: "EMPTY_STRING",
  });

  expect(() =>
    serializeMissingFraudHeader(
      field({
        missing_data_posture: {
          allowed_after_hmrc_agreement: false,
          serialization_when_missing: "FORBID",
          evidence_requirement: "Required",
        },
      }),
    ),
  ).toThrow(/missing/i);
});
