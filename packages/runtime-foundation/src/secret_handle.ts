import { createHash } from "node:crypto";

import type { RuntimeConsumerRef, RuntimeSourceRef } from "./runtime_environment.ts";
import { RuntimeEnvironmentError } from "./runtime_environment.ts";

const inspectSymbol = Symbol.for("nodejs.util.inspect.custom");

export type LocalBootstrapPolicy = {
  env_key: string;
  allowed_consumer_refs: RuntimeConsumerRef[];
  allowed_environment_refs: string[];
  required_format: string;
  raw_value_fields_forbidden: string[];
  notes: string[];
};

export type ConsumerResolutionLadder = {
  consumer_ref: RuntimeConsumerRef;
  order: RuntimeSourceRef[];
  live_env_fallback_after_freeze: string;
  notes: string[];
};

export type SecretHandlePolicyEntry = {
  env_key: string;
  alias_ref: string;
  secret_class: string;
  allowed_consumer_refs: RuntimeConsumerRef[];
  allowed_environment_refs: string[];
  allowed_namespace_refs: string[];
  resolution_mode: string;
  cache_policy: string;
  notes: string[];
};

export type SecretInjectionPolicy = {
  contract_version: string;
  policy_id: string;
  selected_backend: string;
  handle_shape: string;
  basis_statement: string;
  local_bootstrap_policy: LocalBootstrapPolicy;
  consumer_resolution_ladders: ConsumerResolutionLadder[];
  handle_env_keys: SecretHandlePolicyEntry[];
  typed_failure_modes: Array<{
    code: string;
    description: string;
  }>;
};

export type SecretHandle = Readonly<{
  kind: "SECRET_HANDLE";
  envKey: string;
  aliasRef: string;
  secretClass: string;
  namespaceRef: string;
  storeRef: string;
  metadataRef: string;
  versionRef: string;
  fingerprint: string;
  providerEnvironmentRef: string | null;
  handleRef: string | null;
  resolutionMode: string;
  cachePolicy: string;
  [inspectSymbol](): string;
  toJSON(): Record<string, string | null>;
}>;

export type RuntimeSecretProvider = {
  resolveSecret(
    handle: SecretHandle,
    consumerRef: RuntimeConsumerRef,
  ): Promise<{
    resolved_from: string;
    value: string;
  }>;
};

export function policyEntriesByEnvKey(policy: SecretInjectionPolicy) {
  return new Map(policy.handle_env_keys.map((entry) => [entry.env_key, entry]));
}

export function laddersByConsumer(policy: SecretInjectionPolicy) {
  return new Map(policy.consumer_resolution_ladders.map((ladder) => [ladder.consumer_ref, ladder]));
}

function fingerprintFor(value: string) {
  return `sha256:${createHash("sha256").update(value).digest("hex").slice(0, 16)}`;
}

export function redactSecretValue(value: string) {
  return {
    placeholder: "[redacted]",
    fingerprint: fingerprintFor(value),
  };
}

function assertNonEmptyField(
  candidate: unknown,
  code: string,
  consumerRef: RuntimeConsumerRef,
  envKey: string,
  detail: string,
) {
  if (typeof candidate !== "string" || candidate.trim().length === 0) {
    throw new RuntimeEnvironmentError({
      code,
      consumerRef,
      envKey,
      detail,
    });
  }
  return candidate.trim();
}

function assertNoRawValueFields(
  payload: Record<string, unknown>,
  forbiddenFields: string[],
  consumerRef: RuntimeConsumerRef,
  envKey: string,
) {
  for (const field of forbiddenFields) {
    if (field in payload && payload[field] !== null && payload[field] !== "") {
      throw new RuntimeEnvironmentError({
        code: "RUNTIME_SECRET_HANDLE_RAW_VALUE_FORBIDDEN",
        consumerRef,
        envKey,
        detail: `handle payload must not include raw secret field ${field}`,
      });
    }
  }
}

export function createSecretHandle(input: {
  envKey: string;
  aliasRef: string;
  secretClass: string;
  namespaceRef: string;
  storeRef: string;
  metadataRef: string;
  versionRef: string;
  fingerprint?: string;
  providerEnvironmentRef?: string | null;
  handleRef?: string | null;
  resolutionMode: string;
  cachePolicy: string;
}): SecretHandle {
  const fingerprint = input.fingerprint ?? fingerprintFor(input.aliasRef + input.versionRef);
  const base = {
    kind: "SECRET_HANDLE" as const,
    envKey: input.envKey,
    aliasRef: input.aliasRef,
    secretClass: input.secretClass,
    namespaceRef: input.namespaceRef,
    storeRef: input.storeRef,
    metadataRef: input.metadataRef,
    versionRef: input.versionRef,
    fingerprint,
    providerEnvironmentRef: input.providerEnvironmentRef ?? null,
    handleRef: input.handleRef ?? null,
    resolutionMode: input.resolutionMode,
    cachePolicy: input.cachePolicy,
    [inspectSymbol]() {
      return `SecretHandle(${input.aliasRef}@${input.namespaceRef}#${input.versionRef})`;
    },
    toJSON() {
      return {
        kind: "SECRET_HANDLE",
        env_key: input.envKey,
        alias_ref: input.aliasRef,
        secret_class: input.secretClass,
        namespace_ref: input.namespaceRef,
        store_ref: input.storeRef,
        metadata_ref: input.metadataRef,
        version_ref: input.versionRef,
        fingerprint,
        provider_environment_ref: input.providerEnvironmentRef ?? null,
        handle_ref: input.handleRef ?? null,
        resolution_mode: input.resolutionMode,
        cache_policy: input.cachePolicy,
      };
    },
  };
  return Object.freeze(base);
}

