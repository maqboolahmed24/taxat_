import type { RecoveryGovernanceContract } from "../../../generated-models/src/generated/typescript/manifest-and-release.ts";
import {
  isPlainRecord,
  requireVerificationSuiteString,
} from "../services/canonicalize_verification_suite_scope.ts";

export type RecoveryGovernanceContractRecord = RecoveryGovernanceContract;
export type RecoveryGovernanceBoundaryScope =
  RecoveryGovernanceContractRecord["boundary_scope"];
export type ProtectedWorkloadClass =
  RecoveryGovernanceContractRecord["protected_workload_class"];
export type RecoveryTierClass =
  RecoveryGovernanceContractRecord["recovery_tier_class"];
export type RecoveryRpoClass = RecoveryGovernanceContractRecord["rpo_class"];
export type RecoveryRtoClass = RecoveryGovernanceContractRecord["rto_class"];

export const RECOVERY_GOVERNANCE_CONTRACT_VERSION =
  "RECOVERY_GOVERNANCE_V1";
export const RECOVERY_GOVERNANCE_SCHEMA_ID =
  "https://taxat.dev/schemas/recovery_governance_contract.schema.json";

export const PROTECTED_WORKLOAD_CLASSES = [
  "CONTROL_PLANE_LEGAL_TRUTH",
  "REBUILDABLE_PROJECTION",
  "DISPOSABLE_RUNTIME_CACHE",
] as const satisfies readonly ProtectedWorkloadClass[];

export const RECOVERY_GOVERNANCE_BOUNDARY_POLICIES = {
  DEPLOYMENT_RELEASE: "RELEASE_RETAINS_ROLLBACK_BOUNDARY_AND_FAIL_FORWARD_GOVERNANCE",
  RECOVERY_CHECKPOINT:
    "CHECKPOINT_RETAINS_INVENTORY_RESTORE_EVIDENCE_AND_REOPEN_GATES",
} as const satisfies Record<
  RecoveryGovernanceBoundaryScope,
  RecoveryGovernanceContractRecord["boundary_specific_binding_policy"]
>;

export const RECOVERY_TIER_BY_PROTECTED_WORKLOAD_CLASS = {
  CONTROL_PLANE_LEGAL_TRUTH: {
    recovery_tier_class: "TIER_0_CONTROL_PLANE",
    rpo_class: "RPO_15M",
    rto_class: "RTO_60M",
  },
  DISPOSABLE_RUNTIME_CACHE: {
    recovery_tier_class: "TIER_2_DISPOSABLE",
    rpo_class: "RPO_BEST_EFFORT",
    rto_class: "RTO_24H",
  },
  REBUILDABLE_PROJECTION: {
    recovery_tier_class: "TIER_1_REBUILDABLE",
    rpo_class: "RPO_4H",
    rto_class: "RTO_4H",
  },
} as const satisfies Record<
  ProtectedWorkloadClass,
  {
    recovery_tier_class: RecoveryTierClass;
    rpo_class: RecoveryRpoClass;
    rto_class: RecoveryRtoClass;
  }
>;

export type RecoveryGovernanceContractModelErrorCode =
  | "RECOVERY_GOVERNANCE_FIELD_INVALID"
  | "RECOVERY_GOVERNANCE_BOUNDARY_INVALID"
  | "RECOVERY_GOVERNANCE_TIER_INVALID"
  | "RECOVERY_GOVERNANCE_POLICY_INVALID";

export class RecoveryGovernanceContractModelError extends Error {
  readonly code: RecoveryGovernanceContractModelErrorCode;

  constructor(code: RecoveryGovernanceContractModelErrorCode, detail: string) {
    super(`${code}: ${detail}`);
    this.name = "RecoveryGovernanceContractModelError";
    this.code = code;
  }
}

function assertRecoveryGovernance(
  condition: unknown,
  code: RecoveryGovernanceContractModelErrorCode,
  detail: string,
): asserts condition {
  if (!condition) {
    throw new RecoveryGovernanceContractModelError(code, detail);
  }
}

function requireBoundaryScope(value: unknown): RecoveryGovernanceBoundaryScope {
  assertRecoveryGovernance(
    value === "RECOVERY_CHECKPOINT" || value === "DEPLOYMENT_RELEASE",
    "RECOVERY_GOVERNANCE_FIELD_INVALID",
    "boundary_scope must be RECOVERY_CHECKPOINT or DEPLOYMENT_RELEASE",
  );
  return value;
}

