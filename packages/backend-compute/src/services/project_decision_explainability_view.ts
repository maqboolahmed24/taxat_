import {
  decisionBundleRef,
  type DecisionBundleRecord,
} from "../models/decision_bundle.ts";
import {
  gateDecisionRef,
  type DecisionExplainabilityContract,
  type GateDecisionRecord,
} from "../models/gate_decision_record.ts";
import { trustSummaryRef, type TrustSummaryRecord } from "../models/trust_summary.ts";
import {
  validatePersistedDecisionBundleExplainabilityAlignment,
  validatePersistedGateDecisionExplainabilityAlignment,
  validatePersistedTrustSummaryExplainabilityAlignment,
} from "./validate_persisted_decision_explainability_alignment.ts";

export type DecisionExplainabilityProjectionFamily =
  | "DECISION_BUNDLE"
  | "GATE_DECISION"
  | "TRUST_SUMMARY";

export type DecisionExplainabilityActionHint = {
  blocked_action_codes: string[];
  next_action_codes: string[];
  no_safe_action_reason_code: string | null;
  primary_action_code: string | null;
  state:
    | "NEXT_ACTIONS"
    | "NO_ACTIONS"
    | "NO_SAFE_ACTION"
    | "PRIMARY_ACTION";
};

export type DecisionExplainabilityView = {
  action_hint: DecisionExplainabilityActionHint;
  action_projection_state: DecisionExplainabilityContract["action_projection_state"];
  artifact_id: string;
  artifact_ref: string;
  compressed_reason_codes: string[];
  compression_policy: DecisionExplainabilityContract["compression_policy"];
  contract: DecisionExplainabilityContract;
  dominant_reason_code: string;
  grammar_profile_code: DecisionExplainabilityContract["grammar_profile_code"];
  integrity: {
    alignment_state: "ALIGNED";
    validator: "validate_persisted_decision_explainability_alignment";
  };
  manifest_id: string;
  ordered_reason_codes: string[];
  parent_artifact_authority: "PERSISTED_PARENT_ARTIFACT";
  persisted_artifact_family: DecisionExplainabilityContract["artifact_family"];
  plain_text: {
    character_limit: 200;
    field_name: DecisionExplainabilityContract["plain_text_field_name"];
    value: string;
  };
  projection_family: DecisionExplainabilityProjectionFamily;
  reason_order_policy: DecisionExplainabilityContract["reason_order_policy"];
  semantic_qualifiers: DecisionExplainabilityContract["semantic_qualifiers"];
  summary_source_policy: DecisionExplainabilityContract["summary_source_policy"];
  suppressed_reason_count: number;
  view_contract_version: "DECISION_EXPLAINABILITY_VIEW_V1";
};

function baseView(input: {
  action_hint: DecisionExplainabilityActionHint;
  artifact_id: string;
  artifact_ref: string;
  contract: DecisionExplainabilityContract;
  manifest_id: string;
  plain_text: string;
  projection_family: DecisionExplainabilityProjectionFamily;
}): DecisionExplainabilityView {
  return {
    action_hint: structuredClone(input.action_hint),
    action_projection_state: input.contract.action_projection_state,
    artifact_id: input.artifact_id,
    artifact_ref: input.artifact_ref,
    compressed_reason_codes: [...input.contract.compressed_reason_codes],
    compression_policy: input.contract.compression_policy,
    contract: structuredClone(input.contract),
    dominant_reason_code: input.contract.dominant_reason_code,
    grammar_profile_code: input.contract.grammar_profile_code,
    integrity: {
      alignment_state: "ALIGNED",
      validator: "validate_persisted_decision_explainability_alignment",
    },
    manifest_id: input.manifest_id,
    ordered_reason_codes: [...input.contract.ordered_reason_codes],
    parent_artifact_authority: "PERSISTED_PARENT_ARTIFACT",
    persisted_artifact_family: input.contract.artifact_family,
    plain_text: {
      character_limit: input.contract.plain_text_character_limit,
      field_name: input.contract.plain_text_field_name,
      value: input.plain_text,
    },
    projection_family: input.projection_family,
    reason_order_policy: input.contract.reason_order_policy,
    semantic_qualifiers: [...input.contract.semantic_qualifiers],
    summary_source_policy: input.contract.summary_source_policy,
    suppressed_reason_count: input.contract.suppressed_reason_count,
    view_contract_version: "DECISION_EXPLAINABILITY_VIEW_V1",
  };
}

export function projectGateDecisionExplainabilityView(
  record: GateDecisionRecord,
): DecisionExplainabilityView {
  validatePersistedGateDecisionExplainabilityAlignment(record);
  return baseView({
    action_hint: {
      blocked_action_codes: [],
      next_action_codes: [...record.next_action_codes],
      no_safe_action_reason_code: null,
      primary_action_code: null,
      state: record.next_action_codes.length > 0 ? "NEXT_ACTIONS" : "NO_ACTIONS",
    },
    artifact_id: record.gate_decision_id,
    artifact_ref: gateDecisionRef(record),
    contract: record.decision_explainability_contract,
    manifest_id: record.manifest_id,
    plain_text: record.plain_explanation,
    projection_family: "GATE_DECISION",
  });
}

export function projectTrustSummaryExplainabilityView(
  record: TrustSummaryRecord,
): DecisionExplainabilityView {
  validatePersistedTrustSummaryExplainabilityAlignment(record);
  return baseView({
    action_hint: {
      blocked_action_codes: [],
      next_action_codes: [],
      no_safe_action_reason_code: null,
      primary_action_code: null,
      state: "NO_ACTIONS",
    },
    artifact_id: record.trust_id,
    artifact_ref: trustSummaryRef(record),
    contract: record.decision_explainability_contract,
    manifest_id: record.manifest_id,
    plain_text: record.plain_summary,
    projection_family: "TRUST_SUMMARY",
  });
}

export function projectDecisionBundleExplainabilityView(
  record: DecisionBundleRecord,
): DecisionExplainabilityView {
  validatePersistedDecisionBundleExplainabilityAlignment(record);
  return baseView({
    action_hint: {
      blocked_action_codes: [...record.blocked_action_codes],
      next_action_codes: [...record.next_action_codes],
      no_safe_action_reason_code: record.no_safe_action_reason_code,
      primary_action_code: record.primary_action_code,
      state:
        record.actionability_state === "ACTION_AVAILABLE"
          ? "PRIMARY_ACTION"
          : "NO_SAFE_ACTION",
    },
    artifact_id: record.decision_bundle_id,
    artifact_ref: decisionBundleRef(record),
    contract: record.decision_explainability_contract,
    manifest_id: record.manifest_id,
    plain_text: record.plain_reason,
    projection_family: "DECISION_BUNDLE",
  });
}

export type ProjectDecisionExplainabilityViewInput =
  | { artifact_family: "DECISION_BUNDLE"; record: DecisionBundleRecord }
  | { artifact_family: "GATE_DECISION"; record: GateDecisionRecord }
  | { artifact_family: "TRUST_SUMMARY"; record: TrustSummaryRecord };

export function projectDecisionExplainabilityView(input: ProjectDecisionExplainabilityViewInput) {
  switch (input.artifact_family) {
    case "DECISION_BUNDLE":
      return projectDecisionBundleExplainabilityView(input.record);
    case "GATE_DECISION":
      return projectGateDecisionExplainabilityView(input.record);
    case "TRUST_SUMMARY":
      return projectTrustSummaryExplainabilityView(input.record);
  }
}
