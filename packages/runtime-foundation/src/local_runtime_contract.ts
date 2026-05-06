import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

type ReadinessClass = "BASE" | "SEMANTIC";
type RequirementKind =
  | "COMPOSE_EXITED_ZERO"
  | "COMPOSE_RUNNING_HEALTHY"
  | "STATE_MARKER_EQUALS"
  | "STATE_MARKER_INCLUDES_ALL"
  | "STATE_MARKER_NON_EMPTY";

export type LocalRuntimeProfileRef = "devcontainer" | "local" | "local-provisioning";

export type LocalRuntimeServiceRow = {
  service_ref: string;
  label: string;
  family: string;
  provider_family: string;
  provider_status:
    | "NOT_SELECTED"
    | "PROVIDER_LOCAL_EMULATION_ADOPTED"
    | "PROVIDER_OVERRIDE_APPLIED";
  compose_service_refs: string[];
  persistence_class: "DISPOSABLE_ACCELERATION" | "DURABLE_TRUTH" | "HOST_PROCESS_GATE";
  reset_class: "DISPOSABLE_PURGEABLE" | "DURABLE_PROTECTED" | "HOST_PROCESS_ONLY";
  runtime_scope: string;
  port_bindings: string[];
  namespace_refs: string[];
  dependency_service_refs: string[];
  readiness_marker_refs: string[];
  safe_rebuild_instructions: string[];
  notes: string[];
};

export type LocalRuntimeConnectionRow = {
  edge_ref: string;
  label: string;
  edge_class: "DERIVED_TRANSPORT" | "DISPOSABLE_ACCELERATION" | "DURABLE_TRUTH";
  from_service_ref: string;
  to_service_ref: string;
  summary: string;
  notes: string[];
};

export type LocalRuntimeTopology = {
  contract_version: "LOCAL_RUNTIME_TOPOLOGY_V1";
  topology_id: string;
  basis_statement: string;
  project_name: string;
  allowed_bootstrap_profile_refs: LocalRuntimeProfileRef[];
  default_bootstrap_profile_ref: LocalRuntimeProfileRef;
  environment_ref_map: Record<LocalRuntimeProfileRef, string>;
  durable_volume_refs: string[];
  disposable_volume_refs: string[];
  services: LocalRuntimeServiceRow[];
  connections: LocalRuntimeConnectionRow[];
};

export type BootPhase = {
  phase_ref: string;
  order: number;
  kind: "COMPOSE_BOOTSTRAP" | "COMPOSE_SERVICES" | "HOST_PROCESS_GATE" | "HOST_SCRIPT";
  label: string;
  service_refs: string[];
  compose_service_refs: string[];
  host_command_refs: string[];
  completion_gate: string;
  notes: string[];
};

export type LocalServiceBootOrder = {
  contract_version: "LOCAL_SERVICE_BOOT_ORDER_V1";
  boot_order_id: string;
  basis_statement: string;
  phases: BootPhase[];
};

export type LocalServiceHealthCheck = {
  check_ref: string;
  readiness_class: ReadinessClass;
  service_ref: string;
  compose_service_ref_or_null: string | null;
  requirement_kind: RequirementKind;
  marker_ref_or_null: string | null;
  expected_string_or_null: boolean | number | string | null;
  expected_values_or_null: string[] | null;
  readiness_code: string;
  failure_code: string;
  notes: string[];
};

export type LocalServiceHealthContract = {
  contract_version: "LOCAL_SERVICE_HEALTH_CONTRACT_V1";
  health_contract_id: string;
  basis_statement: string;
  checks: LocalServiceHealthCheck[];
};

export type LocalProviderOverride = {
  override_ref: string;
  service_ref: string;
  runtime_env_key: string;
  environment_refs: string[];
  provider_status:
    | "NOT_SELECTED"
    | "PROVIDER_LOCAL_EMULATION_ADOPTED"
    | "PROVIDER_OVERRIDE_APPLIED";
  value_template: string;
  secret_strategy: string;
  feature_flag_ref_or_null: string | null;
  notes: string[];
};

