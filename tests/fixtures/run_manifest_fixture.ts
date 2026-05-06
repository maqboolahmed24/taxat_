import { stableJsonHash } from "../../packages/domain-kernel/src/primitives/hash.ts";
import {
  buildEmptyRunManifestAppendOnlyOutcomeProjection,
  buildManifestBranchDecisionContract,
  buildRunManifestContinuationSet,
  buildRunManifestGateDecisionRecord,
  buildRunManifestInvariantEnforcementContract,
  buildRunManifestPresealGateEvaluation,
  buildRunManifestStateTransitionContract,
  buildRunManifestStartClaimContract,
  buildRunManifestTruthBoundaryContract,
  PRESEAL_REQUIRED_GATE_CODES,
  type RunManifestAppendOnlyOutcomeProjectionRecord,
  type RunManifestRecord,
} from "../../packages/backend-manifest/src/index.ts";
import {
  normalizeScopeExecutionBindingRecord,
  type ScopeExecutionBindingRecord,
} from "../../packages/backend-access/src/index.ts";

const REQUIRED_CONFIG_TYPES = [
  "COMPUTATION_RULES",
  "PARITY_THRESHOLDS",
  "TRUST_THRESHOLDS",
  "RISK_THRESHOLDS",
  "WORKFLOW_POLICY",
  "OVERRIDE_POLICY",
  "RETENTION_POLICY",
  "EVIDENCE_CONFIDENCE_POLICY",
  "CANONICALIZATION_RULES",
  "CONNECTOR_MAPPING_RULES",
  "PROVIDER_CONTRACT_PROFILE",
  "MATERIALITY_PROFILE",
  "AMENDMENT_MATERIALITY_PROFILE",
  "MASKING_EXPORT_POLICY",
] as const;

export function buildSchemaReaderWindowContract(schemaBundleHash = "schema.bundle.hash.default") {
  return {
    contract_version: "SCHEMA_READER_WINDOW_CONTRACT_V1",
    compatibility_window_ref: "compat-window://default",
    writer_schema_bundle_hash: schemaBundleHash,
    supported_reader_schema_bundle_hashes: [schemaBundleHash, "schema.bundle.hash.previous"].sort(),
    protected_historical_schema_bundle_hashes: ["schema.bundle.hash.previous"],
    window_state: "VERIFIED_PREVIOUS_READERS_SUPPORTED",
    historical_manifest_policy:
      "FROZEN_MANIFESTS_REQUIRE_RECORDED_BUNDLE_OR_COMPATIBLE_READER",
    destructive_change_policy: "DESTRUCTIVE_CHANGE_BLOCKED_UNTIL_WINDOW_CLOSED",
    rollback_boundary_policy: "ROLLBACK_ALLOWED_ONLY_WHILE_PREVIOUS_READERS_SUPPORTED",
    fail_forward_policy: "FAIL_FORWARD_REQUIRED_AFTER_WINDOW_CLOSE_OR_BREAKING_CONTRACT",
    replay_restore_policy: "RESTORE_AND_REPLAY_REQUIRE_WINDOW_COMPATIBLE_READER",
  } as const;
}

export function buildSchemaBundle(schemaBundleHash = "schema.bundle.hash.default") {
  const schemaReaderWindowContract = buildSchemaReaderWindowContract(schemaBundleHash);
  return {
    schema_bundle_hash: schemaBundleHash,
    published_at: "2026-04-23T08:00:00Z",
    compatibility_profile_ref: "compatibility-profile://default",
    schema_reader_window_contract: schemaReaderWindowContract,
    entries: [
      {
        schema_id: "https://taxat.dev/schemas/run_manifest.schema.json",
        artifact_type: "RunManifest",
        semantic_version: "1.0.0",
        content_hash: "schema-content-hash.run-manifest",
        dialect_ref: "json-schema-draft-2020-12",
        compatibility_class: "BACKWARD_COMPATIBLE",
        supersedes_schema_id: null,
        writer_min_reader_version: "1.0.0",
        allowed_upgrade_kinds: ["PATCH_BACKWARD", "MINOR_BACKWARD"],
      },
    ],
  };
}

