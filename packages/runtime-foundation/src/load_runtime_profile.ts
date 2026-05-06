import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { type BrowserSafeEnvAllowlist, deriveBrowserSafeEnv } from "./browser_safe_env.ts";
import {
  assertFrozenConfigAccess,
  assertFrozenConfigPresent,
  createFrozenConfigBinding,
  type FrozenConfigBinding,
} from "./frozen_config_guard.ts";
import {
  consumersByRef,
  definitionsByKey,
  isRequiredForConsumer,
  parseRuntimeScalar,
  type RuntimeConsumerDefinition,
  type RuntimeConsumerRef,
  type RuntimeEnvironmentCatalog,
  RuntimeEnvironmentError,
  type RuntimeResolutionTrace,
  type RuntimeScalar,
  type RuntimeSourceRef,
} from "./runtime_environment.ts";
import {
  type ConsumerResolutionLadder,
  laddersByConsumer,
  parseSecretHandle,
  policyEntriesByEnvKey,
  type SecretHandle,
  type SecretInjectionPolicy,
} from "./secret_handle.ts";

type ProviderEnvironmentRow = {
  environment_ref: string;
  environment_label: string;
  provider_environment_ref: string;
  allowed_consumer_refs: RuntimeConsumerRef[];
  allowed_namespace_refs: string[];
  hmrc_base_url_patterns: string[];
  browser_public_origin_patterns: string[];
  stable_callback_host_required: boolean;
  frozen_config_required: boolean;
  local_bootstrap_allowed: boolean;
  notes: string[];
};

export type ProviderEnvironmentMatrix = {
  contract_version: string;
  matrix_id: string;
  basis_statement: string;
  environment_rows: ProviderEnvironmentRow[];
};

type ExternalEnvironmentCatalog = {
  environment_records: Array<{
    environment_id: string;
    secret_namespace_refs: string[];
  }>;
};

type SecretNamespacePlan = {
  secret_namespace_rows: Array<{
    secret_namespace_ref: string;
    environment_refs: string[];
  }>;
};

type SecretAliasCatalog = {
  aliases: Array<{
    alias_ref: string;
    namespace_refs: string[];
  }>;
};

type RuntimePolicySet = {
  runtimeEnvironmentCatalog: RuntimeEnvironmentCatalog;
  providerEnvironmentMatrix: ProviderEnvironmentMatrix;
  secretInjectionPolicy: SecretInjectionPolicy;
  browserSafeEnvAllowlist: BrowserSafeEnvAllowlist;
  externalEnvironmentCatalog: ExternalEnvironmentCatalog;
  secretNamespacePlan: SecretNamespacePlan;
  secretAliasCatalog: SecretAliasCatalog;
};

type RuntimeSourceMaps = Record<RuntimeSourceRef, Record<string, string | undefined>>;

export type RuntimeProfile = {
  consumerRef: RuntimeConsumerRef;
  consumerLabel: string;
  environmentRef: string;
  environmentLabel: string;
  providerEnvironmentRef: string;
  values: Record<string, RuntimeScalar>;
  secretHandles: Record<string, SecretHandle>;
  browserSafeEnv: Record<string, string>;
  frozenConfigBinding: FrozenConfigBinding | null;
  resolutionTrace: RuntimeResolutionTrace[];
};

type AtlasStratumRef =
  | "BOOTSTRAP_INPUTS"
  | "SECRET_HANDLES"
  | "FROZEN_CONFIG"
  | "RUNTIME_CONSUMERS";

type EnvironmentBasisAtlasPayload = {
  routeId: string;
  title: string;
  environmentFamilyBadge: string;
  basisStatement: string;
  strata: Array<{
    stratum_ref: AtlasStratumRef;
    label: string;
    summary: string;
  }>;
  consumers: Array<{
    consumer_ref: RuntimeConsumerRef;
    label: string;
    runtime_boundary: string;
    basis_statement: string;
    browser_safe_projection: string;
    allowed_keys: string[];
    forbidden_keys: string[];
    source_lineage: string[];
    failure_modes: string[];
    variables: Array<{
      variable_ref: string;
      label: string;
      classification: string;
      tone: "success" | "warning" | "danger";
      summary: string;
      path_cells: Array<{
        stratum_ref: AtlasStratumRef;
        status: "ALLOW" | "BLOCKED" | "NOT_APPLICABLE";
        accessible_label: string;
      }>;
      inspector: {
        allowed_sources: string[];
        browser_safe: string;
        blocked_reason: string;
        notes: string[];
      };
    }>;
  }>;
  selectedConsumerRef: RuntimeConsumerRef;
  selectedVariableRef: string;
};

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, "..", "..", "..");
const configRuntimeDir = path.join(repoRoot, "config", "runtime");
const atlasDataPath = path.join(
  repoRoot,
  "apps",
  "operator-web",
  "public",
  "internal",
  "environment-basis-atlas",
  "data",
  "environment-basis-atlas.json",
);

