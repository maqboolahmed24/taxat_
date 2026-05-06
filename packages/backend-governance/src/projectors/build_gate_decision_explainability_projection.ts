import type {
  DecisionExplainabilityProjectionFamily,
  DecisionExplainabilityView,
} from "../../../backend-compute/src/services/project_decision_explainability_view.ts";

export type GateDecisionExplainabilityProjectionReasonRow = {
  compressed_prefix_member: boolean;
  is_dominant: boolean;
  position: number;
  reason_code: string;
};

export type GateDecisionExplainabilityProjection = {
  action_panel: {
    blocked_action_codes: string[];
    next_action_codes: string[];
    no_safe_action_reason_code: string | null;
    primary_action_code: string | null;
    state: DecisionExplainabilityView["action_hint"]["state"];
  };
  artifact_id: string;
  artifact_ref: string;
  compressed_reason_rail: {
    compressed_reason_codes: string[];
    dominant_reason_code: string;
    suppressed_reason_count: number;
  };
  manifest_id: string;
  parent_artifact_authority: "PERSISTED_PARENT_ARTIFACT";
  persisted_artifact_family: DecisionExplainabilityView["persisted_artifact_family"];
  plain_language: DecisionExplainabilityView["plain_text"];
  projection_contract_version: "GATE_DECISION_EXPLAINABILITY_PROJECTION_V1";
  projection_family: DecisionExplainabilityProjectionFamily;
  qualifier_badges: {
    qualifier_code: DecisionExplainabilityView["semantic_qualifiers"][number];
    position: number;
  }[];
  reason_ladder: GateDecisionExplainabilityProjectionReasonRow[];
  source_contract: {
    action_projection_state: DecisionExplainabilityView["action_projection_state"];
    compression_policy: DecisionExplainabilityView["compression_policy"];
    grammar_profile_code: DecisionExplainabilityView["grammar_profile_code"];
    reason_order_policy: DecisionExplainabilityView["reason_order_policy"];
    summary_source_policy: DecisionExplainabilityView["summary_source_policy"];
  };
  view_contract_version: DecisionExplainabilityView["view_contract_version"];
};

export function buildGateDecisionExplainabilityProjection(
  view: DecisionExplainabilityView,
): GateDecisionExplainabilityProjection {
  const compressedMembers = new Set(view.compressed_reason_codes);
  return {
    action_panel: {
      blocked_action_codes: [...view.action_hint.blocked_action_codes],
      next_action_codes: [...view.action_hint.next_action_codes],
      no_safe_action_reason_code: view.action_hint.no_safe_action_reason_code,
      primary_action_code: view.action_hint.primary_action_code,
      state: view.action_hint.state,
    },
    artifact_id: view.artifact_id,
    artifact_ref: view.artifact_ref,
    compressed_reason_rail: {
      compressed_reason_codes: [...view.compressed_reason_codes],
      dominant_reason_code: view.dominant_reason_code,
      suppressed_reason_count: view.suppressed_reason_count,
    },
    manifest_id: view.manifest_id,
    parent_artifact_authority: view.parent_artifact_authority,
    persisted_artifact_family: view.persisted_artifact_family,
    plain_language: structuredClone(view.plain_text),
    projection_contract_version: "GATE_DECISION_EXPLAINABILITY_PROJECTION_V1",
    projection_family: view.projection_family,
    qualifier_badges: view.semantic_qualifiers.map((qualifier, index) => ({
      position: index + 1,
      qualifier_code: qualifier,
    })),
    reason_ladder: view.ordered_reason_codes.map((reasonCode, index) => ({
      compressed_prefix_member: compressedMembers.has(reasonCode),
      is_dominant: reasonCode === view.dominant_reason_code,
      position: index + 1,
      reason_code: reasonCode,
    })),
    source_contract: {
      action_projection_state: view.action_projection_state,
      compression_policy: view.compression_policy,
      grammar_profile_code: view.grammar_profile_code,
      reason_order_policy: view.reason_order_policy,
      summary_source_policy: view.summary_source_policy,
    },
    view_contract_version: view.view_contract_version,
  };
}
