import {
  clamp01,
  roundScore,
  type CollaborationPriorityResult,
  type CollaborationRoutingBasis,
  type EscalationPressureResult,
  type QueueHealthSignal,
  type SlaPressureResult,
} from "../models/collaboration_routing_contract.ts";

export function computeCollaborationPriorityScore(input: {
  basis: CollaborationRoutingBasis;
  escalation: EscalationPressureResult;
  queue_health: QueueHealthSignal;
  resolution_confidence_score: number;
  sla: SlaPressureResult;
}): CollaborationPriorityResult {
  const resolutionUncertainty = 1 - clamp01(input.resolution_confidence_score / 100);
  const queuePressure = 1 - clamp01(input.queue_health.queue_health_score / 100);
  const signal = clamp01(
    1 -
      (1 - 0.95 * input.sla.sla_pressure_raw) *
        (1 - 0.8 * input.basis.customer_wait_pressure) *
        (1 - 0.7 * input.sla.age_pressure) *
        (1 - 0.65 * input.escalation.escalation_pressure_raw) *
        (1 - 0.5 * resolutionUncertainty) *
        (1 - 0.35 * input.basis.priority_base) *
        (1 - 0.25 * queuePressure),
  );
  const reasonCodes = ["CANONICAL_PRIORITY_TUPLE"];
  if (input.queue_health.queue_health_state !== "HEALTHY") {
    reasonCodes.push("WORK_QUEUE_HEALTH_DEGRADED");
  }
  if (input.sla.sla_pressure_score >= 70) {
    reasonCodes.push("WORK_SLA_PRESSURE_HIGH");
  }
  if (input.escalation.escalation_pressure_score >= 70) {
    reasonCodes.push("WORK_ESCALATION_PRESSURE_HIGH");
  }

  return {
    collaboration_priority_score: roundScore(100 * signal),
    collaboration_priority_signal: signal,
    queue_pressure: queuePressure,
    reason_codes: reasonCodes,
  };
}
