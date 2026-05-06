import type {
  DeploymentRelease,
  RecoveryGovernanceContract,
  SchemaBundleCompatibilityGateContract,
  SchemaReaderWindowContract,
  StateTransitionContract,
} from "../../../generated-models/src/generated/typescript/manifest-and-release.ts";
import { stableJsonHash } from "../../../domain-kernel/src/primitives/hash.ts";
import { normalizeUtcInstantString } from "../../../domain-kernel/src/primitives/time.ts";
import {
  assertReleaseCandidateIdentityContract,
  cloneReleaseCandidateIdentityContract,
  type ReleaseCandidateIdentityContractRecord,
  type ReleaseCandidateIdentityExpectedMirrors,
} from "./release_candidate_identity_contract.ts";
import {
  buildDeploymentReleaseRecoveryGovernanceContract,
  normalizeDeploymentReleaseRecoveryGovernanceContract,
} from "./recovery_governance_contract.ts";

export type DeploymentReleaseRecord = Omit<
  DeploymentRelease,
  "deployed_at" | "emergency_override_expires_at"
> & {
  deployed_at: string | null;
  emergency_override_expires_at: string | null;
};
export type DeploymentRolloutStrategy = DeploymentReleaseRecord["rollout_strategy"];
export type DeploymentRolloutState = DeploymentReleaseRecord["rollout_state"];
export type DeploymentRollbackBoundaryState =
  DeploymentReleaseRecord["rollback_boundary_state"];
export type DeploymentHealthGateState = DeploymentReleaseRecord["health_gate_state"];
export type DeploymentReleaseStateTransitionContract = StateTransitionContract & {
  object_family: "DEPLOYMENT_RELEASE";
  machine_code: "DEPLOYMENT_RELEASE_ROLLOUT_V1";
  state_field_name: "rollout_state";
  current_state: DeploymentRolloutState;
  previous_state_or_null: DeploymentRolloutState | null;
};
export type DeploymentReleaseTransitionEventCode =
  | "release_planned"
  | "canary_start"
  | "emergency_promote_with_override"
  | "promote"
  | "abort"
  | "rollback"
  | "rollback_unsafe_fail_forward_required"
  | "emergency_pin"
  | "supersede";
export type SchemaBundleCompatibilityGateContractRecord =
  SchemaBundleCompatibilityGateContract;
export type SchemaReaderWindowContractRecord = SchemaReaderWindowContract;
export type DeploymentRecoveryGovernanceContract = RecoveryGovernanceContract & {
  boundary_scope: "DEPLOYMENT_RELEASE";
  protected_workload_class: "CONTROL_PLANE_LEGAL_TRUTH";
  recovery_tier_class: "TIER_0_CONTROL_PLANE";
  rpo_class: "RPO_15M";
  rto_class: "RTO_60M";
  boundary_specific_binding_policy: "RELEASE_RETAINS_ROLLBACK_BOUNDARY_AND_FAIL_FORWARD_GOVERNANCE";
};

export type DeploymentReleaseDraft = {
  release_id: unknown;
  environment_ref: unknown;
  build_id: unknown;
  candidate_identity_hash: unknown;
  candidate_identity_contract: unknown;
  recovery_governance_contract: unknown;
  schema_bundle_hash: unknown;
  schema_reader_window_contract: unknown;
  schema_bundle_compatibility_gate_contract: unknown;
  config_bundle_hash: unknown;
  rollout_strategy: unknown;
  rollout_state: unknown;
  state_transition_contract: unknown;
  rollback_boundary_state: unknown;
  canary_fraction: unknown;
  health_gate_state: unknown;
  release_verification_manifest_ref: unknown;
  supported_client_window_ref: unknown;
  deployed_at: unknown;
  rollback_of_release_id: unknown;
  compensating_release_id_or_null: unknown;
  rollback_runbook_ref: unknown;
  fail_forward_runbook_ref: unknown;
  fail_forward_owner_ref_or_null: unknown;
  emergency_override_ref: unknown;
  emergency_override_expires_at: unknown;
};

export type BuildDeploymentReleaseRecordInput = {
  release_id: unknown;
  candidate_identity_contract: ReleaseCandidateIdentityContractRecord;
  recovery_governance_contract?: unknown;
  schema_reader_window_contract: SchemaReaderWindowContractRecord;
  schema_bundle_compatibility_gate_contract?: unknown;
  rollout_strategy: DeploymentRolloutStrategy;
  rollout_state: DeploymentRolloutState;
  previous_state_or_null?: DeploymentRolloutState | null;
  transition_event_code?: DeploymentReleaseTransitionEventCode;
  transition_applied_at: unknown;
  transition_audit_ref: unknown;
  rollback_boundary_state?: DeploymentRollbackBoundaryState;
  canary_fraction?: unknown;
  health_gate_state: DeploymentHealthGateState;
  release_verification_manifest_ref: unknown;
  deployed_at?: unknown;
  rollback_of_release_id?: unknown;
  compensating_release_id_or_null?: unknown;
  rollback_runbook_ref: unknown;
  fail_forward_runbook_ref: unknown;
  fail_forward_owner_ref_or_null?: unknown;
  emergency_override_ref?: unknown;
  emergency_override_expires_at?: unknown;
};

export type DeploymentReleaseModelErrorCode =
  | "DEPLOYMENT_RELEASE_FIELD_INVALID"
  | "DEPLOYMENT_RELEASE_POLICY_INVALID"
  | "DEPLOYMENT_RELEASE_STATE_CONTRACT_INVALID"
  | "DEPLOYMENT_RELEASE_ILLEGAL_TRANSITION"
  | "DEPLOYMENT_RELEASE_CANDIDATE_MISMATCH"
  | "DEPLOYMENT_RELEASE_COMPATIBILITY_GATE_MISMATCH"
  | "DEPLOYMENT_RELEASE_ROLLBACK_BOUNDARY_CLOSED"
  | "DEPLOYMENT_RELEASE_SELF_ROLLBACK"
  | "DEPLOYMENT_RELEASE_FAIL_FORWARD_GOVERNANCE_MISSING"
  | "DEPLOYMENT_RELEASE_EMERGENCY_OVERRIDE_INVALID";

export class DeploymentReleaseModelError extends Error {
  readonly code: DeploymentReleaseModelErrorCode;

  constructor(code: DeploymentReleaseModelErrorCode, detail: string) {
    super(`${code}: ${detail}`);
    this.name = "DeploymentReleaseModelError";
    this.code = code;
  }
}

export const DEPLOYMENT_ROLLOUT_STATES = [
  "PLANNED",
  "CANARY",
  "PROMOTED",
  "FAILED_FORWARD",
  "PINNED",
  "ABORTED",
  "ROLLED_BACK",
  "SUPERSEDED",
] as const satisfies readonly DeploymentRolloutState[];

export const DEPLOYMENT_ROLLOUT_STRATEGIES = [
  "STANDARD_CANARY",
  "EMERGENCY_PROMOTE",
  "PIN_BASELINE",
  "FAIL_FORWARD_COMPENSATING",
] as const satisfies readonly DeploymentRolloutStrategy[];

export const DEPLOYMENT_TERMINAL_SERVED_STATES_REQUIRING_DEPLOYMENT = [
  "CANARY",
  "PROMOTED",
  "FAILED_FORWARD",
  "PINNED",
  "ABORTED",
  "ROLLED_BACK",
] as const satisfies readonly DeploymentRolloutState[];

