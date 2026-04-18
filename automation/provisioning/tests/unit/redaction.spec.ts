import { test, expect } from "@playwright/test";

import {
  createDefaultRedactionRules,
  redactStructuredValue,
  redactText,
} from "../../src/core/redaction.js";

test("redacts plaintext secrets, bearer tokens, and email addresses", () => {
  const rules = createDefaultRedactionRules(["client-secret-123"]);
  const result = redactText(
    "client-secret-123 operator@example.com Bearer abc.def",
    rules,
  );

  expect(result.value).not.toContain("client-secret-123");
  expect(result.value).not.toContain("operator@example.com");
  expect(result.value).not.toContain("Bearer abc.def");
  expect(result.value).toContain("[REDACTED_SECRET]");
  expect(result.value).toContain("[REDACTED_EMAIL]");
  expect(result.value).toContain("Bearer [REDACTED_TOKEN]");
  expect(result.notes).toEqual([
    { ruleId: "exact-secret-1", category: "SECRET", matchCount: 1 },
    { ruleId: "email-address", category: "PII", matchCount: 1 },
    { ruleId: "bearer-token", category: "SECRET", matchCount: 1 },
  ]);
});

test("redacts nested structured values without changing non-sensitive fields", () => {
  const rules = createDefaultRedactionRules(["callback-secret"]);
  const result = redactStructuredValue(
    {
      callbackUri: "https://staging.taxat.test/callback",
      operator: {
        email: "ops@example.com",
        notes: ["Bearer token-123", "callback-secret"],
      },
      unchanged: 42,
    },
    rules,
  );

  expect(result.value).toEqual({
    callbackUri: "https://staging.taxat.test/callback",
    operator: {
      email: "[REDACTED_EMAIL]",
      notes: ["Bearer [REDACTED_TOKEN]", "[REDACTED_SECRET]"],
    },
    unchanged: 42,
  });
  expect(result.notes).toHaveLength(3);
});
