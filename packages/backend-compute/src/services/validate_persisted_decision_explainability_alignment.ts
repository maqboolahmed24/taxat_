import type { DecisionBundleRecord } from "../models/decision_bundle.ts";
import type {
  DecisionExplainabilityContract,
  GateDecisionRecord,
} from "../models/gate_decision_record.ts";
import type { TrustSummaryRecord } from "../models/trust_summary.ts";

export const DECISION_EXPLAINABILITY_REASON_CAP = 3;
export const DECISION_EXPLAINABILITY_TEXT_LIMIT = 200;
export const DECISION_EXPLAINABILITY_QUALIFIER_ORDER = [
  "AUTHORITY_STATE",
  "LIMITATION_STATE",
  "OVERRIDE_STATE",
  "ACTIONABILITY_STATE",
] as const satisfies readonly DecisionExplainabilityContract["semantic_qualifiers"][number][];

export type DecisionExplainabilityQualifier =
  DecisionExplainabilityContract["semantic_qualifiers"][number];

export type PersistedDecisionExplainabilityAlignmentErrorCode =
  | "ACTION_PROJECTION_STATE_DRIFT"
  | "ARTIFACT_FAMILY_MISMATCH"
  | "COMPRESSED_PREFIX_DRIFT"
  | "CONTRACT_CONSTANT_DRIFT"
  | "DECISION_EXPLAINABILITY_MISSING"
  | "DECISION_REASON_CODES_DRIFT"
  | "DOMINANT_REASON_DRIFT"
  | "ORDERED_REASON_DRIFT"
  | "PLAIN_TEXT_BUDGET_EXCEEDED"
  | "PLAIN_TEXT_FIELD_DRIFT"
  | "QUALIFIER_DRIFT"
  | "QUALIFIER_ORDER_DRIFT"
  | "SUPPRESSED_REASON_COUNT_DRIFT";

export class PersistedDecisionExplainabilityAlignmentError extends Error {
  readonly artifact_id: string;
  readonly code: PersistedDecisionExplainabilityAlignmentErrorCode;
  readonly field_path: string;

  constructor(input: {
    artifact_id: string;
    code: PersistedDecisionExplainabilityAlignmentErrorCode;
    detail: string;
    field_path: string;
  }) {
    super(`${input.code}: ${input.detail}`);
    this.name = "PersistedDecisionExplainabilityAlignmentError";
    this.artifact_id = input.artifact_id;
    this.code = input.code;
    this.field_path = input.field_path;
  }
}

function assertAligned(
  condition: unknown,
  input: {
    artifact_id: string;
    code: PersistedDecisionExplainabilityAlignmentErrorCode;
    detail: string;
    field_path: string;
  },
): asserts condition {
  if (!condition) {
    throw new PersistedDecisionExplainabilityAlignmentError(input);
  }
}

function stableEqual(left: unknown, right: unknown) {
  return JSON.stringify(left) === JSON.stringify(right);
}

function reasonCodesIndicateAuthority(reasonCodes: readonly string[]) {
  return reasonCodes.some((code) => code.includes("AUTHORITY"));
}

function reasonCodesIndicateOverride(reasonCodes: readonly string[]) {
  return reasonCodes.some((code) => code.includes("OVERRIDE"));
}

export function compressedDecisionExplainabilityReasonPrefix(reasonCodes: readonly string[]) {
  return reasonCodes.slice(0, DECISION_EXPLAINABILITY_REASON_CAP);
}

export function canonicalDecisionExplainabilitySemanticQualifiers(
  qualifiers: readonly DecisionExplainabilityQualifier[],
) {
  const present = new Set(qualifiers);
  return DECISION_EXPLAINABILITY_QUALIFIER_ORDER.filter((qualifier) => present.has(qualifier));
}

export function expectedGateDecisionExplainabilitySemanticQualifiers(
  record: Pick<
    GateDecisionRecord,
    | "active_override_refs"
    | "blocking_dependency_refs"
    | "decision"
    | "next_action_codes"
    | "override_resolution_state"
    | "reason_codes"
  >,
) {
  const qualifiers: DecisionExplainabilityQualifier[] = [];
  if (reasonCodesIndicateAuthority(record.reason_codes)) {
    qualifiers.push("AUTHORITY_STATE");
  }
  if (record.decision !== "PASS" || record.blocking_dependency_refs.length > 0) {
    qualifiers.push("LIMITATION_STATE");
  }
  if (
    record.override_resolution_state !== "NOT_APPLICABLE" ||
    record.active_override_refs.length > 0 ||
    reasonCodesIndicateOverride(record.reason_codes)
  ) {
    qualifiers.push("OVERRIDE_STATE");
  }
  if (record.next_action_codes.length > 0) {
    qualifiers.push("ACTIONABILITY_STATE");
  }
  return canonicalDecisionExplainabilitySemanticQualifiers(qualifiers);
}

