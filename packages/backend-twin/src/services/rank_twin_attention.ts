import type { TwinMismatchSummaryRecord } from "../models/twin_mismatch_summary.ts";
import type { TwinReadinessStateRecord } from "../models/twin_readiness_state.ts";
import type { TwinReconciliationStateRecord } from "../models/twin_reconciliation_state.ts";
import { twinViewRef, type TwinViewRecord } from "../models/twin_view.ts";

export type TwinAttentionInput = {
  mismatch_summary: TwinMismatchSummaryRecord;
  readiness: TwinReadinessStateRecord;
  reconciliation_state?: TwinReconciliationStateRecord | null;
  twin_ref?: string;
  view?: TwinViewRecord | null;
};

export type RankedTwinAttention = TwinAttentionInput & {
  attention_rank: number;
  is_out_of_band: boolean;
  is_stale: boolean;
  top_mismatch_ref: string | null;
  twin_ref: string;
};

const READINESS_BASE_RANK: Record<TwinReadinessStateRecord["twin_readiness_class"], number> = {
  BLOCKED: 1000,
  READY: 200,
  RECONCILIATION_REQUIRED: 800,
  REVIEW_REQUIRED: 400,
  WAITING_ON_AUTHORITY: 600,
};

export function computeTwinAttentionRank(input: {
  mismatch_summary: TwinMismatchSummaryRecord;
  readiness: TwinReadinessStateRecord;
}) {
  const safeActionPenalty =
    input.readiness.safe_action_state === "NO_SAFE_ACTION"
      ? 50
      : input.readiness.safe_action_state === "REFRESH_REQUIRED"
        ? 25
        : 0;
  return (
    READINESS_BASE_RANK[input.readiness.twin_readiness_class] +
    safeActionPenalty +
    input.mismatch_summary.highest_priority_rank
  );
}

export function rankTwinAttention(input: { twins: readonly TwinAttentionInput[] }) {
  const ranked = input.twins.map((twin) => {
    const topMismatchRef = twin.mismatch_summary.top_mismatch_refs[0] ?? null;
    const stale =
      twin.view?.lifecycle_state === "STALE" ||
      twin.readiness.authority_posture === "STALE" ||
      twin.readiness.safe_action_state === "REFRESH_REQUIRED" ||
      twin.mismatch_summary.stale_count > 0;
    const outOfBand =
      twin.readiness.authority_posture === "OUT_OF_BAND" ||
      twin.readiness.out_of_band_mismatch_refs.length > 0 ||
      (twin.reconciliation_state?.reason_codes.includes("OUT_OF_BAND") ?? false);
    return {
      ...twin,
      attention_rank: computeTwinAttentionRank({
        mismatch_summary: twin.mismatch_summary,
        readiness: twin.readiness,
      }),
      is_out_of_band: outOfBand,
      is_stale: stale,
      top_mismatch_ref: topMismatchRef,
      twin_ref: twin.twin_ref ?? (twin.view ? twinViewRef(twin.view) : twinViewRef(twin.readiness.twin_id)),
    } satisfies RankedTwinAttention;
  });
  return ranked.sort(
    (left, right) =>
      right.attention_rank - left.attention_rank ||
      (left.top_mismatch_ref ?? "\uffff").localeCompare(right.top_mismatch_ref ?? "\uffff") ||
      left.twin_ref.localeCompare(right.twin_ref),
  );
}
