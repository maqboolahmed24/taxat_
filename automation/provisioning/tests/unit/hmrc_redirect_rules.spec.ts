import { expect, test } from "@playwright/test";

import {
  HMRC_REDIRECT_SLOT_BUDGET,
  validateConfiguredRedirectRows,
  validateRegisteredRedirectUri,
  type RedirectInventoryRow,
} from "../../src/providers/hmrc/flows/configure_redirect_uris_and_scopes.js";

function configuredRow(
  redirectUri: string,
  connectionMethod: RedirectInventoryRow["connection_method"],
  slotIndex: number,
): RedirectInventoryRow {
  return {
    slot_index: slotIndex,
    callback_profile_ref: `callback_${slotIndex}`,
    connection_method: connectionMethod,
    environment_ref: "env_shared_sandbox_integration",
    owning_deployable_id: "deployable_test",
    redirect_uri: redirectUri,
    registration_decision: "CONFIGURE_NOW",
    rationale: "Unit-test row",
    host_separation_rule: "Test only",
    provider_ingress_uri_pattern: null,
    source_refs: [
      {
        source: "unit-test",
        rationale: "Unit-test source",
      },
    ],
  };
}

test("accepts canonical HTTPS web and localhost desktop callbacks", () => {
  expect(() =>
    validateRegisteredRedirectUri(
      "https://auth.sandbox.taxat.example/oauth/hmrc/callback",
      "WEB_APP_VIA_SERVER",
    ),
  ).not.toThrow();

  expect(() =>
    validateRegisteredRedirectUri(
      "http://localhost:46080/oauth/hmrc/sandbox/native-callback",
      "DESKTOP_APP_VIA_SERVER",
    ),
  ).not.toThrow();
});

test("rejects wrong-scheme web callbacks", () => {
  expect(() =>
    validateRegisteredRedirectUri(
      "http://auth.sandbox.taxat.example/oauth/hmrc/callback",
      "WEB_APP_VIA_SERVER",
    ),
  ).toThrow(/localhost/i);
});

test("rejects fragment-bearing redirects", () => {
  expect(() =>
    validateRegisteredRedirectUri(
      "https://auth.sandbox.taxat.example/oauth/hmrc/callback#fragment",
      "WEB_APP_VIA_SERVER",
    ),
  ).toThrow(/must not contain a fragment/i);
});

test("rejects IP-address hosts", () => {
  expect(() =>
    validateRegisteredRedirectUri(
      "https://203.0.113.11/oauth/hmrc/callback",
      "WEB_APP_VIA_SERVER",
    ),
  ).toThrow(/must use a DNS name/i);
});

test("rejects duplicate rows and over-budget inventories", () => {
  const duplicateRows = [
    configuredRow(
      "https://auth.sandbox.taxat.example/oauth/hmrc/callback",
      "WEB_APP_VIA_SERVER",
      1,
    ),
    configuredRow(
      "https://auth.sandbox.taxat.example/oauth/hmrc/callback",
      "WEB_APP_VIA_SERVER",
      2,
    ),
  ];

  expect(() => validateConfiguredRedirectRows(duplicateRows)).toThrow(/duplicate/i);

  const overBudgetRows = Array.from({ length: HMRC_REDIRECT_SLOT_BUDGET + 1 }, (_, index) =>
    configuredRow(
      `https://auth${index + 1}.sandbox.taxat.example/oauth/hmrc/callback`,
      "WEB_APP_VIA_SERVER",
      index + 1,
    ),
  );

  expect(() => validateConfiguredRedirectRows(overBudgetRows)).toThrow(/exceeds HMRC's 5-URI limit/i);
});

test("rejects localhost web callbacks and non-localhost desktop callbacks", () => {
  expect(() =>
    validateRegisteredRedirectUri(
      "http://localhost:45080/oauth/hmrc/sandbox/browser-callback",
      "WEB_APP_VIA_SERVER",
    ),
  ).toThrow(/HTTPS redirects/i);

  expect(() =>
    validateRegisteredRedirectUri(
      "https://auth.preprod.taxat.example/oauth/hmrc/native-callback",
      "DESKTOP_APP_VIA_SERVER",
    ),
  ).toThrow(/must use the installed-application localhost pattern/i);
});
