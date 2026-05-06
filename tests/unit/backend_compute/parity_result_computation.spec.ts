import { expect, test } from "@playwright/test";

import {
  type CalculationBasisRecord,
  type ComputeFactContribution,
  type ComputeMoneyProfile,
  computeOutcome,
  evaluateParity,
  ParityResultRepository,
  type ParityThresholdProfile,
  transitionParityResult,
} from "../../../packages/backend-compute/src/index.ts";

const moneyProfile: ComputeMoneyProfile = {
  aggregation_boundary: "DECLARED_AGGREGATION_BOUNDARY_ONLY",
  currency_code: "GBP",
  rounding_mode: "HALF_UP",
  scale: 2,
  serialization_profile: "CANONICAL_DECIMAL_STRING_V1",
};

function fact(input: {
  amount: string;
  category: string;
  fact_id: string;
}): ComputeFactContribution {
  return {
    business_partition: "partition://self-employment/main",
    canonical_fact_id: input.fact_id,
    canonical_fact_ref: `canonical-fact://${input.fact_id}`,
    category: input.category,
    effective_date: "2026-04-01",
    fact_family: "RECORD_FACT",
    manifest_id: "manifest-0124-unit",
    partition_scope_refs: ["partition://self-employment/main"],
    promotion_state: "CANONICAL",
    signed_amount: input.amount,
  };
}

async function baselineCompute() {
  const result = await computeOutcome({
    canonical_facts: [
      fact({ amount: "120.00", category: "turnover", fact_id: "fact-turnover" }),
      fact({ amount: "30.00", category: "expenses", fact_id: "fact-expenses" }),
    ],
    computed_at: "2026-04-28T15:00:00Z",
    execution_mode: "COMPLIANCE",
    manifest_id: "manifest-0124-unit",
    money_profile: moneyProfile,
    rule_version_ref: "rule-version://compute/0124",
    runtime_scope: ["year_end"],
    tax_year_window: { end_date: "2026-12-31", start_date: "2026-01-01" },
  });
  return result.compute_result;
}

const calculationBasis: CalculationBasisRecord = {
  artifact_type: "CalculationBasis",
  basis_hash: "basis-hash://0124/unit",
  basis_payload_ref: "authority-payload://0124/unit",
  basis_status: "CONFIRMED",
  calculation_basis_id: "calc-basis-0124-unit",
  manifest_id: "manifest-0124-unit",
  parity_reusable: true,
};

function thresholdProfile(fields: ParityThresholdProfile["fields"]): ParityThresholdProfile {
  return {
    blocking_ratio_cap: 3,
    fields,
    minimum_rel_floor: "1.00",
    parity_threshold_profile_ref: "parity-threshold-profile://unit/0124",
  };
}

test("matching authority values produce a schema posture match", async () => {
  const compute = await baselineCompute();
  const result = await evaluateParity({
    calculation_basis: calculationBasis,
    compute_result: compute,
    created_at: "2026-04-28T15:05:00Z",
    execution_mode: "COMPLIANCE",
    threshold_profile: thresholdProfile([
      {
        abs_floor: "1.00",
        abs_threshold: "5.00",
        authority_value: "90.00",
        criticality_class: "CRITICAL",
        criticality_weight: 2,
        field_code: "net_income",
        internal_value: "90.00",
        rel_threshold: 0.05,
      },
      {
        abs_floor: "1.00",
        abs_threshold: "10.00",
        authority_value: "120.00",
        criticality_class: "HIGH",
        criticality_weight: 1,
        field_code: "turnover",
        internal_value: "120.00",
        rel_threshold: 0.1,
      },
    ]),
  });

  expect(result.parity_result.parity_classification).toBe("MATCH");
  expect(result.parity_result.parity_score).toBe(100);
  expect(result.parity_result.weighted_parity_pressure).toBe(0);
  expect(result.parity_result.reason_codes).toEqual(["PARITY_MATCH"]);
  expect(result.parity_result.ordered_field_codes).toEqual(["net_income", "turnover"]);
});

test("breach ratio equality at one is material, not minor", async () => {
  const compute = await baselineCompute();
  const result = await evaluateParity({
    calculation_basis: calculationBasis,
    compute_result: compute,
    created_at: "2026-04-28T15:06:00Z",
    execution_mode: "COMPLIANCE",
    threshold_profile: thresholdProfile([
      {
        abs_floor: "1.00",
        abs_threshold: "10.00",
        authority_value: "100.00",
        criticality_class: "HIGH",
        criticality_weight: 1,
        field_code: "turnover",
        internal_value: "110.00",
        rel_threshold: 1,
      },
    ]),
  });

  expect(result.parity_result.deltas.turnover.breach_ratio).toBe(1);
  expect(result.parity_result.deltas.turnover.field_class).toBe("MATERIAL_DIFFERENCE");
  expect(result.parity_result.parity_classification).toBe("MATERIAL_DIFFERENCE");
  expect(result.parity_result.parity_score).toBe(67);
});

test("critical blocking field takes aggregate blocking precedence", async () => {
  const compute = await baselineCompute();
  const result = await evaluateParity({
    calculation_basis: calculationBasis,
    compute_result: compute,
    created_at: "2026-04-28T15:07:00Z",
    execution_mode: "COMPLIANCE",
    threshold_profile: thresholdProfile([
      {
        abs_floor: "1.00",
        abs_threshold: "10.00",
        authority_value: "100.00",
        criticality_class: "CRITICAL",
        criticality_weight: 1,
        field_code: "tax_due",
        internal_value: "125.00",
        rel_threshold: 1,
      },
    ]),
  });

  expect(result.parity_result.deltas.tax_due.breach_ratio).toBe(2.5);
  expect(result.parity_result.parity_classification).toBe("BLOCKING_DIFFERENCE");
  expect(result.parity_result.critical_blocking_field_count).toBe(1);
  expect(result.parity_result.reason_codes).toEqual(["PARITY_BLOCKING_DIFFERENCE"]);
});

