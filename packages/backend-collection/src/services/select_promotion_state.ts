import type { CandidateFactRecord } from "../models/candidate_fact.ts";
import type { ConflictResolutionFrontier } from "../models/conflict_set.ts";

export type CanonicalPromotionState =
  | "PROVISIONAL"
  | "CANONICAL"
  | "CONTESTED"
  | "SUPERSEDED"
  | "RETIRED";

export type PromotionStatePolicy = {
  contested_output_mode?: "EMIT_CONTESTED" | "FAIL_CLOSED";
  monitoring_only_canonical_allowed?: boolean;
};

export type SelectPromotionStateInput = {
  blocking_conflict_count: number;
  candidate?: CandidateFactRecord;
  conflict_membership_refs: readonly string[];
  policy?: PromotionStatePolicy;
  resolution_frontier: ConflictResolutionFrontier;
};

export type PromotionStateSelection = {
  promotion_state: CanonicalPromotionState;
};

export type SelectPromotionStateErrorCode = "PROMOTION_BLOCKING_CONFLICT";

export class SelectPromotionStateError extends Error {
  readonly code: SelectPromotionStateErrorCode;

  constructor(code: SelectPromotionStateErrorCode, detail: string) {
    super(`${code}: ${detail}`);
    this.name = "SelectPromotionStateError";
    this.code = code;
  }
}

export function selectPromotionState(input: SelectPromotionStateInput): PromotionStateSelection {
  if (
    input.candidate?.promotion_state === "SUPERSEDED" ||
    input.candidate?.promotion_state === "RETIRED"
  ) {
    return { promotion_state: input.candidate.promotion_state };
  }
  if (input.blocking_conflict_count > 0 || input.resolution_frontier === "BLOCKING_PRESENT") {
    if (input.policy?.contested_output_mode === "FAIL_CLOSED") {
      throw new SelectPromotionStateError(
        "PROMOTION_BLOCKING_CONFLICT",
        "blocking conflicts cannot be promoted to canonical truth",
      );
    }
    return { promotion_state: "CONTESTED" };
  }
  if (input.resolution_frontier === "MONITORING_ONLY") {
    return {
      promotion_state: input.policy?.monitoring_only_canonical_allowed
        ? "CANONICAL"
        : "PROVISIONAL",
    };
  }
  return { promotion_state: "CANONICAL" };
}
