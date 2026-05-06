import { stableJsonHash } from "../../../domain-kernel/src/primitives/hash.ts";
import { normalizeUtcInstantString } from "../../../domain-kernel/src/primitives/time.ts";
import {
  withRefreshedComputeResultContract,
  type ComputeResultRecord,
  type ComputeResultTotals,
} from "../models/compute_result.ts";
import type {
  ComputeResultRepository,
  StoredComputeResultRecord,
} from "../repositories/compute_result_repository.ts";
import {
  adjustmentAppliesToScope,
  resolveAdjustmentInclusionPolicy,
  type ComputeAnalysisPolicy,
  type ComputeExecutionMode,
  type QuarterlyBasisProfile,
} from "./adjustment_inclusion_policy.ts";
import {
  computeSliceKey,
  orderCanonicalFactContributions,
  orderedComputeSlices,
  type ComputeFactContribution,
  type ComputeSliceKey,
} from "./canonical_fact_contribution_order.ts";
import {
  normalizeMoneyProfile,
  sumMoney,
  zeroMoney,
  type ComputeMoneyProfile,
} from "./exact_decimal.ts";
import { resolveReportingScope } from "./reporting_scope_resolver.ts";
import {
  passthroughRuleEvaluationAdapter,
  type OrderedMoneyMap,
  type RuleEvaluationAdapter,
} from "./rule_evaluation_adapter.ts";

export type ComputeTimeWindow = {
  end_date: string;
  start_date: string;
};

export type ComputeOutcomeInput = {
  analysis_policy?: ComputeAnalysisPolicy;
  basis_artifact_refs?: readonly string[];
  basis_profile_ref?: string | null;
  canonical_facts: readonly ComputeFactContribution[];
  computed_at: string;
  compute_id?: string;
  counterfactual_basis?: string | null;
  execution_mode: ComputeExecutionMode;
  manifest_id: string;
  money_profile?: ComputeMoneyProfile;
  persisted_at?: string;
  quarterly_basis_profile?: QuarterlyBasisProfile | null;
  quarter_window?: ComputeTimeWindow;
  repository?: ComputeResultRepository;
  required_slices?: readonly ComputeSliceKey[];
  rule_evaluation_adapter?: RuleEvaluationAdapter;
  rule_version_ref: string;
  runtime_scope: readonly string[];
  schema_bundle_hash?: string;
  tax_year_window: ComputeTimeWindow;
  writer_build_id?: string;
};

export type ComputeOutcomeResult = {
  compute_result: ComputeResultRecord;
  stored_compute_result: StoredComputeResultRecord | null;
};

type ComputeBlock = {
  artifact_refs: string[];
  reason_codes: string[];
};

const DEFAULT_MONEY_PROFILE: ComputeMoneyProfile = {
  aggregation_boundary: "DECLARED_AGGREGATION_BOUNDARY_ONLY",
  currency_code: "GBP",
  rounding_mode: "HALF_UP",
  scale: 2,
  serialization_profile: "CANONICAL_DECIMAL_STRING_V1",
};

const REASON_PRIORITY = [
  "COMPUTE_REPORTING_SCOPE_INVALID",
  "COMPUTE_QUARTERLY_BASIS_REQUIRED",
  "COMPUTE_FACT_AMOUNT_INVALID",
  "COMPUTE_PROVISIONAL_FACT_REJECTED",
  "COMPUTE_ANALYSIS_POLICY_REQUIRED",
  "COMPUTE_RULE_EVALUATION_PASSTHROUGH",
  "COMPUTE_RESULT_VALID",
];

function orderReasonCodes(reasonCodes: readonly string[]) {
  const present = new Set(reasonCodes);
  return [
    ...REASON_PRIORITY.filter((code) => present.has(code)),
    ...[...present].filter((code) => !REASON_PRIORITY.includes(code)).sort(),
  ];
}

function normalizeDate(label: string, value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new Error(`${label} must use YYYY-MM-DD`);
  }
  return value;
}

function normalizeWindow(label: string, window: ComputeTimeWindow) {
  const start = normalizeDate(`${label}.start_date`, window.start_date);
  const end = normalizeDate(`${label}.end_date`, window.end_date);
  if (start > end) {
    throw new Error(`${label}.start_date must be before or equal to end_date`);
  }
  return { end_date: end, start_date: start };
}