function buildSchemaArtifactContract(schemaBundleHash = "schema.bundle.hash.default") {
  return {
    artifact_id: "artifact-contract://run-manifest-input-freeze",
    schema_id: "https://taxat.dev/schemas/input_freeze.schema.json",
    artifact_type: "InputFreeze",
    semantic_version: "1.0.0",
    content_hash: "schema-content-hash.input-freeze",
    dialect_ref: "json-schema-draft-2020-12",
    compatibility_class: "BACKWARD_COMPATIBLE",
    supersedes_schema_id: null,
    writer_min_reader_version: "1.0.0",
    allowed_upgrade_kinds: ["PATCH_BACKWARD", "MINOR_BACKWARD"],
    schema_bundle_hash: schemaBundleHash,
    artifact_content_hash: "artifact-content-hash.input-freeze",
    writer_build_id: "build.taxat.0097",
  } as const;
}

export function buildAccessDecision(scope: ScopeExecutionBindingRecord["requested_scope"]) {
  return {
    decision: "ALLOW",
    reason_codes: ["ACCESS_GRANTED"],
    effective_scope: [...scope],
    masking_rules: [],
    required_approvals: [],
    required_authn_level: null,
  } as const;
}

export function buildRunManifestScopeBinding(input: {
  access_binding_hash: string;
  mode: "COMPLIANCE" | "ANALYSIS";
  scope: ScopeExecutionBindingRecord["requested_scope"];
}) {
  return normalizeScopeExecutionBindingRecord({
    binding_scope_class: "RUN_MANIFEST",
    execution_mode_or_null: input.mode,
    requested_scope: input.scope,
    executable_scope: input.scope,
    executable_partition_scope_refs: [],
    access_decision: "ALLOW",
    masking_rules: [],
    required_approvals: [],
    required_authn_level: null,
    reason_codes: ["ACCESS_GRANTED"],
    requested_scope_family: "READ_ONLY",
    executable_scope_family: "READ_ONLY",
    reduction_posture: "UNCHANGED",
    mutation_atomicity: "NARROWING_ALLOWED",
    authorization_decision_access_binding_hash: input.access_binding_hash,
  }) as ScopeExecutionBindingRecord & { binding_scope_class: "RUN_MANIFEST" };
}

function buildFrozenScopeBinding(input: {
  scope_execution_binding: ScopeExecutionBindingRecord;
}) {
  return {
    ...structuredClone(input.scope_execution_binding),
    binding_scope_class: "FROZEN_EXECUTION_BINDING" as const,
  };
}

