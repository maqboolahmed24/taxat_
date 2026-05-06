import { execFile } from "node:child_process";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

import { expect, test } from "@playwright/test";

import {
  applyConfigChangeRequestTransition,
  applyConfigVersionTransition,
  buildConfigChangeRequestStateTransitionContract,
  buildConfigFreezeRecord,
  buildConfigVersionStateTransitionContract,
  ConfigChangeRequestRepository,
  ConfigFreezeRepository,
  ConfigVersionRepository,
  CONFIG_TYPE_TO_FREEZE_REF_FIELD,
  normalizeConfigChangeRequestRecord,
  normalizeConfigVersionRecord,
  REQUIRED_CONFIG_TYPE_ORDER,
  type ConfigChangeRequestRecord,
  type ConfigFreezeBuildInput,
  type ConfigFreezeConfigEntry,
  type ConfigVersionRecord,
} from "../../../packages/backend-manifest/src/index.ts";

const execFileAsync = promisify(execFile);
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const migrationPath = path.join(
  repoRoot,
  "db",
  "migrations",
  "phase03_0099_config_version_ccr_freeze.sql",
);

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

function buildDraftVersion(configType: ConfigVersionRecord["config_type"]): ConfigVersionRecord {
  return normalizeConfigVersionRecord({
    artifact_type: "ConfigVersion",
    version_id: `config-version://${lower(configType)}`,
    config_type: configType,
    lifecycle_state: "DRAFT",
    state_transition_contract: buildConfigVersionStateTransitionContract({
      current_state: "DRAFT",
      previous_state_or_null: null,
      transition_event_code: "submit_for_test",
      transition_applied_at: "2026-04-22T09:00:00Z",
      transition_audit_ref: `audit://${lower(configType)}/draft`,
    }),
    content_hash: `content-hash://${lower(configType)}`,
    effective_scope: ["tenant"],
    approvals: [],
    verification_evidence_ref_or_null: null,
    approved_at_or_null: null,
    superseded_by_version_id_or_null: null,
    revocation_reason_code_or_null: null,
    retired_at_or_null: null,
    state_changed_at: "2026-04-22T09:00:00Z",
    created_at: "2026-04-22T09:00:00Z",
    audit_refs: [`audit://${lower(configType)}/created`],
    provenance_refs: [`provenance://${lower(configType)}`],
  });
}

function approveVersion(version: ConfigVersionRecord): ConfigVersionRecord {
  const candidate = applyConfigVersionTransition({
    current: version,
    event_code: "submit_for_test",
    transition_applied_at: "2026-04-22T09:10:00Z",
    transition_audit_ref: `audit://${lower(version.config_type)}/candidate`,
    next: {
      ...version,
      lifecycle_state: "CANDIDATE",
      state_transition_contract: buildConfigVersionStateTransitionContract({
        current_state: "CANDIDATE",
        previous_state_or_null: "DRAFT",
        transition_event_code: "submit_for_test",
        transition_applied_at: "2026-04-22T09:10:00Z",
        transition_audit_ref: `audit://${lower(version.config_type)}/candidate`,
      }),
    },
  });
  const verified = applyConfigVersionTransition({
    current: candidate,
    event_code: "verification_pass",
    transition_applied_at: "2026-04-22T09:20:00Z",
    transition_audit_ref: `audit://${lower(version.config_type)}/verified`,
    next: {
      ...candidate,
      lifecycle_state: "VERIFIED",
      verification_evidence_ref_or_null: `verification://${lower(version.config_type)}`,
      state_transition_contract: buildConfigVersionStateTransitionContract({
        current_state: "VERIFIED",
        previous_state_or_null: "CANDIDATE",
        transition_event_code: "verification_pass",
        transition_applied_at: "2026-04-22T09:20:00Z",
        transition_audit_ref: `audit://${lower(version.config_type)}/verified`,
      }),
    },
  });
  return applyConfigVersionTransition({
    current: verified,
    event_code: "approval_granted",
    transition_applied_at: "2026-04-22T09:30:00Z",
    transition_audit_ref: `audit://${lower(version.config_type)}/approved`,
    next: {
      ...verified,
      lifecycle_state: "APPROVED",
      approvals: [`approval://${lower(version.config_type)}`],
      approved_at_or_null: "2026-04-22T09:30:00Z",
      state_transition_contract: buildConfigVersionStateTransitionContract({
        current_state: "APPROVED",
        previous_state_or_null: "VERIFIED",
        transition_event_code: "approval_granted",
        transition_applied_at: "2026-04-22T09:30:00Z",
        transition_audit_ref: `audit://${lower(version.config_type)}/approved`,
      }),
    },
  });
}

