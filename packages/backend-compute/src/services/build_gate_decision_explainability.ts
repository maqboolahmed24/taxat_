import type {
  DecisionExplainabilityContract,
  GateDecision,
  GateOverrideResolutionState,
} from "../models/gate_decision_record.ts";

export const GATE_REASON_ORDER = [
  "GATE_HARD_BLOCK",
  "MANIFEST_BOUNDARY_INVALID",
  "ARTIFACT_CONTRACT_MISMATCH",
  "INPUT_BOUNDARY_VIOLATION",
  "DATA_QUALITY_BLOCKING_FAILURE",
  "RETENTION_EVIDENCE_MISSING",
  "PARITY_BLOCKING_DIFFERENCE",
  "TRUST_BLOCKED",
  "FILING_CASE_INVALID",
  "SUBMISSION_NOT_AUTHORIZED",
  "GATE_OVERRIDABLE_BLOCK",
  "GATE_MANUAL_REVIEW",
  "RETENTION_EVIDENCE_LIMITED",
  "PARITY_PARTIAL_COVERAGE",
  "TRUST_REVIEW_REQUIRED",
  "GATE_PASS_WITH_NOTICE",
  "GATE_PASS",
] as const;

const QUALIFIER_ORDER = [
  "AUTHORITY_STATE",
  "LIMITATION_STATE",
  "OVERRIDE_STATE",
  "ACTIONABILITY_STATE",
] as const satisfies readonly DecisionExplainabilityContract["semantic_qualifiers"][number][];

function requireReason(value: string) {
  const normalized = value.trim().normalize("NFC");
  if (normalized.length === 0) {
    throw new Error("gate reason code must be a non-empty string");
  }
  return normalized;
}

export function defaultGateReasonForDecision(decision: GateDecision) {
  switch (decision) {
    case "PASS":
      return "GATE_PASS";
    case "PASS_WITH_NOTICE":
      return "GATE_PASS_WITH_NOTICE";
    case "MANUAL_REVIEW":
      return "GATE_MANUAL_REVIEW";
    case "OVERRIDABLE_BLOCK":
      return "GATE_OVERRIDABLE_BLOCK";
    case "HARD_BLOCK":
      return "GATE_HARD_BLOCK";
  }
}

export function orderGateReasonCodes(reasonCodes: readonly string[], options?: { maxItems?: number }) {
  const seen = new Set<string>();
  const normalized = reasonCodes.map(requireReason).filter((reason) => {
    if (seen.has(reason)) {
      return false;
    }
    seen.add(reason);
    return true;
  });
  const present = new Set(normalized);
  const ordered = [
    ...GATE_REASON_ORDER.filter((reason) => present.has(reason)),
    ...normalized.filter((reason) => !GATE_REASON_ORDER.includes(reason as never)).sort(),
  ];
  return ordered.slice(0, options?.maxItems ?? 8);
}

export function buildGateDecisionExplainability(input: {
  active_override_refs?: readonly string[];
  blocking_dependency_refs?: readonly string[];
  decision?: GateDecision;
  next_action_codes: readonly string[];
  override_resolution_state: GateOverrideResolutionState;
  plain_explanation: string;
  reason_codes: readonly string[];
}): DecisionExplainabilityContract {
  const ordered = [...input.reason_codes];
  const compressed = ordered.slice(0, 3);
  const qualifiers = new Set<DecisionExplainabilityContract["semantic_qualifiers"][number]>();
  if (ordered.some((reason) => reason.includes("AUTHORITY"))) {
    qualifiers.add("AUTHORITY_STATE");
  }
  if (input.decision !== undefined && input.decision !== "PASS") {
    qualifiers.add("LIMITATION_STATE");
  }
  if ((input.blocking_dependency_refs ?? []).length > 0) {
    qualifiers.add("LIMITATION_STATE");
  }
  if (
    input.override_resolution_state !== "NOT_APPLICABLE" ||
    (input.active_override_refs ?? []).length > 0 ||
    ordered.some((reason) => reason.includes("OVERRIDE"))
  ) {
    qualifiers.add("OVERRIDE_STATE");
  }
  if (input.next_action_codes.length > 0) {
    qualifiers.add("ACTIONABILITY_STATE");
  }
  return {
    action_projection_state:
      input.next_action_codes.length > 0 ? "NEXT_ACTIONS_INCLUDED" : "NONE",
    artifact_family: "GATE_DECISION_RECORD",
    compressed_reason_codes: compressed,
    compression_policy: "PREFIX_COMPRESS_ORDERED_REASON_CODES_WITH_SUPPRESSED_COUNT",
    compression_reason_cap: 3,
    contract_version: "DECISION_EXPLAINABILITY_V1",
    dominant_reason_code: ordered[0],
    dominant_reason_selection_policy: "FIRST_ORDERED_REASON_IS_DOMINANT",
    grammar_profile_code: "LOW_NOISE_DECISION_GRAMMAR_V1",
    ordered_reason_codes: ordered,
    plain_text_character_limit: 200,
    plain_text_field_name: "plain_explanation",
    reason_order_policy: "DOMINANT_REASON_FIRST_CANONICAL_PRIORITY",
    semantic_qualifiers: QUALIFIER_ORDER.filter((qualifier) => qualifiers.has(qualifier)),
    summary_source_policy: "READ_SURFACES_MUST_USE_PERSISTED_FIELDS",
    suppressed_reason_count: Math.max(0, ordered.length - compressed.length),
  };
}

export function plainGateExplanation(input: {
  decision: GateDecision;
  dominant_reason_code: string;
  gate_code: string;
}) {
  const decisionText = input.decision.toLowerCase().replaceAll("_", " ");
  return `${input.gate_code} is ${decisionText} because ${input.dominant_reason_code}.`.slice(0, 200);
}
