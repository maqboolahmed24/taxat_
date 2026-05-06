import {
  cloneGateDecisionRecord,
  gateDecisionRef,
  normalizeGateDecisionRecord,
  type GateCode,
  type GateDecision,
  type GateDecisionRecord,
  type GateSeverity,
} from "../models/gate_decision_record.ts";

export type StoredGateDecisionRecord = {
  decision: GateDecision;
  gate_code: GateCode;
  gate_decision_id: string;
  gate_decision_record: GateDecisionRecord;
  gate_decision_record_row_version: 1;
  gate_decision_ref: string;
  gate_stage_index: GateDecisionRecord["gate_stage_index"];
  manifest_id: string;
  persisted_at: string;
  progression_rank: GateDecisionRecord["gate_semantics_contract"]["progression_rank"];
  severity: GateSeverity;
};

export class GateDecisionRecordRepositoryError extends Error {
  readonly code:
    | "GATE_DECISION_DUPLICATE"
    | "GATE_DECISION_NOT_FOUND"
    | "GATE_DECISION_REF_COLLISION"
    | "GATE_DECISION_STAGE_DUPLICATE";

  constructor(code: GateDecisionRecordRepositoryError["code"], detail: string) {
    super(`${code}: ${detail}`);
    this.name = "GateDecisionRecordRepositoryError";
    this.code = code;
  }
}

function cloneStored(record: StoredGateDecisionRecord) {
  return structuredClone(record);
}

function pushIndex(index: Map<string, string[]>, key: string, value: string) {
  const current = index.get(key) ?? [];
  if (!current.includes(value)) {
    current.push(value);
    index.set(key, current);
  }
}

function stageKey(record: Pick<GateDecisionRecord, "gate_stage_index" | "manifest_id">) {
  return `${record.manifest_id}::${record.gate_stage_index}`;
}

function codeKey(record: Pick<GateDecisionRecord, "gate_code" | "manifest_id">) {
  return `${record.manifest_id}::${record.gate_code}`;
}

export class GateDecisionRecordRepository {
  private readonly idByManifestCode = new Map<string, string>();
  private readonly idByManifestStage = new Map<string, string>();
  private readonly idByRef = new Map<string, string>();
  private idsByDecision = new Map<string, string[]>();
  private idsByGateCode = new Map<string, string[]>();
  private idsByManifest = new Map<string, string[]>();
  private idsBySeverity = new Map<string, string[]>();
  private readonly records = new Map<string, StoredGateDecisionRecord>();

  private buildStored(input: {
    gate_decision_record: GateDecisionRecord;
    persisted_at: string;
  }): StoredGateDecisionRecord {
    return {
      decision: input.gate_decision_record.decision,
      gate_code: input.gate_decision_record.gate_code,
      gate_decision_id: input.gate_decision_record.gate_decision_id,
      gate_decision_record: cloneGateDecisionRecord(input.gate_decision_record),
      gate_decision_record_row_version: 1,
      gate_decision_ref: gateDecisionRef(input.gate_decision_record),
      gate_stage_index: input.gate_decision_record.gate_stage_index,
      manifest_id: input.gate_decision_record.manifest_id,
      persisted_at: input.persisted_at,
      progression_rank: input.gate_decision_record.gate_semantics_contract.progression_rank,
      severity: input.gate_decision_record.severity,
    };
  }

  private rebuildIndexes() {
    this.idByManifestCode.clear();
    this.idByManifestStage.clear();
    this.idByRef.clear();
    this.idsByDecision = new Map();
    this.idsByGateCode = new Map();
    this.idsByManifest = new Map();
    this.idsBySeverity = new Map();
    for (const stored of this.records.values()) {
      this.idByManifestCode.set(codeKey(stored.gate_decision_record), stored.gate_decision_id);
      this.idByManifestStage.set(stageKey(stored.gate_decision_record), stored.gate_decision_id);
      this.idByRef.set(stored.gate_decision_ref, stored.gate_decision_id);
      pushIndex(this.idsByDecision, stored.decision, stored.gate_decision_id);
      pushIndex(this.idsByGateCode, stored.gate_code, stored.gate_decision_id);
      pushIndex(this.idsByManifest, stored.manifest_id, stored.gate_decision_id);
      pushIndex(this.idsBySeverity, stored.severity, stored.gate_decision_id);
    }
  }