const schemaPaths = {
  runtimeEnvironmentCatalog: path.join(configRuntimeDir, "runtime_environment_catalog.schema.json"),
  providerEnvironmentMatrix: path.join(configRuntimeDir, "provider_environment_matrix.schema.json"),
  secretInjectionPolicy: path.join(configRuntimeDir, "secret_injection_policy.schema.json"),
  browserSafeEnvAllowlist: path.join(configRuntimeDir, "browser_safe_env_allowlist.schema.json"),
};

const jsonPaths = {
  runtimeEnvironmentCatalog: path.join(configRuntimeDir, "runtime_environment_catalog.json"),
  providerEnvironmentMatrix: path.join(configRuntimeDir, "provider_environment_matrix.json"),
  secretInjectionPolicy: path.join(configRuntimeDir, "secret_injection_policy.json"),
  browserSafeEnvAllowlist: path.join(configRuntimeDir, "browser_safe_env_allowlist.json"),
  externalEnvironmentCatalog: path.join(repoRoot, "data", "analysis", "environment_catalog.json"),
  secretNamespacePlan: path.join(
    repoRoot,
    "data",
    "analysis",
    "environment_secret_namespace_plan.json",
  ),
  secretAliasCatalog: path.join(repoRoot, "config", "secrets", "secret_alias_catalog.json"),
};

function normalizeEnvBag(values: Record<string, unknown> | undefined) {
  if (!values) {
    return {} as Record<string, string | undefined>;
  }
  const normalized: Record<string, string | undefined> = {};
  for (const [key, value] of Object.entries(values)) {
    normalized[key] =
      value === undefined || value === null
        ? undefined
        : typeof value === "string"
          ? value
          : String(value);
  }
  return normalized;
}

async function readJson<T>(filePath: string) {
  return JSON.parse(await readFile(filePath, "utf8")) as T;
}

async function readSchemaEnvelope(filePath: string) {
  return readJson<{
    title?: string;
    required?: string[];
  }>(filePath);
}

function validateSchemaEnvelope(
  schema: {
    title?: string;
    required?: string[];
  },
  expectedTitle: string,
  requiredKeys: string[],
) {
  if (schema.title !== expectedTitle) {
    throw new Error(`Expected schema title ${expectedTitle}, received ${schema.title ?? "null"}.`);
  }
  const required = new Set(schema.required ?? []);
  for (const key of requiredKeys) {
    if (!required.has(key)) {
      throw new Error(`${expectedTitle} schema must require ${key}.`);
    }
  }
}

function unique(values: string[]) {
  return [...new Set(values)];
}

function makeTrace(
  envKey: string,
  source: RuntimeSourceRef,
  classification: string,
  redacted: boolean,
): RuntimeResolutionTrace {
  return {
    envKey,
    source,
    classification,
    redacted,
  };
}

function findEnvironmentRow(
  matrix: ProviderEnvironmentMatrix,
  environmentRef: string,
  consumerRef: RuntimeConsumerRef,
) {
  const row = matrix.environment_rows.find((entry) => entry.environment_ref === environmentRef);
  if (!row) {
    throw new RuntimeEnvironmentError({
      code: "RUNTIME_ENV_PROVIDER_MISMATCH",
      consumerRef,
      envKey: "TAXAT_ENVIRONMENT_ID",
      detail: `environment ${environmentRef} is not present in provider_environment_matrix.json`,
    });
  }
  if (!row.allowed_consumer_refs.includes(consumerRef)) {
    throw new RuntimeEnvironmentError({
      code: "RUNTIME_ENV_KEY_FORBIDDEN",
      consumerRef,
      envKey: "TAXAT_ENVIRONMENT_ID",
      detail: `consumer ${consumerRef} is not allowed in environment ${environmentRef}`,
    });
  }
  return row;
}

function matchesPattern(value: string, pattern: string) {
  const escaped = pattern.replace(/[|\\{}()[\]^$+?.]/g, "\\$&").replaceAll("*", ".*");
  return new RegExp(`^${escaped}$`).test(value);
}

function matchAnyPattern(value: string, patterns: string[]) {
  return patterns.some((pattern) => matchesPattern(value, pattern));
}

function resolveRawValue(
  key: string,
  allowedSources: RuntimeSourceRef[],
  ladder: ConsumerResolutionLadder,
  sourceMaps: RuntimeSourceMaps,
) {
  for (const source of ladder.order) {
    if (!allowedSources.includes(source)) {
      continue;
    }
    const candidate = sourceMaps[source][key];
    if (candidate !== undefined) {
      return {
        source,
        rawValue: candidate,
      };
    }
  }
  return null;
}

async function loadLocalBootstrapMap(filePath: string | undefined, policy: SecretInjectionPolicy) {
  if (!filePath) {
    return {} as Record<string, string>;
  }
  const parsed = JSON.parse(await readFile(filePath, "utf8")) as Record<string, unknown>;
  if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error(`${policy.local_bootstrap_policy.required_format} expected at ${filePath}.`);
  }

  const normalized: Record<string, string> = {};
  for (const [key, value] of Object.entries(parsed)) {
    if (typeof value === "string") {
      normalized[key] = value;
      continue;
    }
    normalized[key] = JSON.stringify(value);
  }
  return normalized;
}

