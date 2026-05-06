import type {
  AuthorityReconciliationAnalyticsSnapshot,
  AuthorityReconciliationCountEntry,
} from "../models/authority_reconciliation_analytics_snapshot.ts";

export type ReconciliationReasonMatrixFamily = "ESCALATION" | "RESEND_REFUSAL";

export type ReconciliationReasonMatrixRow = {
  count: number;
  family: ReconciliationReasonMatrixFamily;
  ratio_of_window: number;
  reason_code: string;
  tone: "danger" | "info" | "warning";
};

export type ReconciliationReasonMatrix = {
  rows: ReconciliationReasonMatrixRow[];
  total_reason_count: number;
};

function rowsForFamily(input: {
  entries: readonly AuthorityReconciliationCountEntry[];
  family: ReconciliationReasonMatrixFamily;
  total_interaction_count: number;
}) {
  return input.entries.map((entry): ReconciliationReasonMatrixRow => ({
    count: entry.count,
    family: input.family,
    ratio_of_window:
      input.total_interaction_count === 0 ? 0 : entry.count / input.total_interaction_count,
    reason_code: entry.code,
    tone:
      input.family === "ESCALATION"
        ? "danger"
        : entry.code.includes("DEADLINE") || entry.code.includes("EXHAUSTED")
          ? "warning"
          : "info",
  }));
}

export function projectReconciliationReasonMatrix(input: {
  snapshot: AuthorityReconciliationAnalyticsSnapshot;
}): ReconciliationReasonMatrix {
  const rows = [
    ...rowsForFamily({
      entries: input.snapshot.resend_refusal_reason_counts,
      family: "RESEND_REFUSAL",
      total_interaction_count: input.snapshot.total_interaction_count,
    }),
    ...rowsForFamily({
      entries: input.snapshot.escalation_reason_counts,
      family: "ESCALATION",
      total_interaction_count: input.snapshot.total_interaction_count,
    }),
  ].sort(
    (left, right) =>
      right.count - left.count ||
      left.family.localeCompare(right.family) ||
      left.reason_code.localeCompare(right.reason_code),
  );

  return {
    rows,
    total_reason_count: rows.reduce((sum, row) => sum + row.count, 0),
  };
}
