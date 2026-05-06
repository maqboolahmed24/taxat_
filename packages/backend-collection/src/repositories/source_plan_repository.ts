import {
  cloneSourcePlanRecord,
  normalizeSourcePlanRecord,
  sourcePlanRef,
  type SourcePlanRecord,
} from "../models/source_plan.ts";

export type StoredSourcePlanRecord = {
  manifest_id: string;
  persisted_at: string;
  source_plan: SourcePlanRecord;
  source_plan_hash: string;
  source_plan_id: string;
  source_plan_ref: string;
  source_plan_row_version: number;
};

export type SourcePlanRepositoryErrorCode =
  | "SOURCE_PLAN_DUPLICATE"
  | "SOURCE_PLAN_NOT_FOUND";

export class SourcePlanRepositoryError extends Error {
  readonly code: SourcePlanRepositoryErrorCode;

  constructor(code: SourcePlanRepositoryErrorCode, detail: string) {
    super(`${code}: ${detail}`);
    this.name = "SourcePlanRepositoryError";
    this.code = code;
  }
}

function cloneStored(record: StoredSourcePlanRecord) {
  return structuredClone(record);
}

function pushIndex(index: Map<string, string[]>, key: string, value: string) {
  const current = index.get(key) ?? [];
  if (!current.includes(value)) {
    current.push(value);
    index.set(key, current);
  }
}

export class SourcePlanRepository {
  private readonly plans = new Map<string, StoredSourcePlanRecord>();
  private readonly idsByManifest = new Map<string, string[]>();
  private readonly idByRef = new Map<string, string>();

  private listByIds(ids: string[]) {
    return ids
      .map((id) => this.plans.get(id))
      .filter((record): record is StoredSourcePlanRecord => record !== undefined)
      .sort((left, right) => left.persisted_at.localeCompare(right.persisted_at))
      .map((record) => cloneStored(record));
  }

  async persistSourcePlan(input: { persisted_at: string; source_plan: SourcePlanRecord }) {
    const sourcePlan = normalizeSourcePlanRecord(input.source_plan);
    const existing = this.plans.get(sourcePlan.source_plan_id);
    if (existing) {
      if (JSON.stringify(existing.source_plan) !== JSON.stringify(sourcePlan)) {
        throw new SourcePlanRepositoryError(
          "SOURCE_PLAN_DUPLICATE",
          `source plan ${sourcePlan.source_plan_id} already exists with a different payload`,
        );
      }
      return cloneStored(existing);
    }

    const ref = sourcePlanRef(sourcePlan);
    const stored: StoredSourcePlanRecord = {
      manifest_id: sourcePlan.manifest_id,
      persisted_at: input.persisted_at,
      source_plan: cloneSourcePlanRecord(sourcePlan),
      source_plan_hash: sourcePlan.source_plan_hash,
      source_plan_id: sourcePlan.source_plan_id,
      source_plan_ref: ref,
      source_plan_row_version: 1,
    };
    this.plans.set(stored.source_plan_id, cloneStored(stored));
    this.idByRef.set(stored.source_plan_ref, stored.source_plan_id);
    pushIndex(this.idsByManifest, stored.manifest_id, stored.source_plan_id);
    return cloneStored(stored);
  }

  async getSourcePlanById(sourcePlanId: string) {
    const stored = this.plans.get(sourcePlanId);
    return stored ? cloneStored(stored) : null;
  }

  async getSourcePlanByRef(sourcePlanRefValue: string) {
    const id = this.idByRef.get(sourcePlanRefValue);
    return id ? this.getSourcePlanById(id) : null;
  }

  async requireSourcePlanById(sourcePlanId: string) {
    const stored = await this.getSourcePlanById(sourcePlanId);
    if (!stored) {
      throw new SourcePlanRepositoryError(
        "SOURCE_PLAN_NOT_FOUND",
        `source plan ${sourcePlanId} does not exist`,
      );
    }
    return stored;
  }

  async listSourcePlansByManifestId(manifestId: string) {
    return this.listByIds(this.idsByManifest.get(manifestId) ?? []);
  }
}
