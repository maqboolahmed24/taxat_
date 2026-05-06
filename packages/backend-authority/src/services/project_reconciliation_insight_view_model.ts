import type {
  AuthorityReconciliationAnalyticsSnapshot,
  AuthorityReconciliationCountEntry,
} from "../models/authority_reconciliation_analytics_snapshot.ts";
import {
  type ReconciliationReasonMatrix,
  projectReconciliationReasonMatrix,
} from "./project_reconciliation_reason_matrix.ts";

export type ReconciliationBudgetBandSegment = {
  code: string;
  count: number;
  percent: number;
  tone: "danger" | "info" | "neutral" | "success" | "warning";
};

export type ReconciliationInsightDrillRow = {
  label: string;
  value: string;
};

export type ReconciliationInsightViewModel = {
  budget_band: ReconciliationBudgetBandSegment[];
  dominant_insight: {
    body: string;
    heading: string;
    tone: "danger" | "info" | "neutral" | "warning";
  };
  drill_rows: ReconciliationInsightDrillRow[];
  empty_state: {
    active_filter_echo: string;
    body: string;
    visible: boolean;
  };
  latency_confidence: "LOW_SAMPLE" | "NO_ESCALATIONS" | "STANDARD";
  profile_header: {
    authority_operation_profile_ref: string;
    operation_family: string;
    provider_environment: string;
    source_policy: string;
    window_label: string;
  };
  reason_matrix: ReconciliationReasonMatrix;
  resume_and_escalation_strip: {
    escalated_count: number;
    p95_latency_seconds: number | null;
    replay_resume_count: number;
    resume_ratio: number;
  };
  snapshot_id: string;
  tuning_recommendation_codes: string[];
};

function percent(count: number, total: number) {
  return total === 0 ? 0 : Math.round((count / total) * 1000) / 10;
}

function toneForBudget(code: string): ReconciliationBudgetBandSegment["tone"] {
  if (code === "ESCALATED") {
    return "danger";
  }
  if (code === "EXHAUSTED") {
    return "warning";
  }
  if (code === "ACTIVE") {
    return "info";
  }
  if (code === "CLOSED") {
    return "success";
  }
  return "neutral";
}

function countFor(entries: readonly AuthorityReconciliationCountEntry[], code: string) {
  return entries.find((entry) => entry.code === code)?.count ?? 0;
}

function formatWindow(snapshot: AuthorityReconciliationAnalyticsSnapshot) {
  return `${snapshot.window_started_at} to ${snapshot.window_ended_at}`;
}

function dominantInsight(snapshot: AuthorityReconciliationAnalyticsSnapshot) {
  if (snapshot.total_interaction_count === 0) {
    return {
      body: "No durable reconciliation-control contracts matched the active profile and window.",
      heading: "No interactions in this snapshot window",
      tone: "neutral" as const,
    };
  }
  if (snapshot.unresolved_ambiguity_count > 0) {
    return {
      body: `${snapshot.unresolved_ambiguity_count} lineage-deduplicated interaction(s) still carry unresolved ambiguity from persisted control contracts.`,
      heading: "Ambiguity is the dominant reconciliation pressure",
      tone: "warning" as const,
    };
  }
  if (snapshot.escalated_count > 0) {
    return {
      body: `${snapshot.escalated_count} interaction(s) are escalated with durable owner or workflow posture.`,
      heading: "Escalation posture requires operator review",
      tone: "danger" as const,
    };
  }
  if (snapshot.replay_resume_count > 0) {
    return {
      body: `${snapshot.replay_resume_count} interaction(s) resumed from durable lineage without reopening budget clocks.`,
      heading: "Replay and restore posture is visible",
      tone: "info" as const,
    };
  }
  return {
    body: "The selected profile window is closed or active without material ambiguity, escalation, or replay-resume pressure.",
    heading: "No tuning pressure detected",
    tone: "neutral" as const,
  };
}

function latencyConfidence(snapshot: AuthorityReconciliationAnalyticsSnapshot) {
  if (snapshot.escalated_count === 0) {
    return "NO_ESCALATIONS" as const;
  }
  if (snapshot.escalated_count < 3) {
    return "LOW_SAMPLE" as const;
  }
  return "STANDARD" as const;
}

export function projectReconciliationInsightViewModel(input: {
  active_filter_echo?: string | undefined;
  snapshot: AuthorityReconciliationAnalyticsSnapshot;
}): ReconciliationInsightViewModel {
  const { snapshot } = input;
  const total = snapshot.total_interaction_count;
  return {
    budget_band: snapshot.budget_state_counts.map((entry) => ({
      code: entry.code,
      count: entry.count,
      percent: percent(entry.count, total),
      tone: toneForBudget(entry.code),
    })),
    dominant_insight: dominantInsight(snapshot),
    drill_rows: [
      {
        label: "Durable interactions",
        value: String(snapshot.total_interaction_count),
      },
      {
        label: "Closed outcomes",
        value: String(countFor(snapshot.outcome_class_counts, "CONFIRMED") + countFor(snapshot.outcome_class_counts, "REJECTED")),
      },
      {
        label: "Blocked resend",
        value: String(snapshot.blind_resend_blocked_count),
      },
      {
        label: "Average attempts consumed",
        value: snapshot.average_attempts_consumed.toFixed(2),
      },
      {
        label: "Source policy",
        value: snapshot.source_policy,
      },
    ],
    empty_state: {
      active_filter_echo:
        input.active_filter_echo ??
        `${snapshot.provider_environment} / ${snapshot.operation_family} / ${snapshot.authority_operation_profile_ref}`,
      body: "The query completed against durable reconciliation-control snapshots and found no matching lineage.",
      visible: snapshot.total_interaction_count === 0,
    },
    latency_confidence: latencyConfidence(snapshot),
    profile_header: {
      authority_operation_profile_ref: snapshot.authority_operation_profile_ref,
      operation_family: snapshot.operation_family,
      provider_environment: snapshot.provider_environment,
      source_policy: snapshot.source_policy,
      window_label: formatWindow(snapshot),
    },
    reason_matrix: projectReconciliationReasonMatrix({ snapshot }),
    resume_and_escalation_strip: {
      escalated_count: snapshot.escalated_count,
      p95_latency_seconds: snapshot.escalation_latency_seconds_p95_or_null,
      replay_resume_count: snapshot.replay_resume_count,
      resume_ratio: total === 0 ? 0 : snapshot.replay_resume_count / total,
    },
    snapshot_id: snapshot.snapshot_id,
    tuning_recommendation_codes: snapshot.tuning_recommendation_codes,
  };
}
