import type {
  GovernanceMutationHazardContract as SchemaGovernanceMutationHazardContract,
  GovernanceMutationHazardContractApprovalTriggerCode,
  GovernanceMutationHazardContractBoundedSafetyBlockerCode,
  GovernanceMutationHazardContractConfidenceLimiterCode,
  GovernanceMutationHazardContractImpactedCountClass,
  GovernanceMutationHazardContractRiskDriverCode,
} from "../../../generated-models/src/generated/typescript/governance-and-policy.ts";
import {
  asTaxatHash,
  unwrapIdentifier,
} from "../../../domain-kernel/src/primitives/identifier.ts";

import {
  normalizeStringSet,
  requireTrimmedString,
} from "../services/principal_context_normalizer.ts";
import { deriveGovernanceMutationHazardContractHash } from "../hash/hazard_contract_hash.ts";

export type GovernanceMutationHazardContractRecord =
  SchemaGovernanceMutationHazardContract;

export const GOVERNANCE_MUTATION_HAZARD_CONTRACT_VERSION =
  "GOVERNANCE_MUTATION_HAZARD_CONTRACT_V1" as const;
export const GOVERNANCE_IMPACT_COUNT_CLASS_PROFILE_CODE =
  "GOVERNANCE_IMPACT_COUNT_CLASS_V1" as const;

export const GOVERNANCE_MUTATION_RISK_DRIVER_CODES = [
  "PRIVILEGE_GAIN",
  "SCOPE_EXPANSION",
  "MASKING_RELAXATION",
  "BROAD_BLAST_RADIUS",
] as const satisfies GovernanceMutationHazardContractRiskDriverCode[];

export const GOVERNANCE_MUTATION_APPROVAL_TRIGGER_CODES = [
  "SINGLE_APPROVER_REQUIRED",
  "DUAL_APPROVER_REQUIRED",
  "SECURITY_REVIEW_REQUIRED",
  "CHANGE_ADVISORY_QUORUM_REQUIRED",
] as const satisfies GovernanceMutationHazardContractApprovalTriggerCode[];

export const GOVERNANCE_MUTATION_CONFIDENCE_LIMITER_CODES = [
  "LOW_SIMULATION_CONFIDENCE",
  "LOW_PREDICTABILITY",
] as const satisfies GovernanceMutationHazardContractConfidenceLimiterCode[];

export const GOVERNANCE_MUTATION_BOUNDED_SAFETY_BLOCKER_CODES = [
  "PRIVILEGE_GAIN_PRESENT",
  "SCOPE_EXPANSION_PRESENT",
  "MASKING_RELAXATION_PRESENT",
  "IMPACT_RADIUS_TOO_LARGE",
  "POLICY_RISK_TOO_HIGH",
  "CONFIDENCE_TOO_LOW",
  "PREDICTABILITY_TOO_LOW",
] as const satisfies GovernanceMutationHazardContractBoundedSafetyBlockerCode[];

export type GovernanceMutationApprovalRequirement =
  GovernanceMutationHazardContractRecord["approval_requirement"];
export type GovernanceMutationCommitAuthorityPosture =
  GovernanceMutationHazardContractRecord["commit_authority_posture"];
export type GovernanceMutationHazardCountClass =
  GovernanceMutationHazardContractRecord["impacted_principal_count_class"];

export type CreateGovernanceMutationHazardContractInput = Omit<
  GovernanceMutationHazardContractRecord,
  | "contract_version"
  | "hazard_contract_hash"
  | "count_class_profile_code"
  | "impacted_principal_count_class"
  | "impacted_client_count_class"
  | "impacted_authority_operation_count_class"
  | "impacted_workflow_count_class"
  | "impacted_limitation_count_class"
  | "policy_risk_score"
  | "approval_necessity_score"
  | "approval_requirement"
  | "bounded_safe_mutation"
  | "required_approvals"
  | "commit_authority_posture"
  | "risk_driver_codes"
  | "approval_trigger_codes"
  | "confidence_limiter_codes"
  | "bounded_safety_blocker_codes"
  | "reason_codes"
