# Forecast Set Generation With Execution Mode Boundary Enforcement

`pc_0122` adds deterministic `ForecastSet` generation to `packages/backend-compute`.

## Boundary

Forecast generation is analysis-only. `enforce_forecast_execution_boundary.ts` rejects any compliance-mode forecast request with a typed `FORECAST_COMPLIANCE_MODE_REJECTED` error before an artifact is built. Emitted forecast artifacts always have `execution_mode = ANALYSIS` and `analysis_only = true`.

The baseline `ComputeResult` is treated as frozen input. Forecast generation reads its reportable totals and artifact ref but never mutates or supersedes the compute result.

## Baseline Series

`forecast_baseline_series_builder.ts` derives category totals from `ComputeResult.totals.reportable_totals`. Keys of the form `business_partition=...|category=...` are grouped by category, preserving partition-aware compute truth while providing the category baseline required by the forecast formula.

Each forecast category declares `baseline_steps`. Categories with `baseline_steps = 0` are omitted. If every category is omitted, generation fails closed with `FORECAST_EMPTY_BASELINE`.

## Horizon And Scenario Ordering

Point forecasts are ordered by `(horizon_code, category_code)`.

Monte Carlo scenarios are ordered by stable ids `scenario-0001`, `scenario-0002`, and so on. Scenario values use the same `(horizon_code, category_code)` order as the point forecasts. `POINT_ONLY` mode emits empty `scenarios[]` and `seeds[]`.

## Seed Derivation

`forecast_seed_deriver.ts` is the single implementation of the algorithmic `SEED(...)` and formula-layer `forecast_seed`:

`hash(deterministic_seed, hash(canonical_forecast_profile), scenario_id)`

The service emits `forecast-seed://...` strings and binds each `scenario_id` to exactly one seed record.

## Formula

For each category and horizon, the point forecast uses:

`baseline_total / baseline_steps * normalized_seasonality * exp(annualized_growth_rate * horizon_years)`

Money values use the exact-decimal adapter from `pc_0121`; floating coefficients are quantized into canonical decimal factors before money multiplication and the result is serialized once through the `money_profile`.

Monte Carlo residuals are deterministic from scenario seeds, normalized to zero mean and unit scale across the scenario set for each `(horizon, category)`, then applied through frozen `residual_scale`, `forecast_floor`, and `forecast_cap`.
