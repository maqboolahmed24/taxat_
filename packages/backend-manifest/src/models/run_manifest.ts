import type {
  CommandTruthBoundaryContract,
  InvariantEnforcementContract,
  PresealGateEvaluationContract,
  RunManifestAccessDecision,
  RunManifestAppendOnlyOutcomeProjection,
  RunManifestConfigFreeze,
  RunManifestContinuationSet,
  RunManifestFrozenExecutionBinding,
  RunManifestHashSet,
  RunManifestInputFreeze,
  RunManifestOutputLinkEntry,
  RunManifestProviderEnvironment,
} from "../../../generated-models/src/generated/typescript/domain-workflow-and-filing.ts";
import type {
  ManifestBranchDecisionContract,
  ManifestStartClaimContract,
  SchemaReaderWindowContract,
  StateTransitionContract,
} from "../../../generated-models/src/generated/typescript/manifest-and-release.ts";
import type {
  DecisionExplainabilityContract,
  GateSemanticsContract,
} from "../../../generated-models/src/generated/typescript/decisioning-and-nightly.ts";
import { stableJsonHash, sortSetLikeStrings } from "../../../domain-kernel/src/primitives/hash.ts";
import { normalizeUtcInstantString } from "../../../domain-kernel/src/primitives/time.ts";

import type { ScopeExecutionBindingRecord } from "../../../backend-access/src/models/scope_execution_binding.ts";
import {
  deriveScopeFamily,
  expectedScopeMutationAtomicity,
  normalizeScopeSequence,
  normalizeStringSet,
  requireTrimmedString,
  type CanonicalScopeToken,
} from "../../../backend-access/src/services/principal_context_normalizer.ts";

export type RunManifestLifecycleState =
  | "ALLOCATED"
  | "FROZEN"
  | "SEALED"
  | "IN_PROGRESS"
  | "COMPLETED"
  | "BLOCKED"
  | "FAILED"
  | "SUPERSEDED"
  | "REPLAY_ONLY"
  | "RETIRED";

export type RunManifestTransitionEventCode =
  | "manifest_allocated"
  | "freeze_success"
  | "freeze_blocked"
  | "seal_success"
  | "seal_blocked"
  | "run_started"
  | "run_completed"
  | "gate_block"
  | "system_fault"
  | "superseded_by_new_manifest"
  | "replay_designation"
  | "retention_expiry";

export type RunManifestContinuationBasis =
  | "NEW_MANIFEST"
  | "REPLAY_CHILD"
  | "RECOVERY_CHILD"
  | "CONTINUATION_CHILD"
  | "NEW_REQUEST_CHILD";

export type RunManifestMode = "COMPLIANCE" | "ANALYSIS";
export type RunManifestRunKind =
  | "INTERACTIVE"
  | "NIGHTLY"
  | "BACKFILL"
  | "REPLAY"
  | "REMEDIATION"
  | "AMENDMENT"
  | "MIGRATION";
export type RunManifestReplayClass =
  | "STANDARD_REPLAY"
  | "AUDIT_REPLAY"
  | "COUNTERFACTUAL_ANALYSIS";
export type RunManifestEnvironmentRef =
  | "DEV"
  | "TEST"
  | "UAT"
  | "SANDBOX"
  | "PRODUCTION";

export type RunManifestGateDecisionRecord = {
  artifact_type: "GateDecisionRecord";
  gate_decision_id: string;
  manifest_id: string;
  gate_code:
    | "MANIFEST_GATE"
    | "ARTIFACT_CONTRACT_GATE"
    | "INPUT_BOUNDARY_GATE"
    | "DATA_QUALITY_GATE"
    | "RETENTION_EVIDENCE_GATE"
    | "PARITY_GATE"
    | "TRUST_GATE"
    | "AMENDMENT_GATE"
    | "FILING_GATE"
    | "SUBMISSION_GATE";
  gate_stage_index: number;
  gate_class: "NON_ACCESS";
  decision: "PASS" | "PASS_WITH_NOTICE" | "MANUAL_REVIEW" | "OVERRIDABLE_BLOCK" | "HARD_BLOCK";
  reason_codes: string[];
  dominant_reason_code: string;
  plain_explanation: string;
  decision_explainability_contract: DecisionExplainabilityContract;
  severity: "INFO" | "NOTICE" | "WARNING" | "ERROR" | "CRITICAL";
  gate_semantics_contract: GateSemanticsContract;
  truth_boundary_contract: CommandTruthBoundaryContract;
  metrics: Record<string, unknown>;
  decision_basis_ref: string;
  input_artifact_refs: string[];
  prerequisite_gate_refs: string[];
  blocking_dependency_refs: string[];
  overrideability: "NONE" | "SCOPED_OVERRIDE_ALLOWED" | "SCOPED_OVERRIDE_REQUIRED" | "NON_OVERRIDEABLE";
  override_resolution_state: "NOT_APPLICABLE" | "NO_VALID_OVERRIDE" | "VALID_OVERRIDE_ACTIVE";
  active_override_refs: string[];
  required_override_scope: string | null;
  next_action_codes: string[];
  policy_version_ref: string;
  decided_at: string;
  effective_scope: CanonicalScopeToken[];
};

export type RunManifestOutputLinkMapRecord = Record<string, RunManifestOutputLinkEntry>;

export type RunManifestAppendOnlyOutcomeProjectionRecord = Omit<
  RunManifestAppendOnlyOutcomeProjection,
  "gating_decisions" | "output_refs"
> & {
  gating_decisions: RunManifestGateDecisionRecord[];
  output_refs: RunManifestOutputLinkMapRecord;
};

export type RunManifestScopeExecutionBinding = ScopeExecutionBindingRecord & {
  binding_scope_class: "RUN_MANIFEST";
};