function assertKnownConsumerRef(consumerRef: string): asserts consumerRef is RuntimeConsumerRef {
  if (
    !["API", "WORKER", "CLI", "PYTHON", "BROWSER_BUILD", "PLAYWRIGHT", "NATIVE"].includes(
      consumerRef,
    )
  ) {
    throw new Error(`Unknown runtime consumer ref ${consumerRef}.`);
  }
}

function assertKnownConfiguredKeyAbsent(
  consumer: RuntimeConsumerDefinition,
  key: string,
  sourceMaps: RuntimeSourceMaps,
) {
  const allowedKeys = new Set([...consumer.allowed_env_keys, ...consumer.allowed_secret_keys]);
  if (allowedKeys.has(key)) {
    return;
  }

  for (const [source, values] of Object.entries(sourceMaps) as Array<
    [RuntimeSourceRef, Record<string, string | undefined>]
  >) {
    if (values[key] !== undefined) {
      throw new RuntimeEnvironmentError({
        code: "RUNTIME_ENV_KEY_FORBIDDEN",
        consumerRef: consumer.consumer_ref,
        envKey: key,
        source,
        detail: `consumer ${consumer.consumer_ref} is not allowed to receive configured key ${key}`,
      });
    }
  }
}

function validateRuntimeEnvironmentCatalog(policySet: RuntimePolicySet) {
  const catalog = policySet.runtimeEnvironmentCatalog;
  if (catalog.contract_version !== "1.0") {
    throw new Error(`Unexpected runtime environment catalog version ${catalog.contract_version}.`);
  }

  const keyRefs = new Set<string>();
  for (const key of catalog.runtime_key_catalog) {
    if (keyRefs.has(key.env_key)) {
      throw new Error(`Duplicate runtime env key ${key.env_key}.`);
    }
    keyRefs.add(key.env_key);
  }

  const consumerRefs = new Set<string>();
  for (const consumer of catalog.consumer_classes) {
    assertKnownConsumerRef(consumer.consumer_ref);
    if (consumerRefs.has(consumer.consumer_ref)) {
      throw new Error(`Duplicate runtime consumer ${consumer.consumer_ref}.`);
    }
    consumerRefs.add(consumer.consumer_ref);

    for (const envKey of [...consumer.allowed_env_keys, ...consumer.allowed_secret_keys]) {
      if (!keyRefs.has(envKey)) {
        throw new Error(`Consumer ${consumer.consumer_ref} references unknown key ${envKey}.`);
      }
    }
  }
}

function validateProviderEnvironmentMatrix(policySet: RuntimePolicySet) {
  const matrix = policySet.providerEnvironmentMatrix;
  const externalEnvironmentRefs = new Set(
    policySet.externalEnvironmentCatalog.environment_records.map((entry) => entry.environment_id),
  );
  const secretNamespaceRows = new Map(
    policySet.secretNamespacePlan.secret_namespace_rows.map((row) => [
      row.secret_namespace_ref,
      row.environment_refs,
    ]),
  );

  for (const row of matrix.environment_rows) {
    if (!externalEnvironmentRefs.has(row.environment_ref)) {
      throw new Error(`Unknown environment ${row.environment_ref} in provider environment matrix.`);
    }
    for (const consumerRef of row.allowed_consumer_refs) {
      assertKnownConsumerRef(consumerRef);
    }
    for (const namespaceRef of row.allowed_namespace_refs) {
      const allowedEnvironments = secretNamespaceRows.get(namespaceRef);
      if (!allowedEnvironments) {
        throw new Error(`Unknown secret namespace ${namespaceRef} in provider environment matrix.`);
      }
      if (!allowedEnvironments.includes(row.environment_ref)) {
        throw new Error(
          `Namespace ${namespaceRef} is not mapped to environment ${row.environment_ref}.`,
        );
      }
    }
  }
}

function validateSecretInjectionPolicy(policySet: RuntimePolicySet) {
  const catalogIndex = definitionsByKey(policySet.runtimeEnvironmentCatalog);
  const consumerIndex = consumersByRef(policySet.runtimeEnvironmentCatalog);
  const aliasIndex = new Map(
    policySet.secretAliasCatalog.aliases.map((alias) => [alias.alias_ref, alias]),
  );
  const handleKeys = new Set<string>();

  for (const ladder of policySet.secretInjectionPolicy.consumer_resolution_ladders) {
    if (!consumerIndex.has(ladder.consumer_ref)) {
      throw new Error(`Unknown consumer ${ladder.consumer_ref} in secret injection ladder.`);
    }
  }

  for (const handleEntry of policySet.secretInjectionPolicy.handle_env_keys) {
    if (handleKeys.has(handleEntry.env_key)) {
      throw new Error(`Duplicate secret handle env key ${handleEntry.env_key}.`);
    }
    handleKeys.add(handleEntry.env_key);

    const keyDefinition = catalogIndex.get(handleEntry.env_key);
    if (!keyDefinition) {
      throw new Error(
        `Secret handle entry ${handleEntry.env_key} is missing from the key catalog.`,
      );
    }
    if (keyDefinition.classification !== "SECRET_HANDLE") {
      throw new Error(`Key ${handleEntry.env_key} must be classified as SECRET_HANDLE.`);
    }
    const alias = aliasIndex.get(handleEntry.alias_ref);
    if (!alias) {
      throw new Error(`Unknown secret alias ${handleEntry.alias_ref}.`);
    }
    for (const namespaceRef of handleEntry.allowed_namespace_refs) {
      if (!alias.namespace_refs.includes(namespaceRef)) {
        throw new Error(
          `Alias ${handleEntry.alias_ref} does not include namespace ${namespaceRef}.`,
        );
      }
    }
  }
}

