import {
  gateDecisionRef,
  normalizeGateDecisionRecord,
  type GateCode,
  type GateDecisionRecord,
} from "../models/gate_decision_record.ts";
import {
  canonicalizeGateEffectiveScope,
  getCanonicalGateStageProfile,
} from "./get_canonical_gate_stage_profile.ts";

export type ManifestGateOutcomeProjectionState =
  | "AUTO_ELIGIBLE"
  | "NOTICE_ONLY"
  | "REVIEW_REQUIRED"
  | "BLOCKED";

export type ManifestGateOutcomeProjection = {
  blocking_gate_codes: GateCode[];
  deferred_gate_codes: GateCode[];
  effective_scope: GateDecisionRecord["effective_scope"];
  evaluated_gate_codes: GateCode[];
  gate_decision_refs: string[];
  last_gate_stage_index: number;
  manifest_id: string;
  notice_gate_codes: GateCode[];
  ordered_gate_decision_ids: string[];
  progression_ceiling_rank: GateDecisionRecord["gate_semantics_contract"]["progression_rank"];
  projection_state: ManifestGateOutcomeProjectionState;
  review_gate_codes: GateCode[];
  terminal_blocking_gate_ref: string | null;
};

function orderedUnique<T>(values: readonly T[]) {
  return [...new Set(values)];
}

function normalizeProjectionRecords(input: {
  effective_scope: readonly string[];
  gate_records: readonly GateDecisionRecord[];
  manifest_id: string;
}) {
  const effectiveScope = canonicalizeGateEffectiveScope(input.effective_scope);
  const records = input.gate_records.map(normalizeGateDecisionRecord).sort((left, right) => {
    if (left.gate_stage_index !== right.gate_stage_index) {
      return left.gate_stage_index - right.gate_stage_index;
    }
    return left.gate_code.localeCompare(right.gate_code);
  });
  const seenStage = new Set<number>();
  const seenCode = new Set<string>();
  const seenId = new Set<string>();
  for (const record of records) {
    if (record.manifest_id !== input.manifest_id) {
      throw new Error("gate projection records must share one manifest_id");
    }
    if (JSON.stringify(record.effective_scope) !== JSON.stringify(effectiveScope)) {
      throw new Error("gate projection records must share the manifest effective_scope");
    }
    if (
      seenStage.has(record.gate_stage_index) ||
      seenCode.has(record.gate_code) ||
      seenId.has(record.gate_decision_id)
    ) {
      throw new Error("gate projection records must not duplicate stage, code, or id");
    }
    seenStage.add(record.gate_stage_index);
    seenCode.add(record.gate_code);
    seenId.add(record.gate_decision_id);
  }
  return { effectiveScope, records };
}

export function projectManifestGateOutcomes(input: {
  effective_scope: readonly string[];
  gate_records: readonly GateDecisionRecord[];
  manifest_id: string;
}): ManifestGateOutcomeProjection {
  const { effectiveScope, records } = normalizeProjectionRecords(input);
  const evaluatedGateCodes = records.map((record) => record.gate_code);
  const evaluatedGateCodeSet = new Set(evaluatedGateCodes);
  const deferredGateCodes = getCanonicalGateStageProfile({ effective_scope: effectiveScope })
    .map((profile) => profile.gate_code)
    .filter((gateCode) => !evaluatedGateCodeSet.has(gateCode));
  const blockingRecords = records.filter(
    (record) => record.decision === "OVERRIDABLE_BLOCK" || record.decision === "HARD_BLOCK",
  );
  const reviewRecords = records.filter((record) => record.decision === "MANUAL_REVIEW");
  const noticeRecords = records.filter((record) => record.decision === "PASS_WITH_NOTICE");
  const progressionCeiling = records.reduce<
    GateDecisionRecord["gate_semantics_contract"]["progression_rank"]
  >(
    (ceiling, record) =>
      record.gate_semantics_contract.progression_rank < ceiling
        ? record.gate_semantics_contract.progression_rank
        : ceiling,
    2,
  );
  const projectionState: ManifestGateOutcomeProjectionState =
    blockingRecords.length > 0
      ? "BLOCKED"
      : reviewRecords.length > 0
        ? "REVIEW_REQUIRED"
        : noticeRecords.length > 0
          ? "NOTICE_ONLY"
          : "AUTO_ELIGIBLE";
  return {
    blocking_gate_codes: orderedUnique(blockingRecords.map((record) => record.gate_code)),
    deferred_gate_codes: deferredGateCodes,
    effective_scope: effectiveScope,
    evaluated_gate_codes: evaluatedGateCodes,
    gate_decision_refs: records.map(gateDecisionRef),
    last_gate_stage_index: records.at(-1)?.gate_stage_index ?? 0,
    manifest_id: input.manifest_id,
    notice_gate_codes: orderedUnique(noticeRecords.map((record) => record.gate_code)),
    ordered_gate_decision_ids: records.map((record) => record.gate_decision_id),
    progression_ceiling_rank: progressionCeiling,
    projection_state: projectionState,
    review_gate_codes: orderedUnique(reviewRecords.map((record) => record.gate_code)),
    terminal_blocking_gate_ref: blockingRecords[0] ? gateDecisionRef(blockingRecords[0]) : null,
  };
}