export function buildConfigFreeze(input: {
  feature_flag_snapshot_hash: string | null;
  manifest_id: string;
  schema_bundle_hash: string;
}) {
  const entries = REQUIRED_CONFIG_TYPES.map((configType) => ({
    config_type: configType,
    version_id: `config-version://${configType.toLowerCase()}`,
    content_hash: `config-hash://${configType.toLowerCase()}`,
    status_at_freeze: "APPROVED" as const,
    effective_scope: null,
    effective_from: "2026-01-01T00:00:00Z",
    effective_to: "2027-01-01T00:00:00Z",
    ccr_id: null,
    test_suite_refs: [],
    provider_api_version: null,
    provider_schema_version: null,
    environment_allowlist: [],
    compatibility_class: "BACKWARD_COMPATIBLE",
    superseded_by_version_id: null,
  }));

  return {
    config_freeze_id: `config-freeze://${input.manifest_id}`,
    manifest_id: input.manifest_id,
    artifact_type: "ConfigFreeze",
    entries,
    config_freeze_hash: stableJsonHash(entries),
    schema_bundle_hash: input.schema_bundle_hash,
    feature_flag_snapshot_hash: input.feature_flag_snapshot_hash,
    config_surface_hash: stableJsonHash({
      entries: entries.map((entry) => ({
        config_type: entry.config_type,
        content_hash: entry.content_hash,
      })),
    }),
    config_completeness_state: "COMPLETE_REQUIRED_CONFIG_SET",
    config_resolution_basis: "DIRECT_REQUEST_RESOLUTION",
    source_config_freeze_ref: null,
    source_config_freeze_hash: null,
    source_config_surface_hash: null,
    config_consumption_mode: "FROZEN_CONFIG_ONLY",
    approval_snapshot_ref: "approval-snapshot://default",
    materiality_profile_ref: "materiality-profile://default",
    amendment_materiality_profile_ref: "amendment-materiality-profile://default",
    retention_profile_ref: "retention-profile://default",
    provider_contract_profile_ref: "provider-contract-profile://default",
    workflow_policy_ref: "workflow-policy://default",
    override_policy_ref: "override-policy://default",
    masking_export_policy_ref: "masking-export-policy://default",
    canonicalization_rules_ref: "canonicalization-rules://default",
    connector_mapping_rules_ref: "connector-mapping-rules://default",
    parity_threshold_profile_ref: "parity-threshold-profile://default",
    trust_threshold_profile_ref: "trust-threshold-profile://default",
    risk_threshold_profile_ref: "risk-threshold-profile://default",
    evidence_confidence_policy_ref: "evidence-confidence-policy://default",
    computation_rules_ref: "computation-rules://default",
    required_config_types_present: [...REQUIRED_CONFIG_TYPES],
  };
}

export function buildInputFreeze(input: {
  manifest_id: string;
  schema_bundle_hash: string;
}) {
  const noDataSourceDomain = "authority_returns";
  return {
    input_freeze_id: `input-freeze://${input.manifest_id}`,
    manifest_id: input.manifest_id,
    artifact_type: "InputFreeze",
    source_plan_ref: "source-plan://default",
    source_plan_hash: "source-plan-hash://default",
    collection_boundary_ref: "collection-boundary://default",
    collection_boundary_hash: "collection-boundary-hash://default",
    input_policy_ref: "input-policy://default",
    source_window_ref: "source-window://default",
    source_window_hash: "source-window-hash://default",
    read_cutoff_at: "2026-04-23T08:30:00Z",
    provider_environment_refs: [],
    provider_api_versions: [],
    provider_schema_versions: [],
    connector_profile_ref: "connector-profile://default",
    connector_build_id: "connector-build://default",
    cursor_checkpoint_refs: [],
    request_audit_refs: [],
    late_data_policy_bindings: [
      {
        binding_id: `late-data-binding://${input.manifest_id}`,
        source_domain: noDataSourceDomain,
        source_class: null,
        partition_scope_refs: [],
        runtime_scope_refs: [],
        late_data_policy_ref: "REVIEW_IF_LATE",
        binding_scope: "DOMAIN_WIDE",
        precedence_rank: 1,
      },
    ],
    source_record_refs: [],
    evidence_item_refs: [],
    candidate_fact_refs: [],
    canonical_fact_refs: [],
    exclusion_refs: [],
    no_data_confirmed_declarations: [noDataSourceDomain],
    conflict_refs: [],
    open_conflict_count: 0,
    blocking_conflict_count: 0,
    resolution_frontier: "CLEAR",
    dominant_blocking_class: null,
    missing_source_declarations: [],
    stale_source_declarations: [],
    source_domain_postures: [
      {
        source_domain: noDataSourceDomain,
        source_class: null,
        partition_scope_refs: [],
        runtime_scope_refs: [],
        boundary_disposition: "NO_DATA_CONFIRMED_AT_CUTOFF",
        late_data_policy_ref: "REVIEW_IF_LATE",
        source_record_count: 0,
        evidence_item_count: 0,
        candidate_fact_count: 0,
        canonical_fact_count: 0,
        conflict_count: 0,
      },
    ],
    normalization_context_ref: "normalization-context://default",
    normalization_context_hash: "normalization-context-hash://default",
    artifact_contract_refs: [
      "artifact-contract://canonical-facts",
      "artifact-contract://candidate-facts",
      "artifact-contract://collection-boundary",
      "artifact-contract://conflicts",
      "artifact-contract://connector-profile",
      "artifact-contract://evidence-items",
      "artifact-contract://input-policy",
      "artifact-contract://late-data-policy",
      "artifact-contract://source-plan",
      "artifact-contract://source-window",
    ].sort(),
    artifact_contract_hash: "artifact-contract-hash://default",
    input_set_hash: stableJsonHash({
      manifest_id: input.manifest_id,
      source_window_hash: "source-window-hash://default",
    }),
    input_consumption_mode: "FROZEN_INPUT_ONLY",
    late_data_adoption_policy: "CHILD_REVIEW_OR_EXCLUDE_ONLY",
    contract: buildSchemaArtifactContract(input.schema_bundle_hash),
  };
}