export function parseSecretHandle(
  rawValue: string,
  definition: SecretHandlePolicyEntry,
  consumerRef: RuntimeConsumerRef,
  environmentRef: string,
  forbiddenRawFields: string[],
) {
  if (rawValue.trim().length === 0) {
    throw new RuntimeEnvironmentError({
      code: "RUNTIME_ENV_EMPTY",
      consumerRef,
      envKey: definition.env_key,
      detail: "secret handle payload resolved to an empty string",
    });
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(rawValue);
  } catch {
    throw new RuntimeEnvironmentError({
      code: "RUNTIME_ENV_COERCION_FAILED",
      consumerRef,
      envKey: definition.env_key,
      detail: "secret handle payload must be valid JSON",
    });
  }

  if (!definition.allowed_consumer_refs.includes(consumerRef)) {
    throw new RuntimeEnvironmentError({
      code: "RUNTIME_SECRET_HANDLE_FORBIDDEN",
      consumerRef,
      envKey: definition.env_key,
      detail: "consumer is not allowed to receive this secret handle",
    });
  }

  if (!definition.allowed_environment_refs.includes(environmentRef)) {
    throw new RuntimeEnvironmentError({
      code: "RUNTIME_SECRET_HANDLE_FORBIDDEN",
      consumerRef,
      envKey: definition.env_key,
      detail: `environment ${environmentRef} is not allowed for this secret handle`,
    });
  }

  if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new RuntimeEnvironmentError({
      code: "RUNTIME_ENV_COERCION_FAILED",
      consumerRef,
      envKey: definition.env_key,
      detail: "secret handle payload must be a JSON object",
    });
  }

  const payload = parsed as Record<string, unknown>;
  assertNoRawValueFields(payload, forbiddenRawFields, consumerRef, definition.env_key);

  const aliasRef = assertNonEmptyField(
    payload.alias_ref,
    "RUNTIME_ENV_COERCION_FAILED",
    consumerRef,
    definition.env_key,
    "secret handle must carry alias_ref",
  );
  if (aliasRef !== definition.alias_ref) {
    throw new RuntimeEnvironmentError({
      code: "RUNTIME_SECRET_HANDLE_FORBIDDEN",
      consumerRef,
      envKey: definition.env_key,
      detail: `alias ${aliasRef} does not match policy alias ${definition.alias_ref}`,
    });
  }

  const namespaceRef = assertNonEmptyField(
    payload.namespace_ref,
    "RUNTIME_ENV_COERCION_FAILED",
    consumerRef,
    definition.env_key,
    "secret handle must carry namespace_ref",
  );
  if (!definition.allowed_namespace_refs.includes(namespaceRef)) {
    throw new RuntimeEnvironmentError({
      code: "RUNTIME_ENV_PROVIDER_MISMATCH",
      consumerRef,
      envKey: definition.env_key,
      detail: `namespace ${namespaceRef} is not allowed for this handle`,
    });
  }

  const storeRef = assertNonEmptyField(
    payload.store_ref,
    "RUNTIME_ENV_COERCION_FAILED",
    consumerRef,
    definition.env_key,
    "secret handle must carry store_ref",
  );
  const metadataRef = assertNonEmptyField(
    payload.metadata_ref,
    "RUNTIME_ENV_COERCION_FAILED",
    consumerRef,
    definition.env_key,
    "secret handle must carry metadata_ref",
  );
  const versionRef = assertNonEmptyField(
    payload.version_ref,
    "RUNTIME_ENV_COERCION_FAILED",
    consumerRef,
    definition.env_key,
    "secret handle must carry version_ref",
  );

  return createSecretHandle({
    envKey: definition.env_key,
    aliasRef,
    secretClass: definition.secret_class,
    namespaceRef,
    storeRef,
    metadataRef,
    versionRef,
    fingerprint:
      typeof payload.fingerprint === "string" && payload.fingerprint.trim().length > 0
        ? payload.fingerprint.trim()
        : fingerprintFor(`${aliasRef}:${namespaceRef}:${versionRef}`),
    providerEnvironmentRef:
      typeof payload.provider_environment_ref === "string"
        ? payload.provider_environment_ref
        : null,
    handleRef: typeof payload.handle_ref === "string" ? payload.handle_ref : null,
    resolutionMode: definition.resolution_mode,
    cachePolicy: definition.cache_policy,
  });
}

export async function resolveSecretHandleValue(
  handle: SecretHandle,
  provider: RuntimeSecretProvider,
  consumerRef: RuntimeConsumerRef,
) {
  const resolved = await provider.resolveSecret(handle, consumerRef);
  return {
    resolvedFrom: resolved.resolved_from,
    value: resolved.value,
    redacted: redactSecretValue(resolved.value),
  };
}
