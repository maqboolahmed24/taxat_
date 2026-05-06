import { requireTrimmedString } from "../../../backend-access/src/services/principal_context_normalizer.ts";
import {
  buildGateDecisionRecord,
  gateDecisionRef,
  normalizeGateDecisionRecord,
  type GateCode,
  type GateDecision,
  type GateDecisionRecord,
  type GateOverrideResolutionState,
  type GateOverrideability,
} from "../models/gate_decision_record.ts";
import { decisionRankForGateDecision } from "./build_gate_semantics_contract.ts";
import { orderGateReasonCodes } from "./build_gate_decision_explainability.ts";
import {
  canonicalizeGateEffectiveScope,
  getCanonicalGateStageProfile,
  getGateStageProfileByCode,
  isGateApplicableToScope,
} from "./get_canonical_gate_stage_profile.ts";
import { projectManifestGateOutcomes } from "./project_manifest_gate_outcomes.ts";

export type GateDecisionCandidate = {
  blocking_dependency_refs?: readonly string[];
  decision: GateDecision;
  metrics?: Record<string, unknown>;
  next_action_codes?: readonly string[];
  reason_codes?: readonly string[];
};

export type GateEvaluationInput = {
  active_override_refs?: readonly string[];
  blocking_dependency_refs?: readonly string[];
  candidate_decisions?: readonly GateDecisionCandidate[];
  decided_at?: string;
  decision?: GateDecision;
  decision_basis_ref?: string;
  gate_code: GateCode;
  gate_decision_id?: string;
  input_artifact_refs?: readonly string[];
  metrics?: Record<string, unknown>;
  next_action_codes?: readonly string[];
  override_resolution_state?: GateOverrideResolutionState;
  overrideability?: GateOverrideability;
  plain_explanation?: string;
  policy_version_ref?: string;
  reason_codes?: readonly string[];
  required_override_scope?: string | null;
};

export type EvaluateGateChainInput = {
  decided_at?: string;
  effective_scope: readonly string[];
  existing_gate_records?: readonly GateDecisionRecord[];
  gate_inputs: readonly GateEvaluationInput[];
  manifest_id: string;
  policy_version_ref?: string;
  required_gate_codes?: readonly GateCode[];
};

export type EvaluateGateChainResult = {
  blocking_gate_codes: GateCode[];
  deferred_gate_codes: GateCode[];
  gate_records: GateDecisionRecord[];
  missing_prerequisite_refs: string[];
  ordered_gate_records: GateDecisionRecord[];
  ordered_gate_refs: string[];
  progression_ceiling_rank: GateDecisionRecord["gate_semantics_contract"]["progression_rank"];
};

export class EvaluateGateChainError extends Error {
  readonly code:
    | "GATE_CHAIN_DUPLICATE_INPUT"
    | "GATE_CHAIN_DUPLICATE_RECORD"
    | "GATE_CHAIN_INAPPLICABLE_INPUT"
    | "GATE_CHAIN_MANIFEST_SCOPE_MISMATCH"
    | "GATE_CHAIN_ORDER_INVALID";

  constructor(code: EvaluateGateChainError["code"], detail: string) {
    super(`${code}: ${detail}`);
    this.name = "EvaluateGateChainError";
    this.code = code;
  }
}

function normalizeExistingRecords(input: {
  effective_scope: readonly string[];
  existing_gate_records: readonly GateDecisionRecord[];
  manifest_id: string;
}) {
  const records = input.existing_gate_records.map(normalizeGateDecisionRecord).sort(
    (left, right) => left.gate_stage_index - right.gate_stage_index,
  );
  const seenStages = new Set<number>();
  const seenCodes = new Set<string>();
  const seenIds = new Set<string>();
  for (const record of records) {
    if (
      record.manifest_id !== input.manifest_id ||
      JSON.stringify(record.effective_scope) !== JSON.stringify(input.effective_scope)
    ) {
      throw new EvaluateGateChainError(
        "GATE_CHAIN_MANIFEST_SCOPE_MISMATCH",
        "existing gate records must match the evaluated manifest_id and effective_scope",
      );
    }
    if (
      seenStages.has(record.gate_stage_index) ||
      seenCodes.has(record.gate_code) ||
      seenIds.has(record.gate_decision_id)
    ) {
      throw new EvaluateGateChainError(
        "GATE_CHAIN_DUPLICATE_RECORD",
        "existing gate records must not duplicate stage, code, or id",
      );
    }
    seenStages.add(record.gate_stage_index);
    seenCodes.add(record.gate_code);
    seenIds.add(record.gate_decision_id);
  }
  return records;
}

