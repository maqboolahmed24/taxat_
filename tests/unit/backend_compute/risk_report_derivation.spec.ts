import { expect, test } from "@playwright/test";

import {
  computeOutcome,
  scoreRisk,
  type ComputeFactContribution,
  type ComputeMoneyProfile,
  type RiskThresholdProfile,
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
    manifest_id: "manifest-0123-unit",
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
    computed_at: "2026-04-28T13:00:00Z",
    execution_mode: "COMPLIANCE",
    manifest_id: "manifest-0123-unit",
    money_profile: moneyProfile,
    rule_version_ref: "rule-version://compute/0123",
    runtime_scope: ["year_end"],
    tax_year_window: { end_date: "2026-12-31", start_date: "2026-01-01" },
  });
  return result.compute_result;
}

const baseProfile: RiskThresholdProfile = {
  features: [
    {
      blocking_threshold: 0.9,
      feature_code: "data_quality_pressure",
      feature_weight: 2,
      material_threshold: 0.6,
    },
    {
      blocking_threshold: 0.8,
      feature_code: "authority_link_pressure",
      feature_weight: 1,
      material_threshold: 0.5,
    },
  ],
  risk_threshold_profile_ref: "risk-threshold-profile://unit/base",
};

test("clean low-risk profile emits ordered feature rows and no unresolved flags", async () => {
  const compute = await baselineCompute();
  const result = await scoreRisk({
    compute_result: compute,
    created_at: "2026-04-28T13:05:00Z",
    execution_mode: "COMPLIANCE",
    feature_context: {
      frozen_feature_values: {
        authority_link_pressure: { feature_resolved: true, feature_value: 0.2 },
        data_quality_pressure: { feature_resolved: true, feature_value: 0.1 },
      },
    },
    risk_threshold_profile: baseProfile,
  });

  expect(result.risk_report.execution_mode).toBe("COMPLIANCE");
  expect(result.risk_report.analysis_only).toBe(false);
  expect(result.risk_report.counterfactual_basis).toBeNull();
  expect(result.risk_report.risk_score).toBe(13);
  expect(result.risk_report.feature_scores.map((feature) => feature.feature_code)).toEqual([
    "authority_link_pressure",
    "data_quality_pressure",
  ]);
  expect(result.risk_report.flags).toEqual([]);
  expect(result.risk_report.unresolved_material_blocking_risk_flag).toBe(false);
  expect(result.risk_report.unresolved_blocking_risk_flag).toBe(false);
});

test("material threshold breach emits deterministic material posture", async () => {
  const compute = await baselineCompute();
  const result = await scoreRisk({
    compute_result: compute,
    created_at: "2026-04-28T13:06:00Z",
    execution_mode: "COMPLIANCE",
    feature_context: {
      frozen_feature_values: {
        authority_link_pressure: { feature_resolved: false, feature_value: 0.4 },
        data_quality_pressure: { feature_resolved: false, feature_value: 0.7 },
      },
    },
    risk_threshold_profile: baseProfile,
  });

  expect(result.risk_report.risk_score).toBe(60);
  expect(result.risk_report.flags).toEqual(["MATERIAL_RISK_UNRESOLVED"]);
  expect(result.risk_report.unresolved_material_blocking_risk_flag).toBe(true);
  expect(result.risk_report.unresolved_blocking_risk_flag).toBe(false);
  expect(
    result.risk_report.feature_scores.find(
      (feature) => feature.feature_code === "data_quality_pressure",
    )?.flag_state,
  ).toBe("MATERIAL_UNRESOLVED");
});