export function expectedTrustSummaryExplainabilitySemanticQualifiers(
  record: Pick<
    TrustSummaryRecord,
    | "active_filing_critical_override_count"
    | "authority_uncertainty_score"
    | "automation_level"
    | "decision_constraint_codes"
    | "reason_codes"
    | "threshold_stability_state"
    | "trust_input_basis_contract"
  >,
) {
  const qualifiers: DecisionExplainabilityQualifier[] = [];
  if (
    record.authority_uncertainty_score > 0 ||
    ["REVIEW_LIMITED", "BLOCKED"].includes(
      record.trust_input_basis_contract.authority_progression_state,
    ) ||
    reasonCodesIndicateAuthority(record.reason_codes)
  ) {
    qualifiers.push("AUTHORITY_STATE");
  }
  if (
    ["LIMITED", "BLOCKED"].includes(record.automation_level) ||
    record.decision_constraint_codes.length > 0 ||
    record.threshold_stability_state === "EDGE_REVIEW"
  ) {
    qualifiers.push("LIMITATION_STATE");
  }
  if (
    record.active_filing_critical_override_count > 0 ||
    reasonCodesIndicateOverride(record.reason_codes)
  ) {
    qualifiers.push("OVERRIDE_STATE");
  }
  return canonicalDecisionExplainabilitySemanticQualifiers(qualifiers);
}

export function expectedDecisionBundleExplainabilitySemanticQualifiers(
  record: Pick<
    DecisionBundleRecord,
    | "actionability_state"
    | "blocked_action_codes"
    | "checkpoint_state"
    | "outcome_class"
    | "reason_codes"
    | "truth_state"
    | "waiting_on"
  >,
) {
  const qualifiers: DecisionExplainabilityQualifier[] = [];
  if (
    [
      "AUTHORITY_PENDING",
      "AUTHORITY_REJECTED",
      "AUTHORITY_UNKNOWN",
      "AUTHORITY_OUT_OF_BAND",
    ].includes(record.truth_state) ||
    record.waiting_on === "AUTHORITY" ||
    [
      "AUTHORITY_PREFLIGHT",
      "TRANSMIT_PENDING",
      "PENDING_ACK",
      "RECONCILIATION_PENDING",
      "REJECTED",
      "UNKNOWN",
      "OUT_OF_BAND",
    ].includes(record.checkpoint_state) ||
    reasonCodesIndicateAuthority(record.reason_codes)
  ) {
    qualifiers.push("AUTHORITY_STATE");
  }
  if (
    record.outcome_class !== "FINAL_SUCCESS" ||
    record.actionability_state === "NO_SAFE_ACTION" ||
    record.blocked_action_codes.length > 0
  ) {
    qualifiers.push("LIMITATION_STATE");
  }
  if (reasonCodesIndicateOverride(record.reason_codes)) {
    qualifiers.push("OVERRIDE_STATE");
  }
  if (["ACTION_AVAILABLE", "NO_SAFE_ACTION"].includes(record.actionability_state)) {
    qualifiers.push("ACTIONABILITY_STATE");
  }
  return canonicalDecisionExplainabilitySemanticQualifiers(qualifiers);
}

