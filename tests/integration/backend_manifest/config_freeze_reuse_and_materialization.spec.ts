import { execFile } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

import { expect, test } from "@playwright/test";

import { createFeatureFlagSnapshot } from "../../../packages/domain-kernel/src/config/feature_flag_snapshot.ts";
import {
  ConfigResolutionServiceError,
  ConfigFreezeRepository,
  ConfigVersionRepository,
  LoadConfigFreezeError,
  buildConfigVersionStateTransitionContract,
  buildSchemaReaderWindowContract,
  loadConfigFreeze,
  normalizeConfigVersionRecord,
  resolveConfigForRequest,
  REQUIRED_CONFIG_TYPE_ORDER,
  type ConfigVersionLifecycleState,
  type ConfigVersionRecord,
} from "../../../packages/backend-manifest/src/index.ts";

const execFileAsync = promisify(execFile);
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..");

async function validatePayloadAgainstSchema(schemaName: string, payload: unknown) {
  const script = `
import json
import pathlib
import sys

repo = pathlib.Path(sys.argv[1])
sys.path.insert(0, str(repo / "packages" / "contracts-core" / "python"))
from validate_contracts import Draft202012Validator, build_registry, load_json  # type: ignore

schema_name = sys.argv[2]
payload = json.loads(sys.argv[3])
schema = load_json(repo / "packages" / "contracts-core" / "schemas" / schema_name)
validator = Draft202012Validator(
    schema,
    registry=build_registry(),
    format_checker=Draft202012Validator.FORMAT_CHECKER,
)
issues = [
    f"{'/'.join(map(str, error.absolute_path)) or '<root>'}: {error.message}"
    for error in sorted(validator.iter_errors(payload), key=lambda error: list(error.absolute_path))
]
if issues:
    raise SystemExit("\\n".join(issues))
`;

  await execFileAsync(path.join(repoRoot, ".venv", "bin", "python3"), [
    "-c",
    script,
    repoRoot,
    schemaName,
    JSON.stringify(payload),
  ]);
}

function lower(configType: string) {
  return configType.toLowerCase();
}

function transitionEvent(state: ConfigVersionLifecycleState) {
  if (state === "APPROVED") {
    return "approval_granted";
  }
  if (state === "DEPRECATED") {
    return "replacement_approved";
  }
  if (state === "REVOKED") {
    return "urgent_withdrawal";
  }
  return "submit_for_test";
}

function buildVersion(
  configType: ConfigVersionRecord["config_type"],
  state: ConfigVersionLifecycleState = "APPROVED",
) {
  const suffix = state.toLowerCase();
  const approved = ["APPROVED", "DEPRECATED", "REVOKED", "RETIRED"].includes(state);
  const verified = approved || state === "VERIFIED";
  return normalizeConfigVersionRecord({
    artifact_type: "ConfigVersion",
    version_id: `config-version://${lower(configType)}/${suffix}`,
    config_type: configType,
    lifecycle_state: state,
    state_transition_contract: buildConfigVersionStateTransitionContract({
      current_state: state,
      previous_state_or_null: state === "APPROVED" ? "VERIFIED" : null,
      transition_event_code: transitionEvent(state),
      transition_applied_at: "2026-04-24T10:00:00Z",
      transition_audit_ref: `audit://${lower(configType)}/${suffix}`,
    }),
    content_hash: `content-hash://${lower(configType)}/${suffix}`,
    effective_scope: ["tenant"],
    approvals: approved ? [`approval://${lower(configType)}/${suffix}`] : [],
    verification_evidence_ref_or_null: verified
      ? `verification://${lower(configType)}/${suffix}`
      : null,
    approved_at_or_null: approved ? "2026-04-24T10:00:00Z" : null,
    superseded_by_version_id_or_null:
      state === "DEPRECATED" ? `config-version://${lower(configType)}/successor` : null,
    revocation_reason_code_or_null: state === "REVOKED" ? "URGENT_WITHDRAWAL" : null,
    retired_at_or_null: state === "RETIRED" ? "2026-05-01T10:00:00Z" : null,
    state_changed_at: "2026-04-24T10:00:00Z",
    created_at: "2026-04-23T10:00:00Z",
    audit_refs: [`audit://${lower(configType)}/created/${suffix}`],
    provenance_refs: [`provenance://${lower(configType)}/${suffix}`],
  });
}