export type RunManifestRecord = {
  manifest_id: string;
  root_manifest_id: string | null;
  parent_manifest_id: string | null;
  continuation_of_manifest_id: string | null;
  replay_of_manifest_id: string | null;
  supersedes_manifest_id: string | null;
  manifest_generation: number;
  manifest_schema_version: string;
  tenant_id: string;
  client_id: string;
  business_partitions: string[];
  income_source_partitions: string[];
  period: string;
  requested_scope: CanonicalScopeToken[];
  scope_execution_binding: RunManifestScopeExecutionBinding;
  mode: RunManifestMode;
  run_kind: RunManifestRunKind;
  nightly_batch_run_ref?: string | null;
  nightly_window_key?: string | null;
  authority_context_ref?: string | null;
  principal_context_ref: string;
  truth_boundary_contract: CommandTruthBoundaryContract;
  invariant_enforcement_contract: InvariantEnforcementContract;
  access_binding_hash: string;
  delegation_basis?: string | null;
  authority_link_refs: string[];
  approval_refs: string[];
  override_refs: string[];
  environment_ref: RunManifestEnvironmentRef;
  provider_environment_refs: RunManifestProviderEnvironment[];
  code_build_id: string;
  code_commit_sha: string;
  container_image_digest: string;
  schema_bundle_hash: string;
  schema_reader_window_contract: SchemaReaderWindowContract;
  feature_flag_snapshot_hash: string | null;
  config_freeze?: RunManifestConfigFreeze | null;
  input_freeze?: RunManifestInputFreeze | null;
  deterministic_seed: string;
  idempotency_key: string;
  continuation_basis: RunManifestContinuationBasis;
  manifest_branch_decision: ManifestBranchDecisionContract;
  manifest_lineage_trace_refs: string[];
  replay_class?: RunManifestReplayClass | null;
  non_deterministic_module_allowlist: string[];
  hash_set?: RunManifestHashSet | null;
  frozen_execution_binding?: RunManifestFrozenExecutionBinding | null;
  preseal_gate_evaluation?: PresealGateEvaluationContract | null;
  manifest_start_claim?: ManifestStartClaimContract | null;
  append_only_outcome_projection?: RunManifestAppendOnlyOutcomeProjectionRecord | null;
  continuation_set: RunManifestContinuationSet;
  lifecycle_state: RunManifestLifecycleState;
  state_transition_contract: StateTransitionContract;
  created_at: string;
  frozen_at: string | null;
  opened_at: string | null;
  sealed_at: string | null;
  completed_at: string | null;
  superseded_at: string | null;
  retired_at: string | null;
  gating_decisions: RunManifestGateDecisionRecord[];
  access_decision?: RunManifestAccessDecision | null;
  output_refs: RunManifestOutputLinkMapRecord;
  audit_refs: string[];
  decision_bundle_hash: string | null;
  deterministic_outcome_hash: string | null;
  replay_attestation_ref: string | null;
  submission_refs: string[];
  drift_refs: string[];
};

export const RUN_MANIFEST_MACHINE_CODE = "RUN_MANIFEST_LIFECYCLE_V1";
export const RUN_MANIFEST_STATE_FIELD = "lifecycle_state";
export const RUN_MANIFEST_SCHEMA_VERSION = "RUN_MANIFEST_V1";
export const PRESEAL_REQUIRED_GATE_CODES = [
  "MANIFEST_GATE",
  "ARTIFACT_CONTRACT_GATE",
  "INPUT_BOUNDARY_GATE",
  "DATA_QUALITY_GATE",
] as const;
export const CHILD_CONTINUATION_BASES = new Set<RunManifestContinuationBasis>([
  "REPLAY_CHILD",
  "RECOVERY_CHILD",
  "CONTINUATION_CHILD",
  "NEW_REQUEST_CHILD",
]);
export const LIVE_MANIFEST_SCOPE_TOKENS = new Set<CanonicalScopeToken>([
  "prepare_submission",
  "submit",
  "amendment_intent",
  "amendment_submit",
]);

const COMMAND_SIDE_TRUTH_POLICIES = {
  contract_version: "COMMAND_TRUTH_BOUNDARY_V1",
  artifact_role: "COMMAND_SIDE_AUTHORITY",
  authoritative_source_policy: "DURABLE_COMMAND_RECORDS_ONLY",
  projection_input_policy: "FORBIDDEN_AS_AUTHORITY",
  durable_writeback_policy: "AUTHORITATIVE_STATE_TRANSITIONS_ALLOWED",
  recovery_basis_policy: "MANIFEST_AND_DURABLE_RECORDS_ONLY",
  authoritative_record_families: [
    "RUN_MANIFEST",
    "GATE_DECISION_RECORD",
    "WORKFLOW_ITEM",
    "AUTHORITY_INTERACTION_RECORD",
    "AUDIT_EVENT",
  ],
  observable_projection_families: [],
} as const satisfies CommandTruthBoundaryContract;

const GATE_TRUTH_POLICIES = {
  contract_version: "COMMAND_TRUTH_BOUNDARY_V1",
  artifact_role: "COMMAND_SIDE_AUTHORITY",
  authoritative_source_policy: "DURABLE_COMMAND_RECORDS_ONLY",
  projection_input_policy: "FORBIDDEN_AS_AUTHORITY",
  durable_writeback_policy: "AUTHORITATIVE_STATE_TRANSITIONS_ALLOWED",
  recovery_basis_policy: "MANIFEST_AND_DURABLE_RECORDS_ONLY",
  authoritative_record_families: [
    "RUN_MANIFEST",
    "GATE_DECISION_RECORD",
    "AUDIT_EVENT",
  ],
  observable_projection_families: [],
} as const satisfies CommandTruthBoundaryContract;

const INVARIANT_ERROR_FAMILY_BY_CLASS = {
  SCOPE_BINDING: "MANIFEST_ERROR",
  MANIFEST_REUSE: "MANIFEST_ERROR",
  LIFECYCLE_TRANSITION: "MANIFEST_ERROR",
  PRESEAL_GATE_CHAIN: "MANIFEST_ERROR",
  INPUT_POLICY: "INPUT_BOUNDARY_ERROR",
  CANONICAL_PROMOTION: "CANONICALIZATION_ERROR",
  GRAPH_PROVENANCE: "PROVENANCE_ERROR",
  AMENDMENT_SUBMISSION: "AMENDMENT_ERROR",
  FILING_READINESS: "WORKFLOW_ERROR",
  REPLAY_BASIS: "SYSTEM_FAULT",
  AUTHORITY_PREFLIGHT: "AUTHORITY_PROTOCOL_ERROR",
} as const;

const INVARIANT_ERROR_CODE_BY_CLASS = {
  SCOPE_BINDING: "RUNTIME_SCOPE_EMPTY",
  MANIFEST_REUSE: "MANIFEST_NOT_SEALED_FOR_REUSE",
  LIFECYCLE_TRANSITION: "MANIFEST_START_CLAIM_INVALID",
  PRESEAL_GATE_CHAIN: "PRESEAL_GATE_CHAIN_MISMATCH",
  INPUT_POLICY: "LATE_DATA_POLICY_UNKNOWN",
  CANONICAL_PROMOTION: "CROSS_PARTITION_PROMOTION_DETECTED",
  GRAPH_PROVENANCE: "GRAPH_QUALITY_MISSING",
  AMENDMENT_SUBMISSION: "AMENDMENT_CASE_NOT_FOUND",
  FILING_READINESS: "FILING_PACKET_MANIFEST_BINDING_MISMATCH",
  REPLAY_BASIS: "MANIFEST_EXECUTION_BASIS_HASH_MISSING",
  AUTHORITY_PREFLIGHT: "MANIFEST_NOT_READY_FOR_AUTHORITY_PREFLIGHT",
} as const;

const GATE_SEVERITY_BY_DECISION = {
  PASS: "INFO",
  PASS_WITH_NOTICE: "NOTICE",
  MANUAL_REVIEW: "WARNING",
  OVERRIDABLE_BLOCK: "ERROR",
  HARD_BLOCK: "CRITICAL",
} as const;

const GATE_DECISION_RANK_BY_DECISION = {
  PASS: 0,
  PASS_WITH_NOTICE: 1,
  MANUAL_REVIEW: 2,
  OVERRIDABLE_BLOCK: 3,
  HARD_BLOCK: 4,
} as const;