function dateInWindow(date: string, window: ComputeTimeWindow) {
  return date >= window.start_date && date <= window.end_date;
}

function contributionRef(contribution: ComputeFactContribution) {
  return contribution.canonical_fact_ref ?? `canonical-fact://${contribution.canonical_fact_id}`;
}

function deterministicComputeId(input: {
  basis_artifact_refs: readonly string[];
  contribution_ids: readonly string[];
  execution_mode: ComputeExecutionMode;
  manifest_id: string;
  reporting_scope: string;
  rule_version_ref: string;
}) {
  return `compute.${stableJsonHash({
    basis_artifact_refs: [...input.basis_artifact_refs].sort(),
    contribution_ids: [...input.contribution_ids].sort(),
    execution_mode: input.execution_mode,
    manifest_id: input.manifest_id,
    reporting_scope: input.reporting_scope,
    rule_version_ref: input.rule_version_ref,
  })}`;
}

function selectEligibleContributions(input: {
  analysis_policy?: ComputeAnalysisPolicy;
  basis_artifact_refs: readonly string[];
  contributions: readonly ComputeFactContribution[];
  execution_mode: ComputeExecutionMode;
}) {
  const blocks: ComputeBlock[] = [];
  const eligible: ComputeFactContribution[] = [];

  for (const contribution of input.contributions) {
    if (input.execution_mode === "COMPLIANCE") {
      if (
        contribution.promotion_state !== "CANONICAL" ||
        contribution.analysis_only === true ||
        contribution.execution_mode === "ANALYSIS"
      ) {
        blocks.push({
          artifact_refs: [contributionRef(contribution)],
          reason_codes: ["COMPUTE_PROVISIONAL_FACT_REJECTED"],
        });
        continue;
      }
      eligible.push(contribution);
      continue;
    }

    if (contribution.promotion_state === "CANONICAL") {
      eligible.push(contribution);
      continue;
    }
    if (
      contribution.promotion_state === "PROVISIONAL" &&
      input.analysis_policy?.allow_provisional_facts === true
    ) {
      eligible.push(contribution);
      continue;
    }
    blocks.push({
      artifact_refs: [contributionRef(contribution)],
      reason_codes: ["COMPUTE_ANALYSIS_POLICY_REQUIRED"],
    });
  }

  return { blocks, eligible };
}

function sumContributions(input: {
  contributions: readonly ComputeFactContribution[];
  money_profile: ComputeMoneyProfile;
  slice: ComputeSliceKey;
  window: ComputeTimeWindow;
}) {
  const values = input.contributions
    .filter(
      (contribution) =>
        contribution.business_partition === input.slice.business_partition &&
        contribution.category === input.slice.category &&
        dateInWindow(contribution.effective_date, input.window),
    )
    .map((contribution) => contribution.signed_amount);
  return values.length === 0
    ? zeroMoney(input.money_profile)
    : sumMoney({ money_profile: input.money_profile, values });
}

function orderedMoneyMapFromSlices(input: {
  contributions: readonly ComputeFactContribution[];
  money_profile: ComputeMoneyProfile;
  slices: readonly ComputeSliceKey[];
  window: ComputeTimeWindow;
}) {
  const totals: OrderedMoneyMap = {};
  for (const slice of input.slices) {
    totals[computeSliceKey(slice)] = sumContributions({
      contributions: input.contributions,
      money_profile: input.money_profile,
      slice,
      window: input.window,
    });
  }
  return totals;
}

function addMoneyMaps(input: {
  adjustment_totals: OrderedMoneyMap;
  money_profile: ComputeMoneyProfile;
  record_totals: OrderedMoneyMap;
}) {
  const result: OrderedMoneyMap = {};
  for (const key of Object.keys(input.record_totals).sort()) {
    result[key] = sumMoney({
      money_profile: input.money_profile,
      values: [input.record_totals[key]!, input.adjustment_totals[key] ?? zeroMoney(input.money_profile)],
    });
  }
  return result;
}

