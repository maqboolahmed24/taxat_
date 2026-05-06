import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import type { LocalRuntimeProfileRef, LocalSeedProfiles } from "./local_runtime_contract";
import { loadLocalRuntimeContractBundle } from "./local_runtime_contract";

export type ScopeClassRef =
  | "CI_RUN_SHARD"
  | "PREVIEW_REVIEW_SHARD"
  | "LOCAL_HIGH_FIDELITY_SHARD";

export type EphemeralLifecycleState =
  | "REQUESTED"
  | "BOOTSTRAPPING"
  | "HALTED"
  | "READY"
  | "RESETTING"
  | "DESTROY_PENDING"
  | "DESTROYED"
  | "FAILED";

export type EphemeralPhaseRef =
  | "IDENTITY_LOCK"
  | "RUNTIME_HEALTH_GATE"
  | "NAMESPACE_PROVISION"
  | "MIGRATION_BASIS"
  | "SEED_LOAD"
  | "CLEANLINESS_VERIFY"
  | "DESTROY_CLEANUP";

export type ResetScopeRef = "FAST_DISPOSABLE_REUSE" | "FULL_TEST_ISOLATION";

export type EnvironmentRef =
  | "env_ci_ephemeral_validation"
  | "env_ephemeral_review_preview"
  | "env_local_authoring";

export type EphemeralEnvironmentCatalog = {
  contract_version: "EPHEMERAL_ENVIRONMENT_CATALOG_V1";
  catalog_id: string;
  basis_statement: string;
  unit_of_ephemerality: "TEST_SHARD_INSTANCE";
  naming_contract: {
    environment_id_pattern: string;
    namespace_hash_length: number;
    approved_namespace_prefixes: string[];
  };
  scope_rows: Array<{
    scope_class_ref: ScopeClassRef;
    environment_ref: EnvironmentRef;
    default_seed_profile_ref: string;
    owner_ref_pattern: string;
    notes: string[];
  }>;
  resource_class_rows: Array<{
    resource_class_ref: string;
    service_ref:
      | "CONTROL_STORE"
      | "AUDIT_STORE"
      | "OBJECT_STORAGE"
      | "QUEUE"
      | "CACHE"
      | "APP"
      | "WORKERS";
    namespace_template: string;
    persistence_class:
      | "RESETTABLE_EPHEMERAL_TRUTH"
      | "DISPOSABLE_ACCELERATION"
      | "EVIDENCE_RETAINED";
    reset_behavior:
      | "RECREATE_AND_RESEED"
      | "PURGE_AND_REBUILD"
      | "PRESERVE_EVIDENCE_ONLY";
  }>;
};

export type EphemeralEnvironmentLifecyclePolicy = {
  contract_version: "EPHEMERAL_ENVIRONMENT_LIFECYCLE_POLICY_V1";
  policy_id: string;
  basis_statement: string;
  phase_rows: Array<{
    phase_ref: EphemeralPhaseRef;
    order: number;
    completion_rule: string;
  }>;
  transition_rows: Array<{
    from_state: EphemeralLifecycleState;
    to_state: EphemeralLifecycleState;
    allowed_phase_ref: EphemeralPhaseRef;
    notes: string[];
  }>;
  haltable_phase_refs: EphemeralPhaseRef[];
};

export type ResetScopePolicy = {
  contract_version: "EPHEMERAL_RESET_SCOPE_POLICY_V1";
  policy_id: string;
  basis_statement: string;
  reset_scope_rows: Array<{
    reset_scope_ref: ResetScopeRef;
    reseed_required: boolean;
    touched_resource_classes: string[];
    preserved_resource_classes: string[];
    notes: string[];
  }>;
  reset_order_rows: Array<{
    step_ref: string;
    action: string;
    resource_class_refs: string[];
  }>;
};

export type JsonSchemaEnvelope = {
  title?: string;
  type?: string;
  required?: string[];
  properties?: Record<string, unknown>;
};

export type EphemeralEnvironmentIdentity = {
  environment_id: string;
  environment_ref: EnvironmentRef;
  scope_class_ref: ScopeClassRef;
  owner_ref: string;
  shard_ref: string;
  runtime_profile_ref: LocalRuntimeProfileRef;
  seed_profile_ref: string;
  environment_identity_hash: string;
  namespace_hash: string;
};

export type EphemeralSeedMaterial = {
  material_version: "EPHEMERAL_SEED_MATERIAL_V1";
  environment_id: string;
  environment_identity_hash: string;
  seed_profile_ref: string;
  seed_profile_hash: string;
  golden_pack_hash: string;
  deterministic_seed_refs: string[];
  embodiment_refs: string[];
  required_fixture_ids: string[];
  browser_session: {
    actor_alias: string;
    session_ref: string;
    client_ref: string;
  };
  route_identity_ref: string;
  queue_flow_ref: string;
  upload_object_ref: string;
  upload_session_ref: string;
  request_version_ref: string;
  cache_partition_ref: string;
  retry_rebase_token: string;
};