test("mandatory partial authority coverage is not comparable", async () => {
  const compute = await baselineCompute();
  const result = await evaluateParity({
    calculation_basis: calculationBasis,
    compute_result: compute,
    created_at: "2026-04-28T15:08:00Z",
    execution_mode: "COMPLIANCE",
    threshold_profile: thresholdProfile([
      {
        abs_floor: "1.00",
        abs_threshold: "5.00",
        authority_value: null,
        criticality_class: "CRITICAL",
        criticality_weight: 1,
        field_code: "net_income",
        internal_value: "90.00",
        rel_threshold: 0.05,
      },
      {
        abs_floor: "1.00",
        abs_threshold: "5.00",
        authority_value: "120.00",
        criticality_class: "NORMAL",
        criticality_weight: 1,
        field_code: "turnover",
        internal_value: "120.00",
        rel_threshold: 0.05,
      },
    ]),
  });

  expect(result.parity_result.parity_classification).toBe("NOT_COMPARABLE");
  expect(result.parity_result.comparison_coverage).toBe(0.5);
  expect(result.parity_result.reason_codes).toEqual([
    "PARITY_NOT_COMPARABLE",
    "PARITY_PARTIAL_COVERAGE",
  ]);
  expect(result.parity_result.cause_hypotheses).toEqual(["PARITY_PARTIAL_COVERAGE"]);
  expect(result.parity_result.deltas.net_income.comparison_input_state).toBe("AUTHORITY_MISSING");
});

test("missing reusable calculation basis fails closed as an invalid comparison set", async () => {
  const compute = await baselineCompute();
  const result = await evaluateParity({
    calculation_basis: null,
    compute_result: compute,
    created_at: "2026-04-28T15:09:00Z",
    execution_mode: "COMPLIANCE",
    threshold_profile: thresholdProfile([
      {
        abs_floor: "1.00",
        abs_threshold: "5.00",
        authority_value: "120.00",
        criticality_class: "HIGH",
        criticality_weight: 1,
        field_code: "turnover",
        internal_value: "120.00",
        rel_threshold: 0.05,
      },
    ]),
  });

  expect(result.parity_result.comparison_set_state).toBe("INVALID");
  expect(result.parity_result.parity_classification).toBe("NOT_COMPARABLE");
  expect(result.parity_result.parity_score).toBe(0);
  expect(result.parity_result.reason_codes).toContain("PARITY_COMPARISON_BASIS_MISSING");
  expect(result.parity_result.reason_codes[0]).toBe("PARITY_COMPARISON_SET_INVALID");
});

test("duplicate fields or non-positive floors invalidate the comparison set", async () => {
  const compute = await baselineCompute();
  const result = await evaluateParity({
    calculation_basis: calculationBasis,
    compute_result: compute,
    created_at: "2026-04-28T15:09:30Z",
    execution_mode: "COMPLIANCE",
    threshold_profile: thresholdProfile([
      {
        abs_floor: "0.00",
        abs_threshold: "5.00",
        authority_value: "120.00",
        criticality_class: "HIGH",
        criticality_weight: 1,
        field_code: "turnover",
        internal_value: "120.00",
        rel_threshold: 0.05,
      },
      {
        abs_floor: "1.00",
        abs_threshold: "5.00",
        authority_value: "120.00",
        criticality_class: "NORMAL",
        criticality_weight: 1,
        field_code: "turnover",
        internal_value: "120.00",
        rel_threshold: 0.05,
      },
    ]),
  });

  expect(result.parity_result.comparison_set_state).toBe("INVALID");
  expect(result.parity_result.parity_classification).toBe("NOT_COMPARABLE");
  expect(result.parity_result.reason_codes).toContain("PARITY_COMPARISON_FIELD_INVALID");
  expect(result.parity_result.deltas).toEqual({});
});

test("repository compare-and-swap supports the evaluated to superseded lifecycle transition", async () => {
  const compute = await baselineCompute();
  const repository = new ParityResultRepository();
  const result = await evaluateParity({
    calculation_basis: calculationBasis,
    compute_result: compute,
    created_at: "2026-04-28T15:10:00Z",
    execution_mode: "COMPLIANCE",
    repository,
    threshold_profile: thresholdProfile([
      {
        abs_floor: "1.00",
        abs_threshold: "5.00",
        authority_value: "120.00",
        criticality_class: "HIGH",
        criticality_weight: 1,
        field_code: "turnover",
        internal_value: "120.00",
        rel_threshold: 0.05,
      },
    ]),
  });
  const stored = await repository.requireParityResultById(result.parity_result.parity_id);
  const transition = transitionParityResult({
    current: stored.parity_result,
    event: "newer_parity_run",
  });
  const swapped = await repository.compareAndSwapParityResult({
    expected_row_version: stored.parity_result_row_version,
    parity_id: stored.parity_id,
    parity_result: transition.parity_result,
    persisted_at: "2026-04-28T15:11:00Z",
  });

  expect(transition.transition.from_lifecycle_state).toBe("EVALUATED");
  expect(transition.transition.to_lifecycle_state).toBe("SUPERSEDED");
  expect(swapped.parity_result_row_version).toBe(2);
  expect(swapped.lifecycle_state).toBe("SUPERSEDED");
});
