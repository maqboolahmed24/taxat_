import { expect, test } from "@playwright/test";

import {
  AuthorityReconciliationAnalyticsSnapshotRepository,
  buildAuthorityReconciliationAnalyticsSnapshotRecord,
  projectReconciliationInsightViewModel,
  queryReconciliationHotspots,
  queryReconciliationResumeAndRestorePosture,
  queryReconciliationSnapshotsByProfile,
} from "../../../packages/backend-authority/src/index.ts";

function snapshot(input: {
  ambiguity?: number | undefined;
  blocked?: number | undefined;
  escalationLatency?: number | null | undefined;
  escalated?: number | undefined;
  exhausted?: number | undefined;
  id: string;
  profile: string;
  resume?: number | undefined;
  total: number;
}) {
  const closed = Math.max(
    0,
    input.total - (input.escalated ?? 0) - (input.exhausted ?? 0) - (input.ambiguity ?? 0),
  );
  return buildAuthorityReconciliationAnalyticsSnapshotRecord({
    authority_operation_profile_ref: input.profile,
    average_attempts_consumed: input.total === 0 ? 0 : 1.5,
    blind_resend_blocked_count: input.blocked ?? 0,
    budget_state_counts: [
      { code: "CLOSED", count: closed },
      { code: "ESCALATED", count: input.escalated ?? 0 },
      { code: "EXHAUSTED", count: input.exhausted ?? 0 },
      { code: "ACTIVE", count: input.ambiguity ?? 0 },
      { code: "NOT_OPENED", count: 0 },
    ],
    deadline_expiry_count: input.exhausted ?? 0,
    escalation_latency_seconds_p95_or_null: input.escalationLatency ?? null,
    escalation_reason_counts:
      (input.escalated ?? 0) > 0
        ? [{ code: "AUTO_RECONCILIATION_BUDGET_EXHAUSTED", count: input.escalated ?? 0 }]
        : [],
    escalated_count: input.escalated ?? 0,
    generated_at: "2026-04-29T12:05:00Z",
    interaction_refs: Array.from(
      { length: input.total },
      (_, index) => `authority-interaction://${input.id}-${index}`,
    ),
    max_attempts_consumed: input.total === 0 ? 0 : 3,
    operation_family: "AUTH_SUBMIT_PERIODIC_UPDATE",
    outcome_class_counts: [
      { code: "CONFIRMED", count: closed },
      { code: "ESCALATED", count: input.escalated ?? 0 },
      { code: "UNKNOWN", count: (input.exhausted ?? 0) + (input.ambiguity ?? 0) },
    ],
    provider_environment: "HMRC_SANDBOX",
    replay_resume_count: input.resume ?? 0,
    resend_refusal_reason_counts:
      (input.blocked ?? 0) > 0
        ? [
            {
              code: "RECONCILIATION_DEADLINE_EXPIRED",
              count: input.exhausted ?? 0,
            },
            {
              code: "CONTRADICTORY_AUTHORITY_EVIDENCE",
              count: Math.max(0, (input.blocked ?? 0) - (input.exhausted ?? 0)),
            },
          ]
        : [],
    snapshot_id: input.id,
    total_interaction_count: input.total,
    tuning_recommendation_codes:
      (input.ambiguity ?? 0) > 1 ? ["REVIEW_PROVIDER_AMBIGUITY"] : ["NO_CHANGE_RECOMMENDED"],
    unresolved_ambiguity_count: input.ambiguity ?? 0,
    window_ended_at: "2026-04-29T12:00:00Z",
    window_started_at: "2026-04-29T09:00:00Z",
  });
}

test("persists snapshots and serves profile, hotspot, resume, and empty-window queries", async () => {
  const repository = new AuthorityReconciliationAnalyticsSnapshotRepository();
  const ambiguous = snapshot({
    ambiguity: 4,
    blocked: 5,
    escalated: 2,
    escalationLatency: 4800,
    exhausted: 3,
    id: "snapshot-0144-ambiguous",
    profile: "authority-operation-profile://0144-ambiguous",
    total: 12,
  });
  const replayStable = snapshot({
    blocked: 1,
    id: "snapshot-0144-replay",
    profile: "authority-operation-profile://0144-replay",
    resume: 6,
    total: 12,
  });
  const empty = snapshot({
    id: "snapshot-0144-empty",
    profile: "authority-operation-profile://0144-empty",
    total: 0,
  });

  await repository.persistAuthorityReconciliationAnalyticsSnapshot({ snapshot: ambiguous });
  await repository.persistAuthorityReconciliationAnalyticsSnapshot({ snapshot: replayStable });
  await repository.persistAuthorityReconciliationAnalyticsSnapshot({ snapshot: empty });

  const profileQuery = await queryReconciliationSnapshotsByProfile({
    ambiguity_heavy: true,
    authority_operation_profile_ref: "authority-operation-profile://0144-ambiguous",
    repository,
  });
  expect(profileQuery.snapshots.map((stored) => stored.snapshot_id)).toEqual([
    "snapshot-0144-ambiguous",
  ]);

  const all = (await repository.queryAuthorityReconciliationAnalyticsSnapshots()).map(
    (stored) => stored.record,
  );
  const hotspots = queryReconciliationHotspots({ snapshots: all });
  expect(hotspots[0]?.hotspot_type).toBe("ESCALATION_LATENCY");
  expect(hotspots.some((hotspot) => hotspot.hotspot_type === "AMBIGUITY")).toBe(true);

  const resumePosture = queryReconciliationResumeAndRestorePosture({ snapshots: all });
  expect(resumePosture.find((row) => row.snapshot_id === "snapshot-0144-replay")?.posture).toBe(
    "RESUME_HEAVY_STABLE",
  );

  const emptyView = projectReconciliationInsightViewModel({ snapshot: empty });
  expect(emptyView.empty_state.visible).toBe(true);
  expect(emptyView.dominant_insight.heading).toContain("No interactions");
});