export type EphemeralEnvironmentManifest = {
  manifest_version: "EPHEMERAL_ENVIRONMENT_MANIFEST_V1";
  environment_id: string;
  environment_ref: EnvironmentRef;
  scope_class_ref: ScopeClassRef;
  owner_ref: string;
  shard_ref: string;
  runtime_profile_ref: LocalRuntimeProfileRef;
  runtime_topology_ref: string;
  control_store_schema_bundle_hash: string;
  environment_identity_hash: string;
  namespace_hash: string;
  seed_profile_ref: string;
  seed_profile_hash: string;
  golden_pack_hash: string;
  lifecycle_state: EphemeralLifecycleState;
  current_phase_ref: EphemeralPhaseRef;
  completed_phase_refs: EphemeralPhaseRef[];
  chronology: Array<{
    at: string;
    event_ref: string;
    phase_ref: EphemeralPhaseRef;
    lifecycle_state: EphemeralLifecycleState;
    status: "STARTED" | "SUCCEEDED" | "HALTED" | "FAILED";
    detail: string;
  }>;
  namespaces: {
    control_schema_ref: string;
    audit_schema_ref: string;
    object_prefix_refs: string[];
    queue_namespace_refs: string[];
    dlq_namespace_refs: string[];
    cache_namespace_refs: string[];
    projection_namespace_ref: string;
    stream_cursor_namespace_ref: string;
    upload_session_namespace_ref: string;
    worker_lease_namespace_ref: string;
    audit_stream_namespace_ref: string;
  };
  resource_state: {
    service_availability: Record<string, boolean>;
    active_worker_leases: number;
    queue_message_count: number;
    cache_key_count: number;
    projection_count: number;
    stream_cursor_count: number;
    upload_session_count: number;
    control_schema_row_count: number;
    audit_schema_row_count: number;
    object_prefix_object_counts: Record<string, number>;
    last_reset_scope_ref_or_null: ResetScopeRef | null;
    debug_retention_active: boolean;
  };
  browser_attachment: {
    environment_identity_chip: string;
    session_fixture_alias: string;
    route_identity_ref: string;
    queue_flow_ref: string;
    upload_object_ref: string;
    cache_partition_ref: string;
    retry_rebase_token: string;
  };
  seed_material_hash: string;
  last_cleanliness_hash_or_null: string | null;
  reset_counter: number;
  last_reset_evidence_ref_or_null: string | null;
};

export type EphemeralCleanlinessReport = {
  report_version: "EPHEMERAL_CLEANLINESS_REPORT_V1";
  environment_id: string;
  environment_identity_hash: string;
  ok: boolean;
  failureCodes: string[];
  warningCodes: string[];
  cleanliness_hash: string;
  resource_counts: {
    active_worker_leases: number;
    queue_message_count: number;
    cache_key_count: number;
    projection_count: number;
    stream_cursor_count: number;
    upload_session_count: number;
    object_prefix_object_count_total: number;
  };
};

export type ResetEvidence = {
  evidence_version: "EPHEMERAL_RESET_EVIDENCE_V1";
  action_kind: "RESET" | "DESTROY";
  environment_id: string;
  environment_identity_hash: string;
  environment_ref: EnvironmentRef;
  reset_scope_ref: ResetScopeRef | "DESTROY_ENVIRONMENT";
  seed_profile_ref: string;
  seed_profile_hash: string;
  golden_pack_hash: string;
  approved_target_pattern: string;
  chronology: Array<{
    at: string;
    event_ref: string;
    status: "SUCCEEDED" | "HALTED" | "FAILED";
    detail: string;
  }>;
  resource_counts: {
    active_worker_leases: number;
    queue_message_count: number;
    cache_key_count: number;
    projection_count: number;
    stream_cursor_count: number;
    upload_session_count: number;
    object_prefix_object_count_total: number;
  };
  residual_warnings: string[];
  outcome: "SUCCEEDED" | "HALTED" | "FAILED";
  source_lineage: string[];
};

export type EphemeralEnvironmentBundle = {
  catalog: EphemeralEnvironmentCatalog;
  lifecyclePolicy: EphemeralEnvironmentLifecyclePolicy;
  resetScopePolicy: ResetScopePolicy;
  resetEvidenceSchema: JsonSchemaEnvelope;
  localSeedProfiles: LocalSeedProfiles;
  localRuntimeTopologyRef: string;
  schemaBundleHash: string;
  goldenPackHash: string;
};

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, "..", "..", "..");
const infraTestDir = path.join(repoRoot, "infra", "test");
const runtimeLocalConfigDir = path.join(repoRoot, "config", "runtime", "local");
const deterministicGoldenPackPath = path.join(
  repoRoot,
  "fixtures",
  "synthetic",
  "deterministic_golden_pack_seed.json",
);