export type LocalProviderOverrides = {
  contract_version: "LOCAL_PROVIDER_OVERRIDES_V1";
  policy_id: string;
  basis_statement: string;
  allowed_bootstrap_profile_refs: LocalRuntimeProfileRef[];
  runtime_profiles: Record<
    LocalRuntimeProfileRef,
    {
      environment_ref: string;
      provider_environment_ref: string;
      safe_for_live_providers: boolean;
    }
  >;
  overrides: LocalProviderOverride[];
};

export type LocalSeedProfile = {
  seed_profile_ref: string;
  label: string;
  environment_ref: string;
  golden_pack_seed_ref: string;
  deterministic_seed_refs: string[];
  embodiment_refs: string[];
  required_fixture_ids: string[];
  smoke_contract_refs: string[];
  validator_mode: "RUN_AUTHORITATIVE_ORACLES_BY_DEFAULT";
  notes: string[];
};

export type LocalSeedProfiles = {
  contract_version: "LOCAL_SEED_PROFILES_V1";
  seed_catalog_id: string;
  basis_statement: string;
  default_seed_profile_ref: string;
  profiles: LocalSeedProfile[];
};

export type DeterministicGoldenPackSeed = {
  golden_pack_seed_id: string;
  root_seed_ref: string;
  expected_golden_pack_hash: string;
  module_fixture_inputs: Array<{ fixture_id: string }>;
  state_transition_fixture_inputs: Array<{ fixture_id: string }>;
  replay_fixture_inputs: Array<{ fixture_id: string }>;
  cadence_fixture_inputs: Array<{ fixture_id: string }>;
};

export type SchemaBundleVersionCatalog = {
  currentImportedSchemaBundleHash: string;
};

export type LocalComposeServiceState = {
  compose_service_ref: string;
  state: "exited" | "running" | "unknown";
  health: "healthy" | "starting" | "unhealthy" | null;
  exit_code: number | null;
};

export type LocalRuntimeStateManifest = {
  state_version: "LOCAL_RUNTIME_STATE_V1";
  runtime_profile_ref: LocalRuntimeProfileRef;
  environment_ref: string;
  seed_profile_ref: string;
  deterministic_golden_pack_hash: string;
  control_store_schema_bundle_hash: string;
  validator_status: "PASSED" | "SKIPPED";
  smoke_results: Record<string, "PASS">;
  markers: Record<string, boolean | number | string | string[]>;
};

export type LocalRuntimeHealthSnapshot = {
  compose_service_states: LocalComposeServiceState[];
  state_markers: Record<string, boolean | number | string | string[]>;
};

export type LocalRuntimeHealthEvaluation = {
  ok: boolean;
  readinessClass: ReadinessClass;
  readinessCodes: string[];
  failureCodes: string[];
  serviceStatuses: Array<{
    serviceRef: string;
    ok: boolean;
    readinessCodes: string[];
    failureCodes: string[];
  }>;
};

export type LocalRuntimeContractBundle = {
  topology: LocalRuntimeTopology;
  bootOrder: LocalServiceBootOrder;
  healthContract: LocalServiceHealthContract;
  providerOverrides: LocalProviderOverrides;
  seedProfiles: LocalSeedProfiles;
  goldenPackSeed: DeterministicGoldenPackSeed;
  schemaBundleHash: string;
  composeServiceNames: string[];
};

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
export const repoRoot = path.resolve(scriptDir, "..", "..", "..");
const infraLocalDir = path.join(repoRoot, "infra", "local");
const runtimeLocalConfigDir = path.join(repoRoot, "config", "runtime", "local");

const filePaths = {
  compose: path.join(infraLocalDir, "compose.yaml"),
  healthContract: path.join(infraLocalDir, "service_health_contract.json"),
  bootOrder: path.join(infraLocalDir, "service_boot_order.json"),
  topology: path.join(infraLocalDir, "local_runtime_topology.json"),
  providerOverrides: path.join(runtimeLocalConfigDir, "provider_overrides.json"),
  seedProfiles: path.join(runtimeLocalConfigDir, "local_seed_profiles.json"),
  goldenPackSeed: path.join(repoRoot, "fixtures", "synthetic", "deterministic_golden_pack_seed.json"),
  schemaBundleCatalog: path.join(
    repoRoot,
    "config",
    "migrations",
    "schema_bundle_version_catalog.json",
  ),
} as const;