  private listByIds(ids: readonly string[]) {
    return ids
      .map((id) => this.records.get(id))
      .filter((record): record is StoredGateDecisionRecord => record !== undefined)
      .sort((left, right) => {
        if (left.gate_stage_index !== right.gate_stage_index) {
          return left.gate_stage_index - right.gate_stage_index;
        }
        return left.persisted_at.localeCompare(right.persisted_at);
      })
      .map((record) => cloneStored(record));
  }

  async persistGateDecisionRecord(input: {
    gate_decision_record: GateDecisionRecord;
    persisted_at: string;
  }) {
    const gateDecisionRecord = normalizeGateDecisionRecord(input.gate_decision_record);
    const existing = this.records.get(gateDecisionRecord.gate_decision_id);
    if (existing) {
      if (JSON.stringify(existing.gate_decision_record) !== JSON.stringify(gateDecisionRecord)) {
        throw new GateDecisionRecordRepositoryError(
          "GATE_DECISION_DUPLICATE",
          `gate decision ${gateDecisionRecord.gate_decision_id} already exists with a different payload`,
        );
      }
      return cloneStored(existing);
    }
    const existingStageOwner = this.idByManifestStage.get(stageKey(gateDecisionRecord));
    if (existingStageOwner !== undefined) {
      const stageOwner = this.records.get(existingStageOwner);
      if (
        stageOwner &&
        JSON.stringify(stageOwner.gate_decision_record) === JSON.stringify(gateDecisionRecord)
      ) {
        return cloneStored(stageOwner);
      }
      throw new GateDecisionRecordRepositoryError(
        "GATE_DECISION_STAGE_DUPLICATE",
        `manifest ${gateDecisionRecord.manifest_id} already has a different gate for stage ${
          gateDecisionRecord.gate_stage_index
        }`,
      );
    }
    const existingCodeOwner = this.idByManifestCode.get(codeKey(gateDecisionRecord));
    if (existingCodeOwner !== undefined) {
      throw new GateDecisionRecordRepositoryError(
        "GATE_DECISION_STAGE_DUPLICATE",
        `manifest ${gateDecisionRecord.manifest_id} already has a different ${gateDecisionRecord.gate_code}`,
      );
    }
    const ref = gateDecisionRef(gateDecisionRecord);
    const refOwner = this.idByRef.get(ref);
    if (refOwner !== undefined) {
      throw new GateDecisionRecordRepositoryError(
        "GATE_DECISION_REF_COLLISION",
        `gate decision ref ${ref} already belongs to ${refOwner}`,
      );
    }
    const stored = this.buildStored({
      gate_decision_record: gateDecisionRecord,
      persisted_at: input.persisted_at,
    });
    this.records.set(stored.gate_decision_id, cloneStored(stored));
    this.rebuildIndexes();
    return cloneStored(stored);
  }

  async getGateDecisionById(gateDecisionId: string) {
    const stored = this.records.get(gateDecisionId);
    return stored ? cloneStored(stored) : null;
  }

  async getGateDecisionByRef(ref: string) {
    const id = this.idByRef.get(ref);
    return id === undefined ? null : this.getGateDecisionById(id);
  }

  async requireGateDecisionById(gateDecisionId: string) {
    const stored = await this.getGateDecisionById(gateDecisionId);
    if (!stored) {
      throw new GateDecisionRecordRepositoryError(
        "GATE_DECISION_NOT_FOUND",
        `gate decision ${gateDecisionId} does not exist`,
      );
    }
    return stored;
  }

  async listGateDecisionsByDecision(decision: GateDecision) {
    return this.listByIds(this.idsByDecision.get(decision) ?? []);
  }

  async listGateDecisionsByGateCode(gateCode: GateCode) {
    return this.listByIds(this.idsByGateCode.get(gateCode) ?? []);
  }

  async listGateDecisionsByManifestId(manifestId: string) {
    return this.listByIds(this.idsByManifest.get(manifestId) ?? []);
  }

  async listGateDecisionsBySeverity(severity: GateSeverity) {
    return this.listByIds(this.idsBySeverity.get(severity) ?? []);
  }
}