const GATE_PROGRESSION_RANK_BY_DECISION = {
  PASS: 2,
  PASS_WITH_NOTICE: 2,
  MANUAL_REVIEW: 1,
  OVERRIDABLE_BLOCK: 0,
  HARD_BLOCK: 0,
} as const;

const GATE_BLOCKING_CLASS_BY_DECISION = {
  PASS: "NON_BLOCKING",
  PASS_WITH_NOTICE: "NON_BLOCKING",
  MANUAL_REVIEW: "REVIEW_REQUIRED",
  OVERRIDABLE_BLOCK: "BLOCKED",
  HARD_BLOCK: "BLOCKED",
} as const;

const GATE_PROGRESSION_SEMANTICS_BY_DECISION = {
  PASS: "AUTOMATED_CONTINUE",
  PASS_WITH_NOTICE: "AUTOMATED_CONTINUE_WITH_NOTICE",
  MANUAL_REVIEW: "REVIEW_ONLY",
  OVERRIDABLE_BLOCK: "BLOCKED",
  HARD_BLOCK: "BLOCKED",
} as const;

const DECISION_EXPLAINABILITY_QUALIFIER_ORDER = [
  "AUTHORITY_STATE",
  "LIMITATION_STATE",
  "OVERRIDE_STATE",
  "ACTIONABILITY_STATE",
] as const;

const MANIFEST_BRANCH_REASON_BY_ACTION: Record<
  RunManifestContinuationBasis | "RETURN_EXISTING_BUNDLE" | "REUSE_SEALED_MANIFEST" | "NEW_MANIFEST",
  ManifestBranchDecisionContract["branch_reason_code"]
> = {
  NEW_MANIFEST: "NO_PRIOR_MANIFEST",
  RETURN_EXISTING_BUNDLE: "TERMINAL_IDEMPOTENT_RETRY",
  REUSE_SEALED_MANIFEST: "PRESTART_SEALED_CONTEXT_REUSE",
  REPLAY_CHILD: "REPLAY_REQUESTED_EXACT",
  RECOVERY_CHILD: "STARTED_ATTEMPT_RECOVERY",
  CONTINUATION_CHILD: "POST_TERMINAL_CONTINUATION_REQUIRED",
  NEW_REQUEST_CHILD: "REQUEST_IDENTITY_CHANGED",
};

type RunManifestModelErrorCode =
  | "RUN_MANIFEST_FIELD_REQUIRED"
  | "RUN_MANIFEST_INVALID_GATE"
  | "RUN_MANIFEST_INVALID_INVARIANT"
  | "RUN_MANIFEST_INVALID_POSTURE"
  | "RUN_MANIFEST_INVALID_SCOPE";

export class RunManifestModelError extends Error {
  readonly code: RunManifestModelErrorCode;

  constructor(code: RunManifestModelErrorCode, detail: string) {
    super(`${code}: ${detail}`);
    this.name = "RunManifestModelError";
    this.code = code;
  }
}

function assertCondition(
  condition: unknown,
  code: RunManifestModelErrorCode,
  detail: string,
): asserts condition {
  if (!condition) {
    throw new RunManifestModelError(code, detail);
  }
}

function normalizeOrderedUniqueStrings(
  label: string,
  values: readonly string[] | null | undefined,
  options?: { allowEmpty?: boolean },
) {
  const seen = new Set<string>();
  const normalized: string[] = [];
  for (const value of values ?? []) {
    const candidate = requireTrimmedString(label, value);
    if (!seen.has(candidate)) {
      seen.add(candidate);
      normalized.push(candidate);
    }
  }
  if (!options?.allowEmpty && normalized.length === 0) {
    throw new RunManifestModelError(
      "RUN_MANIFEST_FIELD_REQUIRED",
      `${label} must contain at least one value`,
    );
  }
  return normalized;
}

function canonicalSemanticQualifiers(values: string[]) {
  const present = new Set(values);
  return DECISION_EXPLAINABILITY_QUALIFIER_ORDER.filter((value) => present.has(value));
}

function deriveGateOverrideDependencyState(
  decision: RunManifestGateDecisionRecord["decision"],
  overrideResolutionState: RunManifestGateDecisionRecord["override_resolution_state"],
) {
  if (decision === "OVERRIDABLE_BLOCK") {
    return "OVERRIDE_REQUIRED_MISSING";
  }
  if (decision === "HARD_BLOCK") {
    return "OVERRIDE_FORBIDDEN";
  }
  if (overrideResolutionState === "VALID_OVERRIDE_ACTIVE") {
    return "VALID_OVERRIDE_GOVERNED";
  }
  return "OVERRIDE_INDEPENDENT";
}

export function cloneRunManifestRecord(record: RunManifestRecord) {
  return structuredClone(record);
}

export function buildRunManifestTruthBoundaryContract(): CommandTruthBoundaryContract {
  return structuredClone(COMMAND_SIDE_TRUTH_POLICIES);
}

export function buildRunManifestStateTransitionContract(input: {
  current_state: RunManifestLifecycleState;
  previous_state_or_null: RunManifestLifecycleState | null;
  transition_event_code: RunManifestTransitionEventCode;
  transition_applied_at: string;
  transition_audit_ref: string;
}): StateTransitionContract {
  return {
    contract_version: "STATE_TRANSITION_CONTRACT_V1",
    object_family: "RUN_MANIFEST",
    machine_code: RUN_MANIFEST_MACHINE_CODE,
    state_field_name: RUN_MANIFEST_STATE_FIELD,
    current_state: input.current_state,
    previous_state_or_null: input.previous_state_or_null,
    transition_event_code: input.transition_event_code,
    transition_applied_at: normalizeUtcInstantString(input.transition_applied_at),
    transition_audit_ref: requireTrimmedString(
      "transition_audit_ref",
      input.transition_audit_ref,
    ),
    transition_application_policy: "NAMED_EVENT_ONLY",
    illegal_transition_policy: "REJECT_WITH_TYPED_REASON_AND_NO_PARTIAL_WRITE",
    concurrency_guard_policy: "COMPARE_AND_SWAP_OR_SINGLE_WRITER_LEASE",
    terminal_reentry_policy: "TERMINAL_STATES_REQUIRE_NEW_LINEAGE",
    recovery_supersession_policy:
      "RECOVERY_AND_SUPERSESSION_ALLOCATE_SUCCESSOR_OR_SUPERSEDING_LINEAGE",
    audit_evidence_policy: "EVERY_TRANSITION_RETAINS_AUDIT_EVENT_REF",
    typed_rejection_family: "ILLEGAL_STATE_TRANSITION",
  };
}