export const DEPLOYMENT_RELEASE_ALLOWED_TRANSITIONS = [
  ["PLANNED", "canary_start", "CANARY"],
  ["PLANNED", "emergency_promote_with_override", "PROMOTED"],
  ["CANARY", "promote", "PROMOTED"],
  ["CANARY", "abort", "ABORTED"],
  ["PROMOTED", "rollback", "ROLLED_BACK"],
  ["PROMOTED", "rollback_unsafe_fail_forward_required", "FAILED_FORWARD"],
  ["PROMOTED", "emergency_pin", "PINNED"],
  ["FAILED_FORWARD", "emergency_pin", "PINNED"],
  ["PROMOTED", "supersede", "SUPERSEDED"],
  ["FAILED_FORWARD", "supersede", "SUPERSEDED"],
  ["PINNED", "supersede", "SUPERSEDED"],
  ["ABORTED", "supersede", "SUPERSEDED"],
  ["ROLLED_BACK", "supersede", "SUPERSEDED"],
] as const satisfies readonly [
  DeploymentRolloutState,
  DeploymentReleaseTransitionEventCode,
  DeploymentRolloutState,
][];

const rolloutStateSet = new Set<DeploymentRolloutState>(DEPLOYMENT_ROLLOUT_STATES);
const rolloutStrategySet = new Set<DeploymentRolloutStrategy>(
  DEPLOYMENT_ROLLOUT_STRATEGIES,
);
const terminalServedStateSet = new Set<DeploymentRolloutState>(
  DEPLOYMENT_TERMINAL_SERVED_STATES_REQUIRING_DEPLOYMENT,
);
const openReaderWindowStates = new Set<SchemaReaderWindowContractRecord["window_state"]>([
  "EXPAND_ONLY_PREVIOUS_READERS_SUPPORTED",
  "BACKFILL_IN_PROGRESS_PREVIOUS_READERS_SUPPORTED",
  "VERIFIED_PREVIOUS_READERS_SUPPORTED",
]);

function assertDeploymentRelease(
  condition: unknown,
  code: DeploymentReleaseModelErrorCode,
  detail: string,
): asserts condition {
  if (!condition) {
    throw new DeploymentReleaseModelError(code, detail);
  }
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value) &&
    (Object.getPrototypeOf(value) === Object.prototype || Object.getPrototypeOf(value) === null)
  );
}

function requireTrimmedString(label: string, value: unknown) {
  assertDeploymentRelease(
    typeof value === "string" && value.trim() === value && value.length > 0,
    "DEPLOYMENT_RELEASE_FIELD_INVALID",
    `${label} must be a non-empty trimmed string`,
  );
  return value;
}

function requireNullableTrimmedString(label: string, value: unknown) {
  if (typeof value === "undefined" || value === null) {
    return null;
  }
  return requireTrimmedString(label, value);
}