async function persistVersions(
  repository: ConfigVersionRepository,
  stateForType: (configType: ConfigVersionRecord["config_type"]) => ConfigVersionLifecycleState,
) {
  const versions: ConfigVersionRecord[] = [];
  for (const configType of REQUIRED_CONFIG_TYPE_ORDER) {
    const version = buildVersion(configType, stateForType(configType));
    versions.push(version);
    await repository.createVersion({
      version,
      persisted_at: "2026-04-24T10:00:00Z",
    });
  }
  return versions;
}

function metadataByVersionId(versions: ConfigVersionRecord[]) {
  return Object.fromEntries(
    versions.map((version) => [
      version.version_id,
      {
        ccr_id: `ccr://${lower(version.config_type)}`,
        compatibility_class: "BACKWARD_COMPATIBLE",
        environment_allowlist:
          version.config_type === "PROVIDER_CONTRACT_PROFILE" ? ["PRODUCTION"] : [],
        provider_api_version:
          version.config_type === "PROVIDER_CONTRACT_PROFILE" ? "2026-04" : null,
        provider_schema_version:
          version.config_type === "PROVIDER_CONTRACT_PROFILE" ? "provider-v1" : null,
        test_suite_refs: [`suite://${lower(version.config_type)}`],
      },
    ]),
  );
}

async function noSurfaceSnapshot() {
  return createFeatureFlagSnapshot({
    featureFlagSnapshotId: "feature-flag-snapshot://integration/no-surface",
    surfaceState: "NO_GOVERNED_FLAG_SURFACE",
    providerAdapterRefOrNull: null,
    providerEnvironmentRefOrNull: null,
    providerContractProfileRefOrNull: null,
    evaluationContext: {
      tenant_id: "tenant://integration",
      client_id_or_null: "client://integration",
      environment_ref: "PRODUCTION",
      requested_scope: ["integration"],
      executable_scope: ["integration"],
      principal_context_ref_or_null: "principal://integration",
      access_binding_hash_or_null: "access-binding-hash://integration",
      route_identity_ref_or_null: "/integration/config-freeze",
    },
    entries: [],
  });
}

function readerWindow(schemaBundleHash: string) {
  return buildSchemaReaderWindowContract({
    compatibility_window_ref: "compat-window://integration",
    writer_schema_bundle_hash: schemaBundleHash,
    supported_reader_schema_bundle_hashes: [schemaBundleHash],
    protected_historical_schema_bundle_hashes: [],
    window_state: "EXPAND_ONLY_PREVIOUS_READERS_SUPPORTED",
  });
}

