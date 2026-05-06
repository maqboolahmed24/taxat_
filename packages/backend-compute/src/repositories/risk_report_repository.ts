import {
  cloneRiskReportRecord,
  normalizeRiskReportRecord,
  riskReportRef,
  type RiskReportExecutionMode,
  type RiskReportRecord,
} from "../models/risk_report.ts";

export type StoredRiskReportRecord = {
  execution_mode: RiskReportExecutionMode;
  manifest_id: string;
  persisted_at: string;
  risk_id: string;
  risk_ref: string;
  risk_report: RiskReportRecord;
  risk_report_row_version: number;
  risk_score: number;
  risk_threshold_profile_ref: string;
};

export class RiskReportRepositoryError extends Error {
  readonly code:
    | "RISK_REPORT_DUPLICATE"
    | "RISK_REPORT_NOT_FOUND"
    | "RISK_REPORT_REF_COLLISION";

  constructor(code: RiskReportRepositoryError["code"], detail: string) {
    super(`${code}: ${detail}`);
    this.name = "RiskReportRepositoryError";
    this.code = code;
  }
}

function cloneStored(record: StoredRiskReportRecord) {
  return structuredClone(record);
}

function pushIndex(index: Map<string, string[]>, key: string, value: string) {
  const current = index.get(key) ?? [];
  if (!current.includes(value)) {
    current.push(value);
    index.set(key, current);
  }
}

export class RiskReportRepository {
  private readonly idByRef = new Map<string, string>();
  private readonly idsByExecutionMode = new Map<RiskReportExecutionMode, string[]>();
  private readonly idsByManifest = new Map<string, string[]>();
  private readonly idsByProfile = new Map<string, string[]>();
  private readonly records = new Map<string, StoredRiskReportRecord>();

  private buildStored(input: {
    persisted_at: string;
    risk_report: RiskReportRecord;
    risk_report_row_version: number;
  }): StoredRiskReportRecord {
    return {
      execution_mode: input.risk_report.execution_mode,
      manifest_id: input.risk_report.manifest_id,
      persisted_at: input.persisted_at,
      risk_id: input.risk_report.risk_id,
      risk_ref: riskReportRef(input.risk_report),
      risk_report: cloneRiskReportRecord(input.risk_report),
      risk_report_row_version: input.risk_report_row_version,
      risk_score: input.risk_report.risk_score,
      risk_threshold_profile_ref: input.risk_report.risk_threshold_profile_ref,
    };
  }

  private listByIds(ids: readonly string[]) {
    return ids
      .map((id) => this.records.get(id))
      .filter((record): record is StoredRiskReportRecord => record !== undefined)
      .sort((left, right) => left.persisted_at.localeCompare(right.persisted_at))
      .map((record) => cloneStored(record));
  }

  async persistRiskReport(input: {
    persisted_at: string;
    risk_report: RiskReportRecord;
  }) {
    const riskReport = normalizeRiskReportRecord(input.risk_report);
    const existing = this.records.get(riskReport.risk_id);
    if (existing) {
      if (JSON.stringify(existing.risk_report) !== JSON.stringify(riskReport)) {
        throw new RiskReportRepositoryError(
          "RISK_REPORT_DUPLICATE",
          `risk report ${riskReport.risk_id} already exists with a different payload`,
        );
      }
      return cloneStored(existing);
    }
    const ref = riskReportRef(riskReport);
    const refOwner = this.idByRef.get(ref);
    if (refOwner !== undefined) {
      throw new RiskReportRepositoryError(
        "RISK_REPORT_REF_COLLISION",
        `risk report ref ${ref} already belongs to ${refOwner}`,
      );
    }
    const stored = this.buildStored({
      persisted_at: input.persisted_at,
      risk_report: riskReport,
      risk_report_row_version: 1,
    });
    this.records.set(stored.risk_id, cloneStored(stored));
    this.idByRef.set(stored.risk_ref, stored.risk_id);
    pushIndex(this.idsByManifest, stored.manifest_id, stored.risk_id);
    pushIndex(this.idsByProfile, stored.risk_threshold_profile_ref, stored.risk_id);
    pushIndex(this.idsByExecutionMode, stored.execution_mode, stored.risk_id);
    return cloneStored(stored);
  }

  async getRiskReportById(riskId: string) {
    const stored = this.records.get(riskId);
    return stored ? cloneStored(stored) : null;
  }

  async getRiskReportByRef(ref: string) {
    const id = this.idByRef.get(ref);
    return id === undefined ? null : this.getRiskReportById(id);
  }

  async requireRiskReportById(riskId: string) {
    const stored = await this.getRiskReportById(riskId);
    if (!stored) {
      throw new RiskReportRepositoryError(
        "RISK_REPORT_NOT_FOUND",
        `risk report ${riskId} does not exist`,
      );
    }
    return stored;
  }

  async listRiskReportsByManifestId(manifestId: string) {
    return this.listByIds(this.idsByManifest.get(manifestId) ?? []);
  }

  async listRiskReportsByProfileRef(profileRef: string) {
    return this.listByIds(this.idsByProfile.get(profileRef) ?? []);
  }

  async listRiskReportsByExecutionMode(executionMode: RiskReportExecutionMode) {
    return this.listByIds(this.idsByExecutionMode.get(executionMode) ?? []);
  }
}