const filePaths = {
  catalog: path.join(infraTestDir, "ephemeral_environment_catalog.json"),
  lifecyclePolicy: path.join(infraTestDir, "ephemeral_environment_lifecycle_policy.json"),
  resetScopePolicy: path.join(infraTestDir, "reset_scope_policy.json"),
  resetEvidenceSchema: path.join(infraTestDir, "reset_evidence.schema.json"),
  localSeedProfiles: path.join(runtimeLocalConfigDir, "local_seed_profiles.json"),
  deterministicGoldenPack: deterministicGoldenPackPath,
} as const;

function assertCondition(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

async function readJson<T>(filePath: string) {
  return JSON.parse(await readFile(filePath, "utf8")) as T;
}

function canonicalize(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((entry) => canonicalize(entry));
  }
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, entry]) => [key, canonicalize(entry)]),
    );
  }
  return value;
}

function stableHash(value: unknown) {
  return createHash("sha256")
    .update(JSON.stringify(canonicalize(value)))
    .digest("hex");
}

function uniq<T>(values: readonly T[]) {
  return [...new Set(values)];
}

function applyTemplate(template: string, replacements: Record<string, string>) {
  return Object.entries(replacements).reduce(
    (result, [key, value]) => result.replaceAll(`\${${key}}`, value),
    template,
  );
}

function validateCatalog(bundle: {
  catalog: EphemeralEnvironmentCatalog;
  localSeedProfiles: LocalSeedProfiles;
}) {
  const { catalog, localSeedProfiles } = bundle;
  assertCondition(
    catalog.contract_version === "EPHEMERAL_ENVIRONMENT_CATALOG_V1",
    "ephemeral environment catalog contract version drifted",
  );
  const seenScopes = new Set<string>();
  for (const scope of catalog.scope_rows) {
    assertCondition(!seenScopes.has(scope.scope_class_ref), `duplicate scope ${scope.scope_class_ref}`);
    seenScopes.add(scope.scope_class_ref);
    assertCondition(
      localSeedProfiles.profiles.some(
        (profile) => profile.seed_profile_ref === scope.default_seed_profile_ref,
      ),
      `scope ${scope.scope_class_ref} references unknown seed profile ${scope.default_seed_profile_ref}`,
    );
  }
  const seenResources = new Set<string>();
  for (const row of catalog.resource_class_rows) {
    assertCondition(
      !seenResources.has(row.resource_class_ref),
      `duplicate resource class ${row.resource_class_ref}`,
    );
    seenResources.add(row.resource_class_ref);
    assertCondition(
      row.namespace_template.length > 0,
      `resource class ${row.resource_class_ref} must declare a namespace template`,
    );
  }
}

function validateLifecyclePolicy(policy: EphemeralEnvironmentLifecyclePolicy) {
  assertCondition(
    policy.contract_version === "EPHEMERAL_ENVIRONMENT_LIFECYCLE_POLICY_V1",
    "ephemeral environment lifecycle policy contract version drifted",
  );
  const phases = new Set<EphemeralPhaseRef>();
  let previousOrder = -1;
  for (const row of policy.phase_rows) {
    assertCondition(!phases.has(row.phase_ref), `duplicate phase ${row.phase_ref}`);
    phases.add(row.phase_ref);
    assertCondition(row.order > previousOrder, "ephemeral phases must stay strictly ordered");
    previousOrder = row.order;
  }
  for (const row of policy.transition_rows) {
    assertCondition(
      phases.has(row.allowed_phase_ref),
      `transition ${row.from_state}->${row.to_state} references unknown phase ${row.allowed_phase_ref}`,
    );
  }
}

function validateResetScopePolicy(bundle: {
  catalog: EphemeralEnvironmentCatalog;
  resetScopePolicy: ResetScopePolicy;
}) {
  const { catalog, resetScopePolicy } = bundle;
  assertCondition(
    resetScopePolicy.contract_version === "EPHEMERAL_RESET_SCOPE_POLICY_V1",
    "reset scope policy contract version drifted",
  );
  const resourceClasses = new Set(
    catalog.resource_class_rows.map((row) => row.resource_class_ref),
  );
  for (const scope of resetScopePolicy.reset_scope_rows) {
    for (const resourceClass of scope.touched_resource_classes) {
      assertCondition(
        resourceClasses.has(resourceClass),
        `reset scope ${scope.reset_scope_ref} references unknown resource class ${resourceClass}`,
      );
    }
  }
}

