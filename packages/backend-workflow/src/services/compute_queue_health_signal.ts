import {
  type CollaborationRoutingBasis,
  type QueueHealthSignal,
} from "../models/collaboration_routing_contract.ts";
import { computeWorkQueueHealth } from "../analytics/compute_work_queue_health.ts";

export function computeQueueHealthSignal(input: {
  basis: Pick<CollaborationRoutingBasis, "queue_metrics" | "routing_queue_ref">;
}): QueueHealthSignal {
  const metrics = input.basis.queue_metrics;
  const health = computeWorkQueueHealth({
    arrival_rate_q: metrics.arrival_rate_per_hour,
    backlog_age_p90_hours_q: metrics.backlog_age_p90_hours,
    queue_health_floor: metrics.queue_health_floor,
    reassignment_churn_q: metrics.reassignments_30d / Math.max(1, metrics.resolved_30d),
    resolution_target_hours_q: metrics.resolution_target_hours,
    routing_queue_ref: input.basis.routing_queue_ref,
    service_rate_q: metrics.service_rate_per_staff_hour,
    staffed_parallelism_q: Math.floor(metrics.staffed_parallelism),
    stale_view_rejection_rate_q:
      metrics.rejected_stale_commands / Math.max(1, metrics.mutating_command_attempts),
  });

  return {
    basis_hash: health.analytics_basis_hash,
    expected_wait_hours:
      health.expected_wait_hours_q === "POSITIVE_INFINITY" ? null : health.expected_wait_hours_q,
    queue_health_score: health.queue_health_score_q,
    queue_health_state: health.queue_health_state,
    queue_pressure_score: health.queue_pressure_score_q,
    reason_codes: health.reason_codes,
    wait_probability: health.p_wait_q,
  };
}