function validateCommonDecisionExplainabilityAlignment(input: {
  action_projection_state: DecisionExplainabilityContract["action_projection_state"];
  artifact_id: string;
  contract: DecisionExplainabilityContract | null | undefined;
  decision_reason_codes?: readonly string[] | undefined;
  dominant_reason_code: string;
  expected_artifact_family: DecisionExplainabilityContract["artifact_family"];
  expected_semantic_qualifiers: readonly DecisionExplainabilityQualifier[];
  plain_text: string;
  plain_text_field_name: DecisionExplainabilityContract["plain_text_field_name"];
  reason_codes: readonly string[];
}) {
  const contract = input.contract;
  assertAligned(contract !== null && contract !== undefined && typeof contract === "object", {
    artifact_id: input.artifact_id,
    code: "DECISION_EXPLAINABILITY_MISSING",
    detail: "parent artifact must carry a structured decision_explainability_contract",
    field_path: "decision_explainability_contract",
  });

  const expectedCompressed = compressedDecisionExplainabilityReasonPrefix(input.reason_codes);
  const expectedSuppressed = input.reason_codes.length - expectedCompressed.length;

  const constantChecks: [boolean, string][] = [
    [contract.contract_version === "DECISION_EXPLAINABILITY_V1", "contract_version"],
    [contract.grammar_profile_code === "LOW_NOISE_DECISION_GRAMMAR_V1", "grammar_profile_code"],
    [
      contract.reason_order_policy === "DOMINANT_REASON_FIRST_CANONICAL_PRIORITY",
      "reason_order_policy",
    ],
    [
      contract.dominant_reason_selection_policy === "FIRST_ORDERED_REASON_IS_DOMINANT",
      "dominant_reason_selection_policy",
    ],
    [
      contract.summary_source_policy === "READ_SURFACES_MUST_USE_PERSISTED_FIELDS",
      "summary_source_policy",
    ],
    [
      contract.compression_policy ===
        "PREFIX_COMPRESS_ORDERED_REASON_CODES_WITH_SUPPRESSED_COUNT",
      "compression_policy",
    ],
    [contract.compression_reason_cap === DECISION_EXPLAINABILITY_REASON_CAP, "compression_reason_cap"],
    [contract.plain_text_character_limit === DECISION_EXPLAINABILITY_TEXT_LIMIT, "plain_text_character_limit"],
  ];
  const driftedConstant = constantChecks.find(([isAligned]) => !isAligned)?.[1];
  assertAligned(driftedConstant === undefined, {
    artifact_id: input.artifact_id,
    code: "CONTRACT_CONSTANT_DRIFT",
    detail: `${driftedConstant} must retain the DECISION_EXPLAINABILITY_V1 constants`,
    field_path: `decision_explainability_contract.${driftedConstant ?? "constant"}`,
  });

  assertAligned(contract.artifact_family === input.expected_artifact_family, {
    artifact_id: input.artifact_id,
    code: "ARTIFACT_FAMILY_MISMATCH",
    detail: `artifact_family must stay ${input.expected_artifact_family}`,
    field_path: "decision_explainability_contract.artifact_family",
  });
  assertAligned(contract.plain_text_field_name === input.plain_text_field_name, {
    artifact_id: input.artifact_id,
    code: "PLAIN_TEXT_FIELD_DRIFT",
    detail: `plain_text_field_name must stay ${input.plain_text_field_name}`,
    field_path: "decision_explainability_contract.plain_text_field_name",
  });
  assertAligned(input.plain_text.length <= contract.plain_text_character_limit, {
    artifact_id: input.artifact_id,
    code: "PLAIN_TEXT_BUDGET_EXCEEDED",
    detail: "parent plain text must stay within the explainability character limit",
    field_path: input.plain_text_field_name,
  });
  assertAligned(stableEqual(contract.ordered_reason_codes, input.reason_codes), {
    artifact_id: input.artifact_id,
    code: "ORDERED_REASON_DRIFT",
    detail: "ordered_reason_codes must exactly mirror parent reason_codes",
    field_path: "decision_explainability_contract.ordered_reason_codes",
  });
  assertAligned(
    contract.dominant_reason_code === input.dominant_reason_code &&
      input.reason_codes[0] === input.dominant_reason_code,
    {
      artifact_id: input.artifact_id,
      code: "DOMINANT_REASON_DRIFT",
      detail: "dominant_reason_code must mirror the parent and first ordered reason",
      field_path: "decision_explainability_contract.dominant_reason_code",
    },
  );
  assertAligned(stableEqual(contract.compressed_reason_codes, expectedCompressed), {
    artifact_id: input.artifact_id,
    code: "COMPRESSED_PREFIX_DRIFT",
    detail: "compressed_reason_codes must equal the canonical first-three prefix",
    field_path: "decision_explainability_contract.compressed_reason_codes",
  });
  assertAligned(contract.suppressed_reason_count === expectedSuppressed, {
    artifact_id: input.artifact_id,
    code: "SUPPRESSED_REASON_COUNT_DRIFT",
    detail: "suppressed_reason_count must equal ordered minus compressed reason count",
    field_path: "decision_explainability_contract.suppressed_reason_count",
  });
  assertAligned(
    stableEqual(
      contract.semantic_qualifiers,
      canonicalDecisionExplainabilitySemanticQualifiers(contract.semantic_qualifiers),
    ),
    {
      artifact_id: input.artifact_id,
      code: "QUALIFIER_ORDER_DRIFT",
      detail: "semantic_qualifiers must stay in canonical qualifier order",
      field_path: "decision_explainability_contract.semantic_qualifiers",
    },
  );
  assertAligned(stableEqual(contract.semantic_qualifiers, input.expected_semantic_qualifiers), {
    artifact_id: input.artifact_id,
    code: "QUALIFIER_DRIFT",
    detail: "semantic_qualifiers must exactly mirror the parent artifact posture",
    field_path: "decision_explainability_contract.semantic_qualifiers",
  });
  assertAligned(contract.action_projection_state === input.action_projection_state, {
    artifact_id: input.artifact_id,
    code: "ACTION_PROJECTION_STATE_DRIFT",
    detail: `action_projection_state must stay ${input.action_projection_state}`,
    field_path: "decision_explainability_contract.action_projection_state",
  });
  if (input.decision_reason_codes !== undefined) {
    assertAligned(stableEqual(input.decision_reason_codes, expectedCompressed), {
      artifact_id: input.artifact_id,
      code: "DECISION_REASON_CODES_DRIFT",
      detail: "decision_reason_codes must mirror the canonical compressed prefix",
      field_path: "decision_reason_codes",
    });
  }
}