test("blocking threshold breach is mirrored by top-level blocking flag", async () => {
  const compute = await baselineCompute();
  const result = await scoreRisk({
    compute_result: compute,
    created_at: "2026-04-28T13:07:00Z",
    execution_mode: "COMPLIANCE",
    feature_context: {
      frozen_feature_values: {
        authority_link_pressure: { feature_resolved: false, feature_value: 0.95 },
        data_quality_pressure: { feature_resolved: true, feature_value: 0.9 },
      },
    },
    risk_threshold_profile: baseProfile,
  });

  expect(result.risk_report.flags).toEqual([
    "BLOCKING_RISK_UNRESOLVED",
    "MATERIAL_RISK_UNRESOLVED",
  ]);
  expect(result.risk_report.unresolved_material_blocking_risk_flag).toBe(true);
  expect(result.risk_report.unresolved_blocking_risk_flag).toBe(true);
  expect(
    result.risk_report.feature_scores.find(
      (feature) => feature.feature_code === "authority_link_pressure",
    )?.flag_state,
  ).toBe("BLOCKING_UNRESOLVED");
  expect(
    result.risk_report.feature_scores.find(
      (feature) => feature.feature_code === "data_quality_pressure",
    )?.flag_state,
  ).toBe("NONE");
});

test("resolved features do not contribute unresolved material or blocking flags", async () => {
  const compute = await baselineCompute();
  const result = await scoreRisk({
    compute_result: compute,
    created_at: "2026-04-28T13:08:00Z",
    execution_mode: "ANALYSIS",
    counterfactual_basis: "counterfactual://risk/unit",
    feature_context: {
      frozen_feature_values: {
        authority_link_pressure: { feature_resolved: true, feature_value: 0.95 },
        data_quality_pressure: { feature_resolved: true, feature_value: 0.7 },
      },
    },
    non_compliance_config_refs: ["config://risk/counterfactual"],
    risk_threshold_profile: baseProfile,
  });

  expect(result.risk_report.execution_mode).toBe("ANALYSIS");
  expect(result.risk_report.analysis_only).toBe(true);
  expect(result.risk_report.counterfactual_basis).toBe("counterfactual://risk/unit");
  expect(result.risk_report.flags).toEqual([]);
  expect(result.risk_report.feature_scores.every((feature) => feature.flag_state === "NONE")).toBe(
    true,
  );
});

test("out-of-range feature values clamp before persistence and scoring", async () => {
  const compute = await baselineCompute();
  const result = await scoreRisk({
    compute_result: compute,
    created_at: "2026-04-28T13:09:00Z",
    execution_mode: "COMPLIANCE",
    feature_context: {
      frozen_feature_values: {
        authority_link_pressure: { feature_resolved: false, feature_value: -0.2 },
        data_quality_pressure: { feature_resolved: false, feature_value: 1.4 },
      },
    },
    risk_threshold_profile: baseProfile,
  });

  expect(result.risk_report.risk_score).toBe(67);
  expect(result.risk_report.feature_scores.map((feature) => feature.feature_value)).toEqual([0, 1]);
  expect(result.risk_report.flags).toEqual([
    "BLOCKING_RISK_UNRESOLVED",
    "MATERIAL_RISK_UNRESOLVED",
  ]);
});

test("invalid weight profiles fail closed with schema-defined invalid posture", async () => {
  const compute = await baselineCompute();
  const result = await scoreRisk({
    compute_result: compute,
    created_at: "2026-04-28T13:10:00Z",
    execution_mode: "COMPLIANCE",
    feature_context: {
      frozen_feature_values: {
        data_quality_pressure: 0,
      },
    },
    risk_threshold_profile: {
      features: [
        {
          blocking_threshold: 0.5,
          feature_code: "duplicate",
          feature_weight: 1,
          material_threshold: 0.6,
        },
      ],
      risk_threshold_profile_ref: "risk-threshold-profile://unit/invalid",
    },
  });

  expect(result.risk_report.risk_score).toBe(100);
  expect(result.risk_report.feature_scores).toEqual([]);
  expect(result.risk_report.flags).toEqual(["RISK_WEIGHT_PROFILE_INVALID"]);
  expect(result.risk_report.unresolved_material_blocking_risk_flag).toBe(true);
  expect(result.risk_report.unresolved_blocking_risk_flag).toBe(false);
});