function diagnosticRefs(input: {
  basis_artifact_refs: readonly string[];
  blocks: readonly ComputeBlock[];
}) {
  const refs = input.blocks.flatMap((block) => block.artifact_refs);
  const fallback =
    input.basis_artifact_refs.length === 0 ? ["compute-basis://unavailable"] : input.basis_artifact_refs;
  return [...new Set(refs.length > 0 ? refs : fallback)].sort();
}

function diagnosticReasons(blocks: readonly ComputeBlock[]) {
  return orderReasonCodes(blocks.flatMap((block) => block.reason_codes));
}

function buildBlockedComputeResult(input: {
  assumptions: Record<string, string | number | boolean | string[]>;
  basis_artifact_refs: readonly string[];
  basis_profile_ref_or_null: string | null;
  blocks: readonly ComputeBlock[];
  compute_id: string;
  counterfactual_basis: string | null;
  effective_partition_scope_refs: readonly string[];
  execution_mode: ComputeExecutionMode;
  manifest_id: string;
  money_profile: ComputeMoneyProfile;
  non_compliance_config_refs: readonly string[];
  policy: ReturnType<typeof resolveAdjustmentInclusionPolicy>;
  reporting_scope: string;
  rule_version_ref: string;
  schema_bundle_hash?: string;
  writer_build_id?: string;
}) {
  return withRefreshedComputeResultContract({
    compute_result: {
      adjustment_inclusion_policy: input.policy.adjustment_inclusion_policy,
      adjustment_scope_source: input.policy.adjustment_scope_source,
      analysis_only: input.execution_mode === "ANALYSIS",
      artifact_type: "ComputeResult",
      assumptions: input.assumptions,
      basis_profile_ref_or_null: input.basis_profile_ref_or_null,
      compute_id: input.compute_id,
      computed_at: null,
      counterfactual_basis: input.counterfactual_basis,
      diagnostic_artifact_refs: diagnosticRefs({
        basis_artifact_refs: input.basis_artifact_refs,
        blocks: input.blocks,
      }),
      diagnostic_reason_codes: diagnosticReasons(input.blocks),
      effective_partition_scope_refs: [...input.effective_partition_scope_refs],
      execution_mode: input.execution_mode,
      lifecycle_state: "BLOCKED",
      manifest_id: input.manifest_id,
      money_profile: input.money_profile,
      non_compliance_config_refs: [...input.non_compliance_config_refs],
      quarterly_basis_profile_or_null: input.policy.quarterly_basis_profile_or_null,
      reporting_scope: input.reporting_scope as "year_end" | "quarterly_update" | "estimate_only",
      rule_version_ref: input.rule_version_ref,
      totals: {},
    },
    ...(input.schema_bundle_hash === undefined ? {} : { schema_bundle_hash: input.schema_bundle_hash }),
    ...(input.writer_build_id === undefined ? {} : { writer_build_id: input.writer_build_id }),
  });
}

