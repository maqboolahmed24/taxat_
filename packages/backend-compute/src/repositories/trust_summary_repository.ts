import {
  cloneTrustSummaryRecord,
  normalizeTrustSummaryRecord,
  trustSummaryRef,
  type TrustBand,
  type TrustLifecycleState,
  type TrustSummaryExecutionMode,
  type TrustSummaryRecord,
} from "../models/trust_summary.ts";

export type StoredTrustSummaryRecord = {
  automation_level: TrustSummaryRecord["automation_level"];
  execution_mode: TrustSummaryExecutionMode;
  lifecycle_state: TrustLifecycleState;
  manifest_id: string;
  persisted_at: string;
  trust_band: TrustBand;
  trust_id: string;
  trust_ref: string;
  trust_score: number;
  trust_summary: TrustSummaryRecord;
  trust_summary_row_version: number;
  upstream_gate_cap: TrustSummaryRecord["upstream_gate_cap"];
};

export class TrustSummaryRepositoryError extends Error {
  readonly code:
    | "TRUST_SUMMARY_DUPLICATE"
    | "TRUST_SUMMARY_NOT_FOUND"
    | "TRUST_SUMMARY_REF_COLLISION"
    | "TRUST_SUMMARY_STALE_WRITE";

  constructor(code: TrustSummaryRepositoryError["code"], detail: string) {
    super(`${code}: ${detail}`);
    this.name = "TrustSummaryRepositoryError";
    this.code = code;
  }
}

function cloneStored(record: StoredTrustSummaryRecord) {
  return structuredClone(record);
}

function pushIndex(index: Map<string, string[]>, key: string, value: string) {
  const current = index.get(key) ?? [];
  if (!current.includes(value)) {
    current.push(value);
    index.set(key, current);
  }
}

export class TrustSummaryRepository {
  private readonly idByRef = new Map<string, string>();
  private idsByAutomation = new Map<string, string[]>();
  private idsByBand = new Map<string, string[]>();
  private idsByExecutionMode = new Map<string, string[]>();
  private idsByLifecycle = new Map<string, string[]>();
  private idsByManifest = new Map<string, string[]>();
  private idsByUpstreamGateCap = new Map<string, string[]>();
  private readonly records = new Map<string, StoredTrustSummaryRecord>();

  private buildStored(input: {
    persisted_at: string;
    trust_summary: TrustSummaryRecord;
    trust_summary_row_version: number;
  }): StoredTrustSummaryRecord {
    return {
      automation_level: input.trust_summary.automation_level,
      execution_mode: input.trust_summary.execution_mode,
      lifecycle_state: input.trust_summary.lifecycle_state,
      manifest_id: input.trust_summary.manifest_id,
      persisted_at: input.persisted_at,
      trust_band: input.trust_summary.trust_band,
      trust_id: input.trust_summary.trust_id,
      trust_ref: trustSummaryRef(input.trust_summary),
      trust_score: input.trust_summary.trust_score,
      trust_summary: cloneTrustSummaryRecord(input.trust_summary),
      trust_summary_row_version: input.trust_summary_row_version,
      upstream_gate_cap: input.trust_summary.upstream_gate_cap,
    };
  }

  private rebuildIndexes() {
    this.idsByAutomation = new Map();
    this.idsByBand = new Map();
    this.idsByExecutionMode = new Map();
    this.idsByLifecycle = new Map();
    this.idsByManifest = new Map();
    this.idsByUpstreamGateCap = new Map();
    this.idByRef.clear();
    for (const stored of this.records.values()) {
      this.idByRef.set(stored.trust_ref, stored.trust_id);
      pushIndex(this.idsByAutomation, stored.automation_level, stored.trust_id);
      pushIndex(this.idsByBand, stored.trust_band, stored.trust_id);
      pushIndex(this.idsByExecutionMode, stored.execution_mode, stored.trust_id);
      pushIndex(this.idsByLifecycle, stored.lifecycle_state, stored.trust_id);
      pushIndex(this.idsByManifest, stored.manifest_id, stored.trust_id);
      pushIndex(this.idsByUpstreamGateCap, stored.upstream_gate_cap, stored.trust_id);
    }
  }

  private listByIds(ids: readonly string[]) {
    return ids
      .map((id) => this.records.get(id))
      .filter((record): record is StoredTrustSummaryRecord => record !== undefined)
      .sort((left, right) => left.persisted_at.localeCompare(right.persisted_at))
      .map((record) => cloneStored(record));
  }