function validateBrowserSafeAllowlist(policySet: RuntimePolicySet) {
  const keyIndex = definitionsByKey(policySet.runtimeEnvironmentCatalog);
  for (const entry of policySet.browserSafeEnvAllowlist.browser_safe_keys) {
    const keyDefinition = keyIndex.get(entry.env_key);
    if (!keyDefinition) {
      throw new Error(`Browser-safe key ${entry.env_key} is missing from the runtime catalog.`);
    }
    if (!keyDefinition.browser_safe) {
      throw new Error(`Browser-safe key ${entry.env_key} must declare browser_safe = true.`);
    }
    if (keyDefinition.classification === "SECRET_HANDLE") {
      throw new Error(`Secret handle ${entry.env_key} cannot appear in the browser allowlist.`);
    }
  }
}

export async function loadRuntimePolicySet(policyRoot = repoRoot): Promise<RuntimePolicySet> {
  const [
    runtimeEnvironmentCatalog,
    providerEnvironmentMatrix,
    secretInjectionPolicy,
    browserSafeEnvAllowlist,
    externalEnvironmentCatalog,
    secretNamespacePlan,
    secretAliasCatalog,
    runtimeEnvironmentCatalogSchema,
    providerEnvironmentMatrixSchema,
    secretInjectionPolicySchema,
    browserSafeEnvAllowlistSchema,
  ] = await Promise.all([
    readJson<RuntimeEnvironmentCatalog>(jsonPaths.runtimeEnvironmentCatalog),
    readJson<ProviderEnvironmentMatrix>(jsonPaths.providerEnvironmentMatrix),
    readJson<SecretInjectionPolicy>(jsonPaths.secretInjectionPolicy),
    readJson<BrowserSafeEnvAllowlist>(jsonPaths.browserSafeEnvAllowlist),
    readJson<ExternalEnvironmentCatalog>(jsonPaths.externalEnvironmentCatalog),
    readJson<SecretNamespacePlan>(jsonPaths.secretNamespacePlan),
    readJson<SecretAliasCatalog>(jsonPaths.secretAliasCatalog),
    readSchemaEnvelope(schemaPaths.runtimeEnvironmentCatalog),
    readSchemaEnvelope(schemaPaths.providerEnvironmentMatrix),
    readSchemaEnvelope(schemaPaths.secretInjectionPolicy),
    readSchemaEnvelope(schemaPaths.browserSafeEnvAllowlist),
  ]);

  validateSchemaEnvelope(runtimeEnvironmentCatalogSchema, "Runtime Environment Catalog", [
    "contract_version",
    "catalog_id",
    "basis_statement",
    "runtime_key_catalog",
    "consumer_classes",
  ]);
  validateSchemaEnvelope(providerEnvironmentMatrixSchema, "Provider Environment Matrix", [
    "contract_version",
    "matrix_id",
    "basis_statement",
    "environment_rows",
  ]);
  validateSchemaEnvelope(secretInjectionPolicySchema, "Secret Injection Policy", [
    "contract_version",
    "policy_id",
    "selected_backend",
    "handle_shape",
    "basis_statement",
    "local_bootstrap_policy",
    "consumer_resolution_ladders",
    "handle_env_keys",
    "typed_failure_modes",
  ]);
  validateSchemaEnvelope(browserSafeEnvAllowlistSchema, "Browser Safe Env Allowlist", [
    "contract_version",
    "allowlist_id",
    "basis_statement",
    "browser_safe_keys",
    "forbidden_key_prefixes",
  ]);

  const policySet = {
    runtimeEnvironmentCatalog,
    providerEnvironmentMatrix,
    secretInjectionPolicy,
    browserSafeEnvAllowlist,
    externalEnvironmentCatalog,
    secretNamespacePlan,
    secretAliasCatalog,
  } satisfies RuntimePolicySet;

  validateRuntimeEnvironmentCatalog(policySet);
  validateProviderEnvironmentMatrix(policySet);
  validateSecretInjectionPolicy(policySet);
  validateBrowserSafeAllowlist(policySet);
  return policySet;
}

type LoadRuntimeProfileOptions = {
  consumerRef: RuntimeConsumerRef;
  env?: Record<string, unknown>;
  explicitOverrides?: Record<string, unknown>;
  frozenConfigValues?: Record<string, unknown>;
  localBootstrapPath?: string;
  policySet?: RuntimePolicySet;
};