function requireProtectedWorkloadClass(value: unknown): ProtectedWorkloadClass {
  assertRecoveryGovernance(
    typeof value === "string" &&
      PROTECTED_WORKLOAD_CLASSES.includes(value as ProtectedWorkloadClass),
    "RECOVERY_GOVERNANCE_FIELD_INVALID",
    "protected_workload_class must be a governed recovery workload class",
  );
  return value as ProtectedWorkloadClass;
}

function requireTierClass(value: unknown): RecoveryTierClass {
  assertRecoveryGovernance(
    value === "TIER_0_CONTROL_PLANE" ||
      value === "TIER_1_REBUILDABLE" ||
      value === "TIER_2_DISPOSABLE",
    "RECOVERY_GOVERNANCE_FIELD_INVALID",
    "recovery_tier_class must be a governed recovery tier",
  );
  return value;
}

function requireRpoClass(value: unknown): RecoveryRpoClass {
  assertRecoveryGovernance(
    value === "RPO_15M" ||
      value === "RPO_4H" ||
      value === "RPO_BEST_EFFORT",
    "RECOVERY_GOVERNANCE_FIELD_INVALID",
    "rpo_class must be a governed RPO class",
  );
  return value;
}

function requireRtoClass(value: unknown): RecoveryRtoClass {
  assertRecoveryGovernance(
    value === "RTO_60M" || value === "RTO_4H" || value === "RTO_24H",
    "RECOVERY_GOVERNANCE_FIELD_INVALID",
    "rto_class must be a governed RTO class",
  );
  return value;
}

function requirePolicyLiteral<T extends string>(
  label: string,
  actual: unknown,
  expected: T,
) {
  assertRecoveryGovernance(
    actual === expected,
    "RECOVERY_GOVERNANCE_POLICY_INVALID",
    `${label} must stay ${expected}`,
  );
  return expected;
}

export type RecoveryGovernanceExpectedMirrors = {
  boundary_scope?: RecoveryGovernanceBoundaryScope;
  protected_workload_class?: ProtectedWorkloadClass;
  recovery_tier_class?: RecoveryTierClass;
  rpo_class?: RecoveryRpoClass;
  rto_class?: RecoveryRtoClass;
};