export function buildRunManifestInvariantEnforcementContract(input?: {
  error_record_ref_or_null?: string | null;
  failure_stage_or_null?: "PRESTART" | "POSTSTART" | null;
  invariant_class_or_null?: InvariantEnforcementContract["invariant_class_or_null"];
  invariant_failure_state?: InvariantEnforcementContract["invariant_failure_state"];
}): InvariantEnforcementContract {
  const state = input?.invariant_failure_state ?? "NOT_TRIGGERED";
  const invariantClass = input?.invariant_class_or_null ?? null;
  const failureStage =
    state === "TRIGGERED" ? input?.failure_stage_or_null ?? "PRESTART" : null;
  const terminalManifestState =
    failureStage === "POSTSTART" ? "FAILED" : failureStage === "PRESTART" ? "BLOCKED" : null;
  const terminalAuditEvent =
    failureStage === "POSTSTART"
      ? "ManifestFailed"
      : failureStage === "PRESTART"
        ? "ManifestBlocked"
        : null;

  return {
    contract_version: "INVARIANT_ENFORCEMENT_V1",
    boundary_scope: "RUN_MANIFEST",
    boundary_specific_binding_policy:
      "MANIFEST_RETAINS_FAIL_CLOSED_STAGE_AND_PRIMARY_ERROR_LINK",
    invariant_failure_state: state,
    invariant_class_or_null: invariantClass,
    error_family_or_null:
      state === "TRIGGERED" && invariantClass !== null
        ? INVARIANT_ERROR_FAMILY_BY_CLASS[invariantClass]
        : null,
    error_code_or_null:
      state === "TRIGGERED" && invariantClass !== null
        ? INVARIANT_ERROR_CODE_BY_CLASS[invariantClass]
        : null,
    failure_stage_or_null: failureStage,
    terminal_manifest_state_or_null: terminalManifestState,
    transition_event_code_or_null: state === "TRIGGERED" ? "system_fault" : null,
    terminal_audit_event_type_or_null: terminalAuditEvent,
    error_record_ref_or_null:
      state === "TRIGGERED" ? input?.error_record_ref_or_null ?? "error-record.manifest" : null,
    typed_error_policy: "INVARIANTS_MUST_PERSIST_FAMILY_SPECIFIC_ERROR_RECORDS",
    partial_write_policy: "NO_PARTIAL_MUTATION_OR_SIDE_EFFECT_AFTER_INVARIANT_FAILURE",
    audit_evidence_policy: "INVARIANTS_REQUIRE_ERROR_AND_TERMINAL_AUDIT_EVIDENCE",
    lifecycle_mapping_policy: "PRESTART_INVARIANTS_BLOCK_POSTSTART_INVARIANTS_FAIL",
    assertion_conversion_policy:
      "ASSERTIONS_AND_GENERIC_EXCEPTIONS_MUST_COLLAPSE_TO_TYPED_FAIL_CLOSED_OUTCOMES",
    normalization_rejection_policy: "IMPOSSIBLE_STATES_REJECTED_NEVER_NORMALIZED",
  };
}