export async function loadRuntimeProfile(
  options: LoadRuntimeProfileOptions,
): Promise<RuntimeProfile> {
  const policySet = options.policySet ?? (await loadRuntimePolicySet());
  const keyIndex = definitionsByKey(policySet.runtimeEnvironmentCatalog);
  const consumerIndex = consumersByRef(policySet.runtimeEnvironmentCatalog);
  const ladderIndex = laddersByConsumer(policySet.secretInjectionPolicy);
  const handlePolicyIndex = policyEntriesByEnvKey(policySet.secretInjectionPolicy);

  const consumer = consumerIndex.get(options.consumerRef);
  if (!consumer) {
    throw new Error(`Unknown runtime consumer ${options.consumerRef}.`);
  }
  const ladder = ladderIndex.get(options.consumerRef);
  if (!ladder) {
    throw new Error(`Missing consumer resolution ladder for ${options.consumerRef}.`);
  }

  const processEnv = normalizeEnvBag(options.env ?? process.env);
  const explicitOverrides = normalizeEnvBag(options.explicitOverrides);
  const frozenConfig = normalizeEnvBag(options.frozenConfigValues);

  const bootstrapPathResolution = resolveRawValue(
    policySet.secretInjectionPolicy.local_bootstrap_policy.env_key,
    ["EXPLICIT_OVERRIDE", "PROCESS_ENV"],
    ladder,
    {
      FROZEN_CONFIG: frozenConfig,
      EXPLICIT_OVERRIDE: explicitOverrides,
      PROCESS_ENV: processEnv,
      LOCAL_FILE_BOOTSTRAP: {},
    },
  );

  const preloadedSourceMaps = {
    FROZEN_CONFIG: frozenConfig,
    EXPLICIT_OVERRIDE: explicitOverrides,
    PROCESS_ENV: processEnv,
    LOCAL_FILE_BOOTSTRAP: {},
  } satisfies RuntimeSourceMaps;

  const environmentIdDefinition = keyIndex.get("TAXAT_ENVIRONMENT_ID");
  if (!environmentIdDefinition) {
    throw new Error("Missing TAXAT_ENVIRONMENT_ID definition.");
  }
  const environmentIdResolution = resolveRawValue(
    "TAXAT_ENVIRONMENT_ID",
    environmentIdDefinition.allowed_sources,
    ladder,
    preloadedSourceMaps,
  );
  if (!environmentIdResolution) {
    throw new RuntimeEnvironmentError({
      code: "RUNTIME_ENV_KEY_MISSING",
      consumerRef: options.consumerRef,
      envKey: "TAXAT_ENVIRONMENT_ID",
      detail: "environment id must be provided for this consumer",
    });
  }
  const environmentRef = parseRuntimeScalar(
    environmentIdDefinition,
    environmentIdResolution.rawValue,
    options.consumerRef,
    environmentIdResolution.source,
  ) as string;
  const environmentRow = findEnvironmentRow(
    policySet.providerEnvironmentMatrix,
    environmentRef,
    options.consumerRef,
  );

  const localBootstrapPath =
    options.localBootstrapPath ??
    (bootstrapPathResolution
      ? (parseRuntimeScalar(
          keyIndex.get("TAXAT_LOCAL_SECRET_BOOTSTRAP_FILE")!,
          bootstrapPathResolution.rawValue,
          options.consumerRef,
          bootstrapPathResolution.source,
        ) as string)
      : undefined);

  if (localBootstrapPath && !environmentRow.local_bootstrap_allowed) {
    throw new RuntimeEnvironmentError({
      code: "RUNTIME_LOCAL_BOOTSTRAP_FORBIDDEN",
      consumerRef: options.consumerRef,
      envKey: "TAXAT_LOCAL_SECRET_BOOTSTRAP_FILE",
      detail: `environment ${environmentRef} does not allow local bootstrap files`,
    });
  }
  if (
    localBootstrapPath &&
    !policySet.secretInjectionPolicy.local_bootstrap_policy.allowed_consumer_refs.includes(
      options.consumerRef,
    )
  ) {
    throw new RuntimeEnvironmentError({
      code: "RUNTIME_LOCAL_BOOTSTRAP_FORBIDDEN",
      consumerRef: options.consumerRef,
      envKey: "TAXAT_LOCAL_SECRET_BOOTSTRAP_FILE",
      detail: "consumer is not allowed to use local bootstrap files",
    });
  }
  if (
    localBootstrapPath &&
    !policySet.secretInjectionPolicy.local_bootstrap_policy.allowed_environment_refs.includes(
      environmentRef,
    )
  ) {
    throw new RuntimeEnvironmentError({
      code: "RUNTIME_LOCAL_BOOTSTRAP_FORBIDDEN",
      consumerRef: options.consumerRef,
      envKey: "TAXAT_LOCAL_SECRET_BOOTSTRAP_FILE",
      detail: `environment ${environmentRef} does not allow local bootstrap files`,
    });
  }

  const localBootstrap = await loadLocalBootstrapMap(
    localBootstrapPath,
    policySet.secretInjectionPolicy,
  );

  const sourceMaps = {
    FROZEN_CONFIG: frozenConfig,
    EXPLICIT_OVERRIDE: explicitOverrides,
    PROCESS_ENV: processEnv,
    LOCAL_FILE_BOOTSTRAP: localBootstrap,
  } satisfies RuntimeSourceMaps;

  const configuredKeyNames = unique(
    policySet.runtimeEnvironmentCatalog.runtime_key_catalog.map((entry) => entry.env_key),
  );
  for (const key of configuredKeyNames) {
    assertKnownConfiguredKeyAbsent(consumer, key, sourceMaps);
  }

  const values: Record<string, RuntimeScalar> = {
    TAXAT_ENVIRONMENT_ID: environmentRef,
  };
  const secretHandles: Record<string, SecretHandle> = {};
  const resolutionTrace: RuntimeResolutionTrace[] = [
    makeTrace(
      "TAXAT_ENVIRONMENT_ID",
      environmentIdResolution.source,
      environmentIdDefinition.classification,
      false,
    ),
  ];

  const optionalEnvKeys = new Set(["TAXAT_LOCAL_SECRET_BOOTSTRAP_FILE"]);

  for (const envKey of consumer.allowed_env_keys) {
    if (envKey === "TAXAT_ENVIRONMENT_ID") {
      continue;
    }
    const definition = keyIndex.get(envKey);
    if (!definition) {
      throw new Error(`Missing definition for ${envKey}.`);
    }

    const resolution = resolveRawValue(envKey, definition.allowed_sources, ladder, sourceMaps);
    if (!resolution) {
      if (isRequiredForConsumer(definition, options.consumerRef)) {
        throw new RuntimeEnvironmentError({
          code: "RUNTIME_ENV_KEY_MISSING",
          consumerRef: options.consumerRef,
          envKey,
          detail: "required environment key is missing",
        });
      }
      if (!optionalEnvKeys.has(envKey)) {
        continue;
      }
      continue;
    }

    const parsedValue = parseRuntimeScalar(
      definition,
      resolution.rawValue,
      options.consumerRef,
      resolution.source,
    );
    values[envKey] = parsedValue;
    resolutionTrace.push(makeTrace(envKey, resolution.source, definition.classification, false));
  }

  const frozenConfigBinding = createFrozenConfigBinding(values);
  if (
    consumer.frozen_config_mode === "REQUIRED_AFTER_FREEZE" ||
    consumer.frozen_config_mode === "BROWSER_SAFE_PLUS_FROZEN_CONFIG_METADATA"
  ) {
    if (environmentRow.frozen_config_required) {
      assertFrozenConfigPresent(options.consumerRef, frozenConfigBinding);
    }
  }

  for (const envKey of consumer.allowed_env_keys) {
    if (!(envKey in values)) {
      continue;
    }
    const trace = resolutionTrace.find((entry) => entry.envKey === envKey);
    if (!trace) {
      continue;
    }
    assertFrozenConfigAccess({
      consumerRef: options.consumerRef,
      binding: frozenConfigBinding,
      attemptedSource: trace.source,
      envKey,
      allowLiveBootstrap:
        consumer.frozen_config_mode === "BOOTSTRAP_ALLOWED_UNTIL_MANIFEST_BOUND" ||
        consumer.frozen_config_mode === "BOOTSTRAP_ALLOWED_UNTIL_VALIDATION_BINDING" ||
        consumer.frozen_config_mode === "BROWSER_SAFE_ALLOWLIST_ONLY" ||
        consumer.frozen_config_mode === "SANITIZED_BROWSER_AUTOMATION_ONLY",
    });
  }

  for (const envKey of consumer.allowed_secret_keys) {
    const definition = keyIndex.get(envKey);
    const handlePolicy = handlePolicyIndex.get(envKey);
    if (!definition || !handlePolicy) {
      throw new Error(`Missing secret-handle policy for ${envKey}.`);
    }

    const resolution = resolveRawValue(envKey, definition.allowed_sources, ladder, sourceMaps);
    if (!resolution) {
      continue;
    }

    assertFrozenConfigAccess({
      consumerRef: options.consumerRef,
      binding: frozenConfigBinding,
      attemptedSource: resolution.source,
      envKey,
      allowLiveBootstrap:
        consumer.frozen_config_mode === "BOOTSTRAP_ALLOWED_UNTIL_MANIFEST_BOUND" ||
        consumer.frozen_config_mode === "BOOTSTRAP_ALLOWED_UNTIL_VALIDATION_BINDING",
    });

    secretHandles[envKey] = parseSecretHandle(
      resolution.rawValue,
      handlePolicy,
      options.consumerRef,
      environmentRef,
      policySet.secretInjectionPolicy.local_bootstrap_policy.raw_value_fields_forbidden,
    );
    resolutionTrace.push(makeTrace(envKey, resolution.source, definition.classification, true));
  }

  const providerEnvironmentRef =
    typeof values.TAXAT_PROVIDER_ENVIRONMENT === "string"
      ? values.TAXAT_PROVIDER_ENVIRONMENT
      : environmentRow.provider_environment_ref;
  if (providerEnvironmentRef !== environmentRow.provider_environment_ref) {
    throw new RuntimeEnvironmentError({
      code: "RUNTIME_ENV_PROVIDER_MISMATCH",
      consumerRef: options.consumerRef,
      envKey: "TAXAT_PROVIDER_ENVIRONMENT",
      detail: `environment ${environmentRef} expects provider ${environmentRow.provider_environment_ref} but received ${providerEnvironmentRef}`,
    });
  }

  const hmrcBaseUrl = values.TAXAT_HMRC_API_BASE_URL;
  if (typeof hmrcBaseUrl === "string" && environmentRow.hmrc_base_url_patterns.length > 0) {
    if (!matchAnyPattern(hmrcBaseUrl, environmentRow.hmrc_base_url_patterns)) {
      throw new RuntimeEnvironmentError({
        code: "RUNTIME_ENV_PROVIDER_MISMATCH",
        consumerRef: options.consumerRef,
        envKey: "TAXAT_HMRC_API_BASE_URL",
        detail: `HMRC base URL ${hmrcBaseUrl} is incompatible with environment ${environmentRef}`,
      });
    }
  }

  const browserPublicBaseUrl = values.TAXAT_BROWSER_PUBLIC_BASE_URL;
  if (
    typeof browserPublicBaseUrl === "string" &&
    environmentRow.browser_public_origin_patterns.length > 0 &&
    !matchAnyPattern(browserPublicBaseUrl, environmentRow.browser_public_origin_patterns)
  ) {
    throw new RuntimeEnvironmentError({
      code: "RUNTIME_ENV_PROVIDER_MISMATCH",
      consumerRef: options.consumerRef,
      envKey: "TAXAT_BROWSER_PUBLIC_BASE_URL",
      detail: `browser public base URL ${browserPublicBaseUrl} is incompatible with environment ${environmentRef}`,
    });
  }

  for (const handle of Object.values(secretHandles)) {
    if (!environmentRow.allowed_namespace_refs.includes(handle.namespaceRef)) {
      throw new RuntimeEnvironmentError({
        code: "RUNTIME_ENV_PROVIDER_MISMATCH",
        consumerRef: options.consumerRef,
        envKey: handle.envKey,
        detail: `namespace ${handle.namespaceRef} is not allowed in environment ${environmentRef}`,
      });
    }
  }

  return {
    consumerRef: options.consumerRef,
    consumerLabel: consumer.label,
    environmentRef,
    environmentLabel: environmentRow.environment_label,
    providerEnvironmentRef,
    values,
    secretHandles,
    browserSafeEnv: deriveBrowserSafeEnv(
      values,
      policySet.browserSafeEnvAllowlist,
      options.consumerRef,
    ),
    frozenConfigBinding,
    resolutionTrace,
  };
}