export function normalizeRecoveryGovernanceContract(
  input: unknown,
  expected: RecoveryGovernanceExpectedMirrors = {},
): RecoveryGovernanceContractRecord {
  assertRecoveryGovernance(
    isPlainRecord(input),
    "RECOVERY_GOVERNANCE_FIELD_INVALID",
    "recovery_governance_contract must be an object",
  );
  const boundaryScope = requireBoundaryScope(input.boundary_scope);
  const protectedWorkloadClass = requireProtectedWorkloadClass(
    input.protected_workload_class,
  );
  const recoveryTierClass = requireTierClass(input.recovery_tier_class);
  const rpoClass = requireRpoClass(input.rpo_class);
  const rtoClass = requireRtoClass(input.rto_class);
  const expectedTier =
    RECOVERY_TIER_BY_PROTECTED_WORKLOAD_CLASS[protectedWorkloadClass];
  const expectedBoundaryPolicy =
    RECOVERY_GOVERNANCE_BOUNDARY_POLICIES[boundaryScope];

  assertRecoveryGovernance(
    recoveryTierClass === expectedTier.recovery_tier_class &&
      rpoClass === expectedTier.rpo_class &&
      rtoClass === expectedTier.rto_class,
    "RECOVERY_GOVERNANCE_TIER_INVALID",
    "protected_workload_class cannot serialize a weaker or mismatched recovery tier, RPO, or RTO",
  );
  assertRecoveryGovernance(
    expected.boundary_scope === undefined ||
      boundaryScope === expected.boundary_scope,
    "RECOVERY_GOVERNANCE_BOUNDARY_INVALID",
    `boundary_scope must be ${expected.boundary_scope}`,
  );
  assertRecoveryGovernance(
    expected.protected_workload_class === undefined ||
      protectedWorkloadClass === expected.protected_workload_class,
    "RECOVERY_GOVERNANCE_TIER_INVALID",
    `protected_workload_class must be ${expected.protected_workload_class}`,
  );
  assertRecoveryGovernance(
    expected.recovery_tier_class === undefined ||
      recoveryTierClass === expected.recovery_tier_class,
    "RECOVERY_GOVERNANCE_TIER_INVALID",
    `recovery_tier_class must be ${expected.recovery_tier_class}`,
  );
  assertRecoveryGovernance(
    expected.rpo_class === undefined || rpoClass === expected.rpo_class,
    "RECOVERY_GOVERNANCE_TIER_INVALID",
    `rpo_class must be ${expected.rpo_class}`,
  );
  assertRecoveryGovernance(
    expected.rto_class === undefined || rtoClass === expected.rto_class,
    "RECOVERY_GOVERNANCE_TIER_INVALID",
    `rto_class must be ${expected.rto_class}`,
  );

  return {
    contract_version: requirePolicyLiteral(
      "recovery_governance_contract.contract_version",
      input.contract_version,
      RECOVERY_GOVERNANCE_CONTRACT_VERSION,
    ),
    boundary_scope: boundaryScope,
    protected_workload_class: protectedWorkloadClass,
    recovery_tier_class: recoveryTierClass,
    rpo_class: rpoClass,
    rto_class: rtoClass,
    boundary_specific_binding_policy: requirePolicyLiteral(
      "recovery_governance_contract.boundary_specific_binding_policy",
      input.boundary_specific_binding_policy,
      expectedBoundaryPolicy,
    ),
    checkpoint_inventory_policy: requirePolicyLiteral(
      "recovery_governance_contract.checkpoint_inventory_policy",
      input.checkpoint_inventory_policy,
      "CHECKPOINTS_REQUIRED_AND_INVENTORY_LINKED",
    ),
    checkpoint_evidence_policy: requirePolicyLiteral(
      "recovery_governance_contract.checkpoint_evidence_policy",
      input.checkpoint_evidence_policy,
      "VERIFIED_CHECKPOINT_REQUIRES_BOUND_RESTORE_DRILL",
    ),
    privacy_reconciliation_policy: requirePolicyLiteral(
      "recovery_governance_contract.privacy_reconciliation_policy",
      input.privacy_reconciliation_policy,
      "POST_RESTORE_PRIVACY_RECONCILIATION_REQUIRED_BEFORE_REOPEN",
    ),
    compensating_re_erasure_policy: requirePolicyLiteral(
      "recovery_governance_contract.compensating_re_erasure_policy",
      input.compensating_re_erasure_policy,
      "RESURRECTED_RESTRICTED_DATA_REQUIRES_TYPED_COMPENSATING_RE_ERASURE",
    ),
    limitation_reconciliation_policy: requirePolicyLiteral(
      "recovery_governance_contract.limitation_reconciliation_policy",
      input.limitation_reconciliation_policy,
      "REPLAY_AND_ENQUIRY_LIMITATIONS_MUST_REMAIN_REOPEN_SAFE",
    ),
    queue_recovery_policy: requirePolicyLiteral(
      "recovery_governance_contract.queue_recovery_policy",
      input.queue_recovery_policy,
      "QUEUES_REBUILT_FROM_DURABLE_TRUTH_ONLY",
    ),
    authority_recovery_policy: requirePolicyLiteral(
      "recovery_governance_contract.authority_recovery_policy",
      input.authority_recovery_policy,
      "AUTHORITY_MUTATIONS_REQUIRE_LINEAGE_AND_BINDING_REVALIDATION",
    ),
    reopen_gate_policy: requirePolicyLiteral(
      "recovery_governance_contract.reopen_gate_policy",
      input.reopen_gate_policy,
      "REOPEN_BLOCKED_UNTIL_RESTORE_PRIVACY_AUDIT_QUEUE_AND_AUTHORITY_PASS",
    ),
    rollback_boundary_policy: requirePolicyLiteral(
      "recovery_governance_contract.rollback_boundary_policy",
      input.rollback_boundary_policy,
      "ROLLBACK_ONLY_WHILE_SCHEMA_WINDOW_COMPATIBLE",
    ),
    fail_forward_policy: requirePolicyLiteral(
      "recovery_governance_contract.fail_forward_policy",
      input.fail_forward_policy,
      "FAIL_FORWARD_REQUIRES_COMPENSATING_RELEASE_AND_OWNER",
    ),
    failover_audit_policy: requirePolicyLiteral(
      "recovery_governance_contract.failover_audit_policy",
      input.failover_audit_policy,
      "FAILOVER_AND_FAILBACK_REQUIRE_AUDITABLE_OWNER",
    ),
  };
}

export type BuildRecoveryGovernanceContractInput = {
  boundary_scope: RecoveryGovernanceBoundaryScope;
  protected_workload_class: ProtectedWorkloadClass;
  attempted_recovery_tier_class?: RecoveryTierClass;
  attempted_rpo_class?: RecoveryRpoClass;
  attempted_rto_class?: RecoveryRtoClass;
};