function validateResetEvidenceSchema(schema: JsonSchemaEnvelope) {
  assertCondition(schema.type === "object", "reset evidence schema must describe an object");
  assertCondition(
    schema.title === "Ephemeral Reset Evidence",
    "unexpected reset evidence schema title",
  );
  const requiredKeys = new Set(schema.required ?? []);
  for (const key of [
    "evidence_version",
    "action_kind",
    "environment_id",
    "environment_identity_hash",
    "reset_scope_ref",
    "seed_profile_hash",
    "chronology",
    "resource_counts",
    "residual_warnings",
    "outcome",
    "source_lineage",
  ]) {
    assertCondition(requiredKeys.has(key), `reset evidence schema must require ${key}`);
  }
}

export async function loadEphemeralEnvironmentBundle() {
  const [catalog, lifecyclePolicy, resetScopePolicy, resetEvidenceSchema, localSeedProfiles, localRuntimeBundle, goldenPackSeed] =
    await Promise.all([
      readJson<EphemeralEnvironmentCatalog>(filePaths.catalog),
      readJson<EphemeralEnvironmentLifecyclePolicy>(filePaths.lifecyclePolicy),
      readJson<ResetScopePolicy>(filePaths.resetScopePolicy),
      readJson<JsonSchemaEnvelope>(filePaths.resetEvidenceSchema),
      readJson<LocalSeedProfiles>(filePaths.localSeedProfiles),
      loadLocalRuntimeContractBundle(),
      readJson<{ expected_golden_pack_hash: string }>(filePaths.deterministicGoldenPack),
    ]);

  validateCatalog({ catalog, localSeedProfiles });
  validateLifecyclePolicy(lifecyclePolicy);
  validateResetScopePolicy({ catalog, resetScopePolicy });
  validateResetEvidenceSchema(resetEvidenceSchema);

  return {
    catalog,
    lifecyclePolicy,
    resetScopePolicy,
    resetEvidenceSchema,
    localSeedProfiles,
    localRuntimeTopologyRef: localRuntimeBundle.topology.topology_id,
    schemaBundleHash: localRuntimeBundle.schemaBundleHash,
    goldenPackHash: goldenPackSeed.expected_golden_pack_hash,
  } satisfies EphemeralEnvironmentBundle;
}

export function deriveEphemeralEnvironmentIdentity(
  bundle: EphemeralEnvironmentBundle,
  input: {
    environmentId: string;
    ownerRef: string;
    runtimeProfileRef: LocalRuntimeProfileRef;
    scopeClassRef: ScopeClassRef;
    seedProfileRef?: string;
    shardRef: string;
  },
): EphemeralEnvironmentIdentity {
  const scope = bundle.catalog.scope_rows.find(
    (row) => row.scope_class_ref === input.scopeClassRef,
  );
  assertCondition(scope, `unknown scope class ${input.scopeClassRef}`);

  assertCondition(
    new RegExp(bundle.catalog.naming_contract.environment_id_pattern, "u").test(
      input.environmentId,
    ),
    `environment id ${input.environmentId} violates the approved ephemeral pattern`,
  );
  assertCondition(
    new RegExp(scope.owner_ref_pattern, "u").test(input.ownerRef),
    `owner ref ${input.ownerRef} is invalid for ${input.scopeClassRef}`,
  );

  const seedProfileRef = input.seedProfileRef ?? scope.default_seed_profile_ref;
  assertCondition(
    bundle.localSeedProfiles.profiles.some(
      (profile) => profile.seed_profile_ref === seedProfileRef,
    ),
    `unknown seed profile ${seedProfileRef}`,
  );

  const environmentIdentityHash = stableHash({
    environment_id: input.environmentId,
    environment_ref: scope.environment_ref,
    owner_ref: input.ownerRef,
    runtime_profile_ref: input.runtimeProfileRef,
    scope_class_ref: input.scopeClassRef,
    seed_profile_ref: seedProfileRef,
    shard_ref: input.shardRef,
  });

  return {
    environment_id: input.environmentId,
    environment_ref: scope.environment_ref,
    scope_class_ref: input.scopeClassRef,
    owner_ref: input.ownerRef,
    shard_ref: input.shardRef,
    runtime_profile_ref: input.runtimeProfileRef,
    seed_profile_ref: seedProfileRef,
    environment_identity_hash: environmentIdentityHash,
    namespace_hash: environmentIdentityHash.slice(
      0,
      bundle.catalog.naming_contract.namespace_hash_length,
    ),
  };
}