function toneForVariable(
  classification: string,
  allowed: boolean,
): "success" | "warning" | "danger" {
  if (!allowed) {
    return "danger";
  }
  if (classification === "SECRET_HANDLE" || classification === "FROZEN_CONFIG_METADATA") {
    return "warning";
  }
  return "success";
}

function pathCellsForVariable(
  consumer: RuntimeConsumerDefinition,
  envKey: string,
  classification: string,
  allowed: boolean,
) {
  const label = envKey;
  const secret = classification === "SECRET_HANDLE";
  const allowsFrozen =
    consumer.frozen_config_mode === "REQUIRED_AFTER_FREEZE" ||
    consumer.frozen_config_mode === "BROWSER_SAFE_PLUS_FROZEN_CONFIG_METADATA";

  return [
    {
      stratum_ref: "BOOTSTRAP_INPUTS" as const,
      status: allowed ? "ALLOW" : "BLOCKED",
      accessible_label: `${consumer.label} ${allowed ? "can read" : "is blocked from"} ${label} through bootstrap inputs`,
    },
    {
      stratum_ref: "SECRET_HANDLES" as const,
      status: secret ? (allowed ? "ALLOW" : "BLOCKED") : "NOT_APPLICABLE",
      accessible_label: secret
        ? `${consumer.label} ${allowed ? "can use" : "is blocked from"} secret handle ${label}`
        : `${consumer.label} does not use secret handles for ${label}`,
    },
    {
      stratum_ref: "FROZEN_CONFIG" as const,
      status:
        classification === "BROWSER_SAFE_METADATA"
          ? "NOT_APPLICABLE"
          : allowed && allowsFrozen
            ? "ALLOW"
            : allowed
              ? "NOT_APPLICABLE"
              : "BLOCKED",
      accessible_label:
        allowed && allowsFrozen
          ? `${consumer.label} can inherit ${label} through frozen config`
          : allowed
            ? `${consumer.label} does not require frozen-config carriage for ${label}`
            : `${consumer.label} is blocked from ${label} by frozen-config policy`,
    },
    {
      stratum_ref: "RUNTIME_CONSUMERS" as const,
      status: allowed ? "ALLOW" : "BLOCKED",
      accessible_label: `${consumer.label} ${allowed ? "can read" : "is blocked from"} ${label}`,
    },
  ];
}

