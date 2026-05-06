import { normalizeUtcInstantString } from "../../../domain-kernel/src/primitives/time.ts";
import {
  withRefreshedTrustSummaryContract,
  type TrustSummaryRecord,
} from "../models/trust_summary.ts";

export type TrustSummarySupersessionReason =
  | "NEWER_INPUTS_OR_OVERRIDES"
  | "LATE_DATA_OR_AUTHORITY_CHANGE"
  | "AMENDMENT_OR_BASELINE_CHANGE";

export type TransitionTrustSummaryInput = {
  reason: TrustSummarySupersessionReason;
  superseded_at: string;
  superseded_by_trust_id: string;
  trust_summary: TrustSummaryRecord;
};

export class TransitionTrustSummaryError extends Error {
  readonly code:
    | "TRUST_SUMMARY_ALREADY_SUPERSEDED"
    | "TRUST_SUMMARY_SELF_SUPERSESSION"
    | "TRUST_SUMMARY_SUPERSESSION_REASON_INVALID";

  constructor(code: TransitionTrustSummaryError["code"], detail: string) {
    super(`${code}: ${detail}`);
    this.name = "TransitionTrustSummaryError";
    this.code = code;
  }
}

const ALLOWED_REASONS = new Set<TrustSummarySupersessionReason>([
  "NEWER_INPUTS_OR_OVERRIDES",
  "LATE_DATA_OR_AUTHORITY_CHANGE",
  "AMENDMENT_OR_BASELINE_CHANGE",
]);

export function supersedeTrustSummary(input: TransitionTrustSummaryInput): TrustSummaryRecord {
  if (!ALLOWED_REASONS.has(input.reason)) {
    throw new TransitionTrustSummaryError(
      "TRUST_SUMMARY_SUPERSESSION_REASON_INVALID",
      "trust summaries can only be superseded by newer inputs, late data, authority changes, amendments, or baseline changes",
    );
  }
  if (input.trust_summary.lifecycle_state === "SUPERSEDED") {
    throw new TransitionTrustSummaryError(
      "TRUST_SUMMARY_ALREADY_SUPERSEDED",
      `trust summary ${input.trust_summary.trust_id} is already superseded`,
    );
  }
  if (input.trust_summary.trust_id === input.superseded_by_trust_id) {
    throw new TransitionTrustSummaryError(
      "TRUST_SUMMARY_SELF_SUPERSESSION",
      "trust summary cannot supersede itself",
    );
  }
  const { contract: _contract, ...trustSummary } = input.trust_summary;
  return withRefreshedTrustSummaryContract({
    trust_summary: {
      ...trustSummary,
      lifecycle_state: "SUPERSEDED",
      superseded_at: normalizeUtcInstantString(input.superseded_at),
      superseded_by_trust_id: input.superseded_by_trust_id,
    },
  });
}