export function buildBaseAllocatedManifest(
  overrides?: Partial<RunManifestRecord>,
): RunManifestRecord {
  const manifest_id = overrides?.manifest_id ?? "manifest.run.0097";
  const schema_bundle_hash = overrides?.schema_bundle_hash ?? "schema.bundle.hash.default";
  const requested_scope = overrides?.requested_scope ?? ["year_end"];
  const mode = overrides?.mode ?? "COMPLIANCE";
  const run_kind = overrides?.run_kind ?? "INTERACTIVE";
  const authorization_decision_access_binding_hash =
    overrides?.access_binding_hash ?? "authorization-decision-access-binding-hash://manifest.run.0097";
  const scope_execution_binding =
    overrides?.scope_execution_binding ??
    buildRunManifestScopeBinding({
      access_binding_hash: authorization_decision_access_binding_hash,
      mode,
      scope: requested_scope,
    });
  const access_binding_hash =
    overrides?.scope_execution_binding?.access_binding_hash ??
    scope_execution_binding.access_binding_hash;
  const access_decision = overrides?.access_decision ?? buildAccessDecision(requested_scope);
  const manifest_branch_decision =
    overrides?.manifest_branch_decision ??
    buildManifestBranchDecisionContract({
      branch_action: "NEW_MANIFEST",
      access_binding_hash,
      manifest_id,
      idempotency_key: overrides?.idempotency_key ?? `idempotency://${manifest_id}`,
      requested_scope,
      mode,
      run_kind,
      replay_class_or_null: overrides?.replay_class ?? null,
      nightly_window_key_or_null: overrides?.nightly_window_key ?? null,
    });
  const continuation_set =
    overrides?.continuation_set ?? buildRunManifestContinuationSet(manifest_branch_decision);
  const created_at = overrides?.created_at ?? "2026-04-23T09:00:00Z";

  return {
    manifest_id,
    root_manifest_id: manifest_id,
    parent_manifest_id: null,
    continuation_of_manifest_id: null,
    replay_of_manifest_id: null,
    supersedes_manifest_id: null,
    manifest_generation: 0,
    manifest_schema_version: "RUN_MANIFEST_V1",
    tenant_id: overrides?.tenant_id ?? "tenant.taxat",
    client_id: overrides?.client_id ?? "client.taxat.primary",
    business_partitions: [],
    income_source_partitions: [],
    period: overrides?.period ?? "2025-2026",
    requested_scope,
    scope_execution_binding,
    mode,
    run_kind,
    nightly_batch_run_ref: null,
    nightly_window_key: null,
    authority_context_ref: null,
    principal_context_ref: overrides?.principal_context_ref ?? "principal-context://default",
    truth_boundary_contract: buildRunManifestTruthBoundaryContract(),
    invariant_enforcement_contract: buildRunManifestInvariantEnforcementContract(),
    access_binding_hash,
    delegation_basis: "SELF_ACTING",
    authority_link_refs: [],
    approval_refs: [],
    override_refs: [],
    environment_ref: overrides?.environment_ref ?? "SANDBOX",
    provider_environment_refs: [],
    code_build_id: overrides?.code_build_id ?? "build.taxat.0097",
    code_commit_sha: overrides?.code_commit_sha ?? "commitsha0097",
    container_image_digest:
      overrides?.container_image_digest ?? "sha256:containerdigest0097",
    schema_bundle_hash,
    schema_reader_window_contract: buildSchemaReaderWindowContract(schema_bundle_hash),
    feature_flag_snapshot_hash: null,
    deterministic_seed: overrides?.deterministic_seed ?? "deterministic-seed://0097",
    idempotency_key: overrides?.idempotency_key ?? `idempotency://${manifest_id}`,
    continuation_basis: "NEW_MANIFEST",
    manifest_branch_decision,
    manifest_lineage_trace_refs:
      overrides?.manifest_lineage_trace_refs ?? [`manifest-lineage-trace://${manifest_id}`],
    replay_class: null,
    non_deterministic_module_allowlist: [],
    continuation_set,
    lifecycle_state: "ALLOCATED",
    state_transition_contract: buildRunManifestStateTransitionContract({
      current_state: "ALLOCATED",
      previous_state_or_null: null,
      transition_event_code: "manifest_allocated",
      transition_applied_at: created_at,
      transition_audit_ref: `audit://${manifest_id}/allocated`,
    }),
    created_at,
    frozen_at: null,
    opened_at: null,
    sealed_at: null,
    completed_at: null,
    superseded_at: null,
    retired_at: null,
    gating_decisions: [],
    access_decision,
    output_refs: {},
    audit_refs: [],
    decision_bundle_hash: null,
    deterministic_outcome_hash: null,
    replay_attestation_ref: null,
    submission_refs: [],
    drift_refs: [],
    ...overrides,
  };
}