export function buildManifestBranchDecisionContract(input: {
  access_binding_hash: string;
  branch_action:
    | RunManifestContinuationBasis
    | "RETURN_EXISTING_BUNDLE"
    | "REUSE_SEALED_MANIFEST"
    | "NEW_MANIFEST";
  effective_scope?: CanonicalScopeToken[];
  idempotency_key: string;
  manifest_id: string;
  requested_scope: CanonicalScopeToken[];
  mode: RunManifestMode;
  run_kind: RunManifestRunKind;
  replay_class_or_null?: RunManifestReplayClass | null;
  nightly_window_key_or_null?: string | null;
  request_identity_hash?: string;
  root_manifest_id?: string | null;
  parent_manifest_id_or_null?: string | null;
  continuation_of_manifest_id_or_null?: string | null;
  replay_of_manifest_id_or_null?: string | null;
  supersedes_manifest_id_or_null?: string | null;
  selected_manifest_generation?: number;
  prior_manifest_id_or_null?: string | null;
  prior_manifest_hash_at_decision_or_null?: string | null;
  prior_manifest_lifecycle_state_or_null?: RunManifestLifecycleState | null;
  config_inheritance_mode_or_null?: RunManifestContinuationSet["config_inheritance_mode"];
  input_inheritance_mode_or_null?: RunManifestContinuationSet["input_inheritance_mode"];
  branch_reason_code?: ManifestBranchDecisionContract["branch_reason_code"];
  returned_decision_bundle_hash_or_null?: string | null;
}): ManifestBranchDecisionContract {
  const requested_scope = normalizeScopeSequence(
    "manifest_branch_decision.requested_scope",
    input.requested_scope,
  );
  const effective_scope = normalizeScopeSequence(
    "manifest_branch_decision.effective_scope",
    input.effective_scope ?? requested_scope,
  );
  const branch_action = input.branch_action;
  const childDefaults =
    branch_action === "NEW_MANIFEST"
      ? {
          root_manifest_id: input.manifest_id,
          parent_manifest_id_or_null: null,
          continuation_of_manifest_id_or_null: null,
          replay_of_manifest_id_or_null: null,
          supersedes_manifest_id_or_null: null,
          selected_manifest_generation: 0,
          prior_manifest_id_or_null: null,
          prior_manifest_hash_at_decision_or_null: null,
          prior_manifest_lifecycle_state_or_null: null,
          config_inheritance_mode_or_null: null,
          input_inheritance_mode_or_null: null,
          selected_manifest_continuation_basis: "NEW_MANIFEST",
          returned_decision_bundle_hash_or_null: null,
        }
      : branch_action === "REPLAY_CHILD"
        ? {
            root_manifest_id: "manifest.root",
            parent_manifest_id_or_null: "manifest.parent",
            continuation_of_manifest_id_or_null: null,
            replay_of_manifest_id_or_null: "manifest.parent",
            supersedes_manifest_id_or_null: null,
            selected_manifest_generation: 1,
            prior_manifest_id_or_null: "manifest.parent",
            prior_manifest_hash_at_decision_or_null: "hash.parent",
            prior_manifest_lifecycle_state_or_null: "COMPLETED" as const,
            config_inheritance_mode_or_null: "REPLAY_EXACT" as const,
            input_inheritance_mode_or_null: "REPLAY_EXACT" as const,
            selected_manifest_continuation_basis: "REPLAY_CHILD" as const,
            returned_decision_bundle_hash_or_null: null,
          }
        : branch_action === "RECOVERY_CHILD"
          ? {
              root_manifest_id: "manifest.root",
              parent_manifest_id_or_null: "manifest.parent",
              continuation_of_manifest_id_or_null: "manifest.parent",
              replay_of_manifest_id_or_null: null,
              supersedes_manifest_id_or_null: null,
              selected_manifest_generation: 1,
              prior_manifest_id_or_null: "manifest.parent",
              prior_manifest_hash_at_decision_or_null: "hash.parent",
              prior_manifest_lifecycle_state_or_null: "IN_PROGRESS" as const,
              config_inheritance_mode_or_null: "RECOVERY_EXACT" as const,
              input_inheritance_mode_or_null: "RECOVERY_EXACT" as const,
              selected_manifest_continuation_basis: "RECOVERY_CHILD" as const,
              returned_decision_bundle_hash_or_null: null,
            }
          : branch_action === "CONTINUATION_CHILD"
            ? {
                root_manifest_id: "manifest.root",
                parent_manifest_id_or_null: "manifest.parent",
                continuation_of_manifest_id_or_null: "manifest.parent",
                replay_of_manifest_id_or_null: null,
                supersedes_manifest_id_or_null: null,
                selected_manifest_generation: 1,
                prior_manifest_id_or_null: "manifest.parent",
                prior_manifest_hash_at_decision_or_null: "hash.parent",
                prior_manifest_lifecycle_state_or_null: "COMPLETED" as const,
                config_inheritance_mode_or_null: "FRESH_CHILD_RESOLUTION" as const,
                input_inheritance_mode_or_null: "FRESH_CHILD_COLLECTION" as const,
                selected_manifest_continuation_basis: "CONTINUATION_CHILD" as const,
                returned_decision_bundle_hash_or_null: null,
              }
            : branch_action === "NEW_REQUEST_CHILD"
              ? {
                  root_manifest_id: "manifest.root",
                  parent_manifest_id_or_null: "manifest.parent",
                  continuation_of_manifest_id_or_null: "manifest.parent",
                  replay_of_manifest_id_or_null: null,
                  supersedes_manifest_id_or_null: "manifest.parent",
                  selected_manifest_generation: 1,
                  prior_manifest_id_or_null: "manifest.parent",
                  prior_manifest_hash_at_decision_or_null: "hash.parent",
                  prior_manifest_lifecycle_state_or_null: "COMPLETED" as const,
                  config_inheritance_mode_or_null: "FRESH_CHILD_RESOLUTION" as const,
                  input_inheritance_mode_or_null: "FRESH_CHILD_COLLECTION" as const,
                  selected_manifest_continuation_basis: "NEW_REQUEST_CHILD" as const,
                  returned_decision_bundle_hash_or_null: null,
                }
              : {
                  root_manifest_id: input.manifest_id,
                  parent_manifest_id_or_null: null,
                  continuation_of_manifest_id_or_null: null,
                  replay_of_manifest_id_or_null: null,
                  supersedes_manifest_id_or_null: null,
                  selected_manifest_generation: 0,
                  prior_manifest_id_or_null: input.manifest_id,
                  prior_manifest_hash_at_decision_or_null: "hash.bundle",
                  prior_manifest_lifecycle_state_or_null:
                    branch_action === "REUSE_SEALED_MANIFEST" ? "SEALED" : "COMPLETED",
                  config_inheritance_mode_or_null: null,
                  input_inheritance_mode_or_null: null,
                  selected_manifest_continuation_basis: "NEW_MANIFEST" as const,
                  returned_decision_bundle_hash_or_null:
                    branch_action === "RETURN_EXISTING_BUNDLE" ? "bundle.hash" : null,
                };

  const branchReason =
    input.branch_reason_code ??
    (branch_action === "CONTINUATION_CHILD" && input.run_kind === "NIGHTLY"
      ? "NIGHTLY_WINDOW_ADVANCED"
      : MANIFEST_BRANCH_REASON_BY_ACTION[branch_action]);

  return {
    branch_action,
    branch_reason_code: branchReason,
    idempotency_key: requireTrimmedString(
      "manifest_branch_decision.idempotency_key",
      input.idempotency_key,
    ),
    request_identity_hash:
      input.request_identity_hash ??
      stableJsonHash({
        idempotency_key: input.idempotency_key,
        access_binding_hash: input.access_binding_hash,
        requested_scope,
        run_kind: input.run_kind,
      }),
    access_binding_hash: requireTrimmedString(
      "manifest_branch_decision.access_binding_hash",
      input.access_binding_hash,
    ),
    requested_scope,
    effective_scope,
    mode: input.mode,
    run_kind: input.run_kind,
    replay_class_or_null: input.run_kind === "REPLAY" ? input.replay_class_or_null ?? "STANDARD_REPLAY" : null,
    nightly_window_key_or_null: input.run_kind === "NIGHTLY" ? input.nightly_window_key_or_null ?? "nightly.window.default" : null,
    prior_manifest_id_or_null:
      input.prior_manifest_id_or_null ?? childDefaults.prior_manifest_id_or_null,
    prior_manifest_hash_at_decision_or_null:
      input.prior_manifest_hash_at_decision_or_null ??
      childDefaults.prior_manifest_hash_at_decision_or_null,
    prior_manifest_lifecycle_state_or_null:
      input.prior_manifest_lifecycle_state_or_null ??
      childDefaults.prior_manifest_lifecycle_state_or_null,
    selected_manifest_id: requireTrimmedString(
      "manifest_branch_decision.selected_manifest_id",
      input.manifest_id,
    ),
    selected_manifest_continuation_basis: childDefaults.selected_manifest_continuation_basis,
    root_manifest_id: input.root_manifest_id ?? childDefaults.root_manifest_id,
    parent_manifest_id_or_null:
      input.parent_manifest_id_or_null ?? childDefaults.parent_manifest_id_or_null,
    continuation_of_manifest_id_or_null:
      input.continuation_of_manifest_id_or_null ??
      childDefaults.continuation_of_manifest_id_or_null,
    replay_of_manifest_id_or_null:
      input.replay_of_manifest_id_or_null ?? childDefaults.replay_of_manifest_id_or_null,
    supersedes_manifest_id_or_null:
      input.supersedes_manifest_id_or_null ?? childDefaults.supersedes_manifest_id_or_null,
    selected_manifest_generation:
      input.selected_manifest_generation ?? childDefaults.selected_manifest_generation,
    config_inheritance_mode_or_null:
      input.config_inheritance_mode_or_null ?? childDefaults.config_inheritance_mode_or_null,
    input_inheritance_mode_or_null:
      input.input_inheritance_mode_or_null ?? childDefaults.input_inheritance_mode_or_null,
    returned_decision_bundle_hash_or_null:
      input.returned_decision_bundle_hash_or_null ??
      childDefaults.returned_decision_bundle_hash_or_null,
  };
}

export function buildRunManifestContinuationSet(
  decision: ManifestBranchDecisionContract,
): RunManifestContinuationSet {
  return {
    root_manifest_id: decision.root_manifest_id,
    parent_manifest_id: decision.parent_manifest_id_or_null,
    continuation_of_manifest_id: decision.continuation_of_manifest_id_or_null,
    replay_of_manifest_id: decision.replay_of_manifest_id_or_null,
    supersedes_manifest_id: decision.supersedes_manifest_id_or_null,
    manifest_generation: decision.selected_manifest_generation,
    parent_manifest_hash_at_branch: decision.prior_manifest_hash_at_decision_or_null,
    inherited_config_freeze_ref: null,
    fresh_resolution_reason_code: null,
    inherited_input_freeze_ref: null,
    fresh_collection_reason_code: null,
    config_inheritance_mode: decision.config_inheritance_mode_or_null,
    input_inheritance_mode: decision.input_inheritance_mode_or_null,
  };
}