> & {
  approval_necessity_score?: number;
  approval_requirement?: GovernanceMutationHazardContractRecord["approval_requirement"];
  approval_trigger_codes?: GovernanceMutationHazardContractRecord["approval_trigger_codes"];
  bounded_safe_mutation?: GovernanceMutationHazardContractRecord["bounded_safe_mutation"];
  bounded_safety_blocker_codes?: GovernanceMutationHazardContractRecord["bounded_safety_blocker_codes"];
  commit_authority_posture?: GovernanceMutationHazardContractRecord["commit_authority_posture"];
  confidence_limiter_codes?: GovernanceMutationHazardContractRecord["confidence_limiter_codes"];
  contract_version?: typeof GOVERNANCE_MUTATION_HAZARD_CONTRACT_VERSION;
  count_class_profile_code?: typeof GOVERNANCE_IMPACT_COUNT_CLASS_PROFILE_CODE;
  hazard_contract_hash?: string;
  policy_risk_score?: number;
  reason_codes?: string[];
  required_approvals?: string[];
  risk_driver_codes?: GovernanceMutationHazardContractRecord["risk_driver_codes"];
};

type GovernanceMutationHazardContractModelErrorCode =
  | "GOVERNANCE_MUTATION_HAZARD_CONTRACT_FIELD_REQUIRED"
  | "GOVERNANCE_MUTATION_HAZARD_CONTRACT_HASH_MISMATCH"
  | "GOVERNANCE_MUTATION_HAZARD_CONTRACT_INVALID";

export class GovernanceMutationHazardContractModelError extends Error {
  readonly code: GovernanceMutationHazardContractModelErrorCode;

  constructor(
    code: GovernanceMutationHazardContractModelErrorCode,
    detail: string,
  ) {
    super(`${code}: ${detail}`);
    this.name = "GovernanceMutationHazardContractModelError";
    this.code = code;
  }
}

function assertCondition(
  condition: unknown,
  code: GovernanceMutationHazardContractModelErrorCode,
  detail: string,
): asserts condition {
  if (!condition) {
    throw new GovernanceMutationHazardContractModelError(code, detail);
  }
}

function clamp01(value: number) {
  return Math.max(0, Math.min(1, value));
}

function roundScore(value: number) {
  return Math.max(0, Math.min(100, Math.floor(value + 0.5)));
}

function normalizeHash(label: string, value: unknown, family: string) {
  return unwrapIdentifier(asTaxatHash(requireTrimmedString(label, value), family));
}

function normalizeNonNegativeInteger(label: string, value: unknown) {
  assertCondition(
    typeof value === "number" && Number.isInteger(value) && value >= 0,
    "GOVERNANCE_MUTATION_HAZARD_CONTRACT_FIELD_REQUIRED",
    `${label} must be a non-negative integer`,
  );
  return value;
}

function normalizeScore(label: string, value: unknown) {
  const score = normalizeNonNegativeInteger(label, value);
  assertCondition(
    score <= 100,
    "GOVERNANCE_MUTATION_HAZARD_CONTRACT_FIELD_REQUIRED",
    `${label} must be an integer in [0,100]`,
  );
  return score;
}

function normalizeBinary(label: string, value: unknown) {
  assertCondition(
    value === 0 || value === 1,
    "GOVERNANCE_MUTATION_HAZARD_CONTRACT_FIELD_REQUIRED",
    `${label} must be 0 or 1`,
  );
  return value;
}

function normalizeEnumSequence<T extends string>(
  label: string,
  values: readonly string[] | undefined,
  order: readonly T[],
) {
  const normalized = normalizeStringSet(label, values ?? []);
  const supported = new Set<string>(order);

  for (const value of normalized) {
    assertCondition(
      supported.has(value),
      "GOVERNANCE_MUTATION_HAZARD_CONTRACT_INVALID",
      `${label} contains unsupported code ${value}`,
    );
  }

  const orderMap = new Map(order.map((value, index) => [value, index] as const));
  return [...normalized].sort(
    (left, right) =>
      (orderMap.get(left as T) ?? Number.MAX_SAFE_INTEGER) -
        (orderMap.get(right as T) ?? Number.MAX_SAFE_INTEGER) ||
      left.localeCompare(right),
  ) as T[];
}

function arraysEqual(left: readonly string[], right: readonly string[]) {
  return (
    left.length === right.length &&
    left.every((value, index) => value === right[index])
  );
}