export function deriveEphemeralNamespaces(
  bundle: EphemeralEnvironmentBundle,
  identity: EphemeralEnvironmentIdentity,
) {
  const replacementValues = {
    environment_id: identity.environment_id,
    namespace_hash: identity.namespace_hash,
  };
  const resourceRefs = Object.fromEntries(
    bundle.catalog.resource_class_rows.map((row) => [
      row.resource_class_ref,
      applyTemplate(row.namespace_template, replacementValues),
    ]),
  );

  return {
    control_schema_ref: resourceRefs.CONTROL_SCHEMA,
    audit_schema_ref: resourceRefs.AUDIT_SCHEMA,
    object_prefix_refs: [
      resourceRefs.OBJECT_PREFIX_STAGING,
      resourceRefs.OBJECT_PREFIX_QUARANTINE,
      resourceRefs.OBJECT_PREFIX_DERIVED,
    ],
    queue_namespace_refs: [resourceRefs.QUEUE_NAMESPACE_SET],
    dlq_namespace_refs: [resourceRefs.DLQ_NAMESPACE_SET],
    cache_namespace_refs: [resourceRefs.CACHE_NAMESPACE_SET],
    projection_namespace_ref: resourceRefs.PROJECTION_NAMESPACE_SET,
    stream_cursor_namespace_ref: resourceRefs.STREAM_CURSOR_SET,
    upload_session_namespace_ref: resourceRefs.UPLOAD_SESSION_SET,
    worker_lease_namespace_ref: resourceRefs.WORKER_LEASE_SET,
    audit_stream_namespace_ref: resourceRefs.AUDIT_STREAM_SET
  };
}

export function computeEphemeralSeedProfileHash(
  bundle: EphemeralEnvironmentBundle,
  seedProfileRef: string,
) {
  const profile = bundle.localSeedProfiles.profiles.find(
    (entry) => entry.seed_profile_ref === seedProfileRef,
  );
  assertCondition(profile, `unknown seed profile ${seedProfileRef}`);

  return stableHash({
    embodiment_refs: profile.embodiment_refs,
    environment_ref: profile.environment_ref,
    golden_pack_hash: bundle.goldenPackHash,
    required_fixture_ids: profile.required_fixture_ids,
    seed_profile_ref: profile.seed_profile_ref,
    smoke_contract_refs: profile.smoke_contract_refs,
  });
}

export function createEphemeralSeedMaterial(
  bundle: EphemeralEnvironmentBundle,
  identity: EphemeralEnvironmentIdentity,
): EphemeralSeedMaterial {
  const profile = bundle.localSeedProfiles.profiles.find(
    (entry) => entry.seed_profile_ref === identity.seed_profile_ref,
  );
  assertCondition(profile, `unknown seed profile ${identity.seed_profile_ref}`);
  const seedProfileHash = computeEphemeralSeedProfileHash(bundle, identity.seed_profile_ref);

  return {
    material_version: "EPHEMERAL_SEED_MATERIAL_V1",
    environment_id: identity.environment_id,
    environment_identity_hash: identity.environment_identity_hash,
    seed_profile_ref: identity.seed_profile_ref,
    seed_profile_hash: seedProfileHash,
    golden_pack_hash: bundle.goldenPackHash,
    deterministic_seed_refs: profile.deterministic_seed_refs,
    embodiment_refs: profile.embodiment_refs,
    required_fixture_ids: profile.required_fixture_ids,
    browser_session: {
      actor_alias: `fixture.operator.${identity.namespace_hash}`,
      session_ref: `session.ephemeral.${identity.namespace_hash}`,
      client_ref: `client.synthetic.${identity.namespace_hash}`,
    },
    route_identity_ref: `/ephemeral/environments/${identity.environment_id}/work-items/${identity.namespace_hash}`,
    queue_flow_ref: `queue.ephemeral.${identity.namespace_hash}.stage-work`,
    upload_object_ref: `object.ephemeral.upload.${identity.namespace_hash}`,
    upload_session_ref: `upload.session.ephemeral.${identity.namespace_hash}`,
    request_version_ref: `request.version.ephemeral.${identity.namespace_hash}.v1`,
    cache_partition_ref: `cache.ephemeral.${identity.namespace_hash}.workspace`,
    retry_rebase_token: `rebase.token.${identity.namespace_hash}`,
  };
}

function initialLifecycleEvent(
  identity: EphemeralEnvironmentIdentity,
): EphemeralEnvironmentManifest["chronology"][number] {
  return {
    at: "2026-04-23T00:00:00Z",
    event_ref: "environment.requested",
    phase_ref: "IDENTITY_LOCK",
    lifecycle_state: "REQUESTED",
    status: "SUCCEEDED",
    detail: `Ephemeral environment ${identity.environment_id} requested explicitly.`,
  };
}

