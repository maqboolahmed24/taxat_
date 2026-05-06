import { stableJsonHash } from "../../../domain-kernel/src/primitives/hash.ts";
import { normalizeUtcInstantString } from "../../../domain-kernel/src/primitives/time.ts";
import {
  buildCanaryHealthSummary,
  type CanaryBudgetState,
  type CanaryHealthSummaryRecord,
} from "../models/canary_health_summary.ts";
import type { ReleaseCandidateIdentityContractRecord } from "../models/release_candidate_identity_contract.ts";

export type EvaluateCanaryHealthSummaryInput = {
  candidate_identity_contract: ReleaseCandidateIdentityContractRecord;
  canary_fraction: number;
  slo_profile_ref: string;
  error_budget_profile_ref: string;
  latency_budget_state: CanaryBudgetState;
  error_budget_state: CanaryBudgetState;
  summary_ref: string;
  evaluated_at: string;
  canary_summary_id?: string;
  abort_recommended?: boolean;
};

export function defaultCanarySummaryId(input: {
  candidate_identity_hash: string;
  canary_fraction: number;
  slo_profile_ref: string;
  error_budget_profile_ref: string;
  latency_budget_state: CanaryBudgetState;
  error_budget_state: CanaryBudgetState;
  summary_ref: string;
  evaluated_at: string;
}) {
  return `canary-summary.${stableJsonHash(input).slice(0, 32)}`;
}

export function evaluateCanaryHealthSummary(
  input: EvaluateCanaryHealthSummaryInput,
): CanaryHealthSummaryRecord {
  const evaluatedAt = normalizeUtcInstantString(input.evaluated_at);
  return buildCanaryHealthSummary({
    canary_summary_id:
      input.canary_summary_id ??
      defaultCanarySummaryId({
        candidate_identity_hash: input.candidate_identity_contract.candidate_identity_hash,
        canary_fraction: input.canary_fraction,
        slo_profile_ref: input.slo_profile_ref,
        error_budget_profile_ref: input.error_budget_profile_ref,
        latency_budget_state: input.latency_budget_state,
        error_budget_state: input.error_budget_state,
        summary_ref: input.summary_ref,
        evaluated_at: evaluatedAt,
      }),
    candidate_identity_contract: input.candidate_identity_contract,
    canary_fraction: input.canary_fraction,
    slo_profile_ref: input.slo_profile_ref,
    error_budget_profile_ref: input.error_budget_profile_ref,
    latency_budget_state: input.latency_budget_state,
    error_budget_state: input.error_budget_state,
    summary_ref: input.summary_ref,
    evaluated_at: evaluatedAt,
    abort_recommended: input.abort_recommended,
  });
}