export function expectedGovernanceImpactedCountClass(
  count: number,
): GovernanceMutationHazardCountClass {
  if (count === 0) {
    return "ZERO";
  }
  if (count === 1) {
    return "ONE";
  }
  if (count <= 5) {
    return "SMALL_BATCH";
  }
  if (count <= 20) {
    return "MEDIUM_BATCH";
  }
  if (count <= 100) {
    return "LARGE_BATCH";
  }
  return "ESTATE_WIDE";
}

function governanceScoreRatio(value: number) {
  return clamp01(value / 100);
}

export function expectedGovernancePolicyRiskScore(input: {
  impact_radius_upper_score: number;
  masking_relaxation_score: number;
  privilege_gain_score: number;
  scope_expansion_score: number;
}) {
  const d_priv = governanceScoreRatio(input.privilege_gain_score);
  const d_scope = governanceScoreRatio(input.scope_expansion_score);
  const d_mask = governanceScoreRatio(input.masking_relaxation_score);
  const d_tail = governanceScoreRatio(input.impact_radius_upper_score);
  const policyRiskRaw =
    1 -
    (1 - d_priv) ** 0.4 *
      (1 - d_scope) ** 0.25 *
      (1 - d_mask) ** 0.2 *
      (1 - d_tail) ** 0.15;
  return roundScore(100 * policyRiskRaw);
}

export function expectedGovernanceApprovalNecessityScore(input: {
  impact_radius_upper_score: number;
  policy_risk_score: number;
}) {
  const policyRiskScore = governanceScoreRatio(input.policy_risk_score);
  const impactRadiusUpperScore = governanceScoreRatio(input.impact_radius_upper_score);
  const approvalNecessityRaw =
    1 -
    (1 - policyRiskScore) ** 0.7 * (1 - impactRadiusUpperScore) ** 0.3;
  return roundScore(100 * approvalNecessityRaw);
}

export function expectedGovernanceBoundedSafeMutation(input: {
  impact_radius_upper_score: number;
  masking_relaxation_score: number;
  policy_risk_score: number;
  predictability_score: number;
  privilege_gain_score: number;
  scope_expansion_score: number;
  simulation_confidence_score: number;
}) {
  return (
    input.privilege_gain_score === 0 &&
    input.scope_expansion_score === 0 &&
    input.masking_relaxation_score === 0 &&
    input.impact_radius_upper_score < 5 &&
    input.policy_risk_score < 15 &&
    input.simulation_confidence_score >= 90 &&
    input.predictability_score >= 85
  )
    ? 1
    : 0;
}

export function expectedGovernanceApprovalRequirement(input: {
  approval_necessity_score: number;
  bounded_safe_mutation: 0 | 1;
}) {
  if (input.bounded_safe_mutation === 1) {
    return "NOT_REQUIRED" as const;
  }
  if (input.approval_necessity_score >= 80) {
    return "CHANGE_ADVISORY_QUORUM" as const;
  }
  if (input.approval_necessity_score >= 55) {
    return "SECURITY_REVIEW" as const;
  }
  if (input.approval_necessity_score >= 30) {
    return "DUAL_APPROVER" as const;
  }
  return "SINGLE_APPROVER" as const;
}

export function governanceRequiredApprovalsForRequirement(
  approvalRequirement: GovernanceMutationApprovalRequirement,
) {
  const mapping: Record<GovernanceMutationApprovalRequirement, string[]> = {
    NOT_REQUIRED: [],
    SINGLE_APPROVER: ["TENANT_ADMIN"],
    DUAL_APPROVER: ["SECURITY_TEAM", "TENANT_ADMIN"],
    SECURITY_REVIEW: ["SECURITY_TEAM"],
    CHANGE_ADVISORY_QUORUM: ["CHANGE_BOARD", "SECURITY_TEAM", "TENANT_ADMIN"],
  };
  return normalizeStringSet(
    "required_approvals",
    mapping[approvalRequirement],
  );
}