export function createEnvironmentBasisAtlasPayload(
  policySet: RuntimePolicySet,
): EnvironmentBasisAtlasPayload {
  const keyIndex = definitionsByKey(policySet.runtimeEnvironmentCatalog);
  const handlePolicyIndex = policyEntriesByEnvKey(policySet.secretInjectionPolicy);
  const ladders = laddersByConsumer(policySet.secretInjectionPolicy);

  const consumers = policySet.runtimeEnvironmentCatalog.consumer_classes.map((consumer) => {
    const ladder = ladders.get(consumer.consumer_ref);
    const variableRefs = unique([
      ...consumer.allowed_env_keys,
      ...consumer.allowed_secret_keys,
      ...consumer.forbidden_env_keys,
    ]).filter((envKey) => keyIndex.has(envKey));

    return {
      consumer_ref: consumer.consumer_ref,
      label: consumer.label,
      runtime_boundary: consumer.runtime_boundary,
      basis_statement: consumer.basis_statement,
      browser_safe_projection: consumer.browser_safe_projection,
      allowed_keys: [...consumer.allowed_env_keys, ...consumer.allowed_secret_keys],
      forbidden_keys: consumer.forbidden_env_keys,
      source_lineage: ladder
        ? [
            `Resolution order · ${ladder.order.join(" → ")}`,
            `Live env fallback after freeze · ${ladder.live_env_fallback_after_freeze}`,
          ]
        : [],
      failure_modes: consumer.failure_modes,
      variables: variableRefs.map((envKey) => {
        const definition = keyIndex.get(envKey)!;
        const allowed =
          consumer.allowed_env_keys.includes(envKey) ||
          consumer.allowed_secret_keys.includes(envKey);
        const handlePolicy = handlePolicyIndex.get(envKey);
        return {
          variable_ref: envKey,
          label: envKey,
          classification: definition.classification,
          tone: toneForVariable(definition.classification, allowed),
          summary: definition.description,
          path_cells: pathCellsForVariable(consumer, envKey, definition.classification, allowed),
          inspector: {
            allowed_sources: definition.allowed_sources,
            browser_safe: definition.browser_safe ? "YES" : "NO",
            blocked_reason: allowed
              ? "Allowed for the selected consumer."
              : `Forbidden to ${consumer.consumer_ref}; see consumer boundary and secret posture.`,
            notes: [...consumer.notes, ...(handlePolicy?.notes ?? [])],
          },
        };
      }),
    };
  });

  return {
    routeId: "environment-basis-atlas",
    title: "Taxat Environment Basis Atlas",
    environmentFamilyBadge: "ENV",
    basisStatement: policySet.runtimeEnvironmentCatalog.basis_statement,
    strata: [
      {
        stratum_ref: "BOOTSTRAP_INPUTS",
        label: "BOOTSTRAP INPUTS",
        summary: "Process env, explicit overrides, or local-only handle files before seal.",
      },
      {
        stratum_ref: "SECRET_HANDLES",
        label: "SECRET HANDLES",
        summary: "Opaque refs and metadata only; no raw credential values.",
      },
      {
        stratum_ref: "FROZEN_CONFIG",
        label: "FROZEN CONFIG",
        summary: "Manifest-bound execution basis once ConfigFreeze exists.",
      },
      {
        stratum_ref: "RUNTIME_CONSUMERS",
        label: "RUNTIME CONSUMERS",
        summary: "API, worker, tooling, browser automation, and native-adjacent callers.",
      },
    ],
    consumers,
    selectedConsumerRef: "API",
    selectedVariableRef: "TAXAT_ENVIRONMENT_ID",
  };
}

