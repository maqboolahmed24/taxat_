export const RUNTIME_CONSUMER_REFS = [
  "API",
  "WORKER",
  "CLI",
  "PYTHON",
  "BROWSER_BUILD",
  "PLAYWRIGHT",
  "NATIVE",
] as const;

export type RuntimeConsumerRef = (typeof RUNTIME_CONSUMER_REFS)[number];

export const RUNTIME_SOURCE_REFS = [
  "FROZEN_CONFIG",
  "EXPLICIT_OVERRIDE",
  "PROCESS_ENV",
  "LOCAL_FILE_BOOTSTRAP",
] as const;

export type RuntimeSourceRef = (typeof RUNTIME_SOURCE_REFS)[number];

export const RUNTIME_VALUE_KINDS = [
  "STRING",
  "INTEGER",
  "BOOLEAN",
  "URL",
  "ENUM",
  "PATH",
  "SECRET_HANDLE",
] as const;

export type RuntimeValueKind = (typeof RUNTIME_VALUE_KINDS)[number];

export type RuntimeScalar = boolean | number | string;

export type RuntimeKeyDefinition = {
  env_key: string;
  value_kind: RuntimeValueKind;
  classification: string;
  required_for: RuntimeConsumerRef[];
  allowed_sources: RuntimeSourceRef[];
  browser_safe: boolean;
  description: string;
  example: string;
  allowed_values?: string[];
};

export type RuntimeConsumerDefinition = {
  consumer_ref: RuntimeConsumerRef;
  label: string;
  runtime_boundary: string;
  frozen_config_mode: string;
  basis_statement: string;
  allowed_env_keys: string[];
  allowed_secret_keys: string[];
  forbidden_env_keys: string[];
  browser_safe_projection: string;
  failure_modes: string[];
  notes: string[];
};

export type RuntimeEnvironmentCatalog = {
  contract_version: string;
  catalog_id: string;
  basis_statement: string;
  runtime_key_catalog: RuntimeKeyDefinition[];
  consumer_classes: RuntimeConsumerDefinition[];
};

export type RuntimeResolutionTrace = {
  envKey: string;
  source: RuntimeSourceRef;
  classification: string;
  redacted: boolean;
};

type RuntimeEnvironmentErrorInit = {
  code: string;
  consumerRef?: RuntimeConsumerRef;
  envKey?: string;
  source?: RuntimeSourceRef;
  detail: string;
};

export class RuntimeEnvironmentError extends Error {
  readonly code: string;
  readonly consumerRef?: RuntimeConsumerRef;
  readonly envKey?: string;
  readonly source?: RuntimeSourceRef;

  constructor(init: RuntimeEnvironmentErrorInit) {
    super(
      `${init.code}: ${init.detail}` +
        (init.consumerRef ? ` [consumer=${init.consumerRef}]` : "") +
        (init.envKey ? ` [key=${init.envKey}]` : "") +
        (init.source ? ` [source=${init.source}]` : ""),
    );
    this.name = "RuntimeEnvironmentError";
    this.code = init.code;
    this.consumerRef = init.consumerRef;
    this.envKey = init.envKey;
    this.source = init.source;
  }

  toJSON() {
    return {
      name: this.name,
      code: this.code,
      consumerRef: this.consumerRef ?? null,
      envKey: this.envKey ?? null,
      source: this.source ?? null,
      message: this.message,
    };
  }
}

export function definitionsByKey(catalog: RuntimeEnvironmentCatalog) {
  return new Map(catalog.runtime_key_catalog.map((definition) => [definition.env_key, definition]));
}

export function consumersByRef(catalog: RuntimeEnvironmentCatalog) {
  return new Map(catalog.consumer_classes.map((consumer) => [consumer.consumer_ref, consumer]));
}

export function isRequiredForConsumer(
  definition: RuntimeKeyDefinition,
  consumerRef: RuntimeConsumerRef,
) {
  return definition.required_for.includes(consumerRef);
}

function assertNonEmpty(
  rawValue: string | undefined,
  definition: RuntimeKeyDefinition,
  consumerRef: RuntimeConsumerRef,
  source: RuntimeSourceRef,
) {
  if (rawValue === undefined) {
    throw new RuntimeEnvironmentError({
      code: "RUNTIME_ENV_KEY_MISSING",
      consumerRef,
      envKey: definition.env_key,
      source,
      detail: "required environment key is absent",
    });
  }
  if (rawValue.trim().length === 0) {
    throw new RuntimeEnvironmentError({
      code: "RUNTIME_ENV_EMPTY",
      consumerRef,
      envKey: definition.env_key,
      source,
      detail: "present environment key resolved to an empty string",
    });
  }
  return rawValue.trim();
}

function ensureAllowedEnum(
  definition: RuntimeKeyDefinition,
  rawValue: string,
  consumerRef: RuntimeConsumerRef,
  source: RuntimeSourceRef,
) {
  if (!definition.allowed_values?.includes(rawValue)) {
    throw new RuntimeEnvironmentError({
      code: "RUNTIME_ENV_COERCION_FAILED",
      consumerRef,
      envKey: definition.env_key,
      source,
      detail: `expected one of ${definition.allowed_values?.join(", ") ?? "[]"} but received ${rawValue}`,
    });
  }
  return rawValue;
}

export function parseRuntimeScalar(
  definition: RuntimeKeyDefinition,
  rawValue: string,
  consumerRef: RuntimeConsumerRef,
  source: RuntimeSourceRef,
): RuntimeScalar {
  const trimmed = assertNonEmpty(rawValue, definition, consumerRef, source);

  switch (definition.value_kind) {
    case "STRING":
    case "PATH":
      return trimmed;
    case "INTEGER": {
      const parsed = Number.parseInt(trimmed, 10);
      if (!Number.isInteger(parsed)) {
        throw new RuntimeEnvironmentError({
          code: "RUNTIME_ENV_COERCION_FAILED",
          consumerRef,
          envKey: definition.env_key,
          source,
          detail: `expected integer but received ${trimmed}`,
        });
      }
      return parsed;
    }
    case "BOOLEAN": {
      if (trimmed === "true") {
        return true;
      }
      if (trimmed === "false") {
        return false;
      }
      throw new RuntimeEnvironmentError({
        code: "RUNTIME_ENV_COERCION_FAILED",
        consumerRef,
        envKey: definition.env_key,
        source,
        detail: `expected boolean literal true|false but received ${trimmed}`,
      });
    }
    case "URL": {
      try {
        const parsed = new URL(trimmed);
        return parsed.toString().replace(/\/$/, "");
      } catch {
        throw new RuntimeEnvironmentError({
          code: "RUNTIME_ENV_COERCION_FAILED",
          consumerRef,
          envKey: definition.env_key,
          source,
          detail: `expected absolute URL but received ${trimmed}`,
        });
      }
    }
    case "ENUM":
      return ensureAllowedEnum(definition, trimmed, consumerRef, source);
    case "SECRET_HANDLE":
      throw new RuntimeEnvironmentError({
        code: "RUNTIME_ENV_COERCION_FAILED",
        consumerRef,
        envKey: definition.env_key,
        source,
        detail: "secret-handle values must be parsed through secret_handle.ts",
      });
  }
}