export function buildFrozenBasis(manifest: RunManifestRecord) {
  const config_freeze = buildConfigFreeze({
    manifest_id: manifest.manifest_id,
    schema_bundle_hash: manifest.schema_bundle_hash,
    feature_flag_snapshot_hash: manifest.feature_flag_snapshot_hash,
  });
  const input_freeze = buildInputFreeze({
    manifest_id: manifest.manifest_id,
    schema_bundle_hash: manifest.schema_bundle_hash,
  });
  const hash_set = {
    access_binding_hash: manifest.access_binding_hash,
    config_freeze_hash: config_freeze.config_freeze_hash,
    config_surface_hash: config_freeze.config_surface_hash,
    input_set_hash: input_freeze.input_set_hash,
    execution_basis_hash: stableJsonHash({
      access_binding_hash: manifest.access_binding_hash,
      config_freeze_hash: config_freeze.config_freeze_hash,
      input_set_hash: input_freeze.input_set_hash,
      deterministic_seed: manifest.deterministic_seed,
    }),
    manifest_hash: stableJsonHash({
      manifest_id: manifest.manifest_id,
      continuation_basis: manifest.continuation_basis,
      execution_basis_hash: stableJsonHash({
        access_binding_hash: manifest.access_binding_hash,
        config_freeze_hash: config_freeze.config_freeze_hash,
        input_set_hash: input_freeze.input_set_hash,
        deterministic_seed: manifest.deterministic_seed,
      }),
    }),
  };
  const frozen_execution_binding = {
    manifest_id: manifest.manifest_id,
    manifest_hash: hash_set.manifest_hash,
    execution_basis_hash: hash_set.execution_basis_hash,
    continuation_basis: manifest.continuation_basis,
    root_manifest_id: manifest.root_manifest_id ?? manifest.manifest_id,
    parent_manifest_id: manifest.parent_manifest_id,
    continuation_of_manifest_id: manifest.continuation_of_manifest_id,
    replay_of_manifest_id: manifest.replay_of_manifest_id,
    supersedes_manifest_id: manifest.supersedes_manifest_id,
    manifest_generation: manifest.manifest_generation,
    parent_manifest_hash_at_branch: manifest.continuation_set.parent_manifest_hash_at_branch,
    config_inheritance_mode: manifest.continuation_set.config_inheritance_mode,
    input_inheritance_mode: manifest.continuation_set.input_inheritance_mode,
    inherited_config_freeze_ref: manifest.continuation_set.inherited_config_freeze_ref,
    fresh_resolution_reason_code: manifest.continuation_set.fresh_resolution_reason_code,
    inherited_input_freeze_ref: manifest.continuation_set.inherited_input_freeze_ref,
    fresh_collection_reason_code: manifest.continuation_set.fresh_collection_reason_code,
    config_freeze_ref: config_freeze.config_freeze_id,
    config_freeze_hash: config_freeze.config_freeze_hash,
    config_surface_hash: config_freeze.config_surface_hash,
    config_resolution_basis: config_freeze.config_resolution_basis,
    input_freeze_ref: input_freeze.input_freeze_id,
    input_set_hash: input_freeze.input_set_hash,
    source_plan_ref: input_freeze.source_plan_ref,
    source_plan_hash: input_freeze.source_plan_hash,
    source_window_ref: input_freeze.source_window_ref,
    source_window_hash: input_freeze.source_window_hash,
    collection_boundary_ref: input_freeze.collection_boundary_ref,
    collection_boundary_hash: input_freeze.collection_boundary_hash,
    normalization_context_ref: input_freeze.normalization_context_ref,
    normalization_context_hash: input_freeze.normalization_context_hash,
    requested_scope: manifest.requested_scope,
    executable_scope: manifest.access_decision?.effective_scope ?? manifest.requested_scope,
    scope_execution_binding: buildFrozenScopeBinding({
      scope_execution_binding: manifest.scope_execution_binding,
    }),
    access_binding_hash: manifest.access_binding_hash,
    environment_ref: manifest.environment_ref,
    provider_environment_refs: manifest.provider_environment_refs,
    code_build_id: manifest.code_build_id,
    schema_bundle_hash: manifest.schema_bundle_hash,
    feature_flag_snapshot_hash: manifest.feature_flag_snapshot_hash,
    deterministic_seed: manifest.deterministic_seed,
    authority_context_ref: manifest.authority_context_ref ?? null,
    config_consumption_mode: config_freeze.config_consumption_mode,
    input_consumption_mode: input_freeze.input_consumption_mode,
    worker_consumption_mode: "MANIFEST_BOUND_ONLY",
  };
  const append_only_outcome_projection = buildEmptyRunManifestAppendOnlyOutcomeProjection();

  return {
    config_freeze,
    input_freeze,
    hash_set,
    frozen_execution_binding,
    append_only_outcome_projection,
  };
}

