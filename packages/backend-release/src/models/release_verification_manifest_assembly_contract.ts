import type {
  ReleaseVerificationManifestAssemblyContract,
  ReleaseVerificationManifestAssemblyContractGateBinding,
} from "../../../generated-models/src/generated/typescript/manifest-and-release.ts";
import { stableJsonHash } from "../../../domain-kernel/src/primitives/hash.ts";
import { normalizeUtcInstantString } from "../../../domain-kernel/src/primitives/time.ts";

export type ReleaseVerificationManifestAssemblyContractRecord =
  ReleaseVerificationManifestAssemblyContract;
export type ReleaseVerificationGateBindingRecord =
  ReleaseVerificationManifestAssemblyContractGateBinding;
export type ReleaseVerificationGateName =
  ReleaseVerificationGateBindingRecord["gate_name"];
export type ReleaseVerificationSuiteFamily =
  ReleaseVerificationGateBindingRecord["suite_family"];
export type ReleaseVerificationGateStatus =
  ReleaseVerificationGateBindingRecord["status"];
export type ReleaseVerificationAssemblyDecisionState =
  ReleaseVerificationManifestAssemblyContractRecord["decision_state"];
export type ReleaseVerificationMigrationMode =
  ReleaseVerificationManifestAssemblyContractRecord["migration_mode"];

export const RELEASE_VERIFICATION_MANIFEST_ASSEMBLY_CONTRACT_VERSION =
  "RELEASE_VERIFICATION_MANIFEST_ASSEMBLY_V1";
export const RELEASE_VERIFICATION_MANIFEST_ASSEMBLY_SCHEMA_ID =
  "https://taxat.dev/schemas/release_verification_manifest_assembly_contract.schema.json";
export const RELEASE_VERIFICATION_MANIFEST_GATE_ORDER = [
  "schema_compatibility",
  "deterministic_and_state_machine",
  "northbound_api",
  "authority_sandbox",
  "operator_client",
  "security",
  "performance_and_canary",
  "restore_drill",
  "migration_verification",
  "supply_chain",
  "suite_admissibility",
] as const satisfies readonly ReleaseVerificationGateName[];

export const RELEASE_VERIFICATION_MANIFEST_GATE_SUITE_FAMILY = {
  schema_compatibility: "SCHEMA_COMPATIBILITY",
  deterministic_and_state_machine: "DETERMINISTIC_AND_STATE_MACHINE",
  northbound_api: "NORTHBOUND_API",
  authority_sandbox: "AUTHORITY_SANDBOX",
  operator_client: "OPERATOR_CLIENT",
  security: "SECURITY",
  performance_and_canary: "PERFORMANCE_AND_CANARY",
  restore_drill: "RESTORE_DRILL",
  migration_verification: "MIGRATION_VERIFICATION",
  supply_chain: "SUPPLY_CHAIN",
  suite_admissibility: "SUITE_ADMISSIBILITY",
} as const satisfies Record<ReleaseVerificationGateName, ReleaseVerificationSuiteFamily>;

export const RELEASE_VERIFICATION_MANIFEST_GATE_INDEX = new Map(
  RELEASE_VERIFICATION_MANIFEST_GATE_ORDER.map((gateName, index) => [gateName, index]),
);

export type ReleaseVerificationManifestAssemblyModelErrorCode =
  | "RELEASE_VERIFICATION_ASSEMBLY_FIELD_INVALID"
  | "RELEASE_VERIFICATION_ASSEMBLY_POLICY_INVALID"
  | "RELEASE_VERIFICATION_ASSEMBLY_GATE_ORDER_INVALID"
  | "RELEASE_VERIFICATION_ASSEMBLY_COMPANION_EVIDENCE_MISSING"
  | "RELEASE_VERIFICATION_ASSEMBLY_DECISION_INVALID"
  | "RELEASE_VERIFICATION_ASSEMBLY_HASH_MISMATCH";

export class ReleaseVerificationManifestAssemblyModelError extends Error {
  readonly code: ReleaseVerificationManifestAssemblyModelErrorCode;

  constructor(
    code: ReleaseVerificationManifestAssemblyModelErrorCode,
    detail: string,
  ) {
    super(`${code}: ${detail}`);
    this.name = "ReleaseVerificationManifestAssemblyModelError";
    this.code = code;
  }
}

