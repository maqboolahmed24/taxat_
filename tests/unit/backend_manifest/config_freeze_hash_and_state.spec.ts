import { expect, test } from "@playwright/test";

import {
  assertConfigFreezeUsageAllowed,
  buildConfigChangeRequestStateTransitionContract,
  buildConfigFreezeRecord,
  buildConfigVersionStateTransitionContract,
  computeConfigFreezeHash,
  computeConfigSurfaceHash,
  ConfigChangeRequestLifecycleError,
  ConfigFreezeModelError,
  ConfigVersionLifecycleError,
  createConfigFreezeHashVector,
  getNextConfigChangeRequestLifecycleState,
  getNextConfigVersionLifecycleState,
  normalizeConfigChangeRequestRecord,
  normalizeConfigVersionRecord,
  REQUIRED_CONFIG_TYPE_ORDER,
  CONFIG_TYPE_TO_FREEZE_REF_FIELD,
  type ConfigChangeRequestRecord,
  type ConfigFreezeBuildInput,
  type ConfigFreezeConfigEntry,
  type ConfigVersionRecord,
} from "../../../packages/backend-manifest/src/index.ts";

function lower(configType: string) {
  return configType.toLowerCase();
}

function buildConfigVersion(
  configType = "COMPUTATION_RULES",
  overrides?: Partial<ConfigVersionRecord>,
): ConfigVersionRecord {
  const typedConfigType = configType as ConfigVersionRecord["config_type"];
  const state = overrides?.lifecycle_state ?? "APPROVED";
  const approved =
    state === "APPROVED" ||
    state === "DEPRECATED" ||
    state === "REVOKED" ||
    state === "RETIRED";
  const verified = approved || state === "VERIFIED";
  return normalizeConfigVersionRecord({
    artifact_type: "ConfigVersion",
    version_id: `${lower(configType)}-v1`,
    config_type: typedConfigType,
    lifecycle_state: state,
    state_transition_contract: buildConfigVersionStateTransitionContract({
      current_state: state,
      previous_state_or_null: state === "APPROVED" ? "VERIFIED" : null,
      transition_event_code: state === "APPROVED" ? "approval_granted" : "submit_for_test",
      transition_applied_at: "2026-04-20T09:00:00Z",
      transition_audit_ref: `audit://${lower(configType)}/state`,
    }),
    content_hash: `content-hash://${lower(configType)}`,
    effective_scope: ["tenant"],
    approvals: approved ? [`approval://${lower(configType)}`] : [],
    verification_evidence_ref_or_null: verified ? `verification://${lower(configType)}` : null,
    approved_at_or_null: approved ? "2026-04-20T09:00:00Z" : null,
    superseded_by_version_id_or_null:
      state === "DEPRECATED" ? `${lower(configType)}-v2` : null,
    revocation_reason_code_or_null: state === "REVOKED" ? "URGENT_WITHDRAWAL" : null,
    retired_at_or_null: state === "RETIRED" ? "2026-04-30T09:00:00Z" : null,
    state_changed_at: "2026-04-20T09:00:00Z",
    created_at: "2026-04-19T09:00:00Z",
    audit_refs: [`audit://${lower(configType)}/created`],
    provenance_refs: [`provenance://${lower(configType)}`],
    ...overrides,
  });
}

function buildEntry(
  configType: ConfigFreezeConfigEntry["config_type"],
  status: ConfigFreezeConfigEntry["status_at_freeze"] = "APPROVED",
): ConfigFreezeConfigEntry {
  const providerAware = configType === "PROVIDER_CONTRACT_PROFILE";
  return {
    config_type: configType,
    version_id: `config-version://${lower(configType)}`,
    content_hash: `content-hash://${lower(configType)}`,
    status_at_freeze: status,
    effective_scope: "tenant",
    effective_from: "2026-04-20T09:00:00Z",
    effective_to: null,
    ccr_id: `ccr://${lower(configType)}`,
    test_suite_refs: [`suite://${lower(configType)}`],
    provider_api_version: providerAware ? "2026-04" : null,
    provider_schema_version: providerAware ? "provider-v1" : null,
    environment_allowlist: providerAware ? ["PRODUCTION"] : [],
    compatibility_class: "BACKWARD_COMPATIBLE",
    superseded_by_version_id: null,
  };
}

function buildEntries(
  overrides?: Partial<Record<ConfigFreezeConfigEntry["config_type"], ConfigFreezeConfigEntry["status_at_freeze"]>>,
) {
  return REQUIRED_CONFIG_TYPE_ORDER.map((configType) =>
    buildEntry(configType, overrides?.[configType] ?? "APPROVED"),
  );
}

