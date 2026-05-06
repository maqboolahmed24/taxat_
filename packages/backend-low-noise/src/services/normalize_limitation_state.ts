import type { DecisionSummaryState } from "../../../generated-models/src/generated/typescript/surface-and-experience.ts";
import { enforceLowNoiseCopyBudget, uniqueLowNoiseStrings } from "./enforce_low_noise_copy_budgets.ts";

export type LowNoiseLimitationState = DecisionSummaryState["limitation_state"];

export type NormalizedLowNoiseLimitationState = Pick<
  DecisionSummaryState,
  | "limitation_reason_codes"
  | "limitation_state"
  | "limitation_statement"
  | "state_reason_code_or_null"
>;

function stateReasonForLimitationState(state: LowNoiseLimitationState) {
  switch (state) {
    case "NONE":
    case "LIMITED":
      return null;
    case "NOT_APPLICABLE":
      return "NOT_APPLICABLE_TO_CONTEXT" as const;
    case "NOT_REQUESTED":
      return "REQUEST_NOT_TRIGGERED" as const;
    case "NOT_YET_MATERIALIZED":
      return "MATERIALIZATION_PENDING" as const;
  }
}

export function normalizeLimitationState(input: {
  defaultLimitedReasonCode?: string | undefined;
  defaultStatement?: string | undefined;
  limitationReasonCodes?: readonly string[] | undefined;
  limitationState?: LowNoiseLimitationState | undefined;
  limitationStatement?: string | null | undefined;
}): NormalizedLowNoiseLimitationState {
  const limitationState = input.limitationState ?? "NONE";
  if (limitationState === "NONE") {
    return {
      limitation_reason_codes: [],
      limitation_state: "NONE",
      limitation_statement: null,
      state_reason_code_or_null: null,
    };
  }

  const limitationStatement = enforceLowNoiseCopyBudget(
    input.limitationStatement,
    "blockingReason",
    input.defaultStatement ?? "Some detail is limited by the current view.",
  );
  return {
    limitation_reason_codes:
      limitationState === "LIMITED"
        ? uniqueLowNoiseStrings(
            input.limitationReasonCodes ?? [input.defaultLimitedReasonCode ?? "LIMITED_VIEW"],
          )
        : [],
    limitation_state: limitationState,
    limitation_statement: limitationStatement,
    state_reason_code_or_null: stateReasonForLimitationState(limitationState),
  };
}
