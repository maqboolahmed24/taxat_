import {
  gateDecisionRef,
  normalizeGateDecisionRecord,
  type GateDecisionRecord,
} from "../models/gate_decision_record.ts";
import {
  canonicalizeGateEffectiveScope,
  getCanonicalGateStageProfile,
} from "./get_canonical_gate_stage_profile.ts";
import {
  projectManifestGateOutcomes,
  type ManifestGateOutcomeProjection,
} from "./project_manifest_gate_outcomes.ts";

export type ManifestGateProjection = {
  effective_scope: GateDecisionRecord["effective_scope"];
  gate_decision_refs: string[];
  gate_records: GateDecisionRecord[];
  last_gate_stage_index: number;
  manifest_id: string;
  outcomes: ManifestGateOutcomeProjection;
  projection_version: number;
};

export type AppendManifestGatesInput = {
  effective_scope: readonly string[];
  gate_records: readonly GateDecisionRecord[];
  manifest_id: string;
  projection?: ManifestGateProjection | null;
};

function validatePrefixContinuity(records: readonly GateDecisionRecord[], effectiveScope: readonly string[]) {
  const recordsByCode = new Set(records.map((record) => record.gate_code));
  const applicableProfiles = getCanonicalGateStageProfile({ effective_scope: effectiveScope });
  for (const record of records) {
    for (const profile of applicableProfiles) {
      if (profile.gate_stage_index >= record.gate_stage_index) {
        break;
      }
      if (!recordsByCode.has(profile.gate_code)) {
        throw new Error(
          `${record.gate_code} cannot appear before required earlier ${profile.gate_code}`,
        );
      }
    }
  }
}

export function appendManifestGates(input: AppendManifestGatesInput): ManifestGateProjection {
  const effectiveScope = canonicalizeGateEffectiveScope(input.effective_scope);
  const existingRecords = (input.projection?.gate_records ?? []).map(normalizeGateDecisionRecord);
  const appendRecords = input.gate_records.map(normalizeGateDecisionRecord);
  const existingMaxStage = existingRecords.reduce(
    (max, record) => Math.max(max, record.gate_stage_index),
    0,
  );
  const seenStages = new Set(existingRecords.map((record) => record.gate_stage_index));
  const seenCodes = new Set(existingRecords.map((record) => record.gate_code));
  const seenIds = new Set(existingRecords.map((record) => record.gate_decision_id));
  for (const record of appendRecords) {
    if (record.manifest_id !== input.manifest_id) {
      throw new Error("appended gate records must share one manifest_id");
    }
    if (JSON.stringify(record.effective_scope) !== JSON.stringify(effectiveScope)) {
      throw new Error("appended gate records must share the manifest effective_scope");
    }
    if (record.gate_stage_index <= existingMaxStage) {
      throw new Error("gate records can only be appended after the current manifest gate prefix");
    }
    if (
      seenStages.has(record.gate_stage_index) ||
      seenCodes.has(record.gate_code) ||
      seenIds.has(record.gate_decision_id)
    ) {
      throw new Error("appended gate records must not duplicate stage, code, or id");
    }
    seenStages.add(record.gate_stage_index);
    seenCodes.add(record.gate_code);
    seenIds.add(record.gate_decision_id);
  }
  const gateRecords = [...existingRecords, ...appendRecords].sort(
    (left, right) => left.gate_stage_index - right.gate_stage_index,
  );
  validatePrefixContinuity(gateRecords, effectiveScope);
  const outcomes = projectManifestGateOutcomes({
    effective_scope: effectiveScope,
    gate_records: gateRecords,
    manifest_id: input.manifest_id,
  });
  return {
    effective_scope: effectiveScope,
    gate_decision_refs: gateRecords.map(gateDecisionRef),
    gate_records: gateRecords.map((record) => structuredClone(record)),
    last_gate_stage_index: gateRecords.at(-1)?.gate_stage_index ?? 0,
    manifest_id: input.manifest_id,
    outcomes,
    projection_version: (input.projection?.projection_version ?? 0) + 1,
  };
}