function buildRequiredProfile(input: {
  effective_scope: readonly string[];
  required_gate_codes?: readonly GateCode[];
}) {
  const applicable = getCanonicalGateStageProfile({ effective_scope: input.effective_scope });
  if (!input.required_gate_codes) {
    return applicable;
  }
  const applicableByCode = new Map(applicable.map((profile) => [profile.gate_code, profile] as const));
  const requested = [...new Set(input.required_gate_codes)].map((gateCode) => {
    const profile = applicableByCode.get(gateCode);
    if (!profile) {
      throw new EvaluateGateChainError(
        "GATE_CHAIN_INAPPLICABLE_INPUT",
        `${gateCode} is not applicable to the runtime effective_scope`,
      );
    }
    return profile;
  });
  return requested.sort((left, right) => left.gate_stage_index - right.gate_stage_index);
}

function validateExistingPrefix(records: readonly GateDecisionRecord[], requiredGateCodes: readonly GateCode[]) {
  const recordCodes = new Set(records.map((record) => record.gate_code));
  for (const record of records) {
    for (const gateCode of requiredGateCodes) {
      const profile = getGateStageProfileByCode(gateCode);
      if (profile.gate_stage_index >= record.gate_stage_index) {
        break;
      }
      if (!recordCodes.has(gateCode)) {
        throw new EvaluateGateChainError(
          "GATE_CHAIN_ORDER_INVALID",
          `${record.gate_code} cannot be evaluated before required earlier ${gateCode}`,
        );
      }
    }
  }
}

function buildInputMap(inputs: readonly GateEvaluationInput[]) {
  const map = new Map<GateCode, GateEvaluationInput>();
  for (const input of inputs) {
    if (map.has(input.gate_code)) {
      throw new EvaluateGateChainError(
        "GATE_CHAIN_DUPLICATE_INPUT",
        `${input.gate_code} has multiple gate input payloads`,
      );
    }
    map.set(input.gate_code, input);
  }
  return map;
}

function mergeUnique(values: readonly (readonly string[] | undefined)[]) {
  const result: string[] = [];
  const seen = new Set<string>();
  for (const group of values) {
    for (const value of group ?? []) {
      const normalized = requireTrimmedString("gate_evaluation.merge", value);
      if (!seen.has(normalized)) {
        seen.add(normalized);
        result.push(normalized);
      }
    }
  }
  return result;
}

function selectGateOutcome(input: GateEvaluationInput) {
  const candidates = input.candidate_decisions ?? [];
  if (candidates.length === 0) {
    return {
      blocking_dependency_refs: input.blocking_dependency_refs,
      decision: input.decision ?? "PASS",
      metrics: input.metrics,
      next_action_codes: input.next_action_codes,
      reason_codes: input.reason_codes,
    };
  }
  const winningRank = Math.max(
    ...candidates.map((candidate) => decisionRankForGateDecision(candidate.decision)),
  );
  const winners = candidates.filter(
    (candidate) => decisionRankForGateDecision(candidate.decision) === winningRank,
  );
  const decision = winners[0].decision;
  return {
    blocking_dependency_refs:
      input.blocking_dependency_refs ??
      mergeUnique(winners.map((winner) => winner.blocking_dependency_refs)),
    decision,
    metrics: {
      ...Object.assign({}, ...winners.map((winner) => winner.metrics ?? {})),
      ...(input.metrics ?? {}),
    },
    next_action_codes: input.next_action_codes ?? mergeUnique(winners.map((winner) => winner.next_action_codes)),
    reason_codes:
      input.reason_codes ??
      orderGateReasonCodes(mergeUnique(winners.map((winner) => winner.reason_codes))),
  };
}