export async function computeOutcome(input: ComputeOutcomeInput): Promise<ComputeOutcomeResult> {
  const basisArtifactRefs = [...new Set(input.basis_artifact_refs ?? [])].sort();
  const moneyProfile = normalizeMoneyProfile(input.money_profile ?? DEFAULT_MONEY_PROFILE);
  const computedAt = normalizeUtcInstantString(input.computed_at);
  const taxYearWindow = normalizeWindow("compute.tax_year_window", input.tax_year_window);
  const orderedContributions = orderCanonicalFactContributions(input.canonical_facts);
  const scopeResolution = resolveReportingScope(input.runtime_scope);
  const policy = resolveAdjustmentInclusionPolicy({
    execution_mode: input.execution_mode,
    quarterly_basis_profile: input.quarterly_basis_profile ?? null,
    reporting_scope: scopeResolution.reporting_scope,
    ...(input.analysis_policy === undefined ? {} : { analysis_policy: input.analysis_policy }),
  });
  const contributionIds = orderedContributions.map((contribution) => contribution.canonical_fact_id);
  const computeId =
    input.compute_id ??
    deterministicComputeId({
      basis_artifact_refs: basisArtifactRefs,
      contribution_ids: contributionIds,
      execution_mode: input.execution_mode,
      manifest_id: input.manifest_id,
      reporting_scope: scopeResolution.reporting_scope,
      rule_version_ref: input.rule_version_ref,
    });
  const nonComplianceConfigRefs =
    input.execution_mode === "ANALYSIS"
      ? [...new Set(input.analysis_policy?.non_compliance_config_refs ?? [])].sort()
      : [];
  const counterfactualBasis =
    input.execution_mode === "ANALYSIS"
      ? (input.counterfactual_basis ?? input.analysis_policy?.policy_ref ?? "counterfactual://compute/analysis")
      : null;
  const effectivePartitionScopeRefs = [
    ...new Set(
      orderedContributions.flatMap((contribution) =>
        contribution.partition_scope_refs === undefined || contribution.partition_scope_refs.length === 0
          ? [contribution.business_partition]
          : contribution.partition_scope_refs,
      ),
    ),
  ].sort();
  const baseAssumptions = {
    analysis_policy_ref: input.analysis_policy?.policy_ref ?? "analysis-policy://not-applicable",
    basis_artifact_refs: basisArtifactRefs,
    contribution_order: "business_partition,category,effective_date,canonical_fact_id",
    exact_decimal_strategy: "domain-kernel ExactDecimal with one money-profile rounding boundary",
    reporting_scope_source: scopeResolution.runtime_scope,
  };

  const eligibility = selectEligibleContributions({
    basis_artifact_refs: basisArtifactRefs,
    contributions: orderedContributions,
    execution_mode: input.execution_mode,
    ...(input.analysis_policy === undefined ? {} : { analysis_policy: input.analysis_policy }),
  });
  const blocks = [...eligibility.blocks];
  if (
    scopeResolution.reporting_scope === "quarterly_update" &&
    input.quarter_window === undefined
  ) {
    blocks.push({
      artifact_refs: basisArtifactRefs,
      reason_codes: ["COMPUTE_QUARTERLY_BASIS_REQUIRED"],
    });
  }

  if (blocks.length > 0) {
    const computeResult = buildBlockedComputeResult({
      assumptions: baseAssumptions,
      basis_artifact_refs: basisArtifactRefs,
      basis_profile_ref_or_null: input.basis_profile_ref ?? null,
      blocks,
      compute_id: computeId,
      counterfactual_basis: counterfactualBasis,
      effective_partition_scope_refs:
        effectivePartitionScopeRefs.length === 0 ? ["partition://compute/unavailable"] : effectivePartitionScopeRefs,
      execution_mode: input.execution_mode,
      manifest_id: input.manifest_id,
      money_profile: moneyProfile,
      non_compliance_config_refs: nonComplianceConfigRefs,
      policy,
      reporting_scope: scopeResolution.reporting_scope,
      rule_version_ref: input.rule_version_ref,
      ...(input.schema_bundle_hash === undefined ? {} : { schema_bundle_hash: input.schema_bundle_hash }),
      ...(input.writer_build_id === undefined ? {} : { writer_build_id: input.writer_build_id }),
    });
    const stored = input.repository
      ? await input.repository.persistComputeResult({
          compute_result: computeResult,
          persisted_at: input.persisted_at ?? computedAt,
        })
      : null;
    return { compute_result: computeResult, stored_compute_result: stored };
  }

  const slices = orderedComputeSlices({
    contributions: eligibility.eligible,
    ...(input.required_slices === undefined ? {} : { required_slices: input.required_slices }),
  });
  const recordContributions = eligibility.eligible.filter(
    (contribution) => contribution.fact_family !== "ADJUSTMENT_FACT",
  );
  const adjustmentContributions = eligibility.eligible.filter(
    (contribution) =>
      contribution.fact_family === "ADJUSTMENT_FACT" &&
      contribution.adjustment_binding != null &&
      adjustmentAppliesToScope({
        adjustment_binding: contribution.adjustment_binding,
        adjustment_scope_source: policy.adjustment_scope_source,
        execution_mode: input.execution_mode,
        reporting_scope: scopeResolution.reporting_scope,
      }),
  );
  const reportWindow =
    scopeResolution.reporting_scope === "quarterly_update"
      ? policy.quarterly_basis_profile_or_null === "CUMULATIVE"
        ? {
            end_date: input.quarter_window!.end_date,
            start_date: taxYearWindow.start_date,
          }
        : normalizeWindow("compute.quarter_window", input.quarter_window!)
      : taxYearWindow;
  const recordTotals = orderedMoneyMapFromSlices({
    contributions: recordContributions,
    money_profile: moneyProfile,
    slices,
    window: reportWindow,
  });
  const adjustmentTotals =
    policy.adjustment_inclusion_policy === "APPLY_SCOPE_FILTERED_ADJUSTMENTS"
      ? orderedMoneyMapFromSlices({
          contributions: adjustmentContributions,
          money_profile: moneyProfile,
          slices,
          window: taxYearWindow,
        })
      : Object.fromEntries(
          slices.map((slice) => [computeSliceKey(slice), zeroMoney(moneyProfile)]),
        );
  const reportableTotals =
    policy.adjustment_inclusion_policy === "APPLY_SCOPE_FILTERED_ADJUSTMENTS"
      ? addMoneyMaps({
          adjustment_totals: adjustmentTotals,
          money_profile: moneyProfile,
          record_totals: recordTotals,
        })
      : recordTotals;
  const contributionLineageRefs = [
    ...new Set(
      eligibility.eligible.flatMap((contribution) => [
        contributionRef(contribution),
        ...(contribution.lineage_refs ?? []),
      ]),
    ),
  ].sort();
  const ruleEvaluation = await (input.rule_evaluation_adapter ?? passthroughRuleEvaluationAdapter)({
    contribution_lineage_refs: contributionLineageRefs,
    money_profile: moneyProfile,
    record_totals: recordTotals,
    reportable_totals: reportableTotals,
    reporting_scope: scopeResolution.reporting_scope,
    rule_version_ref: input.rule_version_ref,
  });
  const totals: ComputeResultTotals = {
    adjustment_totals: adjustmentTotals,
    record_totals: recordTotals,
    reportable_totals: reportableTotals,
    ...ruleEvaluation.totals,
  };
  const diagnosticReasonCodes = orderReasonCodes([
    ...(ruleEvaluation.diagnostic_reason_codes ?? []),
    "COMPUTE_RESULT_VALID",
  ]);
  const computeResult = withRefreshedComputeResultContract({
    compute_result: {
      adjustment_inclusion_policy: policy.adjustment_inclusion_policy,
      adjustment_scope_source: policy.adjustment_scope_source,
      analysis_only: input.execution_mode === "ANALYSIS",
      artifact_type: "ComputeResult",
      assumptions: {
        ...baseAssumptions,
        ...(ruleEvaluation.assumptions ?? {}),
        quarterly_basis_profile:
          policy.quarterly_basis_profile_or_null ?? "NOT_APPLICABLE",
        slice_count: slices.length,
      },
      basis_profile_ref_or_null: input.basis_profile_ref ?? null,
      compute_id: computeId,
      computed_at: computedAt,
      counterfactual_basis: counterfactualBasis,
      diagnostic_artifact_refs: [...new Set(ruleEvaluation.diagnostic_artifact_refs ?? [])].sort(),
      diagnostic_reason_codes: diagnosticReasonCodes,
      effective_partition_scope_refs:
        effectivePartitionScopeRefs.length === 0 ? ["partition://compute/empty"] : effectivePartitionScopeRefs,
      execution_mode: input.execution_mode,
      lifecycle_state: "COMPUTED",
      manifest_id: input.manifest_id,
      money_profile: moneyProfile,
      non_compliance_config_refs: nonComplianceConfigRefs,
      quarterly_basis_profile_or_null: policy.quarterly_basis_profile_or_null,
      reporting_scope: scopeResolution.reporting_scope,
      rule_version_ref: input.rule_version_ref,
      totals,
    },
    ...(input.schema_bundle_hash === undefined ? {} : { schema_bundle_hash: input.schema_bundle_hash }),
    ...(input.writer_build_id === undefined ? {} : { writer_build_id: input.writer_build_id }),
  });
  const stored = input.repository
    ? await input.repository.persistComputeResult({
        compute_result: computeResult,
        persisted_at: input.persisted_at ?? computedAt,
      })
    : null;
  return { compute_result: computeResult, stored_compute_result: stored };
}
