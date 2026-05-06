# Compute Result Formula Engine With Exact Decimal Handling

`pc_0121` adds the first post-seal compute package at `packages/backend-compute`.

## Scope

The package builds schema-backed `ComputeResult` artifacts from frozen canonical fact contributions. It does not implement the full regulatory rule library. Instead, `compute_outcome.ts` produces deterministic record-layer and adjustment-layer totals, then calls an injectable `RuleEvaluationAdapter` so later rule-library work can replace the default pass-through vector without rewriting persistence, lifecycle, or exact-decimal handling.

## Exact Decimal Strategy

All money-bearing arithmetic uses the existing `domain-kernel` `ExactDecimal` primitive. Inputs must be canonical decimal strings: no JavaScript numbers, no exponent notation, no locale separators, and no negative zero. Intermediate sums preserve full exact scale. The engine rounds once at the declared aggregation boundary using the artifact `money_profile` scale and rounding mode, then persists fixed-scale canonical decimal strings.

The default money profile is GBP, scale 2, `HALF_UP`, and `CANONICAL_DECIMAL_STRING_V1`. Callers may pass another schema-valid money profile.

## Contribution Ordering

`canonical_fact_contribution_order.ts` normalizes every compute-bearing contribution and sorts within each slice by:

1. `business_partition`
2. `category`
3. `effective_date`
4. `canonical_fact_id`

This is independent of database insertion order and worker shard order.

## Reporting Scope

`reporting_scope_resolver.ts` accepts canonical runtime scope tokens and resolves exactly one reporting token: `year_end`, `quarterly_update`, or `estimate_only`. Amendment action tokens remain action posture over `year_end`; they cannot become a compute reporting scope.

## Compliance And Analysis Boundaries

Compliance runs accept only canonical, non-analysis facts. Provisional or analysis-only facts block the compute result with diagnostic reason codes instead of being ignored.

Analysis runs are always `analysis_only = true`. They may include provisional facts only when the frozen analysis policy explicitly sets `allow_provisional_facts = true`. Counterfactual adjustment modelling is likewise explicit through `allow_counterfactual_adjustments`.

## Quarterly And Year-End Totals

Quarterly compute is record-layer only and always sets `adjustment_inclusion_policy = RECORD_ONLY`.

`PERIODIC` quarterly basis uses the supplied quarter window. `CUMULATIVE` quarterly basis uses tax-year start through quarter end for the same facts, so the two profiles produce distinct totals when prior-quarter facts exist.

Year-end and estimate compute use the tax-year window. When adjustments are enabled, `ADJUSTMENT_FACT` contributions apply only when their `adjustment_binding` includes the resolved reporting scope, exact-partition application, and the matching compliance or counterfactual treatment.

Missing required `(business_partition, category)` slices are emitted as explicit zero money strings.

## Lifecycle And Persistence

`transition_compute_result.ts` implements:

- `NOT_RUN -> RUNNING` via `compute_start`
- `RUNNING -> COMPUTED` via `compute_success`
- `RUNNING -> BLOCKED` via `data_or_policy_block`
- `COMPUTED -> SUPERSEDED` via `newer_manifest_compute`

`ComputeResultRepository` is an in-memory compare-and-swap repository that stores row versions and transition history. The SQL migration `db/migrations/phase03_0121_compute_result.sql` defines the corresponding durable register and transition log shape for the control store.
