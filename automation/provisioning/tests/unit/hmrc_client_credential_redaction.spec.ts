import { test, expect } from "@playwright/test";

import {
  createDefaultRedactionRules,
  redactStructuredValue,
} from "../../src/core/redaction.js";
import {
  assertNoRawCredentialPersistence,
} from "../../src/providers/hmrc/flows/export_client_credentials_to_vault.js";

test("structured redaction removes raw HMRC client identifiers and one-time secrets", () => {
  const rawClientId = "taxat_sandbox_income_tax_sandbox_client_id";
  const rawSecret = "HMRC-SECRET-FIXTURE-01-ORD1!";
  const result = redactStructuredValue(
    {
      portalCapture: {
        clientId: rawClientId,
        revealedSecret: rawSecret,
      },
      evidence: {
        vaultReceipt: "vault-write://sec_local_provisioning_sandbox/7dd55a3ff207",
      },
    },
    createDefaultRedactionRules([rawClientId, rawSecret]),
  );

  expect(result.value).toEqual({
    portalCapture: {
      clientId: "[REDACTED_SECRET]",
      revealedSecret: "[REDACTED_SECRET]",
    },
    evidence: {
      vaultReceipt: "vault-write://sec_local_provisioning_sandbox/7dd55a3ff207",
    },
  });
  expect(result.notes).toEqual(
    expect.arrayContaining([
      expect.objectContaining({ category: "SECRET", matchCount: 1 }),
    ]),
  );
});

test("raw credential persistence guard fails closed when repo-safe output contains a secret", () => {
  expect(() =>
    assertNoRawCredentialPersistence(
      {
        safeRef: "vault://kv/taxat/sandbox/client-secret/current",
        leakedSecret: "HMRC-SECRET-FIXTURE-01-ORD1!",
      },
      ["HMRC-SECRET-FIXTURE-01-ORD1!"],
    ),
  ).toThrow(/Credential persistence check failed/i);
});

test("raw credential persistence guard permits alias and vault-ref only outputs", () => {
  expect(() =>
    assertNoRawCredentialPersistence(
      {
        clientIdAlias: "hmrc-client-id-taxat-sandbox-income-tax",
        fingerprint:
          "sha256:95bbf17cb6d7a3f6338584dc5af41fedf830f7af406f3c91b43a46af1427dcdd",
        vaultRef:
          "vault://kv/taxat/sandbox/authority/web_app_via_server/hmrc-client-secret/hmrc/taxat-sandbox-income-tax/client-secret/secver-taxat-sandbox-income-tax-001",
      },
      ["HMRC-SECRET-FIXTURE-01-ORD1!", "taxat_sandbox_income_tax_sandbox_client_id"],
    ),
  ).not.toThrow();
});