export function expectedGovernanceMutationRiskDriverCodes(input: {
  impact_radius_upper_score: number;
  masking_relaxation_score: number;
  privilege_gain_score: number;
  scope_expansion_score: number;
}) {
  const codes: GovernanceMutationHazardContractRiskDriverCode[] = [];
  if (input.privilege_gain_score > 0) {
    codes.push("PRIVILEGE_GAIN");
  }
  if (input.scope_expansion_score > 0) {
    codes.push("SCOPE_EXPANSION");
  }
  if (input.masking_relaxation_score > 0) {
    codes.push("MASKING_RELAXATION");
  }
  if (input.impact_radius_upper_score >= 25) {
    codes.push("BROAD_BLAST_RADIUS");
  }
  return codes;
}

export function expectedGovernanceMutationApprovalTriggerCodes(
  approvalRequirement: GovernanceMutationApprovalRequirement,
) {
  const codeByRequirement: Partial<
    Record<
      GovernanceMutationApprovalRequirement,
      GovernanceMutationHazardContractApprovalTriggerCode
    >
  > = {
    SINGLE_APPROVER: "SINGLE_APPROVER_REQUIRED",
    DUAL_APPROVER: "DUAL_APPROVER_REQUIRED",
    SECURITY_REVIEW: "SECURITY_REVIEW_REQUIRED",
    CHANGE_ADVISORY_QUORUM: "CHANGE_ADVISORY_QUORUM_REQUIRED",
  };
  const code = codeByRequirement[approvalRequirement];
  return code === undefined ? [] : [code];
}

export function expectedGovernanceMutationConfidenceLimiterCodes(input: {
  predictability_score: number;
  simulation_confidence_score: number;
}) {
  const codes: GovernanceMutationHazardContractConfidenceLimiterCode[] = [];
  if (input.simulation_confidence_score < 80) {
    codes.push("LOW_SIMULATION_CONFIDENCE");
  }
  if (input.predictability_score < 75) {
    codes.push("LOW_PREDICTABILITY");
  }
  return codes;
}

export function expectedGovernanceMutationBoundedSafetyBlockerCodes(input: {
  impact_radius_upper_score: number;
  masking_relaxation_score: number;
  policy_risk_score: number;
  predictability_score: number;
  privilege_gain_score: number;
  scope_expansion_score: number;
  simulation_confidence_score: number;
}) {
  const codes: GovernanceMutationHazardContractBoundedSafetyBlockerCode[] = [];
  if (input.privilege_gain_score > 0) {
    codes.push("PRIVILEGE_GAIN_PRESENT");
  }
  if (input.scope_expansion_score > 0) {
    codes.push("SCOPE_EXPANSION_PRESENT");
  }
  if (input.masking_relaxation_score > 0) {
    codes.push("MASKING_RELAXATION_PRESENT");
  }
  if (input.impact_radius_upper_score >= 5) {
    codes.push("IMPACT_RADIUS_TOO_LARGE");
  }
  if (input.policy_risk_score >= 15) {
    codes.push("POLICY_RISK_TOO_HIGH");
  }
  if (input.simulation_confidence_score < 90) {
    codes.push("CONFIDENCE_TOO_LOW");
  }
  if (input.predictability_score < 85) {
    codes.push("PREDICTABILITY_TOO_LOW");
  }
  return codes;
}

export function expectedGovernanceCommitAuthorityPosture(input: {
  bounded_safe_mutation: 0 | 1;
  predictability_score: number;
  simulation_confidence_score: number;
}): GovernanceMutationCommitAuthorityPosture {
  if (
    input.simulation_confidence_score < 80 ||
    input.predictability_score < 75
  ) {
    return "PREVIEW_ONLY";
  }
  return input.bounded_safe_mutation === 1 ? "BOUNDED_SAFE" : "APPROVAL_GATED";
}