function buildOpenCcr(): ConfigChangeRequestRecord {
  return normalizeConfigChangeRequestRecord({
    artifact_type: "ConfigChangeRequest",
    ccr_id: "ccr://config/integration",
    tenant_id: "tenant://integration",
    lifecycle_state: "OPEN",
    state_transition_contract: buildConfigChangeRequestStateTransitionContract({
      current_state: "OPEN",
      previous_state_or_null: null,
      transition_event_code: "assigned",
      transition_applied_at: "2026-04-22T09:00:00Z",
      transition_audit_ref: "audit://ccr/open",
    }),
    diff_ref: "diff://config/integration",
    risk_assessment_ref: "risk://config/integration",
    approvals: [],
    rejected_reason_code_or_null: null,
    implemented_release_ref_or_null: null,
    rolled_back_release_ref_or_null: null,
    state_changed_at: "2026-04-22T09:00:00Z",
    created_at: "2026-04-22T09:00:00Z",
    audit_refs: ["audit://ccr/created"],
    provenance_refs: ["provenance://ccr"],
  });
}

function buildEntry(version: ConfigVersionRecord): ConfigFreezeConfigEntry {
  const providerAware = version.config_type === "PROVIDER_CONTRACT_PROFILE";
  return {
    config_type: version.config_type,
    version_id: version.version_id,
    content_hash: version.content_hash,
    status_at_freeze: version.lifecycle_state,
    effective_scope: version.effective_scope[0] ?? null,
    effective_from: version.approved_at_or_null ?? version.created_at,
    effective_to: version.retired_at_or_null,
    ccr_id: "ccr://config/integration",
    test_suite_refs: [`suite://${lower(version.config_type)}`],
    provider_api_version: providerAware ? "2026-04" : null,
    provider_schema_version: providerAware ? "provider-v1" : null,
    environment_allowlist: providerAware ? ["PRODUCTION"] : [],
    compatibility_class: "BACKWARD_COMPATIBLE",
    superseded_by_version_id: version.superseded_by_version_id_or_null,
  };
}

function buildFreezeInput(versions: ConfigVersionRecord[]): ConfigFreezeBuildInput {
  const entries = versions.map((version) => buildEntry(version));
  const refs = Object.fromEntries(
    REQUIRED_CONFIG_TYPE_ORDER.map((configType) => [
      CONFIG_TYPE_TO_FREEZE_REF_FIELD[configType],
      entries.find((entry) => entry.config_type === configType)!.version_id,
    ]),
  ) as Pick<
    ConfigFreezeBuildInput,
    | "materiality_profile_ref"
    | "amendment_materiality_profile_ref"
    | "retention_profile_ref"
    | "provider_contract_profile_ref"
    | "workflow_policy_ref"
    | "override_policy_ref"
    | "masking_export_policy_ref"
    | "canonicalization_rules_ref"
    | "connector_mapping_rules_ref"
    | "parity_threshold_profile_ref"
    | "trust_threshold_profile_ref"
    | "risk_threshold_profile_ref"
    | "evidence_confidence_policy_ref"
    | "computation_rules_ref"
  >;

  return {
    config_freeze_id: "config-freeze://integration",
    manifest_id: "manifest://integration",
    entries,
    schema_bundle_hash: "schema-bundle-hash://integration",
    feature_flag_snapshot_hash: "feature-flag-snapshot-hash://integration",
    config_resolution_basis: "DIRECT_REQUEST_RESOLUTION",
    source_config_freeze_ref: null,
    source_config_freeze_hash: null,
    source_config_surface_hash: null,
    approval_snapshot_ref: "approval-snapshot://integration",
    ...refs,
  };
}

