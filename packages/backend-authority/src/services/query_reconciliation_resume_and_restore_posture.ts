import type { AuthorityReconciliationAnalyticsSnapshot } from "../models/authority_reconciliation_analytics_snapshot.ts";

export type ReconciliationResumeAndRestorePosture =
  | "NO_RESUME_PRESSURE"
  | "RESUME_HEAVY_STABLE"
  | "RESUME_HEAVY_UNSTABLE"
  | "RESUME_PRESENT_MONITOR";

export type ReconciliationResumeAndRestorePostureRow = {
  authority_operation_profile_ref: string;
  operation_family: string;
  posture: ReconciliationResumeAndRestorePosture;
  provider_environment: string;
  replay_resume_count: number;
  resume_ratio: number;
  snapshot_id: string;
  terminal_success_ratio: number;
  total_interaction_count: number;
  window_ended_at: string;
  window_started_at: string;
};

export type QueryReconciliationResumeAndRestorePostureInput = {
  snapshots: readonly AuthorityReconciliationAnalyticsSnapshot[];
};

function countFor(snapshot: AuthorityReconciliationAnalyticsSnapshot, code: string) {
  return snapshot.outcome_class_counts.find((entry) => entry.code === code)?.count ?? 0;
}

function ratio(count: number, total: number) {
  return total === 0 ? 0 : count / total;
}

function classifyPosture(input: {
  resume_ratio: number;
  terminal_success_ratio: number;
}) {
  if (input.resume_ratio === 0) {
    return "NO_RESUME_PRESSURE" as const;
  }
  if (input.resume_ratio >= 0.35 && input.terminal_success_ratio >= 0.6) {
    return "RESUME_HEAVY_STABLE" as const;
  }
  if (input.resume_ratio >= 0.35) {
    return "RESUME_HEAVY_UNSTABLE" as const;
  }
  return "RESUME_PRESENT_MONITOR" as const;
}

export function queryReconciliationResumeAndRestorePosture(
  input: QueryReconciliationResumeAndRestorePostureInput,
): ReconciliationResumeAndRestorePostureRow[] {
  return input.snapshots
    .map((snapshot) => {
      const terminalCount = countFor(snapshot, "CONFIRMED") + countFor(snapshot, "REJECTED");
      const resumeRatio = ratio(snapshot.replay_resume_count, snapshot.total_interaction_count);
      const terminalSuccessRatio = ratio(terminalCount, snapshot.total_interaction_count);
      return {
        authority_operation_profile_ref: snapshot.authority_operation_profile_ref,
        operation_family: snapshot.operation_family,
        posture: classifyPosture({
          resume_ratio: resumeRatio,
          terminal_success_ratio: terminalSuccessRatio,
        }),
        provider_environment: snapshot.provider_environment,
        replay_resume_count: snapshot.replay_resume_count,
        resume_ratio: resumeRatio,
        snapshot_id: snapshot.snapshot_id,
        terminal_success_ratio: terminalSuccessRatio,
        total_interaction_count: snapshot.total_interaction_count,
        window_ended_at: snapshot.window_ended_at,
        window_started_at: snapshot.window_started_at,
      };
    })
    .sort(
      (left, right) =>
        right.resume_ratio - left.resume_ratio ||
        left.provider_environment.localeCompare(right.provider_environment) ||
        left.operation_family.localeCompare(right.operation_family) ||
        left.authority_operation_profile_ref.localeCompare(right.authority_operation_profile_ref),
    );
}