function assertCondition(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

async function readJson<T>(filePath: string) {
  return JSON.parse(await readFile(filePath, "utf8")) as T;
}

function uniq<T>(values: readonly T[]) {
  return [...new Set(values)];
}

function parseComposeServiceNames(source: string) {
  const names: string[] = [];
  let inServices = false;

  for (const line of source.split(/\r?\n/u)) {
    if (!inServices) {
      if (/^services:\s*$/u.test(line)) {
        inServices = true;
      }
      continue;
    }

    if (/^[A-Za-z0-9_-]/u.test(line)) {
      break;
    }

    const match = line.match(/^  ([A-Za-z0-9_-]+):\s*$/u);
    if (match) {
      names.push(match[1]);
    }
  }

  return names;
}

function validateTopology(topology: LocalRuntimeTopology) {
  assertCondition(
    topology.contract_version === "LOCAL_RUNTIME_TOPOLOGY_V1",
    "local runtime topology contract version drifted",
  );
  assertCondition(topology.services.length >= 7, "expected at least seven local runtime services");

  const serviceRefs = new Set<string>();
  for (const service of topology.services) {
    assertCondition(!serviceRefs.has(service.service_ref), `duplicate service ${service.service_ref}`);
    serviceRefs.add(service.service_ref);
    if (service.reset_class !== "HOST_PROCESS_ONLY") {
      assertCondition(
        service.compose_service_refs.length > 0,
        `${service.service_ref} must bind compose refs`,
      );
    }
    assertCondition(
      service.safe_rebuild_instructions.length > 0,
      `${service.service_ref} must declare safe rebuild instructions`,
    );
  }

  for (const connection of topology.connections) {
    assertCondition(
      serviceRefs.has(connection.from_service_ref),
      `connection ${connection.edge_ref} references unknown from_service ${connection.from_service_ref}`,
    );
    assertCondition(
      serviceRefs.has(connection.to_service_ref),
      `connection ${connection.edge_ref} references unknown to_service ${connection.to_service_ref}`,
    );
  }

  assertCondition(
    topology.durable_volume_refs.length > 0 && topology.disposable_volume_refs.length > 0,
    "topology must declare both durable and disposable volumes",
  );
}

function validateBootOrder(bundle: {
  bootOrder: LocalServiceBootOrder;
  composeServiceNames: string[];
  topology: LocalRuntimeTopology;
}) {
  const { bootOrder, composeServiceNames, topology } = bundle;
  assertCondition(
    bootOrder.contract_version === "LOCAL_SERVICE_BOOT_ORDER_V1",
    "service boot order contract version drifted",
  );

  const serviceRefs = new Set(topology.services.map((service) => service.service_ref));
  const seenOrders = new Set<number>();
  let previousOrder = -1;
  for (const phase of bootOrder.phases) {
    assertCondition(!seenOrders.has(phase.order), `duplicate boot phase order ${phase.order}`);
    seenOrders.add(phase.order);
    assertCondition(phase.order > previousOrder, "boot phases must stay strictly ordered");
    previousOrder = phase.order;
    for (const serviceRef of phase.service_refs) {
      assertCondition(serviceRefs.has(serviceRef), `unknown boot-order service ${serviceRef}`);
    }
    for (const composeServiceRef of phase.compose_service_refs) {
      assertCondition(
        composeServiceNames.includes(composeServiceRef),
        `boot-order compose service ${composeServiceRef} missing from compose.yaml`,
      );
    }
  }
}

function validateHealthContract(bundle: {
  healthContract: LocalServiceHealthContract;
  composeServiceNames: string[];
  schemaBundleHash: string;
  topology: LocalRuntimeTopology;
}) {
  const { healthContract, composeServiceNames, topology } = bundle;
  assertCondition(
    healthContract.contract_version === "LOCAL_SERVICE_HEALTH_CONTRACT_V1",
    "service health contract version drifted",
  );

  const serviceRefs = new Set(topology.services.map((service) => service.service_ref));
  for (const check of healthContract.checks) {
    assertCondition(serviceRefs.has(check.service_ref), `health check references unknown service ${check.service_ref}`);
    if (check.compose_service_ref_or_null) {
      assertCondition(
        composeServiceNames.includes(check.compose_service_ref_or_null),
        `health check ${check.check_ref} references missing compose service ${check.compose_service_ref_or_null}`,
      );
    }
    if (check.requirement_kind === "STATE_MARKER_EQUALS") {
      assertCondition(
        check.expected_string_or_null !== null &&
          (typeof check.expected_string_or_null !== "string" ||
            check.expected_string_or_null.length > 0),
        `${check.check_ref} requires expected_string_or_null`,
      );
    }
    if (check.requirement_kind === "STATE_MARKER_INCLUDES_ALL") {
      assertCondition(
        Array.isArray(check.expected_values_or_null) && check.expected_values_or_null.length > 0,
        `${check.check_ref} requires expected_values_or_null`,
      );
    }
  }
}

function validateProviderOverrides(bundle: {
  providerOverrides: LocalProviderOverrides;
  topology: LocalRuntimeTopology;
}) {
  const { providerOverrides, topology } = bundle;
  assertCondition(
    providerOverrides.contract_version === "LOCAL_PROVIDER_OVERRIDES_V1",
    "provider overrides contract version drifted",
  );
  assertCondition(
    JSON.stringify(providerOverrides.allowed_bootstrap_profile_refs) ===
      JSON.stringify(topology.allowed_bootstrap_profile_refs),
    "provider overrides must reuse topology bootstrap profile refs",
  );
  const serviceRefs = new Set(topology.services.map((service) => service.service_ref));
  for (const override of providerOverrides.overrides) {
    assertCondition(serviceRefs.has(override.service_ref), `provider override references unknown service ${override.service_ref}`);
    assertCondition(
      !override.value_template.includes("test-api.service.hmrc.gov.uk") ||
        override.environment_refs.includes("env_local_provisioning_workstation"),
      "sandbox provider endpoints may only appear in local provisioning overrides",
    );
  }
}

function fixtureIdsFromGoldenPack(seed: DeterministicGoldenPackSeed) {
  return uniq([
    ...seed.module_fixture_inputs.map((entry) => entry.fixture_id),
    ...seed.state_transition_fixture_inputs.map((entry) => entry.fixture_id),
    ...seed.replay_fixture_inputs.map((entry) => entry.fixture_id),
    ...seed.cadence_fixture_inputs.map((entry) => entry.fixture_id),
  ]);
}

function validateSeedProfiles(bundle: {
  goldenPackSeed: DeterministicGoldenPackSeed;
  seedProfiles: LocalSeedProfiles;
  topology: LocalRuntimeTopology;
}) {
  const { goldenPackSeed, seedProfiles, topology } = bundle;
  assertCondition(
    seedProfiles.contract_version === "LOCAL_SEED_PROFILES_V1",
    "local seed profiles contract version drifted",
  );
  const fixtureIds = new Set(fixtureIdsFromGoldenPack(goldenPackSeed));
  const allowedEnvironmentRefs = new Set(Object.values(topology.environment_ref_map));
  const seen = new Set<string>();
  for (const profile of seedProfiles.profiles) {
    assertCondition(!seen.has(profile.seed_profile_ref), `duplicate seed profile ${profile.seed_profile_ref}`);
    seen.add(profile.seed_profile_ref);
    assertCondition(
      allowedEnvironmentRefs.has(profile.environment_ref),
      `seed profile ${profile.seed_profile_ref} targets unknown environment ${profile.environment_ref}`,
    );
    for (const fixtureId of profile.required_fixture_ids) {
      assertCondition(
        fixtureIds.has(fixtureId),
        `seed profile ${profile.seed_profile_ref} references unknown fixture ${fixtureId}`,
      );
    }
  }
  assertCondition(
    seen.has(seedProfiles.default_seed_profile_ref),
    "default seed profile must exist in profiles list",
  );
}

export async function loadLocalRuntimeContractBundle() {
  const [
    composeSource,
    topology,
    bootOrder,
    healthContract,
    providerOverrides,
    seedProfiles,
    goldenPackSeed,
    schemaBundleCatalog,
  ] = await Promise.all([
    readFile(filePaths.compose, "utf8"),
    readJson<LocalRuntimeTopology>(filePaths.topology),
    readJson<LocalServiceBootOrder>(filePaths.bootOrder),
    readJson<LocalServiceHealthContract>(filePaths.healthContract),
    readJson<LocalProviderOverrides>(filePaths.providerOverrides),
    readJson<LocalSeedProfiles>(filePaths.seedProfiles),
    readJson<DeterministicGoldenPackSeed>(filePaths.goldenPackSeed),
    readJson<SchemaBundleVersionCatalog>(filePaths.schemaBundleCatalog),
  ]);

  const composeServiceNames = parseComposeServiceNames(composeSource);
  const schemaBundleHash = schemaBundleCatalog.currentImportedSchemaBundleHash;

  validateTopology(topology);
  validateBootOrder({
    bootOrder,
    composeServiceNames,
    topology,
  });
  validateHealthContract({
    composeServiceNames,
    healthContract,
    schemaBundleHash,
    topology,
  });
  validateProviderOverrides({
    providerOverrides,
    topology,
  });
  validateSeedProfiles({
    goldenPackSeed,
    seedProfiles,
    topology,
  });

  return {
    topology,
    bootOrder,
    healthContract,
    providerOverrides,
    seedProfiles,
    goldenPackSeed,
    schemaBundleHash,
    composeServiceNames,
  } satisfies LocalRuntimeContractBundle;
}

export function defaultLocalRuntimeStateManifest(
  bundle: LocalRuntimeContractBundle,
  init: {
    runtimeProfileRef?: LocalRuntimeProfileRef;
    seedProfileRef?: string;
    validatorStatus?: "PASSED" | "SKIPPED";
  } = {},
) {
  const runtimeProfileRef = init.runtimeProfileRef ?? bundle.topology.default_bootstrap_profile_ref;
  const seedProfileRef = init.seedProfileRef ?? bundle.seedProfiles.default_seed_profile_ref;
  const queueService = bundle.topology.services.find((service) => service.service_ref === "QUEUE");
  const objectService = bundle.topology.services.find((service) => service.service_ref === "OBJECT_STORAGE");
  const cacheService = bundle.topology.services.find((service) => service.service_ref === "CACHE");

  assertCondition(queueService, "queue service missing from topology");
  assertCondition(objectService, "object service missing from topology");
  assertCondition(cacheService, "cache service missing from topology");

  return {
    state_version: "LOCAL_RUNTIME_STATE_V1",
    runtime_profile_ref: runtimeProfileRef,
    environment_ref: bundle.topology.environment_ref_map[runtimeProfileRef],
    seed_profile_ref: seedProfileRef,
    deterministic_golden_pack_hash: bundle.goldenPackSeed.expected_golden_pack_hash,
    control_store_schema_bundle_hash: bundle.schemaBundleHash,
    validator_status: init.validatorStatus ?? "PASSED",
    smoke_results: {
      audit_path: "PASS",
      cache_path: "PASS",
      command_path: "PASS",
      object_store_path: "PASS",
      queue_path: "PASS",
    },
    markers: {
      audit_append_probe_ready: true,
      cache_namespace_refs: cacheService.namespace_refs,
      control_store_database_ready: true,
      control_store_schema_bundle_hash: bundle.schemaBundleHash,
      deterministic_golden_pack_hash: bundle.goldenPackSeed.expected_golden_pack_hash,
      object_storage_bucket_refs: objectService.namespace_refs,
      queue_namespace_refs: queueService.namespace_refs,
      seed_profile_ref: seedProfileRef,
      smoke_audit_path: "PASS",
      smoke_cache_path: "PASS",
      smoke_command_path: "PASS",
      smoke_object_store_path: "PASS",
      smoke_queue_path: "PASS",
      validator_status: init.validatorStatus ?? "PASSED",
    },
  } satisfies LocalRuntimeStateManifest;
}

export function defaultComposeSnapshot(bundle: LocalRuntimeContractBundle): LocalComposeServiceState[] {
  return bundle.composeServiceNames.map((composeServiceRef) => ({
    compose_service_ref: composeServiceRef,
    state: composeServiceRef.endsWith("-bootstrap") ? "exited" : "running",
    health: composeServiceRef.endsWith("-bootstrap") ? null : "healthy",
    exit_code: composeServiceRef.endsWith("-bootstrap") ? 0 : null,
  }));
}

function checkPasses(
  check: LocalServiceHealthCheck,
  snapshot: LocalRuntimeHealthSnapshot,
) {
  if (check.requirement_kind === "COMPOSE_RUNNING_HEALTHY") {
    const serviceState = snapshot.compose_service_states.find(
      (service) => service.compose_service_ref === check.compose_service_ref_or_null,
    );
    return serviceState?.state === "running" && serviceState.health === "healthy";
  }

  if (check.requirement_kind === "COMPOSE_EXITED_ZERO") {
    const serviceState = snapshot.compose_service_states.find(
      (service) => service.compose_service_ref === check.compose_service_ref_or_null,
    );
    return serviceState?.state === "exited" && serviceState.exit_code === 0;
  }

  const marker =
    check.marker_ref_or_null === null ? undefined : snapshot.state_markers[check.marker_ref_or_null];
  if (check.requirement_kind === "STATE_MARKER_EQUALS") {
    return marker === check.expected_string_or_null;
  }
  if (check.requirement_kind === "STATE_MARKER_NON_EMPTY") {
    if (Array.isArray(marker)) {
      return marker.length > 0;
    }
    return marker !== undefined && marker !== null && marker !== "";
  }
  if (check.requirement_kind === "STATE_MARKER_INCLUDES_ALL") {
    return (
      Array.isArray(marker) &&
      (check.expected_values_or_null ?? []).every((expectedValue) =>
        marker.includes(expectedValue),
      )
    );
  }
  return false;
}

export function evaluateLocalRuntimeHealth(
  bundle: LocalRuntimeContractBundle,
  snapshot: LocalRuntimeHealthSnapshot,
  readinessClass: ReadinessClass,
) {
  const targetChecks = bundle.healthContract.checks.filter((check) =>
    readinessClass === "SEMANTIC" ? true : check.readiness_class === "BASE",
  );

  const grouped = new Map<
    string,
    {
      readinessCodes: string[];
      failureCodes: string[];
    }
  >();
  for (const service of bundle.topology.services) {
    grouped.set(service.service_ref, {
      readinessCodes: [],
      failureCodes: [],
    });
  }

  for (const check of targetChecks) {
    const serviceStatus = grouped.get(check.service_ref);
    assertCondition(serviceStatus, `missing grouped service ${check.service_ref}`);
    if (checkPasses(check, snapshot)) {
      serviceStatus.readinessCodes.push(check.readiness_code);
      continue;
    }
    serviceStatus.failureCodes.push(check.failure_code);
  }

  const serviceStatuses = [...grouped.entries()].map(([serviceRef, status]) => ({
    serviceRef,
    ok: status.failureCodes.length === 0,
    readinessCodes: status.readinessCodes,
    failureCodes: status.failureCodes,
  }));

  return {
    ok: serviceStatuses.every((status) => status.ok),
    readinessClass,
    readinessCodes: uniq(serviceStatuses.flatMap((status) => status.readinessCodes)),
    failureCodes: uniq(serviceStatuses.flatMap((status) => status.failureCodes)),
    serviceStatuses,
  } satisfies LocalRuntimeHealthEvaluation;
}