test("migration defines config version, CCR, freeze, entry rows, indexes, and tenant policies", async () => {
  const sql = await readFile(migrationPath, "utf8");

  expect(sql).toContain("CREATE TABLE IF NOT EXISTS control_manifest.config_version_register");
  expect(sql).toContain(
    "CREATE TABLE IF NOT EXISTS control_manifest.config_change_request_register",
  );
  expect(sql).toContain("CREATE TABLE IF NOT EXISTS control_manifest.config_freeze_register");
  expect(sql).toContain(
    "CREATE TABLE IF NOT EXISTS control_manifest.config_freeze_entry_register",
  );
  expect(sql).toContain("config_version_lifecycle_lookup");
  expect(sql).toContain("config_freeze_hash_lookup");
  expect(sql).toContain("source_config_surface_hash = config_surface_hash");
  expect(sql).toContain("ENABLE ROW LEVEL SECURITY");
  expect(sql).toContain("control_support.require_tenant_context()");
});

test("repositories persist config versions, CCR rollback lineage, and schema-valid freezes", async () => {
  const versionRepository = new ConfigVersionRepository();
  const ccrRepository = new ConfigChangeRequestRepository();
  const freezeRepository = new ConfigFreezeRepository();

  const approvedVersions: ConfigVersionRecord[] = [];
  for (const configType of REQUIRED_CONFIG_TYPE_ORDER) {
    const draft = buildDraftVersion(configType);
    const created = await versionRepository.createVersion({
      version: draft,
      persisted_at: "2026-04-22T09:00:00Z",
    });
    const approved = approveVersion(created.version);
    const updated = await versionRepository.compareAndSwapVersion({
      expected_version_row_version: created.version_row_version,
      next_version: approved,
      persisted_at: "2026-04-22T09:30:00Z",
    });
    approvedVersions.push(updated.version);
    await validatePayloadAgainstSchema("config_version.schema.json", updated.version);
  }

  const openCcr = buildOpenCcr();
  const createdCcr = await ccrRepository.createChangeRequest({
    ccr: openCcr,
    persisted_at: "2026-04-22T09:00:00Z",
  });
  const underReview = applyConfigChangeRequestTransition({
    current: createdCcr.ccr,
    event_code: "assigned",
    transition_applied_at: "2026-04-22T09:05:00Z",
    transition_audit_ref: "audit://ccr/assigned",
    next: {
      ...createdCcr.ccr,
      lifecycle_state: "UNDER_REVIEW",
      state_transition_contract: buildConfigChangeRequestStateTransitionContract({
        current_state: "UNDER_REVIEW",
        previous_state_or_null: "OPEN",
        transition_event_code: "assigned",
        transition_applied_at: "2026-04-22T09:05:00Z",
        transition_audit_ref: "audit://ccr/assigned",
      }),
    },
  });
  const reviewed = await ccrRepository.compareAndSwapChangeRequest({
    expected_ccr_row_version: createdCcr.ccr_row_version,
    next_ccr: underReview,
    persisted_at: "2026-04-22T09:05:00Z",
  });
  const testing = applyConfigChangeRequestTransition({
    current: reviewed.ccr,
    event_code: "sent_to_test",
    transition_applied_at: "2026-04-22T09:10:00Z",
    transition_audit_ref: "audit://ccr/testing",
    next: {
      ...reviewed.ccr,
      lifecycle_state: "TESTING",
      state_transition_contract: buildConfigChangeRequestStateTransitionContract({
        current_state: "TESTING",
        previous_state_or_null: "UNDER_REVIEW",
        transition_event_code: "sent_to_test",
        transition_applied_at: "2026-04-22T09:10:00Z",
        transition_audit_ref: "audit://ccr/testing",
      }),
    },
  });
  const inTest = await ccrRepository.compareAndSwapChangeRequest({
    expected_ccr_row_version: reviewed.ccr_row_version,
    next_ccr: testing,
    persisted_at: "2026-04-22T09:10:00Z",
  });
  const approvedCcr = applyConfigChangeRequestTransition({
    current: inTest.ccr,
    event_code: "pass",
    transition_applied_at: "2026-04-22T09:20:00Z",
    transition_audit_ref: "audit://ccr/pass",
    next: {
      ...inTest.ccr,
      lifecycle_state: "APPROVED",
      approvals: ["approval://ccr/integration"],
      state_transition_contract: buildConfigChangeRequestStateTransitionContract({
        current_state: "APPROVED",
        previous_state_or_null: "TESTING",
        transition_event_code: "pass",
        transition_applied_at: "2026-04-22T09:20:00Z",
        transition_audit_ref: "audit://ccr/pass",
      }),
    },
  });
  const approvedStored = await ccrRepository.compareAndSwapChangeRequest({
    expected_ccr_row_version: inTest.ccr_row_version,
    next_ccr: approvedCcr,
    persisted_at: "2026-04-22T09:20:00Z",
  });
  const implemented = applyConfigChangeRequestTransition({
    current: approvedStored.ccr,
    event_code: "deployed",
    transition_applied_at: "2026-04-22T09:30:00Z",
    transition_audit_ref: "audit://ccr/deployed",
    next: {
      ...approvedStored.ccr,
      lifecycle_state: "IMPLEMENTED",
      implemented_release_ref_or_null: "release://config/integration",
      state_transition_contract: buildConfigChangeRequestStateTransitionContract({
        current_state: "IMPLEMENTED",
        previous_state_or_null: "APPROVED",
        transition_event_code: "deployed",
        transition_applied_at: "2026-04-22T09:30:00Z",
        transition_audit_ref: "audit://ccr/deployed",
      }),
    },
  });
  const implementedStored = await ccrRepository.compareAndSwapChangeRequest({
    expected_ccr_row_version: approvedStored.ccr_row_version,
    next_ccr: implemented,
    persisted_at: "2026-04-22T09:30:00Z",
  });
  const rolledBack = applyConfigChangeRequestTransition({
    current: implementedStored.ccr,
    event_code: "rollback",
    transition_applied_at: "2026-04-22T09:40:00Z",
    transition_audit_ref: "audit://ccr/rollback",
    next: {
      ...implementedStored.ccr,
      lifecycle_state: "ROLLED_BACK",
      rolled_back_release_ref_or_null: "release://config/integration-rollback",
      state_transition_contract: buildConfigChangeRequestStateTransitionContract({
        current_state: "ROLLED_BACK",
        previous_state_or_null: "IMPLEMENTED",
        transition_event_code: "rollback",
        transition_applied_at: "2026-04-22T09:40:00Z",
        transition_audit_ref: "audit://ccr/rollback",
      }),
    },
  });
  const rolledBackStored = await ccrRepository.compareAndSwapChangeRequest({
    expected_ccr_row_version: implementedStored.ccr_row_version,
    next_ccr: rolledBack,
    persisted_at: "2026-04-22T09:40:00Z",
  });
  await validatePayloadAgainstSchema("config_change_request.schema.json", rolledBackStored.ccr);
  expect(rolledBackStored.ccr.implemented_release_ref_or_null).toBe(
    "release://config/integration",
  );
  expect(
    await ccrRepository.listChangeRequestsByLifecycleState(
      "tenant://integration",
      "ROLLED_BACK",
    ),
  ).toHaveLength(1);

  const freeze = buildConfigFreezeRecord(buildFreezeInput(approvedVersions));
  const storedFreeze = await freezeRepository.persistFreeze({
    tenant_id: "tenant://integration",
    freeze,
    persisted_at: "2026-04-22T09:45:00Z",
    usage: { mode: "COMPLIANCE", run_kind: "INTERACTIVE" },
  });
  await validatePayloadAgainstSchema("config_freeze.schema.json", storedFreeze.freeze);

  expect(await freezeRepository.getFreezeById("tenant://integration", freeze.config_freeze_id)).not.toBeNull();
  expect(
    await freezeRepository.listFreezesByHash(
      "tenant://integration",
      freeze.config_freeze_hash,
    ),
  ).toHaveLength(1);
  expect(
    await versionRepository.listVersionsByLifecycleState("COMPUTATION_RULES", "APPROVED"),
  ).toHaveLength(1);
});