export function normalizeGovernanceMutationHazardContract(
  input: CreateGovernanceMutationHazardContractInput,
): GovernanceMutationHazardContractRecord {
  try {
    const contract_version =
      input.contract_version ?? GOVERNANCE_MUTATION_HAZARD_CONTRACT_VERSION;
    const count_class_profile_code =
      input.count_class_profile_code ?? GOVERNANCE_IMPACT_COUNT_CLASS_PROFILE_CODE;
    const policy_snapshot_hash = normalizeHash(
      "policy_snapshot_hash",
      input.policy_snapshot_hash,
      "policy_snapshot",
    );
    const access_binding_hash = normalizeHash(
      "access_binding_hash",
      input.access_binding_hash,
      "access_binding",
    );
    const dependency_topology_hash = normalizeHash(
      "dependency_topology_hash",
      input.dependency_topology_hash,
      "dependency_topology",
    );
    const simulation_basis_hash = normalizeHash(
      "simulation_basis_hash",
      input.simulation_basis_hash,
      "simulation_basis",
    );
    const impact_radius_lower_score = normalizeScore(
      "impact_radius_lower_score",
      input.impact_radius_lower_score,
    );
    const impact_radius_upper_score = normalizeScore(
      "impact_radius_upper_score",
      input.impact_radius_upper_score,
    );
    const impacted_principal_count = normalizeNonNegativeInteger(
      "impacted_principal_count",
      input.impacted_principal_count,
    );
    const impacted_client_count = normalizeNonNegativeInteger(
      "impacted_client_count",
      input.impacted_client_count,
    );
    const impacted_authority_operation_count = normalizeNonNegativeInteger(
      "impacted_authority_operation_count",
      input.impacted_authority_operation_count,
    );
    const impacted_workflow_count = normalizeNonNegativeInteger(
      "impacted_workflow_count",
      input.impacted_workflow_count,
    );
    const impacted_limitation_count = normalizeNonNegativeInteger(
      "impacted_limitation_count",
      input.impacted_limitation_count,
    );
    const privilege_gain_score = normalizeScore(
      "privilege_gain_score",
      input.privilege_gain_score,
    );
    const scope_expansion_score = normalizeScore(
      "scope_expansion_score",
      input.scope_expansion_score,
    );
    const masking_relaxation_score = normalizeScore(
      "masking_relaxation_score",
      input.masking_relaxation_score,
    );
    const simulation_confidence_score = normalizeScore(
      "simulation_confidence_score",
      input.simulation_confidence_score,
    );
    const predictability_score = normalizeScore(
      "predictability_score",
      input.predictability_score,
    );

    assertCondition(
      contract_version === GOVERNANCE_MUTATION_HAZARD_CONTRACT_VERSION,
      "GOVERNANCE_MUTATION_HAZARD_CONTRACT_INVALID",
      `contract_version must remain ${GOVERNANCE_MUTATION_HAZARD_CONTRACT_VERSION}`,
    );
    assertCondition(
      count_class_profile_code === GOVERNANCE_IMPACT_COUNT_CLASS_PROFILE_CODE,
      "GOVERNANCE_MUTATION_HAZARD_CONTRACT_INVALID",
      `count_class_profile_code must remain ${GOVERNANCE_IMPACT_COUNT_CLASS_PROFILE_CODE}`,
    );
    assertCondition(
      impact_radius_lower_score <= impact_radius_upper_score,
      "GOVERNANCE_MUTATION_HAZARD_CONTRACT_INVALID",
      "impact_radius_lower_score must not exceed impact_radius_upper_score",
    );

    const impacted_principal_count_class =
      expectedGovernanceImpactedCountClass(impacted_principal_count);
    const impacted_client_count_class =
      expectedGovernanceImpactedCountClass(impacted_client_count);
    const impacted_authority_operation_count_class =
      expectedGovernanceImpactedCountClass(impacted_authority_operation_count);
    const impacted_workflow_count_class =
      expectedGovernanceImpactedCountClass(impacted_workflow_count);
    const impacted_limitation_count_class =
      expectedGovernanceImpactedCountClass(impacted_limitation_count);

    const policy_risk_score = expectedGovernancePolicyRiskScore({
      privilege_gain_score,
      scope_expansion_score,
      masking_relaxation_score,
      impact_radius_upper_score,
    });
    const approval_necessity_score = expectedGovernanceApprovalNecessityScore({
      policy_risk_score,
      impact_radius_upper_score,
    });
    const bounded_safe_mutation = expectedGovernanceBoundedSafeMutation({
      privilege_gain_score,
      scope_expansion_score,
      masking_relaxation_score,
      impact_radius_upper_score,
      policy_risk_score,
      simulation_confidence_score,
      predictability_score,
    });
    const approval_requirement = expectedGovernanceApprovalRequirement({
      approval_necessity_score,
      bounded_safe_mutation,
    });
    const required_approvals = governanceRequiredApprovalsForRequirement(
      approval_requirement,
    );
    const commit_authority_posture = expectedGovernanceCommitAuthorityPosture({
      simulation_confidence_score,
      predictability_score,
      bounded_safe_mutation,
    });
    const risk_driver_codes = expectedGovernanceMutationRiskDriverCodes({
      privilege_gain_score,
      scope_expansion_score,
      masking_relaxation_score,
      impact_radius_upper_score,
    });
    const approval_trigger_codes =
      expectedGovernanceMutationApprovalTriggerCodes(approval_requirement);
    const confidence_limiter_codes =
      expectedGovernanceMutationConfidenceLimiterCodes({
        simulation_confidence_score,
        predictability_score,
      });
    const bounded_safety_blocker_codes =
      expectedGovernanceMutationBoundedSafetyBlockerCodes({
        privilege_gain_score,
        scope_expansion_score,
        masking_relaxation_score,
        impact_radius_upper_score,
        policy_risk_score,
        simulation_confidence_score,
        predictability_score,
      });
    const default_reason_codes = normalizeStringSet("reason_codes", [
      ...risk_driver_codes,
      ...approval_trigger_codes,
      ...confidence_limiter_codes,
      ...bounded_safety_blocker_codes,
      ...(bounded_safe_mutation === 1 ? ["BOUNDED_SAFE_MUTATION"] : []),
      ...(impact_radius_lower_score < impact_radius_upper_score
        ? ["UNCERTAIN_BLAST_RADIUS"]
        : []),
    ]);
    const normalized_reason_codes = normalizeStringSet(
      "reason_codes",
      input.reason_codes ?? default_reason_codes,
      { minItems: default_reason_codes.length === 0 ? 0 : 1 },
    );

    for (const [label, actual, expected, normalizer] of [
      [
        "policy_risk_score",
        input.policy_risk_score,
        policy_risk_score,
        normalizeScore,
      ] as const,
      [
        "approval_necessity_score",
        input.approval_necessity_score,
        approval_necessity_score,
        normalizeScore,
      ] as const,
      [
        "bounded_safe_mutation",
        input.bounded_safe_mutation,
        bounded_safe_mutation,
        normalizeBinary,
      ] as const,
    ]) {
      if (actual !== undefined) {
        assertCondition(
          normalizer(label, actual) === expected,
          "GOVERNANCE_MUTATION_HAZARD_CONTRACT_INVALID",
          `${label} must equal the deterministic governance hazard formula result`,
        );
      }
    }

    if (input.approval_requirement !== undefined) {
      assertCondition(
        input.approval_requirement === approval_requirement,
        "GOVERNANCE_MUTATION_HAZARD_CONTRACT_INVALID",
        "approval_requirement must equal the deterministic governance approval posture",
      );
    }

    if (input.commit_authority_posture !== undefined) {
      assertCondition(
        input.commit_authority_posture === commit_authority_posture,
        "GOVERNANCE_MUTATION_HAZARD_CONTRACT_INVALID",
        "commit_authority_posture must equal the deterministic preview/commit posture",
      );
    }

    if (input.required_approvals !== undefined) {
      assertCondition(
        arraysEqual(
          normalizeStringSet("required_approvals", input.required_approvals),
          required_approvals,
        ),
        "GOVERNANCE_MUTATION_HAZARD_CONTRACT_INVALID",
        "required_approvals must equal the canonical approval scope for approval_requirement",
      );
    }

    const normalized_risk_driver_codes = normalizeEnumSequence(
      "risk_driver_codes",
      input.risk_driver_codes ?? risk_driver_codes,
      GOVERNANCE_MUTATION_RISK_DRIVER_CODES,
    );
    const normalized_approval_trigger_codes = normalizeEnumSequence(
      "approval_trigger_codes",
      input.approval_trigger_codes ?? approval_trigger_codes,
      GOVERNANCE_MUTATION_APPROVAL_TRIGGER_CODES,
    );
    const normalized_confidence_limiter_codes = normalizeEnumSequence(
      "confidence_limiter_codes",
      input.confidence_limiter_codes ?? confidence_limiter_codes,
      GOVERNANCE_MUTATION_CONFIDENCE_LIMITER_CODES,
    );
    const normalized_bounded_safety_blocker_codes = normalizeEnumSequence(
      "bounded_safety_blocker_codes",
      input.bounded_safety_blocker_codes ?? bounded_safety_blocker_codes,
      GOVERNANCE_MUTATION_BOUNDED_SAFETY_BLOCKER_CODES,
    );

    assertCondition(
      arraysEqual(normalized_risk_driver_codes, risk_driver_codes),
      "GOVERNANCE_MUTATION_HAZARD_CONTRACT_INVALID",
      "risk_driver_codes must equal the canonical risk-driver set",
    );
    assertCondition(
      arraysEqual(normalized_approval_trigger_codes, approval_trigger_codes),
      "GOVERNANCE_MUTATION_HAZARD_CONTRACT_INVALID",
      "approval_trigger_codes must equal the canonical approval-trigger set",
    );
    assertCondition(
      arraysEqual(normalized_confidence_limiter_codes, confidence_limiter_codes),
      "GOVERNANCE_MUTATION_HAZARD_CONTRACT_INVALID",
      "confidence_limiter_codes must equal the canonical confidence-limiter set",
    );
    assertCondition(
      arraysEqual(
        normalized_bounded_safety_blocker_codes,
        bounded_safety_blocker_codes,
      ),
      "GOVERNANCE_MUTATION_HAZARD_CONTRACT_INVALID",
      "bounded_safety_blocker_codes must equal the canonical bounded-safety blocker set",
    );

    for (const requiredReasonCode of default_reason_codes) {
      assertCondition(
        normalized_reason_codes.includes(requiredReasonCode),
        "GOVERNANCE_MUTATION_HAZARD_CONTRACT_INVALID",
        `reason_codes must include ${requiredReasonCode}`,
      );
    }

    const canonicalRecord = {
      contract_version,
      policy_snapshot_hash,
      access_binding_hash,
      dependency_topology_hash,
      simulation_basis_hash,
      count_class_profile_code,
      commit_authority_posture,
      impact_radius_lower_score,
      impact_radius_upper_score,
      impacted_principal_count,
      impacted_principal_count_class,
      impacted_client_count,
      impacted_client_count_class,
      impacted_authority_operation_count,
      impacted_authority_operation_count_class,
      impacted_workflow_count,
      impacted_workflow_count_class,
      impacted_limitation_count,
      impacted_limitation_count_class,
      privilege_gain_score,
      scope_expansion_score,
      masking_relaxation_score,
      policy_risk_score,
      approval_necessity_score,
      approval_requirement,
      bounded_safe_mutation,
      required_approvals,
      simulation_confidence_score,
      predictability_score,
      risk_driver_codes,
      approval_trigger_codes,
      confidence_limiter_codes,
      bounded_safety_blocker_codes,
      reason_codes: normalized_reason_codes,
    } satisfies Omit<
      GovernanceMutationHazardContractRecord,
      "hazard_contract_hash"
    >;

    const expectedHazardContractHash = deriveGovernanceMutationHazardContractHash(
      canonicalRecord,
    );
    const hazard_contract_hash =
      input.hazard_contract_hash === undefined
        ? expectedHazardContractHash
        : normalizeHash(
            "hazard_contract_hash",
            input.hazard_contract_hash,
            "hazard_contract",
          );

    if (input.hazard_contract_hash !== undefined) {
      assertCondition(
        hazard_contract_hash === expectedHazardContractHash,
        "GOVERNANCE_MUTATION_HAZARD_CONTRACT_HASH_MISMATCH",
        "hazard_contract_hash does not match the canonical governance mutation hazard payload",
      );
    }

    return {
      ...canonicalRecord,
      hazard_contract_hash,
    };
  } catch (error) {
    if (error instanceof GovernanceMutationHazardContractModelError) {
      throw error;
    }
    throw new GovernanceMutationHazardContractModelError(
      "GOVERNANCE_MUTATION_HAZARD_CONTRACT_FIELD_REQUIRED",
      error instanceof Error
        ? error.message
        : "governance mutation hazard contract normalization failed",
    );
  }
}
