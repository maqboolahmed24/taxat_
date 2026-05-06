import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { expect, test } from "@playwright/test";

import {
  createCallbackAndWebhookOriginPolicy,
  createDnsAndOriginMatrix,
  createWafAndRateLimitPolicy,
  validateCallbackAndWebhookOriginPolicy,
  validateWafAndRateLimitPolicy,
  type CallbackAndWebhookOriginPolicy,
  type WafAndRateLimitPolicy,
} from "../../../../infra/edge/bootstrap/provision_dns_tls_waf_and_edge_delivery.js";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "..");

async function readJson<T>(segments: string[]): Promise<T> {
  return JSON.parse(await readFile(path.join(repoRoot, ...segments), "utf8")) as T;
}

test("checked-in WAF, rate-limit, and callback policy packs match the builder", async () => {
  const persistedWafPolicy = await readJson<WafAndRateLimitPolicy>([
    "config",
    "edge",
    "waf_and_rate_limit_policy.json",
  ]);
  const persistedCallbackPolicy = await readJson<CallbackAndWebhookOriginPolicy>([
    "config",
    "edge",
    "callback_and_webhook_origin_policy.json",
  ]);

  expect(persistedWafPolicy).toEqual(createWafAndRateLimitPolicy());
  expect(persistedCallbackPolicy).toEqual(createCallbackAndWebhookOriginPolicy());
});

test("callback routes keep explicit allowlists, no-browser-challenge posture, and typed rate limits", () => {
  const matrix = createDnsAndOriginMatrix();
  const wafPolicy = createWafAndRateLimitPolicy();
  const callbackPolicy = createCallbackAndWebhookOriginPolicy();

  validateWafAndRateLimitPolicy(wafPolicy, matrix);
  validateCallbackAndWebhookOriginPolicy(callbackPolicy, matrix);

  const callbackSurfaceRule = wafPolicy.surface_rule_rows.find(
    (row) => row.policy_ref === "waf.callbacks",
  );
  expect(callbackSurfaceRule?.challenge_posture).toBe("ALLOWLIST_AND_NO_BROWSER_CHALLENGE");
  expect(callbackSurfaceRule?.allowlist_refs).toEqual(
    expect.arrayContaining(["allowlist.hmrc-or-relay-egress", "allowlist.postmark-webhooks"]),
  );

  const callbackRateRules = wafPolicy.rate_limit_rows.filter(
    (row) => row.surface_family_ref === "CALLBACKS",
  );
  expect(callbackRateRules).toHaveLength(2);
  expect(callbackRateRules.map((row) => row.policy_ref)).toEqual(
    expect.arrayContaining(["rate.authority-callbacks", "rate.notification-webhooks"]),
  );

  const callbackDnsRows = new Set(
    matrix.host_origin_rows
      .filter((row) => row.surface_family_ref === "CALLBACKS")
      .map((row) => row.row_ref),
  );
  for (const row of callbackPolicy.callback_rows) {
    expect(callbackDnsRows.has(row.dns_origin_row_ref)).toBe(true);
    expect(row.auth_posture).not.toHaveLength(0);
    expect(row.replay_protection).not.toHaveLength(0);
    if (row.kind !== "OAUTH_REDIRECT") {
      expect(row.allowlist_ref_or_null).not.toBeNull();
    }
  }

  const apiMutationRate = wafPolicy.rate_limit_rows.find(
    (row) => row.policy_ref === "rate.api-mutations",
  );
  expect(apiMutationRate?.action_on_threshold).toBe("BLOCK");

  const streamRate = wafPolicy.rate_limit_rows.find(
    (row) => row.policy_ref === "rate.api-stream-handshake",
  );
  expect(streamRate?.action_on_threshold).toBe("LOG_ONLY");
});
