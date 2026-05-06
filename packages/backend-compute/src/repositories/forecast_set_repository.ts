import {
  cloneForecastSetRecord,
  forecastSetRef,
  normalizeForecastSetRecord,
  type ForecastSetRecord,
  type ForecastScenarioMode,
} from "../models/forecast_set.ts";

export type StoredForecastSetRecord = {
  baseline_compute_ref: string;
  forecast_id: string;
  forecast_profile_ref: string;
  forecast_ref: string;
  forecast_set: ForecastSetRecord;
  forecast_set_row_version: number;
  manifest_id: string;
  persisted_at: string;
  scenario_mode: ForecastScenarioMode;
};

export class ForecastSetRepositoryError extends Error {
  readonly code:
    | "FORECAST_SET_DUPLICATE"
    | "FORECAST_SET_NOT_FOUND"
    | "FORECAST_SET_REF_COLLISION";

  constructor(code: ForecastSetRepositoryError["code"], detail: string) {
    super(`${code}: ${detail}`);
    this.name = "ForecastSetRepositoryError";
    this.code = code;
  }
}

function cloneStored(record: StoredForecastSetRecord) {
  return structuredClone(record);
}

function pushIndex(index: Map<string, string[]>, key: string, value: string) {
  const current = index.get(key) ?? [];
  if (!current.includes(value)) {
    current.push(value);
    index.set(key, current);
  }
}

export class ForecastSetRepository {
  private readonly idByRef = new Map<string, string>();
  private readonly idsByBaselineCompute = new Map<string, string[]>();
  private readonly idsByManifest = new Map<string, string[]>();
  private readonly idsByProfile = new Map<string, string[]>();
  private readonly records = new Map<string, StoredForecastSetRecord>();

  private buildStored(input: {
    forecast_set: ForecastSetRecord;
    forecast_set_row_version: number;
    persisted_at: string;
  }): StoredForecastSetRecord {
    return {
      baseline_compute_ref: input.forecast_set.baseline_compute_ref,
      forecast_id: input.forecast_set.forecast_id,
      forecast_profile_ref: input.forecast_set.forecast_profile_ref,
      forecast_ref: forecastSetRef(input.forecast_set),
      forecast_set: cloneForecastSetRecord(input.forecast_set),
      forecast_set_row_version: input.forecast_set_row_version,
      manifest_id: input.forecast_set.manifest_id,
      persisted_at: input.persisted_at,
      scenario_mode: input.forecast_set.scenario_mode,
    };
  }

  private listByIds(ids: readonly string[]) {
    return ids
      .map((id) => this.records.get(id))
      .filter((record): record is StoredForecastSetRecord => record !== undefined)
      .sort((left, right) => left.persisted_at.localeCompare(right.persisted_at))
      .map((record) => cloneStored(record));
  }

  async persistForecastSet(input: {
    forecast_set: ForecastSetRecord;
    persisted_at: string;
  }) {
    const forecastSet = normalizeForecastSetRecord(input.forecast_set);
    const existing = this.records.get(forecastSet.forecast_id);
    if (existing) {
      if (JSON.stringify(existing.forecast_set) !== JSON.stringify(forecastSet)) {
        throw new ForecastSetRepositoryError(
          "FORECAST_SET_DUPLICATE",
          `forecast set ${forecastSet.forecast_id} already exists with a different payload`,
        );
      }
      return cloneStored(existing);
    }
    const ref = forecastSetRef(forecastSet);
    const refOwner = this.idByRef.get(ref);
    if (refOwner !== undefined) {
      throw new ForecastSetRepositoryError(
        "FORECAST_SET_REF_COLLISION",
        `forecast set ref ${ref} already belongs to ${refOwner}`,
      );
    }
    const stored = this.buildStored({
      forecast_set: forecastSet,
      forecast_set_row_version: 1,
      persisted_at: input.persisted_at,
    });
    this.records.set(stored.forecast_id, cloneStored(stored));
    this.idByRef.set(stored.forecast_ref, stored.forecast_id);
    pushIndex(this.idsByManifest, stored.manifest_id, stored.forecast_id);
    pushIndex(this.idsByBaselineCompute, stored.baseline_compute_ref, stored.forecast_id);
    pushIndex(this.idsByProfile, stored.forecast_profile_ref, stored.forecast_id);
    return cloneStored(stored);
  }

  async getForecastSetById(forecastId: string) {
    const stored = this.records.get(forecastId);
    return stored ? cloneStored(stored) : null;
  }

  async getForecastSetByRef(ref: string) {
    const id = this.idByRef.get(ref);
    return id === undefined ? null : this.getForecastSetById(id);
  }

  async requireForecastSetById(forecastId: string) {
    const stored = await this.getForecastSetById(forecastId);
    if (!stored) {
      throw new ForecastSetRepositoryError(
        "FORECAST_SET_NOT_FOUND",
        `forecast set ${forecastId} does not exist`,
      );
    }
    return stored;
  }

  async listForecastSetsByManifestId(manifestId: string) {
    return this.listByIds(this.idsByManifest.get(manifestId) ?? []);
  }

  async listForecastSetsByBaselineComputeRef(baselineComputeRef: string) {
    return this.listByIds(this.idsByBaselineCompute.get(baselineComputeRef) ?? []);
  }

  async listForecastSetsByProfileRef(profileRef: string) {
    return this.listByIds(this.idsByProfile.get(profileRef) ?? []);
  }
}