  async persistTrustSummary(input: {
    persisted_at: string;
    trust_summary: TrustSummaryRecord;
  }) {
    const trustSummary = normalizeTrustSummaryRecord(input.trust_summary);
    const existing = this.records.get(trustSummary.trust_id);
    if (existing) {
      if (JSON.stringify(existing.trust_summary) !== JSON.stringify(trustSummary)) {
        throw new TrustSummaryRepositoryError(
          "TRUST_SUMMARY_DUPLICATE",
          `trust summary ${trustSummary.trust_id} already exists with a different payload`,
        );
      }
      return cloneStored(existing);
    }
    const ref = trustSummaryRef(trustSummary);
    const refOwner = this.idByRef.get(ref);
    if (refOwner !== undefined) {
      throw new TrustSummaryRepositoryError(
        "TRUST_SUMMARY_REF_COLLISION",
        `trust summary ref ${ref} already belongs to ${refOwner}`,
      );
    }
    const stored = this.buildStored({
      persisted_at: input.persisted_at,
      trust_summary: trustSummary,
      trust_summary_row_version: 1,
    });
    this.records.set(stored.trust_id, cloneStored(stored));
    this.rebuildIndexes();
    return cloneStored(stored);
  }

  async compareAndSwapTrustSummary(input: {
    expected_row_version: number;
    persisted_at: string;
    trust_id: string;
    trust_summary: TrustSummaryRecord;
  }) {
    const existing = this.records.get(input.trust_id);
    if (!existing) {
      throw new TrustSummaryRepositoryError(
        "TRUST_SUMMARY_NOT_FOUND",
        `trust summary ${input.trust_id} does not exist`,
      );
    }
    if (existing.trust_summary_row_version !== input.expected_row_version) {
      throw new TrustSummaryRepositoryError(
        "TRUST_SUMMARY_STALE_WRITE",
        `trust summary ${input.trust_id} row version is ${existing.trust_summary_row_version}`,
      );
    }
    const trustSummary = normalizeTrustSummaryRecord(input.trust_summary);
    if (trustSummary.trust_id !== input.trust_id) {
      throw new TrustSummaryRepositoryError(
        "TRUST_SUMMARY_REF_COLLISION",
        "compare-and-swap cannot replace a trust summary with a different trust_id",
      );
    }
    const stored = this.buildStored({
      persisted_at: input.persisted_at,
      trust_summary: trustSummary,
      trust_summary_row_version: existing.trust_summary_row_version + 1,
    });
    this.records.set(stored.trust_id, cloneStored(stored));
    this.rebuildIndexes();
    return cloneStored(stored);
  }

  async getTrustSummaryById(trustId: string) {
    const stored = this.records.get(trustId);
    return stored ? cloneStored(stored) : null;
  }

  async getTrustSummaryByRef(ref: string) {
    const id = this.idByRef.get(ref);
    return id === undefined ? null : this.getTrustSummaryById(id);
  }

  async requireTrustSummaryById(trustId: string) {
    const stored = await this.getTrustSummaryById(trustId);
    if (!stored) {
      throw new TrustSummaryRepositoryError(
        "TRUST_SUMMARY_NOT_FOUND",
        `trust summary ${trustId} does not exist`,
      );
    }
    return stored;
  }

  async listTrustSummariesByAutomationLevel(automationLevel: TrustSummaryRecord["automation_level"]) {
    return this.listByIds(this.idsByAutomation.get(automationLevel) ?? []);
  }

  async listTrustSummariesByBand(trustBand: TrustBand) {
    return this.listByIds(this.idsByBand.get(trustBand) ?? []);
  }

  async listTrustSummariesByExecutionMode(executionMode: TrustSummaryExecutionMode) {
    return this.listByIds(this.idsByExecutionMode.get(executionMode) ?? []);
  }

  async listTrustSummariesByLifecycleState(lifecycleState: TrustLifecycleState) {
    return this.listByIds(this.idsByLifecycle.get(lifecycleState) ?? []);
  }

  async listTrustSummariesByManifestId(manifestId: string) {
    return this.listByIds(this.idsByManifest.get(manifestId) ?? []);
  }

  async listTrustSummariesByUpstreamGateCap(upstreamGateCap: TrustSummaryRecord["upstream_gate_cap"]) {
    return this.listByIds(this.idsByUpstreamGateCap.get(upstreamGateCap) ?? []);
  }
}