export function evaluateGateChain(input: EvaluateGateChainInput): EvaluateGateChainResult {
  const manifestId = requireTrimmedString("gate_chain.manifest_id", input.manifest_id);
  const effectiveScope = canonicalizeGateEffectiveScope(input.effective_scope);
  const requiredProfile = buildRequiredProfile({
    effective_scope: effectiveScope,
    required_gate_codes: input.required_gate_codes,
  });
  const requiredGateCodes = requiredProfile.map((profile) => profile.gate_code);
  const existingRecords = normalizeExistingRecords({
    effective_scope: effectiveScope,
    existing_gate_records: input.existing_gate_records ?? [],
    manifest_id: manifestId,
  });
  validateExistingPrefix(existingRecords, requiredGateCodes);
  const gateInputs = buildInputMap(input.gate_inputs);
  for (const gateInput of gateInputs.values()) {
    if (!isGateApplicableToScope({ effective_scope: effectiveScope, gate_code: gateInput.gate_code })) {
      throw new EvaluateGateChainError(
        "GATE_CHAIN_INAPPLICABLE_INPUT",
        `${gateInput.gate_code} is not applicable to the runtime effective_scope`,
      );
    }
  }
  const recordsByCode = new Map(existingRecords.map((record) => [record.gate_code, record] as const));
  const orderedRecords = [...existingRecords];
  const newRecords: GateDecisionRecord[] = [];
  const deferredGateCodes: GateCode[] = [];
  const missingPrerequisiteRefs: string[] = [];
  const existingMaxStage = existingRecords.reduce(
    (max, record) => Math.max(max, record.gate_stage_index),
    0,
  );
  for (const profile of requiredProfile) {
    if (recordsByCode.has(profile.gate_code)) {
      continue;
    }
    if (profile.gate_stage_index <= existingMaxStage) {
      throw new EvaluateGateChainError(
        "GATE_CHAIN_ORDER_INVALID",
        `${profile.gate_code} would backfill before the current persisted gate prefix`,
      );
    }
    const gateInput = gateInputs.get(profile.gate_code);
    if (!gateInput) {
      deferredGateCodes.push(profile.gate_code);
      missingPrerequisiteRefs.push(`gate-input://${manifestId}/${profile.gate_code.toLowerCase()}`);
      break;
    }
    const outcome = selectGateOutcome(gateInput);
    const record = buildGateDecisionRecord({
      active_override_refs: gateInput.active_override_refs,
      blocking_dependency_refs: outcome.blocking_dependency_refs,
      decided_at: gateInput.decided_at ?? input.decided_at,
      decision: outcome.decision,
      decision_basis_ref: gateInput.decision_basis_ref,
      effective_scope: effectiveScope,
      gate_code: profile.gate_code,
      gate_decision_id: gateInput.gate_decision_id,
      input_artifact_refs: gateInput.input_artifact_refs,
      manifest_id: manifestId,
      metrics: outcome.metrics,
      next_action_codes: outcome.next_action_codes,
      override_resolution_state: gateInput.override_resolution_state,
      overrideability: gateInput.overrideability,
      plain_explanation: gateInput.plain_explanation,
      policy_version_ref: gateInput.policy_version_ref ?? input.policy_version_ref,
      prerequisite_gate_refs:
        profile.gate_code === "MANIFEST_GATE" ? [] : orderedRecords.map(gateDecisionRef),
      reason_codes: outcome.reason_codes,
      required_override_scope: gateInput.required_override_scope,
    });
    orderedRecords.push(record);
    recordsByCode.set(record.gate_code, record);
    newRecords.push(record);
  }
  const outcomes = projectManifestGateOutcomes({
    effective_scope: effectiveScope,
    gate_records: orderedRecords,
    manifest_id: manifestId,
  });
  return {
    blocking_gate_codes: outcomes.blocking_gate_codes,
    deferred_gate_codes: deferredGateCodes,
    gate_records: newRecords,
    missing_prerequisite_refs: missingPrerequisiteRefs,
    ordered_gate_records: orderedRecords.map((record) => structuredClone(record)),
    ordered_gate_refs: orderedRecords.map(gateDecisionRef),
    progression_ceiling_rank: outcomes.progression_ceiling_rank,
  };
}