export function buildPresealPassGates(manifest: RunManifestRecord) {
  return PRESEAL_REQUIRED_GATE_CODES.map((gateCode, index, gateCodes) =>
    buildRunManifestGateDecisionRecord({
      manifest_id: manifest.manifest_id,
      gate_code: gateCode,
      gate_stage_index: index + 1,
      effective_scope: manifest.access_decision?.effective_scope ?? manifest.requested_scope,
      decided_at: "2026-04-23T09:20:00Z",
      prerequisite_gate_refs:
        index === 0
          ? []
          : gateCodes
              .slice(0, index)
              .map(
                (priorGateCode) =>
                  `gate.${manifest.manifest_id}.${priorGateCode.toLowerCase()}`,
              ),
    }),
  );
}

export function buildReadyToSealProjection(
  manifest: RunManifestRecord,
): RunManifestAppendOnlyOutcomeProjectionRecord {
  const projection = buildEmptyRunManifestAppendOnlyOutcomeProjection();
  projection.gating_decisions = buildPresealPassGates(manifest);
  return projection;
}

export function buildStartedManifestClaim(manifest: RunManifestRecord, openedAt: string) {
  return buildRunManifestStartClaimContract({
    manifest_id: manifest.manifest_id,
    manifest_hash: manifest.hash_set!.manifest_hash,
    execution_basis_hash: manifest.hash_set!.execution_basis_hash,
    access_binding_hash: manifest.access_binding_hash,
    claim_state: "ACTIVE_LEASED",
    claim_acquired_at_or_null: openedAt,
    claim_expires_at_or_null: "2026-04-23T09:45:00Z",
  });
}