export function buildRecoveryGovernanceContract(
  input: BuildRecoveryGovernanceContractInput,
): RecoveryGovernanceContractRecord {
  const mapping =
    RECOVERY_TIER_BY_PROTECTED_WORKLOAD_CLASS[input.protected_workload_class];
  if (
    (input.attempted_recovery_tier_class !== undefined &&
      input.attempted_recovery_tier_class !== mapping.recovery_tier_class) ||
    (input.attempted_rpo_class !== undefined &&
      input.attempted_rpo_class !== mapping.rpo_class) ||
    (input.attempted_rto_class !== undefined &&
      input.attempted_rto_class !== mapping.rto_class)
  ) {
    throw new RecoveryGovernanceContractModelError(
      "RECOVERY_GOVERNANCE_TIER_INVALID",
      "protected_workload_class cannot serialize a weaker or mismatched recovery tier, RPO, or RTO",
    );
  }
  return normalizeRecoveryGovernanceContract({
    contract_version: RECOVERY_GOVERNANCE_CONTRACT_VERSION,
    boundary_scope: input.boundary_scope,
    protected_workload_class: input.protected_workload_class,
    recovery_tier_class: mapping.recovery_tier_class,
    rpo_class: mapping.rpo_class,
    rto_class: mapping.rto_class,
    boundary_specific_binding_policy:
      RECOVERY_GOVERNANCE_BOUNDARY_POLICIES[input.boundary_scope],
    checkpoint_inventory_policy: "CHECKPOINTS_REQUIRED_AND_INVENTORY_LINKED",
    checkpoint_evidence_policy: "VERIFIED_CHECKPOINT_REQUIRES_BOUND_RESTORE_DRILL",
    privacy_reconciliation_policy:
      "POST_RESTORE_PRIVACY_RECONCILIATION_REQUIRED_BEFORE_REOPEN",
    compensating_re_erasure_policy:
      "RESURRECTED_RESTRICTED_DATA_REQUIRES_TYPED_COMPENSATING_RE_ERASURE",
    limitation_reconciliation_policy:
      "REPLAY_AND_ENQUIRY_LIMITATIONS_MUST_REMAIN_REOPEN_SAFE",
    queue_recovery_policy: "QUEUES_REBUILT_FROM_DURABLE_TRUTH_ONLY",
    authority_recovery_policy:
      "AUTHORITY_MUTATIONS_REQUIRE_LINEAGE_AND_BINDING_REVALIDATION",
    reopen_gate_policy:
      "REOPEN_BLOCKED_UNTIL_RESTORE_PRIVACY_AUDIT_QUEUE_AND_AUTHORITY_PASS",
    rollback_boundary_policy: "ROLLBACK_ONLY_WHILE_SCHEMA_WINDOW_COMPATIBLE",
    fail_forward_policy: "FAIL_FORWARD_REQUIRES_COMPENSATING_RELEASE_AND_OWNER",
    failover_audit_policy: "FAILOVER_AND_FAILBACK_REQUIRE_AUDITABLE_OWNER",
  });
}

export function buildDeploymentReleaseRecoveryGovernanceContract() {
  return buildRecoveryGovernanceContract({
    boundary_scope: "DEPLOYMENT_RELEASE",
    protected_workload_class: "CONTROL_PLANE_LEGAL_TRUTH",
  }) as RecoveryGovernanceContractRecord & {
    boundary_scope: "DEPLOYMENT_RELEASE";
    protected_workload_class: "CONTROL_PLANE_LEGAL_TRUTH";
    recovery_tier_class: "TIER_0_CONTROL_PLANE";
    rpo_class: "RPO_15M";
    rto_class: "RTO_60M";
    boundary_specific_binding_policy: "RELEASE_RETAINS_ROLLBACK_BOUNDARY_AND_FAIL_FORWARD_GOVERNANCE";
  };
}

export function normalizeDeploymentReleaseRecoveryGovernanceContract(
  input: unknown,
) {
  return normalizeRecoveryGovernanceContract(input, {
    boundary_scope: "DEPLOYMENT_RELEASE",
    protected_workload_class: "CONTROL_PLANE_LEGAL_TRUTH",
    recovery_tier_class: "TIER_0_CONTROL_PLANE",
    rpo_class: "RPO_15M",
    rto_class: "RTO_60M",
  }) as ReturnType<typeof buildDeploymentReleaseRecoveryGovernanceContract>;
}

export function recoveryGovernanceContractRef(input: {
  boundary_scope: RecoveryGovernanceBoundaryScope;
  protected_workload_class: ProtectedWorkloadClass;
}) {
  return `recovery-governance://${requireVerificationSuiteString(
    "recovery_governance_contract.boundary_scope",
    input.boundary_scope,
  )}/${requireVerificationSuiteString(
    "recovery_governance_contract.protected_workload_class",
    input.protected_workload_class,
  )}`;
}
