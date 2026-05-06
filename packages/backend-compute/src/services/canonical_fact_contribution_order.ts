import type { CandidateAdjustmentBindingRecord } from "../../../backend-collection/src/types/candidate_fact_draft.ts";
import { requireTrimmedString } from "../../../backend-access/src/services/principal_context_normalizer.ts";
import type { ComputeMoneyValue } from "./exact_decimal.ts";

export type ComputeContributionFactFamily = "TRANSACTION_FACT" | "RECORD_FACT" | "ADJUSTMENT_FACT";
export type ComputeContributionPromotionState =
  | "CANONICAL"
  | "PROVISIONAL"
  | "CONTESTED"
  | "SUPERSEDED"
  | "RETIRED";

export type ComputeFactContribution = {
  adjustment_binding?: CandidateAdjustmentBindingRecord | null;
  analysis_only?: boolean;
  business_partition: string;
  canonical_fact_id: string;
  canonical_fact_ref?: string;
  category: string;
  counterfactual_basis?: string | null;
  effective_date: string;
  execution_mode?: "COMPLIANCE" | "ANALYSIS";
  fact_family: ComputeContributionFactFamily;
  lineage_refs?: readonly string[];
  manifest_id: string;
  non_compliance_config_refs?: readonly string[];
  partition_scope_refs?: readonly string[];
  promotion_state: ComputeContributionPromotionState;
  signed_amount: ComputeMoneyValue;
};

export type ComputeSliceKey = {
  business_partition: string;
  category: string;
};

export function computeSliceKey(input: ComputeSliceKey) {
  return `business_partition=${input.business_partition}|category=${input.category}`;
}

function normalizeDate(value: string) {
  const normalized = requireTrimmedString("compute_contribution.effective_date", value);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(normalized)) {
    throw new Error("compute contribution effective_date must use YYYY-MM-DD");
  }
  return normalized;
}

export function normalizeComputeFactContribution(input: ComputeFactContribution): ComputeFactContribution {
  const factFamily = requireTrimmedString(
    "compute_contribution.fact_family",
    input.fact_family,
  ) as ComputeContributionFactFamily;
  if (
    factFamily !== "TRANSACTION_FACT" &&
    factFamily !== "RECORD_FACT" &&
    factFamily !== "ADJUSTMENT_FACT"
  ) {
    throw new Error("compute contribution fact_family is not compute-bearing");
  }
  if (factFamily === "ADJUSTMENT_FACT" && input.adjustment_binding == null) {
    throw new Error("ADJUSTMENT_FACT compute contributions require adjustment_binding");
  }
  if (factFamily !== "ADJUSTMENT_FACT" && input.adjustment_binding != null) {
    throw new Error("record-layer compute contributions must not carry adjustment_binding");
  }
  return {
    ...(input.adjustment_binding == null ? {} : { adjustment_binding: input.adjustment_binding }),
    analysis_only: input.analysis_only ?? false,
    business_partition: requireTrimmedString(
      "compute_contribution.business_partition",
      input.business_partition,
    ),
    canonical_fact_id: requireTrimmedString(
      "compute_contribution.canonical_fact_id",
      input.canonical_fact_id,
    ),
    ...(input.canonical_fact_ref === undefined
      ? {}
      : {
          canonical_fact_ref: requireTrimmedString(
            "compute_contribution.canonical_fact_ref",
            input.canonical_fact_ref,
          ),
        }),
    category: requireTrimmedString("compute_contribution.category", input.category),
    counterfactual_basis: input.counterfactual_basis ?? null,
    effective_date: normalizeDate(input.effective_date),
    execution_mode: input.execution_mode ?? "COMPLIANCE",
    fact_family: factFamily,
    lineage_refs: [...new Set(input.lineage_refs ?? [])].sort(),
    manifest_id: requireTrimmedString("compute_contribution.manifest_id", input.manifest_id),
    non_compliance_config_refs: [...new Set(input.non_compliance_config_refs ?? [])].sort(),
    partition_scope_refs: [...new Set(input.partition_scope_refs ?? [input.business_partition])].sort(),
    promotion_state: input.promotion_state,
    signed_amount: requireTrimmedString("compute_contribution.signed_amount", input.signed_amount),
  };
}

export function contributionSortKey(input: ComputeFactContribution) {
  const contribution = normalizeComputeFactContribution(input);
  return [
    contribution.business_partition,
    contribution.category,
    contribution.effective_date,
    contribution.canonical_fact_id,
  ].join("\u001e");
}

export function orderCanonicalFactContributions(
  contributions: readonly ComputeFactContribution[],
) {
  return contributions
    .map((contribution) => normalizeComputeFactContribution(contribution))
    .sort((left, right) => contributionSortKey(left).localeCompare(contributionSortKey(right)));
}

export function orderedComputeSlices(input: {
  contributions: readonly ComputeFactContribution[];
  required_slices?: readonly ComputeSliceKey[];
}) {
  const keys = new Map<string, ComputeSliceKey>();
  for (const slice of input.required_slices ?? []) {
    const normalized = {
      business_partition: requireTrimmedString(
        "compute_slice.business_partition",
        slice.business_partition,
      ),
      category: requireTrimmedString("compute_slice.category", slice.category),
    };
    keys.set(computeSliceKey(normalized), normalized);
  }
  for (const contribution of input.contributions) {
    const normalized = normalizeComputeFactContribution(contribution);
    const key = {
      business_partition: normalized.business_partition,
      category: normalized.category,
    };
    keys.set(computeSliceKey(key), key);
  }
  return [...keys.values()].sort(
    (left, right) =>
      left.business_partition.localeCompare(right.business_partition) ||
      left.category.localeCompare(right.category),
  );
}