export function buildRunManifestGateDecisionRecord(input: {
  manifest_id: string;
  gate_code: RunManifestGateDecisionRecord["gate_code"];
  gate_stage_index: number;
  effective_scope: CanonicalScopeToken[];
  decision?: RunManifestGateDecisionRecord["decision"];
  reason_codes?: string[];
  policy_version_ref?: string;
  decided_at?: string;
  input_artifact_refs?: string[];
  prerequisite_gate_refs?: string[];
}): RunManifestGateDecisionRecord {
  const decision = input.decision ?? "PASS";
  const reason_codes = normalizeOrderedUniqueStrings(
    "gate_decision.reason_codes",
    input.reason_codes ?? ["GATE_PASS"],
  );
  const next_action_codes =
    decision === "MANUAL_REVIEW"
      ? ["REVIEW_GATE_DECISION"]
      : decision === "OVERRIDABLE_BLOCK"
        ? ["RESOLVE_SCOPED_OVERRIDE"]
        : decision === "HARD_BLOCK"
          ? ["RESOLVE_HARD_BLOCK"]
          : [];
  const override_resolution_state =
    decision === "OVERRIDABLE_BLOCK" ? "NO_VALID_OVERRIDE" : "NOT_APPLICABLE";
  const qualifiers = canonicalSemanticQualifiers([
    ...(decision !== "PASS" ? ["LIMITATION_STATE"] : []),
    ...(next_action_codes.length > 0 ? ["ACTIONABILITY_STATE"] : []),
    ...(override_resolution_state !== "NOT_APPLICABLE" ? ["OVERRIDE_STATE"] : []),
  ]);
  const plainExplanation = `${input.gate_code} ${decision.toLowerCase().replaceAll("_", " ")}`;

  return {
    artifact_type: "GateDecisionRecord",
    gate_decision_id: `gate.${input.manifest_id}.${input.gate_code.toLowerCase()}`,
    manifest_id: requireTrimmedString("gate_decision.manifest_id", input.manifest_id),
    gate_code: input.gate_code,
    gate_stage_index: input.gate_stage_index,
    gate_class: "NON_ACCESS",
    decision,
    reason_codes,
    dominant_reason_code: reason_codes[0],
    plain_explanation: plainExplanation,
    decision_explainability_contract: {
      contract_version: "DECISION_EXPLAINABILITY_V1",
      artifact_family: "GATE_DECISION_RECORD",
      grammar_profile_code: "LOW_NOISE_DECISION_GRAMMAR_V1",
      reason_order_policy: "DOMINANT_REASON_FIRST_CANONICAL_PRIORITY",
      dominant_reason_selection_policy: "FIRST_ORDERED_REASON_IS_DOMINANT",
      summary_source_policy: "READ_SURFACES_MUST_USE_PERSISTED_FIELDS",
      compression_policy: "PREFIX_COMPRESS_ORDERED_REASON_CODES_WITH_SUPPRESSED_COUNT",
      compression_reason_cap: 3,
      ordered_reason_codes: reason_codes,
      dominant_reason_code: reason_codes[0],
      compressed_reason_codes: reason_codes.slice(0, 3),
      suppressed_reason_count: Math.max(reason_codes.length - 3, 0),
      semantic_qualifiers: qualifiers,
      action_projection_state:
        next_action_codes.length > 0 ? "NEXT_ACTIONS_INCLUDED" : "NONE",
      plain_text_field_name: "plain_explanation",
      plain_text_character_limit: 200,
    },
    severity: GATE_SEVERITY_BY_DECISION[decision],
    gate_semantics_contract: {
      contract_version: "GATE_SEMANTICS_CONTRACT_V1",
      evaluation_order_profile_code: "NON_ACCESS_GATE_ORDER_V1",
      reason_order_profile_code: "NON_ACCESS_GATE_REASON_PRIORITY_V1",
      severity_profile_code: "NON_ACCESS_GATE_SEVERITY_V1",
      decision_rank: GATE_DECISION_RANK_BY_DECISION[decision],
      progression_rank: GATE_PROGRESSION_RANK_BY_DECISION[decision],
      blocking_class: GATE_BLOCKING_CLASS_BY_DECISION[decision],
      progression_semantics: GATE_PROGRESSION_SEMANTICS_BY_DECISION[decision],
      override_dependency_state: deriveGateOverrideDependencyState(
        decision,
        override_resolution_state,
      ),
    },
    truth_boundary_contract: structuredClone(GATE_TRUTH_POLICIES),
    metrics: {},
    decision_basis_ref: `decision-basis://${input.manifest_id}/${input.gate_code}`,
    input_artifact_refs: normalizeStringSet(
      "gate_decision.input_artifact_refs",
      input.input_artifact_refs ?? [`input://${input.manifest_id}/${input.gate_code}`],
      { minItems: 1 },
    ),
    prerequisite_gate_refs: normalizeStringSet(
      "gate_decision.prerequisite_gate_refs",
      input.prerequisite_gate_refs ?? [],
    ),
    blocking_dependency_refs: [],
    overrideability:
      decision === "OVERRIDABLE_BLOCK"
        ? "SCOPED_OVERRIDE_REQUIRED"
        : decision === "HARD_BLOCK"
          ? "NON_OVERRIDEABLE"
          : "NONE",
    override_resolution_state,
    active_override_refs: [],
    required_override_scope:
      decision === "OVERRIDABLE_BLOCK" ? "override.scope.default" : null,
    next_action_codes,
    policy_version_ref:
      input.policy_version_ref ?? `policy://${input.gate_code.toLowerCase()}/v1`,
    decided_at: normalizeUtcInstantString(
      input.decided_at ?? "2026-04-23T09:00:00Z",
    ),
    effective_scope: normalizeScopeSequence(
      "gate_decision.effective_scope",
      input.effective_scope,
    ),
  };
}

