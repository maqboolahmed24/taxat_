import { expect, test } from "@playwright/test";

import {
  canonicalMoneyString,
  computeOutcome,
  transitionComputeResult,
  withRefreshedComputeResultContract,
  type ComputeFactContribution,
  type ComputeMoneyProfile,
} from "../../../packages/backend-compute/src/index.ts";

const moneyProfile: ComputeMoneyProfile = {
  aggregation_boundary: "DECLARED_AGGREGATION_BOUNDARY_ONLY",
  currency_code: "GBP",
  rounding_mode: "HALF_UP",
  scale: 2,
  serialization_profile: "CANONICAL_DECIMAL_STRING_V1",
};

function contribution(
  input: Partial<ComputeFactContribution> &
    Pick<ComputeFactContribution, "canonical_fact_id" | "signed_amount">,
): ComputeFactContribution {
  return {
    business_partition: "partition://self-employment/main",
    canonical_fact_ref: `canonical-fact://${input.canonical_fact_id}`,
    category: "turnover",
    effective_date: "2026-04-15",
    fact_family: "RECORD_FACT",
    manifest_id: "manifest-0121-unit",
    partition_scope_refs: ["partition://self-employment/main"],
    promotion_state: "CANONICAL",
    ...input,
  };
}

test("exact decimal adapter rejects non-canonical inputs and rounds once to money scale", () => {
  expect(
    canonicalMoneyString({
      money_profile: moneyProfile,
      value: "1.235",
    }),
  ).toBe("1.24");
  expect(
    canonicalMoneyString({
      money_profile: moneyProfile,
      value: "-1.235",
    }),
  ).toBe("-1.24");
  expect(() =>
    canonicalMoneyString({
      money_profile: moneyProfile,
      value: "1e3",
    }),
  ).toThrow("COMPUTE_DECIMAL_INVALID_VALUE");
  expect(() =>
    canonicalMoneyString({
      money_profile: moneyProfile,
      value: 1.23 as never,
    }),
  ).toThrow("COMPUTE_DECIMAL_INVALID_VALUE");
});

test("quarterly periodic and cumulative basis produce distinct deterministic totals", async () => {
  const base = {
    canonical_facts: [
      contribution({
        canonical_fact_id: "fact-jan",
        effective_date: "2026-01-15",
        signed_amount: "100.00",
      }),
      contribution({
        canonical_fact_id: "fact-apr",
        effective_date: "2026-04-15",
        signed_amount: "50.00",
      }),
    ],
    computed_at: "2026-04-28T09:00:00Z",
    execution_mode: "COMPLIANCE" as const,
    manifest_id: "manifest-0121-quarterly",
    money_profile: moneyProfile,
    quarter_window: { end_date: "2026-06-30", start_date: "2026-04-01" },
    required_slices: [
      {
        business_partition: "partition://self-employment/main",
        category: "expenses",
      },
    ],
    rule_version_ref: "rule-version://compute/0121",
    runtime_scope: ["quarterly_update"],
    tax_year_window: { end_date: "2026-12-31", start_date: "2026-01-01" },
  };

  const periodic = await computeOutcome({
    ...base,
    quarterly_basis_profile: "PERIODIC",
  });
  const cumulative = await computeOutcome({
    ...base,
    quarterly_basis_profile: "CUMULATIVE",
  });

  expect(periodic.compute_result.totals.reportable_totals).toEqual({
    "business_partition=partition://self-employment/main|category=expenses": "0.00",
    "business_partition=partition://self-employment/main|category=turnover": "50.00",
  });
  expect(cumulative.compute_result.totals.reportable_totals).toEqual({
    "business_partition=partition://self-employment/main|category=expenses": "0.00",
    "business_partition=partition://self-employment/main|category=turnover": "150.00",
  });
  expect(periodic.compute_result.adjustment_inclusion_policy).toBe("RECORD_ONLY");
});

test("year-end compute applies scoped adjustments exactly once", async () => {
  const result = await computeOutcome({
    canonical_facts: [
      contribution({
        canonical_fact_id: "fact-record",
        signed_amount: "100.00",
      }),
      contribution({
        adjustment_binding: {
          analysis_mode_treatment: "MATCH_COMPLIANCE_BASIS",
          applicable_reporting_scopes: ["year_end"],
          partition_application: "EXACT_PARTITION_ONLY",
          quarterly_basis_profile: "NOT_APPLICABLE",
          time_window_basis: "FULL_TAX_YEAR",
          window_end_date_or_null: null,
          window_start_date_or_null: null,
        },
        canonical_fact_id: "fact-adjustment",
        fact_family: "ADJUSTMENT_FACT",
        signed_amount: "25.00",
      }),
    ],
    computed_at: "2026-04-28T09:05:00Z",
    execution_mode: "COMPLIANCE",
    manifest_id: "manifest-0121-year-end",
    money_profile: moneyProfile,
    rule_version_ref: "rule-version://compute/0121",
    runtime_scope: ["year_end", "prepare_submission"],
    tax_year_window: { end_date: "2026-12-31", start_date: "2026-01-01" },
  });

  expect(result.compute_result.lifecycle_state).toBe("COMPUTED");
  expect(result.compute_result.totals.record_totals).toEqual({
    "business_partition=partition://self-employment/main|category=turnover": "100.00",
  });
  expect(result.compute_result.totals.adjustment_totals).toEqual({
    "business_partition=partition://self-employment/main|category=turnover": "25.00",
  });
  expect(result.compute_result.totals.reportable_totals).toEqual({
    "business_partition=partition://self-employment/main|category=turnover": "125.00",
  });
});