export function createEphemeralEnvironmentManifest(
  bundle: EphemeralEnvironmentBundle,
  input: {
    debugRetentionActive?: boolean;
    environmentId: string;
    ownerRef: string;
    runtimeProfileRef: LocalRuntimeProfileRef;
    scopeClassRef: ScopeClassRef;
    seedProfileRef?: string;
    shardRef: string;
  },
) {
  const identity = deriveEphemeralEnvironmentIdentity(bundle, input);
  const namespaces = deriveEphemeralNamespaces(bundle, identity);
  const seedMaterial = createEphemeralSeedMaterial(bundle, identity);
  const seedMaterialHash = stableHash(seedMaterial);

  return {
    manifest_version: "EPHEMERAL_ENVIRONMENT_MANIFEST_V1",
    environment_id: identity.environment_id,
    environment_ref: identity.environment_ref,
    scope_class_ref: identity.scope_class_ref,
    owner_ref: identity.owner_ref,
    shard_ref: identity.shard_ref,
    runtime_profile_ref: identity.runtime_profile_ref,
    runtime_topology_ref: bundle.localRuntimeTopologyRef,
    control_store_schema_bundle_hash: bundle.schemaBundleHash,
    environment_identity_hash: identity.environment_identity_hash,
    namespace_hash: identity.namespace_hash,
    seed_profile_ref: identity.seed_profile_ref,
    seed_profile_hash: seedMaterial.seed_profile_hash,
    golden_pack_hash: bundle.goldenPackHash,
    lifecycle_state: "REQUESTED",
    current_phase_ref: "IDENTITY_LOCK",
    completed_phase_refs: [],
    chronology: [initialLifecycleEvent(identity)],
    namespaces,
    resource_state: {
      service_availability: {
        AUDIT_STORE: true,
        CACHE: true,
        CONTROL_STORE: true,
        OBJECT_STORAGE: true,
        QUEUE: true,
      },
      active_worker_leases: 0,
      queue_message_count: 0,
      cache_key_count: 0,
      projection_count: 0,
      stream_cursor_count: 0,
      upload_session_count: 0,
      control_schema_row_count: seedMaterial.required_fixture_ids.length,
      audit_schema_row_count: 1,
      object_prefix_object_counts: Object.fromEntries(
        namespaces.object_prefix_refs.map((prefix) => [prefix, 0]),
      ),
      last_reset_scope_ref_or_null: null,
      debug_retention_active: input.debugRetentionActive ?? false,
    },
    browser_attachment: {
      environment_identity_chip: identity.environment_id,
      session_fixture_alias: seedMaterial.browser_session.actor_alias,
      route_identity_ref: seedMaterial.route_identity_ref,
      queue_flow_ref: seedMaterial.queue_flow_ref,
      upload_object_ref: seedMaterial.upload_object_ref,
      cache_partition_ref: seedMaterial.cache_partition_ref,
      retry_rebase_token: seedMaterial.retry_rebase_token,
    },
    seed_material_hash: seedMaterialHash,
    last_cleanliness_hash_or_null: null,
    reset_counter: 0,
    last_reset_evidence_ref_or_null: null,
  } satisfies EphemeralEnvironmentManifest;
}

export function appendManifestEvent(
  manifest: EphemeralEnvironmentManifest,
  event: EphemeralEnvironmentManifest["chronology"][number],
) {
  return {
    ...manifest,
    chronology: [...manifest.chronology, event],
  } satisfies EphemeralEnvironmentManifest;
}

export function transitionEphemeralLifecycle(
  bundle: EphemeralEnvironmentBundle,
  manifest: EphemeralEnvironmentManifest,
  input: {
    at: string;
    detail: string;
    eventRef: string;
    phaseRef: EphemeralPhaseRef;
    status?: "STARTED" | "SUCCEEDED" | "HALTED" | "FAILED";
    toState: EphemeralLifecycleState;
  },
) {
  const allowed = bundle.lifecyclePolicy.transition_rows.some(
    (row) =>
      row.from_state === manifest.lifecycle_state &&
      row.to_state === input.toState &&
      row.allowed_phase_ref === input.phaseRef,
  );
  assertCondition(
    allowed,
    `illegal lifecycle transition ${manifest.lifecycle_state} -> ${input.toState} at ${input.phaseRef}`,
  );

  const nextCompletedPhaseRefs =
    input.status === "SUCCEEDED"
      ? uniq([...manifest.completed_phase_refs, input.phaseRef])
      : manifest.completed_phase_refs;

  return appendManifestEvent(
    {
      ...manifest,
      lifecycle_state: input.toState,
      current_phase_ref: input.phaseRef,
      completed_phase_refs: nextCompletedPhaseRefs,
    },
    {
      at: input.at,
      event_ref: input.eventRef,
      phase_ref: input.phaseRef,
      lifecycle_state: input.toState,
      status: input.status ?? "SUCCEEDED",
      detail: input.detail,
    },
  );
}

