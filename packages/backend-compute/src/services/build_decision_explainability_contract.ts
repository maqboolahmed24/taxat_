import type {
  DecisionBundleActionabilityState,
  DecisionBundleCheckpointState,
  DecisionBundleOutcomeClass,
  DecisionBundleRecord,
  DecisionBundleTruthState,
  DecisionBundleWaitingOn,
  DecisionExplainabilityContract,
} from "../models/decision_bundle.ts";

function hasAuthorityPosture(input: {
  checkpoint_state: DecisionBundleCheckpointState;
  reason_codes: readonly string[];
  truth_state: DecisionBundleTruthState;
  waiting_on: DecisionBundleWaitingOn;
}) {
  return (
    input.waiting_on === "AUTHORITY" ||
    [
      "AUTHORITY_PENDING",
      "AUTHORITY_REJECTED",
      "AUTHORITY_UNKNOWN",
      "AUTHORITY_OUT_OF_BAND",
    ].includes(input.truth_state) ||
    [
      "AUTHORITY_PREFLIGHT",
      "TRANSMIT_PENDING",
      "PENDING_ACK",
      "RECONCILIATION_PENDING",
      "REJECTED",
      "UNKNOWN",
      "OUT_OF_BAND",
    ].includes(input.checkpoint_state) ||
    input.reason_codes.some((code) => code.includes("AUTHORITY"))
  );
}

function hasLimitationPosture(input: {
  actionability_state: DecisionBundleActionabilityState;
  blocked_action_codes: readonly string[];
  outcome_class: DecisionBundleOutcomeClass;
}) {
  return (
    input.outcome_class !== "FINAL_SUCCESS" ||
    input.actionability_state === "NO_SAFE_ACTION" ||
    input.blocked_action_codes.length > 0
  );
}

export function buildDecisionExplainabilityContract(input: {
  actionability_state: DecisionBundleRecord["actionability_state"];
  blocked_action_codes: readonly string[];
  checkpoint_state: DecisionBundleRecord["checkpoint_state"];
  dominant_reason_code: string;
  outcome_class: DecisionBundleRecord["outcome_class"];
  plain_reason: string;
  reason_codes: readonly string[];
  waiting_on: DecisionBundleRecord["waiting_on"];
  truth_state: DecisionBundleRecord["truth_state"];
}): DecisionExplainabilityContract {
  const orderedReasons = input.reason_codes.map((code) => code.trim());
  const compressedReasons = orderedReasons.slice(0, 3);
  const semanticQualifiers: DecisionExplainabilityContract["semantic_qualifiers"] = [];
  if (
    hasAuthorityPosture({
      checkpoint_state: input.checkpoint_state,
      reason_codes: orderedReasons,
      truth_state: input.truth_state,
      waiting_on: input.waiting_on,
    })
  ) {
    semanticQualifiers.push("AUTHORITY_STATE");
  }
  if (
    hasLimitationPosture({
      actionability_state: input.actionability_state,
      blocked_action_codes: input.blocked_action_codes,
      outcome_class: input.outcome_class,
    })
  ) {
    semanticQualifiers.push("LIMITATION_STATE");
  }
  if (orderedReasons.some((code) => code.includes("OVERRIDE"))) {
    semanticQualifiers.push("OVERRIDE_STATE");
  }
  semanticQualifiers.push("ACTIONABILITY_STATE");

  return {
    action_projection_state:
      input.actionability_state === "ACTION_AVAILABLE"
        ? "PRIMARY_ACTION_INCLUDED"
        : "NO_SAFE_ACTION_DISCLOSED",
    artifact_family: "DECISION_BUNDLE",
    compressed_reason_codes: compressedReasons,
    compression_policy: "PREFIX_COMPRESS_ORDERED_REASON_CODES_WITH_SUPPRESSED_COUNT",
    compression_reason_cap: 3,
    contract_version: "DECISION_EXPLAINABILITY_V1",
    dominant_reason_code: input.dominant_reason_code,
    dominant_reason_selection_policy: "FIRST_ORDERED_REASON_IS_DOMINANT",
    grammar_profile_code: "LOW_NOISE_DECISION_GRAMMAR_V1",
    ordered_reason_codes: orderedReasons,
    plain_text_character_limit: 200,
    plain_text_field_name: "plain_reason",
    reason_order_policy: "DOMINANT_REASON_FIRST_CANONICAL_PRIORITY",
    semantic_qualifiers: semanticQualifiers,
    summary_source_policy: "READ_SURFACES_MUST_USE_PERSISTED_FIELDS",
    suppressed_reason_count: Math.max(0, orderedReasons.length - compressedReasons.length),
  };
}