export function validatePersistedGateDecisionExplainabilityAlignment(
  record: GateDecisionRecord,
) {
  validateCommonDecisionExplainabilityAlignment({
    action_projection_state:
      record.next_action_codes.length > 0 ? "NEXT_ACTIONS_INCLUDED" : "NONE",
    artifact_id: record.gate_decision_id,
    contract: record.decision_explainability_contract,
    dominant_reason_code: record.dominant_reason_code,
    expected_artifact_family: "GATE_DECISION_RECORD",
    expected_semantic_qualifiers: expectedGateDecisionExplainabilitySemanticQualifiers(record),
    plain_text: record.plain_explanation,
    plain_text_field_name: "plain_explanation",
    reason_codes: record.reason_codes,
  });
  return record;
}

export function validatePersistedTrustSummaryExplainabilityAlignment(
  record: TrustSummaryRecord,
) {
  validateCommonDecisionExplainabilityAlignment({
    action_projection_state: "NONE",
    artifact_id: record.trust_id,
    contract: record.decision_explainability_contract,
    dominant_reason_code: record.dominant_reason_code,
    expected_artifact_family: "TRUST_SUMMARY",
    expected_semantic_qualifiers: expectedTrustSummaryExplainabilitySemanticQualifiers(record),
    plain_text: record.plain_summary,
    plain_text_field_name: "plain_summary",
    reason_codes: record.reason_codes,
  });
  return record;
}

export function validatePersistedDecisionBundleExplainabilityAlignment(
  record: DecisionBundleRecord,
) {
  validateCommonDecisionExplainabilityAlignment({
    action_projection_state:
      record.actionability_state === "ACTION_AVAILABLE"
        ? "PRIMARY_ACTION_INCLUDED"
        : "NO_SAFE_ACTION_DISCLOSED",
    artifact_id: record.decision_bundle_id,
    contract: record.decision_explainability_contract,
    decision_reason_codes: record.decision_reason_codes,
    dominant_reason_code: record.dominant_reason_code,
    expected_artifact_family: "DECISION_BUNDLE",
    expected_semantic_qualifiers: expectedDecisionBundleExplainabilitySemanticQualifiers(record),
    plain_text: record.plain_reason,
    plain_text_field_name: "plain_reason",
    reason_codes: record.reason_codes,
  });
  return record;
}

export type PersistedDecisionExplainabilityAlignmentInput =
  | { artifact_family: "DECISION_BUNDLE"; record: DecisionBundleRecord }
  | { artifact_family: "GATE_DECISION"; record: GateDecisionRecord }
  | { artifact_family: "TRUST_SUMMARY"; record: TrustSummaryRecord };

export function validatePersistedDecisionExplainabilityAlignment(
  input: PersistedDecisionExplainabilityAlignmentInput,
) {
  switch (input.artifact_family) {
    case "DECISION_BUNDLE":
      return validatePersistedDecisionBundleExplainabilityAlignment(input.record);
    case "GATE_DECISION":
      return validatePersistedGateDecisionExplainabilityAlignment(input.record);
    case "TRUST_SUMMARY":
      return validatePersistedTrustSummaryExplainabilityAlignment(input.record);
  }
}
