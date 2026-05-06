import { execFile } from "node:child_process";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";

import { expect, test } from "@playwright/test";

import { loadRuntimeProfile } from "../../../packages/runtime-foundation/src/load_runtime_profile.ts";
import { resolveSecretHandleValue } from "../../../packages/runtime-foundation/src/secret_handle.ts";

const execFileAsync = promisify(execFile);
const repoRoot = "/Users/test/Code/taxat_";
const pythonRuntimeModuleRoot = path.join(repoRoot, "python", "validators", "src");

function handlePayload(aliasRef: string, namespaceRef: string, providerEnvironmentRef = "sandbox") {
  return JSON.stringify({
    alias_ref: aliasRef,
    namespace_ref: namespaceRef,
    store_ref: `vault://${namespaceRef}`,
    metadata_ref: `metadata://${aliasRef}`,
    version_ref: "v1",
    fingerprint: `sha256:${aliasRef.slice(0, 12)}`,
    handle_ref: `handle://${aliasRef}`,
    provider_environment_ref: providerEnvironmentRef,
  });
}

test("server runtime can resolve lawful secret handles through the provider boundary without serializing raw values", async () => {
  const profile = await loadRuntimeProfile({
    consumerRef: "API",
    frozenConfigValues: {
      TAXAT_ENVIRONMENT_ID: "env_shared_sandbox_integration",
      TAXAT_PROVIDER_ENVIRONMENT: "sandbox",
      TAXAT_CONFIG_FREEZE_REF: "cfg_2026_04_23_sandbox",
      TAXAT_CONFIG_FREEZE_HASH: "sha256:freeze-hash",
      TAXAT_CONFIG_SURFACE_HASH: "sha256:surface-hash",
      TAXAT_CONFIG_CONSUMPTION_MODE: "FROZEN_CONFIG_ONLY",
      TAXAT_SESSION_IDLE_TIMEOUT_SECONDS: "1200",
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
  });

  const handle = profile.secretHandles.TAXAT_SECRET_REF_POSTGRES_CONTROL_STORE_PASSWORD;
  const resolved = await resolveSecretHandleValue(
    handle,
    {
      async resolveSecret(secretHandle) {
        return {
          resolved_from: secretHandle.handleRef ?? "fixture-provider",
          value: "postgres-control-raw-secret",
        };
      },
    },
    "API",
  );

  expect(profile.environmentRef).toBe("env_shared_sandbox_integration");
  expect(handle.aliasRef).toBe("alias.runtime.postgresql.control-store.password");
  expect(JSON.stringify(handle.toJSON())).not.toContain("postgres-control-raw-secret");
  expect(resolved.redacted.placeholder).toBe("[redacted]");
  expect(resolved.redacted.fingerprint).toMatch(/^sha256:/);
});

test("python tooling can consume the same metadata-only handle contract through local bootstrap", async () => {
  const tempDir = await mkdtemp(path.join(os.tmpdir(), "taxat-runtime-profile-"));
  const bootstrapPath = path.join(tempDir, "runtime-handles.json");

  try {
    await writeFile(
      bootstrapPath,
      `${JSON.stringify(
        {
          TAXAT_SECRET_REF_REDACTION_DICTIONARY: JSON.parse(
            handlePayload("alias.provisioning.redaction-dictionary", "sec_local_authoring", "NONE"),
          ),
        },
        null,
        2,
      )}\n`,
      "utf8",
    );

    const { stdout } = await execFileAsync(
      path.join(repoRoot, ".venv", "bin", "python3"),
      [
        "-c",
        [
          "import json, os, sys",
          `sys.path.insert(0, ${JSON.stringify(pythonRuntimeModuleRoot)})`,
          "from taxat_validators.runtime_profile import load_python_runtime_profile",
          "print(json.dumps(load_python_runtime_profile(), indent=2))",
        ].join("; "),
      ],
      {
        cwd: repoRoot,
        env: {
          ...process.env,
          TAXAT_ENVIRONMENT_ID: "env_local_authoring",
          TAXAT_PROVIDER_ENVIRONMENT: "NONE",
          TAXAT_ENABLE_STRICT_TRACE_REDACTION: "true",
          TAXAT_LOCAL_SECRET_BOOTSTRAP_FILE: bootstrapPath,
        },
        maxBuffer: 16 * 1024 * 1024,
      },
    );

    const parsed = JSON.parse(stdout);
    expect(parsed.consumer_ref).toBe("PYTHON");
    expect(parsed.secret_handles.TAXAT_SECRET_REF_REDACTION_DICTIONARY.alias_ref).toBe(
      "alias.provisioning.redaction-dictionary",
    );
    expect(stdout).not.toContain("plaintext");
    expect(stdout).not.toContain("client_secret");
  } finally {
    await rm(tempDir, { recursive: true });
  }
});

test("playwright automation fails closed when a raw client-secret handle leaks into its env surface", async () => {
  await expect(
    loadRuntimeProfile({
      consumerRef: "PLAYWRIGHT",
      env: {
        TAXAT_ENVIRONMENT_ID: "env_local_provisioning_workstation",
        TAXAT_PROVIDER_ENVIRONMENT: "sandbox",
        TAXAT_HMRC_API_BASE_URL: "https://test-api.service.hmrc.gov.uk",
        TAXAT_ENABLE_STRICT_TRACE_REDACTION: "true",
        TAXAT_BROWSER_PUBLIC_BASE_URL: "http://localhost:4173",
        TAXAT_BROWSER_PUBLIC_ENVIRONMENT_LABEL: "Local provisioning workstation",
        TAXAT_BROWSER_PUBLIC_RELEASE_CHANNEL: "local",
        TAXAT_BROWSER_PUBLIC_BUILD_SHA: "dev-build-sha",
        TAXAT_SECRET_REF_IDP_BROWSER_CLIENT_SECRET: handlePayload(
          "alias.identity.idp.browser.client-secret",
          "sec_sandbox_runtime",
        ),
      },
    }),
  ).rejects.toMatchObject({
    code: "RUNTIME_ENV_KEY_FORBIDDEN",
    envKey: "TAXAT_SECRET_REF_IDP_BROWSER_CLIENT_SECRET",
  });
});