function requireNullableInstant(label: string, value: unknown) {
  if (typeof value === "undefined" || value === null) {
    return null;
  }
  try {
    return normalizeUtcInstantString(value);
  } catch (error) {
    throw new DeploymentReleaseModelError(
      "DEPLOYMENT_RELEASE_FIELD_INVALID",
      `${label} must be a valid UTC-normalizable instant: ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
  }
}

function requireRolloutState(value: unknown): DeploymentRolloutState {
  assertDeploymentRelease(
    typeof value === "string" && rolloutStateSet.has(value as DeploymentRolloutState),
    "DEPLOYMENT_RELEASE_FIELD_INVALID",
    "rollout_state must be one of the governed deployment release states",
  );
  return value as DeploymentRolloutState;
}

function requireRolloutStrategy(value: unknown): DeploymentRolloutStrategy {
  assertDeploymentRelease(
    typeof value === "string" && rolloutStrategySet.has(value as DeploymentRolloutStrategy),
    "DEPLOYMENT_RELEASE_FIELD_INVALID",
    "rollout_strategy must be one of the governed deployment release strategies",
  );
  return value as DeploymentRolloutStrategy;
}

function requireRollbackBoundary(value: unknown): DeploymentRollbackBoundaryState {
  assertDeploymentRelease(
    value === "ROLLBACK_ALLOWED" || value === "FAIL_FORWARD_ONLY",
    "DEPLOYMENT_RELEASE_FIELD_INVALID",
    "rollback_boundary_state must be ROLLBACK_ALLOWED or FAIL_FORWARD_ONLY",
  );
  return value;
}

function requireHealthGateState(value: unknown): DeploymentHealthGateState {
  assertDeploymentRelease(
    value === "GREEN" || value === "AMBER" || value === "RED",
    "DEPLOYMENT_RELEASE_FIELD_INVALID",
    "health_gate_state must be GREEN, AMBER, or RED",
  );
  return value;
}

function requireCanaryFraction(value: unknown) {
  assertDeploymentRelease(
    typeof value === "number" && Number.isFinite(value) && value > 0 && value < 1,
    "DEPLOYMENT_RELEASE_FIELD_INVALID",
    "canary_fraction must be a finite number greater than 0 and less than 1",
  );
  return value;
}

function requireNullableCanaryFraction(value: unknown) {
  if (typeof value === "undefined" || value === null) {
    return null;
  }
  return requireCanaryFraction(value);
}

function requireStringArray(label: string, values: unknown, allowEmpty = true) {
  assertDeploymentRelease(
    Array.isArray(values),
    "DEPLOYMENT_RELEASE_FIELD_INVALID",
    `${label} must be an array`,
  );
  const normalized = values.map((value, index) =>
    requireTrimmedString(`${label}[${index}]`, value),
  );
  assertDeploymentRelease(
    allowEmpty || normalized.length > 0,
    "DEPLOYMENT_RELEASE_FIELD_INVALID",
    `${label} must contain at least one entry`,
  );
  const unique = new Set(normalized);
  assertDeploymentRelease(
    unique.size === normalized.length,
    "DEPLOYMENT_RELEASE_POLICY_INVALID",
    `${label} must not contain duplicate refs`,
  );
  return [...unique].sort();
}

function arraysEqual(left: readonly string[], right: readonly string[]) {
  return left.length === right.length && left.every((entry, index) => entry === right[index]);
}

function assertPolicyLiteral<T extends string>(
  label: string,
  actual: unknown,
  expected: T,
) {
  assertDeploymentRelease(
    actual === expected,
    "DEPLOYMENT_RELEASE_POLICY_INVALID",
    `${label} must stay ${expected}`,
  );
  return expected;
}

export function buildDeploymentRecoveryGovernanceContract(): DeploymentRecoveryGovernanceContract {
  return buildDeploymentReleaseRecoveryGovernanceContract();
}

export function normalizeDeploymentRecoveryGovernanceContract(
  input: unknown,
): DeploymentRecoveryGovernanceContract {
  try {
    return normalizeDeploymentReleaseRecoveryGovernanceContract(input);
  } catch (error) {
    throw new DeploymentReleaseModelError(
      "DEPLOYMENT_RELEASE_POLICY_INVALID",
      error instanceof Error ? error.message : String(error),
    );
  }
}

export function normalizeDeploymentSchemaReaderWindowContract(
  input: unknown,
  expectedWriterSchemaBundleHash: string,
): SchemaReaderWindowContractRecord {
  assertDeploymentRelease(
    isPlainObject(input),
    "DEPLOYMENT_RELEASE_POLICY_INVALID",
    "schema_reader_window_contract must be an object",
  );
  const writerSchemaBundleHash = requireTrimmedString(
    "schema_reader_window_contract.writer_schema_bundle_hash",
    input.writer_schema_bundle_hash,
  );
  assertDeploymentRelease(
    writerSchemaBundleHash === expectedWriterSchemaBundleHash,
    "DEPLOYMENT_RELEASE_COMPATIBILITY_GATE_MISMATCH",
    "schema_reader_window_contract.writer_schema_bundle_hash must mirror schema_bundle_hash",
  );
  const supportedReaderHashes = requireStringArray(
    "schema_reader_window_contract.supported_reader_schema_bundle_hashes",
    input.supported_reader_schema_bundle_hashes,
    false,
  );
  assertDeploymentRelease(
    supportedReaderHashes.includes(writerSchemaBundleHash),
    "DEPLOYMENT_RELEASE_COMPATIBILITY_GATE_MISMATCH",
    "supported reader bundle hashes must include the writer schema bundle hash",
  );
  const protectedHistoricalHashes = requireStringArray(
    "schema_reader_window_contract.protected_historical_schema_bundle_hashes",
    input.protected_historical_schema_bundle_hashes,
  );
  for (const historicalHash of protectedHistoricalHashes) {
    assertDeploymentRelease(
      historicalHash !== writerSchemaBundleHash &&
        supportedReaderHashes.includes(historicalHash),
      "DEPLOYMENT_RELEASE_COMPATIBILITY_GATE_MISMATCH",
      "protected historical schema bundles must be historical bundles inside the supported-reader set",
    );
  }
  const windowState = input.window_state;
  assertDeploymentRelease(
    windowState === "EXPAND_ONLY_PREVIOUS_READERS_SUPPORTED" ||
      windowState === "BACKFILL_IN_PROGRESS_PREVIOUS_READERS_SUPPORTED" ||
      windowState === "VERIFIED_PREVIOUS_READERS_SUPPORTED" ||
      windowState === "CONTRACT_ELIGIBLE_WINDOW_CLOSED",
    "DEPLOYMENT_RELEASE_POLICY_INVALID",
    "schema_reader_window_contract.window_state must be a governed reader-window state",
  );

  return {
    contract_version: assertPolicyLiteral(
      "schema_reader_window_contract.contract_version",
      input.contract_version,
      "SCHEMA_READER_WINDOW_CONTRACT_V1",
    ),
    compatibility_window_ref: requireTrimmedString(
      "schema_reader_window_contract.compatibility_window_ref",
      input.compatibility_window_ref,
    ),
    writer_schema_bundle_hash: writerSchemaBundleHash,
    supported_reader_schema_bundle_hashes: supportedReaderHashes,
    protected_historical_schema_bundle_hashes: protectedHistoricalHashes,
    window_state: windowState,
    historical_manifest_policy: assertPolicyLiteral(
      "schema_reader_window_contract.historical_manifest_policy",
      input.historical_manifest_policy,
      "FROZEN_MANIFESTS_REQUIRE_RECORDED_BUNDLE_OR_COMPATIBLE_READER",
    ),
    destructive_change_policy: assertPolicyLiteral(
      "schema_reader_window_contract.destructive_change_policy",
      input.destructive_change_policy,
      "DESTRUCTIVE_CHANGE_BLOCKED_UNTIL_WINDOW_CLOSED",
    ),
    rollback_boundary_policy: assertPolicyLiteral(
      "schema_reader_window_contract.rollback_boundary_policy",
      input.rollback_boundary_policy,
      "ROLLBACK_ALLOWED_ONLY_WHILE_PREVIOUS_READERS_SUPPORTED",
    ),
    fail_forward_policy: assertPolicyLiteral(
      "schema_reader_window_contract.fail_forward_policy",
      input.fail_forward_policy,
      "FAIL_FORWARD_REQUIRED_AFTER_WINDOW_CLOSE_OR_BREAKING_CONTRACT",
    ),
    replay_restore_policy: assertPolicyLiteral(
      "schema_reader_window_contract.replay_restore_policy",
      input.replay_restore_policy,
      "RESTORE_AND_REPLAY_REQUIRE_WINDOW_COMPATIBLE_READER",
    ),
  };
}

function migrationChronologyStateForReaderWindow(
  readerWindowState: SchemaReaderWindowContractRecord["window_state"],
) {
  switch (readerWindowState) {
    case "EXPAND_ONLY_PREVIOUS_READERS_SUPPORTED":
      return "EXPAND_ONLY";
    case "BACKFILL_IN_PROGRESS_PREVIOUS_READERS_SUPPORTED":
      return "BACKFILL_IN_PROGRESS";
    case "VERIFIED_PREVIOUS_READERS_SUPPORTED":
      return "VERIFIED_PREVIOUS_READERS_SUPPORTED";
    case "CONTRACT_ELIGIBLE_WINDOW_CLOSED":
      return "CONTRACT_WINDOW_CLOSED";
  }
}

export function rollbackBoundaryForReaderWindow(
  readerWindowState: SchemaReaderWindowContractRecord["window_state"],
): DeploymentRollbackBoundaryState {
  return openReaderWindowStates.has(readerWindowState)
    ? "ROLLBACK_ALLOWED"
    : "FAIL_FORWARD_ONLY";
}

export function deriveSchemaBundleCompatibilityGateHash(
  contract: SchemaBundleCompatibilityGateContractRecord,
) {
  return stableJsonHash({
    contract_version: contract.contract_version,
    candidate_identity_hash: contract.candidate_identity_hash,
    schema_bundle_hash: contract.schema_bundle_hash,
    compatibility_window_ref: contract.compatibility_window_ref,
    reader_window_state: contract.reader_window_state,
    migration_plan_ref_or_null: contract.migration_plan_ref_or_null,
    migration_ledger_refs: [...contract.migration_ledger_refs].sort(),
    supported_client_window_ref_or_null: contract.supported_client_window_ref_or_null,
    historical_manifest_guard_state: contract.historical_manifest_guard_state,
    replay_restore_guard_state: contract.replay_restore_guard_state,
    native_client_window_state: contract.native_client_window_state,
    migration_chronology_state: contract.migration_chronology_state,
    destructive_contract_state: contract.destructive_contract_state,
    rollback_boundary_state: contract.rollback_boundary_state,
    reason_codes: [...contract.reason_codes].sort(),
    writer_schema_bundle_hash:
      contract.schema_reader_window_contract.writer_schema_bundle_hash,
    supported_reader_schema_bundle_hashes: [
      ...contract.schema_reader_window_contract.supported_reader_schema_bundle_hashes,
    ].sort(),
    protected_historical_schema_bundle_hashes: [
      ...contract.schema_reader_window_contract.protected_historical_schema_bundle_hashes,
    ].sort(),
    historical_manifest_policy: contract.historical_manifest_policy,
    destructive_change_policy: contract.destructive_change_policy,
    rollback_boundary_policy: contract.rollback_boundary_policy,
    fail_forward_policy: contract.fail_forward_policy,
    replay_restore_policy: contract.replay_restore_policy,
    client_persistence_policy: contract.client_persistence_policy,
    evidence_binding_policy: contract.evidence_binding_policy,
  });
}

export function buildSchemaBundleCompatibilityGateContract(input: {
  candidate_identity_contract: ReleaseCandidateIdentityContractRecord;
  schema_reader_window_contract: SchemaReaderWindowContractRecord;
  migration_plan_ref_or_null?: string | null;
  migration_ledger_refs?: string[];
  supported_client_window_ref_or_null?: string | null;
  historical_manifest_guard_state?: "PROTECTED" | "BLOCKED";
  replay_restore_guard_state?: "PROTECTED" | "BLOCKED";
  native_client_window_state?: "NOT_APPLICABLE" | "VERIFIED_COMPATIBLE" | "BLOCKED";
  reason_codes?: string[];
}): SchemaBundleCompatibilityGateContractRecord {
  const candidateIdentityContract = assertReleaseCandidateIdentityContract(
    input.candidate_identity_contract,
  );
  const schemaReaderWindowContract = normalizeDeploymentSchemaReaderWindowContract(
    input.schema_reader_window_contract,
    candidateIdentityContract.schema_bundle_hash,
  );
  const migrationPlanRef =
    typeof input.migration_plan_ref_or_null === "undefined"
      ? candidateIdentityContract.migration_plan_ref_or_null
      : input.migration_plan_ref_or_null;
  const supportedClientWindowRef =
    typeof input.supported_client_window_ref_or_null === "undefined"
      ? candidateIdentityContract.supported_client_window_ref_or_null
      : input.supported_client_window_ref_or_null;
  const readerWindowState = schemaReaderWindowContract.window_state;
  const rollbackBoundaryState = rollbackBoundaryForReaderWindow(readerWindowState);
  const migrationLedgerRefs =
    migrationPlanRef === null
      ? []
      : requireStringArray(
          "schema_bundle_compatibility_gate_contract.migration_ledger_refs",
          input.migration_ledger_refs ?? [],
          false,
        );
  const historicalManifestGuardState =
    input.historical_manifest_guard_state ?? "PROTECTED";
  const replayRestoreGuardState = input.replay_restore_guard_state ?? "PROTECTED";
  const nativeClientWindowState =
    input.native_client_window_state ??
    (supportedClientWindowRef === null ? "NOT_APPLICABLE" : "VERIFIED_COMPATIBLE");
  const reasonCodes = requireStringArray(
    "schema_bundle_compatibility_gate_contract.reason_codes",
    input.reason_codes ?? [],
  );
  const blocked = [
    historicalManifestGuardState,
    replayRestoreGuardState,
    nativeClientWindowState,
  ].includes("BLOCKED");
  assertDeploymentRelease(
    blocked ? reasonCodes.length > 0 : reasonCodes.length === 0,
    "DEPLOYMENT_RELEASE_COMPATIBILITY_GATE_MISMATCH",
    "reason_codes must be non-empty only when a compatibility guard state is blocked",
  );
  const contractWithoutHash: Omit<
    SchemaBundleCompatibilityGateContractRecord,
    "compatibility_gate_hash"
  > = {
    contract_version: "SCHEMA_BUNDLE_COMPATIBILITY_GATE_V1",
    candidate_identity_hash: candidateIdentityContract.candidate_identity_hash,
    candidate_identity_contract: cloneReleaseCandidateIdentityContract(
      candidateIdentityContract,
    ),
    schema_bundle_hash: candidateIdentityContract.schema_bundle_hash,
    compatibility_window_ref: schemaReaderWindowContract.compatibility_window_ref,
    reader_window_state: readerWindowState,
    schema_reader_window_contract: structuredClone(schemaReaderWindowContract),
    migration_plan_ref_or_null: migrationPlanRef,
    migration_ledger_refs: migrationLedgerRefs,
    supported_client_window_ref_or_null: supportedClientWindowRef,
    historical_manifest_guard_state: historicalManifestGuardState,
    replay_restore_guard_state: replayRestoreGuardState,
    native_client_window_state: nativeClientWindowState,
    migration_chronology_state:
      migrationPlanRef === null
        ? "NOT_REQUIRED"
        : migrationChronologyStateForReaderWindow(readerWindowState),
    destructive_contract_state: openReaderWindowStates.has(readerWindowState)
      ? "BLOCKED_UNTIL_WINDOW_CLOSE"
      : "ELIGIBLE_AFTER_WINDOW_CLOSE",
    rollback_boundary_state: rollbackBoundaryState,
    reason_codes: reasonCodes,
    historical_manifest_policy:
      "FROZEN_MANIFESTS_REQUIRE_RECORDED_BUNDLE_OR_COMPATIBLE_READER",
    destructive_change_policy: "DESTRUCTIVE_CHANGE_BLOCKED_UNTIL_WINDOW_CLOSED",
    rollback_boundary_policy: "ROLLBACK_ALLOWED_ONLY_WHILE_PREVIOUS_READERS_SUPPORTED",
    fail_forward_policy: "FAIL_FORWARD_REQUIRED_AFTER_WINDOW_CLOSE_OR_BREAKING_CONTRACT",
    replay_restore_policy: "RESTORE_AND_REPLAY_REQUIRE_WINDOW_COMPATIBLE_READER",
    client_persistence_policy:
      "SERVER_SCHEMA_GATE_REQUIRES_SUPPORTED_CLIENT_WINDOW_COMPATIBILITY",
    evidence_binding_policy: "EXACT_CANDIDATE_READER_WINDOW_AND_CLIENT_WINDOW_BINDING_REQUIRED",
  };
  const completeContract = {
    compatibility_gate_hash: "",
    ...contractWithoutHash,
  } satisfies SchemaBundleCompatibilityGateContractRecord;
  completeContract.compatibility_gate_hash =
    deriveSchemaBundleCompatibilityGateHash(completeContract);
  return normalizeSchemaBundleCompatibilityGateContract(completeContract, {
    candidate_identity_hash: candidateIdentityContract.candidate_identity_hash,
    schema_bundle_hash: candidateIdentityContract.schema_bundle_hash,
    migration_plan_ref_or_null: migrationPlanRef,
    supported_client_window_ref_or_null: supportedClientWindowRef,
    compatibility_window_ref: schemaReaderWindowContract.compatibility_window_ref,
    reader_window_state: readerWindowState,
    rollback_boundary_state: rollbackBoundaryState,
  });
}

export function normalizeSchemaBundleCompatibilityGateContract(
  input: unknown,
  expected: {
    candidate_identity_hash: string;
    schema_bundle_hash: string;
    migration_plan_ref_or_null?: string | null;
    supported_client_window_ref_or_null?: string | null;
    compatibility_window_ref: string;
    reader_window_state: SchemaReaderWindowContractRecord["window_state"];
    rollback_boundary_state: DeploymentRollbackBoundaryState;
  },
): SchemaBundleCompatibilityGateContractRecord {
  assertDeploymentRelease(
    isPlainObject(input),
    "DEPLOYMENT_RELEASE_COMPATIBILITY_GATE_MISMATCH",
    "schema_bundle_compatibility_gate_contract must be an object",
  );
  assertPolicyLiteral(
    "schema_bundle_compatibility_gate_contract.contract_version",
    input.contract_version,
    "SCHEMA_BUNDLE_COMPATIBILITY_GATE_V1",
  );
  const candidateIdentityHash = requireTrimmedString(
    "schema_bundle_compatibility_gate_contract.candidate_identity_hash",
    input.candidate_identity_hash,
  );
  const schemaBundleHash = requireTrimmedString(
    "schema_bundle_compatibility_gate_contract.schema_bundle_hash",
    input.schema_bundle_hash,
  );
  assertDeploymentRelease(
    candidateIdentityHash === expected.candidate_identity_hash &&
      schemaBundleHash === expected.schema_bundle_hash,
    "DEPLOYMENT_RELEASE_COMPATIBILITY_GATE_MISMATCH",
    "compatibility gate candidate and schema bundle fields must mirror the deployment release",
  );
  const migrationPlanRef = requireNullableTrimmedString(
    "schema_bundle_compatibility_gate_contract.migration_plan_ref_or_null",
    input.migration_plan_ref_or_null,
  );
  if (typeof expected.migration_plan_ref_or_null !== "undefined") {
    assertDeploymentRelease(
      migrationPlanRef === expected.migration_plan_ref_or_null,
      "DEPLOYMENT_RELEASE_COMPATIBILITY_GATE_MISMATCH",
      "compatibility gate migration plan ref must mirror the candidate identity contract",
    );
  }
  const supportedClientWindowRef = requireNullableTrimmedString(
    "schema_bundle_compatibility_gate_contract.supported_client_window_ref_or_null",
    input.supported_client_window_ref_or_null,
  );
  if (typeof expected.supported_client_window_ref_or_null !== "undefined") {
    assertDeploymentRelease(
      supportedClientWindowRef === expected.supported_client_window_ref_or_null,
      "DEPLOYMENT_RELEASE_COMPATIBILITY_GATE_MISMATCH",
      "compatibility gate supported client window ref must mirror the deployment release",
    );
  }
  const candidateIdentityContract = assertReleaseCandidateIdentityContract(
    input.candidate_identity_contract,
    {
      candidate_identity_hash: candidateIdentityHash,
      schema_bundle_hash: schemaBundleHash,
      migration_plan_ref_or_null: migrationPlanRef,
      supported_client_window_ref_or_null: supportedClientWindowRef,
    },
  );
  const schemaReaderWindowContract = normalizeDeploymentSchemaReaderWindowContract(
    input.schema_reader_window_contract,
    schemaBundleHash,
  );
  assertDeploymentRelease(
    input.compatibility_window_ref === expected.compatibility_window_ref &&
      input.compatibility_window_ref ===
        schemaReaderWindowContract.compatibility_window_ref,
    "DEPLOYMENT_RELEASE_COMPATIBILITY_GATE_MISMATCH",
    "compatibility gate window ref must mirror the schema reader window",
  );
  assertDeploymentRelease(
    input.reader_window_state === expected.reader_window_state &&
      input.reader_window_state === schemaReaderWindowContract.window_state,
    "DEPLOYMENT_RELEASE_COMPATIBILITY_GATE_MISMATCH",
    "compatibility gate reader_window_state must mirror schema_reader_window_contract.window_state",
  );
  const migrationLedgerRefs = requireStringArray(
    "schema_bundle_compatibility_gate_contract.migration_ledger_refs",
    input.migration_ledger_refs,
    migrationPlanRef === null,
  );
  assertDeploymentRelease(
    migrationPlanRef === null
      ? migrationLedgerRefs.length === 0
      : migrationLedgerRefs.length > 0,
    "DEPLOYMENT_RELEASE_COMPATIBILITY_GATE_MISMATCH",
    "migration ledger refs must be empty without a migration plan and non-empty with one",
  );
  const historicalManifestGuardState = input.historical_manifest_guard_state;
  const replayRestoreGuardState = input.replay_restore_guard_state;
  const nativeClientWindowState = input.native_client_window_state;
  assertDeploymentRelease(
    historicalManifestGuardState === "PROTECTED" ||
      historicalManifestGuardState === "BLOCKED",
    "DEPLOYMENT_RELEASE_COMPATIBILITY_GATE_MISMATCH",
    "historical_manifest_guard_state must be PROTECTED or BLOCKED",
  );
  assertDeploymentRelease(
    replayRestoreGuardState === "PROTECTED" || replayRestoreGuardState === "BLOCKED",
    "DEPLOYMENT_RELEASE_COMPATIBILITY_GATE_MISMATCH",
    "replay_restore_guard_state must be PROTECTED or BLOCKED",
  );
  assertDeploymentRelease(
    nativeClientWindowState === "NOT_APPLICABLE" ||
      nativeClientWindowState === "VERIFIED_COMPATIBLE" ||
      nativeClientWindowState === "BLOCKED",
    "DEPLOYMENT_RELEASE_COMPATIBILITY_GATE_MISMATCH",
    "native_client_window_state must be NOT_APPLICABLE, VERIFIED_COMPATIBLE, or BLOCKED",
  );
  assertDeploymentRelease(
    supportedClientWindowRef === null
      ? nativeClientWindowState === "NOT_APPLICABLE"
      : nativeClientWindowState !== "NOT_APPLICABLE",
    "DEPLOYMENT_RELEASE_COMPATIBILITY_GATE_MISMATCH",
    "native_client_window_state must mirror supported client window posture",
  );
  const readerWindowState = schemaReaderWindowContract.window_state;
  const expectedDestructiveState = openReaderWindowStates.has(readerWindowState)
    ? "BLOCKED_UNTIL_WINDOW_CLOSE"
    : "ELIGIBLE_AFTER_WINDOW_CLOSE";
  const expectedRollbackBoundary = rollbackBoundaryForReaderWindow(readerWindowState);
  assertDeploymentRelease(
    input.destructive_contract_state === expectedDestructiveState &&
      input.rollback_boundary_state === expectedRollbackBoundary &&
      input.rollback_boundary_state === expected.rollback_boundary_state,
    "DEPLOYMENT_RELEASE_COMPATIBILITY_GATE_MISMATCH",
    "compatibility gate destructive and rollback posture must mirror the reader-window state",
  );
  const expectedMigrationState =
    migrationPlanRef === null ? "NOT_REQUIRED" : migrationChronologyStateForReaderWindow(readerWindowState);
  assertDeploymentRelease(
    input.migration_chronology_state === expectedMigrationState,
    "DEPLOYMENT_RELEASE_COMPATIBILITY_GATE_MISMATCH",
    "compatibility gate migration chronology must mirror migration plan and reader-window state",
  );
  const reasonCodes = requireStringArray(
    "schema_bundle_compatibility_gate_contract.reason_codes",
    input.reason_codes,
  );
  const blocked = [
    historicalManifestGuardState,
    replayRestoreGuardState,
    nativeClientWindowState,
  ].includes("BLOCKED");
  assertDeploymentRelease(
    blocked ? reasonCodes.length > 0 : reasonCodes.length === 0,
    "DEPLOYMENT_RELEASE_COMPATIBILITY_GATE_MISMATCH",
    "reason_codes must explain blocked compatibility posture and stay empty otherwise",
  );

  const normalized: SchemaBundleCompatibilityGateContractRecord = {
    contract_version: "SCHEMA_BUNDLE_COMPATIBILITY_GATE_V1",
    compatibility_gate_hash: requireTrimmedString(
      "schema_bundle_compatibility_gate_contract.compatibility_gate_hash",
      input.compatibility_gate_hash,
    ),
    candidate_identity_hash: candidateIdentityHash,
    candidate_identity_contract: cloneReleaseCandidateIdentityContract(
      candidateIdentityContract,
    ),
    schema_bundle_hash: schemaBundleHash,
    compatibility_window_ref: expected.compatibility_window_ref,
    reader_window_state: readerWindowState,
    schema_reader_window_contract: structuredClone(schemaReaderWindowContract),
    migration_plan_ref_or_null: migrationPlanRef,
    migration_ledger_refs: migrationLedgerRefs,
    supported_client_window_ref_or_null: supportedClientWindowRef,
    historical_manifest_guard_state: historicalManifestGuardState,
    replay_restore_guard_state: replayRestoreGuardState,
    native_client_window_state: nativeClientWindowState,
    migration_chronology_state: expectedMigrationState,
    destructive_contract_state: expectedDestructiveState,
    rollback_boundary_state: expectedRollbackBoundary,
    reason_codes: reasonCodes,
    historical_manifest_policy: assertPolicyLiteral(
      "schema_bundle_compatibility_gate_contract.historical_manifest_policy",
      input.historical_manifest_policy,
      "FROZEN_MANIFESTS_REQUIRE_RECORDED_BUNDLE_OR_COMPATIBLE_READER",
    ),
    destructive_change_policy: assertPolicyLiteral(
      "schema_bundle_compatibility_gate_contract.destructive_change_policy",
      input.destructive_change_policy,
      "DESTRUCTIVE_CHANGE_BLOCKED_UNTIL_WINDOW_CLOSED",
    ),
    rollback_boundary_policy: assertPolicyLiteral(
      "schema_bundle_compatibility_gate_contract.rollback_boundary_policy",
      input.rollback_boundary_policy,
      "ROLLBACK_ALLOWED_ONLY_WHILE_PREVIOUS_READERS_SUPPORTED",
    ),
    fail_forward_policy: assertPolicyLiteral(
      "schema_bundle_compatibility_gate_contract.fail_forward_policy",
      input.fail_forward_policy,
      "FAIL_FORWARD_REQUIRED_AFTER_WINDOW_CLOSE_OR_BREAKING_CONTRACT",
    ),
    replay_restore_policy: assertPolicyLiteral(
      "schema_bundle_compatibility_gate_contract.replay_restore_policy",
      input.replay_restore_policy,
      "RESTORE_AND_REPLAY_REQUIRE_WINDOW_COMPATIBLE_READER",
    ),
    client_persistence_policy: assertPolicyLiteral(
      "schema_bundle_compatibility_gate_contract.client_persistence_policy",
      input.client_persistence_policy,
      "SERVER_SCHEMA_GATE_REQUIRES_SUPPORTED_CLIENT_WINDOW_COMPATIBILITY",
    ),
    evidence_binding_policy: assertPolicyLiteral(
      "schema_bundle_compatibility_gate_contract.evidence_binding_policy",
      input.evidence_binding_policy,
      "EXACT_CANDIDATE_READER_WINDOW_AND_CLIENT_WINDOW_BINDING_REQUIRED",
    ),
  };
  assertDeploymentRelease(
    normalized.compatibility_gate_hash ===
      deriveSchemaBundleCompatibilityGateHash(normalized),
    "DEPLOYMENT_RELEASE_COMPATIBILITY_GATE_MISMATCH",
    "compatibility_gate_hash must equal the canonical schema compatibility tuple hash",
  );
  return normalized;
}

export function isLegalDeploymentReleaseTransition(input: {
  previous_state_or_null: DeploymentRolloutState | null;
  transition_event_code: DeploymentReleaseTransitionEventCode;
  current_state: DeploymentRolloutState;
}) {
  if (
    input.previous_state_or_null === null &&
    input.transition_event_code === "release_planned" &&
    input.current_state === "PLANNED"
  ) {
    return true;
  }
  if (input.previous_state_or_null === null) {
    return false;
  }
  return DEPLOYMENT_RELEASE_ALLOWED_TRANSITIONS.some(
    ([from, event, to]) =>
      from === input.previous_state_or_null &&
      event === input.transition_event_code &&
      to === input.current_state,
  );
}

function requireTransitionEventCode(
  value: unknown,
): DeploymentReleaseTransitionEventCode {
  assertDeploymentRelease(
    typeof value === "string" &&
      [
        "release_planned",
        "canary_start",
        "emergency_promote_with_override",
        "promote",
        "abort",
        "rollback",
        "rollback_unsafe_fail_forward_required",
        "emergency_pin",
        "supersede",
      ].includes(value),
    "DEPLOYMENT_RELEASE_STATE_CONTRACT_INVALID",
    "transition_event_code must be a governed deployment release event code",
  );
  return value as DeploymentReleaseTransitionEventCode;
}

export function buildDeploymentReleaseStateTransitionContract(input: {
  current_state: DeploymentRolloutState;
  previous_state_or_null: DeploymentRolloutState | null;
  transition_event_code: DeploymentReleaseTransitionEventCode;
  transition_applied_at: unknown;
  transition_audit_ref: unknown;
}): DeploymentReleaseStateTransitionContract {
  assertDeploymentRelease(
    input.previous_state_or_null !== input.current_state,
    "DEPLOYMENT_RELEASE_STATE_CONTRACT_INVALID",
    "state_transition_contract.previous_state_or_null must not equal current_state",
  );
  assertDeploymentRelease(
    isLegalDeploymentReleaseTransition(input),
    "DEPLOYMENT_RELEASE_ILLEGAL_TRANSITION",
    "state_transition_contract must encode the legal initial release event or a legal named rollout transition",
  );
  return {
    contract_version: "STATE_TRANSITION_CONTRACT_V1",
    object_family: "DEPLOYMENT_RELEASE",
    machine_code: "DEPLOYMENT_RELEASE_ROLLOUT_V1",
    state_field_name: "rollout_state",
    current_state: input.current_state,
    previous_state_or_null: input.previous_state_or_null,
    transition_event_code: input.transition_event_code,
    transition_applied_at: normalizeUtcInstantString(input.transition_applied_at),
    transition_audit_ref: requireTrimmedString(
      "state_transition_contract.transition_audit_ref",
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

export function normalizeDeploymentReleaseStateTransitionContract(
  input: unknown,
  currentState: DeploymentRolloutState,
): DeploymentReleaseStateTransitionContract {
  assertDeploymentRelease(
    isPlainObject(input),
    "DEPLOYMENT_RELEASE_STATE_CONTRACT_INVALID",
    "state_transition_contract must be an object",
  );
  assertPolicyLiteral(
    "state_transition_contract.contract_version",
    input.contract_version,
    "STATE_TRANSITION_CONTRACT_V1",
  );
  assertPolicyLiteral(
    "state_transition_contract.object_family",
    input.object_family,
    "DEPLOYMENT_RELEASE",
  );
  assertPolicyLiteral(
    "state_transition_contract.machine_code",
    input.machine_code,
    "DEPLOYMENT_RELEASE_ROLLOUT_V1",
  );
  assertPolicyLiteral(
    "state_transition_contract.state_field_name",
    input.state_field_name,
    "rollout_state",
  );
  const transitionCurrentState = requireRolloutState(input.current_state);
  assertDeploymentRelease(
    transitionCurrentState === currentState,
    "DEPLOYMENT_RELEASE_STATE_CONTRACT_INVALID",
    "state_transition_contract.current_state must mirror rollout_state",
  );
  const previousState =
    input.previous_state_or_null === null
      ? null
      : requireRolloutState(input.previous_state_or_null);
  const eventCode = requireTransitionEventCode(input.transition_event_code);
  for (const [field, expectedValue] of Object.entries({
    transition_application_policy: "NAMED_EVENT_ONLY",
    illegal_transition_policy: "REJECT_WITH_TYPED_REASON_AND_NO_PARTIAL_WRITE",
    concurrency_guard_policy: "COMPARE_AND_SWAP_OR_SINGLE_WRITER_LEASE",
    terminal_reentry_policy: "TERMINAL_STATES_REQUIRE_NEW_LINEAGE",
    recovery_supersession_policy:
      "RECOVERY_AND_SUPERSESSION_ALLOCATE_SUCCESSOR_OR_SUPERSEDING_LINEAGE",
    audit_evidence_policy: "EVERY_TRANSITION_RETAINS_AUDIT_EVENT_REF",
    typed_rejection_family: "ILLEGAL_STATE_TRANSITION",
  })) {
    assertPolicyLiteral(`state_transition_contract.${field}`, input[field], expectedValue);
  }
  return buildDeploymentReleaseStateTransitionContract({
    current_state: transitionCurrentState,
    previous_state_or_null: previousState,
    transition_event_code: eventCode,
    transition_applied_at: input.transition_applied_at,
    transition_audit_ref: input.transition_audit_ref,
  });
}

function assertDeploymentReleaseStrategyAndState(record: DeploymentReleaseRecord) {
  if (record.rollout_strategy === "STANDARD_CANARY") {
    assertDeploymentRelease(
      record.canary_fraction !== null &&
        record.emergency_override_ref === null &&
        record.emergency_override_expires_at === null,
      "DEPLOYMENT_RELEASE_POLICY_INVALID",
      "STANDARD_CANARY releases must retain canary_fraction and no emergency override refs",
    );
  }
  if (record.rollout_strategy === "EMERGENCY_PROMOTE") {
    assertDeploymentRelease(
      record.canary_fraction === null &&
        record.emergency_override_ref !== null &&
        record.emergency_override_expires_at !== null,
      "DEPLOYMENT_RELEASE_EMERGENCY_OVERRIDE_INVALID",
      "EMERGENCY_PROMOTE releases must retain override ref and expiry with no canary fraction",
    );
  }
  if (record.rollout_strategy === "PIN_BASELINE") {
    assertDeploymentRelease(
      record.rollout_state === "PINNED" && record.canary_fraction === null,
      "DEPLOYMENT_RELEASE_POLICY_INVALID",
      "PIN_BASELINE releases must keep rollout_state=PINNED with no canary fraction",
    );
  }
  if (record.rollout_strategy === "FAIL_FORWARD_COMPENSATING") {
    assertDeploymentRelease(
      record.rollout_state === "FAILED_FORWARD" &&
        record.rollback_boundary_state === "FAIL_FORWARD_ONLY" &&
        record.canary_fraction === null &&
        record.rollback_of_release_id === null &&
        record.compensating_release_id_or_null !== null &&
        record.fail_forward_owner_ref_or_null !== null,
      "DEPLOYMENT_RELEASE_FAIL_FORWARD_GOVERNANCE_MISSING",
      "FAIL_FORWARD_COMPENSATING releases must retain failed-forward state, compensating release, owner, and no rollback target",
    );
  }
  if (record.rollout_state === "CANARY") {
    assertDeploymentRelease(
      record.rollout_strategy === "STANDARD_CANARY" &&
        record.deployed_at !== null &&
        record.canary_fraction !== null,
      "DEPLOYMENT_RELEASE_POLICY_INVALID",
      "CANARY state must stay on STANDARD_CANARY with deployed_at and canary_fraction",
    );
  }
  if (record.rollout_state === "ABORTED") {
    assertDeploymentRelease(
      record.rollout_strategy === "STANDARD_CANARY" &&
        record.canary_fraction !== null &&
        record.health_gate_state === "RED" &&
        record.rollback_boundary_state === "ROLLBACK_ALLOWED" &&
        record.rollback_of_release_id === null &&
        record.compensating_release_id_or_null === null &&
        record.fail_forward_owner_ref_or_null === null,
      "DEPLOYMENT_RELEASE_POLICY_INVALID",
      "ABORTED state must retain standard canary red-health posture and no fail-forward fields",
    );
  }
  if (record.rollout_state === "PROMOTED") {
    assertDeploymentRelease(
      record.deployed_at !== null && record.health_gate_state === "GREEN",
      "DEPLOYMENT_RELEASE_POLICY_INVALID",
      "PROMOTED releases must retain deployed_at and green health posture",
    );
  }
  if (record.rollout_state === "PINNED") {
    assertDeploymentRelease(
      record.rollout_strategy === "PIN_BASELINE" &&
        record.deployed_at !== null &&
        record.canary_fraction === null,
      "DEPLOYMENT_RELEASE_POLICY_INVALID",
      "PINNED releases must serialize PIN_BASELINE with deployed_at and no canary fraction",
    );
  }
  if (record.rollout_state === "FAILED_FORWARD") {
    assertDeploymentRelease(
      record.rollback_boundary_state === "FAIL_FORWARD_ONLY" &&
        record.rollback_of_release_id === null &&
        record.compensating_release_id_or_null !== null &&
        record.fail_forward_owner_ref_or_null !== null &&
        record.health_gate_state !== "GREEN",
      "DEPLOYMENT_RELEASE_FAIL_FORWARD_GOVERNANCE_MISSING",
      "FAILED_FORWARD releases require fail-forward boundary, compensating release, owner, and non-green health",
    );
  }
  if (record.rollout_state === "ROLLED_BACK") {
    assertDeploymentRelease(
      record.rollback_of_release_id !== null &&
        record.rollback_boundary_state === "ROLLBACK_ALLOWED" &&
        record.compensating_release_id_or_null === null &&
        record.fail_forward_owner_ref_or_null === null,
      "DEPLOYMENT_RELEASE_POLICY_INVALID",
      "ROLLED_BACK releases must retain rollback target, rollback-allowed boundary, and no fail-forward fields",
    );
  }
  if (record.rollout_state === "PLANNED") {
    assertDeploymentRelease(
      record.deployed_at === null,
      "DEPLOYMENT_RELEASE_POLICY_INVALID",
      "PLANNED releases must not retain deployed_at",
    );
  }
  if (terminalServedStateSet.has(record.rollout_state)) {
    assertDeploymentRelease(
      record.deployed_at !== null,
      "DEPLOYMENT_RELEASE_POLICY_INVALID",
      `rollout_state=${record.rollout_state} must retain deployed_at`,
    );
  }
  assertDeploymentRelease(
    record.rollback_of_release_id === null ||
      record.rollback_of_release_id !== record.release_id,
    "DEPLOYMENT_RELEASE_SELF_ROLLBACK",
    "rollback_of_release_id must not point back to release_id",
  );
  assertDeploymentRelease(
    record.compensating_release_id_or_null === null ||
      record.compensating_release_id_or_null !== record.release_id,
    "DEPLOYMENT_RELEASE_FAIL_FORWARD_GOVERNANCE_MISSING",
    "compensating_release_id_or_null must not point back to release_id",
  );
  assertDeploymentRelease(
    record.rollout_state === "FAILED_FORWARD" ||
      (record.compensating_release_id_or_null === null &&
        record.fail_forward_owner_ref_or_null === null),
    "DEPLOYMENT_RELEASE_FAIL_FORWARD_GOVERNANCE_MISSING",
    "fail-forward governance fields must stay null unless rollout_state=FAILED_FORWARD",
  );
  if (record.deployed_at !== null && record.emergency_override_expires_at !== null) {
    assertDeploymentRelease(
      Date.parse(record.emergency_override_expires_at) > Date.parse(record.deployed_at),
      "DEPLOYMENT_RELEASE_EMERGENCY_OVERRIDE_INVALID",
      "emergency_override_expires_at must be later than deployed_at",
    );
  }
}

export function normalizeDeploymentReleaseRecord(
  input: DeploymentReleaseDraft,
): DeploymentReleaseRecord {
  const releaseId = requireTrimmedString("release_id", input.release_id);
  const environmentRef = requireTrimmedString("environment_ref", input.environment_ref);
  const buildId = requireTrimmedString("build_id", input.build_id);
  const candidateIdentityHash = requireTrimmedString(
    "candidate_identity_hash",
    input.candidate_identity_hash,
  );
  const schemaBundleHash = requireTrimmedString(
    "schema_bundle_hash",
    input.schema_bundle_hash,
  );
  const configBundleHash = requireTrimmedString(
    "config_bundle_hash",
    input.config_bundle_hash,
  );
  const supportedClientWindowRef = requireTrimmedString(
    "supported_client_window_ref",
    input.supported_client_window_ref,
  );
  const expectedCandidateMirrors: ReleaseCandidateIdentityExpectedMirrors = {
    build_artifact_ref: buildId,
    candidate_environment_ref: environmentRef,
    candidate_identity_hash: candidateIdentityHash,
    config_bundle_hash: configBundleHash,
    schema_bundle_hash: schemaBundleHash,
    supported_client_window_ref_or_null: supportedClientWindowRef,
  };
  const candidateIdentityContract = assertReleaseCandidateIdentityContract(
    input.candidate_identity_contract,
    expectedCandidateMirrors,
  );
  const recoveryGovernanceContract = normalizeDeploymentRecoveryGovernanceContract(
    input.recovery_governance_contract,
  );
  const schemaReaderWindowContract = normalizeDeploymentSchemaReaderWindowContract(
    input.schema_reader_window_contract,
    schemaBundleHash,
  );
  const rollbackBoundaryState = requireRollbackBoundary(input.rollback_boundary_state);
  assertDeploymentRelease(
    schemaReaderWindowContract.window_state !== "CONTRACT_ELIGIBLE_WINDOW_CLOSED" ||
      rollbackBoundaryState === "FAIL_FORWARD_ONLY",
    "DEPLOYMENT_RELEASE_ROLLBACK_BOUNDARY_CLOSED",
    "closed schema reader windows must force rollback_boundary_state=FAIL_FORWARD_ONLY",
  );
  const schemaBundleCompatibilityGateContract =
    normalizeSchemaBundleCompatibilityGateContract(
      input.schema_bundle_compatibility_gate_contract,
      {
        candidate_identity_hash: candidateIdentityHash,
        schema_bundle_hash: schemaBundleHash,
        migration_plan_ref_or_null: candidateIdentityContract.migration_plan_ref_or_null,
        supported_client_window_ref_or_null: supportedClientWindowRef,
        compatibility_window_ref: schemaReaderWindowContract.compatibility_window_ref,
        reader_window_state: schemaReaderWindowContract.window_state,
        rollback_boundary_state: rollbackBoundaryState,
      },
    );
  assertDeploymentRelease(
    schemaBundleCompatibilityGateContract.historical_manifest_guard_state === "PROTECTED" &&
      schemaBundleCompatibilityGateContract.replay_restore_guard_state === "PROTECTED" &&
      schemaBundleCompatibilityGateContract.native_client_window_state ===
        "VERIFIED_COMPATIBLE",
    "DEPLOYMENT_RELEASE_COMPATIBILITY_GATE_MISMATCH",
    "deployment releases must retain protected historical/replay posture and verified native-client compatibility",
  );
  const rolloutState = requireRolloutState(input.rollout_state);
  const normalized: DeploymentReleaseRecord = {
    release_id: releaseId,
    environment_ref: environmentRef,
    build_id: buildId,
    candidate_identity_hash: candidateIdentityHash,
    candidate_identity_contract: cloneReleaseCandidateIdentityContract(
      candidateIdentityContract,
    ),
    recovery_governance_contract: recoveryGovernanceContract,
    schema_bundle_hash: schemaBundleHash,
    schema_reader_window_contract: schemaReaderWindowContract,
    schema_bundle_compatibility_gate_contract: schemaBundleCompatibilityGateContract,
    config_bundle_hash: configBundleHash,
    rollout_strategy: requireRolloutStrategy(input.rollout_strategy),
    rollout_state: rolloutState,
    state_transition_contract: normalizeDeploymentReleaseStateTransitionContract(
      input.state_transition_contract,
      rolloutState,
    ),
    rollback_boundary_state: rollbackBoundaryState,
    canary_fraction: requireNullableCanaryFraction(input.canary_fraction),
    health_gate_state: requireHealthGateState(input.health_gate_state),
    release_verification_manifest_ref: requireTrimmedString(
      "release_verification_manifest_ref",
      input.release_verification_manifest_ref,
    ),
    supported_client_window_ref: supportedClientWindowRef,
    deployed_at: requireNullableInstant("deployed_at", input.deployed_at),
    rollback_of_release_id: requireNullableTrimmedString(
      "rollback_of_release_id",
      input.rollback_of_release_id,
    ),
    compensating_release_id_or_null: requireNullableTrimmedString(
      "compensating_release_id_or_null",
      input.compensating_release_id_or_null,
    ),
    rollback_runbook_ref: requireTrimmedString(
      "rollback_runbook_ref",
      input.rollback_runbook_ref,
    ),
    fail_forward_runbook_ref: requireTrimmedString(
      "fail_forward_runbook_ref",
      input.fail_forward_runbook_ref,
    ),
    fail_forward_owner_ref_or_null: requireNullableTrimmedString(
      "fail_forward_owner_ref_or_null",
      input.fail_forward_owner_ref_or_null,
    ),
    emergency_override_ref: requireNullableTrimmedString(
      "emergency_override_ref",
      input.emergency_override_ref,
    ),
    emergency_override_expires_at: requireNullableInstant(
      "emergency_override_expires_at",
      input.emergency_override_expires_at,
    ),
  };
  assertDeploymentRelease(
    normalized.rollout_state !== "ROLLED_BACK" ||
      schemaReaderWindowContract.window_state !== "CONTRACT_ELIGIBLE_WINDOW_CLOSED",
    "DEPLOYMENT_RELEASE_ROLLBACK_BOUNDARY_CLOSED",
    "rollout_state=ROLLED_BACK is not lawful once the schema reader window is closed",
  );
  assertDeploymentReleaseStrategyAndState(normalized);
  return normalized;
}

export function buildDeploymentReleaseRecord(
  input: BuildDeploymentReleaseRecordInput,
): DeploymentReleaseRecord {
  const candidateIdentityContract = assertReleaseCandidateIdentityContract(
    input.candidate_identity_contract,
  );
  assertDeploymentRelease(
    candidateIdentityContract.supported_client_window_ref_or_null !== null,
    "DEPLOYMENT_RELEASE_CANDIDATE_MISMATCH",
    "DeploymentRelease requires a non-null supported client window ref on the candidate identity contract",
  );
  const rollbackBoundaryState =
    input.rollback_boundary_state ??
    rollbackBoundaryForReaderWindow(input.schema_reader_window_contract.window_state);
  const transitionEventCode =
    input.transition_event_code ??
    (input.rollout_state === "PLANNED" && (input.previous_state_or_null ?? null) === null
      ? "release_planned"
      : undefined);
  assertDeploymentRelease(
    transitionEventCode !== undefined,
    "DEPLOYMENT_RELEASE_STATE_CONTRACT_INVALID",
    "non-initial deployment releases require an explicit transition_event_code",
  );
  const stateTransitionContract = buildDeploymentReleaseStateTransitionContract({
    current_state: input.rollout_state,
    previous_state_or_null: input.previous_state_or_null ?? null,
    transition_event_code: transitionEventCode,
    transition_applied_at: input.transition_applied_at,
    transition_audit_ref: input.transition_audit_ref,
  });
  const compatibilityGateContract =
    input.schema_bundle_compatibility_gate_contract ??
    buildSchemaBundleCompatibilityGateContract({
      candidate_identity_contract: candidateIdentityContract,
      schema_reader_window_contract: input.schema_reader_window_contract,
      migration_plan_ref_or_null: candidateIdentityContract.migration_plan_ref_or_null,
      supported_client_window_ref_or_null:
        candidateIdentityContract.supported_client_window_ref_or_null,
    });
  return normalizeDeploymentReleaseRecord({
    release_id: input.release_id,
    environment_ref: candidateIdentityContract.candidate_environment_ref,
    build_id: candidateIdentityContract.build_artifact_ref,
    candidate_identity_hash: candidateIdentityContract.candidate_identity_hash,
    candidate_identity_contract: candidateIdentityContract,
    recovery_governance_contract:
      input.recovery_governance_contract ?? buildDeploymentRecoveryGovernanceContract(),
    schema_bundle_hash: candidateIdentityContract.schema_bundle_hash,
    schema_reader_window_contract: input.schema_reader_window_contract,
    schema_bundle_compatibility_gate_contract: compatibilityGateContract,
    config_bundle_hash: candidateIdentityContract.config_bundle_hash,
    rollout_strategy: input.rollout_strategy,
    rollout_state: input.rollout_state,
    state_transition_contract: stateTransitionContract,
    rollback_boundary_state: rollbackBoundaryState,
    canary_fraction: input.canary_fraction,
    health_gate_state: input.health_gate_state,
    release_verification_manifest_ref: input.release_verification_manifest_ref,
    supported_client_window_ref:
      candidateIdentityContract.supported_client_window_ref_or_null,
    deployed_at: input.deployed_at,
    rollback_of_release_id: input.rollback_of_release_id,
    compensating_release_id_or_null: input.compensating_release_id_or_null,
    rollback_runbook_ref: input.rollback_runbook_ref,
    fail_forward_runbook_ref: input.fail_forward_runbook_ref,
    fail_forward_owner_ref_or_null: input.fail_forward_owner_ref_or_null,
    emergency_override_ref: input.emergency_override_ref,
    emergency_override_expires_at: input.emergency_override_expires_at,
  });
}

export function assertDeploymentReleaseRecord(record: DeploymentReleaseRecord) {
  return normalizeDeploymentReleaseRecord(record);
}

export function cloneDeploymentReleaseRecord(record: DeploymentReleaseRecord) {
  return structuredClone(record);
}

export function deploymentReleaseRef(record: Pick<DeploymentReleaseRecord, "release_id">) {
  return record.release_id;
}