export function buildTerminalManifestClaim(
  manifest: RunManifestRecord,
  openedAt: string,
  releaseReason: "COMPLETED" | "FAILED" | "BLOCKED" | "SUPERSEDED" | "REPLAY_ONLY" | "RETIRED",
) {
  return {
    ...buildRunManifestStartClaimContract({
      manifest_id: manifest.manifest_id,
      manifest_hash: manifest.hash_set!.manifest_hash,
      execution_basis_hash: manifest.hash_set!.execution_basis_hash,
      access_binding_hash: manifest.access_binding_hash,
      claim_state: "TERMINAL_RESULT_RECORDED",
      claim_acquired_at_or_null: openedAt,
      claim_release_reason_code_or_null: releaseReason,
    }),
    claim_acquired_at_or_null: openedAt,
    first_publication_committed_at_or_null: openedAt,
  };
}

export function buildCompletedOutcomeProjection(manifest: RunManifestRecord) {
  const projection = buildReadyToSealProjection(manifest);
  projection.projection_generation = 1;
  projection.output_refs = {
    decision_bundle: {
      linkage_role_code: "DECISION_BUNDLE",
      artifact_type: "DecisionBundle",
      artifact_ref: `decision-bundle://${manifest.manifest_id}`,
      artifact_hash_or_null: `decision-bundle-hash://${manifest.manifest_id}`,
      produced_by_manifest_id: manifest.manifest_id,
      dependency_identity_refs: [`dependency://${manifest.manifest_id}/decision-bundle`],
    },
    submission_record: {
      linkage_role_code: "SUBMISSION_RECORD",
      artifact_type: "SubmissionRecord",
      artifact_ref: `submission-record://${manifest.manifest_id}`,
      artifact_hash_or_null: null,
      produced_by_manifest_id: manifest.manifest_id,
      dependency_identity_refs: [`dependency://${manifest.manifest_id}/submission`],
    },
    drift_record: {
      linkage_role_code: "DRIFT_RECORD",
      artifact_type: "DriftRecord",
      artifact_ref: `drift-record://${manifest.manifest_id}`,
      artifact_hash_or_null: null,
      produced_by_manifest_id: manifest.manifest_id,
      dependency_identity_refs: [`dependency://${manifest.manifest_id}/drift`],
    },
  };
  projection.audit_refs = [`audit://${manifest.manifest_id}/run-completed`];
  projection.submission_refs = [`submission-record://${manifest.manifest_id}`];
  projection.drift_refs = [`drift-record://${manifest.manifest_id}`];
  projection.decision_bundle_hash = `decision-bundle-hash://${manifest.manifest_id}`;
  projection.deterministic_outcome_hash = `deterministic-outcome-hash://${manifest.manifest_id}`;
  projection.replay_attestation_ref = null;
  return projection;
}

export function buildSealReadyPresealEvaluation(manifest: RunManifestRecord) {
  const gates = buildPresealPassGates(manifest);
  return {
    gates,
    evaluation: buildRunManifestPresealGateEvaluation({
      manifest_id: manifest.manifest_id,
      execution_basis_hash: manifest.hash_set!.execution_basis_hash,
      access_binding_hash: manifest.access_binding_hash,
      authorized_scope: manifest.access_decision?.effective_scope ?? manifest.requested_scope,
      completion_state: "COMPLETE_READY_TO_SEAL",
      ordered_gate_decision_ids: gates.map((gate) => gate.gate_decision_id),
    }),
  };
}