test("fresh resolution, exact reuse classes, and worker materialization are deterministic", async () => {
  const versionRepository = new ConfigVersionRepository();
  const freezeRepository = new ConfigFreezeRepository();
  const versions = await persistVersions(versionRepository, () => "APPROVED");
  const schemaBundleHash = "schema-bundle-hash://integration";

  const fresh = await resolveConfigForRequest({
    tenant_id: "tenant://integration",
    manifest_id: "manifest://integration/root",
    config_freeze_id: "config-freeze://integration/root",
    approval_snapshot_ref: "approval-snapshot://integration/root",
    config_version_repository: versionRepository,
    entry_metadata_by_version_id: metadataByVersionId(versions),
    feature_flag_snapshot: await noSurfaceSnapshot(),
    schema_bundle_hash: schemaBundleHash,
    schema_reader_window_contract: readerWindow(schemaBundleHash),
    usage: { mode: "COMPLIANCE", run_kind: "INTERACTIVE" },
    persist_freeze: {
      config_freeze_repository: freezeRepository,
      tenant_id: "tenant://integration",
      persisted_at: "2026-04-24T10:05:00Z",
    },
  });
  await validatePayloadAgainstSchema("config_freeze.schema.json", fresh.config_freeze);
  expect(fresh.config_freeze.config_resolution_basis).toBe("DIRECT_REQUEST_RESOLUTION");
  expect(fresh.config_freeze.source_config_freeze_ref).toBeNull();
  expect(fresh.materialized_config.runtime_config_source).toBe("CONFIG_FREEZE");

  const replay = await resolveConfigForRequest({
    manifest_id: "manifest://integration/replay",
    config_freeze_id: "config-freeze://integration/replay",
    approval_snapshot_ref: "approval-snapshot://ignored-on-reuse",
    continuation_config_inheritance_mode: "REPLAY_EXACT",
    source_config_freeze: fresh.config_freeze,
    schema_reader_window_contract: readerWindow(schemaBundleHash),
    usage: { mode: "COMPLIANCE", run_kind: "REPLAY" },
  });
  expect(replay.config_freeze.config_resolution_basis).toBe("REPLAY_EXACT_REUSE");
  expect(replay.config_freeze.config_freeze_hash).toBe(
    fresh.config_freeze.config_freeze_hash,
  );
  expect(replay.config_freeze.config_surface_hash).toBe(
    fresh.config_freeze.config_surface_hash,
  );

  const recovery = await resolveConfigForRequest({
    manifest_id: "manifest://integration/recovery",
    config_freeze_id: "config-freeze://integration/recovery",
    approval_snapshot_ref: "approval-snapshot://ignored-on-reuse",
    continuation_config_inheritance_mode: "RECOVERY_EXACT",
    source_config_freeze: fresh.config_freeze,
    schema_reader_window_contract: readerWindow(schemaBundleHash),
    usage: { mode: "COMPLIANCE", run_kind: "REMEDIATION" },
  });
  expect(recovery.config_freeze.config_resolution_basis).toBe("RECOVERY_EXACT_REUSE");
  expect(recovery.config_freeze.source_config_freeze_ref).toBe(
    fresh.config_freeze.config_freeze_id,
  );

  const historical = await resolveConfigForRequest({
    manifest_id: "manifest://integration/historical",
    config_freeze_id: "config-freeze://integration/historical",
    approval_snapshot_ref: "approval-snapshot://ignored-on-reuse",
    continuation_config_inheritance_mode: "HISTORICAL_EXPLICIT",
    source_config_freeze: fresh.config_freeze,
    schema_reader_window_contract: readerWindow(schemaBundleHash),
    usage: { mode: "COMPLIANCE", run_kind: "REPLAY" },
  });
  expect(historical.config_freeze.config_resolution_basis).toBe(
    "HISTORICAL_EXPLICIT_REUSE",
  );
  expect(historical.materialized_config.worker_packet.config_surface_hash).toBe(
    fresh.config_freeze.config_surface_hash,
  );

  const freshChild = await resolveConfigForRequest({
    manifest_id: "manifest://integration/fresh-child",
    config_freeze_id: "config-freeze://integration/fresh-child",
    approval_snapshot_ref: "approval-snapshot://integration/root",
    continuation_config_inheritance_mode: "FRESH_CHILD_RESOLUTION",
    config_version_repository: versionRepository,
    entry_metadata_by_version_id: metadataByVersionId(versions),
    feature_flag_snapshot: await noSurfaceSnapshot(),
    schema_bundle_hash: schemaBundleHash,
    schema_reader_window_contract: readerWindow(schemaBundleHash),
    usage: { mode: "COMPLIANCE", run_kind: "INTERACTIVE" },
  });
  expect(freshChild.config_freeze.config_freeze_hash).toBe(
    fresh.config_freeze.config_freeze_hash,
  );
  expect(freshChild.config_freeze.config_resolution_basis).toBe(
    "DIRECT_REQUEST_RESOLUTION",
  );
  expect(freshChild.config_freeze.source_config_freeze_ref).toBeNull();

  await expect(
    loadConfigFreeze({
      config_freeze: fresh.config_freeze,
      attempted_fallback_source_or_null: "LIVE_CONFIG_SERVICE",
    }),
  ).rejects.toThrow(LoadConfigFreezeError);
});

test("new compliance request fails closed when only deprecated or revoked versions exist", async () => {
  const badRepository = new ConfigVersionRepository();
  const versions = await persistVersions(badRepository, (configType) =>
    configType === "RETENTION_POLICY" ? "REVOKED" : "DEPRECATED",
  );
  const schemaBundleHash = "schema-bundle-hash://integration/fail-closed";

  await expect(
    resolveConfigForRequest({
      manifest_id: "manifest://integration/fail-closed",
      config_freeze_id: "config-freeze://integration/fail-closed",
      approval_snapshot_ref: "approval-snapshot://integration/fail-closed",
      config_version_repository: badRepository,
      entry_metadata_by_version_id: metadataByVersionId(versions),
      feature_flag_snapshot: await noSurfaceSnapshot(),
      schema_bundle_hash: schemaBundleHash,
      schema_reader_window_contract: readerWindow(schemaBundleHash),
      usage: { mode: "COMPLIANCE", run_kind: "INTERACTIVE" },
    }),
  ).rejects.toThrow(ConfigResolutionServiceError);
});
