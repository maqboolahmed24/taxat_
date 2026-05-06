import type {
  AuthorityReconciliationAnalyticsSnapshot,
  AuthorityReconciliationCountEntry,
} from "../models/authority_reconciliation_analytics_snapshot.ts";

export type ReconciliationHotspotType =
  | "AMBIGUITY"
  | "ESCALATION_LATENCY"
  | "REPLAY_RESUME"
  | "RESEND_REFUSAL";

export type ReconciliationHotspot = {
  authority_operation_profile_ref: string;
  hotspot_type: ReconciliationHotspotType;
  operation_family: string;
  primary_count: number;
  provider_environment: string;
  score: number;
  snapshot_id: string;
  window_ended_at: string;
  window_started_at: string;
};

export type QueryReconciliationHotspotsInput = {
  limit?: number | undefined;
  snapshots: readonly AuthorityReconciliationAnalyticsSnapshot[];
};

function countSum(entries: readonly AuthorityReconciliationCountEntry[]) {
  return entries.reduce((sum, entry) => sum + entry.count, 0);
}

function ratio(count: number, total: number) {
  return total === 0 ? 0 : count / total;
}

function hotspotBase(snapshot: AuthorityReconciliationAnalyticsSnapshot) {
  return {
    authority_operation_profile_ref: snapshot.authority_operation_profile_ref,
    operation_family: snapshot.operation_family,
    provider_environment: snapshot.provider_environment,
    snapshot_id: snapshot.snapshot_id,
    window_ended_at: snapshot.window_ended_at,
    window_started_at: snapshot.window_started_at,
  };
}

function sortHotspots(left: ReconciliationHotspot, right: ReconciliationHotspot) {
  return (
    right.score - left.score ||
    right.primary_count - left.primary_count ||
    left.provider_environment.localeCompare(right.provider_environment) ||
    left.operation_family.localeCompare(right.operation_family) ||
    left.authority_operation_profile_ref.localeCompare(right.authority_operation_profile_ref)
  );
}

export function queryReconciliationHotspots(
  input: QueryReconciliationHotspotsInput,
): ReconciliationHotspot[] {
  const hotspots: ReconciliationHotspot[] = [];
  for (const snapshot of input.snapshots) {
    const total = snapshot.total_interaction_count;
    const resendRefusalCount = countSum(snapshot.resend_refusal_reason_counts);
    if (snapshot.unresolved_ambiguity_count > 0) {
      hotspots.push({
        ...hotspotBase(snapshot),
        hotspot_type: "AMBIGUITY",
        primary_count: snapshot.unresolved_ambiguity_count,
        score: ratio(snapshot.unresolved_ambiguity_count, total),
      });
    }
    if (resendRefusalCount > 0) {
      hotspots.push({
        ...hotspotBase(snapshot),
        hotspot_type: "RESEND_REFUSAL",
        primary_count: resendRefusalCount,
        score: ratio(resendRefusalCount, total),
      });
    }
    if (snapshot.escalation_latency_seconds_p95_or_null !== null) {
      hotspots.push({
        ...hotspotBase(snapshot),
        hotspot_type: "ESCALATION_LATENCY",
        primary_count: snapshot.escalated_count,
        score: snapshot.escalation_latency_seconds_p95_or_null,
      });
    }
    if (snapshot.replay_resume_count > 0) {
      hotspots.push({
        ...hotspotBase(snapshot),
        hotspot_type: "REPLAY_RESUME",
        primary_count: snapshot.replay_resume_count,
        score: ratio(snapshot.replay_resume_count, total),
      });
    }
  }

  return hotspots.sort(sortHotspots).slice(0, input.limit ?? hotspots.length);
}