export function buildRunManifestPresealGateEvaluation(input: {
  access_binding_hash: string;
  authorized_scope: CanonicalScopeToken[];
  completion_state?:
    | "PENDING_PREREQUISITES"
    | "COMPLETE_READY_TO_SEAL"
    | "COMPLETE_BLOCKED_PRESTART";
  execution_basis_hash: string;
  manifest_id: string;
  ordered_gate_decision_ids?: string[];
  blocking_gate_codes?: Array<(typeof PRESEAL_REQUIRED_GATE_CODES)[number]>;
  missing_prerequisite_refs?: string[];
}): PresealGateEvaluationContract {
  const completion_state = input.completion_state ?? "PENDING_PREREQUISITES";
  const evaluated_gate_codes =
    completion_state === "PENDING_PREREQUISITES" ? [] : [...PRESEAL_REQUIRED_GATE_CODES];
  return {
    contract_class: "MANIFEST_PRESEAL_GATE_EVALUATION",
    manifest_id: requireTrimmedString(
      "preseal_gate_evaluation.manifest_id",
      input.manifest_id,
    ),
    execution_basis_hash: requireTrimmedString(
      "preseal_gate_evaluation.execution_basis_hash",
      input.execution_basis_hash,
    ),
    access_binding_hash: requireTrimmedString(
      "preseal_gate_evaluation.access_binding_hash",
      input.access_binding_hash,
    ),
    authorized_scope: normalizeScopeSequence(
      "preseal_gate_evaluation.authorized_scope",
      input.authorized_scope,
    ),
    required_gate_codes: [...PRESEAL_REQUIRED_GATE_CODES],
    evaluated_gate_codes,
    ordered_gate_decision_ids:
      completion_state === "PENDING_PREREQUISITES"
        ? []
        : normalizeOrderedUniqueStrings(
            "preseal_gate_evaluation.ordered_gate_decision_ids",
            input.ordered_gate_decision_ids ??
              PRESEAL_REQUIRED_GATE_CODES.map(
                (gateCode) => `gate.${input.manifest_id}.${gateCode.toLowerCase()}`,
              ),
          ),
    blocking_gate_codes:
      completion_state === "COMPLETE_BLOCKED_PRESTART"
        ? (input.blocking_gate_codes?.length
            ? [...input.blocking_gate_codes]
            : ["MANIFEST_GATE"])
        : [],
    completion_state,
    prerequisite_materialization_state:
      completion_state === "PENDING_PREREQUISITES"
        ? "AWAITING_PREREQUISITE_MATERIALIZATION"
        : "FULLY_MATERIALIZED",
    missing_prerequisite_refs:
      completion_state === "PENDING_PREREQUISITES"
        ? normalizeStringSet(
            "preseal_gate_evaluation.missing_prerequisite_refs",
            input.missing_prerequisite_refs ?? ["prerequisite://manifest-gates"],
            { minItems: 1 },
          )
        : [],
    durability_boundary:
      completion_state === "PENDING_PREREQUISITES"
        ? "NO_PERSISTED_TAPE_YET"
        : completion_state === "COMPLETE_BLOCKED_PRESTART"
          ? "PERSIST_PRESTART_TERMINAL_CONTEXT"
          : "ATOMIC_GATE_BATCH_AND_SEAL",
    reuse_policy: "REUSE_PERSISTED_PRESEAL_TAPE_ONLY",
    post_seal_interpretation_policy: "APPEND_ONLY_POSTSEAL_CANNOT_REINTERPRET_PRESEAL",
  };
}

export function buildRunManifestStartClaimContract(input: {
  access_binding_hash: string;
  claim_state:
    | "UNCLAIMED_SEALED"
    | "ACTIVE_LEASED"
    | "STALE_RECLAIM_REQUIRED"
    | "TERMINAL_RESULT_RECORDED";
  execution_basis_hash: string;
  manifest_hash: string;
  manifest_id: string;
  attempt_lineage_ref?: string;
  claim_acquired_at_or_null?: string | null;
  claim_expires_at_or_null?: string | null;
  claim_released_at_or_null?: string | null;
  claim_release_reason_code_or_null?:
    | "COMPLETED"
    | "FAILED"
    | "BLOCKED"
    | "SUPERSEDED"
    | "REPLAY_ONLY"
    | "RETIRED"
    | null;
  stale_reclaim_reason_code_or_null?:
    | "LEASE_EXPIRED_OWNER_UNHEALTHY"
    | "SUCCESSOR_RECOVERY_AFTER_CRASH"
    | "SUCCESSOR_RECOVERY_AFTER_BROKER_LOSS"
    | "NIGHTLY_RECLAIM_SUCCESSOR_VERIFIED"
    | null;
}): ManifestStartClaimContract {
  const claim_state = input.claim_state;
  const activeOrLater =
    claim_state === "ACTIVE_LEASED" ||
    claim_state === "STALE_RECLAIM_REQUIRED" ||
    claim_state === "TERMINAL_RESULT_RECORDED";

  return {
    contract_class: "MANIFEST_START_CLAIM",
    manifest_id: requireTrimmedString("manifest_start_claim.manifest_id", input.manifest_id),
    manifest_hash: requireTrimmedString(
      "manifest_start_claim.manifest_hash",
      input.manifest_hash,
    ),
    execution_basis_hash: requireTrimmedString(
      "manifest_start_claim.execution_basis_hash",
      input.execution_basis_hash,
    ),
    access_binding_hash: requireTrimmedString(
      "manifest_start_claim.access_binding_hash",
      input.access_binding_hash,
    ),
    attempt_lineage_ref:
      input.attempt_lineage_ref ?? `attempt-lineage://${input.manifest_id}`,
    claim_state,
    claim_status_code:
      claim_state === "UNCLAIMED_SEALED"
        ? "CLAIMABLE"
        : claim_state === "ACTIVE_LEASED"
          ? "ALREADY_ACTIVE"
          : claim_state === "STALE_RECLAIM_REQUIRED"
            ? "STALE_RECLAIM_REQUIRED"
            : "ALREADY_TERMINAL",
    claim_epoch: claim_state === "UNCLAIMED_SEALED" ? 0 : 1,
    claim_holder_ref_or_null: activeOrLater ? "worker.run-manifest.1" : null,
    claim_token_or_null: activeOrLater ? "claim-token.run-manifest.1" : null,
    claim_acquired_at_or_null:
      claim_state === "UNCLAIMED_SEALED"
        ? null
        : normalizeUtcInstantString(
            input.claim_acquired_at_or_null ?? "2026-04-23T09:15:00Z",
          ),
    claim_expires_at_or_null:
      claim_state === "UNCLAIMED_SEALED"
        ? null
        : normalizeUtcInstantString(
            input.claim_expires_at_or_null ?? "2026-04-23T09:45:00Z",
          ),
    claim_released_at_or_null:
      claim_state === "TERMINAL_RESULT_RECORDED"
        ? normalizeUtcInstantString(
            input.claim_released_at_or_null ?? "2026-04-23T10:00:00Z",
          )
        : null,
    claim_release_reason_code_or_null:
      claim_state === "TERMINAL_RESULT_RECORDED"
        ? input.claim_release_reason_code_or_null ?? "COMPLETED"
        : null,
    stale_reclaim_reason_code_or_null:
      claim_state === "STALE_RECLAIM_REQUIRED"
        ? input.stale_reclaim_reason_code_or_null ?? "LEASE_EXPIRED_OWNER_UNHEALTHY"
        : null,
    publication_state:
      claim_state === "UNCLAIMED_SEALED"
        ? "NOT_PUBLISHED"
        : claim_state === "ACTIVE_LEASED"
          ? "PUBLISHED_WITH_ACTIVE_LEASE"
          : claim_state === "STALE_RECLAIM_REQUIRED"
            ? "PUBLISHED_STALE_RECLAIM_REQUIRED"
            : "PUBLISHED_TERMINAL",
    stage_dag_ref_or_null: activeOrLater ? "stage-dag://run-manifest/default" : null,
    outbox_batch_ref_or_null: activeOrLater ? "outbox-batch://run-manifest/default" : null,
    first_publication_committed_at_or_null:
      activeOrLater
        ? normalizeUtcInstantString(
            input.claim_acquired_at_or_null ?? "2026-04-23T09:15:00Z",
          )
        : null,
    concurrency_policy: "SINGLE_WRITER_LEASED_START_ONLY",
    claim_publication_atomicity: "CLAIM_AND_FIRST_PUBLICATION_COMMIT_TOGETHER",
    stale_reclaim_policy: "EXPLICIT_SUCCESSOR_PROOF_REQUIRED",
    recovery_child_policy: "FORBID_WHILE_ACTIVE_LEASE",
    nightly_reclaim_policy: "DEFER_DUPLICATE_START_WHILE_ACTIVE_LEASE",
  };
}

