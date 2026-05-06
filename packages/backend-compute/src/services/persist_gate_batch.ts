import {
  gateDecisionRef,
  normalizeGateDecisionRecord,
  type GateDecisionRecord,
} from "../models/gate_decision_record.ts";
import {
  GateDecisionRecordRepository,
  type StoredGateDecisionRecord,
} from "../repositories/gate_decision_record_repository.ts";

export type GateBatchPersistedEvent = {
  decision: GateDecisionRecord["decision"];
  event_type: "GATE_DECISION_RECORDED";
  gate_code: GateDecisionRecord["gate_code"];
  gate_decision_ref: string;
  gate_stage_index: GateDecisionRecord["gate_stage_index"];
  manifest_id: string;
  persisted_at: string;
};

function validateBatch(records: readonly GateDecisionRecord[]) {
  const normalized = records.map(normalizeGateDecisionRecord).sort(
    (left, right) => left.gate_stage_index - right.gate_stage_index,
  );
  const seenStages = new Set<number>();
  const seenCodes = new Set<string>();
  const seenIds = new Set<string>();
  for (const record of normalized) {
    const first = normalized[0];
    if (
      first &&
      (record.manifest_id !== first.manifest_id ||
        JSON.stringify(record.effective_scope) !== JSON.stringify(first.effective_scope))
    ) {
      throw new Error("gate batches must share one manifest_id and effective_scope");
    }
    if (
      seenStages.has(record.gate_stage_index) ||
      seenCodes.has(record.gate_code) ||
      seenIds.has(record.gate_decision_id)
    ) {
      throw new Error("gate batches must not duplicate stage, code, or id");
    }
    seenStages.add(record.gate_stage_index);
    seenCodes.add(record.gate_code);
    seenIds.add(record.gate_decision_id);
  }
  return normalized;
}

export async function persistGateBatch(input: {
  gate_records: readonly GateDecisionRecord[];
  persisted_at: string;
  repository: GateDecisionRecordRepository;
}): Promise<{
  gate_events: GateBatchPersistedEvent[];
  stored_records: StoredGateDecisionRecord[];
}> {
  const records = validateBatch(input.gate_records);
  const storedRecords: StoredGateDecisionRecord[] = [];
  for (const record of records) {
    storedRecords.push(
      await input.repository.persistGateDecisionRecord({
        gate_decision_record: record,
        persisted_at: input.persisted_at,
      }),
    );
  }
  return {
    gate_events: records.map((record) => ({
      decision: record.decision,
      event_type: "GATE_DECISION_RECORDED",
      gate_code: record.gate_code,
      gate_decision_ref: gateDecisionRef(record),
      gate_stage_index: record.gate_stage_index,
      manifest_id: record.manifest_id,
      persisted_at: input.persisted_at,
    })),
    stored_records: storedRecords,
  };
}