test("compliance rejects provisional facts while analysis can include them explicitly", async () => {
  const provisional = contribution({
    canonical_fact_id: "fact-provisional",
    execution_mode: "ANALYSIS",
    promotion_state: "PROVISIONAL",
    signed_amount: "40.00",
  });

  const compliance = await computeOutcome({
    basis_artifact_refs: ["canonical-fact-set://0121"],
    canonical_facts: [provisional],
    computed_at: "2026-04-28T09:10:00Z",
    execution_mode: "COMPLIANCE",
    manifest_id: "manifest-0121-provisional",
    money_profile: moneyProfile,
    rule_version_ref: "rule-version://compute/0121",
    runtime_scope: ["year_end"],
    tax_year_window: { end_date: "2026-12-31", start_date: "2026-01-01" },
  });
  expect(compliance.compute_result.lifecycle_state).toBe("BLOCKED");
  expect(compliance.compute_result.diagnostic_reason_codes).toContain(
    "COMPUTE_PROVISIONAL_FACT_REJECTED",
  );

  const analysis = await computeOutcome({
    analysis_policy: {
      allow_provisional_facts: true,
      non_compliance_config_refs: ["config://analysis/0121"],
      policy_ref: "analysis-policy://0121",
    },
    canonical_facts: [provisional],
    computed_at: "2026-04-28T09:11:00Z",
    execution_mode: "ANALYSIS",
    manifest_id: "manifest-0121-provisional",
    money_profile: moneyProfile,
    rule_version_ref: "rule-version://compute/0121",
    runtime_scope: ["estimate_only"],
    tax_year_window: { end_date: "2026-12-31", start_date: "2026-01-01" },
  });
  expect(analysis.compute_result.analysis_only).toBe(true);
  expect(analysis.compute_result.totals.reportable_totals).toEqual({
    "business_partition=partition://self-employment/main|category=turnover": "40.00",
  });
});

test("compute result lifecycle transitions enforce the named state machine", () => {
  const notRun = withRefreshedComputeResultContract({
    compute_result: {
      adjustment_inclusion_policy: "APPLY_SCOPE_FILTERED_ADJUSTMENTS",
      adjustment_scope_source: "EXECUTABLE_REPORTING_SCOPE",
      analysis_only: false,
      artifact_type: "ComputeResult",
      assumptions: {},
      basis_profile_ref_or_null: null,
      compute_id: "compute-0121-lifecycle",
      computed_at: null,
      counterfactual_basis: null,
      diagnostic_artifact_refs: [],
      diagnostic_reason_codes: [],
      effective_partition_scope_refs: ["partition://self-employment/main"],
      execution_mode: "COMPLIANCE",
      lifecycle_state: "NOT_RUN",
      manifest_id: "manifest-0121-lifecycle",
      money_profile: moneyProfile,
      non_compliance_config_refs: [],
      quarterly_basis_profile_or_null: null,
      reporting_scope: "year_end",
      rule_version_ref: "rule-version://compute/0121",
      totals: {},
    },
  });
  const running = transitionComputeResult({
    compute_result: notRun,
    event_code: "compute_start",
    transitioned_at: "2026-04-28T09:15:00Z",
    transition_audit_ref: "audit://compute/start",
  });
  const computed = transitionComputeResult({
    compute_result: running,
    event_code: "compute_success",
    totals: {
      reportable_totals: {
        "business_partition=partition://self-employment/main|category=turnover": "1.00",
      },
    },
    transitioned_at: "2026-04-28T09:16:00Z",
    transition_audit_ref: "audit://compute/success",
  });

  expect(running.lifecycle_state).toBe("RUNNING");
  expect(computed.lifecycle_state).toBe("COMPUTED");
  expect(() =>
    transitionComputeResult({
      compute_result: computed,
      event_code: "data_or_policy_block",
      transitioned_at: "2026-04-28T09:17:00Z",
      transition_audit_ref: "audit://compute/illegal",
    }),
  ).toThrow("COMPUTE_RESULT_ILLEGAL_TRANSITION");
});