export function deriveRunManifestPostSealBasisHash(
  postSealBasis: RunManifestAppendOnlyOutcomeProjectionRecord["post_seal_basis"],
) {
  const { post_seal_basis_hash: _ignored, ...basisWithoutHash } = postSealBasis;
  return stableJsonHash(basisWithoutHash);
}

export function deriveRunManifestAppendOnlyOutcomeProjectionHash(
  projection: RunManifestAppendOnlyOutcomeProjectionRecord,
) {
  const { projection_hash: _ignored, ...projectionWithoutHash } = projection;
  return stableJsonHash(projectionWithoutHash);
}

export function buildEmptyRunManifestAppendOnlyOutcomeProjection(): RunManifestAppendOnlyOutcomeProjectionRecord {
  const post_seal_basis = {
    basis_state: "NULL_SENTINEL",
    post_seal_basis_hash: "",
    authority_context_ref: null,
    authority_context_hash: null,
    late_data_monitor_result_ref: null,
    late_data_monitor_result_hash: null,
    baseline_envelope_refs: [],
    baseline_envelope_hashes: [],
    temporal_propagation_event_refs: [],
    temporal_propagation_event_hashes: [],
    authority_calculation_result_refs: [],
    authority_calculation_result_hashes: [],
    drift_record_refs: [],
    drift_record_hashes: [],
  } satisfies RunManifestAppendOnlyOutcomeProjectionRecord["post_seal_basis"];
  post_seal_basis.post_seal_basis_hash = deriveRunManifestPostSealBasisHash(post_seal_basis);
  const projection: RunManifestAppendOnlyOutcomeProjectionRecord = {
    projection_generation: 0,
    projection_hash: "",
    post_seal_basis,
    gating_decisions: [],
    output_refs: {},
    audit_refs: [],
    submission_refs: [],
    drift_refs: [],
    decision_bundle_hash: null,
    deterministic_outcome_hash: null,
    replay_attestation_ref: null,
  };
  projection.projection_hash = deriveRunManifestAppendOnlyOutcomeProjectionHash(projection);
  return projection;
}

export function normalizeRunManifestRecord(input: RunManifestRecord): RunManifestRecord {
  const requested_scope = normalizeScopeSequence("requested_scope", input.requested_scope);
  const business_partitions = normalizeStringSet(
    "business_partitions",
    input.business_partitions ?? [],
  );
  const income_source_partitions = normalizeStringSet(
    "income_source_partitions",
    input.income_source_partitions ?? [],
  );
  const manifest_lineage_trace_refs = normalizeStringSet(
    "manifest_lineage_trace_refs",
    input.manifest_lineage_trace_refs,
    { minItems: 1 },
  );
  const authority_link_refs = normalizeStringSet(
    "authority_link_refs",
    input.authority_link_refs ?? [],
  );
  const approval_refs = normalizeStringSet("approval_refs", input.approval_refs ?? []);
  const override_refs = normalizeStringSet("override_refs", input.override_refs ?? []);
  const audit_refs = normalizeStringSet("audit_refs", input.audit_refs ?? []);
  const submission_refs = normalizeStringSet(
    "submission_refs",
    input.submission_refs ?? [],
  );
  const drift_refs = normalizeStringSet("drift_refs", input.drift_refs ?? []);
  const non_deterministic_module_allowlist = normalizeStringSet(
    "non_deterministic_module_allowlist",
    input.non_deterministic_module_allowlist ?? [],
  );

  assertCondition(
    input.run_kind === "REPLAY" ? input.replay_class !== null : input.replay_class == null,
    "RUN_MANIFEST_INVALID_POSTURE",
    "replay_class must be present only for replay runs",
  );
  assertCondition(
    input.run_kind === "NIGHTLY"
      ? typeof input.nightly_window_key === "string" && input.nightly_window_key.length > 0
      : input.nightly_window_key == null,
    "RUN_MANIFEST_INVALID_POSTURE",
    "nightly_window_key must be present only for nightly runs",
  );
  if (requested_scope.some((token) => LIVE_MANIFEST_SCOPE_TOKENS.has(token))) {
    assertCondition(
      (input.provider_environment_refs ?? []).length > 0,
      "RUN_MANIFEST_INVALID_POSTURE",
      "live and amendment-capable manifests must retain provider_environment_refs",
    );
  }
  assertCondition(
    input.scope_execution_binding.binding_scope_class === "RUN_MANIFEST",
    "RUN_MANIFEST_INVALID_SCOPE",
    "scope_execution_binding.binding_scope_class must stay RUN_MANIFEST",
  );
  assertCondition(
    input.scope_execution_binding.execution_mode_or_null === input.mode,
    "RUN_MANIFEST_INVALID_SCOPE",
    "scope_execution_binding.execution_mode_or_null must mirror manifest mode",
  );
  assertCondition(
    JSON.stringify(input.scope_execution_binding.requested_scope) ===
      JSON.stringify(requested_scope),
    "RUN_MANIFEST_INVALID_SCOPE",
    "scope_execution_binding.requested_scope must mirror requested_scope",
  );
  const requestedScopeFamily = deriveScopeFamily(requested_scope);
  assertCondition(
    requestedScopeFamily !== null,
    "RUN_MANIFEST_INVALID_SCOPE",
    "requested_scope must resolve to one governed scope family",
  );
  assertCondition(
    input.scope_execution_binding.requested_scope_family === requestedScopeFamily,
    "RUN_MANIFEST_INVALID_SCOPE",
    "scope_execution_binding.requested_scope_family must match requested_scope",
  );
  assertCondition(
    input.scope_execution_binding.mutation_atomicity ===
      expectedScopeMutationAtomicity(requested_scope),
    "RUN_MANIFEST_INVALID_SCOPE",
    "scope_execution_binding.mutation_atomicity must stay derived from requested_scope",
  );

  return {
    ...structuredClone(input),
    business_partitions,
    income_source_partitions,
    requested_scope,
    authority_link_refs,
    approval_refs,
    override_refs,
    manifest_lineage_trace_refs,
    non_deterministic_module_allowlist,
    audit_refs,
    submission_refs,
    drift_refs,
    created_at: normalizeUtcInstantString(input.created_at),
    frozen_at: input.frozen_at === null ? null : normalizeUtcInstantString(input.frozen_at),
    opened_at: input.opened_at === null ? null : normalizeUtcInstantString(input.opened_at),
    sealed_at: input.sealed_at === null ? null : normalizeUtcInstantString(input.sealed_at),
    completed_at:
      input.completed_at === null ? null : normalizeUtcInstantString(input.completed_at),
    superseded_at:
      input.superseded_at === null ? null : normalizeUtcInstantString(input.superseded_at),
    retired_at: input.retired_at === null ? null : normalizeUtcInstantString(input.retired_at),
  };
}