function buildFreezeInput(
  overrides?: Partial<ConfigFreezeBuildInput> & { entries?: ConfigFreezeConfigEntry[] },
): ConfigFreezeBuildInput {
  const entries = overrides?.entries ?? buildEntries();
  const refs = Object.fromEntries(
    REQUIRED_CONFIG_TYPE_ORDER.map((configType) => [
      CONFIG_TYPE_TO_FREEZE_REF_FIELD[configType],
      entries.find((entry) => entry.config_type === configType)?.version_id ??
        `missing://${configType}`,
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
    config_freeze_id: "config-freeze://unit",
    manifest_id: "manifest://unit",
    entries,
    schema_bundle_hash: "schema-bundle-hash://unit",
    feature_flag_snapshot_hash: null,
    config_resolution_basis: "DIRECT_REQUEST_RESOLUTION",
    source_config_freeze_ref: null,
    source_config_freeze_hash: null,
    source_config_surface_hash: null,
    approval_snapshot_ref: "approval-snapshot://unit",
    ...refs,
    ...overrides,
  };
}

function buildCcr(overrides?: Partial<ConfigChangeRequestRecord>) {
  const state = overrides?.lifecycle_state ?? "OPEN";
  return normalizeConfigChangeRequestRecord({
    artifact_type: "ConfigChangeRequest",
    ccr_id: "ccr://unit",
    tenant_id: "tenant://unit",
    lifecycle_state: state,
    state_transition_contract: buildConfigChangeRequestStateTransitionContract({
      current_state: state,
      previous_state_or_null: null,
      transition_event_code: "assigned",
      transition_applied_at: "2026-04-20T09:00:00Z",
      transition_audit_ref: "audit://ccr/unit",
    }),
    diff_ref: "diff://unit",
    risk_assessment_ref: "risk://unit",
    approvals: [],
    rejected_reason_code_or_null: null,
    implemented_release_ref_or_null: null,
    rolled_back_release_ref_or_null: null,
    state_changed_at: "2026-04-20T09:00:00Z",
    created_at: "2026-04-20T08:00:00Z",
    audit_refs: ["audit://ccr/created"],
    provenance_refs: ["provenance://ccr"],
    ...overrides,
  });
}

test("config version and CCR lifecycle machines reject illegal transitions", () => {
  expect(getNextConfigVersionLifecycleState("DRAFT", "submit_for_test")).toBe("CANDIDATE");
  expect(getNextConfigVersionLifecycleState("APPROVED", "replacement_approved")).toBe(
    "DEPRECATED",
  );
  expect(() =>
    getNextConfigVersionLifecycleState("REVOKED", "approval_granted"),
  ).toThrow(ConfigVersionLifecycleError);

  expect(getNextConfigChangeRequestLifecycleState("OPEN", "assigned")).toBe("UNDER_REVIEW");
  expect(getNextConfigChangeRequestLifecycleState("TESTING", "pass")).toBe("APPROVED");
  expect(getNextConfigChangeRequestLifecycleState("IMPLEMENTED", "rollback")).toBe(
    "ROLLED_BACK",
  );
  expect(() =>
    getNextConfigChangeRequestLifecycleState("REJECTED", "deployed"),
  ).toThrow(ConfigChangeRequestLifecycleError);
});

test("state-specific model validation keeps release and rollback lineage explicit", () => {
  expect(buildConfigVersion("COMPUTATION_RULES", { lifecycle_state: "APPROVED" }).approvals).toEqual([
    "approval://computation_rules",
  ]);
  expect(() =>
    buildConfigVersion("COMPUTATION_RULES", {
      lifecycle_state: "APPROVED",
      approvals: [],
    }),
  ).toThrow(/APPROVED config versions require approval/);

  const implemented = buildCcr({
    lifecycle_state: "IMPLEMENTED",
    state_transition_contract: buildConfigChangeRequestStateTransitionContract({
      current_state: "IMPLEMENTED",
      previous_state_or_null: "APPROVED",
      transition_event_code: "deployed",
      transition_applied_at: "2026-04-20T10:00:00Z",
      transition_audit_ref: "audit://ccr/deployed",
    }),
    approvals: ["approval://ccr"],
    implemented_release_ref_or_null: "release://config/v1",
  });
  const rolledBack = buildCcr({
    ...implemented,
    lifecycle_state: "ROLLED_BACK",
    state_transition_contract: buildConfigChangeRequestStateTransitionContract({
      current_state: "ROLLED_BACK",
      previous_state_or_null: "IMPLEMENTED",
      transition_event_code: "rollback",
      transition_applied_at: "2026-04-20T11:00:00Z",
      transition_audit_ref: "audit://ccr/rollback",
    }),
    rolled_back_release_ref_or_null: "release://config/v1-rollback",
  });
  expect(rolledBack.implemented_release_ref_or_null).toBe("release://config/v1");
  expect(rolledBack.rolled_back_release_ref_or_null).toBe("release://config/v1-rollback");
});

test("config freeze hashing and completeness use canonical config-type order", () => {
  const entries = buildEntries();
  const reversed = [...entries].reverse();
  expect(createConfigFreezeHashVector(reversed).map((entry) => entry.config_type)).toEqual(
    REQUIRED_CONFIG_TYPE_ORDER,
  );
  expect(computeConfigFreezeHash(entries)).toBe(computeConfigFreezeHash(reversed));

  const freeze = buildConfigFreezeRecord(buildFreezeInput({ entries: reversed }));
  expect(freeze.entries.map((entry) => entry.config_type)).toEqual(REQUIRED_CONFIG_TYPE_ORDER);
  expect(freeze.required_config_types_present).toEqual(REQUIRED_CONFIG_TYPE_ORDER);
  expect(() =>
    buildConfigFreezeRecord(
      buildFreezeInput({
        entries: entries.filter((entry) => entry.config_type !== "RETENTION_POLICY"),
      }),
    ),
  ).toThrow(ConfigFreezeModelError);
});

test("source-lineage typing distinguishes fresh resolution from exact reuse", () => {
  const direct = buildConfigFreezeRecord(buildFreezeInput());
  const freshSameHash = buildConfigFreezeRecord(
    buildFreezeInput({
      config_freeze_id: "config-freeze://fresh-same-hash",
      manifest_id: "manifest://fresh-same-hash",
    }),
  );
  expect(freshSameHash.config_freeze_hash).toBe(direct.config_freeze_hash);
  expect(freshSameHash.source_config_freeze_ref).toBeNull();
  expect(freshSameHash.config_resolution_basis).toBe("DIRECT_REQUEST_RESOLUTION");

  const replay = buildConfigFreezeRecord(
    buildFreezeInput({
      config_freeze_id: "config-freeze://replay",
      manifest_id: "manifest://replay",
      config_resolution_basis: "REPLAY_EXACT_REUSE",
      source_config_freeze_ref: direct.config_freeze_id,
      source_config_freeze_hash: direct.config_freeze_hash,
      source_config_surface_hash: direct.config_surface_hash,
    }),
  );
  expect(replay.config_surface_hash).toBe(direct.config_surface_hash);
  expect(replay.source_config_freeze_ref).toBe(direct.config_freeze_id);

  expect(() =>
    buildConfigFreezeRecord(
      buildFreezeInput({
        config_resolution_basis: "HISTORICAL_EXPLICIT_REUSE",
        source_config_freeze_ref: direct.config_freeze_id,
        source_config_freeze_hash: "wrong-freeze-hash",
        source_config_surface_hash: direct.config_surface_hash,
      }),
    ),
  ).toThrow(/exact freeze and surface hash equality/);
});

test("usage rules reject non-approved new compliance freeze but preserve replay carve-out", () => {
  const candidateFreeze = buildConfigFreezeRecord(
    buildFreezeInput({
      entries: buildEntries({ COMPUTATION_RULES: "CANDIDATE" }),
    }),
  );
  expect(() =>
    assertConfigFreezeUsageAllowed(candidateFreeze, {
      mode: "COMPLIANCE",
      run_kind: "INTERACTIVE",
    }),
  ).toThrow(/may freeze only APPROVED/);

  const historicalReplayFreeze = buildConfigFreezeRecord(
    buildFreezeInput({
      entries: buildEntries({
        COMPUTATION_RULES: "DEPRECATED",
        RETENTION_POLICY: "REVOKED",
      }),
    }),
  );
  expect(
    assertConfigFreezeUsageAllowed(historicalReplayFreeze, {
      mode: "COMPLIANCE",
      run_kind: "REPLAY",
    }).entries.find((entry) => entry.status_at_freeze === "REVOKED")?.config_type,
  ).toBe("RETENTION_POLICY");
});

test("config surface hash changes when a top-level profile ref changes", () => {
  const freeze = buildConfigFreezeRecord(buildFreezeInput());
  const sameFreezeHashDifferentSurfaceInput = {
    ...freeze,
    approval_snapshot_ref: "approval-snapshot://changed",
  };
  const changedSurfaceHash = computeConfigSurfaceHash(sameFreezeHashDifferentSurfaceInput);

  expect(sameFreezeHashDifferentSurfaceInput.config_freeze_hash).toBe(freeze.config_freeze_hash);
  expect(changedSurfaceHash).not.toBe(freeze.config_surface_hash);
});