function resetTouchedResourceState(
  manifest: EphemeralEnvironmentManifest,
  touchedResourceClasses: string[],
) {
  const next = {
    ...manifest.resource_state,
    object_prefix_object_counts: { ...manifest.resource_state.object_prefix_object_counts },
  };

  if (touchedResourceClasses.includes("WORKER_LEASE_SET")) {
    next.active_worker_leases = 0;
  }
  if (
    touchedResourceClasses.includes("QUEUE_NAMESPACE_SET") ||
    touchedResourceClasses.includes("DLQ_NAMESPACE_SET")
  ) {
    next.queue_message_count = 0;
  }
  if (touchedResourceClasses.includes("CACHE_NAMESPACE_SET")) {
    next.cache_key_count = 0;
  }
  if (touchedResourceClasses.includes("PROJECTION_NAMESPACE_SET")) {
    next.projection_count = 0;
  }
  if (touchedResourceClasses.includes("STREAM_CURSOR_SET")) {
    next.stream_cursor_count = 0;
  }
  if (touchedResourceClasses.includes("UPLOAD_SESSION_SET")) {
    next.upload_session_count = 0;
  }
  for (const resourceClass of [
    "OBJECT_PREFIX_STAGING",
    "OBJECT_PREFIX_QUARANTINE",
    "OBJECT_PREFIX_DERIVED",
  ]) {
    if (touchedResourceClasses.includes(resourceClass)) {
      const prefix =
        resourceClass === "OBJECT_PREFIX_STAGING"
          ? manifest.namespaces.object_prefix_refs[0]
          : resourceClass === "OBJECT_PREFIX_QUARANTINE"
            ? manifest.namespaces.object_prefix_refs[1]
            : manifest.namespaces.object_prefix_refs[2];
      next.object_prefix_object_counts[prefix] = 0;
    }
  }
  return next;
}

export function applyEphemeralResetScope(
  bundle: EphemeralEnvironmentBundle,
  manifest: EphemeralEnvironmentManifest,
  resetScopeRef: ResetScopeRef,
) {
  const scope = bundle.resetScopePolicy.reset_scope_rows.find(
    (row) => row.reset_scope_ref === resetScopeRef,
  );
  assertCondition(scope, `unknown reset scope ${resetScopeRef}`);

  const nextManifest = {
    ...manifest,
    resource_state: {
      ...resetTouchedResourceState(manifest, scope.touched_resource_classes),
      control_schema_row_count: scope.reseed_required
        ? manifest.resource_state.control_schema_row_count
        : manifest.resource_state.control_schema_row_count,
      audit_schema_row_count: scope.reseed_required
        ? manifest.resource_state.audit_schema_row_count
        : manifest.resource_state.audit_schema_row_count,
      last_reset_scope_ref_or_null: resetScopeRef,
    },
    reset_counter: manifest.reset_counter + 1,
  } satisfies EphemeralEnvironmentManifest;

  return nextManifest;
}