async function emitEnvironmentBasisAtlasPayload(payload: EnvironmentBasisAtlasPayload) {
  await mkdir(path.dirname(atlasDataPath), { recursive: true });
  await writeFile(atlasDataPath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
}

async function checkEnvironmentBasisAtlasPayload(payload: EnvironmentBasisAtlasPayload) {
  const existing = await readFile(atlasDataPath, "utf8");
  const expected = `${JSON.stringify(payload, null, 2)}\n`;
  if (existing !== expected) {
    throw new Error(`Out-of-sync generated file: ${path.relative(repoRoot, atlasDataPath)}`);
  }
}

async function main() {
  const args = new Set(process.argv.slice(2));
  const mode = args.has("--emit") ? "emit" : "check";
  const policySet = await loadRuntimePolicySet();
  const payload = createEnvironmentBasisAtlasPayload(policySet);

  if (mode === "emit") {
    await emitEnvironmentBasisAtlasPayload(payload);
  } else {
    await checkEnvironmentBasisAtlasPayload(payload);
  }

  console.log(
    `${mode === "emit" ? "wrote" : "verified"} runtime environment policy: ${
      policySet.runtimeEnvironmentCatalog.consumer_classes.length
    } consumers, ${policySet.runtimeEnvironmentCatalog.runtime_key_catalog.length} keys, ${
      policySet.secretInjectionPolicy.handle_env_keys.length
    } secret handle policies`,
  );
  console.log(`atlas payload: ${path.relative(repoRoot, atlasDataPath)}`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
