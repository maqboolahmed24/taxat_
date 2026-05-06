import type { ComputeMoneyProfile, ComputeMoneyValue } from "./exact_decimal.ts";
import type { ComputeReportingScope } from "./reporting_scope_resolver.ts";

export type OrderedMoneyMap = Record<string, ComputeMoneyValue>;

export type RuleEvaluationInput = {
  contribution_lineage_refs: readonly string[];
  money_profile: ComputeMoneyProfile;
  record_totals: OrderedMoneyMap;
  reportable_totals: OrderedMoneyMap;
  reporting_scope: ComputeReportingScope;
  rule_version_ref: string;
};

export type RuleEvaluationOutput = {
  assumptions?: Record<string, string | number | boolean | string[]>;
  diagnostic_artifact_refs?: readonly string[];
  diagnostic_reason_codes?: readonly string[];
  totals: Record<string, ComputeMoneyValue | OrderedMoneyMap>;
};

export type RuleEvaluationAdapter = (
  input: RuleEvaluationInput,
) => RuleEvaluationOutput | Promise<RuleEvaluationOutput>;

export const passthroughRuleEvaluationAdapter: RuleEvaluationAdapter = (input) => ({
  assumptions: {
    rule_evaluation_adapter: "PASSTHROUGH_TOTAL_VECTOR_V1",
    rule_version_ref: input.rule_version_ref,
  },
  diagnostic_reason_codes: ["COMPUTE_RULE_EVALUATION_PASSTHROUGH"],
  totals: {
    rule_reportable_totals: input.reportable_totals,
  },
});
