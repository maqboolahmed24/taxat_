import { expect, test } from "@playwright/test";

import { projectBrowserSafeEnv } from "../../../packages/runtime-foundation/src/browser_safe_env.ts";
import {
  loadRuntimePolicySet,
  loadRuntimeProfile,
} from "../../../packages/runtime-foundation/src/load_runtime_profile.ts";
import {
  parseRuntimeScalar,
  type RuntimeKeyDefinition,
} from "../../../packages/runtime-foundation/src/runtime_environment.ts";
import { redactSecretValue } from "../../../packages/runtime-foundation/src/secret_handle.ts";

function definitionByKey(
  policySet: Awaited<ReturnType<typeof loadRuntimePolicySet>>,
  envKey: string,
) {
  const definition = policySet.runtimeEnvironmentCatalog.runtime_key_catalog.find(
    (entry) => entry.env_key === envKey,
  );
  if (!definition) {
    throw new Error(`Missing runtime definition for ${envKey}`);
  }
  return definition as RuntimeKeyDefinition;
}

function handlePayload(aliasRef: string, namespaceRef: string) {
  return JSON.stringify({
    alias_ref: aliasRef,
    namespace_ref: namespaceRef,
    store_ref: `vault://${namespaceRef}`,
    metadata_ref: `metadata://${aliasRef}`,
    version_ref: "v1",
    fingerprint: `sha256:${aliasRef.slice(0, 12)}`,
    handle_ref: `handle://${aliasRef}`,
  });
}

test("parses runtime scalars and redacts resolved secret values without exposing plaintext", async () => {
  const policySet = await loadRuntimePolicySet();

  expect(
    parseRuntimeScalar(
      definitionByKey(policySet, "TAXAT_SESSION_IDLE_TIMEOUT_SECONDS"),
      "1200",
      "API",
      "FROZEN_CONFIG",
    ),
  ).toBe(1200);
  expect(
    parseRuntimeScalar(
      definitionByKey(policySet, "TAXAT_ENABLE_STRICT_TRACE_REDACTION"),
      "true",
      "API",
      "FROZEN_CONFIG",
    ),
  ).toBe(true);

  const redacted = redactSecretValue("super-secret-value");
  expect(redacted.placeholder).toBe("[redacted]");
  expect(redacted.fingerprint).toMatch(/^sha256:/);
  expect(JSON.stringify(redacted)).not.toContain("super-secret-value");
});

test("browser-safe projection rejects keys outside the explicit allowlist", async () => {
  const policySet = await loadRuntimePolicySet();

  expect(() =>
    projectBrowserSafeEnv(
      {
        TAXAT_BROWSER_PUBLIC_BASE_URL: "https://operator-sandbox.taxat.example",
        TAXAT_PROVIDER_ENVIRONMENT: "sandbox",
      },
      policySet.browserSafeEnvAllowlist,
      "BROWSER_BUILD",
    ),
  ).toThrow(/RUNTIME_BROWSER_SAFE_KEY_FORBIDDEN/);
});

test("empty secret handle payloads fail closed with a typed runtime error", async () => {
  await expect(
    loadRuntimeProfile({
      consumerRef: "PYTHON",
      env: {
        TAXAT_ENVIRONMENT_ID: "env_local_authoring",
        TAXAT_PROVIDER_ENVIRONMENT: "NONE",
        TAXAT_ENABLE_STRICT_TRACE_REDACTION: "true",
        TAXAT_SECRET_REF_REDACTION_DICTIONARY: "   ",
      },
    }),
  ).rejects.toMatchObject({
    code: "RUNTIME_ENV_EMPTY",
    envKey: "TAXAT_SECRET_REF_REDACTION_DICTIONARY",
  });
});

test("manifest-governed consumers reject live-env fallback once frozen config is present", async () => {
  await expect(
    loadRuntimeProfile({
      consumerRef: "API",
      env: {
        TAXAT_SESSION_IDLE_TIMEOUT_SECONDS: "1200",
      },
      frozenConfigValues: {
        TAXAT_ENVIRONMENT_ID: "env_shared_sandbox_integration",
        TAXAT_PROVIDER_ENVIRONMENT: "sandbox",
        TAXAT_CONFIG_FREEZE_REF: "cfg_2026_04_23_sandbox",
        TAXAT_CONFIG_FREEZE_HASH: "sha256:freeze-hash",
        TAXAT_CONFIG_SURFACE_HASH: "sha256:surface-hash",
        TAXAT_CONFIG_CONSUMPTION_MODE: "FROZEN_CONFIG_ONLY",
        TAXAT_ENABLE_STRICT_TRACE_REDACTION: "true",
        TAXAT_SECRET_REF_POSTGRES_CONTROL_STORE_PASSWORD: handlePayload(
          "alias.runtime.postgresql.control-store.password",
          "sec_sandbox_runtime",
        ),
        TAXAT_SECRET_REF_POSTGRES_AUDIT_STORE_PASSWORD: handlePayload(
          "alias.runtime.postgresql.audit-store.password",
          "sec_sandbox_runtime",
        ),
        TAXAT_SECRET_REF_IDP_BROWSER_CLIENT_SECRET: handlePayload(
          "alias.identity.idp.browser.client-secret",
          "sec_sandbox_runtime",
        ),
      },
    }),
  ).rejects.toMatchObject({
    code: "RUNTIME_CONFIG_FREEZE_REQUIRED",
    envKey: "TAXAT_SESSION_IDLE_TIMEOUT_SECONDS",
    source: "PROCESS_ENV",
  });
});
