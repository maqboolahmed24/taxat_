import type { RuntimeConsumerRef, RuntimeScalar } from "./runtime_environment.ts";
import { RuntimeEnvironmentError } from "./runtime_environment.ts";

export type BrowserSafeKeyDefinition = {
  env_key: string;
  label: string;
  exposure_class: string;
  allowed_consumer_refs: RuntimeConsumerRef[];
  notes: string[];
};

export type BrowserSafeEnvAllowlist = {
  contract_version: string;
  allowlist_id: string;
  basis_statement: string;
  browser_safe_keys: BrowserSafeKeyDefinition[];
  forbidden_key_prefixes: string[];
};

function allowlistByKey(allowlist: BrowserSafeEnvAllowlist) {
  return new Map(allowlist.browser_safe_keys.map((entry) => [entry.env_key, entry]));
}

function toBrowserValue(value: RuntimeScalar) {
  return typeof value === "string" ? value : String(value);
}

export function projectBrowserSafeEnv(
  values: Record<string, RuntimeScalar | undefined>,
  allowlist: BrowserSafeEnvAllowlist,
  consumerRef: RuntimeConsumerRef,
) {
  const index = allowlistByKey(allowlist);
  const projected: Record<string, string> = {};

  for (const [key, value] of Object.entries(values)) {
    if (value === undefined) {
      continue;
    }
    const allowlistEntry = index.get(key);
    if (!allowlistEntry) {
      throw new RuntimeEnvironmentError({
        code: "RUNTIME_BROWSER_SAFE_KEY_FORBIDDEN",
        consumerRef,
        envKey: key,
        detail: "key is not present in the browser-safe allowlist",
      });
    }
    if (!allowlistEntry.allowed_consumer_refs.includes(consumerRef)) {
      throw new RuntimeEnvironmentError({
        code: "RUNTIME_BROWSER_SAFE_KEY_FORBIDDEN",
        consumerRef,
        envKey: key,
        detail: "key is not allowed for this consumer class",
      });
    }
    projected[key] = toBrowserValue(value);
  }

  return projected;
}

export function deriveBrowserSafeEnv(
  values: Record<string, RuntimeScalar | undefined>,
  allowlist: BrowserSafeEnvAllowlist,
  consumerRef: RuntimeConsumerRef,
) {
  const projected: Record<string, string> = {};

  for (const definition of allowlist.browser_safe_keys) {
    if (!definition.allowed_consumer_refs.includes(consumerRef)) {
      continue;
    }
    const value = values[definition.env_key];
    if (value === undefined) {
      continue;
    }
    projected[definition.env_key] = toBrowserValue(value);
  }

  return projected;
}
