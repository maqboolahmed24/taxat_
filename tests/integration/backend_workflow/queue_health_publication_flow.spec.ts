import { expect, test } from "@playwright/test";

import {
  buildWorkflowItem,
  publishQueueHealthPosture,
  WorkInboxSnapshotRepository,
} from "../../../packages/backend-workflow/src/index.ts";

function item(input: {
  closed_at?: string | null | undefined;
  current_assignee_ref?: string | null | undefined;
  item_id: string;
  lifecycle_state?: "OPEN" | "IN_PROGRESS" | "DONE" | undefined;
  queue_entered_at: string;
  reassignment_count_30d?: number | undefined;
}) {
  return buildWorkflowItem({
    authority_truth_state: "CONFIRMED",
    client_id: `client-${input.item_id}`,
    closed_at: input.closed_at ?? null,
    current_assignee_ref: input.current_assignee_ref ?? "user://staff-owner",
    dedupe_key: `client-${input.item_id}:queue-health`,
    item_id: input.item_id,
    lifecycle_state: input.lifecycle_state ?? "IN_PROGRESS",
    opened_at: input.queue_entered_at,
    period: "2026-Q1",
    queue_entered_at: input.queue_entered_at,
    reassignment_count_30d: input.reassignment_count_30d ?? 0,
    routing_queue_ref: "queue://tax-ops/filings",
    tenant_id: "tenant-0156",
    title: `Queue health item ${input.item_id}`,
    type: "QUEUE_HEALTH_TEST",
    waiting_on_actor: input.lifecycle_state === "DONE" ? "NONE" : "STAFF",
    waiting_since_at: input.queue_entered_at,
  });
}

test("publishes queue health posture into a persisted inbox snapshot and rows", async () => {
  const repository = new WorkInboxSnapshotRepository();
  const result = await publishQueueHealthPosture({
    access_binding_hash: "access-0156",
    evaluated_at: "2026-05-03T12:00:00Z",
    items: [
      item({
        item_id: "workflow-item-0156-a",
        queue_entered_at: "2026-05-02T12:00:00Z",
        reassignment_count_30d: 4,
      }),
      item({
        item_id: "workflow-item-0156-b",
        queue_entered_at: "2026-04-30T12:00:00Z",
        reassignment_count_30d: 3,
      }),
      item({
        closed_at: "2026-05-03T09:00:00Z",
        item_id: "workflow-item-0156-c",
        lifecycle_state: "DONE",
        queue_entered_at: "2026-05-02T10:00:00Z",
      }),
    ],
    masking_posture_fingerprint: "mask-0156",
    queue_health_input_overrides: {
      mutating_command_attempts: 20,
      queue_health_floor: 70,
      rejected_stale_commands: 6,
      resolution_target_hours: 24,
      rolling_window_hours: 24,
      service_rate_per_staff_hour: 0.1,
      staffed_parallelism: 1,
    },
    repository,
    routing_queue_ref: "queue://tax-ops/filings",
    tenant_id: "tenant-0156",
  });

  expect(result.snapshot.queue_health_contract.queue_health_state).not.toBe("HEALTHY");
  expect(result.snapshot.queue_health_contract.reason_codes).toContain(
    "WORK_QUEUE_HEALTH_DEGRADED",
  );
  expect(result.snapshot.rows).toHaveLength(2);
  for (const row of result.snapshot.rows) {
    expect(row.queue_projection.routing_contract.queue_health_score).toBe(
      result.snapshot.queue_health_contract.queue_health_score,
    );
    expect(row.queue_projection.routing_contract.queue_pressure_score).toBe(
      result.snapshot.queue_health_contract.queue_pressure_score,
    );
  }
  const latest = await repository.getLatestWorkInboxSnapshotForRoute({
    inbox_route_key: "/work/inbox",
    tenant_id: "tenant-0156",
  });
  expect(latest?.snapshot_ref).toBe(result.stored.snapshot_ref);
});

test("replay from the same frozen queue-health basis is deterministic", async () => {
  const repository = new WorkInboxSnapshotRepository();
  const items = [
    item({ item_id: "workflow-item-0156-replay-a", queue_entered_at: "2026-05-02T12:00:00Z" }),
    item({ item_id: "workflow-item-0156-replay-b", queue_entered_at: "2026-05-02T13:00:00Z" }),
  ];
  const base = {
    access_binding_hash: "access-0156",
    evaluated_at: "2026-05-03T12:00:00Z",
    items,
    masking_posture_fingerprint: "mask-0156",
    queue_health_input_overrides: {
      mutating_command_attempts: 10,
      queue_health_floor: 60,
      rejected_stale_commands: 0,
      service_rate_per_staff_hour: 1,
      staffed_parallelism: 4,
    },
    repository,
    routing_queue_ref: "queue://tax-ops/filings",
    tenant_id: "tenant-0156",
  } as const;

  const first = await publishQueueHealthPosture(base);
  const second = await publishQueueHealthPosture(base);

  expect(second.queue_health_snapshot.snapshot_hash).toBe(
    first.queue_health_snapshot.snapshot_hash,
  );
  expect(second.stored.content_fingerprint).toBe(first.stored.content_fingerprint);
});