function assertAssembly(
  condition: unknown,
  code: ReleaseVerificationManifestAssemblyModelErrorCode,
  detail: string,
): asserts condition {
  if (!condition) {
    throw new ReleaseVerificationManifestAssemblyModelError(code, detail);
  }
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function requireTrimmedString(label: string, value: unknown) {
  assertAssembly(
    typeof value === "string" && value.trim() === value && value.length > 0,
    "RELEASE_VERIFICATION_ASSEMBLY_FIELD_INVALID",
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

function requireInstant(label: string, value: unknown) {
  try {
    return normalizeUtcInstantString(value);
  } catch (error) {
    throw new ReleaseVerificationManifestAssemblyModelError(
      "RELEASE_VERIFICATION_ASSEMBLY_FIELD_INVALID",
      `${label} must be a valid UTC-normalizable instant: ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
  }
}

function requirePolicyLiteral<T extends string>(
  label: string,
  actual: unknown,
  expected: T,
) {
  assertAssembly(
    actual === expected,
    "RELEASE_VERIFICATION_ASSEMBLY_POLICY_INVALID",
    `${label} must be ${expected}`,
  );
  return expected;
}

function requireStringArray(label: string, values: unknown, allowEmpty = true) {
  assertAssembly(
    Array.isArray(values),
    "RELEASE_VERIFICATION_ASSEMBLY_FIELD_INVALID",
    `${label} must be an array`,
  );
  const normalized = values.map((value, index) =>
    requireTrimmedString(`${label}[${index}]`, value),
  );
  assertAssembly(
    allowEmpty || normalized.length > 0,
    "RELEASE_VERIFICATION_ASSEMBLY_FIELD_INVALID",
    `${label} must contain at least one entry`,
  );
  const unique = new Set(normalized);
  assertAssembly(
    unique.size === normalized.length,
    "RELEASE_VERIFICATION_ASSEMBLY_POLICY_INVALID",
    `${label} must not contain duplicate refs`,
  );
  return [...unique].sort();
}

function requireGateName(value: unknown): ReleaseVerificationGateName {
  assertAssembly(
    typeof value === "string" &&
      RELEASE_VERIFICATION_MANIFEST_GATE_ORDER.includes(
        value as ReleaseVerificationGateName,
      ),
    "RELEASE_VERIFICATION_ASSEMBLY_FIELD_INVALID",
    "gate_name must be a canonical release verification gate",
  );
  return value as ReleaseVerificationGateName;
}

function requireGateStatus(value: unknown): ReleaseVerificationGateStatus {
  assertAssembly(
    value === "GREEN" || value === "RED",
    "RELEASE_VERIFICATION_ASSEMBLY_FIELD_INVALID",
    "status must be GREEN or RED",
  );
  return value;
}

function requireDecisionState(value: unknown): ReleaseVerificationAssemblyDecisionState {
  assertAssembly(
    value === "PENDING" ||
      value === "BLOCKED" ||
      value === "APPROVED" ||
      value === "SUPERSEDED",
    "RELEASE_VERIFICATION_ASSEMBLY_FIELD_INVALID",
    "decision_state must be PENDING, BLOCKED, APPROVED, or SUPERSEDED",
  );
  return value;
}

function requireMigrationMode(value: unknown): ReleaseVerificationMigrationMode {
  assertAssembly(
    value === "NO_MIGRATION" || value === "MIGRATION_REQUIRED",
    "RELEASE_VERIFICATION_ASSEMBLY_FIELD_INVALID",
    "migration_mode must be NO_MIGRATION or MIGRATION_REQUIRED",
  );
  return value;
}

function normalizeGateBinding(input: unknown): ReleaseVerificationGateBindingRecord {
  assertAssembly(
    isPlainObject(input),
    "RELEASE_VERIFICATION_ASSEMBLY_FIELD_INVALID",
    "gate binding must be an object",
  );
  const gateName = requireGateName(input.gate_name);
  const expectedSuiteFamily =
    RELEASE_VERIFICATION_MANIFEST_GATE_SUITE_FAMILY[gateName];
  assertAssembly(
    input.suite_family === expectedSuiteFamily,
    "RELEASE_VERIFICATION_ASSEMBLY_POLICY_INVALID",
    `suite_family must be ${expectedSuiteFamily} for ${gateName}`,
  );
  const compatibilityGateHash =
    gateName === "schema_compatibility" ||
    gateName === "migration_verification" ||
    gateName === "operator_client"
      ? requireTrimmedString(
          `gate_bindings.${gateName}.compatibility_gate_hash_or_null`,
          input.compatibility_gate_hash_or_null,
        )
      : null;
  assertAssembly(
    compatibilityGateHash !== null || input.compatibility_gate_hash_or_null === null,
    "RELEASE_VERIFICATION_ASSEMBLY_POLICY_INVALID",
    "compatibility_gate_hash_or_null must stay null outside schema, migration, and operator-client gates",
  );
  const authoritySandboxCoverageHash =
    gateName === "authority_sandbox"
      ? requireTrimmedString(
          "gate_bindings.authority_sandbox.authority_sandbox_coverage_hash_or_null",
          input.authority_sandbox_coverage_hash_or_null,
        )
      : null;
  assertAssembly(
    authoritySandboxCoverageHash !== null ||
      input.authority_sandbox_coverage_hash_or_null === null,
    "RELEASE_VERIFICATION_ASSEMBLY_POLICY_INVALID",
    "authority_sandbox_coverage_hash_or_null must stay null outside the authority sandbox gate",
  );
  const status = requireGateStatus(input.status);
  const admissibilityState = input.admissibility_state;
  const quarantineState = input.quarantine_state;
  const manualWaiverState = input.manual_waiver_state;
  assertAssembly(
    admissibilityState === "ADMISSIBLE" || admissibilityState === "INADMISSIBLE",
    "RELEASE_VERIFICATION_ASSEMBLY_FIELD_INVALID",
    "admissibility_state must be ADMISSIBLE or INADMISSIBLE",
  );
  assertAssembly(
    quarantineState === "NONE" || quarantineState === "QUARANTINED",
    "RELEASE_VERIFICATION_ASSEMBLY_FIELD_INVALID",
    "quarantine_state must be NONE or QUARANTINED",
  );
  assertAssembly(
    manualWaiverState === "NONE" || manualWaiverState === "WAIVED",
    "RELEASE_VERIFICATION_ASSEMBLY_FIELD_INVALID",
    "manual_waiver_state must be NONE or WAIVED",
  );
  if (status === "GREEN") {
    assertAssembly(
      admissibilityState === "ADMISSIBLE" &&
        quarantineState === "NONE" &&
        manualWaiverState === "NONE",
      "RELEASE_VERIFICATION_ASSEMBLY_POLICY_INVALID",
      "GREEN gates require admissible, unquarantined, unwaived evidence",
    );
  } else {
    assertAssembly(
      admissibilityState !== "ADMISSIBLE" ||
        quarantineState !== "NONE" ||
        manualWaiverState !== "NONE",
      "RELEASE_VERIFICATION_ASSEMBLY_POLICY_INVALID",
      "RED gates must retain an inadmissible, quarantined, or waived posture",
    );
  }

  return {
    gate_name: gateName,
    suite_family: expectedSuiteFamily,
    candidate_identity_hash: requireTrimmedString(
      `gate_bindings.${gateName}.candidate_identity_hash`,
      input.candidate_identity_hash,
    ),
    compatibility_gate_hash_or_null: compatibilityGateHash,
    authority_sandbox_coverage_hash_or_null: authoritySandboxCoverageHash,
    result_ref: requireTrimmedString(
      `gate_bindings.${gateName}.result_ref`,
      input.result_ref,
    ),
    admissibility_ref: requireTrimmedString(
      `gate_bindings.${gateName}.admissibility_ref`,
      input.admissibility_ref,
    ),
    status,
    admissibility_state: admissibilityState,
    quarantine_state: quarantineState,
    manual_waiver_state: manualWaiverState,
    executed_at: requireInstant(`gate_bindings.${gateName}.executed_at`, input.executed_at),
  };
}

export function canonicalReleaseVerificationManifestGateBindings(input: unknown) {
  assertAssembly(
    Array.isArray(input),
    "RELEASE_VERIFICATION_ASSEMBLY_FIELD_INVALID",
    "gate_bindings must be an array",
  );
  const normalized = input.map(normalizeGateBinding);
  const seen = new Set<ReleaseVerificationGateName>();
  for (const binding of normalized) {
    assertAssembly(
      !seen.has(binding.gate_name),
      "RELEASE_VERIFICATION_ASSEMBLY_GATE_ORDER_INVALID",
      `gate_bindings must contain ${binding.gate_name} only once`,
    );
    seen.add(binding.gate_name);
  }
  assertAssembly(
    seen.size === RELEASE_VERIFICATION_MANIFEST_GATE_ORDER.length &&
      RELEASE_VERIFICATION_MANIFEST_GATE_ORDER.every((gateName) => seen.has(gateName)),
    "RELEASE_VERIFICATION_ASSEMBLY_GATE_ORDER_INVALID",
    "gate_bindings must contain every canonical blocking gate exactly once",
  );
  return normalized.sort(
    (left, right) =>
      RELEASE_VERIFICATION_MANIFEST_GATE_INDEX.get(left.gate_name)! -
      RELEASE_VERIFICATION_MANIFEST_GATE_INDEX.get(right.gate_name)!,
  );
}

function hasDeclaredCanonicalGateOrder(input: unknown) {
  if (!Array.isArray(input)) {
    return false;
  }
  return input.every(
    (entry, index) =>
      isPlainObject(entry) &&
      entry.gate_name === RELEASE_VERIFICATION_MANIFEST_GATE_ORDER[index],
  );
}

export function deriveReleaseVerificationManifestAssemblyContractHash(
  contract: Pick<
    ReleaseVerificationManifestAssemblyContractRecord,
    | "contract_version"
    | "candidate_identity_hash"
    | "compatibility_gate_hash"
    | "gate_order_policy"
    | "evidence_source_policy"
    | "admissibility_derivation_policy"
    | "companion_evidence_policy"
    | "decision_posture_policy"
    | "supersession_policy"
    | "enabled_provider_profile_refs"
    | "executed_test_run_identifiers"
    | "gate_bindings"
    | "migration_mode"
    | "migration_plan_ref_or_null"
    | "migration_ledger_refs"
    | "supported_client_window_ref"
    | "canary_summary_ref_or_null"
    | "deterministic_golden_pack_ref_or_null"
    | "restore_drill_ref_or_null"
    | "restore_checkpoint_ref_or_null"
    | "client_compatibility_matrix_ref_or_null"
    | "decision_state"
    | "approval_ref_or_null"
    | "deployment_release_ref_or_null"
    | "superseded_by_verification_manifest_ref_or_null"
  >,
) {
  const gateBindings = canonicalReleaseVerificationManifestGateBindings(
    contract.gate_bindings,
  );
  return stableJsonHash({
    contract_version: contract.contract_version,
    candidate_identity_hash: contract.candidate_identity_hash,
    compatibility_gate_hash: contract.compatibility_gate_hash,
    gate_order_policy: contract.gate_order_policy,
    evidence_source_policy: contract.evidence_source_policy,
    admissibility_derivation_policy: contract.admissibility_derivation_policy,
    companion_evidence_policy: contract.companion_evidence_policy,
    decision_posture_policy: contract.decision_posture_policy,
    supersession_policy: contract.supersession_policy,
    migration_mode: contract.migration_mode,
    supported_client_window_ref: contract.supported_client_window_ref,
    decision_state: contract.decision_state,
    migration_plan_ref_or_null: contract.migration_plan_ref_or_null,
    canary_summary_ref_or_null: contract.canary_summary_ref_or_null,
    deterministic_golden_pack_ref_or_null:
      contract.deterministic_golden_pack_ref_or_null,
    restore_drill_ref_or_null: contract.restore_drill_ref_or_null,
    restore_checkpoint_ref_or_null: contract.restore_checkpoint_ref_or_null,
    client_compatibility_matrix_ref_or_null:
      contract.client_compatibility_matrix_ref_or_null,
    approval_ref_or_null: contract.approval_ref_or_null,
    deployment_release_ref_or_null: contract.deployment_release_ref_or_null,
    superseded_by_verification_manifest_ref_or_null:
      contract.superseded_by_verification_manifest_ref_or_null,
    enabled_provider_profile_refs: [...contract.enabled_provider_profile_refs].sort(),
    executed_test_run_identifiers: [...contract.executed_test_run_identifiers].sort(),
    migration_ledger_refs: [...contract.migration_ledger_refs].sort(),
    gate_bindings: gateBindings,
  });
}

export type ReleaseVerificationManifestAssemblyExpectedMirrors = {
  candidate_identity_hash?: string;
  compatibility_gate_hash?: string;
  enabled_provider_profile_refs?: string[];
  executed_test_run_identifiers?: string[];
  migration_mode?: ReleaseVerificationMigrationMode;
  migration_plan_ref_or_null?: string | null;
  migration_ledger_refs?: string[];
  supported_client_window_ref?: string;
  canary_summary_ref_or_null?: string | null;
  deterministic_golden_pack_ref_or_null?: string | null;
  restore_drill_ref_or_null?: string | null;
  restore_checkpoint_ref_or_null?: string | null;
  client_compatibility_matrix_ref_or_null?: string | null;
  decision_state?: ReleaseVerificationAssemblyDecisionState;
  approval_ref_or_null?: string | null;
  deployment_release_ref_or_null?: string | null;
  superseded_by_verification_manifest_ref_or_null?: string | null;
};

function arraysEqual(left: readonly string[], right: readonly string[]) {
  return left.length === right.length && left.every((entry, index) => entry === right[index]);
}

export function normalizeReleaseVerificationManifestAssemblyContract(
  input: unknown,
  expected: ReleaseVerificationManifestAssemblyExpectedMirrors = {},
): ReleaseVerificationManifestAssemblyContractRecord {
  assertAssembly(
    isPlainObject(input),
    "RELEASE_VERIFICATION_ASSEMBLY_FIELD_INVALID",
    "release_verification_manifest_assembly_contract must be an object",
  );
  requirePolicyLiteral(
    "release_verification_manifest_assembly_contract.contract_version",
    input.contract_version,
    RELEASE_VERIFICATION_MANIFEST_ASSEMBLY_CONTRACT_VERSION,
  );
  const gateBindings = canonicalReleaseVerificationManifestGateBindings(
    input.gate_bindings,
  );
  assertAssembly(
    hasDeclaredCanonicalGateOrder(input.gate_bindings),
    "RELEASE_VERIFICATION_ASSEMBLY_GATE_ORDER_INVALID",
    "gate_bindings must be serialized in canonical blocking-gate order",
  );
  const enabledProviderProfileRefs = requireStringArray(
    "release_verification_manifest_assembly_contract.enabled_provider_profile_refs",
    input.enabled_provider_profile_refs,
  );
  const executedTestRunIdentifiers = requireStringArray(
    "release_verification_manifest_assembly_contract.executed_test_run_identifiers",
    input.executed_test_run_identifiers,
    false,
  );
  const migrationLedgerRefs = requireStringArray(
    "release_verification_manifest_assembly_contract.migration_ledger_refs",
    input.migration_ledger_refs,
  );
  const migrationMode = requireMigrationMode(input.migration_mode);
  const migrationPlanRef = requireNullableTrimmedString(
    "release_verification_manifest_assembly_contract.migration_plan_ref_or_null",
    input.migration_plan_ref_or_null,
  );
  assertAssembly(
    migrationMode === "NO_MIGRATION"
      ? migrationPlanRef === null && migrationLedgerRefs.length === 0
      : migrationPlanRef !== null && migrationLedgerRefs.length > 0,
    "RELEASE_VERIFICATION_ASSEMBLY_POLICY_INVALID",
    "migration_mode must mirror migration plan and ledger refs",
  );
  const restoreDrillRef = requireNullableTrimmedString(
    "release_verification_manifest_assembly_contract.restore_drill_ref_or_null",
    input.restore_drill_ref_or_null,
  );
  const restoreCheckpointRef = requireNullableTrimmedString(
    "release_verification_manifest_assembly_contract.restore_checkpoint_ref_or_null",
    input.restore_checkpoint_ref_or_null,
  );
  assertAssembly(
    (restoreDrillRef === null) === (restoreCheckpointRef === null),
    "RELEASE_VERIFICATION_ASSEMBLY_COMPANION_EVIDENCE_MISSING",
    "restore drill and checkpoint refs must be populated or cleared together",
  );
  const decisionState = requireDecisionState(input.decision_state);
  const approvalRef = requireNullableTrimmedString(
    "release_verification_manifest_assembly_contract.approval_ref_or_null",
    input.approval_ref_or_null,
  );
  const deploymentReleaseRef = requireNullableTrimmedString(
    "release_verification_manifest_assembly_contract.deployment_release_ref_or_null",
    input.deployment_release_ref_or_null,
  );
  const supersededByRef = requireNullableTrimmedString(
    "release_verification_manifest_assembly_contract.superseded_by_verification_manifest_ref_or_null",
    input.superseded_by_verification_manifest_ref_or_null,
  );

  const gateByName = Object.fromEntries(
    gateBindings.map((binding) => [binding.gate_name, binding]),
  ) as Record<ReleaseVerificationGateName, ReleaseVerificationGateBindingRecord>;
  const redGateNames = gateBindings
    .filter((binding) => binding.status === "RED")
    .map((binding) => binding.gate_name);
  if (decisionState === "APPROVED") {
    assertAssembly(
      redGateNames.length === 0 &&
        approvalRef !== null &&
        deploymentReleaseRef !== null &&
        supersededByRef === null,
      "RELEASE_VERIFICATION_ASSEMBLY_DECISION_INVALID",
      "APPROVED assembly requires all gates GREEN plus explicit approval and deployment refs",
    );
  }
  if (decisionState === "BLOCKED") {
    assertAssembly(
      redGateNames.length > 0 &&
        approvalRef === null &&
        deploymentReleaseRef === null &&
        supersededByRef === null,
      "RELEASE_VERIFICATION_ASSEMBLY_DECISION_INVALID",
      "BLOCKED assembly requires at least one RED gate and no approval/deployment/supersession refs",
    );
  }
  if (decisionState === "PENDING") {
    assertAssembly(
      approvalRef === null && deploymentReleaseRef === null && supersededByRef === null,
      "RELEASE_VERIFICATION_ASSEMBLY_DECISION_INVALID",
      "PENDING assembly cannot retain approval, deployment, or supersession refs",
    );
  }
  if (decisionState === "SUPERSEDED") {
    assertAssembly(
      approvalRef === null && deploymentReleaseRef === null && supersededByRef !== null,
      "RELEASE_VERIFICATION_ASSEMBLY_DECISION_INVALID",
      "SUPERSEDED assembly requires explicit supersession and no active approval/deployment refs",
    );
  }

  const canarySummaryRef = requireNullableTrimmedString(
    "release_verification_manifest_assembly_contract.canary_summary_ref_or_null",
    input.canary_summary_ref_or_null,
  );
  const deterministicGoldenPackRef = requireNullableTrimmedString(
    "release_verification_manifest_assembly_contract.deterministic_golden_pack_ref_or_null",
    input.deterministic_golden_pack_ref_or_null,
  );
  const clientCompatibilityMatrixRef = requireNullableTrimmedString(
    "release_verification_manifest_assembly_contract.client_compatibility_matrix_ref_or_null",
    input.client_compatibility_matrix_ref_or_null,
  );
  assertAssembly(
    gateByName.performance_and_canary.status !== "GREEN" || canarySummaryRef !== null,
    "RELEASE_VERIFICATION_ASSEMBLY_COMPANION_EVIDENCE_MISSING",
    "GREEN performance/canary gate requires canary_summary_ref_or_null",
  );
  assertAssembly(
    gateByName.deterministic_and_state_machine.status !== "GREEN" ||
      deterministicGoldenPackRef !== null,
    "RELEASE_VERIFICATION_ASSEMBLY_COMPANION_EVIDENCE_MISSING",
    "GREEN deterministic/state-machine gate requires deterministic_golden_pack_ref_or_null",
  );
  assertAssembly(
    gateByName.deterministic_and_state_machine.status === "GREEN" ||
      deterministicGoldenPackRef === null,
    "RELEASE_VERIFICATION_ASSEMBLY_COMPANION_EVIDENCE_MISSING",
    "deterministic_golden_pack_ref_or_null must stay null unless the deterministic gate is GREEN",
  );
  assertAssembly(
    gateByName.operator_client.status !== "GREEN" ||
      clientCompatibilityMatrixRef !== null,
    "RELEASE_VERIFICATION_ASSEMBLY_COMPANION_EVIDENCE_MISSING",
    "GREEN operator-client gate requires client_compatibility_matrix_ref_or_null",
  );
  assertAssembly(
    gateByName.restore_drill.status !== "GREEN" ||
      (restoreDrillRef !== null && restoreCheckpointRef !== null),
    "RELEASE_VERIFICATION_ASSEMBLY_COMPANION_EVIDENCE_MISSING",
    "GREEN restore-drill gate requires restore drill and checkpoint refs",
  );

  const candidateIdentityHash = requireTrimmedString(
    "release_verification_manifest_assembly_contract.candidate_identity_hash",
    input.candidate_identity_hash,
  );
  const compatibilityGateHash = requireTrimmedString(
    "release_verification_manifest_assembly_contract.compatibility_gate_hash",
    input.compatibility_gate_hash,
  );
  for (const binding of gateBindings) {
    assertAssembly(
      binding.candidate_identity_hash === candidateIdentityHash,
      "RELEASE_VERIFICATION_ASSEMBLY_POLICY_INVALID",
      `${binding.gate_name} candidate_identity_hash must mirror the assembly candidate hash`,
    );
    if (
      binding.gate_name === "schema_compatibility" ||
      binding.gate_name === "migration_verification" ||
      binding.gate_name === "operator_client"
    ) {
      assertAssembly(
        binding.compatibility_gate_hash_or_null === compatibilityGateHash,
        "RELEASE_VERIFICATION_ASSEMBLY_POLICY_INVALID",
        `${binding.gate_name} compatibility_gate_hash_or_null must mirror compatibility_gate_hash`,
      );
    }
  }

  const normalized: ReleaseVerificationManifestAssemblyContractRecord = {
    contract_version: RELEASE_VERIFICATION_MANIFEST_ASSEMBLY_CONTRACT_VERSION,
    assembly_contract_hash: requireTrimmedString(
      "release_verification_manifest_assembly_contract.assembly_contract_hash",
      input.assembly_contract_hash,
    ),
    candidate_identity_hash: candidateIdentityHash,
    compatibility_gate_hash: compatibilityGateHash,
    gate_order_policy: requirePolicyLiteral(
      "release_verification_manifest_assembly_contract.gate_order_policy",
      input.gate_order_policy,
      "CANONICAL_BLOCKING_GATE_ORDER_V1",
    ),
    evidence_source_policy: requirePolicyLiteral(
      "release_verification_manifest_assembly_contract.evidence_source_policy",
      input.evidence_source_policy,
      "FIRST_CLASS_RESULT_AND_ADMISSIBILITY_ARTIFACTS_ONLY",
    ),
    admissibility_derivation_policy: requirePolicyLiteral(
      "release_verification_manifest_assembly_contract.admissibility_derivation_policy",
      input.admissibility_derivation_policy,
      "GREEN_REQUIRES_ADMISSIBLE_UNQUARANTINED_UNWAIVED_EVIDENCE",
    ),
    companion_evidence_policy: requirePolicyLiteral(
      "release_verification_manifest_assembly_contract.companion_evidence_policy",
      input.companion_evidence_policy,
      "GREEN_SUPPORTING_GATES_REQUIRE_COMPANION_EVIDENCE_REFS",
    ),
    decision_posture_policy: requirePolicyLiteral(
      "release_verification_manifest_assembly_contract.decision_posture_policy",
      input.decision_posture_policy,
      "APPROVAL_AND_SUPERSESSION_REQUIRE_EXPLICIT_DECISION_LINEAGE",
    ),
    supersession_policy: requirePolicyLiteral(
      "release_verification_manifest_assembly_contract.supersession_policy",
      input.supersession_policy,
      "NEW_MANIFEST_SUPERSEDES_OLD_MANIFEST_EXPLICITLY_NO_POST_HOC_REWRITE",
    ),
    enabled_provider_profile_refs: enabledProviderProfileRefs,
    executed_test_run_identifiers: executedTestRunIdentifiers,
    gate_bindings: gateBindings,
    migration_mode: migrationMode,
    migration_plan_ref_or_null: migrationPlanRef,
    migration_ledger_refs: migrationLedgerRefs,
    supported_client_window_ref: requireTrimmedString(
      "release_verification_manifest_assembly_contract.supported_client_window_ref",
      input.supported_client_window_ref,
    ),
    canary_summary_ref_or_null: canarySummaryRef,
    deterministic_golden_pack_ref_or_null: deterministicGoldenPackRef,
    restore_drill_ref_or_null: restoreDrillRef,
    restore_checkpoint_ref_or_null: restoreCheckpointRef,
    client_compatibility_matrix_ref_or_null: clientCompatibilityMatrixRef,
    decision_state: decisionState,
    approval_ref_or_null: approvalRef,
    deployment_release_ref_or_null: deploymentReleaseRef,
    superseded_by_verification_manifest_ref_or_null: supersededByRef,
  };

  for (const [field, expectedValue] of Object.entries(expected)) {
    const actual = normalized[field as keyof typeof normalized];
    if (Array.isArray(expectedValue)) {
      assertAssembly(
        Array.isArray(actual) && actual.every((entry) => typeof entry === "string"),
        "RELEASE_VERIFICATION_ASSEMBLY_POLICY_INVALID",
        `${field} must mirror the expected assembly field`,
      );
      const actualStrings = actual as string[];
      assertAssembly(
        arraysEqual(actualStrings, [...expectedValue].sort()),
        "RELEASE_VERIFICATION_ASSEMBLY_POLICY_INVALID",
        `${field} must mirror the expected assembly field`,
      );
      continue;
    }
    assertAssembly(
      actual === expectedValue,
      "RELEASE_VERIFICATION_ASSEMBLY_POLICY_INVALID",
      `${field} must mirror the expected assembly field`,
    );
  }

  assertAssembly(
    normalized.assembly_contract_hash ===
      deriveReleaseVerificationManifestAssemblyContractHash(normalized),
    "RELEASE_VERIFICATION_ASSEMBLY_HASH_MISMATCH",
    "assembly_contract_hash must equal the canonical manifest-assembly hash",
  );
  return normalized;
}

export function buildReleaseVerificationManifestAssemblyContract(
  input: Omit<
    ReleaseVerificationManifestAssemblyContractRecord,
    | "contract_version"
    | "assembly_contract_hash"
    | "gate_order_policy"
    | "evidence_source_policy"
    | "admissibility_derivation_policy"
    | "companion_evidence_policy"
    | "decision_posture_policy"
    | "supersession_policy"
  >,
) {
  const contractWithoutHash = {
    contract_version: RELEASE_VERIFICATION_MANIFEST_ASSEMBLY_CONTRACT_VERSION,
    assembly_contract_hash: "",
    candidate_identity_hash: input.candidate_identity_hash,
    compatibility_gate_hash: input.compatibility_gate_hash,
    gate_order_policy: "CANONICAL_BLOCKING_GATE_ORDER_V1",
    evidence_source_policy: "FIRST_CLASS_RESULT_AND_ADMISSIBILITY_ARTIFACTS_ONLY",
    admissibility_derivation_policy:
      "GREEN_REQUIRES_ADMISSIBLE_UNQUARANTINED_UNWAIVED_EVIDENCE",
    companion_evidence_policy: "GREEN_SUPPORTING_GATES_REQUIRE_COMPANION_EVIDENCE_REFS",
    decision_posture_policy:
      "APPROVAL_AND_SUPERSESSION_REQUIRE_EXPLICIT_DECISION_LINEAGE",
    supersession_policy:
      "NEW_MANIFEST_SUPERSEDES_OLD_MANIFEST_EXPLICITLY_NO_POST_HOC_REWRITE",
    enabled_provider_profile_refs: input.enabled_provider_profile_refs,
    executed_test_run_identifiers: input.executed_test_run_identifiers,
    gate_bindings: canonicalReleaseVerificationManifestGateBindings(
      input.gate_bindings,
    ),
    migration_mode: input.migration_mode,
    migration_plan_ref_or_null: input.migration_plan_ref_or_null,
    migration_ledger_refs: input.migration_ledger_refs,
    supported_client_window_ref: input.supported_client_window_ref,
    canary_summary_ref_or_null: input.canary_summary_ref_or_null,
    deterministic_golden_pack_ref_or_null:
      input.deterministic_golden_pack_ref_or_null,
    restore_drill_ref_or_null: input.restore_drill_ref_or_null,
    restore_checkpoint_ref_or_null: input.restore_checkpoint_ref_or_null,
    client_compatibility_matrix_ref_or_null:
      input.client_compatibility_matrix_ref_or_null,
    decision_state: input.decision_state,
    approval_ref_or_null: input.approval_ref_or_null,
    deployment_release_ref_or_null: input.deployment_release_ref_or_null,
    superseded_by_verification_manifest_ref_or_null:
      input.superseded_by_verification_manifest_ref_or_null,
  } satisfies ReleaseVerificationManifestAssemblyContractRecord;
  contractWithoutHash.assembly_contract_hash =
    deriveReleaseVerificationManifestAssemblyContractHash(contractWithoutHash);
  return normalizeReleaseVerificationManifestAssemblyContract(contractWithoutHash);
}

export function assertReleaseVerificationManifestAssemblyContract(
  input: unknown,
  expected: ReleaseVerificationManifestAssemblyExpectedMirrors = {},
) {
  return normalizeReleaseVerificationManifestAssemblyContract(input, expected);
}

export function cloneReleaseVerificationManifestAssemblyContract(
  contract: ReleaseVerificationManifestAssemblyContractRecord,
) {
  return structuredClone(normalizeReleaseVerificationManifestAssemblyContract(contract));
}