export function evaluateEphemeralCleanliness(
  bundle: EphemeralEnvironmentBundle,
  manifest: EphemeralEnvironmentManifest,
  input: {
    expectedSeedProfileHash?: string;
    requireReadyState?: boolean;
  } = {},
) {
  const failureCodes: string[] = [];
  const warningCodes: string[] = [];
  const namingPattern = new RegExp(bundle.catalog.naming_contract.environment_id_pattern, "u");
  if (!namingPattern.test(manifest.environment_id)) {
    failureCodes.push("ENVIRONMENT_ID_PATTERN_VIOLATION");
  }
  if (
    !bundle.catalog.scope_rows.some((row) => row.environment_ref === manifest.environment_ref)
  ) {
    failureCodes.push("NON_EPHEMERAL_ENVIRONMENT_REF");
  }
  if (input.requireReadyState !== false && manifest.lifecycle_state !== "READY") {
    failureCodes.push("ENVIRONMENT_NOT_READY");
  }
  if (manifest.resource_state.active_worker_leases !== 0) {
    failureCodes.push("ACTIVE_WORKER_LEASES_PRESENT");
  }
  if (!manifest.resource_state.service_availability.QUEUE) {
    failureCodes.push("QUEUE_SERVICE_UNAVAILABLE");
  }
  if (!manifest.resource_state.service_availability.CACHE) {
    failureCodes.push("CACHE_SERVICE_UNAVAILABLE");
  }
  if (!manifest.resource_state.service_availability.OBJECT_STORAGE) {
    failureCodes.push("OBJECT_STORAGE_SERVICE_UNAVAILABLE");
  }
  if (manifest.resource_state.queue_message_count !== 0) {
    failureCodes.push("QUEUE_NOT_EMPTY");
  }
  if (manifest.resource_state.cache_key_count !== 0) {
    failureCodes.push("CACHE_NOT_EMPTY");
  }
  if (manifest.resource_state.projection_count !== 0) {
    failureCodes.push("PROJECTION_NOT_EMPTY");
  }
  if (manifest.resource_state.stream_cursor_count !== 0) {
    failureCodes.push("STREAM_CURSOR_NOT_EMPTY");
  }
  if (manifest.resource_state.upload_session_count !== 0) {
    failureCodes.push("UPLOAD_SESSIONS_NOT_EMPTY");
  }
  const objectPrefixObjectCountTotal = Object.values(
    manifest.resource_state.object_prefix_object_counts,
  ).reduce((sum, count) => sum + count, 0);
  if (objectPrefixObjectCountTotal !== 0) {
    failureCodes.push("OBJECT_PREFIX_NOT_EMPTY");
  }
  const expectedSeedProfileHash =
    input.expectedSeedProfileHash ?? computeEphemeralSeedProfileHash(bundle, manifest.seed_profile_ref);
  if (manifest.seed_profile_hash !== expectedSeedProfileHash) {
    failureCodes.push("SEED_PROFILE_HASH_DRIFT");
  }
  if (manifest.resource_state.debug_retention_active) {
    warningCodes.push("DEBUG_RETENTION_ACTIVE");
  }

  return {
    report_version: "EPHEMERAL_CLEANLINESS_REPORT_V1",
    environment_id: manifest.environment_id,
    environment_identity_hash: manifest.environment_identity_hash,
    ok: failureCodes.length === 0,
    failureCodes,
    warningCodes,
    cleanliness_hash: stableHash({
      environment_identity_hash: manifest.environment_identity_hash,
      failureCodes,
      object_prefix_object_counts: manifest.resource_state.object_prefix_object_counts,
      resource_counts: {
        active_worker_leases: manifest.resource_state.active_worker_leases,
        cache_key_count: manifest.resource_state.cache_key_count,
        projection_count: manifest.resource_state.projection_count,
        queue_message_count: manifest.resource_state.queue_message_count,
        stream_cursor_count: manifest.resource_state.stream_cursor_count,
        upload_session_count: manifest.resource_state.upload_session_count,
      },
      seed_profile_hash: manifest.seed_profile_hash,
      warningCodes,
    }),
    resource_counts: {
      active_worker_leases: manifest.resource_state.active_worker_leases,
      queue_message_count: manifest.resource_state.queue_message_count,
      cache_key_count: manifest.resource_state.cache_key_count,
      projection_count: manifest.resource_state.projection_count,
      stream_cursor_count: manifest.resource_state.stream_cursor_count,
      upload_session_count: manifest.resource_state.upload_session_count,
      object_prefix_object_count_total: objectPrefixObjectCountTotal,
    },
  } satisfies EphemeralCleanlinessReport;
}

function validateResetEvidenceShape(
  bundle: EphemeralEnvironmentBundle,
  evidence: ResetEvidence,
) {
  const requiredKeys = new Set(bundle.resetEvidenceSchema.required ?? []);
  for (const key of requiredKeys) {
    assertCondition(key in evidence, `reset evidence is missing required key ${key}`);
  }
  assertCondition(
    evidence.evidence_version === "EPHEMERAL_RESET_EVIDENCE_V1",
    "reset evidence version drifted",
  );
  assertCondition(
    evidence.action_kind === "RESET" || evidence.action_kind === "DESTROY",
    `unsupported reset evidence action ${evidence.action_kind}`,
  );
}

export function buildEphemeralResetEvidence(
  bundle: EphemeralEnvironmentBundle,
  manifest: EphemeralEnvironmentManifest,
  input: {
    actionKind: "RESET" | "DESTROY";
    chronology: ResetEvidence["chronology"];
    outcome: ResetEvidence["outcome"];
    residualWarnings: string[];
    resetScopeRef: ResetEvidence["reset_scope_ref"];
  },
) {
  const cleanliness = evaluateEphemeralCleanliness(bundle, manifest, {
    expectedSeedProfileHash: manifest.seed_profile_hash,
    requireReadyState: input.actionKind === "RESET",
  });
  const evidence = {
    evidence_version: "EPHEMERAL_RESET_EVIDENCE_V1",
    action_kind: input.actionKind,
    environment_id: manifest.environment_id,
    environment_identity_hash: manifest.environment_identity_hash,
    environment_ref: manifest.environment_ref,
    reset_scope_ref: input.resetScopeRef,
    seed_profile_ref: manifest.seed_profile_ref,
    seed_profile_hash: manifest.seed_profile_hash,
    golden_pack_hash: manifest.golden_pack_hash,
    approved_target_pattern: bundle.catalog.naming_contract.environment_id_pattern,
    chronology: input.chronology,
    resource_counts: cleanliness.resource_counts,
    residual_warnings: input.residualWarnings,
    outcome: input.outcome,
    source_lineage: [
      bundle.catalog.catalog_id,
      bundle.lifecyclePolicy.policy_id,
      bundle.resetScopePolicy.policy_id,
      manifest.runtime_topology_ref,
    ],
  } satisfies ResetEvidence;

  validateResetEvidenceShape(bundle, evidence);
  return evidence;
}
